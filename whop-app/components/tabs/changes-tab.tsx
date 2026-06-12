import Link from "next/link";
import { api, type ApiChangeRecord, type ChangeType } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { directionTone, int, pct } from "@/lib/format";
import { PROVIDER_ORDER, getProvider } from "@/lib/providers";

/**
 * Daily / weekly / monthly position-change feed. Pulls /api/v1/changes with
 * the active filters from the URL, renders a filter bar of pill links, and a
 * list of compact change rows. The filter pills themselves are <Link>s back
 * into the same tab with merged query params, so the whole thing is
 * server-rendered with no client state.
 */
const PERIODS = ["daily", "weekly", "monthly"] as const;
type Period = (typeof PERIODS)[number];

const DIRECTIONS = ["buying", "selling"] as const;
type Direction = (typeof DIRECTIONS)[number];

const ROW_LIMIT = 50;

function sanitizePeriod(raw: string | undefined): Period {
  return (PERIODS as readonly string[]).includes(raw ?? "")
    ? (raw as Period)
    : "daily";
}

function sanitizeDirection(raw: string | undefined): Direction | undefined {
  return (DIRECTIONS as readonly string[]).includes(raw ?? "")
    ? (raw as Direction)
    : undefined;
}

function sanitizeProvider(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return PROVIDER_ORDER.includes(raw) ? raw : undefined;
}

export async function ChangesTab({
  experienceId,
  searchParams,
}: {
  experienceId: string;
  searchParams: Record<string, string | undefined>;
}) {
  const period = sanitizePeriod(searchParams.period);
  const direction = sanitizeDirection(searchParams.direction);
  const provider = sanitizeProvider(searchParams.provider);
  const fund = searchParams.fund?.toUpperCase();

  const payload = await api.changes(
    {
      period,
      direction,
      provider,
      fund,
      limit: 200,
    },
    { throwOnError: false },
  );

  return (
    <div className="space-y-4">
      <ChangesHeader />
      <FilterBar
        experienceId={experienceId}
        period={period}
        direction={direction}
        provider={provider}
        fund={fund}
      />
      <ChangesBody
        experienceId={experienceId}
        payload={payload}
      />
    </div>
  );
}

function ChangesHeader() {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Position changes
        </h2>
        <p className="text-sm text-muted-foreground">
          Every add, trim, and exit on the tape. Filter by period, direction,
          or fund family.
        </p>
      </div>
    </div>
  );
}

/** Build a /experiences/[id] href with merged query params, dropping any
 *  key whose new value is empty so "All" pills go back to a clean URL. */
function buildHref(
  experienceId: string,
  current: {
    period: Period;
    direction?: Direction;
    provider?: string;
    fund?: string;
  },
  patch: Partial<{
    period: Period;
    direction: Direction | null;
    provider: string | null;
    fund: string | null;
  }>,
): string {
  const next = { ...current };
  if (patch.period !== undefined) next.period = patch.period;
  if (patch.direction !== undefined) {
    next.direction = patch.direction === null ? undefined : patch.direction;
  }
  if (patch.provider !== undefined) {
    next.provider = patch.provider === null ? undefined : patch.provider;
  }
  if (patch.fund !== undefined) {
    next.fund = patch.fund === null ? undefined : patch.fund;
  }

  const qs = new URLSearchParams();
  qs.set("tab", "changes");
  if (next.period && next.period !== "daily") qs.set("period", next.period);
  if (next.direction) qs.set("direction", next.direction);
  if (next.provider) qs.set("provider", next.provider);
  if (next.fund) qs.set("fund", next.fund);

  return `/experiences/${experienceId}?${qs.toString()}`;
}

function FilterBar({
  experienceId,
  period,
  direction,
  provider,
  fund,
}: {
  experienceId: string;
  period: Period;
  direction?: Direction;
  provider?: string;
  fund?: string;
}) {
  const current = { period, direction, provider, fund };

  return (
    <div className="space-y-2">
      <PillGroup label="Period">
        {PERIODS.map((p) => (
          <Pill
            key={p}
            active={p === period}
            href={buildHref(experienceId, current, { period: p })}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </Pill>
        ))}
      </PillGroup>
      <PillGroup label="Direction">
        <Pill
          active={!direction}
          href={buildHref(experienceId, current, { direction: null })}
        >
          All
        </Pill>
        {DIRECTIONS.map((d) => (
          <Pill
            key={d}
            active={d === direction}
            href={buildHref(experienceId, current, { direction: d })}
          >
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </Pill>
        ))}
      </PillGroup>
      <PillGroup label="Provider">
        <Pill
          active={!provider}
          href={buildHref(experienceId, current, { provider: null })}
        >
          All
        </Pill>
        {PROVIDER_ORDER.map((p) => (
          <Pill
            key={p}
            active={p === provider}
            href={buildHref(experienceId, current, { provider: p })}
          >
            {p}
          </Pill>
        ))}
      </PillGroup>
    </div>
  );
}

function PillGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0 w-16">
        {label}
      </span>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 py-0.5">
        {children}
      </div>
    </div>
  );
}

function Pill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const tone = active
    ? "bg-primary/15 text-primary border-primary/30"
    : "bg-muted/30 text-muted-foreground border-border/60 hover:text-foreground hover:border-border";
  return (
    <Link
      href={href}
      className={`shrink-0 inline-flex items-center rounded-full border px-3 py-1 text-xs whitespace-nowrap transition-colors ${tone}`}
    >
      {children}
    </Link>
  );
}

function ChangesBody({
  experienceId,
  payload,
}: {
  experienceId: string;
  payload: {
    asOfDate: string;
    count: number;
    changes: ApiChangeRecord[];
  } | null;
}) {
  if (!payload) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Couldn&apos;t reach the TickerTrace API.
        </CardContent>
      </Card>
    );
  }

  if (payload.changes.length === 0) {
    return (
      <>
        <CaptionRow count={0} asOf={payload.asOfDate} />
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No changes match these filters today.
          </CardContent>
        </Card>
      </>
    );
  }

  const visible = payload.changes.slice(0, ROW_LIMIT);

  return (
    <>
      <CaptionRow count={payload.count} asOf={payload.asOfDate} />
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border/60">
            {visible.map((row, i) => (
              <ChangeRow
                key={`${row.fund}-${row.ticker}-${i}`}
                row={row}
                experienceId={experienceId}
              />
            ))}
          </ul>
        </CardContent>
      </Card>
      {payload.count > ROW_LIMIT ? (
        <p className="text-xs text-muted-foreground text-center">
          Showing {ROW_LIMIT} of {int(payload.count)} changes.
        </p>
      ) : null}
    </>
  );
}

function CaptionRow({ count, asOf }: { count: number; asOf: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
      <span>
        {int(count)} change{count === 1 ? "" : "s"}
      </span>
      <span>as of {asOf}</span>
    </div>
  );
}

function changeTypeTone(type: ChangeType): string {
  switch (type) {
    case "NEW":
      return "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10";
    case "REMOVED":
      return "border-rose-500/40 text-rose-700 dark:text-rose-300 bg-rose-500/10";
    case "CHANGED":
    default:
      return "border-sky-500/40 text-sky-700 dark:text-sky-300 bg-sky-500/10";
  }
}

function ChangeRow({
  row,
  experienceId,
}: {
  row: ApiChangeRecord;
  experienceId: string;
}) {
  const fundHref = `/experiences/${experienceId}/fund/${encodeURIComponent(row.fund)}`;
  const tickerSymbol = row.optionDetails?.underlying ?? row.ticker;
  const tickerHref = `/experiences/${experienceId}/ticker/${encodeURIComponent(tickerSymbol)}`;

  const directionForTone: "buying" | "selling" =
    row.weightDelta >= 0 ? "buying" : "selling";
  const deltaTone = directionTone(directionForTone);

  const sharesDeltaLabel =
    row.sharesDelta === 0
      ? null
      : `${row.sharesDelta > 0 ? "+" : "-"}${int(Math.abs(row.sharesDelta))} shares`;

  const optionLabel =
    row.isOption && row.optionDetails
      ? `${row.optionDetails.type} ${row.optionDetails.strike}@${row.optionDetails.expiry}`
      : null;

  return (
    <li className="px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={tickerHref}
              className="font-mono font-semibold tracking-tight hover:text-primary"
            >
              {row.ticker}
            </Link>
            <Badge
              variant="outline"
              className={changeTypeTone(row.type)}
            >
              {row.type}
            </Badge>
            {row.isOption ? (
              <Badge
                variant="outline"
                className="border-purple-500/40 text-purple-700 dark:text-purple-300 bg-purple-500/10"
              >
                OPTION
              </Badge>
            ) : null}
            {optionLabel ? (
              <span className="text-[11px] font-mono text-muted-foreground">
                {optionLabel}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <Link
              href={fundHref}
              className="hover:text-foreground transition-colors"
            >
              {row.fund}
            </Link>
            <span className="text-muted-foreground/60">·</span>
            <span>{getProvider(row.fund)}</span>
            {row.sector ? (
              <>
                <span className="text-muted-foreground/60">·</span>
                <span className="truncate">{row.sector}</span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 sm:flex-col sm:items-end sm:gap-1">
          <span className={`text-xs px-2 py-0.5 rounded ${deltaTone}`}>
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
