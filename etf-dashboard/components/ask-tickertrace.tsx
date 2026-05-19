'use client';

/**
 * AskTickerTrace — chat box with a BYOK Gemini key.
 *
 * The user pastes their own Google AI Studio API key (free tier on
 * generativelanguage.googleapis.com is generous). The key is persisted
 * to localStorage and never leaves the browser. We POST directly to
 * Gemini from the client; tool-use loops happen in the browser and
 * pull data from the open TickerTrace API.
 *
 * No server route. No proprietary key. The cost of every conversation
 * is borne by the user, which is exactly what we want — the people
 * who plug in a key are the ones who care, and we don't pay a cent.
 */

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Send, Loader2, MessageSquare, Sparkles, KeyRound, ExternalLink, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.tickertrace.pro';
const STORAGE_KEY = 'tt_gemini_api_key';
const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_TOOL_ITERATIONS = 6;

interface ChatTurn {
    role: 'user' | 'assistant';
    content: string;
}

const STARTER_PROMPTS = [
    'What are institutions buying today?',
    "Who's accumulating GOOGL?",
    'Show me ARK’s biggest moves',
    'Do these signals actually make money?',
];

const SYSTEM_INSTRUCTION = `You are TickerTrace's analyst assistant. You answer questions about institutional ETF holdings — what funds like ARK Invest, YieldMax, Avantis, Corgi Funds, Roundhill, REX Shares, Kurv, and NestYield are buying, selling, and holding.

Rules:
- Always use the tools to ground your answers in real data — never invent numbers.
- Be concise. 2-4 short paragraphs unless the user explicitly asks for more.
- When citing data, mention the fund ticker and the actual numbers (weight %, share counts, dates).
- If a user asks a stock-picking or "should I buy" question, decline gracefully: TickerTrace surfaces what institutions are doing, it doesn't give advice.
- Today's date in the data is the most recent date returned by tools — say it explicitly when relevant.
- Plain markdown for output. No code blocks unless showing raw data.
- If a tool returns an error, try a different tool or admit the data wasn't available.`;

// ─── Tool definitions (Gemini function declaration format) ──────────────────

const TOOLS = [
    {
        name: 'get_signals',
        description: 'Top buy and sell signals across all tracked ETFs for the most recent trading day, with AUM-weighted conviction scores.',
        parameters: { type: 'object', properties: {} },
    },
    {
        name: 'get_changes',
        description: 'Filterable list of daily position changes across funds. Use for provider-specific or direction-specific lookups.',
        parameters: {
            type: 'object',
            properties: {
                provider: { type: 'string' },
                fund: { type: 'string' },
                direction: { type: 'string', enum: ['buying', 'selling'] },
                limit: { type: 'integer' },
            },
        },
    },
    {
        name: 'get_fund_detail',
        description: 'Holdings, recent changes, options activity, and AUM for one fund. Use when asked about a specific fund.',
        parameters: { type: 'object', properties: { fund: { type: 'string' } }, required: ['fund'] },
    },
    {
        name: 'get_ticker_detail',
        description: 'Cross-fund view: every fund that holds a given ticker, with weights and recent changes.',
        parameters: { type: 'object', properties: { ticker: { type: 'string' } }, required: ['ticker'] },
    },
    {
        name: 'get_sector_flow',
        description: 'Sector-level money flow — which sectors had net inflows or outflows in the latest day.',
        parameters: { type: 'object', properties: {} },
    },
    {
        name: 'get_divergences',
        description: 'Tickers where some funds are buying while others are selling, especially within the same provider.',
        parameters: { type: 'object', properties: {} },
    },
    {
        name: 'get_signal_performance',
        description: 'Backtest results: historical median forward return and win rate of TickerTrace buy/sell signals over a 30-day window.',
        parameters: { type: 'object', properties: {} },
    },
    {
        name: 'list_funds',
        description: 'List of every tracked fund with provider and AUM.',
        parameters: { type: 'object', properties: {} },
    },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    let url: string;
    switch (name) {
        case 'get_signals': url = `${API_BASE}/api/v1/signals`; break;
        case 'get_changes': {
            const qs = new URLSearchParams();
            if (args.provider) qs.set('provider', String(args.provider));
            if (args.fund) qs.set('fund', String(args.fund));
            if (args.direction) qs.set('direction', String(args.direction));
            if (args.limit) qs.set('limit', String(args.limit));
            url = `${API_BASE}/api/v1/changes${qs.toString() ? `?${qs}` : ''}`;
            break;
        }
        case 'get_fund_detail':
            url = `${API_BASE}/api/v1/fund/${encodeURIComponent(String(args.fund))}`;
            break;
        case 'get_ticker_detail':
            url = `${API_BASE}/api/v1/ticker/${encodeURIComponent(String(args.ticker))}`;
            break;
        case 'get_sector_flow': url = `${API_BASE}/api/v1/sectors`; break;
        case 'get_divergences': url = `${API_BASE}/api/v1/divergences`; break;
        case 'get_signal_performance': url = `${API_BASE}/api/v1/signal-performance`; break;
        case 'list_funds': url = `${API_BASE}/api/v1/funds`; break;
        default: return { error: `Unknown tool: ${name}` };
    }
    try {
        const res = await fetch(url);
        if (!res.ok) return { error: `API ${res.status} on ${name}` };
        return await res.json();
    } catch (e) {
        return { error: String(e) };
    }
}

// ─── Gemini conversation runner ─────────────────────────────────────────────

interface GeminiPart {
    text?: string;
    functionCall?: { name: string; args: Record<string, unknown> };
    functionResponse?: { name: string; response: Record<string, unknown> };
}
interface GeminiContent {
    role: 'user' | 'model';
    parts: GeminiPart[];
}

async function callGemini(apiKey: string, contents: GeminiContent[]): Promise<GeminiContent> {
    const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            tools: [{ functionDeclarations: TOOLS }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 1500 },
        }),
    });
    if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        let message = `Gemini ${res.status}`;
        try {
            const parsed = JSON.parse(errBody);
            if (parsed?.error?.message) message = parsed.error.message;
        } catch { /* keep raw */ }
        throw new Error(message);
    }
    const data = await res.json();
    const candidate = data.candidates?.[0];
    if (!candidate) {
        throw new Error('Gemini returned no candidates (possibly blocked by safety filters).');
    }
    return { role: 'model', parts: candidate.content?.parts ?? [] };
}

async function runConversation(
    apiKey: string,
    history: ChatTurn[],
    onProgress?: (msg: string) => void,
): Promise<string> {
    const contents: GeminiContent[] = history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
    }));

    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
        const response = await callGemini(apiKey, contents);
        const functionCalls = response.parts.filter(p => p.functionCall);

        if (functionCalls.length === 0) {
            return response.parts.map(p => p.text ?? '').join('\n').trim();
        }

        onProgress?.(`Looking up ${functionCalls.map(fc => fc.functionCall!.name).join(', ')}…`);
        contents.push(response);
        const responses: GeminiPart[] = [];
        for (const fc of functionCalls) {
            const name = fc.functionCall!.name;
            const result = await callTool(name, fc.functionCall!.args ?? {});
            responses.push({
                functionResponse: { name, response: { result } },
            });
        }
        contents.push({ role: 'user', parts: responses });
    }
    return '(I made too many tool calls without converging on an answer — try rephrasing?)';
}

// ─── UI ─────────────────────────────────────────────────────────────────────

export function AskTickerTrace() {
    const [apiKey, setApiKey] = useState<string>('');
    const [messages, setMessages] = useState<ChatTurn[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showKey, setShowKey] = useState(false);
    const [progress, setProgress] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [hydrated, setHydrated] = useState(false);

    // Load key from localStorage on mount (client-only).
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setApiKey(stored);
        setHydrated(true);
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading, progress]);

    function saveKey(k: string) {
        const trimmed = k.trim();
        setApiKey(trimmed);
        if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed);
        else localStorage.removeItem(STORAGE_KEY);
    }

    async function send(text: string) {
        if (!text.trim() || loading) return;
        if (!apiKey) { setShowKey(true); return; }
        setError(null);
        setProgress(null);
        const next: ChatTurn[] = [...messages, { role: 'user', content: text.trim() }];
        setMessages(next);
        setInput('');
        setLoading(true);
        try {
            const reply = await runConversation(apiKey, next, setProgress);
            setMessages([...next, { role: 'assistant', content: reply || '(no answer)' }]);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
            setProgress(null);
        }
    }

    function onSubmit(e: FormEvent) {
        e.preventDefault();
        void send(input);
    }

    const hasKey = hydrated && !!apiKey;

    return (
        <div className="bg-gradient-to-br from-[#111827] to-[#0f1729] border border-[#a78bfa]/30 rounded-xl shadow-lg shadow-[#a78bfa]/5 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#1f2937] flex items-center gap-2 bg-[#0f172a]/50">
                <Sparkles className="h-4 w-4 text-[#a78bfa]" />
                <h2 className="text-sm font-bold text-white">Ask TickerTrace</h2>
                <span className="text-[10px] text-slate-500 ml-1">
                    Bring-your-own Gemini key · grounded in real holdings data
                </span>
                <button
                    onClick={() => setShowKey(s => !s)}
                    className="ml-auto flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                    title="Manage API key"
                >
                    <KeyRound className="h-3.5 w-3.5" />
                    {hasKey ? 'Key set' : 'Set key'}
                </button>
            </div>

            {/* Key settings drawer */}
            {(showKey || (hydrated && !hasKey)) && (
                <div className="px-4 py-3 border-b border-[#1f2937] bg-[#0f172a]/80 space-y-2">
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                        Paste a free Google AI Studio API key. We store it only in your browser
                        (<code className="text-[#00d4ff] bg-[#1e293b] px-1 rounded">localStorage</code>);
                        it never touches our servers — Gemini is called directly from your machine.
                        {' '}
                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[#a78bfa] hover:text-white underline underline-offset-2"
                        >
                            Get a free key <ExternalLink className="h-3 w-3" />
                        </a>
                    </p>
                    <div className="flex gap-2 items-center">
                        <input
                            type="password"
                            value={apiKey}
                            onChange={e => saveKey(e.target.value)}
                            placeholder="AIza…"
                            className="flex-1 bg-[#0a0f1e] border border-[#1f2937] rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-[#a78bfa]/60"
                            autoComplete="off"
                            spellCheck={false}
                        />
                        {hasKey && (
                            <button
                                onClick={() => { saveKey(''); setShowKey(false); }}
                                className="px-3 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-xs text-slate-300 hover:text-[#ff8888] hover:border-[#ff4444]/40 transition-colors flex items-center gap-1"
                                title="Forget key"
                            >
                                <X className="h-3 w-3" /> Forget
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Conversation */}
            <div className="max-h-[420px] overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 && !loading && (
                    <div className="text-slate-400 text-sm space-y-3">
                        <p className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-[#a78bfa]" />
                            Ask anything about what institutions are doing. Try one of these:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {STARTER_PROMPTS.map(p => (
                                <button
                                    key={p}
                                    onClick={() => void send(p)}
                                    className="text-xs px-3 py-1.5 rounded-full bg-[#1e293b] border border-[#334155] text-slate-300 hover:border-[#a78bfa]/40 hover:bg-[#a78bfa]/10 hover:text-white transition-colors"
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={
                            m.role === 'user'
                                ? 'bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm text-white max-w-[85%] ml-auto'
                                : 'bg-[#0f172a] border border-[#a78bfa]/15 rounded-lg px-3 py-2 text-sm text-slate-200 max-w-[92%]'
                        }
                    >
                        {m.role === 'assistant' ? (
                            <div className="leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:text-white [&_strong]:font-semibold [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-2 [&_h3]:mb-1 [&_code]:bg-[#1e293b] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[12px] [&_code]:text-[#00d4ff]">
                                <ReactMarkdown>{m.content}</ReactMarkdown>
                            </div>
                        ) : (
                            m.content
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="bg-[#0f172a] border border-[#a78bfa]/15 rounded-lg px-3 py-2 text-sm text-slate-400 max-w-[92%] flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#a78bfa]" />
                        <span>{progress ?? 'Thinking…'}</span>
                    </div>
                )}

                {error && (
                    <div className="bg-[#ff4444]/10 border border-[#ff4444]/30 rounded-lg px-3 py-2 text-xs text-[#ff8888]">
                        {error}
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <form
                onSubmit={onSubmit}
                className="px-4 py-3 border-t border-[#1f2937] bg-[#0f172a]/30 flex gap-2"
            >
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={hasKey ? "Ask about a ticker, fund, sector, or this week's moves…" : 'Add your Gemini key above to start asking…'}
                    disabled={loading || !hasKey}
                    className="flex-1 bg-[#0a0f1e] border border-[#1f2937] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#a78bfa]/60 focus:ring-1 focus:ring-[#a78bfa]/30 disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim() || !hasKey}
                    className="px-3 py-2 rounded-lg bg-[#a78bfa] hover:bg-[#c4b5fd] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="h-4 w-4 text-[#0a0f1e]" />
                </button>
            </form>
        </div>
    );
}
