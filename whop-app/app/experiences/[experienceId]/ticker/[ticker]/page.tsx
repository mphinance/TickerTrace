import Link from "next/link";
import { ArrowLeft, Layers, Users } from "lucide-react";

import { ExperienceShell } from "@/components/experience-shell";
import { WhopRequired } from "@/components/whop-required";
import { getWhopUserId } from "@/lib/whop-auth";
import {
  api,
  type ApiChangeRecord,
  type ApiTickerDetail,
  type ApiTickerHolding,
} from "@/lib/api";
import { directionTone, int, pct, pctUnsigned } from "@/lib/format";
import { getProvider } from "@/lib/providers";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Ticker cross-fund detail. Verifies the Whop JWT, then renders every
 * fund that holds this ticker (equity or option), sorted by weight, plus
 * a recent activity feed. The ticker may be valid but currently unheld
 * — in that case we render the header card with an explanatory empty
 * state instead of a 404, so the user can use the back-link.
 */
export default async function TickerDetailPage({
  params,
}: {
  params: Promise<{ experienceId: string; ticker: string }>;
}) {
  const { experienceId, ticker } = await params;
  const userId = await getWhopUserId();
  if (!userId) return <WhopRequired />;

  const symbol = ticker.toUpperCase();
  const detail = await api.ticker(symbol, { throwOnError: false });

  if (!detail || detail.holdings.length === 0) {
    return (
      <ExperienceShell experienceId={experienceId} currentTab={null}>
        <div className="space-y-6">
          <TickerHeader
            experienceId={experienceId}
            symbol={symbol}
            detail={null}
          />
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No tracked fund currently holds this ticker.
            </CardContent>
          </Card>
        </div>
      </ExperienceShell>
    );
  }

  return (
    <ExperienceShell experienceId={experienceId} currentTab={null}>
      <div className="space-y-6">
        <TickerHeader
          experienceId={experienceId}
          symbol={symbol}
          detail={detail}
        />
        <HoldingsCard
          holdings={detail.holdings}
          experienceId={experienceId}
        />
        <RecentActivityCard
          changes={detail.changes}
          experienceId={experienceId}
        />
      </div>
    </ExperienceShell>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────

function TickerHeader({
  experienceId,
  symbol,
  detail,
}: {
  experienceId: string;
  symbol: string;
  detail: ApiTickerDetail | null;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <Link
          href={`/experiences/${experienceId}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3" />
          back to dashboard
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-3xl font-semibold tracking-tight text-primary">
                {detail?.ticker ?? symbol}
              </span>
              {detail && detail.fundCount > 0 ? (
                <Badge
                  variant="outline"
                  className="border-sky-500/40 text-sky-700 dark:text-sky-300 bg-sky-500/10 text-xs"
                >
                  {detail.fundCount} fund{detail.fundCount === 1 ? "" : "s"}
                </Badge>
              ) : null}
            </div>
            {detail && (detail.name || detail.sector) ? (
              <p className="text-xs text-muted-foreground">
                {detail.name}
                {detail.name && detail.sector ? " · " : ""}
                {detail.sector}
              </p>
            ) : null}
          </div>
          {detail && detail.holdings.length > 0 ? (
            <div className="text-right shrink-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Total weight
              </p>
              <p className="mt-1 font-mono text-lg font-semibold tracking-tight">
                {pctUnsigned(detail.totalWeight)}
              </p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Funds holding this ticker ──────────────────────────────────────────────

function HoldingsCard({
  holdings,
  experienceId,
}: {
  holdings: ApiTickerHolding[];
  experienceId: string;
}) {
  const rows = [...holdings].sort((a, b) => b.weight - a.weight);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Users className="size-4 text-primary" />
        <CardTitle className="text-base">Funds holding this ticker</CardTitle>
        <span className="ml-auto text-xs text-muted-foreground">
          {rows.length} position{rows.length === 1 ? "" : "s"}
        </span>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fund</TableHead>
              <TableHead className="hidden sm:table-cell">Provider</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Weight</TableHead>
              <TableHead className="text-right">Shares</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((h, i) => {
              const fundHref = `/experiences/${experienceId}/fund/${encodeURIComponent(h.fund)}`;
              const provider = h.provider || getProvider(h.fund);
              const isOption = h.isOption;
              const typeTone = isOption
                ? "border-violet-500/40 text-violet-700 dark:text-violet-300 bg-violet-500/10"
                : "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10";
              const opt = h.optionDetails;
              const optionLabel =
                isOption && opt
                  ? `${opt.type} $${opt.strike}${opt.expiry ? ` @ ${opt.expiry}` : ""}`
                  : null;
              return (
                <TableRow key={`${h.fund}-${i}`}>
                  <TableCell>
                    <Link
                      href={fundHref}
                      className="font-mono font-medium text-primary hover:underline"
                    >
                      {h.fund}
                    </Link>
                    <div className="mt-0.5 text-[11px] text-muted-foreground sm:hidden">
                      {provider}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                    {provider}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant="outline"
                        className={`w-fit text-[10px] ${typeTone}`}
                      >
                        {isOption ? "OPTION" : "EQUITY"}
                      </Badge>
                      {optionLabel ? (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {optionLabel}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {pctUnsigned(h.weight)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {int(h.shares)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Recent activity ────────────────────────────────────────────────────────

function RecentActivityCard({
  changes,
  experienceId,
}: {
  changes: ApiChangeRecord[];
  experienceId: string;
}) {
  if (changes.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Layers className="size-4 text-primary" />
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No position changes detected in the latest window.
        </CardContent>
      </Card>
    );
  }

  const rows = changes.slice(0, 20);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Layers className="size-4 text-primary" />
        <CardTitle className="text-base">Recent activity</CardTitle>
        <span className="ml-auto text-xs text-muted-foreground">
          showing {rows.length} of {changes.length}
        </span>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border/60">
          {rows.map((row, i) => (
            <ChangeRow
              key={`${row.fund}-${row.ticker}-${i}`}
              row={row}
              experienceId={experienceId}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ChangeRow({
  row,
  experienceId,
}: {
  row: ApiChangeRecord;
  experienceId: string;
}) {
  const fundHref = `/experiences/${experienceId}/fund/${encodeURIComponent(row.fund)}`;
  const directionForTone: "buying" | "selling" =
    row.weightDelta >= 0 ? "buying" : "selling";
  const typeTone =
    row.type === "NEW"
      ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
      : row.type === "REMOVED"
        ? "border-rose-500/40 text-rose-700 dark:text-rose-300 bg-rose-500/10"
        : "border-sky-500/40 text-sky-700 dark:text-sky-300 bg-sky-500/10";

  const sharesDeltaLabel =
    row.sharesDelta === 0
      ? null
      : `${row.sharesDelta > 0 ? "+" : "-"}${int(Math.abs(row.sharesDelta))} shares`;

  return (
    <li className="px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={fundHref}
              className="font-mono font-semibold tracking-tight hover:text-primary"
            >
              {row.fund}
            </Link>
            <Badge variant="outline" className={typeTone}>
              {row.type}
            </Badge>
            {row.isOption ? (
              <Badge
                variant="outline"
                className="border-violet-500/40 text-violet-700 dark:text-violet-300 bg-violet-500/10"
              >
                OPTION
              </Badge>
            ) : null}
          </div>
          {row.isOption && row.optionDetails ? (
            <p className="font-mono text-[11px] text-muted-foreground">
              {row.optionDetails.type} ${row.optionDetails.strike}
              {row.optionDetails.expiry ? ` @ ${row.optionDetails.expiry}` : ""}
            </p>
          ) : row.name ? (
            <p className="truncate text-xs text-muted-foreground">{row.name}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3 shrink-0 sm:flex-col sm:items-end sm:gap-1">
          <span
            className={`text-xs px-2 py-0.5 rounded ${directionTone(directionForTone)}`}
          >
            {pct(row.weightDelta)}
          </span>
          {sharesDeltaLabel ? (
            <span className="text-[11px] text-muted-foreground">
              {sharesDeltaLabel}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
