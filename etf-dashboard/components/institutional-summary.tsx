import type { ApiInstitutionalEntry, ApiInstitutionalFlow } from '@/lib/api';
import { ArrowUpRight, ArrowDownRight, Building2 } from 'lucide-react';
import Link from 'next/link';

const PERIOD_LABEL: Record<string, string> = {
    daily: 'since yesterday',
    weekly: 'over the past 7 days',
    monthly: 'over the past 30 days',
};

function Row({ entry }: { entry: ApiInstitutionalEntry }) {
    const buying = entry.weightDelta > 0;
    const exited = entry.fundCount === 0;
    return (
        <div className="flex items-center justify-between gap-3 py-2 border-b border-rule last:border-0">
            <div className="min-w-0">
                <Link
                    href={`/stocks/${entry.ticker}`}
                    className="font-mono font-bold text-sm text-equity hover:underline"
                >
                    {entry.ticker}
                </Link>
                <p className="text-[11px] text-slate-500 truncate max-w-[180px]">{entry.name}</p>
            </div>
            <div className="text-right shrink-0">
                <div className={`font-mono text-sm font-semibold flex items-center justify-end gap-0.5 ${buying ? 'text-buy' : 'text-sell'}`}>
                    {buying ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {buying ? '+' : ''}{entry.weightDelta.toFixed(3)}%
                </div>
                <p className="text-[10px] text-slate-500 font-mono">
                    {entry.previousBlendedWeight.toFixed(2)}→{entry.blendedWeight.toFixed(2)}%
                    {' · '}
                    {exited
                        ? <span className="text-warning">exited</span>
                        : `${entry.fundCount} fund${entry.fundCount === 1 ? '' : 's'}`}
                </p>
            </div>
        </div>
    );
}

/**
 * "Institutions as a whole" — the active-equity funds (income funds excluded)
 * blended into one AUM-weighted portfolio. Shows which tickers that combined
 * book is net buying vs. selling over the selected window.
 */
export function InstitutionalSummary({ flow }: { flow: ApiInstitutionalFlow }) {
    const window = PERIOD_LABEL[flow.period] ?? '';
    const hasData = flow.buying.length > 0 || flow.selling.length > 0;

    return (
        <div className="bg-surface border border-rule rounded-xl shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-rule">
                <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-meta" />
                    <h2 className="text-sm font-black tracking-tight">
                        What are institutions <span className="text-meta">as a whole</span> doing?
                    </h2>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                    {flow.fundCount} stock-picking funds (${flow.totalAum.toFixed(1)}B combined, income funds excluded)
                    blended by AUM — net position changes {window}.
                </p>
            </div>

            {!hasData ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">
                    No material institutional flow in this window yet.
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-rule">
                    <div className="px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-buy mb-1">
                            ↑ Accumulating
                        </p>
                        {flow.buying.length === 0
                            ? <p className="text-xs text-slate-600 py-2">Nothing net-bought.</p>
                            : flow.buying.map(e => <Row key={e.ticker} entry={e} />)}
                    </div>
                    <div className="px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-sell mb-1">
                            ↓ Trimming
                        </p>
                        {flow.selling.length === 0
                            ? <p className="text-xs text-slate-600 py-2">Nothing net-sold.</p>
                            : flow.selling.map(e => <Row key={e.ticker} entry={e} />)}
                    </div>
                </div>
            )}
        </div>
    );
}
