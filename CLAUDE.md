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

**Base URL**: `https://api.tickertrace.mphinance.com`

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
2. Holdings normalized → `normalized_holdings.csv`
3. Copied to `etf-dashboard/public/data/history/holdings_YYYY-MM-DD.csv`
4. `api/data.py` reads these CSVs and computes signals, changes, divergences
5. FastAPI/FastMCP serve the computed data

## Covered Funds

- **Avantis**: AVUV (Small Cap Value), AVLV (Large Cap Value), AVMV (Mid Cap Value)
- **ARK Invest**: ARKK, ARKQ, ARKW, ARKG, ARKF, ARKX
- **Kurv**: KYLD, KQQQ (options-based income)
- **YieldMax**: ULTY (options income)
- **REX Shares**: ULTI (options income)
- **NicholasX**: BLOX (blockchain/crypto equity)

## Development

```bash
# Run API locally
pip install -r api/requirements.txt
uvicorn api.server:app --port 8100 --reload

# Run MCP server
python -m api.mcp_server

# Run scraper
pip install -r requirements.txt
python scrape_avantis.py

# Dashboard
cd etf-dashboard && npm install && npm run dev
```

## Deployment

Docker on Vultr at `api.tickertrace.mphinance.com`:

```bash
docker compose up -d --build
```

Apache reverse proxy → uvicorn:8100 → FastAPI
