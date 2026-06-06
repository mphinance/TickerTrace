import { SiteNav } from '@/components/site-nav';
import { Markdown } from '@/components/markdown';
import { getResearch, listResearch } from '@/lib/research';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
    return listResearch().map(d => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const doc = getResearch(slug);
    if (!doc) return { title: 'Research — TickerTrace' };
    return { title: `${doc.title} — TickerTrace`, description: doc.summary };
}

export default async function ResearchDetail({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const doc = getResearch(slug);
    if (!doc) notFound();

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-foreground p-6 font-sans">
            <div className="max-w-3xl mx-auto space-y-6">
                <SiteNav />

                <Link
                    href="/research"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#00d4ff] transition-colors"
                >
                    <ArrowLeft className="h-3.5 w-3.5" /> All research
                </Link>

                <header className="bg-[#111827] border border-[#1f2937] rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                        {doc.ticker && (
                            <Link
                                href={`/stocks/${doc.ticker}`}
                                className="font-mono text-xs font-bold px-2 py-0.5 rounded border border-[#00d4ff]/30 bg-[#00d4ff]/10 text-[#00d4ff] hover:bg-[#00d4ff]/20 transition-colors"
                            >
                                {doc.ticker}
                            </Link>
                        )}
                        {doc.date && <span className="text-xs text-slate-500 font-mono">{doc.date}</span>}
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-white">{doc.title}</h1>
                    {doc.summary && <p className="text-sm text-slate-400 mt-2 leading-relaxed">{doc.summary}</p>}
                </header>

                <article className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 sm:p-7">
                    <Markdown>{doc.body}</Markdown>
                </article>
            </div>
        </div>
    );
}
