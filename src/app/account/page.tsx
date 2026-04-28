'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/toast-provider';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import type { KYCStatus, Wallet } from '@/types';
import { SkeletonCard } from '@/components/ui/skeleton';

type Tab = 'profile' | 'security' | 'wallets' | 'kyc' | 'bonus';

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'wallets', label: 'Wallets' },
  { id: 'kyc', label: 'KYC' },
  { id: 'bonus', label: 'Bonus' },
];

const KYC_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  VERIFIED: { label: 'Verified', cls: 'text-buy' },
  PENDING: { label: 'Pending Review', cls: 'text-accent' },
  REJECTED: { label: 'Rejected', cls: 'text-sell' },
  NONE: { label: 'Not Started', cls: 'text-text-secondary' },
};

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoggedIn, setUser } = useAuthStore();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('profile');

  // Profile
  const [fullName, setFullName] = useState(() => user?.fullName ?? '');
  const [saving, setSaving] = useState(false);

  // Security
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [enabling2FA, setEnabling2FA] = useState(false);

  // Wallets
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);

  // KYC
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [kycLoading, setKycLoading] = useState(false);

  // Bonus
  const [bonuses, setBonuses] = useState<{ id: number; bonusAmount: number; usedAmount: number; status: string; createdAt: string }[]>([]);
  const [bonusLoading, setBonusLoading] = useState(false);

  // Sign out all
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) { router.push('/auth/login'); return; }
  }, [isLoggedIn, router]);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Sync fullName when user object changes — derived state from prop, gated by value change
  useEffect(() => {
    if (user?.fullName) setFullName(user.fullName);
  }, [user?.fullName]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    if (tab === 'wallets') {
      setWalletsLoading(true);
      api.wallet.balances().then((res) => {
        if (cancelled) return;
        if (res.data) setWallets(res.data);
        setWalletsLoading(false);
      }).catch(() => { if (!cancelled) setWalletsLoading(false); });
    }
    if (tab === 'kyc') {
      setKycLoading(true);
      api.kyc.status().then((res) => {
        if (cancelled) return;
        if (res.data) setKycStatus(res.data);
        setKycLoading(false);
      }).catch(() => { if (!cancelled) setKycLoading(false); });
    }
    if (tab === 'bonus') {
      setBonusLoading(true);
      api.bonus.my().then((res) => {
        if (cancelled) return;
        if (res.success && res.data) setBonuses(res.data as typeof bonuses);
        setBonusLoading(false);
      }).catch(() => { if (!cancelled) setBonusLoading(false); });
    }
    return () => { cancelled = true; };
  }, [tab, isLoggedIn]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleUpdateProfile() {
    setSaving(true);
    const res = await api.auth.updateProfile({ fullName });
    if (res.success && res.data) {
      setUser(res.data);
      toast.success('Profile updated');
    } else toast.error(res.message || 'Failed to update');
    setSaving(false);
  }

  async function handleChangePassword() {
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    if (newPw.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setChangingPw(true);
    const res = await api.auth.changePassword(oldPw, newPw);
    if (res.success) { toast.success('Password changed'); setOldPw(''); setNewPw(''); setConfirmPw(''); }
    else toast.error(res.message || 'Failed to change password');
    setChangingPw(false);
  }

  async function handleEnable2FA() {
    const res = await api.auth.enable2FA();
    if (res.success && res.data) setQrUrl(res.data.qrCodeUrl);
    else toast.error(res.message || 'Failed');
  }

  async function handleVerify2FA() {
    setEnabling2FA(true);
    const res = await api.auth.verify2FA(twoFACode);
    if (res.success) {
      toast.success('2FA enabled');
      setQrUrl('');
      setTwoFACode('');
      if (user) setUser({ ...user, is2FA: true });
    } else toast.error(res.message || 'Invalid code');
    setEnabling2FA(false);
  }

  async function handleLogoutAll() {
    setLoggingOutAll(true);
    await api.auth.logoutAll();
    setLoggingOutAll(false);
    setConfirmLogoutAll(false);
    router.push('/auth/login');
  }

  async function handleDisable2FA() {
    if (!twoFACode) { toast.error('Enter your 2FA code'); return; }
    const res = await api.auth.disable2FA(twoFACode);
    if (res.success) {
      toast.success('2FA disabled');
      setTwoFACode('');
      if (user) setUser({ ...user, is2FA: false });
    } else toast.error(res.message || 'Invalid code');
  }

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-bg-primary py-5 sm:py-8 px-3 sm:px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-bold text-text-primary mb-4 sm:mb-6">Account</h1>

        {/* Tabs — scrollable on mobile */}
        <div className="flex border-b border-border mb-4 sm:mb-6 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 sm:px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                tab === t.id ? 'text-accent border-accent' : 'text-text-secondary border-transparent hover:text-text-primary'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Quick Links */}
        {tab === 'profile' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 sm:mb-6">
            {[
              { href: '/account/api-keys', title: 'API Keys', desc: 'Manage programmatic access', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
              )},
              { href: '/account/referral', title: 'Referral', desc: 'Earn from friends you invite', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              )},
              { href: '/account/audit', title: 'Audit Log', desc: 'Review account activity', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              )},
              { href: '/account/fee-tier', title: 'Fee Tier', desc: 'Your current trading fees', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>
              )},
            ].map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="flex items-start gap-3 p-4 bg-bg-secondary border border-border hover:border-accent/40 hover:-translate-y-0.5 transition-all duration-150"
              >
                <span className="text-accent mt-0.5 shrink-0">{card.icon}</span>
                <div>
                  <div className="text-sm font-semibold text-text-primary">{card.title}</div>
                  <div className="text-xs text-text-muted mt-0.5">{card.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Profile Tab */}
        {tab === 'profile' && (
          <div className="bg-bg-secondary border border-border p-6 space-y-4">
            <h2 className="text-base font-semibold text-text-primary">Profile Information</h2>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Email</label>
              <div className="px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm opacity-60">
                {user?.email}
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Role</label>
              <div className="px-3 py-2 bg-bg-tertiary border border-border text-sm">
                <span className={user?.role === 'ADMIN' ? 'text-accent' : 'text-text-primary'}>{user?.role}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-text-secondary mb-1">KYC Status</label>
                <div className="px-3 py-2 bg-bg-tertiary border border-border text-sm">
                  <span className={KYC_STATUS_MAP[user?.kycStatus || 'NONE']?.cls}>
                    {KYC_STATUS_MAP[user?.kycStatus || 'NONE']?.label}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-text-secondary mb-1">2FA</label>
                <div className="px-3 py-2 bg-bg-tertiary border border-border text-sm">
                  <span className={user?.is2FA ? 'text-buy' : 'text-text-secondary'}>
                    {user?.is2FA ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={handleUpdateProfile} disabled={saving}
              className="px-6 py-2.5 bg-accent text-black font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Security Tab */}
        {tab === 'security' && (
          <div className="space-y-6">
            {/* Change Password */}
            <div className="bg-bg-secondary border border-border p-6 space-y-4">
              <h2 className="text-base font-semibold text-text-primary">Change Password</h2>
              <input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)}
                placeholder="Current password"
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm outline-none focus:border-accent" />
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                placeholder="New password"
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm outline-none focus:border-accent" />
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm outline-none focus:border-accent" />
              <button onClick={handleChangePassword} disabled={changingPw}
                className="px-6 py-2.5 bg-accent text-black font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-60">
                {changingPw ? 'Changing...' : 'Change Password'}
              </button>
            </div>

            {/* Sign out all */}
            <div className="bg-bg-secondary border border-border p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">Active Sessions</h2>
                  <p className="text-xs text-text-secondary mt-1">Sign out from all devices, including this one.</p>
                </div>
                <button
                  onClick={() => setConfirmLogoutAll(true)}
                  className="px-4 py-2 bg-sell/10 text-sell border border-sell/20 text-xs font-semibold hover:bg-sell hover:text-white transition-colors shrink-0"
                >
                  Sign out all devices
                </button>
              </div>
            </div>

            {/* 2FA */}
            <div className="bg-bg-secondary border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-text-primary">Two-Factor Authentication</h2>
                <span className={`text-xs font-semibold px-2 py-0.5 ${user?.is2FA ? 'bg-buy/20 text-buy' : 'bg-bg-tertiary text-text-secondary'}`}>
                  {user?.is2FA ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {!user?.is2FA ? (
                <>
                  {!qrUrl ? (
                    <button onClick={handleEnable2FA}
                      className="px-6 py-2.5 bg-accent text-black font-semibold text-sm hover:bg-accent-hover transition-colors">
                      Enable 2FA
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-text-secondary">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
                      <div className="flex justify-center py-4">
                        <Image src={qrUrl} alt="2FA QR Code" width={192} height={192} style={{ objectFit: 'cover' }} className="border border-border" />
                      </div>
                      <input value={twoFACode} onChange={(e) => setTwoFACode(e.target.value)}
                        placeholder="Enter 6-digit code from app"
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm outline-none focus:border-accent" />
                      <button onClick={handleVerify2FA} disabled={enabling2FA}
                        className="px-6 py-2.5 bg-accent text-black font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-60">
                        {enabling2FA ? 'Verifying...' : 'Verify & Enable'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-text-secondary">Enter your 2FA code to disable two-factor authentication.</p>
                  <input value={twoFACode} onChange={(e) => setTwoFACode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm outline-none focus:border-accent" />
                  <button onClick={handleDisable2FA}
                    className="px-6 py-2.5 bg-sell text-white font-semibold text-sm hover:opacity-90 transition-opacity">
                    Disable 2FA
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wallets Tab */}
        {tab === 'wallets' && (
          <div className="bg-bg-secondary border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-text-primary">Wallet Balances</h2>
              <div className="flex gap-2">
                <Link href="/wallet/deposit"
                  className="px-3 py-1.5 bg-buy text-black text-xs font-semibold hover:opacity-90 transition-opacity">
                  Deposit
                </Link>
                <Link href="/wallet/withdraw"
                  className="px-3 py-1.5 bg-bg-tertiary border border-border text-text-primary text-xs font-semibold hover:bg-bg-hover transition-colors">
                  Withdraw
                </Link>
              </div>
            </div>
            {walletsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : wallets.length === 0 ? (
              <div className="text-text-secondary text-sm py-8 text-center">No wallets found</div>
            ) : (
              <div className="space-y-2">
                {wallets.map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-3 bg-bg-tertiary border border-border">
                    <div>
                      <span className="text-sm font-semibold text-text-primary">{w.currency}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-semibold text-text-primary">
                        {w.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      {w.lockedBalance > 0 && (
                        <div className="text-[10px] text-text-muted">
                          Locked: {w.lockedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* KYC Tab */}
        {tab === 'kyc' && (
          <div className="bg-bg-secondary border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-text-primary">KYC Status</h2>
              <Link href="/kyc" className="px-3 py-1.5 bg-accent text-black text-xs font-semibold hover:bg-accent-hover transition-colors">
                Go to KYC
              </Link>
            </div>
            {kycLoading ? (
              <div className="space-y-3">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : !kycStatus ? (
              <div className="text-text-secondary text-sm py-8 text-center">Unable to load KYC status</div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-bg-tertiary border border-border">
                  <div className={`w-10 h-10 flex items-center justify-center ${
                    kycStatus.kycStatus === 'VERIFIED' ? 'bg-buy/20' : kycStatus.kycStatus === 'PENDING' ? 'bg-accent/20' : 'bg-bg-primary'
                  }`}>
                    <span className="text-lg">
                      {kycStatus.kycStatus === 'VERIFIED' ? '✓' : kycStatus.kycStatus === 'PENDING' ? '⏳' : '○'}
                    </span>
                  </div>
                  <div>
                    <div className={`text-sm font-semibold ${KYC_STATUS_MAP[kycStatus.kycStatus || 'NONE']?.cls}`}>
                      {KYC_STATUS_MAP[kycStatus.kycStatus || 'NONE']?.label}
                    </div>
                    <div className="text-[11px] text-text-secondary">
                      Step {kycStatus.kycStep} of 4 {kycStatus.emailVerified && '· Email verified'}
                    </div>
                  </div>
                </div>

                {kycStatus.profile && (
                  <div className="p-4 bg-bg-tertiary border border-border">
                    <h3 className="text-xs font-semibold text-text-secondary mb-2">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-text-secondary">Name: </span><span className="text-text-primary">{kycStatus.profile.firstName} {kycStatus.profile.lastName}</span></div>
                      <div><span className="text-text-secondary">DOB: </span><span className="text-text-primary">{kycStatus.profile.dateOfBirth}</span></div>
                      <div><span className="text-text-secondary">Phone: </span><span className="text-text-primary">{kycStatus.profile.phone}</span></div>
                      <div><span className="text-text-secondary">City: </span><span className="text-text-primary">{kycStatus.profile.city}</span></div>
                      <div className="col-span-2"><span className="text-text-secondary">Address: </span><span className="text-text-primary">{kycStatus.profile.address}, {kycStatus.profile.ward}, {kycStatus.profile.district}</span></div>
                    </div>
                  </div>
                )}

                {kycStatus.documents && kycStatus.documents.length > 0 && (
                  <div className="p-4 bg-bg-tertiary border border-border">
                    <h3 className="text-xs font-semibold text-text-secondary mb-2">Documents ({kycStatus.documents.length})</h3>
                    <div className="flex gap-2 flex-wrap">
                      {kycStatus.documents.map((doc) => (
                        <div key={doc.id} className="px-2 py-1 bg-bg-secondary border border-border text-[10px]">
                          <span className="text-text-primary">{doc.docType}</span>
                          <span className={`ml-1 ${doc.status === 'APPROVED' ? 'text-buy' : doc.status === 'REJECTED' ? 'text-sell' : 'text-accent'}`}>
                            {doc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bonus Tab */}
        {tab === 'bonus' && (
          <div className="bg-bg-secondary border border-border p-6">
            <h2 className="text-base font-semibold text-text-primary mb-4">My Bonuses</h2>
            {bonusLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : bonuses.length === 0 ? (
              <div className="text-text-secondary text-sm py-8 text-center">No bonuses yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-secondary">
                      <th className="py-2 text-left px-2">Date</th>
                      <th className="py-2 text-right px-2">Amount</th>
                      <th className="py-2 text-right px-2">Used</th>
                      <th className="py-2 text-left px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bonuses.map((b) => (
                      <tr key={b.id} className="border-b border-border">
                        <td className="py-2 px-2 text-text-secondary">{new Date(b.createdAt).toLocaleDateString()}</td>
                        <td className="py-2 px-2 text-right font-mono text-buy">{b.bonusAmount.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right font-mono text-text-secondary">{b.usedAmount.toLocaleString()}</td>
                        <td className="py-2 px-2">
                          <span className={b.status === 'ACTIVE' ? 'text-buy' : b.status === 'USED' ? 'text-text-secondary' : 'text-sell'}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmLogoutAll}
        title="Sign out all devices"
        message="This will terminate all active sessions including this one. You will be redirected to the login page."
        confirmLabel="Sign out all"
        confirmColor="sell"
        loading={loggingOutAll}
        onConfirm={handleLogoutAll}
        onCancel={() => setConfirmLogoutAll(false)}
      />
    </div>
  );
}
