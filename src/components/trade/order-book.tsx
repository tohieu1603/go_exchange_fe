'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useChannel } from '@/hooks/use-ws';
import { SkeletonRow } from '@/components/ui/skeleton';

interface Props {
  pair: string;
  onPriceClick?: (price: string) => void;
}

type Level = [number, number];
type ViewMode = 'both' | 'asks' | 'bids';

function fmt(n: number, dec: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function priceDec(price: number) {
  return price < 1 ? 8 : price < 100 ? 4 : 2;
}

function BookRow({
  price,
  qty,
  pct,
  side,
  onClick,
}: {
  price: number;
  qty: number;
  pct: number;
  side: 'bid' | 'ask';
  onClick: () => void;
}) {
  const color = side === 'bid' ? 'text-buy' : 'text-sell';
  const barColor = side === 'bid' ? 'bg-buy' : 'bg-sell';
  const dec = priceDec(price);

  return (
    <div
      onClick={onClick}
      className="relative flex items-center cursor-pointer hover:bg-bg-hover transition-colors duration-[var(--motion-fast)]"
      style={{ height: '20px' }}
    >
      {/* Depth bar fills from right */}
      <div
        className={`absolute inset-y-0 right-0 ${barColor} pointer-events-none`}
        style={{ width: `${pct}%`, opacity: 0.08 }}
      />
      <span className={`flex-1 px-2 text-[11px] md:text-[12px] font-mono tabular-nums truncate ${color}`}>
        {fmt(price, dec)}
      </span>
      <span className="flex-1 text-right px-2 text-[11px] md:text-[12px] font-mono tabular-nums text-text-primary truncate">
        {qty.toFixed(5)}
      </span>
      <span className="flex-1 text-right px-2 text-[11px] md:text-[12px] font-mono tabular-nums text-text-secondary truncate">
        {fmt(price * qty, 2)}
      </span>
    </div>
  );
}

export function OrderBook({ pair, onPriceClick }: Props) {
  const [bids, setBids] = useState<Level[]>([]);
  const [asks, setAsks] = useState<Level[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [priceMovement, setPriceMovement] = useState<{ isUp: boolean; lastPrice: number }>({ isUp: true, lastPrice: 0 });

  const fetchDepth = useCallback(async () => {
    const res = await api.market.depth(pair, 20).catch((err) => {
      console.error('[OrderBook] depth fetch failed', err);
      return { data: null };
    });
    if (res.data) {
      setBids((res.data.bids as number[][]).map((b) => [b[0], b[1]] as Level));
      setAsks((res.data.asks as number[][]).map((a) => [a[0], a[1]] as Level));
    }
  }, [pair]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { fetchDepth(); }, [fetchDepth]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useChannel(`depth@${pair}`, (data) => {
    if (!data) return;
    const d = data as { bids: number[][]; asks: number[][] };
    if (d.bids) setBids(d.bids.map((b) => [b[0], b[1]] as Level));
    if (d.asks) setAsks(d.asks.map((a) => [a[0], a[1]] as Level));
  });

  const LEVELS = viewMode === 'both' ? 14 : 20;

  // Asks: sorted desc (highest at top), lowest near spread
  const sortedAsks = [...asks].sort((a, b) => b[0] - a[0]).slice(0, LEVELS);
  // Bids: sorted desc (highest near spread)
  const sortedBids = [...bids].sort((a, b) => b[0] - a[0]).slice(0, LEVELS);

  const bestBid = sortedBids[0]?.[0] ?? 0;
  const bestAsk = sortedAsks[sortedAsks.length - 1]?.[0] ?? 0;
  const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
  const spreadPct = bestBid > 0 ? (spread / bestBid) * 100 : 0;

  const maxAskCum = sortedAsks.reduce((s, [, q]) => s + q, 0);
  const maxBidCum = sortedBids.reduce((s, [, q]) => s + q, 0);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (bestBid > 0 && bestBid !== priceMovement.lastPrice) {
      setPriceMovement((prev) => ({ isUp: bestBid >= prev.lastPrice, lastPrice: bestBid }));
    }
  }, [bestBid, priceMovement.lastPrice]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isUp = priceMovement.isUp;
  const dec = priceDec(bestBid);

  function withCum(levels: Level[], maxCum: number) {
    let cum = 0;
    return levels.map(([price, qty]) => {
      cum += qty;
      return { price, qty, pct: maxCum > 0 ? (cum / maxCum) * 100 : 0 };
    });
  }

  const askRows = withCum(sortedAsks, maxAskCum);
  const bidRows = withCum(sortedBids, maxBidCum);

  const isEmpty = bids.length === 0 && asks.length === 0;

  return (
    <div className="flex flex-col bg-bg-secondary h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 h-8 shrink-0">
        <span className="text-[11px] font-medium text-text-primary">Order Book</span>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('both')}
            title="Both"
            className={`w-5 h-5 flex items-center justify-center ${viewMode === 'both' ? 'opacity-100' : 'opacity-40'}`}
          >
            <span className="text-[9px] leading-none">
              <span className="text-sell block" style={{ lineHeight: '5px' }}>▄</span>
              <span className="text-buy block" style={{ lineHeight: '5px' }}>▄</span>
            </span>
          </button>
          <button
            onClick={() => setViewMode('asks')}
            title="Asks only"
            className={`w-5 h-5 flex items-center justify-center ${viewMode === 'asks' ? 'opacity-100' : 'opacity-40'}`}
          >
            <span className="text-[9px] text-sell">▄▄</span>
          </button>
          <button
            onClick={() => setViewMode('bids')}
            title="Bids only"
            className={`w-5 h-5 flex items-center justify-center ${viewMode === 'bids' ? 'opacity-100' : 'opacity-40'}`}
          >
            <span className="text-[9px] text-buy">▄▄</span>
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-2 h-5 shrink-0">
        <span className="flex-1 text-[10px] text-text-muted">Price(USDT)</span>
        <span className="flex-1 text-right text-[10px] text-text-muted">Amount</span>
        <span className="flex-1 text-right text-[10px] text-text-muted">Total</span>
      </div>

      {/* Skeleton when empty */}
      {isEmpty && (
        <div className="px-2 py-1">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={3} />)}
        </div>
      )}

      {/* Asks */}
      {!isEmpty && viewMode !== 'bids' && (
        <div
          className="flex flex-col-reverse overflow-hidden"
          style={{ flex: viewMode === 'asks' ? '1' : undefined }}
        >
          {askRows.map(({ price, qty, pct }) => (
            <BookRow
              key={price}
              price={price}
              qty={qty}
              pct={pct}
              side="ask"
              onClick={() => onPriceClick?.(String(price))}
            />
          ))}
        </div>
      )}

      {/* Spread row */}
      {!isEmpty && viewMode === 'both' && (
        <div className="flex items-center justify-between px-2 py-1 bg-bg-primary shrink-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-[13px] font-bold font-mono tabular-nums ${isUp ? 'text-buy' : 'text-sell'}`}>
              {bestBid > 0 ? fmt(bestBid, dec) : '--'}
            </span>
            <span className={`text-[11px] ${isUp ? 'text-buy' : 'text-sell'}`}>{isUp ? '↑' : '↓'}</span>
          </div>
          {spread > 0 && (
            <span className="text-[10px] text-text-muted font-mono">
              {fmt(spread, dec)} ({spreadPct.toFixed(3)}%)
            </span>
          )}
        </div>
      )}

      {/* Bids */}
      {!isEmpty && viewMode !== 'asks' && (
        <div
          className="overflow-hidden"
          style={{ flex: viewMode === 'bids' ? '1' : undefined }}
        >
          {bidRows.map(({ price, qty, pct }) => (
            <BookRow
              key={price}
              price={price}
              qty={qty}
              pct={pct}
              side="bid"
              onClick={() => onPriceClick?.(String(price))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
