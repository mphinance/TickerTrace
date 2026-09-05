'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';

export function TickerSearchForm() {
    const [query, setQuery] = useState('');

    return (
        <form action="/dashboard" method="GET" className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
                type="text"
                name="q"
                value={query}
                onChange={e => setQuery(e.target.value.toUpperCase())}
                placeholder="Ticker — e.g. TSLA, NVDA"
                // text-base (16px) on mobile — anything smaller makes iOS
                // Safari auto-zoom the page on focus and it never zooms back
                // out. sm:text-sm keeps the tighter desktop look.
                className="w-full bg-surface-alt border border-rule rounded-lg pl-10 pr-16 py-2.5 text-base sm:text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-equity/50 focus:ring-1 focus:ring-equity/20 transition-colors"
            />
            {query ? (
                <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            ) : (
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-600 bg-surface-elevated border border-rule-strong rounded px-1.5 py-0.5 font-mono">
                    /
                </kbd>
            )}
        </form>
    );
}
