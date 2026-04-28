'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast-provider';
import type { Position } from '@/types';

interface Props {
  position: Position;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function TpslModal({ position, open, onClose, onSaved }: Props) {
  const toast = useToast();
  const [tp, setTp] = useState('');
  const [sl, setSl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setTp(position.takeProfit ? String(position.takeProfit) : '');
      setSl(position.stopLoss ? String(position.stopLoss) : '');
      setError('');
    }
  }, [open, position.takeProfit, position.stopLoss]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  function validate(): string | null {
    const entry = position.entryPrice;
    const tpVal = tp ? parseFloat(tp) : null;
    const slVal = sl ? parseFloat(sl) : null;
    if (tpVal !== null) {
      if (position.side === 'LONG' && tpVal <= entry) return 'Take Profit must be above entry price for LONG';
      if (position.side === 'SHORT' && tpVal >= entry) return 'Take Profit must be below entry price for SHORT';
    }
    if (slVal !== null) {
      if (position.side === 'LONG' && slVal >= entry) return 'Stop Loss must be below entry price for LONG';
      if (position.side === 'SHORT' && slVal <= entry) return 'Stop Loss must be above entry price for SHORT';
    }
    return null;
  }

  async function handleSave() {
    const validErr = validate();
    if (validErr) { setError(validErr); return; }
    setSaving(true);
    setError('');
    const res = await api.futures.updateTPSL(position.id, {
      takeProfit: tp ? parseFloat(tp) : undefined,
      stopLoss: sl ? parseFloat(sl) : undefined,
    });
    if (res.success) {
      toast.success('TP/SL updated');
      onSaved();
      onClose();
    } else {
      setError(res.message || 'Failed to update TP/SL');
    }
    setSaving(false);
  }

  if (!open) return null;

  const entry = position.entryPrice;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-bg-secondary border border-border w-full max-w-sm mx-4 p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Edit TP / SL</h3>
          <p className="text-xs text-text-muted mt-1">
            {position.pair.replace('_', '/')} {position.side} · Entry:{' '}
            <span className="font-mono">{entry.toFixed(2)}</span>
          </p>
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">
            Take Profit
            <span className="text-text-muted ml-1">({position.side === 'LONG' ? '> entry' : '< entry'})</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={tp}
              onChange={(e) => setTp(e.target.value)}
              placeholder={position.side === 'LONG' ? `> ${entry.toFixed(2)}` : `< ${entry.toFixed(2)}`}
              className="flex-1 px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm font-mono outline-none focus:border-accent"
            />
            <button
              onClick={() => setTp('')}
              className="px-2 py-2 bg-bg-tertiary border border-border text-text-muted text-xs hover:text-sell transition-colors"
              title="Remove TP"
            >
              Remove
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">
            Stop Loss
            <span className="text-text-muted ml-1">({position.side === 'LONG' ? '< entry' : '> entry'})</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={sl}
              onChange={(e) => setSl(e.target.value)}
              placeholder={position.side === 'LONG' ? `< ${entry.toFixed(2)}` : `> ${entry.toFixed(2)}`}
              className="flex-1 px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm font-mono outline-none focus:border-accent"
            />
            <button
              onClick={() => setSl('')}
              className="px-2 py-2 bg-bg-tertiary border border-border text-text-muted text-xs hover:text-sell transition-colors"
              title="Remove SL"
            >
              Remove
            </button>
          </div>
        </div>

        {error && (
          <div className="text-xs text-sell bg-sell/10 border border-sell/20 px-3 py-2">{error}</div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 h-10 bg-bg-tertiary text-text-secondary text-sm hover:text-text-primary transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-10 bg-accent text-black text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
