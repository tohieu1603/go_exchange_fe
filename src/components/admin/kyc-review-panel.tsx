'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { kycFileUrl } from '@/lib/kyc-files';
import { useToast } from '@/components/ui/toast-provider';

interface PendingUser {
  id: number; email: string; fullName: string; kycStep: number;
  profile?: {
    firstName: string; lastName: string; dateOfBirth: string; phone: string;
    address: string; city: string; occupation: string;
  };
  documents?: { id: number; docType: string; filePath: string; status: string }[];
}

interface KYCPage { content: PendingUser[]; totalPages: number; page: number; }

export function KYCReviewPanel() {
  const { success, error } = useToast();
  const [data, setData] = useState<KYCPage>({ content: [], totalPages: 1, page: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<number | null>(null);

  function load(p: number, q: string) {
    api.admin.kycPending().then((res) => {
      if (res.success && res.data) {
        // Handle both array and paginated response
        let items: PendingUser[];
        if (Array.isArray(res.data)) {
          items = res.data as PendingUser[];
        } else if ((res.data as KYCPage).content) {
          items = (res.data as KYCPage).content;
        } else {
          items = [];
        }
        // Client-side search filter
        if (q.trim()) {
          const lq = q.toLowerCase();
          items = items.filter((u) =>
            u.email.toLowerCase().includes(lq) ||
            u.fullName?.toLowerCase().includes(lq) ||
            String(u.id).includes(lq)
          );
        }
        // Client-side pagination
        const size = 10;
        const totalPages = Math.max(1, Math.ceil(items.length / size));
        const safePage = Math.min(p, totalPages);
        const start = (safePage - 1) * size;
        setData({
          content: items.slice(start, start + size),
          totalPages,
          page: safePage,
        });
      }
      setLoading(false);
    });
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    setLoading(true);
    load(page, search);
  }, [page]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  async function handleApprove(userId: number) {
    const res = await api.admin.kycApprove(userId, notes[userId] || '');
    if (res.success) { success('KYC approved'); load(page, search); }
    else error(res.message || 'Failed');
  }

  async function handleReject(userId: number) {
    if (!notes[userId]?.trim()) { error('Please enter a rejection reason'); return; }
    const res = await api.admin.kycReject(userId, notes[userId]);
    if (res.success) { success('KYC rejected'); load(page, search); }
    else error(res.message || 'Failed');
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-text-primary mb-4">KYC Review</h2>
      {/* Search */}
      <div className="flex gap-2 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email, name, or ID..."
          onKeyDown={(e) => e.key === 'Enter' && load(1, search)}
          className="flex-1 px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm outline-none focus:border-accent" />
        <button onClick={() => { setPage(1); load(1, search); }}
          className="px-4 py-2 bg-accent text-black text-sm font-semibold hover:bg-accent-hover transition-colors">Search</button>
      </div>

      {loading ? (
        <div className="text-text-secondary text-sm py-4 text-center">Loading...</div>
      ) : data.content.length === 0 ? (
        <div className="text-text-secondary text-sm py-8 text-center">No pending KYC reviews</div>
      ) : (
        <div className="space-y-3">
          {data.content.map((u) => (
            <div key={u.id} className="bg-bg-tertiary border border-border">
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setExpanded(expanded === u.id ? null : u.id)}>
                <div>
                  <span className="text-sm text-text-primary font-medium">{u.email}</span>
                  <span className="text-xs text-text-secondary ml-2">#{u.id}</span>
                  {u.fullName && <span className="text-xs text-text-secondary ml-2">{u.fullName}</span>}
                </div>
                <span className="text-xs text-text-secondary">{expanded === u.id ? '▲' : '▼'}</span>
              </div>
              {expanded === u.id && (
                <div className="px-4 pb-4 border-t border-border space-y-4">
                  {u.profile && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {Object.entries(u.profile).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-[10px] text-text-secondary capitalize">{k.replace(/([A-Z])/g, ' $1')}: </span>
                          <span className="text-xs text-text-primary">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {u.documents && u.documents.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {u.documents.map((doc) => (
                        <div key={doc.id} className="text-center">
                          <img src={kycFileUrl(doc.filePath)} alt={doc.docType}
                            className="w-24 h-16 object-cover border border-border" />
                          <div className="text-[10px] text-text-secondary mt-1">{doc.docType}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <textarea value={notes[u.id] || ''} onChange={(e) => setNotes((n) => ({ ...n, [u.id]: e.target.value }))}
                    placeholder="Admin note (required for rejection)..."
                    rows={2} className="w-full px-3 py-2 bg-bg-secondary border border-border text-text-primary text-xs outline-none focus:border-accent resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(u.id)} className="px-4 py-2 bg-buy text-black text-sm font-semibold hover:opacity-90 transition-opacity">Approve</button>
                    <button onClick={() => handleReject(u.id)} className="px-4 py-2 bg-sell text-white text-sm font-semibold hover:opacity-90 transition-opacity">Reject</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 text-xs bg-bg-tertiary border border-border text-text-secondary disabled:opacity-40">Prev</button>
          <span className="text-xs text-text-secondary">{data.page} / {data.totalPages}</span>
          <button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 text-xs bg-bg-tertiary border border-border text-text-secondary disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
