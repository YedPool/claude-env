# Review / Self-Critique Prompt Scaffold

Fire this after every section. The point is to surface what's wrong BEFORE
declaring done, not to validate that nothing's wrong.

## Section-level critique

```
You just built [SECTION_NAME] at [FILE_PATH]. Step out of the implementer
role and become a demanding senior designer reviewing this work for Linear's
or Vercel's design lead.

Look at the rendered output (screenshot at 1440px) AND the source. Find five
things to reject. For each:
- Name the tell or weakness specifically
- Quote the file:line where it lives
- State what a portfolio-grade version would do instead
- Estimate: how long to fix (minutes)

DO NOT be diplomatic. The job is to find what's weak, not to be kind.

After listing the five, fix them. Show me:
- The critique block (5 items)
- The diff (or new file content)
- The before/after at the same screenshot
```

## Pre-completion full-page critique

```
The full mockup is in place. Before reporting done, run the de-ai-ification
pass per anti-tell-checklist.md. For each of the 9 tells:
- Auto-detect using: node skill/boutique-frontend/scripts/de-ai-audit.mjs <dev-url>
- Score 0/1/2 with evidence (screenshot file path or DevTools quote)
- Report the total. Must be >= 16/18.

If below 16, do NOT report done. Iterate on the lowest-scoring tells
specifically. Re-run the audit.

When reporting done, your message must include four lines:
- Motif: [the motif you committed to in Stage 0]
- Differentiation: [the named weird/memorable element]
- De-AI score: [X/18]
- Outstanding risks: [any tells still scoring 1, or "none"]
```

## "Why is this design boring?" diagnostic

When the result is technically correct but emotionally flat:

```
The output is competent but I don't want to bookmark it. Diagnose specifically:
- What is the ONE element a viewer would remember 24 hours later? If you can't
  name one, that's the problem.
- Where is the design AVOIDING a strong choice? Name each hedge.
- If you had to put one piece of this page on a portfolio reel and only ONE,
  which would it be? Why isn't the rest as bold as that one piece?

Then: pick ONE answer from above and rebuild around it. Be willing to break
the rest of the page to make it work.
```

## Cross-breakpoint sanity

```
Capture screenshots at 375, 768, 1440, 1920 (use Playwright MCP).
For each breakpoint:
- Does the hierarchy still read? Or does responsive collapse flatten everything?
- Does the motif still appear, or is it stripped at small widths?
- Is there a horizontal scroll anywhere?
- Does the navigation reposition gracefully or just hide?

Report by breakpoint. Fix the worst one first.
```
