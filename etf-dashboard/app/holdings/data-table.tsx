"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
}

export function DataTable<TData, TValue>({
    columns,
    data,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [searchQuery, setSearchQuery] = React.useState('')

    const searchFiltered = React.useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return data
        return data.filter((row: any) => {
            const ticker = String(row['Ticker'] ?? '').toLowerCase()
            const name = String(row['Name'] ?? '').toLowerCase()
            return ticker.includes(q) || name.includes(q)
        })
    }, [data, searchQuery])

    const table = useReactTable({
        data: searchFiltered,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            sorting,
            columnFilters,
        },
        initialState: {
            pagination: {
                pageSize: 50,
            },
        },
    })

    const uniqueFunds = React.useMemo(() => {
        const funds = new Set<string>()
        data.forEach((row: any) => {
            if (row['ETF Ticker']) funds.add(row['ETF Ticker'])
        })
        return Array.from(funds).sort()
    }, [data])

    const exportCsv = () => {
        const rows = table.getFilteredRowModel().rows
        const csvContent = [
            columns.map(c => (c as any).accessorKey).join(","),
            ...rows.map(r => columns.map(c => {
                let val = r.getValue((c as any).accessorKey)
                return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val
            }).join(","))
        ].join("\n")

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `holdings_export_${new Date().toISOString().slice(0, 10)}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                        <Input
                            placeholder="Search ticker or name..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            className="max-w-sm pl-9 bg-[#0f172a] border-[#1e293b] text-slate-200 w-full sm:w-[250px]"
                        />
                    </div>

                    <Select
                        value={(table.getColumn("ETF Ticker")?.getFilterValue() as string) ?? "ALL"}
                        onValueChange={(val) => table.getColumn("ETF Ticker")?.setFilterValue(val === "ALL" ? undefined : val)}
                    >
                        <SelectTrigger className="w-full sm:w-[180px] bg-[#0f172a] border-[#1e293b] text-slate-200">
                            <SelectValue placeholder="All Funds" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0f172a] border-[#1e293b] text-slate-200">
                            <SelectItem value="ALL">All Funds</SelectItem>
                            {uniqueFunds.map(f => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={(table.getColumn("Option_Type")?.getFilterValue() as string) ?? "ALL"}
                        onValueChange={(val) => {
                            if (val === "ALL") table.getColumn("Option_Type")?.setFilterValue(undefined)
                            else if (val === "STOCK") table.getColumn("Option_Type")?.setFilterValue("") // Hacky: stocks have empty type
                            else table.getColumn("Option_Type")?.setFilterValue(val)
                        }}
                    >
                        <SelectTrigger className="w-full sm:w-[180px] bg-[#0f172a] border-[#1e293b] text-slate-200">
                            <SelectValue placeholder="Asset Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0f172a] border-[#1e293b] text-slate-200">
                            <SelectItem value="ALL">All Assets</SelectItem>
                            <SelectItem value="STOCK">Stock Only</SelectItem>
                            <SelectItem value="Call">Calls</SelectItem>
                            <SelectItem value="Put">Puts</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button variant={"outline"} onClick={exportCsv} className="bg-[#0f172a] border-[#1e293b] text-slate-300 hover:bg-[#1e293b] hover:text-white">
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
            </div>
            <div className="rounded-md border border-[#1f2937]">
                <Table>
                    <TableHeader className="bg-[#0a0f1e] border-b border-[#1f2937]">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="border-[#1f2937] hover:bg-transparent">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="text-slate-400 font-semibold h-10 uppercase text-xs">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody className="divide-y divide-[#1f2937]">
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="border-[#1f2937] hover:bg-[#1a2333] transition-colors"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-2 px-4">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                                    No results found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-between px-2 py-4">
                <div className="flex-1 text-sm text-slate-500">
                    Showing {table.getFilteredRowModel().rows.length} results
                </div>
                <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-slate-400">Rows per page</p>
                        <Select
                            value={`${table.getState().pagination.pageSize}`}
                            onValueChange={(value) => {
                                table.setPageSize(Number(value))
                            }}
                        >
                            <SelectTrigger className="h-8 w-[70px] bg-[#0f172a] border-[#1e293b] text-slate-200">
                                <SelectValue placeholder={table.getState().pagination.pageSize} />
                            </SelectTrigger>
                            <SelectContent side="top" className="bg-[#0f172a] border-[#1e293b] text-slate-200">
                                {[10, 20, 30, 40, 50, 100].map((pageSize) => (
                                    <SelectItem key={pageSize} value={`${pageSize}`}>
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex w-[100px] items-center justify-center text-sm font-medium text-slate-400">
                        Page {table.getState().pagination.pageIndex + 1} of{" "}
                        {table.getPageCount() || 1}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0 bg-[#0f172a] border-[#1e293b] text-slate-300 pointer-events-auto"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Go to first page</span>
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0 bg-[#0f172a] border-[#1e293b] text-slate-300 pointer-events-auto"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Go to previous page</span>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0 bg-[#0f172a] border-[#1e293b] text-slate-300 pointer-events-auto"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Go to next page</span>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0 bg-[#0f172a] border-[#1e293b] text-slate-300 pointer-events-auto"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Go to last page</span>
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
