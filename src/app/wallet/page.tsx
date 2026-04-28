'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Wallet, Ticker } from '@/types';

function CoinIcon({ symbol }: { symbol: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-xs font-bold text-accent shrink-0">
      {symbol.slice(0, 2)}
    </div>
  );
}

export default function WalletPage() {
  const [balances, setBalances] = useState<Wallet[]>([]);
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideZero, setHideZero] = useState(true);

  useEffect(() => {
    Promise.all([api.wallet.balances(), api.market.tickers()]).then(([wRes, tRes]) => {
      if (wRes.success && wRes.data) setBalances(wRes.data);
      if (tRes.success && tRes.data) setTickers(tRes.data);
    }).finally(() => setLoading(false));
  }, []);

  function getPrice(currency: string): number {
    if (currency === 'USDT') return 1;
    const t = tickers.find((t) => t.pair === `${currency}_USDT`);
    return t?.price ?? 0;
  }

  const processed = useMemo(() => {
    return balances
      .map((w) => ({
        ...w,
        usdtValue: (w.balance + w.lockedBalance) * getPrice(w.currency),
      }))
      .filter((w) => !hideZero || w.balance + w.lockedBalance > 0)
      .sort((a, b) => b.usdtValue - a.usdtValue);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balances, tickers, hideZero]);

  const totalValue = useMemo(() => processed.reduce((sum, w) => sum + w.usdtValue, 0), [processed]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-6 py-5 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-4 sm:mb-6">Wallet</h1>

      {/* Portfolio value card */}
      <div className="bg-bg-secondary rounded-xl border border-border p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-text-secondary text-sm mb-1">Total Portfolio Value</p>
            <p className="text-2xl sm:text-3xl font-bold text-text-primary font-mono">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-text-muted text-xs mt-1">Estimated in USDT</p>
          </div>
          <div className="flex gap-3">
            <Link href="/wallet/deposit"
              className="flex-1 sm:flex-none text-center px-4 sm:px-5 py-2.5 bg-buy text-black font-semibold text-sm rounded-lg hover:bg-buy/90 transition-colors">
              Deposit
            </Link>
            <Link href="/wallet/withdraw"
              className="flex-1 sm:flex-none text-center px-4 sm:px-5 py-2.5 bg-bg-tertiary text-text-primary font-semibold text-sm rounded-lg hover:bg-bg-hover transition-colors border border-border">
              Withdraw
            </Link>
          </div>
        </div>
      </div>

      {/* Balance table header */}
      <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Balances</h2>
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
            <input type="checkbox" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)}
              className="rounded border-border accent-accent" />
            Hide zero
          </label>
        </div>

        {/* Mobile: card list */}
        <div className="md:hidden divide-y divide-border">
          {processed.length === 0 ? (
            <div className="text-center py-10 text-text-secondary text-sm">No balances found</div>
          ) : (
            processed.map((w) => (
              <div key={w.currency} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CoinIcon symbol={w.currency} />
                  <div>
                    <div className="font-semibold text-text-primary text-sm">{w.currency}</div>
                    <div className="text-xs text-text-muted">≈ ${w.usdtValue.toFixed(2)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-text-primary">
                    {w.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </div>
                  {w.lockedBalance > 0 && (
                    <div className="text-[10px] text-text-muted">Locked: {w.lockedBalance.toFixed(4)}</div>
                  )}
                  <div className="flex gap-2 mt-1 justify-end">
                    <Link href="/wallet/deposit" className="text-[11px] text-accent hover:underline">Deposit</Link>
                    <Link href="/wallet/withdraw" className="text-[11px] text-text-secondary hover:text-text-primary">Withdraw</Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tablet+: full table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-text-muted font-medium text-xs uppercase tracking-wider">Coin</th>
                <th className="text-right px-5 py-3 text-text-muted font-medium text-xs uppercase tracking-wider">Available</th>
                <th className="text-right px-5 py-3 text-text-muted font-medium text-xs uppercase tracking-wider">Locked</th>
                <th className="text-right px-5 py-3 text-text-muted font-medium text-xs uppercase tracking-wider">Est. Value (USDT)</th>
                <th className="text-right px-5 py-3 text-text-muted font-medium text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {processed.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-text-secondary text-sm">No balances found</td></tr>
              ) : (
                processed.map((w) => (
                  <tr key={w.currency} className="table-row-hover border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <CoinIcon symbol={w.currency} />
                        <span className="font-semibold text-text-primary">{w.currency}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-text-primary">
                      {w.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-text-secondary">
                      {w.lockedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-text-primary">
                      ${w.usdtValue.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href="/wallet/deposit" className="text-xs text-accent hover:underline">Deposit</Link>
                        <Link href="/wallet/withdraw" className="text-xs text-text-secondary hover:text-text-primary">Withdraw</Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
