# Splitting Income ETFs from Equity ETFs — Plan

Status: **proposed**, awaiting scope sign-off.
Branch: `claude/income-etfs-ui-split-bddpdj`
Data snapshot used throughout: `holdings_2026-07-31.csv` (4,324 rows, 71 funds, 536 option rows).

---

## 1. Why this is more than a UI job

The dashboard currently renders two contradictory answers to the same question,
sixteen pixels apart.

`app/dashboard/page.tsx:241` renders `<InstitutionalSummary>` from
`api.institutional()`, which **excludes** income funds via `is_institutional_fund()`
(`api/data.py:205`). `app/dashboard/page.tsx:257` renders `<SignalsHero>` from
`/api/v1/signals`, which filters **nothing**.

Top buys, same day, same page:

| Panel | Top buys |
|---|---|
| `InstitutionalSummary` (income excluded) | MSFT, AMD, CRWV, CBRS, MU, AGPXX, TER, VSAT |
| `SignalsHero` (everything) | AGPXX, META, CAT, NVDA, LHX, LLY, MSFT, AAPL |

One ticker in common out of eight. `CAT` and `NVDA` are on the second list because
**ULTY reshuffled covered-call collateral** — a mechanical consequence of rolling
options, presented as institutional conviction.

A UI-only split would ship a prettier version of this.

---

## 2. Five competing definitions of "income fund"

| # | Location | Scope | Drives |
|---|---|---|---|
| 1 | `lib/providers.ts:92` `OPTION_INCOME_PROVIDERS` | 6 providers | **nothing — zero call sites** |
| 2 | `api/data.py:180` `_OPTION_INCOME_PROVIDERS` | 6 providers | the `category` label on API payloads |
| 3 | `api/data.py:202` `_INCOME_ONLY_PROVIDERS` | **4** providers | every actual server-side filter |
| 4 | `effectiveness.py:66` `OPTION_FUNDS` | ticker whitelist | `/effectiveness` |
| 5 | `components/rotation-panel.tsx:25` `ROTATION_FUNDS` | `{ULTI, ULTY}` | the rotation panel |

The #2/#3 gap is a live bug: NestYield (EGG*) and NicholasX (BLOX) are labeled
`option-income` in the UI but counted as **institutional stock-pickers** in the
institutional blend, layering, and stock-detail math.

**Provider-derived category is also factually wrong.** Amplify ships both product
lines, so three overlay funds are classified `active-equity`:

| Fund | Provider | Option rows | All written (short) |
|---|---|---:|---:|
| IDVO | Amplify | 35 | 35 |
| DIVO | Amplify | 4 | 4 |
| QDVO | Amplify | 4 | 4 |

DIVO currently drives the **#1 sell signal (KO)**, two of the top-eight buys, and
four of six divergences — as an "active-equity" fund.

**Fix:** classify **per fund**, not per provider. Derive as
`provider ∈ OPTION_INCOME ∨ fund has ≥1 written option row`. Self-corrects for new
providers and is testable. Collapse all five lists into it.

---

## 3. Two production data bugs that block a truthful income view

### 3.1 Roundhill FLEX options are misfiled as equity positions

`scrape_avantis.py:224` OCC regex requires an all-alpha root (`^([A-Z]+)`), but
Kurv/Roundhill/REX publish exchange-prefixed roots. 44 of 536 option rows (8.2%)
fail it; most are rescued by the descriptive-name regex. **Three are not:**

```
QDTE | 4NDX  260918C02250000 | 4NDX US 09/18/26 C2250 FLX   | Weight = 20.00
QDTE | 4NDX  261218C02450100 | 4NDX US 12/18/26 C2450.1 FLX | Weight = 24.88
RDTE | 4RUT  261218C00246200 | 4RUT US 12/18/26 C246.2 FLX  | Weight = 45.84
```

The `FLX` suffix plus the digit-prefixed root defeats the REX pattern at `:272`.
**RDTE's single largest position — 45.8% of the fund — is currently classified as
an equity holding.** Measured effect: QDTE and RDTE both report ~49% "equity"
weight that does not exist.

Fix: allow an optional leading digit in the root at `:224` and `:272`
(`(?:\d)?([A-Z]+)`), and tolerate the `FLX` suffix. Mirror in
`lib/data-engine.ts:77,80`.

### 3.2 Moneyness is missing on 13 of 25 option funds

`Underlying_Price` and `Moneyness` are blank for **every** option row of MSTY,
CONY, PLTY, TSLY, NVDY, HOOY, YBTC, NVII, TSII, QDTE, XDTE, MSTW, RDTE.

Root cause, `scrape_avantis.py:301-311` — `enrich_with_analytics()` is called
**per fund** (`:989`), so a single-underlying fund yields a one-element chunk:

```python
data = yf.download(chunk, ...)          # MultiIndex columns even for 1 ticker
if len(chunk) == 1:
    price = data['Close'].iloc[-1]      # -> Series, not scalar
if not pd.isna(price):                  # -> ValueError: truth value of a Series
except: continue                        # :311 swallows it silently
```

Funds with many underlyings take the `else` branch and work. MSTR and TSLA are
perfectly fetchable — the single-element chunk is at fault.

Fix: `data['Close'].squeeze().iloc[-1]`, or drop the branch and always use
`data['Close'][t]`.

**This is a prerequisite for any moneyness or coverage UI on most of the income
lineup.**

### 3.3 Smaller, adjacent

- `api/data.py:1110` `_sector_flow_from` sums **raw** `weightDelta`; the TS mirror
  (`holdings.ts:904`) correctly sums active weight. A live violation of the
  CLAUDE.md lockstep rule, in the direction of the July 10 bug.
- `AGPXX` / `FIGXX` (money-market funds) slip the junk filter — `AGPXX` is
  currently the #1 buying signal. Python uses a hand-curated allowlist
  (`data.py:50`), TS uses a blanket `endsWith('XX')` (`holdings.ts:497`). They
  disagree on the same ticker.
- `AVMV` holds 286 positions (more than AVLV's 272) but is absent from
  `_BROAD_FUNDS` (`data.py:94`), so it gets the wrong significance threshold.

---

## 4. "Income ETF" is not one thing — it is five structures

This is the finding that most changes the shape of the work. Verified on live data
(% of NAV):

| # | Archetype | Funds | equity | t-bill | long opt | short opt |
|---|---|---|---:|---:|---:|---:|
| **A** | Covered call on a real equity sleeve | ULTY, KYLD, EGGQ/Y/S, ULTI, BLOX, KQQQ | 71–103 | 0–31 | 1–8 | −1 to −5 |
| **B** | Synthetic long, **no shares at all** | MSTY, NVDY, CONY, TSLY, HOOY, PLTY, YBTC, NVII, TSII | 3–26 | 76–125 | 1–11 | −7 to −35 |
| **C** | Deep-ITM LEAP proxy + **invisible** 0DTE overwrite | QDTE, XDTE, RDTE | ~0\* | 5–7 | 45–91 | **0** |
| **D** | Total-return swap, **zero option rows** | NVDW, COIW, TSLW, HOOW, PLTW, MSTW | 18 | 0–81 | 0–82 | 0 |
| **E** | Short-equity income | SLTY | negative | 90 | 1 | −2 |

\* archetype C's apparent equity weight is entirely the misparsed FLEX calls from §3.1.

**Consequences for the user's ask ("a simpler view to see holdings in one place"):**

- For the nine archetype-B funds there are **no holdings** in the equity sense.
  Rendering "top holdings" for MSTY shows four Treasury bills. The equity table is
  a lie.
- For archetype C, the income leg is **structurally absent** from the data — 0DTE
  contracts open and expire intraday, so an end-of-day file never contains one.
  Verified across 8 consecutive snapshots: zero short options, ever. We can show
  what these funds own; we cannot show what they sold. Saying so is a feature.
- For archetype D there are no options at all to show.

A single universal income screen therefore either lies about four of the five
structures, or degrades to the lowest common denominator. **Recommendation: one
layout, archetype-aware sections** — same chrome and same tiles, with the body
switching on archetype and an explicit disclosure box where the data cannot answer.

---

## 5. Why the equity signal model breaks on income funds

Beyond "it's noisy" — it is mathematically undefined.

`_active_weight_deltas` renormalizes over the whole book and bails on
`prevSum <= 0`. But short options carry **negative weight**: ULTY's short-option
weight is −4.8% of NAV, TSII's is −36.5%, NVDW's cash line is −114.7%. The
premise that the book is a partition summing to 100 simply fails.

`splitFactor()` guards `prevShares <= 0 → return 1`, which means **split detection
is silently disabled for every short position in the system.**

And where the math survives, the concept doesn't map. ULTY's equity sleeve is a
fixed ~3.7% equal-weight grid that exists solely to collateralize calls. One day's
diff, 2026-07-30 → 07-31:

```
ARKK: 45 -> 45 rows |  0 NEW |  0 REMOVED | 44 qty-changed   <- real rebalance
ULTY: 103 -> 98 rows| 15 NEW | 20 REMOVED |  4 qty-changed   <- 35 of 39 are option rolls
```

ULTY generated 35 NEW/REMOVED records in one day and **every one is the same
event**: Thursday's expiry rolling to next Thursday. The engine emits 35
independent rows sorted by `|activeWeightDelta|`. A holder reads 35 lines and
learns nothing.

Measured contamination of the equity side today:

- **3 of the 10 top selling signals** (`KR`, `MRNA`, `FCEL`) have income funds as
  their *only* contributor.
- **5 of 6 divergences** are contaminated; only 1 is a genuine stock-picker
  conflict. The card **auto-expands** (`page.tsx:264`) with an orange "intra-shop
  conflict" badge because two Kurv funds disagreed about a money-market fund.
- **49% of all streaks** (123 of 250) belong to income funds. A "5-day streak" in
  ULTY's rotating basket is not conviction.
- **51% of accumulating rows** in the activity feed are income funds.

### Three UI bugs from the same root cause

- `components/fund-portfolio.tsx:17` `classifyOption()` ignores position sign
  entirely. ULTY's `ALAB P272.5 @ +961 contracts` is a **protective put the fund
  bought**, labeled "Cash-Secured Put". Inverted on 29 of ULTY's 69 option rows.
- `lib/holdings.ts` `decodeOptionSignal()` reads `currentWeight`'s sign as
  moneyness — but that sign is long-vs-short. Every short call is labeled
  "ITM (likely)" regardless of strike, while the real `Moneyness` column sits
  unread in the same row.
- `components/option-strategy-chart.tsx:248` collapses to one row per underlying
  by picking the nearest-dated contract, so ULTY's PLTR renders as an expiring
  0DTE put stub mislabeled as the fund's PLTR strategy.

---

## 6. Recommended information architecture

**Hybrid: split the lenses, share the entities.** Split pages that are a *point of
view*; keep pages that are an *entity* on one URL.

| URL | Status |
|---|---|
| `/dashboard` | kept, rewritten as a two-world hub (most-linked URL; free-tier landing) |
| `/equity`, `/equity/changes`, `/equity/layering` | new / moved |
| `/income`, `/income/changes`, `/income/effectiveness` | new / moved |
| `/fund/[ticker]` | unchanged — already branches on category at `:104` |
| `/stocks`, `/stocks/[ticker]`, `/funds`, `/holdings` | unchanged (shared) |

Rejected alternatives:

- **Two full route trees** duplicate `/stocks` and `/fund/[ticker]`, which are
  shared by nature, and split SEO across two URL sets for identical content.
- **A global mode toggle** fails because the worlds need *different pages*, not the
  same page filtered. A React-context mode is unreadable by server components; a
  cookie-based one makes every page uncacheable.
- **Tabs in place** grow the 1411-line dashboard, force both payloads over the
  wire, and can't give the worlds different nav or metadata.

**Signals cannot be honestly filtered post-hoc.** `convictionScore` and
`totalWeightDelta` are cross-fund aggregates; filtering `fundDetails` afterwards
leaves the scores wrong. The income world must be built from option primitives,
not a filtered copy of the equity dashboard.

### Where the filter lives

In **server components**, using predicates added to `lib/providers.ts` (not
`lib/holdings.ts`).

`lib/holdings.ts` top-level-imports `fs`/`path`/`papaparse` (`:32-34`) *and*
re-exports the provider symbols (`:102`). So importing `getFundCategory` from it is
legal and identical — right up until the importing component becomes
`'use client'`, at which point `next build` dies on `Can't resolve 'fs'` in CI.
Add an ESLint `no-restricted-imports` rule banning `@/lib/holdings` from
`components/**`.

Filter **after** `_changes_between` returns, never before — `_active_weight_deltas`
is zero-sum within a fund and renormalizes over the whole book, so pre-filtering
corrupts the denominator for every remaining position.

---

## 7. API surface

Zero endpoints accept a category filter today; only `/funds` and `/fund/{t}` even
report one. The API is public and open, so every addition must be backwards
compatible.

**One query param, default `all`**, on `/signals`, `/changes`, `/stats`,
`/sectors`, `/divergences`, `/activity`, `/tickers`, `/funds`, `/holdings`:

```python
category: Optional[str] = Query(None, regex="^(active-equity|option-income)$")
```

Name it `category` — matches the existing response field, the `FundCategory` type
in `lib/api.ts:26`, and the `?category=` param `/funds` already puts in the URL.

**Additive response fields only** (nothing removed, nothing retyped):
`fundCategory` on every change record and fund-detail entry; `categoryCounts` on
signals/divergences; `crossCategory` on each divergence; `byCategory` on `/stats`
alongside the unchanged legacy top-level keys.

`crossCategory` is the one genuinely new insight the split unlocks — it lets the UI
demote the divergences that are an equity manager vs. an overlay rather than
hiding them.

MCP tools get the same `category: str = ""` treatment, plus two new tools:
`get_option_book(fund)` and `list_funds(category)` — an agent currently has no way
to discover which funds are option-income without calling `get_fund_detail` per
ticker.

---

## 8. Income metrics — all computable from columns already on disk

Verified on 2026-07-31 data.

| # | Metric | Formula | Real values |
|---|---|---|---|
| M1 | Call coverage | `Σ W_eq × min(1, |contracts|×100 / shares) / Σ W_eq` | ULTY 100% · KYLD 89% · EGGQ 49% · BLOX 22% |
| M2 | Weighted moneyness | `Σ|W_c| × Moneyness_c / Σ|W_c|` over short calls | ULTY +0.64% · KYLD −14.3% · EGGQ −6.3% |
| M3 | Weighted DTE | `Σ|W_c| × DTE_c / Σ|W_c|` | ULTY 7.7d · KYLD 14.1d · EGGQ 19.0d · ULTI 0d |
| M4 | Upside room | `(K − S)/S` per position, weighted | ULTY +1.4%; AMD −6.8%, PWR −8.8% already past cap |
| M5 | Capped upside | share of sleeve with a short call and `room ≤ 0` | ULTY: **10 of 27 short calls are ITM** |
| M6 | Collateral mix | equity / t-bill / cash / long-opt / short-opt | see §4 table |

M2 is the whole investment decision in one number: ULTY writes essentially at the
money, KYLD writes 14% out. Nothing on the internet shows this side by side.

v2: strike ladder over time, roll-direction index, assignment cost
(ULTY's `ALAB C270` expired ITM at spot 309 → −0.51% of NAV in one contract,
cash-settled — share count unchanged at 96,100), option-book turnover
(ULTY 51%/day vs KYLD 0%), notional coverage, NAV/share series, cross-fund
comparison table.

**Not computable — say so in the UI:** QDTE/XDTE/RDTE income leg (structural);
premium actually received (only EOD marks); distributions / yield / ROC (absent
entirely — this is the #1 question ULTY and MSTY holders have); greeks and IV
(Momentum MCP's `options_analysis` is the designated join); NAV/share for Kurv and
REX (`NetAssets` blank).

**Data-quality guard:** `Underlying_Price` disagrees with the fund's own equity
price by >5% on 41 of 321 rows (13%) — worst is RDDT at $178.04 vs $137.60 (22.7%),
simultaneously across ULTY, KYLD and ULTI. Prefer the fund's own
`Market Value / Share Quantity` as spot when the underlying is also held as equity;
suppress the badge when they disagree.

---

## 9. Visual language

Equity keeps `#00d4ff`. Income gets `#fbbf24` (amber-400) — **not** the current
purple. Measured contrast on the real surfaces:

| Accent | `#0a0f1e` page | `#111827` panel | `#1e293b` chip |
|---|---|---|---|
| `#00d4ff` equity | 10.78 | 10.02 | 8.26 |
| `#fbbf24` income | 11.44 | 10.63 | 8.76 |
| `#a78bfa` current | 7.02 | 6.52 | 5.38 |

Cyan and amber land within 6% of each other on every surface, so neither world
reads as the demoted one. Purple is a full tier dimmer — using it for income (as
`funds-grid.tsx:54` does today) literally renders income as the lesser product.
Amber is also already the codebase's options colour (`#f59e0b`), so this promotes
an existing semantic rather than inventing a hue.

Three rules that keep it one product:

1. Green `#00ff88` / red `#ff4444` stay **direction-only** in both worlds. Accent =
   where you are; green/red = what happened.
2. Purple `#a78bfa` is reserved for cross-cutting meta (divergence, multi-family,
   TraderMatrix) — explicitly not an income colour.
3. Chrome never changes. Only the accent moves.

Required cleanup: the `TRIMMING` badge (`page.tsx:1303`) uses `#f59e0b`; once amber
means "income world" that's a false signal in an equity table. Recolour to a muted
rose.

Accent must never be the only world cue — always pair with an icon.

---

## 10. Phased rollout

Every phase independently shippable, `main` green throughout. This matters more
than usual: `sync_data.sh` pulls `origin/main` onto the Vultr box every 15 minutes
with no deploy step, so a broken `main` reaches production on its own.

| Phase | Content | Visible change |
|---|---|---|
| **0** | Reconcile the five fund lists into one per-fund classifier (TS + Python, in lockstep). Fix the two scraper bugs. Fix `data.py:1110` raw-weight drift. Add world predicates to `lib/providers.ts`. | none (data corrections) |
| **1** | Extract ~14 private components out of `app/dashboard/page.tsx` into `components/dashboard/`, verbatim. De-duplicate the four helpers duplicated with `fund/[ticker]`. | none |
| **2** | `/equity`, `/equity/changes`, `/equity/layering`. Category gate on signals, divergences, streaks, sector flow. Light up the nav switcher. | equity signals stop showing overlay churn |
| **3** | `/income` + archetype classifier + the six coverage tiles + the one-screen book. | the new income experience |
| **4** | `/dashboard` becomes the hub; redirects; sitemap; landing-page fork. | new entry points |
| **5** | API `category` param + MCP tools + new tests. | public API gains the filter |

Redirect trap: in App Router a `redirects()` entry is **silently ignored** while a
real route file still matches. Delete the old page and add the redirect in the
*same* commit, or `/changes` keeps serving the old page for weeks. Use 307 for a
two-week soak before flipping to 308 — a cached 308 is effectively irreversible.

Build trap: a page reading `searchParams` without `export const dynamic` throws
`DYNAMIC_SERVER_USAGE` at build time (documented at `fund/[ticker]/page.tsx:32-42`
after it broke a Vercel build once). Both new `changes` routes read `?period=`.
`/income` must use `{ throwOnError: false }` and `revalidate: 600`, never
`force-dynamic`, or it will hammer the Vultr box on every request.

---

## 11. Testing

Current: 6 pytest files, ~55 tests, no TS test runner. The entire category test
surface is four tests asserting the helper returns strings — **nothing tests that
category changes any computation.**

Fixture limitation: `tests/fixtures/holdings_2026-05-*.csv` have only 10 of the 38
columns and 2 option rows, so `_row_price` returns 0 and active weight degrades to
the no-drift path. They cannot exercise moneyness, DTE, coverage, or flow.

Required:

1. Widen both fixtures to the full 38-column header. **Expect active-weight
   assertions to need rebaselining — do this as its own commit.**
2. Add the `4NDX`/`4RUT` FLEX rows and an Amplify overlay fund to the fixtures.
3. New `tests/test_categories.py` — including
   `test_signals_default_unfiltered_matches_legacy` (the compatibility contract)
   and `test_active_weight_denominator_unaffected_by_category_filter` (the
   load-bearing one).
4. New `tests/test_option_metrics.py` — coverage, contract multiplier = 100,
   `None` (not 0) when `Underlying_Price` is missing.
5. `tests/test_parser.py` regressions for the digit-prefixed OCC roots and FLEX
   names — these are live production bugs.
6. `tests/test_junk_filter.py` for `AGPXX` / `FIGXX`.
7. New `tests/test_api_contract.py` — assert every endpoint called *without*
   `category` returns legacy keys byte-identical to a stored golden JSON. No such
   guard exists today for a public, open API.

---

## 12. The highest-leverage refactor

`lib/holdings.ts` is marked `@deprecated` in its own header and survives only
because `/holdings` needs raw CSV-shaped rows. It duplicates 13 functions with
`api/data.py` that must stay in lockstep — and several have **already drifted**
(sector flow raw-vs-active weight, junk filter allowlist-vs-heuristic, streak key
shape, holding key shape).

Adding the option columns to `get_all_holdings()` (`api/data.py:1326`, which
already emits `isOption`) and migrating `app/holdings/page.tsx` onto the API
**retires 12 of the 13 lockstep pairs permanently** and deletes a third option
parser (`lib/data-engine.ts`, which has the same all-alpha root bug and no REX
pattern, and appears to have no importers at all).

Worth doing as part of this work, or immediately after.
