'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/toast-provider';
import { SkeletonRow, SkeletonCard } from '@/components/ui/skeleton';
import type { Referral } from '@/types';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.charAt(0)}***@${domain}`;
}

type Tab = 'referees' | 'commissions';

interface Referee { id: number; email: string; joinedAt: string; volume: number; commission: number; }
interface Commission { id: number; refereeEmail: string; amount: number; type: string; createdAt: string; }

export default function ReferralPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const toast = useToast();

  const [stats, setStats] = useState<Referral | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('referees');

  const [referees, setReferees] = useState<Referee[]>([]);
  const [refereesTotal, setRefereesTotal] = useState(0);
  const [refereesPage, setRefereesPage] = useState(0);
  const [refereesLoading, setRefereesLoading] = useState(false);

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [commissionsTotal, setCommissionsTotal] = useState(0);
  const [commissionsPage, setCommissionsPage] = useState(0);
  const [commissionsLoading, setCommissionsLoading] = useState(false);

  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    let cancelled = false;
    api.referral.stats().then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setStats(res.data);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, router]);

  const loadReferees = useCallback(async (page: number) => {
    setRefereesLoading(true);
    const res = await api.referral.referees({ page, size: PAGE_SIZE });
    if (res.success && res.data) {
      setReferees(res.data.content);
      setRefereesTotal(res.data.totalPages);
    }
    setRefereesLoading(false);
  }, []);

  const loadCommissions = useCallback(async (page: number) => {
    setCommissionsLoading(true);
    const res = await api.referral.commissions({ page, size: PAGE_SIZE });
    if (res.success && res.data) {
      setCommissions(res.data.content);
      setCommissionsTotal(res.data.totalPages);
    }
    setCommissionsLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) return;
    if (tab === 'referees') loadReferees(refereesPage);
    else loadCommissions(commissionsPage);
  }, [tab, refereesPage, commissionsPage, user, loadReferees, loadCommissions]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const shareUrl = stats?.shareUrl || (typeof window !== 'undefined' && stats?.code
    ? `${window.location.origin}/auth/register?ref=${stats.code}`
    : '');

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
  }

  if (!user) return null;

  const STAT_CARDS = stats ? [
    { label: 'Total Referees', value: stats.totalReferees.toString() },
    { label: 'Total Commission', value: `$${stats.totalCommission.toFixed(2)}` },
    { label: 'Pending', value: `$${stats.pendingCommission.toFixed(2)}` },
    { label: 'This Month', value: `$${stats.thisMonthCommission.toFixed(2)}` },
  ] : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-text-primary mb-6">Referral Program</h1>

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      ) : (
        <>
          {/* Hero code block */}
          <div className="bg-bg-secondary border border-border p-6 mb-6">
            <p className="text-xs text-text-secondary mb-2">Your referral code</p>
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-3xl font-bold text-accent tracking-widest">
                {stats?.code || '—'}
              </span>
              {stats?.code && (
                <button
                  onClick={() => copy(stats.code, 'Code')}
                  className="px-3 py-1.5 bg-accent text-black text-xs font-semibold hover:bg-accent-hover transition-colors"
                >
                  Copy Code
                </button>
              )}
            </div>
            {shareUrl && (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-xs font-mono text-text-muted truncate bg-bg-tertiary border border-border px-3 py-2">
                  {shareUrl}
                </span>
                <button
                  onClick={() => copy(shareUrl, 'Link')}
                  className="shrink-0 px-3 py-2 bg-bg-tertiary border border-border text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  Copy Link
                </button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {STAT_CARDS.map((card) => (
              <div key={card.label} className="bg-bg-secondary border border-border p-4">
                <div className="text-xs text-text-secondary mb-1">{card.label}</div>
                <div className="text-lg font-bold font-mono text-text-primary">{card.value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="bg-bg-secondary border border-border">
            <div className="flex border-b border-border">
              {(['referees', 'commissions'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-5 py-3 text-sm font-medium capitalize transition-colors ${
                    tab === t ? 'text-text-primary border-b-2 border-accent' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === 'referees' && (
              <div>
                {refereesLoading ? (
                  <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)}</div>
                ) : referees.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="text-text-muted text-sm">No referees yet</div>
                    <div className="text-text-muted text-xs mt-1">Share your code to start earning</div>
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-text-muted">
                        <th className="text-left px-4 py-2.5 font-medium">Email</th>
                        <th className="text-left px-4 py-2.5 font-medium">Joined</th>
                        <th className="text-right px-4 py-2.5 font-medium">Volume</th>
                        <th className="text-right px-4 py-2.5 font-medium">Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referees.map((r) => (
                        <tr key={r.id} className="border-b border-border last:border-0 hover:bg-bg-hover">
                          <td className="px-4 py-2.5 font-mono text-text-primary">{maskEmail(r.email)}</td>
                          <td className="px-4 py-2.5 text-text-muted">{new Date(r.joinedAt).toLocaleDateString()}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-text-primary">${r.volume.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-buy">${r.commission.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {refereesTotal > 1 && (
                  <div className="flex justify-center gap-2 p-3 border-t border-border">
                    <button onClick={() => setRefereesPage((p) => Math.max(0, p - 1))} disabled={refereesPage === 0} className="px-3 py-1 text-xs bg-bg-tertiary text-text-secondary disabled:opacity-40 hover:text-text-primary">Prev</button>
                    <span className="px-3 py-1 text-xs text-text-secondary">{refereesPage + 1} / {refereesTotal}</span>
                    <button onClick={() => setRefereesPage((p) => Math.min(refereesTotal - 1, p + 1))} disabled={refereesPage >= refereesTotal - 1} className="px-3 py-1 text-xs bg-bg-tertiary text-text-secondary disabled:opacity-40 hover:text-text-primary">Next</button>
                  </div>
                )}
              </div>
            )}

            {tab === 'commissions' && (
              <div>
                {commissionsLoading ? (
                  <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)}</div>
                ) : commissions.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="text-text-muted text-sm">No commissions yet</div>
                    <div className="text-text-muted text-xs mt-1">Share your code to start earning</div>
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-text-muted">
                        <th className="text-left px-4 py-2.5 font-medium">Date</th>
                        <th className="text-left px-4 py-2.5 font-medium">Referee</th>
                        <th className="text-left px-4 py-2.5 font-medium">Type</th>
                        <th className="text-right px-4 py-2.5 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.map((c) => (
                        <tr key={c.id} className="border-b border-border last:border-0 hover:bg-bg-hover">
                          <td className="px-4 py-2.5 text-text-muted">{new Date(c.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-2.5 font-mono text-text-primary">{maskEmail(c.refereeEmail)}</td>
                          <td className="px-4 py-2.5 text-text-secondary capitalize">{c.type.toLowerCase()}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-buy">${c.amount.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {commissionsTotal > 1 && (
                  <div className="flex justify-center gap-2 p-3 border-t border-border">
                    <button onClick={() => setCommissionsPage((p) => Math.max(0, p - 1))} disabled={commissionsPage === 0} className="px-3 py-1 text-xs bg-bg-tertiary text-text-secondary disabled:opacity-40 hover:text-text-primary">Prev</button>
                    <span className="px-3 py-1 text-xs text-text-secondary">{commissionsPage + 1} / {commissionsTotal}</span>
                    <button onClick={() => setCommissionsPage((p) => Math.min(commissionsTotal - 1, p + 1))} disabled={commissionsPage >= commissionsTotal - 1} className="px-3 py-1 text-xs bg-bg-tertiary text-text-secondary disabled:opacity-40 hover:text-text-primary">Next</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
