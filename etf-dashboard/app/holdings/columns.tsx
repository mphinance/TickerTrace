"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Holding } from "@/lib/holdings"
import { Badge } from "@/components/ui/badge"

export const columns: ColumnDef<Holding>[] = [
    {
        accessorKey: "ETF Ticker",
        header: "Fund",
        cell: ({ row }) => {
            const fund = row.getValue("ETF Ticker") as string
            // Consistent color hash from page.tsx
            const colors = ['bg-blue-500/20 text-blue-400 border-blue-500/30', 'bg-purple-500/20 text-purple-400 border-purple-500/30', 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', 'bg-amber-500/20 text-amber-400 border-amber-500/30', 'bg-rose-500/20 text-rose-400 border-rose-500/30'];
            let hash = 0;
            for (let i = 0; i < fund.length; i++) hash = fund.charCodeAt(i) + ((hash << 5) - hash);
            const color = colors[Math.abs(hash) % colors.length];

            return <Badge variant="outline" className={`font-mono border ${color}`}>{fund}</Badge>
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: "Ticker",
        header: "Ticker",
        cell: ({ row }) => <div className="font-mono font-medium text-slate-200">{row.getValue("Ticker")}</div>,
    },
    {
        accessorKey: "Name",
        header: "Name",
        cell: ({ row }) => {
            return (
                <div className="max-w-[250px] truncate text-slate-400" title={row.getValue("Name")}>
                    {row.getValue("Name")}
                </div>
            )
        },
    },
    {
        accessorKey: "Option_Type",
        header: () => <div className="text-center">Type</div>,
        cell: ({ row }) => {
            const type = row.getValue("Option_Type") as string | undefined
            if (!type) {
                return <div className="flex justify-center"><Badge variant="outline" className="text-slate-500 border-slate-700 bg-slate-800/50">STOCK</Badge></div>
            }
            return (
                <div className="flex justify-center">
                    {type.toLowerCase().startsWith('c') ? (
                        <Badge variant="outline" className="text-[#00ff88] border-[#00ff88]/30 bg-[#00ff88]/10">CALL</Badge>
                    ) : (
                        <Badge variant="outline" className="text-[#ff4444] border-[#ff4444]/30 bg-[#ff4444]/10">PUT</Badge>
                    )}
                </div>
            )
        },
    },
    {
        accessorKey: "Share Quantity",
        header: () => <div className="text-right">Shares</div>,
        cell: ({ row }) => {
            const shares = parseFloat(row.getValue("Share Quantity") as string)
            return (
                <div className={`text-right font-mono ${shares < 0 ? "text-[#ff4444]" : "text-slate-300"}`}>
                    {shares.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
            )
        },
    },
    {
        accessorKey: "Weight",
        header: () => <div className="text-right">Weight</div>,
        cell: ({ row }) => {
            const weight = parseFloat(row.getValue("Weight") as string) || 0
            return <div className="text-right font-mono text-slate-300">{weight.toFixed(3)}%</div>
        },
    },
    {
        accessorKey: "Market Value",
        header: () => <div className="text-right">Market Value</div>,
        cell: ({ row }) => {
            const mv = parseFloat(row.getValue("Market Value") as string) || 0
            return <div className="text-right font-mono text-slate-300">${mv.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        },
    },
    {
        accessorKey: "Option_Strike",
        header: () => <div className="text-right">Strike</div>,
        cell: ({ row }) => {
            const strike = row.getValue("Option_Strike") as number | undefined
            return <div className="text-right font-mono text-slate-400">{strike ? strike.toFixed(2) : "-"}</div>
        },
    },
    {
        accessorKey: "Option_Expiry",
        header: () => <div className="text-center">Expiry</div>,
        cell: ({ row }) => {
            const expiry = row.getValue("Option_Expiry") as string | undefined
            return <div className="text-center font-mono text-slate-400">{expiry || "-"}</div>
        },
    },
    {
        accessorKey: "DTE",
        header: () => <div className="text-right">DTE</div>,
        cell: ({ row }) => {
            const dte = row.getValue("DTE") as number | undefined
            if (dte === undefined || dte === null) return <div className="text-right font-mono text-slate-500">-</div>

            let colorClass = "text-slate-400"
            if (dte < 7) colorClass = "text-[#ff4444] font-bold"
            else if (dte < 14) colorClass = "text-amber-400 font-bold"

            return <div className={`text-right font-mono ${colorClass}`}>{dte}</div>
        },
    },
]
