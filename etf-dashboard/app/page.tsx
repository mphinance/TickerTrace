import Link from 'next/link';
import { ReferralTracker } from '@/components/referral-tracker';
import {
  TrendingUp, Zap, BarChart3, Search, GitFork, Bell,
  Shield, ArrowRight, CheckCircle2
} from 'lucide-react';

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
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-[#00d4ff] text-[#0a0f1e] text-sm font-bold rounded-lg hover:bg-white transition-colors"
            >
              Open Intel →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] text-xs font-semibold px-4 py-2 rounded-full mb-8">
          <span className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
          LIVE · Updated every market day
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-6">
          What are<br />
          <span className="bg-gradient-to-r from-[#00d4ff] via-[#00ff88] to-[#a78bfa] bg-clip-text text-transparent">
            institutions buying?
          </span>
        </h1>

        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          We track 14 actively-managed ETFs daily and surface what the smart money is actually doing —
          before it moves the market. Conviction scores. Streak tracking. Option flow decoded.
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

      {/* Features grid */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-[#1f2937]">
        <h2 className="text-3xl font-bold text-center mb-4">The edge retail never had</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
          Every day, institutional funds are required to publish what they hold. We read it so you don't have to.
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
            title="Sector Flow"
            desc="See which sectors money is flowing into and out of — before the rotation plays out in price."
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
            href="mailto:sam@mphinance.com?subject=TickerTrace Founders Partner"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#a78bfa] text-white font-bold rounded-xl hover:bg-[#9060f0] transition-colors"
          >
            Apply to Partner <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </section>

      {/* Pricing (future) teaser */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-[#1f2937]">
        <h2 className="text-3xl font-bold text-center mb-3">Simple pricing, coming soon</h2>
        <p className="text-slate-400 text-center mb-12">Right now it's all free. Early users lock in the best rate.</p>

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
            cta="Join the waitlist"
            href="mailto:sam@mphinance.com?subject=TickerTrace Pro Waitlist"
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
          <Link href="/api/signals" className="hover:text-white transition-colors">JSON API</Link>
          {' · '}
          <a href="mailto:sam@mphinance.com" className="hover:text-white transition-colors">Contact</a>
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

// React import needed for JSX types
import React from 'react';
