// Review #10 finale: dashboard now renders from the FastAPI server via lib/api.ts.
// The old holdings.ts code path was removed; only PROVIDER_ORDER (a static
// display-order list) is still imported from there.
import { api } from '@/lib/api';
import type {
  ApiSignal,
  ApiSignals,
  ApiBriefing,
  ApiActivity,
  ApiSectorFlow,
  ApiDivergence,
  ApiTickerDetail,
  ApiChangeRecord,
  ApiOptionSignal,
  ApiSignalPerformance,
} from '@/lib/api';
// PROVIDER_ORDER (display order) and getProvider (static FUND_PROVIDERS lookup)
// are static reference data — fine to import from the otherwise-deprecated
// holdings.ts. The dashboard's dynamic data now all comes from lib/api.ts.
import { PROVIDER_ORDER, getProvider } from '@/lib/holdings';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowUpRight, ArrowDownRight, Layers, PieChart, Activity,
  ChevronDown, TrendingUp, TrendingDown, Zap, Building2, Eye,
  Flame, Target, Crosshair, BarChart3, Search, GitFork, Bell
} from 'lucide-react';
import React from 'react';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { TickerSearchForm } from '@/components/ticker-search';
import { SiteNav } from '@/components/site-nav';
import { InstitutionalSummary } from '@/components/institutional-summary';
import { FundsGrid } from '@/components/funds-grid';
import { DiscordWebhook } from '@/components/discord-webhook';
import { KeyboardSearch } from '@/components/keyboard-search';
import { ActivityHeatmap } from '@/components/activity-heatmap';
import { AskTickerTrace } from '@/components/ask-tickertrace';
import { ShareButtons } from '@/components/share-buttons';
// Auth UI was removed when TickerTrace went fully open. ProGate was a no-op
// pass-through and got inlined out — if/when we ever paywall something again,
// reach for a fresh wrapper component rather than reviving the old surface.

export const revalidate = 3600;

/** Read the pre-computed signal-vs-price backtest from disk. The scrape
 *  workflow regenerates this file daily; the dashboard picks it up on
 *  the next ISR revalidation. Returns null if missing — card just won't
 *  render until the first scrape produces it. */
function loadSignalPerformance(): ApiSignalPerformance | null {
  try {
    const p = path.join(process.cwd(), 'public', 'data', 'signal_performance.json');
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as ApiSignalPerformance;
  } catch {
    return null;
  }
}

// Inline a small option-signal decoder (was decodeOptionSignal in holdings.ts).
// Keeping it local because it's pure display logic and avoids a round-trip.
function decodeOptionSignal(r: ApiChangeRecord): ApiOptionSignal | null {
  if (!r.isOption || !r.optionDetails) return null;
  const type = r.optionDetails.type.toLowerCase();
  const strike = r.optionDetails.strike;
  const moneyness = r.currentWeight > 0 ? 'OTM (likely)' : 'ATM/ITM';
  if (type.startsWith('p')) {
    return { strategy: 'Cash-Secured Put', directionalView: `Bullish above $${strike}`, moneyness };
  }
  if (type.startsWith('c')) {
    return { strategy: 'Covered Call', directionalView: `Capping upside at $${strike}`, moneyness };
  }
  return null;
}

// Coerce a global stats record (FastAPI shape) into the dashboard's display shape.
function totalsFor(stats: { fundsTracked: number; uniqueTickers: number; putCallRatio: number }) {
  return {
    totalFunds: stats.fundsTracked,
    totalUnderlyings: stats.uniqueTickers,
    pcRatio: stats.putCallRatio.toString(),
  };
}

// Flatten the API's {inflows, outflows} into a single sorted list for the card.
function flattenSectorFlow(flow: ApiSectorFlow) {
  return [...flow.inflows.map(e => ({ sector: e.sector, weightDelta: e.delta })),
          ...flow.outflows.map(e => ({ sector: e.sector, weightDelta: e.delta }))];
}

interface FlatSectorEntry { sector: string; weightDelta: number }

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const searchQuery = params.q?.toUpperCase().trim() || '';

  // Single round-trip to FastAPI for the headline payload, plus a weekly
  // activity fetch and an optional ticker lookup. Everything else is derived.
  // throwOnError: false lets the !payload / !weeklyBuySell guards below
  // render the empty-state shell instead of crashing the build when the API
  // is unreachable (eg. backend down). Was the cause of a Vercel build break.
  const payload = await api.signals({ throwOnError: false });
  const weeklyBuySell = await api.activity('weekly', { throwOnError: false });
  const tickerDetail = searchQuery ? await api.ticker(searchQuery) : null;
  // Leaderboard-home data: the cross-fund institutional aggregate (top
  // buys/sells across all stock-picking funds) and the tracked-funds list.
  const institutional = await api.institutional('daily', 12, { throwOnError: false });
  const fundsList = await api.funds({ throwOnError: false });
  // Signal-performance JSON is regenerated by the daily scrape workflow and
  // committed to public/data/. Reading it from disk (rather than via the API)
  // means the card works as soon as the file lands — no API deploy required.
  const signalPerf = loadSignalPerformance();

  // Guard: if the API is unreachable (cold start, network blip), render an
  // empty-state shell rather than crashing the page.
  if (!payload) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] text-foreground p-6 font-sans flex items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-2">Data unavailable</h1>
          <p className="text-slate-400">
            The TickerTrace API didn&apos;t respond. Refresh in a moment — and if it
            keeps happening, let us know on the contact page.
          </p>
        </div>
      </div>
    );
  }

  const asOfDate = payload.asOfDate;
  const stats = totalsFor(payload.stats);
  const dailySignals: ApiSignals = payload.signals;
  const briefing: ApiBriefing = payload.briefing;
  const dailyBuySell: ApiActivity = payload.activity;
  const sectorFlow: FlatSectorEntry[] = flattenSectorFlow(payload.sectorFlow);
  const divergences: ApiDivergence[] = payload.divergences;

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-foreground p-6 space-y-6 font-sans">
      <KeyboardSearch />

      {/* Shared app navigation */}
      <SiteNav />

      {/* Status + KPI bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111827] border border-[#1f2937] p-4 rounded-xl shadow-lg">
        <p className="text-sm text-slate-400 font-mono">
          LAST UPDATED: <span className="text-white bg-slate-800 px-2 py-0.5 rounded">{asOfDate}</span>
        </p>
        <div className="flex gap-3 items-center">
          <KPICard title="Funds Tracked" value={stats.totalFunds.toString()} icon={<Layers className="h-4 w-4 text-[#00d4ff]" />} />
          <KPICard title="Underlyings" value={stats.totalUnderlyings.toString()} icon={<Activity className="h-4 w-4 text-[#00d4ff]" />} />
          <KPICard title="P/C Ratio" value={stats.pcRatio} icon={<PieChart className="h-4 w-4 text-[#00d4ff]" />} />
        </div>
      </div>

      {/* Ticker Search — promoted to its own row, full-width, with a label */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-[#00d4ff]" />
            Look up any ticker
          </h2>
          <span className="text-[10px] text-slate-500">
            See every fund holding it, weights, recent moves, options
          </span>
        </div>
        <TickerSearchForm />
      </div>

      {/* Ticker Detail (if searched) */}
      {searchQuery && <TickerDetailCard detail={tickerDetail} query={searchQuery} />}

      {/* Leaderboard home — what institutions as a whole are doing, plus the
          tracked-funds overview. The familiar "top buys/sells" landing view. */}
      {institutional && (
        <div className="flex items-center justify-end -mb-3">
          <Link href="/changes" className="text-xs text-[#00d4ff] hover:underline">
            Full changes & weekly/monthly view →
          </Link>
        </div>
      )}
      {institutional && <InstitutionalSummary flow={institutional} />}
      {fundsList?.funds && <FundsGrid funds={fundsList.funds} />}

      {/* Ask TickerTrace — Claude-powered chat over our own data */}
      <AskTickerTrace />

      {/* Did the signals work? — honest backtest */}
      {signalPerf && <SignalPerformanceCard perf={signalPerf} />}

      {/* Pre-Market Briefing */}
      {briefing && <BriefingCard briefing={briefing} />}

      {/* Sector Flow + Signals Hero side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SignalsHero buying={dailySignals.buying} selling={dailySignals.selling} />
        </div>
        <SectorFlowCard flows={sectorFlow} />
      </div>

      {/* Divergences */}
      {divergences.length > 0 && (
        <Collapsible defaultOpen={divergences.some(d => d.intrashop)}>
            <CollapsibleTrigger className="w-full">
              <Card className="bg-[#111827] border-[#a78bfa]/20 text-slate-200 hover:bg-[#1a1a2e] transition-colors cursor-pointer">
                <CardHeader className="py-4">
                  <CardTitle className="text-md font-bold flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[#a78bfa]">
                      <GitFork className="h-5 w-5" /> Divergences
                      <span className="text-xs font-normal text-slate-400">funds moving in opposite directions on the same ticker</span>
                      {divergences.some(d => d.intrashop) && (
                        <Badge variant="outline" className="text-orange-400 border-orange-400/30 bg-orange-400/10 text-[10px]">intra-shop conflict</Badge>
                      )}
                    </span>
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  </CardTitle>
                </CardHeader>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <Card className="bg-[#111827] border-[#a78bfa]/20">
                <CardContent className="pt-4 space-y-3">
                  {divergences.map(d => <DivergenceRow key={d.ticker} divergence={d} />)}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
      )}

      {/* Daily Activity — Heatmap + Table */}
      <Collapsible defaultOpen>
          <CollapsibleTrigger className="w-full">
            <Card className="bg-[#111827] border-[#1f2937] text-slate-200 hover:bg-[#1a2333] transition-colors cursor-pointer">
              <CardHeader className="py-4">
                <CardTitle className="text-lg font-bold flex items-center justify-between text-white">
                  <span className="flex items-center gap-2"><Eye className="h-5 w-5 text-[#00d4ff]" /> Daily Activity</span>
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                </CardTitle>
              </CardHeader>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Card className="bg-[#111827] border-[#1f2937] text-slate-200">
              <CardContent className="pt-6">
                <Tabs defaultValue="heatmap" className="w-full">
                  <TabsList className="bg-[#0f172a] border border-[#1e293b] mb-4">
                    <TabsTrigger value="heatmap" className="data-[state=active]:bg-[#00d4ff]/10 data-[state=active]:text-[#00d4ff]">
                      🔥 Heatmap
                    </TabsTrigger>
                    <TabsTrigger value="table" className="data-[state=active]:bg-[#00d4ff]/10 data-[state=active]:text-[#00d4ff]">
                      📋 Table
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="heatmap">
                    {dailyBuySell ? (
                      <ActivityHeatmap
                        records={[
                          ...dailyBuySell.accumulating.map(r => ({ fund: r.fund, ticker: r.ticker, name: r.name, weightDelta: r.weightDelta, type: r.type })),
                          ...dailyBuySell.reducing.map(r => ({ fund: r.fund, ticker: r.ticker, name: r.name, weightDelta: r.weightDelta, type: r.type })),
                        ]}
                        providers={PROVIDER_ORDER}
                      />
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <Eye className="h-8 w-8 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">No daily data yet</p>
                        <p className="text-xs mt-1 text-slate-600">Data updates on weekday mornings when the scraper runs.</p>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="table">
                    <ActivityViewer data={dailyBuySell} timeframe="today" />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

      {/* Weekly Activity — Heatmap + Table */}
      <Collapsible>
        <CollapsibleTrigger className="w-full">
          <Card className="bg-[#111827] border-[#1f2937] text-slate-200 hover:bg-[#1a2333] transition-colors cursor-pointer">
            <CardHeader className="py-4">
              <CardTitle className="text-md font-bold flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-2"><Layers className="h-5 w-5" /> Weekly Activity</span>
                <ChevronDown className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <Card className="bg-[#111827] border-[#1f2937] text-slate-200">
            <CardContent className="pt-6">
              <Tabs defaultValue="heatmap" className="w-full">
                <TabsList className="bg-[#0f172a] border border-[#1e293b] mb-4">
                  <TabsTrigger value="heatmap" className="data-[state=active]:bg-[#00d4ff]/10 data-[state=active]:text-[#00d4ff]">
                    🔥 Heatmap
                  </TabsTrigger>
                  <TabsTrigger value="table" className="data-[state=active]:bg-[#00d4ff]/10 data-[state=active]:text-[#00d4ff]">
                    📋 Table
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="heatmap">
                  {weeklyBuySell ? (
                    <ActivityHeatmap
                      records={[
                        ...weeklyBuySell.accumulating.map(r => ({ fund: r.fund, ticker: r.ticker, name: r.name, weightDelta: r.weightDelta, type: r.type })),
                        ...weeklyBuySell.reducing.map(r => ({ fund: r.fund, ticker: r.ticker, name: r.name, weightDelta: r.weightDelta, type: r.type })),
                      ]}
                      providers={PROVIDER_ORDER}
                    />
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <p className="text-sm">No weekly data yet. Accumulates over the trading week.</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="table">
                  <ActivityViewer data={weeklyBuySell} timeframe="this week" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Integrations & sharing — collapsed by default so config doesn't
          dominate prime real estate up top. Discord webhook + social share. */}
      <Collapsible>
        <CollapsibleTrigger className="w-full">
          <Card className="bg-[#111827] border-[#1f2937] text-slate-200 hover:bg-[#1a1a2e] transition-colors cursor-pointer">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-2">
                  <Bell className="h-4 w-4" /> Integrations & sharing
                  <span className="text-xs font-normal text-slate-600">— Discord webhook, X / Reddit share</span>
                </span>
                <ChevronDown className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <Card className="bg-[#111827] border-[#1f2937]">
            <CardContent className="pt-4 space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5 text-[#5865F2]" /> Discord webhook
                </h3>
                <p className="text-[11px] text-slate-500 mb-2">
                  Paste a Discord channel webhook URL once and we&apos;ll post the daily briefing there every morning.
                </p>
                <DiscordWebhook
                  buyingSignals={dailySignals.buying}
                  sellingSignals={dailySignals.selling}
                  sectorFlow={sectorFlow}
                  asOfDate={asOfDate}
                />
              </div>
              <div className="border-t border-[#1f2937] pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
                  Share this dashboard
                </h3>
                <p className="text-[11px] text-slate-600 mb-3">
                  The Reddit button opens a text post with a real writeup — link posts to
                  the same domain get auto-flagged as advertising.
                </p>
                <ShareButtons
                  size="sm"
                  align="start"
                  url="https://tickertrace.pro/dashboard"
                  tweet={`${dailySignals.buying.length + dailySignals.selling.length} institutional ETF signals today. Top buys: ${dailySignals.buying.slice(0, 3).map(s => s.ticker).join(', ')}. See what the institutions are doing before the herd does.`}
                  redditTitle={`${dailySignals.buying.length + dailySignals.selling.length} institutional ETF position changes flagged today`}
                  redditText={[
                    `Ran today's scan of institutional ETF holdings — ${dailySignals.buying.length + dailySignals.selling.length} position changes worth a look. Top buys right now: ${dailySignals.buying.slice(0, 3).map(s => s.ticker).join(', ') || 'see the dashboard'}.`,
                    "",
                    "It's from a free tool I built that diffs fund holdings every morning — ARK, Avantis, YieldMax, Kurv and more. No signup: https://tickertrace.pro/dashboard",
                    "",
                    "Full disclosure: it's my project, and the data API is open. Sharing the signal because this sub might find it useful — happy to answer questions on the methodology.",
                  ].join("\n")}
                />
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KPICard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-4 py-2 min-w-[120px]">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{title}</span>
        {icon}
      </div>
      <div className="text-xl font-bold font-mono text-white tracking-tight">{value}</div>
    </div>
  );
}

// ─── Divergence Row ───────────────────────────────────────────────────────────

function DivergenceRow({ divergence: d }: { divergence: ApiDivergence }) {
  // Tug-of-war: total buying pressure vs total selling pressure on this ticker.
  // The bar makes a lopsided fight ("everyone's buying, one fund is dumping")
  // readable at a glance instead of having to mentally sum the percentages.
  const totalBuy = d.buyingFunds.reduce((s, f) => s + Math.abs(f.weightDelta), 0);
  const totalSell = d.sellingFunds.reduce((s, f) => s + Math.abs(f.weightDelta), 0);
  const buyPct = totalBuy + totalSell > 0 ? (totalBuy / (totalBuy + totalSell)) * 100 : 50;
  return (
    <div className={`rounded-lg border px-4 py-3 ${d.intrashop ? 'border-orange-400/30 bg-orange-400/5' : 'border-[#a78bfa]/20 bg-[#a78bfa]/5'}`}>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Buying side */}
        <div className="flex flex-wrap gap-1">
          {d.buyingFunds.map(f => (
            <span key={f.fund} className="flex items-center gap-1">
              <Badge variant="outline" className={`font-mono text-[10px] px-1.5 py-0 ${getETFColor(f.fund)}`}>{f.fund}</Badge>
              <span className="text-[10px] text-[#00ff88] font-mono">+{f.weightDelta.toFixed(2)}%</span>
            </span>
          ))}
        </div>

        {/* Center: ticker + label */}
        <div className="flex items-center gap-2 mx-auto">
          <ArrowUpRight className="h-3 w-3 text-[#00ff88]" />
          <Link href={`/dashboard?q=${d.ticker}`} title={`Look up ${d.ticker} across funds`} className="font-mono font-bold text-white hover:text-[#00d4ff] transition-colors">{d.ticker}</Link>
          <span className="text-[10px] text-slate-500 max-w-[120px] truncate">{d.name}</span>
          <ArrowDownRight className="h-3 w-3 text-[#ff4444]" />
          {d.intrashop && (
            <Badge variant="outline" className="text-orange-400 border-orange-400/30 bg-orange-400/10 text-[10px] ml-1">INTRA-SHOP</Badge>
          )}
        </div>

        {/* Selling side */}
        <div className="flex flex-wrap gap-1 justify-end">
          {d.sellingFunds.map(f => (
            <span key={f.fund} className="flex items-center gap-1">
              <Badge variant="outline" className={`font-mono text-[10px] px-1.5 py-0 ${getETFColor(f.fund)}`}>{f.fund}</Badge>
              <span className="text-[10px] text-[#ff4444] font-mono">{f.weightDelta.toFixed(2)}%</span>
            </span>
          ))}
        </div>
      </div>

      {/* Tug-of-war bar — total buy pressure vs total sell pressure */}
      <div className="flex items-center gap-2 mt-2.5">
        <span className="text-[10px] font-mono text-[#00ff88] shrink-0 w-14 text-right">+{totalBuy.toFixed(2)}%</span>
        <div className="flex-1 h-2 rounded-full overflow-hidden bg-[#1f2937] flex">
          <div className="h-full bg-[#00ff88]/80" style={{ width: `${buyPct}%` }} />
          <div className="h-full bg-[#ff4444]/80" style={{ width: `${100 - buyPct}%` }} />
        </div>
        <span className="text-[10px] font-mono text-[#ff4444] shrink-0 w-14">-{totalSell.toFixed(2)}%</span>
      </div>
    </div>
  );
}

// ─── Ticker Detail ───────────────────────────────────────────────────────────

function TickerDetailCard({ detail, query }: { detail: ApiTickerDetail | null; query: string }) {
  if (!detail) {
    return (
      <Card className="bg-[#111827] border-[#ff4444]/20">
        <CardContent className="py-6 text-center">
          <Search className="h-8 w-8 mx-auto mb-3 text-slate-500 opacity-40" />
          <p className="text-slate-400">No holdings found for <span className="font-mono text-white">{query}</span> across tracked funds.</p>
        </CardContent>
      </Card>
    );
  }

  // Split holdings into stock positions and options. They render as separate
  // sub-sections so a fund holding both the stock AND a few option contracts
  // doesn't look like "ULTY listed 5 times" — it's clearly 1 stock + 4
  // contracts.
  const stockHoldings = detail.holdings.filter(h => !h.isOption);
  const optionHoldings = detail.holdings.filter(h => h.isOption && h.optionDetails);

  return (
    <Card className="bg-gradient-to-r from-[#111827] to-[#0f1729] border-[#00d4ff]/20 shadow-lg shadow-[#00d4ff]/5">
      <CardHeader className="pb-3 border-b border-[#1f2937]">
        <CardTitle className="text-lg font-bold flex items-center gap-3 text-white">
          <Search className="h-5 w-5 text-[#00d4ff]" />
          <span className="font-mono">{detail.ticker}</span>
          <span className="text-sm font-normal text-slate-400">{detail.name}</span>
          <Badge variant="outline" className="text-[#00d4ff] border-[#00d4ff]/30 ml-auto">
            {detail.fundCount} fund{detail.fundCount !== 1 ? 's' : ''} holding
          </Badge>
        </CardTitle>
        <p className="text-[11px] text-slate-500 mt-1">
          Click a fund badge to open its profile →
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Holdings — split into Stock + Options sections */}
          <div className="space-y-4">
            {/* Stock positions */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                Stock positions <span className="text-slate-600 normal-case">· {stockHoldings.length}</span>
              </h3>
              {stockHoldings.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-1">No direct equity exposure.</p>
              ) : (
                <div className="space-y-1.5">
                  {stockHoldings.map((h, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#0f172a] rounded px-3 py-2 border border-[#1f2937] hover:border-[#00d4ff]/30 transition-colors">
                      <Link href={`/fund/${h.fund}`} title={`Open ${h.fund} profile`}>
                        <Badge variant="outline" className={`font-mono text-[10px] px-1.5 py-0 ${getETFColor(h.fund)} cursor-pointer hover:opacity-80 transition-opacity`}>{h.fund}</Badge>
                      </Link>
                      <div className="text-right">
                        <span className="text-xs font-mono text-white">{h.weight.toFixed(3)}%</span>
                        <span className="text-[10px] text-slate-500 ml-2">{h.shares.toLocaleString()} shs</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Options exposure */}
            {optionHoldings.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                  Options exposure <span className="text-slate-600 normal-case">· {optionHoldings.length} contract{optionHoldings.length !== 1 ? 's' : ''}</span>
                </h3>
                <div className="space-y-1.5">
                  {optionHoldings.map((h, i) => {
                    const isCall = h.optionDetails!.type.toLowerCase().startsWith('c');
                    const isShort = h.shares < 0;
                    return (
                      <div key={i} className="flex items-center justify-between bg-[#0f172a] rounded px-3 py-2 border border-[#1f2937] hover:border-[#00d4ff]/30 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <Link href={`/fund/${h.fund}`} title={`Open ${h.fund} profile`}>
                            <Badge variant="outline" className={`font-mono text-[10px] px-1.5 py-0 ${getETFColor(h.fund)} cursor-pointer hover:opacity-80 transition-opacity`}>{h.fund}</Badge>
                          </Link>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-mono ${isCall ? 'text-[#f59e0b] border-[#f59e0b]/30' : 'text-[#00ff88] border-[#00ff88]/30'}`}>
                            {isShort ? '−' : '+'}{isCall ? 'C' : 'P'} ${h.optionDetails!.strike}
                          </Badge>
                          <span className="text-[10px] text-slate-500 font-mono truncate">{h.optionDetails!.expiry}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs font-mono ${h.weight >= 0 ? 'text-white' : 'text-[#ff8888]'}`}>
                            {h.weight >= 0 ? '+' : ''}{h.weight.toFixed(4)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Recent Changes */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Recent Changes</h3>
            {detail.changes.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">No changes in the latest period</p>
            ) : (
              <div className="space-y-1.5">
                {detail.changes.map((c, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#0f172a] rounded px-3 py-2 border border-[#1f2937] hover:border-[#00d4ff]/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <Link href={`/fund/${c.fund}`} title={`Open ${c.fund} profile`}>
                        <Badge variant="outline" className={`font-mono text-[10px] px-1.5 py-0 ${getETFColor(c.fund)} cursor-pointer hover:opacity-80 transition-opacity`}>{c.fund}</Badge>
                      </Link>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${c.type === 'NEW' ? 'text-[#00ff88] border-[#00ff88]/30' :
                        c.type === 'REMOVED' ? 'text-[#ff4444] border-[#ff4444]/30' :
                          'text-[#00d4ff] border-[#00d4ff]/30'
                        }`}>{c.type}</Badge>
                    </div>
                    <span className={`text-xs font-mono ${c.weightDelta > 0 ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>
                      {c.weightDelta > 0 ? '+' : ''}{c.weightDelta.toFixed(3)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Signal Performance (backtest) ───────────────────────────────────────────

function SignalPerformanceCard({ perf }: { perf: ApiSignalPerformance }) {
  const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;
  const fmtRate = (n: number) => `${(n * 100).toFixed(0)}%`;

  // Top providers by signal volume — keep the card readable.
  const topProviders = Object.entries(perf.byProvider)
    .map(([provider, agg]) => ({
      provider,
      buying: agg.buying,
      selling: agg.selling,
      total: agg.buying.n + agg.selling.n,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const buyWinning = perf.overall.buying.winRate > 0.5;
  const sellWinning = perf.overall.selling.winRate > 0.5;

  return (
    <Card className="bg-gradient-to-br from-[#111827] to-[#0f1729] border-[#a78bfa]/20 shadow-lg shadow-[#a78bfa]/5">
      <CardHeader className="pb-3 border-b border-[#1f2937]">
        <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
          <Target className="h-5 w-5 text-[#a78bfa]" />
          Did the signals work?
          <span className="text-xs font-normal text-slate-500 ml-1">{perf.lookbackDays}-day backtest</span>
          <Badge variant="outline" className="text-slate-400 border-slate-600 text-[10px] font-normal ml-auto">
            {perf.withReturns.toLocaleString()} signals graded
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-5">
        {/* Headline KPI tiles — three columns: buy, sell, total */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {/* BUY tile */}
          <div className="bg-[#0f172a] border border-[#1f2937] rounded-lg p-4 relative overflow-hidden">
            <div className="flex items-center gap-1.5 mb-3">
              <ArrowUpRight className="h-3.5 w-3.5 text-[#00ff88]" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Buying signals</span>
            </div>
            <div className={`text-3xl font-bold font-mono leading-none ${perf.overall.buying.medianReturn >= 0 ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>
              {fmtPct(perf.overall.buying.medianReturn)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Median fwd return</div>
            {/* Win rate bar */}
            <div className="mt-3">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">Win rate</span>
                <span className={`text-sm font-mono font-bold ${buyWinning ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>{fmtRate(perf.overall.buying.winRate)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#1f2937] overflow-hidden">
                <div
                  className={`h-full rounded-full ${buyWinning ? 'bg-[#00ff88]' : 'bg-[#ff4444]'}`}
                  style={{ width: `${Math.min(100, perf.overall.buying.winRate * 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-600 mt-1">{perf.overall.buying.n.toLocaleString()} signals · 50% = coin flip</div>
            </div>
          </div>

          {/* SELL tile — for sells, lower median underlying = better; flipped color logic */}
          <div className="bg-[#0f172a] border border-[#1f2937] rounded-lg p-4 relative overflow-hidden">
            <div className="flex items-center gap-1.5 mb-3">
              <ArrowDownRight className="h-3.5 w-3.5 text-[#ff4444]" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Selling signals</span>
            </div>
            <div className={`text-3xl font-bold font-mono leading-none ${perf.overall.selling.medianReturn <= 0 ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>
              {fmtPct(perf.overall.selling.medianReturn)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Median underlying after</div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">Win rate</span>
                <span className={`text-sm font-mono font-bold ${sellWinning ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>{fmtRate(perf.overall.selling.winRate)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#1f2937] overflow-hidden">
                <div
                  className={`h-full rounded-full ${sellWinning ? 'bg-[#00ff88]' : 'bg-[#ff4444]'}`}
                  style={{ width: `${Math.min(100, perf.overall.selling.winRate * 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-600 mt-1">{perf.overall.selling.n.toLocaleString()} signals · price went UP after sells = bad</div>
            </div>
          </div>

          {/* Methodology / volume tile */}
          <div className="bg-[#0f172a] border border-[#1f2937] rounded-lg p-4 col-span-2 lg:col-span-1">
            <div className="flex items-center gap-1.5 mb-3">
              <Target className="h-3.5 w-3.5 text-[#a78bfa]" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Scope</span>
            </div>
            <div className="text-3xl font-bold font-mono text-white leading-none">
              {perf.withReturns.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Signals graded</div>
            <div className="mt-3 text-[10px] text-slate-500 leading-relaxed">
              Every weight change becomes one signal. We pull spot {perf.lookbackDays}d later via Yahoo Finance.
              Options excluded — their P&amp;L depends on Δ/θ/σ, not spot.
            </div>
          </div>
        </div>

        {/* Per-provider breakdown — compact two-col grid with mini bars */}
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
            By fund family — buy / sell win rate
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {topProviders.map(({ provider, buying, selling }) => {
              const buyW = buying.winRate;
              const sellW = selling.winRate;
              return (
                <div key={provider} className="bg-[#0f172a] border border-[#1f2937] rounded px-3 py-2 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-300 truncate">{provider}</span>
                    <span className="text-[10px] text-slate-600 font-mono shrink-0">{(buying.n + selling.n).toLocaleString()} n</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="w-7 text-slate-500 uppercase">Buy</span>
                    <div className="flex-1 h-1 rounded-full bg-[#1f2937] overflow-hidden">
                      <div className={`h-full rounded-full ${buyW > 0.5 ? 'bg-[#00ff88]' : 'bg-[#ff4444]'}`} style={{ width: `${Math.min(100, buyW * 100)}%` }} />
                    </div>
                    <span className={`w-9 text-right font-mono ${buyW > 0.5 ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>{fmtRate(buyW)}</span>
                    <span className={`w-14 text-right font-mono ${buying.medianReturn >= 0 ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>{fmtPct(buying.medianReturn)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] mt-0.5">
                    <span className="w-7 text-slate-500 uppercase">Sell</span>
                    <div className="flex-1 h-1 rounded-full bg-[#1f2937] overflow-hidden">
                      <div className={`h-full rounded-full ${sellW > 0.5 ? 'bg-[#00ff88]' : 'bg-[#ff4444]'}`} style={{ width: `${Math.min(100, sellW * 100)}%` }} />
                    </div>
                    <span className={`w-9 text-right font-mono ${sellW > 0.5 ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>{fmtRate(sellW)}</span>
                    <span className={`w-14 text-right font-mono ${selling.medianReturn <= 0 ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>{fmtPct(selling.medianReturn)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

// ─── Sector Flow ─────────────────────────────────────────────────────────────

function SectorFlowCard({ flows }: { flows: FlatSectorEntry[] }) {
  if (flows.length === 0) {
    return (
      <Card className="bg-[#111827] border-[#1f2937]">
        <CardContent className="py-8 text-center text-slate-500">
          <BarChart3 className="h-8 w-8 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No sector flow data yet.</p>
        </CardContent>
      </Card>
    );
  }

  const inflowing = flows.filter(f => f.weightDelta > 0);
  const outflowing = flows.filter(f => f.weightDelta < 0);

  return (
    <Card className="bg-[#111827] border-[#1f2937]">
      <CardHeader className="pb-3 border-b border-[#1f2937]">
        <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
          <BarChart3 className="h-5 w-5 text-[#00d4ff]" /> Sector Flow
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {inflowing.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[#00ff88] mb-1.5">Money Flowing In</h4>
            {inflowing.slice(0, 5).map(f => (
              <SectorBar key={f.sector} flow={f} />
            ))}
          </div>
        )}
        {outflowing.length > 0 && (
          <div className="mt-3">
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[#ff4444] mb-1.5">Money Flowing Out</h4>
            {outflowing.slice(0, 5).map(f => (
              <SectorBar key={f.sector} flow={f} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectorBar({ flow }: { flow: FlatSectorEntry }) {
  const isInflow = flow.weightDelta > 0;
  const color = isInflow ? 'bg-[#00ff88]' : 'bg-[#ff4444]';
  const textColor = isInflow ? 'text-[#00ff88]' : 'text-[#ff4444]';
  const maxWidth = Math.min(Math.abs(flow.weightDelta) * 5, 100); // scale bar

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[10px] text-slate-400 w-[110px] truncate uppercase" title={flow.sector}>
        {flow.sector}
      </span>
      <div className="flex-1 bg-[#1f2937] rounded-full h-2 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${maxWidth}%`, opacity: 0.7 }} />
      </div>
      <span className={`text-[10px] font-mono min-w-[50px] text-right ${textColor}`}>
        {isInflow ? '+' : ''}{flow.weightDelta.toFixed(2)}%
      </span>
    </div>
  );
}

// ─── Pre-Market Briefing ─────────────────────────────────────────────────────

function BriefingCard({ briefing }: { briefing: ApiBriefing }) {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="w-full">
        <Card className="bg-gradient-to-r from-[#111827] via-[#0f1729] to-[#111827] border-[#00d4ff]/20 shadow-lg shadow-[#00d4ff]/5 hover:border-[#00d4ff]/30 transition-colors cursor-pointer">
          <CardHeader className="py-4">
            <CardTitle className="text-lg font-bold flex items-center justify-between text-white">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5 text-[#00d4ff]" /> Retail Intel Briefing
                <span className="text-xs font-normal text-slate-500">What you need to know before the bell</span>
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400" />
            </CardTitle>
          </CardHeader>
        </Card>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <Card className="bg-gradient-to-r from-[#111827] via-[#0f1729] to-[#111827] border-[#00d4ff]/20">
          <CardContent className="pt-4">
            <BriefingContent briefing={briefing} />
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}

function BriefingContent({ briefing }: { briefing: ApiBriefing }) {
  const hasCrossFund = briefing.crossFundConvergence.length > 0;
  const hasStreaks = briefing.activeStreaks.length > 0;
  const hasOptions = briefing.notableOptions.length > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Top Buys */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[#00ff88] flex items-center gap-1">
          <TrendingUp className="h-3 w-3" /> Top Buys
        </h3>
        {briefing.topBuys.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No significant buys</p>
        ) : briefing.topBuys.map(s => (
          <Link
            key={s.ticker}
            href={`/dashboard?q=${s.ticker}`}
            title={`Look up ${s.ticker} across funds`}
            className="flex items-center justify-between bg-[#00ff88]/5 rounded px-2 py-1.5 border border-[#00ff88]/10 hover:bg-[#00ff88]/10 hover:border-[#00ff88]/30 transition-colors"
          >
            <div>
              <span className="font-mono font-bold text-sm text-white">{s.ticker}</span>
              {s.streak && s.streak >= 2 && (
                <span className="ml-1.5 text-[10px] text-orange-400">🔥{s.streak}d</span>
              )}
              <div className="text-[10px] text-slate-500">{s.fundDetails.map(f => f.fund).join(', ')}</div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-[#00ff88]">+{s.totalWeightDelta.toFixed(2)}%</span>
              <div className="text-[10px] text-slate-600">conv {s.convictionScore.toFixed(1)}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Top Sells */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[#ff4444] flex items-center gap-1">
          <TrendingDown className="h-3 w-3" /> Top Sells
        </h3>
        {briefing.topSells.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No significant sells</p>
        ) : briefing.topSells.map(s => (
          <Link
            key={s.ticker}
            href={`/dashboard?q=${s.ticker}`}
            title={`Look up ${s.ticker} across funds`}
            className="flex items-center justify-between bg-[#ff4444]/5 rounded px-2 py-1.5 border border-[#ff4444]/10 hover:bg-[#ff4444]/10 hover:border-[#ff4444]/30 transition-colors"
          >
            <div>
              <span className="font-mono font-bold text-sm text-white">{s.ticker}</span>
              <div className="text-[10px] text-slate-500">{s.fundDetails.map(f => f.fund).join(', ')}</div>
            </div>
            <span className="text-xs font-mono text-[#ff4444]">{s.totalWeightDelta.toFixed(2)}%</span>
          </Link>
        ))}
      </div>

      {/* Cross-Fund Convergence */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[#a78bfa] flex items-center gap-1">
          <Crosshair className="h-3 w-3" /> Multi-Provider
        </h3>
        {!hasCrossFund ? (
          <p className="text-xs text-slate-500 italic">No cross-provider signals</p>
        ) : briefing.crossFundConvergence.map(s => (
          <Link
            key={s.ticker}
            href={`/dashboard?q=${s.ticker}`}
            title={`Look up ${s.ticker} across funds`}
            className="flex items-center justify-between bg-[#a78bfa]/5 rounded px-2 py-1.5 border border-[#a78bfa]/10 hover:bg-[#a78bfa]/10 hover:border-[#a78bfa]/30 transition-colors"
          >
            <div>
              <span className="font-mono font-bold text-sm text-white">{s.ticker}</span>
              <div className="text-[10px] text-slate-500">{s.providerCount} providers</div>
            </div>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${s.direction === 'buying' ? 'text-[#00ff88] border-[#00ff88]/30' : 'text-[#ff4444] border-[#ff4444]/30'}`}>
              {s.direction.toUpperCase()}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Streaks & Options */}
      <div className="space-y-2">
        {hasStreaks && (
          <>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-orange-400 flex items-center gap-1">
              <Flame className="h-3 w-3" /> Active Streaks
            </h3>
            {briefing.activeStreaks.slice(0, 3).map(s => (
              <Link
                key={`${s.fund}-${s.ticker}`}
                href={`/dashboard?q=${s.ticker}`}
                title={`Look up ${s.ticker} across funds`}
                className="flex items-center justify-between bg-orange-500/5 rounded px-2 py-1.5 border border-orange-500/10 hover:bg-orange-500/10 hover:border-orange-500/30 transition-colors"
              >
                <div>
                  <span className="font-mono font-bold text-sm text-white">{s.ticker}</span>
                  <div className="text-[10px] text-slate-500">{s.fund}</div>
                </div>
                <span className="text-xs font-mono text-orange-400">🔥 {s.days}d {s.direction === 'up' ? '↑' : '↓'}</span>
              </Link>
            ))}
          </>
        )}
        {hasOptions && (
          <>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#f59e0b] flex items-center gap-1 mt-2">
              <Zap className="h-3 w-3" /> New Options
            </h3>
            {briefing.notableOptions.slice(0, 2).map((o, i) => (
              <Link
                key={i}
                href={`/dashboard?q=${o.record.ticker}`}
                title={`Look up ${o.record.ticker} across funds`}
                className="block bg-[#f59e0b]/5 rounded px-2 py-1.5 border border-[#f59e0b]/10 hover:bg-[#f59e0b]/10 hover:border-[#f59e0b]/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-white">{o.record.ticker}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-[#f59e0b] border-[#f59e0b]/30">{o.record.fund}</Badge>
                </div>
                <p className="text-[10px] text-[#f59e0b] mt-0.5">{o.signal.directionalView}</p>
              </Link>
            ))}
          </>
        )}
        {!hasStreaks && !hasOptions && (
          <p className="text-xs text-slate-500 italic">No streaks or notable options today</p>
        )}
      </div>
    </div>
  );
}

// ─── Hero: Institutional Buying Signals ──────────────────────────────────────

function SignalsHero({ buying, selling }: { buying: ApiSignal[]; selling: ApiSignal[] }) {
  if (buying.length === 0 && selling.length === 0) {
    return (
      <Card className="bg-[#111827] border-[#1f2937]">
        <CardContent className="py-12 text-center text-slate-500">
          <Zap className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No significant signals yet.</p>
        </CardContent>
      </Card>
    );
  }

  const topBuying = buying.slice(0, 8);
  const topSelling = selling.slice(0, 8);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="bg-gradient-to-br from-[#0a1a0f] to-[#111827] border-[#00ff88]/20">
        <CardHeader className="pb-3 border-b border-[#1f2937]">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-[#00ff88]">
            <TrendingUp className="h-5 w-5" /> Buying
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {topBuying.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No significant buying</p>
          ) : (
            <div className="space-y-2">
              {topBuying.map((s, i) => <SignalRow key={s.ticker} signal={s} rank={i + 1} />)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-[#1a0a0a] to-[#111827] border-[#ff4444]/20">
        <CardHeader className="pb-3 border-b border-[#1f2937]">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-[#ff4444]">
            <TrendingDown className="h-5 w-5" /> Selling
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {topSelling.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No significant selling</p>
          ) : (
            <div className="space-y-2">
              {topSelling.map((s, i) => <SignalRow key={s.ticker} signal={s} rank={i + 1} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SignalRow({ signal, rank }: { signal: ApiSignal; rank: number }) {
  const isBuying = signal.direction === 'buying';
  const color = isBuying ? 'text-[#00ff88]' : 'text-[#ff4444]';
  const bgColor = isBuying ? 'bg-[#00ff88]/5' : 'bg-[#ff4444]/5';

  return (
    <div className={`flex items-center gap-3 ${bgColor} rounded-lg px-3 py-2.5 border border-[#1f2937] hover:border-[#334155] transition-colors`}>
      <span className="text-xs font-mono text-slate-500 w-5 text-right">#{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard?q=${signal.ticker}`} title={`Look up ${signal.ticker} across funds`} className="font-mono font-bold text-white text-sm hover:text-[#00d4ff] transition-colors">{signal.ticker}</Link>
          {signal.providerCount >= 2 && (
            <Badge variant="outline" className="text-[#a78bfa] border-[#a78bfa]/30 bg-[#a78bfa]/10 text-[10px] px-1.5 py-0">
              {signal.providerCount} prov
            </Badge>
          )}
          {signal.streak && signal.streak >= 2 && (
            <span className="text-[10px] text-orange-400 font-semibold">🔥{signal.streak}d</span>
          )}
        </div>
        <p className="text-xs text-slate-500 truncate max-w-[180px]">{signal.name}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex flex-wrap gap-1 justify-end max-w-[100px]">
          {signal.fundDetails.map(f => (
            <FundBadge key={f.fund} fund={f.fund} />
          ))}
        </div>
        <div className="text-right min-w-[60px]">
          <span className={`font-mono text-sm font-semibold ${color} flex items-center gap-0.5 justify-end`}>
            {isBuying ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {isBuying ? '+' : ''}{signal.totalWeightDelta.toFixed(2)}%
          </span>
          <div className="text-[10px] text-slate-600 font-mono">conv {signal.convictionScore.toFixed(1)}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Activity Viewer ─────────────────────────────────────────────────────────

function ActivityViewer({ data, timeframe }: { data: ApiActivity | null; timeframe: string }) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <Layers className="h-12 w-12 mb-4 opacity-20" />
        <p>No prior data yet for {timeframe}.</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="accumulating" className="w-full">
      <TabsList className="bg-[#0f172a] border border-[#1e293b] mb-6">
        <TabsTrigger value="accumulating" className="data-[state=active]:bg-[#00ff88]/10 data-[state=active]:text-[#00ff88]">
          <TrendingUp className="w-4 h-4 mr-2" /> ACCUMULATING ({data.accumulating.length})
        </TabsTrigger>
        <TabsTrigger value="reducing" className="data-[state=active]:bg-[#ff4444]/10 data-[state=active]:text-[#ff4444]">
          <TrendingDown className="w-4 h-4 mr-2" /> REDUCING ({data.reducing.length})
        </TabsTrigger>
        <TabsTrigger value="options" className="data-[state=active]:bg-[#f59e0b]/10 data-[state=active]:text-[#f59e0b]">
          <Zap className="w-4 h-4 mr-2" /> OPTIONS ({data.optionsActivity.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="accumulating">
        <ProviderGroupedTable records={data.accumulating} direction="accumulating" />
      </TabsContent>
      <TabsContent value="reducing">
        <ProviderGroupedTable records={data.reducing} direction="reducing" />
      </TabsContent>
      <TabsContent value="options">
        <OptionsTable records={data.optionsActivity} />
      </TabsContent>
    </Tabs>
  );
}

// ─── Tables ──────────────────────────────────────────────────────────────────

// Same provider-bucketing logic as before; the only change is the type.
// We import getProvider from holdings.ts because the API's ChangeRecord doesn't
// carry the provider string (just the fund ticker) — keeping the static
// FUND_PROVIDERS map on the client side avoids an extra round-trip per row.
function groupByProvider(records: ApiChangeRecord[]): { provider: string; records: ApiChangeRecord[] }[] {
  const map = new Map<string, ApiChangeRecord[]>();
  records.forEach(r => {
    const prov = getProvider(r.fund);
    if (!map.has(prov)) map.set(prov, []);
    map.get(prov)!.push(r);
  });
  const ordered: { provider: string; records: ApiChangeRecord[] }[] = [];
  PROVIDER_ORDER.forEach(p => { if (map.has(p)) ordered.push({ provider: p, records: map.get(p)! }); });
  map.forEach((recs, p) => { if (!PROVIDER_ORDER.includes(p)) ordered.push({ provider: p, records: recs }); });
  return ordered;
}

function ProviderGroupedTable({ records, direction }: { records: ApiChangeRecord[]; direction: string }) {
  if (records.length === 0) return <div className="text-slate-500 py-8 text-center italic">No significant {direction} positions.</div>;
  const groups = groupByProvider(records);
  return (
    <div className="space-y-6">
      {groups.map(({ provider, records: provRecords }) => (
        <div key={provider}>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{provider}</span>
            <span className="text-xs text-slate-600 font-mono">({provRecords.length})</span>
            <div className="flex-1 border-t border-[#1f2937] ml-2" />
          </div>
          <EquityTable records={provRecords} />
        </div>
      ))}
    </div>
  );
}

function getETFColor(fund: string): string {
  const colors = ['bg-blue-500/20 text-blue-400 border-blue-500/30', 'bg-purple-500/20 text-purple-400 border-purple-500/30', 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', 'bg-amber-500/20 text-amber-400 border-amber-500/30', 'bg-rose-500/20 text-rose-400 border-rose-500/30', 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'];
  let hash = 0;
  for (let i = 0; i < fund.length; i++) hash = fund.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function FundBadge({ fund }: { fund: string }) {
  return (
    <Link href={`/fund/${fund}`}>
      <Badge variant="outline" className={`font-mono border cursor-pointer hover:opacity-80 transition-opacity ${getETFColor(fund)}`}>{fund}</Badge>
    </Link>
  );
}

function EquityTable({ records }: { records: ApiChangeRecord[] }) {
  return (
    <div className="rounded-md border border-[#1f2937] overflow-hidden mb-2">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#0f172a] text-slate-400 text-xs uppercase font-semibold border-b border-[#1f2937]">
            <tr>
              <th className="px-4 py-3">Fund</th>
              <th className="px-4 py-3">Ticker</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3 text-center">Signal</th>
              <th className="px-4 py-3 text-right">Shares</th>
              <th className="px-4 py-3 text-right">Weight Δ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f2937]">
            {records.map((r, i) => (
              <tr key={i} className="hover:bg-[#1a2333] transition-colors">
                <td className="px-4 py-3"><Badge variant="outline" className={`font-mono border ${getETFColor(r.fund)}`}>{r.fund}</Badge></td>
                <td className="px-4 py-3 font-mono font-medium text-slate-200">{r.ticker}</td>
                <td className="px-4 py-3 max-w-[200px] truncate text-slate-400" title={r.name}>{r.name}</td>
                <td className="px-4 py-3 text-center">
                  {r.type === 'NEW' ? <Badge variant="outline" className="text-[#00ff88] border-[#00ff88]/40 bg-[#00ff88]/10 font-semibold">NEW</Badge>
                    : r.type === 'REMOVED' ? <Badge variant="outline" className="text-[#ff4444] border-[#ff4444]/40 bg-[#ff4444]/10 font-semibold">EXITED</Badge>
                      : r.weightDelta > 0 ? <Badge variant="outline" className="text-[#00d4ff] border-[#00d4ff]/40 bg-[#00d4ff]/10">ADDING</Badge>
                        : <Badge variant="outline" className="text-[#f59e0b] border-[#f59e0b]/40 bg-[#f59e0b]/10">TRIMMING</Badge>}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-300">
                  <div className="flex flex-col items-end">
                    <span>{(r.currentShares ?? 0).toLocaleString()}</span>
                    {(r.previousShares ?? 0) > 0 && r.type !== 'REMOVED' && <span className="text-xs text-slate-500 line-through">{(r.previousShares ?? 0).toLocaleString()}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  <span className={`flex items-center justify-end gap-1 ${r.weightDelta > 0 ? 'text-[#00ff88]' : r.weightDelta < 0 ? 'text-[#ff4444]' : 'text-slate-400'}`}>
                    {r.weightDelta > 0 ? <ArrowUpRight className="h-3 w-3" /> : r.weightDelta < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                    {r.weightDelta > 0 ? '+' : ''}{r.weightDelta.toFixed(3)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OptionsTable({ records }: { records: ApiChangeRecord[] }) {
  if (records.length === 0) return <div className="text-slate-500 py-8 text-center italic">No options activity.</div>;
  const sorted = [...records].sort((a, b) => {
    const aP = a.optionDetails?.type.toLowerCase().startsWith('p');
    const bP = b.optionDetails?.type.toLowerCase().startsWith('p');
    if (aP && !bP) return -1; if (!aP && bP) return 1;
    return Math.abs(b.weightDelta) - Math.abs(a.weightDelta);
  });
  const groups = groupByProvider(sorted);

  return (
    <div className="space-y-6">
      {groups.map(({ provider, records: pr }) => (
        <div key={provider}>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{provider}</span>
            <span className="text-xs text-slate-600 font-mono">({pr.length})</span>
            <div className="flex-1 border-t border-[#1f2937] ml-2" />
          </div>
          <div className="rounded-md border border-[#1f2937] overflow-hidden mb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#0f172a] text-slate-400 text-xs uppercase font-semibold border-b border-[#1f2937]">
                  <tr>
                    <th className="px-4 py-3">Fund</th>
                    <th className="px-4 py-3">Ticker</th>
                    <th className="px-4 py-3 text-center">Strategy</th>
                    <th className="px-4 py-3">Expiry @ Strike</th>
                    <th className="px-4 py-3">View</th>
                    <th className="px-4 py-3 text-center">Signal</th>
                    <th className="px-4 py-3 text-right">Weight Δ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2937]">
                  {pr.map((r, i) => {
                    const isCall = r.optionDetails?.type.toLowerCase().startsWith('c');
                    const isPut = r.optionDetails?.type.toLowerCase().startsWith('p');
                    const decoded = decodeOptionSignal(r);
                    return (
                      <tr key={i} className={`hover:bg-[#1a2333] transition-colors bg-[#0d1525] ${isCall ? 'border-l-2 border-l-[#00ff88]/60' : isPut ? 'border-l-2 border-l-[#f59e0b]/60' : ''}`}>
                        <td className="px-4 py-3"><Badge variant="outline" className={`font-mono border ${getETFColor(r.fund)}`}>{r.fund}</Badge></td>
                        <td className="px-4 py-3 font-mono font-medium text-slate-200">{r.ticker}</td>
                        <td className="px-4 py-3 text-center">
                          {isCall
                            ? <Badge variant="outline" className="text-[#00ff88] border-[#00ff88]/40 bg-[#00ff88]/10 font-semibold px-2">🛡️ CC</Badge>
                            : <Badge variant="outline" className="text-[#f59e0b] border-[#f59e0b]/40 bg-[#f59e0b]/10 font-semibold px-2">💰 CSP</Badge>}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {r.optionDetails ? <span className="whitespace-nowrap"><span className="text-slate-300">{r.optionDetails.expiry}</span><span className="text-slate-600 mx-1">@</span><span className="text-slate-300">${r.optionDetails.strike}</span></span> : '-'}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {decoded ? <span className={isPut ? 'text-[#00ff88]' : 'text-[#f59e0b]'}>{decoded.directionalView}</span> : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.type === 'NEW' ? <Badge variant="outline" className="text-[#00ff88] border-[#00ff88]/40 bg-[#00ff88]/10 text-[10px]">OPENED</Badge>
                            : r.type === 'REMOVED' ? <Badge variant="outline" className="text-[#ff4444] border-[#ff4444]/40 bg-[#ff4444]/10 text-[10px]">EXPIRED</Badge>
                              : <Badge variant="outline" className="text-[#00d4ff] border-[#00d4ff]/40 bg-[#00d4ff]/10 text-[10px]">ROLLED</Badge>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <span className={`flex items-center justify-end gap-1 ${r.weightDelta > 0 ? 'text-[#00ff88]' : r.weightDelta < 0 ? 'text-[#ff4444]' : 'text-slate-400'}`}>
                            {r.weightDelta > 0 ? <ArrowUpRight className="h-3 w-3" /> : r.weightDelta < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                            {r.weightDelta > 0 ? '+' : ''}{r.weightDelta.toFixed(3)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
