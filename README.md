# TickerTrace

> Daily ETF holdings intelligence — what institutions bought, sold, and changed since yesterday. No 90-day 13F delay.

**Live at:** [tickertrace.pro](https://tickertrace.pro)
**API:** [api.tickertrace.pro/docs](https://api.tickertrace.pro/docs) — fully open, no key required

---

## What It Does

Actively-managed ETFs publish their full holdings daily. TickerTrace scrapes, normalizes, and diffs them every morning so you can see who's accumulating, who's reducing, and where conviction is moving — before the opening bell.

**56 ETFs tracked across 9 providers** (as of May 2026):

| Provider | Funds |
|----------|-------|
| Avantis | AVUV, AVLV, AVMV |
| ARK Invest | ARKK, ARKQ, ARKW, ARKG, ARKF, ARKX |
| Kurv | KYLD, KQQQ |
| YieldMax | ULTY, SLTY, MSTY, NVDY, CONY, TSLY, HOOY, PLTY |
| REX Shares | ULTI, MSII, NVII, COII, TSII, HOII, PLTI |
| Roundhill | MSTW, NVDW, COIW, TSLW, HOOW, PLTW, QDTE, XDTE, RDTE, YBTC |
| Tidal / NicholasX | BLOX |
| Tidal / NestYield | EGGQ, EGGY, EGGS |
| Corgi Funds | EUV, CMAG, CQTM, XA, EYES, KYC, GNMX, AV, DOCK, WATS, GLAM, NYNY, STYL, WNDR, FDRS, FDRX |

---

## Screenshots

**Holdings view — main equity table per fund:**

![Dashboard — AVUV holdings](screenshots/dashboard_initial.png)

**Option Attendance — Put/Call ratios and contract-level detail for options-based funds:**

![Dashboard — ULTY option attendance](screenshots/dashboard_final.png)

**Discord Daily Intel — auto-generated embed of top buys/sells and sector flow:**

![Discord webhook preview](screenshots/Screenshot_20260302-170651.png)

---

## Architecture

```
GitHub Actions (daily scraper) → CSV history ─┬─→ FastAPI REST  → Vultr → tickertrace.pro
                                              ├─→ FastMCP server → AI agents (Claude Desktop, etc.)
                                              └─→ Next.js dashboard (Vercel)
```

```
api/
├── server.py          FastAPI — all endpoints (public, marketing, vestigial auth)
├── mcp_server.py      FastMCP — same data, MCP tools for AI agents
├── data.py            Shared data layer (CSV → signals, changes, divergences, sector flow)
└── auth.py            Vestigial user/API-key management (unused in v2)

etf-dashboard/
├── app/               Next.js 14 pages (dashboard, changes, holdings, fund/[ticker], effectiveness)
├── components/        React + discord-webhook + auth-context
└── lib/
    ├── api.ts         Typed TS client — every page fetches via this
    └── holdings.ts    Static reference (FUND_PROVIDERS, FUND_AUM, PROVIDER_ORDER)

scrape_avantis.py      Daily scraper (runs via GitHub Actions)
cusip_lookup.py        CUSIP → ticker resolver (cache + OpenFIGI fallback)

etf-dashboard/public/data/
├── holdings_latest.csv             Current day
└── history/holdings_YYYY-MM-DD.csv Daily history — read by the API at runtime (mounted read-only)
```

The dashboard, changes page, and fund profile pages all fetch from the FastAPI server via `lib/api.ts` instead of recomputing in TypeScript. One source of truth.

---

## API

Base URL: `https://api.tickertrace.pro` — **no key, no auth, no rate caps beyond IP throttling.**

| Endpoint | What it returns |
|----------|----------------|
| `GET /health` | Status + as-of date |
| `GET /api/v1/signals` | Top buy/sell signals with conviction scores |
| `GET /api/v1/changes?provider=ARK&direction=buying` | Filterable daily position changes |
| `GET /api/v1/fund/{ticker}` | Fund detail — top holdings, options, AUM |
| `GET /api/v1/ticker/{ticker}` | Cross-fund view — who's buying/selling this ticker |
| `GET /api/v1/sectors` | Sector-level weight flows |
| `GET /api/v1/divergences` | Cross-fund conflicts (same ticker, opposite directions) |
| `GET /api/v1/briefing` | Pre-built dashboard payload (signals + sectors + activity) |
| `GET /api/v1/activity` | Most-active tickers by net change |
| `GET /api/v1/holdings` | Full holdings dump |
| `GET /api/v1/funds` | All tracked funds + AUM |
| `GET /api/v1/stats` | Global stats |
| `GET /api/v1/fund-effectiveness` | Per-fund signal-vs-price scorecard |
| `GET /api/v1/traderdaddy` | Marketing handoff payload |
| `GET /docs` | Interactive Swagger |

---

## MCP Server

`api/mcp_server.py` exposes the same data as MCP tools for AI agents:

```bash
python -m api.mcp_server
```

Tools: `get_signals`, `get_changes`, `get_fund_detail`, `get_ticker_detail`, `get_sector_flow`, `get_divergences`, `get_market_summary`.

**Claude Desktop integration** — add to your MCP config:

```json
{
  "mcpServers": {
    "tickertrace": {
      "command": "python",
      "args": ["-m", "api.mcp_server"],
      "cwd": "/path/to/TickerTrace"
    }
  }
}
```

---

## Dashboard Tiers

- **Free:** Top 3 signals, basic stats, search, holdings page.
- **Pro** (API key via `/auth/register`): Full signals, briefing, sector flow, divergences, heatmaps, Δ changes page, fund profiles.
- The **API is fully open** — no auth needed. Tiers only affect the dashboard UI.

---

## Local Development

```bash
# API
pip install -r api/requirements.txt
uvicorn api.server:app --port 8100 --reload

# MCP server
python -m api.mcp_server

# Scraper (Python 3.10+)
pip install -r requirements.txt
python scrape_avantis.py

# Dashboard
cd etf-dashboard && npm install && npm run dev
```

---

## Daily Data Pipeline

```
7:00 AM CST  GitHub Actions runs scrape_avantis.py
             → fetches all fund CSVs
             → resolves CUSIPs via cache + OpenFIGI fallback
             → writes normalized_holdings.csv
             → copies into etf-dashboard/public/data/history/
             → commits + pushes to main
7:30 AM CST  Vercel rebuilds frontend; API picks up new CSV on next request
```

**Manual scrape on Vultr** (Python 3.6 on the host can't run our deps — use Docker):

```bash
ssh vultr "cd /home/mphinance/TickerTrace && docker run --rm \
  -v /home/mphinance/TickerTrace:/app -w /app \
  python:3.12-slim bash -c \
  'pip install -q requests beautifulsoup4 pandas yfinance && python3 scrape_avantis.py'"

# Then copy output into history:
ssh vultr "cp /home/mphinance/TickerTrace/normalized_holdings.csv \
  /home/mphinance/TickerTrace/etf-dashboard/public/data/history/holdings_\$(date +%Y-%m-%d).csv"
```

---

## Deployment

**Frontend (Vercel):** auto-deploys on push to `main`. Domain: `tickertrace.pro`.

**API (Vultr):**

```bash
ssh vultr "cd /home/mphinance/TickerTrace && git pull origin main && \
  docker compose build --no-cache && docker compose up -d"

# Quick restart (no rebuild):
ssh vultr "cd /home/mphinance/TickerTrace && docker compose restart"

# Logs:
ssh vultr "docker logs tickertrace-api --tail 50"

# Verify:
curl -s https://api.tickertrace.pro/health
```

The VPS working tree is often dirty from scraper output. `git stash && git clean -fd etf-dashboard/public/data/history/` before pulling if `git pull` complains.

---

## Adding a New Fund

`.agents/workflows/add-fund.md` has the full workflow. TL;DR:

1. Add to `FUNDS` in `scrape_avantis.py`
2. Add to `FUND_PROVIDERS` + `FUND_AUM` in `api/data.py` (and mirror in `etf-dashboard/lib/holdings.ts`)
3. Test scrape locally
4. Deploy

Common gotchas:

- Some sources use `Account` instead of `ETF Ticker` — the scraper now always forces `ETF Ticker = config ticker`
- T-bill / Treasury CUSIPs (9-char like `912797RG4`) are filtered from display
- CUSIP-only sources get resolved via `cusip_cache.json` + OpenFIGI

---

## Gotchas

1. **Python 3.6 on the Vultr host** — never run scripts directly on host. Always use Docker.
2. **Scraper isn't in the API container** — `docker exec tickertrace-api python3 scrape_avantis.py` won't work. The container only has `api/`.
3. **Docker data volume is read-only** — scraper writes to host FS; container picks up changes on next request.
4. **Dockerfile only COPYs `api/`** — if you add a root-level Python file that `api/` imports, add a `COPY` line.
5. **API URL** — only `api.tickertrace.pro` works. `api.tickertrace.mphinance.com` has no Apache vhost (requests fall through to the default vhost and return wrong-cert + 503).
6. **Apache on port 80** — Apache (not nginx) reverse-proxies to uvicorn:8100.
7. **No auth in v2** — Stripe and Firebase were ripped out. The `/auth/*` endpoints still exist but are unused; CORS has an explicit allowlist; per-IP rate limits on the public endpoints.

---

## What's Inside

- `api/` — FastAPI + FastMCP servers, shared `data.py` layer
- `etf-dashboard/` — Next.js 14 app (App Router, TS, Tailwind, shadcn/ui)
- `scrape_avantis.py` — daily scraper (despite the name, scrapes all 56 funds across 9 providers)
- `cusip_lookup.py` — CUSIP → ticker resolver with persistent cache
- `tests/` — pytest suite covering the data layer + 38 junk-ticker filter cases
- `screenshots/` — README assets
- `.github/workflows/` — daily scrape + CI (pytest + `next build` + Python AST parse check)
