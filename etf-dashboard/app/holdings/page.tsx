import { getLatestHoldings } from '@/lib/holdings';
import { DataTable } from './data-table';
import { columns } from './columns';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const revalidate = 3600; // 1 hour ISR

export default function HoldingsPage() {
    const data = getLatestHoldings();

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-foreground p-6 font-sans">
            <div className="max-w-[1600px] mx-auto space-y-4">
                <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white mb-2 transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Link>
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Full Holdings Database
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Explore {data.length.toLocaleString()} active positions across all tracked funds
                        </p>
                    </div>
                </div>

                {/* Using a client-side data table component for strict interactivity */}
                <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden shadow-xl p-4">
                    <DataTable columns={columns} data={data} />
                </div>
            </div>
        </div>
    );
}
