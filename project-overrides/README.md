# Project overrides

The global `CLAUDE.md` in `claude/` is project-agnostic on purpose. Any
rule that is specific to one project belongs here, in a per-project
markdown file that gets either:

1. Pasted into that project's repo-level `CLAUDE.md` (recommended), or
2. Symlinked/included from this repo if your project's `CLAUDE.md`
   supports `@import`.

Each file in this folder is the **delta** — the rules you want applied
*only* when working in that specific project, on top of whatever the
global `CLAUDE.md` already says.

## Files

| File | Project |
|------|---------|
| [`orahvision.md`](./orahvision.md) | Orahvision (Windows desktop reader app) — release framework, i18n, voiceover, C# bridge |

## How to apply an override

1. Open the project's repo-level `CLAUDE.md`.
2. Paste the contents of the override file into the appropriate section
   (or replace the existing section if it already contains drift).
3. Commit. The override now applies to anyone working in that repo.

If the project does not yet have a `CLAUDE.md`, create one at the repo
root and use the override as the seed.
