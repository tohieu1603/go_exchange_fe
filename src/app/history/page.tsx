'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { usePriceStore } from '@/stores/price-store';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { SkeletonRow } from '@/components/ui/skeleton';
import type { Order, Position, Deposit } from '@/types';

type MainTab = 'spot' | 'futures' | 'transactions';

const ORDER_STATUSES = ['', 'OPEN', 'FILLED', 'CANCELLED'] as const;
const POSITION_STATUSES = ['', 'OPEN', 'CLOSED', 'LIQUIDATED'] as const;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: 'bg-accent/10 text-accent',
    FILLED: 'bg-buy-bg text-buy',
    PARTIAL: 'bg-bg-tertiary text-text-secondary',
    CANCELLED: 'bg-sell-bg text-sell',
    CLOSED: 'bg-buy-bg text-buy',
    LIQUIDATED: 'bg-sell-bg text-sell',
    PENDING: 'bg-accent/10 text-accent',
    COMPLETED: 'bg-buy-bg text-buy',
    FAILED: 'bg-sell-bg text-sell',
  };
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${map[status] ?? 'bg-bg-tertiary text-text-muted'}`}>{status}</span>;
}

function SpotTab() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    const res = await api.trading.orders(page, 20, status || undefined);
    if (res.success && res.data) {
      setOrders(res.data.content);
      setTotalPages(res.data.totalPages);
    }
    setLoading(false);
  }, [page, status]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLoading(true);
    fetch();
  }, [fetch]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div>
      <div className="flex flex-wrap gap-2 px-3 sm:px-4 py-3 border-b border-border">
        {ORDER_STATUSES.map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${status === s ? 'bg-accent text-black' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="px-4 py-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={9} />)}
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="md:hidden divide-y divide-border">
            {orders.length === 0 ? (
              <div className="text-center py-10 text-text-secondary text-sm">No orders found</div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <button className="font-semibold text-accent text-sm" onClick={() => router.push(`/trade/${o.pair}`)}>
                      {o.pair.replace('_', '/')}
                    </button>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`font-semibold ${o.side === 'BUY' ? 'text-buy' : 'text-sell'}`}>{o.side}</span>
                    <span className="text-text-muted">{o.type}</span>
                    <span className="text-text-muted">{new Date(o.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Price: <span className="text-text-primary font-mono">{o.price > 0 ? o.price.toFixed(2) : 'MARKET'}</span></span>
                    <span className="text-text-muted">Amount: <span className="text-text-primary font-mono">{o.amount}</span></span>
                    <span className="text-text-muted">Total: <span className="text-text-primary font-mono">{(o.price * o.filledAmount).toFixed(2)}</span></span>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Tablet+: full table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs min-w-[800px]">
              <thead>
                <tr className="border-b border-border">
                  {['Date', 'Pair', 'Side', 'Type', 'Price', 'Amount', 'Filled', 'Total', 'Status'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-text-muted font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-text-secondary">No orders found</td></tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="table-row-hover border-b border-border last:border-0">
                      <td className="px-4 py-2.5 text-text-muted">{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5 font-medium text-accent hover:underline cursor-pointer" onClick={() => router.push(`/trade/${o.pair}`)}>{o.pair.replace('_', '/')}</td>
                      <td className={`px-4 py-2.5 font-semibold ${o.side === 'BUY' ? 'text-buy' : 'text-sell'}`}>{o.side}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{o.type}</td>
                      <td className="px-4 py-2.5 font-mono text-text-primary">{o.price > 0 ? o.price.toFixed(2) : 'MARKET'}</td>
                      <td className="px-4 py-2.5 font-mono text-text-primary">{o.amount}</td>
                      <td className="px-4 py-2.5 font-mono text-text-secondary">{o.filledAmount}</td>
                      <td className="px-4 py-2.5 font-mono text-text-primary">{(o.price * o.filledAmount).toFixed(2)}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={o.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 px-4 py-3 border-t border-border">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-xs bg-bg-tertiary text-text-secondary rounded disabled:opacity-40 hover:text-text-primary">Prev</button>
          <span className="px-3 py-1.5 text-xs text-text-secondary">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 text-xs bg-bg-tertiary text-text-secondary rounded disabled:opacity-40 hover:text-text-primary">Next</button>
        </div>
      )}
    </div>
  );
}

function FuturesTab() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [positions, setPositions] = useState<Position[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [closingId, setClosingId] = useState<number | null>(null);
  const [closingAll, setClosingAll] = useState(false);
  const [confirmClose, setConfirmClose] = useState<{ id: number; pair: string; pnl: number } | null>(null);
  const [confirmCloseAll, setConfirmCloseAll] = useState(false);
  const { tickers } = usePriceStore();

  const fetchPos = useCallback(async () => {
    const res = await api.futures.positions(status || undefined);
    if (res.success && res.data) setPositions(res.data);
    setLoading(false);
  }, [status]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchPos();
  }, [fetchPos, user]);
  /* eslint-enable react-hooks/set-state-in-effect */
  // Auto-refresh open positions every 10s — gated on user
  useEffect(() => {
    if (!user) return;
    if (status !== '' && status !== 'OPEN') return;
    const iv = setInterval(fetchPos, 10000);
    return () => clearInterval(iv);
  }, [user, fetchPos, status]);

  const openPositions = positions.filter((p) => p.status === 'OPEN');

  async function doClose(id: number) {
    setClosingId(id);
    await api.futures.closePosition(id);
    setClosingId(null);
    setConfirmClose(null);
    fetchPos();
  }

  async function doCloseAll() {
    setClosingAll(true);
    await Promise.all(openPositions.map((p) => api.futures.closePosition(p.id)));
    setClosingAll(false);
    setConfirmCloseAll(false);
    fetchPos();
  }

  function getLiveMarkPrice(p: Position): number {
    if (p.status !== 'OPEN') return p.markPrice;
    const ticker = Object.values(tickers).find((t) => t.pair === p.pair);
    // Use WS price if available, else API markPrice, never 0
    const wsPrice = ticker?.price ?? 0;
    return wsPrice > 0 ? wsPrice : (p.markPrice > 0 ? p.markPrice : p.entryPrice);
  }

  function getLivePnl(p: Position): number {
    if (p.status !== 'OPEN') return p.unrealizedPnl;
    const mark = getLiveMarkPrice(p);
    return p.side === 'LONG'
      ? p.size * (mark - p.entryPrice)
      : p.size * (p.entryPrice - mark);
  }

  return (
    <div>
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-border">
        <div className="flex flex-wrap gap-2">
          {POSITION_STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${status === s ? 'bg-accent text-black' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        {openPositions.length > 0 && (
          <button
            onClick={() => setConfirmCloseAll(true)}
            className="px-3 py-1 text-xs font-medium bg-sell text-white hover:brightness-110 transition-colors"
          >
            Close All ({openPositions.length})
          </button>
        )}
      </div>
      {loading ? (
        <div className="px-4 py-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={9} />)}
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="md:hidden divide-y divide-border">
            {positions.length === 0 ? (
              <div className="text-center py-10 text-text-secondary text-sm">No positions found</div>
            ) : (
              positions.map((p) => {
                const pnl = getLivePnl(p);
                const mark = getLiveMarkPrice(p);
                const roe = p.margin > 0 ? (pnl / p.margin) * 100 : 0;
                const pnlUp = pnl >= 0;
                return (
                  <div key={p.id} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <button className="font-semibold text-accent text-sm" onClick={() => router.push(`/futures/${p.pair}`)}>
                        {p.pair.replace('_', '/')}
                      </button>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 ${p.side === 'LONG' ? 'text-buy bg-buy-bg' : 'text-sell bg-sell-bg'}`}>{p.side}</span>
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-text-muted">Lev: <span className="text-text-primary font-mono">{p.leverage}x</span></span>
                      <span className="text-text-muted">Entry: <span className="text-text-primary font-mono">{p.entryPrice.toFixed(2)}</span></span>
                      <span className="text-text-muted">Mark: <span className="text-text-primary font-mono">{mark.toFixed(2)}</span></span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-mono font-semibold ${pnlUp ? 'text-buy' : 'text-sell'}`}>PnL: {pnlUp ? '+' : ''}${pnl.toFixed(2)} ({roe >= 0 ? '+' : ''}{roe.toFixed(2)}%)</span>
                      {p.status === 'OPEN' && (
                        <button
                          onClick={() => setConfirmClose({ id: p.id, pair: p.pair.replace('_', '/'), pnl })}
                          disabled={closingId === p.id}
                          className="px-2.5 py-1 text-[11px] font-medium bg-sell/20 text-sell hover:bg-sell hover:text-white transition-colors disabled:opacity-50"
                        >
                          {closingId === p.id ? '...' : 'Close'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {/* Tablet+: full table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead>
                <tr className="border-b border-border">
                  {['Date', 'Pair', 'Side', 'Lev', 'Entry', 'Mark Price', 'Size', 'PnL', 'ROE%', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-text-muted font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-12 text-text-secondary">No positions found</td></tr>
                ) : (
                  positions.map((p) => {
                    const pnl = getLivePnl(p);
                    const mark = getLiveMarkPrice(p);
                    const roe = p.margin > 0 ? (pnl / p.margin) * 100 : 0;
                    const pnlUp = pnl >= 0;
                    return (
                      <tr key={p.id} className="table-row-hover border-b border-border last:border-0">
                        <td className="px-4 py-2.5 text-text-muted">{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-2.5 font-medium text-accent hover:underline cursor-pointer" onClick={() => router.push(`/futures/${p.pair}`)}>{p.pair.replace('_', '/')}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 ${p.side === 'LONG' ? 'text-buy bg-buy-bg' : 'text-sell bg-sell-bg'}`}>
                            {p.side}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-text-secondary font-mono">{p.leverage}x</td>
                        <td className="px-4 py-2.5 font-mono text-text-primary">{p.entryPrice.toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-mono text-text-primary">{mark.toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-mono text-text-primary">{p.size}</td>
                        <td className={`px-4 py-2.5 font-mono font-semibold ${pnlUp ? 'text-buy' : 'text-sell'}`}>
                          {pnlUp ? '+' : ''}${pnl.toFixed(2)}
                        </td>
                        <td className={`px-4 py-2.5 font-mono ${pnlUp ? 'text-buy' : 'text-sell'}`}>
                          {roe >= 0 ? '+' : ''}{roe.toFixed(2)}%
                        </td>
                        <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-2.5">
                          {p.status === 'OPEN' && (
                            <button
                              onClick={() => setConfirmClose({ id: p.id, pair: p.pair.replace('_', '/'), pnl })}
                              disabled={closingId === p.id}
                              className="px-2.5 py-1 text-[11px] font-medium bg-sell/20 text-sell hover:bg-sell hover:text-white transition-colors disabled:opacity-50"
                            >
                              {closingId === p.id ? '...' : 'Close'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Close single position modal */}
      <ConfirmModal
        open={!!confirmClose}
        title="Close Position"
        message={confirmClose
          ? `Close ${confirmClose.pair} position? PnL: ${confirmClose.pnl >= 0 ? '+' : ''}$${confirmClose.pnl.toFixed(2)}`
          : ''}
        confirmLabel="Close Position"
        confirmColor="sell"
        loading={closingId !== null}
        onConfirm={() => confirmClose && doClose(confirmClose.id)}
        onCancel={() => setConfirmClose(null)}
      />

      {/* Close all modal */}
      <ConfirmModal
        open={confirmCloseAll}
        title="Close All Positions"
        message={`Close all ${openPositions.length} open positions? This action cannot be undone.`}
        confirmLabel={`Close All (${openPositions.length})`}
        confirmColor="sell"
        loading={closingAll}
        onConfirm={doCloseAll}
        onCancel={() => setConfirmCloseAll(false)}
      />
    </div>
  );
}

function TransactionsTab() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<{ id: number; amount: number; bankCode: string; status: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.wallet.deposits(1, 20),
      api.walletExtra.withdrawals(1, 20),
    ]).then(([dRes, wRes]) => {
      if (cancelled) return;
      if (dRes.success && dRes.data) setDeposits(dRes.data.content);
      if (wRes.success && wRes.data) setWithdrawals(wRes.data.content);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const combined = [
    ...deposits.map((d) => ({ id: `dep-${d.id}`, date: d.createdAt, type: 'Deposit', amount: d.amount, status: d.status, ref: d.orderCode })),
    ...withdrawals.map((w) => ({ id: `wth-${w.id}`, date: w.createdAt, type: 'Withdraw', amount: w.amount, status: w.status, ref: w.bankCode })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const VND_FORMAT = new Intl.NumberFormat('vi-VN');

  return (
    <div>
      {loading ? (
        <div className="px-4 py-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />)}
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="md:hidden divide-y divide-border">
            {combined.length === 0 ? (
              <div className="text-center py-10 text-text-secondary text-sm">No transactions found</div>
            ) : (
              combined.map((tx) => (
                <div key={tx.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className={`text-sm font-semibold ${tx.type === 'Deposit' ? 'text-buy' : 'text-sell'}`}>{tx.type}</div>
                    <div className="text-xs text-text-muted">{new Date(tx.date).toLocaleDateString('vi-VN')}</div>
                    <div className="text-[11px] text-text-muted font-mono truncate max-w-[140px]">{tx.ref}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-text-primary">{VND_FORMAT.format(tx.amount)}</div>
                    <StatusBadge status={tx.status} />
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Tablet+: full table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  {['Date', 'Type', 'Amount (VND)', 'Status', 'Reference'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-text-muted font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {combined.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-text-secondary">No transactions found</td></tr>
                ) : (
                  combined.map((tx) => (
                    <tr key={tx.id} className="table-row-hover border-b border-border last:border-0">
                      <td className="px-4 py-2.5 text-text-muted">{new Date(tx.date).toLocaleDateString('vi-VN')}</td>
                      <td className={`px-4 py-2.5 font-semibold ${tx.type === 'Deposit' ? 'text-buy' : 'text-sell'}`}>{tx.type}</td>
                      <td className="px-4 py-2.5 font-mono text-text-primary">{VND_FORMAT.format(tx.amount)}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={tx.status} /></td>
                      <td className="px-4 py-2.5 font-mono text-text-muted">{tx.ref}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const [tab, setTab] = useState<MainTab>('spot');

  const tabs: { key: MainTab; label: string }[] = [
    { key: 'spot', label: 'Spot Orders' },
    { key: 'futures', label: 'Futures' },
    { key: 'transactions', label: 'Transactions' },
  ];

  return (
    <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-6 py-5 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-4 sm:mb-6">History</h1>

      <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
        {/* Tab bar — scrollable on mobile */}
        <div className="flex border-b border-border overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 sm:px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'text-text-primary border-b-2 border-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'spot' && <SpotTab />}
        {tab === 'futures' && <FuturesTab />}
        {tab === 'transactions' && <TransactionsTab />}
      </div>
    </div>
  );
}
