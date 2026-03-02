# TickerTrace

> Daily ETF holdings intelligence — what institutions bought, sold, and changed since yesterday.

**Live at:** [tickertrace.pro](https://tickertrace.pro) | **API:** [api.tickertrace.pro](https://api.tickertrace.pro/docs)

---

## What It Does

Actively-managed ETFs publish their full holdings daily on their websites. TickerTrace scrapes, normalizes, and diffs them every morning so you can see what changed before the opening bell. No 90-day 13F delay.

**15 ETFs tracked across 6 providers:**

- **Avantis:** AVUV, AVLV, AVMV
- **ARK Invest:** ARKK, ARKQ, ARKW, ARKG, ARKF, ARKX
- **YieldMax:** ULTY, SLTY
- **REX Shares:** ULTI
- **Kurv:** KYLD, KQQQ
- **Tidal/NicholasX:** BLOX

---

## Architecture

```
tickertrace.pro (Vercel / Next.js)
    └── etf-dashboard/          # Next.js 14 app
        ├── app/                # Pages (dashboard, changes, holdings, fund/[ticker])
        ├── components/         # React components
        └── lib/holdings.ts     # Data layer (reads CSVs)

api.tickertrace.pro (Vultr VPS / Docker)
    └── api/
        ├── server.py           # FastAPI — all endpoints
        ├── data.py             # Python data layer (reads same CSVs)
        └── auth.py             # User/API key management (SQLite)

scrape_avantis.py               # Daily scraper (runs as cron via Docker)
cusip_lookup.py                 # CUSIP → ticker resolver (OpenFIGI)
data/
    cusip_cache.json            # Cached CUSIP resolutions (1200+ entries)
    holdings.db                 # SQLite (positions + changes history)
etf-dashboard/public/data/
    holdings_latest.csv         # Current day (read by Next.js at build time)
    history/holdings_YYYY-MM-DD.csv  # Daily history (read by API)
```

---

## Infrastructure

| Service | Location | Notes |
|---------|----------|-------|
| Frontend | Vercel (auto-deploy on git push) | `tickertrace.pro` |
| API | Vultr VPS `207.148.19.144` | Docker, Apache reverse proxy, Let's Encrypt SSL |
| DB | SQLite on Vultr | `/home/mphinance/TickerTrace/data/holdings.db` |
| Cron | Crontab on Vultr | 7am scrape, pushes CSV to GitHub |
| DNS | Namecheap | `@` → Vercel, `api` → Vultr |

**SSH:** `ssh vultr` (configured in `~/.ssh/config`)

---

## Daily Data Pipeline

```
7:00 AM CST  — scrape_avantis.py runs (via cron on Vultr)
               → fetches all 15 ETF CSVs
               → resolves CUSIPs via cache + OpenFIGI fallback
               → writes normalized_holdings.csv
               → copies to etf-dashboard/public/data/
               → git push to GitHub
7:30 AM CST  — Vercel detects new commit, rebuilds frontend
```

**Manual scrape:** (when you need it NOW)

```bash
ssh vultr "cd /home/mphinance/TickerTrace && docker run --rm \
  -v /home/mphinance/TickerTrace:/work \
  -w /work python:3.12-slim bash -c \
  'pip install -q beautifulsoup4 pandas requests yfinance lxml && python3 scrape_avantis.py'"

# Then copy output + restart API:
ssh vultr "cd /home/mphinance/TickerTrace && \
  cp normalized_holdings.csv etf-dashboard/public/data/holdings_latest.csv && \
  cp normalized_holdings.csv etf-dashboard/public/data/history/holdings_$(date +%Y-%m-%d).csv && \
  docker compose restart api"
```

---

## Deployment

### Frontend (Vercel)

Auto-deploys on every `git push origin main`. No manual steps.

### API (Vultr)

```bash
ssh vultr "cd /home/mphinance/TickerTrace && \
  git stash && git pull origin main && \
  docker compose build --no-cache api && \
  docker compose up -d api"
```

### Full deploy (both)

```bash
git push origin main
# Frontend auto-deploys. Then:
ssh vultr "cd /home/mphinance/TickerTrace && git stash && git pull && docker compose build --no-cache api && docker compose up -d api"
```

---

## API Endpoints

Base: `https://api.tickertrace.pro`

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /health` | None | Status + date |
| `GET /api/v1/funds` | None | List all tracked funds |
| `GET /api/v1/fund/{ticker}` | None | Holdings for a fund |
| `GET /api/v1/signals` | API key | Top buy/sell signals |
| `GET /api/v1/changes` | API key | Daily position changes |
| `GET /api/signals` | None | Full payload (Next.js) |
| `POST /auth/login` | — | Email/password login |
| `POST /auth/firebase-login` | — | Firebase ID token → API key |
| `POST /billing/checkout` | — | Stripe checkout session |
| `GET /billing/success` | — | Post-payment webhook |

API docs: `https://api.tickertrace.pro/docs`

---

## Authentication

- **Firebase Auth** — Google sign-in + email/password via Firebase SDK
- **Firebase service account** — `/app/firebase-service-account.json` (in Docker, NOT in git)
- **Internal users** — SQLite `users` table, keyed by email
- **API keys** — UUID assigned per user, stored in SQLite
- **Tiers:** `free` (limited signals), `pro` (full access)

**Environment variables needed on Vultr (in `api/.env`):**

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
FIREBASE_SERVICE_ACCOUNT_PATH=/app/firebase-service-account.json
```

---

## Adding a New Fund

Use the `/add-fund` workflow: `.agents/workflows/add-fund.md`

**TL;DR:** Add to `FUNDS` in `scrape_avantis.py` → add to `FUND_PROVIDERS`/`FUND_AUM` in `api/data.py` + `etf-dashboard/lib/holdings.ts` → test scrape → deploy.

The user will provide the CSV download URL. Common gotchas:

- Some sources use `Account` column instead of `ETF Ticker` — scraper now always forces `ETF Ticker = config ticker`
- T-bill/Treasury CUSIPs (9-char like `912797RG4`) are filtered from display
- CUSIP-only sources get resolved via `cusip_cache.json` + OpenFIGI

---

## Known Issues / Gotchas

1. **Python 3.6 on Vultr host** — never run scripts directly on host. Always use Docker.
2. **Docker volume is read-only** for data dir — scraper runs outside container, writes to host FS.
3. **git stash on server** — server may have local changes (CSV files). Always `git stash` before `git pull`.
4. **Firebase service account NOT in git** — stored at `/home/mphinance/TickerTrace/api/firebase-service-account.json` (host) and mounted into Docker.
5. **SLTY top positions** — YieldMax uses T-bills as collateral. These are now filtered.
6. **Apache on port 80** — nginx was rejected. Apache handles both `api.tickertrace.pro` and `api.tickertrace.mphinance.com`.

---

## Local Development

```bash
cd etf-dashboard
npm run dev          # Frontend at localhost:3000

cd api
uvicorn server:app --reload --port 8100   # API at localhost:8100
```

Frontend reads `etf-dashboard/public/data/holdings_latest.csv` at build time.
API reads from `etf-dashboard/public/data/history/` at runtime.
