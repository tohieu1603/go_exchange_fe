'use client';
import { create } from 'zustand';
import type { Wallet } from '@/types';

interface WalletState {
  balances: Wallet[];
  setBalances: (balances: Wallet[]) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  balances: [],
  setBalances: (balances) => set({ balances }),
}));
