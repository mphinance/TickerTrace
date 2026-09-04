import type { ApiStockHistoryPoint } from '@/lib/api';

/**
 * Hand-rolled SVG area chart of a ticker's AUM-blended institutional weight
 * over time. Green if the line is net up over the window, red if net down.
 * No chart dependency — keeps the bundle lean and matches the diverging bars.
 */
export function WeightSparkline({
    points,
    height = 120,
    up: upOverride,
}: {
    points: ApiStockHistoryPoint[];
    height?: number;
    /** Force the line color (e.g. to match the monthly A/D signal). Defaults
     *  to the net direction across the whole window. */
    up?: boolean;
}) {
    if (points.length < 2) {
        return <p className="text-xs text-slate-600 py-8 text-center">Not enough history yet to chart.</p>;
    }

    const W = 800; // viewBox units; scales responsively via width:100%
    const H = height;
    const pad = 8;
    const vals = points.map(p => p.blendedWeight);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;

    const x = (i: number) => pad + (i / (points.length - 1)) * (W - 2 * pad);
    const y = (v: number) => H - pad - ((v - min) / span) * (H - 2 * pad);

    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.blendedWeight).toFixed(1)}`).join(' ');
    const area = `${line} L${x(points.length - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`;

    const up = upOverride ?? vals[vals.length - 1] >= vals[0];
    const color = up ? 'var(--buy)' : 'var(--sell)';
    const gid = `spark-${up ? 'up' : 'dn'}`;

    return (
        <div>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
                <defs>
                    <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={area} fill={`url(#${gid})`} />
                <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <circle cx={x(points.length - 1)} cy={y(vals[vals.length - 1])} r="3" fill={color} />
            </svg>
            <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-1">
                <span>{points[0].date}</span>
                <span className="text-slate-500">
                    {vals[0].toFixed(3)}% → <span className={up ? 'text-buy' : 'text-sell'}>{vals[vals.length - 1].toFixed(3)}%</span>
                </span>
                <span>{points[points.length - 1].date}</span>
            </div>
        </div>
    );
}
