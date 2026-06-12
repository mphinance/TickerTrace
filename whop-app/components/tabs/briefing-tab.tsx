import Link from "next/link";
import {
  api,
  type ApiSignal,
  type ApiBriefing,
  type ApiChangeRecord,
  type ApiOptionSignal,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownRight,
  ArrowUpRight,
  Flame,
  Sparkles,
} from "lucide-react";
import { directionTone, pct } from "@/lib/format";
import { getProvider } from "@/lib/providers";

/**
 * Daily briefing view. Pulls /api/v1/briefing and renders four sections:
 *   1. Top buys today
 *   2. Top sells today
 *   3. Multi-day streaks (pills with a flame when days >= 3)
 *   4. Notable options (subdued cards, since options aren't the same kind of
 *      directional bet as a stock add)
 *
 * Layout mirrors signals-tab: same row idiom, same link convention into
 * /experiences/[experienceId]/ticker/[ticker], same empty-state pattern.
 */
export async function BriefingTab({
  experienceId,
}: {
  experienceId: string;
}) {
  const briefing = await api.briefing({ throwOnError: false });

  if (!briefing) {
    return (
      <EmptyState message="Couldn't reach the TickerTrace API for the briefing. Try a reload in a minute." />
    );
  }

  return (
    <div className="space-y-6">
      <BriefingHeader />
      <div className="grid gap-4 lg:grid-cols-2">
        <SignalColumn
          title="Top buys today"
          icon={<ArrowUpRight className="size-4 text-emerald-700 dark:text-emerald-300" />}
          rows={briefing.topBuys}
          experienceId={experienceId}
          direction="buying"
          emptyMessage="No standout buys on the tape today."
        />
        <SignalColumn
          title="Top sells today"
          icon={<ArrowDownRight className="size-4 text-rose-700 dark:text-rose-300" />}
          rows={briefing.topSells}
          experienceId={experienceId}
          direction="selling"
          emptyMessage="No standout sells on the tape today."
        />
      </div>
      <StreaksSection
        streaks={briefing.activeStreaks}
        experienceId={experienceId}
      />
      <NotableOptionsSection
        items={briefing.notableOptions}
        experienceId={experienceId}
      />
    </div>
  );
}

function BriefingHeader() {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Today&apos;s briefing
        </h2>
        <p className="text-sm text-muted-foreground">
          The four things worth knowing before the open: who&apos;s buying,
          who&apos;s selling, what&apos;s on a streak, and what the option
          books are doing.
        </p>
      </div>
    </div>
  );
}

function SignalColumn({
  title,
  icon,
  rows,
  experienceId,
  direction,
  emptyMessage,
}: {
  title: string;
  icon: React.ReactNode;
  rows: ApiSignal[];
  experienceId: string;
  direction: "buying" | "selling";
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        {icon}
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          rows.slice(0, 5).map((s) => (
            <SignalRow
              key={`${direction}-${s.ticker}`}
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
                className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10"
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

function StreaksSection({
  streaks,
  experienceId,
}: {
  streaks: ApiBriefing["activeStreaks"];
  experienceId: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Flame className="size-4 text-amber-700 dark:text-amber-300" />
        <CardTitle className="text-base">Multi-day streaks</CardTitle>
      </CardHeader>
      <CardContent>
        {streaks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active streaks right now. Conviction shows up on day three or so.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {streaks.map((streak) => (
              <StreakPill
                key={`${streak.fund}-${streak.ticker}-${streak.direction}`}
                streak={streak}
                experienceId={experienceId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StreakPill({
  streak,
  experienceId,
}: {
  streak: ApiBriefing["activeStreaks"][number];
  experienceId: string;
}) {
  const href = `/experiences/${experienceId}/ticker/${encodeURIComponent(streak.ticker)}`;
  const tone =
    streak.direction === "up"
      ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20"
      : "border-rose-500/40 text-rose-700 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20";
  const showFlame = streak.days >= 3;

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors ${tone}`}
    >
      {showFlame ? <Flame className="size-3" /> : null}
      <span className="font-mono font-semibold">{streak.ticker}</span>
      <span className="text-muted-foreground">{streak.fund}</span>
      <span className="font-semibold">{streak.days}d</span>
    </Link>
  );
}

function NotableOptionsSection({
  items,
  experienceId,
}: {
  items: { record: ApiChangeRecord; signal: ApiOptionSignal }[];
  experienceId: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Sparkles className="size-4 text-sky-700 dark:text-sky-300" />
        <CardTitle className="text-base">Notable options</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Quiet day in the option books. Nothing worth flagging.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((item, i) => (
              <NotableOptionCard
                key={`${item.record.fund}-${item.record.ticker}-${i}`}
                item={item}
                experienceId={experienceId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NotableOptionCard({
  item,
  experienceId,
}: {
  item: { record: ApiChangeRecord; signal: ApiOptionSignal };
  experienceId: string;
}) {
  const { record, signal } = item;
  const underlying = record.optionDetails?.underlying ?? record.ticker;
  const href = `/experiences/${experienceId}/ticker/${encodeURIComponent(underlying)}`;

  return (
    <Link
      href={href}
      className="block rounded-md border border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-card transition-colors px-3 py-2"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold tracking-tight">
              {underlying}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {record.fund} ({getProvider(record.fund)})
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {signal.strategy}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge
            variant="outline"
            className="border-sky-500/40 text-sky-700 dark:text-sky-300 bg-sky-500/10"
          >
            {signal.directionalView}
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            {signal.moneyness}
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
