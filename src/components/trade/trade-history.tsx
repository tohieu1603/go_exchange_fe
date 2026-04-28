'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useChannel } from '@/hooks/use-ws';
import type { Trade } from '@/types';
import { SkeletonRow } from '@/components/ui/skeleton';

interface Props {
  pair: string;
}

function formatTime(isoStr: string) {
  const d = new Date(isoStr);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function priceDec(price: number) {
  return price < 1 ? 8 : price < 100 ? 4 : 2;
}

export function TradeHistory({ pair }: Props) {
  const [trades, setTrades] = useState<Trade[] | undefined>(undefined);

  const fetchTrades = useCallback(async () => {
    const res = await api.market.trades(pair, 50);
    if (res.data) setTrades(res.data);
    else setTrades([]);
  }, [pair]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { fetchTrades(); }, [fetchTrades]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useChannel(`trades@${pair}`, (data) => {
    if (!data) return;
    const trade = data as Trade;
    setTrades((prev) => [trade, ...(prev ?? [])].slice(0, 30));
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Column headers */}
      <div className="flex items-center h-6 px-2 shrink-0 border-b border-border">
        <span className="flex-1 text-[10px] text-text-muted">Price(USDT)</span>
        <span className="flex-1 text-right text-[10px] text-text-muted">Amount</span>
        <span className="flex-1 text-right text-[10px] text-text-muted">Time</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {trades === undefined && (
          <div className="px-2 py-1">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={3} />)}
          </div>
        )}
        {trades !== undefined && trades.length === 0 && (
          <div className="text-center text-text-muted text-[11px] py-4">No trades yet</div>
        )}
        {(trades ?? []).slice(0, 30).map((t) => {
          const dec = priceDec(t.price);
          return (
            <div
              key={t.id}
              className="flex items-center hover:bg-bg-hover"
              style={{ height: '20px' }}
            >
              <span className={`flex-1 px-2 text-[11px] font-mono tabular-nums ${t.side === 'BUY' ? 'text-buy' : 'text-sell'}`}>
                {t.price.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}
              </span>
              <span className="flex-1 text-right px-2 text-[11px] font-mono tabular-nums text-text-primary">
                {t.amount.toFixed(5)}
              </span>
              <span className="flex-1 text-right px-2 text-[11px] font-mono tabular-nums text-text-muted">
                {formatTime(t.createdAt)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
