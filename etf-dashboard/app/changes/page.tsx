import { api } from '@/lib/api';
import { PROVIDER_ORDER } from '@/lib/holdings';
import { ArrowLeft, Share2 } from 'lucide-react';
import Link from 'next/link';
import { ChangesClient } from '@/components/changes-client';
import { InstitutionalSummary } from '@/components/institutional-summary';
import { SiteNav } from '@/components/site-nav';

export const dynamic = 'force-dynamic';

type Period = 'daily' | 'weekly' | 'monthly';
const PERIODS: { key: Period; label: string }[] = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Past 7 days' },
    { key: 'monthly', label: 'Past 30 days' },
];
const HEADLINE: Record<Period, string> = {
    daily: 'since yesterday',
    weekly: 'over the past 7 days',
    monthly: 'over the past 30 days',
};

export default async function ChangesPage({
    searchParams,
}: {
    searchParams: Promise<{ period?: string }>;
}) {
    const sp = await searchParams;
    const period: Period =
        sp.period === 'weekly' || sp.period === 'monthly' ? sp.period : 'daily';

    // Pull the full (uncapped) change list for the window — the headline
    // /signals payload truncates to the top 50 by magnitude, which silently
    // drops broad value funds like Avantis whose per-name deltas are tiny.
    // Equity changes come from /changes; option activity from /activity.
    const [changesResp, activity, institutional] = await Promise.all([
        api.changes({ period, limit: 5000 }),
        api.activity(period),
        api.institutional(period, 25),
    ]);

    const asOfDate = changesResp?.asOfDate ?? 'unknown';

    const allChanges: {
        fund: string; ticker: string; name: string;
        type: string; weightDelta: number; isOption: boolean;
    }[] = [];

    const equity = changesResp?.changes ?? [];
    const options = activity?.optionsActivity ?? [];
    for (const c of [...equity, ...options]) {
        allChanges.push({
            fund: c.fund,
            ticker: c.ticker,
            name: c.name,
            type: c.type,
            weightDelta: c.weightDelta,
            isOption: c.isOption,
        });
    }

    allChanges.sort((a, b) => Math.abs(b.weightDelta) - Math.abs(a.weightDelta));

    const shareText = `${allChanges.length} ETF position changes across ${new Set(allChanges.map(c => c.fund)).size} funds. See what the institutions are doing before the herd does.`;
    const shareUrl = 'https://tickertrace.pro/changes';

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-foreground p-6 space-y-6 font-sans">
            <SiteNav />
            <div className="bg-[#111827] border border-[#1f2937] p-4 rounded-xl shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1 mb-2">
                            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
                        </Link>
                        <h1 className="text-2xl font-black tracking-tight">
                            <span className="text-[#00d4ff]">What changed</span> {HEADLINE[period]}?
                        </h1>
                        <p className="text-sm text-slate-400 font-mono mt-1">
                            {asOfDate} · {allChanges.length} position changes across {new Set(allChanges.map(c => c.fund)).size} funds
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 hidden sm:inline"><Share2 className="h-3 w-3 inline mr-1" />Share</span>
                        <a
                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="p-2 bg-[#0a0f1e] border border-[#1f2937] rounded-lg hover:border-[#1d9bf0] transition-colors"
                            title="Share on X"
                        >
                            <svg className="h-4 w-4 text-slate-400 hover:text-[#1d9bf0]" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                        </a>
                        <a
                            href={`https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="p-2 bg-[#0a0f1e] border border-[#1f2937] rounded-lg hover:border-[#ff4500] transition-colors"
                            title="Share on Reddit"
                        >
                            <svg className="h-4 w-4 text-slate-400 hover:text-[#ff4500]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" /></svg>
                        </a>
                        <a
                            href="https://discord.com/channels/@me"
                            target="_blank" rel="noopener noreferrer"
                            className="p-2 bg-[#0a0f1e] border border-[#1f2937] rounded-lg hover:border-[#5865F2] transition-colors"
                            title="Share on Discord"
                        >
                            <svg className="h-4 w-4 text-slate-400 hover:text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
                        </a>
                    </div>
                </div>
            </div>

            {/* Window toggle — daily / weekly / monthly. Slow-moving value funds
                only show meaningful flow over a week or month. */}
            <div className="flex gap-1.5">
                {PERIODS.map(p => (
                    <Link
                        key={p.key}
                        href={p.key === 'daily' ? '/changes' : `/changes?period=${p.key}`}
                        scroll={false}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${period === p.key
                            ? 'bg-[#00d4ff]/20 border-[#00d4ff]/40 text-[#00d4ff]'
                            : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'}`}
                    >{p.label}</Link>
                ))}
            </div>

            {institutional && <InstitutionalSummary flow={institutional} />}

            <ChangesClient
                changes={allChanges}
                asOfDate={asOfDate}
                providers={PROVIDER_ORDER}
            />
        </div>
    );
}
