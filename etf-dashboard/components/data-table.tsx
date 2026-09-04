"use client"

import * as React from "react"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"

/**
 * The one table primitive for TickerTrace (redesign Phase 2 — see
 * docs/REDESIGN-PLAN.md). Generalises the two mobile-priority conventions
 * that were already proven independently: `ColumnDef.meta.cellClass` in
 * app/holdings/columns.tsx (TanStack) and the hand-written
 * `hidden sm:/md:/lg:table-cell` classes in components/options-table.tsx.
 * Both collapse to the same `mobilePriority` breakpoint prop here.
 *
 * Built on the shadcn `ui/table.tsx` primitives. Not a TanStack replacement —
 * `/holdings` stays on TanStack per the redesign plan (reference implementation,
 * migrating it is optional and lowest value).
 *
 * Shape note: most consumers are Next.js Server Components (async page
 * components that `await api.x()`), and a Server Component cannot pass a
 * function prop across the boundary into this Client Component — only
 * serializable values and already-rendered ReactNode survive that crossing.
 * So columns/rows here carry pre-rendered `ReactNode` cells rather than
 * `(row) => ReactNode` cell functions; the caller renders each cell once,
 * server-side or client-side, and hands the result to this table. Sorting
 * still runs entirely client-side, off plain `sortValues`.
 */

/** Visible at this breakpoint and up. "always" = visible at 375px too. */
export type MobilePriority = "always" | "sm" | "md" | "lg" | "xl"

const MOBILE_CLASS: Record<MobilePriority, string> = {
  always: "",
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
}

export type DataTableColumn = {
  /** Stable id — used as the sort key and the lookup key into each row's `cells`/`sortValues`. */
  key: string
  header: React.ReactNode
  align?: "left" | "center" | "right"
  /** Breakpoint at which this column appears. Omit for "always" (visible at 375px). */
  mobilePriority?: MobilePriority
  /** Set to make the column sortable — rows must then carry a `sortValues[key]`. */
  sortable?: boolean
  headerClassName?: string
}

export type DataTableRow = {
  key: string | number
  /** Pre-rendered content per column key. */
  cells: Record<string, React.ReactNode>
  /** Comparable value per column key, required for any column with `sortable`. */
  sortValues?: Record<string, number | string>
  /** Per-column cell className overrides, e.g. a score-driven background tint. */
  cellClassName?: Record<string, string | undefined>
  /** Row-level className, e.g. a directional left border. */
  className?: string
}

export interface DataTableProps {
  columns: DataTableColumn[]
  rows: DataTableRow[]
  /** Renders a skeleton with this many rows instead of `rows`. */
  loading?: boolean
  skeletonRows?: number
  emptyMessage?: React.ReactNode
  defaultSort?: { key: string; direction: "asc" | "desc" }
  className?: string
  /** Wrapper className — the table itself always scrolls via overflow-x-auto. */
  wrapperClassName?: string
}

function alignClass(align?: "left" | "center" | "right") {
  return align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
}

export function DataTable({
  columns,
  rows,
  loading = false,
  skeletonRows = 6,
  emptyMessage = "No data.",
  defaultSort,
  className,
  wrapperClassName,
}: DataTableProps) {
  const [sort, setSort] = React.useState<{ key: string; direction: "asc" | "desc" } | null>(
    defaultSort ?? null
  )

  const sorted = React.useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortable) return rows
    const dir = sort.direction === "asc" ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = a.sortValues?.[sort.key]
      const bv = b.sortValues?.[sort.key]
      if (av === undefined || bv === undefined) return 0
      if (typeof av === "string" || typeof bv === "string") {
        return String(av).localeCompare(String(bv)) * dir
      }
      return (av - bv) * dir
    })
  }, [rows, sort, columns])

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "desc" }
      if (prev.direction === "desc") return { key, direction: "asc" }
      return null
    })
  }

  return (
    <div className={cn("rounded-md border border-rule overflow-hidden", wrapperClassName)}>
      <div className="overflow-x-auto">
        <Table className={cn("text-sm", className)}>
          <TableHeader className="bg-surface-alt text-slate-400 text-xs uppercase font-semibold border-b border-rule [&_tr]:border-rule">
            <TableRow className="hover:bg-transparent border-rule">
              {columns.map((col) => {
                const sortable = !!col.sortable
                const isSorted = sort?.key === col.key ? sort.direction : null
                const icon = !sortable ? null : isSorted === "asc" ? (
                  <ArrowUp className="ml-1 h-3 w-3 text-buy" />
                ) : isSorted === "desc" ? (
                  <ArrowDown className="ml-1 h-3 w-3 text-buy" />
                ) : (
                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-30 group-hover:opacity-70 transition-opacity" />
                )
                return (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "px-4 py-3 whitespace-nowrap",
                      alignClass(col.align),
                      MOBILE_CLASS[col.mobilePriority ?? "always"],
                      col.headerClassName
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          "group inline-flex items-center w-full",
                          col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : "justify-start"
                        )}
                      >
                        {col.header}
                        {icon}
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-rule">
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className="border-rule hover:bg-transparent">
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn("px-4 py-3", MOBILE_CLASS[col.mobilePriority ?? "always"])}
                    >
                      <div className="h-4 rounded bg-surface-elevated animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : sorted.length === 0 ? (
              <TableRow className="border-rule hover:bg-transparent">
                <TableCell colSpan={columns.length} className="text-center py-12 text-slate-500 italic">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((row) => (
                <TableRow
                  key={row.key}
                  className={cn(
                    "border-rule hover:bg-surface-hover transition-colors",
                    row.className
                  )}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        "px-4 py-3 whitespace-normal",
                        alignClass(col.align),
                        MOBILE_CLASS[col.mobilePriority ?? "always"],
                        row.cellClassName?.[col.key]
                      )}
                    >
                      {row.cells[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
