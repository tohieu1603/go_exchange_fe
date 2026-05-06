import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ConditionalHeader } from '@/components/layout/conditional-header';
import { ConditionalFooter } from '@/components/layout/conditional-footer';
import { ToastProvider } from '@/components/ui/toast-provider';
import { ErrorBoundary } from '@/components/error-boundary';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'To Hieu Exchange — Crypto Trading Platform',
  description: 'To Hieu Exchange — fast, secure crypto trading platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <ErrorBoundary>
          <ToastProvider>
            <ConditionalHeader />
            <main className="flex-1">{children}</main>
            <ConditionalFooter />
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
