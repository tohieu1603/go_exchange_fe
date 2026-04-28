'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface Props {
  token: string;
  open: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export function StepUpModal({ token, open, onSuccess, onClose }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { login } = useAuthStore();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setCode('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true);
    setError('');
    const res = await api.auth.stepUp(token, code);
    if (res.success && res.data?.user) {
      login(res.data.user);
      onSuccess();
    } else {
      setError(res.message || 'Invalid or expired code');
      setCode('');
    }
    setLoading(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-bg-secondary border border-border w-full max-w-sm mx-4 p-6 rounded-xl">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-text-primary">Verify your device</h2>
          <p className="text-sm text-text-secondary mt-1">We sent a 6-digit code to your email.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full text-center text-2xl font-mono tracking-[0.5em] bg-bg-tertiary border border-border px-4 py-3 text-text-primary outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 rounded-xl transition-all"
          />

          {error && (
            <div className="text-xs text-sell bg-sell/10 border border-sell/20 rounded-lg px-3 py-2 text-center">
              {error}
            </div>
          )}

          <div className="text-xs text-text-muted text-center">Code expires in 10 minutes</div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 bg-bg-tertiary text-text-secondary text-sm hover:text-text-primary transition-colors rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="flex-1 h-10 bg-accent text-black text-sm font-semibold hover:bg-accent-hover transition-colors rounded-xl disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
