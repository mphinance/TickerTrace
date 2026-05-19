'use client';

/**
 * AskTickerTrace — chat box backed by the /api/chat route, which calls Claude
 * with tool use against the TickerTrace API. The user gets real, grounded
 * answers like "ARK bought 3 names this week, headlined by …" with numbers
 * pulled from our own data.
 */

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Send, Loader2, MessageSquare, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

const STARTER_PROMPTS = [
    'What are institutions buying today?',
    "Who's accumulating GOOGL?",
    'Show me ARK’s biggest moves this week',
    'Do these signals actually make money?',
];

export function AskTickerTrace() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    async function send(text: string) {
        if (!text.trim() || loading) return;
        setError(null);
        const next: ChatMessage[] = [...messages, { role: 'user', content: text.trim() }];
        setMessages(next);
        setInput('');
        setLoading(true);
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: next }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? `HTTP ${res.status}`);
            } else {
                setMessages([...next, { role: 'assistant', content: data.reply }]);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }

    function onSubmit(e: FormEvent) {
        e.preventDefault();
        void send(input);
    }

    return (
        <div className="bg-gradient-to-br from-[#111827] to-[#0f1729] border border-[#a78bfa]/30 rounded-xl shadow-lg shadow-[#a78bfa]/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1f2937] flex items-center gap-2 bg-[#0f172a]/50">
                <Sparkles className="h-4 w-4 text-[#a78bfa]" />
                <h2 className="text-sm font-bold text-white">Ask TickerTrace</h2>
                <span className="text-[10px] text-slate-500 ml-1">
                    Powered by Claude · grounded in real holdings data
                </span>
            </div>

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
                        <span>Looking through holdings data…</span>
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
                    placeholder="Ask about a ticker, fund, sector, or this week's moves…"
                    disabled={loading}
                    className="flex-1 bg-[#0a0f1e] border border-[#1f2937] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#a78bfa]/60 focus:ring-1 focus:ring-[#a78bfa]/30 disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="px-3 py-2 rounded-lg bg-[#a78bfa] hover:bg-[#c4b5fd] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="h-4 w-4 text-[#0a0f1e]" />
                </button>
            </form>
        </div>
    );
}
