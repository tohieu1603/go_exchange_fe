'use client';

// Google Identity Services (GIS) sign-in. We render the upstream-required
// Google button inside an invisible, full-bleed layer, then paint our own
// branded button on top (pointer-events: none) so clicks fall through to
// the GSI iframe. This keeps Google's auth flow + brand-compliance intact
// while letting us match the rest of the dark UI.
//
// Why not custom-only: GSI's renderButton enforces brand guidelines (logo,
// padding, focus ring) and is the only path Google guarantees works for
// the ID-token credential flow we use on the BE.

import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface GsiResponse {
  credential: string;
  select_by?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: {
            client_id: string;
            callback: (resp: GsiResponse) => void;
            auto_select?: boolean;
            ux_mode?: 'popup' | 'redirect';
          }) => void;
          renderButton: (
            parent: HTMLElement,
            opts: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              width?: string | number;
              logo_alignment?: 'left' | 'center';
            },
          ) => void;
        };
      };
    };
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('GSI load failed')));
      return;
    }
    const s = document.createElement('script');
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('GSI load failed'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface Props {
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  label?: string;
  onSuccess?: () => void;
  onError?: (msg: string) => void;
}

// Google's official 4-color "G" mark — kept inline so we don't ship an
// asset roundtrip. Sized via SVG viewBox so parent controls dimensions.
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

export function GoogleSignInButton({
  text = 'continue_with',
  label = 'Đăng nhập với Google',
  onSuccess,
  onError,
}: Props) {
  const gsiRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { login } = useAuthStore();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const missing = !clientId;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !gsiRef.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        ux_mode: 'popup',
        callback: async (resp) => {
          if (!resp?.credential) return;
          try {
            const r = await api.auth.google(resp.credential);
            if (r.success && r.data?.user) {
              login(r.data.user);
              if (onSuccess) onSuccess();
              else window.location.href = '/';
            } else {
              onError?.(r.message || 'Google sign-in failed');
            }
          } catch {
            onError?.('Network error during Google sign-in');
          }
        },
      });
      // Match wrapper width so click-through area covers the full button.
      const w = wrapperRef.current?.clientWidth || 320;
      window.google.accounts.id.renderButton(gsiRef.current, {
        type: 'standard',
        theme: 'filled_blue',
        size: 'large',
        text,
        shape: 'rectangular',
        width: w,
        logo_alignment: 'center',
      });
    };

    loadGsi().then(render).catch(() => onError?.('Failed to load Google sign-in'));

    // Re-render on resize so the click-through layer keeps the full width.
    const ro = wrapperRef.current ? new ResizeObserver(() => render()) : null;
    if (ro && wrapperRef.current) ro.observe(wrapperRef.current);

    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [text, login, onSuccess, onError, clientId]);

  if (missing) {
    return (
      <div className="text-xs text-text-muted text-center py-2 border border-dashed border-border rounded-xl">
        Google sign-in not configured (missing NEXT_PUBLIC_GOOGLE_CLIENT_ID)
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative w-full group">
      {/* Hidden but interactive GSI button. Clicks land here through the
          transparent overlay above. */}
      <div
        ref={gsiRef}
        className="absolute inset-0 opacity-0 [&>*]:!w-full [&>*]:!h-full"
        aria-hidden="true"
      />
      {/* Custom branded UI — does NOT swallow clicks. */}
      <div className="pointer-events-none flex items-center justify-center gap-3 w-full h-12 rounded-xl bg-white text-gray-900 font-medium text-sm shadow-md border border-gray-200 transition-all duration-150 group-hover:shadow-lg group-hover:-translate-y-0.5 group-active:translate-y-0">
        <GoogleLogo className="w-5 h-5 shrink-0" />
        <span>{label}</span>
      </div>
    </div>
  );
}
