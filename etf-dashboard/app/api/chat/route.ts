/**
 * /api/chat — Ask TickerTrace.
 *
 * The user sends a question; Claude answers using TickerTrace's own data
 * via tool use. Tools wrap the FastAPI public endpoints directly — same
 * data the dashboard renders, just consumable by an LLM.
 *
 * Multi-turn: clients send the full message history each time. Tool use
 * loops are server-internal (the client never sees tool_use / tool_result
 * blocks, only the final assistant text).
 *
 * Requires ANTHROPIC_API_KEY in the Vercel environment.
 */

import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // tool-use loops can take a few seconds

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.tickertrace.pro';
const MODEL = 'claude-sonnet-4-5';
const MAX_TOOL_ITERATIONS = 6;

// ─── Tools ──────────────────────────────────────────────────────────────────
// Each tool is a thin wrapper over a TickerTrace REST endpoint. The descriptions
// matter — Claude picks tools based on them. Be concrete about what's returned.

const tools: Anthropic.Tool[] = [
    {
        name: 'get_signals',
        description:
            'Top buy and sell signals across all tracked ETFs for the most recent ' +
            'trading day, with AUM-weighted conviction scores. Use this when the ' +
            'user asks "what are institutions buying/selling today" or about ' +
            'today\'s conviction or top picks.',
        input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
        name: 'get_changes',
        description:
            'Filterable list of daily position changes (NEW / REMOVED / CHANGED) ' +
            'across funds. Use when the user asks about a specific provider\'s ' +
            'moves, or wants all buying vs selling activity for a day.',
        input_schema: {
            type: 'object',
            properties: {
                provider: { type: 'string', description: 'Provider filter, eg "ARK Invest", "YieldMax", "Avantis", "Corgi Funds"' },
                fund: { type: 'string', description: 'Specific fund ticker filter, eg "ARKK"' },
                direction: { type: 'string', enum: ['buying', 'selling'] },
                limit: { type: 'integer' },
            },
            required: [],
        },
    },
    {
        name: 'get_fund_detail',
        description:
            'Holdings detail for one fund: top positions, recent changes, options ' +
            'activity, AUM. Use when the user asks about a specific fund (eg "what ' +
            'does ARKK hold", "what is YieldMax\'s biggest position").',
        input_schema: {
            type: 'object',
            properties: { fund: { type: 'string', description: 'Fund ticker, eg "ARKK"' } },
            required: ['fund'],
        },
    },
    {
        name: 'get_ticker_detail',
        description:
            'Cross-fund view for one ticker: every fund that holds it, weights, ' +
            'and recent changes. Use when the user asks "who is buying GOOGL" or ' +
            'wants to see institutional exposure to a single stock.',
        input_schema: {
            type: 'object',
            properties: { ticker: { type: 'string', description: 'Stock ticker, eg "GOOGL"' } },
            required: ['ticker'],
        },
    },
    {
        name: 'get_sector_flow',
        description:
            'Sector-level money flow — which sectors had net inflows or outflows ' +
            'across all tracked funds in the latest day. Use for macro/thematic ' +
            'questions ("what sectors are getting accumulated").',
        input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
        name: 'get_divergences',
        description:
            'Cross-fund divergences — tickers where some funds are buying while ' +
            'others are selling, especially within the same provider (intra-shop ' +
            'conflict). Use when the user asks "where are funds disagreeing".',
        input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
        name: 'get_signal_performance',
        description:
            'Backtest results: historical median forward return and win rate of ' +
            'TickerTrace buy/sell signals over a 30-day window. Use when the user ' +
            'asks "do these signals actually work" or about historical performance.',
        input_schema: { type: 'object', properties: {}, required: [] },
    },
    {
        name: 'list_funds',
        description: 'List of every tracked fund with provider and AUM. Use when the user asks what funds are tracked.',
        input_schema: { type: 'object', properties: {}, required: [] },
    },
];

// ─── Tool implementations ──────────────────────────────────────────────────

async function callTool(name: string, input: Record<string, unknown>): Promise<unknown> {
    const fetchOpts: RequestInit = { headers: { Accept: 'application/json' } };
    let url: string;
    switch (name) {
        case 'get_signals':
            url = `${API_BASE}/api/v1/signals`;
            break;
        case 'get_changes': {
            const qs = new URLSearchParams();
            if (input.provider) qs.set('provider', String(input.provider));
            if (input.fund) qs.set('fund', String(input.fund));
            if (input.direction) qs.set('direction', String(input.direction));
            if (input.limit) qs.set('limit', String(input.limit));
            url = `${API_BASE}/api/v1/changes${qs.toString() ? `?${qs}` : ''}`;
            break;
        }
        case 'get_fund_detail':
            url = `${API_BASE}/api/v1/fund/${encodeURIComponent(String(input.fund))}`;
            break;
        case 'get_ticker_detail':
            url = `${API_BASE}/api/v1/ticker/${encodeURIComponent(String(input.ticker))}`;
            break;
        case 'get_sector_flow':
            url = `${API_BASE}/api/v1/sectors`;
            break;
        case 'get_divergences':
            url = `${API_BASE}/api/v1/divergences`;
            break;
        case 'get_signal_performance':
            url = `${API_BASE}/api/v1/signal-performance`;
            break;
        case 'list_funds':
            url = `${API_BASE}/api/v1/funds`;
            break;
        default:
            return { error: `Unknown tool: ${name}` };
    }
    try {
        const res = await fetch(url, fetchOpts);
        if (!res.ok) return { error: `API ${res.status} on ${name}`, body: await res.text().catch(() => '') };
        return await res.json();
    } catch (e) {
        return { error: String(e) };
    }
}

// ─── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are TickerTrace's analyst assistant. You answer questions about institutional ETF holdings — what funds like ARK Invest, YieldMax, Avantis, Corgi Funds, Roundhill, REX Shares, Kurv, and NestYield are buying, selling, and holding.

Rules:
- Always use the tools to ground your answers in real data — never invent numbers.
- Be concise. 2-4 short paragraphs unless the user explicitly asks for more.
- When citing data, mention the fund ticker and the actual numbers (weight %, share counts, dates).
- If a user asks a stock-picking or "should I buy" question, decline gracefully: TickerTrace surfaces what institutions are doing, it doesn't give advice.
- Today's date in the data is the most recent date returned by tools — say it explicitly when relevant.
- Plain markdown for output. No code blocks unless showing raw data.
- If a tool returns an error, try a different tool or admit the data wasn't available.`;

// ─── Handler ────────────────────────────────────────────────────────────────

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export async function POST(req: NextRequest) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: 'ANTHROPIC_API_KEY is not configured on the server.' },
            { status: 503 },
        );
    }

    let body: { messages?: ChatMessage[] };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const messages = body.messages ?? [];
    if (messages.length === 0) {
        return NextResponse.json({ error: 'No messages' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    // Convert client messages to the Anthropic format. Tool exchanges are
    // server-internal — we never expose them to the client and never accept
    // them back. Each turn re-runs the tool loop from scratch.
    const messagesForModel: Anthropic.MessageParam[] = messages.map(m => ({
        role: m.role,
        content: m.content,
    }));

    let toolIters = 0;
    while (toolIters < MAX_TOOL_ITERATIONS) {
        toolIters++;
        const resp = await client.messages.create({
            model: MODEL,
            max_tokens: 2048,
            system: SYSTEM_PROMPT,
            tools,
            messages: messagesForModel,
        });

        if (resp.stop_reason !== 'tool_use') {
            // Final answer — extract the text.
            const text = resp.content
                .filter((b): b is Anthropic.TextBlock => b.type === 'text')
                .map(b => b.text)
                .join('\n')
                .trim();
            return NextResponse.json({
                reply: text || '(no answer)',
                toolCalls: toolIters - 1,
            });
        }

        // Execute every tool_use block in this response, in parallel.
        const toolUses = resp.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
        );
        const toolResults = await Promise.all(
            toolUses.map(async tu => ({
                type: 'tool_result' as const,
                tool_use_id: tu.id,
                content: JSON.stringify(await callTool(tu.name, tu.input as Record<string, unknown>)),
            })),
        );

        // Append the assistant's tool_use turn and our tool_result turn.
        messagesForModel.push({ role: 'assistant', content: resp.content });
        messagesForModel.push({ role: 'user', content: toolResults });
    }

    return NextResponse.json(
        { error: `Hit max tool-use iterations (${MAX_TOOL_ITERATIONS}). Try rephrasing.` },
        { status: 504 },
    );
}
