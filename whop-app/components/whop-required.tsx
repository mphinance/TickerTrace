import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

/**
 * Rendered when an experience page is accessed without a verifiable Whop
 * JWT. Common case: someone hits the bare Vercel URL outside of any Whop
 * iframe (e.g. while debugging). Don't crash, just explain.
 */
export function WhopRequired() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="rounded-md bg-amber-500/15 border border-amber-500/30 p-2">
            <Lock className="size-5 text-amber-300" aria-hidden />
          </div>
          <CardTitle className="text-lg">Open this inside Whop</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            TickerTrace runs as a Whop app. To see it, install the app into a
            Whop community and open it from there — that&apos;s where the
            authentication handshake happens.
          </p>
          <p>
            If you&apos;re a developer testing locally, make sure your dev
            session is wrapped in the Whop iframe SDK and that the request is
            coming through whop.com.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
