import { api } from '@/lib/api';
import { SiteNav } from '@/components/site-nav';
import { FUND_PROVIDERS, PROVIDER_ORDER } from '@/lib/providers';
import { ArrowUpRight, ArrowDownRight, LineChart, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Sort = 'funds' | 'weight' | 'change' | 'streak';
type Signal = 'all' | 'buying' | 'selling' | 'streak';

const SORTS: { key: Sort; label: string }[] = [
    { key: 'funds', label: 'Most widely held' },
    { key: 'weight', label: 'Most weight' },
    { key: 'change', label: 'Biggest Δ today' },
    { key: 'streak', label: 'Longest streak' },
];

const SIGNALS: { key: Signal; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'buying', label: '↑ Net buying' },
    { key: 'selling', label: '↓ Net selling' },
    { key: 'streak', label: '🔥 Has streak' },
];

const SORT_DESC: Record<Sort, string> = {
    funds: 'how many funds hold them',
    weight: 'total weight across funds',
    change: 'biggest institutional weight move today',
    streak: 'strongest multi-day institutional streak',
};

const SIGNAL_DESC: Record<Signal, string> = {
    all: '',
    buying: 'net bought today',
    selling: 'net sold today',
    streak: 'with an active multi-day streak',
};

/** Build a /stocks URL preserving whichever params are active. */
function stocksUrl(params: { sort?: Sort; sector?: string; signal?: Signal; provider?: string }): string {
    const sp = new URLSearchParams();
    if (params.sort && params.sort !== 'funds') sp.set('sort', params.sort);
    if (params.sector) sp.set('sector', params.sector);
    if (params.signal && params.signal !== 'all') sp.set('signal', params.signal);
    if (params.provider) sp.set('provider', params.provider);
    const qs = sp.toString();
    return `/stocks${qs ? `?${qs}` : ''}`;
}

export default async function StocksPage({
    searchParams,
}: {
    searchParams: Promise<{ sort?: string; sector?: string; signal?: string; provider?: string }>;
}) {
    const sp = await searchParams;
    const sort: Sort =
        sp.sort === 'weight' ? 'weight'
        : sp.sort === 'change' ? 'change'
        : sp.sort === 'streak' ? 'streak'
        : 'funds';
    const sector = sp.sector ?? '';
    const signal: Signal =
        sp.signal === 'buying' ? 'buying'
        : sp.signal === 'selling' ? 'selling'
        : sp.signal === 'streak' ? 'streak'
        : 'all';
    const provider = sp.provider ?? '';

    // 'change' and 'streak' aren't sorts the API knows — fetch all 150 by fund
    // count and sort server-side. 150 tickers covers everything institutionally
    // significant, so nothing noteworthy gets missed.
    const apiSort: 'funds' | 'weight' = sort === 'weight' ? 'weight' : 'funds';
    const resp = await api.tickers(apiSort, 150);
    let tickers = resp?.tickers ?? [];

    if (sort === 'change') {
        tickers = [...tickers].sort((a, b) => Math.abs(b.netChange) - Math.abs(a.netChange));
    }
    if (sort === 'streak') {
        tickers = [...tickers].sort((a, b) => Math.abs(b.streak ?? 0) - Math.abs(a.streak ?? 0));
    }

    // Collect unique non-empty sectors and providers from the full 150 for the
    // filter pills. Do this before applying any filters so All is always complete.
    const allSectors = [...new Set(tickers.map(t => t.sector).filter(Boolean))].sort();
    const allProviders = PROVIDER_ORDER.filter(prov =>
        tickers.some(t => t.funds.some(f => FUND_PROVIDERS[f] === prov))
    );

    // Apply sector filter, then signal filter, then provider filter.
    let displayed = sector ? tickers.filter(t => t.sector === sector) : tickers;
    if (signal === 'buying')  displayed = displayed.filter(t => t.netChange > 0);
    if (signal === 'selling') displayed = displayed.filter(t => t.netChange < 0);
    if (signal === 'streak')  displayed = displayed.filter(t => t.streak != null && Math.abs(t.streak) >= 2);
    if (provider) displayed = displayed.filter(t => t.funds.some(f => FUND_PROVIDERS[f] === provider));

    // Pre-compute pill counts so each pill shows how many tickers you'd see if
    // you clicked it — accounting for the other active filters.
    const signalFiltered = (
        signal === 'buying'  ? tickers.filter(t => t.netChange > 0)
        : signal === 'selling' ? tickers.filter(t => t.netChange < 0)
        : signal === 'streak'  ? tickers.filter(t => t.streak != null && Math.abs(t.streak) >= 2)
        : tickers
    );
    // Provider pill counts: how many signal-filtered tickers each provider holds.
    // De-duped per ticker — a stock in 6 ARK funds counts once for "ARK Invest".
    const providerCounts = new Map<string, number>();
    signalFiltered.forEach(t => {
        const provs = new Set(t.funds.map(f => FUND_PROVIDERS[f]).filter(Boolean));
        provs.forEach(p => providerCounts.set(p, (providerCounts.get(p) ?? 0) + 1));
    });
    // Sector pill counts: signal + provider filtered, before sector filter.
    const preSectorFiltered = provider
        ? signalFiltered.filter(t => t.funds.some(f => FUND_PROVIDERS[f] === provider))
        : signalFiltered;
    const sectorCounts = new Map<string, number>();
    preSectorFiltered.forEach(t => {
        if (t.sector) sectorCounts.set(t.sector, (sectorCounts.get(t.sector) ?? 0) + 1);
    });

    const filterDesc = [
        provider ? `from ${provider}` : '',
        sector ? `in ${sector}` : '',
        signal !== 'all' ? SIGNAL_DESC[signal] : '',
    ].filter(Boolean).join(', ');

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-foreground p-6 space-y-6 font-sans">
            <SiteNav />

            <div className="bg-[#111827] border border-[#1f2937] p-4 rounded-xl shadow-lg">
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    <LineChart className="h-6 w-6 text-[#00d4ff]" />
                    Most-held stocks
                </h1>
                <p className="text-sm text-slate-400 font-mono mt-1">
                    {resp === null
                        ? 'Data unavailable — refresh to try again'
                        : `${resp.asOfDate ? `${resp.asOfDate} · ` : ''}${displayed.length} tickers${filterDesc ? ` ${filterDesc}` : ''} ranked by ${SORT_DESC[sort]}`}
                </p>
            </div>

            {/* Sort pills */}
            <div className="flex gap-1.5 flex-wrap">
                {SORTS.map(s => (
                    <Link
                        key={s.key}
                        href={stocksUrl({ sort: s.key, sector: sector || undefined, signal: signal !== 'all' ? signal : undefined, provider: provider || undefined })}
                        scroll={false}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${sort === s.key
                            ? 'bg-[#00d4ff]/20 border-[#00d4ff]/40 text-[#00d4ff]'
                            : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'}`}
                    >{s.label}</Link>
                ))}
            </div>

            {/* Signal filter pills — buy/sell/streak slices, always shown */}
            {resp !== null && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-500 font-mono shrink-0">signal:</span>
                    {SIGNALS.map(sig => (
                        <Link
                            key={sig.key}
                            href={stocksUrl({ sort: sort !== 'funds' ? sort : undefined, sector: sector || undefined, signal: sig.key !== 'all' ? sig.key : undefined, provider: provider || undefined })}
                            scroll={false}
                            className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${signal === sig.key
                                ? 'bg-[#00ff88]/20 border-[#00ff88]/40 text-[#00ff88]'
                                : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'}`}
                        >{sig.label}</Link>
                    ))}
                </div>
            )}

            {/* Provider filter pills — filter to stocks held by a specific fund family */}
            {resp !== null && allProviders.length > 1 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-500 font-mono shrink-0">provider:</span>
                    <Link
                        href={stocksUrl({ sort: sort !== 'funds' ? sort : undefined, sector: sector || undefined, signal: signal !== 'all' ? signal : undefined })}
                        scroll={false}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${!provider
                            ? 'bg-[#f59e0b]/20 border-[#f59e0b]/40 text-[#f59e0b]'
                            : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'}`}
                    >All</Link>
                    {allProviders.map(prov => {
                        const cnt = providerCounts.get(prov) ?? 0;
                        return (
                            <Link
                                key={prov}
                                href={stocksUrl({ sort: sort !== 'funds' ? sort : undefined, sector: sector || undefined, signal: signal !== 'all' ? signal : undefined, provider: prov })}
                                scroll={false}
                                className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${provider === prov
                                    ? 'bg-[#f59e0b]/20 border-[#f59e0b]/40 text-[#f59e0b]'
                                    : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'}`}
                            >
                                {prov}{cnt > 0 && <span className="ml-1 opacity-50">({cnt})</span>}
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Sector filter pills — only shown once the API responds */}
            {resp !== null && allSectors.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-500 font-mono shrink-0">sector:</span>
                    <Link
                        href={stocksUrl({ sort: sort !== 'funds' ? sort : undefined, signal: signal !== 'all' ? signal : undefined, provider: provider || undefined })}
                        scroll={false}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${!sector
                            ? 'bg-[#a78bfa]/20 border-[#a78bfa]/40 text-[#c4b5fd]'
                            : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'}`}
                    >All</Link>
                    {allSectors.map(sec => {
                        const cnt = sectorCounts.get(sec) ?? 0;
                        return (
                            <Link
                                key={sec}
                                href={stocksUrl({ sort: sort !== 'funds' ? sort : undefined, sector: sec, signal: signal !== 'all' ? signal : undefined, provider: provider || undefined })}
                                scroll={false}
                                className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${sector === sec
                                    ? 'bg-[#a78bfa]/20 border-[#a78bfa]/40 text-[#c4b5fd]'
                                    : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'}`}
                            >
                                {sec}{cnt > 0 && <span className="ml-1 opacity-50">({cnt})</span>}
                            </Link>
                        );
                    })}
                </div>
            )}

            {resp === null ? (
                <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-10 text-center">
                    <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Couldn&apos;t reach the API right now.</p>
                    <p className="text-slate-600 text-sm mt-1">Try refreshing — the data usually comes right back.</p>
                </div>
            ) : displayed.length === 0 ? (
                <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-10 text-center">
                    <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">
                        No stocks match{provider ? ` from ${provider}` : ''}{sector ? ` in ${sector}` : ''}{signal !== 'all' ? ` (${SIGNAL_DESC[signal]})` : ''} today.
                    </p>
                    <p className="text-slate-600 text-sm mt-1">
                        Try{' '}
                        <Link href={stocksUrl({ sort: sort !== 'funds' ? sort : undefined })} className="text-[#00ff88] hover:underline">
                            clearing all filters
                        </Link>{' '}
                        to see everything.
                    </p>
                </div>
            ) : (
            <div className="rounded-lg border border-[#1f2937] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#0f172a] text-slate-400 text-xs uppercase tracking-wider">
                            <tr className="border-b border-[#1f2937]">
                                <th className="text-right font-semibold px-3 py-3 w-12">#</th>
                                <th className="text-left font-semibold px-4 py-3">Ticker</th>
                                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Name</th>
                                <th className="text-right font-semibold px-4 py-3">Funds</th>
                                <th className="text-right font-semibold px-4 py-3">Total wt</th>
                                <th className="text-right font-semibold px-4 py-3">Δ today</th>
                                <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Held by</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayed.map((t, i) => (
                                <tr key={t.ticker} className="border-b border-[#1f2937] hover:bg-[#1a2333]/50">
                                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">{i + 1}</td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <Link href={`/stocks/${t.ticker}`} className="font-mono font-bold text-[#00d4ff] hover:underline">
                                                {t.ticker}
                                            </Link>
                                            {t.newEntryFunds?.length > 0 && (
                                                <span
                                                    className="text-[9px] font-bold px-1.5 py-0 leading-4 rounded border border-[#00ff88]/30 bg-[#00ff88]/10 text-[#00ff88]"
                                                    title={`New position today: ${t.newEntryFunds.join(', ')}`}
                                                >
                                                    NEW
                                                </span>
                                            )}
                                            {t.streak != null && Math.abs(t.streak) >= 3 && (
                                                <span
                                                    className={`text-[9px] font-bold px-1.5 py-0 leading-4 rounded border ${
                                                        t.streak > 0
                                                            ? 'border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b]'
                                                            : 'border-[#ff4444]/30 bg-[#ff4444]/10 text-[#ff4444]'
                                                    }`}
                                                    title={`${Math.abs(t.streak)}-day ${t.streak > 0 ? 'buying' : 'selling'} streak`}
                                                >
                                                    {t.streak > 0 ? '▲' : '▼'} {Math.abs(t.streak)}d
                                                </span>
                                            )}
                                            {(t.distinctProviders ?? 0) >= 2 && (
                                                <span
                                                    className="text-[9px] font-bold px-1.5 py-0 leading-4 rounded border border-[#a78bfa]/30 bg-[#a78bfa]/10 text-[#c4b5fd]"
                                                    title={`Held by ${t.distinctProviders} distinct fund families — cross-family conviction`}
                                                >
                                                    {t.distinctProviders} fam
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-400 text-xs hidden md:table-cell max-w-[220px]">
                                        <div className="truncate">{t.name}</div>
                                        {t.sector && !sector && (
                                            <span className="inline-block mt-0.5 text-[9px] font-medium px-1.5 py-0 rounded border border-[#334155] bg-[#1e293b] text-slate-500 leading-4">
                                                {t.sector}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-mono text-white font-semibold">{t.fundCount}</td>
                                    <td className="px-4 py-2.5 text-right font-mono text-slate-300">{t.totalWeight.toFixed(2)}%</td>
                                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${t.netChange > 0 ? 'text-[#00ff88]' : t.netChange < 0 ? 'text-[#ff4444]' : 'text-slate-500'}`}>
                                        <span className="inline-flex items-center justify-end gap-0.5">
                                            {t.netChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : t.netChange < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                                            {t.netChange === 0 ? '—' : `${t.netChange > 0 ? '+' : ''}${t.netChange.toFixed(3)}%`}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 hidden lg:table-cell">
                                        <div className="flex flex-wrap gap-1">
                                            {t.funds.slice(0, 6).map(f => (
                                                <Link
                                                    key={f}
                                                    href={`/fund/${f}`}
                                                    title={FUND_PROVIDERS[f] ?? f}
                                                    className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-[#334155] bg-[#1e293b] text-slate-400 hover:text-white"
                                                >{f}</Link>
                                            ))}
                                            {t.funds.length > 6 && (
                                                <span className="text-[10px] text-slate-600 px-1 py-0.5">+{t.funds.length - 6}</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}
        </div>
    );
}
