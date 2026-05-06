# claude-env

Reproducible Claude Code + Windows CLI environment.

This repo is the source of truth for one author's Claude Code config and
PATH-installed CLI tools. Cloning it on a fresh Windows 11 machine and
running `scripts\bootstrap.ps1` produces an environment that behaves the
same as the author's daily driver.

## Layout

| Path | Purpose | Tier |
|------|---------|------|
| [`claude/`](./claude/) | Global `CLAUDE.md`, `settings.json`, skills, agents, statusline, plugins | A |
| [`cli/`](./cli/) | CLI tools that need to be on `PATH` (gh, git, python, node, aws, sam, docker, wsl) | B |
| [`dotfiles/`](./dotfiles/) | Personal-machine settings: git config, gh auth, VS Code extensions | C |
| [`project-overrides/`](./project-overrides/) | Project-specific overlays pulled out of the global config | - |
| [`planning/`](./planning/) | Design notes for this repo itself | - |
| [`scripts/`](./scripts/) | Top-level `bootstrap.ps1` orchestrator | - |

The tiers are independent. Pick the ones you want.

## Quick start (fresh machine)

```powershell
git clone https://github.com/<you>/claude-env.git
cd claude-env
# Interactive picker - choose A only, A+B, A+B+C, etc.
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1
```

Or run a single tier directly:

```powershell
powershell -ExecutionPolicy Bypass -File .\claude\install.ps1
powershell -ExecutionPolicy Bypass -File .\cli\install-tier-b.ps1
powershell -ExecutionPolicy Bypass -File .\dotfiles\install-tier-c.ps1
```

## Design choices

- **Three opt-in tiers** so you can install just Claude config on a shared
  box, or the full kit on a personal one.
- **Universalized global `CLAUDE.md`** — project-specific rules
  (Orahvision release framework, i18n, voiceover) live in
  [`project-overrides/`](./project-overrides/), not in the global file.
- **No secrets in the repo.** Templates use `$env:VAR_NAME` placeholders.
  See [`.gitignore`](./.gitignore) for the full exclusion list.
- **Idempotent installers.** Re-running `bootstrap.ps1` is safe — `winget
  install` short-circuits on already-installed packages, file copies
  check before overwrite.

See [`planning/claude-env-replication.md`](./planning/claude-env-replication.md)
for the full design rationale.

## What is NOT captured

- Sessions, telemetry, caches, auto-memory under `~/.claude/` (per-machine).
- API keys, OAuth tokens, AWS creds, GitHub PATs (secrets).
- The Orahvision codebase itself — this repo is about the environment, not
  the projects you do work in.
