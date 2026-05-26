import { ExperienceShell } from "@/components/experience-shell";
import { WhopRequired } from "@/components/whop-required";
import { getWhopUserId } from "@/lib/whop-auth";
import { Card, CardContent } from "@/components/ui/card";

/**
 * STUB — to be implemented by Wave 4 agent A.
 *
 * Verify JWT → render cross-fund detail from api.ticker(ticker). For
 * each fund that holds the ticker, show provider, weight, share count,
 * and an option-vs-equity badge. Below: api.ticker(...).changes recent
 * activity list. Empty-state when no funds hold it.
 */
export default async function TickerDetailPage({
  params,
}: {
  params: Promise<{ experienceId: string; ticker: string }>;
}) {
  const { experienceId, ticker } = await params;
  const userId = await getWhopUserId();
  if (!userId) return <WhopRequired />;

  return (
    <ExperienceShell experienceId={experienceId} currentTab={null}>
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Cross-fund detail for {ticker} — coming online shortly.
        </CardContent>
      </Card>
    </ExperienceShell>
  );
}
