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
            <Link href="/api/signals" className="text-sm text-slate-400 hover:text-white transition-colors">
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
          <Link href="/api/signals" className="hover:text-white transition-colors">JSON API</Link>
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
