# TickerTrace — Product Roadmap

## ✅ Shipped

### Pipeline & Data

- DB schema migration (7 analytics columns + ALTER TABLE)
- SQLite-compatible change detection (UNION of LEFT JOINs)
- Passive ETF removal (IVV/IWM/IBIT) with `EXCLUDED_FUNDS` filter
- Data cleanup (18,506 bogus rows) + junk ticker filtering
- AVMV (Avantis US Mid Cap Value) added — 1-line scraper add

### Dashboard Intelligence (`/dashboard`)

- Institutional buying/selling signals (AUM-weighted conviction scores)
- Streak tracking (consecutive-day accumulation)
- Cross-fund overlap (multi-provider convergence detection)
- Pre-market "Retail Intel Briefing" card (collapsible)
- Option flow decoder ("Bullish above $X", "Capping upside at $Y")
- Divergence detector (cross-fund conflicts, intra-shop flagging)
- Sector flow card (money in/out by sector, 0.001% threshold)
- Ticker search (`?q=TSLA`) with cross-fund detail
- Activity heatmap (tickers × funds grid, color intensity = delta)
- Provider filter pills (filter by fund family)
- Heatmap / Table toggle on weekly activity
- ACCUMULATING / REDUCING / OPTIONS tab layout
- Collapsible sections (briefing, daily, weekly, divergences)
- Sticky header with backdrop blur
- Clickable TICKERTRACE logo → landing page
- Nav links: Holdings, 📡 API
- `/` keyboard search shortcut with key hint badge

### Fund Profile Pages (`/fund/[ticker]`)

- 13 fund pages statically generated (SSG, 1hr revalidation)
- Top 20 holdings table with weight bars
- Δ Weight and Δ Shares columns (daily change vs previous day)
- Recent changes sidebar with decoded option signals
- Fund KPIs: holdings count, options count, AUM, total weight
- Clickable fund badges throughout dashboard link to profiles

### Landing Page (`/`)

- Marketing hero ("What are institutions buying?")
- 6 feature cards (conviction, streaks, sector flow, search, divergences, Discord)
- Option decoder callout with example translations
- Pricing tiers preview (Free / Pro $15/mo)
- Founders Partner section (40% affiliate program, mailto CTA)

### Discord Integration

- Webhook component: paste URL, hit Send → rich embed to channel
- Webhook URL persisted to localStorage (auto-save, forget button, saved badge)
- Embed preview panel showing exact message before sending
- Buying/selling signals + sector flow in embed

### API & Tracking

- Public JSON API at `/api/signals` (CORS-enabled, 1hr cache)
- Self-documenting `_meta` field describing every endpoint and field
- Referral tracking (`?ref=CODE` → localStorage with timestamp)
- Supports any source code: FOUNDERS, X, SUBSTACK, DISCORD, etc.

### Full Holdings Page (`/holdings`)

- Full searchable/sortable data table of all active positions
- Back link → dashboard

---

## 🔜 Quick Wins (< 30 min each)

### Diff View — "What Changed Since Yesterday?"

Dedicated quick-answer page: single view showing all changes sorted by magnitude.
Already have the data via `getDailyDiff()`. Just needs a clean page.

### Share as Image

Screenshot the briefing card as PNG for Twitter/Discord sharing.
`html2canvas` library, ~30 min.

### Sparkline Weight History

Tiny inline charts showing 10-day weight trajectory per ticker.
Data already available from history files. SVG-based, no external libs.

---

## 📋 Near-Term — Infrastructure

### FastAPI + FastMCP Backend

Replace the current Next.js API route with a proper Python FastAPI server.

- FastAPI for REST endpoints (public API, auth, Stripe webhooks)
- FastMCP for Model Context Protocol integration (AI agents can query signals)
- Shares the same SQLite/data layer as the scraper
- Enables rate limiting, auth tokens, usage tracking

### Provider Plugin System

One module per provider with a common contract:

```ts
interface Provider {
  name: string;
  funds: Fund[];
  download(): Promise<RawHolding[]>;
  normalize(raw: RawHolding[]): Holding[];
}
```

Adding same-structure funds = 1 line (proven with AVMV).

### Schema Versioning

Version the CSV/DB schema so downstream consumers don't break when providers change.

### Anomaly Detection

Flag when: weights don't sum to ~100%, holdings count drops dramatically,
scraper returns empty data. Surface as warnings in the dashboard.

### Per-Row Source URL & Timestamp

Store source URL and scrape timestamp per holding row. Enables audit trail.

### Trading Calendar

Use `pandas_market_calendars` or similar for half-days, holidays, weekends.

### Storage Strategy

- 30-day rolling window for daily CSVs, weekly snapshots archived
- Compressed CSV exports (gzip) for older data
- Parquet format for analytics

### Shared Parsing Utilities

Extract option chain parsing into a shared module (currently duplicated).

---

## 🚀 Product / Monetization

### Stripe Integration + Auth

> [!IMPORTANT]
> Daily institutional transparency data presented as actionable intelligence
> is a real product. Competitors charge $50-200/mo for similar data.

**Tiers:**

- **Free**: Briefing + top 3 signals (delayed 1 day)
- **Pro ($15/mo)**: Full signals, search, sector flow, Discord alerts, API
- **Institutional ($50/mo)**: Historical data, CSV exports, custom alerts

**Stack**: NextAuth.js + Stripe Checkout + middleware gating.

### Relative Performance Overlay

Show if price went up/down AFTER institutions bought.
Free quote API (Yahoo Finance). Validates signal quality.

### "Institutions vs. Retail" Dashboard

Cross-reference ETF changes with retail flow data (Reddit sentiment, popular tickers).
Visualizes the information asymmetry gap.
