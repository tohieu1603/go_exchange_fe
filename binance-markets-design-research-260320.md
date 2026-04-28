# Binance Markets Page Design Research
**Date:** 2026-03-20
**Status:** Preliminary Research - Visual Inspection Required

---

## Executive Summary

Binance recently introduced **UI Refined** (launched mid-2025) with a flexible, customizable layout system. However, specific pixel-perfect design details for the Markets page require direct visual inspection of the live website, as this information is not publicly documented in API docs or technical specifications.

---

## 1. Overall Page Layout Structure

### Current Architecture (UI Refined 2025+)
- **Header**: Search bar, navigation tabs/filters
- **Main Content Area**:
  - Top section: Tab filters (All, Spot, Margin, Futures, etc.)
  - Secondary filters: Sorting options, view toggles
  - Market table/list: Core data display
  - Side panels: Optional (customizable in widget layout)

### Widget System
- Binance now uses a **flexible grid-based widget system**
- Users can customize layout by dragging, resizing, adding/removing widgets
- Some elements remain fixed (banners, essential tickers)
- Responsive to different device sizes and orientations

---

## 2. Tabs and Filters at Top

Based on research findings, the Markets page likely includes:

**Primary Tab Filters:**
- All Markets
- Spot Trading
- Margin Trading
- Futures
- Options (possibly)

**Secondary Controls:**
- Search/symbol lookup input
- Sorting buttons (by price, change %, volume, market cap)
- View mode toggle (possibly list vs. card view)
- Time period selector for price change % (1h, 24h, 7d, etc.)

---

## 3. Table Row Structure

### Standard Row Layout
Each market row contains:

**Column Sequence (Left to Right):**
1. **Rank/Index** - Position number
2. **Symbol/Pair** - Crypto name + ticker code (e.g., "Bitcoin BTC")
3. **Current Price** - Right-aligned number
4. **24h Change %** - Percentage with color coding (green = up, red = down)
5. **Price Sparkline/Chart** - Mini chart showing price trend (24h)
6. **24h Volume** - Trading volume in USD or base currency
7. **Market Cap** (optional) - Total market capitalization
8. **Action Button** - "Trade" or similar CTA

### Row Styling
- **Height**: Approximately 40-56px (standard data table row)
- **Hover Effect**: Likely background color change or highlight
- **Alternating Rows**: May have subtle background color alternation for readability
- **Border/Divider**: Subtle line separating rows

---

## 4. Mini Sparkline Charts in Each Row

### Chart Type
- **Line sparkline** or **area sparkline** showing price movement over 24 hours
- Rendered as **SVG** for performance
- Compact, minimal styling (no axes, labels, or gridlines)
- Width: ~40-60px, Height: ~20-30px

### Data Points
- Likely 24 data points (hourly intervals) or 96 points (15-minute intervals)
- **Green sparkline**: When current price > opening price
- **Red sparkline**: When current price < opening price
- Optional: **Gradient fill** under the line

### Animation
- Updates in real-time as new data arrives (via WebSocket)
- Smooth transition on price updates
- No explicit animation documented; likely instant or very fast

---

## 5. Price Flash/Blink Animation

### Behavior
When price updates:
- **Flash Effect**: Background color briefly changes (green flash for price increase, red for decrease)
- **Duration**: Estimated 500-1000ms (typical for financial dashboards)
- **Easing**: Linear or ease-out transition
- **Target Element**: Price cell background or entire row

### Color Coding
- **Green**: #0ECB81 or similar (price increased)
- **Red**: #F6465D or similar (price decreased)
- **Neutral**: Fades to transparent or original background

### Alternative Approach
Some dashboards use:
- Subtle border glow instead of full background flash
- Text color change (instead of background)
- Icon indicator (up/down arrow) that blinks

---

## 6. Visual Design: Colors, Spacing, Fonts

### Color Palette (Dark Theme - Binance UI Refined)
- **Background**: Midnight Black (#0B0E11 or similar)
- **Text Primary**: White (#FFFFFF) or off-white (#E8E8E8)
- **Text Secondary**: Gray (#777E8F or #8C8FA3)
- **Positive/Up**: Green (#0ECB81, #0DBE76, or similar)
- **Negative/Down**: Red (#F6465D, #EE5A6F, or similar)
- **Border/Divider**: Dark gray (#1C1F26, #242933)
- **Hover**: Subtle highlight (#1F2330 or rgba(255,255,255,0.05))

### Typography
- **Font Family**: Likely system font stack or custom (common: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto)
- **Font Size**:
  - Header/Title: 14-16px
  - Row text: 13-14px
  - Small labels: 12px
  - Price: Bold, 14-15px
- **Font Weight**:
  - Regular: 400
  - Medium: 500
  - Bold: 600-700 (for prices)

### Spacing
- **Table Padding**: 16-20px horizontal, 12-16px vertical (per cell)
- **Row Gap**: 0-2px (minimal or no gap between rows)
- **Column Gaps**: 12-24px between columns
- **Header Height**: 44-48px
- **Row Height**: 48-56px

---

## 7. Data Columns (Complete List)

Based on standard crypto market displays, expected columns:

| Column | Data Type | Example | Notes |
|--------|-----------|---------|-------|
| # | Number | 1 | Rank/position |
| Name | String | Bitcoin | Crypto name |
| Symbol | String | BTC | Ticker code |
| Price | Currency | $42,567.89 | Current USD price |
| 1h Change | Percentage | +2.34% | Last hour change |
| 24h Change | Percentage | -1.52% | Last 24h change |
| 7d Change | Percentage | +5.20% | Last 7 days change |
| Sparkline | Chart | [24h trend] | Visual price history |
| 24h Volume | Currency | $28.5B | Trading volume |
| Market Cap | Currency | $847.2B | Total cap |
| Action | Button | Trade | CTA button |

**Notes:**
- Not all columns may be visible simultaneously (responsive design)
- Column order/visibility may be customizable
- Some columns may be hidden on mobile

---

## 8. Known UI Refined Features (2025)

### Design Refinements
- **Sleeker Visuals**: Optimized for readability
- **Consistent Spacing**: Adjusted throughout app
- **Enhanced Fonts**: Contemporary, professional typography with improved clarity
- **New Icons**: Updated icon set for consistency
- **Screen Glare Reduction**: Improved contrast in dark mode
- **Multiple Theme Options**: User can choose color themes

### Responsive Behavior
- Adapts to different screen sizes and orientations
- Drag-and-drop widget customization
- Dynamic layout adjustments
- Information density controls (compact vs. expanded view)

---

## Critical Limitations

**The following cannot be confirmed without direct visual inspection:**

1. **Exact Color Codes** - RGB/Hex values for all UI elements
2. **Precise Font Sizes** - Exact px values for typography
3. **Exact Spacing** - Padding and margin measurements in px
4. **Animation Durations** - Flash timing, transition durations
5. **Component Heights** - Exact row heights, button sizes
6. **Border Styles** - Specific border weights, colors, radius values
7. **Shadow Effects** - If any drop shadows or elevation used
8. **Sparkline Rendering Details** - Exact SVG specifications
9. **Price Update Frequency** - Real-time update interval
10. **Mobile Breakpoints** - Responsive design thresholds

---

## Recommended Next Steps

### To Get Pixel-Perfect Details:

1. **Browser DevTools Inspection**
   - Open Binance Markets page
   - Right-click on elements → Inspect
   - Check computed styles (Colors, Fonts, Spacing)
   - Check CSS rules in DevTools

2. **Color Picker Tool**
   - Use browser color picker to sample exact colors
   - Note hex codes and RGB values
   - Check for alpha/opacity values

3. **Measurements**
   - Use browser DevTools "Measure" tool
   - Measure row heights, column widths, padding
   - Check spacing between elements

4. **Animation Analysis**
   - Use DevTools Performance tab to record animations
   - Check CSS transitions and durations
   - Use browser slow-mo option to analyze flash timing

5. **Design System Audit**
   - Check if Binance publishes design tokens or CSS variables
   - Look for GitHub repos with source code
   - Search for Figma design files (community)

6. **Screenshot Capture**
   - Take high-res screenshots of:
     - Header/tabs area
     - Single row structure
     - Sparkline details
     - Price flash animation (multiple frames)
     - Mobile view

---

## Sources

- [Binance UI Refined: Flexible Layout System](https://www.binance.com/en/blog/markets/binance-ui-refined-explore-the-new-flexible-layout-system-637776840040383614)
- [Binance Users Personalize Experience with New AI-Powered UI/UX](https://www.prnewswire.com/news-releases/binance-users-can-now-personalize-their-experience-with-new-ai-powered-ui-ux-302479990.html)
- [Binance Support - Customize Trading Page Theme and Layout](https://www.binance.com/en/support/faq/detail/70bf06528a9948c2afae16b8390e9d54)
- [Binance Markets - Spot Trading](https://www.binance.com/en/markets/spot)
- [Sparklines Documentation - TradingView](https://www.tradingview.com/script/ovDp4lL0-Sparklines/)
- [Crypto Sparklines - Atom Finance](https://docs.atom.finance/reference/intraday-sparklines)
- [Candlestick Chart Guide - Coinbase](https://www.coinbase.com/learn/tips-and-tutorials/how-to-read-candlestick-charts)
- [Binance Developer Docs - Market Data](https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints)

---

## Unresolved Questions

1. What are the exact RGB/Hex color codes for all UI elements?
2. What are the exact font sizes and weights for each element?
3. What is the exact duration of the price flash animation?
4. Are there any CSS custom properties (variables) used?
5. Does Binance use CSS-in-JS or traditional CSS files?
6. What is the SVG specification for sparkline charts?
7. How are sparklines updated in real-time (polling vs. WebSocket)?
8. Are there any micro-interactions beyond the price flash?
9. What is the responsive breakpoint strategy?
10. Are there accessibility considerations (ARIA labels, keyboard navigation)?
