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
        _meta: {
            endpoint: '/api/signals',
            description: 'TickerTrace public read API — institutional ETF activity signals updated daily.',
            cache: '1 hour (stale-while-revalidate 24h)',
            fields: {
                asOfDate: 'Date of the latest holdings data (YYYY-MM-DD)',
                stats: 'Global stats: total funds tracked, underlyings, put/call ratio',
                signals: '{ buying, selling } — top institutional signals ranked by conviction score',
                briefing: 'Pre-market briefing: top buys/sells, cross-fund convergence, streaks, options',
                daily: '{ accumulating, reducing, optionsActivity } — full daily position changes',
                weekly: '{ accumulating, reducing, optionsActivity } — full weekly position changes',
                sectorFlow: 'Sector-level weight changes: inflows and outflows',
                divergences: 'Tickers where funds disagree (buying vs selling the same stock)',
            },
            docs: 'https://tickertrace.pro/dashboard',
            cors: 'Enabled for all origins',
        },
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
