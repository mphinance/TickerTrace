// Fund profile page — two templates, picked by the fund's category:
//
//   active-equity  → conviction over time. A Daily/Weekly/Monthly toggle, a
//                    New Entrances / Total Exits marquee, and a streak tracker.
//                    Daily holdings noise is exactly what obscures these funds.
//   option-income  → the option book. Contracts grouped by expiry with
//                    ITM/OTM badges, plus strategy effectiveness.
//
// FUND_AUM (static) is still pulled from holdings.ts — the API doesn't expose
// it (it's a /B label, not a calculation input).
import { api } from '@/lib/api';
import type {
    ApiChangeRecord, ApiFundDetail, ApiFundStreak, ApiOptionRoll, ApiOptionSignal,
} from '@/lib/api';
import { FUND_AUM } from '@/lib/holdings';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ArrowUpRight, ArrowDownRight, ArrowLeft, ArrowRight, Layers, Zap, Plus, X,
    ChevronUp, ChevronDown, Flame, CalendarDays, TrendingUp, TrendingDown, Repeat,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import React from 'react';
import { FundEffectiveness } from '@/components/fund-effectiveness';
import { FundPortfolio } from '@/components/fund-portfolio';
import { OptionStrategyChart } from '@/components/option-strategy-chart';

// The page reads searchParams (the Daily/Weekly/Monthly toggle), so it MUST
// be dynamically rendered. A statically-generated route cannot touch
// searchParams — doing so throws DYNAMIC_SERVER_USAGE in a production build
// (dev mode is lenient, which is why this slipped through once).
//
// force-dynamic also subsumes the original "never pre-render" fix: the route
// is never statically generated, so a transient API blip during `next build`
// can't bake a permanent 404 (the bug that first broke /fund/AVUV). The
// api.fund() / api.changes() calls still cache at the fetch level, so the
// API is not hit on every single request.
export const dynamic = 'force-dynamic';

type Period = 'daily' | 'weekly' | 'monthly';

// Active-equity funds default to the weekly window — daily holdings noise is
// exactly what obscures their real conviction.
function normalizePeriod(p?: string): Period {
    return p === 'daily' || p === 'monthly' ? p : 'weekly';
}

const PERIOD_LABEL: Record<Period, string> = {
    daily: 'since yesterday',
    weekly: 'past 7 days',
    monthly: 'past 30 days',
};

// Signed percent for the fund-flow stat — +1.7% / -2.3% / 0.0%.
function fmtFlowPct(pct: number): string {
    return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

// ─── Inline option-signal decoder (was decodeOptionSignal in holdings.ts) ────

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

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function FundProfilePage({
    params,
    searchParams,
}: {
    params: Promise<{ ticker: string }>;
    searchParams: Promise<{ period?: string }>;
}) {
    const { ticker } = await params;
    const sp = await searchParams;
    const fund = ticker.toUpperCase();
    const detail = await api.fund(fund);

    if (!detail) notFound();

    const aum = (FUND_AUM as Record<string, number>)[fund];
    // Defensive fallback: if the API predates the `category` field, infer it
    // from whether the fund carries an option book.
    const category = detail.category ?? (detail.optionsCount > 0 ? 'option-income' : 'active-equity');

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-foreground p-6 space-y-6 font-sans">
            <FundHeader detail={detail} aum={aum} category={category} />
            {category === 'option-income' ? (
                <OptionIncomeBody detail={detail} />
            ) : (
                <ActiveEquityBody detail={detail} fund={fund} period={normalizePeriod(sp.period)} />
            )}
        </div>
    );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function FundHeader({ detail, aum, category }: {
    detail: ApiFundDetail;
    aum: number | undefined;
    category: 'active-equity' | 'option-income';
}) {
    const isIncome = category === 'option-income';
    return (
        <div className="bg-[#111827] border border-[#1f2937] p-4 rounded-xl shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <Link href="/dashboard" className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-3 w-3" /> Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 flex-wrap">
                        <span className="text-[#00d4ff] font-mono">{detail.fund}</span>
                        <Badge variant="outline" className="text-slate-400 border-slate-600 font-normal text-sm">
                            {detail.provider}
                        </Badge>
                        <Badge
                            variant="outline"
                            className="font-normal text-xs"
                            style={{
                                color: isIncome ? '#a78bfa' : '#00ff88',
                                borderColor: isIncome ? '#a78bfa55' : '#00ff8855',
                            }}
                        >
                            {isIncome ? 'Option-Income' : 'Active-Equity'}
                        </Badge>
                    </h1>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <StatBox label="Holdings" value={detail.holdingsCount.toString()} />
                    {isIncome && <StatBox label="Options" value={detail.optionsCount.toString()} />}
                    {aum && <StatBox label="AUM" value={`$${aum}B`} />}
                    <StatBox label="Total Wt" value={`${detail.totalWeight.toFixed(1)}%`} />
                    {detail.flow && (
                        <StatBox
                            label={`Net Flow ${detail.flow.periodDays}d`}
                            value={fmtFlowPct(detail.flow.flowPct)}
                            valueClass={detail.flow.flowPct >= 0 ? 'text-[#00ff88]' : 'text-[#ff4444]'}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Active-equity body ──────────────────────────────────────────────────────

async function ActiveEquityBody({ detail, fund, period }: {
    detail: ApiFundDetail;
    fund: string;
    period: Period;
}) {
    // limit 1000 — the marquee needs the TRUE entrance/exit count, so fetch
    // the whole window. Even AVUV (~800 holdings) tops out around 800 changes
    // monthly, so 1000 captures every move without clipping.
    const res = await api.changes({ fund, period, limit: 1000 }, { throwOnError: false });
    const changes = res?.changes ?? [];

    const entrances = changes.filter(c => c.type === 'NEW');
    const exits = changes.filter(c => c.type === 'REMOVED');
    const increased = changes
        .filter(c => c.type === 'CHANGED' && c.weightDelta > 0)
        .sort((a, b) => b.weightDelta - a.weightDelta);
    const trimmed = changes
        .filter(c => c.type === 'CHANGED' && c.weightDelta < 0)
        .sort((a, b) => a.weightDelta - b.weightDelta);

    const streaks = detail.streaks ?? [];
    const topHoldings = detail.topHoldings ?? [];

    return (
        <>
            <PeriodToggle period={period} fund={fund} />

            {/* Marquee — the structural decisions in this window */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MarqueeCard kind="entrances" records={entrances} period={period} />
                <MarqueeCard kind="exits" records={exits} period={period} />
            </div>

            {/* Position sizing — the marginal resize moves */}
            <Card className="bg-[#111827] border-[#1f2937]">
                <CardHeader className="pb-3 border-b border-[#1f2937]">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                        <Zap className="h-5 w-5 text-[#f59e0b]" /> Position Sizing
                        <span className="text-xs font-normal text-slate-500 ml-auto">
                            existing holdings resized · {PERIOD_LABEL[period]}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    {increased.length === 0 && trimmed.length === 0 ? (
                        <EmptyState label="No position resizing in this window" />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {increased.length > 0 && (
                                <ChangeSection
                                    title="Increased"
                                    icon={<ChevronUp className="h-3.5 w-3.5" />}
                                    records={increased.slice(0, 12)}
                                    color="green"
                                />
                            )}
                            {trimmed.length > 0 && (
                                <ChangeSection
                                    title="Trimmed"
                                    icon={<ChevronDown className="h-3.5 w-3.5" />}
                                    records={trimmed.slice(0, 12)}
                                    color="red"
                                />
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {streaks.length > 0 && <StreakTracker streaks={streaks} />}

            <TopHoldingsTable holdings={topHoldings} />
        </>
    );
}

// ─── Option-income body ──────────────────────────────────────────────────────

function OptionIncomeBody({ detail }: { detail: ApiFundDetail }) {
    const recentChanges = detail.recentChanges ?? [];
    const equityChanges = recentChanges.filter(c => !c.isOption);
    const optionChanges = recentChanges.filter(c => c.isOption);

    const newPositions = equityChanges.filter(c => c.type === 'NEW');
    const closedPositions = equityChanges.filter(c => c.type === 'REMOVED');
    const increased = equityChanges.filter(c => c.type === 'CHANGED' && c.weightDelta > 0);
    const trimmed = equityChanges.filter(c => c.type === 'CHANGED' && c.weightDelta < 0);
    const hasChanges = equityChanges.length > 0 || optionChanges.length > 0;

    return (
        <>
            {/* Strategy map — spot vs. written strikes, the at-a-glance hero */}
            <OptionStrategyChart options={detail.optionHoldings ?? []} />

            {/* The option book — contracts grouped by expiry */}
            <FundPortfolio detail={detail} />

            {/* Rolls — contracts closed and reopened, routine income mechanics */}
            {(detail.optionRolls ?? []).length > 0 && <RollHistory rolls={detail.optionRolls} />}

            {/* Daily activity — equity churn + contracts opened/closed */}
            <Card className="bg-[#111827] border-[#1f2937]">
                <CardHeader className="pb-3 border-b border-[#1f2937]">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                        <Zap className="h-5 w-5 text-[#f59e0b]" /> Daily Activity
                        {hasChanges && (
                            <span className="text-xs font-normal text-slate-500 ml-auto">
                                {equityChanges.length} equity • {optionChanges.length} options
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    {!hasChanges ? (
                        <EmptyState label="No changes detected today" />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {newPositions.length > 0 && (
                                <ChangeSection title="New Positions" icon={<Plus className="h-3.5 w-3.5" />} records={newPositions} color="cyan" />
                            )}
                            {closedPositions.length > 0 && (
                                <ChangeSection title="Closed" icon={<X className="h-3.5 w-3.5" />} records={closedPositions} color="amber" />
                            )}
                            {increased.length > 0 && (
                                <ChangeSection title="Increased" icon={<ChevronUp className="h-3.5 w-3.5" />} records={increased} color="green" />
                            )}
                            {trimmed.length > 0 && (
                                <ChangeSection title="Trimmed" icon={<ChevronDown className="h-3.5 w-3.5" />} records={trimmed} color="red" />
                            )}
                            {optionChanges.length > 0 && (
                                <div className="md:col-span-2">
                                    <OptionsChangeSection records={optionChanges} />
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <FundEffectiveness fund={detail.fund} />

            <TopHoldingsTable holdings={detail.topHoldings ?? []} />
        </>
    );
}

// ─── Roll history ────────────────────────────────────────────────────────────

function RollHistory({ rolls }: { rolls: ApiOptionRoll[] }) {
    const fmtLeg = (leg: { strike: number; expiry: string }, call: boolean) =>
        `${call ? 'C' : 'P'}$${leg.strike}${leg.expiry ? ` · ${leg.expiry}` : ''}`;
    return (
        <Card className="bg-[#111827] border-[#1f2937]">
            <CardHeader className="pb-3 border-b border-[#1f2937]">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                    <Repeat className="h-5 w-5 text-[#a78bfa]" /> Option Rolls
                    <span className="text-xs font-normal text-slate-500 ml-auto">
                        positions rolled, not closed
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="space-y-2">
                    {rolls.map((roll, i) => {
                        const call = (roll.optionType || '').toLowerCase().startsWith('c');
                        return (
                            <div
                                key={`${roll.underlying}-${i}`}
                                className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-2.5"
                            >
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="font-mono font-bold text-sm text-white">{roll.underlying}</span>
                                    <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                                        {call ? 'Covered Call' : 'Cash-Secured Put'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                                    {roll.closed.map((leg, j) => (
                                        <span key={`c-${j}`} className="text-slate-500 line-through">
                                            {fmtLeg(leg, call)}
                                        </span>
                                    ))}
                                    <ArrowRight className="h-3.5 w-3.5 text-[#a78bfa] shrink-0" />
                                    {roll.opened.map((leg, j) => (
                                        <span key={`o-${j}`} className="text-[#00d4ff]">
                                            {fmtLeg(leg, call)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <p className="text-[10px] text-slate-600 mt-3">
                    A roll closes one contract and opens another on the same underlying —
                    routine income-fund mechanics (extending duration or repricing the
                    strike), not a directional exit.
                </p>
            </CardContent>
        </Card>
    );
}

// ─── Period toggle ───────────────────────────────────────────────────────────

function PeriodToggle({ period, fund }: { period: Period; fund: string }) {
    const opts: { key: Period; label: string; href: string }[] = [
        { key: 'daily', label: 'Daily', href: `/fund/${fund}?period=daily` },
        { key: 'weekly', label: 'Weekly', href: `/fund/${fund}` },
        { key: 'monthly', label: 'Monthly', href: `/fund/${fund}?period=monthly` },
    ];
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            <span className="text-xs text-slate-500 mr-1">Position changes over:</span>
            <div className="inline-flex rounded-lg border border-[#1f2937] bg-[#0f172a] p-0.5">
                {opts.map(o => {
                    const active = o.key === period;
                    return (
                        <Link
                            key={o.key}
                            href={o.href}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${active ? 'bg-[#00d4ff] text-[#0a0f1e]' : 'text-slate-400 hover:text-white'}`}
                        >
                            {o.label}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Marquee card (New Entrances / Total Exits) ──────────────────────────────

function MarqueeCard({ kind, records, period }: {
    kind: 'entrances' | 'exits';
    records: ApiChangeRecord[];
    period: Period;
}) {
    const isEntrances = kind === 'entrances';
    const accent = isEntrances ? '#00ff88' : '#ff4444';
    const Icon = isEntrances ? TrendingUp : TrendingDown;
    const title = isEntrances ? 'New Entrances' : 'Total Exits';
    const verb = isEntrances ? 'entered' : 'exited';

    return (
        <div
            className="rounded-xl border p-4"
            style={{ borderColor: `${accent}33`, backgroundColor: `${accent}0a` }}
        >
            <div className="flex items-center gap-2 mb-3">
                <Icon className="h-4 w-4" style={{ color: accent }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accent }}>{title}</span>
                <span className="text-[10px] text-slate-500 ml-auto">{PERIOD_LABEL[period]}</span>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-black font-mono" style={{ color: accent }}>{records.length}</span>
                <span className="text-xs text-slate-500">
                    position{records.length !== 1 ? 's' : ''} {verb}
                </span>
            </div>
            {records.length === 0 ? (
                <p className="text-xs text-slate-600">None this window — no structural change.</p>
            ) : (
                <div className="flex flex-wrap gap-1.5">
                    {records.slice(0, 16).map((r, i) => (
                        <Link
                            key={`${r.ticker}-${i}`}
                            href={`/dashboard?q=${r.ticker}`}
                            className="font-mono text-xs font-bold px-2 py-0.5 rounded border transition-opacity hover:opacity-80"
                            style={{ color: accent, borderColor: `${accent}44`, backgroundColor: `${accent}14` }}
                        >
                            <span className={isEntrances ? '' : 'line-through'}>{r.ticker}</span>
                        </Link>
                    ))}
                    {records.length > 16 && (
                        <span className="text-xs text-slate-500 self-center">+{records.length - 16} more</span>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Streak tracker ──────────────────────────────────────────────────────────

function StreakTracker({ streaks }: { streaks: ApiFundStreak[] }) {
    // streaks arrive sorted longest-first; a broad fund can carry 100+, so
    // show the most-established and summarise the rest.
    const shown = streaks.slice(0, 24);
    const extra = streaks.length - shown.length;
    return (
        <Card className="bg-[#111827] border-[#1f2937]">
            <CardHeader className="pb-3 border-b border-[#1f2937]">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                    <Flame className="h-5 w-5 text-[#f59e0b]" /> Conviction Streaks
                    <span className="text-xs font-normal text-slate-500 ml-auto">
                        {streaks.length} active · consecutive-day moves
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="flex flex-wrap gap-2 items-center">
                    {shown.map((s, i) => {
                        const up = s.direction === 'up';
                        const accent = up ? '#00ff88' : '#ff4444';
                        return (
                            <Link
                                key={`${s.ticker}-${i}`}
                                href={`/dashboard?q=${s.ticker}`}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-[#0f172a] hover:bg-[#1a2333] transition-colors"
                                style={{ borderColor: `${accent}33` }}
                            >
                                <span className="font-mono font-bold text-sm text-white">{s.ticker}</span>
                                {up
                                    ? <ArrowUpRight className="h-3.5 w-3.5" style={{ color: accent }} />
                                    : <ArrowDownRight className="h-3.5 w-3.5" style={{ color: accent }} />}
                                <span className="font-mono text-xs font-semibold" style={{ color: accent }}>{s.days}d</span>
                            </Link>
                        );
                    })}
                    {extra > 0 && (
                        <span className="text-xs text-slate-500">+{extra} more</span>
                    )}
                </div>
                <p className="text-[10px] text-slate-600 mt-3">
                    A streak counts consecutive snapshots the fund moved a position the same
                    direction — accumulating (green) or distributing (red). The clearest read
                    on where conviction is building.
                </p>
            </CardContent>
        </Card>
    );
}

// ─── Top Holdings table ──────────────────────────────────────────────────────

function TopHoldingsTable({ holdings }: { holdings: ApiFundDetail['topHoldings'] }) {
    if (holdings.length === 0) return null;
    return (
        <Card className="bg-[#111827] border-[#1f2937]">
            <CardHeader className="pb-3 border-b border-[#1f2937]">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                    <Layers className="h-5 w-5 text-[#00d4ff]" /> Top Holdings
                    <span className="text-xs font-normal text-slate-500 ml-auto">top {holdings.length} by weight</span>
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
                                {holdings.map((h, i) => {
                                    const barWidth = holdings[0]?.weight > 0 ? (h.weight / holdings[0].weight) * 100 : 0;
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
    );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
    return (
        <div className="text-center py-8 text-slate-500">
            <Zap className="h-8 w-8 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs mt-1 text-slate-600">Data updates on weekday mornings when the scraper runs.</p>
        </div>
    );
}

// ─── Change section ──────────────────────────────────────────────────────────

const colorMap = {
    cyan: { bg: 'bg-[#00d4ff]/5', border: 'border-[#00d4ff]/20', text: 'text-[#00d4ff]', badge: 'text-[#00d4ff] border-[#00d4ff]/30', dot: 'bg-[#00d4ff]' },
    green: { bg: 'bg-[#00ff88]/5', border: 'border-[#00ff88]/20', text: 'text-[#00ff88]', badge: 'text-[#00ff88] border-[#00ff88]/30', dot: 'bg-[#00ff88]' },
    red: { bg: 'bg-[#ff4444]/5', border: 'border-[#ff4444]/20', text: 'text-[#ff4444]', badge: 'text-[#ff4444] border-[#ff4444]/30', dot: 'bg-[#ff4444]' },
    amber: { bg: 'bg-[#f59e0b]/5', border: 'border-[#f59e0b]/20', text: 'text-[#f59e0b]', badge: 'text-[#f59e0b] border-[#f59e0b]/30', dot: 'bg-[#f59e0b]' },
} as const;

// A high-contrast pill that makes the major portfolio decisions — a position
// entered or exited — pop out from the marginal +/- noise around them.
//
// Tone is deliberate: an equity EXIT is red (a real conviction exit), but an
// option position CLOSED is neutral grey — closing an option is usually just
// an expiry or a roll, not a bearish call.

type PillTone = 'pos' | 'neg' | 'open' | 'neutral';

function StatusPill({ label, tone }: { label: string; tone: PillTone }) {
    const style: Record<PillTone, string> = {
        pos: 'bg-[#00ff88]/15 text-[#00ff88] border-[#00ff88]/40',
        neg: 'bg-[#ff4444]/15 text-[#ff4444] border-[#ff4444]/40',
        open: 'bg-[#00d4ff]/15 text-[#00d4ff] border-[#00d4ff]/40',
        neutral: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
    };
    return (
        <span className={`text-[9px] font-bold tracking-wide px-1.5 py-px rounded border shrink-0 ${style[tone]}`}>
            {label}
        </span>
    );
}

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
                {records.map((r, i) => {
                    const isNew = r.type === 'NEW';
                    const isExit = r.type === 'REMOVED';
                    return (
                        <div key={`${r.ticker}-${i}`} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                                <Link
                                    href={`/dashboard?q=${r.ticker}`}
                                    className={`font-mono font-bold text-sm hover:text-[#00d4ff] transition-colors ${isExit ? 'text-slate-500 line-through' : 'text-white'}`}
                                >
                                    {r.ticker}
                                </Link>
                                {isNew && <StatusPill label="NEW" tone="pos" />}
                                {isExit && <StatusPill label="EXIT" tone="neg" />}
                                <span className="text-[11px] text-slate-500 truncate">{r.name}</span>
                            </div>
                            <span className={`font-mono text-sm shrink-0 font-semibold flex items-center gap-0.5 ${r.weightDelta > 0 ? 'text-[#00ff88]' : r.weightDelta < 0 ? 'text-[#ff4444]' : 'text-slate-400'
                                }`}>
                                {r.weightDelta > 0 ? <ArrowUpRight className="h-3 w-3" /> : r.weightDelta < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                                {r.weightDelta > 0 ? '+' : ''}{r.weightDelta.toFixed(2)}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Options change section ──────────────────────────────────────────────────

function OptionsChangeSection({ records }: { records: ApiChangeRecord[] }) {
    return (
        <div className="rounded-lg bg-[#a78bfa]/5 border border-[#a78bfa]/20 p-3">
            <div className="flex items-center gap-1.5 mb-2.5 text-[#a78bfa] font-semibold text-xs uppercase tracking-wider">
                <Zap className="h-3.5 w-3.5" /> Options Activity
                <span className="text-slate-500 font-normal ml-auto">({records.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                {records.slice(0, 12).map((r, i) => {
                    const decoded = decodeOptionSignal(r);
                    const isClosed = r.type === 'REMOVED';
                    // Options are framed as position mechanics, not buy/sell: a
                    // CLOSED contract is usually an expiry or a roll, so it stays
                    // neutral grey rather than reading as a bearish red EXIT.
                    const pill = r.type === 'NEW'
                        ? { label: 'OPENED', tone: 'open' as const }
                        : isClosed
                            ? { label: 'CLOSED', tone: 'neutral' as const }
                            : r.weightDelta > 0
                                ? { label: 'ADDED', tone: 'pos' as const }
                                : { label: 'TRIMMED', tone: 'neg' as const };
                    return (
                        <div key={`opt-${r.ticker}-${i}`} className="bg-[#0f172a]/60 rounded-md px-2.5 py-2 border border-[#1e293b]">
                            <div className="flex items-center justify-between gap-1">
                                <span className={`font-mono font-bold text-xs truncate ${isClosed ? 'text-slate-500 line-through' : 'text-white'}`}>
                                    {r.optionDetails ? `${r.ticker.split(' ')[0]} ${r.optionDetails.type === 'Call' ? 'C' : 'P'}${r.optionDetails.strike}` : r.ticker}
                                </span>
                                <StatusPill label={pill.label} tone={pill.tone} />
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

// ─── Stat box ────────────────────────────────────────────────────────────────

function StatBox({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
    return (
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-4 py-2">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</div>
            <div className={`text-lg font-bold font-mono ${valueClass || 'text-white'}`}>{value}</div>
        </div>
    );
}
