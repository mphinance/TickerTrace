import fs from 'node:fs';
import path from 'node:path';

/**
 * Server-only data layer for curated research briefs.
 *
 * Briefs are plain markdown files in `content/research/*.md` with a small
 * YAML-ish frontmatter block (title / ticker / date / summary). They live
 * INSIDE the Next app (not the repo-root `analyses/` folder) on purpose:
 * Vercel's build root is `etf-dashboard/`, so anything outside it isn't
 * readable by the deployed app. Auto-generated daily intel still lives in
 * `analyses/` — this is for hand-written, publish-worthy briefs.
 */

const RESEARCH_DIR = path.join(process.cwd(), 'content', 'research');

export type ResearchMeta = {
    slug: string;
    title: string;
    ticker?: string;
    date: string;
    summary: string;
};

export type ResearchDoc = ResearchMeta & { body: string };

/** Parse a minimal `--- key: "value" ---` frontmatter block (no external dep). */
function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
    const match = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(raw);
    if (!match) return { data: {}, body: raw };
    const data: Record<string, string> = {};
    for (const line of match[1].split('\n')) {
        const m = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line.trim());
        if (!m) continue;
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
        }
        data[m[1]] = v;
    }
    return { data, body: raw.slice(match[0].length) };
}

function metaFromRaw(slug: string, raw: string): ResearchMeta {
    const { data } = parseFrontmatter(raw);
    return {
        slug,
        title: data.title || slug,
        ticker: data.ticker || undefined,
        date: data.date || '',
        summary: data.summary || '',
    };
}

/** All briefs, newest first (ISO date strings sort lexicographically). */
export function listResearch(): ResearchMeta[] {
    let files: string[] = [];
    try {
        files = fs.readdirSync(RESEARCH_DIR).filter(f => f.endsWith('.md'));
    } catch {
        return [];
    }
    return files
        .map(f => metaFromRaw(f.replace(/\.md$/, ''), fs.readFileSync(path.join(RESEARCH_DIR, f), 'utf8')))
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** A single brief by slug, or null if it doesn't exist. */
export function getResearch(slug: string): ResearchDoc | null {
    // Guard against path traversal — slug must be a bare filename.
    if (!/^[A-Za-z0-9_-]+$/.test(slug)) return null;
    let raw: string;
    try {
        raw = fs.readFileSync(path.join(RESEARCH_DIR, `${slug}.md`), 'utf8');
    } catch {
        return null;
    }
    const { body } = parseFrontmatter(raw);
    // Drop the leading H1 — the page renders the title from frontmatter.
    const bodyNoH1 = body.replace(/^#\s+.*\n+/, '');
    return { ...metaFromRaw(slug, raw), body: bodyNoH1 };
}
