import type { ApiInstitutionalTrend, ApiTrendEntry, TrendSignal } from '@/lib/api';
import { Activity } from 'lucide-react';
import Link from 'next/link';

const SIGNAL_META: Record<TrendSignal, { label: string; cls: string }> = {
    'accumulating': { label: 'Accumulating', cls: 'text-[#00ff88] border-[#00ff88]/30 bg-[#00ff88]/10' },
    'distribution-starting': { label: 'Selling starting', cls: 'text-[#f59e0b] border-[#f59e0b]/30 bg-[#f59e0b]/10' },
    'distributing': { label: 'Distributing', cls: 'text-[#ff4444] border-[#ff4444]/30 bg-[#ff4444]/10' },
    'bottoming': { label: 'Bottoming?', cls: 'text-[#00d4ff] border-[#00d4ff]/30 bg-[#00d4ff]/10' },
};

/** One diverging bar: extends right (green/buying) or left (red/selling) from
 *  a shared center line, width scaled to the panel-wide max. */
function Bar({ value, max, opacity }: { value: number; max: number; opacity: number }) {
    const frac = max > 0 ? Math.min(Math.abs(value) / max, 1) * 50 : 0;
    const pos = value >= 0;
    return (
        <div className="relative h-1.5 bg-[#0f172a] rounded-sm overflow-hidden">
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#334155]" />
            <div
                className="absolute top-0 bottom-0 rounded-sm"
                style={{
                    background: pos ? '#00ff88' : '#ff4444',
                    opacity,
                    width: `${frac}%`,
                    left: pos ? '50%' : `${50 - frac}%`,
                }}
            />
        </div>
    );
}

function Row({ t, max }: { t: ApiTrendEntry; max: number }) {
    const sig = SIGNAL_META[t.signal];
    const horizons: [string, number, number][] = [
        ['M', t.monthly, 0.32],
        ['W', t.weekly, 0.6],
        ['D', t.daily, 1],
    ];
    return (
        <div className="py-3 border-b border-[#1f2937] last:border-0 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-x-4 gap-y-2 items-center">
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <Link href={`/dashboard?q=${t.ticker}`} className="font-mono font-bold text-sm text-[#00d4ff] hover:underline">
                        {t.ticker}
                    </Link>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${sig.cls}`}>{sig.label}</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">{t.name} · {t.fundCount} funds</p>
            </div>
            <div className="space-y-1">
                {horizons.map(([lbl, val, op]) => (
                    <div key={lbl} className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-slate-500 w-3 shrink-0">{lbl}</span>
                        <div className="flex-1"><Bar value={val} max={max} opacity={op} /></div>
                        <span className={`text-[10px] font-mono w-16 text-right shrink-0 ${val > 0 ? 'text-[#00ff88]' : val < 0 ? 'text-[#ff4444]' : 'text-slate-600'}`}>
                            {val > 0 ? '+' : ''}{val.toFixed(3)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Accumulation / distribution trend overlay. For each ticker, the institutional
 * blended-weight change over the Month (faint), Week, and Day (bright) is laid
 * on a shared diverging axis — buying extends right (green), selling left (red).
 * Three green bars marching right = sustained accumulation; a bright red Day bar
 * under faint green M/W = distribution just starting.
 */
export function InstitutionalTrend({ trend }: { trend: ApiInstitutionalTrend }) {
    const tickers = trend.tickers;
    if (!tickers.length) return null;
    const max = Math.max(
        0.0001,
        ...tickers.flatMap(t => [Math.abs(t.daily), Math.abs(t.weekly), Math.abs(t.monthly)]),
    );

    return (
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1f2937]">
                <div className="flex items-center gap-2 flex-wrap">
                    <Activity className="h-4 w-4 text-[#00d4ff]" />
                    <h2 className="text-sm font-black tracking-tight">
                        Accumulation / distribution <span className="text-[#00d4ff]">trend</span>
                    </h2>
                    <span className="ml-auto flex items-center gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-[#00ff88]" /> buying</span>
                        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-[#ff4444]" /> selling</span>
                        <span className="text-slate-600">M·W·D = month · week · day</span>
                    </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                    Each name&apos;s institutional blended-weight change across three horizons, overlaid.
                    Three bars pushing the same way = a real trend; a bright Day bar flipping against
                    faint Month/Week = the move turning.
                </p>
            </div>
            <div className="px-4 py-1">
                {tickers.map(t => <Row key={t.ticker} t={t} max={max} />)}
            </div>
        </div>
    );
}
