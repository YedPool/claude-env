# Global rules for Claude Code

This file is copied to `%USERPROFILE%\.claude\CLAUDE.md` and applies to
every project. Project-specific rules belong in the project's own
`CLAUDE.md`, not here. See `project-overrides/` in the claude-env repo
for examples (e.g., the Orahvision overlay).

## Engineering philosophy

- The days of MVPs are over. Whenever possible, plan projects and
  capabilities to be enterprise-grade software using the
  terraform / unix / vscode-extension / openclaw module philosophy:
  standard interface, self-contained modules, compose freely. Everything
  is clean, organized, and self-contained.
- Always plan to build things in a modular fashion allowing for clean,
  organized, maintainable, and reusable code. Bias towards separating
  code out of large monolith files into organized smaller files.
- Place all imports at the top of the file. In-function imports only to
  break circular deps or defer heavy loads.
- Always explain code in precise English besides for the actual code.
  Do this when debugging, planning implementations, making changes, etc.

## Plan mode default

- Enter plan mode for any non-trivial task (3+ steps or architectural
  decisions).
- If something goes sideways, STOP and re-plan immediately - do not
  keep pushing.
- Use plan mode for verification steps, not just building.
- Write detailed specs upfront to reduce ambiguity.
- If the user requests a change in plan mode, do NOT return to plan mode
  until the user is satisfied that you understand what they want.
- When using plan mode, always save the plan to an appropriately-named
  file in the project's `planning/` directory (e.g.,
  `planning/winterest-initial-architecture.md`). The plan file in
  `.claude/plans/` is ephemeral; the `planning/` directory is the
  permanent record.

## Mentor skill

- When starting any non-trivial work (features, architecture, debugging,
  refactoring, deployment, PRs), ALWAYS invoke the `/mentor` skill before
  proceeding. Do not skip this.

## Subagent strategy

- Use subagents liberally to keep the main context window clean.
- Offload research, exploration, and parallel analysis to subagents.
- For complex problems, throw more compute at it via subagents.
- One task per subagent for focused execution.
- Always run agents in the background and keep the chat clear for the
  next user prompt.

## Self-improvement loop

- After ANY correction from the user, update `tasks/lessons.md` (or the
  project equivalent) with the pattern.
- Write rules for yourself that prevent the same mistake.
- Ruthlessly iterate on these lessons until the mistake rate drops.
- Review lessons at the start of any session that touches the relevant
  project.

## Verification before done

- Never mark a task complete without proving it works.
- Diff behavior between main and your changes when relevant.
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness.

## Demand elegance (balanced)

- For non-trivial changes: pause and ask, "Is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the
  elegant solution."
- Skip this for simple, obvious fixes - do not over-engineer.
- Challenge your own work before presenting it.

## Autonomous bug fixing

- When given a bug report: just fix it. Do not ask for hand-holding.
- Point at logs, errors, failing tests - then resolve them.
- Zero context switching is required from the user.
- Go fix failing CI tests without being told how.

## Task management

- Plan first: write a plan as a checkable task list.
- Verify plan: check in before starting implementation.
- Track progress: mark items complete as you go.
- Explain changes: high-level summary at each step.
- Document results: add a review section to `tasks/todo.md` (or
  project equivalent).
- Capture lessons: update `tasks/lessons.md` after corrections.

## Core principles

- Simplicity first: make every change as simple as possible. Impact
  minimal code.
- No laziness: find root causes. No temporary fixes. Senior developer
  standards.
- Minimal impact: changes should only touch what's necessary. Avoid
  introducing bugs.

## Worktrees

- Always save worktrees for a project into a sibling
  `REPONAME Worktrees` folder, never directly alongside the main repo
  folder. Example: worktrees for the `Orahvision` repo go into
  `Documents/Code/Orahvision Worktrees/`, not into `Documents/Code/`.
- Every time we create a new branch and a new worktree, first update
  the local master worktree with the latest from remote master, then
  create the worktree from the updated master (unless otherwise
  specified).

## Pre-commit checklist

- When finishing a feature or fix, make sure we test it before
  committing to git.
- Before committing, run the project's linter (e.g. `flake8`, `eslint`,
  `golangci-lint`) over the entire codebase and confirm there are no
  critical errors.
- After finishing something, when you want to commit, ASK THE USER to
  test everything. When they confirm everything was tested and working,
  only then create the commit.
- Before committing, check that all planning documents are in the
  `planning/` folder, and all test/debug scripts are in the
  `test_debug/` folder (or the project's equivalents).

## Pull requests + merging

- Use `gh` for PR operations.
- **Use `gh pr merge --merge`** (a REGULAR merge commit). Do NOT
  squash-merge: squashing rewrites the PR into a new commit with no
  ancestry link to the branch commits, which breaks atomic-commit
  parent tracking (`git branch --contains`, bisect, cherry-pick
  provenance) across multi-channel deployments like alpha/beta/stable
  release frameworks. Use `git log --first-parent` when a linear view
  is needed.
- When resolving merge conflicts, summarize and explain your resolutions
  before committing.
- **Never commit directly to master / main.**

## Code style

- No emojis in code. Windows charmap will not tolerate emoji or other
  Unicode in source files. Use only basic ASCII in all code and
  artifacts. Emojis are fine in conversation, never in source.
- When writing code that the user will save to multiple files, present
  the code for each file in a separate artifact named with the exact
  filename.

## Delivering PowerShell commands to the user

When you need the user to run a PowerShell command:

- ALWAYS write it to a `.ps1` file as a single one-liner
  (semicolon-chained, no line breaks in the executable portion).
- Open the file in notepad with `notepad.exe <path> &`.
- Do not paste the command into chat for the user to copy.
- Multi-line comments at the top of the file are fine and encouraged
  for context.
- The one-liner format lets the user copy-paste directly into a
  PowerShell prompt without losing line breaks or formatting.

## Environment notes

- Screenshots are at `C:\Users\<USER>\OneDrive\Pictures\Screenshots`.
- The current year is 2026. Do not infer year from training-data
  timestamps.
