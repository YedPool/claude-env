# Tier A — Claude Code config

Everything in this folder gets copied into `%USERPROFILE%\.claude\` on the
target machine. The `install.ps1` script does the work; this README
explains what each piece is and why it exists.

## What you get

| File / Dir | Destination | Purpose |
|------------|-------------|---------|
| `CLAUDE.md` | `~/.claude/CLAUDE.md` | Universal global rules. Project-agnostic. |
| `settings.template.json` | `~/.claude/settings.json` | Hooks, statusline, theme, plugin enable list. The template has a `__USERHOME_BASH__` placeholder that the installer substitutes. |
| `skills/` | `~/.claude/skills/` | `mentor`, `deep-review`, `neon-postgres` skills. |
| `agents/` | `~/.claude/agents/` | `plan-executor` subagent. |
| `statusline-command.sh` | `~/.claude/statusline-command.sh` | Tiny bash script that renders `ctx: NN%` in the status line. Needs Git Bash. |

## What is in `settings.json`

- **PreToolUse hook (Bash matcher)** — rewrites `docker compose up --build`
  to a sequential `build && up -d` to avoid a parallel RAM spike. Pure
  Python, runs in 5 seconds or less.
- **Notification hook** — plays `Windows Background.wav` when Claude
  needs attention.
- **SessionStart hook** — under WezTerm, persists per-pane session JSON
  to `~/.claude/pane-sessions/<pane_id>.json` so resurrect plugins can
  restore state. Falls through silently when not in WezTerm.
- **Stop hook** — plays `notify.wav` when the agent finishes a turn.
- **Status line** — calls `bash <home>/.claude/statusline-command.sh`,
  which extracts `used_percentage` from the JSON Claude Code pipes in
  and prints `ctx: NN%`.
- **`skipDangerousModePermissionPrompt: true`** — author has
  acknowledged the dangerous mode warning; do not prompt again.
- **`agentPushNotifEnabled: true`** — push notifications when subagents
  finish.

## Plugins

The settings file references one plugin via `enabledPlugins`:

- `code-review@claude-plugins-official` — slash-command code-review
  workflow.

The author also has `deep-review@claude-plugins-official` installed
(it shows up as a Skill, not a marketplace plugin reference). If you
want it on a fresh machine, install it manually from inside Claude
Code:

```text
/plugin marketplace add claude-plugins-official
/plugin install deep-review@claude-plugins-official
```

See [`plugins.md`](./plugins.md) for the full list.

## Apply this tier

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

Re-running is safe. The script:

1. Backs up any existing `~/.claude/CLAUDE.md`, `settings.json`,
   `skills/<name>`, `agents/<name>`, and `statusline-command.sh` to a
   timestamped folder under `~/.claude/backups/`.
2. Copies templates over.
3. Substitutes the `__USERHOME_BASH__` placeholder in `settings.json`
   with the Git-Bash-style path to `$HOME` (e.g., `/c/Users/jane`).

If you've made local edits in `~/.claude/` that you want to preserve,
diff them against `claude/` before running the script.

## Caveats

- The status line + the `SessionStart` hook both shell out to bash.
  Tier B installs Git Bash via the Git for Windows package; without
  it, the hooks no-op silently and the status line shows `ctx: --`.
- The WezTerm `SessionStart` hook is harmless on other terminals — it
  guards on `WEZTERM_PANE` being numeric and falls through.
