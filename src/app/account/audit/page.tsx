'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { SkeletonRow } from '@/components/ui/skeleton';
import type { AuditLog } from '@/types';

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Sign in',
  LOGOUT: 'Sign out',
  LOGOUT_ALL: 'Sign out all devices',
  PASSWORD_CHANGE: 'Password changed',
  TWO_FA_ENABLE: '2FA enabled',
  TWO_FA_DISABLE: '2FA disabled',
  PROFILE_UPDATE: 'Profile updated',
  WITHDRAWAL_REQUEST: 'Withdrawal requested',
  API_KEY_CREATE: 'API key created',
  API_KEY_REVOKE: 'API key revoked',
  STEP_UP: 'Device verified',
};

function humanize(action: string): string {
  return ACTION_LABELS[action] || action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function actionIcon(action: string): string {
  if (action.includes('LOGIN') || action.includes('LOGOUT') || action.includes('STEP')) return 'auth';
  if (action.includes('PASSWORD') || action.includes('2FA')) return 'security';
  if (action.includes('WITHDRAWAL')) return 'withdraw';
  return 'other';
}

const ALL_ACTIONS = Object.keys(ACTION_LABELS);

export default function AuditPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);

  const [filterAction, setFilterAction] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const res = await api.auth.audit({
      page,
      size: 20,
    });
    if (res.success && res.data) {
      setLogs(res.data.content);
      setTotalPages(res.data.totalPages);
    }
    setLoading(false);
  }, [user, page]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    load();
  }, [user, router, load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filtered = logs.filter((l) => {
    if (filterAction && l.action !== filterAction) return false;
    if (filterOutcome && l.outcome !== filterOutcome) return false;
    if (filterFrom && new Date(l.createdAt) < new Date(filterFrom)) return false;
    if (filterTo && new Date(l.createdAt) > new Date(filterTo + 'T23:59:59')) return false;
    return true;
  });

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-text-primary mb-6">Audit Log</h1>

      {/* Filters */}
      <div className="bg-bg-secondary border border-border p-4 mb-6 flex flex-wrap gap-3">
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-3 py-1.5 bg-bg-tertiary border border-border text-text-primary text-xs outline-none focus:border-accent"
        >
          <option value="">All Actions</option>
          {ALL_ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
        </select>
        <select
          value={filterOutcome}
          onChange={(e) => setFilterOutcome(e.target.value)}
          className="px-3 py-1.5 bg-bg-tertiary border border-border text-text-primary text-xs outline-none focus:border-accent"
        >
          <option value="">All Outcomes</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>
        <input
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          className="px-3 py-1.5 bg-bg-tertiary border border-border text-text-primary text-xs outline-none focus:border-accent"
        />
        <span className="text-text-muted text-xs self-center">to</span>
        <input
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          className="px-3 py-1.5 bg-bg-tertiary border border-border text-text-primary text-xs outline-none focus:border-accent"
        />
        {(filterAction || filterOutcome || filterFrom || filterTo) && (
          <button
            onClick={() => { setFilterAction(''); setFilterOutcome(''); setFilterFrom(''); setFilterTo(''); }}
            className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={4} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-text-secondary text-sm">No audit events found</div>
      ) : (
        <div className="relative">
          {/* Timeline vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-0">
            {filtered.map((log) => {
              const iconType = actionIcon(log.action);
              return (
                <div key={log.id} className="relative pl-10 pb-4">
                  {/* Icon dot */}
                  <div className={`absolute left-2 w-5 h-5 flex items-center justify-center rounded-full -translate-x-0.5 mt-0.5 ${
                    log.outcome === 'success' ? 'bg-buy/20 text-buy' : 'bg-sell/20 text-sell'
                  }`}>
                    {iconType === 'auth' && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    )}
                    {iconType === 'security' && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    )}
                    {iconType === 'withdraw' && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    )}
                    {iconType === 'other' && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    )}
                  </div>

                  <div className="bg-bg-secondary border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-text-primary">{humanize(log.action)}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 ${
                            log.outcome === 'success' ? 'bg-buy/10 text-buy' : 'bg-sell/10 text-sell'
                          }`}>
                            {log.outcome}
                          </span>
                          {log.newDevice && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-accent/10 text-accent">
                              New Device
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {log.ip && <span className="text-[11px] text-text-muted font-mono">{log.ip}</span>}
                          {log.deviceId && <span className="text-[11px] text-text-muted font-mono">…{log.deviceId.slice(-6)}</span>}
                          {log.detail && <span className="text-[11px] text-text-muted truncate">{log.detail}</span>}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div title={new Date(log.createdAt).toLocaleString()} className="text-[11px] text-text-muted cursor-help">
                          {new Date(log.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-text-muted mt-0.5">{timeAgo(log.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 text-xs bg-bg-secondary border border-border text-text-secondary disabled:opacity-40 hover:text-text-primary">Prev</button>
          <span className="px-3 py-1.5 text-xs text-text-secondary">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 text-xs bg-bg-secondary border border-border text-text-secondary disabled:opacity-40 hover:text-text-primary">Next</button>
        </div>
      )}
    </div>
  );
}
