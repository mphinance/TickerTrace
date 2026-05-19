# Ideas for TickerTrace — May 16, 2026

Bedtime brain food. Not a roadmap, not a backlog — just an honest scan of what's here and what could move the needle. Skim, ignore, or steal at will.

---

## 🐛 Bugs found while writing this doc

> **Both shipped 2026-05-18** — see Patch Notes on the landing page. Keeping the diagnosis below for posterity / future-similar-shape reference.

### ✅ Duplicate rows on `?q=<ticker>` cross-fund view (Corgi-specific scraper bug)

Reported live by Sam: `https://tickertrace.pro/dashboard?q=GOOGL` shows CMAG holding GOOGL **8 times**, CQTM **8 times**, etc.

**Root cause:** the Corgi scraper is dumping the upstream time-series file (`Corgi_Adv.40C8.C8_ETF_Holdings.csv`) into the daily CSV without filtering to the latest `holding_date`. Each historical day becomes a separate row in today's snapshot. Other providers (Kurv, YieldMax, NestYield) appear exactly once per (fund, ticker) — only Corgi is broken.

**Evidence:** in `holdings_2026-05-16.csv`, every row has `Date=2026-05-16` (the snapshot date) but `holding_date` ranges from `2026-05-06` to `2026-05-15` (8 distinct days = 8 rows). All have 605 shares; weight varies slightly because the fund's total market value changes day-to-day.

**Two-layer fix:**
1. **Scraper-side (right answer):** in `scrape_avantis.py`'s Corgi block, group by `(fund, ticker, option_details)` and keep only the row with the most recent `holding_date` before writing the daily CSV.
2. **API-side defensive dedup:** in `api/data.py` — `get_ticker_detail()` (line 741) and `get_fund_detail()` should `dict()`-collapse by `(fund, ticker)` regardless of what the scraper does. Protects against future shape-of-scraper bugs.

Effort: S for both layers.

### ✅ Single-stock search is too hidden

The `<TickerSearch />` in the dashboard header is keyboard-driven (`/` shortcut shown as a kbd hint) but a first-time visitor won't notice it. Once they DO search and a result appears, there's no obvious next link.

Suggested polish (S):
- Placeholder copy: `"Search any ticker (GOOGL, TSLA, AVGO…)"` instead of generic
- Magnifying glass icon at full opacity, not 40%
- Result card shows a `→ Open cross-fund view for GOOGL` CTA that links to a dedicated `/ticker/GOOGL` page (or the same `?q=` URL but with a real page chrome)
- Highlight it on the landing page: "Search any ticker, see which funds own it" — currently the landing page sells the briefing but not the lookup

Files: `etf-dashboard/components/ticker-search.tsx`, header in `etf-dashboard/app/dashboard/page.tsx`, landing page hero in `etf-dashboard/app/page.tsx`.

---

## TL;DR — If you only do 5 things

In rough impact-per-effort order:

1. **Build a "did the signal work?" feedback loop.** Show whether following a TickerTrace signal would've made money. You have the daily holdings history and a free price API is one fetch away. This is THE feature that proves the product is real — and the one every visitor secretly wants to see before trusting anything else.
2. **Plug your own MCP server into a chat box on the dashboard.** "Ask TickerTrace" — backed by the 7 tools you already wrote. You're sitting on the rarest thing in AI demos: a unique proprietary dataset that an agent can answer questions on. Anyone else building this needs your data.
3. **Daily 7AM email + Discord briefing as opt-in.** You already render this exact payload on `/dashboard` and you have the Discord webhook code. Wrap it in a "subscribe" form and you've got a habit loop. The single biggest retention lever for a daily-data product is "show up in the user's inbox before market open."
4. **Add `next build` to CI.** Three Vercel builds got bricked today because TypeScript errors landed in `main` without a local typecheck. CI runs `pytest` but not `next build`. Until it does, Vercel is your typechecker and that's a 1-minute round trip per attempt.
5. **Delete the vestigial Stripe/Firebase/auth code.** The patch notes say "ripped out Stripe + Firebase" but `etf-dashboard/components/auth-context.tsx` still imports Firebase. It's bundle bloat, attack surface, and confusion fuel for future agents reading the code. Either delete or move to a `legacy-auth` branch.

Everything below is grouped by theme. Each idea has a one-line pitch, why it matters, files involved, and a rough size (S/M/L = hours / a day / a weekend).

---

## 1. The "does this signal work?" gap — your biggest credibility lever

You track WHAT they bought. You barely tell users WHETHER it worked. Effectiveness analysis exists for the funds themselves (`effectiveness.py` — really nice work, Black-Scholes Greeks and all) but not for the *signals you generate*.

### ✅ 1a. Signal-vs-price backtest [M] — SHIPPED 2026-05-19
Pick any signal from 7/14/30 days ago. Show what the underlying ticker did since. Aggregate: "ARK-buy signals had +X% median 30-day return; YieldMax-sell signals had Y%."
- **Why:** without this, "conviction score" is just a number. With it, the number is *trusted*.
- **Data:** your `etf-dashboard/public/data/history/` already has 59 days. Pair with a free quote API (Yahoo Finance via `yfinance`, or stooq/polygon free tier).
- **Files:** new endpoint `/api/v1/signal-performance`, new section on dashboard.

### 1b. "Top performers this month" leaderboard [S]
Page showing which historical signals worked best. Free organic SEO content + social proof.

### 1c. The Effectiveness page is doing a lot, but it's hidden [S]
Your effectiveness scoring is genuinely the most sophisticated thing in the product — Greeks, notional weighting, concentration risk. It's tucked behind `/effectiveness` with no story on the landing page. Lead with it. "We don't just track what they're doing. We grade how well they're doing it."

---

## 2. The MCP server is your moat — most products can't be this

You have a unique dataset *and* a Model Context Protocol server exposing it. That combo is rare. Lean into it.

### 2a. "Ask TickerTrace" — chat box on the dashboard [M]
One-input search bar that calls Claude (or any LLM with tool use) via your own MCP server. "What's ARK doing with crypto names this week?" → real answer with citations to your data.
- **Why:** every fintech site has a chat box now and they're all useless because they have no proprietary data. Yours wouldn't be.
- **Effort:** mostly wiring — your 7 tools already exist. Add Anthropic SDK + a small streaming endpoint.
- **File:** new `app/api/chat/route.ts`, new `<AskBox />` component.

### 2b. Polish the MCP tool descriptions [S]
LLMs pick tools based on the description. `get_market_summary` doesn't say what's in the summary; `get_changes` doesn't say its filter semantics. Tighten the docstrings. Add example outputs.

### 2c. Publish the MCP server to a registry [S]
There are early MCP server registries (npm-style). Get listed. "TickerTrace ETF Holdings" in someone's discovery feed = free retail-trader-with-Claude-Desktop traffic.

### 2d. Long-running agent: nightly market briefing [M]
A background agent that runs at 8pm ET, queries your MCP server, and writes a human-readable summary using cheap inference (Haiku 4.5 or similar). Save as `analyses/YYYY-MM-DD.md`. Already partially built in `generate_analysis.py` — just needs the MCP loop.

---

## 3. Distribution — daily habits beat features

You ship constantly. The single biggest leverage is getting people back daily.

### 3a. Email subscription, 7AM ET daily [M]
Same briefing payload that renders on `/dashboard`. Send via Resend / Postmark / SES (Resend's the easiest). Form on landing page, double opt-in optional.
- **Why:** retention. A daily email is the deepest moat in finance media — Robinhood Snacks, Morning Brew, Stocktwits Smart Money. You have the content; you don't have the loop.
- **Files:** new `api/email_briefing.py`, simple form component, Resend API token.

### 3b. RSS feed [S]
`/feed.xml` — same content as the email but for power users and AI agents. Trivially generated from `/api/v1/briefing`. Costs nothing, gets indexed by feed readers + Substack autopost.

### 3c. Embed widget [M]
`<iframe src="https://tickertrace.pro/embed/ARKK?theme=dark">`. Finance bloggers and Substack writers will embed it. Each embed is a free backlink and brand impression. The `/holdings` table component is already close to embeddable.

### 3d. Auto-poster Twitter/X account [S]
Daily 7AM post: top 3 buys, top 3 sells, sector flow. Schedule via GitHub Actions or a simple cron. Free distribution at zero ongoing cost.

### 3e. Lean on Sam's voice [S]
The patch notes are genuinely the best part of the marketing surface — honest, slightly self-deprecating, real. Make `/about` or `/manifesto` a page. The "Stripe checkout button did nothing for 12 hours" entry is the kind of thing that gets screenshotted and shared. Most finance sites are sterile; this is a personality, monetize the trust it builds.

---

## 4. UX polish that actually moves perception

Small things that make people say "oh, this is built by someone who cares."

### 4a. Mobile experience audit [M]
Half your traffic is going to be phones at lunch. Quick check: does the heatmap collapse cleanly on a 375px screen? Does the option attendance card stack legibly? If not, a single Tailwind responsive pass goes a long way.

### 4b. Loading skeletons instead of blank states [S]
When `/dashboard` is fetching, the briefing card just disappears. Shimmer skeletons feel 10x faster.

### 4c. Print stylesheet [S]
The briefing card is screenshot-worthy. A `@media print` block — no chrome, full width, your logo — turns every user's daily check into a marketing artifact.

### 4d. Share-card image generator [S — already in ROADMAP]
You flagged this. Worth doing — `html2canvas` or `@vercel/og`. Tweet engagement on visual cards is ~5x text.

### 4e. Keyboard shortcuts beyond `/` [S]
You have `/` for search. Add `j/k` to navigate signals, `g d` to jump to dashboard, `?` to show shortcuts. Power-user delighter.

### 4f. Sparkline weight history [S — in ROADMAP]
Tiny inline charts showing 10-day weight trajectory per holding. SVG, no libs needed. Huge perceived-density-of-information bump.

### 4g. Color scheme alternates [S]
You're dark-only. Some traders run light terminals at the open. A `light` / `dark` / `high-contrast` toggle is a half-day's work and signals "we thought about you."

---

## 5. Data depth — the signals you don't yet surface

### 5a. Weekly aggregation as a primary view [S]
You have streak tracking on the API but the dashboard mostly shows "today vs yesterday." Weekly accumulation is a stronger signal — daily noise gets averaged out. Promote it.

### 5b. Divergences deserve top billing [S]
"ARK buying TSLA while YieldMax is selling TSLA puts" is a *story*. Right now the divergence card is collapsed and tucked low. It's the most differentiated piece of analysis you have. Make it the headline of the dashboard when one fires.

### 5c. 13F overlay for legitimacy [M]
SEC 13F data is delayed 45 days but covers every institutional manager. Show "what TickerTrace caught 6 weeks before the 13F confirmed it." Sells the speed advantage hard. Free from SEC EDGAR.

### 5d. Insider transactions cross-reference [M]
Form 4 filings are free from SEC. Cross-reference: "ARK is buying NVDA and the CEO sold $40M of NVDA last week" is a story. Doesn't even need to be in your scraper; pull on demand from EDGAR.

### 5e. Options unusual activity (cross-fund) [L]
Several of your funds (YieldMax, REX, Roundhill) are options-based. You're already decoding option signals. Aggregate: "10 funds wrote covered calls on NVDA this week, none did last week" = institutional consensus on a cap. Bigger story than any single fund's position.

---

## 6. Reliability and operational debt

### 6a. CI runs `pytest` + AST parse but not `next build` [S]
The biggest thing. Today's three broken Vercel builds (`ApiApiChangeRecord`, `s.funds.map`, `tag="chore"`) would all have been caught by CI in 30 seconds. Add a `next build` step. Mock the API URL with an environment variable to avoid hitting prod during CI.

### 6b. Anomaly detection on scraper output [M — in ROADMAP]
Flag silently failed scrapes (empty data, weights don't sum to ~100%, holdings count dropped 80%). Right now if a fund's HTML structure changes mid-week, you find out from a user. Your `analyses/` directory could include a "data quality" line at the top of each daily report.

### 6c. Status page [S]
`status.tickertrace.pro` — public uptime, API latency, last-scrape time. Free with Upptime (GitHub Actions-based). Builds trust + gives you observability.

### 6d. The OneDrive thing [S]
Your working tree lives at `C:\Users\mphan\OneDrive\Documents\GitHub\TickerTrace`. OneDrive's sync model has eaten `.git` directories on Windows before — file locking races, partial writes during sync. Worth moving the repo out of OneDrive entirely (use Git as your source of truth; OneDrive isn't a backup for source code). Low risk to fix, high risk if it bites.

### 6e. Stale CLAUDE.md cost an hour today [S]
The "api.tickertrace.mphinance.com is the ONLY working API" line in CLAUDE.md sent me on a wild goose chase chasing imagined cert problems. The doc rotted. Two ideas:
- Auto-test CLAUDE.md assertions where possible (a `tests/test_claude_md.py` that curls every URL the doc mentions and asserts it works).
- Add a "last verified: YYYY-MM-DD" footer to each section so future readers know how stale a claim is.

### 6f. The `alpha.mphinance.com` default vhost landmine [S]
Your Apache default vhost is alpha — any unknown hostname falls through to it, serving the wrong cert and no proxy. If you ever add a new subdomain and forget to create its vhost, you'll get the exact same 503 mystery again. Worth either: (a) making the default vhost an explicit "not configured" error page, or (b) a deploy-time sanity check that every domain in your DNS has a matching vhost.

---

## 7. Code-level cleanups (dead weight)

### 7a. Vestigial auth surface [S]
Patch notes say Stripe + Firebase are gone, but:
- `etf-dashboard/components/auth-context.tsx` — still imports Firebase, syncs tokens
- `etf-dashboard/components/auth-modal.tsx` — still has Stripe checkout flow
- `etf-dashboard/components/pro-gate.tsx` — gates Pro features that no longer exist
- `etf-dashboard/components/auth-button.tsx` — login UI
- `shared-auth/` directory — entire parallel auth implementation
- `api/auth.py` — user/key management on the API side

If auth really is gone, delete it. If it's "we might come back," at least quarantine to a branch and remove from the production bundle.

### 7b. Pricing references in the comparison table [S]
Patch note from today flagged "one comparison table row still saying 'Free / $15mo'" — worth a grep pass to make sure that's the only one.

### 7c. `REVIEW.md` is a snapshot from a prior review [S]
Useful historical context, but a fresh reader sees it and thinks it's current. Either delete or rename to `REVIEW-2026-MM.md` so it's clearly dated.

### 7d. Root directory has scratch files [S]
`check_db.py`, `cleanup_db.py`, `db_setup.py`, `inspect_data.py`, `verify_etfs.py`, `test_yield.py`, `pytest-cache-files-px14c96w/` — looks like one-off scripts. If they're useful, move them to `scripts/`. If they're not, delete. Mixed-in scratch files make the project look unfinished.

### 7e. `scraper.log` and `normalized_holdings.csv` in repo root [S]
Both look like generated artifacts. Should be gitignored, not tracked. Otherwise every scraper run dirties the working tree (which is what happened on the Vultr host today — you had to `git stash` before pulling).

---

## 8. Bigger bets (weekend projects)

### 8a. iOS / Android via Expo [L]
You have a typed API client (`lib/api.ts`) and React components. A React Native app is mostly a styling rewrite. Push notifications for "ARK just added a new position" would be a moat — the dashboard can't compete with that.

### 8b. Discord bot (not just webhook) [M]
The webhook is one-way. A real bot that lives in trader Discord servers, takes slash commands (`/tickertrace ARKK`, `/signals NVDA`), would embed your data into every group chat. Discord servers are where retail traders actually live.

### 8c. "TickerTrace Pro Picks" newsletter [L]
Curated weekly: take the top 5 highest-conviction signals, add 2 paragraphs of Sam's commentary. ConvertKit or Substack as host. Charge $5/mo for the picks; the dashboard stays free. Better monetization model than gating data.

### 8d. White-label / data licensing tier [L]
You have what brokerages would pay for. A "TickerTrace API for commercial use" tier ($500-2000/mo) lets bigger players embed your signals into their tools. Fully open API for individuals; commercial license for "you ship our data in a product." Standard pattern.

### 8e. Replay mode [L]
Slider on the dashboard: drag back to any date in the last 60 days. See exactly what the dashboard looked like that morning. Powerful for backtesting strategies, demoing the product, and SEO content ("here's what TickerTrace was saying the day before NVDA crashed").

---

## What I left out

Stuff I considered but decided wasn't a priority:

- **Real-time streaming.** ETFs publish once a day. Streaming infrastructure is overkill.
- **More fund families.** You're at 56 funds across 9 providers. The marginal new family is less valuable than depth on the existing 56.
- **A native dark mode UI library.** You're already on Tailwind + shadcn. The bones are good.
- **Microservices.** No.

---

## A note on the meta

The codebase is in better shape than the last few hours suggested. Most of the friction today was:

1. CI gaps (`next build` not in CI) — fixable in an hour.
2. Stale docs lying about state (`api.tickertrace.mphinance.com is the ONLY working`) — fixable in a doc pass.
3. One latent typo, one stale shape reference, one of my own goofs.

None of those are deep architectural problems. The hard parts — the data pipeline, the signal scoring, the MCP server, the effectiveness math — are real and good. The drag is around the edges. Most of the ideas above are about turning the existing solid core into something more visible and more habit-forming.

Sleep well.
