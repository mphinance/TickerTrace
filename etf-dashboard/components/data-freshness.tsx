'use client';

import { useEffect, useState } from 'react';

/**
 * Live data-freshness pill.
 *
 * Fetches the API's `asOfDate` client-side via the same-origin `/api/v1`
 * proxy (rewritten to api.tickertrace.pro in next.config.ts), so the landing
 * page always shows the *true* data date regardless of when the static build
 * last ran. Without this, visitors fall back to reading the changelog dates as
 * "last updated" — which is how a fully-live site got reported as "stale since
 * May 21." Client-side on purpose: it can never break the build or bake a
 * stale date into the static HTML.
 *
 * Staleness logic mirrors scripts/check_freshness.py: >1 business day behind
 * today → amber warning instead of green. Weekends are never stale.
 */

function businessDaysBetween(startUTC: Date, endUTC: Date): number {
  let days = 0;
  const d = new Date(startUTC);
  while (d < endUTC) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay(); // 0=Sun, 1=Mon…5=Fri, 6=Sat
    if (dow >= 1 && dow <= 5) days++;
  }
  return days;
}

export function DataFreshness() {
  const [asOf, setAsOf] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/v1/changes?limit=1', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.asOfDate) setAsOf(d.asOfDate as string);
      })
      .catch(() => {
        /* freshness is best-effort — render nothing if the API is unreachable */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!asOf) return (
    <div
      className="inline-flex items-center gap-2 bg-surface-elevated/60 border border-surface-elevated text-transparent text-xs font-semibold px-4 py-2 rounded-full mb-8 ml-0 sm:ml-3 select-none pointer-events-none"
      aria-hidden="true"
    >
      <span className="w-2 h-2 rounded-full bg-slate-800" />
      DATA UPDATED XXX 00, 0000
    </div>
  );

  // asOfDate is YYYY-MM-DD — parse as UTC midnight to avoid timezone drift.
  const asOfUTC = new Date(`${asOf}T00:00:00Z`);
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const lag = businessDaysBetween(asOfUTC, todayUTC);
  const isStale = lag > 1;

  const label = asOfUTC.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  if (isStale) {
    return (
      <div
        className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold px-4 py-2 rounded-full mb-8 ml-0 sm:ml-3"
        title={`Data is ${lag} business ${lag === 1 ? 'day' : 'days'} stale — scraper or sync may be delayed.`}
      >
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        DATA MAY BE DELAYED — LAST UPDATED {label.toUpperCase()}
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-2 bg-buy/10 border border-buy/20 text-buy text-xs font-semibold px-4 py-2 rounded-full mb-8 ml-0 sm:ml-3"
      title="Pulled live from the TickerTrace API — reflects the latest daily scrape, not the site build date."
    >
      <span className="w-2 h-2 rounded-full bg-buy animate-pulse" />
      DATA UPDATED {label.toUpperCase()}
    </div>
  );
}
