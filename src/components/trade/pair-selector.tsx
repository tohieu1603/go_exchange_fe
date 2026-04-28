'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { usePriceStore } from '@/stores/price-store';
import type { Ticker } from '@/types';

// PairSelector — desktop: anchored dropdown.  Mobile: full-screen overlay
// with backdrop, scrollable list, close button. Both share the same data
// source (Zustand store first, fallback fetch).

interface Props {
  currentPair: string;
  basePath?: string;
}

export function PairSelector({ currentPair, basePath = '/trade' }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const { tickers: storeTickers } = usePriceStore();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = Object.values(storeTickers);
    if (stored.length > 0) {
      Promise.resolve(stored).then((s) => setTickers(s));
    } else {
      api.market.tickers().then((res) => { if (res.data) setTickers(res.data); }).catch(() => {});
    }
  }, [storeTickers]);

  // Close on outside click (desktop) and Escape (both). Mobile uses backdrop.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Lock body scroll when full-screen mobile overlay is open.
  useEffect(() => {
    if (!open) return;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (!isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  function handleSelect(pair: string) {
    setOpen(false);
    setSearch('');
    router.push(`${basePath}/${pair}`);
  }

  const filtered = tickers.filter((t) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return t.symbol.toLowerCase().includes(q) || t.pair.toLowerCase().includes(q);
  });

  const displayPair = currentPair.replace('_', '/');

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 h-8 bg-bg-tertiary hover:bg-bg-hover transition-colors rounded"
      >
        <span className="font-semibold text-[13px] text-text-primary">{displayPair}</span>
        <ChevronDown className={`w-3 h-3 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2.5} />
      </button>

      {open && (
        <>
          {/* Mobile backdrop — visible <md only */}
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Panel — full-screen sheet on mobile, anchored dropdown on md+ */}
          <div
            className="
              fixed inset-x-0 bottom-0 top-12 z-50
              md:absolute md:inset-auto md:top-full md:left-0 md:mt-1 md:w-80 md:bottom-auto md:max-h-[60vh]
              bg-bg-secondary border border-border shadow-2xl flex flex-col rounded-t-lg md:rounded
            "
          >
            {/* Header — close button + search */}
            <div className="flex items-center gap-2 p-2 border-b border-border shrink-0">
              <div className="flex-1 flex items-center gap-2 px-2 h-9 bg-bg-tertiary rounded">
                <Search className="w-3.5 h-3.5 text-text-muted shrink-0" strokeWidth={2} />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search pair..."
                  className="flex-1 bg-transparent border-none text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                />
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="text-center text-text-muted text-[12px] py-8">
                  {tickers.length === 0 ? 'Loading pairs…' : 'No pairs found'}
                </div>
              ) : (
                filtered.map((t) => (
                  <button
                    key={t.pair}
                    onClick={() => handleSelect(t.pair)}
                    className={`w-full flex items-center justify-between px-3 h-10 hover:bg-bg-hover transition-colors ${
                      t.pair === currentPair ? 'bg-bg-tertiary' : ''
                    }`}
                  >
                    <span className="font-medium text-[13px] text-text-primary">{t.symbol}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-mono tabular-nums text-text-primary">
                        {t.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: t.price < 1 ? 8 : 2 })}
                      </span>
                      <span className={`text-[12px] w-16 text-right tabular-nums ${t.change24h >= 0 ? 'text-buy' : 'text-sell'}`}>
                        {t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(2)}%
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
