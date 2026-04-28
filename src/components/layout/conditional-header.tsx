'use client';

import { usePathname } from 'next/navigation';
import { Header } from './header';

export function ConditionalHeader() {
  const pathname = usePathname();
  // Hide the main header on admin pages (admin has its own layout)
  if (pathname.startsWith('/admin')) return null;
  return <Header />;
}
