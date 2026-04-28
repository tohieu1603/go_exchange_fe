'use client';
import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, type IChartApi, type ISeriesApi, type CandlestickSeriesOptions } from 'lightweight-charts';
import { api } from '@/lib/api';
import { useTradingStore } from '@/stores/trading-store';
import { useChannel } from '@/hooks/use-ws';
import { IntervalSelector } from './interval-selector';

const CHART_OPTS = {
  layout: {
    background: { color: '#181a20' },
    textColor: '#848e9c',
    fontSize: 11,
  },
  grid: {
    vertLines: { color: '#1e2329' },
    horzLines: { color: '#1e2329' },
  },
  crosshair: { mode: 0 as const },
  timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#2b3139' },
  rightPriceScale: { borderColor: '#2b3139' },
};

const CANDLE_OPTS: Partial<CandlestickSeriesOptions> = {
  upColor: '#0ecb81',
  downColor: '#f6465d',
  borderUpColor: '#0ecb81',
  borderDownColor: '#f6465d',
  wickUpColor: '#0ecb81',
  wickDownColor: '#f6465d',
};

interface CandleBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Props {
  pair: string;
}

export function TradingChart({ pair }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const { currentInterval } = useTradingStore();

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      ...CHART_OPTS,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 400,
    });

    const series = chart.addSeries(CandlestickSeries, CANDLE_OPTS);
    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Debounced + cancel-guarded candle fetch.
  //
  // Why: rapid interval clicks were stacking concurrent requests against
  // /market/candles, blowing past the gateway rate limit (429). The 150ms
  // debounce coalesces multi-clicks; `cancelled` ensures only the latest
  // request mutates the chart series.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      const res = await api.market.candles(pair, currentInterval, 500);
      if (cancelled) return;
      if (!res.success || !res.data) return;
      const data: CandleBar[] = res.data.map((c) => ({
        time: c.time, open: c.open, high: c.high, low: c.low, close: c.close,
      }));
      if (seriesRef.current && data.length) {
        seriesRef.current.setData(data as Parameters<typeof seriesRef.current.setData>[0]);
        chartRef.current?.timeScale().fitContent();
      }
    }, 150);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [pair, currentInterval]);

  useChannel(`candle@${currentInterval}@${pair}`, (data) => {
    if (!seriesRef.current || !data) return;
    const candle = data as CandleBar;
    seriesRef.current.update({
      time: candle.time as Parameters<typeof seriesRef.current.update>[0]['time'],
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    });
  });

  return (
    <div className="flex flex-col h-full bg-bg-secondary">
      <div className="px-2 flex items-center h-8 shrink-0">
        <IntervalSelector />
      </div>
      <div ref={containerRef} className="flex-1 w-full min-h-[300px] md:min-h-[400px] lg:min-h-[500px]" />
    </div>
  );
}
