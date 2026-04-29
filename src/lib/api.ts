// API client — thin facade over `http.ts` (axios). Caller shape preserved
// from the previous fetch-based version so existing components keep working.
//
// Adding a new endpoint? Pick the right group below or add a new one. Always
// use the typed helpers (`get<T>`, `post<T>`, etc.) so response unwrapping
// (`{success, data, message}`) and 401 refresh stay consistent everywhere.

import type {
  Ticker, Wallet, Order, Trade, Deposit, PageResponse, User,
  Position, Notification, KYCProfile, KYCStatus, PlatformSettings,
  BonusPromotion, ApiKey, Referral, AuditLog, FeeTier, FundingRate, FundingPayment,
} from '@/types';
import { get, post, put, del, postForm } from './http';

// Build a query string from a partial param map, dropping empty/undefined entries.
function qs(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      post<{ accessToken: string; refreshToken: string; user: User; requires2FA?: boolean; tempToken?: string; requiresStepUp?: boolean; stepUpToken?: string }>(
        '/auth/login', { email, password },
      ),
    register: (email: string, password: string, fullName: string) =>
      post<User>('/auth/register', { email, password, fullName }),
    profile: () => get<User>('/auth/profile'),
    updateProfile: (data: { fullName?: string }) => put<User>('/auth/profile', data),
    changePassword: (oldPassword: string, newPassword: string) =>
      post<void>('/auth/change-password', { oldPassword, newPassword }),
    enable2FA: () => post<{ qrCodeUrl: string; secret: string }>('/auth/2fa/enable'),
    verify2FA: (code: string) => post<void>('/auth/2fa/verify', { code }),
    disable2FA: (code: string) => post<void>('/auth/2fa/disable', { code }),
    audit: (params: { page?: number; size?: number } = {}) =>
      get<PageResponse<AuditLog>>(`/auth/audit${qs({ page: params.page ?? 0, size: params.size ?? 20 })}`),
    stepUp: (token: string, code: string) =>
      post<{ user: User }>('/auth/step-up', { token, code }),
    logout: () => post<void>('/auth/logout'),
    logoutAll: () => post<void>('/auth/logout-all'),
    wsToken: () => get<{ token: string }>('/auth/ws-token'),
  },

  market: {
    tickers: () => get<Ticker[]>('/market/tickers'),
    depth: (pair: string, limit = 20) =>
      get<{ bids: number[][]; asks: number[][] }>(`/market/depth/${pair}${qs({ limit })}`),
    trades: (pair: string, limit = 50) =>
      get<Trade[]>(`/market/trades/${pair}${qs({ limit })}`),
    candles: (pair: string, interval: string, limit = 500) =>
      get<{ time: number; open: number; high: number; low: number; close: number; volume: number }[]>(
        `/market/candles/${pair}${qs({ interval, limit })}`,
      ),
    rate: () => get<{ vndPerUsd: number }>('/market/rate'),
  },

  wallet: {
    balances: () => get<Wallet[]>('/wallet/balances'),
    deposit: (amount: number) => post<Deposit>('/wallet/deposit', { amount }),
    deposits: (page = 1, size = 20) =>
      get<PageResponse<Deposit>>(`/wallet/deposits${qs({ page, size })}`),
  },

  walletExtra: {
    withdraw: (data: { bankCode: string; accountNumber: string; accountName: string; amount: number }) =>
      post<{ message: string }>('/wallet/withdraw', data),
    withdrawals: (page = 1, size = 20) =>
      get<PageResponse<{ id: number; amount: number; bankCode: string; status: string; createdAt: string }>>(
        `/wallet/withdrawals${qs({ page, size })}`,
      ),
  },

  trading: {
    placeOrder: (data: Partial<Order>) => post<Order>('/trading/orders', data),
    cancelOrder: (id: number) => del<void>(`/trading/orders/${id}`),
    orders: (page = 1, size = 20, status?: string) =>
      get<PageResponse<Order>>(`/trading/orders${qs({ page, size, status })}`),
    openOrders: () => get<Order[]>('/trading/orders/open'),
  },

  futures: {
    openPosition: (data: { pair: string; side: string; leverage: number; size: number; takeProfit?: number; stopLoss?: number }) =>
      post<Position>('/futures/order', data),
    closePosition: (id: number) => post<void>(`/futures/close/${id}`),
    positions: (status?: string) =>
      get<Position[]>(`/futures/positions${qs({ status })}`),
    openPositions: () => get<Position[]>('/futures/positions/open'),
    updateTPSL: (id: number, data: { takeProfit?: number; stopLoss?: number }) =>
      put<Position>(`/futures/positions/${id}/tpsl`, data),
    fundingLatest: (pair: string) => get<FundingRate>(`/futures/funding/${pair}/latest`),
    fundingHistory: (pair: string, limit = 24) =>
      get<FundingRate[]>(`/futures/funding/${pair}/history${qs({ limit })}`),
    myFunding: (params: { page?: number; size?: number } = {}) =>
      get<PageResponse<FundingPayment>>(`/futures/funding/me${qs({ page: params.page ?? 0, size: params.size ?? 20 })}`),
  },

  notifications: {
    list: (page = 1, size = 20, unread?: boolean) =>
      get<PageResponse<Notification>>(`/notifications${qs({ page, size, unread: unread ? 'true' : undefined })}`),
    unreadCount: () => get<{ count: number }>('/notifications/unread-count'),
    markRead: (id: number) => post<void>(`/notifications/${id}/read`),
    markAllRead: () => post<void>('/notifications/read-all'),
  },

  kyc: {
    sendVerifyEmail: () => post('/kyc/email/send'),
    verifyEmail: (code: string) => post('/kyc/email/verify', { code }),
    submitProfile: (data: Partial<KYCProfile>) => post('/kyc/profile', data),
    uploadDocument: (type: string, file: File) => {
      const fd = new FormData();
      fd.append('type', type);
      fd.append('file', file);
      return postForm('/kyc/document', fd);
    },
    status: () => get<KYCStatus>('/kyc/status'),
  },

  apiKeys: {
    list: () => get<ApiKey[]>('/api-keys'),
    create: (data: { name: string; permissions: string[]; ipWhitelist?: string[] }) =>
      post<{ id: number; name: string; secret: string; permissions: string[]; createdAt: string }>('/api-keys', data),
    revoke: (id: number | string) => del<void>(`/api-keys/${id}`),
  },

  referral: {
    myCode: () => get<{ code: string; shareUrl?: string }>('/referral/code'),
    stats: () => get<Referral>('/referral/stats'),
    referees: (params: { page?: number; size?: number } = {}) =>
      get<PageResponse<{ id: number; email: string; joinedAt: string; volume: number; commission: number }>>(
        `/referral/referees${qs({ page: params.page ?? 0, size: params.size ?? 20 })}`,
      ),
    commissions: (params: { page?: number; size?: number } = {}) =>
      get<PageResponse<{ id: number; refereeEmail: string; amount: number; type: string; createdAt: string }>>(
        `/referral/commissions${qs({ page: params.page ?? 0, size: params.size ?? 20 })}`,
      ),
  },

  feeTier: {
    list: () => get<FeeTier[]>('/fee-tiers'),
    mine: () => get<{ tier: number; volume30d: number; makerFee: number; takerFee: number; nextTierVolume?: number }>('/fee-tier/me'),
  },

  bonus: {
    my: () => get('/bonus/my'),
  },

  admin: {
    users: (page = 1, size = 20, search = '') =>
      get(`/admin/users${qs({ page, size, search })}`),
    userDetail: (userId: number) => get(`/admin/users/${userId}`),
    userWallets: (userId: number) => get(`/admin/users/${userId}/wallets`),
    userOrders: (userId: number, page = 1, size = 10) =>
      get(`/admin/users/${userId}/orders${qs({ page, size })}`),
    userPositions: (userId: number) => get(`/admin/users/${userId}/positions`),
    cancelUserOrder: (userId: number, orderId: number) =>
      post(`/admin/users/${userId}/orders/${orderId}/cancel`),
    closeUserPosition: (userId: number, positionId: number) =>
      post(`/admin/users/${userId}/positions/${positionId}/close`),
    adjustBalance: (userId: number, currency: string, amount: number, reason: string) =>
      post(`/admin/users/${userId}/wallets/${currency}/adjust`, { amount, reason }),
    updateUser: (userId: number, data: { fullName?: string; role?: string }) =>
      put(`/admin/users/${userId}`, data),
    updateKYC: (userId: number, status: string) =>
      put(`/admin/users/${userId}/kyc`, { status }),
    kycPending: () => get('/admin/kyc/pending'),
    kycApprove: (userId: number, note = '') =>
      post(`/admin/kyc/${userId}/approve`, { adminNote: note }),
    kycReject: (userId: number, note = '') =>
      post(`/admin/kyc/${userId}/reject`, { adminNote: note }),
    userKycStatus: (userId: number) => get(`/admin/users/${userId}/kyc`),
    settings: () => get<PlatformSettings>('/admin/settings'),
    updateSettings: (data: Partial<PlatformSettings>) => put('/admin/settings', data),
    bonusPromotions: (page = 1, size = 20) =>
      get(`/admin/bonus/promotions${qs({ page, size })}`),
    createPromotion: (data: Partial<BonusPromotion>) =>
      post('/admin/bonus/promotions', data),
    updatePromotion: (id: number, data: Partial<BonusPromotion>) =>
      put(`/admin/bonus/promotions/${id}`, data),
    deletePromotion: (id: number) => del(`/admin/bonus/promotions/${id}`),
    togglePromotion: (id: number) => put(`/admin/bonus/promotions/${id}/toggle`),
    userBonus: (userId: number) => get(`/admin/bonus/users/${userId}`),
    fraudLogs: (page = 1, size = 20, search = '') =>
      get(`/admin/fraud${qs({ page, size, search })}`),
    updateFraudAction: (id: number, action: string) =>
      put(`/admin/fraud/${id}`, { action }),
    lockUser: (userId: number, reason: string) =>
      post(`/admin/users/${userId}/lock`, { reason }),
    unlockUser: (userId: number) => post(`/admin/users/${userId}/unlock`),
    stats: () => get('/admin/stats'),
    charts: () => get('/admin/charts'),
    deposits: (page = 1, size = 20, search = '', status = '') =>
      get(`/admin/deposits${qs({ page, size, search, status })}`),
    confirmDeposit: (id: number) => post(`/admin/deposits/${id}/confirm`),
    rejectDeposit: (id: number) => post(`/admin/deposits/${id}/reject`),
    withdrawals: (page = 1, size = 20, search = '', status = '') =>
      get(`/admin/withdrawals${qs({ page, size, search, status })}`),
    approveWithdrawal: (id: number, note = '') =>
      post(`/admin/withdrawals/${id}/approve`, { adminNote: note }),
    rejectWithdrawal: (id: number, note = '') =>
      post(`/admin/withdrawals/${id}/reject`, { adminNote: note }),
    audit: (params: { page?: number; size?: number; userId?: number; action?: string; outcome?: string; from?: string; to?: string } = {}) =>
      get<PageResponse<AuditLog>>(`/admin/audit${qs({
        page: params.page ?? 0, size: params.size ?? 20,
        userId: params.userId, action: params.action, outcome: params.outcome,
        from: params.from, to: params.to,
      })}`),
  },
};

// Re-export types for legacy callers; some pages import these from `@/lib/api`.
export type { ApiResponse } from '@/types';
