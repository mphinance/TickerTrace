import Link from "next/link";
import { ReactNode } from "react";
import {
  Activity,
  ArrowUpDown,
  GitFork,
  Layers,
  Megaphone,
  PieChart,
  TrendingUp,
} from "lucide-react";

/**
 * Common chrome for every experience-scoped page. Renders a header with
 * the experience name (or a greeting) plus a horizontally-scrollable tab
 * row. The tab links carry the experienceId through so deep links keep
 * the context.
 *
 * Pages pick which tab is active via `currentTab`. Pages outside the five
 * top-level tabs (e.g. fund detail, ticker detail) pass null and just
 * render under the tab row without highlighting anything.
 */
export type ExperienceTab =
  | "signals"
  | "briefing"
  | "changes"
  | "divergences"
  | "sectors"
  | "broadcast";

type TabDef = { id: ExperienceTab; label: string; icon: typeof Layers };

const TABS: TabDef[] = [
  { id: "signals", label: "Signals", icon: TrendingUp },
  { id: "briefing", label: "Briefing", icon: Activity },
  { id: "changes", label: "Changes", icon: ArrowUpDown },
  { id: "divergences", label: "Divergences", icon: GitFork },
  { id: "sectors", label: "Sectors", icon: PieChart },
];

/** Creator-only tab, appended for admins. */
const BROADCAST_TAB: TabDef = {
  id: "broadcast",
  label: "Broadcast",
  icon: Megaphone,
};

export function ExperienceShell({
  experienceId,
  currentTab,
  greeting,
  isAdmin = false,
  children,
}: {
  experienceId: string;
  currentTab: ExperienceTab | null;
  greeting?: string;
  /** When true, the Broadcast tab is shown. Defaults to false. */
  isAdmin?: boolean;
  children: ReactNode;
}) {
  const baseHref = `/experiences/${experienceId}`;
  const tabs = isAdmin ? [...TABS, BROADCAST_TAB] : TABS;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Layers className="size-5 text-primary" aria-hidden />
            <h1 className="text-lg font-semibold tracking-tight">
              TickerTrace
            </h1>
            {greeting ? (
              <span className="text-sm text-muted-foreground truncate">
                — {greeting}
              </span>
            ) : null}
          </div>
          <nav
            aria-label="Sections"
            className="mt-3 -mx-4 sm:mx-0 overflow-x-auto"
          >
            <ul className="flex gap-1 px-4 sm:px-0 min-w-max">
              {tabs.map((t) => {
                const href =
                  t.id === "signals" ? baseHref : `${baseHref}?tab=${t.id}`;
                const active = currentTab === t.id;
                const Icon = t.icon;
                return (
                  <li key={t.id}>
                    <Link
                      href={href}
                      className={[
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap",
                        active
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "text-muted-foreground hover:text-foreground hover:bg-card",
                      ].join(" ")}
                    >
                      <Icon className="size-4" aria-hidden />
                      {t.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6">{children}</div>
    </main>
  );
}
