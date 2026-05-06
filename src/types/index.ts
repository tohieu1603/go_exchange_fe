export interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
  kycStatus: string;
  is2FA: boolean;
  avatarUrl?: string;
  // Set by BE AfterFind hook (false for OAuth-only accounts).
  // Drives the Set vs Change password UI on /account.
  hasPassword?: boolean;
}

export interface Wallet {
  id: number;
  userId: number;
  currency: string;
  balance: number;
  lockedBalance: number;
}

export interface Ticker {
  pair: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  assetType?: 'crypto' | 'forex' | 'commodity';
}

export interface Order {
  id: number;
  userId: number;
  pair: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_LIMIT';
  price: number;
  stopPrice: number;
  amount: number;
  filledAmount: number;
  status: 'OPEN' | 'PARTIAL' | 'FILLED' | 'CANCELLED';
  createdAt: string;
}

export interface Trade {
  id: number;
  pair: string;
  price: number;
  amount: number;
  total: number;
  side: string;
  createdAt: string;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Deposit {
  id: number;
  amount: number;
  currency: string;
  status: string;
  orderCode: string;
  qrCodeUrl: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  page: number;
  size: number;
  totalPages: number;
}

// Futures types (Phase 08)
export interface Position {
  id: number;
  pair: string;
  side: 'LONG' | 'SHORT';
  leverage: number;
  entryPrice: number;
  markPrice: number;
  size: number;
  margin: number;
  unrealizedPnl: number;
  liquidationPrice: number;
  takeProfit: number;
  stopLoss: number;
  status: 'OPEN' | 'CLOSED' | 'LIQUIDATED';
  createdAt: string;
  closedAt?: string;
}

export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  pair?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Withdrawal {
  id: number;
  amount: number;
  currency: string;
  bankCode: string;
  bankAccount: string;
  accountName: string;
  status: string;
  createdAt: string;
}

export interface KYCProfile {
  id: number; userId: number; firstName: string; lastName: string;
  dateOfBirth: string; phone: string; address: string; ward: string;
  district: string; city: string; postalCode: string; country: string;
  occupation: string; income: string; tradingExp: string; purpose: string;
}

export interface KYCDocument {
  id: number; userId: number; docType: string; filePath: string;
  status: string; adminNote: string; createdAt: string;
}

export interface KYCStatus {
  kycStep: number; emailVerified: boolean; kycStatus: string;
  profile?: KYCProfile; documents: KYCDocument[];
}

export interface PlatformSettings {
  id: number; depositFeePercent: number; withdrawFeePercent: number;
  minDeposit: number; maxDeposit: number; minWithdraw: number; maxWithdraw: number;
  tradingFeePercent: number; kycRequired: boolean;
}

export interface BonusPromotion {
  id: number; name: string; description: string; bonusPercent: number;
  maxBonusAmount: number; targetType: string; triggerType: string;
  isActive: boolean; startAt: string; endAt: string;
}

export interface UserBonus {
  id: number; userId: number; promotionId: number; bonusAmount: number;
  usedAmount: number; status: string; createdAt: string;
}

export interface FraudLog {
  id: number; userIds: string; fraudType: string; description: string;
  action: string; adminNote: string; createdAt: string;
}

export interface ApiKey {
  id: number;
  name: string;
  permissions: string[];
  createdAt: string;
  lastUsedAt?: string;
  ipWhitelist?: string[];
}

export interface Referral {
  code: string;
  shareUrl?: string;
  totalReferees: number;
  totalCommission: number;
  pendingCommission: number;
  thisMonthCommission: number;
}

export interface AuditLog {
  id: number;
  userId?: number;
  email?: string;
  action: string;
  outcome: 'success' | 'failure';
  ip?: string;
  userAgent?: string;
  deviceId?: string;
  newDevice?: boolean;
  detail?: string;
  createdAt: string;
}

export interface FeeTier {
  tier: number;
  volume30dRequired: number;
  makerFee: number;
  takerFee: number;
}

export interface FundingRate {
  pair: string;
  rate: number;
  nextFundingTime: string;
  recordedAt: string;
  interval?: number;
}

export interface FundingPayment {
  id: number;
  pair: string;
  side: 'LONG' | 'SHORT';
  rate: number;
  amount: number;
  createdAt: string;
}
