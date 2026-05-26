import Link from "next/link";
import { api, type ApiSignal } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight, Flame } from "lucide-react";
import { directionTone, pct } from "@/lib/format";
import { getProvider } from "@/lib/providers";

/**
 * Top-of-page signals view. Pulls /api/v1/signals (the full headline
 * payload) and renders the .buying and .selling lists as cross-fund
 * conviction cards.
 *
 * Each card is a deep link into the underlying ticker — clicking a
 * ticker drops you onto its cross-fund detail view, where you can see
 * exactly which funds are leaning in/out.
 */
export async function SignalsTab({ experienceId }: { experienceId: string }) {
  const payload = await api.signals({ throwOnError: false });

  if (!payload) {
    return (
      <EmptyState message="Couldn't reach the TickerTrace API. The data might be mid-refresh — give it a minute and reload." />
    );
  }

  const { buying, selling } = payload.signals;

  return (
    <div className="space-y-6">
      <SignalsHeader asOf={payload.asOfDate} />
      <div className="grid gap-4 lg:grid-cols-2">
        <SignalsColumn
          title="Buying conviction"
          icon={<ArrowUpRight className="size-4 text-emerald-300" />}
          rows={buying}
          experienceId={experienceId}
          direction="buying"
        />
        <SignalsColumn
          title="Selling conviction"
          icon={<ArrowDownRight className="size-4 text-rose-300" />}
          rows={selling}
          experienceId={experienceId}
          direction="selling"
        />
      </div>
    </div>
  );
}

function SignalsHeader({ asOf }: { asOf: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Today&apos;s signals
        </h2>
        <p className="text-sm text-muted-foreground">
          What institutions traded most aggressively, ranked by cross-fund
          conviction.
        </p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        as of {asOf}
      </span>
    </div>
  );
}

function SignalsColumn({
  title,
  icon,
  rows,
  experienceId,
  direction,
}: {
  title: string;
  icon: React.ReactNode;
  rows: ApiSignal[];
  experienceId: string;
  direction: "buying" | "selling";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        {icon}
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No conviction signals on this side today.
          </p>
        ) : (
          rows.slice(0, 10).map((s) => (
            <SignalRow
              key={s.ticker}
              signal={s}
              experienceId={experienceId}
              direction={direction}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function SignalRow({
  signal,
  experienceId,
  direction,
}: {
  signal: ApiSignal;
  experienceId: string;
  direction: "buying" | "selling";
}) {
  const href = `/experiences/${experienceId}/ticker/${encodeURIComponent(signal.ticker)}`;
  const tone = directionTone(direction);
  const providers = Array.from(
    new Set(signal.fundDetails.map((f) => getProvider(f.fund))),
  );

  return (
    <Link
      href={href}
      className="block rounded-md border border-border/60 hover:border-primary/40 hover:bg-card transition-colors px-3 py-2"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold tracking-tight">
              {signal.ticker}
            </span>
            {signal.streak && signal.streak > 1 ? (
              <Badge
                variant="outline"
                className="gap-1 border-amber-500/40 text-amber-300 bg-amber-500/10"
              >
                <Flame className="size-3" />
                {signal.streak}d
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {signal.name || signal.sector}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded ${tone}`}>
            {pct(signal.totalWeightDelta)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {signal.fundCount} fund{signal.fundCount === 1 ? "" : "s"} ·{" "}
            {providers.length} provider{providers.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </Link>
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
