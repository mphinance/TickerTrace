import Link from 'next/link';
import { ReferralTracker } from '@/components/referral-tracker';
import { ShareButtons } from '@/components/share-buttons';
import { DataFreshness } from '@/components/data-freshness';
import {
  TrendingUp, Zap, BarChart3, Search, GitFork, Bell,
  ArrowRight, CheckCircle2, Clock, Eye, Layers,
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
            <div className="font-mono text-sm text-[#ff4444]/60">Filed: Q2 2026 → You see it: Aug 2026</div>
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
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#00d4ff] shrink-0" />ARK · Avantis · Corgi · YieldMax · Roundhill · Kurv · REX · NestYield · Sprott · NicholasX</li>
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
            icon={<Layers className="h-6 w-6 text-[#a78bfa]" />}
            title="Layering Radar"
            desc="When 3+ independent fund families each open the same brand-new position within days, that's smart money quietly agreeing. The entry order is the part quarterly 13Fs can never show you."
            color="purple"
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
              <CompRow feature="Cross-fund coverage" us="50+ funds, 10 providers" them="All 13F filers" etfrc="Broad" ark="ARK only (6 ETFs)" />
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
            date="July 30, 2026"
            tag="bugfix"
            title="Stock pages now show a real error page instead of a blank generic 404 — and the 'Funds Tracked' tooltip finally mentions Amplify"
            desc="Two small housekeeping fixes. First: if you navigated to /stocks/BADSYMBOL or hit a stock page while the API was having a moment, you'd get Next.js's generic root 404 — no branding, no search box, no way home. Fund pages have had a proper 'Fund not found' page with a search bar and a 'Back to dashboard' link for a while. Stock pages didn't. Now they do: a clean 404 with a search form and a link to the stocks index if the ticker isn't in any tracked fund, and a 'Couldn't load this stock / Try again' recovery screen if the API blipped. Second: yesterday we added 18 Amplify ETFs (BLOK, DIVO, HACK, AIEQ, etc.) and forgot to update the 'Funds Tracked' tooltip on the dashboard header. It was still listing every provider family except Amplify. Fixed."
          />
          <ChangelogEntry
            date="July 30, 2026"
            tag="bugfix"
            title="The Holdings page's Δ Weight was measuring price, not trades — fixed"
            desc="This one bugged me. On the full Holdings page, the 'Δ Weight' column was doing the naive thing: today's weight minus yesterday's weight. Problem is a stock's weight in a fund moves every time its PRICE moves, even if the manager didn't touch a single share. So the column was half price, half signal — and mostly price. Real example from today: ARKK's AMD showed Δ Weight −0.11% (looks like they dumped it) while they actually bought 7,425 more shares — the stock just dropped that day. Across ARKK, 24 of 44 positions had the old number pointing the wrong way. The rest of the site (signals, the Changes page, the API, the MCP tools) already stripped price drift out months ago using 'active weight'; the free Holdings page was the last holdout still doing it the dumb way. Ported the exact same math over — price drift removed, stock splits divided out, creation/redemption flow cancelled — and checked it position-for-position against the Python. Now Δ Weight means what you'd think it means: the manager actually moved money here. If you just want to know a stock went up, that's what every other site is for."
          />
          <ChangelogEntry
            date="July 30, 2026"
            tag="feature"
            title="Amplify ETFs are in the data now — 18 funds, led by BLOK"
            desc="Added the Amplify family: BLOK (blockchain), DIVO and QDVO and IDVO (their dividend-income line), SILJ (silver miners), HACK, IBUY, BATT, IPAY, ITEQ, COWS, DRVR, AWAY, CNBS, GAMR, ETHO, AIEQ, and YYY. Amplify doesn't hand you a CSV link — their holdings pages build the download in your browser from a public Google Firestore feed, so there's no static file to grab. Dug into their site's JavaScript, found the Firestore project behind it, and now we read the same feed the browser does: one document per fund per trading day, straight to the REST API, no scraping HTML. Bonus: it already carries CUSIPs and clean weights, and BLOK's foreign listings (Metaplanet, SBI in Tokyo) come through with their exchange tags stripped. DIVO's covered calls parse as real options too, so you'll see the strikes, not mystery rows. Today's scrape brings them all live."
          />
          <ChangelogEntry
            date="July 29, 2026"
            tag="bugfix"
            title="The Changes page stat chips now say what they mean — and the broken Discord button is gone"
            desc="Two small accuracy fixes on the Changes page. First: the '↑ N buys' chip at the top was counting new position openings (★ NEW) as 'buys', so if today had 20 adds and 5 new positions, the chip would say '↑ 25 buys' but clicking BUYS would show only 20 rows. The NEW positions were already counted separately in the '★ N new' chip — double-counting them in 'buys' was just confusing. Fixed: the buys and sells chips now use the same logic as the BUYS and SELLS filter tabs, so the number you see is the number of rows you get when you click. Second: the Discord share button was navigating to the user's own DM list with no pre-filled content and no way to share anything. The X and Reddit buttons both pre-fill text and a URL. The Discord one just opened your inbox. Removed it rather than pretend it works. Also added REX back to the 'Funds Tracked' tooltip on the dashboard — it was removed in July when ULTI had zero holdings, but REX has since added NVII and TSII and is active again."
          />
          <ChangelogEntry
            date="July 28, 2026"
            tag="polish"
            title="The 'Who holds it' table on stock pages now shows NEW and EXIT badges — same as the Changes page"
            desc="The 'Δ today' column on any stock's detail page (/stocks/NVDA, etc.) has always used color to show direction: green for adding, red for trimming. But green for +0.002% on an existing position and green for +0.002% on a brand-new position are different things. When ARKK opens a fresh NVDA stake today, that's not the same signal as ARKK adding to an existing one — and color alone can't tell you which it is. Now the table shows the same small NEW and EXIT badges the Changes page uses. A green NEW chip means the fund opened this position from zero today. A red EXIT means they closed it entirely. Funds adding to or trimming existing positions still just read from the delta and its color, which is enough for that case. Small one, but 'NEW position' vs. 'continuing to accumulate' are genuinely different data points — you shouldn't have to open the Changes page and find the row to tell them apart."
          />
          <ChangelogEntry
            date="July 27, 2026"
            tag="bugfix"
            title="The dashboard activity table finally acts like the rest of the site — tickers link, and signals use the right delta"
            desc="Two small things hiding in the Daily Activity and Weekly Activity table views on the dashboard (the 📋 Table tab). First: every ticker in the equity activity table was plain text — no link. You'd see 'AVUV added NVDA' and the NVDA was just sitting there, dead. Every other ticker reference in the app routes to the stock's full analysis page. This one didn't. Fixed: clicking any ticker in the equity table now takes you to /stocks/TICKER, same as everywhere else. Option contract tickers in the Options tab now link to the underlying too. Second: the ADDING / TRIMMING badge and the Δ Weight column color in that table were still using the raw weight delta — the one that counts price drift as trading. A fund that trimmed a stock into a rally would show green and say 'ADDING' because the raw weight went up. Changed both to use the active weight delta the same way the Changes page and fund profiles already do. If you watched the activity table closely and the colors felt occasionally off, that's why."
          />
          <ChangelogEntry
            date="July 26, 2026"
            tag="polish"
            title="Signals and briefing now show dollar estimates — not just abstract percentages"
            desc="The Changes page has been showing dollar estimates since July 19 — 'ARKK added NVDA +0.031% ≈ $2.1M' — and it's one of the most useful things on that page. The Briefing top buys/sells and the Signals Hero cards were still showing bare percentages and a conviction score, which is accurate and also kind of useless until you do the math. Now both show a faint dollar estimate right under the weight delta: '≈ $3.2M' for multi-fund buys, '≈ $800k' for smaller moves, '≈ $1.2B' when Avantis really leans in. Same AUM × weight delta math the Changes page uses. Options are excluded since their notional works differently. Small one, but '+0.05%' and '≈ $3.2M' are genuinely different pieces of information — and now you see both without opening the Changes page."
          />
          <ChangelogEntry
            date="July 25, 2026"
            tag="polish"
            title="Fund profile pages now show sector tags on position changes — and the 'N prov' badge finally says what it means"
            desc="Two small things we noticed while scanning fund profiles. First: the Position Sizing section on every fund page was showing ticker, name, and the delta — but no sector. The Changes page has always shown sector context (a tiny 'Technology' or 'Healthcare' tag under the company name), and it makes a real difference when you're reading a long list of moves. We added the same tags to the fund profile's Position Sizing section. Second: on the main dashboard, cross-family signals had a badge that said 'N prov' — short for 'providers', meaning fund families. The /stocks index called the same concept 'N fam' (for 'families'). Same data, two different labels. We standardized on 'fam' throughout, and added a tooltip explaining what it means: 'N distinct fund families moving this ticker — cross-family conviction'. Also added name+sector hover tooltips to the New Entrances and Total Exits chips on fund profiles, since you couldn't tell what a ticker was without clicking it."
          />
          <ChangelogEntry
            date="July 24, 2026"
            tag="polish"
            title="AUM on fund pages now shows '$20M' instead of '$0.02B' — because nobody thinks in hundredths of a billion"
            desc="We track 53 funds. Most of the Corgi, NestYield, and YieldMax option-income ETFs are small — EGGS, SLTY, KQQQ are all under $100M. Everywhere we displayed their AUM (the /funds index, fund profile pages, the FundsGrid chips on the dashboard, and the Layering Radar patterns), it was showing '$0.02B' or '$0.08B'. Technically correct, practically unreadable. Now anything under $1B shows as millions: '$20M', '$80M', '$150M'. Large funds (AVUV, ARKK, MSTY) still show in billions — '$12.5B', '$6.8B'. Same data, just formatted in the unit that actually makes sense for the size of the number."
          />
          <ChangelogEntry
            date="July 23, 2026"
            tag="bugfix"
            title="Fixed two wrong stats on the dashboard header — one mislabeled, one pointing at a fund we don't track"
            desc="The dashboard header has a 'Stocks' number (was labeled 'Underlyings') sitting next to the P/C Ratio. The old tooltip said it was 'the set of stocks option-income funds are writing calls/puts against today' — which is not what it was. It was, and still is, the total count of unique stocks held across all tracked ETFs, deduplicated. Around 1,600+ once you include Avantis's small-cap and mid-cap value books. That's actually a useful number — it's the breadth of the whole institutional book — so I renamed the label to 'Stocks' and wrote a tooltip that says what it actually means. Also: the 'Funds Tracked' tooltip listed REX Shares as one of our tracked providers. REX's ULTI fund has had zero holdings in our daily scrape for a while now, so I pulled it from the list. No data changed. Just fixing the scoreboard so it says what it means."
          />
          <ChangelogEntry
            date="July 22, 2026"
            tag="bugfix"
            title="Two more pages where clicking a ticker dumped you in a dashboard popup instead of going to the stock page"
            desc="The 'ticker → dashboard popup' bug has been fixed in about five different places over the last month. The Options Listings page and the Activity Heatmap somehow survived all of them. On the Options page, clicking any newly-optionable stock or weekly expiration ticker (NVDA, TSLA, etc.) would bounce you to the dashboard with a search query — same dead-end popup we've been killing everywhere else. On the Activity Heatmap, every ticker in the row labels did the same thing. Both now go straight to the stock's detail page, same as clicking a ticker anywhere else in the app. If a stock on the Options Listings isn't in TickerTrace's tracked holdings, you'll get a clean 'not found' page instead of a confusing popup. No data changed, just the destinations."
          />
          <ChangelogEntry
            date="July 21, 2026"
            tag="bugfix"
            title="Dashboard search card: ticker name now links to full analysis, and the Δ numbers finally use active weight"
            desc="Two small things on the same card. First: when you search a ticker on the dashboard, the result card was a dead end — the holdings and recent changes were right there, but if you wanted the trend chart, blended weight history, or the full holders breakdown, you had to manually navigate to /stocks/TICKER. Now the ticker symbol in the card header is a link. Click TSLA and it takes you to the full analysis page, same as clicking any ticker anywhere else in the app. Second: the 'Recent Changes' section in that card was still showing raw weight deltas — the ones the July 10 fix explicitly replaced everywhere else. A fund trimming a position into a price rally would show green (weight went up on price), which is the exact backwards read the active-weight fix was meant to fix. That section now uses activeWeightDelta the same way the Changes page, fund profiles, and stocks list have done since July 12."
          />
          <ChangelogEntry
            date="July 20, 2026"
            tag="feature"
            title="Dashboard now shows 'Exits Today' alongside 'New Today' — finally the full picture of how much the book is turning over"
            desc="The 'New Today' counter (positions opened from zero) has been on the dashboard header for a few weeks. Today I added its counterpart: 'Exits Today', which counts how many (fund, ticker) pairs went from holding something to holding nothing that day. On a busy rotation day like ULTI's — where it dumped AMAT, HOOD, TEM, and SOFI all at once to make room for META — 'New: 48, Exits: 15' tells you a very different story than 'New: 48' alone. High new + high exits = active reshuffling (ULTI-style). High new + low exits = genuine accumulation. Low new + high exits = the book is getting leaner. The two numbers together give you the daily turnover read in about two seconds."
          />
          <ChangelogEntry
            date="July 19, 2026"
            tag="feature"
            title="The Changes page now tells you the dollar value of each move — not just the abstract weight percentage"
            desc="'+0.031%' for an ARKK add is technically accurate and practically useless until you do the math yourself. ARKK runs ~$6.8B in AUM, so 0.031% of that is about $2.1M — a very different number than the same weight shift from a $50M Corgi fund ($15k). I added a small dollar estimate under each Δ Weight entry on the Changes page: 'ARKK added NVDA +0.031% ≈ $2.1M'. The estimate is AUM × weight delta, so it's an approximation — the AUM figures are updated periodically, not live — but it gives you the right order of magnitude. Options are excluded since their notional exposure works differently. Now you can scan the BUYS tab and immediately see whether you're looking at a $50k trim or a $5M conviction add."
          />
          <ChangelogEntry
            date="July 18, 2026"
            tag="polish"
            title="The BUYS / SELLS / NEW / EXIT tabs on the Changes page now show counts — same as the filters on /stocks"
            desc="Noticed this one while comparing the two pages. The /stocks index shows counts on every filter pill — 'ARK Invest (12)', '↑ Net buying (23)', etc. — so you know what you're getting before you click. I fixed that on /stocks in two rounds (July 11 and July 13). The Changes page had the same gap: the BUYS, SELLS, NEW, and EXIT tabs were blank buttons with no count. You had to click SELLS to find out how many sells there were, then click back if the number was boring. Now each tab shows the count up front — 'BUYS (34)', 'SELLS (21)', 'NEW (8)', 'EXIT (4)' — and the counts update when you've already filtered by provider or fund. So 'ARK Invest → BUYS (6)' means exactly what it looks like: six ARK funds were net buyers today."
          />
          <ChangelogEntry
            date="July 17, 2026"
            tag="bugfix"
            title="The 'Δ today' column and buy/sell filter on /stocks now measure what managers did, not what markets did to them"
            desc="Found the same active-weight bug we fixed in the signals engine (July 10) and the changes table (July 12) — but hiding in a third place we'd missed. The /stocks index page computes each ticker's 'netChange' by summing raw weight deltas across funds. Raw weight moves when a stock's price moves, even if no shares traded — so a stock that rallied 5% looked like every fund was 'buying' it, and the 'Δ today' column and the '↑ Net buying' filter were both lying about it. The 'Biggest Δ today' sort was also affected: price-move artifacts were floating to the top. One-line fix: switched the per-ticker sum to use activeWeightDelta (price-drift removed) the same way signals and changes already do. The filter pills now reflect what fund managers actually chose to trade today."
          />
          <ChangelogEntry
            date="July 17, 2026"
            tag="bugfix"
            title="Options on the ticker search card show the contract count again"
            desc="Someone searched MU on the dashboard, opened the options exposure section, and got the strike and expiration on every row — but no count of how many contracts the fund actually holds. Fair complaint: 'a fund wrote calls on MU' means one thing, 'a fund wrote 4,200 contracts on MU' means something else entirely, and we were only showing the first. The stock positions right above it have always shown share counts, so the options block just looked broken by comparison. Each option row now shows the contract quantity next to its weight — '4,200 contracts' — pulled from the same share-quantity field the stock rows use. The +/− prefix on the strike badge and the weight color still tell you long vs. written; the number now tells you how big."
          />
          <ChangelogEntry
            date="July 16, 2026"
            tag="bugfix"
            title="Top holding on /funds is now a link — like every other ticker in the app"
            desc="Embarrassing oversight: the 'Top holding' column on the /funds page showed each fund's biggest equity position as plain text. Click NVDA in ARKK's row? Nothing happened. Every other ticker reference in the site — the stocks list, fund profiles, changes table, stock detail pages, signals board — routes you straight to the stock's detail page. The /funds index was the only place it didn't. One line, correctly fixed. Clicking a top holding now takes you to /stocks/TICKER the same way clicking any fund chip would take you to /fund/TICKER."
          />
          <ChangelogEntry
            date="July 15, 2026"
            tag="polish"
            title="One-click filter reset on /stocks — no more clearing three rows separately"
            desc="When you're filtering the Stocks page by provider, sector, AND signal all at once, clearing them meant clicking 'All' on three separate rows. Small annoyance, but annoying nonetheless. Now the subtitle under 'Most-held stocks' shows a '× clear filters' link whenever any filter is active. One click, back to the full list. The sort you chose is preserved — so if you were looking at 'ARK Invest + Technology + net buying, sorted by Biggest Δ today', clicking clear gives you all 150 tickers still sorted by today's move."
          />
          <ChangelogEntry
            date="July 14, 2026"
            tag="bugfix"
            title="'Has streak' filter on /stocks was including stocks with no visible streak badge — fixed"
            desc="The streak badge on each row shows when a fund has been buying or selling for 3+ consecutive days. Seemed obvious that the '🔥 Has streak' filter pill should match that. It didn't — the filter was letting in 2-day streaks, which don't show any badge at all. So you'd click the filter, see a list of stocks, and half of them would look identical to the unfiltered list with no streak indicator. Confusing. The filter now uses the same 3-day minimum threshold as the badge. The count on the pill ('🔥 Has streak (18)') now reflects what you'll actually see when you click it."
          />
          <ChangelogEntry
            date="July 13, 2026"
            tag="polish"
            title="The signal filter pills on /stocks now show counts too — same as sector and provider pills"
            desc="Two days ago I added counts to the sector pills ('Technology (47)') and provider pills ('ARK Invest (12)') on the Stocks page. Somehow the signal pills were left out. They've had the same problem all along: clicking '↑ Net buying' or '🔥 Has streak' felt like a leap of faith — you had no idea if you'd get 40 results or 2. Now they show counts the same way the other pills do: '↑ Net buying (23)' means 23 tickers are being net-bought today. The counts are context-aware — if you've already filtered to Avantis + Technology, the signal pill counts only reflect stocks within that slice. All three filter rows now behave consistently."
          />
          <ChangelogEntry
            date="July 12, 2026"
            tag="bugfix"
            title="The changes table and fund pages now classify buys/sells correctly — same fix the signal engine got two days ago"
            desc="When I fixed the signals engine to use active weight on July 10, I noted the free-tier dashboard was 'next in line.' That's today. The bug was the same one: raw portfolio weight change looks like buying when a stock rallies and looks like selling when it drops, regardless of what the fund actually did. The Changes page Buys/Sells tabs, the 'Increased/Trimmed' sections on individual fund pages, and the per-fund 'Δ today' column on stock detail pages were all using raw weight delta for direction. Now they all use active weight — the same price-drift-removed measure the API has used since July 10. Practically speaking: a position that drifted up because the stock had a big day will no longer show as 'ADD'; a position a fund was quietly trimming into strength will no longer show green. If the buy/sell counts on the Changes page look a bit different than yesterday, that's why — it's showing you what the managers actually chose to do."
          />
          <ChangelogEntry
            date="July 11, 2026"
            tag="polish"
            title="The sector and provider filter pills on /stocks now show you the count before you click"
            desc="Small one, but it was making me guess. The /stocks page has a row of sector pills (Technology, Healthcare, etc.) and a row of provider pills (ARK Invest, Avantis, etc.), and clicking one filters the list — but until now there was no way to know if 'Industrials' had 5 stocks or 50 before you committed to the click. Now each pill shows the count right on the face: 'Technology (47)' or 'ARK Invest (63)'. The counts are context-aware too — if you've already filtered to 'net buying' signals, the provider counts reflect only stocks being bought today, so 'ARK Invest (12)' means 12 ARK names are moving up right now, not 63 across the whole book. Three active filters and you can read the whole picture without clicking anything."
          />
          <ChangelogEntry
            date="July 10, 2026"
            tag="bugfix"
            title="Signals now measure what the manager DID, not what the market did to them — this is the big one"
            desc="I have to be straight with you: the signal engine has been measuring the wrong thing, and it took a good question to make me actually check. Every 'buy' and 'sell' signal ran off change in portfolio weight. But a stock's weight moves when its price moves, even if the fund never touched a single share. If TSLA rips 10%, its weight goes up in every fund that holds it, and the old engine dutifully reported all of them as 'buying TSLA' — when not one share changed hands. I measured it against a full day of real data: raw weight agreed with what funds actually traded about as often as a coin flip, and roughly 70% of the moves above our signal threshold had ZERO shares traded. Yesterday's board had ARKK as the top BUYER of AMD on a day it SOLD 6,338 shares, and HOOD as the biggest sell signal on the board driven by a fund that BOUGHT it. Embarrassing, and worth fixing properly. The new measure — I'm calling it active weight — compares each position to where it would've drifted on price alone and reports only the difference, which is the part the manager actually chose. It cancels price moves and fund inflows/outflows at the same time (a fund taking in new cash and spreading it across every holding is not 'buying' anything, and it no longer shows up that way). On real trades, direction accuracy went from 59% to 81%. Along the way I found CrowdStrike's 4:1 split was being read as a fund quadrupling its stake — that's handled now too. Net effect: the top signals reshuffle a lot, conviction scores come down to earth, and what's left is closer to real institutional intent. The public API and MCP tools use it today; the free-tier dashboard math is next in line."
          />
          <ChangelogEntry
            date="July 10, 2026"
            tag="bugfix"
            title="The API served 8-day-old holdings and every alarm we built worked perfectly. We just weren't listening."
            desc="Owning this one. From July 2 to today, api.tickertrace.pro handed back July 2 data — signals, changes, sector flow, all of it stale — while the scraper ran green every single morning and committed fresh CSVs to the repo like clockwork. The site looked alive. It wasn't. Here's the dumb part: the live box keeps itself current by fast-forwarding to main every 15 minutes, and someone (me) left it parked on a documentation branch. A branch that has its own commits can't fast-forward from main — it's not a bug, it's just git. So the sync script did exactly what we designed it to do: it refused to nuke what looked like local work, logged 'ff-only merge BLOCKED,' and bailed. Every 15 minutes. For eight days. Into a logfile nobody opens. The freshness canary caught it on day one and failed four weekdays straight — straight into an inbox nobody reads. Two working alarms, zero humans. Fixed twice over: the box is back on main and serving current data, and sync_data.sh now checks it's actually on main before it tries anything. If it finds itself on a stray branch with a clean tree, it walks itself back to main and carries on. If there's real uncommitted work sitting there, it still refuses to touch it — it just says so in a way that doesn't pretend everything's fine. Next on the list: making the canary yell somewhere we'll actually hear it."
          />
          <ChangelogEntry
            date="July 10, 2026"
            tag="polish"
            title="Provider filter on the Stocks page — see exactly what ARK owns, or Avantis, or any fund family"
            desc="The /stocks index has had a sector filter and a signal filter for a while — but there was no way to answer the obvious question: what stocks does a specific fund family hold? You'd have to open the fund's profile page and scan the holdings table, one fund at a time. Now there's a provider filter row: click ARK Invest and you get only the tickers that appear across ARKK, ARKQ, ARKW, ARKG, ARKF, or ARKX. Click Avantis and you see the small-cap and large-cap value names they're accumulating. All 10 fund families are available. The filter stacks with everything else — 'ARK Invest · Technology · Net buying' is three clicks and the URL updates, so you can bookmark or share the filtered view. Nothing changed in the data, just a cleaner way to ask a question that was always answerable, just tediously."
          />
          <ChangelogEntry
            date="July 9, 2026"
            tag="polish"
            title="Fund profile pages finally have the full nav bar — no more dead-end Back to Dashboard button"
            desc="Kind of embarrassing that this lasted as long as it did. Every other data page in the app — Stocks, Changes, Holdings, Layering, even individual stock detail pages — has the site nav at the top so you can move around freely. Fund profile pages (/fund/ARKK, /fund/AVUV, etc.) had nothing — just a lone 'Back to Dashboard' button, no matter how you got there. Clicked in from /funds? Back to Dashboard. Clicked in from a stock's holders table? Also Back to Dashboard. It was the only page that trapped you. Fixed: fund profiles now have the same nav bar as everything else, and the contextual back link now says 'Back to Funds' so it takes you to the fund directory instead of forcing a detour through the main dashboard."
          />
          <ChangelogEntry
            date="July 8, 2026"
            tag="feature"
            title="New KPI: how many brand-new positions did institutions open today?"
            desc="The dashboard header has always shown Funds Tracked, Underlyings, and P/C Ratio — three counts that don't change much day to day. I added a fourth: New Today, which counts how many (fund, ticker) pairs went from zero to holding something this session. It's a real activity gauge. A slow rebalancing day might show 3 or 4. A day when three fund families all pile into the same new name — the kind of thing the Layering Radar catches — might show 30+. The number is computed from the same change detection that drives the Signals board, so it's always consistent with what you see below it. The data was always there, just never surfaced at a glance."
          />
          <ChangelogEntry
            date="July 7, 2026"
            tag="feature"
            title="Stock detail pages now show estimated dollar exposure — not just abstract weight percentages"
            desc="'Institutional blended weight: 0.800%' is technically accurate and practically meaningless to most people. I kept looking at it and thinking 'okay but how much money is that?' So now it tells you: the stock detail page shows '~$890M est. exposure' (or '$1.2B' for the bigger names) right next to the weight figure. It's computed from each holding fund's reported weight times their known AUM, so it's an estimate — the AUM figures lag a bit — but it gives you the right order of magnitude. Knowing that Avantis has roughly $600M deployed in a single small-cap value stock is a different kind of signal than knowing its blended weight is 0.4%."
          />
          <ChangelogEntry
            date="July 6, 2026"
            tag="feature"
            title="The /stocks page now shows how many fund families hold each ticker — not just how many funds"
            desc="There's a difference between five ARK funds all holding the same name (one shop's call) and five funds from three different families each independently owning it (three separate stock-pickers agreeing). The current UI showed '5 funds' and left you to squint at the fund chips and mentally sort them by shop. Now there's a small purple '2 fam' or '3 fam' badge right next to the ticker whenever two or more distinct fund families hold a stock. Nothing changed in the underlying data — it was always in there. This is just the first time the cross-family conviction signal is surfaced directly on the index. If you see '3 fam' next to a ticker you haven't looked at, that's worth clicking."
          />
          <ChangelogEntry
            date="July 5, 2026"
            tag="polish"
            title="The Stocks and Funds pages now show the data date — no more guessing if you're looking at today's numbers"
            desc="Small one, but it was quietly confusing. When you'd open /stocks or /funds, the header showed how many tickers/funds you were looking at — but not WHEN. If the scrape ran this morning, you were looking at today's snapshot. If it ran yesterday, you were looking at yesterday's. Either way, the page said nothing about it. I've added the as-of date right in the subtitle on both pages — same YYYY-MM-DD format the Changes page already uses. 'Stocks' now reads '2026-07-05 · 147 tickers ranked by most widely held' and 'Funds' reads '2026-07-05 · 34 funds · 10 providers · $37.2B combined AUM'. Nothing changed in the data — you're just seeing when it's from. The date pulls from the API, so it's always accurate to whatever the latest scrape produced."
          />
          <ChangelogEntry
            date="July 4, 2026"
            tag="polish"
            title="Signal filter on the Stocks page — slice to just the names being bought, sold, or on a streak"
            desc="The /stocks index has had a sector filter for a while, but you couldn't answer the obvious other question: out of everything institutions hold, what's actually moving toward me today vs. away from me? Added a 'signal' filter row with four pills — All, ↑ Net buying, ↓ Net selling, and 🔥 Has streak. 'Net buying' shows every ticker where institutional weight moved up today, net across all funds. 'Net selling' is the opposite. 'Has streak' narrows to anything with a 2+ day consecutive buying or selling streak — which is the subset actually showing conviction, not just noise. All three filter cleanly with whatever sort and sector filter you already have active, so 'Healthcare, net buying, sorted by biggest move today' is three clicks. The URL updates, so you can bookmark or share the filtered view. The same empty-state message that tells you when sector filter finds nothing now also covers the signal filters."
          />
          <ChangelogEntry
            date="July 3, 2026"
            tag="polish"
            title="The /funds page now has a category filter — slice to just the stock-pickers or just the income funds"
            desc="We track two very different types of funds: active-equity funds (ARK, Avantis, Corgi, Sprott) that actually pick stocks, and option-income funds (YieldMax, Roundhill, REX, Kurv, NestYield) that sell options for yield. They've always been mixed together on the /funds page with no way to split them out — so if you just wanted to see 'all the stock-picking funds sorted by AUM,' you were scrolling past 30+ income funds to find them. Added two category filter pills — Active Equity and Option Income — above the table, same pattern as the sector filter on /stocks. The sort works across both: you can do 'Active Equity, A–Z' or 'Option Income, Most holdings' and the URL updates cleanly so you can bookmark or share the filtered view. When a category is selected, the Type column also clears out since repeating it would just be redundant."
          />
          <ChangelogEntry
            date="July 2, 2026"
            tag="polish"
            title="Signal links on the dashboard now go to the stock page — not a popup"
            desc="Every signal row, briefing item, divergence ticker, and active streak on the dashboard used to open an inline search popup when you clicked the ticker. The Changes page got this fix last week, the fund profile pages got it the day after — somehow the main dashboard's own signals kept the old behavior through both rounds. Fixed: clicking NVDA in your Buying signals, Briefing top buys, or any active streak now goes straight to /stocks/NVDA — the page with the conviction chart, blended-weight history, and full fund holder table. Same fix for Notable Options in the briefing, which now land on the underlying stock page instead of searching an option contract string. Also updated the '13F delay' example on the landing page — it was still showing Q4 2025 → Feb 2026, which in July 2026 reads like we stopped updating the site."
          />
          <ChangelogEntry
            date="July 1, 2026"
            tag="polish"
            title="Layering Radar finally made it to the comparison table — only took three weeks to notice"
            desc="We shipped Layering Radar on June 9 and it's probably the most 'only-we-have-this' thing on the site. When 3+ independent fund families each open the same brand-new position within days of each other, we surface the pile-up — with entry order — before any quarterly 13F would even hint at it. It was in the feature cards, it was in the nav, but somehow it never made it into the comparison table at the bottom of the landing page. Fixed. Added it as its own row: TickerTrace ✓, everything else ✗. Because they can't do it — you'd need daily scraped data and cross-fund tracking to even try."
          />
          <ChangelogEntry
            date="June 30, 2026"
            tag="polish"
            title="Divergences section now tells you when it's quiet — and a data consistency fix under the hood"
            desc="Two small things today. First: on days with no divergences, the Divergences section on the dashboard used to just disappear — no card, no context, just nothing where a section used to be. That's confusing: you don't know if divergences isn't a feature, the data's missing, or today's just quiet. Now it always shows, and when there's nothing to report you get 'No divergences today — all tracked funds are aligned on direction.' Way less mysterious. Second: an internal data quality fix — if a fund ticker wasn't in our provider lookup table (e.g. a newly added fund we haven't catalogued yet), the layering patterns endpoint was returning provider: 'Unknown' while every other endpoint correctly fell back to the fund ticker itself. Now they're consistent: unknown provider = fund ticker, everywhere."
          />
          <ChangelogEntry
            date="June 29, 2026"
            tag="feature"
            title="Streak now shows on individual stock pages too — not just the list"
            desc="The /stocks list has shown streak badges for a while (amber ▲ for buying, red ▼ for selling), but if you clicked through to a stock's detail page — /stocks/NVDA, say — there was no streak anywhere. Just the signal label and the Day/Week/Month net flow numbers. Fixed: the detail page now shows a streak banner inside the Net flow card when there's a streak of 2+ days. The streak on the detail page is computed from the aggregate blended weight across all institutional funds (not the per-fund streak that powers the index badges), which is the right measure for the page you're on — you're looking at the combined institutional view, so the streak should be too."
          />
          <ChangelogEntry
            date="June 28, 2026"
            tag="feature"
            title="Sort by 'Longest streak' on the Stocks page — see multi-day conviction at the top"
            desc="Added a fourth sort to the /stocks index: 'Longest streak.' Click it and the list reorders by the strongest multi-day institutional accumulation or distribution streak, biggest first. If NVDA has been bought by funds for 7 consecutive trading days straight, it floats to the top — same streak engine that powers the existing badges, just now sortable. The streak badges are still there (amber ▲ for buying, red ▼ for selling) so you can see the count without clicking. Before this you had to scroll past 150 rows hoping to spot the badges; now they're stacked right at the front. Works with the sector filter too, so 'longest-streak Healthcare names this week' is two clicks."
          />
          <ChangelogEntry
            date="June 27, 2026"
            tag="polish"
            title="Fund profile tickers now link to the stock detail page too — not just the Changes page"
            desc="Yesterday we fixed ticker links on the Changes page to go to /stocks instead of the dashboard search popup. Turns out the fund profile pages had the same bug, in four separate spots: New Entrances, Total Exits, Position Sizing, and Top Holdings all linked to the inline dashboard search. So you'd click NVDA on ARKK's profile and get a popup — no trend chart, no sparkline, no blended-weight history. Fixing one page and not the other is the kind of inconsistency that drives me crazy once I notice it. All four sections now route straight to /stocks/TICKER."
          />
          <ChangelogEntry
            date="June 26, 2026"
            tag="polish"
            title="Tickers on the Changes page now link to the stock detail page, not the dashboard search"
            desc="Small but it was bugging me. When you're looking at today's position changes and click a ticker like SMCI or NVDA, it used to bounce you over to the dashboard with a search query loaded — you'd see the inline popup and miss the full trend chart, the blended-weight sparkline, and the fund holder table that live on the dedicated /stocks page. Now it goes straight there. For options, it links to the underlying stock instead (clicking 'TSLA 260718C00300000' takes you to /stocks/TSLA), which is what you actually want to see. No data changed, just the right destination for the right page."
          />
          <ChangelogEntry
            date="June 25, 2026"
            tag="polish"
            title="Signals now show sector context — know the theme before you click"
            desc="The Signals Hero cards and the Briefing top-buys/top-sells rows now show a small sector label under each name — Technology, Healthcare, Energy, whatever the data has. The sector field was already in the API, just never surfaced on the dashboard where it matters most. Now you can see at a glance whether today's institutional buying is concentrated in one sector before you go digging. Also fixed a long-standing inconsistency: Top Sells in the Briefing was missing the conviction score and streak badge that Top Buys has always shown. They're symmetric now."
          />
          <ChangelogEntry
            date="June 24, 2026"
            tag="feature"
            title="Streak badges on the stocks list — see multi-day conviction at a glance"
            desc="Added small streak badges to the /stocks index. When any fund has been continuously buying a stock for 3+ consecutive trading days, you'll now see an amber '▲ Xd' badge right next to the ticker — same row, no clicking. Selling streaks get a red '▼ Xd' badge. The streak counts come from the same streak engine that already powers the fund detail pages and the dashboard signals — this is just the first time it shows up on the index. The threshold is 3 days minimum; 2-day moves are too common to be interesting, and we don't want the list turning into a confetti cannon. Pairs well with the NEW badge from yesterday — you can now see 'this is a fresh entry AND they've been adding to it for 5 days' all in one row."
          />
          <ChangelogEntry
            date="June 23, 2026"
            tag="feature"
            title="The stocks list now flags brand-new institutional positions with a 'NEW' badge"
            desc="When a fund opens a stock position for the first time today, there's now a small green NEW badge right next to the ticker on the /stocks page. Hover over it and you'll see which fund(s) just bought in. Before this you'd have to sort by 'Biggest Δ today' and then click through each ticker to see if the weight move was a fresh entry or an existing position being added to — two steps, and easy to miss entirely. Fresh entries are often the most interesting part of the daily data. Now they're surfaced immediately in the list. Nothing changed on the stock detail page — this is purely the index getting smarter."
          />
          <ChangelogEntry
            date="June 22, 2026"
            tag="polish"
            title="Stock detail pages now show share counts — and the Δ today column finally has its % sign"
            desc="Two fixes to the individual stock pages (/stocks/TSLA, /stocks/NVDA, etc). First, the 'Δ today' column in the holder table was showing values like '+0.031' with no unit — when every other table on the site correctly shows '+0.031%'. That % was just missing. Easy fix, embarrassing oversight — the same issue was caught on the main /stocks list page last week and I somehow missed that the detail page had the same bug. Second, added a Shares column to the holder table. Weight % tells you relative conviction (how much of the fund is in this stock), but shares tells you absolute commitment — ARKK owning 1.2 million shares of TSLA vs. a fund holding 8,000 reads very differently even if the percentage is similar. The data was already there, just not shown. Both columns hide on small screens to keep things readable on a phone."
          />
          <ChangelogEntry
            date="June 21, 2026"
            tag="feature"
            title="Sector filter on the Stocks page — slice the list instead of scrolling it"
            desc="The /stocks index lists every ticker institutions hold, but if you wanted to see, say, what Healthcare names they're piling into this week, you had to scroll past 150 rows and squint at the name column. Now there's a row of sector pills right above the table — click Technology (or Healthcare, or Energy, or whatever the data has today) and the list narrows instantly to just that slice. Works with all three sort options, so 'biggest-moving Healthcare names today' is two clicks. When you're looking at a filtered view the sector badge under each name disappears too, since it'd just repeat what you already know. Click All to get everything back."
          />
          <ChangelogEntry
            date="June 20, 2026"
            tag="bugfix"
            title="The /funds page now tells you when something's wrong instead of pretending nothing happened"
            desc="Embarrassing one. If the API ever hiccupped while you were loading /funds, the page would cheerfully render '0 funds · 0 providers · $0.0B combined AUM' — as if we'd quietly shut down. The /stocks page has had a proper 'couldn't reach the API, try refreshing' error card for a while. /funds just... didn't. Same 10-line fix, same pattern. Now both pages behave like adults when the network isn't cooperating."
          />
          <ChangelogEntry
            date="June 19, 2026"
            tag="polish"
            title="Two KPI cards finally explain themselves, and the provider list stops trailing off with 'more'"
            desc="The dashboard header has three stats: Funds Tracked, Underlyings, and P/C Ratio. P/C Ratio has always had a tooltip explaining what it means. Funds Tracked and Underlyings just sat there looking confident, expecting you to guess. Fixed: both now have hover tooltips. The Underlyings one in particular needed the note — it's not 'unique stocks held across all portfolios,' it's specifically the set of stocks that option-income funds are writing covered calls and puts against today. Very different number, very different meaning. Also: the landing page provider list said '... Sprott · more' like we were being mysteriously cagey about the tenth provider. It's NicholasX. We track NicholasX. Added."
          />
          <ChangelogEntry
            date="June 18, 2026"
            tag="feature"
            title="The dashboard activity table now has sector tags — same as the Changes page"
            desc="Added sector badges to the Name column in the Dashboard's Daily Activity table. The Changes page got them last week and it turns out they're just as useful there — when you're scanning today's moves in the activity section and see AVUV added SMCI, you now see the 'Technology' tag under the name without having to click through or remember every ticker's sector. Options are excluded (the tag would just repeat the underlying you can already read from the ticker). Same tiny badge, same exact style as the Changes page, because it should have been consistent from the start."
          />
          <ChangelogEntry
            date="June 17, 2026"
            tag="feature"
            title="The changes table now shows you what sector a position is in, right in the row"
            desc="Small one, but it was annoying me. When you're scanning through today's institutional moves on the Changes page, the table would show you AVUV added SMCI and you'd have to click through to figure out 'is that tech or industrial?' Now there's a tiny sector tag right under the company name — Technology, Healthcare, Energy, whatever — so you know what you're looking at without leaving the page. Options don't get a tag since their 'sector' is just the underlying, which you can already read from the ticker. Works across daily, weekly, and monthly views."
          />
          <ChangelogEntry
            date="June 16, 2026"
            tag="bugfix"
            title="Stocks page no longer shows a blank table when the API hiccups — and cleans up the zero-change column"
            desc={"Two small fixes to the /stocks page that were bothering me. First: if the API ever goes quiet for a moment, the page was silently rendering a table with zero rows and the header '0 tickers ranked by...' — which reads like we track nothing. Now it shows a real 'couldn\\'t reach the API, try refreshing' message instead of an empty shell. Second: tickers that had no institutional move today were showing '0.000' in the Δ today column — every other table on the site shows '—' for no change, and this one was the odd one out. Fixed to match."}
          />
          <ChangelogEntry
            date="June 15, 2026"
            tag="bugfix"
            title="The 'DATA UPDATED' badge now actually warns you when the data is stale"
            desc={"Small but important: the green pulsing 'DATA UPDATED' pill was cheerfully green ALL the time — even if the scraper had been down for three days. It just showed the last date and moved on. Now it reads the actual data age and flips amber if we're more than one business day behind. So a normal weekend never trips it (Friday data is fine on Saturday and Sunday), but a real freeze — the kind we lived through in early June — turns it amber and tells you the last date we have. Same logic as the server-side freshness canary we run daily, just now surfaced right in the UI where you can see it without digging into GitHub Actions. The dashboard's 'LAST UPDATED' label got the same treatment, plus it now shows a human-readable date ('Jun 12, 2026') instead of a raw ISO string."}
          />
          <ChangelogEntry
            date="June 13, 2026"
            tag="housekeeping"
            title="The landing page finally mentions Layering Radar — only took me a month to notice it wasn't there"
            desc="The Layering Radar has been live since early June. It's probably the most interesting thing on the site — when three or more independent fund families each open the same brand-new stock position within days of each other, that's the kind of signal that a quarterly 13F will never catch in time. And it wasn't on the landing page. At all. Replaced the 'Discord Alerts' feature card (still works, just not the marquee pitch) with a proper Layering Radar card. Also added it to the Reddit share text because if someone's posting a writeup they should probably mention the best feature. Sometimes you ship a thing and then forget to tell anyone it exists."
          />
          <ChangelogEntry
            date="June 13, 2026"
            tag="feature"
            title="Added a rotation panel to ULTY too — by sector this time — and confirmed Kurv's funds just don't move"
            desc={"After the ULTI rotation tracker I went looking at whether the YieldMax and Kurv funds rotate enough to be worth the same treatment. Honest answer: mostly no. KYLD and KQQQ (Kurv) hold a basically fixed basket of large-caps and just write options on them — KQQQ kept the exact same 19 names start to finish, KYLD swapped maybe three in three months. Flat lines, nothing to watch, so I left them alone. ULTY (YieldMax) does rotate, but gently — it shuffles a handful of high-IV names per quarter, not a whole-basket rebuild like ULTI. So ULTY's fund page now has its own rotation panel, but grouped by SECTOR instead of theme (it holds normal large-caps — NVDA, CAT, AMZN, GOOGL — not crypto miners and quantum lottery tickets). You can see it sits ~48% tech and has been quietly leaning into industrials lately. Same deal as before: it regenerates daily, and any name I haven't sorted yet just shows as 'Uncategorized' instead of breaking. Under the hood the whole thing got generalized so adding another fund later is a one-liner."}
          />
          <ChangelogEntry
            date="June 13, 2026"
            tag="feature"
            title="New on ULTI's page: a Theme Rotation tracker, because that fund never sits still"
            desc={"If you watch ULTI you already know it doesn't buy-and-hold anything — it rebuilds its whole speculative basket constantly. Digging through it I found it had rotated nuclear/uranium names in during May and then dumped them for a fresh quantum sleeve by June, plus turned over half its book in a single week. You couldn't see any of that at a glance, so I built it: ULTI's fund page now has a Theme Rotation panel — current theme mix (bitcoin miners, space, quantum, clean energy, semis, drones, rare earth), a week-by-week heatmap of how those weights drift, and a 'latest churn' row showing exactly which tickers rotated in (green) and out (red). It regenerates itself every morning off the fresh holdings, so it's always current. And before you ask — if ULTI buys some brand-new name I haven't categorized yet, it just shows up as 'Uncategorized' instead of breaking anything. Nobody has to remember to do anything."}
          />
          <ChangelogEntry
            date="June 13, 2026"
            tag="bugfix"
            title="Gave the Strategy Effectiveness scores a real audit — turns out I didn't fully believe them either"
            desc={"A user told me they've been liking ULTI and asked me to pull up its effectiveness grade to sanity-check the feeling. I went to do it and… ULTI had no grade at all. Pulled the thread, and the whole scorecard needed work. Four fixes. (1) The grader only ever looked at the single most recent day — so when one bad scrape dropped ULTI's option legs, the fund silently vanished from the analysis instead of showing a number. Now it falls back to the last day that actually has data and stamps an amber 'as of [date]' badge so you know it's not live. And I chased down WHY ULTI kept going dark: REX quietly started serving its options in a second CSV format some days (a name like 'CLSK US 06/12/26 C16' instead of the usual option ticker), and our parser only understood the old one — so on those days ULTI's whole options book got silently dumped into the 'OTHER' bucket. Taught the parser the new format; ULTI's options come through on both now. (2) The 'personality profile' each fund gets graded against had drifted badly — ULTI was literally labeled as a YieldMax fund (it's REX), and scored as if it sold slightly-OTM weekly covered calls when it actually sells AT-the-money 4-leg spreads. I pulled the real strikes and expirations across the last two months and re-tuned all nine option funds to what they genuinely do. (3) It was grading some funds off a SINGLE option because the strike data was missing for the rest — one outlier, confident F. Now if too few positions have usable data it just says 'insufficient data' instead of inventing a grade. (4) It was blending a fund's weekly income calls together with its long-dated protective puts into one number and scoring it a zero — now calls and puts get judged on their own cadence. Honest part: a few grades got WORSE after this, on purpose. The goal was to make the number mean something, not to flatter the funds. ULTI grades out a B now — and that's a real B."}
          />
          <ChangelogEntry
            date="June 12, 2026"
            tag="feature"
            title="Reworked the Whop app after it got rejected — it inherits your theme now, and creators can broadcast the daily brief"
            desc={"Honest update: I submitted TickerTrace to the Whop App Store and it got bounced. Two fair hits. First, the embedded app was hard-locked to dark mode and ignored whatever theme the Whop community was running — so on a light-mode Whop it looked broken. Fixed: it now reads the host's theme and follows it, light or dark, no flash. Built out a real light palette while I was in there, since I'd genuinely never made one. Second, and the bigger note: they said a dashboard that just shows stock data isn't enough on its own — it needs to actually help a creator run their community. So I added a Broadcast tab that only community admins see: it auto-builds the day's institutional brief (top buying/selling conviction, multi-day streaks), lets you add a note in your own voice, and pushes it to your whole community in one tap — landing them straight on the live signals. It's a daily piece of content you don't have to write, and a daily reason for your members to come back. No new accounts, no database, no setup beyond flipping on one permission. Resubmitting now — we'll see."}
          />
          <ChangelogEntry
            date="June 12, 2026"
            tag="feature"
            title="Stocks page: sort by 'Biggest Δ today' — and weight deltas finally show their % sign"
            desc={"Two things that were bugging me. (1) The /stocks index had two sort options — most widely held and most weight — but no way to answer the obvious question: what's actually MOVING today? Added a third sort, 'Biggest Δ today,' that reorders everything by the size of today's institutional weight shift, biggest absolute move first. If something got hit hard or loaded up on by the funds this morning, it floats right to the top. (2) While I was in there I noticed the Δ today column was showing values like '+0.012' with no unit, sitting right next to the 'Total wt' column that correctly shows '+0.012%'. Same bug on the accumulation/distribution trend bars on the dashboard — those little D/W/M values were also unitless. Fixed both: they now read '+0.012%' so you know it's a percentage-point weight shift, not a price change or anything else."}
          />
          <ChangelogEntry
            date="June 11, 2026"
            tag="polish"
            title="Gave Layering Radar a once-over after shipping it"
            desc={"Went back through the new Layering Radar with fresh eyes now that it's live. Good news: it's solid — the links work, the fund-family colors line up, the API and AI-agent hooks all behave. Two small things while I was in there: the 'strength' number now has a hover tooltip that actually tells you what goes into it (how many funds, how many separate families, combined AUM), so it's not just a mystery number anymore — same treatment I gave the conviction score yesterday. And I gave the AI-agent version of the tool a 'limit' knob so an agent can ask for just the top few patterns instead of the whole list. Boring plumbing, but that's how it should be."}
          />
          <ChangelogEntry
            date="June 11, 2026"
            tag="feature"
            title="Hover over 'conv X.X' and it finally tells you what that number means"
            desc={"The conviction score is the most important number on the signals board and I'd never explained it — it just sat there as 'conv 5.2' with no context. Hover over it now and you get a plain-English breakdown: it's (# of funds in the move) × (weight % moved) × (average fund AUM). Basically a dollar-weighted measure of how hard institutions are pushing in one direction. More funds, bigger moves, larger funds = higher score. While I was at it, the 'P/C Ratio' KPI at the top now has a hover tooltip too — because 'P/C' reads as Price/Cost as easily as Put/Call, which is not great for a stat that's trying to show you directional positioning."}
          />
          <ChangelogEntry
            date="June 10, 2026"
            tag="bugfix"
            title="Corrected the fund count on the landing page — it was embarrassingly out of date"
            desc={"The comparison table said '14 ETFs, 6 providers.' That was accurate back in early March when ARK and Avantis were basically the whole show. Since then we've added Corgi Funds (16 ETFs on their own), a full YieldMax suite, Roundhill's weekly-pay lineup, two more REX single-stock funds, Sprott, NestYield, and NicholasX. Actual count today: 53 funds across 10 providers. The '14' number was sitting right next to the live dashboard KPI that says the real number, which made us look like we couldn't do basic arithmetic. Fixed. Also updated the provider list in the feature card to include Sprott, which had been quietly tracking away without a mention."}
          />
          <ChangelogEntry
            date="June 9, 2026"
            tag="bugfix"
            title="The activity heatmap no longer tells you 'no data' when you're the one who filtered it"
            desc="Embarrassingly obvious in hindsight: if you clicked a provider pill on the heatmap — say, you clicked 'ARK' to narrow it down — and ARK had no moves that day, the grid would blank out and tell you 'No activity to display. Data updates on weekday mornings.' Which reads like the site is broken or the data is stale, when really you just filtered it to zero and nothing suggested you try a different provider or clear the filter. Fixed it: when a provider filter is active and returns nothing, it now says 'No ARK activity today — try All to see moves across every provider' (or whichever one you picked). Small thing, but the old message was actively misleading."
          />
          <ChangelogEntry
            date="June 9, 2026"
            tag="feature"
            title="New: Layering Radar — catch smart money piling into a stock in real time"
            desc={"This is the feature I'm most excited about in a while, and it only exists because we scrape DAILY instead of waiting for quarterly 13F filings. 'Layering' is when three or more institutional stock-pickers each open a brand-new position in the SAME stock within a few days of each other — independent shops quietly arriving at the same idea at the same time. The new Layering Radar (in the top nav) ranks these live, and the part I love: it shows you the ENTRY ORDER. Right now it's flagging GOOGL (ARK and NestYield both piled in within a week) and CRWV (three different fund families — Avantis, Corgi, NestYield — all opened it fresh). A 13F site literally cannot show you this; by the time those filings drop the move is 45+ days cold. Cross-family pile-ups rank highest, because three separate shops agreeing is a very different signal than one shop spreading a pick across its own lineup. It's also wired into the API (/api/v1/layering-patterns) and the MCP server, so your AI agent can pull it too. Early days on the scoring — I'll tune it as we watch it run — but the core idea is the most 'only-we-have-this' thing on the site."}
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
  date: string; tag: 'feature' | 'bugfix' | 'housekeeping' | 'polish'; title: string; desc: string;
}) {
  const tagStyle = tag === 'bugfix'
    ? 'bg-[#ff4444]/10 text-[#ff4444] border-[#ff4444]/20'
    : tag === 'housekeeping'
    ? 'bg-[#8b9cb3]/10 text-[#8b9cb3] border-[#8b9cb3]/20'
    : tag === 'polish'
    ? 'bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/20'
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
