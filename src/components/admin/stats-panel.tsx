'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface Stats {
  totalUsers?: number;
  volume24h?: number;
  activeOrders?: number;
  pendingKyc?: number;
  pendingDeposits?: number;
  pendingWithdrawals?: number;
}

interface StatsPanelProps {
  onNavigate?: (tab: string) => void;
}

const REFRESH_INTERVAL = 30_000;

// Simple inline SVG icons — no external libraries
function IconUsers() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden>
      <path d="M7 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M1 17c0-3.3 2.7-6 6-6h.5M13 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 17c0-3.3-2.7-6-6-6s-6 2.7-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
    </svg>
  );
}

function IconVolume() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden>
      <path d="M3 14l4-5 3 3 4-6 3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter"/>
      <path d="M1 17h18M1 3h18" stroke="currentColor" strokeWidth="1" opacity=".4"/>
    </svg>
  );
}

function IconOrders() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden>
      <rect x="2" y="3" width="16" height="14" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6 8h8M6 11h5M6 14h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
    </svg>
  );
}

function IconKYC() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden>
      <rect x="2" y="3" width="16" height="14" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="7" cy="9" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M4 15c0-1.7 1.3-3 3-3s3 1.3 3 3M12 8h4M12 11h3M12 14h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
    </svg>
  );
}

function IconDeposit() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden>
      <path d="M10 3v11M6 10l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
      <path d="M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
    </svg>
  );
}

function IconWithdraw() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" aria-hidden>
      <path d="M10 17V6M6 10l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
      <path d="M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
    </svg>
  );
}

function formatNumber(n?: number, prefix = ''): string {
  if (n == null) return '—';
  if (prefix === '$') {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toLocaleString()}`;
  }
  return n.toLocaleString();
}

function TrendIndicator({ value }: { value?: number }) {
  if (value == null) return null;
  const positive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${positive ? 'text-buy' : 'text-sell'}`}>
      {positive
        ? <TrendingUp className="w-3 h-3" strokeWidth={2.5} />
        : <TrendingDown className="w-3 h-3" strokeWidth={2.5} />
      } {Math.abs(value).toFixed(1)}%
    </span>
  );
}

interface CardDef {
  key: keyof Stats;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor: string;
  prefix?: string;
  urgency?: boolean;
}

const CARDS: CardDef[] = [
  {
    key: 'totalUsers',
    label: 'Total Users',
    icon: <IconUsers />,
    iconBg: 'bg-accent/10 text-accent',
    valueColor: 'text-text-primary',
  },
  {
    key: 'volume24h',
    label: '24h Volume',
    icon: <IconVolume />,
    iconBg: 'bg-buy/10 text-buy',
    valueColor: 'text-buy',
    prefix: '$',
  },
  {
    key: 'activeOrders',
    label: 'Active Orders',
    icon: <IconOrders />,
    iconBg: 'bg-accent/10 text-accent',
    valueColor: 'text-text-primary',
  },
  {
    key: 'pendingKyc',
    label: 'Pending KYC',
    icon: <IconKYC />,
    iconBg: 'bg-sell/10 text-sell',
    valueColor: 'text-sell',
    urgency: true,
  },
  {
    key: 'pendingDeposits',
    label: 'Pending Deposits',
    icon: <IconDeposit />,
    iconBg: 'bg-buy/10 text-buy',
    valueColor: 'text-buy',
    urgency: true,
  },
  {
    key: 'pendingWithdrawals',
    label: 'Pending Withdrawals',
    icon: <IconWithdraw />,
    iconBg: 'bg-sell/10 text-sell',
    valueColor: 'text-sell',
    urgency: true,
  },
];

const QUICK_ACTIONS = [
  { label: 'Review KYC',           tab: 'kyc' },
  { label: 'Process Deposits',     tab: 'deposits' },
  { label: 'Process Withdrawals',  tab: 'withdrawals' },
];

export function StatsPanel({ onNavigate }: StatsPanelProps) {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats]         = useState<Stats>({});
  const [loading, setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const res = await api.admin.stats();
    if (res.success && res.data) {
      setStats(res.data as Stats);
      setLastUpdated(new Date());
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) return;
    fetchStats(false);
    timerRef.current = setInterval(() => fetchStats(true), REFRESH_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [user, fetchStats]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const formatLastUpdated = () => {
    if (!lastUpdated) return null;
    return lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Dashboard Overview</h2>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] text-text-muted">
              Updated {formatLastUpdated()}
              {refreshing && <span className="ml-1 text-accent animate-pulse">&#8635;</span>}
            </span>
          )}
          <button
            onClick={() => fetchStats(true)}
            disabled={loading || refreshing}
            className="px-2.5 py-1 text-[10px] uppercase tracking-wider bg-bg-secondary border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {refreshing ? 'Refreshing…' : '&#8635; Refresh'}
          </button>
        </div>
      </div>

      {/* Stat cards 2x3 grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CARDS.map(c => (
            <div key={c.key} className="bg-bg-secondary border border-border p-4 animate-pulse">
              <div className="h-4 w-4 bg-bg-tertiary mb-3" />
              <div className="h-7 w-20 bg-bg-tertiary mb-2" />
              <div className="h-3 w-24 bg-bg-tertiary" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CARDS.map(c => {
            const rawValue = stats[c.key];
            const isUrgent = c.urgency && rawValue != null && rawValue > 0;
            return (
              <div
                key={c.key}
                className={`bg-bg-secondary border p-4 flex flex-col gap-2 relative transition-colors
                  ${isUrgent ? 'border-sell/40 hover:border-sell/70' : 'border-border hover:border-accent/30'}`}
              >
                {/* Urgent dot */}
                {isUrgent && (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-sell" aria-label="Needs attention" />
                )}

                {/* Icon area */}
                <div className={`w-8 h-8 flex items-center justify-center ${c.iconBg}`}>
                  {c.icon}
                </div>

                {/* Big number */}
                <div className={`text-2xl font-bold font-mono leading-none ${c.valueColor}`}>
                  {formatNumber(rawValue, c.prefix)}
                </div>

                {/* Label + trend row */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-text-secondary">{c.label}</span>
                  {/* Trend placeholder — no trend data from API, shown only as subtle indicator for demo */}
                  {rawValue != null && rawValue > 0 && (
                    <TrendIndicator value={undefined} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick action buttons */}
      <div className="border-t border-border pt-4">
        <div className="text-[10px] uppercase tracking-wider text-text-muted mb-2">Quick Actions</div>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.tab}
              onClick={() => onNavigate?.(action.tab)}
              className="px-3 py-1.5 text-xs bg-bg-secondary border border-border text-text-secondary hover:bg-accent hover:text-bg-primary hover:border-accent transition-colors flex items-center gap-1.5"
            >
              <span>{action.label}</span>
              <ArrowUpRight className="w-3 h-3 opacity-60" strokeWidth={2} />
            </button>
          ))}
        </div>
      </div>

      {/* Auto-refresh notice */}
      <div className="text-[10px] text-text-muted/60 flex items-center gap-1">
        <span>&#8635;</span>
        <span>Auto-refreshes every 30 seconds</span>
      </div>
    </div>
  );
}
