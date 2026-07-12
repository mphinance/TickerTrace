'use client';

import { useMemo, useState } from 'react';
import {
    ColumnDef,
    SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    ArrowUpRight, ArrowDownRight, ArrowUpDown, ArrowUp, ArrowDown,
    Search, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, X,
} from 'lucide-react';
import Link from 'next/link';
import { FUND_PROVIDERS } from '@/lib/providers';

interface Change {
    fund: string;
    ticker: string;
    name: string;
    type: string;
    weightDelta: number;
    activeWeightDelta?: number;
    isOption: boolean;
    sector?: string;
    underlying?: string;
}

const PAGE_SIZE = 50;

export function ChangesClient({ changes, providers }: {
    changes: Change[];
    asOfDate: string;
    providers: string[];
}) {
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [selectedFund, setSelectedFund] = useState<string | null>(null);
    const [showType, setShowType] = useState<'all' | 'buys' | 'sells' | 'new' | 'exit'>('all');
    const [search, setSearch] = useState('');
    const [sorting, setSorting] = useState<SortingState>([
        // Default: largest absolute weight delta first.
        { id: 'weightDelta', desc: true },
    ]);

    // Apply the pill filters (provider / fund / type) BEFORE handing off to
    // TanStack — these are coarse audience filters, not column-level. TanStack
    // then handles per-column sort + the global text search + pagination.
    const preFiltered = useMemo(() => {
        let rows = changes;
        if (selectedProvider) {
            rows = rows.filter(c => (FUND_PROVIDERS[c.fund] ?? c.fund) === selectedProvider);
        }
        if (selectedFund) {
            rows = rows.filter(c => c.fund === selectedFund);
        }
        if (showType === 'buys') rows = rows.filter(c => (c.activeWeightDelta ?? c.weightDelta) > 0 && c.type !== 'NEW');
        else if (showType === 'sells') rows = rows.filter(c => (c.activeWeightDelta ?? c.weightDelta) < 0 && c.type !== 'REMOVED');
        else if (showType === 'new') rows = rows.filter(c => c.type === 'NEW');
        else if (showType === 'exit') rows = rows.filter(c => c.type === 'REMOVED');
        return rows;
    }, [changes, selectedProvider, selectedFund, showType]);

    const columns = useMemo<ColumnDef<Change>[]>(() => [
        {
            accessorKey: 'ticker',
            header: 'Ticker',
            cell: ({ row }) => {
                const { ticker, isOption, underlying } = row.original;
                const href = isOption
                    ? (underlying ? `/stocks/${underlying}` : null)
                    : `/stocks/${ticker}`;
                return (
                    <div className="flex items-center gap-1.5">
                        {href ? (
                            <Link href={href} className="font-mono font-bold text-[#00d4ff] hover:underline">
                                {ticker}
                            </Link>
                        ) : (
                            <span className="font-mono font-bold text-slate-400">{ticker}</span>
                        )}
                        {isOption && <span className="text-[10px] text-slate-500" title="Option contract">⚡</span>}
                    </div>
                );
            },
        },
        {
            accessorKey: 'name',
            header: 'Name',
            cell: ({ row }) => (
                <div className="max-w-[240px]">
                    <span className="text-slate-400 text-xs block truncate">{row.original.name}</span>
                    {row.original.sector && !row.original.isOption && (
                        <span className="inline-block mt-0.5 text-[9px] font-medium px-1.5 py-0 rounded border border-[#334155] bg-[#1e293b] text-slate-500 leading-4">
                            {row.original.sector}
                        </span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'fund',
            header: 'Fund',
            cell: ({ row }) => (
                <Link href={`/fund/${row.original.fund}`} title={`Open ${row.original.fund} profile`}>
                    <Badge variant="outline" className="font-mono text-[10px] cursor-pointer hover:opacity-80">
                        {row.original.fund}
                    </Badge>
                </Link>
            ),
        },
        {
            id: 'type',
            // Sort by the user-visible bucket (NEW / EXIT / ADD / TRIM).
            // Direction keyed off activeWeightDelta (price-drift removed) so a
            // position that only grew because the stock rallied isn't called an ADD.
            accessorFn: row => {
                const dir = row.activeWeightDelta ?? row.weightDelta;
                return row.type === 'NEW' ? 'NEW'
                    : row.type === 'REMOVED' ? 'EXIT'
                        : dir > 0 ? 'ADD' : 'TRIM';
            },
            header: () => <div className="text-center">Type</div>,
            cell: ({ row }) => {
                const c = row.original;
                const dir = c.activeWeightDelta ?? c.weightDelta;
                return (
                    <div className="text-center">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${c.type === 'NEW' ? 'text-[#00d4ff] border-[#00d4ff]/30'
                            : c.type === 'REMOVED' ? 'text-[#f59e0b] border-[#f59e0b]/30'
                                : dir > 0 ? 'text-[#00ff88] border-[#00ff88]/30'
                                    : 'text-[#ff4444] border-[#ff4444]/30'
                            }`}>
                            {c.type === 'NEW' ? '★ NEW' : c.type === 'REMOVED' ? '✕ EXIT' : dir > 0 ? 'ADD' : 'TRIM'}
                        </Badge>
                    </div>
                );
            },
        },
        {
            id: 'weightDelta',
            // Use active weight delta (price-drift removed) for both the
            // displayed value and sort magnitude.
            accessorFn: row => row.activeWeightDelta ?? row.weightDelta,
            sortingFn: (a, b) =>
                Math.abs(a.original.activeWeightDelta ?? a.original.weightDelta)
                - Math.abs(b.original.activeWeightDelta ?? b.original.weightDelta),
            header: () => <div className="text-right">Δ Weight</div>,
            cell: ({ getValue }) => {
                const v = getValue<number>();
                return (
                    <div className={`text-right font-mono text-sm font-semibold ${v > 0 ? 'text-[#00ff88]' : v < 0 ? 'text-[#ff4444]' : 'text-slate-400'}`}>
                        <span className="flex items-center justify-end gap-0.5">
                            {v > 0 ? <ArrowUpRight className="h-3 w-3" /> : v < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                            {v > 0 ? '+' : ''}{v.toFixed(3)}%
                        </span>
                    </div>
                );
            },
        },
    ], []);

    const table = useReactTable({
        data: preFiltered,
        columns,
        state: { sorting, globalFilter: search },
        onSortingChange: setSorting,
        onGlobalFilterChange: setSearch,
        // Global filter matches against ticker, name, or fund.
        globalFilterFn: (row, _id, value) => {
            const q = String(value).toUpperCase();
            return (
                row.original.ticker.toUpperCase().includes(q)
                || row.original.name.toUpperCase().includes(q)
                || row.original.fund.toUpperCase().includes(q)
            );
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: PAGE_SIZE } },
    });

    // Stats reflect the post-pill view (before TanStack sort/search) so
    // the chip counts match what's actually flowing into the table.
    const buys = preFiltered.filter(c => (c.activeWeightDelta ?? c.weightDelta) > 0).length;
    const sells = preFiltered.filter(c => (c.activeWeightDelta ?? c.weightDelta) < 0).length;
    const newPos = preFiltered.filter(c => c.type === 'NEW').length;
    const exits = preFiltered.filter(c => c.type === 'REMOVED').length;

    const fundsForProvider = useMemo(() => {
        const source = selectedProvider
            ? changes.filter(c => (FUND_PROVIDERS[c.fund] ?? c.fund) === selectedProvider)
            : changes;
        return [...new Set(source.map(c => c.fund))].sort();
    }, [changes, selectedProvider]);

    const totalRows = table.getFilteredRowModel().rows.length;
    const pageStart = table.getState().pagination.pageIndex * PAGE_SIZE + 1;
    const pageEnd = Math.min(pageStart + PAGE_SIZE - 1, totalRows);

    return (
        <div className="space-y-4">
            {/* Stats chips */}
            <div className="flex flex-wrap gap-3 text-xs">
                <span className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-1.5 text-slate-400">
                    {preFiltered.length} changes
                </span>
                <span className="bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-lg px-3 py-1.5 text-[#00ff88]">↑ {buys} buys</span>
                <span className="bg-[#ff4444]/10 border border-[#ff4444]/20 rounded-lg px-3 py-1.5 text-[#ff4444]">↓ {sells} sells</span>
                {newPos > 0 && <span className="bg-[#00d4ff]/10 border border-[#00d4ff]/20 rounded-lg px-3 py-1.5 text-[#00d4ff]">★ {newPos} new</span>}
                {exits > 0 && <span className="bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg px-3 py-1.5 text-[#f59e0b]">✕ {exits} exits</span>}
            </div>

            {/* Provider filter pills */}
            <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                    <button
                        onClick={() => { setSelectedProvider(null); setSelectedFund(null); }}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${!selectedProvider
                            ? 'bg-[#00d4ff]/20 border-[#00d4ff]/40 text-[#00d4ff]'
                            : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'}`}
                    >All Providers</button>
                    {providers.map(p => {
                        const count = changes.filter(c => (FUND_PROVIDERS[c.fund] ?? c.fund) === p).length;
                        if (count === 0) return null;
                        return (
                            <button
                                key={p}
                                onClick={() => { setSelectedProvider(selectedProvider === p ? null : p); setSelectedFund(null); }}
                                className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${selectedProvider === p
                                    ? 'bg-[#00d4ff]/20 border-[#00d4ff]/40 text-[#00d4ff]'
                                    : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'}`}
                            >{p} ({count})</button>
                        );
                    })}
                </div>

                {/* Fund sub-filter — only when a provider is selected and has >1 fund */}
                {selectedProvider && fundsForProvider.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 pl-4">
                        <button
                            onClick={() => setSelectedFund(null)}
                            className={`text-[10px] font-mono px-2.5 py-1 rounded-md border transition-colors ${!selectedFund
                                ? 'bg-[#a78bfa]/20 border-[#a78bfa]/40 text-[#a78bfa]'
                                : 'bg-[#1e293b] border-[#334155] text-slate-500 hover:text-white'}`}
                        >All Funds</button>
                        {fundsForProvider.map(f => (
                            <button
                                key={f}
                                onClick={() => setSelectedFund(selectedFund === f ? null : f)}
                                className={`text-[10px] font-mono px-2.5 py-1 rounded-md border transition-colors ${selectedFund === f
                                    ? 'bg-[#a78bfa]/20 border-[#a78bfa]/40 text-[#a78bfa]'
                                    : 'bg-[#1e293b] border-[#334155] text-slate-500 hover:text-white'}`}
                            >{f}</button>
                        ))}
                    </div>
                )}
            </div>

            {/* Type filter + global text search */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                <div className="flex gap-1.5 flex-wrap">
                    {(['all', 'buys', 'sells', 'new', 'exit'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setShowType(t)}
                            className={`text-[10px] font-semibold px-3 py-1.5 rounded-md border transition-colors uppercase tracking-wider ${showType === t
                                ? 'bg-[#00d4ff]/10 border-[#00d4ff]/30 text-[#00d4ff]'
                                : 'bg-[#0f172a] border-[#1e293b] text-slate-500 hover:text-white'}`}
                        >{t}</button>
                    ))}
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search ticker, name, or fund…"
                        className="w-full bg-[#0f172a] border border-[#1e293b] rounded-md pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#00d4ff]/40"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            aria-label="Clear search"
                        ><X className="h-3 w-3" /></button>
                    )}
                </div>
            </div>

            {/* Sortable table */}
            <div className="rounded-lg border border-[#1f2937] overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-[#0f172a]">
                            {table.getHeaderGroups().map(hg => (
                                <TableRow key={hg.id} className="border-b border-[#1f2937] hover:bg-transparent">
                                    {hg.headers.map(h => {
                                        const sorted = h.column.getIsSorted();
                                        const canSort = h.column.getCanSort();
                                        return (
                                            <TableHead
                                                key={h.id}
                                                onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                                                className={`text-slate-400 text-xs uppercase font-semibold tracking-wider ${canSort ? 'cursor-pointer select-none hover:text-white' : ''}`}
                                            >
                                                <span className="inline-flex items-center gap-1">
                                                    {flexRender(h.column.columnDef.header, h.getContext())}
                                                    {canSort && (
                                                        sorted === 'asc' ? <ArrowUp className="h-3 w-3" />
                                                            : sorted === 'desc' ? <ArrowDown className="h-3 w-3" />
                                                                : <ArrowUpDown className="h-3 w-3 opacity-40" />
                                                    )}
                                                </span>
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="text-center py-12 text-slate-500">
                                        <p className="text-sm font-medium">No changes match your filters</p>
                                        <p className="text-xs mt-1 text-slate-600">Try clearing the search or picking a different provider.</p>
                                    </TableCell>
                                </TableRow>
                            ) : table.getRowModel().rows.map(row => (
                                <TableRow key={row.id} className="border-b border-[#1f2937] hover:bg-[#1a2333]/50">
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id} className="py-2.5">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination */}
            {totalRows > PAGE_SIZE && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500">
                        Showing {totalRows === 0 ? 0 : pageStart}–{pageEnd} of {totalRows.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                            className="p-1.5 rounded border border-[#1f2937] bg-[#0f172a] text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:text-white"
                            aria-label="First page"
                        ><ChevronsLeft className="h-3.5 w-3.5" /></button>
                        <button
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="p-1.5 rounded border border-[#1f2937] bg-[#0f172a] text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:text-white"
                            aria-label="Previous page"
                        ><ChevronLeft className="h-3.5 w-3.5" /></button>
                        <span className="px-2 text-slate-400 font-mono">
                            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
                        </span>
                        <button
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="p-1.5 rounded border border-[#1f2937] bg-[#0f172a] text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:text-white"
                            aria-label="Next page"
                        ><ChevronRight className="h-3.5 w-3.5" /></button>
                        <button
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                            className="p-1.5 rounded border border-[#1f2937] bg-[#0f172a] text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:text-white"
                            aria-label="Last page"
                        ><ChevronsRight className="h-3.5 w-3.5" /></button>
                    </div>
                </div>
            )}
        </div>
    );
}
