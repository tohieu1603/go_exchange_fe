'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast-provider';

interface AdminDeposit {
  id: number; userId: number; userEmail?: string; amount: number;
  currency: string; status: string; orderCode?: string; createdAt: string;
}
interface DepositsPage { content: AdminDeposit[]; totalPages: number; totalElements?: number; }

type StatusFilter = 'ALL' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'REJECTED';

const STATUS_STYLES: Record<string, string> = {
  PENDING:   'text-accent bg-accent/10',
  COMPLETED: 'text-buy bg-buy/10',
  FAILED:    'text-sell bg-sell/10',
  REJECTED:  'text-sell bg-sell/10',
};

const PAGE_SIZE = 20;

// ---- Confirmation Modal -------------------------------------------------------
interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ open, title, message, confirmLabel, confirmClass, onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-10 bg-bg-secondary border border-border w-[360px] p-5">
        <p className="text-sm font-semibold text-text-primary mb-1">{title}</p>
        <p className="text-xs text-text-secondary mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs border border-border text-text-secondary hover:bg-bg-hover"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-1.5 text-xs font-semibold ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Expanded Row Detail -------------------------------------------------------
function DepositDetail({ deposit }: { deposit: AdminDeposit }) {
  const fields: [string, string][] = [
    ['Deposit ID',  String(deposit.id)],
    ['User ID',     String(deposit.userId)],
    ['User Email',  deposit.userEmail || '—'],
    ['Order Code',  deposit.orderCode || '—'],
    ['Amount',      `${deposit.amount.toLocaleString()} ${deposit.currency}`],
    ['Status',      deposit.status],
    ['Date / Time', new Date(deposit.createdAt).toLocaleString()],
  ];
  return (
    <tr>
      <td colSpan={6} className="bg-bg-tertiary border-b border-border px-4 py-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
          {fields.map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
              <p className="text-xs text-text-primary font-mono mt-0.5 break-all">{value}</p>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}

// ---- Summary Card -------------------------------------------------------
function SummaryCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-bg-secondary border border-border px-4 py-3 flex flex-col gap-1 min-w-[140px]">
      <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-semibold font-mono ${accent || 'text-text-primary'}`}>{value}</p>
    </div>
  );
}

// ---- Pagination -------------------------------------------------------
function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;

  const window = 2;
  const pages: (number | '...')[] = [];

  pages.push(1);
  if (page - window > 2) pages.push('...');
  for (let i = Math.max(2, page - window); i <= Math.min(totalPages - 1, page + window); i++) pages.push(i);
  if (page + window < totalPages - 1) pages.push('...');
  if (totalPages > 1) pages.push(totalPages);

  return (
    <div className="flex items-center gap-1 mt-4 flex-wrap">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="px-3 py-1 text-xs bg-bg-tertiary border border-border text-text-secondary disabled:opacity-40 hover:bg-bg-hover"
      >
        Prev
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-xs text-text-muted">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            className={`px-3 py-1 text-xs border ${
              p === page
                ? 'bg-accent text-bg-primary border-accent font-semibold'
                : 'bg-bg-tertiary border-border text-text-secondary hover:bg-bg-hover'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="px-3 py-1 text-xs bg-bg-tertiary border border-border text-text-secondary disabled:opacity-40 hover:bg-bg-hover"
      >
        Next
      </button>
      <span className="text-[10px] text-text-muted ml-2">
        Page {page} of {totalPages}
      </span>
    </div>
  );
}

// ---- Main Panel -------------------------------------------------------
export function DepositsPanel() {
  const { success, error } = useToast();

  const [data, setData]           = useState<DepositsPage>({ content: [], totalPages: 1, totalElements: 0 });
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [loading, setLoading]     = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Summary stats derived from loaded page (backend may not provide totals; show what we have)
  const [summary, setSummary] = useState({ total: 0, pending: 0, totalAmount: 0 });

  // Modal state
  const [modal, setModal] = useState<{
    open: boolean; type: 'confirm' | 'reject'; deposit: AdminDeposit | null;
  }>({ open: false, type: 'confirm', deposit: null });
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(() => {
    const statusArg = statusFilter === 'ALL' ? undefined : statusFilter;
    api.admin.deposits(page, PAGE_SIZE, search || undefined, statusArg).then((res) => {
      if (res.success && res.data) {
        const d = res.data as DepositsPage;
        setData(d);
        // Derive summary from current page (best effort when backend lacks aggregates)
        const pending = d.content.filter((x) => x.status === 'PENDING').length;
        const totalAmount = d.content.reduce((s, x) => s + x.amount, 0);
        setSummary({
          total: d.totalElements ?? d.content.length,
          pending,
          totalAmount,
        });
      }
      setLoading(false);
    });
  }, [page, search, statusFilter]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Reset to page 1 when filters change
  function applySearch() {
    setSearch(searchInput.trim());
    setPage(1);
  }

  function handleStatusChange(s: StatusFilter) {
    setStatusFilter(s);
    setPage(1);
  }

  function toggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function openConfirmModal(deposit: AdminDeposit) {
    setModal({ open: true, type: 'confirm', deposit });
  }
  function openRejectModal(deposit: AdminDeposit) {
    setModal({ open: true, type: 'reject', deposit });
  }
  function closeModal() {
    if (!actionLoading) setModal({ open: false, type: 'confirm', deposit: null });
  }

  async function executeModalAction() {
    if (!modal.deposit) return;
    setActionLoading(true);
    const id = modal.deposit.id;
    if (modal.type === 'confirm') {
      const res = await api.admin.confirmDeposit(id);
      if (res.success) { success('Deposit confirmed'); closeModal(); load(); }
      else error(res.message || 'Failed to confirm deposit');
    } else {
      const res = await api.admin.rejectDeposit(id);
      if (res.success) { success('Deposit rejected'); closeModal(); load(); }
      else error(res.message || 'Failed to reject deposit');
    }
    setActionLoading(false);
  }

  const STATUS_FILTERS: StatusFilter[] = ['ALL', 'PENDING', 'COMPLETED', 'FAILED', 'REJECTED'];

  return (
    <>
      <ConfirmModal
        open={modal.open}
        title={modal.type === 'confirm' ? 'Confirm Deposit' : 'Reject Deposit'}
        message={
          modal.deposit
            ? modal.type === 'confirm'
              ? `Confirm deposit of ${modal.deposit.amount.toLocaleString()} ${modal.deposit.currency} for ${modal.deposit.userEmail || `#${modal.deposit.userId}`}? This action cannot be undone.`
              : `Reject deposit of ${modal.deposit.amount.toLocaleString()} ${modal.deposit.currency} for ${modal.deposit.userEmail || `#${modal.deposit.userId}`}? This action cannot be undone.`
            : ''
        }
        confirmLabel={actionLoading ? 'Processing...' : modal.type === 'confirm' ? 'Confirm' : 'Reject'}
        confirmClass={
          modal.type === 'confirm'
            ? 'bg-buy/20 text-buy hover:bg-buy/30'
            : 'bg-sell/20 text-sell hover:bg-sell/30'
        }
        onConfirm={executeModalAction}
        onCancel={closeModal}
      />

      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Deposits</h2>
          <button
            onClick={load}
            className="px-3 py-1 text-[10px] uppercase tracking-wider border border-border text-text-secondary hover:bg-bg-hover"
          >
            Refresh
          </button>
        </div>

        {/* Summary */}
        <div className="flex gap-3 flex-wrap">
          <SummaryCard label="Total Deposits" value={summary.total.toLocaleString()} />
          <SummaryCard label="Pending" value={summary.pending.toLocaleString()} accent="text-accent" />
          <SummaryCard
            label="Page Volume"
            value={summary.totalAmount.toLocaleString()}
            accent="text-buy"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="flex">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              placeholder="Email or order code..."
              className="w-52 px-3 py-1.5 bg-bg-secondary border border-border text-text-primary text-xs outline-none placeholder:text-text-muted focus:border-accent"
            />
            <button
              onClick={applySearch}
              className="px-3 py-1.5 bg-accent text-bg-primary text-xs font-semibold hover:bg-accent-hover"
            >
              Search
            </button>
          </div>

          {/* Status tabs */}
          <div className="flex border border-border overflow-hidden">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1.5 text-[10px] uppercase tracking-wider border-r border-border last:border-r-0 ${
                  statusFilter === s
                    ? 'bg-accent text-bg-primary font-semibold'
                    : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Active search chip */}
          {search && (
            <div className="flex items-center gap-1 px-2 py-1 bg-bg-tertiary border border-border text-[10px] text-text-secondary">
              <span>&quot;{search}&quot;</span>
              <button
                onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
                className="text-text-muted hover:text-text-primary ml-1"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-bg-secondary text-text-muted uppercase tracking-wider">
                <th className="py-2.5 text-left px-3 text-[10px] font-medium">Date / Time</th>
                <th className="py-2.5 text-left px-3 text-[10px] font-medium">User</th>
                <th className="py-2.5 text-right px-3 text-[10px] font-medium">Amount</th>
                <th className="py-2.5 text-left px-3 text-[10px] font-medium">Order Code</th>
                <th className="py-2.5 text-left px-3 text-[10px] font-medium">Status</th>
                <th className="py-2.5 text-left px-3 text-[10px] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-secondary text-xs">
                    Loading...
                  </td>
                </tr>
              ) : data.content.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted text-xs">
                    No deposits found
                  </td>
                </tr>
              ) : (
                data.content.map((d) => {
                  const isExpanded = expandedId === d.id;
                  const statusStyle = STATUS_STYLES[d.status] || 'text-text-secondary bg-bg-tertiary';
                  return (
                    <>
                      <tr
                        key={d.id}
                        onClick={() => toggleExpand(d.id)}
                        className={`border-b border-border cursor-pointer transition-colors ${
                          isExpanded ? 'bg-bg-hover' : 'hover:bg-bg-hover'
                        }`}
                      >
                        {/* Date/Time */}
                        <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">
                          <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                          <span className="ml-1.5 text-text-muted text-[10px]">
                            {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        {/* User */}
                        <td className="py-2.5 px-3 text-text-primary max-w-[180px] truncate">
                          {d.userEmail ? (
                            <span title={d.userEmail}>{d.userEmail}</span>
                          ) : (
                            <span className="text-text-muted">#{d.userId}</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-2.5 px-3 text-right font-mono text-text-primary whitespace-nowrap">
                          <span className="text-buy font-semibold">{d.amount.toLocaleString()}</span>
                          <span className="ml-1 text-text-muted text-[10px]">{d.currency}</span>
                        </td>

                        {/* Order Code */}
                        <td className="py-2.5 px-3 font-mono text-text-secondary text-[10px]">
                          {d.orderCode || <span className="text-text-muted">—</span>}
                        </td>

                        {/* Status Badge */}
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusStyle}`}>
                            {d.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                          {d.status === 'PENDING' ? (
                            <div className="flex gap-1.5 items-center">
                              <button
                                onClick={() => openConfirmModal(d)}
                                className="px-2.5 py-1 bg-buy/20 text-buy text-[10px] font-semibold hover:bg-buy/30 uppercase tracking-wider"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => openRejectModal(d)}
                                className="px-2.5 py-1 bg-sell/20 text-sell text-[10px] font-semibold hover:bg-sell/30 uppercase tracking-wider"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-text-muted text-[10px]">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && <DepositDetail key={`detail-${d.id}`} deposit={d} />}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination page={page} totalPages={data.totalPages} onChange={(p) => setPage(p)} />
      </div>
    </>
  );
}
