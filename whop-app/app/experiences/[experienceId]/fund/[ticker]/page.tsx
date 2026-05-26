import { ExperienceShell } from "@/components/experience-shell";
import { WhopRequired } from "@/components/whop-required";
import { getWhopUserId } from "@/lib/whop-auth";
import { Card, CardContent } from "@/components/ui/card";

/**
 * STUB — to be implemented by Wave 3 agent C.
 *
 * Verify JWT → render fund detail from api.fund(ticker). 404 when null.
 * Reuse <ExperienceShell currentTab={null} experienceId={...} />.
 *
 * Must show: provider, AUM, top holdings, recent changes, and an
 * Option Book section gated on optionsCount > 0.
 */
export default async function FundDetailPage({
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
          Fund detail for {ticker} — coming online shortly.
        </CardContent>
      </Card>
    </ExperienceShell>
  );
}
