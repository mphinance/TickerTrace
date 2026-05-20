#!/usr/bin/env python3
"""
HyperNet N1 SDC — Constellation Code Review for TickerTrace
Routes the codebase to 5 parallel AI lanes via OpenRouter, then synthesizes.
"""

import asyncio
import json
import time
import os
from pathlib import Path

import httpx

# ═══════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "YOUR_OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

LANES = {
    "Lola (GPT-4o)": "openai/gpt-4o",
    "Claude (Sonnet)": "anthropic/claude-sonnet-4",
    "Grok": "x-ai/grok-3",
    "Deep (Llama)": "meta-llama/llama-3.3-70b-instruct",
    "Gemini (Flash)": "google/gemini-2.5-flash",
}

ROUTER_MODEL = "google/gemini-2.5-flash"  # Fast + cheap for synthesis

LANE_TEMP = 0.2    # Code review = low temp
ROUTER_TEMP = 0.1  # Synthesis = even lower
MAX_TOKENS = 4096
TIMEOUT = 60  # seconds per lane

# ═══════════════════════════════════════════════
# CODEBASE CONTEXT ASSEMBLY
# ═══════════════════════════════════════════════

PROJECT_ROOT = Path(__file__).parent

FILES_TO_INCLUDE = [
    "scrape_avantis.py",
    "cusip_lookup.py",
    "api/server.py",
    "api/data.py",
    "api/auth.py",
    "etf-dashboard/lib/holdings.ts",
    "etf-dashboard/lib/firebase.ts",
    "etf-dashboard/components/auth-context.tsx",
]


def assemble_codebase() -> str:
    """Read all source files into a single context block."""
    parts = []
    for rel_path in FILES_TO_INCLUDE:
        full = PROJECT_ROOT / rel_path
        if full.exists():
            content = full.read_text(encoding="utf-8")
            parts.append(f"### FILE: {rel_path}\n```\n{content}\n```\n")
        else:
            parts.append(f"### FILE: {rel_path}\n[FILE NOT FOUND]\n")
    return "\n".join(parts)


# ═══════════════════════════════════════════════
# PROMPTS
# ═══════════════════════════════════════════════

LANE_SYSTEM_PROMPT = """You are one of five expert AI models in a parallel consultation system reviewing a Python/TypeScript codebase.
Provide your BEST, most accurate architectural review.

Rules:
- Be thorough but concise
- Call out edge cases explicitly
- Show your reasoning with specific file names and line references
- Commit to your answer — do not hedge excessively
- Prioritize findings by severity: CRITICAL > HIGH > MEDIUM > LOW
- Focus on: bugs, logic errors, concurrency issues, security, type safety, and architectural problems
- For each finding, provide the EXACT fix (code snippet or clear instruction)"""

LANE_USER_PROMPT_TEMPLATE = """Review this codebase for a financial intelligence dashboard called TickerTrace.

Architecture: Python scraper (beautifulsoup/pandas) → SQLite DB + CSVs → FastAPI backend → Next.js frontend (Vercel).

Your job is to find bugs, security vulnerabilities, or logic errors that we might have missed.

Provide a numbered list of findings, each with:
1. SEVERITY (CRITICAL/HIGH/MEDIUM/LOW)
2. FILE + FUNCTION
3. ISSUE description
4. EXACT FIX

Focus on production-breaking bugs, security vulnerabilities (auth/API keys), and architectural problems.

CODEBASE:
{codebase}"""

ROUTER_SYSTEM_PROMPT = """You are the HyperNet N1 SDC Router — the Central Processing Node.
You received responses from 5 top-tier AI models reviewing the same codebase.

Your task:
1. Read all 5 responses carefully
2. Identify findings that MULTIPLE models agree on — these are highest confidence
3. Identify unique findings that only ONE model caught — evaluate if they're correct
4. Identify ERRORS or HALLUCINATIONS in any response and discard them
5. Synthesize a single, prioritized action plan BETTER than any individual response

Rules:
- Do NOT average the responses
- If one model catches a critical bug others missed, INCLUDE it (after verifying)
- If models disagree on severity, evaluate which is correct
- Merge duplicate findings and cite which models caught them
- Your output should be the definitive action plan

Output format:
## CRITICAL (Must Fix Before Release)
## HIGH (Fix Soon)  
## MEDIUM (Refactor When Convenient)
## LOW (Nice to Have)

For each item: description, affected files, exact fix, which lanes caught it."""

ROUTER_USER_PROMPT_TEMPLATE = """Here are the 5 independent code reviews from the constellation:

{lane_outputs}

Synthesize the optimal, deduplicated action plan. Be specific about files, functions, and exact code changes."""

# ═══════════════════════════════════════════════
# API CALLS
# ═══════════════════════════════════════════════

async def call_lane(client: httpx.AsyncClient, lane_name: str, model: str, codebase: str) -> dict:
    """Call a single lane via OpenRouter."""
    print(f"  🚀 Dispatching: {lane_name} ({model})")
    start = time.time()

    payload = {
        "model": model,
        "temperature": LANE_TEMP,
        "max_tokens": MAX_TOKENS,
        "messages": [
            {"role": "system", "content": LANE_SYSTEM_PROMPT},
            {"role": "user", "content": LANE_USER_PROMPT_TEMPLATE.format(codebase=codebase)},
        ],
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://tickertrace.local",
        "X-Title": "TickerTrace Constellation Review",
        "Content-Type": "application/json",
    }

    try:
        resp = await client.post(OPENROUTER_URL, json=payload, headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        elapsed = time.time() - start
        print(f"  ✅ {lane_name} returned ({elapsed:.1f}s, {len(content)} chars)")
        return {"lane": lane_name, "model": model, "content": content, "elapsed": elapsed, "error": None}
    except Exception as e:
        elapsed = time.time() - start
        print(f"  ❌ {lane_name} FAILED ({elapsed:.1f}s): {e}")
        return {"lane": lane_name, "model": model, "content": "", "elapsed": elapsed, "error": str(e)}


async def call_router(client: httpx.AsyncClient, lane_outputs: str) -> str:
    """Call the router model to synthesize all lane outputs."""
    print(f"\n🧠 Router synthesis via {ROUTER_MODEL}...")
    start = time.time()

    payload = {
        "model": ROUTER_MODEL,
        "temperature": ROUTER_TEMP,
        "max_tokens": MAX_TOKENS * 2,
        "messages": [
            {"role": "system", "content": ROUTER_SYSTEM_PROMPT},
            {"role": "user", "content": ROUTER_USER_PROMPT_TEMPLATE.format(lane_outputs=lane_outputs)},
        ],
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://tickertrace.local",
        "X-Title": "TickerTrace Constellation Router",
        "Content-Type": "application/json",
    }

    resp = await client.post(OPENROUTER_URL, json=payload, headers=headers, timeout=120)
    resp.raise_for_status()
    data = resp.json()
    content = data["choices"][0]["message"]["content"]
    elapsed = time.time() - start
    print(f"✅ Router synthesis complete ({elapsed:.1f}s, {len(content)} chars)")
    return content


# ═══════════════════════════════════════════════
# ORCHESTRATOR
# ═══════════════════════════════════════════════

async def run_constellation():
    """Execute the full HyperNet N1 SDC constellation review."""
    print("═" * 60)
    print("  HyperNet N1 SDC — TickerTrace Constellation Review")
    print("═" * 60)

    print("\n📦 Assembling codebase context...")
    codebase = assemble_codebase()
    print(f"   {len(codebase)} chars across {len(FILES_TO_INCLUDE)} files")

    print(f"\n🌐 Dispatching to {len(LANES)} lanes (parallel)...")
    async with httpx.AsyncClient() as client:
        tasks = [
            call_lane(client, name, model, codebase)
            for name, model in LANES.items()
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    successful = []
    for r in results:
        if isinstance(r, Exception):
            print(f"  ⚠️  Lane exception: {r}")
            continue
        if r["error"]:
            continue
        successful.append(r)

    print(f"\n📊 {len(successful)}/{len(LANES)} lanes returned successfully")

    if len(successful) < 3:
        print("❌ Fewer than 3 lanes returned — aborting constellation")
        output_dir = PROJECT_ROOT
        for r in successful:
            fname = output_dir / f"lane_{r['lane'].split('(')[0].strip().lower().replace(' ', '_')}.md"
            fname.write_text(f"# {r['lane']} Review\n\n{r['content']}", encoding="utf-8")
        return

    lane_outputs = "\n\n".join([
        f"### LANE: {r['lane']} ({r['model']})\n{r['content']}"
        for r in successful
    ])

    async with httpx.AsyncClient() as client:
        synthesis = await call_router(client, lane_outputs)

    output_dir = PROJECT_ROOT
    
    for r in successful:
        safe_name = r['lane'].split('(')[0].strip().lower().replace(' ', '_')
        fname = output_dir / f"lane_{safe_name}.md"
        fname.write_text(f"# {r['lane']} Review ({r['elapsed']:.1f}s)\n\n{r['content']}", encoding="utf-8")
        print(f"  💾 Saved: {fname.name}")

    synthesis_file = output_dir / "CONSTELLATION_SYNTHESIS.md"
    synthesis_file.write_text(
        f"# HyperNet N1 SDC — TickerTrace Constellation Synthesis\n\n"
        f"> **Lanes**: {len(successful)}/{len(LANES)} successful\n"
        f"> **Models**: {', '.join(r['lane'] for r in successful)}\n"
        f"> **Date**: {time.strftime('%Y-%m-%d %H:%M')}\n\n"
        f"---\n\n{synthesis}",
        encoding="utf-8",
    )
    print(f"  💾 Saved: {synthesis_file.name}")

    print(f"\n{'═' * 60}")
    print(f"  CONSTELLATION COMPLETE")
    print(f"  {len(successful)} lanes → 1 synthesis")
    print(f"{'═' * 60}")


if __name__ == "__main__":
    asyncio.run(run_constellation())
