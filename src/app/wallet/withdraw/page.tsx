'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Wallet } from '@/types';

const BANKS = [
  { code: 'MB', name: 'MBBank' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'STB', name: 'Sacombank' },
];

const VND_FORMAT = new Intl.NumberFormat('vi-VN');

interface WithdrawalRecord {
  id: number;
  amount: number;
  bankCode: string;
  status: string;
  createdAt: string;
}

export default function WithdrawPage() {
  const [vndBalance, setVndBalance] = useState(0);
  const [bankCode, setBankCode] = useState('MB');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);

  const fetchData = useCallback(async () => {
    const [balRes, wRes] = await Promise.all([
      api.wallet.balances(),
      api.walletExtra.withdrawals(1, 10),
    ]);
    if (balRes.success && balRes.data) {
      const vnd = balRes.data.find((w: Wallet) => w.currency === 'VND');
      setVndBalance(vnd?.balance ?? 0);
    }
    if (wRes.success && wRes.data) setWithdrawals(wRes.data.content);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const amountNum = parseInt(amount.replace(/\D/g, ''), 10) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!accountNumber) { setError('Enter account number'); return; }
    if (!accountName) { setError('Enter account name'); return; }
    if (amountNum <= 0) { setError('Enter a valid amount'); return; }
    if (amountNum > vndBalance) { setError('Insufficient balance'); return; }
    setLoading(true);
    try {
      const res = await api.walletExtra.withdraw({ bankCode, accountNumber, accountName, amount: amountNum });
      if (res.success) {
        setSuccess('Withdrawal request submitted successfully');
        setAmount('');
        setAccountNumber('');
        setAccountName('');
        fetchData();
      } else {
        setError(res.message || 'Failed to submit withdrawal');
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
      PROCESSING: 'bg-bg-tertiary text-text-secondary',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[status] ?? 'bg-bg-tertiary text-text-secondary'}`}>{status}</span>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/wallet" className="text-text-secondary hover:text-text-primary text-sm">Wallet</Link>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary text-sm font-medium">Withdraw</span>
      </div>

      <h1 className="text-2xl font-bold text-text-primary mb-6">Withdraw VND</h1>

      {/* Available balance */}
      <div className="bg-bg-secondary rounded-xl border border-border p-4 mb-6 text-sm">
        <span className="text-text-secondary">Available VND Balance: </span>
        <span className="text-text-primary font-mono font-semibold">{VND_FORMAT.format(vndBalance)} VND</span>
      </div>

      <form onSubmit={handleSubmit} className="bg-bg-secondary rounded-xl border border-border p-6 flex flex-col gap-4">
        {/* Bank selection */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">Bank</label>
          <select value={bankCode} onChange={(e) => setBankCode(e.target.value)}
            className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-accent/50">
            {BANKS.map((b) => (
              <option key={b.code} value={b.code}>{b.name} ({b.code})</option>
            ))}
          </select>
        </div>

        {/* Account number */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">Account Number</label>
          <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="Enter bank account number"
            className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-3 text-text-primary text-sm font-mono focus:outline-none focus:border-accent/50" />
        </div>

        {/* Account name */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">Account Name</label>
          <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)}
            placeholder="Full name as on bank account"
            className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-accent/50" />
        </div>

        {/* Amount */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-text-secondary">Amount (VND)</label>
            <button type="button" onClick={() => setAmount(String(vndBalance))}
              className="text-xs text-accent hover:text-accent-hover">
              Max: {VND_FORMAT.format(vndBalance)}
            </button>
          </div>
          <input type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            placeholder="0"
            className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-3 text-text-primary text-sm font-mono focus:outline-none focus:border-accent/50" />
          {amountNum > 0 && (
            <p className="text-xs text-text-muted mt-1">{VND_FORMAT.format(amountNum)} VND</p>
          )}
        </div>

        {error && <p className="text-sell text-sm">{error}</p>}
        {success && <p className="text-buy text-sm">{success}</p>}

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-accent text-black font-semibold text-sm rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50">
          {loading ? 'Submitting...' : 'Submit Withdrawal'}
        </button>
      </form>

      {/* Recent withdrawals */}
      {withdrawals.length > 0 && (
        <div className="mt-8 bg-bg-secondary rounded-xl border border-border overflow-hidden">
          <h2 className="text-sm font-semibold text-text-primary px-5 py-3 border-b border-border">Recent Withdrawals</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Date', 'Bank', 'Amount (VND)', 'Status'].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 text-text-muted text-xs uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w) => (
                <tr key={w.id} className="table-row-hover border-b border-border last:border-0">
                  <td className="px-5 py-3 text-text-secondary text-xs">{new Date(w.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td className="px-5 py-3 text-text-primary text-xs font-semibold">{w.bankCode}</td>
                  <td className="px-5 py-3 font-mono text-text-primary">{VND_FORMAT.format(w.amount)}</td>
                  <td className="px-5 py-3"><StatusBadge status={w.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
