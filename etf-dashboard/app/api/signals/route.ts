/**
 * Public JSON signals endpoint at tickertrace.pro/api/signals.
 *
 * Historically this re-computed the entire signal payload in TypeScript from
 * the CSV files in public/data/history/. As of review #10 it's a thin proxy
 * to the FastAPI server (api.tickertrace.mphinance.com/api/v1/signals) so
 * the Python implementation is the single source of truth — the same code
 * path the user's other services hit.
 *
 * Note: shape now matches /api/v1/signals (not the old TS-rolled shape).
 * Old fields like `briefing`, `daily`, `weekly` are no longer included —
 * fetch them from the FastAPI server directly if needed. The Next.js
 * /api/v1/* rewrite makes that one-domain.
 */

import { NextResponse } from "next/server";
import { api } from "@/lib/api";

export const revalidate = 3600; // cache 1 hour

export async function GET() {
    try {
        const payload = await api.signals({ revalidate: 3600 });
        return NextResponse.json(payload, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
            },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Upstream API error";
        return NextResponse.json(
            { error: message, hint: "The upstream FastAPI server may be unavailable." },
            { status: 502, headers: { "Access-Control-Allow-Origin": "*" } },
        );
    }
}
