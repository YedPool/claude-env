# Generator Rosetta

How to bridge outputs from v0, 21st.dev Magic, shadcn, and Lovable into a
single coherent project. The multi-source reconciliation pattern, distilled.

## The general loop (use this every time you import)

1. **Drop the generated file into `components/_imported/<source>/<name>.tsx`**
   where `<source>` is one of: `v0`, `magic`, `shadcn-blocks`. Never paste
   directly into a feature folder. ESLint blocks app code from importing
   anything under `_imported/`.
2. **Run normalize:** `pnpm run normalize:imported` (or `npm run`).
   Rewrites hardcoded hex colors and font-family strings to CSS variables;
   flags anything ambiguous in `.normalize-warnings.json`.
3. **Run dedup:** `pnpm run dedup:imported`. Rewrites any local `Button`,
   `Card`, `Input`, etc. import to the canonical `@/components/ui/<name>`.
4. **Read the diff** + warnings. Resolve any FLAG entries by hand.
5. **Promote:** move file from `_imported/<source>/` to its final home
   (`components/<feature>/`). Delete the source folder entry.

## Per-generator quirks

### v0

- Ships shadcn primitives baked in. References CSS vars by default - so it's
  nearly free once globals.css is set up.
- **Breaks on:** Geist layout snippet. v0 sometimes emits
  `import { GeistSans } from "geist/font/sans"` in a layout snippet that
  clobbers your custom font wiring. **Always reject the layout snippet.**
  Re-import only the component body.
- **Breaks on:** arbitrary color classes like `bg-[#fafafa]` inline. The
  normalize script catches and flags these.
- **Recommended invocation pattern:** use the `v0-sdk` to generate, then
  `npx shadcn add "<v0 chat URL>"` to materialize. This is the documented v0
  flow and avoids the MCP entirely.

### 21st.dev Magic

- Claims to follow "your existing code style." Empirically: on an empty
  project, falls back to Tailwind defaults (bg-gray-100, text-gray-900, Inter).
- **Recipe:** never invoke Magic against an empty project. Seed `app/globals.css`
  per shadcn-baseline.md AND drop a single canonical `Button` first. Magic
  will read existing token usage and mirror it. Re-run normalize anyway -
  the "existing style" detection is best-effort.
- **MCP-only.** No CLI, no API. Skip if you don't want a $20/mo MCP.

### shadcn CLI

- Canonical primitives. If you've themed via globals.css only (no
  components.json color override), new components inherit themed vars
  automatically.
- **Real gotcha:** running `shadcn add` on Tailwind v3-style projects when
  shadcn now defaults to v4. The CLI writes v4-shaped `@theme inline` blocks
  into globals.css, which v3 ignores silently. Confirm `tailwindcss` major
  version before any `shadcn add`.
- **Preferred path:** `npx shadcn@latest add <name>` instead of the MCP.
  Same outcome, fewer moving parts.
- **Also accepts v0 URLs:** `npx shadcn add "https://v0.dev/chat/b/..."` -
  the v0 + shadcn handoff in one command.

### Lovable

- Not in the build loop, but you might encounter Lovable-generated reference
  material. **The Lovable fingerprint:**
  - Gradient + centered hero (auto-detected by de-ai-audit.mjs as L1)
  - Three-tier pricing with middle tier highlighted via ring/scale/shadow (L2)
  - "Made with Lovable" footer link (L3)
- If any Lovable output enters the project, rip out those three before
  declaring done. The audit script will flag them automatically.

## When to drop a generator

> If three consecutive imports each require >5 manual flag resolutions in
> the normalize script, the generator is now a net cost. Stop using it for
> this project.

The threshold matters because the whole point of the stack is throughput.
A generator that needs 20 minutes of cleanup per component has lost to a
30-minute hand-write from a screenshot.
