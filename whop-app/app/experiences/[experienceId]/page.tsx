import { ExperienceShell, type ExperienceTab } from "@/components/experience-shell";
import { WhopRequired } from "@/components/whop-required";
import { getWhopUser } from "@/lib/whop-auth";
import { SignalsTab } from "@/components/tabs/signals-tab";
import { BriefingTab } from "@/components/tabs/briefing-tab";
import { ChangesTab } from "@/components/tabs/changes-tab";
import { DivergencesTab } from "@/components/tabs/divergences-tab";
import { SectorsTab } from "@/components/tabs/sectors-tab";
import { TickerSearchForm } from "@/components/ticker-search";

const TAB_IDS = [
  "signals",
  "briefing",
  "changes",
  "divergences",
  "sectors",
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
  const tab = normalizeTab(sp.tab);

  const user = await getWhopUser();
  if (!user) return <WhopRequired />;

  const greeting = user.name ?? user.username ?? undefined;
  const flatSp = flattenSearchParams(sp);

  return (
    <ExperienceShell
      experienceId={experienceId}
      currentTab={tab}
      greeting={greeting}
    >
      <div className="space-y-4">
        <TickerSearchForm experienceId={experienceId} />
        {tab === "signals" ? <SignalsTab experienceId={experienceId} /> : null}
        {tab === "briefing" ? <BriefingTab experienceId={experienceId} /> : null}
        {tab === "changes" ? (
          <ChangesTab experienceId={experienceId} searchParams={flatSp} />
        ) : null}
        {tab === "divergences" ? (
          <DivergencesTab experienceId={experienceId} />
        ) : null}
        {tab === "sectors" ? <SectorsTab /> : null}
      </div>
    </ExperienceShell>
  );
}
