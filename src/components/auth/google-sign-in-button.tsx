'use client';

// Google Identity Services (GIS) sign-in button. Loads the upstream
// `accounts.google.com/gsi/client` script once and renders Google's HTML
// button into a div ref. On callback the `credential` (JWT ID token) is
// POSTed to the BE which verifies + issues HttpOnly cookies.
//
// Why GIS over a hand-rolled OAuth redirect: zero server-side callback URL
// required, ID token is signed by Google so the BE can validate offline
// (no token exchange call), and the popup flow keeps the user on our page.

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
  onSuccess?: () => void;
  onError?: (msg: string) => void;
}

export function GoogleSignInButton({ text = 'continue_with', onSuccess, onError }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { login } = useAuthStore();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const missing = !clientId;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !ref.current || !window.google?.accounts?.id) return;
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
        // Render fills the parent's width — width: '100%' is not honoured by
        // GSI, so we pass the measured pixel width instead.
        const w = ref.current.clientWidth || 320;
        window.google.accounts.id.renderButton(ref.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text,
          shape: 'rectangular',
          width: w,
          logo_alignment: 'center',
        });
      })
      .catch(() => onError?.('Failed to load Google sign-in'));
    return () => {
      cancelled = true;
    };
  }, [text, login, onSuccess, onError, clientId]);

  if (missing) {
    return (
      <div className="text-xs text-text-muted text-center py-2 border border-dashed border-border rounded-xl">
        Google sign-in not configured (missing NEXT_PUBLIC_GOOGLE_CLIENT_ID)
      </div>
    );
  }
  // Min height reserves layout space until GSI renders, avoiding layout shift.
  return <div ref={ref} className="w-full min-h-[44px] flex justify-center" />;
}
