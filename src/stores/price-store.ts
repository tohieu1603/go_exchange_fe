'use client';

import { create } from 'zustand';
import type { Ticker } from '@/types';

interface PriceState {
  tickers: Record<string, Ticker>;
  setTicker: (pair: string, ticker: Ticker) => void;
  setAllTickers: (tickers: Ticker[]) => void;
}

export const usePriceStore = create<PriceState>((set) => ({
  tickers: {},

  setTicker: (pair: string, ticker: Ticker) =>
    set((state) => ({
      tickers: {
        ...state.tickers,
        [pair]: { ...state.tickers[pair], ...ticker },
      },
    })),

  setAllTickers: (tickers: Ticker[]) =>
    set({
      tickers: tickers.reduce<Record<string, Ticker>>((acc, t) => {
        acc[t.pair] = t;
        return acc;
      }, {}),
    }),
}));
