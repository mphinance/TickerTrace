import {
    getDailyDiff, getAsOfDate, getProvider, PROVIDER_ORDER,
    ChangeRecord
} from '@/lib/holdings';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ChangesClient } from '@/components/changes-client';
import { ProGate } from '@/components/pro-gate';

export const dynamic = 'force-dynamic';

export default function ChangesPage() {
    const diff = getDailyDiff();
    const asOfDate = getAsOfDate();

    const allChanges: {
        fund: string; ticker: string; name: string;
        type: string; weightDelta: number; isOption: boolean;
    }[] = [];

    if (diff) {
        for (const c of [...diff.newPositions, ...diff.removedPositions, ...diff.changedPositions]) {
            allChanges.push({
                fund: c.fund,
                ticker: c.ticker,
                name: c.name,
                type: c.type,
                weightDelta: c.weightDelta,
                isOption: c.isOption,
            });
        }
    }

    allChanges.sort((a, b) => Math.abs(b.weightDelta) - Math.abs(a.weightDelta));

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-foreground p-6 space-y-6 font-sans">
            <div className="bg-[#111827] border border-[#1f2937] p-4 rounded-xl shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
                        </Link>
                        <h1 className="text-2xl font-black tracking-tight">
                            <span className="text-[#00d4ff]">What changed</span> since yesterday?
                        </h1>
                        <p className="text-sm text-slate-400 font-mono mt-1">
                            {asOfDate} · {allChanges.length} position changes across {new Set(allChanges.map(c => c.fund)).size} funds
                        </p>
                    </div>
                </div>
            </div>

            <ProGate label="Daily Position Changes" minHeight="400px">
                <ChangesClient
                    changes={allChanges}
                    asOfDate={asOfDate}
                    providers={PROVIDER_ORDER}
                />
            </ProGate>
        </div>
    );
}
