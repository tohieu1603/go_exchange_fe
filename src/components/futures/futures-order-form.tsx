'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { usePriceStore } from '@/stores/price-store';
import { useToast } from '@/components/ui/toast-provider';

const PCT_BUTTONS = [25, 50, 75, 100];
const LEVERAGE_PRESETS = [1, 5, 10, 25, 50, 75, 100, 125];

interface Props {
  pair: string;
  onPositionOpened?: () => void;
}

// Forex/commodity lot sizes: XAU=100oz/lot, forex=100K/lot
const LOT_SIZES: Record<string, { lotSize: number; unit: string; step: string }> = {
  XAU: { lotSize: 100, unit: 'oz', step: '0.01' },
  PAXG: { lotSize: 100, unit: 'oz', step: '0.01' },
  EUR: { lotSize: 100000, unit: 'units', step: '0.01' },
  GBP: { lotSize: 100000, unit: 'units', step: '0.01' },
  JPY: { lotSize: 100000, unit: 'units', step: '0.01' },
};

export function FuturesOrderForm({ pair, onPositionOpened }: Props) {
  const toast = useToast();
  const { tickers } = usePriceStore();
  const ticker = Object.values(tickers).find((t) => t.pair === pair);
  const markPrice = ticker?.price ?? 0;
  const assetType = ticker?.assetType || 'crypto';
  const baseCurrency = pair.split('_')[0];
  const lotInfo = LOT_SIZES[baseCurrency];
  const isForex = assetType === 'forex' || assetType === 'commodity';

  const [side, setSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [leverage, setLeverage] = useState(10);
  const [size, setSize] = useState(''); // for crypto: raw units, for forex: lots
  const [activePct, setActivePct] = useState<number | null>(null);
  const [showTPSL, setShowTPSL] = useState(false);
  const [takeProfit, setTakeProfit] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [availableUSDT, setAvailableUSDT] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchBalance = useCallback(async () => {
    const res = await api.wallet.balances();
    if (res.success && res.data) {
      const usdt = res.data.find((w) => w.currency === 'USDT');
      setAvailableUSDT(usdt?.balance ?? 0);
    }
  }, []);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  const sizeNum = parseFloat(size) || 0;
  // For forex: convert lots to actual units for API
  const actualSize = isForex && lotInfo ? sizeNum * lotInfo.lotSize : sizeNum;
  const marginRequired = markPrice > 0 && actualSize > 0 ? (actualSize * markPrice) / leverage : 0;
  const liqPrice = markPrice > 0 && actualSize > 0
    ? side === 'LONG'
      ? markPrice * (1 - 1 / leverage)
      : markPrice * (1 + 1 / leverage)
    : 0;

  function applyPct(pct: number) {
    if (markPrice <= 0) return;
    setActivePct(pct);
    const margin = (availableUSDT * pct) / 100;
    const rawSize = (margin * leverage) / markPrice;
    if (isForex && lotInfo) {
      setSize((rawSize / lotInfo.lotSize).toFixed(2));
    } else {
      setSize(rawSize.toFixed(6));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!sizeNum || sizeNum <= 0) { setError('Enter a valid size'); return; }
    setLoading(true);
    try {
      const res = await api.futures.openPosition({
        pair,
        side,
        leverage,
        size: actualSize,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      });
      if (res.success) {
        toast.success(`${side} position opened`);
        setSize('');
        setActivePct(null);
        setTakeProfit('');
        setStopLoss('');
        setError('');
        fetchBalance();
        onPositionOpened?.();
      } else {
        toast.error(res.message || 'Failed to open position');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }

  const isLong = side === 'LONG';
  const sizeLabel = isForex ? 'Size (Lots)' : 'Size';
  const sizeUnit = isForex && lotInfo ? 'Lot' : baseCurrency;
  const notional = actualSize * markPrice;

  return (
    <div className="bg-bg-secondary flex flex-col">
      {/* LONG / SHORT toggle */}
      <div className="flex shrink-0" style={{ height: '36px' }}>
        <button
          type="button"
          onClick={() => { setSide('LONG'); setActivePct(null); }}
          className={`flex-1 text-[13px] font-medium transition-colors ${
            isLong ? 'bg-buy text-black' : 'bg-bg-tertiary text-text-secondary hover:text-buy'
          }`}
          style={{ borderRadius: 0 }}
        >
          Long
        </button>
        <button
          type="button"
          onClick={() => { setSide('SHORT'); setActivePct(null); }}
          className={`flex-1 text-[13px] font-medium transition-colors ${
            !isLong ? 'bg-sell text-white' : 'bg-bg-tertiary text-text-secondary hover:text-sell'
          }`}
          style={{ borderRadius: 0 }}
        >
          Short
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-3 py-2 flex flex-col gap-2">
        {/* Isolated badge + Available balance */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-muted bg-bg-tertiary px-1.5 py-0.5 font-medium" style={{ borderRadius: 0 }}>
            Isolated
          </span>
          <span className="text-[11px] text-text-muted">
            Avbl{' '}
            <span className="text-text-secondary font-mono tabular-nums">{availableUSDT.toFixed(2)} USDT</span>
          </span>
        </div>

        {/* Leverage */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-text-muted">Leverage</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={125}
                value={leverage}
                onChange={(e) => setLeverage(Math.max(1, Math.min(125, Number(e.target.value))))}
                className="w-12 h-6 bg-bg-tertiary px-1 text-[12px] text-accent font-mono text-center focus:outline-none focus:ring-1 focus:ring-accent/40 border-none appearance-none"
                style={{ borderRadius: 0 }}
              />
              <span className="text-[12px] text-accent font-mono">x</span>
            </div>
          </div>
          <input
            type="range"
            min={1}
            max={125}
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="w-full h-1 accent-accent"
          />
          {/* Preset leverage buttons */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {LEVERAGE_PRESETS.map((lev) => (
              <button
                key={lev}
                type="button"
                onClick={() => setLeverage(lev)}
                className={`px-1.5 h-5 text-[10px] transition-colors border ${
                  leverage === lev
                    ? 'text-accent border-accent'
                    : 'text-text-muted border-border hover:text-text-secondary hover:border-text-muted'
                }`}
                style={{ borderRadius: 0 }}
              >
                {lev}x
              </button>
            ))}
          </div>
        </div>

        {/* Size input */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[11px] text-text-muted">{sizeLabel}</label>
          <div className="relative flex items-center">
            <input
              type="number"
              min="0"
              step="any"
              value={size}
              onChange={(e) => { setSize(e.target.value); setActivePct(null); }}
              placeholder="0.00000"
              className="w-full h-8 bg-bg-tertiary px-2 pr-14 text-[12px] text-text-primary font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-accent/40 border-none appearance-none"
              style={{ borderRadius: 0 }}
            />
            <span className="absolute right-2 text-[11px] text-text-muted pointer-events-none select-none">{sizeUnit}</span>
          </div>
          {/* % buttons */}
          <div className="flex gap-1 mt-0.5">
            {PCT_BUTTONS.map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => applyPct(pct)}
                className={`flex-1 h-6 text-[11px] transition-colors border ${
                  activePct === pct
                    ? isLong ? 'text-buy border-buy' : 'text-sell border-sell'
                    : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-primary'
                }`}
                style={{ borderRadius: 0 }}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* TP/SL collapsible */}
        <button
          type="button"
          onClick={() => setShowTPSL((v) => !v)}
          className="flex items-center gap-1 text-[11px] text-accent hover:text-accent-hover text-left"
        >
          <span>{showTPSL ? '▼' : '▶'}</span>
          <span>TP / SL</span>
        </button>

        {showTPSL && (
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-0.5">
              <label className="text-[11px] text-text-muted">Take Profit</label>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="Price"
                className="w-full h-8 bg-bg-tertiary px-2 text-[12px] text-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-buy/40 border-none appearance-none"
                style={{ borderRadius: 0 }}
              />
            </div>
            <div className="flex-1 flex flex-col gap-0.5">
              <label className="text-[11px] text-text-muted">Stop Loss</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="Price"
                className="w-full h-8 bg-bg-tertiary px-2 text-[12px] text-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-sell/40 border-none appearance-none"
                style={{ borderRadius: 0 }}
              />
            </div>
          </div>
        )}

        {/* Info rows */}
        <div className="flex flex-col gap-1 pt-1 border-t border-border">
          {isForex && lotInfo && sizeNum > 0 && (
            <div className="flex justify-between text-[11px]">
              <span className="text-text-muted">{sizeNum} Lot = {actualSize.toLocaleString()} {lotInfo.unit}</span>
              <span className="font-mono tabular-nums text-text-secondary">${notional.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-[11px]">
            <span className="text-text-muted">Margin Required</span>
            <span className="font-mono tabular-nums text-text-primary">${marginRequired.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-text-muted">Est. Liq. Price</span>
            <span className={`font-mono tabular-nums ${isLong ? 'text-sell' : 'text-buy'}`}>
              {liqPrice > 0 ? liqPrice.toFixed(2) : '--'}
            </span>
          </div>
        </div>

        {error && <p className="text-[11px] text-sell bg-sell-bg px-2 py-1.5">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className={`w-full text-[13px] font-medium transition-colors disabled:opacity-50 ${
            isLong ? 'bg-buy text-black hover:brightness-105' : 'bg-sell text-white hover:brightness-105'
          }`}
          style={{ height: '40px', borderRadius: 0 }}
        >
          {loading ? '...' : `Open ${isLong ? 'Long' : 'Short'}`}
        </button>
      </form>
    </div>
  );
}
