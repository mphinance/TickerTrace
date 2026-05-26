import Link from "next/link";
import {
  Activity,
  ArrowUpDown,
  GitFork,
  Layers,
  PieChart,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Public app-store style pitch. Renders without any Whop auth — this is
 * what someone sees when they're browsing the Whop app catalog. No data
 * fetches, no JWT, just the elevator copy and a feature grid.
 */
export const metadata = {
  title: "TickerTrace — Institutional ETF Intelligence",
  description:
    "What are institutions buying today? Daily holdings signals from ARK, Avantis, YieldMax, Kurv, and more.",
};

const FEATURES: { icon: typeof Layers; title: string; body: string }[] = [
  {
    icon: TrendingUp,
    title: "Daily conviction signals",
    body: "Cross-fund buying and selling, scored by how many institutions are leaning the same way today.",
  },
  {
    icon: Activity,
    title: "Morning briefing",
    body: "The four things worth knowing before the open: top buys, top sells, what's on a streak, and what option books are doing.",
  },
  {
    icon: ArrowUpDown,
    title: "Position changes feed",
    body: "Every add, trim, and exit on the tape, filterable by provider, direction, or period.",
  },
  {
    icon: GitFork,
    title: "Cross-fund divergences",
    body: "Same ticker, two funds, opposite directions. The intrashop ones (same family) are where it gets interesting.",
  },
  {
    icon: PieChart,
    title: "Sector flow",
    body: "Aggregate weight moves bucketed by sector. Where capital is rotating in, and where it's leaving.",
  },
  {
    icon: Layers,
    title: "Fund and ticker drill-downs",
    body: "Click any fund for its full book, top holdings, option overlay, and recent moves. Click any ticker for the cross-fund view.",
  },
];

const COVERED_FAMILIES = [
  "ARK Invest",
  "Avantis",
  "Kurv",
  "YieldMax",
  "REX Shares",
  "NestYield",
  "NicholasX",
];

export default function DiscoverPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-12 sm:px-6 sm:py-16 space-y-12">
        <Hero />
        <FeatureGrid />
        <CoverageSection />
        <FaqStrip />
        <Footer />
      </div>
    </main>
  );
}

function Hero() {
  return (
    <section className="space-y-4 text-center sm:text-left">
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
        <Zap className="size-3" />
        Free for every Whop community
      </div>
      <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
        What are institutions buying today?
      </h1>
      <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto sm:mx-0">
        TickerTrace scrapes daily ETF holdings from ARK, Avantis, YieldMax,
        Kurv, REX, and a handful of newer option-income shops. It normalizes
        what they actually did with the money, then surfaces the signals
        worth caring about. Install it into your Whop and your members get a
        dashboard tab.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center sm:justify-start">
        <Link
          href="https://tickertrace.pro"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          See the public dashboard
        </Link>
        <Link
          href="https://api.tickertrace.pro/docs"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          API docs
        </Link>
      </div>
    </section>
  );
}

function FeatureGrid() {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">
        What you get inside your community
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.title}>
              <CardContent className="space-y-2 py-5">
                <div className="rounded-md w-fit bg-primary/10 border border-primary/30 p-2">
                  <Icon className="size-4 text-primary" aria-hidden />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function CoverageSection() {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">
        Fund families we track
      </h2>
      <div className="flex flex-wrap gap-2">
        {COVERED_FAMILIES.map((f) => (
          <span
            key={f}
            className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
          >
            {f}
          </span>
        ))}
      </div>
      <p className="text-sm text-muted-foreground max-w-2xl">
        Active equity funds (ARK, Avantis) and option-income funds (YieldMax,
        Kurv, REX, NestYield) get different fund-detail templates because the
        signal lives in different places. Equity funds: read the conviction.
        Option funds: read the option book.
      </p>
    </section>
  );
}

function FaqStrip() {
  return (
    <section className="grid gap-3 sm:grid-cols-2">
      <FaqCard
        q="Is this really free?"
        a="Yes. No tier gate, no upsell. The data lives at api.tickertrace.pro and is open to everyone."
      />
      <FaqCard
        q="Where does the data come from?"
        a="Daily scrapes of each fund family's public holdings disclosures, normalized into one schema. The full pipeline is open source."
      />
      <FaqCard
        q="How fresh is it?"
        a="Updated daily after the holdings drop, usually before US market open the next day."
      />
      <FaqCard
        q="Can I get this outside Whop?"
        a="Sure. tickertrace.pro is the public dashboard, and api.tickertrace.pro has a Swagger doc."
      />
    </section>
  );
}

function FaqCard({ q, a }: { q: string; a: string }) {
  return (
    <Card>
      <CardContent className="py-4 space-y-1">
        <h3 className="font-semibold text-sm">{q}</h3>
        <p className="text-sm text-muted-foreground">{a}</p>
      </CardContent>
    </Card>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 pt-6 text-xs text-muted-foreground">
      <p>
        Built with the public TickerTrace API. Not investment advice. None of
        this is a recommendation to do anything.
      </p>
    </footer>
  );
}
