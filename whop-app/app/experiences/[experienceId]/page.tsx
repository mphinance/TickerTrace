import { ExperienceShell, type ExperienceTab } from "@/components/experience-shell";
import { WhopRequired } from "@/components/whop-required";
import { getExperienceAccess, getWhopUser } from "@/lib/whop-auth";
import { SignalsTab } from "@/components/tabs/signals-tab";
import { BriefingTab } from "@/components/tabs/briefing-tab";
import { ChangesTab } from "@/components/tabs/changes-tab";
import { DivergencesTab } from "@/components/tabs/divergences-tab";
import { SectorsTab } from "@/components/tabs/sectors-tab";
import { BroadcastTab } from "@/components/tabs/broadcast-tab";
import { TickerSearchForm } from "@/components/ticker-search";

const TAB_IDS = [
  "signals",
  "briefing",
  "changes",
  "divergences",
  "sectors",
  "broadcast",
] as const satisfies readonly ExperienceTab[];

function normalizeTab(raw: string | string[] | undefined): ExperienceTab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (TAB_IDS as readonly string[]).includes(value ?? "")
    ? (value as ExperienceTab)
    : "signals";
}

function flattenSearchParams(
  sp: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) {
    out[k] = Array.isArray(v) ? v[0] : v;
  }
  return out;
}

export default async function ExperiencePage({
  params,
  searchParams,
}: {
  params: Promise<{ experienceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { experienceId } = await params;
  const sp = await searchParams;
  const requestedTab = normalizeTab(sp.tab);

  // Gate on a verifiable Whop session, and learn whether this user is an admin
  // of the experience (controls the creator-only Broadcast tab).
  const access = await getExperienceAccess(experienceId);
  if (!access) return <WhopRequired />;
  const isAdmin = access.accessLevel === "admin";

  // Broadcast is admin-only: a non-admin landing on ?tab=broadcast (e.g. a
  // shared deep link) falls back to the default view rather than 404-ing.
  const tab: ExperienceTab =
    requestedTab === "broadcast" && !isAdmin ? "signals" : requestedTab;

  // Greeting is best-effort cosmetic — never gates anything.
  const user = await getWhopUser();
  const greeting = user?.name ?? user?.username ?? undefined;
  const flatSp = flattenSearchParams(sp);

  return (
    <ExperienceShell
      experienceId={experienceId}
      currentTab={tab}
      greeting={greeting}
      isAdmin={isAdmin}
    >
      <div className="space-y-4">
        {tab === "broadcast" ? null : (
          <TickerSearchForm experienceId={experienceId} />
        )}
        {tab === "signals" ? <SignalsTab experienceId={experienceId} /> : null}
        {tab === "briefing" ? <BriefingTab experienceId={experienceId} /> : null}
        {tab === "changes" ? (
          <ChangesTab experienceId={experienceId} searchParams={flatSp} />
        ) : null}
        {tab === "divergences" ? (
          <DivergencesTab experienceId={experienceId} />
        ) : null}
        {tab === "sectors" ? <SectorsTab /> : null}
        {tab === "broadcast" ? (
          <BroadcastTab experienceId={experienceId} />
        ) : null}
      </div>
    </ExperienceShell>
  );
}
