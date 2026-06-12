import Link from "next/link";
import { api, type ApiDivergence, type ApiDivergenceFund } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight, Split } from "lucide-react";
import { directionTone, pct } from "@/lib/format";

/**
 * Cross-fund divergences. Pulls /api/v1/divergences and renders one card
 * per ticker where at least one fund is buying and at least one fund is
 * selling in the same window. The "intrashop" flag fires when both sides
 * are from the same provider — that's the spicy case.
 */
const MAX_ROWS = 30;

export async function DivergencesTab({
  experienceId,
}: {
  experienceId: string;
}) {
  const divergences = await api.divergences({ throwOnError: false });

  if (!divergences) {
    return (
      <div className="space-y-6">
        <DivergencesHeader />
        <EmptyState message="Couldn't reach the TickerTrace API for divergences. Give it a minute and reload." />
      </div>
    );
  }

  if (divergences.length === 0) {
    return (
      <div className="space-y-6">
        <DivergencesHeader />
        <EmptyState message="No cross-fund divergences on the tape today. Funds are largely in agreement, or nobody moved enough to register." />
      </div>
    );
  }

  const shown = divergences.slice(0, MAX_ROWS);
  const remaining = divergences.length - shown.length;

  return (
    <div className="space-y-6">
      <DivergencesHeader />
      <div className="grid gap-3">
        {shown.map((d) => (
          <DivergenceCard
            key={d.ticker}
            divergence={d}
            experienceId={experienceId}
          />
        ))}
      </div>
      {remaining > 0 ? (
        <p className="text-xs text-muted-foreground text-center">
          Showing the first {MAX_ROWS} of {divergences.length}. The rest are
          smaller-conviction splits in the same shape.
        </p>
      ) : null}
    </div>
  );
}

function DivergencesHeader() {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Cross-fund divergences
        </h2>
        <p className="text-sm text-muted-foreground">
          Tickers where one fund is buying while another is selling in the same
          window. Intrashop splits flag when both sides come from the same
          provider.
        </p>
      </div>
    </div>
  );
}

function DivergenceCard({
  divergence,
  experienceId,
}: {
  divergence: ApiDivergence;
  experienceId: string;
}) {
  const tickerHref = `/experiences/${experienceId}/ticker/${encodeURIComponent(divergence.ticker)}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Split className="size-4 text-muted-foreground shrink-0" />
            <Link
              href={tickerHref}
              className="font-mono font-semibold tracking-tight hover:underline"
            >
              {divergence.ticker}
            </Link>
            <span className="text-xs text-muted-foreground truncate">
              {divergence.name}
            </span>
          </div>
          {divergence.intrashop ? (
            <Badge
              variant="outline"
              className="border-violet-500/40 text-violet-700 dark:text-violet-300 bg-violet-500/10 shrink-0"
            >
              intrashop
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <DivergenceSide
          title="Buying"
          icon={<ArrowUpRight className="size-4 text-emerald-700 dark:text-emerald-300" />}
          funds={divergence.buyingFunds}
          direction="buying"
          experienceId={experienceId}
        />
        <DivergenceSide
          title="Selling"
          icon={<ArrowDownRight className="size-4 text-rose-700 dark:text-rose-300" />}
          funds={divergence.sellingFunds}
          direction="selling"
          experienceId={experienceId}
        />
      </CardContent>
    </Card>
  );
}

function DivergenceSide({
  title,
  icon,
  funds,
  direction,
  experienceId,
}: {
  title: string;
  icon: React.ReactNode;
  funds: ApiDivergenceFund[];
  direction: "buying" | "selling";
  experienceId: string;
}) {
  const accent =
    direction === "buying"
      ? "border-emerald-500/20 bg-emerald-500/5"
      : "border-rose-500/20 bg-rose-500/5";

  return (
    <div className={`rounded-md border px-3 py-2 ${accent}`}>
      <div className="flex items-center gap-2 pb-2">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">
          {funds.length} fund{funds.length === 1 ? "" : "s"}
        </span>
      </div>
      {funds.length === 0 ? (
        <p className="text-xs text-muted-foreground">No funds on this side.</p>
      ) : (
        <ul className="space-y-1.5">
          {funds.map((f) => (
            <DivergenceFundRow
              key={`${direction}-${f.fund}`}
              fund={f}
              direction={direction}
              experienceId={experienceId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DivergenceFundRow({
  fund,
  direction,
  experienceId,
}: {
  fund: ApiDivergenceFund;
  direction: "buying" | "selling";
  experienceId: string;
}) {
  const href = `/experiences/${experienceId}/fund/${encodeURIComponent(fund.fund)}`;
  const tone = directionTone(direction);

  return (
    <li className="flex items-center justify-between gap-2 text-xs">
      <div className="min-w-0 flex items-center gap-2">
        <Link
          href={href}
          className="font-mono font-semibold hover:underline shrink-0"
        >
          {fund.fund}
        </Link>
        <span className="text-muted-foreground truncate">{fund.provider}</span>
      </div>
      <span className={`px-2 py-0.5 rounded shrink-0 ${tone}`}>
        {pct(fund.weightDelta)}
      </span>
    </li>
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
