import Link from 'next/link';
import { ReferralTracker } from '@/components/referral-tracker';
import { ShareButtons } from '@/components/share-buttons';
import { DataFreshness } from '@/components/data-freshness';
import { ChangelogList } from '@/components/changelog-list';
import { CHANGELOG_ENTRIES } from '@/lib/changelog';
import {
  TrendingUp, Zap, BarChart3, Search, GitFork, Bell,
  ArrowRight, CheckCircle2, Clock, Eye, Layers,
} from 'lucide-react';
import React from 'react';

export const revalidate = 86400; // daily revalidation for landing page

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-white font-sans overflow-x-hidden">
      {/* Referral tracker — invisible, captures ?ref= param */}
      <ReferralTracker />

      {/* Nav — on mobile this collapses to just logo + CTA. The four
          secondary links (Dashboard/Effectiveness/Options/API) and the
          TraderMatrix badge don't fit next to the CTA under ~500px and
          were overflowing the viewport with no scroll affordance; all of
          them stay one tap away via the CTA → /dashboard → bottom nav. */}
      <nav className="sticky top-0 z-50 bg-canvas/80 backdrop-blur-md border-b border-rule">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <span className="text-lg sm:text-xl font-bold text-equity tracking-tight shrink-0">
            TICKER<span className="text-white">TRACE</span>
          </span>
          <div className="hidden md:flex items-center gap-4">
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
              href="https://www.tradermatrix.pro/?ref=MPHINANCE"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-meta-bright hover:text-white transition-colors border border-meta/30 hover:border-meta/60 px-3 py-1.5 rounded-md bg-meta/5"
              title="We track. TraderMatrix trades."
            >
              🧠 TraderMatrix
            </a>
          </div>
          <Link
            href="/dashboard"
            className="px-3 py-2 sm:px-4 bg-equity text-canvas text-sm font-bold rounded-lg hover:bg-white transition-colors shrink-0 whitespace-nowrap"
          >
            Open Intel →
          </Link>
        </div>
      </nav>

      {/* Open-access ribbon */}
      <div className="bg-gradient-to-r from-meta/10 via-equity/10 to-buy/10 border-b border-meta/20">
        <div className="max-w-6xl mx-auto px-6 py-2.5 flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
          <span className="text-xs text-slate-300">
            <span className="text-meta font-bold">TraderMatrix</span> trades the flow.{' '}
            <span className="text-equity font-bold">TickerTrace</span> shows you the daily ETF data underneath — free, no login.
          </span>
          <span className="hidden sm:inline text-slate-600">·</span>
          <a
            href="https://www.tradermatrix.pro/?ref=MPHINANCE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-meta-bright hover:text-white inline-flex items-center gap-1 transition-colors"
          >
            See the live flow →
          </a>
        </div>
      </div>

      {/* Hero — front-run institutions, two products in one stack */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-meta/10 border border-meta/20 text-meta-bright text-xs font-semibold px-4 py-2 rounded-full mb-8">
          <span className="w-2 h-2 rounded-full bg-meta animate-pulse" />
          LIVE INSTITUTIONAL FLOW · 100+ ACTIVE TRADERS
        </div>
        <DataFreshness />

        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-6">
          Front-run the institutions.<br />
          <span className="bg-gradient-to-r from-meta via-equity to-buy bg-clip-text text-transparent">
            Before retail gets the memo.
          </span>
        </h1>

        <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-4 leading-relaxed font-medium">
          Two products. One funnel.
        </p>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          <span className="text-meta font-bold">TraderMatrix</span> shows what the smart money is doing
          in real time — sweeps, blocks, golden sweeps, decoded by AI.
          <span className="text-equity font-bold"> TickerTrace</span> is the daily ETF positioning layer
          underneath: what 71 institutional funds are actually buying, normalized and free.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://www.tradermatrix.pro/?ref=MPHINANCE"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-meta to-[#7c3aed] text-white font-bold text-lg rounded-xl hover:from-[#9060f0] hover:to-[#6d28d9] transition-all shadow-lg shadow-meta/20"
          >
            🧠 Trade the Flow — TraderMatrix <ArrowRight className="h-5 w-5" />
          </a>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-surface border border-equity/40 text-white font-semibold text-lg rounded-xl hover:bg-surface-hover hover:border-equity transition-colors"
          >
            <Eye className="h-5 w-5 text-equity" /> Preview the Data — Free
          </Link>
        </div>

        <p className="text-xs text-slate-600 mt-6">
          Both products run on the same open API. No signup required to see today&apos;s data.
        </p>
      </section>

      {/* The problem — 90-day delay explained */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-rule">
        <h2 className="text-3xl font-bold text-center mb-4">Why retail loses</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
          Speed of information. By the time the public sees institutional positioning, the trade is months old.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-sell/5 border border-sell/20 rounded-2xl p-8">
            <Clock className="h-10 w-10 text-sell mb-4" />
            <h3 className="text-xl font-bold mb-3">What your broker shows you</h3>
            <p className="text-slate-400 leading-relaxed mb-4">
              13F filings. Updated <span className="text-sell font-bold">quarterly</span>, published with a
              45-day delay. By the time you see it, the trade is 90+ days old and the move already happened.
            </p>
            <div className="font-mono text-sm text-sell/60">Filed: Q2 2026 → You see it: Aug 2026</div>
          </div>
          <div className="bg-buy/5 border border-buy/20 rounded-2xl p-8">
            <Eye className="h-10 w-10 text-buy mb-4" />
            <h3 className="text-xl font-bold mb-3">What this stack shows you</h3>
            <p className="text-slate-400 leading-relaxed mb-4">
              Institutional ETFs publish full holdings <span className="text-buy font-bold">every market day</span>.
              TickerTrace scrapes + normalizes; TraderMatrix layers on real-time options flow.
            </p>
            <div className="font-mono text-sm text-buy/60">Daily holdings + per-minute flow → live edge</div>
          </div>
        </div>
      </section>

      {/* The Stack — how the two products fit together */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-rule">
        <h2 className="text-3xl font-bold text-center mb-4">The stack</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
          Two layers, one workflow. The free data layer feeds the paid execution layer.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-surface-gradient to-surface border border-meta/30 rounded-2xl p-8 shadow-lg shadow-meta/10">
            <div className="text-xs font-bold text-meta-bright uppercase tracking-widest mb-3">Layer 1 · Execution</div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🧠</span>
              <h3 className="text-2xl font-black text-white">TraderMatrix.Pro</h3>
            </div>
            <p className="text-slate-300 mb-6">
              Real-time options flow detection. Sweeps, blocks, golden sweeps tracked as they hit the tape —
              with institutional conviction scoring and an AI coach that translates each signal into plain English.
            </p>
            <ul className="space-y-2 mb-8 text-sm text-slate-300">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-meta shrink-0" />SWEEP / BLOCK / GOLDEN SWEEP flow detection</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-meta shrink-0" />TraderLady AI — every flow translated in real time</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-meta shrink-0" />7 screeners, GEX levels, congressional trades</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-meta shrink-0" />1-minute refresh · 24/7 market coverage</li>
            </ul>
            <a
              href="https://www.tradermatrix.pro/?ref=MPHINANCE"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-3 rounded-xl font-bold transition-all bg-gradient-to-r from-meta to-[#7c3aed] text-white hover:from-[#9060f0] hover:to-[#6d28d9]"
            >
              Start Free Trial →
            </a>
          </div>

          <div className="bg-gradient-to-br from-surface-gradient to-surface border border-equity/30 rounded-2xl p-8 shadow-lg shadow-equity/10">
            <div className="text-xs font-bold text-equity uppercase tracking-widest mb-3">Layer 0 · Free Data</div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📊</span>
              <h3 className="text-2xl font-black text-white">TickerTrace</h3>
            </div>
            <p className="text-slate-300 mb-6">
              Daily ETF holdings, normalized across providers. 71 institutional funds tracked, every position
              every day, with cross-fund conviction scoring and divergence detection. No login, no paywall.
            </p>
            <ul className="space-y-2 mb-8 text-sm text-slate-300">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-equity shrink-0" />ARK · Avantis · Amplify · Corgi · YieldMax · Roundhill · Kurv · REX · NestYield · Sprott · NicholasX</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-equity shrink-0" />Conviction scoring · streak tracking · sector flow</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-equity shrink-0" />Activity heatmap · divergence alerts · option decoder</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-equity shrink-0" />Open JSON API · same data TraderMatrix reads</li>
            </ul>
            <Link
              href="/dashboard"
              className="block text-center py-3 rounded-xl font-bold transition-colors bg-equity text-canvas hover:bg-white"
            >
              Open the Dashboard →
            </Link>
          </div>
        </div>
      </section>

      {/* Features grid — capabilities across the stack */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-rule">
        <h2 className="text-3xl font-bold text-center mb-4">What you get</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
          The free data layer hands you everything below. The paid execution layer turns it into trades.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<TrendingUp className="h-6 w-6 text-buy" />}
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
            icon={<BarChart3 className="h-6 w-6 text-equity" />}
            title="Activity Heatmap"
            desc="Visual grid: tickers × funds. Color intensity = weight delta. See the whole market in one glance."
            color="cyan"
          />
          <FeatureCard
            icon={<Search className="h-6 w-6 text-meta" />}
            title="Ticker Search"
            desc="Look up any stock — see every fund holding it, their weights, recent changes, and options exposure."
            color="purple"
          />
          <FeatureCard
            icon={<GitFork className="h-6 w-6 text-rose-400" />}
            title="Divergence Alerts"
            desc="Flagged when funds are simultaneously buying and selling the same ticker. When it's the same fund family disagreeing — that's the rarest signal."
            color="rose"
          />
          <FeatureCard
            icon={<Layers className="h-6 w-6 text-meta" />}
            title="Layering Radar"
            desc="When 3+ independent fund families each open the same brand-new position within days, that's smart money quietly agreeing. The entry order is the part quarterly 13Fs can never show you."
            color="purple"
          />
        </div>
      </section>

      {/* Option decoder callout */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-rule">
        <div className="bg-gradient-to-r from-surface to-surface-gradient border border-rule rounded-2xl p-10 text-center">
          <div className="text-4xl mb-4">💰 🛡️</div>
          <h2 className="text-3xl font-bold mb-4">Option flow, decoded</h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-6">
            We translate covered calls and cash-secured puts into plain English — so you know what the fund actually thinks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
            <div className="bg-buy/10 border border-buy/20 rounded-xl px-6 py-4 text-left">
              <div className="text-xs text-slate-400 mb-1">Cash-Secured Put</div>
              <div className="font-mono font-bold text-buy">Bullish above $42</div>
            </div>
            <div className="bg-warning/10 border border-warning/20 rounded-xl px-6 py-4 text-left">
              <div className="text-xs text-slate-400 mb-1">Covered Call</div>
              <div className="font-mono font-bold text-warning">Capping upside at $250</div>
            </div>
          </div>
        </div>
      </section>

      {/* Competitor comparison */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-rule">
        <h2 className="text-3xl font-bold text-center mb-4">The data layer, vs. the alternatives</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
          Other tools charge $19–$500/mo for ETF data. TickerTrace gives it away free — and TraderMatrix
          turns it into trades. This compares the free data layer to what else is out there.
        </p>

        <div className="overflow-x-auto max-w-4xl mx-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-alt text-slate-400 text-xs uppercase border-b border-rule">
              <tr>
                <th className="px-4 py-3">Feature</th>
                <th className="px-4 py-3 text-center">TickerTrace</th>
                <th className="px-4 py-3 text-center">13F Filings</th>
                <th className="px-4 py-3 text-center">ETF Research Center</th>
                <th className="px-4 py-3 text-center">Cathie's ARK Tracker</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              <CompRow feature="Update frequency" us="Daily" them="Quarterly" etfrc="Daily" ark="Daily" />
              <CompRow feature="Data delay" us="Same day" them="90+ days" etfrc="Same day" ark="Same day" />
              <CompRow feature="Cross-fund coverage" us="71 funds, 11 providers" them="All 13F filers" etfrc="Broad" ark="ARK only (6 ETFs)" />
              <CompRow feature="Conviction scoring" us="✓" them="✗" etfrc="✗" ark="✗" />
              <CompRow feature="Streak tracking" us="✓" them="✗" etfrc="✗" ark="✗" />
              <CompRow feature="Option flow decoded" us="✓" them="✗" etfrc="✗" ark="✗" />
              <CompRow feature="Divergence alerts" us="✓" them="✗" etfrc="✗" ark="✗" />
              <CompRow feature="Layering Radar" us="✓" them="✗" etfrc="✗" ark="✗" />
              <CompRow feature="Discord alerts" us="✓" them="✗" etfrc="✗" ark="✗" />
              <CompRow feature="Activity heatmap" us="✓" them="✗" etfrc="✗" ark="✗" />
              <CompRow feature="JSON API" us="✓" them="✗" etfrc="$29/mo" ark="✗" />
              <CompRow feature="Price" us="100% Free" them="Free" etfrc="$29/mo" ark="Free" />
            </tbody>
          </table>

        </div>
      </section>

      {/* Final dual CTA — single conversion moment after the comparison table */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-rule">
        <div className="bg-gradient-to-r from-[#1a1430] via-surface-gradient to-[#0a1a1f] border border-meta/20 rounded-2xl p-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Stop trading <span className="text-sell">90-day-old</span> data.
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto mb-8">
            Pair the free daily holdings feed with TraderMatrix&apos;s live options flow. Same edge institutions
            pay six figures for — minus the prime brokerage.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://www.tradermatrix.pro/?ref=MPHINANCE"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-meta to-[#7c3aed] text-white font-bold rounded-xl hover:from-[#9060f0] hover:to-[#6d28d9] transition-all shadow-lg shadow-meta/20"
            >
              🧠 Start with TraderMatrix <ArrowRight className="h-5 w-5" />
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-surface border border-equity/40 text-white font-semibold rounded-xl hover:bg-surface-hover hover:border-equity transition-colors"
            >
              <Eye className="h-5 w-5 text-equity" /> Try the Free Data
            </Link>
          </div>
          <p className="text-[10px] text-slate-500 mt-5">
            Referral link to TraderMatrix disclosed. We use this stack ourselves — we built TickerTrace to feed it.
          </p>
        </div>
      </section>

      {/* Changelog — patch notes from the trenches */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-rule">
        <h2 className="text-3xl font-bold text-center mb-3">Patch Notes from the Trenches</h2>
        <p className="text-slate-400 text-center mb-10 max-w-xl mx-auto text-sm">
          We ship constantly and document it honestly. Here&apos;s what landed recently.
        </p>

        <ChangelogList entries={CHANGELOG_ENTRIES} />

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
              "- Layering Radar — when 3+ independent fund families each open the same new position within days, ranked by entry order (the part quarterly 13Fs can never show you)",
              "- A CBOE scanner that flags stocks getting options listed for the first time",
              "",
              "Full disclosure: it's my project. I'm not selling anything — the data API is completely open. Mostly looking for feedback on what's missing.",
            ].join("\n")}
            linkedin
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-rule py-10 text-center text-slate-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-equity font-bold">TICKER<span className="text-white">TRACE</span></span>
          <span>·</span>
          <span>giving retail a fighting chance</span>
        </div>
        <p className="text-xs mb-3">
          A{' '}
          <a
            href="https://www.tradermatrix.pro/?ref=MPHINANCE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-meta hover:text-white transition-colors"
          >
            TraderMatrix
          </a>{' '}
          product · part of the{' '}
          <a
            href="https://tradernetwork.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00e08a] hover:text-white transition-colors"
          >
            Trader Network
          </a>
        </p>
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
    green: 'border-buy/20 hover:border-buy/40',
    orange: 'border-orange-400/20 hover:border-orange-400/40',
    cyan: 'border-equity/20 hover:border-equity/40',
    purple: 'border-meta/20 hover:border-meta/40',
    rose: 'border-rose-400/20 hover:border-rose-400/40',
    indigo: 'border-[#5865F2]/20 hover:border-[#5865F2]/40',
  };
  return (
    <div className={`bg-surface border ${borders[color] || 'border-rule'} rounded-xl p-6 transition-colors`}>
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
  const cellClass = (v: string) => `px-4 py-2.5 text-center text-xs font-mono ${isCheck(v) ? 'text-buy' : isX(v) ? 'text-sell/40' : 'text-slate-300'
    }`;
  return (
    <tr className="hover:bg-surface-hover/30">
      <td className="px-4 py-2.5 text-sm text-slate-300 font-medium">{feature}</td>
      <td className={`${cellClass(us)} bg-equity/5 font-bold`}>{us}</td>
      <td className={cellClass(them)}>{them}</td>
      <td className={cellClass(etfrc)}>{etfrc}</td>
      <td className={cellClass(ark)}>{ark}</td>
    </tr>
  );
}
