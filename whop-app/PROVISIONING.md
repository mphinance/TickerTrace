# Provisioning the Whop app

You handed me an admin API key (`apik_vyb8…`) and asked me to create the
product and "everything else I need" via the API.

Here's what I found and what's left for you to click through manually.

## What I discovered about your key

| Probe | Result |
|---|---|
| Belongs to company | `biz_wOS4zmZpztAFHR` |
| `/api/v2/products` GET | 200 (you have 2 existing products: `ask-sam` and `Free Access`) |
| `/api/v2/products` POST | 401 — key is read-only on this scope |
| `/api/v2/experiences` GET | 200 (30 existing experiences) |
| Whop GraphQL `/public-graphql` | rejects — wants an **App API Key**, not the company key |
| `/sdk/api/apps/list-apps` and similar | not reachable with this key |

So this is the **company admin/read API key**, not a developer App API
Key. It can read company state but cannot create products, apps, or
experiences, and it cannot drive the GraphQL surface the SDK uses.

## What that means for provisioning

The Whop developer flow has two layers:

1. **A Whop app** — the developer entity registered at
   `whop.com/dashboard/developer/apps`. This is what gets installed into
   communities. Has its own App ID and App API Key.
2. **A product / access pass** — the sellable unit inside a community.

Both layers need to be created in the dashboard UI. Your current key
can't do either via API. That's a Whop platform constraint, not a code
gap.

## What you need to do (5 minutes)

### 1. Create the Whop app

Go to <https://whop.com/dashboard/developer/apps> and click **Create
app**. Use these settings:

| Field | Value |
|---|---|
| Name | TickerTrace |
| Description | Institutional ETF holdings intelligence, embedded in your Whop. |
| Base URL | Your Vercel production URL (set after step 3) |
| Experience path | `/experiences/[experienceId]` |
| Dashboard path | `/dashboard/[companyId]` |
| Discover path | `/discover` |
| Required scopes | `read_user` |
| Status | `hidden` (flip to `live` after you've tested) |

When you save it, Whop gives you:

- `App ID` (looks like `app_xxxxxxxxxxxxxxxx`)
- `App API Key` (looks like `wapi_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
- `Agent User ID` (looks like `user_xxxxxxxxxxxxxx`)

Those three values go into `whop-app/.env.local` (and into your Vercel
project's environment variables).

### 2. Deploy to Vercel

```bash
cd whop-app
vercel --prod
```

Or push to GitHub and let Vercel auto-deploy from the `whop-app/` root.
Set the four env vars in the Vercel project settings:

```
NEXT_PUBLIC_WHOP_APP_ID
WHOP_API_KEY            # the wapi_… key, NOT the apik_… key
NEXT_PUBLIC_WHOP_AGENT_USER_ID
NEXT_PUBLIC_API_URL=https://api.tickertrace.pro
```

Note the deploy URL.

### 3. Set the Base URL on the Whop app

Go back to your Whop app settings and paste the Vercel URL into **Base
URL**. Save.

### 4. Install into a community to test

In the dashboard, find your test Whop (probably the community attached
to `biz_wOS4zmZpztAFHR`), open **Apps**, and install TickerTrace. Then
open it from the community sidebar — you should hit the experience
view with the Signals tab.

### 5. Optional: create a product wrapper

If you want a discoverable "TickerTrace" product on Whop's app store
(distinct from the embedded app), create one at <https://whop.com/dashboard>
under **Products**, set a `$0` plan, and attach the TickerTrace
experience to it.

## TL;DR

The code is done. The dashboard clicks are what's left. They take five
minutes and they want an App API Key that this admin key can't mint.

If you give me an **App API Key** (the `wapi_…` one Whop generates when
you create the app), I can wire `.env.local` and run a real smoke test
against your live Whop session. Otherwise, I've put placeholder values
in `.env.example` and the build verifies cleanly with stub env at build
time.
