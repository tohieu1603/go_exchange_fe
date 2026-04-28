// Axios instance + interceptors for the Micro-Exchange backend.
//
// Why axios over fetch:
//   - Single-flight 401 refresh with concurrent-request queueing (built on response interceptor).
//   - Native AbortSignal support for request cancellation on unmount.
//   - Cleaner error model (`AxiosError.response.data` always typed).
//
// Cookie auth: BE sets HttpOnly access_token + refresh_token cookies. We use
// `withCredentials: true` so axios attaches them automatically; no JS sees
// the token. On 401 we POST `/auth/refresh` (which mints a new access cookie)
// and replay the original request once.

import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export const http = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ── 401 refresh queue (single-flight) ──────────────────────────────────────
// Multiple parallel 401s share a single refresh attempt. While a refresh is
// in flight, additional 401s wait on `pending` and replay after it resolves.
let refreshing: Promise<boolean> | null = null;
// Guard: after auth fails and we redirect, stop firing further refresh attempts for 5s
let authFailedAt = 0;

async function doRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    // Don't try to refresh on the auth endpoints themselves — that creates loops.
    if (original.url?.includes('/auth/refresh') || original.url?.includes('/auth/login')) {
      return Promise.reject(error);
    }
    // If we already redirected recently, don't re-attempt
    if (authFailedAt && Date.now() - authFailedAt < 5000) {
      return Promise.reject(error);
    }
    original._retry = true;
    const ok = await doRefresh();
    if (!ok) {
      if (typeof window !== 'undefined') {
        authFailedAt = Date.now();
        // Suppress the redirect for background "am I logged in?" probes that
        // every page mount fires (profile, balances, ws-token, unread-count).
        // A 401 on those is the *expected* anonymous state — redirecting causes
        // a full reload that re-mounts the same probes ⇒ infinite loop. User
        // actions (login, place-order, etc.) still redirect normally.
        const url = original.url || '';
        const method = (original.method || 'get').toLowerCase();
        // Two classes of calls do NOT trigger a redirect on 401:
        //   1. Background GETs fired on mount by Header / NotificationBell to
        //      detect login state — 401 is the expected anonymous response.
        //   2. Notification side-effects (mark-read, mark-all-read) — these
        //      are non-critical UX actions; failing one should not log the
        //      user out. They silently fail and the dropdown stays open.
        const isBackgroundGet =
          method === 'get' && (
            url.includes('/auth/profile') ||
            url.includes('/auth/ws-token') ||
            url.includes('/wallet/balances') ||
            url.includes('/futures/positions/open')
          );
        const isNotificationCall = url.startsWith('/notifications');
        // Market data is public (no auth). A 401 here would be a misconfigured
        // gateway, not a session problem — never log the user out for it.
        const isMarketRead = method === 'get' && url.startsWith('/market');
        const isBackgroundProbe = isBackgroundGet || isNotificationCall || isMarketRead;
        if (!isBackgroundProbe && window.location.pathname !== '/auth/login') {
          window.location.href = '/auth/login';
        }
      }
      return Promise.reject(error);
    }
    return http(original);
  },
);

// ── Unwrapper: BE always returns `{success, data?, message?}`. Callers want
// the unwrapped envelope directly so we adapt every method to return ApiResponse<T>.
async function request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
  try {
    const res = await http.request<ApiResponse<T>>(config);
    return res.data;
  } catch (e) {
    const err = e as AxiosError<ApiResponse<T>>;
    if (err.response?.data) return err.response.data;
    return { success: false, message: err.message || 'Network error' } as ApiResponse<T>;
  }
}

export const get = <T>(url: string, config?: AxiosRequestConfig) => request<T>({ ...config, url, method: 'GET' });
export const post = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  request<T>({ ...config, url, method: 'POST', data });
export const put = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  request<T>({ ...config, url, method: 'PUT', data });
export const del = <T>(url: string, config?: AxiosRequestConfig) => request<T>({ ...config, url, method: 'DELETE' });

// Multipart upload helper — axios picks the right Content-Type with boundary.
export function postForm<T>(url: string, form: FormData, config?: AxiosRequestConfig) {
  return request<T>({
    ...config,
    url,
    method: 'POST',
    data: form,
    headers: { ...config?.headers, 'Content-Type': 'multipart/form-data' },
  });
}
