import { NextResponse } from 'next/server';
import {
    getDailyDiff,
    getWeeklyDiff,
    getInstitutionalSignals,
    getPreMarketBriefing,
    getBuyingSelling,
    getSectorFlow,
    getAsOfDate,
    getGlobalStats,
    getDivergences,
} from '@/lib/holdings';

export const revalidate = 3600; // cache 1 hour, revalidate on next request

export async function GET() {
    const dailyDiff = getDailyDiff();
    const weeklyDiff = getWeeklyDiff();

    const payload = {
        asOfDate: getAsOfDate(),
        stats: getGlobalStats(),
        signals: getInstitutionalSignals(dailyDiff),
        briefing: getPreMarketBriefing(dailyDiff),
        daily: getBuyingSelling(dailyDiff),
        weekly: getBuyingSelling(weeklyDiff),
        sectorFlow: getSectorFlow(),
        divergences: getDivergences(dailyDiff),
    };

    return NextResponse.json(payload, {
        headers: {
            'Access-Control-Allow-Origin': '*', // public read API
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
}
