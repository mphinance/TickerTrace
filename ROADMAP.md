# TickerTrace — Product Roadmap

## ✅ Shipped

### Pipeline & Data

- DB schema migration (7 analytics columns + ALTER TABLE)
- SQLite-compatible change detection (UNION of LEFT JOINs)
- Passive ETF removal (IVV/IWM/IBIT) with `EXCLUDED_FUNDS` filter
- Data cleanup (18,506 bogus rows) + junk ticker filtering
- AVMV (Avantis US Mid Cap Value) added — scraper + 30s HTTP timeouts
- Request timeouts on all HTTP calls (fixed silent GH Actions hangs)

### Dashboard Intelligence (`/dashboard`)

- Institutional buying/selling signals (AUM-weighted conviction scores)
- Streak tracking (consecutive-day accumulation)
- Cross-fund overlap (multi-provider convergence detection)
- Pre-market "Retail Intel Briefing" card (collapsible)
- Option flow decoder ("Bullish above $X", "Capping upside at $Y")
- Divergence detector (cross-fund conflicts, intra-shop flagging)
- Sector flow card (money in/out by sector, 0.001% threshold)
- Ticker search (`?q=TSLA`) with cross-fund detail
- Activity heatmap (funds × tickers grid, horizontal layout, color intensity = delta)
- Provider filter pills (filter by fund family)
- Heatmap / Table toggle on weekly activity
- ACCUMULATING / REDUCING / OPTIONS tab layout
- Collapsible sections (briefing, daily, weekly, divergences)
- Sticky header with backdrop blur
- Clickable TICKERTRACE logo → landing page
- Nav links: Holdings, Δ Changes, 📡 API
- `/` keyboard search shortcut with key hint badge

### Fund Profile Pages (`/fund/[ticker]`)

- 13 fund pages statically generated (SSG, 1hr revalidation)
- Top 20 holdings table with weight bars
- Δ Weight and Δ Shares columns (daily change vs previous day)
- Recent changes sidebar with decoded option signals
- Fund KPIs: holdings count, options count, AUM, total weight
- Clickable fund badges throughout dashboard link to profiles

### Δ Changes Page (`/changes`)

- Dedicated diff view: all daily changes sorted by magnitude
- Provider + fund filter pills, type filter (buys/sells/new/exit)
- Sortable interactive table

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

### API & MCP — `https://api.tickertrace.mphinance.com`

- **FastAPI REST API** — all endpoints fully open, no auth required
  - `/api/v1/signals` — conviction-scored buying/selling signals
  - `/api/v1/changes` — filterable daily position changes
  - `/api/v1/fund/{ticker}` — fund holdings detail
  - `/api/v1/ticker/{ticker}` — cross-fund ticker view
  - `/api/v1/sectors` — sector weight flows
  - `/api/v1/divergences` — cross-fund conflicts
  - `/api/v1/funds` — tracked fund list
  - `/api/v1/stats` — global stats
  - Interactive Swagger docs at `/docs`
- **FastMCP server** — AI agents can query signals via Model Context Protocol
  - 7 tools: signals, changes, fund detail, ticker detail, sector flow, divergences, market summary
  - Claude Desktop integration documented
- **CLAUDE.md** — full agent context file for AI tools
- Self-documenting `_meta` field on legacy `/api/signals` endpoint
- CORS enabled, Docker containerized

### Dashboard Premium Gating

- **Free**: top 3 signals, basic stats, search bar, holdings page
- **Pro** (API key): full signals, briefing card, sector flow, divergences, heatmaps, changes page, fund profiles
- AuthProvider + ProGate component (blurred preview + upgrade CTA for free users)
- AuthModal (tabs: "I have a key" / "Get free key")
- AuthButton in header (shows user email/tier when logged in)
- Cookie-based key persistence (7 days)
- API key validated against live API `/auth/me`

### Stripe Billing & Auth

- Stripe Checkout integration (`allow_promotion_codes`)
- Webhook handler (subscription lifecycle: create, update, delete, payment)
- Cancel-at-period-end (graceful cancellation, keeps access)
- Promo code system (KINGDOM, ZEN, ART, PATHFINDERS — 30-day Pro)
- User registration + API key generation (`tt_live_` format)
- SQLite user DB with tiered access + rate limiting
- Admin endpoint for promo code creation

### Deployment — Vultr Docker

- Docker (Python 3.12-slim) → uvicorn → Apache reverse proxy
- SSL via Certbot (auto-redirect HTTP → HTTPS)
- Data sync cron (weekdays 8 AM UTC)
- `deploy.sh` one-shot deployment script
- systemd-free — Docker `restart: unless-stopped`

### DevOps

- Referral tracking (`?ref=CODE` → localStorage with timestamp)
- GitHub Actions: daily scrape at 12:00 UTC (Mon–Fri)
- CSV history with 30-day rolling window
- Automated daily analysis generator (`generate_analysis.py`)

### Full Holdings Page (`/holdings`)

- Full searchable/sortable data table of all active positions
- **Δ Weight** and **Δ Shares** columns from daily diff (green/red, sortable)
- CASH/OTHER/USD/treasury bill rows filtered out
- "· X changed today" subtitle count
- Back link → dashboard

---

## 🔜 Quick Wins (< 30 min each)

### Share as Image

Screenshot the briefing card as PNG for Twitter/Discord sharing.
`html2canvas` library, ~30 min.

### Sparkline Weight History

Tiny inline charts showing 10-day weight trajectory per ticker.
Data already available from history files. SVG-based, no external libs.

---

## 📋 Near-Term — Infrastructure

### Provider Plugin System

One module per provider with a common contract:

```python
class Provider:
    name: str
    funds: list[Fund]
    def download(self) -> list[RawHolding]: ...
    def normalize(self, raw: list[RawHolding]) -> list[Holding]: ...
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

### Relative Performance Overlay

Show if price went up/down AFTER institutions bought.
Free quote API (Yahoo Finance). Validates signal quality.

### "Institutions vs. Retail" Dashboard

Cross-reference ETF changes with retail flow data (Reddit sentiment, popular tickers).
Visualizes the information asymmetry gap.
