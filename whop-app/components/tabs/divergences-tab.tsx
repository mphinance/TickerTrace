import { Card, CardContent } from "@/components/ui/card";

/**
 * STUB — to be implemented by Wave 4 agent B.
 *
 * Must render /api/v1/divergences: for each row, show ticker, the buying
 * fund(s) on one side, selling fund(s) on the other, and an "intrashop"
 * badge when both sides are from the same fund family. Empty state when
 * none.
 */
export async function DivergencesTab({
  experienceId: _experienceId,
}: {
  experienceId: string;
}) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        Divergences tab — coming online shortly.
      </CardContent>
    </Card>
  );
}
