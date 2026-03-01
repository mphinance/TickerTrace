# TickerTrace — Product Roadmap

## ✅ Shipped

### Pipeline

- DB schema migration (7 analytics columns + ALTER TABLE)
- SQLite-compatible change detection (UNION of LEFT JOINs)
- Passive ETF removal (IVV/IWM/IBIT)
- Data cleanup (18,506 bogus rows)
- Junk ticker filtering (CASH, OTHER, etc.)

### Dashboard Intelligence

- Institutional buying/selling signals (AUM-weighted conviction scores)
- Streak tracking (consecutive-day accumulation from history files)
- Cross-fund overlap (multi-provider convergence detection)
- Pre-market "Retail Intel Briefing" card
- Option flow decoder (directional views: "Bullish above $X")
- ACCUMULATING / REDUCING / OPTIONS tab layout
- Significance filtering per fund type
- Collapsible sections
- Ticker search (?q=TSLA) with cross-fund detail
- Sector flow summary (money in/out by sector)

---

## 🔜 Next Sprint — Quick Wins

### Discord Webhook Alerts

Self-serve: paste webhook URL → "Send Daily Digest" → rich embed with top signals.
All client-side, no backend needed. ~20 min.

### Divergence Detector

Flag when funds from the same provider take opposite positions.
e.g. "ARKK buying TSLA while ARKW selling." Simple filter on existing data. ~15 min.

### Cached JSON API

Next.js API route at `/api/signals.json` returning the pre-computed signals, sector flow, briefing.
Enables external tools, spreadsheets, Discord bots to consume the data. ~20 min.

### Diff View — "What Changed Since Yesterday?"

Dedicated quick-answer page: single view showing all changes sorted by magnitude.
Already have the data via `getDailyDiff()`. Just needs a clean page. ~15 min.

### FastAPI + FastMCP Backend

Replace the current Next.js API route with a proper Python FastAPI server.

- FastAPI for REST endpoints (public API, auth, Stripe webhooks)
- FastMCP for Model Context Protocol integration (AI agents can query signals)
- Shares the same SQLite/data layer as the scraper
- Enables rate limiting, auth tokens, usage tracking

---

## 📋 Near-Term — Infrastructure

### Provider Plugin System

**Priority: HIGH.** One module per provider with a common contract:

```ts
interface Provider {
  name: string;
  funds: Fund[];
  download(): Promise<RawHolding[]>;
  normalize(raw: RawHolding[]): Holding[];
}
```

Eliminates the monolithic `scrape_avantis.py` and makes adding new providers trivial.

### Shared Parsing Utilities

Extract option chain parsing (ticker → underlying/strike/expiry/type) into a shared module.
Currently duplicated across scraper + frontend. Single source of truth.

### Schema Versioning

Version the CSV/DB schema so downstream consumers don't break when providers change formats.
Approach: `schema_version` field in the CSV header or a `schema.json` manifest.

### Anomaly Detection

Flag when: weights don't sum to ~100%, holdings count drops dramatically day-over-day,
scraper returns empty data. Surface as warnings in the dashboard.

### Per-Row Source URL & Timestamp

Store the source URL and scrape timestamp per holding row in the CSV/DB.
Enables audit trail and debugging when data looks wrong.

### Trading Calendar

Use a proper calendar (pandas market_calendars or similar) to handle:
half-days, holidays, weekends. Skip diff computation on non-trading days.

### Storage Strategy

Options (not mutually exclusive):

- 30-day rolling window for daily CSVs, weekly snapshots archived
- Monthly/quarterly partitioned SQLite DBs
- Compressed CSV exports (gzip) for older data
- Parquet format for analytics use

---

## 🚀 Product / Monetization

### Stripe Integration + Auth
>
> [!IMPORTANT]
> This is absolutely marketable. Daily institutional transparency data
> presented as actionable intelligence is a real product. Competitors
> charge $50-200/mo for similar data (Cathie's Ark tracker, ETF Flow tools).

**Tier ideas:**

- **Free**: Briefing + top 3 signals (delayed 1 day)
- **Pro ($15/mo)**: Full signals, search, sector flow, Discord alerts, API access
- **Institutional ($50/mo)**: Historical data, CSV exports, custom alerts

**Stack**: NextAuth.js + Stripe Checkout + middleware for route protection.
Relatively straightforward with Next.js App Router.

### Fund Profile Pages

Click on a fund badge → see all current holdings, recent changes, weight history.
Enables: `/fund/ARKK`, `/fund/AVUV`, etc.

### Share as Image

Screenshot the briefing card as PNG for Twitter/Discord sharing.
html2canvas library, ~30 min.

### Sparkline Weight History

Tiny inline charts showing 10-day weight trajectory per ticker.
Data already available from history files. SVG-based, no external libs needed.

### Relative Performance Overlay

Show if price went up/down AFTER institutions bought.
Free quote API (Yahoo Finance or similar). Validates the signal quality.

### "Institutions vs. Retail" Dashboard

Cross-reference ETF changes with retail flow data (Reddit sentiment, popular tickers).
Visualizes the information asymmetry gap.
