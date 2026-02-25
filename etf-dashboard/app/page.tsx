import { getDailyDiff, getWeeklyDiff, getAsOfDate, getGlobalStats, ChangeRecord, HoldingsDiff, ChangeType } from '@/lib/holdings';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowUpRight, ArrowDownRight, Layers, PieChart, Activity, ChevronDown, PlusCircle, MinusCircle, RefreshCcw } from 'lucide-react';
import React from 'react';

import Link from 'next/link';

// Revalidate this page every hour so Vercel ISR picks up new CSV commits without a manual rebuild
export const revalidate = 3600;

export default function Home() {
  const dailyDiff = getDailyDiff();
  const weeklyDiff = getWeeklyDiff();
  const asOfDate = getAsOfDate();
  const stats = getGlobalStats();

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
          <KPICard title="Total Funds Tracked" value={stats.totalFunds.toString()} icon={<Layers className="h-4 w-4 text-[#00d4ff]" />} />
          <KPICard title="Unique Underlyings" value={stats.totalUnderlyings.toString()} icon={<Activity className="h-4 w-4 text-[#00d4ff]" />} />
          <KPICard title="Global P/C Ratio" value={stats.pcRatio} icon={<PieChart className="h-4 w-4 text-[#00d4ff]" />} />
        </div>
      </div>

      {/* Main Content: Changes Since Yesterday */}
      <Card className="bg-[#111827] border-[#1f2937] text-slate-200">
        <CardHeader className="border-b border-[#1f2937]">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
            <RefreshCcw className="h-5 w-5 text-[#00d4ff]" /> Changes Since Yesterday
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <DiffViewer diff={dailyDiff} timeframe="yesterday" />
        </CardContent>
      </Card>

      {/* Secondary Content: Changes Since Last Week */}
      <Collapsible>
        <CollapsibleTrigger className="w-full">
          <Card className="bg-[#111827] border-[#1f2937] text-slate-200 hover:bg-[#1a2333] transition-colors cursor-pointer">
            <CardHeader className="py-4">
              <CardTitle className="text-md font-bold flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-2"><Layers className="h-5 w-5" /> Changes Since Last Week</span>
                <ChevronDown className="h-5 w-5" />
              </CardTitle>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <Card className="bg-[#111827] border-[#1f2937] text-slate-200">
            <CardContent className="pt-6">
              <DiffViewer diff={weeklyDiff} timeframe="last week" />
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function KPICard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-4 py-2 min-w-[140px]">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{title}</span>
        {icon}
      </div>
      <div className="text-xl font-bold font-mono text-white tracking-tight">{value}</div>
    </div>
  );
}

function DiffViewer({ diff, timeframe }: { diff: HoldingsDiff | null; timeframe: string }) {
  if (!diff) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <Layers className="h-12 w-12 mb-4 opacity-20" />
        <p>No prior data yet for {timeframe}.</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="new" className="w-full">
      <TabsList className="bg-[#0f172a] border border-[#1e293b] mb-4">
        <TabsTrigger value="new" className="data-[state=active]:bg-[#00ff88]/10 data-[state=active]:text-[#00ff88]">
          <PlusCircle className="w-4 h-4 mr-2" /> NEW ({diff.newPositions.length})
        </TabsTrigger>
        <TabsTrigger value="removed" className="data-[state=active]:bg-[#ff4444]/10 data-[state=active]:text-[#ff4444]">
          <MinusCircle className="w-4 h-4 mr-2" /> REMOVED ({diff.removedPositions.length})
        </TabsTrigger>
        <TabsTrigger value="changed" className="data-[state=active]:bg-[#00d4ff]/10 data-[state=active]:text-[#00d4ff]">
          <RefreshCcw className="w-4 h-4 mr-2" /> CHANGED ({diff.changedPositions.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="new">
        <ChangeTable records={diff.newPositions} type="NEW" />
      </TabsContent>
      <TabsContent value="removed">
        <ChangeTable records={diff.removedPositions} type="REMOVED" />
      </TabsContent>
      <TabsContent value="changed">
        <ChangeTable records={diff.changedPositions} type="CHANGED" />
      </TabsContent>
    </Tabs>
  );
}

function ChangeTable({ records, type }: { records: ChangeRecord[]; type: ChangeType }) {
  if (records.length === 0) {
    return <div className="text-slate-500 py-8 text-center italic">No {type.toLowerCase()} positions during this period.</div>;
  }

  const getFundColor = (fund: string) => {
    // Simple hash to stable color for fund badges
    const colors = ['bg-blue-500/20 text-blue-400 border-blue-500/30', 'bg-purple-500/20 text-purple-400 border-purple-500/30', 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', 'bg-amber-500/20 text-amber-400 border-amber-500/30', 'bg-rose-500/20 text-rose-400 border-rose-500/30'];
    let hash = 0;
    for (let i = 0; i < fund.length; i++) hash = fund.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="rounded-md border border-[#1f2937] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#0f172a] text-slate-400 text-xs uppercase font-semibold border-b border-[#1f2937]">
            <tr>
              <th className="px-4 py-3">Fund</th>
              <th className="px-4 py-3">Ticker</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3 text-center">Type</th>
              <th className="px-4 py-3">Expiry / Strike</th>
              <th className="px-4 py-3 text-right">Shares</th>
              <th className="px-4 py-3 text-right">Weight Δ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f2937]">
            {records.map((record, i) => (
              <tr key={i} className="hover:bg-[#1a2333] transition-colors">
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`font-mono border ${getFundColor(record.fund)}`}>{record.fund}</Badge>
                </td>
                <td className="px-4 py-3 font-mono font-medium text-slate-200">{record.ticker}</td>
                <td className="px-4 py-3 max-w-[200px] truncate text-slate-400" title={record.name}>{record.name}</td>
                <td className="px-4 py-3 text-center">
                  {!record.isOption ? (
                    <Badge variant="outline" className="text-slate-500 border-slate-700 bg-slate-800/50">STOCK</Badge>
                  ) : record.optionDetails?.type.toLowerCase().startsWith('c') ? (
                    <Badge variant="outline" className="text-[#00ff88] border-[#00ff88]/30 bg-[#00ff88]/10">CALL</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[#ff4444] border-[#ff4444]/30 bg-[#ff4444]/10">PUT</Badge>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">
                  {record.isOption && record.optionDetails ? (
                    <span>{record.optionDetails.expiry} <span className="text-slate-500 mx-1">|</span> {record.optionDetails.strike}</span>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-300">
                  <div className="flex flex-col items-end">
                    <span>{record.currentShares.toLocaleString()}</span>
                    {type === 'CHANGED' && (
                      <span className="text-xs text-slate-500 line-through">{record.previousShares.toLocaleString()}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  <span className={`flex items-center justify-end gap-1 ${record.weightDelta > 0 ? 'text-[#00ff88]' : record.weightDelta < 0 ? 'text-[#ff4444]' : 'text-slate-400'
                    }`}>
                    {record.weightDelta > 0 ? <ArrowUpRight className="h-3 w-3" /> : record.weightDelta < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                    {record.weightDelta > 0 ? '+' : ''}{record.weightDelta.toFixed(3)}%
                  </span>
                  {type === 'CHANGED' && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      was {record.previousWeight.toFixed(3)}%
                    </div>
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
