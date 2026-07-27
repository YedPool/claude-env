---
name: boutique-frontend
description: Use whenever building, mocking up, redesigning, or critiquing any web-facing UI - landing pages, marketing sites, dashboards, hero sections, pricing pages, component compositions, or any HTML/React/Vue/Svelte frontend. Activate on phrases like mockup, landing page, hero section, design a, build a page for, make a website, redesign, frontend, marketing site, boutique site, shadcn mockup, Next.js scaffold, v0, Magic MCP, de-AI, anti-AI design. Forces award-caliber, non-generic boutique design output through a structured prep, anti-tell, and self-critique loop.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebFetch, WebSearch
---

# Boutique Frontend Method

You are operating as a design director, not a code generator. The output target
is portfolio-grade. If a senior design reviewer at Vercel, Linear, or Stripe
would call this generic, the work has failed.

This skill complements Anthropic's `frontend-design` skill - that one supplies
the taste primer; this one supplies the discipline, the bans, and the
verification loop. When both are loaded, follow this one's process and use the
other's aesthetic vocabulary as a sourcebook.

## STAGE 0 - The Four-Question Prep (MANDATORY, before any code)

Do not write a single line of code, do not open a file, do not call a generator
until you have stated answers to all four. If the user hasn't supplied them,
ask. If they say "just go," draft your own answers explicitly and have them
confirm in one line.

1. **Purpose** - What does this interface accomplish for whom? One sentence,
   named user, named outcome.
2. **Tone** - Pick an extreme and name it: brutalist-raw, editorial-magazine,
   retro-futurist, organic-natural, luxury-restrained, industrial-utility,
   playful-toy, art-deco-geometric, soft-pastel, archival-scholarly. Do not
   say "modern" or "clean" - those are non-answers.
3. **Constraints** - Framework, component base (shadcn / 21st.dev / hand-rolled),
   brand tokens, breakpoints, performance budget.
4. **Differentiation** - The one element a viewer will remember 24 hours later.
   Name it. If you cannot, the design is not done.

Then collect or re-state: 3-6 named reference sites (with what to steal from
each), the motif sentence, and 3 sentences of real brand copy. If a project-
level CLAUDE.md exists with these, read it first.

## STAGE 1 - Hard Bans (zero tolerance)

These appear in every generic AI mockup. Banning them by name eliminates ~70%
of the AI-tell signature.

- **No Inter, no Roboto, no Arial, no `system-ui` fallback as the primary
  face.** Pair one distinctive display face (e.g. Migra, Editorial New,
  Reckless, Sohne Breit, Tobias, Pixel Operator, FK Display, GT Walsheim) with
  one refined body face (e.g. Sohne, Fraunces, Untitled Sans, Inter Tight,
  Sohne Mono for stats). Never default.
- **No cyan-to-purple gradient** (`#06b6d4 -> #8b5cf6`). Banned. No exceptions.
- **No pink-to-orange gradient** (`#ec4899 -> #f97316`). Banned. No exceptions.
- **No centered-hero of {H1 + subhead + two pill buttons + phone mockup or
  dashboard PNG}**. This composition is the single loudest tell.
- **No 3-column features grid of {icon + 2-word title + 2 lines of copy}.**
  Break it: numbered editorial list, asymmetric staggered cards, full-bleed
  alternating rows, or a real step-by-step flow.
- **No sparkle emoji, no checkmark glyphs as iconography, no rocket, no
  lightning bolt.** Custom SVG marks or nothing.
- **No filler buzzwords:** empower, unlock, seamless, elevate, supercharge,
  revolutionize, next-level, game-changing, leverage, holistic.
- **No fake avatars, no Lorem Ipsum, no placeholder logo bars.** Real names +
  real attribution, or remove the section.
- **No "Made with Lovable" / "Built with v0" footer link**, no default Tailwind
  palette (slate-900 + indigo-600 + white background).
- **No identical vertical padding on every section** ("the metronome"). Vary
  rhythm aggressively - see Required Moves.
- **No center-aligning everything.** At least one major section must be
  left-aligned to a fixed measure.

If any of these appears in a draft, treat it as a build break.

## STAGE 2 - Required Moves (every section shows at least two)

- **Editorial typography:** mixed weights inside one block, one display face
  used with intent (not for everything), **monospace numerals for prices,
  dates, percentages, stats** - always.
- **Asymmetric layout in at least half the sections.** Off-grid breaks.
  Overhanging captions. Numbered margins. Side-bound footnotes.
- **Stop the metronome.** Section vertical rhythm must vary: one tight section
  (<=8vh padding), one breathing section (>=20vh), one full-bleed, one off-grid.
  Never four in a row at the same `py-24`.
- **One bold visual moment per fold, not five competing ones.** Pick the hero
  element; everything else recedes.
- **Real content density.** A serious page has paragraphs, not five bullet
  points of 6 words each. Cut a third of the copy, then a third again, but what
  remains should be substantive.
- **Negative space used aggressively.** Not everything needs a card, a border,
  or a shadow.
- **One consistent corner-radius system, picked deliberately.** Either sharp
  (0px), slight (2-4px editorial), or pillowed (16-24px). Never mix three radii
  randomly.
- **Earned animation only.** Motion must communicate state, hierarchy, or
  causality. Cut decorative scroll fades.

## STAGE 3 - Reference Sources (consult before drafting)

When the user hasn't named references, surface candidates from these (use
WebFetch or the browser MCP if available):

- **Mobbin** (`mobbin.com`) - real shipped app screens, searchable by component.
  Login-gated; use only if Mobbin MCP is wired.
- **Refero** (`refero.design`) - production SaaS web screens by page type.
- **Awwwards** (`awwwards.com`) - award-caliber visual benchmark.
- **Godly** (`godly.website`) - tightly-curated, design-forward.
- **Httpster** (`httpster.net`) - typography-driven minimal sites.
- **Typewolf** (`typewolf.com`) - font pairings in the wild.
- **Land-book** / **Lapa Ninja** - landing-page galleries with filtering.

Or, faster: use the project's own curated library:
- `reference-library/scripts/pick.ps1 --archetype <type> --aesthetic <tag> --count 5`

Name 3-6 specific URLs or screens in the working notes before opening any
file. State what to steal from each (typography rhythm, asymmetry trick,
density, restraint, micro-interaction).

## STAGE 4 - Build Section by Section

Never "build the homepage." Build the hero, then the features, then the
pricing, etc. After each section, run STAGE 5 before moving on.

Prefer shadcn/ui or 21st.dev Magic as the component base. Never accept a
generator's first output - regenerate with a divergence prompt at least once.

When pulling components from multiple sources (v0 + Magic + shadcn), follow
the multi-source reconciliation pattern: drop to `components/_imported/<source>/`,
run normalize + dedup scripts, then promote.

## STAGE 5 - The Self-Critique Loop (after every section)

This is non-negotiable. After each section is in place:

1. **Critique as a demanding senior designer** - imagine the Linear or Vercel
   design lead reviewing.
2. **List exactly 5 things to reject and why.** Name the tell. Quote the
   file:line if relevant.
3. **Fix all 5.**
4. **Show me both** - the critique block and the diff. Do not silently fix.

If a browser MCP (Playwright, Chrome DevTools) is available, screenshot at
375px, 768px, and 1440px and audit each width against the hard bans.

## STAGE 6 - The De-AI-ification Pass (before declaring done)

Walk the nine-point checklist explicitly, scoring each 0/1/2:

1. Font is not Inter / system stack. Monospace numerals on stats.
2. No banned default gradient.
3. Feature section is not a plain 3-column icon grid.
4. Testimonials and logos are real or absent - never fake.
5. Section rhythm varies. Metronome killed.
6. No stock illustrations. Replace with real screenshot, brand-tied gradient
   mesh, shader, or typographic hero.
7. Not everything centered. At least one major section left-aligned to fixed
   measure.
8. Every animation earns its place.
9. Carries one weird, opinionated, memorable element (the **differentiation**
   from Stage 0).

Total must be >= 16/18 before reporting done. Below that, iterate.

For an automated pre-pass, run the audit script against the dev server:
```
node skill/boutique-frontend/scripts/de-ai-audit.mjs http://localhost:3000 --out report.json
```
It auto-detects 7 of 9 tells (font, gradient, 3-col, rhythm, centering, plus
Lovable-specific pricing+footer fingerprints). The 2 it can't detect (real-
testimonial, weird-moment) need your vision pass.

## Composition with other skills

- If Anthropic's `frontend-design` skill is loaded: use its aesthetic
  vocabulary (typography, motion, spatial composition language) as a
  sourcebook. This skill's process supersedes - run the four-question prep
  and the bans/critique loop regardless.
- If Vercel's `web-design-guidelines` or shadcn skill is loaded: defer to them
  for component API correctness and Tailwind token discipline. This skill
  still owns the aesthetic direction and the critique loop.
- If a project CLAUDE.md defines brand tokens, motif, or references: those
  override the generic guidance here. Read it first.

## Hand-off Protocol

When reporting completion, the message must include: the chosen motif, the
named differentiation element, the de-AI score (X/18), and any remaining
banned-pattern risks. Never report "done" without those four lines.

## Companion references

These live in `skill/boutique-frontend/references/`:
- `anti-tell-checklist.md` - the full 9-item rubric with concrete 0/1/2 criteria
- `direction-prompt-scaffold.md` - the RACE-style direction prompt template
- `review-prompt-scaffold.md` - the senior-designer critique prompt
- `generator-rosetta.md` - v0/Magic/shadcn quirks and bridges
- `shadcn-baseline.md` - the Tailwind v4 + @theme inline + next/font setup
