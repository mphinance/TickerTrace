'use client';

import { useState } from 'react';
import type { ChangelogEntryData, ChangelogTag } from '@/lib/changelog';

/**
 * Renders the "Patch Notes from the Trenches" list on the landing page.
 *
 * Used to be 165 <ChangelogEntry /> elements typed directly into
 * app/page.tsx — 70,000+ px of a phone screen's height before anyone
 * reached the fold below it (see docs/REDESIGN-PLAN.md's mobile pass).
 * The full history is still here and still grows by one entry per shipped
 * change (see CLAUDE.md), it just loads collapsed to the most recent few.
 */
export function ChangelogList({ entries }: { entries: ChangelogEntryData[] }) {
  const INITIAL_COUNT = 10;
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? entries : entries.slice(0, INITIAL_COUNT);
  const remaining = entries.length - INITIAL_COUNT;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {visible.map((entry, i) => (
        <ChangelogEntry key={`${entry.date}-${i}`} {...entry} />
      ))}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full mt-2 py-3 text-sm font-semibold text-slate-400 hover:text-white bg-surface border border-rule rounded-xl hover:border-[#2a3a52] transition-colors"
        >
          {expanded ? 'Show fewer patch notes' : `Show ${remaining} more patch notes`}
        </button>
      )}
    </div>
  );
}

function ChangelogEntry({ date, tag, title, desc }: {
  date: string; tag: ChangelogTag; title: string; desc: string;
}) {
  const tagStyle = tag === 'bugfix'
    ? 'bg-sell/10 text-sell border-sell/20'
    : tag === 'housekeeping'
    ? 'bg-[#8b9cb3]/10 text-[#8b9cb3] border-[#8b9cb3]/20'
    : tag === 'polish'
    ? 'bg-equity/10 text-equity border-equity/20'
    : 'bg-buy/10 text-buy border-buy/20';
  return (
    <div className="bg-surface border border-rule rounded-xl p-5 hover:border-[#2a3a52] transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs text-slate-500 font-mono">{date}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tagStyle}`}>
          {tag}
        </span>
      </div>
      <h3 className="font-bold text-white text-sm mb-1">{title}</h3>
      <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}
