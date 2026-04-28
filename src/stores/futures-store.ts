'use client';
import { create } from 'zustand';
import type { Position } from '@/types';

interface FuturesState {
  positions: Position[];
  leverage: number;
  setPositions: (positions: Position[]) => void;
  addPosition: (position: Position) => void;
  removePosition: (id: number) => void;
  setLeverage: (lev: number) => void;
}

export const useFuturesStore = create<FuturesState>((set) => ({
  positions: [],
  leverage: 10,

  setPositions: (positions) => set({ positions }),

  addPosition: (position) =>
    set((state) => ({ positions: [...state.positions, position] })),

  removePosition: (id) =>
    set((state) => ({
      positions: state.positions.filter((p) => p.id !== id),
    })),

  setLeverage: (leverage) => set({ leverage }),
}));
