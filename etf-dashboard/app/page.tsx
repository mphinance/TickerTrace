import Link from 'next/link';
import { ReferralTracker } from '@/components/referral-tracker';
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
          <p className="text-slate-500 text-xs mb-4">Share the chaos — we deserve it</p>
          <div className="flex justify-center gap-3">
            <a
              href="https://twitter.com/intent/tweet?text=This%20ETF%20tracker%20has%20the%20most%20honest%20changelog%20I've%20ever%20seen.%20%F0%9F%92%80&url=https://tickertrace.pro"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#111827] border border-[#1f2937] rounded-lg text-sm text-slate-300 hover:border-[#1d9bf0] hover:text-[#1d9bf0] transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              Post
            </a>
            <a
              href="https://www.reddit.com/submit?url=https://tickertrace.pro&title=ETF%20holdings%20tracker%20with%20the%20most%20self-deprecating%20changelog%20ever"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#111827] border border-[#1f2937] rounded-lg text-sm text-slate-300 hover:border-[#ff4500] hover:text-[#ff4500] transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" /></svg>
              Reddit
            </a>
            <a
              href="https://www.linkedin.com/sharing/share-offsite/?url=https://tickertrace.pro"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#111827] border border-[#1f2937] rounded-lg text-sm text-slate-300 hover:border-[#0a66c2] hover:text-[#0a66c2] transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              LinkedIn
            </a>
          </div>
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
  date: string; tag: 'feature' | 'bugfix'; title: string; desc: string;
}) {
  const tagStyle = tag === 'bugfix'
    ? 'bg-[#ff4444]/10 text-[#ff4444] border-[#ff4444]/20'
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
