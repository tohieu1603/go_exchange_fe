'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { usePriceStore } from '@/stores/price-store';
import { wsManager } from '@/lib/ws';
import type { Ticker } from '@/types';
import { SkeletonRow } from '@/components/ui/skeleton';

function fmt(v: number) {
  if (v >= 1) return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (v >= 0.01) return v.toFixed(4);
  return v.toFixed(6);
}

function fmtVol(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(0);
}

function Sparkline({ change }: { change: number }) {
  const positive = change >= 0;
  const color = positive ? '#0ecb81' : '#f6465d';
  const pts = useMemo(() => {
    const n = 24;
    const arr: number[] = [];
    let v = 50;
    for (let i = 0; i < n; i++) {
      v += (Math.random() - 0.48) * 8 + (change / n) * 2;
      v = Math.max(5, Math.min(95, v));
      arr.push(v);
    }
    return arr.map((y, x) => `${(x / (n - 1)) * 60},${100 - y}`).join(' ');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [change > 0]);
  return (
    <svg width="60" height="24" viewBox="0 0 60 100" preserveAspectRatio="none" className="opacity-80">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="3" />
    </svg>
  );
}

type MarketTab = 'crypto' | 'forex';
type Tab = 'all' | 'hot' | 'gainers' | 'losers' | 'new';
type SortKey = 'price' | 'change24h' | 'volume24h';
type SortDir = 'asc' | 'desc';

export default function MarketsPage() {
  const router = useRouter();
  const { tickers, setAllTickers, setTicker } = usePriceStore();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [marketTab, setMarketTab] = useState<MarketTab>('crypto');
  const [tab, setTab] = useState<Tab>('all');
  const [sortKey, setSortKey] = useState<SortKey>('volume24h');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [flashMap, setFlashMap] = useState<Record<string, 'up' | 'down' | ''>>({});
  const prevPrices = useRef<Record<string, number>>({});
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    api.market.tickers().then((res) => {
      if (res.success && res.data) {
        setAllTickers(res.data);
        res.data.forEach((t) => { prevPrices.current[t.pair] = t.price; });
      }
    }).finally(() => setLoading(false));
  }, [setAllTickers]);

  const handleTick = useCallback((pair: string) => (data: unknown) => {
    const t = data as Ticker;
    if (!t || typeof t.price !== 'number') return;
    const prev = prevPrices.current[pair];
    if (prev !== undefined && prev !== t.price) {
      const dir = t.price > prev ? 'up' as const : 'down' as const;
      setFlashMap((f) => ({ ...f, [pair]: dir }));
      if (flashTimers.current[pair]) clearTimeout(flashTimers.current[pair]);
      flashTimers.current[pair] = setTimeout(() => {
        setFlashMap((f) => ({ ...f, [pair]: '' }));
      }, 500);
    }
    prevPrices.current[pair] = t.price;
    setTicker(pair, t);
  }, [setTicker]);

  useEffect(() => {
    const list = Object.values(tickers);
    if (!list.length) return;
    const subs = list.map((t) => {
      const ch = `ticker@${t.pair}`;
      const cb = handleTick(t.pair);
      wsManager.subscribe(ch, cb);
      return { ch, cb };
    });
    return () => subs.forEach(({ ch, cb }) => wsManager.unsubscribe(ch, cb));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(tickers).length, handleTick]);

  const tickerList: Ticker[] = Object.values(tickers);

  const isForex = marketTab === 'forex';

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = tickerList.filter((t) => {
      const type = t.assetType || 'crypto';
      if (isForex) return type === 'forex' || type === 'commodity';
      return type === 'crypto';
    }).filter(
      (t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
    );
    if (tab === 'gainers') list = list.filter((t) => t.change24h > 0);
    else if (tab === 'losers') list = list.filter((t) => t.change24h < 0);
    else if (tab === 'hot') list = [...list].sort((a, b) => b.volume24h - a.volume24h).slice(0, 20);
    // Forex: fixed sort by symbol to prevent row jumping from volatile synthetic volume
    if (isForex) {
      list.sort((a, b) => a.symbol.localeCompare(b.symbol));
    } else {
      list.sort((a, b) => sortDir === 'desc' ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]);
    }
    return list;
  }, [tickerList, search, tab, sortKey, sortDir, isForex]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const SortArrow = ({ col }: { col: SortKey }) => (
    <span className={`ml-0.5 text-[10px] ${sortKey === col ? 'text-accent' : 'text-text-muted'}`}>
      {sortKey !== col ? '⇅' : sortDir === 'desc' ? '▼' : '▲'}
    </span>
  );

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'hot', label: 'Hot' },
    { key: 'gainers', label: 'Gainers' },
    { key: 'losers', label: 'Losers' },
    { key: 'new', label: 'New' },
  ];

  if (loading) return (
    <div className="max-w-[1400px] mx-auto px-3 pt-6">
      {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={5} />)}
    </div>
  );

  const MARKET_TABS: { key: MarketTab; label: string }[] = [
    { key: 'crypto', label: 'Crypto' },
    { key: 'forex', label: 'Forex & Commodities' },
  ];

  return (
    <div className="max-w-screen-2xl mx-auto px-2 sm:px-3">
      {/* Market type tabs — sticky on mobile */}
      <div className="sticky top-[48px] z-10 bg-bg-primary flex items-center gap-4 sm:gap-6 pt-3 pb-1 border-b border-border/40">
        {MARKET_TABS.map((mt) => (
          <button
            key={mt.key}
            onClick={() => setMarketTab(mt.key)}
            className={`text-[13px] sm:text-[15px] font-semibold pb-2 border-b-2 transition-colors whitespace-nowrap ${
              marketTab === mt.key
                ? 'text-text-primary border-accent'
                : 'text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            {mt.label}
          </button>
        ))}
      </div>

      {/* Sub tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 border-b border-border">
        <div className="flex items-center gap-0 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-3 py-2 text-[13px] font-medium transition-colors whitespace-nowrap ${
                tab === t.key
                  ? 'text-text-primary after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-4 after:h-0.5 after:bg-accent after:rounded-full'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-auto">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search coin name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border border-border rounded pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-text-muted w-full sm:w-44"
          />
        </div>
      </div>

      {/* Table: full on md+, condensed on mobile */}
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-text-muted text-xs">
            <th className="text-left py-3 px-2 font-normal w-8 hidden sm:table-cell">#</th>
            <th className="text-left py-3 px-2 font-normal">Name</th>
            <th className="text-right py-3 px-2 font-normal cursor-pointer select-none" onClick={() => toggleSort('price')}>
              Price <SortArrow col="price" />
            </th>
            <th className="text-right py-3 px-2 font-normal cursor-pointer select-none" onClick={() => toggleSort('change24h')}>
              <span className="hidden sm:inline">24h </span>Change <SortArrow col="change24h" />
            </th>
            {isForex ? (
              <th className="text-center py-3 px-2 font-normal hidden md:table-cell w-24">Unit</th>
            ) : (
              <th className="text-center py-3 px-2 font-normal hidden md:table-cell w-20">24h Chart</th>
            )}
            <th className="text-right py-3 px-2 font-normal cursor-pointer select-none hidden sm:table-cell" onClick={() => !isForex && toggleSort('volume24h')}>
              {isForex ? 'Spread' : <>Volume <SortArrow col="volume24h" /></>}
            </th>
            <th className="text-right py-3 px-2 font-normal w-14 sm:w-20">Trade</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={7} className="text-center py-10 text-text-muted text-xs">No assets found</td></tr>
          )}
          {filtered.map((t, i) => {
            const flash = flashMap[t.pair];
            const bgFlash = flash === 'up'
              ? 'bg-[rgba(14,203,129,0.08)]'
              : flash === 'down'
                ? 'bg-[rgba(246,70,93,0.08)]'
                : '';
            const priceColor = flash === 'up' ? 'text-buy' : flash === 'down' ? 'text-sell' : 'text-text-primary';
            const tradeUrl = isForex ? `/futures/${t.pair}` : `/trade/${t.pair}`;
            const unit = t.assetType === 'commodity' ? 'Troy Oz' : t.assetType === 'forex' ? '1 Lot = 100K' : '';

            return (
              <tr
                key={t.pair}
                className={`border-b border-border/30 hover:bg-bg-hover/40 cursor-pointer transition-colors duration-[var(--motion-fast)] press ${bgFlash}`}
                onClick={() => router.push(tradeUrl)}
              >
                <td className="py-3 px-2 text-text-muted text-xs hidden sm:table-cell">{i + 1}</td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-bg-tertiary flex items-center justify-center text-[10px] font-bold text-text-secondary shrink-0">
                      {t.symbol.slice(0, 2)}
                    </div>
                    <div className="leading-tight min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-text-primary text-[12px] sm:text-[13px] transition-colors duration-[var(--motion-fast)] group-hover:text-accent">{t.symbol}</span>
                        {isForex && (
                          <span className="text-[9px] font-medium text-accent bg-accent/10 px-1 py-px hidden sm:inline">
                            {t.assetType === 'commodity' ? 'CFD' : 'FX'}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-text-muted truncate max-w-[80px] sm:max-w-none">{t.name}</div>
                    </div>
                  </div>
                </td>
                <td className={`py-3 px-2 text-right font-mono font-medium text-[12px] sm:text-[13px] transition-colors duration-300 ${priceColor}`}>
                  ${fmt(t.price)}
                </td>
                <td className="py-3 px-2 text-right">
                  <span className={`font-mono font-medium text-[12px] sm:text-[13px] ${t.change24h >= 0 ? 'text-buy' : 'text-sell'}`}>
                    {t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(2)}%
                  </span>
                </td>
                {isForex ? (
                  <td className="py-3 px-2 text-center hidden md:table-cell text-[11px] text-text-secondary">{unit}</td>
                ) : (
                  <td className="py-3 px-2 text-center hidden md:table-cell">
                    <Sparkline change={t.change24h} />
                  </td>
                )}
                <td className="py-3 px-2 text-right text-text-secondary font-mono hidden sm:table-cell text-[12px]">
                  {isForex
                    ? (t.assetType === 'commodity' ? '$0.50' : '0.3 pips')
                    : `$${fmtVol(t.volume24h)}`}
                </td>
                <td className="py-3 px-2 text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(tradeUrl); }}
                    className="text-accent text-xs font-medium hover:underline"
                  >
                    {isForex ? 'Futures' : 'Trade'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
