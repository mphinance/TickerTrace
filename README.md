# TickerTrace

A lightweight, automated system for scraping, storing, and tracking daily ETF holdings across multiple fund families. Runs on GitHub Actions every weekday — no server required for data collection.

## ❓ Why TickerTrace?

Standard ETF tools like ETF.com often lag by 24-48 hours and lack the precision required for tracking active option-selling strategies (like YieldMax or Kurv). TickerTrace solves this by:

- **Direct Scraping**: Pulling directly from fund provider websites the moment they publish.
- **Option Analytics**: Automatically parsing complex OCC/Descriptive option names into DTE, Strike, and Moneyness.
- **Historical Context**: Tracking daily position deltas (buys/sells) to see institutional flow in real-time.
- **Developer-First**: Providing a clean REST API + MCP server that plugs into any dashboard, trading bot, or AI agent.

---

## 🌐 Live API

**Base URL**: `https://api.tickertrace.mphinance.com`

**[Interactive Docs (Swagger)](https://api.tickertrace.mphinance.com/docs)** — try every endpoint in your browser.

### Free Endpoints (no API key required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/signals` | Full payload: stats, top buying/selling signals, changes, sector flow |
| GET | `/api/v1/stats` | Global stats: funds tracked, unique tickers, put/call ratio |
| GET | `/api/v1/sectors` | Sector-level weight inflows/outflows |
| GET | `/health` | Health check + as-of date |

### Pro Endpoints (API key required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/changes` | All daily position changes (filterable by provider, fund, direction) |
| GET | `/api/v1/fund/{ticker}` | Fund holdings detail (top 20 holdings, options count, AUM) |
| GET | `/api/v1/ticker/{ticker}` | Cross-fund detail for any ticker |
| GET | `/api/v1/divergences` | Cross-fund conflicts (same ticker, opposite directions) |
| GET | `/api/v1/funds` | List all tracked funds with providers |

### Getting an API Key

```bash
# Register for a free key (100 requests/day)
curl -X POST "https://api.tickertrace.mphinance.com/auth/register?email=you@example.com"

# Check your key status
curl "https://api.tickertrace.mphinance.com/auth/me" -H "X-API-Key: tt_live_your_key"
```

### Example Usage

```bash
# Get today's top signals (free, no key needed)
curl https://api.tickertrace.mphinance.com/api/v1/signals

# Get Kurv's daily changes (Pro — key required)
curl "https://api.tickertrace.mphinance.com/api/v1/changes?provider=Kurv" \
     -H "X-API-Key: tt_live_your_key"

# Python
import requests
r = requests.get("https://api.tickertrace.mphinance.com/api/v1/signals")
signals = r.json()
for s in signals["signals"]["buying"][:5]:
    print(f"{s['ticker']:8s} conviction:{s['conviction']}  funds:{s['funds']}")
```

---

## 🤖 MCP Server (for AI Agents)

TickerTrace includes a [FastMCP](https://github.com/jlowin/fastmcp) server so AI agents (Claude, Cursor, etc.) can query institutional signals.

### Tools Available

| Tool | Description |
|------|-------------|
| `get_signals` | Top buying/selling signals with conviction scores |
| `get_changes` | Daily position changes (filterable by provider, fund, direction) |
| `get_fund_detail` | Full holdings for a specific fund |
| `get_ticker_detail` | Cross-fund detail for a ticker |
| `get_sector_flow` | Sector-level inflows/outflows |
| `get_divergences` | Cross-fund conflicts |
| `get_market_summary` | Complete overview of institutional activity |

### Running the MCP Server

```bash
cd TickerTrace
pip install -r api/requirements.txt
python -m api.mcp_server
```

### Claude Desktop Config

Add to `~/.claude/claude_desktop_config.json`:

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

## 📦 Covered ETFs

| Provider | Tickers |
|---|---|
| **Avantis** | AVUV, AVLV, AVMV |
| **ARK Invest** | ARKK, ARKQ, ARKW, ARKG, ARKF, ARKX |
| **Kurv** | KYLD, KQQQ |
| **YieldMax** | ULTY |
| **REX Shares** | ULTI |
| **NicholasX / Tidal** | BLOX |

---

## 🚀 How It Works

1. **GitHub Actions** runs `scrape_avantis.py` every weekday at **12:00 UTC** (7 AM EST)
2. Holdings are normalized across all fund formats into a unified schema
3. Data is stored in **SQLite** (`data/holdings.db`) with 30-day rolling retention
4. CSV snapshots saved to `etf-dashboard/public/data/history/`
5. **FastAPI** server on Vultr serves the data via REST API + Stripe billing
6. **FastMCP** server exposes the same data as tools for AI agents

---

## 🛠 Local Development

```bash
# Scraper
pip install -r requirements.txt
python db_setup.py          # Initialize SQLite DB
python scrape_avantis.py    # Run scraper

# API Server
pip install -r api/requirements.txt
uvicorn api.server:app --port 8100 --reload

# MCP Server
python -m api.mcp_server

# Next.js Dashboard
cd etf-dashboard
npm install && npm run dev

# Generate Daily Analysis
python generate_analysis.py
```

---

## 📁 Project Structure

```
TickerTrace/
├── scrape_avantis.py           # Main scraper (all fund sources)
├── generate_analysis.py        # Automated daily analysis generator
├── api/
│   ├── server.py               # FastAPI REST API (Stripe + auth)
│   ├── mcp_server.py           # FastMCP server for AI agents
│   ├── data.py                 # Shared data layer (CSV → signals)
│   ├── auth.py                 # SQLite users, API keys, rate limits
│   ├── requirements.txt
│   ├── deploy.sh               # Docker deployment script
│   ├── .env.example            # Environment variables template
│   ├── Dockerfile
│   └── docker-compose.yml
├── etf-dashboard/              # Next.js dashboard
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── dashboard/          # Main dashboard
│   │   ├── changes/            # Daily changes view
│   │   └── fund/[ticker]/      # Fund detail pages
│   └── lib/holdings.ts         # TypeScript data layer
├── analyses/                   # Auto-generated daily reports
│   ├── daily_analysis_*.md
│   └── latest.md
├── data/
│   ├── holdings.db             # SQLite database
│   └── raw/                    # Daily raw CSV backups
├── .github/workflows/
│   └── scrape.yml              # GitHub Actions automation
├── Dockerfile
├── docker-compose.yml
└── normalized_holdings.csv     # Flat CSV export (latest day)
```

---

## ⚙️ Deployment

The API runs on Vultr via Docker:

```bash
# Deploy (from Vultr)
cd /home/mphinance/TickerTrace
bash api/deploy.sh

# Or manually
docker compose up -d --build
```

**Stack**: Python 3.12 → FastAPI → uvicorn → Apache reverse proxy → `https://api.tickertrace.mphinance.com`

---

*Built for speed, modularity, and zero-infrastructure operation.*
