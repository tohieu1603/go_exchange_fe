'use client';

// Site-wide footer. Long, black, multi-column with brand, product links,
// company links, legal links, and contact rail. Social icons are inline
// SVGs so the footer renders before any external font/icon load.
//
// Hidden on /admin (admin shell has its own chrome) and on the trading
// pair pages (/trade/[pair], /futures/[pair]) where vertical space is at
// a premium — this is decided by ConditionalFooter, not here.

import Link from 'next/link';
import Image from 'next/image';

const FOOTER_BRAND = {
  name: 'To Hieu Exchange',
  tagline:
    'Sàn giao dịch crypto thế hệ mới — khớp lệnh tốc độ cao, phí tối ưu, bảo mật chuẩn ngân hàng. Hỗ trợ giao dịch spot, futures, và đa dạng cặp tiền số.',
};

const COL_PRODUCT = [
  { href: '/', label: 'Markets' },
  { href: '/trade/BTC_USDT', label: 'Spot Trading' },
  { href: '/futures/BTC_USDT', label: 'Futures' },
  { href: '/wallet', label: 'Wallet' },
  { href: '/account/fee-tier', label: 'Fee Tier' },
];

const COL_ACCOUNT = [
  { href: '/account', label: 'My Account' },
  { href: '/account/api-keys', label: 'API Keys' },
  { href: '/account/referral', label: 'Referral Program' },
  { href: '/account/audit', label: 'Activity Log' },
  { href: '/kyc', label: 'KYC Verification' },
];

const COL_COMPANY = [
  { href: '#about', label: 'About Us' },
  { href: '#careers', label: 'Careers' },
  { href: '#press', label: 'Press' },
  { href: '#blog', label: 'Blog' },
  { href: '#partners', label: 'Partners' },
];

const COL_LEGAL = [
  { href: '#terms', label: 'Terms of Service' },
  { href: '#privacy', label: 'Privacy Policy' },
  { href: '#aml', label: 'AML / KYC Policy' },
  { href: '#risk', label: 'Risk Disclosure' },
  { href: '#cookies', label: 'Cookie Policy' },
];

// Inline SVG glyphs — kept here so the footer is asset-free.
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.45 2.91h-2.33V22c4.78-.79 8.44-4.94 8.44-9.94z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ZaloIcon({ className }: { className?: string }) {
  // Zalo wordmark is a registered brand — use a clean monogram in a circle
  // so we don't ship raster assets and stay TM-safe.
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.07 2 11.1c0 2.92 1.51 5.51 3.86 7.18L5 22l3.94-1.92c.97.21 1.99.32 3.06.32 5.52 0 10-4.07 10-9.1S17.52 2 12 2zm-3.62 11.4l3.04-3.84H8.62V8.4h4.96v.96l-3.04 3.84h3.16v1.16H8.38v-.96zm5.86.96V8.4h1.12v5.96h-1.12zm3.04.06c-.96 0-1.62-.66-1.62-1.62v-2.46h1.12v2.34c0 .42.24.66.6.66.42 0 .66-.3.66-.78v-2.22h1.12v3.96h-1.04l-.06-.36c-.24.3-.48.48-.78.48z" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

interface SocialLink {
  href: string;
  label: string;
  hint: string;
  icon: (props: { className?: string }) => React.ReactElement;
  // Per-icon brand wash on hover — helps social links feel "alive".
  hover: string;
}

const SOCIALS: SocialLink[] = [
  {
    href: 'https://www.facebook.com/share/1CdWqYDuKz/?mibextid=wwXIfr',
    label: 'Facebook',
    hint: 'To Hieu Exchange',
    icon: FacebookIcon,
    hover: 'hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]',
  },
  {
    href: 'https://zalo.me/0344451632',
    label: 'Zalo',
    hint: '0344 451 632',
    icon: ZaloIcon,
    hover: 'hover:bg-[#0068FF] hover:text-white hover:border-[#0068FF]',
  },
  {
    href: 'https://instagram.com/tthieu160304',
    label: 'Instagram',
    hint: '@tthieu160304',
    icon: InstagramIcon,
    hover: 'hover:bg-gradient-to-tr hover:from-[#F58529] hover:via-[#DD2A7B] hover:to-[#8134AF] hover:text-white hover:border-transparent',
  },
];

const STATS = [
  { value: '24/7', label: 'Hỗ trợ khách hàng' },
  { value: '< 5ms', label: 'Tốc độ khớp lệnh' },
  { value: '500+', label: 'Cặp giao dịch' },
  { value: '120+', label: 'Quốc gia hỗ trợ' },
];

// Render the footer. Black background, multi-row: stats → main grid → legal.
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-black text-gray-300 mt-12 border-t border-white/10">
      {/* Top stats strip */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center md:text-left">
              <div className="text-xl md:text-2xl font-bold text-white tabular-nums">{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 grid gap-10 lg:gap-12 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12">
        {/* Brand + tagline + socials — wide column */}
        <div className="lg:col-span-4 space-y-5">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="To Hieu Exchange" width={40} height={40} className="w-10 h-10 rounded-lg" />
            <span className="text-lg font-bold text-white whitespace-nowrap">
              To Hieu <span className="text-accent">Exchange</span>
            </span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">{FOOTER_BRAND.tagline}</p>

          {/* Social pills with brand-color hover wash */}
          <div className="flex items-center gap-2">
            {SOCIALS.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${s.label} — ${s.hint}`}
                  title={`${s.label} — ${s.hint}`}
                  className={`group/sm inline-flex items-center justify-center w-10 h-10 rounded-lg border border-white/10 bg-white/5 text-gray-300 transition-all duration-200 ${s.hover}`}
                >
                  <Icon className="w-5 h-5" />
                </a>
              );
            })}
          </div>

          {/* Newsletter — prominent CTA. Submit handler intentionally a no-op
              until a marketing pipeline is wired (Mailchimp, Resend, etc.). */}
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex items-center gap-2 max-w-sm bg-white/5 border border-white/10 rounded-xl p-1 focus-within:border-accent/40"
          >
            <input
              type="email"
              required
              placeholder="Email của bạn"
              className="flex-1 bg-transparent border-0 px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-accent text-black hover:bg-accent-hover transition-colors"
            >
              Đăng ký
            </button>
          </form>
        </div>

        {/* Product */}
        <div className="lg:col-span-2">
          <h3 className="text-white text-sm font-semibold mb-4">Sản phẩm</h3>
          <ul className="space-y-2.5 text-sm">
            {COL_PRODUCT.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-gray-400 hover:text-accent transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Account */}
        <div className="lg:col-span-2">
          <h3 className="text-white text-sm font-semibold mb-4">Tài khoản</h3>
          <ul className="space-y-2.5 text-sm">
            {COL_ACCOUNT.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-gray-400 hover:text-accent transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div className="lg:col-span-2">
          <h3 className="text-white text-sm font-semibold mb-4">Công ty</h3>
          <ul className="space-y-2.5 text-sm">
            {COL_COMPANY.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-gray-400 hover:text-accent transition-colors">{l.label}</a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact rail */}
        <div className="lg:col-span-2">
          <h3 className="text-white text-sm font-semibold mb-4">Liên hệ</h3>
          <ul className="space-y-3 text-sm text-gray-400">
            <li className="flex items-start gap-2.5">
              <PhoneIcon className="w-4 h-4 mt-0.5 shrink-0 text-accent" />
              <a href="tel:+84344451632" className="hover:text-white transition-colors">0344 451 632</a>
            </li>
            <li className="flex items-start gap-2.5">
              <MailIcon className="w-4 h-4 mt-0.5 shrink-0 text-accent" />
              <a href="mailto:support@tohieu-exchange.vn" className="hover:text-white transition-colors break-all">
                support@tohieu-exchange.vn
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapIcon className="w-4 h-4 mt-0.5 shrink-0 text-accent" />
              <span className="leading-relaxed">
                Cộng Hòa, Hưng Hà, Thái Bình<br />
                <span className="text-gray-500 text-xs">(Ngự Thiên — Hưng Yên)</span>
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Trust + payment strip */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-4 flex-wrap justify-center md:justify-start">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10">
              <svg className="w-3.5 h-3.5 text-buy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              SSL 256-bit
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10">
              <svg className="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Cold-Storage 95%
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10">
              <svg className="w-3.5 h-3.5 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              KYC Verified
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-500">
            <span>Chấp nhận:</span>
            <span className="font-semibold text-gray-300">USDT</span>
            <span>·</span>
            <span className="font-semibold text-gray-300">VND</span>
            <span>·</span>
            <span className="font-semibold text-gray-300">VietQR</span>
            <span>·</span>
            <span className="font-semibold text-gray-300">Bank Transfer</span>
          </div>
        </div>
      </div>

      {/* Bottom legal bar */}
      <div className="border-t border-white/10 bg-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p className="text-center md:text-left">
            © {year} <span className="text-gray-300 font-semibold">{FOOTER_BRAND.name}</span>. All rights reserved.
            <span className="hidden md:inline"> · MST: 0123456789</span>
          </p>
          <ul className="flex items-center gap-x-4 gap-y-1 flex-wrap justify-center">
            {COL_LEGAL.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="hover:text-gray-300 transition-colors">{l.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Risk disclaimer band */}
      <div className="bg-black/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 text-[11px] text-gray-600 leading-relaxed text-center">
          <strong className="text-gray-400">Cảnh báo rủi ro:</strong> Giao dịch tiền số và hợp đồng tương lai có rủi ro cao,
          có thể không phù hợp với tất cả nhà đầu tư. Hãy chỉ giao dịch với số vốn bạn có thể chấp nhận mất.
          To Hieu Exchange không cung cấp lời khuyên đầu tư.
        </div>
      </div>
    </footer>
  );
}
