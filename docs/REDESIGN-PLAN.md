# Redesign Plan

Derived from four parallel read-only audits run 2026-09-03 against `main` @ `577688d`
(navigation/IA, cohesion, data exposure, calculation integrity). Every claim below was
verified against source before landing here.

**The one-sentence version:** TickerTrace already has a design system, a token
layer, and a richer agent API than it ships — it just doesn't use any of them. The
work is mostly adoption, not construction.

> [!NOTE]
> **Status: all phases delivered, 2026-09-03/04.** This document is kept as the
> record of *why* each change was made and what was deliberately excluded — the
> reasoning outlives the work. Phase headings below carry their shipping PR.
>
> | Phase | State | PR |
> |---|---|---|
> | 0 · Read the analytics | Deferred by owner | — |
> | 1 · Populate the token layer | Shipped | #110 |
> | 2 · One `<DataTable>` primitive | Shipped | #111 |
> | 3 · Rebuild the menu | Shipped | #110 |
> | 4 · Port the MCP tools home | Shipped | #111 |
> | 5 · Close the small gaps | Shipped | #107–#109, #112 |

> [!IMPORTANT]
> **Order matters.** Phases 1 and 2 are prerequisites for 3. Rebuilding navigation
> on top of components that don't agree with each other relocates the incoherence
> instead of fixing it. Do not start Phase 3 early.

---

## Phase 0 — Read the analytics *(deferred — owner deprioritised)*

Half the telemetry works and half is theatre.

| What | State | Action |
|---|---|---|
| Google Analytics 4 | **Live.** `googletagmanager` + `gtag/js` load in production. | Read the device/browser/OS split. It answers "how mobile are we actually?" |
| Vercel Analytics | **Dead.** `<Analytics />` is mounted at `app/layout.tsx:41`, but the project setting is off — the API returns `web_analytics_not_enabled` and `_vercel/insights` never loads. | Enable it in project settings, or remove the component. Shipping a collector that collects nothing is worse than neither. |

Everything downstream is sized by what GA says. If mobile is 15% of sessions the
phone-first framing is a nice-to-have; if it's 60% it's the main event.

**Cost:** minutes. **Blocks:** nothing, but informs the weight of all of it.

---

## Phase 1 — Populate the token layer *(shipped — #110)*

**Goal:** one source of colour truth, enforced by the build rather than by discipline.

### What's actually there

Two token systems exist and neither is used:

1. `etf-dashboard/app/globals.css:8-50` has a full Tailwind v4 `@theme inline` block
   wired to `:root` custom properties — but `:root` (`:52`) still holds **stock shadcn
   defaults** (`--background: oklch(1 0 0)`, neutral greys). Nothing in the app's actual
   navy palette lives there.
2. `etf-dashboard/lib/providers.ts:138-165` defines `WORLD_META` — a properly reasoned
   accent system with documented contrast math. Imported by **exactly one file**,
   `components/site-nav.tsx`.

Meanwhile `#00d4ff` appears **223 times across 31 files**. The palette isn't wrong;
nothing enforces it, so 31 files re-derive it and drift. That is the mechanical cause
of the product feeling, in the owner's words, "segregated from itself."

### The work

1. Replace the stock `:root` values in `globals.css` with TickerTrace's real palette,
   named semantically rather than by hue: surface/raised/rule, equity accent, income
   accent, buy/sell/neutral, and the text ramp. Because `@theme inline` is already
   wired, `bg-surface` / `text-equity` become real Tailwind classes for free.
2. Codemod hex → token class, highest-count files first:
   `app/dashboard/page.tsx` (28 × `#00d4ff`), `app/page.tsx` (22),
   `components/changes-client.tsx` (9), `app/fund/[ticker]/page.tsx` (9).
3. Point `WORLD_META` at the same tokens so there is one definition, not two.

### Do not

- **Do not unify provider accent colours.** Each fund family's colour is legitimate
  differentiation, not drift. Only buy/sell and equity/income semantics need locking.
- **Do not touch layout in this phase.** Colour only, so a regression is obvious and
  a revert is clean.

**Risk:** low — but a wrong mapping is visible on every page, so review the diff by
route, not by file. **Verify:** `next build`, then confirm the raw-hex count drops;
spot-check `/dashboard`, `/income`, `/holdings` in both themes.

---

## Phase 2 — One `<DataTable>` primitive *(shipped — #111)*

**Goal:** stop shipping three table paradigms.

### What's there

Three unreconciled systems:

- **TanStack** — only `app/holdings/data-table.tsx` + `columns.tsx`, the sole consumer
  of the shadcn `ui/table.tsx` primitive. Now also the only table with real column
  priority (via `ColumnDef.meta`, added in #104).
- **Three bespoke render functions in one file** — `ProviderGroupedTable`,
  `EquityTable` and `OptionsTable` inside `app/dashboard/page.tsx`. `OptionsTable` was
  extracted to `components/options-table.tsx` in #104; the other two remain inline.
- **Nine files hand-writing raw `<table>`** with their own sort, empty and loading
  logic: `app/stocks/[ticker]/page.tsx` (×2), `app/funds/page.tsx`,
  `app/fund/[ticker]/page.tsx`, `app/income/[fund]/page.tsx`, `app/stocks/page.tsx`,
  `app/effectiveness/page.tsx`, `components/rotation-panel.tsx`,
  `components/changes-client.tsx`, `app/page.tsx`.

Moving `/holdings → /dashboard → /income/[fund]` crosses three paradigms with three
mobile-column strategies in three page-turns.

### The work

Build `components/data-table.tsx` with sort, empty state, skeleton loading, and a
`mobilePriority` prop — the column-priority pattern is already proven twice (`#104`),
so this is generalising something that works, not inventing it.

Migrate in this order, one PR per group so a regression is bisectable:

1. `EquityTable` and `ProviderGroupedTable` out of `dashboard/page.tsx` — highest
   duplication density, and that file is ~1,400 lines.
2. The nine raw-`<table>` files, heaviest traffic first.
3. `/holdings` last, or never. It is the reference implementation and the most
   featured; migrating it is optional and lowest value.

**Risk:** medium. Each migration is a behaviour change. **Verify:** per table — sort
still sorts, empty state renders with zero rows, and the 375px column set is
deliberate rather than inherited.

---

## Phase 3 — Rebuild the menu on the task axis *(shipped — #110)*

**Goal:** navigation that describes what a trader came to find, not how the data is computed.

### The diagnosis

The nav's top-level split is Stock Pickers / Premium Sellers. But
`app/dashboard/page.tsx:189` renders `<SiteNav />` with **no world at all** — and so
does `app/funds/page.tsx:139`. The page every CTA and the logo point at sits outside
the classification the menu is organised around.

Equity-vs-income is a **computation boundary**: active-weight math means something
different for a covered-call writer than for a stock picker. That is true and
load-bearing engineering (see `CLAUDE.md`, signal methodology). It is a poor primary
navigation axis.

Two findings compound it:

- **The landing page has a different menu entirely.** `app/page.tsx` doesn't use
  `SiteNav`; it offers three internal destinations. **Seven of fourteen routes are
  unreachable on a first visit** — Funds, Stocks, Holdings, Equity, Income, Changes,
  Layering.
- **Three separately-scrolling rails stack on a phone** — `site-nav.tsx:101`, `:154`,
  `:160`. A rail works for six items a user can see start to move. Three, each hiding
  its contents past its own edge, must each be discovered independently.

### The work

- Collapse to one task-shaped row: **Signals · Funds · Stocks · Holdings · Options
  Income**. Equity/income demotes from a fork to a filter chip on Signals/Funds/Stocks.
- Landing page adopts `SiteNav`, closing the 7-of-14 gap.
- At 375px: one **fixed five-item bottom bar**, replacing all three rails. Nothing
  requiring horizontal-scroll discovery.
- Add the PWA manifest, `viewport` export and `theme-color` while here — the bottom
  bar and the installable-app work are the same job, and `android-scout` wants them.

### Naming — decided 2026-09-03, not open

Five destinations, because a bottom bar tops out at five:

> **Signals · Stocks · Funds · Income · Holdings**

Order is by frequency of intent, not by data model. `Stocks` precedes `Funds`
because ticker lookup dominates — there are 20+ `/stocks/${ticker}` link sites
across the codebase against far fewer fund links.

| Label | Why | Absorbs |
|---|---|---|
| **Signals** | The product's own core noun — `CLAUDE.md` opens by saying TickerTrace "surfaces conviction-scored trading signals." Native trader vocabulary, and it gives `/dashboard` a job instead of being a kitchen sink. | `/dashboard`, `/changes`, `/layering` |
| **Stocks** | The entity people arrive looking for. | `/stocks`, `/stocks/[ticker]` |
| **Funds** | The other entity type, named the way people say it. | `/funds`, `/fund/[ticker]` |
| **Income** | Tab label. The page title is **"Options Income"** — single words survive a 375px bottom bar, the precise name lives where there is room. | `/income`, `/income/[fund]`, `/effectiveness`, `/options-listings` |
| **Holdings** | The literal raw grid. Earns a slot because export and the full table are a distinct job, not a view of something else. | `/holdings` |

**Stock Pickers and Premium Sellers survive as a filter chip** on Signals, Stocks
and Funds. They were always good trader vocabulary — they were doing the wrong job.
As a chip they are useful; as the top-level axis they forced a taxonomy choice on
someone who arrived wanting a ticker. This is the core of the fix, not a footnote:
the computation boundary stops being the navigation boundary but does not stop
being visible.

**Sub-labels, de-jargoned:** `Δ Changes` → **Changes** (the Δ was decoration).
`CBOE Scanner` → **New Listings**. `Fund Scores` → **Scores**. **Layering** stays —
it is an owned product concept with changelog and marketing continuity behind it,
and renaming would cost more than the jargon does.

**Search** is promoted to a persistent header icon on every route. `TickerSearchForm`
and `KeyboardSearch` already exist (`app/dashboard/page.tsx:32-33`); lookup is the
dominant intent and currently has no permanent home.

**Risk:** highest in the plan — touches every route. **Do not start before 1 and 2.**

---

## Phase 4 — Port the MCP tools home *(shipped — #111, 8 tools → 20)*

**Goal:** an agent should not see less than a human.

Three sources disagree about what the MCP server exposes:

| Source | Tools | What it is |
|---|---|---|
| `CLAUDE.md:52` | 7 | Documentation. Omits `get_layering_patterns`, which does exist. |
| `api/mcp_server.py` | 8 | What ships with the product. |
| `~/projects/trading-agent/tickertrace_mcp.py` | **17** | A richer wrapper, written 2026-08-28, living in `mphinance/trading-agent`. |

The external wrapper already has every tool the audit flagged as missing:
`get_income_overview`, `get_institutional_trend`, `get_signal_performance`,
`get_options_listings`, `get_briefing`, `get_holdings_changes`, `get_stock_activity`,
`list_all_funds`, `list_all_tickers`. Each is a thin wrapper over `api/data.py` /
`api/income.py` functions that already exist.

**This is a port, not a build.** Move the nine extra tools into `api/mcp_server.py`,
then correct `CLAUDE.md:52` so all three sources agree.

**Risk:** low, purely additive. **Verify:** every ported tool answers against the live
public API; no new computation introduced.

---

## Phase 5 — Close the small gaps *(shipped — #107–#109, #112)*

Independent of each other; pick up any time.

- **Reconcile the 10× AUM fallback.** `api/data.py:1182` uses `FUND_AUM.get(fund, 0.01)`;
  `lib/holdings.ts:650,667` use `?? 0.1`; seven other Python call sites use `0.0`. The
  table has 71 entries against 71 tracked funds so it never fires today — it fires the
  moment a fund is added to `FUNDS` before the AUM table, and that fund's signals then
  rank 10× differently depending on which path computed them. Pick one value (`0.0`
  matches the majority) and apply it in **both** files, per the lockstep rule in `CLAUDE.md`.
- **Surface `writtenCallLegs` / `writtenLegs`.** Typed in `lib/api.ts:558-559`, computed
  in the income payload, referenced by no component. One tile on `/income/[fund]`.
- **Per-signal win-rate pills** on `/equity` and `/changes`. `signalPerformance().byProvider`
  is already fetched; today it only appears once, aggregated, on `/dashboard`.
- **Disclose the effectiveness constants.** The composite grade rests on hand-picked
  Gaussian/sigmoid centres (DTE ≈ 56 days, sigma 4.0) with confidence-and-risk
  reweighting. It is internally consistent and not wrong — but a "B+" is seven
  curve-fits reweighted per fund, and nothing tells the reader those are judgement
  calls rather than fitted values. A tooltip saying so is honest and cheap.

---

## What is deliberately not in this plan

- **Unifying the landing page with the dashboard.** Marketing layout and data-density
  layout are different jobs; forcing one component tree onto both costs more than the
  duplication does.
- **Provider accent colours.** Legitimate differentiation (see Phase 1).
- **The raw scraper columns** — `CUSIP`, `ISIN`, `SEDOL`, `Coupon`, `Maturity Date`,
  `CreationUnits`, `Country`. Bond and authorised-participant mechanics with no retail
  value. Correctly internal; leave them out of the UI.
- **A native Expo app.** `android-scout` argues PWA-first, and the dashboard should
  survive a phone before a third client exists. Note `whop-app/` is already a second
  Next client duplicating `lib/api.ts`.

## The agent lenses

`.claude/agents/` carries five lenses seeded with these findings: `phone-audit`,
`table-fork`, `sticky-warden`, `android-scout`, `funnel-guard`. They register as
callable agent types after a session restart. `table-fork` owns Phase 2 decisions;
`android-scout` owns the Phase 3 PWA work; `funnel-guard` gates anything touching a CTA.
