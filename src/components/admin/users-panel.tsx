'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { kycFileUrl } from '@/lib/kyc-files';
import { useToast } from '@/components/ui/toast-provider';
import { usePriceStore } from '@/stores/price-store';
import type { Order, Position } from '@/types';

interface AdminUser {
  id: number; email: string; fullName: string; role: string;
  kycStatus: string; kycStep: number; locked: boolean; createdAt?: string;
}

interface UsersPage {
  content: AdminUser[];
  totalPages: number;
  page: number;
  totalElements?: number;
}

interface Wallet {
  currency: string;
  balance: number;
  locked: number;
}

interface KYCDoc {
  id: number; docType: string; filePath: string; status: string;
}

interface KYCProfile {
  firstName?: string; lastName?: string; dateOfBirth?: string;
  phone?: string; address?: string; city?: string; occupation?: string;
}

interface KYCData {
  profile?: KYCProfile;
  documents?: KYCDoc[];
  status?: string;
  step?: number;
}

interface BonusEntry {
  id: number;
  amount: number;
  currency?: string;
  type?: string;
  status?: string;
  createdAt?: string;
  promotionName?: string;
}

type DrawerTab = 'info' | 'wallets' | 'orders' | 'positions' | 'kyc' | 'bonuses';
type PositionStatusFilter = 'ALL' | 'OPEN' | 'CLOSED' | 'LIQUIDATED';

const KYC_COLOR: Record<string, string> = {
  VERIFIED: 'text-buy',
  PENDING: 'text-accent',
  REJECTED: 'text-sell',
  NONE: 'text-text-secondary',
};

const KYC_BG: Record<string, string> = {
  VERIFIED: 'bg-buy/20 text-buy',
  PENDING: 'bg-accent/20 text-accent',
  REJECTED: 'bg-sell/20 text-sell',
  NONE: 'bg-bg-tertiary text-text-secondary',
};

const PAGE_SIZE = 20;
const MAX_PAGE_BUTTONS = 7;

// ── Pagination component ─────────────────────────────────────────────────────

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= MAX_PAGE_BUTTONS) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    const half = Math.floor(MAX_PAGE_BUTTONS / 2);
    let start = Math.max(2, page - half + 1);
    let end = Math.min(totalPages - 1, page + half - 1);
    if (page <= half + 1) { start = 2; end = MAX_PAGE_BUTTONS - 2; }
    if (page >= totalPages - half) { start = totalPages - MAX_PAGE_BUTTONS + 3; end = totalPages - 1; }
    pages.push(1);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center gap-1 mt-4 flex-wrap">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="px-2.5 py-1 text-xs bg-bg-tertiary border border-border text-text-secondary disabled:opacity-40 hover:border-accent hover:text-text-primary transition-colors"
      >
        &lsaquo;
      </button>
      {pages.map((p, idx) =>
        p === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-xs text-text-muted">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            className={`px-2.5 py-1 text-xs border transition-colors ${
              p === page
                ? 'bg-accent text-black border-accent font-semibold'
                : 'bg-bg-tertiary border-border text-text-secondary hover:border-accent hover:text-text-primary'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="px-2.5 py-1 text-xs bg-bg-tertiary border border-border text-text-secondary disabled:opacity-40 hover:border-accent hover:text-text-primary transition-colors"
      >
        &rsaquo;
      </button>
      <span className="text-[10px] text-text-muted ml-2">
        Page {page} of {totalPages}
      </span>
    </div>
  );
}

// ── User Detail Drawer ───────────────────────────────────────────────────────

function UserDrawer({
  user,
  onClose,
  onRefresh,
}: {
  user: AdminUser;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { success, error } = useToast();
  const [tab, setTab] = useState<DrawerTab>('info');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [kycData, setKycData] = useState<KYCData | null>(null);
  const [bonuses, setBonuses] = useState<BonusEntry[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [kycLoading, setKycLoading] = useState(false);
  const [bonusesLoading, setBonusesLoading] = useState(false);

  // Orders (spot) — paginated
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);

  // Positions (futures) — live PnL via ticker store
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positionsFilter, setPositionsFilter] = useState<PositionStatusFilter>('ALL');
  const tickers = usePriceStore((s) => s.tickers);

  // Lock/Unlock state
  const [lockReason, setLockReason] = useState('');
  const [lockLoading, setLockLoading] = useState(false);

  // KYC change
  const [kycStatus, setKycStatus] = useState(user.kycStatus);
  const [kycLoading2, setKycLoading2] = useState(false);

  // Role change
  const [role, setRole] = useState(user.role);
  const [roleLoading, setRoleLoading] = useState(false);

  // Current user data (may be updated after actions)
  const [currentUser, setCurrentUser] = useState<AdminUser>(user);

  function refreshUser() {
    api.admin.userDetail(user.id).then((res) => {
      if (res.success && res.data) {
        const u = res.data as AdminUser;
        setCurrentUser(u);
        setKycStatus(u.kycStatus);
        setRole(u.role);
      }
    });
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  // Load wallets when tab is selected
  useEffect(() => {
    if (tab === 'wallets' && wallets.length === 0) {
      setWalletsLoading(true);
      api.admin.userWallets(user.id).then((res) => {
        if (res.success && res.data) setWallets(res.data as Wallet[]);
        setWalletsLoading(false);
      });
    }
  }, [tab, user.id]);

  useEffect(() => {
    if (tab === 'kyc' && !kycData) {
      setKycLoading(true);
      api.admin.userKycStatus(user.id).then((res) => {
        if (res.success && res.data) setKycData(res.data as KYCData);
        setKycLoading(false);
      });
    }
  }, [tab, user.id]);

  useEffect(() => {
    if (tab === 'bonuses' && bonuses.length === 0) {
      setBonusesLoading(true);
      api.admin.userBonus(user.id).then((res) => {
        if (res.success && res.data) {
          const raw = res.data;
          setBonuses(Array.isArray(raw) ? (raw as BonusEntry[]) : []);
        }
        setBonusesLoading(false);
      });
    }
  }, [tab, user.id]);

  // Orders: refetch on tab/page change. Server already paginates.
  useEffect(() => {
    if (tab !== 'orders') return;
    setOrdersLoading(true);
    api.admin.userOrders(user.id, ordersPage, 20).then((res) => {
      if (res.success && res.data) {
        const page = res.data as { content?: Order[]; totalPages?: number };
        setOrders(page.content ?? []);
        setOrdersTotalPages(page.totalPages ?? 1);
      }
      setOrdersLoading(false);
    });
  }, [tab, user.id, ordersPage]);

  // Positions: poll every 3s while tab is open so newly-opened/closed
  // positions and DB-side mark price stay fresh. Live uPnL still
  // computed client-side from ticker store on every render.
  useEffect(() => {
    if (tab !== 'positions') return;
    let cancelled = false;
    const fetch = () => {
      api.admin.userPositions(user.id).then((res) => {
        if (cancelled) return;
        if (res.success && res.data) setPositions(res.data as Position[]);
        setPositionsLoading(false);
      });
    };
    setPositionsLoading(true);
    fetch();
    const iv = setInterval(fetch, 3000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [tab, user.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Live PnL: prefer ticker.price (WS-pushed) over the snapshot mark on
  // the position record. Falls back to position.markPrice if ticker not
  // loaded yet for that pair.
  const livePositions = useMemo(() => {
    return positions.map((p) => {
      const t = Object.values(tickers).find((tk) => tk.pair === p.pair);
      const live = t?.price ?? p.markPrice;
      const livePnl = p.status === 'OPEN'
        ? (p.side === 'LONG' ? p.size * (live - p.entryPrice) : p.size * (p.entryPrice - live))
        : p.unrealizedPnl;
      const roe = p.margin > 0 ? (livePnl / p.margin) * 100 : 0;
      return { ...p, _liveMark: live, _livePnl: livePnl, _roe: roe };
    });
  }, [positions, tickers]);

  const filteredPositions = positionsFilter === 'ALL'
    ? livePositions
    : livePositions.filter((p) => p.status === positionsFilter);

  const positionsSummary = useMemo(() => {
    const open = livePositions.filter((p) => p.status === 'OPEN');
    const totalUPnl = open.reduce((s, p) => s + p._livePnl, 0);
    const totalMargin = open.reduce((s, p) => s + p.margin, 0);
    return { openCount: open.length, totalUPnl, totalMargin };
  }, [livePositions]);

  async function handleLockToggle() {
    setLockLoading(true);
    let res;
    if (currentUser.locked) {
      res = await api.admin.unlockUser(user.id);
    } else {
      if (!lockReason.trim()) { error('Enter a reason to lock this user'); setLockLoading(false); return; }
      res = await api.admin.lockUser(user.id, lockReason);
    }
    if (res.success) {
      success(`User ${currentUser.locked ? 'unlocked' : 'locked'} successfully`);
      setLockReason('');
      refreshUser();
      onRefresh();
    } else {
      error(res.message || 'Action failed');
    }
    setLockLoading(false);
  }

  async function handleKYCChange() {
    if (kycStatus === currentUser.kycStatus) return;
    setKycLoading2(true);
    const res = await api.admin.updateKYC(user.id, kycStatus);
    if (res.success) {
      success('KYC status updated');
      refreshUser();
      onRefresh();
    } else {
      error(res.message || 'Failed');
      setKycStatus(currentUser.kycStatus);
    }
    setKycLoading2(false);
  }

  async function handleRoleChange() {
    if (role === currentUser.role) return;
    setRoleLoading(true);
    const res = await api.admin.updateUser(user.id, { role });
    if (res.success) {
      success('Role updated');
      refreshUser();
      onRefresh();
    } else {
      error(res.message || 'Failed');
      setRole(currentUser.role);
    }
    setRoleLoading(false);
  }

  const tabs: { key: DrawerTab; label: string }[] = [
    { key: 'info', label: 'Info' },
    { key: 'wallets', label: 'Wallets' },
    { key: 'orders', label: 'Orders' },
    { key: 'positions', label: 'Positions' },
    { key: 'kyc', label: 'KYC' },
    { key: 'bonuses', label: 'Bonuses' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[520px] bg-bg-primary border-l border-border z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg-secondary shrink-0">
          <div>
            <div className="text-sm font-semibold text-text-primary">{currentUser.fullName || '—'}</div>
            <div className="text-xs text-text-secondary mt-0.5">{currentUser.email}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 ${currentUser.locked ? 'bg-sell/20 text-sell' : 'bg-buy/20 text-buy'}`}>
              {currentUser.locked ? 'LOCKED' : 'ACTIVE'}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 ${currentUser.role === 'ADMIN' ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary text-text-secondary'}`}>
              {currentUser.role}
            </span>
            <button
              onClick={onClose}
              className="ml-2 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-bg-secondary shrink-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* ── INFO TAB ── */}
          {tab === 'info' && (
            <div className="space-y-5">
              {/* Basic info grid */}
              <div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2 font-semibold">User Details</div>
                <div className="bg-bg-secondary border border-border divide-y divide-border">
                  {[
                    { label: 'User ID', value: String(currentUser.id) },
                    { label: 'Email', value: currentUser.email },
                    { label: 'Full Name', value: currentUser.fullName || '—' },
                    { label: 'Role', value: currentUser.role },
                    { label: 'KYC Status', value: currentUser.kycStatus },
                    { label: 'KYC Step', value: String(currentUser.kycStep) },
                    { label: 'Locked', value: currentUser.locked ? 'Yes' : 'No' },
                    { label: 'Created At', value: currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleString() : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between px-3 py-2">
                      <span className="text-[11px] text-text-secondary">{label}</span>
                      <span className={`text-[11px] font-medium ${
                        label === 'KYC Status' ? KYC_COLOR[value] || 'text-text-primary'
                        : label === 'Locked' && value === 'Yes' ? 'text-sell'
                        : label === 'Locked' && value === 'No' ? 'text-buy'
                        : label === 'Role' && value === 'ADMIN' ? 'text-accent'
                        : 'text-text-primary'
                      }`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lock / Unlock */}
              <div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2 font-semibold">Lock / Unlock</div>
                <div className="bg-bg-secondary border border-border p-3 space-y-2">
                  {!currentUser.locked && (
                    <input
                      value={lockReason}
                      onChange={(e) => setLockReason(e.target.value)}
                      placeholder="Reason for locking (required)"
                      className="w-full px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-xs outline-none focus:border-accent"
                    />
                  )}
                  <button
                    onClick={handleLockToggle}
                    disabled={lockLoading}
                    className={`px-4 py-2 text-xs font-semibold transition-opacity disabled:opacity-50 ${
                      currentUser.locked
                        ? 'bg-buy/20 text-buy hover:bg-buy/30'
                        : 'bg-sell/20 text-sell hover:bg-sell/30'
                    }`}
                  >
                    {lockLoading ? 'Processing…' : currentUser.locked ? 'Unlock User' : 'Lock User'}
                  </button>
                </div>
              </div>

              {/* KYC Status change */}
              <div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2 font-semibold">Change KYC Status</div>
                <div className="bg-bg-secondary border border-border p-3 flex gap-2 items-center">
                  <select
                    value={kycStatus}
                    onChange={(e) => setKycStatus(e.target.value)}
                    className="flex-1 px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-xs outline-none focus:border-accent"
                  >
                    {['NONE', 'PENDING', 'VERIFIED', 'REJECTED'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleKYCChange}
                    disabled={kycLoading2 || kycStatus === currentUser.kycStatus}
                    className="px-4 py-2 bg-accent text-black text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
                  >
                    {kycLoading2 ? 'Saving…' : 'Apply'}
                  </button>
                </div>
              </div>

              {/* Role change */}
              <div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2 font-semibold">Change Role</div>
                <div className="bg-bg-secondary border border-border p-3 flex gap-2 items-center">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="flex-1 px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-xs outline-none focus:border-accent"
                  >
                    {['USER', 'ADMIN'].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleRoleChange}
                    disabled={roleLoading || role === currentUser.role}
                    className="px-4 py-2 bg-accent text-black text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
                  >
                    {roleLoading ? 'Saving…' : 'Apply'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── WALLETS TAB ── */}
          {tab === 'wallets' && (
            <div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2 font-semibold">Wallets</div>
              {walletsLoading ? (
                <div className="text-xs text-text-secondary py-6 text-center">Loading wallets…</div>
              ) : wallets.length === 0 ? (
                <div className="text-xs text-text-secondary py-6 text-center">No wallets found</div>
              ) : (
                <div className="bg-bg-secondary border border-border divide-y divide-border">
                  <div className="grid grid-cols-3 px-3 py-2 text-[10px] text-text-muted font-semibold uppercase tracking-wider">
                    <span>Currency</span>
                    <span className="text-right">Balance</span>
                    <span className="text-right">Locked</span>
                  </div>
                  {wallets.map((w) => (
                    <div key={w.currency} className="grid grid-cols-3 px-3 py-2.5 hover:bg-bg-hover transition-colors">
                      <span className="text-xs font-semibold text-accent">{w.currency}</span>
                      <span className="text-xs text-text-primary text-right font-mono">
                        {typeof w.balance === 'number' ? w.balance.toLocaleString(undefined, { maximumFractionDigits: 8 }) : w.balance}
                      </span>
                      <span className="text-xs text-sell text-right font-mono">
                        {typeof w.locked === 'number' ? w.locked.toLocaleString(undefined, { maximumFractionDigits: 8 }) : w.locked}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ORDERS TAB (spot) ── */}
          {tab === 'orders' && (
            <div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2 font-semibold">Spot Orders</div>
              {ordersLoading ? (
                <div className="text-xs text-text-secondary py-6 text-center">Loading orders…</div>
              ) : orders.length === 0 ? (
                <div className="text-xs text-text-secondary py-6 text-center">No orders found</div>
              ) : (
                <>
                  <div className="bg-bg-secondary border border-border overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-2 py-2 text-[10px] text-text-muted font-semibold uppercase">Time</th>
                          <th className="text-left px-2 py-2 text-[10px] text-text-muted font-semibold uppercase">Pair</th>
                          <th className="text-left px-2 py-2 text-[10px] text-text-muted font-semibold uppercase">Side</th>
                          <th className="text-left px-2 py-2 text-[10px] text-text-muted font-semibold uppercase">Type</th>
                          <th className="text-right px-2 py-2 text-[10px] text-text-muted font-semibold uppercase">Price</th>
                          <th className="text-right px-2 py-2 text-[10px] text-text-muted font-semibold uppercase">Amt</th>
                          <th className="text-right px-2 py-2 text-[10px] text-text-muted font-semibold uppercase">Filled</th>
                          <th className="text-right px-2 py-2 text-[10px] text-text-muted font-semibold uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => (
                          <tr key={o.id} className="border-b border-border last:border-0">
                            <td className="px-2 py-2 text-text-muted whitespace-nowrap">{new Date(o.createdAt).toLocaleString()}</td>
                            <td className="px-2 py-2 text-text-primary font-semibold">{o.pair}</td>
                            <td className={`px-2 py-2 font-semibold ${o.side === 'BUY' ? 'text-buy' : 'text-sell'}`}>{o.side}</td>
                            <td className="px-2 py-2 text-text-secondary">{o.type}</td>
                            <td className="px-2 py-2 text-right font-mono text-text-primary">
                              {o.type === 'MARKET' ? '—' : o.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </td>
                            <td className="px-2 py-2 text-right font-mono text-text-primary">
                              {o.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                            </td>
                            <td className="px-2 py-2 text-right font-mono text-text-secondary">
                              {o.filledAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                            </td>
                            <td className={`px-2 py-2 text-right font-semibold ${
                              o.status === 'FILLED' ? 'text-buy'
                              : o.status === 'CANCELLED' ? 'text-sell'
                              : o.status === 'PARTIAL' ? 'text-accent'
                              : 'text-text-secondary'
                            }`}>{o.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={ordersPage} totalPages={ordersTotalPages} onChange={setOrdersPage} />
                </>
              )}
            </div>
          )}

          {/* ── POSITIONS TAB (futures) ── */}
          {tab === 'positions' && (
            <div className="space-y-3">
              {/* Live summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-bg-secondary border border-border px-3 py-2">
                  <div className="text-[9px] text-text-muted uppercase tracking-wider">Open</div>
                  <div className="text-sm font-semibold text-text-primary mt-0.5">{positionsSummary.openCount}</div>
                </div>
                <div className="bg-bg-secondary border border-border px-3 py-2">
                  <div className="text-[9px] text-text-muted uppercase tracking-wider">Margin Used</div>
                  <div className="text-sm font-mono text-text-primary mt-0.5">${positionsSummary.totalMargin.toFixed(2)}</div>
                </div>
                <div className="bg-bg-secondary border border-border px-3 py-2">
                  <div className="text-[9px] text-text-muted uppercase tracking-wider">Live uPnL</div>
                  <div className={`text-sm font-mono font-semibold mt-0.5 ${positionsSummary.totalUPnl >= 0 ? 'text-buy' : 'text-sell'}`}>
                    {positionsSummary.totalUPnl >= 0 ? '+' : ''}${positionsSummary.totalUPnl.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Status filter */}
              <div className="flex gap-1">
                {(['ALL', 'OPEN', 'CLOSED', 'LIQUIDATED'] as PositionStatusFilter[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setPositionsFilter(s)}
                    className={`px-2 py-1 text-[10px] font-semibold transition-colors ${
                      positionsFilter === s
                        ? 'bg-accent text-black'
                        : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {positionsLoading && positions.length === 0 ? (
                <div className="text-xs text-text-secondary py-6 text-center">Loading positions…</div>
              ) : filteredPositions.length === 0 ? (
                <div className="text-xs text-text-secondary py-6 text-center">No positions</div>
              ) : (
                <div className="bg-bg-secondary border border-border overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-2 py-2 text-[10px] text-text-muted font-semibold uppercase">Time</th>
                        <th className="text-left px-2 py-2 text-[10px] text-text-muted font-semibold uppercase">Pair</th>
                        <th className="text-left px-2 py-2 text-[10px] text-text-muted font-semibold uppercase">Side</th>
                        <th className="text-right px-2 py-2 text-[10px] text-text-muted font-semibold uppercase">Lev</th>
                        <th className="text-right px-2 py-2 text-[10px] text-text-muted font-semibold uppercase">Size</th>
                        <th className="text-right px-2 py-2 text-[10px] text-text-muted font-semibold uppercase">Entry</th>
                        <th className="text-right px-2 py-2 text-[10px] text-text-muted font-semibold uppercase">Mark</th>
                        <th className="text-right px-2 py-2 text-[10px] text-text-muted font-semibold uppercase">PnL</th>
                        <th className="text-right px-2 py-2 text-[10px] text-text-muted font-semibold uppercase">ROE%</th>
                        <th className="text-right px-2 py-2 text-[10px] text-text-muted font-semibold uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPositions.map((p) => (
                        <tr key={p.id} className="border-b border-border last:border-0">
                          <td className="px-2 py-2 text-text-muted whitespace-nowrap">
                            {new Date(p.createdAt).toLocaleString()}
                          </td>
                          <td className="px-2 py-2 text-text-primary font-semibold">{p.pair}</td>
                          <td className={`px-2 py-2 font-semibold ${p.side === 'LONG' ? 'text-buy' : 'text-sell'}`}>{p.side}</td>
                          <td className="px-2 py-2 text-right text-text-secondary">{p.leverage}x</td>
                          <td className="px-2 py-2 text-right font-mono text-text-primary">
                            {p.size.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-text-secondary">
                            {p.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-text-secondary">
                            {p._liveMark.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                          </td>
                          <td className={`px-2 py-2 text-right font-mono font-semibold ${p._livePnl >= 0 ? 'text-buy' : 'text-sell'}`}>
                            {p._livePnl >= 0 ? '+' : ''}${p._livePnl.toFixed(2)}
                          </td>
                          <td className={`px-2 py-2 text-right font-mono ${p._roe >= 0 ? 'text-buy' : 'text-sell'}`}>
                            {p._roe >= 0 ? '+' : ''}{p._roe.toFixed(2)}%
                          </td>
                          <td className={`px-2 py-2 text-right font-semibold ${
                            p.status === 'OPEN' ? 'text-accent'
                            : p.status === 'CLOSED' ? 'text-buy'
                            : 'text-sell'
                          }`}>{p.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── KYC TAB ── */}
          {tab === 'kyc' && (
            <div className="space-y-4">
              {kycLoading ? (
                <div className="text-xs text-text-secondary py-6 text-center">Loading KYC data…</div>
              ) : !kycData ? (
                <div className="text-xs text-text-secondary py-6 text-center">No KYC data</div>
              ) : (
                <>
                  {/* Status badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Status</span>
                    <span className={`text-[10px] px-2 py-0.5 font-semibold ${KYC_BG[kycData.status || 'NONE'] || 'bg-bg-tertiary text-text-secondary'}`}>
                      {kycData.status || currentUser.kycStatus}
                    </span>
                    {kycData.step !== undefined && (
                      <span className="text-[10px] text-text-muted">Step {kycData.step}</span>
                    )}
                  </div>

                  {/* Profile */}
                  {kycData.profile && Object.keys(kycData.profile).length > 0 && (
                    <div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2 font-semibold">Profile</div>
                      <div className="bg-bg-secondary border border-border divide-y divide-border">
                        {Object.entries(kycData.profile).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between px-3 py-2">
                            <span className="text-[11px] text-text-secondary capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                            <span className="text-[11px] text-text-primary">{v || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  {kycData.documents && kycData.documents.length > 0 && (
                    <div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2 font-semibold">Documents</div>
                      <div className="grid grid-cols-2 gap-3">
                        {kycData.documents.map((doc) => (
                          <div key={doc.id} className="bg-bg-secondary border border-border p-2">
                            <img
                              src={kycFileUrl(doc.filePath)}
                              alt={doc.docType}
                              className="w-full h-28 object-cover border border-border mb-2"
                            />
                            <div className="text-[10px] text-text-secondary">{doc.docType}</div>
                            <div className={`text-[10px] font-semibold mt-0.5 ${KYC_COLOR[doc.status] || 'text-text-muted'}`}>{doc.status}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!kycData.profile || Object.keys(kycData.profile).length === 0) &&
                   (!kycData.documents || kycData.documents.length === 0) && (
                    <div className="text-xs text-text-secondary py-4 text-center">No KYC profile or documents submitted</div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── BONUSES TAB ── */}
          {tab === 'bonuses' && (
            <div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2 font-semibold">User Bonuses</div>
              {bonusesLoading ? (
                <div className="text-xs text-text-secondary py-6 text-center">Loading bonuses…</div>
              ) : bonuses.length === 0 ? (
                <div className="text-xs text-text-secondary py-6 text-center">No bonuses found</div>
              ) : (
                <div className="bg-bg-secondary border border-border divide-y divide-border">
                  <div className="grid grid-cols-4 px-3 py-2 text-[10px] text-text-muted font-semibold uppercase tracking-wider">
                    <span>Promotion</span>
                    <span>Type</span>
                    <span className="text-right">Amount</span>
                    <span className="text-right">Status</span>
                  </div>
                  {bonuses.map((b) => (
                    <div key={b.id} className="grid grid-cols-4 px-3 py-2.5 hover:bg-bg-hover transition-colors">
                      <span className="text-[11px] text-text-primary truncate pr-1">{b.promotionName || `#${b.id}`}</span>
                      <span className="text-[11px] text-text-secondary">{b.type || '—'}</span>
                      <span className="text-[11px] text-buy text-right font-mono">
                        +{typeof b.amount === 'number' ? b.amount.toLocaleString(undefined, { maximumFractionDigits: 4 }) : b.amount}
                        {b.currency ? ` ${b.currency}` : ''}
                      </span>
                      <span className={`text-[11px] text-right font-semibold ${
                        b.status === 'PAID' ? 'text-buy'
                        : b.status === 'PENDING' ? 'text-accent'
                        : b.status === 'CANCELLED' ? 'text-sell'
                        : 'text-text-secondary'
                      }`}>{b.status || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────────────

type RoleFilter = 'ALL' | 'USER' | 'ADMIN';
type KYCFilter = 'ALL' | 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
type LockedFilter = 'ALL' | 'Yes' | 'No';

export function UsersPanel() {
  const { success, error } = useToast();
  const [data, setData] = useState<UsersPage>({ content: [], totalPages: 1, page: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [kycFilter, setKycFilter] = useState<KYCFilter>('ALL');
  const [lockedFilter, setLockedFilter] = useState<LockedFilter>('ALL');

  const load = useCallback((p: number, q: string) => {
    setLoading(true);
    api.admin.users(p, PAGE_SIZE, q).then((res) => {
      if (res.success && res.data) setData(res.data as UsersPage);
      setLoading(false);
    });
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(page, search); }, [page, search, load]);

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function handlePageChange(p: number) {
    setPage(p);
    window.scrollTo({ top: 0 });
  }

  // Client-side filter on top of server results
  const filtered = data.content.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (kycFilter !== 'ALL' && u.kycStatus !== kycFilter) return false;
    if (lockedFilter === 'Yes' && !u.locked) return false;
    if (lockedFilter === 'No' && u.locked) return false;
    return true;
  });

  const filtersActive = roleFilter !== 'ALL' || kycFilter !== 'ALL' || lockedFilter !== 'ALL';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Users</h2>
          {data.totalElements !== undefined && (
            <div className="text-[10px] text-text-muted mt-0.5">{data.totalElements.toLocaleString()} total users</div>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-2 mb-4">
        <div className="flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by email or name…"
            className="flex-1 px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm outline-none focus:border-accent placeholder:text-text-muted"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-accent text-black text-sm font-semibold hover:bg-accent-hover transition-colors"
          >
            Search
          </button>
        </div>

        {/* Filter row */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Filter:</span>

          {/* Role filter */}
          <div className="flex">
            {(['ALL', 'USER', 'ADMIN'] as RoleFilter[]).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1 text-[10px] font-semibold border-r border-border last:border-r-0 transition-colors ${
                  roleFilter === r
                    ? 'bg-accent text-black border-accent'
                    : 'bg-bg-tertiary text-text-secondary border-border hover:text-text-primary'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-border" />

          {/* KYC filter */}
          <div className="flex">
            {(['ALL', 'NONE', 'PENDING', 'VERIFIED', 'REJECTED'] as KYCFilter[]).map((k) => (
              <button
                key={k}
                onClick={() => setKycFilter(k)}
                className={`px-2.5 py-1 text-[10px] font-semibold border-r border-border last:border-r-0 transition-colors ${
                  kycFilter === k
                    ? 'bg-accent text-black'
                    : 'bg-bg-tertiary text-text-secondary border-border hover:text-text-primary'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-border" />

          {/* Locked filter */}
          <div className="flex">
            {(['ALL', 'Yes', 'No'] as LockedFilter[]).map((l) => (
              <button
                key={l}
                onClick={() => setLockedFilter(l)}
                className={`px-2.5 py-1 text-[10px] font-semibold border-r border-border last:border-r-0 transition-colors ${
                  lockedFilter === l
                    ? 'bg-accent text-black'
                    : 'bg-bg-tertiary text-text-secondary border-border hover:text-text-primary'
                }`}
              >
                {l === 'ALL' ? 'All' : l === 'Yes' ? 'Locked' : 'Active'}
              </button>
            ))}
          </div>

          {filtersActive && (
            <button
              onClick={() => { setRoleFilter('ALL'); setKycFilter('ALL'); setLockedFilter('ALL'); }}
              className="text-[10px] text-sell hover:text-sell/80 transition-colors ml-1"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 px-3 text-left text-[10px] text-text-muted font-semibold uppercase tracking-wider">ID</th>
              <th className="py-2 px-3 text-left text-[10px] text-text-muted font-semibold uppercase tracking-wider">Email</th>
              <th className="py-2 px-3 text-left text-[10px] text-text-muted font-semibold uppercase tracking-wider">Name</th>
              <th className="py-2 px-3 text-left text-[10px] text-text-muted font-semibold uppercase tracking-wider">Role</th>
              <th className="py-2 px-3 text-left text-[10px] text-text-muted font-semibold uppercase tracking-wider">KYC</th>
              <th className="py-2 px-3 text-left text-[10px] text-text-muted font-semibold uppercase tracking-wider">Step</th>
              <th className="py-2 px-3 text-left text-[10px] text-text-muted font-semibold uppercase tracking-wider">Status</th>
              <th className="py-2 px-3 text-left text-[10px] text-text-muted font-semibold uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-text-secondary text-xs">Loading…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-text-secondary text-xs">No users found</td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className="border-b border-border hover:bg-bg-hover cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 text-text-muted font-mono">{u.id}</td>
                  <td className="py-2.5 px-3 text-text-primary max-w-[180px] truncate">{u.email}</td>
                  <td className="py-2.5 px-3 text-text-secondary max-w-[120px] truncate">{u.fullName || '—'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 ${u.role === 'ADMIN' ? 'bg-accent/20 text-accent' : 'bg-bg-tertiary text-text-secondary'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] font-semibold ${KYC_COLOR[u.kycStatus] || 'text-text-secondary'}`}>
                      {u.kycStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-text-secondary">{u.kycStep}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 ${u.locked ? 'bg-sell/20 text-sell' : 'bg-buy/20 text-buy'}`}>
                      {u.locked ? 'Locked' : 'Active'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-text-muted text-[10px]">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination page={page} totalPages={data.totalPages} onChange={handlePageChange} />

      {/* User Detail Drawer */}
      {selectedUser && (
        <UserDrawer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onRefresh={() => load(page, search)}
        />
      )}
    </div>
  );
}
