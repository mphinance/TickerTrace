import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight, Building2 } from 'lucide-react';
import type { ApiChangeRecord, ApiOptionSignal } from '@/lib/api';
import { PROVIDER_ORDER, getProvider, getETFColor } from '@/lib/providers';

/**
 * Today's raw options activity, grouped by fund provider. Originally lived
 * only on the dashboard, buried inside `ActivityViewer`'s Options tab and
 * co-mingled with equity accumulate/reduce data. Extracted so /income can
 * surface it directly for the audience that actually cares about it —
 * without duplicating the table markup. Renders directly from `ApiChangeRecord`
 * (the FastAPI shape); no client state, so this stays a server component.
 *
 * Mobile: wrapped in overflow-x-auto. Ticker, Strategy and Weight Δ hold at
 * 375px; Fund and Signal return at sm, Expiry @ Strike at md, View at lg.
 * rather than any fixed-width control row (see commit d5e66d3 — a fixed-width
 * row was a P0 mobile bug here).
 */

// Inline a small option-signal decoder (was decodeOptionSignal in holdings.ts,
// then inlined into the dashboard page — now shared here since both pages
// that render options activity need the same directional read).
function decodeOptionSignal(r: ApiChangeRecord): ApiOptionSignal | null {
  if (!r.isOption || !r.optionDetails) return null;
  const type = r.optionDetails.type.toLowerCase();
  const strike = r.optionDetails.strike;
  const moneyness = r.currentWeight > 0 ? 'OTM (likely)' : 'ATM/ITM';
  if (type.startsWith('p')) {
    return { strategy: 'Cash-Secured Put', directionalView: `Bullish above $${strike}`, moneyness };
  }
  if (type.startsWith('c')) {
    return { strategy: 'Covered Call', directionalView: `Capping upside at $${strike}`, moneyness };
  }
  return null;
}

export function groupByProvider(records: ApiChangeRecord[]): { provider: string; records: ApiChangeRecord[] }[] {
  const map = new Map<string, ApiChangeRecord[]>();
  records.forEach(r => {
    const prov = getProvider(r.fund);
    if (!map.has(prov)) map.set(prov, []);
    map.get(prov)!.push(r);
  });
  const ordered: { provider: string; records: ApiChangeRecord[] }[] = [];
  PROVIDER_ORDER.forEach(p => { if (map.has(p)) ordered.push({ provider: p, records: map.get(p)! }); });
  map.forEach((recs, p) => { if (!PROVIDER_ORDER.includes(p)) ordered.push({ provider: p, records: recs }); });
  return ordered;
}

export function OptionsTable({ records }: { records: ApiChangeRecord[] }) {
  if (records.length === 0) return <div className="text-slate-500 py-8 text-center italic">No options activity.</div>;
  const sorted = [...records].sort((a, b) => {
    const aP = a.optionDetails?.type.toLowerCase().startsWith('p');
    const bP = b.optionDetails?.type.toLowerCase().startsWith('p');
    if (aP && !bP) return -1; if (!aP && bP) return 1;
    return Math.abs(b.weightDelta) - Math.abs(a.weightDelta);
  });
  const groups = groupByProvider(sorted);

  return (
    <div className="space-y-6">
      {groups.map(({ provider, records: pr }) => (
        <div key={provider}>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{provider}</span>
            <span className="text-xs text-slate-600 font-mono">({pr.length})</span>
            <div className="flex-1 border-t border-[#1f2937] ml-2" />
          </div>
          <div className="rounded-md border border-[#1f2937] overflow-hidden mb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#0f172a] text-slate-400 text-xs uppercase font-semibold border-b border-[#1f2937]">
                  <tr>
                    <th className="px-4 py-3 hidden sm:table-cell">Fund</th>
                    <th className="px-4 py-3">Ticker</th>
                    <th className="px-4 py-3 text-center">Strategy</th>
                    <th className="px-4 py-3 hidden md:table-cell">Expiry @ Strike</th>
                    <th className="px-4 py-3 hidden lg:table-cell">View</th>
                    <th className="px-4 py-3 hidden sm:table-cell text-center">Signal</th>
                    <th className="px-4 py-3 text-right">Weight Δ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2937]">
                  {pr.map((r, i) => {
                    const isCall = r.optionDetails?.type.toLowerCase().startsWith('c');
                    const isPut = r.optionDetails?.type.toLowerCase().startsWith('p');
                    const decoded = decodeOptionSignal(r);
                    return (
                      <tr key={i} className={`hover:bg-[#1a2333] transition-colors bg-[#0d1525] ${isCall ? 'border-l-2 border-l-[#00ff88]/60' : isPut ? 'border-l-2 border-l-[#f59e0b]/60' : ''}`}>
                        <td className="px-4 py-3 hidden sm:table-cell"><Badge variant="outline" className={`font-mono border ${getETFColor(r.fund)}`}>{r.fund}</Badge></td>
                        <td className="px-4 py-3 font-mono font-medium">
                          {r.optionDetails?.underlying ? (
                            <Link href={`/stocks/${r.optionDetails.underlying}`} className="text-[#00d4ff] hover:underline" title={`See ${r.optionDetails.underlying} institutional detail`}>
                              {r.ticker}
                            </Link>
                          ) : (
                            <span className="text-slate-400">{r.ticker}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isCall
                            ? <Badge variant="outline" className="text-[#00ff88] border-[#00ff88]/40 bg-[#00ff88]/10 font-semibold px-2">🛡️ CC</Badge>
                            : <Badge variant="outline" className="text-[#f59e0b] border-[#f59e0b]/40 bg-[#f59e0b]/10 font-semibold px-2">💰 CSP</Badge>}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell font-mono text-xs">
                          {r.optionDetails ? <span className="whitespace-nowrap"><span className="text-slate-300">{r.optionDetails.expiry}</span><span className="text-slate-600 mx-1">@</span><span className="text-slate-300">${r.optionDetails.strike}</span></span> : '-'}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs">
                          {decoded ? <span className={isPut ? 'text-[#00ff88]' : 'text-[#f59e0b]'}>{decoded.directionalView}</span> : '-'}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-center">
                          {r.type === 'NEW' ? <Badge variant="outline" className="text-[#00ff88] border-[#00ff88]/40 bg-[#00ff88]/10 text-[10px]">OPENED</Badge>
                            : r.type === 'REMOVED' ? <Badge variant="outline" className="text-[#ff4444] border-[#ff4444]/40 bg-[#ff4444]/10 text-[10px]">EXPIRED</Badge>
                              : <Badge variant="outline" className="text-[#00d4ff] border-[#00d4ff]/40 bg-[#00d4ff]/10 text-[10px]">ROLLED</Badge>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <span className={`flex items-center justify-end gap-1 ${r.weightDelta > 0 ? 'text-[#00ff88]' : r.weightDelta < 0 ? 'text-[#ff4444]' : 'text-slate-400'}`}>
                            {r.weightDelta > 0 ? <ArrowUpRight className="h-3 w-3" /> : r.weightDelta < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                            {r.weightDelta > 0 ? '+' : ''}{r.weightDelta.toFixed(3)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
