/**
 * Multi-provider chat adapter layer for Ask TickerTrace.
 *
 * Each provider has a slightly different tool-use shape; the adapters here
 * normalize that. The UI just picks a provider and the adapter handles the
 * details — request body shape, tool-call wire format, multi-turn loop.
 *
 * All providers are called direct from the browser. The user's API key
 * never touches our server. We pay nothing per query.
 */

export type ProviderId = 'gemini' | 'anthropic' | 'openai' | 'openrouter';

export interface ChatTurn {
    role: 'user' | 'assistant';
    content: string;
}

export interface ProviderMeta {
    id: ProviderId;
    label: string;
    defaultModel: string;
    keyPlaceholder: string;
    signupUrl: string;
    description: string;
}

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
    gemini: {
        id: 'gemini',
        label: 'Gemini',
        defaultModel: 'gemini-2.5-flash',
        keyPlaceholder: 'AIza…',
        signupUrl: 'https://aistudio.google.com/app/apikey',
        description: 'Free tier on Google AI Studio is generous. Best default for cheap, fast Q&A.',
    },
    anthropic: {
        id: 'anthropic',
        label: 'Anthropic',
        defaultModel: 'claude-haiku-4-5',
        keyPlaceholder: 'sk-ant-…',
        signupUrl: 'https://console.anthropic.com/settings/keys',
        description: 'Higher quality, slightly pricier. Try claude-haiku-4-5 for fast, or claude-sonnet-4-5 for deep questions.',
    },
    openai: {
        id: 'openai',
        label: 'OpenAI',
        defaultModel: 'gpt-4o-mini',
        keyPlaceholder: 'sk-…',
        signupUrl: 'https://platform.openai.com/api-keys',
        description: 'Standard OpenAI key. gpt-4o-mini is plenty for these questions.',
    },
    openrouter: {
        id: 'openrouter',
        label: 'OpenRouter',
        defaultModel: 'google/gemini-2.5-flash',
        keyPlaceholder: 'sk-or-…',
        signupUrl: 'https://openrouter.ai/keys',
        description: 'One key, any model — Anthropic, OpenAI, Google, Meta, Mistral, etc. Great if you already have OpenRouter set up.',
    },
};

/** Common tool spec — the same shape we pass to every provider. The
 *  adapters reshape it to each provider's native function-calling format. */
export interface CommonTool {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
}

const MAX_TOOL_ITERATIONS = 6;

interface RunArgs {
    provider: ProviderId;
    apiKey: string;
    model: string;
    systemPrompt: string;
    history: ChatTurn[];
    tools: CommonTool[];
    callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
    onProgress?: (msg: string) => void;
}

/** Top-level entry point. Dispatches to the right adapter and runs the
 *  multi-turn tool-use loop until the model returns a text-only answer. */
export async function runChat(args: RunArgs): Promise<string> {
    switch (args.provider) {
        case 'gemini': return runGemini(args);
        case 'anthropic': return runAnthropic(args);
        case 'openai':
        case 'openrouter': return runOpenAICompat(args);
    }
}

// ─── Gemini ─────────────────────────────────────────────────────────────────

interface GeminiPart {
    text?: string;
    functionCall?: { name: string; args?: Record<string, unknown> };
    functionResponse?: { name: string; response: Record<string, unknown> };
}
interface GeminiContent {
    role: 'user' | 'model';
    parts: GeminiPart[];
}

async function runGemini(args: RunArgs): Promise<string> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent`;
    const contents: GeminiContent[] = args.history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
    }));

    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
        const res = await fetch(`${endpoint}?key=${encodeURIComponent(args.apiKey)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                systemInstruction: { parts: [{ text: args.systemPrompt }] },
                tools: [{ functionDeclarations: args.tools }],
                generationConfig: { temperature: 0.4, maxOutputTokens: 1500 },
            }),
        });
        if (!res.ok) throw new Error(await extractError(res, 'Gemini'));
        const data = await res.json();
        const candidate = data.candidates?.[0];
        if (!candidate) throw new Error('Gemini returned no candidates (possibly blocked by safety filters).');
        const parts: GeminiPart[] = candidate.content?.parts ?? [];

        const calls = parts.filter(p => p.functionCall);
        if (calls.length === 0) {
            return parts.map(p => p.text ?? '').join('\n').trim();
        }
        args.onProgress?.(`Looking up ${calls.map(c => c.functionCall!.name).join(', ')}…`);
        contents.push({ role: 'model', parts });
        const responses: GeminiPart[] = [];
        for (const c of calls) {
            const result = await args.callTool(c.functionCall!.name, c.functionCall!.args ?? {});
            responses.push({
                functionResponse: {
                    name: c.functionCall!.name,
                    response: { result },
                },
            });
        }
        contents.push({ role: 'user', parts: responses });
    }
    return '(Too many tool calls without converging — try rephrasing?)';
}

// ─── Anthropic ──────────────────────────────────────────────────────────────

interface AnthropicContentBlock {
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
    tool_use_id?: string;
    content?: string;
}
interface AnthropicMessage {
    role: 'user' | 'assistant';
    content: AnthropicContentBlock[] | string;
}

async function runAnthropic(args: RunArgs): Promise<string> {
    const endpoint = 'https://api.anthropic.com/v1/messages';
    const messages: AnthropicMessage[] = args.history.map(h => ({
        role: h.role,
        content: h.content,
    }));
    const anthropicTools = args.tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
    }));

    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': args.apiKey,
                'anthropic-version': '2023-06-01',
                // Required for browser-direct calls.
                'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
                model: args.model,
                max_tokens: 1500,
                system: args.systemPrompt,
                tools: anthropicTools,
                messages,
            }),
        });
        if (!res.ok) throw new Error(await extractError(res, 'Anthropic'));
        const data = await res.json();
        const content: AnthropicContentBlock[] = data.content ?? [];
        const toolUses = content.filter(b => b.type === 'tool_use');

        if (data.stop_reason !== 'tool_use' || toolUses.length === 0) {
            return content.filter(b => b.type === 'text').map(b => b.text ?? '').join('\n').trim();
        }
        args.onProgress?.(`Looking up ${toolUses.map(b => b.name).join(', ')}…`);
        messages.push({ role: 'assistant', content });
        const toolResults: AnthropicContentBlock[] = [];
        for (const tu of toolUses) {
            const result = await args.callTool(tu.name!, tu.input ?? {});
            toolResults.push({
                type: 'tool_result',
                tool_use_id: tu.id!,
                content: JSON.stringify(result),
            });
        }
        messages.push({ role: 'user', content: toolResults });
    }
    return '(Too many tool calls without converging — try rephrasing?)';
}

// ─── OpenAI / OpenRouter ────────────────────────────────────────────────────

interface OpenAIToolCall {
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
}
interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string | null;
    tool_calls?: OpenAIToolCall[];
    tool_call_id?: string;
}

async function runOpenAICompat(args: RunArgs): Promise<string> {
    const endpoint = args.provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
    const messages: OpenAIMessage[] = [
        { role: 'system', content: args.systemPrompt },
        ...args.history.map(h => ({ role: h.role, content: h.content })),
    ];
    const oaiTools = args.tools.map(t => ({
        type: 'function' as const,
        function: { name: t.name, description: t.description, parameters: t.parameters },
    }));

    const extraHeaders: Record<string, string> = {};
    if (args.provider === 'openrouter') {
        // OpenRouter rate-prioritizes requests with these. Not secrets.
        extraHeaders['HTTP-Referer'] = 'https://tickertrace.pro';
        extraHeaders['X-Title'] = 'TickerTrace';
    }

    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${args.apiKey}`,
                ...extraHeaders,
            },
            body: JSON.stringify({
                model: args.model,
                messages,
                tools: oaiTools,
                temperature: 0.4,
                max_tokens: 1500,
            }),
        });
        if (!res.ok) throw new Error(await extractError(res, args.provider === 'openrouter' ? 'OpenRouter' : 'OpenAI'));
        const data = await res.json();
        const msg: OpenAIMessage | undefined = data.choices?.[0]?.message;
        if (!msg) throw new Error('Provider returned no message');

        const calls = msg.tool_calls ?? [];
        if (calls.length === 0) {
            return (msg.content ?? '').trim();
        }
        args.onProgress?.(`Looking up ${calls.map(c => c.function.name).join(', ')}…`);
        // Push the assistant message (with tool_calls) so the model has context.
        messages.push({ role: 'assistant', content: msg.content ?? null, tool_calls: calls });
        for (const c of calls) {
            let parsedArgs: Record<string, unknown> = {};
            try { parsedArgs = JSON.parse(c.function.arguments || '{}'); } catch { /* model malformed */ }
            const result = await args.callTool(c.function.name, parsedArgs);
            messages.push({
                role: 'tool',
                tool_call_id: c.id,
                content: JSON.stringify(result),
            });
        }
    }
    return '(Too many tool calls without converging — try rephrasing?)';
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

async function extractError(res: Response, provider: string): Promise<string> {
    const body = await res.text().catch(() => '');
    try {
        const parsed = JSON.parse(body);
        const msg = parsed?.error?.message ?? parsed?.error ?? parsed?.message;
        if (msg) return `${provider} ${res.status}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`;
    } catch { /* keep raw */ }
    return `${provider} ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`;
}
