import { Card, CardContent } from "@/components/ui/card";

/**
 * STUB — to be implemented by Wave 3 agent A.
 *
 * Must render /api/v1/briefing: topBuys, topSells, activeStreaks,
 * notableOptions. Empty-state every section. Use the same SignalRow look
 * as signals-tab.tsx so the two views feel related.
 */
export async function BriefingTab({
  experienceId: _experienceId,
}: {
  experienceId: string;
}) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        Briefing tab — coming online shortly.
      </CardContent>
    </Card>
  );
}
