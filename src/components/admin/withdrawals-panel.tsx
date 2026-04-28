'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast-provider';

interface AdminWithdrawal {
  id: number;
  userId: number;
  userEmail?: string;
  amount: number;
  bankCode: string;
  bankAccount?: string;
  accountName?: string;
  status: string;
  createdAt: string;
  adminNote?: string;
}

interface WithdrawalsPage {
  content: AdminWithdrawal[];
  totalPages: number;
  totalElements?: number;
}

const STATUS_OPTIONS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-accent/10 text-accent border border-accent/30',
  APPROVED: 'bg-buy/10 text-buy border border-buy/30',
  REJECTED: 'bg-sell/10 text-sell border border-sell/30',
};

const PAGE_SIZE = 15;

function maskAccount(account?: string): string {
  if (!account) return '—';
  if (account.length <= 4) return account;
  return '···' + account.slice(-4);
}

function fmt(n: number): string {
  return n.toLocaleString('vi-VN');
}

function fmtDatetime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

// ─── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-bg-secondary border border-border px-4 py-3 min-w-[140px]">
      <div className="text-[10px] text-text-muted uppercase tracking-widest mb-1">{label}</div>
      <div className="text-base font-semibold text-text-primary font-mono">{value}</div>
      {sub && <div className="text-[10px] text-text-secondary mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Expanded Row ──────────────────────────────────────────────────────────────

function ExpandedRow({
  w,
  note,
  onNoteChange,
  onApprove,
  onReject,
  acting,
}: {
  w: AdminWithdrawal;
  note: string;
  onNoteChange: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  acting: boolean;
}) {
  return (
    <tr className="bg-bg-tertiary border-b border-border">
      <td colSpan={8} className="px-4 py-4">
        <div className="flex flex-col gap-3">
          {/* Detail grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs sm:grid-cols-4">
            <div>
              <span className="text-text-muted text-[10px] uppercase tracking-widest block">Withdrawal ID</span>
              <span className="text-text-primary font-mono">#{w.id}</span>
            </div>
            <div>
              <span className="text-text-muted text-[10px] uppercase tracking-widest block">User ID</span>
              <span className="text-text-primary font-mono">#{w.userId}</span>
            </div>
            <div>
              <span className="text-text-muted text-[10px] uppercase tracking-widest block">User Email</span>
              <span className="text-text-primary break-all">{w.userEmail || '—'}</span>
            </div>
            <div>
              <span className="text-text-muted text-[10px] uppercase tracking-widest block">Amount</span>
              <span className="text-text-primary font-mono font-semibold">{fmt(w.amount)} VND</span>
            </div>
            <div>
              <span className="text-text-muted text-[10px] uppercase tracking-widest block">Bank Code</span>
              <span className="text-text-primary font-semibold">{w.bankCode}</span>
            </div>
            <div>
              <span className="text-text-muted text-[10px] uppercase tracking-widest block">Bank Account</span>
              <span className="text-text-primary font-mono">{w.bankAccount || '—'}</span>
            </div>
            <div>
              <span className="text-text-muted text-[10px] uppercase tracking-widest block">Account Name</span>
              <span className="text-text-primary">{w.accountName || '—'}</span>
            </div>
            <div>
              <span className="text-text-muted text-[10px] uppercase tracking-widest block">Created At</span>
              <span className="text-text-primary">
                {fmtDatetime(w.createdAt).date} {fmtDatetime(w.createdAt).time}
              </span>
            </div>
            {w.adminNote && (
              <div className="col-span-2 sm:col-span-4">
                <span className="text-text-muted text-[10px] uppercase tracking-widest block">Admin Note</span>
                <span className="text-text-secondary italic">{w.adminNote}</span>
              </div>
            )}
          </div>

          {/* Actions for PENDING */}
          {w.status === 'PENDING' && (
            <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-border">
              <span className="text-[10px] text-text-muted uppercase tracking-widest">Admin Note:</span>
              <input
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                placeholder="Optional note..."
                disabled={acting}
                className="flex-1 min-w-[180px] max-w-[320px] px-2 py-1 bg-bg-primary border border-border text-text-primary text-xs outline-none focus:border-accent disabled:opacity-50 placeholder:text-text-muted"
              />
              <button
                onClick={onApprove}
                disabled={acting}
                className="px-4 py-1 bg-buy/20 text-buy text-xs font-semibold hover:bg-buy/30 border border-buy/30 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {acting ? 'Processing...' : 'Approve'}
              </button>
              <button
                onClick={onReject}
                disabled={acting}
                className="px-4 py-1 bg-sell/20 text-sell text-xs font-semibold hover:bg-sell/30 border border-sell/30 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {acting ? 'Processing...' : 'Reject'}
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────────────────

export function WithdrawalsPanel() {
  const { success, error } = useToast();

  const [data, setData] = useState<WithdrawalsPage>({ content: [], totalPages: 1, totalElements: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [loading, setLoading] = useState(true);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [acting, setActing] = useState<number | null>(null);

  // Summary stats (derived from all-pending fetch)
  const [summary, setSummary] = useState({ total: 0, pending: 0, pendingAmount: 0 });

  const load = useCallback(() => {
    const statusParam = statusFilter === 'ALL' ? undefined : statusFilter;
    api.admin.withdrawals(page, PAGE_SIZE, search || undefined, statusParam).then((res) => {
      if (res.success && res.data) {
        const d = res.data as WithdrawalsPage;
        setData(d);
      }
      setLoading(false);
    });
  }, [page, search, statusFilter]);

  // Load summary separately (always fetch ALL/PENDING for top cards)
  const loadSummary = useCallback(() => {
    Promise.all([
      api.admin.withdrawals(1, 1, undefined, undefined),
      api.admin.withdrawals(1, 999, undefined, 'PENDING'),
    ]).then(([allRes, pendingRes]) => {
      const total = (allRes.success && allRes.data) ? ((allRes.data as WithdrawalsPage).totalElements ?? 0) : 0;
      const pendingPage = (pendingRes.success && pendingRes.data) ? (pendingRes.data as WithdrawalsPage) : null;
      const pending = pendingPage ? (pendingPage.totalElements ?? pendingPage.content.length) : 0;
      const pendingAmount = pendingPage ? pendingPage.content.reduce((s, w) => s + w.amount, 0) : 0;
      setSummary({ total, pending, pendingAmount });
    });
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);
  useEffect(() => { loadSummary(); }, [loadSummary]);

  // Reset page when filters change — derived state from filter props
  useEffect(() => { setPage(1); }, [search, statusFilter]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  function toggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function handleApprove(id: number) {
    setActing(id);
    const res = await api.admin.approveWithdrawal(id, notes[id] || '');
    if (res.success) {
      success('Withdrawal approved');
      load();
      loadSummary();
      setExpandedId(null);
    } else {
      error(res.message || 'Failed to approve');
    }
    setActing(null);
  }

  async function handleReject(id: number) {
    setActing(id);
    const res = await api.admin.rejectWithdrawal(id, notes[id] || 'Rejected by admin');
    if (res.success) {
      success('Withdrawal rejected');
      load();
      loadSummary();
      setExpandedId(null);
    } else {
      error(res.message || 'Failed to reject');
    }
    setActing(null);
  }

  // Pagination page numbers
  const totalPages = data.totalPages || 1;
  function pageNumbers(): (number | '...')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  }

  const COL_COUNT = 8;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-widest">Withdrawals</h2>
        <button
          onClick={() => { load(); loadSummary(); }}
          className="text-[10px] text-text-muted hover:text-accent px-2 py-1 border border-border bg-bg-secondary"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="flex flex-wrap gap-3">
        <SummaryCard label="Total Requests" value={summary.total.toLocaleString()} />
        <SummaryCard label="Pending" value={summary.pending.toLocaleString()} sub="awaiting review" />
        <SummaryCard
          label="Pending Amount"
          value={fmt(summary.pendingAmount)}
          sub="VND"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <form onSubmit={handleSearchSubmit} className="flex">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Email or bank account..."
            className="px-3 py-1.5 bg-bg-secondary border border-border text-text-primary text-xs outline-none focus:border-accent w-[220px] placeholder:text-text-muted"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-accent text-black text-xs font-semibold hover:bg-accent-hover border border-accent"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setSearch(''); }}
              className="px-2 py-1.5 bg-bg-tertiary border border-border text-text-secondary text-xs hover:text-text-primary"
            >
              Clear
            </button>
          )}
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-1.5 bg-bg-secondary border border-border text-text-primary text-xs outline-none focus:border-accent cursor-pointer"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {data.totalElements !== undefined && (
          <span className="text-[10px] text-text-muted ml-auto">
            {data.totalElements.toLocaleString()} result{data.totalElements !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-bg-tertiary border-b border-border text-text-muted text-[10px] uppercase tracking-widest">
              <th className="py-2 px-3 text-left font-medium whitespace-nowrap">Date / Time</th>
              <th className="py-2 px-3 text-left font-medium">User Email</th>
              <th className="py-2 px-3 text-right font-medium">Amount (VND)</th>
              <th className="py-2 px-3 text-left font-medium">Bank</th>
              <th className="py-2 px-3 text-left font-medium">Account</th>
              <th className="py-2 px-3 text-left font-medium">Account Name</th>
              <th className="py-2 px-3 text-left font-medium">Status</th>
              <th className="py-2 px-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COL_COUNT} className="py-10 text-center text-text-secondary text-xs">
                  Loading...
                </td>
              </tr>
            ) : data.content.length === 0 ? (
              <tr>
                <td colSpan={COL_COUNT} className="py-10 text-center text-text-secondary text-xs">
                  No withdrawals found
                </td>
              </tr>
            ) : (
              data.content.map((w) => {
                const { date, time } = fmtDatetime(w.createdAt);
                const isExpanded = expandedId === w.id;
                const isActing = acting === w.id;

                return (
                  <>
                    <tr
                      key={w.id}
                      onClick={() => toggleExpand(w.id)}
                      className={`border-b border-border cursor-pointer transition-colors ${
                        isExpanded ? 'bg-bg-hover' : 'hover:bg-bg-hover'
                      }`}
                    >
                      {/* Date / Time */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="text-text-primary">{date}</div>
                        <div className="text-[10px] text-text-muted">{time}</div>
                      </td>

                      {/* Email */}
                      <td className="py-2.5 px-3 text-text-primary max-w-[180px]">
                        <span className="truncate block">{w.userEmail || `#${w.userId}`}</span>
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-text-primary whitespace-nowrap">
                        {fmt(w.amount)}
                      </td>

                      {/* Bank code */}
                      <td className="py-2.5 px-3 text-text-primary font-semibold">{w.bankCode}</td>

                      {/* Account masked */}
                      <td className="py-2.5 px-3 font-mono text-text-secondary">{maskAccount(w.bankAccount)}</td>

                      {/* Account name */}
                      <td className="py-2.5 px-3 text-text-secondary max-w-[130px]">
                        <span className="truncate block">{w.accountName || '—'}</span>
                      </td>

                      {/* Status badge */}
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGE[w.status] || 'text-text-secondary border border-border'}`}>
                          {w.status}
                        </span>
                      </td>

                      {/* Expand indicator */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          {w.status === 'PENDING' && (
                            <span className="text-[10px] text-accent font-semibold">Action required</span>
                          )}
                          <span className="text-text-muted text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <ExpandedRow
                        key={`exp-${w.id}`}
                        w={w}
                        note={notes[w.id] || ''}
                        onNoteChange={(v) => setNotes((n) => ({ ...n, [w.id]: v }))}
                        onApprove={() => handleApprove(w.id)}
                        onReject={() => handleReject(w.id)}
                        acting={isActing}
                      />
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1 flex-wrap">
          <button
            disabled={page <= 1}
            onClick={() => setPage(1)}
            className="px-2 py-1 text-[10px] bg-bg-tertiary border border-border text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            «
          </button>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-2 py-1 text-xs bg-bg-tertiary border border-border text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Prev
          </button>

          {pageNumbers().map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 py-1 text-xs text-text-muted">...</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                className={`px-2.5 py-1 text-xs border ${
                  page === p
                    ? 'bg-accent text-black border-accent font-semibold'
                    : 'bg-bg-tertiary border-border text-text-secondary hover:text-text-primary hover:border-accent/50'
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-2 py-1 text-xs bg-bg-tertiary border border-border text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(totalPages)}
            className="px-2 py-1 text-[10px] bg-bg-tertiary border border-border text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            »
          </button>

          <span className="text-[10px] text-text-muted ml-2">
            Page {page} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
