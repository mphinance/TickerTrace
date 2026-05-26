# Provisioning the Whop app

What's been done with the credentials you provided, and what's left.

## Credentials in use

- **App ID**: `app_AQjwzqQarLrvSQ`
- **App API Key** (`apik_…`): in `.env.local` (gitignored)
- **Company**: `biz_wOS4zmZpztAFHR` — **Momentum Phinance** (route: `momentum-phinance`)

## Current app state on Whop

Pulled from the GraphQL API:

| Field | Value |
|---|---|
| App name | `ask-sam-v1` (this was an existing draft slot — you'd want it renamed) |
| Status | `hidden` |
| App type | `b2c_app` |
| `baseUrl` | null (set after Vercel deploy) |
| `baseDevUrl` | `http://localhost:3000` |
| `appViews` | One configured: `hub` → `/experiences/[experienceId]` ✅ |
| `accessPass` | None attached yet |

The good news: the experience-view path is already exactly what our app expects (`/experiences/[experienceId]`). So the hub view is wired correctly out of the gate.

## What the API key let me do

The key authenticates and the SDK surface (`apps`, `accessPasses`, `companies`, `experiences`, etc.) is all reachable. Reads work fine — company info, app config, schema introspection.

## What the key cannot do

The key was minted without two scopes that the actual provisioning needs:

| Mutation | Required scope | Status |
|---|---|---|
| `updateApp` (rename, set dashboardPath/discoverPath, set baseUrl) | `developer:update_app` | ❌ missing |
| `createAccessPass` (the TickerTrace product) | `access_pass:create` | ❌ missing |
| `company.accessPassesV2` (list existing products) | `business:read` (probably) | ❌ "You do not have access to this company" |

The errors are explicit and helpful — Whop tells me exactly which scope it wants on each call.

## To finish provisioning via API

Two paths:

### Option 1 — Add scopes to this key

Go to <https://whop.com/dashboard/developer/apps/app_AQjwzqQarLrvSQ> → API Keys, edit the existing key, and tick:

- `developer:update_app`
- `access_pass:create`
- `business:read`

Then drop the new key into `.env.local` and re-run the provisioning. The full sequence the script will perform:

1. `updateApp` — rename to "TickerTrace", set description, set `discoverPath=/discover`, set `dashboardPath=/dashboard/[companyId]`. (`experiencePath` is already correct.)
2. `createAccessPass` — title "TickerTrace", hidden visibility, free, route `tickertrace`, attached to the company.
3. After Vercel deploy, one more `updateApp` to set `baseUrl` to the production URL.

### Option 2 — Do those two steps in the dashboard

Both are one-screen operations:

- App rename + paths: <https://whop.com/dashboard/developer/apps/app_AQjwzqQarLrvSQ/settings>
- Access pass create: <https://whop.com/dashboard> → Products → New, title "TickerTrace", free plan, attach to the experience that the app generates when you install it into a community.

Either path lands in the same state.

## After provisioning

1. Deploy `whop-app/` to Vercel (Next.js auto-detect, root = `whop-app/`).
2. Set these env vars in Vercel project settings:
   - `WHOP_API_KEY`
   - `NEXT_PUBLIC_WHOP_APP_ID`
   - `NEXT_PUBLIC_API_URL=https://api.tickertrace.pro`
3. Set the resulting `*.vercel.app` URL as the app's `baseUrl` (dashboard or API).
4. Install into a test community, open from sidebar, click through Signals → ticker → fund. Confirm option book on ULTY.
5. Flip status `hidden` → `unlisted` (anyone with the link can install) or `live` (Whop app store).
