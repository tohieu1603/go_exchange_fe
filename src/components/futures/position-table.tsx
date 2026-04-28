'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useChannel } from '@/hooks/use-ws';
import { useAuthStore } from '@/stores/auth-store';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { TpslModal } from '@/components/futures/tpsl-modal';
import { useToast } from '@/components/ui/toast-provider';
import type { Position } from '@/types';

interface Props {
  refreshTrigger?: number;
}

function fmt2(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PositionTable({ refreshTrigger }: Props) {
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
  const [closedPositions, setClosedPositions] = useState<Position[]>([]);
  const [tpslPosition, setTpslPosition] = useState<Position | null>(null);
  const [closingId, setClosingId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmClose, setConfirmClose] = useState<{ id: number; pair: string; pnl: number } | null>(null);
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const fetchPositions = useCallback(async () => {
    const [openRes, closedRes] = await Promise.all([
      api.futures.openPositions(),
      api.futures.positions('CLOSED'),
    ]);
    if (openRes.success && openRes.data) setOpenPositions(openRes.data);
    if (closedRes.success && closedRes.data) setClosedPositions(closedRes.data.slice(0, 10));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchPositions();
    const iv = setInterval(fetchPositions, 5000);
    return () => clearInterval(iv);
  }, [user, fetchPositions, refreshTrigger]);

  const posChannel = user?.id ? `position@${user.id}` : '';
  const liqChannel = user?.id ? `liquidation@${user.id}` : '';
  useChannel(posChannel, () => { fetchPositions(); });
  useChannel(liqChannel, () => { fetchPositions(); });

  async function doClose(id: number) {
    setClosingId(id);
    try {
      const res = await api.futures.closePosition(id);
      if (res.success) {
        toast.success('Position closed successfully');
        fetchPositions();
      } else {
        toast.error(res.message || 'Failed to close position');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setClosingId(null);
      setConfirmClose(null);
    }
  }

  const HEADERS = ['Symbol', 'Size', 'Entry Price', 'Mark Price', 'Liq. Price', 'Margin', 'PnL (ROE%)', 'TP/SL', 'Close'];

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-[11px] min-w-[900px]">
        <thead>
          <tr className="border-b border-border">
            {HEADERS.map((h) => (
              <th key={h} className="px-2 h-7 text-left font-normal text-text-muted whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {openPositions.length === 0 && (
            <tr>
              <td colSpan={9} className="text-center py-6 text-text-muted text-[11px]">No open positions</td>
            </tr>
          )}
          {openPositions.map((pos) => {
            const pct = pos.margin > 0 ? (pos.unrealizedPnl / pos.margin) * 100 : 0;
            const pnlUp = pos.unrealizedPnl >= 0;
            return (
              <tr
                key={pos.id}
                className="hover:bg-bg-hover border-b border-border/40"
                style={{ height: '28px' }}
              >
                <td className="px-2 font-medium text-text-primary whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span>{pos.pair.replace('_', '/')}</span>
                    <span className={`text-[10px] px-1 py-0.5 ${pos.side === 'LONG' ? 'text-buy bg-buy-bg' : 'text-sell bg-sell-bg'}`}>
                      {pos.side} {pos.leverage}x
                    </span>
                  </div>
                </td>
                <td className="px-2 font-mono tabular-nums text-text-primary">{pos.size}</td>
                <td className="px-2 font-mono tabular-nums text-text-primary">{fmt2(pos.entryPrice)}</td>
                <td className="px-2 font-mono tabular-nums text-text-primary">{fmt2(pos.markPrice)}</td>
                <td className="px-2 font-mono tabular-nums text-sell">{fmt2(pos.liquidationPrice)}</td>
                <td className="px-2 font-mono tabular-nums text-text-primary">{fmt2(pos.margin)}</td>
                <td className={`px-2 font-mono tabular-nums ${pnlUp ? 'text-buy' : 'text-sell'}`}>
                  <div>{pnlUp ? '+' : ''}{fmt2(pos.unrealizedPnl)}</div>
                  <div className="text-[10px] opacity-80">{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</div>
                </td>
                <td className="px-2">
                  <button
                    onClick={() => setTpslPosition(pos)}
                    className="text-[10px] font-mono hover:text-accent cursor-pointer group flex items-center gap-1"
                  >
                    <span>
                      <span className="text-buy block">{pos.takeProfit ? fmt2(pos.takeProfit) : '--'}</span>
                      <span className="text-sell block">{pos.stopLoss ? fmt2(pos.stopLoss) : '--'}</span>
                    </span>
                    <svg className="w-3 h-3 text-text-muted group-hover:text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </td>
                <td className="px-2">
                  <button
                    onClick={() => setConfirmClose({
                      id: pos.id,
                      pair: pos.pair.replace('_', '/'),
                      pnl: pos.unrealizedPnl,
                    })}
                    disabled={closingId === pos.id}
                    className="text-[11px] px-2 py-0.5 bg-sell/20 text-sell hover:bg-sell hover:text-white cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {closingId === pos.id ? '...' : 'Close'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Toggle history button */}
      {closedPositions.length > 0 && (
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="w-full h-7 flex items-center justify-center gap-1 border-t border-border text-[11px] text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
        >
          <span>{showHistory ? 'Hide' : 'Show'} History ({closedPositions.length})</span>
          <svg className={`w-3 h-3 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {/* Closed / History section - hidden by default */}
      {showHistory && closedPositions.length > 0 && (
        <table className="w-full text-[11px] min-w-[700px]">
          <thead>
            <tr className="border-b border-border">
              {['Pair', 'Side', 'Size', 'Leverage', 'Entry Price', 'Realized PnL', 'Status', 'Closed At'].map((h) => (
                <th key={h} className="px-3 h-7 text-left font-normal text-text-muted whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {closedPositions.map((pos) => {
              const pnlUp = pos.unrealizedPnl >= 0;
              return (
                <tr key={pos.id} className="hover:bg-bg-hover border-b border-border/30" style={{ height: '32px' }}>
                  <td className="px-3 font-medium text-text-primary">{pos.pair.replace('_', '/')}</td>
                  <td className="px-3">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 ${pos.side === 'LONG' ? 'text-buy bg-buy-bg' : 'text-sell bg-sell-bg'}`}>
                      {pos.side}
                    </span>
                  </td>
                  <td className="px-3 font-mono tabular-nums text-text-primary">{pos.size}</td>
                  <td className="px-3 font-mono text-text-secondary">{pos.leverage}x</td>
                  <td className="px-3 font-mono tabular-nums text-text-primary">${fmt2(pos.entryPrice)}</td>
                  <td className={`px-3 font-mono tabular-nums font-medium ${pnlUp ? 'text-buy' : 'text-sell'}`}>
                    {pnlUp ? '+' : ''}${fmt2(pos.unrealizedPnl)}
                  </td>
                  <td className="px-3">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 ${
                      pos.status === 'LIQUIDATED' ? 'text-sell bg-sell-bg' : 'text-buy bg-buy-bg'
                    }`}>
                      {pos.status}
                    </span>
                  </td>
                  <td className="px-3 text-text-muted font-mono whitespace-nowrap">
                    {pos.closedAt ? new Date(pos.closedAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Close position confirm modal */}
      <ConfirmModal
        open={!!confirmClose}
        title="Close Position"
        message={confirmClose
          ? `Close ${confirmClose.pair} position?\nPnL: ${confirmClose.pnl >= 0 ? '+' : ''}$${fmt2(confirmClose.pnl)}`
          : ''}
        confirmLabel="Close Position"
        confirmColor="sell"
        loading={closingId !== null}
        onConfirm={() => confirmClose && doClose(confirmClose.id)}
        onCancel={() => setConfirmClose(null)}
      />

      {/* TP/SL modal */}
      {tpslPosition && (
        <TpslModal
          position={tpslPosition}
          open={!!tpslPosition}
          onClose={() => setTpslPosition(null)}
          onSaved={() => { fetchPositions(); setTpslPosition(null); }}
        />
      )}
    </div>
  );
}
