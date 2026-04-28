'use client';
import { create } from 'zustand';
import type { Order } from '@/types';

interface TradingState {
  currentPair: string;
  currentInterval: string;
  openOrders: Order[];
  setPair: (pair: string) => void;
  setInterval: (interval: string) => void;
  setOpenOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  removeOrder: (id: number) => void;
}

export const useTradingStore = create<TradingState>((set) => ({
  currentPair: 'BTC_USDT',
  currentInterval: '1h',
  openOrders: [],

  setPair: (pair) => set({ currentPair: pair }),
  setInterval: (interval) => set({ currentInterval: interval }),
  setOpenOrders: (orders) => set({ openOrders: orders }),

  addOrder: (order) =>
    set((state) => ({ openOrders: [...state.openOrders, order] })),

  removeOrder: (id) =>
    set((state) => ({
      openOrders: state.openOrders.filter((o) => o.id !== id),
    })),
}));
