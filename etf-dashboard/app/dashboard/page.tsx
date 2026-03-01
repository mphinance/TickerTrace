import {
  getDailyDiff, getWeeklyDiff, getAsOfDate, getGlobalStats,
  getProvider, PROVIDER_ORDER,
  getBuyingSelling, getInstitutionalSignals, getPreMarketBriefing,
  decodeOptionSignal, getSectorFlow, getTickerDetail, getDivergences,
  ChangeRecord, BuyingSelling, ChangeType, InstitutionalSignal,
  PreMarketBriefing, SectorFlow, TickerDetail, Divergence
} from '@/lib/holdings';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowUpRight, ArrowDownRight, Layers, PieChart, Activity,
  ChevronDown, TrendingUp, TrendingDown, Zap, Building2, Eye,
  Flame, Target, Crosshair, BarChart3, Search, GitFork
} from 'lucide-react';
import React from 'react';
import Link from 'next/link';
import { TickerSearchForm } from '@/components/ticker-search';
import { DiscordWebhook } from '@/components/discord-webhook';
import { KeyboardSearch } from '@/components/keyboard-search';

export const revalidate = 3600;

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const searchQuery = params.q?.toUpperCase().trim() || '';

  const dailyDiff = getDailyDiff();
  const weeklyDiff = getWeeklyDiff();
  const asOfDate = getAsOfDate();
  const stats = getGlobalStats();

  const dailySignals = getInstitutionalSignals(dailyDiff);
  const briefing = getPreMarketBriefing(dailyDiff);
  const dailyBuySell = getBuyingSelling(dailyDiff);
  const weeklyBuySell = getBuyingSelling(weeklyDiff);
  const sectorFlow = getSectorFlow();
  const tickerDetail = searchQuery ? getTickerDetail(searchQuery, dailyDiff) : null;
  const divergences = getDivergences(dailyDiff);

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-foreground p-6 space-y-6 font-sans">
      <KeyboardSearch />
      {/* Header KPI Bar */}
      <div className="sticky top-0 z-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111827]/95 backdrop-blur-md border border-[#1f2937] p-4 rounded-xl shadow-lg">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-4">
            <span className="text-[#00d4ff] tracking-tight">TICKER<span className="text-foreground">TRACE</span></span>
            <Link href="/holdings" className="text-sm font-medium text-slate-400 hover:text-white transition-colors bg-[#1e293b] px-3 py-1.5 rounded-md border border-[#334155]">
              View All Holdings →
            </Link>
          </h1>
          <p className="text-sm text-slate-400 font-mono mt-2">
            LAST UPDATED: <span className="text-white bg-slate-800 px-2 py-0.5 rounded">{asOfDate}</span>
          </p>
        </div>
        <div className="flex gap-4">
          <KPICard title="Funds Tracked" value={stats.totalFunds.toString()} icon={<Layers className="h-4 w-4 text-[#00d4ff]" />} />
          <KPICard title="Underlyings" value={stats.totalUnderlyings.toString()} icon={<Activity className="h-4 w-4 text-[#00d4ff]" />} />
          <KPICard title="P/C Ratio" value={stats.pcRatio} icon={<PieChart className="h-4 w-4 text-[#00d4ff]" />} />
        </div>
      </div>

      {/* Ticker Search + Discord Webhook */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-xl">
          <TickerSearchForm />
        </div>
        <DiscordWebhook
          buyingSignals={dailySignals.buying}
          sellingSignals={dailySignals.selling}
          sectorFlow={sectorFlow}
          asOfDate={asOfDate}
        />
      </div>

      {/* Ticker Detail (if searched) */}
      {searchQuery && <TickerDetailCard detail={tickerDetail} query={searchQuery} />}

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

      {/* Daily Activity — Collapsible */}
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
              <ActivityViewer data={dailyBuySell} timeframe="today" />
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Weekly Activity — Collapsible */}
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
              <ActivityViewer data={weeklyBuySell} timeframe="this week" />
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

function DivergenceRow({ divergence: d }: { divergence: Divergence }) {
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
          <span className="font-mono font-bold text-white">{d.ticker}</span>
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
    </div>
  );
}

// ─── Ticker Detail ───────────────────────────────────────────────────────────

function TickerDetailCard({ detail, query }: { detail: TickerDetail | null; query: string }) {
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

  return (
    <Card className="bg-gradient-to-r from-[#111827] to-[#0f1729] border-[#00d4ff]/20 shadow-lg shadow-[#00d4ff]/5">
      <CardHeader className="pb-3 border-b border-[#1f2937]">
        <CardTitle className="text-lg font-bold flex items-center gap-3 text-white">
          <Search className="h-5 w-5 text-[#00d4ff]" />
          <span className="font-mono">{detail.ticker}</span>
          <span className="text-sm font-normal text-slate-400">{detail.name}</span>
          <Badge variant="outline" className="text-[#00d4ff] border-[#00d4ff]/30 ml-auto">
            {detail.holdings.length} fund{detail.holdings.length !== 1 ? 's' : ''} holding
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Holdings */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Current Holdings</h3>
            <div className="space-y-1.5">
              {detail.holdings.map((h, i) => (
                <div key={i} className="flex items-center justify-between bg-[#0f172a] rounded px-3 py-2 border border-[#1f2937]">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`font-mono text-[10px] px-1.5 py-0 ${getETFColor(h.fund)}`}>{h.fund}</Badge>
                    {h.isOption && h.optionDetails && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {h.optionDetails.type.startsWith('C') ? '🛡️' : '💰'} {h.optionDetails.expiry} @ ${h.optionDetails.strike}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-white">{h.weight.toFixed(3)}%</span>
                    <span className="text-[10px] text-slate-500 ml-2">{h.shares.toLocaleString()} shs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Changes */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Recent Changes</h3>
            {detail.changes.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">No changes in the latest period</p>
            ) : (
              <div className="space-y-1.5">
                {detail.changes.map((c, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#0f172a] rounded px-3 py-2 border border-[#1f2937]">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`font-mono text-[10px] px-1.5 py-0 ${getETFColor(c.fund)}`}>{c.fund}</Badge>
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

// ─── Sector Flow ─────────────────────────────────────────────────────────────

function SectorFlowCard({ flows }: { flows: SectorFlow[] }) {
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

function SectorBar({ flow }: { flow: SectorFlow }) {
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

function BriefingCard({ briefing }: { briefing: PreMarketBriefing }) {
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

function BriefingContent({ briefing }: { briefing: PreMarketBriefing }) {
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
          <div key={s.ticker} className="flex items-center justify-between bg-[#00ff88]/5 rounded px-2 py-1.5 border border-[#00ff88]/10">
            <div>
              <span className="font-mono font-bold text-sm text-white">{s.ticker}</span>
              {s.streak && s.streak >= 2 && (
                <span className="ml-1.5 text-[10px] text-orange-400">🔥{s.streak}d</span>
              )}
              <div className="text-[10px] text-slate-500">{s.funds.map(f => f.fund).join(', ')}</div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-[#00ff88]">+{s.totalWeightDelta.toFixed(2)}%</span>
              <div className="text-[10px] text-slate-600">conv {s.convictionScore.toFixed(1)}</div>
            </div>
          </div>
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
          <div key={s.ticker} className="flex items-center justify-between bg-[#ff4444]/5 rounded px-2 py-1.5 border border-[#ff4444]/10">
            <div>
              <span className="font-mono font-bold text-sm text-white">{s.ticker}</span>
              <div className="text-[10px] text-slate-500">{s.funds.map(f => f.fund).join(', ')}</div>
            </div>
            <span className="text-xs font-mono text-[#ff4444]">{s.totalWeightDelta.toFixed(2)}%</span>
          </div>
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
          <div key={s.ticker} className="flex items-center justify-between bg-[#a78bfa]/5 rounded px-2 py-1.5 border border-[#a78bfa]/10">
            <div>
              <span className="font-mono font-bold text-sm text-white">{s.ticker}</span>
              <div className="text-[10px] text-slate-500">{s.providerCount} providers</div>
            </div>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${s.direction === 'BUYING' ? 'text-[#00ff88] border-[#00ff88]/30' : 'text-[#ff4444] border-[#ff4444]/30'}`}>
              {s.direction}
            </Badge>
          </div>
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
              <div key={`${s.fund}-${s.ticker}`} className="flex items-center justify-between bg-orange-500/5 rounded px-2 py-1.5 border border-orange-500/10">
                <div>
                  <span className="font-mono font-bold text-sm text-white">{s.ticker}</span>
                  <div className="text-[10px] text-slate-500">{s.fund}</div>
                </div>
                <span className="text-xs font-mono text-orange-400">🔥 {s.days}d {s.direction === 'up' ? '↑' : '↓'}</span>
              </div>
            ))}
          </>
        )}
        {hasOptions && (
          <>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#f59e0b] flex items-center gap-1 mt-2">
              <Zap className="h-3 w-3" /> New Options
            </h3>
            {briefing.notableOptions.slice(0, 2).map((o, i) => (
              <div key={i} className="bg-[#f59e0b]/5 rounded px-2 py-1.5 border border-[#f59e0b]/10">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-white">{o.record.ticker}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-[#f59e0b] border-[#f59e0b]/30">{o.record.fund}</Badge>
                </div>
                <p className="text-[10px] text-[#f59e0b] mt-0.5">{o.signal.directionalView}</p>
              </div>
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

function SignalsHero({ buying, selling }: { buying: InstitutionalSignal[]; selling: InstitutionalSignal[] }) {
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

function SignalRow({ signal, rank }: { signal: InstitutionalSignal; rank: number }) {
  const isBuying = signal.direction === 'BUYING';
  const color = isBuying ? 'text-[#00ff88]' : 'text-[#ff4444]';
  const bgColor = isBuying ? 'bg-[#00ff88]/5' : 'bg-[#ff4444]/5';

  return (
    <div className={`flex items-center gap-3 ${bgColor} rounded-lg px-3 py-2.5 border border-[#1f2937] hover:border-[#334155] transition-colors`}>
      <span className="text-xs font-mono text-slate-500 w-5 text-right">#{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-white text-sm">{signal.ticker}</span>
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
          {signal.funds.map(f => (
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

function ActivityViewer({ data, timeframe }: { data: BuyingSelling | null; timeframe: string }) {
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

function groupByProvider(records: ChangeRecord[]): { provider: string; records: ChangeRecord[] }[] {
  const map = new Map<string, ChangeRecord[]>();
  records.forEach(r => {
    const prov = getProvider(r.fund);
    if (!map.has(prov)) map.set(prov, []);
    map.get(prov)!.push(r);
  });
  const ordered: { provider: string; records: ChangeRecord[] }[] = [];
  PROVIDER_ORDER.forEach(p => { if (map.has(p)) ordered.push({ provider: p, records: map.get(p)! }); });
  map.forEach((recs, p) => { if (!PROVIDER_ORDER.includes(p)) ordered.push({ provider: p, records: recs }); });
  return ordered;
}

function ProviderGroupedTable({ records, direction }: { records: ChangeRecord[]; direction: string }) {
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

function EquityTable({ records }: { records: ChangeRecord[] }) {
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
                    <span>{r.currentShares.toLocaleString()}</span>
                    {r.previousShares > 0 && r.type !== 'REMOVED' && <span className="text-xs text-slate-500 line-through">{r.previousShares.toLocaleString()}</span>}
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

function OptionsTable({ records }: { records: ChangeRecord[] }) {
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
