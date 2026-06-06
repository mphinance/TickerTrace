import { SiteNav } from '@/components/site-nav';
import { listResearch } from '@/lib/research';
import { BookOpen, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
    title: 'Research — TickerTrace',
    description: 'Hand-written conviction briefs built on TickerTrace holdings flows.',
};

export default function ResearchIndex() {
    const docs = listResearch();

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-foreground p-6 space-y-6 font-sans">
            <SiteNav />

            <div className="bg-[#111827] border border-[#1f2937] p-4 rounded-xl shadow-lg">
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-[#00d4ff]" />
                    Research
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                    Hand-written conviction briefs — what the flows are saying, with the homework to back it up. Not investment advice.
                </p>
            </div>

            {docs.length === 0 ? (
                <div className="bg-[#111827] border border-[#1f2937] p-8 rounded-xl text-center text-slate-500 text-sm">
                    No briefs published yet.
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {docs.map(d => (
                        <Link
                            key={d.slug}
                            href={`/research/${d.slug}`}
                            className="group bg-[#111827] border border-[#1f2937] rounded-xl p-5 hover:border-[#2a3a52] transition-colors flex flex-col"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                {d.ticker && (
                                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded border border-[#00d4ff]/30 bg-[#00d4ff]/10 text-[#00d4ff]">
                                        {d.ticker}
                                    </span>
                                )}
                                <span className="text-xs text-slate-500 font-mono">{d.date}</span>
                            </div>
                            <h2 className="font-bold text-white text-base mb-1.5 flex items-center gap-1 group-hover:text-[#00d4ff] transition-colors">
                                {d.title}
                                <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </h2>
                            <p className="text-xs text-slate-400 leading-relaxed">{d.summary}</p>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
