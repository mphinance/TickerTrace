// Review #10 finale: fund profile pages now render from FastAPI via lib/api.ts.
// FUND_AUM (static) is still pulled from the deprecated holdings.ts since the
// API doesn't expose it (it's used as a /B label, not a calculation input).
import { api } from '@/lib/api';
import type { ApiChangeRecord, ApiOptionSignal } from '@/lib/api';
import { FUND_AUM } from '@/lib/holdings';

// Inline copy of the option-signal decoder (was decodeOptionSignal in holdings.ts).
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ArrowUpRight, ArrowDownRight, ArrowLeft, TrendingUp, TrendingDown,
    Building2, Layers, Zap, Plus, X, ChevronUp, ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import React from 'react';
import { ProGate } from '@/components/pro-gate';
import { FundEffectiveness } from '@/components/fund-effectiveness';

export const revalidate = 3600;

export async function generateStaticParams() {
    try {
        const list = await api.funds({ throwOnError: false });
        return (list?.funds ?? []).map(f => ({ ticker: f.fund }));
    } catch {
        return [];
    }
}

export default async function FundProfilePage({ params }: { params: Promise<{ ticker: string }> }) {
    const { ticker } = await params;
    const fund = ticker.toUpperCase();
    const detail = await api.fund(fund);

    if (!detail) notFound();

    const aum = (FUND_AUM as Record<string, number>)[fund];

    // Categorize changes for the ETF Delta-style changelog
    const equityChanges = detail.recentChanges.filter(c => !c.isOption);
    const optionChanges = detail.recentChanges.filter(c => c.isOption);

    const newPositions = equityChanges.filter(c => c.type === 'NEW');
    const closedPositions = equityChanges.filter(c => c.type === 'REMOVED');
    const increased = equityChanges.filter(c => c.type === 'CHANGED' && c.weightDelta > 0);
    const trimmed = equityChanges.filter(c => c.type === 'CHANGED' && c.weightDelta < 0);

    const hasChanges = equityChanges.length > 0 || optionChanges.length > 0;

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

            <ProGate label={`${detail.fund} Holdings Detail`} minHeight="400px">
                {/* Daily Changelog — ETF Delta style */}
                <Card className="bg-[#111827] border-[#1f2937]">
                    <CardHeader className="pb-3 border-b border-[#1f2937]">
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                            <Zap className="h-5 w-5 text-[#f59e0b]" /> Daily Position Changes
                            {hasChanges && (
                                <span className="text-xs font-normal text-slate-500 ml-auto">
                                    {equityChanges.length} equity • {optionChanges.length} options
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {!hasChanges ? (
                            <div className="text-center py-8 text-slate-500">
                                <Zap className="h-8 w-8 mx-auto mb-3 opacity-20" />
                                <p className="text-sm font-medium">No changes detected today</p>
                                <p className="text-xs mt-1 text-slate-600">Data updates on weekday mornings when the scraper runs.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* ★ New Positions */}
                                {newPositions.length > 0 && (
                                    <ChangeSection
                                        title="New Positions"
                                        icon={<Plus className="h-3.5 w-3.5" />}
                                        records={newPositions}
                                        color="cyan"
                                    />
                                )}

                                {/* ✕ Closed / Exited */}
                                {closedPositions.length > 0 && (
                                    <ChangeSection
                                        title="Closed"
                                        icon={<X className="h-3.5 w-3.5" />}
                                        records={closedPositions}
                                        color="amber"
                                    />
                                )}

                                {/* ↑ Increased */}
                                {increased.length > 0 && (
                                    <ChangeSection
                                        title="Increased"
                                        icon={<ChevronUp className="h-3.5 w-3.5" />}
                                        records={increased}
                                        color="green"
                                    />
                                )}

                                {/* ↓ Trimmed */}
                                {trimmed.length > 0 && (
                                    <ChangeSection
                                        title="Trimmed"
                                        icon={<ChevronDown className="h-3.5 w-3.5" />}
                                        records={trimmed}
                                        color="red"
                                    />
                                )}

                                {/* ⚡ Options Activity */}
                                {optionChanges.length > 0 && (
                                    <div className="md:col-span-2">
                                        <OptionsChangeSection records={optionChanges} />
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Holdings */}
                <Card className="bg-[#111827] border-[#1f2937] mt-6">
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

                {/* Strategy Effectiveness — only for option-income funds */}
                {detail.optionsCount > 0 && (
                    <FundEffectiveness fund={detail.fund} />
                )}
            </ProGate>
        </div>
    );
}

// ─── Change Section Component ────────────────────────────────────────────────

const colorMap = {
    cyan: { bg: 'bg-[#00d4ff]/5', border: 'border-[#00d4ff]/20', text: 'text-[#00d4ff]', badge: 'text-[#00d4ff] border-[#00d4ff]/30', dot: 'bg-[#00d4ff]' },
    green: { bg: 'bg-[#00ff88]/5', border: 'border-[#00ff88]/20', text: 'text-[#00ff88]', badge: 'text-[#00ff88] border-[#00ff88]/30', dot: 'bg-[#00ff88]' },
    red: { bg: 'bg-[#ff4444]/5', border: 'border-[#ff4444]/20', text: 'text-[#ff4444]', badge: 'text-[#ff4444] border-[#ff4444]/30', dot: 'bg-[#ff4444]' },
    amber: { bg: 'bg-[#f59e0b]/5', border: 'border-[#f59e0b]/20', text: 'text-[#f59e0b]', badge: 'text-[#f59e0b] border-[#f59e0b]/30', dot: 'bg-[#f59e0b]' },
} as const;

function ChangeSection({ title, icon, records, color }: {
    title: string;
    icon: React.ReactNode;
    records: ApiChangeRecord[];
    color: keyof typeof colorMap;
}) {
    const c = colorMap[color];
    return (
        <div className={`rounded-lg ${c.bg} ${c.border} border p-3`}>
            <div className={`flex items-center gap-1.5 mb-2.5 ${c.text} font-semibold text-xs uppercase tracking-wider`}>
                {icon} {title}
                <span className="text-slate-500 font-normal ml-auto">({records.length})</span>
            </div>
            <div className="space-y-1.5">
                {records.map((r, i) => (
                    <div key={`${r.ticker}-${i}`} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                            <Link href={`/dashboard?q=${r.ticker}`} className="font-mono font-bold text-sm text-white hover:text-[#00d4ff] transition-colors">
                                {r.ticker}
                            </Link>
                            <span className="text-[11px] text-slate-500 truncate">{r.name}</span>
                        </div>
                        <span className={`font-mono text-sm shrink-0 font-semibold flex items-center gap-0.5 ${r.weightDelta > 0 ? 'text-[#00ff88]' : r.weightDelta < 0 ? 'text-[#ff4444]' : 'text-slate-400'
                            }`}>
                            {r.weightDelta > 0 ? <ArrowUpRight className="h-3 w-3" /> : r.weightDelta < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                            {r.weightDelta > 0 ? '+' : ''}{r.weightDelta.toFixed(2)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Options Change Section ──────────────────────────────────────────────────

function OptionsChangeSection({ records }: { records: ApiChangeRecord[] }) {
    const newOpts = records.filter(r => r.type === 'NEW');
    const closedOpts = records.filter(r => r.type === 'REMOVED');
    const changedOpts = records.filter(r => r.type === 'CHANGED');

    return (
        <div className="rounded-lg bg-[#a78bfa]/5 border border-[#a78bfa]/20 p-3">
            <div className="flex items-center gap-1.5 mb-2.5 text-[#a78bfa] font-semibold text-xs uppercase tracking-wider">
                <Zap className="h-3.5 w-3.5" /> Options Activity
                <span className="text-slate-500 font-normal ml-auto">({records.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                {records.slice(0, 12).map((r, i) => {
                    const decoded = decodeOptionSignal(r);
                    const label = r.type === 'NEW' ? '★ NEW' : r.type === 'REMOVED' ? '✕ EXIT' : r.weightDelta > 0 ? '↑ ADD' : '↓ TRIM';
                    const labelColor = r.type === 'NEW' ? 'text-[#00d4ff]' : r.type === 'REMOVED' ? 'text-[#f59e0b]' : r.weightDelta > 0 ? 'text-[#00ff88]' : 'text-[#ff4444]';
                    return (
                        <div key={`opt-${r.ticker}-${i}`} className="bg-[#0f172a]/60 rounded-md px-2.5 py-2 border border-[#1e293b]">
                            <div className="flex items-center justify-between gap-1">
                                <span className="font-mono font-bold text-xs text-white truncate">
                                    {r.optionDetails ? `${r.ticker.split(' ')[0]} ${r.optionDetails.type === 'Call' ? 'C' : 'P'}${r.optionDetails.strike}` : r.ticker}
                                </span>
                                <span className={`text-[9px] font-semibold ${labelColor}`}>{label}</span>
                            </div>
                            {decoded && (
                                <p className="text-[10px] text-[#a78bfa] mt-0.5 truncate">{decoded.directionalView}</p>
                            )}
                            {r.optionDetails?.expiry && (
                                <p className="text-[9px] text-slate-600 mt-0.5">exp {r.optionDetails.expiry}</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Stat Box ────────────────────────────────────────────────────────────────

function StatBox({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-4 py-2">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</div>
            <div className="text-lg font-bold font-mono text-white">{value}</div>
        </div>
    );
}
