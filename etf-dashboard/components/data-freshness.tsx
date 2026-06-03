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
 */
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

  if (!asOf) return null;

  // asOfDate is YYYY-MM-DD — render as e.g. "Jun 2, 2026" (UTC to avoid drift).
  const label = new Date(`${asOf}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div
      className="inline-flex items-center gap-2 bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-xs font-semibold px-4 py-2 rounded-full mb-8 ml-0 sm:ml-3"
      title="Pulled live from the TickerTrace API — reflects the latest daily scrape, not the site build date."
    >
      <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
      DATA UPDATED {label.toUpperCase()}
    </div>
  );
}
