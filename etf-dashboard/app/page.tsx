import Link from 'next/link';
import { ReferralTracker } from '@/components/referral-tracker';
import { ShareButtons } from '@/components/share-buttons';
import { DataFreshness } from '@/components/data-freshness';
import {
  TrendingUp, Zap, BarChart3, Search, GitFork, Bell,
  ArrowRight, CheckCircle2, Clock, Eye,
} from 'lucide-react';
import React from 'react';

export const revalidate = 86400; // daily revalidation for landing page

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white font-sans overflow-x-hidden">
      {/* Referral tracker — invisible, captures ?ref= param */}
      <ReferralTracker />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#0a0f1e]/80 backdrop-blur-md border-b border-[#1f2937]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-[#00d4ff] tracking-tight">
            TICKER<span className="text-white">TRACE</span>
          </span>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/effectiveness" className="text-sm text-slate-400 hover:text-white transition-colors">
              Effectiveness
            </Link>
            <Link href="/options-listings" className="text-sm text-slate-400 hover:text-white transition-colors">
              Options
            </Link>
            <Link href="https://api.tickertrace.pro/docs" target="_blank" className="text-sm text-slate-400 hover:text-white transition-colors">
              API
            </Link>
            <a
              href="https://www.traderdaddy.pro/?ref=8DUEMWAJ"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-[#c4b5fd] hover:text-white transition-colors border border-[#a78bfa]/30 hover:border-[#a78bfa]/60 px-3 py-1.5 rounded-md bg-[#a78bfa]/5"
              title="We track. TraderDaddy trades."
            >
              🧠 TraderDaddy
            </a>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-[#00d4ff] text-[#0a0f1e] text-sm font-bold rounded-lg hover:bg-white transition-colors"
            >
              Open Intel →
            </Link>
          </div>
        </div>
      </nav>

      {/* Open-access ribbon */}
      <div className="bg-gradient-to-r from-[#a78bfa]/10 via-[#00d4ff]/10 to-[#00ff88]/10 border-b border-[#a78bfa]/20">
        <div className="max-w-6xl mx-auto px-6 py-2.5 flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
          <span className="text-xs text-slate-300">
            <span className="text-[#a78bfa] font-bold">TraderDaddy</span> trades the flow.{' '}
            <span className="text-[#00d4ff] font-bold">TickerTrace</span> shows you the daily ETF data underneath — free, no login.
          </span>
          <span className="hidden sm:inline text-slate-600">·</span>
          <a
            href="https://www.traderdaddy.pro/?ref=8DUEMWAJ"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-[#c4b5fd] hover:text-white inline-flex items-center gap-1 transition-colors"
          >
            See the live flow →
          </a>
        </div>
      </div>

      {/* Hero — front-run institutions, two products in one stack */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-[#a78bfa]/10 border border-[#a78bfa]/20 text-[#c4b5fd] text-xs font-semibold px-4 py-2 rounded-full mb-8">
          <span className="w-2 h-2 rounded-full bg-[#a78bfa] animate-pulse" />
          LIVE INSTITUTIONAL FLOW · 100+ ACTIVE TRADERS
        </div>
        <DataFreshness />

        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-6">
          Front-run the institutions.<br />
          <span className="bg-gradient-to-r from-[#a78bfa] via-[#00d4ff] to-[#00ff88] bg-clip-text text-transparent">
            Before retail gets the memo.
          </span>
        </h1>

        <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-4 leading-relaxed font-medium">
          Two products. One funnel.
        </p>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          <span className="text-[#a78bfa] font-bold">TraderDaddy</span> shows what the smart money is doing
          in real time — sweeps, blocks, golden sweeps, decoded by AI.
          <span className="text-[#00d4ff] font-bold"> TickerTrace</span> is the daily ETF positioning layer
          underneath: what 50+ institutional funds are actually buying, normalized and free.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://www.traderdaddy.pro/?ref=8DUEMWAJ"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white font-bold text-lg rounded-xl hover:from-[#9060f0] hover:to-[#6d28d9] transition-all shadow-lg shadow-[#a78bfa]/20"
          >
            🧠 Trade the Flow — TraderDaddy <ArrowRight className="h-5 w-5" />
          </a>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#111827] border border-[#00d4ff]/40 text-white font-semibold text-lg rounded-xl hover:bg-[#1a2333] hover:border-[#00d4ff] transition-colors"
          >
            <Eye className="h-5 w-5 text-[#00d4ff]" /> Preview the Data — Free
          </Link>
        </div>

        <p className="text-xs text-slate-600 mt-6">
          Both products run on the same open API. No signup required to see today&apos;s data.
        </p>
      </section>

      {/* The problem — 90-day delay explained */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[#1f2937]">
        <h2 className="text-3xl font-bold text-center mb-4">Why retail loses</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
          Speed of information. By the time the public sees institutional positioning, the trade is months old.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-[#ff4444]/5 border border-[#ff4444]/20 rounded-2xl p-8">
            <Clock className="h-10 w-10 text-[#ff4444] mb-4" />
            <h3 className="text-xl font-bold mb-3">What your broker shows you</h3>
            <p className="text-slate-400 leading-relaxed mb-4">
              13F filings. Updated <span className="text-[#ff4444] font-bold">quarterly</span>, published with a
              45-day delay. By the time you see it, the trade is 90+ days old and the move already happened.
            </p>
            <div className="font-mono text-sm text-[#ff4444]/60">Filed: Q4 2025 → You see it: Feb 2026</div>
          </div>
          <div className="bg-[#00ff88]/5 border border-[#00ff88]/20 rounded-2xl p-8">
            <Eye className="h-10 w-10 text-[#00ff88] mb-4" />
            <h3 className="text-xl font-bold mb-3">What this stack shows you</h3>
            <p className="text-slate-400 leading-relaxed mb-4">
              Institutional ETFs publish full holdings <span className="text-[#00ff88] font-bold">every market day</span>.
              TickerTrace scrapes + normalizes; TraderDaddy layers on real-time options flow.
            </p>
            <div className="font-mono text-sm text-[#00ff88]/60">Daily holdings + per-minute flow → live edge</div>
          </div>
        </div>
      </section>

      {/* The Stack — how the two products fit together */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-[#1f2937]">
        <h2 className="text-3xl font-bold text-center mb-4">The stack</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
          Two layers, one workflow. The free data layer feeds the paid execution layer.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-[#0f1729] to-[#111827] border border-[#a78bfa]/30 rounded-2xl p-8 shadow-lg shadow-[#a78bfa]/10">
            <div className="text-xs font-bold text-[#c4b5fd] uppercase tracking-widest mb-3">Layer 1 · Execution</div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🧠</span>
              <h3 className="text-2xl font-black text-white">TraderDaddy.Pro</h3>
            </div>
            <p className="text-slate-300 mb-6">
              Real-time options flow detection. Sweeps, blocks, golden sweeps tracked as they hit the tape —
              with institutional conviction scoring and an AI coach that translates each signal into plain English.
            </p>
            <ul className="space-y-2 mb-8 text-sm text-slate-300">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#a78bfa] shrink-0" />SWEEP / BLOCK / GOLDEN SWEEP flow detection</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#a78bfa] shrink-0" />TraderLady AI — every flow translated in real time</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#a78bfa] shrink-0" />7 screeners, GEX levels, congressional trades</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#a78bfa] shrink-0" />1-minute refresh · 24/7 market coverage</li>
            </ul>
            <a
              href="https://www.traderdaddy.pro/?ref=8DUEMWAJ"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-3 rounded-xl font-bold transition-all bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white hover:from-[#9060f0] hover:to-[#6d28d9]"
            >
              Start Free Trial →
            </a>
          </div>

          <div className="bg-gradient-to-br from-[#0f1729] to-[#111827] border border-[#00d4ff]/30 rounded-2xl p-8 shadow-lg shadow-[#00d4ff]/10">
            <div className="text-xs font-bold text-[#00d4ff] uppercase tracking-widest mb-3">Layer 0 · Free Data</div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📊</span>
              <h3 className="text-2xl font-black text-white">TickerTrace</h3>
            </div>
            <p className="text-slate-300 mb-6">
              Daily ETF holdings, normalized across providers. 50+ institutional funds tracked, every position
              every day, with cross-fund conviction scoring and divergence detection. No login, no paywall.
            </p>
            <ul className="space-y-2 mb-8 text-sm text-slate-300">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#00d4ff] shrink-0" />ARK · Avantis · YieldMax · Kurv · REX · NestYield · Roundhill · Corgi</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#00d4ff] shrink-0" />Conviction scoring · streak tracking · sector flow</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#00d4ff] shrink-0" />Activity heatmap · divergence alerts · option decoder</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#00d4ff] shrink-0" />Open JSON API · same data TraderDaddy reads</li>
            </ul>
            <Link
              href="/dashboard"
              className="block text-center py-3 rounded-xl font-bold transition-colors bg-[#00d4ff] text-[#0a0f1e] hover:bg-white"
            >
              Open the Dashboard →
            </Link>
          </div>
        </div>
      </section>

      {/* Features grid — capabilities across the stack */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-[#1f2937]">
        <h2 className="text-3xl font-bold text-center mb-4">What you get</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
          The free data layer hands you everything below. The paid execution layer turns it into trades.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<TrendingUp className="h-6 w-6 text-[#00ff88]" />}
            title="Conviction Scores"
            desc="Signals weighted by fund AUM. A $6.8B ARK buy ranks higher than a $50M fund's identical move."
            color="green"
          />
          <FeatureCard
            icon={<Zap className="h-6 w-6 text-orange-400" />}
            title="Streak Tracking"
            desc="Know when an institution has been accumulating a position for 3, 5, or 10 consecutive days."
            color="orange"
          />
          <FeatureCard
            icon={<BarChart3 className="h-6 w-6 text-[#00d4ff]" />}
            title="Activity Heatmap"
            desc="Visual grid: tickers × funds. Color intensity = weight delta. See the whole market in one glance."
            color="cyan"
          />
          <FeatureCard
            icon={<Search className="h-6 w-6 text-[#a78bfa]" />}
            title="Ticker Search"
            desc="Look up any stock — see every fund holding it, their weights, recent changes, and options exposure."
            color="purple"
          />
          <FeatureCard
            icon={<GitFork className="h-6 w-6 text-rose-400" />}
            title="Divergence Alerts"
            desc="Flagged when funds within the same family take opposite positions. That's rare. That's a signal."
            color="rose"
          />
          <FeatureCard
            icon={<Bell className="h-6 w-6 text-[#5865F2]" />}
            title="Discord Alerts"
            desc="Paste your Discord webhook once. Get the full daily briefing delivered to your server every morning."
            color="indigo"
          />
        </div>
      </section>

      {/* Option decoder callout */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-[#1f2937]">
        <div className="bg-gradient-to-r from-[#111827] to-[#0f1729] border border-[#1f2937] rounded-2xl p-10 text-center">
          <div className="text-4xl mb-4">💰 🛡️</div>
          <h2 className="text-3xl font-bold mb-4">Option flow, decoded</h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-6">
            We translate covered calls and cash-secured puts into plain English — so you know what the fund actually thinks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
            <div className="bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-xl px-6 py-4 text-left">
              <div className="text-xs text-slate-400 mb-1">Cash-Secured Put</div>
              <div className="font-mono font-bold text-[#00ff88]">Bullish above $42</div>
            </div>
            <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-xl px-6 py-4 text-left">
              <div className="text-xs text-slate-400 mb-1">Covered Call</div>
              <div className="font-mono font-bold text-[#f59e0b]">Capping upside at $250</div>
            </div>
          </div>
        </div>
      </section>

      {/* Competitor comparison */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-[#1f2937]">
        <h2 className="text-3xl font-bold text-center mb-4">The data layer, vs. the alternatives</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
          Other tools charge $19–$500/mo for ETF data. TickerTrace gives it away free — and TraderDaddy
          turns it into trades. This compares the free data layer to what else is out there.
        </p>

        <div className="overflow-x-auto max-w-4xl mx-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#0f172a] text-slate-400 text-xs uppercase border-b border-[#1f2937]">
              <tr>
                <th className="px-4 py-3">Feature</th>
                <th className="px-4 py-3 text-center">TickerTrace</th>
                <th className="px-4 py-3 text-center">13F Filings</th>
                <th className="px-4 py-3 text-center">ETF Research Center</th>
                <th className="px-4 py-3 text-center">Cathie's ARK Tracker</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2937]">
              <CompRow feature="Update frequency" us="Daily" them="Quarterly" etfrc="Daily" ark="Daily" />
              <CompRow feature="Data delay" us="Same day" them="90+ days" etfrc="Same day" ark="Same day" />
              <CompRow feature="Cross-fund coverage" us="14 ETFs, 6 providers" them="All 13F filers" etfrc="Broad" ark="ARK only (6 ETFs)" />
              <CompRow feature="Conviction scoring" us="✓" them="✗" etfrc="✗" ark="✗" />
              <CompRow feature="Streak tracking" us="✓" them="✗" etfrc="✗" ark="✗" />
              <CompRow feature="Option flow decoded" us="✓" them="✗" etfrc="✗" ark="✗" />
              <CompRow feature="Divergence alerts" us="✓" them="✗" etfrc="✗" ark="✗" />
              <CompRow feature="Discord alerts" us="✓" them="✗" etfrc="✗" ark="✗" />
              <CompRow feature="Activity heatmap" us="✓" them="✗" etfrc="✗" ark="✗" />
              <CompRow feature="JSON API" us="✓" them="✗" etfrc="$29/mo" ark="✗" />
              <CompRow feature="Price" us="100% Free" them="Free" etfrc="$29/mo" ark="Free" />
            </tbody>
          </table>

        </div>
      </section>

      {/* Final dual CTA — single conversion moment after the comparison table */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-[#1f2937]">
        <div className="bg-gradient-to-r from-[#1a1430] via-[#0f1729] to-[#0a1a1f] border border-[#a78bfa]/20 rounded-2xl p-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Stop trading <span className="text-[#ff4444]">90-day-old</span> data.
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto mb-8">
            Pair the free daily holdings feed with TraderDaddy&apos;s live options flow. Same edge institutions
            pay six figures for — minus the prime brokerage.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://www.traderdaddy.pro/?ref=8DUEMWAJ"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white font-bold rounded-xl hover:from-[#9060f0] hover:to-[#6d28d9] transition-all shadow-lg shadow-[#a78bfa]/20"
            >
              🧠 Start with TraderDaddy <ArrowRight className="h-5 w-5" />
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#111827] border border-[#00d4ff]/40 text-white font-semibold rounded-xl hover:bg-[#1a2333] hover:border-[#00d4ff] transition-colors"
            >
              <Eye className="h-5 w-5 text-[#00d4ff]" /> Try the Free Data
            </Link>
          </div>
          <p className="text-[10px] text-slate-500 mt-5">
            Referral link to TraderDaddy disclosed. We use this stack ourselves — we built TickerTrace to feed it.
          </p>
        </div>
      </section>

      {/* Changelog — patch notes from the trenches */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-[#1f2937]">
        <h2 className="text-3xl font-bold text-center mb-3">Patch Notes from the Trenches</h2>
        <p className="text-slate-400 text-center mb-10 max-w-xl mx-auto text-sm">
          We ship constantly and document it honestly. Here&apos;s what landed recently.
        </p>

        <div className="max-w-2xl mx-auto space-y-4">
          <ChangelogEntry
            date="June 11, 2026"
            tag="feature"
            title="Hover over 'conv X.X' and it finally tells you what that number means"
            desc={"The conviction score is the most important number on the signals board and I'd never explained it — it just sat there as 'conv 5.2' with no context. Hover over it now and you get a plain-English breakdown: it's (# of funds in the move) × (weight % moved) × (average fund AUM). Basically a dollar-weighted measure of how hard institutions are pushing in one direction. More funds, bigger moves, larger funds = higher score. While I was at it, the 'P/C Ratio' KPI at the top now has a hover tooltip too — because 'P/C' reads as Price/Cost as easily as Put/Call, which is not great for a stat that's trying to show you directional positioning."}
          />
          <ChangelogEntry
            date="June 9, 2026"
            tag="housekeeping"
            title="Added a watchdog that checks the live site is actually fresh every day"
            desc={"After spending today untangling why the data silently froze, I wired in the thing that should've existed all along: a daily canary that pokes the live site, reads the date it's actually serving, and only makes noise if that date is genuinely stale (more than a business day behind). Quiet when everything's fine, loud the moment it's not — so a freeze gets caught in hours, not a week. I also added a guard on my own end that runs a quick check before any code leaves the server, so a dumb typo can't break the build and spam failure emails again (which, full disclosure, I did to myself twice today before this existed). Boring plumbing, but it's the difference between 'the site is always right' and 'the site is right until it quietly isn't.'"}
          />
          <ChangelogEntry
            date="June 9, 2026"
            tag="housekeeping"
            title="Pulled four REX funds that are getting liquidated next week"
            desc={"REX is shutting down a batch of its Growth & Income single-stock funds — trading halts today (June 9) and they liquidate June 16. Four of them were on our board: the MSTR one (MSII), the COIN one (COII), the HOOD one (HOII), and the PLTR one (PLTI). Tracking a fund that's about to stop existing just clutters the signals with noise, so I've pulled all four from the scraper and filtered them out of the dashboard. Two things worth saying: (1) the REX NVDA and TSLA funds (NVII, TSII) are NOT part of this liquidation, so they're staying. (2) ULTI — REX's flagship high-income fund — is totally unaffected and isn't going anywhere. I double-checked REX's actual liquidation notice before touching anything, because 'I think these are the ones' is how you accidentally delete a live fund. Their historical data is kept on disk, just hidden, so nothing's lost if any of this changes."}
          />
          <ChangelogEntry
            date="June 9, 2026"
            tag="bugfix"
            title="The real reason the data froze: a deploy script that quietly deleted itself"
            desc={"Okay, the full autopsy. The server that powers this site is supposed to pull each morning's fresh data automatically — there's a scheduled job that's been running every single day to do exactly that. Problem: the little script that job runs had been accidentally deleted months ago during an unrelated cleanup, and because it lived only on the server and was never saved into the project, nothing flagged it. So every day the scheduler dutifully fired, looked for the script, found nothing, shrugged, and moved on. Silent. For a week the site served stale numbers while a 'successful' job ran on schedule doing absolutely nothing. I rewrote the script, and — the important part — I saved it into the project itself this time, so the next cleanup can't delete it. I also sped it up: instead of syncing once a day, the server now checks for fresh data every 15 minutes. So from now on, when the morning scrape finishes, you'll see the new numbers within the quarter hour, automatically, forever, with nobody touching anything. The thing that should've been true this whole time is finally true."}
          />
          <ChangelogEntry
            date="June 9, 2026"
            tag="bugfix"
            title="Found the actual culprit behind the stale data — and made sure it can't freeze us again"
            desc={"Yesterday I fixed how the live box gets fresh data. Today I found why this morning's scrape didn't produce any. The daily run has a little extra step that backtests our signals against real prices, and Yahoo's data library quietly changed its output shape — even when you ask for one stock it now hands back a table instead of a single column, and our code choked on it, threw an error, and took the whole morning run down with it. The nasty part: that backtest runs BEFORE the step that commits and ships the day's holdings, so one hiccup in a nice-to-have chart was blocking the actual data everyone comes here for. Two fixes: patched the code to handle Yahoo's new shape, and — more importantly — demoted the backtest so it can never again block the data. If that chart breaks tomorrow, the holdings still ship and you'll never notice. Defense in depth, learned the hard way."}
          />
          <ChangelogEntry
            date="June 9, 2026"
            tag="bugfix"
            title="The site was reading a week stale — and the scraper was green the whole time"
            desc={"This one stung. The 'DATA UPDATED' date had been frozen for about a week, and I almost didn't believe it because the daily scrape never failed once — green every single morning. Turns out the failure was on the other end. The scraper runs in GitHub Actions and commits each day's fresh holdings to the repo, but the live API box reads its own copy of those files, and that copy only ever moved forward when I manually deployed by hand. So the moment I stopped hand-deploying after the early-June feature push, production quietly froze on that day's data while the repo marched on without it. Fix: every scrape now finishes by syncing the box itself — no human in the loop — and it hard-resets to match the repo so the server's perpetually-messy working tree can't make the update silently bail like it used to. I also wired the deploy to ping the API's health check at the end and fail loud if anything's down, so the next time production drifts I hear about it that morning instead of a week later. Lesson filed under 'green doesn't mean working.'"}
          />
          <ChangelogEntry
            date="June 3, 2026"
            tag="feature"
            title="Every stock has its own page now — with an institutional ownership chart over time"
            desc={"Click any ticker — on Stocks, the institutions board, or the trend overlay — and you land on a real stock page: a chart of its AUM-blended institutional weight over the last 30 trading sessions (so you can watch a name get accumulated or bled out over weeks, not just today), the day/week/month net flow with the same accumulation/distribution signal, and the full who-holds-it table with each fund's move today. NVDA's line ramps; AMZN's rolls over. Two smaller things shipped alongside: the trend overlay now lives on the dashboard home too (not just Changes), and its Day/Week/Month toggle re-sorts each group by the horizon you pick — tap 'Day' and the biggest movers of the session float to the top of each bucket. Also squashed a dumb bug where a stock's name sometimes showed an option contract string instead of the company name."}
          />
          <ChangelogEntry
            date="June 3, 2026"
            tag="feature"
            title="Accumulation/distribution trend — see a name get bought (or start getting dumped)"
            desc={"New overlay on the Changes page that answers the question you actually care about: is this a real trend or a one-day blip? For the biggest movers, I lay the institutional buying/selling over three horizons on the same axis — Month (faint), Week, Day (bright) — extending right for buying, left for selling. Three green bars marching right and you're looking at sustained accumulation (NVDA right now: the day bar is nearly as long as the whole month's, so most of the buying is happening NOW). The one I'm proud of: when a name's been accumulated all month but the bright Day bar suddenly flips red, it gets tagged 'Selling starting' — that's distribution beginning, the thing you want to catch before everyone else does (HOOD tripped it today). There's also 'Bottoming?' for the reverse. It's the first real read on institutional support/resistance over time, and it's only going to get better as the history deepens. (Rows are grouped by signal so all the accumulators sit together, and there's an All/Day/Week/Month toggle that spotlights one horizon across every name when you want to scan a single timeframe.)"}
          />
          <ChangelogEntry
            date="June 3, 2026"
            tag="feature"
            title="Funds and Stocks index pages — the two lists you'd expect to exist"
            desc={"If you've used a 13F tracker, you reach for two pages on instinct: a list of every fund, and a list of the most-owned stocks. We didn't have either as a standalone page — you had to know a ticker to look anything up. Now there's /funds (every fund we track, sortable by AUM / holdings count / A–Z, each row showing its top holding and whether it's an active-equity or option-income shop) and /stocks (every underlying ranked by how many funds hold it, with total weight across funds and today's net move — NVDA's in 11 of them, for the record). Both are in the top nav next to Dashboard, and every row clicks through to the fund or ticker detail you already had. This is the navigation backbone the site was missing."}
          />
          <ChangelogEntry
            date="June 3, 2026"
            tag="feature"
            title="A real 'what are institutions buying' board, and navigation that doesn't make you guess"
            desc={"Two things people kept asking for. (1) There's now an 'Institutions as a whole' board — I blend every stock-picking fund we track (Avantis, ARK, Corgi, Sprott, plus the BLOX and NestYield equity books) into one AUM-weighted portfolio and show you what that combined book is actually adding to and trimming, by day, week, or month. The pure option-income funds (YieldMax, Kurv, REX, Roundhill) are deliberately left out — their stock holdings churn for the options overlay, that's not conviction. It's on the /changes page and it's now the first thing you see on the dashboard. (2) Navigation: one consistent top bar across every page (Dashboard, Changes, Holdings, Fund Scores, Scanner) instead of the ad-hoc 'Back to Dashboard' links, and the dashboard now leads with the institutional board + a tracked-funds grid you can click straight into. If you've ever used HedgeFollow, it should feel familiar — minus the ads, because this is still free."}
          />
          <ChangelogEntry
            date="June 3, 2026"
            tag="bugfix"
            title="Avantis was hiding on the Changes page, and streaks were counting Saturdays"
            desc={"Housekeeping that was quietly wrong. (1) Avantis (AVUV/AVLV/AVMV) wasn't showing up under /changes — turns out that page was reading a payload capped at the 50 biggest moves, and a value fund holding 800 names moves each one by a hair, so they never made the cut. The page now reads the full, uncapped change list — and it gained a Day/Week/Month toggle, which is the right horizon for slow funds like these anyway. (2) Conviction Streaks were counting consecutive history *files*, not trading days — so a stray weekend or holiday scrape (including one corrupt Saturday file with 4x the normal rows) could pad a '5-day streak' with days the market was closed, or break a real one. Streaks and the week/month windows now skip non-market days entirely. (3) Added TBILL to the junk-ticker filter so it stops masquerading as a real position. (4) The dashboard was auto-scrolling you a screen-and-a-half down to the 'Ask TickerTrace' box the instant it loaded — the chat's scroll-to-bottom was firing on an empty conversation. Now it only scrolls once you've actually asked something, so the page opens where it should: on the leaderboard."}
          />
          <ChangelogEntry
            date="May 26, 2026"
            tag="feature"
            title="Whop app got the polish round it actually needed to ship"
            desc={"Yesterday's commit said \"TickerTrace is now a Whop app\" — technically true, but it lived on a tickertrace-whop.vercel.app URL nobody could remember, had no icon, and was asking for a comically over-privileged scope list (Create apps, Manage OAuth, Manage webhooks — all \"Required\", with the justification \"Um because I'm making apps duh\". Dev-tooling boilerplate that leaked in from my own scaffold.) Today: drew an actual TT monogram icon, pointed tt.mphinance.com at it via an Apache reverse-proxy on Vultr (the subdomain was sitting there from a tastytrade tool I haven't opened in months), and stripped every requested scope to zero — a read-only ETF dashboard does not need to manage your webhooks. Install it into your Whop, click through Signals, watch your members actually use it. It's a real app now."}
          />
          <ChangelogEntry
            date="May 26, 2026"
            tag="feature"
            title="TickerTrace is now a Whop app — free, embedded in your community"
            desc="Spent the day porting the dashboard into a Whop app. Same data, same conviction scoring, same fund and ticker pages, just wrapped in Whop's iframe SDK so it slots into any community as a tab. Five top-level tabs (Signals, Briefing, Changes, Divergences, Sectors), plus full per-fund and per-ticker drill-downs. JWT verification on every page so members are identified through Whop's own auth, no separate signup. Free, no tier gate, no upsell — pointed straight at the public api.tickertrace.pro so there's no second backend to maintain. Lives in whop-app/ in the repo. If you run a Whop and want to give your community a live read on what institutions are buying without making them leave Discord, this is the easy way."
          />
          <ChangelogEntry
            date="May 21, 2026"
            tag="feature"
            title="Divergences got a tug-of-war bar, the CBOE scanner got filters"
            desc="Two cleanups from the design review. (1) The Divergences section — where one fund is buying a name another fund is dumping — now has a tug-of-war bar under each row: green for total buying pressure, red for total selling, sized to scale. A lopsided fight ('everyone's loading up, one fund is bailing') is now obvious without doing mental math on the percentages. (2) The CBOE Options Scanner had no way to narrow things down — now there's a category toggle (Newly Optionable / Weekly ETFs / Weekly Equities) and a ticker search, so you can jump straight to what you care about instead of scrolling the whole timeline."
          />
          <ChangelogEntry
            date="May 21, 2026"
            tag="feature"
            title="Three new reads on the fund pages — strategy map, rolls, and fund flow"
            desc="Option-income funds got two new panels and everyone got a flow stat. (1) The Option Strategy Map shows, per underlying, where the spot price sits versus the strike the fund wrote — so you can see at a glance whether a covered call is safe (out of the money, fund keeps the premium) or about to get run over (in the money, shares called away). (2) An Option Rolls panel: when a fund closes one contract and opens another on the same name, that's a roll, not an exit, and it finally reads that way — 'ADI C437.5 → C415'. (3) Net Flow — the change in shares outstanding over the past week, as a percent. Shares outstanding only move when a fund creates or redeems units, so it's a clean read on whether money is coming in or leaving. We show a percent on purpose: the share counts are trustworthy, the per-share prices our scraper pulls are not — a bad price briefly had a $50M fund showing a $2.9B flow before we caught it. Net Flow appears wherever the provider reports shares outstanding (most option-income and Corgi funds); ARK and Avantis don't publish it, so it stays hidden there."
          />
          <ChangelogEntry
            date="May 21, 2026"
            tag="bugfix"
            title="Activity heatmap behaves itself on a phone now"
            desc="The big buying/selling matrix on the dashboard was eating most of the screen on a phone, and it wasn't obvious you could swipe it sideways. Trimmed its height on small screens so it's a panel and not a takeover, and added a little 'swipe for all funds →' nudge. The ticker column stays pinned while you scroll, so you never lose which row you're on. Desktop is untouched."
          />
          <ChangelogEntry
            date="May 21, 2026"
            tag="feature"
            title="Fund pages split in two — a value fund and a yield machine aren't the same animal"
            desc="Every fund page used to look identical, which never made sense. What you want from AVUV — what has Avantis been quietly accumulating? — is nothing like what you want from ULTY — how is the option book positioned? So there are two layouts now, and each fund gets the right one automatically. Active-equity funds (Avantis, ARK, Corgi, Sprott) lead with a Daily/Weekly/Monthly toggle, a New Entrances / Total Exits scoreboard, and a conviction-streak tracker — built to surface what's moving over a week or a month, not just today's noise. Option-income funds (YieldMax, Kurv, REX, Roundhill, the EGG funds) lead with the option book itself: contracts laid out as an expiration ladder, each tagged ITM / OTM / ATM so you can tell at a glance whether the fund's written calls are safe or about to get run over. Also quietly fixed: option open/close activity was being filtered out of the data entirely — it's back, so you can actually watch contracts get opened and closed."
          />
          <ChangelogEntry
            date="May 21, 2026"
            tag="bugfix"
            title="Some fund pages were 404ing — AVUV, GBUG, BLOX — and it was a self-own"
            desc="Click through to AVUV's profile lately and you got a dead page. Embarrassing, and entirely our fault. The site pre-builds every fund page ahead of time, and if our API so much as hiccuped during that build — a timeout on AVUV's chunky 800-holding payload, a one-off blip on BLOX — a 404 got baked into that page permanently, and it stayed broken until the next deploy. Fixed the whole class of bug: fund pages now build on demand instead of all at once, the API client retries a transient failure three times before giving up, and we finally tell a real 'this fund doesn't exist' apart from 'the API blipped for a second.' The first gets a proper branded page with a search box; the second gets a Try Again button and quietly heals itself on the next visit. No more tombstones."
          />
          <ChangelogEntry
            date="May 21, 2026"
            tag="feature"
            title="Weekly and monthly numbers that are actually weekly and monthly"
            desc="Three changes, all aimed at making a fund's page tell you what matters. (1) The 'weekly' view was counting files, not days — and since we don't scrape on a perfectly clean Mon-Fri rhythm (weekends sometimes sneak in, holidays leave gaps), 'a week ago' could drift anywhere from five days to nine. It's calendar-aware now: weekly compares against the snapshot closest to 7 days back, and monthly — brand new — against 30. For slower movers like Avantis and ARK, a month is the horizon where conviction actually shows up. (2) New positions and fully-closed ones now wear bright NEW / EXIT badges, with closed tickers struck through, so the real portfolio decisions stop hiding behind the daily +0.02% noise. (3) Options got honest labels — OPENED / CLOSED / ADDED / TRIMMED instead of buy/sell language — because an option closing is usually just an expiry or a roll, not a fund turning bearish. All of it is groundwork: every fund is now tagged either active-equity (the stock pickers — Avantis, ARK, Corgi, Sprott) or option-income (the YieldMax / Kurv / REX / Roundhill yield machines), because those two very different kinds of fund are about to get two very different pages."
          />
          <ChangelogEntry
            date="May 20, 2026"
            tag="feature"
            title="New page: CBOE Options Scanner — catch a stock the day it gets options"
            desc="Borrowed this one from TraderDaddy and ported the whole thing to Python. Every weekday morning we pull two CSVs straight from CBOE — the full Symbol Directory (~5,300 optionable stocks) and the Available Weeklys list — and diff them against yesterday. Two things it catches: a stock getting options listed for the very first time (rare, and a real tell that liquidity is showing up), and a ticker getting promoted to — or dropped from — weekly expirations. The new /options-listings page shows a timeline of what changed when, running totals, and an MWF Elite box that lights up on Monday/Wednesday/Friday 0DTE days. It doesn't touch any fund holdings data — it's pure CBOE market data, same for everyone. It's in the nav under 'Options'."
          />
          <ChangelogEntry
            date="May 20, 2026"
            tag="feature"
            title="Income funds got a 'Portfolio' panel — the fund's own book at a glance"
            desc="Open any options-income fund — ULTY, KYLD, the EGG funds, the YieldMax and REX weeklies — and there's a new Portfolio section on its profile page. The idea came from a sister project that tracks a personal options book; here we pointed the same layout at the fund itself. You get four metric cards (equity holdings, option contracts, equity weight, top-sector concentration), a sector-exposure bar built from the underlying equity holdings, and every option position rendered as a card — labeled covered call or cash-secured put, with strike, weight, and days-to-expiry. Negative weight means a written/short contract. It's all computed from the daily holdings snapshot we already had — no new data, just finally showing it properly. Plain-vanilla funds like AVUV and ARKK don't get the panel since they don't write options."
          />
          <ChangelogEntry
            date="May 20, 2026"
            tag="bugfix"
            title="Share buttons that don't get you flagged as a spammer"
            desc="Every time I tried to share TickerTrace on Reddit, the spam filter ate it — turns out Reddit auto-flags link posts to the same domain as advertising, and we'd wired the share button to do exactly that (a bare link drop). Fixed it properly: the Reddit button now opens a TEXT post with a real writeup pre-filled, including an honest 'full disclosure, it's my project' line — which is the thing that actually keeps a subreddit from nuking it. Substance plus transparency reads as a contribution, not an ad. Same fix on the dashboard's share row. Also added a plain 'Copy link' button everywhere, because the one share method no algorithm can flag is the one where you paste it in yourself."
          />
          <ChangelogEntry
            date="May 19, 2026"
            tag="feature"
            title="Dashboard UX pass — heatmap pivot, KPI tiles, clickable tickers, banished webhook config"
            desc="Friend with actual design taste sent over a critique; he was right on every count. Four changes: (1) Activity heatmap pivoted — tickers are now ROWS, fund columns grouped by provider with a colored band header and thin separators between families. Two-tier sticky header (provider band + fund row), sticky ticker column, dense 16px cells with a real hover tooltip instead of the browser's slow native title. Click a ticker to jump to its cross-fund view; click a fund to open its profile. (2) Backtest section is now three proper KPI tiles with win-rate progress bars, not text-heavy paragraphs. (3) Every ticker in Top Buys, Top Sells, Multi-Provider, Streaks, Notable Options, the Buying/Selling hero list, AND divergences is now a real link — click it and the cross-fund lookup populates instantly. (4) The Discord webhook configurator was hogging prime real estate right under the search bar — moved into an 'Integrations & sharing' collapsible at the bottom of the page, alongside the X/Reddit share buttons. Config doesn't belong above the fold."
          />
          <ChangelogEntry
            date="May 19, 2026"
            tag="feature"
            title="Live visitor counter pill on every page"
            desc="Bottom-left of every page now shows '● 7 live · 412 today · 2.8k/wk · 18k total' (or whatever the actual numbers are). It's a tiny FastAPI endpoint backed by a SQLite table — fires a sendBeacon on each page load and polls /api/v1/visits/live every 30 seconds. Visitor identity is sha256(ip + salt)[:16] so no IPs are stored. Rolls a 30-day window for the rolling stats; lifetime counter persists. The Sam-voice version: turns out the most engaging analytics is the one you don't have to log into."
          />
          <ChangelogEntry
            date="May 19, 2026"
            tag="feature"
            title="Ask TickerTrace now works with whatever LLM key you happen to have"
            desc="Provider dropdown for Gemini, Anthropic, OpenAI, or OpenRouter. Pick one, paste the matching key, ask away — each provider's API gets called direct from your browser, no server in the middle, key stored only in localStorage. The settings panel shows a 'key saved' dot next to providers you've already configured so you can switch around without re-pasting. Model field is optional with a sensible default per provider, but you can override it (gpt-5-mini, claude-sonnet-4-5, google/gemini-2.5-flash on OpenRouter, whatever). All eight TickerTrace tools work with all four providers — same tool definitions, three adapters that translate to each one's native function-calling format."
          />
          <ChangelogEntry
            date="May 19, 2026"
            tag="feature"
            title="Finally hooked up the GA property that was hiding in Firebase"
            desc="Turns out we already had a Google Analytics 4 property from the old Firebase setup — it just wasn't wired to the site. Added @next/third-parties Google Analytics component reading NEXT_PUBLIC_GA_ID from env. Set the measurement ID in Vercel and we get real funnel data alongside Vercel's pageview counts. Two analytics tools talking past each other is fine; they're complementary."
          />
          <ChangelogEntry
            date="May 19, 2026"
            tag="feature"
            title="Ask TickerTrace is BYOK now — bring your own Gemini key"
            desc="Original version used Claude Sonnet through a server route with our API key. Cost-per-question would have been real money at scale, and Sonnet is overkill for 'who's buying GOOGL'. Pivoted: swapped to Gemini 2.5 Flash, ripped out the server route entirely, made the whole thing browser-side with a BYOK API key. Get a free key at aistudio.google.com, paste it in, your key never leaves your browser (literally stored in localStorage, we have no way to see it). The Anthropic SDK got deleted alongside the change."
          />
          <ChangelogEntry
            date="May 19, 2026"
            tag="feature"
            title="Wired up Vercel Analytics — turns out we had zero visibility into traffic"
            desc="Embarrassingly: until now we had no idea how many people were hitting this site, what pages they were bouncing on, or where they came from. Added Vercel Web Analytics (privacy-respecting, no cookies, free tier covers anything we're doing). One import in the layout, one component. Should have done this on day one."
          />
          <ChangelogEntry
            date="May 19, 2026"
            tag="feature"
            title="Ask TickerTrace — a chat box that actually knows what it's talking about"
            desc="New 'Ask TickerTrace' card on the dashboard. Powered by Claude with tool use, backed by 8 tools that wrap our own API: signals, changes, fund detail, ticker detail, sector flow, divergences, signal performance, fund list. Ask 'who's accumulating GOOGL', 'show me ARK's biggest moves', 'do these signals actually make money' — get real answers with real numbers pulled from real holdings data. The reason most AI chat boxes on fintech sites are useless is that they have no proprietary data to ground on. We do. Requires ANTHROPIC_API_KEY in Vercel env to enable; gracefully shows an error if not configured."
          />
          <ChangelogEntry
            date="May 19, 2026"
            tag="feature"
            title="Did the signals work? Now there's an honest answer."
            desc="Backtested every historical buy and sell signal against the underlying's price 30 days later. 23,365 graded signals so far. Headline: buying signals win 56.8% of the time with a +2.09% median return. Selling signals lose money (the underlying went UP +4.06% on average after a sell, win rate just 33.8%). Per-fund-family breakdown on the dashboard. New card right at the top because if our signals don't work, you should know. Cron regenerates this daily and the JSON ships as a static file — the dashboard reads it directly, no API call needed. Options-based signals are excluded for v1 (their P&L depends on Δ/θ/σ, not just spot price)."
          />
          <ChangelogEntry
            date="May 19, 2026"
            tag="bugfix"
            title="Deleted ~3,000 lines of dead Firebase/Stripe/auth code"
            desc="The patch notes have said 'Stripe + Firebase ripped out' for weeks but the components, the AuthProvider wrapping the whole tree, and firebase as a dependency were all still riding along. Cleaned house: deleted auth-context / auth-modal / auth-button / pro-gate / lib/firebase / the entire shared-auth/ parallel implementation. Removed firebase from package.json (and 67 transitive packages with it). Side effect catch: the dashboard had been double-rendering signals (top-3 'free' slice followed by the full list inside a no-op ProGate). Build dropped from 49s to 19s. Net: -3,046 lines."
          />
          <ChangelogEntry
            date="May 18, 2026"
            tag="bugfix"
            title="Cross-fund ticker lookup was showing every Corgi fund 8 times"
            desc="If you searched any stock that a Corgi fund holds, the result card was repeating the same fund up to 8 times with slightly different weights — 6,294 duplicate rows across 619 (fund, ticker) keys, all from Corgi Funds. Turns out the Corgi JSON API returns the full historical time-series, not just today's snapshot, and the scraper was dumping every row into the daily CSV. Fixed at the source (scraper now collapses to the latest holding_date per fund/ticker before writing the CSV) and added a defensive dedup at the API read layer so existing dirty data displays correctly without waiting for tomorrow's scrape. Added regression tests so this exact shape of bug can't sneak in via a future provider."
          />
          <ChangelogEntry
            date="May 18, 2026"
            tag="feature"
            title="Made the ticker search and its results actually navigable"
            desc="The search bar was tucked into a cramped row with the Discord webhook and share buttons; first-time visitors had no idea you could look up any ticker. Promoted it to its own labeled row with a clearer purpose hint. The result card was also a dead-end — you'd see CMAG and CQTM listed as holding GOOGL but had to copy-paste 'CMAG' into the URL to actually see what else CMAG holds. Now the fund badges in the result are clickable links to the fund's profile page."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="bugfix"
            title="Frontend was calling the wrong API hostname this whole time"
            desc="The dashboard was pointed at api.tickertrace.mphinance.com — which has no Apache vhost on Vultr, so requests fell through to a default vhost that serves the wrong TLS cert AND can't reverse-proxy to FastAPI. Result: 503s on every API call, and the build failing because it couldn't fetch fund metadata. The actual working domain has been api.tickertrace.pro all along (real vhost, valid cert, ProxyPass to localhost:8100). CLAUDE.md had been lying about it being the 'only working' domain. Flipped lib/api.ts, next.config.ts, fund-effectiveness.tsx, effectiveness/page.tsx, and the two landing/dashboard API doc links back to .pro. Local build now generates all 56 fund pages cleanly."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="bugfix"
            title="Vercel builds no longer brick when the API is unreachable"
            desc="The dashboard and fund pages had empty-state fallbacks for null payloads, but the default apiFetch was throwing on network errors and non-2xx responses — so the fallback never got a chance to render. Made apiFetch swallow network errors when throwOnError:false is set, threaded that option through dashboard's signals/activity calls, and wrapped fund/[ticker]'s generateStaticParams in try/catch. Builds now pass even if the API is hung, 503-ing, or unreachable. Pages render on demand once it's back."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="bugfix"
            title="README finally caught up to reality"
            desc="The README was last touched March 2 and was lying about basically everything: said we tracked 15 funds (it's 56), said the API needed an API key (it's been fully open since v2), said the data layer was holdings.ts (it's lib/api.ts now), still had a whole Authentication section for Stripe and Firebase (both ripped out months ago). Rewrote it. Added the missing endpoints, the MCP server section, three screenshots near the top, and the current gotchas list. The old one was a trap."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="bugfix"
            title="Discord webhook preview was also broken (s.funds is string[])"
            desc="Two preview rows in the dashboard embed card still did s.funds.map(f => f.fund), assuming the pre-review-#10 object shape. ApiSignal.funds is a plain string array now. The equivalent fix landed for the text-format path in commit 969b874 but missed these two JSX lines. Same one-liner: just .join(', ') the array."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="bugfix"
            title="Unbroke the Vercel build (ApiApiChangeRecord)"
            desc="Fund profile page had ApiApiChangeRecord in the import — Api repeated, classic. TypeScript caught it, Vercel red-X'd the deploy, the fund pages would have been broken if it hadn't. Renamed to ApiChangeRecord (the actual export) in the import and the function signature. Build's green again."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="feature"
            title="Landing page reframed as a stack pitch"
            desc="The free TickerTrace dashboard is no longer the headline product on the landing page. TraderDaddy is the execution layer, TickerTrace is the free data layer underneath. Two CTAs above the fold — try the data, or pay for the trades. Dropped the Founders Partner section and the 'request a fund' callout (nobody used them); kept the comparison table and Patch Notes because both still earn their space."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="feature"
            title="Dashboard now renders from the API (P1 #10 finale)"
            desc="The dashboard, changes page, and fund profile pages all fetch from the FastAPI server via lib/api.ts instead of recomputing in TypeScript. One source of truth, real customer of our own API, no more drift between TS and Python. Added /api/v1/briefing, /api/v1/activity, and /api/v1/holdings endpoints to cover everything the dashboard needs. Ported the significance threshold, streak tracking, and option-signal decoder to Python with snapshot tests. holdings.ts is now reduced to static reference data (FUND_PROVIDERS, FUND_AUM, PROVIDER_ORDER) plus the single raw-row consumer at /holdings."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="feature"
            title="Corgi Funds went live — 16 thematic ETFs in the data"
            desc="Manually triggered today's scrape to bring in the Corgi Funds family that was added to the scraper this morning. EUV, CMAG, CQTM, XA, EYES, KYC, GNMX, AV, DOCK, WATS, GLAM, NYNY, STYL, WNDR, FDRS, FDRX. NYNY returned 530 holdings on the first try. Whoever built their API actually shipped it before launch — that's rare."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="feature"
            title="tickertrace.pro/api/signals now proxies to FastAPI"
            desc="The legacy /api/signals route used to recompute the entire signal payload in TypeScript from the CSV files — a parallel implementation of api/data.py. It now proxies through to the FastAPI server. One source of truth for the public JSON, and external consumers (agents, your other service) get the exact same data as the dashboard. Also shipped lib/api.ts — a typed TS client for the whole FastAPI surface, ready for future migrations."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="feature"
            title="CI exists now — finally"
            desc="Added a GitHub Actions workflow that runs pytest and next build on every push and PR. Also runs an AST parse check on the key Python files because the one time I trusted myself, I shipped a half-truncated data.py. Never again. Catches breakage before it hits Vultr."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="feature"
            title="Tagged endpoints in /docs"
            desc="The Swagger page used to be one undifferentiated wall of endpoints. Now they're grouped: public (the data), marketing (the TraderDaddy hand-off), auth (vestigial email/password endpoints). Easier to scan when you're trying to figure out what this API actually does."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="feature"
            title="Scraper now retries when fund providers cough"
            desc="Wrapped every HTTP fetch in the scraper with exponential-backoff retry (3 attempts, 2-10s waits). Used to be: REX returns a transient 503, we lose ULTI for the day, dashboard goes dark on that fund until tomorrow. Now: it retries quietly and keeps going. Skipped parallelizing the loop — the CUSIP resolver caches to a JSON file and concurrent writes would corrupt it. Worth doing eventually."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="feature"
            title="Structured logs with request IDs"
            desc="The API now emits JSON log lines with a request_id, path, method, status, and duration_ms attached to every entry. docker logs tickertrace-api is now greppable. Every response also carries an x-request-id header — when something breaks you can correlate the client error to the exact server log line that produced it."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="feature"
            title="55 new tests — the data layer can't drift anymore"
            desc="Added tests/fixtures/ with two days of synthetic holdings CSVs, plus tests for compute_daily_changes, get_signals, get_divergences, get_full_payload, and 38 cases on the junk-ticker filter. Includes a regression guard that fails the build if get_full_payload ever recomputes the changes list more than once (the bug we just fixed). pytest tests/ now exists as a thing."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="bugfix"
            title="Stopped committing the SQLite binary"
            desc="GitHub Actions was happily git add'ing data/holdings.db every day. A binary file that diffs to garbage. Bloating the repo by ~1MB/day. Gitignored it. The scraper rebuilds it from CSVs anyway."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="feature"
            title="tickertrace.pro/api/v1/* now works"
            desc="Added a Next.js rewrite so the Vercel domain proxies /api/v1/* to the FastAPI server on Vultr. One domain to advertise instead of two. The Next.js /api/signals route (no v1) still works as before — Next prefers local routes over rewrites."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="feature"
            title="API v2 — ripped out Stripe + Firebase, hardened the rest"
            desc="If we're not charging anyone, we don't need Stripe. If everyone's getting in, we don't need Firebase. Both are gone from the API and the Docker image. Also: tightened CORS to an actual allowlist, threaded SQLite connections (no more open/close per call), moved DB init into FastAPI lifespan (no more racing migrations on startup), and added per-IP rate limits to the public endpoints because the whole thing is open now and we'd rather not get hammered."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="feature"
            title="Stopped recomputing the same data four times per request"
            desc="The /api/v1/signals endpoint was calling compute_daily_changes() four times — once for signals, once for changes, once for sector flow, once for divergences. Each call re-read the CSV. Now it computes once and threads the result through. Free speed."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="bugfix"
            title="Junk-ticker filter was paranoid"
            desc="The old filter said 'if it ends in XX, it's junk'. That's true for FGXXX and SPAXX. It's also true for any random ticker someone might list ending in XX. Replaced the tower of heuristics with a positive allowlist on ticker shape (starts with a letter, 1-10 alphanumeric chars). CUSIPs and identifiers fail this naturally; real tickers pass."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="feature"
            title="Threw the paywall in the trash"
            desc="Auth UI is gone. No login, no API key, no Pro tier. Everything's free — every endpoint, every signal, every fund. We're feeding this data into TraderDaddy.Pro anyway, so we figured we'd just open the spigot. Code for auth is still there; we just stopped rendering it. If we change our minds, it's one import away."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="feature"
            title="Pointed at TraderDaddy.Pro — that's where this data goes to actually trade"
            desc="Added a ribbon, a button, and a hand-off card on the landing page. TickerTrace tracks what they're buying. TraderDaddy is where you do something about it. Yes, the link has a referral code. Yes, we tell you it's a referral link. We're trying to be decent."
          />
          <ChangelogEntry
            date="May 16, 2026"
            tag="bugfix"
            title="Stopped advertising '$15/mo Pro' that nobody was being charged for"
            desc="The pricing card was lying to people. Replaced it with a 'The Data → The Trade' card pair that's actually honest about what's free (everything) and where to go next (TraderDaddy). Also caught one comparison table row still saying 'Free / $15mo' — that's been there for weeks."
          />
          <ChangelogEntry
            date="Mar 4, 2026"
            tag="feature"
            title="Strategy-aware effectiveness scoring"
            desc="Every option-income fund now has a strategy profile pulled from its actual prospectus. BLOX selling ATM calls? That's on-strategy — not a penalty. EGGS mandates hedging? The hedge ratio metric now weighs 25% for them, 8% for funds that don't. Scoring finally matches what the fund says it does."
          />
          <ChangelogEntry
            date="Mar 4, 2026"
            tag="feature"
            title="Institutional-grade effectiveness engine"
            desc="Rebuilt the entire scoring system from scratch. Black-Scholes Greeks, notional-weighted scoring, continuous Gaussian curves instead of step-function cliffs. Seven metric categories: strike selection, DTE management, spread efficiency, roll behavior, premium capture, hedge ratio, concentration risk. A DTE of 6.9 and 7.0 now score almost identically. As they should."
          />
          <ChangelogEntry
            date="Mar 3, 2026"
            tag="feature"
            title="Added EGGQ, EGGY, EGGS — NestYield enters the chat"
            desc="Three new active equity + options overlay ETFs from NestYield (Tidal). EGGQ does OTM call spreads on tech. EGGY targets 25% yield with selective covered calls. EGGS hedges with laddered puts and targets capital preservation. Scraper, API, dashboard, and effectiveness engine all updated in one session."
          />
          <ChangelogEntry
            date="Mar 3, 2026"
            tag="bugfix"
            title="Junk ticker filtering was lying to us"
            desc="Found stale provider maps and inconsistent junk filtering. Some tickers were getting through that shouldn't have been, others were being eaten. Centralized everything into _is_junk_ticker() and applied it everywhere. Also cleaned up the fund profile categorization because the old one was held together with hopes and dreams."
          />
          <ChangelogEntry
            date="Mar 2, 2026"
            tag="feature"
            title="Share buttons on the dashboard"
            desc="Added X and Reddit share buttons right next to the Discord webhook. Your friends should know what ARK is doing. Also quietly fixed every single URL still pointing at the old Vercel subdomain — 10 references, 6 files. The domain has been tickertrace.pro for weeks. We noticed."
          />
          <ChangelogEntry
            date="Mar 2, 2026"
            tag="bugfix"
            title="ULTI fund was invisible for a full day"
            desc="The REX CSV returns holdings under the internal name 'REX_ULTI'. Our scraper trusted the source data. That was a mistake. Then our CUSIP resolver labeled every ticker 'OTHER'. 'OTHER' is in our junk filter. 88 rows, zero visible. Three engineers, zero brain cells."
          />
          <ChangelogEntry
            date="Mar 2, 2026"
            tag="feature"
            title="Custom domain: tickertrace.pro"
            desc="We bought the domain, pointed DNS at Namecheap, then our AI tried to fight Apache for port 80 by installing nginx. On a server that already had Apache. It lost. We used Apache instead. SSL via Let's Encrypt."
          />
          <ChangelogEntry
            date="Mar 2, 2026"
            tag="feature"
            title="Firebase Auth (Google sign-in)"
            desc="Replaced our hand-rolled auth with Firebase. Had to generate a service account key from the console because gcloud wasn't installed. The AI tried to navigate the Firebase console in a browser. It could not. Instructions were given instead."
          />
          <ChangelogEntry
            date="Mar 1, 2026"
            tag="feature"
            title="Added ULTI, SLTY, BLOX funds"
            desc="Three new ETFs in one session. ULTI (REX Shares) required a POST request to download CSV. SLTY (YieldMax) just worked. BLOX was fine until we realized their CSV uses 'Account' as their ticker column. Scraper didn't care. Dashboard did."
          />
          <ChangelogEntry
            date="Mar 1, 2026"
            tag="bugfix"
            title="Stripe checkout button did nothing"
            desc="The 'Upgrade to Pro' button was pointing to localhost:8100. On production. For 12 hours. Nobody noticed because we didn't have any users yet. Fixed by someone who was definitely not the same person who wrote it."
          />
          <ChangelogEntry
            date="Feb 28, 2026"
            tag="feature"
            title="CUSIP → Ticker resolver"
            desc="Some funds only publish CUSIP identifiers (9-char codes), not ticker symbols. Built a cache + OpenFIGI fallback. Cache hit rate: ~95%. Cost: $0. Time spent debugging why 'N97284108' wasn't resolving: too long."
          />
        </div>

        <div className="mt-10 text-center">
          <p className="text-slate-500 text-xs mb-4">Share it — the Reddit button posts a real writeup, not a flagged link</p>
          <ShareButtons
            url="https://tickertrace.pro"
            tweet="This ETF tracker has the most honest changelog I've ever seen. 💀"
            redditTitle="I built a free tracker for what institutional ETFs are buying and selling each day"
            redditText={[
              "I kept wanting to know what funds like ARK, Avantis, and the YieldMax / Kurv income ETFs were actually doing day to day — so I built something that pulls their published holdings every morning and diffs them.",
              "",
              "It's free, no signup, no API key: https://tickertrace.pro",
              "",
              "What it does:",
              "- Daily position changes per fund — new positions, exits, adds, trims",
              "- Conviction-scored signals when multiple funds move the same ticker the same way",
              "- Cross-fund divergences — one fund buying what another is dumping",
              "- A CBOE scanner that flags stocks getting options listed for the first time",
              "",
              "Full disclosure: it's my project. I'm not selling anything — the data API is completely open. Mostly looking for feedback on what's missing.",
            ].join("\n")}
            linkedin
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1f2937] py-10 text-center text-slate-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-[#00d4ff] font-bold">TICKER<span className="text-white">TRACE</span></span>
          <span>·</span>
          <span>giving retail a fighting chance</span>
        </div>
        <p className="text-xs">
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          {' · '}
          <Link href="/holdings" className="hover:text-white transition-colors">Holdings</Link>
          {' · '}
          <Link href="https://api.tickertrace.pro/docs" target="_blank" className="hover:text-white transition-colors">API Docs</Link>
          {' · '}
          <a href="mailto:mphinance@gmail.com" className="hover:text-white transition-colors">Contact</a>
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color }: {
  icon: React.ReactNode; title: string; desc: string; color: string;
}) {
  const borders: Record<string, string> = {
    green: 'border-[#00ff88]/20 hover:border-[#00ff88]/40',
    orange: 'border-orange-400/20 hover:border-orange-400/40',
    cyan: 'border-[#00d4ff]/20 hover:border-[#00d4ff]/40',
    purple: 'border-[#a78bfa]/20 hover:border-[#a78bfa]/40',
    rose: 'border-rose-400/20 hover:border-rose-400/40',
    indigo: 'border-[#5865F2]/20 hover:border-[#5865F2]/40',
  };
  return (
    <div className={`bg-[#111827] border ${borders[color] || 'border-[#1f2937]'} rounded-xl p-6 transition-colors`}>
      <div className="mb-3">{icon}</div>
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function CompRow({ feature, us, them, etfrc, ark }: {
  feature: string; us: string; them: string; etfrc: string; ark: string;
}) {
  const isCheck = (v: string) => v === '✓';
  const isX = (v: string) => v === '✗';
  const cellClass = (v: string) => `px-4 py-2.5 text-center text-xs font-mono ${isCheck(v) ? 'text-[#00ff88]' : isX(v) ? 'text-[#ff4444]/40' : 'text-slate-300'
    }`;
  return (
    <tr className="hover:bg-[#1a2333]/30">
      <td className="px-4 py-2.5 text-sm text-slate-300 font-medium">{feature}</td>
      <td className={`${cellClass(us)} bg-[#00d4ff]/5 font-bold`}>{us}</td>
      <td className={cellClass(them)}>{them}</td>
      <td className={cellClass(etfrc)}>{etfrc}</td>
      <td className={cellClass(ark)}>{ark}</td>
    </tr>
  );
}

function ChangelogEntry({ date, tag, title, desc }: {
  date: string; tag: 'feature' | 'bugfix' | 'housekeeping'; title: string; desc: string;
}) {
  const tagStyle = tag === 'bugfix'
    ? 'bg-[#ff4444]/10 text-[#ff4444] border-[#ff4444]/20'
    : tag === 'housekeeping'
    ? 'bg-[#8b9cb3]/10 text-[#8b9cb3] border-[#8b9cb3]/20'
    : 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20';
  return (
    <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 hover:border-[#2a3a52] transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs text-slate-500 font-mono">{date}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tagStyle}`}>
          {tag}
        </span>
      </div>
      <h3 className="font-bold text-white text-sm mb-1">{title}</h3>
      <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}
