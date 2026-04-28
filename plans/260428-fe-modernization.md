# FE Modernization Plan (260428)

## Direction
Keep Binance dark theme. Polish, modernize subtly, fix bugs, fill BE gaps. Ant Design retained for admin (heavy Tables/Drawers/Forms) but theme-tokenized to match Binance dark. User pages stay Tailwind + custom primitives.

## Phase 1 — Critical bug fixes + safety
**Files**: ~12 components, scope mechanical

- [ ] **order-book.tsx** ref-during-render bug → derived state with `useEffect` to track `prevBestBid` (REAL bug — flicker)
- [ ] **23 setState-in-effect violations** → fix via:
  - Initialize loading state to `true` instead of `setLoading(true)` mid-effect
  - Wrap async fetch in cancel-guarded closure
  - For polling effects: derive correctly
- [ ] **Unhandled promises** in api.market.depth() etc. → `.catch()` everywhere with toast
- [ ] **ErrorBoundary** at root layout — prevents white-screen on component crash
- [ ] **Unused imports** removed (7 warnings)
- [ ] **Raw `<img>`** → `next/image` in account/page.tsx:243
- [ ] **`exhaustive-deps`** — add missing `loadPromotions`, `loadSettings` to deps
- [ ] **WebSocket reconnect** → exponential backoff in `lib/ws.ts`

## Phase 2 — UI polish (Binance-style modernized)
- [ ] Theme tokens: add `--shadow-elevation-{1,2,3}`, `--motion-duration-{fast,base,slow}`, `--motion-ease-{out,in,inout}`, `--blur-{sm,md}` for glass-on-hover
- [ ] **Ant Design dark theme config** — `ConfigProvider` wraps admin layout, tokens map to CSS vars (background, text, accent gold #f0b90b, borders)
- [ ] **Skeleton loaders** — replace generic `<Loading />` with content-shaped skeletons in markets, order book, history
- [ ] **Micro-interactions**: hover scale on tickers, smoother price flash, button press feedback (transform: scale 0.98)
- [ ] **Focus rings** on inputs/buttons — accent-gold outline at 2px
- [ ] **Glass header** — backdrop-blur on sticky header
- [ ] **Tabs/segmented control** — modern pill-style underline
- [ ] **Toasts** — slide+fade, stack management, action buttons

## Phase 3 — User-side missing pages (BE features uncovered)
- [ ] **/account/api-keys** — list/create/revoke API keys, scopes (trade/withdraw/read), copy secret modal
- [ ] **/account/referral** — referral code + share, stats, referees list, commissions
- [ ] **/account/audit** — audit log timeline (login.success/failure, password.change, 2fa.*)
- [ ] **/account/fee-tier** — current tier display, requirements next tier, table of all tiers
- [ ] **Step-up auth flow** — login response `{requiresStepUp, stepUpToken}` → modal asking OTP from email/SMS, calls `/api/auth/step-up`
- [ ] **Logout-all** button in account/security
- [ ] **TP/SL update modal** in futures positions — clickable on existing position rows
- [ ] **Funding rate widget** in futures pair page — latest rate + countdown to next funding + history chart
- [ ] **My funding payments** in history page — new tab

## Phase 4 — Admin features (match BE options)
- [ ] **/admin/audit** — platform-wide audit log with filters (user, action, outcome, date range, IP)
- [ ] **User detail drawer** — Lock/Unlock buttons (POST `/admin/users/:id/lock|unlock`)
- [ ] **/admin/users/:id/kyc** edit — admin can manually update KYC status (PUT)
- [ ] **/admin/api-keys** — view all API keys + revoke globally (if BE supports — verify)
- [ ] **/admin/referral** — referral leaderboard / commission payouts
- [ ] **Admin layout polish** — sidebar nav (instead of top-only), breadcrumbs, search palette (cmd+k)
- [ ] **Charts upgrade** — replace placeholder with real @ant-design/charts Line/Pie/Bar from `/admin/charts` data
- [ ] **Dashboard cards** — animated counters, trend indicators

## Out of scope (this iteration)
- Storybook
- Light theme
- Full mobile responsive overhaul
- a11y audit (just fix obvious wins)
- E2E tests

## Open questions
- Phase 3 KYC re-upload — does BE allow re-submit after reject? Need to check.
- Phase 4 admin api-keys — BE doesn't seem to expose admin endpoint, only user-side. Skip unless added.
- WebSocket: does `lib/ws.ts` need auth for private channels (orders, positions)? Currently uses public channels.
