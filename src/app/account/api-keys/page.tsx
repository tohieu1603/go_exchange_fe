'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/toast-provider';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { SkeletonRow } from '@/components/ui/skeleton';
import type { ApiKey } from '@/types';

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const PERM_COLORS: Record<string, string> = {
  read: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  trade: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  withdraw: 'bg-sell/10 text-sell border-sell/20',
};

const ALL_PERMISSIONS = ['read', 'trade', 'withdraw'];

export default function ApiKeysPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const toast = useToast();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Create form
  const [name, setName] = useState('');
  const [perms, setPerms] = useState<string[]>(['read']);
  const [ipList, setIpList] = useState('');
  const [creating, setCreating] = useState(false);

  // Secret reveal modal
  const [secret, setSecret] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    const res = await api.apiKeys.list();
    if (res.success && res.data) setKeys(res.data);
    setLoading(false);
  }, [user]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    load();
  }, [user, router, load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleCreate() {
    if (!name.trim()) { toast.error('Name required'); return; }
    if (!perms.length) { toast.error('Select at least one permission'); return; }
    setCreating(true);
    const ipWhitelist = ipList.split('\n').map((s) => s.trim()).filter(Boolean);
    const res = await api.apiKeys.create({ name: name.trim(), permissions: perms, ipWhitelist: ipWhitelist.length ? ipWhitelist : undefined });
    if (res.success && res.data) {
      setSecret(res.data.secret);
      setShowCreate(false);
      setName(''); setPerms(['read']); setIpList('');
      load();
    } else {
      toast.error(res.message || 'Failed to create key');
    }
    setCreating(false);
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    const res = await api.apiKeys.revoke(revokeTarget.id);
    if (res.success) {
      toast.success('API key revoked');
      load();
    } else {
      toast.error(res.message || 'Failed to revoke');
    }
    setRevoking(false);
    setRevokeTarget(null);
  }

  function togglePerm(p: string) {
    setPerms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">API Keys</h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage programmatic access to your account</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-accent text-black text-sm font-semibold hover:bg-accent-hover transition-colors"
        >
          + Create Key
        </button>
      </div>

      <div className="bg-bg-secondary border border-border">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={6} />)}
          </div>
        ) : keys.length === 0 ? (
          <div className="py-16 text-center text-text-secondary text-sm">
            No API keys yet. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Permissions</th>
                  <th className="text-left px-4 py-3 font-medium">IP Whitelist</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="text-left px-4 py-3 font-medium">Last Used</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-border last:border-0 hover:bg-bg-hover">
                    <td className="px-4 py-3 font-medium text-text-primary">{k.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {k.permissions.map((p) => (
                          <span key={p} className={`px-1.5 py-0.5 border text-[10px] font-medium ${PERM_COLORS[p] || 'bg-bg-tertiary text-text-secondary border-border'}`}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {k.ipWhitelist && k.ipWhitelist.length > 0 ? (
                        <span title={k.ipWhitelist.join('\n')} className="cursor-help border-b border-dashed border-border">
                          {k.ipWhitelist.length} IP{k.ipWhitelist.length > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-text-muted">Any</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{timeAgo(k.createdAt)}</td>
                    <td className="px-4 py-3 text-text-muted">{k.lastUsedAt ? timeAgo(k.lastUsedAt) : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setRevokeTarget(k)}
                        className="text-sell text-xs hover:underline"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="bg-bg-secondary border border-border w-full max-w-md mx-4 p-6 space-y-4">
            <h3 className="text-base font-semibold text-text-primary">Create API Key</h3>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Trading Bot"
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-2">Permissions</label>
              <div className="flex gap-3">
                {ALL_PERMISSIONS.map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={perms.includes(p)} onChange={() => togglePerm(p)} className="w-3.5 h-3.5 accent-accent" />
                    <span className={`text-xs font-medium ${PERM_COLORS[p]?.split(' ')[1] || 'text-text-primary'}`}>{p}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">IP Whitelist <span className="text-text-muted">(one per line, optional)</span></label>
              <textarea
                value={ipList}
                onChange={(e) => setIpList(e.target.value)}
                placeholder="192.168.1.1&#10;10.0.0.0/24"
                rows={3}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm outline-none focus:border-accent resize-none font-mono"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 h-10 bg-bg-tertiary text-text-secondary text-sm hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={handleCreate} disabled={creating} className="flex-1 h-10 bg-accent text-black text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50">
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secret reveal modal */}
      {secret && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-bg-secondary border border-border w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center gap-2 text-yellow-400">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <h3 className="text-base font-semibold">Save your secret key</h3>
            </div>
            <p className="text-sm text-text-secondary">This is the only time your secret will be shown. Copy it now — you cannot retrieve it later.</p>
            <div className="bg-bg-tertiary border border-border px-3 py-2 flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-text-primary break-all">{secret}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(secret); toast.success('Copied'); }}
                className="shrink-0 px-2 py-1 text-[10px] bg-accent text-black font-medium hover:bg-accent-hover"
              >
                Copy
              </button>
            </div>
            <button
              onClick={() => setSecret('')}
              className="w-full h-10 bg-bg-tertiary text-text-primary text-sm font-medium hover:bg-bg-hover transition-colors"
            >
              I&apos;ve saved it
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!revokeTarget}
        title="Revoke API Key"
        message={`Revoke "${revokeTarget?.name}"? Any applications using this key will lose access immediately.`}
        confirmLabel="Revoke Key"
        confirmColor="sell"
        loading={revoking}
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
