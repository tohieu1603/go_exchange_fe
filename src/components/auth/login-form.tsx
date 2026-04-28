'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { StepUpModal } from '@/components/auth/step-up-modal';

export function LoginForm() {
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stepUpToken, setStepUpToken] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }

    setLoading(true);
    try {
      const res = await api.auth.login(email, password);
      if (res.success && res.data) {
        if (res.data.requiresStepUp && res.data.stepUpToken) {
          setStepUpToken(res.data.stepUpToken);
          return;
        }
        if (res.data.requires2FA) { setError('2FA required. Feature coming soon.'); return; }
        if (res.data.user) {
          // Token is now set as HttpOnly cookie by server — just store user in Zustand
          login(res.data.user);
          window.location.href = '/';
          return;
        } else {
          setError(res.message || 'Invalid email or password.');
        }
      } else {
        setError(res.message || 'Invalid email or password.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <StepUpModal
      token={stepUpToken}
      open={!!stepUpToken}
      onSuccess={() => { setStepUpToken(''); window.location.href = '/'; }}
      onClose={() => setStepUpToken('')}
    />
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="bg-bg-secondary rounded-2xl p-8 border border-border shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-accent text-2xl font-black">TX</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
          <p className="text-text-secondary text-sm mt-1">Sign in to your ToHieuX account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm text-text-secondary font-medium mb-2">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-xl bg-bg-tertiary border border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary font-medium mb-2">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-xl bg-bg-tertiary border border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
            />
          </div>

          {error && (
            <div className="text-sm text-sell bg-sell-bg border border-sell/20 rounded-xl px-4 py-3 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-sm font-semibold bg-accent hover:bg-accent-hover text-black rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
          >
            {loading && <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-text-secondary text-sm mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-accent hover:text-accent-hover font-medium transition-colors">
            Create account
          </Link>
        </p>
      </div>
    </div>
    </>
  );
}
