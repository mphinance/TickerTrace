import { whopSdk } from "@/lib/whop-sdk";
import { getWhopUserId } from "@/lib/whop-auth";
import { WhopRequired } from "@/components/whop-required";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Layers, Link2, Megaphone } from "lucide-react";
import Link from "next/link";

/**
 * Admin dashboard view. Whop renders this inside the company-owner's
 * settings panel for the app. It confirms install state and explains the
 * creator workflow — the Broadcast tab — that admins drive from inside the
 * experience.
 *
 * Only renders for users with admin access to the company; anyone else
 * gets notFound() so we don't leak experience IDs.
 */
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const userId = await getWhopUserId();
  if (!userId) return <WhopRequired />;

  try {
    const access = await whopSdk.access.checkIfUserHasAccessToCompany({
      userId,
      companyId,
    });
    if (access.accessLevel !== "admin") notFound();
  } catch {
    // checkIfUserHasAccessToCompany can throw if the company id is bogus
    // or the SDK is misconfigured — treat that as "no access" rather than
    // a 500 so the admin can read the error in-context.
    notFound();
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:px-6 space-y-6">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-3" />
            Installed and running
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            TickerTrace is live in your community
          </h1>
          <p className="text-sm text-muted-foreground">
            Open the app from your community sidebar to use it. The theme
            follows your Whop — light or dark — automatically.
          </p>
        </header>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Megaphone className="size-4 text-primary" />
            <CardTitle className="text-base">
              Your workflow: broadcast the daily brief
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              As an admin you get a{" "}
              <span className="font-medium text-foreground">Broadcast</span> tab
              that members don&apos;t see. Open it to review today&apos;s
              institutional brief — top buying and selling conviction, plus
              multi-day streaks — then push it to your whole community in one
              tap.
            </p>
            <p>
              Members get a notification (with your note, if you add one) that
              opens straight to the live signals. It&apos;s a daily reason for
              them to come back, and a daily piece of content you don&apos;t
              have to write from scratch.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Layers className="size-4 text-primary" />
            <CardTitle className="text-base">What members see</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Signals · Briefing · Changes · Divergences · Sectors as the five
              top-level tabs, plus per-fund and per-ticker deep dives.
              Everything is read-only and tied to the public TickerTrace API.
            </p>
            <p>
              Members don&apos;t need an account, key, or subscription. As long
              as they have access to your Whop, they have access to the
              dashboard.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Link2 className="size-4 text-primary" />
            <CardTitle className="text-base">Useful links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <LinkRow
              label="Public dashboard"
              href="https://tickertrace.pro"
              hint="The version that lives outside Whop"
            />
            <LinkRow
              label="API docs"
              href="https://api.tickertrace.pro/docs"
              hint="Swagger reference for the underlying endpoints"
            />
            <LinkRow
              label="Source on GitHub"
              href="https://github.com/mphinance/TickerTrace"
              hint="Scraper, normalizer, API, dashboards — all of it"
            />
          </CardContent>
        </Card>

        <p className="text-[11px] text-muted-foreground">
          Company id: <span className="font-mono">{companyId}</span>
        </p>
      </div>
    </main>
  );
}

function LinkRow({
  label,
  href,
  hint,
}: {
  label: string;
  href: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-md border border-border/60 hover:border-primary/40 hover:bg-card transition-colors px-3 py-2"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{hint}</p>
      </div>
      <Link2 className="size-4 text-muted-foreground shrink-0" />
    </Link>
  );
}
