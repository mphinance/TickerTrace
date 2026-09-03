# TickerTrace agent lenses

Five lenses over the same problem: this is a data-dense dashboard that has never
been designed for a phone, and it is heading for Android.

| Agent | Owns | Model |
|---|---|---|
| `phone-audit` | The 375px reality check. Run this first on any page change. | sonnet |
| `table-fork` | What each wide table *becomes* on a phone, instead of horizontal scroll by default. | opus |
| `sticky-warden` | Sticky positioning, scroll regions, z-index. Failures here are silent. | sonnet |
| `android-scout` | The path to Android — PWA now, Expo when warranted. Steals from `tradernetwork/PatternPulse`. | opus |
| `funnel-guard` | The conversion path. No ads; TickerTrace funnels to TraderMatrix.pro on referral. | sonnet |

Typical order: `phone-audit` finds it → `table-fork` decides the shape → `phone-audit`
implements → `sticky-warden` checks nothing stopped sticking. `funnel-guard` gates any
CTA change. `android-scout` is a planning lens, not a build lens.

## Dependency: the `responsive-craft` skill

The first four reference a skill installed at `~/.claude/skills/responsive-craft/`
(from `github.com/kylezantos/responsive-craft`). **It is machine-local and not
vendored here** — upstream ships no LICENSE, so it is not checked in.

If you are running these on a machine without it, the agents still work: their
Ground Truth sections carry the specific findings, and the skill references degrade
to unavailable rather than breaking anything. You lose the reference material
(`ai-failure-patterns.md`, `responsive-design-forks.md`, `sticky-scroll-patterns.md`),
not the instructions.

## What these were seeded from

Two audits, so the agents start from fact rather than re-deriving:

- **`etf-dashboard/`** — 14 routes; responsive prefixes in ~2/3 of 55 tsx files; eight
  wide tables all wrapped in `overflow-x-auto`; three unconditional `grid-cols-3`/`-4`;
  no manifest, no `viewport` export, no PWA affordances. `site-nav.tsx` and
  `activity-heatmap.tsx` have already had real mobile work done — they are references,
  not targets. `whop-app/` is a separate Next app sharing no components.
- **`tradernetwork/PatternPulse`** — Expo 52 / RN 0.76.9 / expo-router / Skia. The EAS
  build+OTA workflow pair and `CandlestickChart.tsx` are the two things worth copying.

Both audits are summarized inline in the relevant agent files.
