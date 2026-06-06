'use client';

import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Dark-theme markdown renderer for research briefs. GFM enabled (the briefs
 * lean heavily on tables). Styled to match the rest of the app rather than
 * relying on a typography plugin we don't ship.
 */
const components: Components = {
    h1: ({ ...p }) => <h1 className="text-2xl font-black text-white mt-8 mb-3" {...p} />,
    h2: ({ ...p }) => (
        <h2 className="text-lg font-bold text-white mt-8 mb-3 pb-2 border-b border-[#1f2937]" {...p} />
    ),
    h3: ({ ...p }) => <h3 className="text-sm font-bold uppercase tracking-wider text-[#00d4ff] mt-6 mb-2" {...p} />,
    p: ({ ...p }) => <p className="text-sm text-slate-300 leading-relaxed my-3" {...p} />,
    ul: ({ ...p }) => <ul className="list-disc pl-5 my-3 space-y-1.5 text-sm text-slate-300" {...p} />,
    ol: ({ ...p }) => <ol className="list-decimal pl-5 my-3 space-y-1.5 text-sm text-slate-300" {...p} />,
    li: ({ ...p }) => <li className="leading-relaxed" {...p} />,
    a: ({ ...p }) => (
        <a className="text-[#00d4ff] hover:underline" target="_blank" rel="noopener noreferrer" {...p} />
    ),
    strong: ({ ...p }) => <strong className="text-white font-semibold" {...p} />,
    em: ({ ...p }) => <em className="text-slate-400" {...p} />,
    hr: () => <hr className="border-[#1f2937] my-6" />,
    blockquote: ({ ...p }) => (
        <blockquote className="border-l-2 border-[#00d4ff]/40 pl-4 my-4 text-slate-400 italic" {...p} />
    ),
    code: ({ ...p }) => (
        <code className="bg-[#1e293b] px-1.5 py-0.5 rounded text-[#00d4ff] font-mono text-xs" {...p} />
    ),
    table: ({ ...p }) => (
        <div className="overflow-x-auto my-5 rounded-lg border border-[#1f2937]">
            <table className="w-full text-sm border-collapse" {...p} />
        </div>
    ),
    thead: ({ ...p }) => <thead className="bg-[#0f172a]" {...p} />,
    th: ({ ...p }) => (
        <th className="text-left font-semibold px-3 py-2.5 text-xs uppercase tracking-wider text-slate-400 border-b border-[#1f2937]" {...p} />
    ),
    td: ({ ...p }) => <td className="px-3 py-2.5 text-slate-300 border-b border-[#1f2937]/60 align-top" {...p} />,
    tr: ({ ...p }) => <tr className="hover:bg-[#1a2333]/40" {...p} />,
};

export function Markdown({ children }: { children: string }) {
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {children}
        </ReactMarkdown>
    );
}
