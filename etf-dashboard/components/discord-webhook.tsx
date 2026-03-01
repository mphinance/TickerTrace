'use client';

import { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DiscordSignal {
    ticker: string;
    totalWeightDelta: number;
    fundCount: number;
    funds: { fund: string; weightDelta: number }[];
}

interface SectorFlow {
    sector: string;
    weightDelta: number;
}

interface DiscordWebhookProps {
    buyingSignals: DiscordSignal[];
    sellingSignals: DiscordSignal[];
    sectorFlow: SectorFlow[];
    asOfDate: string;
}

type Status = 'idle' | 'sending' | 'sent' | 'error';

function buildEmbed(props: DiscordWebhookProps) {
    const { buyingSignals, sellingSignals, sectorFlow, asOfDate } = props;

    const formatSignals = (signals: DiscordSignal[]) =>
        signals
            .slice(0, 5)
            .map(s => {
                const funds = s.funds.map(f => f.fund).join(', ');
                const delta = s.totalWeightDelta > 0 ? `+${s.totalWeightDelta.toFixed(2)}%` : `${s.totalWeightDelta.toFixed(2)}%`;
                const multi = s.fundCount > 1 ? ` (${s.fundCount} funds)` : '';
                return `**${s.ticker}** ${delta}${multi} — ${funds}`;
            })
            .join('\n') || '_No significant signals_';

    const formatSectors = (flows: SectorFlow[]) => {
        const inflows = flows.filter(f => f.weightDelta > 0).slice(0, 3);
        const outflows = flows.filter(f => f.weightDelta < 0).slice(0, 3);
        const parts: string[] = [];
        if (inflows.length) parts.push('▲ ' + inflows.map(f => `${f.sector} +${f.weightDelta.toFixed(2)}%`).join(' | '));
        if (outflows.length) parts.push('▼ ' + outflows.map(f => `${f.sector} ${f.weightDelta.toFixed(2)}%`).join(' | '));
        return parts.join('\n') || '_No sector movement_';
    };

    return {
        username: 'TickerTrace',
        avatar_url: 'https://tt.mphinance.com/favicon.ico',
        embeds: [
            {
                title: '🎯 TickerTrace Daily Intel',
                url: 'https://tt.mphinance.com',
                color: 0x00d4ff, // cyan
                description: `Institutional activity as of **${asOfDate}**`,
                fields: [
                    {
                        name: '📈 Institutions Are Buying',
                        value: formatSignals(buyingSignals),
                        inline: false,
                    },
                    {
                        name: '📉 Institutions Are Selling',
                        value: formatSignals(sellingSignals),
                        inline: false,
                    },
                    {
                        name: '📊 Sector Flow',
                        value: formatSectors(sectorFlow),
                        inline: false,
                    },
                ],
                footer: {
                    text: 'TickerTrace • tt.mphinance.com • giving retail a fighting chance',
                },
                timestamp: new Date().toISOString(),
            },
        ],
    };
}

export function DiscordWebhook(props: DiscordWebhookProps) {
    const [webhookUrl, setWebhookUrl] = useState('');
    const [status, setStatus] = useState<Status>('idle');
    const [error, setError] = useState('');
    const [expanded, setExpanded] = useState(false);

    const handleSend = async () => {
        if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
            setError('Must be a Discord webhook URL (https://discord.com/api/webhooks/...)');
            setStatus('error');
            return;
        }

        setStatus('sending');
        setError('');

        try {
            const payload = buildEmbed(props);
            const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                throw new Error(`Discord returned ${res.status}: ${await res.text()}`);
            }

            setStatus('sent');
            setTimeout(() => setStatus('idle'), 5000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setStatus('error');
        }
    };

    return (
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
            {/* Toggle header */}
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#1a2333] transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-lg">💬</span>
                    <span className="text-sm font-semibold text-slate-300">Send to Discord</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-[#5865F2] border-[#5865F2]/30 bg-[#5865F2]/10">
                        Webhook
                    </Badge>
                </div>
                <span className="text-slate-500 text-xs">{expanded ? '▲' : '▼'}</span>
            </button>

            {expanded && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[#1f2937]">
                    <p className="text-xs text-slate-500">
                        Paste your Discord webhook URL to send today's institutional signals to your server.
                    </p>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={webhookUrl}
                            onChange={e => setWebhookUrl(e.target.value)}
                            placeholder="https://discord.com/api/webhooks/..."
                            className="flex-1 bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-[#5865F2]/50 transition-colors"
                        />
                        <button
                            onClick={handleSend}
                            disabled={status === 'sending' || !webhookUrl}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#5865F2] text-white text-xs font-semibold rounded-lg hover:bg-[#4752c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {status === 'sending' ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending</>
                            ) : (
                                <><Send className="h-3.5 w-3.5" /> Send</>
                            )}
                        </button>
                    </div>

                    {status === 'sent' && (
                        <p className="flex items-center gap-1.5 text-xs text-[#00ff88]">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Sent! Check your Discord channel.
                        </p>
                    )}
                    {status === 'error' && (
                        <p className="flex items-center gap-1.5 text-xs text-[#ff4444]">
                            <AlertCircle className="h-3.5 w-3.5" /> {error}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
