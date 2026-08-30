import { getLatestHoldings, getDailyDiff, getLatestHoldingsDate } from '@/lib/holdings';
import { DataTable } from './data-table';
import { columns } from './columns';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SiteNav } from '@/components/site-nav';

export const revalidate = 3600; // 1 hour ISR

function formatDate(iso: string): string {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });
}

export default function HoldingsPage() {
    const data = getLatestHoldings();
    const diff = getDailyDiff();
    const asOfDate = getLatestHoldingsDate();

    // Build a lookup map: "FUND|TICKER" → { weightDelta, sharesDelta }.
    // The displayed "Δ Weight" uses activeWeightDelta (price drift removed) so a
    // position whose weight only moved because its price moved doesn't read as a
    // trade. sharesDelta is the true share change — the honest companion signal.
    const changeMap = new Map<string, { weightDelta: number; sharesDelta: number }>();
    if (diff) {
        for (const c of [...diff.newPositions, ...diff.removedPositions, ...diff.changedPositions]) {
            const key = `${c.fund}|${c.ticker}`;
            changeMap.set(key, {
                weightDelta: c.activeWeightDelta,
                sharesDelta: c.currentShares - c.previousShares,
            });
        }
    }

    // Enrich holdings with deltas
    const enriched = data.map(h => {
        const key = `${h['ETF Ticker']}|${h.Ticker}`;
        const change = changeMap.get(key);
        return {
            ...h,
            weightDelta: change?.weightDelta ?? 0,
            sharesDelta: change?.sharesDelta ?? 0,
        };
    });

    const changedCount = enriched.filter(h => h.weightDelta !== 0).length;

    // Exclude cash-like entries that aren't real positions
    const EXCLUDED_TICKERS = new Set(['CASH', 'OTHER', '', 'USD', 'MARGIN', 'TBILL']);
    const filtered = enriched.filter(h =>
        !EXCLUDED_TICKERS.has(String(h.Ticker || '').toUpperCase()) &&
        !String(h.Name || '').toLowerCase().includes('cash') &&
        !String(h.Name || '').toLowerCase().includes('treasury bill')
    );

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-foreground p-6 font-sans">
            <div className="max-w-[1600px] mx-auto space-y-4">
                <SiteNav />
                <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white mb-2 transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Link>
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Full Holdings Database
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {asOfDate && <span className="font-mono">{formatDate(asOfDate)} · </span>}
                            {filtered.length.toLocaleString()} active positions across all tracked funds
                            {changedCount > 0 && (
                                <span className="text-[#00d4ff] ml-2">· {changedCount} changed today</span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden shadow-xl p-4">
                    <DataTable columns={columns} data={filtered} />
                </div>
            </div>
        </div>
    );
}
