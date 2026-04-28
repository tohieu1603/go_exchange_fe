'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Deposit } from '@/types';

const VND_FORMAT = new Intl.NumberFormat('vi-VN');
const EXCHANGE_RATE = 25000; // 1 USDT = 25,000 VND fallback

export default function DepositPage() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [pollStatus, setPollStatus] = useState('');

  const fetchDeposits = useCallback(async () => {
    const res = await api.wallet.deposits(1, 10);
    if (res.success && res.data) setDeposits(res.data.content);
  }, []);

  useEffect(() => { fetchDeposits(); }, [fetchDeposits]);

  // Poll pending deposit status
  useEffect(() => {
    if (!deposit || deposit.status === 'COMPLETED' || deposit.status === 'FAILED') return;
    const interval = setInterval(async () => {
      const res = await api.wallet.deposits(1, 5);
      if (res.success && res.data) {
        const updated = res.data.content.find((d) => d.id === deposit.id);
        if (updated) {
          setDeposit(updated);
          setDeposits(res.data.content);
          if (updated.status === 'COMPLETED') {
            setPollStatus('Payment confirmed!');
            clearInterval(interval);
          }
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [deposit]);

  const amountNum = parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const usdtReceive = amountNum > 0 ? (amountNum / EXCHANGE_RATE).toFixed(2) : '0.00';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (amountNum < 10000) { setError('Minimum deposit is 10,000 VND'); return; }
    setLoading(true);
    try {
      const res = await api.wallet.deposit(amountNum);
      if (res.success && res.data) {
        setDeposit(res.data);
        fetchDeposits();
      } else {
        setError(res.message || 'Failed to create deposit');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
      PENDING: 'bg-accent/10 text-accent',
      COMPLETED: 'bg-buy-bg text-buy',
      FAILED: 'bg-sell-bg text-sell',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[status] ?? 'bg-bg-tertiary text-text-secondary'}`}>{status}</span>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/wallet" className="text-text-secondary hover:text-text-primary text-sm">Wallet</Link>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary text-sm font-medium">Deposit</span>
      </div>

      <h1 className="text-2xl font-bold text-text-primary mb-6">Deposit VND</h1>

      {/* Exchange rate info */}
      <div className="bg-bg-secondary rounded-xl border border-border p-4 mb-6 text-sm text-text-secondary">
        Exchange rate: <span className="text-text-primary font-mono font-medium">1 USDT = {VND_FORMAT.format(EXCHANGE_RATE)} VND</span>
      </div>

      {!deposit ? (
        <form onSubmit={handleSubmit} className="bg-bg-secondary rounded-xl border border-border p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm text-text-secondary mb-2">Amount (VND)</label>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 500000"
              className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-3 text-text-primary font-mono text-sm focus:outline-none focus:border-accent/50"
            />
            <p className="text-xs text-text-muted mt-1">Minimum: 10,000 VND</p>
          </div>

          {amountNum >= 10000 && (
            <div className="bg-bg-tertiary rounded-lg p-3 text-sm">
              <span className="text-text-secondary">You will receive approximately </span>
              <span className="text-buy font-bold font-mono">~{usdtReceive} USDT</span>
            </div>
          )}

          {error && <p className="text-sell text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-accent text-black font-semibold text-sm rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50">
            {loading ? 'Creating order...' : 'Create Deposit Order'}
          </button>
        </form>
      ) : (
        <div className="bg-bg-secondary rounded-xl border border-border p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">Payment Details</h2>
            <StatusBadge status={deposit.status} />
          </div>

          {deposit.qrCodeUrl && (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={deposit.qrCodeUrl} alt="QR Code" className="w-48 h-48 rounded-lg border border-border" />
            </div>
          )}

          <div className="bg-bg-tertiary rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Order Code</span>
              <span className="font-mono text-text-primary font-semibold">{deposit.orderCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Amount</span>
              <span className="font-mono text-text-primary">{VND_FORMAT.format(deposit.amount)} VND</span>
            </div>
          </div>

          {deposit.status === 'PENDING' && (
            <div className="flex items-center gap-2 text-sm text-accent">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              {pollStatus || 'Waiting for payment confirmation...'}
            </div>
          )}
          {deposit.status === 'COMPLETED' && (
            <p className="text-buy text-sm font-semibold">Payment confirmed! USDT has been credited to your account.</p>
          )}

          <button onClick={() => { setDeposit(null); setAmount(''); }} className="text-sm text-accent hover:underline">
            Create new deposit
          </button>
        </div>
      )}

      {/* Recent deposits */}
      {deposits.length > 0 && (
        <div className="mt-8 bg-bg-secondary rounded-xl border border-border overflow-hidden">
          <h2 className="text-sm font-semibold text-text-primary px-5 py-3 border-b border-border">Recent Deposits</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Date', 'Amount (VND)', 'Order Code', 'Status'].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 text-text-muted text-xs uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deposits.map((d) => (
                <tr key={d.id} className="table-row-hover border-b border-border last:border-0">
                  <td className="px-5 py-3 text-text-secondary text-xs">{new Date(d.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="px-5 py-3 font-mono text-text-primary">{VND_FORMAT.format(d.amount)}</td>
                  <td className="px-5 py-3 font-mono text-text-muted text-xs">{d.orderCode}</td>
                  <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
