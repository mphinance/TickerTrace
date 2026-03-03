import Link from 'next/link';
import { ReferralTracker } from '@/components/referral-tracker';
import {
  TrendingUp, Zap, BarChart3, Search, GitFork, Bell,
  Shield, ArrowRight, CheckCircle2, Clock, Eye, AlertTriangle,
  MessageSquarePlus
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
            <Link href="https://api.tickertrace.mphinance.com/docs" target="_blank" className="text-sm text-slate-400 hover:text-white transition-colors">
              API
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-[#00d4ff] text-[#0a0f1e] text-sm font-bold rounded-lg hover:bg-white transition-colors"
            >
              Open Intel →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — the 90-day absurdity */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] text-xs font-semibold px-4 py-2 rounded-full mb-8">
          <span className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
          LIVE · Updated every market day
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-6">
          Want to know what they<br />
          <span className="bg-gradient-to-r from-[#00d4ff] via-[#00ff88] to-[#a78bfa] bg-clip-text text-transparent">
            were buying 90 days ago?
          </span>
        </h1>

        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-4 leading-relaxed">
          Yeah, neither do we.
        </p>

        <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Your broker shows you what institutions held <span className="text-[#ff4444] font-bold">last quarter</span>.
          These funds publish their holdings <span className="text-[#00ff88] font-bold">every single day</span> —
          to public websites, for free. We just read them before everyone else does.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#00d4ff] text-[#0a0f1e] font-bold text-lg rounded-xl hover:scale-105 transition-transform shadow-lg shadow-[#00d4ff]/20"
          >
            See Today's Intel <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/dashboard?q=TSLA"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#111827] border border-[#1f2937] text-white font-semibold text-lg rounded-xl hover:bg-[#1a2333] transition-colors"
          >
            <Search className="h-5 w-5 text-[#00d4ff]" /> Search a Ticker
          </Link>
        </div>
      </section>

      {/* The problem — 90-day delay explained */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-[#1f2937]">
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
            <h3 className="text-xl font-bold mb-3">What we show you</h3>
            <p className="text-slate-400 leading-relaxed mb-4">
              Actively-managed ETFs publish their full holdings <span className="text-[#00ff88] font-bold">every market day</span> on
              their websites. We scrape, normalize, and diff them before the opening bell.
            </p>
            <div className="font-mono text-sm text-[#00ff88]/60">Scraped: 7am today → You see it: now</div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-[#1f2937]">
        <h2 className="text-3xl font-bold text-center mb-4">The edge retail never had</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
          14 ETFs. 6 providers. Every position, every day. Cross-fund conviction scoring, streak tracking, and option flow — decoded.
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
            title="🔥 Streak Tracking"
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
        <h2 className="text-3xl font-bold text-center mb-4">How we compare</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
          Other tools charge $19–$500/mo for ETF data. We cross multiple fund families AND add intelligence on top.
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
              <CompRow feature="Price" us="Free / $15mo" them="Free" etfrc="$29/mo" ark="Free" />
            </tbody>
          </table>

        </div>
      </section>

      {/* Request a fund */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-[#1f2937]">
        <div className="bg-gradient-to-r from-[#111827] to-[#0f1729] border border-[#1f2937] rounded-2xl p-10 text-center">
          <MessageSquarePlus className="h-10 w-10 text-[#00d4ff] mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Don't see your fund?</h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-6">
            If you know of an ETF that publishes daily holdings, we can add it — usually in under an hour.
            Same provider? One line of code.
          </p>
          <a
            href="mailto:mphinance@gmail.com?subject=TickerTrace Fund Request&body=Fund%20ticker:%20%0AProvider%20website:%20%0AHoldings%20page%20URL:%20"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#00d4ff] text-[#0a0f1e] font-bold rounded-xl hover:bg-white transition-colors"
          >
            Request a Fund <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </section>

      {/* Founders callout */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-[#1f2937]">
        <div className="bg-gradient-to-r from-[#0f1729] via-[#111827] to-[#0f1729] border border-[#a78bfa]/20 rounded-2xl p-10 text-center">
          <Shield className="h-12 w-12 text-[#a78bfa] mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Founders' Partner Program</h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-6">
            If you manage a Discord community, newsletter, or trading group — we'll give your members access and share
            <span className="text-[#a78bfa] font-bold"> 40% of revenue</span> you refer. Forever.
          </p>
          <a
            href="mailto:mphinance@gmail.com?subject=TickerTrace Founders Partner"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#a78bfa] text-white font-bold rounded-xl hover:bg-[#9060f0] transition-colors"
          >
            Apply to Partner <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </section>

      {/* Pricing (future) teaser */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-[#1f2937]">
        <h2 className="text-3xl font-bold text-center mb-3">Simple pricing</h2>
        <p className="text-slate-400 text-center mb-12">Start free. Upgrade when you're ready.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <PricingCard
            tier="Free"
            price="$0"
            desc="Top signals, sector flow, briefing card."
            cta="Start now"
            href="/dashboard"
            features={['Daily briefing card', 'Top 5 buying signals', 'Sector flow summary', 'Ticker search']}
            highlight={false}
          />
          <PricingCard
            tier="Pro"
            price="$15/mo"
            desc="Full access, Discord alerts, JSON API, historical data."
            cta="Get Pro Access →"
            href="/dashboard"
            features={['Everything in Free', 'Full signal history', 'Discord webhook alerts', 'JSON API access', 'Divergence alerts', 'Priority support']}
            highlight={true}
          />
        </div>
      </section>

      {/* Changelog — patch notes from the trenches */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-[#1f2937]">
        <h2 className="text-3xl font-bold text-center mb-3">Patch Notes from the Trenches</h2>
        <p className="text-slate-400 text-center mb-10 max-w-xl mx-auto text-sm">
          We believe in radical transparency. That includes the embarrassing parts.
        </p>

        <div className="max-w-2xl mx-auto space-y-4">
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
          <Link href="https://api.tickertrace.mphinance.com/docs" target="_blank" className="hover:text-white transition-colors">API Docs</Link>
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

function PricingCard({ tier, price, desc, cta, href, features, highlight }: {
  tier: string; price: string; desc: string; cta: string; href: string;
  features: string[]; highlight: boolean;
}) {
  return (
    <div className={`rounded-2xl p-8 border ${highlight
      ? 'bg-gradient-to-b from-[#111827] to-[#0f1729] border-[#00d4ff]/30 shadow-lg shadow-[#00d4ff]/10'
      : 'bg-[#111827] border-[#1f2937]'}`}>
      {highlight && (
        <div className="text-xs font-bold text-[#00d4ff] uppercase tracking-widest mb-4">Most Popular</div>
      )}
      <div className="text-2xl font-black text-white mb-1">{tier}</div>
      <div className="text-4xl font-black text-[#00d4ff] mb-2">{price}</div>
      <p className="text-sm text-slate-400 mb-6">{desc}</p>
      <ul className="space-y-2 mb-8">
        {features.map(f => (
          <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-[#00ff88] shrink-0" />{f}
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={`block text-center py-3 rounded-xl font-bold transition-colors ${highlight
          ? 'bg-[#00d4ff] text-[#0a0f1e] hover:bg-white'
          : 'bg-[#1e293b] text-white hover:bg-[#334155]'}`}
      >
        {cta}
      </Link>
    </div>
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
