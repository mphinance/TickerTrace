import {
    getDailyDiff, getFundDetail, getAvailableFunds, getProvider,
    FUND_AUM, decodeOptionSignal,
    FundDetail, ChangeRecord
} from '@/lib/holdings';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ArrowUpRight, ArrowDownRight, ArrowLeft, TrendingUp, TrendingDown,
    Building2, Layers, Zap
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import React from 'react';

export const revalidate = 3600;

export async function generateStaticParams() {
    return getAvailableFunds().map(ticker => ({ ticker }));
}

export default async function FundProfilePage({ params }: { params: Promise<{ ticker: string }> }) {
    const { ticker } = await params;
    const fund = ticker.toUpperCase();
    const diff = getDailyDiff();
    const detail = getFundDetail(fund, diff);

    if (!detail) notFound();

    const aum = (FUND_AUM as Record<string, number>)[fund];

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-foreground p-6 space-y-6 font-sans">
            {/* Header */}
            <div className="bg-[#111827] border border-[#1f2937] p-4 rounded-xl shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <span className="text-[#00d4ff] font-mono">{detail.fund}</span>
                            <Badge variant="outline" className="text-slate-400 border-slate-600 font-normal text-sm">{detail.provider}</Badge>
                        </h1>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        <StatBox label="Holdings" value={detail.holdingsCount.toString()} />
                        <StatBox label="Options" value={detail.optionsCount.toString()} />
                        {aum && <StatBox label="AUM" value={`$${aum}B`} />}
                        <StatBox label="Total Wt" value={`${detail.totalWeight.toFixed(1)}%`} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Holdings */}
                <div className="lg:col-span-2">
                    <Card className="bg-[#111827] border-[#1f2937]">
                        <CardHeader className="pb-3 border-b border-[#1f2937]">
                            <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                                <Layers className="h-5 w-5 text-[#00d4ff]" /> Top Holdings
                                <span className="text-xs font-normal text-slate-500 ml-auto">showing top 20 by weight</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="rounded-md border border-[#1f2937] overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-[#0f172a] text-slate-400 text-xs uppercase font-semibold border-b border-[#1f2937]">
                                            <tr>
                                                <th className="px-3 py-3 w-8">#</th>
                                                <th className="px-3 py-3">Ticker</th>
                                                <th className="px-3 py-3">Name</th>
                                                <th className="px-3 py-3 text-right">Weight</th>
                                                <th className="px-3 py-3 text-right">Δ Wt</th>
                                                <th className="px-3 py-3 text-right">Shares</th>
                                                <th className="px-3 py-3 text-right">Δ Shares</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#1f2937]">
                                            {detail.topHoldings.map((h, i) => {
                                                const barWidth = detail.topHoldings[0]?.weight > 0 ? (h.weight / detail.topHoldings[0].weight) * 100 : 0;
                                                const hasWeightChange = Math.abs(h.weightDelta) > 0.0005;
                                                const hasSharesChange = h.sharesDelta !== 0;
                                                return (
                                                    <tr key={h.ticker} className="hover:bg-[#1a2333] transition-colors">
                                                        <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{i + 1}</td>
                                                        <td className="px-3 py-2.5">
                                                            <Link href={`/dashboard?q=${h.ticker}`} className="font-mono font-medium text-[#00d4ff] hover:underline">
                                                                {h.ticker}
                                                            </Link>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-slate-400 max-w-[160px] truncate text-xs">{h.name}</td>
                                                        <td className="px-3 py-2.5 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <div className="w-12 bg-[#1f2937] rounded-full h-1.5 overflow-hidden">
                                                                    <div className="h-full bg-[#00d4ff] rounded-full" style={{ width: `${barWidth}%`, opacity: 0.6 }} />
                                                                </div>
                                                                <span className="font-mono text-white min-w-[48px] text-right text-xs">{h.weight.toFixed(3)}%</span>
                                                            </div>
                                                        </td>
                                                        <td className={`px-3 py-2.5 text-right font-mono text-xs ${!hasWeightChange ? 'text-slate-600' :
                                                                h.weightDelta > 0 ? 'text-[#00ff88]' : 'text-[#ff4444]'
                                                            }`}>
                                                            {hasWeightChange ? (
                                                                <span className="flex items-center justify-end gap-0.5">
                                                                    {h.weightDelta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                                                    {h.weightDelta > 0 ? '+' : ''}{h.weightDelta.toFixed(3)}%
                                                                </span>
                                                            ) : '—'}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right font-mono text-slate-300 text-xs">{h.shares.toLocaleString()}</td>
                                                        <td className={`px-3 py-2.5 text-right font-mono text-xs ${!hasSharesChange ? 'text-slate-600' :
                                                                h.sharesDelta > 0 ? 'text-[#00ff88]' : 'text-[#ff4444]'
                                                            }`}>
                                                            {hasSharesChange ? (
                                                                <span className="flex items-center justify-end gap-0.5">
                                                                    {h.sharesDelta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                                                    {h.sharesDelta > 0 ? '+' : ''}{h.sharesDelta.toLocaleString()}
                                                                </span>
                                                            ) : '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Changes */}
                <Card className="bg-[#111827] border-[#1f2937]">
                    <CardHeader className="pb-3 border-b border-[#1f2937]">
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                            <Zap className="h-5 w-5 text-[#f59e0b]" /> Recent Changes
                            <span className="text-xs font-normal text-slate-500">({detail.recentChanges.length})</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {detail.recentChanges.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <Zap className="h-8 w-8 mx-auto mb-3 opacity-20" />
                                <p className="text-sm font-medium">No changes detected today</p>
                                <p className="text-xs mt-1 text-slate-600">Data updates on weekday mornings when the scraper runs.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {detail.recentChanges.slice(0, 15).map((c, i) => {
                                    const decoded = c.isOption ? decodeOptionSignal(c) : null;
                                    return (
                                        <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${c.type === 'NEW' ? 'bg-[#00ff88]/5 border-[#00ff88]/15' :
                                                c.type === 'REMOVED' ? 'bg-[#ff4444]/5 border-[#ff4444]/15' :
                                                    c.weightDelta > 0 ? 'bg-[#00d4ff]/5 border-[#00d4ff]/15' :
                                                        'bg-[#f59e0b]/5 border-[#f59e0b]/15'
                                            }`}>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Link href={`/dashboard?q=${c.ticker}`} className="font-mono font-bold text-sm text-white hover:text-[#00d4ff] transition-colors">
                                                        {c.ticker}
                                                    </Link>
                                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${c.type === 'NEW' ? 'text-[#00ff88] border-[#00ff88]/30' :
                                                            c.type === 'REMOVED' ? 'text-[#ff4444] border-[#ff4444]/30' :
                                                                c.weightDelta > 0 ? 'text-[#00d4ff] border-[#00d4ff]/30' :
                                                                    'text-[#f59e0b] border-[#f59e0b]/30'
                                                        }`}>
                                                        {c.type === 'NEW' ? 'NEW' : c.type === 'REMOVED' ? 'EXIT' : c.weightDelta > 0 ? 'ADD' : 'TRIM'}
                                                    </Badge>
                                                    {c.isOption && <span className="text-[10px] text-slate-500">⚡ option</span>}
                                                </div>
                                                {decoded && <p className="text-[10px] text-[#f59e0b] mt-0.5">{decoded.directionalView}</p>}
                                            </div>
                                            <span className={`font-mono text-sm shrink-0 flex items-center gap-0.5 ${c.weightDelta > 0 ? 'text-[#00ff88]' : c.weightDelta < 0 ? 'text-[#ff4444]' : 'text-slate-400'
                                                }`}>
                                                {c.weightDelta > 0 ? <ArrowUpRight className="h-3 w-3" /> : c.weightDelta < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                                                {c.weightDelta > 0 ? '+' : ''}{c.weightDelta.toFixed(3)}%
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StatBox({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-4 py-2">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</div>
            <div className="text-lg font-bold font-mono text-white">{value}</div>
        </div>
    );
}
