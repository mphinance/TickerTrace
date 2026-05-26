# TickerTrace — Whop App

The TickerTrace dashboard, repackaged as a Whop app. Free. No paywall. Same
data as `tickertrace.pro`, just embedded inside whoever's community installed
it.

## What it does

Inside a Whop community, members get a tab with:

- **Signals** — top buying / selling tickers across institutional ETFs
- **Briefing** — top buys, top sells, multi-day streaks, notable options
- **Changes** — daily position changes, filterable by provider / direction
- **Divergences** — same ticker, two funds, opposite directions
- **Sectors** — sector-level inflows and outflows
- **Fund detail** — pick a fund, see its book and recent moves
- **Ticker detail** — pick a ticker, see every fund that holds it

Everything reads from the public API at `https://api.tickertrace.pro`. No
scraping, no DB, no cron — this app is a frontend only.

## Local dev

```bash
cd whop-app
npm install
cp .env.example .env.local
# fill in your Whop app credentials in .env.local
npm run dev
```

Boots on `http://localhost:3001`. Visiting `/discover` works straight away.
Visiting `/experiences/<id>` outside of Whop's iframe will fail the JWT
verification step and render the "open inside Whop" notice — that's expected.

## Required env vars

| Var | Where to get it |
|-----|-----------------|
| `NEXT_PUBLIC_WHOP_APP_ID` | App settings in your Whop dashboard |
| `WHOP_API_KEY` | API Keys section, same dashboard |
| `NEXT_PUBLIC_WHOP_AGENT_USER_ID` | Agent user, app settings |
| `NEXT_PUBLIC_WHOP_COMPANY_ID` | Optional, only for admin-scoped calls |
| `NEXT_PUBLIC_API_URL` | Defaults to `https://api.tickertrace.pro`. Override for local FastAPI |

## Deploy

1. Push the repo to GitHub (or use an existing remote).
2. Create a new Vercel project rooted at `whop-app/`. Build settings should
   auto-detect Next.js.
3. Set the env vars in the Vercel project settings.
4. Deploy. Note the production URL — you need it in the next step.
5. In the Whop dashboard for your app, set:
   - **Base URL** → your Vercel production URL
   - **Experience path** → `/experiences/[experienceId]`
   - **Dashboard path** → `/dashboard/[companyId]`
   - **Discover path** → `/discover`
6. Install the app into a test community and open it. You should see the
   dashboard with no flicker.

## Routes

- `/` — redirects to `/discover`
- `/discover` — public app-store pitch, no auth
- `/experiences/[experienceId]` — main hub view, JWT-verified
- `/experiences/[experienceId]/fund/[ticker]` — fund detail
- `/experiences/[experienceId]/ticker/[ticker]` — cross-fund ticker view
- `/dashboard/[companyId]` — admin stub, JWT-verified, admin-only

## Why this is a thin frontend

The hard part of TickerTrace — the daily scraper, the normalization, the
conviction scoring, the signal-vs-price backtest — already runs on Vultr
and exposes everything through `api.tickertrace.pro`. The Whop app is just
another renderer of that same API. The companion `etf-dashboard/` in this
repo is the other renderer, the public-facing one at `tickertrace.pro`.
Both should always agree on what the data means; if they ever diverge,
that's a bug.

## License / cost

Free. No tier gate. If you want to support it, share signals back to your
community and tell them where they came from.
