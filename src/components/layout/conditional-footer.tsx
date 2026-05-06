'use client';

// Mirrors ConditionalHeader: hide the footer where it gets in the way.
// - /admin/*       → admin shell has its own chrome.
// - /trade/[pair]  → spot trading layout fills the viewport.
// - /futures/[pair]→ futures trading layout fills the viewport.
// - /auth/*        → login + register pages are short; the long footer
//                    pushes the form below the fold on small screens.
// Keep the predicate dumb so it's obvious where the footer renders.

import { usePathname } from 'next/navigation';
import { Footer } from './footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;
  if (pathname.startsWith('/trade/')) return null;
  if (pathname.startsWith('/futures/')) return null;
  if (pathname.startsWith('/auth/')) return null;
  return <Footer />;
}
