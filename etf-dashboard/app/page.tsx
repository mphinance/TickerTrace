import {
  getDailyDiff, getWeeklyDiff, getAsOfDate, getGlobalStats,
  getProvider, PROVIDER_ORDER,
  getBuyingSelling, getInstitutionalSignals,
  ChangeRecord, BuyingSelling, ChangeType, InstitutionalSignal
} from '@/lib/holdings';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowUpRight, ArrowDownRight, Layers, PieChart, Activity,
  ChevronDown, TrendingUp, TrendingDown, Zap, Building2, Eye
} from 'lucide-react';
import React from 'react';
import Link from 'next/link';

export const revalidate = 3600;

export default function Home() {
  const dailyDiff = getDailyDiff();
  const weeklyDiff = getWeeklyDiff();
  const asOfDate = getAsOfDate();
  const stats = getGlobalStats();

  const dailySignals = getInstitutionalSignals(dailyDiff);
  const dailyBuySell = getBuyingSelling(dailyDiff);
  const weeklyBuySell = getBuyingSelling(weeklyDiff);

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-foreground p-6 space-y-6 font-sans">
      {/* Header KPI Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111827] border border-[#1f2937] p-4 rounded-xl shadow-lg">
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

      {/* Hero: Institutional Buying Signals */}
      <SignalsHero buying={dailySignals.buying} selling={dailySignals.selling} />

      {/* Daily Activity — Accumulating / Reducing / Options */}
      <Card className="bg-[#111827] border-[#1f2937] text-slate-200">
        <CardHeader className="border-b border-[#1f2937]">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
            <Eye className="h-5 w-5 text-[#00d4ff]" /> Daily Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ActivityViewer data={dailyBuySell} timeframe="today" />
        </CardContent>
      </Card>

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
        <CollapsibleContent className="mt-4">
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

// ─── Hero: Institutional Buying Signals ──────────────────────────────────────

function SignalsHero({ buying, selling }: { buying: InstitutionalSignal[]; selling: InstitutionalSignal[] }) {
  if (buying.length === 0 && selling.length === 0) {
    return (
      <Card className="bg-[#111827] border-[#1f2937]">
        <CardContent className="py-12 text-center text-slate-500">
          <Zap className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No significant institutional signals yet. Check back when more history is available.</p>
        </CardContent>
      </Card>
    );
  }

  const topBuying = buying.slice(0, 8);
  const topSelling = selling.slice(0, 8);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* BUYING */}
      <Card className="bg-gradient-to-br from-[#0a1a0f] to-[#111827] border-[#00ff88]/20">
        <CardHeader className="pb-3 border-b border-[#1f2937]">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-[#00ff88]">
            <TrendingUp className="h-5 w-5" /> Institutions Are Buying
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {topBuying.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No significant buying signals</p>
          ) : (
            <div className="space-y-2">
              {topBuying.map((signal, i) => (
                <SignalRow key={signal.ticker} signal={signal} rank={i + 1} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SELLING */}
      <Card className="bg-gradient-to-br from-[#1a0a0a] to-[#111827] border-[#ff4444]/20">
        <CardHeader className="pb-3 border-b border-[#1f2937]">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-[#ff4444]">
            <TrendingDown className="h-5 w-5" /> Institutions Are Selling
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {topSelling.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No significant selling signals</p>
          ) : (
            <div className="space-y-2">
              {topSelling.map((signal, i) => (
                <SignalRow key={signal.ticker} signal={signal} rank={i + 1} />
              ))}
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
          {signal.fundCount > 1 && (
            <Badge variant="outline" className="text-[#00d4ff] border-[#00d4ff]/30 bg-[#00d4ff]/10 text-[10px] px-1.5 py-0">
              {signal.fundCount} funds
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-500 truncate max-w-[200px]">{signal.name}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex flex-wrap gap-1 justify-end max-w-[120px]">
          {signal.funds.map(f => (
            <Badge key={f.fund} variant="outline" className={`font-mono text-[10px] px-1.5 py-0 ${getETFColor(f.fund)}`}>
              {f.fund}
            </Badge>
          ))}
        </div>
        <span className={`font-mono text-sm font-semibold ${color} flex items-center gap-0.5 min-w-[70px] justify-end`}>
          {isBuying ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {isBuying ? '+' : ''}{signal.totalWeightDelta.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

// ─── Activity Viewer (Accumulating / Reducing / Options) ─────────────────────

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

// ─── Provider-grouped tables ─────────────────────────────────────────────────

function groupByProvider(records: ChangeRecord[]): { provider: string; records: ChangeRecord[] }[] {
  const map = new Map<string, ChangeRecord[]>();
  records.forEach(r => {
    const prov = getProvider(r.fund);
    if (!map.has(prov)) map.set(prov, []);
    map.get(prov)!.push(r);
  });

  const ordered: { provider: string; records: ChangeRecord[] }[] = [];
  PROVIDER_ORDER.forEach(p => {
    if (map.has(p)) ordered.push({ provider: p, records: map.get(p)! });
  });
  map.forEach((recs, p) => {
    if (!PROVIDER_ORDER.includes(p)) ordered.push({ provider: p, records: recs });
  });
  return ordered;
}

function ProviderGroupedTable({ records, direction }: { records: ChangeRecord[]; direction: string }) {
  if (records.length === 0) {
    return <div className="text-slate-500 py-8 text-center italic">No significant {direction} positions.</div>;
  }

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
  const colors = [
    'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'bg-rose-500/20 text-rose-400 border-rose-500/30',
    'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  ];
  let hash = 0;
  for (let i = 0; i < fund.length; i++) hash = fund.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
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
            {records.map((record, i) => (
              <tr key={i} className="hover:bg-[#1a2333] transition-colors">
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`font-mono border ${getETFColor(record.fund)}`}>{record.fund}</Badge>
                </td>
                <td className="px-4 py-3 font-mono font-medium text-slate-200">{record.ticker}</td>
                <td className="px-4 py-3 max-w-[200px] truncate text-slate-400" title={record.name}>{record.name}</td>
                <td className="px-4 py-3 text-center">
                  {record.type === 'NEW' ? (
                    <Badge variant="outline" className="text-[#00ff88] border-[#00ff88]/40 bg-[#00ff88]/10 font-semibold">NEW POSITION</Badge>
                  ) : record.type === 'REMOVED' ? (
                    <Badge variant="outline" className="text-[#ff4444] border-[#ff4444]/40 bg-[#ff4444]/10 font-semibold">EXITED</Badge>
                  ) : record.weightDelta > 0 ? (
                    <Badge variant="outline" className="text-[#00d4ff] border-[#00d4ff]/40 bg-[#00d4ff]/10">ADDING</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[#f59e0b] border-[#f59e0b]/40 bg-[#f59e0b]/10">TRIMMING</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-300">
                  <div className="flex flex-col items-end">
                    <span>{record.currentShares.toLocaleString()}</span>
                    {record.previousShares > 0 && record.type !== 'REMOVED' && (
                      <span className="text-xs text-slate-500 line-through">{record.previousShares.toLocaleString()}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  <span className={`flex items-center justify-end gap-1 ${record.weightDelta > 0 ? 'text-[#00ff88]' : record.weightDelta < 0 ? 'text-[#ff4444]' : 'text-slate-400'}`}>
                    {record.weightDelta > 0 ? <ArrowUpRight className="h-3 w-3" /> : record.weightDelta < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                    {record.weightDelta > 0 ? '+' : ''}{record.weightDelta.toFixed(3)}%
                  </span>
                  {record.previousWeight > 0 && record.type !== 'REMOVED' && (
                    <div className="text-xs text-slate-500 mt-0.5">was {record.previousWeight.toFixed(3)}%</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Options Activity Table ──────────────────────────────────────────────────

function OptionsTable({ records }: { records: ChangeRecord[] }) {
  if (records.length === 0) {
    return <div className="text-slate-500 py-8 text-center italic">No options activity during this period.</div>;
  }

  // Sort: puts first, then calls, then by weight delta
  const sorted = [...records].sort((a, b) => {
    const aIsPut = a.optionDetails?.type.toLowerCase().startsWith('p');
    const bIsPut = b.optionDetails?.type.toLowerCase().startsWith('p');
    if (aIsPut && !bIsPut) return -1;
    if (!aIsPut && bIsPut) return 1;
    return Math.abs(b.weightDelta) - Math.abs(a.weightDelta);
  });

  const groups = groupByProvider(sorted);

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
          <div className="rounded-md border border-[#1f2937] overflow-hidden mb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#0f172a] text-slate-400 text-xs uppercase font-semibold border-b border-[#1f2937]">
                  <tr>
                    <th className="px-4 py-3">Fund</th>
                    <th className="px-4 py-3">Ticker</th>
                    <th className="px-4 py-3 text-center">Strategy</th>
                    <th className="px-4 py-3">Expiry @ Strike</th>
                    <th className="px-4 py-3 text-center">Signal</th>
                    <th className="px-4 py-3 text-right">Contracts</th>
                    <th className="px-4 py-3 text-right">Weight Δ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2937]">
                  {provRecords.map((record, i) => {
                    const isCall = record.optionDetails?.type.toLowerCase().startsWith('c');
                    const isPut = record.optionDetails?.type.toLowerCase().startsWith('p');
                    const rowBorder = isCall
                      ? 'border-l-2 border-l-[#00ff88]/60'
                      : isPut
                        ? 'border-l-2 border-l-[#f59e0b]/60'
                        : '';

                    return (
                      <tr key={i} className={`hover:bg-[#1a2333] transition-colors bg-[#0d1525] ${rowBorder}`}>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`font-mono border ${getETFColor(record.fund)}`}>{record.fund}</Badge>
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-slate-200">{record.ticker}</td>
                        <td className="px-4 py-3 text-center">
                          {isCall ? (
                            <Badge variant="outline" className="text-[#00ff88] border-[#00ff88]/40 bg-[#00ff88]/10 font-semibold px-2">
                              🛡️ COVERED CALL
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[#f59e0b] border-[#f59e0b]/40 bg-[#f59e0b]/10 font-semibold px-2">
                              💰 CASH-SECURED PUT
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {record.optionDetails ? (
                            <span className="whitespace-nowrap">
                              <span className="text-slate-300">{record.optionDetails.expiry}</span>
                              <span className="text-slate-600 mx-1">@</span>
                              <span className="text-slate-300">${record.optionDetails.strike}</span>
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {record.type === 'NEW' ? (
                            <Badge variant="outline" className="text-[#00ff88] border-[#00ff88]/40 bg-[#00ff88]/10 text-[10px]">OPENED</Badge>
                          ) : record.type === 'REMOVED' ? (
                            <Badge variant="outline" className="text-[#ff4444] border-[#ff4444]/40 bg-[#ff4444]/10 text-[10px]">EXPIRED</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[#00d4ff] border-[#00d4ff]/40 bg-[#00d4ff]/10 text-[10px]">ROLLED</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-300">
                          {record.currentShares.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <span className={`flex items-center justify-end gap-1 ${record.weightDelta > 0 ? 'text-[#00ff88]' : record.weightDelta < 0 ? 'text-[#ff4444]' : 'text-slate-400'}`}>
                            {record.weightDelta > 0 ? <ArrowUpRight className="h-3 w-3" /> : record.weightDelta < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                            {record.weightDelta > 0 ? '+' : ''}{record.weightDelta.toFixed(3)}%
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
