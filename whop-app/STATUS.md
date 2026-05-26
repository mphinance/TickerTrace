# Whop app — build status

## What shipped

A free TickerTrace app, packaged for Whop. Lives under `whop-app/` in
this repo, deploys independently to Vercel, points at the existing
public FastAPI at `api.tickertrace.pro`. Zero new backend.

Seven routes, all server-rendered:

| Path | What it is |
|------|------------|
| `/` | Redirect to `/discover` |
| `/discover` | Public app-store pitch (no auth) |
| `/experiences/[experienceId]` | Main dashboard, JWT verified. Tabs: Signals / Briefing / Changes / Divergences / Sectors |
| `/experiences/[experienceId]/fund/[ticker]` | Fund detail — provider, AUM, holdings, options book if any, rolls, recent changes |
| `/experiences/[experienceId]/ticker/[ticker]` | Cross-fund detail — every fund holding the ticker, recent activity |
| `/dashboard/[companyId]` | Admin view, gated to admin access level |

## How we got there

Six waves over the session, each one its own commit:

- **wave 0** — scaffold, SPEC, 26-item feature list
- **wave 1** — Whop SDK foundation (`@whop/api` + `@whop/react`), iframe
  layout, lib/api copy from etf-dashboard, frame-ancestors CSP
- **wave 2** — experience view shell, Signals tab, sub-route stubs
- **wave 3** — parallel fan-out, 3 subagents in non-overlapping lanes:
  briefing tab, changes tab with filters, fund detail page
- **wave 4** — parallel fan-out, 2 subagents: ticker detail, divergences
  and sectors tabs
- **wave 5** — discover view, admin dashboard, provisioning doc,
  Patch Notes entry on the main repo's landing page
- **wave 6** — final verify, feature list flip, this doc

## Feature list

24 of 26 features pass. The two that don't:

- **#13** (Fund detail shows option book on ULTY/KQQQ): the *code path*
  is in place — `optionsCount > 0 && optionHoldings.length > 0` gates a
  full Option Book card on the fund page. But we can't verify against
  a live ULTY render without a Whop session that's authenticated, so
  this gets ticked manually after deploy.
- **#22** (Mobile responsive at 375px): every page was written with
  Tailwind responsive utilities and a horizontally-scrollable tab nav,
  but visual viewport testing belongs to a human with a phone, not the
  build script.

Both are confirm-in-prod kinds of checks, not bugs.

## Provisioning

The admin API key in `../.env.whop.txt` is a company-level v2 REST
key. It can read the company's products / experiences / memberships
but cannot create apps or products. So the actual Whop App entity
still needs to be created in the dashboard UI — `PROVISIONING.md` has
the click-by-click. The discovered company id is `biz_wOS4zmZpztAFHR`.

If you mint the real App API Key (`wapi_...`) from
`whop.com/dashboard/developer/apps`, drop it into
`whop-app/.env.local` and the build will be ready to deploy as-is.

## What's left for the human

1. Create the app in the Whop dashboard, copy the three credentials.
2. `cp .env.example .env.local`, paste them in.
3. Deploy `whop-app/` to Vercel. Wire the env vars there too.
4. Set the Vercel URL as the app's Base URL in the dashboard.
5. Install it into the test community and click through Signals → a
   ticker → a fund. Confirm option book on ULTY.
6. Flip status from `hidden` to `live` on the app entry.

## Doesn't touch

The scraper, the FastAPI, the MCP server, the main public dashboard,
and the rest of the existing repo are untouched. Only file outside
`whop-app/` that changed is `etf-dashboard/app/page.tsx` — one new
Patch Notes entry announcing the Whop app shipped.

## Build proof

```
> tickertrace-whop@0.1.0 build
> next build

? Compiled successfully in 16.4s
  Running TypeScript ...
? Generating static pages using 3 workers (4/4) in 416.2ms

Route (app)
+- /                              (static, redirect)
+- /_not-found                    (static)
+- /dashboard/[companyId]          (dynamic)
+- /discover                     (static)
+- /experiences/[experienceId]     (dynamic)
+- /experiences/[experienceId]/fund/[ticker]    (dynamic)
+- /experiences/[experienceId]/ticker/[ticker]  (dynamic)
```

Local dev smoke at `http://localhost:3001`:
- `GET /` returns 307 to `/discover`
- `GET /discover` returns 200
- `GET /experiences/exp_test` returns 200 with the "open inside Whop" empty state
