import { api, type ApiSectorEntry } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { directionTone, pct } from "@/lib/format";

/**
 * Sector flow today. Pulls /api/v1/sectors and shows two columns:
 * inflows (sorted most-positive first) and outflows (sorted most-negative
 * first). Deltas are aggregate weight moves across all tracked funds.
 */
export async function SectorsTab() {
  const flow = await api.sectors({ throwOnError: false });

  if (!flow) {
    return (
      <div className="space-y-6">
        <SectorsHeader />
        <EmptyState message="Couldn't reach the TickerTrace API for sector flow. Give it a minute and reload." />
      </div>
    );
  }

  const inflows = [...flow.inflows].sort((a, b) => b.delta - a.delta);
  const outflows = [...flow.outflows].sort((a, b) => a.delta - b.delta);

  return (
    <div className="space-y-6">
      <SectorsHeader />
      <div className="grid gap-4 lg:grid-cols-2">
        <SectorColumn
          title="Inflows"
          icon={<ArrowUpRight className="size-4 text-emerald-700 dark:text-emerald-300" />}
          rows={inflows}
          direction="buying"
          emptyMessage="No net inflows registered today."
        />
        <SectorColumn
          title="Outflows"
          icon={<ArrowDownRight className="size-4 text-rose-700 dark:text-rose-300" />}
          rows={outflows}
          direction="selling"
          emptyMessage="No net outflows registered today."
        />
      </div>
    </div>
  );
}

function SectorsHeader() {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Sector flow today
        </h2>
        <p className="text-sm text-muted-foreground">
          Aggregate weight moves across every tracked fund, bucketed by sector.
          Where capital is rotating in, and where it's leaving.
        </p>
      </div>
    </div>
  );
}

function SectorColumn({
  title,
  icon,
  rows,
  direction,
  emptyMessage,
}: {
  title: string;
  icon: React.ReactNode;
  rows: ApiSectorEntry[];
  direction: "buying" | "selling";
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        {icon}
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          rows.map((row) => (
            <SectorRow
              key={`${direction}-${row.sector}`}
              row={row}
              direction={direction}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function SectorRow({
  row,
  direction,
}: {
  row: ApiSectorEntry;
  direction: "buying" | "selling";
}) {
  const tone = directionTone(direction);
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
      <span className="text-sm truncate">{row.sector}</span>
      <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${tone}`}>
        {pct(row.delta)}
      </span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}
