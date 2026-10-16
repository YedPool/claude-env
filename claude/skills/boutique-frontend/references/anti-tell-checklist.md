# Anti-Tell Checklist (de-AI rubric)

The 9 tells that mark a site as AI-generic. Score each 0 (present), 1 (partly
addressed), 2 (fully avoided). Total must be >= 16/18 before declaring done.

This is the same source-of-truth the `de-ai-audit.mjs` script references by
rule ID. Don't fork it - edit this file, regenerate the script if needed.

## 1. Typography (NOT default Inter / system stack)
- **0:** Inter or `system-ui, -apple-system, ...` on body and headings.
- **1:** One distinctive display face on headings, body still Inter/system.
- **2:** Distinct display + body pairing (e.g., Fraunces + Inter Tight, or
  Tobias + Sohne), with intentional weight contrast. Monospace numerals
  (e.g., Sohne Mono, Berkeley Mono, JetBrains Mono) on prices/dates/stats.

**Fix hint:** pick an editorial display face. Tobias, FK Display, GT Walsheim,
Migra, Editorial New, Reckless, Sohne Breit, Pixel Operator.

## 2. Gradient (NOT cyan->violet, NOT pink->orange)
- **0:** Banned default gradient anywhere on the page. Hex paths:
  - cyan->violet: `#06b6d4 -> #8b5cf6` (hue 170-220 -> 250-290)
  - pink->orange: `#ec4899 -> #f97316` (hue 300-350 -> 10-45)
- **1:** Gradient exists but stops shifted off-brand.
- **2:** No default gradient. Flat surfaces, brand-tied mesh, or typographic
  hero instead.

**Fix hint:** drop to flat, or shift one stop 30deg off the AI default, or use
a brand-photographed mesh.

## 3. Feature grid (NOT 3-column icon+title+2 lines)
- **0:** Section with exactly 3 sibling cards, each containing icon + heading +
  2 lines of copy, all roughly equal width.
- **1:** 3 columns but one is intentionally weighted differently.
- **2:** Numbered editorial list, asymmetric staggered cards, full-bleed
  alternating rows, or a real step-by-step flow.

**Fix hint:** convert to numbered editorial, or break to 2+1 asymmetric, or
single-column with side captions.

## 4. Testimonials & logos (real or absent, NEVER fake)
- **0:** Faceless avatars, generic names, no last names, no company, or
  obviously stock-photo avatars. Logo bar with placeholders.
- **1:** Real attribution but no avatar.
- **2:** Real testimonials with verifiable names and faces, or section absent.

**Fix hint:** remove the section unless you have real customers. Plain
attributed quote beats a faceless avatar.

## 5. Section rhythm (NOT a metronome)
- **0:** Every section has identical vertical padding (e.g., all `py-24`).
  Coefficient of variation < 0.15 across 4+ sections.
- **1:** Two distinct rhythms used (e.g., default + one breathing section).
- **2:** Three+ rhythms composed: tight (<=8vh), breathing (>=20vh), full-bleed,
  off-grid. Each adjacent section differs.

**Fix hint:** measure all section padding. If they're all within 10%, break
the pattern by inserting one full-bleed or one sharply shorter section.

## 6. Stock illustrations (NOT undraw / Storyset / generic SaaS art)
- **0:** unDraw / Storyset / Humaaans / IRA Design / generic isometric SaaS
  illustration. Blob people. Faceless cartoon figures.
- **1:** Custom but generic imagery.
- **2:** Real screenshot, brand-tied photography, brand-tied gradient mesh,
  typographic hero, or shader.

**Fix hint:** kill the illustration. If you need a visual, screenshot the
actual product, generate a brand-tied photograph via Nano Banana Pro, or
make the typography itself the hero.

## 7. Centering (NOT everything centered)
- **0:** >= 60% of major sections have center-aligned text/content.
- **1:** Hero centered but body sections asymmetric.
- **2:** At least one major section left-aligned to a fixed measure
  (e.g., 720px max-width, left margin). Mixed alignment used purposefully.

**Fix hint:** pick the highest-information section (usually features or
pricing) and move it to left-aligned. Set a real measure (60-75 characters
per line).

## 8. Animation (every motion communicates)
- **0:** Decorative scroll fades, idle pulses, parallax-for-its-own-sake,
  spinning logos with no semantic.
- **1:** Most motion communicates; one or two decorative pieces remain.
- **2:** Every motion ties to state, hierarchy, or causality. No motion
  exists "for the vibe."

**Fix hint:** for each animation, answer: "what does this communicate?"
If the answer is "nothing" or "modernity," cut it.

## 9. Weird, opinionated, memorable element
- **0:** No single moment is unconventional. The page is competent and
  forgettable.
- **1:** One mildly unusual choice (e.g., unconventional crop).
- **2:** A specific, named, intentional weird moment - hand-drawn underline,
  off-axis crop, real photo with non-stock framing, broken grid, typographic
  hero with no image, full-bleed color block where you'd expect a card.

**Fix hint:** if scoring 0, you don't have a real design yet. Pick ONE thing
that breaks the template and execute it boldly.

## Lovable-specific bonus tells (auto-detect, instant fails)

These mark generated-by-Lovable output. Any presence = -2 to total.

- **L1: Gradient + centered hero composition** - the default Lovable hero.
- **L2: Three-tier pricing with middle tier highlighted via ring/scale/shadow.**
- **L3: "Made with Lovable" footer link** present.
