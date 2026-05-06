'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { usePriceStore } from '@/stores/price-store';
import { api } from '@/lib/api';
import { wsManager } from '@/lib/ws';
import { NotificationBell } from '@/components/layout/notification-bell';
import type { Ticker } from '@/types';

const NAV_LINKS = [
  { href: '/', label: 'Markets' },
  { href: '/trade/BTC_USDT', label: 'Spot' },
  { href: '/futures/BTC_USDT', label: 'Futures' },
  { href: '/wallet', label: 'Wallet' },
  { href: '/history', label: 'Orders' },
];

const KYC_BADGE: Record<string, { label: string; cls: string }> = {
  VERIFIED: { label: 'KYC', cls: 'bg-buy/20 text-buy' },
  PENDING: { label: 'KYC?', cls: 'bg-accent/20 text-accent' },
  REJECTED: { label: 'KYC!', cls: 'bg-sell/20 text-sell' },
  NONE: { label: 'KYC', cls: 'bg-bg-tertiary text-text-secondary' },
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoggedIn, logout, setUser } = useAuthStore();
  const tickers = usePriceStore((s) => s.tickers);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [usdtBalance, setUsdtBalance] = useState<number | null>(null);
  const [positions, setPositions] = useState<{ pair: string; side: string; size: number; entryPrice: number; margin: number }[]>([]);
  const [prevBtcPrice, setPrevBtcPrice] = useState(0);
  const [btcFlash, setBtcFlash] = useState<'' | 'up' | 'down'>('');
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Auto-fetch profile on mount
  useEffect(() => {
    if (!user) {
      api.auth.profile().then((res) => {
        if (res.success && res.data) setUser(res.data);
      }).catch(() => {});
    }
  }, [user, setUser]);

  // Global WS ticker subscription
  const { setTicker, setAllTickers } = usePriceStore();

  useEffect(() => {
    api.market.tickers().then((res) => {
      if (res.success && res.data) setAllTickers(res.data);
    });
  }, [setAllTickers]);

  const handleWsTick = useCallback((pair: string) => (data: unknown) => {
    const t = data as Ticker;
    if (t && typeof t.price === 'number') setTicker(pair, t);
  }, [setTicker]);

  useEffect(() => {
    const tickerList = Object.values(tickers);
    if (!tickerList.length) return;
    const subs = tickerList.map((t) => {
      const ch = `ticker@${t.pair}`;
      const cb = handleWsTick(t.pair);
      wsManager.subscribe(ch, cb);
      return { ch, cb };
    });
    return () => subs.forEach(({ ch, cb }) => wsManager.unsubscribe(ch, cb));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(tickers).length, handleWsTick]);

  // Fetch balance + positions
  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchData = () => {
      api.wallet.balances().then((res) => {
        if (res.data) {
          const usdt = res.data.find((w) => w.currency === 'USDT');
          // Show total USDT equity (available + locked-as-collateral) so the
          // header pill stays stable when the user opens a futures position —
          // margin moves from `balance` to `lockedBalance`, total unchanged.
          setUsdtBalance((usdt?.balance ?? 0) + (usdt?.lockedBalance ?? 0));
        }
      });
      api.futures.openPositions().then((res) => {
        if (res.data) {
          setPositions(res.data.map((p) => ({
            pair: p.pair, side: p.side, size: p.size,
            entryPrice: p.entryPrice, margin: p.margin,
          })));
        }
      });
    };
    fetchData();
    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);
    const iv = setInterval(fetchData, 30000);
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus); };
  }, [isLoggedIn]);

  // Close drawer on ESC + outside click
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, [drawerOpen]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  // Calculate PnL
  const totalPnl = positions.reduce((sum, pos) => {
    const ticker = Object.values(tickers).find((t) => t.pair === pos.pair);
    if (!ticker) return sum;
    const markPrice = ticker.price;
    const pnl = pos.side === 'LONG'
      ? pos.size * (markPrice - pos.entryPrice)
      : pos.size * (pos.entryPrice - markPrice);
    return sum + pnl;
  }, 0);

  // BTC price flash
  const btcTicker = Object.values(tickers).find((t) => t.pair === 'BTC_USDT');
  const btcPrice = btcTicker?.price ?? 0;
  const btcChange = btcTicker?.change24h ?? 0;

  useEffect(() => {
    if (prevBtcPrice > 0 && btcPrice !== prevBtcPrice) {
      const dir = btcPrice > prevBtcPrice ? 'up' : 'down';
      setBtcFlash(dir);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setBtcFlash(''), 600);
    }
    setPrevBtcPrice(btcPrice);
  }, [btcPrice, prevBtcPrice]);

  async function handleLogout() {
    await api.auth.logout().catch(() => {});
    logout();
    router.push('/auth/login');
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href.split('/').slice(0, 2).join('/'));
  }

  const btcPriceColor = btcFlash === 'up' ? 'text-buy' : btcFlash === 'down' ? 'text-sell' : btcChange >= 0 ? 'text-buy' : 'text-sell';

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 glass-panel border-b border-border/60" style={{ height: '48px' }}>
        <div className="h-full px-3 flex items-center justify-between">
          {/* Left: Hamburger (mobile) + Logo + Nav (desktop) */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile hamburger */}
            <button
              className="md:hidden text-text-muted p-1 flex items-center justify-center"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <Link href="/" className="flex items-center gap-1.5 shrink-0 group">
              <div className="w-6 h-6 bg-accent flex items-center justify-center transition-all duration-[var(--motion-fast)] group-hover:drop-shadow-[0_0_8px_rgba(240,185,11,0.4)]">
                <span className="text-black font-black text-[10px]">TX</span>
              </div>
              <span className="text-sm font-bold text-text-primary hidden sm:block">
                ToHieu<span className="text-accent">X</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-0.5">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3 py-1.5 text-xs font-medium transition-colors duration-[var(--motion-fast)] ${
                    isActive(link.href)
                      ? 'text-accent after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-4 after:h-0.5 after:bg-accent after:rounded-full'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive('/admin') ? 'text-accent' : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>

          {/* Center: BTC price ticker */}
          {btcPrice > 0 && (
            <div className="hidden lg:flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted">BTC</span>
                <span className={`font-mono tabular-nums font-semibold transition-colors duration-200 ${btcPriceColor}`}>
                  ${btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`font-mono text-[10px] ${btcChange >= 0 ? 'text-buy' : 'text-sell'}`}>
                  {btcChange >= 0 ? '+' : ''}{btcChange.toFixed(2)}%
                </span>
              </div>
            </div>
          )}

          {/* Right: Auth + Notification (compact on mobile) */}
          <div className="flex items-center gap-1.5 md:gap-3">
            {isLoggedIn ? (
              <>
                {/* USDT Balance: hidden on mobile */}
                {usdtBalance !== null && (
                  <Link
                    href="/wallet"
                    className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-bg-tertiary hover:bg-bg-hover transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span className="text-[11px] font-mono tabular-nums text-text-primary font-medium">
                      ${usdtBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {positions.length > 0 && (
                      <span className={`text-[10px] font-mono tabular-nums font-semibold px-1 py-0.5 ${totalPnl >= 0 ? 'text-buy bg-buy-bg' : 'text-sell bg-sell-bg'}`}>
                        {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
                      </span>
                    )}
                  </Link>
                )}
                {/* Notification bell — always visible */}
                <NotificationBell />
                {/* KYC badge — hidden on mobile */}
                {user?.kycStatus && (() => {
                  const badge = KYC_BADGE[user.kycStatus] ?? KYC_BADGE['NONE'];
                  return (
                    <Link href="/kyc" className={`hidden md:inline-flex px-1.5 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                      {badge.label}
                    </Link>
                  );
                })()}
                {/* User avatar — render Google profile picture when available, fall back to initial. */}
                <Link href="/account" className="w-7 h-7 bg-accent/20 flex items-center justify-center hover:bg-accent/30 transition-colors shrink-0 overflow-hidden">
                  {user?.avatarUrl ? (
                    // Use plain <img> so referrer/CORS quirks don't trigger Next/Image's loader proxy.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-accent text-[10px] font-bold">{user?.email?.[0]?.toUpperCase() || 'U'}</span>
                  )}
                </Link>
                {/* Logout — hidden on mobile (in drawer instead) */}
                <button
                  onClick={handleLogout}
                  className="hidden md:block text-[11px] text-text-muted hover:text-sell transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push('/auth/login')}
                  className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary transition-colors md:px-3 md:py-1.5"
                >
                  Log In
                </button>
                <button
                  onClick={() => router.push('/auth/register')}
                  className="px-2 py-1 text-xs font-medium bg-accent text-black transition-colors hover:bg-accent-hover md:px-3 md:py-1.5"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile slide-in drawer overlay */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-[200] flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={closeDrawer} />
          {/* Drawer panel */}
          <div ref={drawerRef} className="relative w-72 max-w-[80vw] h-full bg-bg-secondary border-r border-border flex flex-col overflow-y-auto z-10">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
              <Link href="/" onClick={closeDrawer} className="flex items-center gap-2">
                <div className="w-6 h-6 bg-accent flex items-center justify-center">
                  <span className="text-black font-black text-[10px]">TX</span>
                </div>
                <span className="text-sm font-bold text-text-primary">ToHieu<span className="text-accent">X</span></span>
              </Link>
              <button onClick={closeDrawer} className="text-text-muted p-1">
                <X size={18} />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex flex-col py-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeDrawer}
                  className={`flex items-center px-5 py-3 text-sm font-medium transition-colors ${
                    isActive(link.href) ? 'text-accent bg-accent/5' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user?.role === 'ADMIN' && (
                <Link href="/admin" onClick={closeDrawer}
                  className={`flex items-center px-5 py-3 text-sm font-medium transition-colors ${isActive('/admin') ? 'text-accent bg-accent/5' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}`}>
                  Admin
                </Link>
              )}
            </nav>

            {/* Auth actions */}
            {isLoggedIn ? (
              <div className="mt-auto border-t border-border px-4 py-4 flex flex-col gap-3">
                {usdtBalance !== null && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Balance</span>
                    <span className="font-mono text-text-primary">${usdtBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <Link href="/account" onClick={closeDrawer} className="text-sm text-text-secondary hover:text-text-primary py-1">Account</Link>
                <Link href="/kyc" onClick={closeDrawer} className="text-sm text-text-secondary hover:text-text-primary py-1">KYC Verification</Link>
                <button
                  onClick={() => { closeDrawer(); handleLogout(); }}
                  className="mt-1 text-left text-sm text-sell py-1"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="mt-auto border-t border-border px-4 py-4 flex flex-col gap-3">
                <button onClick={() => { closeDrawer(); router.push('/auth/login'); }}
                  className="w-full py-2.5 text-sm text-text-primary border border-border hover:border-accent/40 transition-colors">
                  Log In
                </button>
                <button onClick={() => { closeDrawer(); router.push('/auth/register'); }}
                  className="w-full py-2.5 text-sm font-semibold bg-accent text-black hover:bg-accent-hover transition-colors">
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
