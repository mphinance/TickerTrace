# Whop App — TickerTrace inside Whop

## Goal

Ship TickerTrace as a free Whop app. A community owner installs it into their
hub; their members get an embedded dashboard with institutional ETF holdings
signals, daily briefing, divergences, sector flow, fund detail, and ticker
detail — all rendered inside Whop's iframe.

## Stack

- Next.js 16 (App Router, RSC)
- React 19, TypeScript
- Tailwind v4 (matches etf-dashboard exactly so we can lift components)
- `@whop/api` (server SDK) + `@whop/react` (iframe SDK)
- Hosted on Vercel separately from `etf-dashboard` (independent deploy target,
  shared git history). Whop dashboard points its app URL at the deploy.

## Backend

**Zero new backend.** The Whop app is a pure frontend — it fetches from the
existing public FastAPI at `https://api.tickertrace.pro`. The same `lib/api.ts`
client used by `etf-dashboard/` is copied verbatim into `whop-app/lib/api.ts`.

## Whop integration model

- **Experience view** (`/experiences/[experienceId]`) — what a Whop user sees
  when they enter the app from inside a community. Verifies their JWT,
  optionally greets them by name, then renders the dashboard.
- **Dashboard view** (`/dashboard/[companyId]`) — what the Whop *admin* sees
  when configuring the app inside their company's admin panel. For now, just
  a "you're all set, nothing to configure" stub since the app is free.
- **Discover view** (`/discover`) — public-facing pitch page that appears in
  Whop's app store.
- No payment gating. No access-pass check. Every authenticated Whop user gets
  the full dashboard. Anonymous users (e.g. bare URL access outside Whop) get
  a "this app only works inside Whop" notice.

## Out of scope

- Marketing landing page (Whop's app store *is* the landing page).
- Auth/registration UI (Whop owns identity).
- Effectiveness page (low-signal for the iframe context, can revisit later).
- CBOE options-listings scanner page (same reason).
- Discord webhook, share buttons (not relevant inside a Whop community).
- Stripe / paid tier UI.
- The scraper, the Python backend, the MCP server — all unchanged, untouched.

## Routes

| Path | Purpose |
|------|---------|
| `/experiences/[experienceId]` | Main dashboard — tabs: Signals, Briefing, Changes, Divergences, Sectors |
| `/experiences/[experienceId]/fund/[ticker]` | Fund detail |
| `/experiences/[experienceId]/ticker/[ticker]` | Ticker detail (cross-fund view) |
| `/dashboard/[companyId]` | Admin view (stub for now) |
| `/discover` | App-store pitch |
| `/` | Redirects to /discover or shows "open inside Whop" message |

We embed all data routes *under* `/experiences/[experienceId]` so deep links
preserve the experience context — which is how Whop expects sub-navigation to
work. Server-side, every page re-verifies the JWT.

## Voice / style rules (subagents — read and apply)

- Plain-spoken, slightly self-deprecating where it fits. Never corporate.
- Use "we" or "I" freely in copy. This is Sam's voice.
- Lowercase casual headings ("today's signals", not "Today's Signals") only
  where the etf-dashboard already does it. Match the existing chrome.
- Banned: em dashes (use commas or parens), "leverage" as a verb, "robust",
  "best-in-class", "synergy".
- Dark theme always. `<html className="dark">`. The Whop iframe inherits
  whatever color scheme the host community uses, but our content stays dark.
- Tailwind utility classes only. No inline styles. No CSS modules.

## Env vars

```
NEXT_PUBLIC_WHOP_APP_ID=app_xxxxx
WHOP_API_KEY=xxxxx
NEXT_PUBLIC_WHOP_AGENT_USER_ID=user_xxxxx
NEXT_PUBLIC_WHOP_COMPANY_ID=biz_xxxxx        # optional, for admin-side calls
NEXT_PUBLIC_API_URL=https://api.tickertrace.pro
```

## Acceptance criteria

- `npm run build` from `whop-app/` succeeds with zero TS errors.
- `npm run dev` boots cleanly on port 3001 (3000 is reserved for the main
  dashboard).
- An unauthenticated GET to `/experiences/exp_test` returns a "open inside
  Whop" notice rather than crashing.
- Every page that takes a `[ticker]` or `[experienceId]` param verifies the
  user JWT before fetching API data.
- Every route is responsive on mobile (Whop's iframe gets narrow).
- No `frame-ancestors` violations when loaded from `whop.com` or
  `*.whop.com`.

## How the orchestrator should think about this

The Whop SDK pieces are localized to: the root layout (`WhopIframeSdkProvider`),
the page-level JWT verification (`whopSdk.verifyUserToken(headers())`), and the
admin-only check on `/dashboard/[companyId]`. Everything else is "Next.js page
that fetches from `https://api.tickertrace.pro`" — exactly the same shape as
`etf-dashboard/app/dashboard/page.tsx`. So Wave 1 nails the Whop scaffold once,
and Waves 2-4 are mostly route migrations.
