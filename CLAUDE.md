# CLAUDE.md — TickerTrace Agent Context

## What is TickerTrace?

TickerTrace tracks daily ETF holdings changes across institutional fund families (ARK Invest, Avantis, Kurv, YieldMax, REX Shares, NicholasX). It scrapes fund provider websites daily, normalizes the data, detects position changes, and surfaces conviction-scored trading signals.

## Architecture

```
GitHub Actions (daily scraper) → CSV history → FastAPI REST API → Vultr
                                            → FastMCP server → AI agents
                                            → Next.js dashboard
```

## Live API

**Base URL**: `https://api.tickertrace.pro`

All endpoints are open — no API key or authentication required.

| Endpoint | What it returns |
|----------|----------------|
| `GET /api/v1/signals` | Top buying/selling signals with conviction scores |
| `GET /api/v1/changes?provider=ARK&direction=buying` | Filterable daily position changes |
| `GET /api/v1/fund/ARKK` | Fund detail — top holdings, options, AUM |
| `GET /api/v1/ticker/TSLA` | Cross-fund view — who's buying/selling this ticker |
| `GET /api/v1/sectors` | Sector-level weight flows |
| `GET /api/v1/divergences` | Cross-fund conflicts (same ticker, opposite directions) |
| `GET /api/v1/funds` | All tracked funds |
| `GET /api/v1/stats` | Global stats |
| `GET /docs` | Interactive Swagger docs |

## MCP Server

The FastMCP server (`api/mcp_server.py`) exposes the same data as MCP tools:

```bash
python -m api.mcp_server
```

Tools: `get_signals`, `get_changes`, `get_fund_detail`, `get_ticker_detail`, `get_sector_flow`, `get_divergences`, `get_market_summary`

### Claude Desktop Integration

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

### Companion: Momentum MCP

For quant analysis beyond holdings — screening, technicals, options/IV,
backtesting — TickerTrace pairs with **Momentum MCP**
([github.com/mphinance/momentum-mcp](https://github.com/mphinance/momentum-mcp)),
a sister project that gives an AI agent a Bloomberg-style toolkit. Its
`options_analysis` tool is the implied-volatility source for the
option-income fund work.

> [!IMPORTANT]
> Run your own instance from that repo. The maintainer's live endpoint is
> configured locally as the `ghost-iv` MCP server and is **deliberately not
> committed** — never add the live URL to this repo.

## Key Files

| File | Purpose |
|------|---------|
| `scrape_avantis.py` | Main scraper — runs daily via GitHub Actions |
| `api/server.py` | FastAPI REST server with Stripe billing hooks |
| `api/mcp_server.py` | FastMCP server for AI agent integration |
| `api/data.py` | Shared data layer — CSV parsing, signal scoring, sector flow |
| `api/auth.py` | User management, API keys, promo codes (not required for data) |
| `etf-dashboard/lib/holdings.ts` | TypeScript data layer for the Next.js dashboard |
| `etf-dashboard/app/dashboard/page.tsx` | Main dashboard UI |
| `generate_analysis.py` | Auto-generated daily markdown analysis |

## Data Flow

1. `scrape_avantis.py` fetches from fund provider websites
2. Holdings normalized → `normalized_holdings.csv` (project root)
3. **You must manually copy** `normalized_holdings.csv` → `etf-dashboard/public/data/history/holdings_YYYY-MM-DD.csv`
4. The API container mounts `etf-dashboard/public/data/` as **read-only** — it reads history CSVs from there
5. `api/data.py` reads these CSVs and computes signals, changes, divergences
6. FastAPI/FastMCP serve the computed data

> [!CAUTION]
> The scraper does NOT auto-copy to the history directory. After running the scraper, you must:
>
> ```bash
> cp normalized_holdings.csv etf-dashboard/public/data/history/holdings_$(date +%Y-%m-%d).csv
> ```

## Covered Funds

- **Avantis**: AVUV (Small Cap Value), AVLV (Large Cap Value), AVMV (Mid Cap Value)
- **ARK Invest**: ARKK, ARKQ, ARKW, ARKG, ARKF, ARKX
- **Kurv**: KYLD, KQQQ (options-based income)
- **YieldMax**: ULTY, SLTY (options income)
- **REX Shares**: ULTI (options income)
- **NicholasX**: BLOX (blockchain/crypto equity)
- **NestYield**: EGGQ, EGGY, EGGS (active equity + options overlay)

## Dashboard Tiers

- **Free**: Top 3 signals, basic stats, search, holdings page
- **Pro** (API key via `/auth/register`): Full signals, briefing, sector flow, divergences, heatmaps, Δ changes page, fund profiles
- The **API is fully open** — no auth needed. Tiers only affect the dashboard UI.

## Development

```bash
# Run API locally
pip install -r api/requirements.txt
uvicorn api.server:app --port 8100 --reload

# Run MCP server
python -m api.mcp_server

# Run scraper (locally — requires Python 3.10+)
pip install -r requirements.txt
python scrape_avantis.py

# Dashboard
cd etf-dashboard && npm install && npm run dev
```

## Operational Pitfalls (Vultr)

### Scraper cannot run on the Vultr host

The host has **Python 3.6** which is incompatible with `beautifulsoup4` and other deps. You must run the scraper inside a Docker container:

```bash
# On Vultr — run scraper via a throwaway Python 3.12 container
ssh vultr "cd /home/mphinance/TickerTrace && docker run --rm \
  -v /home/mphinance/TickerTrace:/app -w /app \
  python:3.12-slim bash -c \
  'pip install -q requests beautifulsoup4 pandas yfinance && python3 scrape_avantis.py'"
```

> [!IMPORTANT]
> The scraper is NOT inside the `tickertrace-api` container (it only has `api/`). Do NOT use `docker exec tickertrace-api python3 scrape_avantis.py` — the file doesn't exist there.

### After scraping, copy to history

The API container reads from `etf-dashboard/public/data/history/` (mounted read-only). After running the scraper, copy the output:

```bash
ssh vultr "cp /home/mphinance/TickerTrace/normalized_holdings.csv \
  /home/mphinance/TickerTrace/etf-dashboard/public/data/history/holdings_\$(date +%Y-%m-%d).csv"
```

### Auto-sync: the box pulls itself (no manual deploy needed for data)

The Vultr box keeps itself in sync with `origin/main` via a root cron that
runs **`sync_data.sh` every 15 minutes**:

```cron
*/15 * * * * /home/mphinance/TickerTrace/sync_data.sh >> /var/log/tickertrace-sync.log 2>&1
```

`sync_data.sh` does a `git fetch` + `git merge --ff-only origin/main`, ensures
the container is up, and health-checks the API. The box is a pure downstream
mirror (it never commits), so the fast-forward always applies. Because the API
re-reads CSVs per request, fresh holdings go live within ~15 min of the
GitHub Actions scrape committing them — **no human deploy required**.

> [!IMPORTANT]
> `sync_data.sh` is **committed to the repo on purpose**. It used to live only
> on the box, untracked, and a `git clean -fd` during a hand deploy wiped it —
> after which the cron failed silently (`sync_data.sh: not found`) for days and
> production froze on stale data. Keep it tracked. Do not `git clean` it away.

This is the pull-based counterpart to the SSH push-deploy step in `scrape.yml`
(`Deploy fresh data to Vultr`). The push step only fires if the `VULTR_SSH_KEY`
secret is set; the cron pull works regardless, so the box stays fresh even with
no Actions secrets configured. To watch it: `tail -f /var/log/tickertrace-sync.log`.

### SSH timeouts

Long-running SSH commands (e.g., `docker run` with pip install) can appear to hang. The scraper typically takes 1–2 minutes. If an SSH command stalls with no output for >60s, the connection may have dropped — terminate and retry.

### Docker volume is read-only

The `docker-compose.yml` mounts data as `:ro`. The scraper writes to the **host filesystem**, and the container picks up changes on next API request automatically.

## Deployment

### Frontend (Vercel)

- Auto-deploys on push to `main`
- Domain: `tickertrace.pro`
- Vercel rebuilds take ~1-2 minutes after push

### Backend (Vultr VPS)

- **API URL**: `https://api.tickertrace.pro` — the working API domain. (Note: `api.tickertrace.mphinance.com` has no Apache vhost — requests fall through to the alpha.mphinance.com default vhost and return a wrong-cert + 503. Do not point the frontend at it.)
- **VPS path**: `/home/mphinance/TickerTrace`
- **SSH**: `ssh vultr` (configured in `~/.ssh/config`, port 22)
- **Docker command**: `docker compose` (v2 syntax, NOT `docker-compose`)
- **Apache reverse proxy** → uvicorn:8100 → FastAPI

```bash
# Full deploy sequence on Vultr:
ssh vultr "cd /home/mphinance/TickerTrace && git pull origin main && docker compose build --no-cache && docker compose up -d"

# Quick restart (no rebuild):
ssh vultr "cd /home/mphinance/TickerTrace && docker compose restart"

# Check logs:
ssh vultr "docker logs tickertrace-api --tail 50"

# Verify endpoint:
curl -s https://api.tickertrace.pro/health
```

> [!CAUTION]
> The VPS working tree often has dirty local files (scraper output, DB changes).
> You may need to `git stash && git clean -fd etf-dashboard/public/data/history/` before `git pull`.

> [!IMPORTANT]
> **Dockerfile gotcha**: If you add Python files at the project root that the API imports
> (like `effectiveness.py`), you MUST add a `COPY` line to the `Dockerfile`.
> The Dockerfile only copies `api/` by default — root-level Python files are NOT included.

> [!WARNING]
> **API_BASE consistency**: Frontend files MUST use `https://api.tickertrace.pro`
> as the API base URL. Check these files when adding new API-consuming components:
>
> - `etf-dashboard/app/effectiveness/page.tsx`
> - `etf-dashboard/components/fund-effectiveness.tsx`
> - `etf-dashboard/components/auth-context.tsx`
> - Any new component that fetches from the API

## Standing Instructions — Always Do This

### 🗒️ Patch Notes from the Trenches

Every time changes are committed / deployed, generate a short "Patch Notes from the Trenches" entry for the changelog on the landing page (`etf-dashboard/app/page.tsx`). It should:

- Be written in Sam's voice — plain-spoken, slightly self-deprecating, never corporate
- Use the section title **"Patch Notes from the Trenches"** (verbatim, every time)
- Be 2–5 bullet points, conversational, using "we" or "I" freely
- Call out real things that changed, with context a retail trader would care about
- Commit the changelog update alongside (or immediately after) the feature commit

Example tone:
>
> - Fixed ULTI showing up as "OTHER" — turns out REX Shares has a unique ticker format. Caught it, patched it, ULTI is now real.
> - Added X/Reddit share buttons next to Discord on the dashboard. Because your group chat deserves to know what ARK is buying.
