'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTradingStore } from '@/stores/trading-store';
import { usePriceStore } from '@/stores/price-store';
import { parsePair } from '@/lib/pair-utils';
import { TradingChart } from '@/components/trade/trading-chart';
import { OrderBook } from '@/components/trade/order-book';
import { FuturesOrderForm } from '@/components/futures/futures-order-form';
import { PositionTable } from '@/components/futures/position-table';
import { OpenOrders } from '@/components/trade/open-orders';
import { TradeHistory } from '@/components/trade/trade-history';
import { PairSelector } from '@/components/trade/pair-selector';

type BottomTab = 'positions' | 'open_orders' | 'order_history';
type MobilePanel = 'orderbook' | 'trades';

function volFmt(v: number) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toFixed(0)}`;
}

const BOTTOM_TABS: { key: BottomTab; label: string }[] = [
  { key: 'positions', label: 'Positions' },
  { key: 'open_orders', label: 'Open Orders' },
  { key: 'order_history', label: 'Order History' },
];

export default function FuturesPage() {
  const params = useParams();
  const pair = (params?.pair as string) ?? 'BTC_USDT';
  const { setPair } = useTradingStore();
  const { tickers } = usePriceStore();
  const [positionRefresh, setPositionRefresh] = useState(0);
  const [bottomTab, setBottomTab] = useState<BottomTab>('positions');
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('orderbook');
  const [openOrdersOpen, setOpenOrdersOpen] = useState(false);

  useEffect(() => { setPair(pair); }, [pair, setPair]);

  const [base, quote] = parsePair(pair);
  const ticker = Object.values(tickers).find((t) => t.pair === pair);
  const priceChange = ticker?.change24h ?? 0;
  const isUp = priceChange >= 0;
  const priceDec = ticker && ticker.price < 1 ? 6 : 2;

  // Simulated funding rate
  const fundingRate = 0.0001;

  return (
    <div className="flex flex-col bg-bg-primary" style={{ minHeight: 'calc(100vh - 48px)' }}>

      {/* Pair info bar — 40px */}
      <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-3 bg-bg-secondary shrink-0 overflow-x-auto" style={{ height: '40px', minHeight: '40px' }}>
        <PairSelector currentPair={pair} basePath="/futures" />
        <span className="text-[10px] font-semibold text-accent bg-accent/10 px-1.5 py-0.5 shrink-0">PERP</span>
        <div className="w-px h-5 bg-border shrink-0" />
        {ticker ? (
          <>
            <span className={`text-[16px] sm:text-[18px] font-bold font-mono tabular-nums leading-none shrink-0 ${isUp ? 'text-buy' : 'text-sell'}`}>
              {ticker.price.toLocaleString('en-US', { minimumFractionDigits: priceDec, maximumFractionDigits: priceDec })}
            </span>
            <span className={`text-[11px] sm:text-[12px] font-mono shrink-0 ${isUp ? 'text-buy' : 'text-sell'}`}>
              {isUp ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
            <div className="hidden md:flex items-center gap-5 text-[11px]">
              <div>
                <div className="text-text-muted">Mark Price</div>
                <div className="text-text-primary font-mono tabular-nums">
                  {ticker.price.toLocaleString('en-US', { minimumFractionDigits: priceDec, maximumFractionDigits: priceDec })}
                </div>
              </div>
              <div>
                <div className="text-text-muted">Index Price</div>
                <div className="text-text-primary font-mono tabular-nums">
                  {(ticker.price * 0.9998).toLocaleString('en-US', { minimumFractionDigits: priceDec, maximumFractionDigits: priceDec })}
                </div>
              </div>
              <div>
                <div className="text-text-muted">Funding Rate</div>
                <div className={`font-mono tabular-nums ${fundingRate >= 0 ? 'text-buy' : 'text-sell'}`}>
                  {fundingRate >= 0 ? '+' : ''}{(fundingRate * 100).toFixed(4)}%
                </div>
              </div>
              <div>
                <div className="text-text-muted">24h Volume</div>
                <div className="text-text-primary font-mono tabular-nums">{volFmt(Math.abs(ticker.volume24h))}</div>
              </div>
              <div>
                <div className="text-text-muted">24h High</div>
                <div className="text-text-primary font-mono tabular-nums">
                  {(ticker.price * 1.02).toLocaleString('en-US', { minimumFractionDigits: priceDec, maximumFractionDigits: priceDec })}
                </div>
              </div>
              <div>
                <div className="text-text-muted">24h Low</div>
                <div className="text-text-primary font-mono tabular-nums">
                  {(ticker.price * 0.98).toLocaleString('en-US', { minimumFractionDigits: priceDec, maximumFractionDigits: priceDec })}
                </div>
              </div>
            </div>
          </>
        ) : (
          <span className="text-[13px] text-text-muted">{base}/{quote} PERP</span>
        )}
      </div>

      {/* ── Mobile layout (<md): vertical stack ── */}
      <div className="flex flex-col md:hidden flex-1">
        {/* Chart */}
        <div className="bg-bg-secondary w-full" style={{ height: '300px' }}>
          <TradingChart pair={pair} />
        </div>

        {/* Toggle: Order Book | Trades */}
        <div className="flex bg-bg-secondary border-t border-b border-border shrink-0" style={{ height: '36px' }}>
          {(['orderbook', 'trades'] as MobilePanel[]).map((p) => (
            <button
              key={p}
              onClick={() => setMobilePanel(p)}
              className={[
                'flex-1 text-[12px] font-medium transition-colors border-b-2 -mb-px',
                mobilePanel === p
                  ? 'text-text-primary border-accent'
                  : 'text-text-muted border-transparent',
              ].join(' ')}
            >
              {p === 'orderbook' ? 'Order Book' : 'Trades'}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="bg-bg-secondary" style={{ height: '260px', overflow: 'hidden' }}>
          {mobilePanel === 'orderbook'
            ? <OrderBook pair={pair} />
            : <TradeHistory pair={pair} />}
        </div>

        {/* Futures Order Form */}
        <div className="bg-bg-secondary border-t border-border">
          <FuturesOrderForm pair={pair} onPositionOpened={() => setPositionRefresh((n) => n + 1)} />
        </div>

        {/* Open Positions — collapsible */}
        <div className="bg-bg-secondary border-t border-border">
          <button
            onClick={() => setOpenOrdersOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-[12px] font-medium text-text-secondary hover:text-text-primary"
          >
            <span>Positions &amp; Orders</span>
            <span className="text-[10px]">{openOrdersOpen ? '▲' : '▼'}</span>
          </button>
          {openOrdersOpen && (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <PositionTable refreshTrigger={positionRefresh} />
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop layout (≥md): existing structure ── */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 gap-px bg-bg-primary" style={{ height: 'calc(100vh - 88px)' }}>
        {/* Top row: chart | orderbook | futures form */}
        <div className="flex-1 min-h-0 flex gap-px">
          {/* Chart */}
          <div className="flex-1 min-w-0 bg-bg-secondary overflow-hidden">
            <TradingChart pair={pair} />
          </div>
          {/* Order Book */}
          <div className="bg-bg-secondary overflow-hidden shrink-0" style={{ width: '220px' }}>
            <OrderBook pair={pair} />
          </div>
          {/* Futures Order Form */}
          <div className="bg-bg-secondary overflow-y-auto shrink-0" style={{ width: '320px' }}>
            <FuturesOrderForm pair={pair} onPositionOpened={() => setPositionRefresh((n) => n + 1)} />
          </div>
        </div>

        {/* Bottom panel — 200px */}
        <div className="bg-bg-secondary shrink-0 flex flex-col overflow-hidden" style={{ height: '200px' }}>
          <div className="flex shrink-0 border-b border-border" style={{ height: '32px' }}>
            {BOTTOM_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setBottomTab(key)}
                className={[
                  'px-4 text-[12px] h-full transition-colors border-b-2 -mb-px',
                  bottomTab === key
                    ? 'text-text-primary border-accent font-medium'
                    : 'text-text-muted border-transparent hover:text-text-secondary',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {bottomTab === 'positions' && <PositionTable refreshTrigger={positionRefresh} />}
            {bottomTab === 'open_orders' && <OpenOrders pair={pair} />}
            {bottomTab === 'order_history' && <TradeHistory pair={pair} />}
          </div>
        </div>
      </div>
    </div>
  );
}
