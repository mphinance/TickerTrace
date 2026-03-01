'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';

interface TickerSearchProps {
    allTickers: string[];
    onSearch: never; // We use URL params for SSR search
}

export function TickerSearchForm() {
    const [query, setQuery] = useState('');

    return (
        <form action="/" method="GET" className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
                type="text"
                name="q"
                value={query}
                onChange={e => setQuery(e.target.value.toUpperCase())}
                placeholder="Search any ticker... (e.g. TSLA, NVDA, COIN)"
                className="w-full bg-[#0f172a] border border-[#1f2937] rounded-lg pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-[#00d4ff]/50 focus:ring-1 focus:ring-[#00d4ff]/20 transition-colors"
            />
            {query && (
                <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </form>
    );
}
