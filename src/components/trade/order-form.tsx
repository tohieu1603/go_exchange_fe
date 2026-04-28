'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useTradingStore } from '@/stores/trading-store';
import { useToast } from '@/components/ui/toast-provider';
import type { Wallet } from '@/types';
import { parsePair } from '@/lib/pair-utils';

interface Props {
  pair: string;
  initialPrice?: string;
}

const PCT_STEPS = [25, 50, 75, 100];
const numFmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
type OrderType = 'LIMIT' | 'MARKET' | 'STOP_LIMIT';

export function OrderForm({ pair, initialPrice = '' }: Props) {
  const { setOpenOrders } = useTradingStore();
  const toast = useToast();
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [type, setType] = useState<OrderType>('LIMIT');
  const [price, setPrice] = useState(initialPrice);
  const [amount, setAmount] = useState('');
  const [balances, setBalances] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activePct, setActivePct] = useState<number | null>(null);

  const [baseCurrency, quoteCurrency] = parsePair(pair);

  const fetchBalances = useCallback(() => {
    api.wallet.balances().then((res) => {
      if (res.data) setBalances(res.data);
    });
  }, []);

  useEffect(() => { fetchBalances(); }, [fetchBalances]);

  useEffect(() => {
    if (initialPrice) setPrice(initialPrice);
  }, [initialPrice]);

  const availableBalance = (() => {
    const currency = side === 'BUY' ? quoteCurrency : baseCurrency;
    return balances.find((b) => b.currency === currency)?.balance ?? 0;
  })();

  const priceNum = parseFloat(price) || 0;
  const amountNum = parseFloat(amount) || 0;
  const total = priceNum * amountNum;

  function handlePctClick(pct: number) {
    setActivePct(pct);
    if (side === 'BUY' && priceNum > 0) {
      setAmount(((availableBalance * pct) / 100 / priceNum).toFixed(8));
    } else if (side === 'SELL') {
      setAmount(((availableBalance * pct) / 100).toFixed(8));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!amount || amountNum <= 0) { setError('Enter a valid amount'); return; }
    if (type !== 'MARKET' && (!price || priceNum <= 0)) { setError('Enter a valid price'); return; }

    setLoading(true);
    try {
      const res = await api.trading.placeOrder({
        pair,
        side,
        type,
        price: type === 'MARKET' ? 0 : priceNum,
        amount: amountNum,
      });
      if (res.success && res.data) {
        toast.success(`${res.data.status === 'FILLED' ? 'Filled' : 'Placed'} ${side} ${amountNum} ${baseCurrency}`);
        setAmount('');
        setActivePct(null);
        if (type !== 'MARKET') setPrice('');
        setError('');
        const ordersRes = await api.trading.openOrders();
        if (ordersRes.data) setOpenOrders(ordersRes.data);
        fetchBalances();
      } else {
        toast.error(res.message ?? 'Order failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }

  const isBuy = side === 'BUY';

  return (
    <div className="bg-bg-secondary flex flex-col h-full">
      {/* Buy / Sell tab */}
      <div className="flex shrink-0" style={{ height: '40px' }}>
        <button
          onClick={() => { setSide('BUY'); setActivePct(null); }}
          className={`flex-1 text-[13px] font-medium transition-colors ${
            isBuy ? 'bg-buy text-black' : 'bg-bg-tertiary text-text-secondary hover:text-buy'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => { setSide('SELL'); setActivePct(null); }}
          className={`flex-1 text-[13px] font-medium transition-colors ${
            !isBuy ? 'bg-sell text-white' : 'bg-bg-tertiary text-text-secondary hover:text-sell'
          }`}
        >
          Sell
        </button>
      </div>

      <div className="px-3 md:px-3 py-3 md:py-2 flex flex-col gap-3 md:gap-2">
        {/* Order type tabs — underline indicator */}
        <div className="flex border-b border-border">
          {(['LIMIT', 'MARKET', 'STOP_LIMIT'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={[
                'px-3 md:px-2 py-2 md:py-1.5 text-[12px] md:text-[11px] font-medium transition-colors border-b-2 -mb-px',
                type === t
                  ? 'text-text-primary border-accent'
                  : 'text-text-muted border-transparent hover:text-text-secondary',
              ].join(' ')}
            >
              {t === 'STOP_LIMIT' ? 'Stop-Limit' : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:gap-2">
          {/* Available balance */}
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-text-muted">
              Available{' '}
              <span className="text-text-secondary font-mono tabular-nums">
                {isBuy
                  ? `${numFmt.format(availableBalance)} ${quoteCurrency}`
                  : `${availableBalance.toFixed(5)} ${baseCurrency}`}
              </span>
            </span>
          </div>

          {/* Price input */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-text-muted">Price</label>
            <div className="relative flex items-center">
              <input
                type={type === 'MARKET' ? 'text' : 'number'}
                min="0"
                step="any"
                value={type === 'MARKET' ? 'Market Price' : price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={type === 'MARKET'}
                placeholder="0.00"
                className="w-full h-10 md:h-8 bg-bg-tertiary px-2 pr-14 text-[12px] text-text-primary font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:text-text-muted border-none appearance-none"
                style={{ borderRadius: 0 }}
              />
              <span className="absolute right-2 text-[11px] text-text-muted pointer-events-none select-none">{quoteCurrency}</span>
            </div>
          </div>

          {/* Amount input */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-text-muted">Amount</label>
            <div className="relative flex items-center">
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setActivePct(null); }}
                placeholder="0.00000"
                className="w-full h-10 md:h-8 bg-bg-tertiary px-2 pr-12 text-[12px] text-text-primary font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-accent/40 border-none appearance-none"
                style={{ borderRadius: 0 }}
              />
              <span className="absolute right-2 text-[11px] text-text-muted pointer-events-none select-none">{baseCurrency}</span>
            </div>
          </div>

          {/* Percentage slider — dots on a line */}
          <div className="relative flex items-center justify-between py-1">
            {/* connecting line */}
            <div className="absolute left-0 right-0 h-px bg-border top-1/2 -translate-y-1/2" />
            {PCT_STEPS.map((pct) => {
              const isActive = activePct !== null && activePct >= pct;
              return (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePctClick(pct)}
                  className="relative flex flex-col items-center gap-0.5 z-10"
                  title={`${pct}%`}
                >
                  <div
                    className={`w-3 h-3 border-2 transition-colors ${
                      isActive
                        ? isBuy ? 'bg-buy border-buy' : 'bg-sell border-sell'
                        : 'bg-bg-secondary border-border hover:border-text-secondary'
                    }`}
                    style={{ borderRadius: '50%' }}
                  />
                  <span className={`text-[10px] ${isActive ? 'text-text-primary' : 'text-text-muted'}`}>
                    {pct}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Total */}
          <div className="flex flex-col gap-0.5">
            <label className="text-[11px] text-text-muted">Total</label>
            <div className="relative flex items-center">
              <div
                className="w-full h-8 bg-bg-tertiary px-2 pr-14 text-[12px] text-text-secondary font-mono tabular-nums flex items-center"
                style={{ borderRadius: 0 }}
              >
                {type !== 'MARKET' ? numFmt.format(total) : '--'}
              </div>
              <span className="absolute right-2 text-[11px] text-text-muted pointer-events-none select-none">{quoteCurrency}</span>
            </div>
          </div>

          {error && (
            <p className="text-[11px] text-sell bg-sell-bg px-2 py-1.5">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className={`w-full text-[13px] font-medium transition-colors disabled:opacity-50 ${
              isBuy ? 'bg-buy text-black hover:brightness-105' : 'bg-sell text-white hover:brightness-105'
            }`}
            style={{ height: '40px', borderRadius: 0 }}
          >
            {loading ? '...' : `${isBuy ? 'Buy' : 'Sell'} ${baseCurrency}`}
          </button>
        </form>
      </div>
    </div>
  );
}
