'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { FraudLog, PageResponse } from '@/types';

const ACTION_FILTERS = ['ALL', 'FLAGGED', 'ACCOUNTS_LOCKED', 'BONUS_REVOKED', 'DISMISSED'] as const;
type ActionFilter = typeof ACTION_FILTERS[number];

const ACTION_BADGE: Record<string, string> = {
  FLAGGED:         'bg-accent/20 text-accent border border-accent/40',
  ACCOUNTS_LOCKED: 'bg-sell/20 text-sell border border-sell/40',
  BONUS_REVOKED:   'bg-sell/20 text-sell border border-sell/40',
  DISMISSED:       'bg-bg-tertiary text-text-muted border border-border',
};

const FRAUD_TYPE_BADGE = 'bg-bg-tertiary text-accent border border-accent/30';

const PAGE_SIZE = 20;

function truncate(str: string, n: number) {
  return str && str.length > n ? str.slice(0, n) + '…' : str;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

export function FraudPanel() {
  const [data, setData]           = useState<PageResponse<FraudLog>>({ content: [], totalElements: 0, page: 1, size: PAGE_SIZE, totalPages: 1 });
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('ALL');
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<Set<number>>(new Set());

  const load = useCallback((p: number, s: string) => {
    setLoading(true);
    api.admin.fraudLogs(p, PAGE_SIZE, s).then((res) => {
      if (res.success && res.data) setData(res.data as PageResponse<FraudLog>);
      setLoading(false);
    });
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(page, search); }, [page, search, load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const displayed = actionFilter === 'ALL'
    ? data.content
    : data.content.filter(f => f.action === actionFilter);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Fraud Logs</h2>
        <span className="text-xs text-text-muted">{data.totalElements} total records</span>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-0 flex-1">
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search user ID or fraud type..."
            className="flex-1 bg-bg-secondary border border-border border-r-0 px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent min-w-0"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-xs bg-bg-tertiary border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
          >
            &#128269;
          </button>
        </form>

        {/* Action filter */}
        <div className="flex gap-0 shrink-0 overflow-x-auto">
          {ACTION_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActionFilter(f)}
              className={`px-2.5 py-1.5 text-xs border border-r-0 last:border-r transition-colors whitespace-nowrap
                ${actionFilter === f
                  ? 'bg-accent text-bg-primary border-accent font-medium'
                  : 'bg-bg-secondary border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`}
            >
              {f === 'ALL' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-bg-secondary">
              <th className="py-2 px-3 text-left text-text-muted font-medium uppercase tracking-wider w-6"></th>
              <th className="py-2 px-3 text-left text-text-muted font-medium uppercase tracking-wider whitespace-nowrap">Date</th>
              <th className="py-2 px-3 text-left text-text-muted font-medium uppercase tracking-wider">User IDs</th>
              <th className="py-2 px-3 text-left text-text-muted font-medium uppercase tracking-wider">Fraud Type</th>
              <th className="py-2 px-3 text-left text-text-muted font-medium uppercase tracking-wider">Description</th>
              <th className="py-2 px-3 text-left text-text-muted font-medium uppercase tracking-wider">Action</th>
              <th className="py-2 px-3 text-left text-text-muted font-medium uppercase tracking-wider">Admin Note</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-text-muted">
                  <span className="animate-pulse">Loading...</span>
                </td>
              </tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-text-muted">No fraud logs found</td>
              </tr>
            ) : displayed.map((f) => {
              const isOpen = expanded.has(f.id);
              return (
                <>
                  <tr
                    key={f.id}
                    onClick={() => toggleExpand(f.id)}
                    className="border-b border-border hover:bg-bg-hover cursor-pointer transition-colors"
                  >
                    {/* Expand toggle */}
                    <td className="py-2 px-3 text-text-muted select-none">
                      <span className="text-[10px]">{isOpen ? '▼' : '▶'}</span>
                    </td>

                    {/* Date */}
                    <td className="py-2 px-3 text-text-secondary whitespace-nowrap">
                      {formatDate(f.createdAt)}
                    </td>

                    {/* User IDs */}
                    <td className="py-2 px-3 text-text-primary font-mono max-w-[90px]">
                      <span className="truncate block">{truncate(f.userIds, 20)}</span>
                    </td>

                    {/* Fraud type badge */}
                    <td className="py-2 px-3">
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium uppercase ${FRAUD_TYPE_BADGE}`}>
                        {f.fraudType}
                      </span>
                    </td>

                    {/* Description truncated */}
                    <td className="py-2 px-3 text-text-secondary max-w-[160px]">
                      <span className="block truncate">{truncate(f.description, 50)}</span>
                    </td>

                    {/* Action badge */}
                    <td className="py-2 px-3">
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium uppercase ${ACTION_BADGE[f.action] || 'bg-bg-tertiary text-text-muted border border-border'}`}>
                        {f.action.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Admin note truncated */}
                    <td className="py-2 px-3 text-text-muted max-w-[120px]">
                      <span className="block truncate">{f.adminNote ? truncate(f.adminNote, 30) : <span className="text-text-muted/40">—</span>}</span>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {isOpen && (
                    <tr key={`${f.id}-exp`} className="border-b border-border bg-bg-secondary">
                      <td colSpan={7} className="py-3 px-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <div className="text-[10px] uppercase text-text-muted font-medium mb-1">Full Description</div>
                            <div className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">{f.description || '—'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase text-text-muted font-medium mb-1">Admin Note</div>
                            <div className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">{f.adminNote || <span className="text-text-muted italic">No admin note</span>}</div>
                          </div>
                          <div className="sm:col-span-2 flex gap-6 pt-1 border-t border-border/50">
                            <div>
                              <span className="text-[10px] text-text-muted uppercase">Log ID</span>
                              <span className="ml-2 text-xs font-mono text-text-secondary">#{f.id}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-text-muted uppercase">All User IDs</span>
                              <span className="ml-2 text-xs font-mono text-text-primary">{f.userIds}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">
          Page {page} of {data.totalPages}
          {actionFilter !== 'ALL' && (
            <span className="ml-2 text-accent">(filtered: {displayed.length} shown)</span>
          )}
        </span>
        <div className="flex gap-0">
          <button
            disabled={page <= 1}
            onClick={() => setPage(1)}
            className="px-2 py-1 text-xs bg-bg-secondary border border-border border-r-0 text-text-secondary hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            «
          </button>
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 text-xs bg-bg-secondary border border-border border-r-0 text-text-secondary hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Prev
          </button>
          {/* Page number pills */}
          {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
            const half = 2;
            let start = Math.max(1, page - half);
            const end = Math.min(data.totalPages, start + 4);
            start = Math.max(1, end - 4);
            return start + i;
          }).filter(n => n >= 1 && n <= data.totalPages).map(n => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`px-2.5 py-1 text-xs border border-r-0 transition-colors
                ${n === page
                  ? 'bg-accent text-bg-primary border-accent font-medium'
                  : 'bg-bg-secondary border-border text-text-secondary hover:bg-bg-hover'
                }`}
            >
              {n}
            </button>
          ))}
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 text-xs bg-bg-secondary border border-border border-r-0 text-text-secondary hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage(data.totalPages)}
            className="px-2 py-1 text-xs bg-bg-secondary border border-border text-text-secondary hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}
