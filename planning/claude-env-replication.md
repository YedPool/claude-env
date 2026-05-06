# claude-env replication plan

## Goal

A self-contained repo that lets the author (or a teammate) reproduce the
exact Claude Code + CLI working environment on a fresh Windows 11 machine
with as little ceremony as possible.

The repo is the source of truth. Anything currently living only in
`%USERPROFILE%\.claude\` or in `winget` global state should be either
captured in this repo, or pointed at by a script that knows how to recreate
it.

## Design principles

1. **Modular, opt-in tiers.** The user picks how deep to go.
   - Tier A (`claude/`): just Claude Code config — global `CLAUDE.md`,
     `settings.json`, skills, agents, statusline, plugins.
   - Tier B (`cli/`): the CLI tools that need to be on `PATH` (gh, git,
     python, node, aws, sam, docker, wsl, etc).
   - Tier C (`dotfiles/`): personal-machine-level things — git config, gh
     auth flow, VS Code extensions. Lives in its own folder so it can be
     skipped on shared / CI machines.
2. **Universalize the global rules.** The author's existing
   `~/.claude/CLAUDE.md` mixes universal engineering principles with
   Orahvision-specific details (release branches, i18n, voiceovers).
   The global file in this repo is project-agnostic; project-specific
   content lives under `project-overrides/`.
3. **Both formats — declarative + readable.** Each tier has a script
   (`install-tier-*.ps1`) that does the work, plus a markdown doc that
   explains the why. Same shape as terraform's `.tf` + README pattern.
4. **No secrets.** API keys, OAuth tokens, AWS creds, GitHub PATs, and
   `~/.claude/sessions/` are git-ignored. Templates use placeholder env
   vars (`$env:GEMINI_API_KEY`, etc).
5. **Idempotent.** Every install script can be re-run without breaking.
   `winget install` already handles "already installed" correctly; copy
   operations check before overwrite.

## Directory layout

```
claude-env/
  README.md                   # top-level overview + bootstrap entry point
  .gitignore                  # excludes secrets, sessions, machine-local junk
  planning/
    claude-env-replication.md # this file
  claude/
    README.md                 # what's in this module, how to apply it
    CLAUDE.md                 # universalized global rules
    settings.template.json    # ~/.claude/settings.json with placeholders
    skills/                   # mentor, deep-review, neon-postgres
    agents/                   # plan-executor.md
    statusline-command.sh     # ctx% statusline script
    plugins.md                # /plugin install commands
    install.ps1               # copy claude/* into %USERPROFILE%\.claude\
  cli/
    README.md
    tools.md                  # canonical tool list with rationale
    install-tier-b.ps1        # winget-based installer
  dotfiles/                   # Tier C, separate by design
    README.md
    git-config.md             # git user/email/lfs/credential.helper
    gh-auth.md                # gh auth login walkthrough
    vscode-extensions.md      # extensions to install
    install-tier-c.ps1        # applies all of the above
  project-overrides/
    README.md
    orahvision.md             # release framework, i18n, voiceover, C# bridge
  scripts/
    bootstrap.ps1             # top-level orchestrator (interactive tier picker)
```

## What gets sanitized out of global CLAUDE.md

These lines move from `~/.claude/CLAUDE.md` to `project-overrides/orahvision.md`:

| Old line | Why it moves |
|----------|--------------|
| Orahvision alpha/beta/stable release framework paragraph | Orahvision-only |
| `building-csharp-instructions.txt` pointer | Orahvision C# bridge only |
| i18n parameterized text rule | Orahvision i18n folder layout |
| Voiceover audio commit-time check | Orahvision feature |
| `flake8 the entire codebase before commit` | Generalize to "run the project's linter" |

Everything else (plan mode defaults, /mentor invocation, subagent strategy,
worktree naming, modular code, imports at top, gh squash merge, etc.)
stays in the universal file.

## What is intentionally NOT captured

- `~/.claude/sessions/` — ephemeral per-session state, no value to replicate.
- `~/.claude/projects/<encoded-path>/memory/` — auto-memory is by definition
  per-machine. The structure is documented; the contents stay private.
- `~/.claude/cache/`, `telemetry/`, `statsig/`, `stats-cache.json` — runtime caches.
- `~/.claude/file-history/`, `history.jsonl` — local history.
- OAuth tokens, GitHub PAT, AWS credentials, Gemini API key — secrets.

## Open follow-ups (not blocking v1)

- Add a `tests/bootstrap.test.ps1` that runs the installer against a
  scratch directory and asserts settings.json is byte-identical (minus
  placeholders).
- Optionally publish to `github.com/yedpool/claude-env` once the layout
  is stable.
