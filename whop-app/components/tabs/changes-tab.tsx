import { Card, CardContent } from "@/components/ui/card";

/**
 * STUB — to be implemented by Wave 3 agent B.
 *
 * Must call /api/v1/changes with provider / direction / period filters
 * sourced from `searchParams`. Filter UI updates URL params via Link
 * (preserve the experienceId).
 */
export async function ChangesTab({
  experienceId: _experienceId,
  searchParams: _searchParams,
}: {
  experienceId: string;
  searchParams: Record<string, string | undefined>;
}) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        Changes tab — coming online shortly.
      </CardContent>
    </Card>
  );
}
