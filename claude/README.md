# Tier A — Claude Code config

Everything in this folder gets copied into `%USERPROFILE%\.claude\` on the
target machine. The `install.ps1` script does the work; this README
explains what each piece is and why it exists.

## What you get

| File / Dir | Destination | Purpose |
|------------|-------------|---------|
| `CLAUDE.md` | `~/.claude/CLAUDE.md` | Universal global rules. Project-agnostic. |
| `settings.template.json` | `~/.claude/settings.json` | Hooks, statusline, theme, plugin enable list. Two placeholders the installer substitutes: `__USERHOME_BASH__` (Git-Bash path to `$HOME`) and `__CLAUDE_DIR_JSON__` (Windows path to `~/.claude`, backslashes doubled for JSON). |
| `skills/` | `~/.claude/skills/` | `mentor`, `deep-review`, `neon-postgres`, `run-complete-handoff` skills. |
| `hooks/` | `~/.claude/hooks/` | Hook scripts referenced by absolute path from `settings.json`. |
| `agents/` | `~/.claude/agents/` | `plan-executor` subagent. |
| `statusline-command.sh` | `~/.claude/statusline-command.sh` | Tiny bash script that renders `ctx: NN%` in the status line. Needs Git Bash. |

## What is in `settings.json`

- **PreToolUse hook (Bash matcher)** — rewrites `docker compose up --build`
  to a sequential `build && up -d` to avoid a parallel RAM spike. Pure
  Python, runs in 5 seconds or less.
- **Notification hook** — plays `Windows Background.wav` when Claude
  needs attention.
- **SessionStart hook** — under WezTerm, persists per-pane session JSON
  to `~/.claude/pane-sessions/<pane_id>.json` so resurrect plugins and
  `wezfleet` can tell one session from another. Falls through silently when
  not in WezTerm.

  It also declines to write when `CLAUDE_CODE_CHILD_SESSION` is set. Claude
  Code puts that marker in every process it spawns, and `WEZTERM_PANE` is
  inherited the same way, so a nested `claude` - a probe, a `claude -p` from
  inside a session's own shell - would otherwise fire this hook with ITS
  session id and THIS pane's number and take the record over. Observed doing
  exactly that on 2026-09-04.
- **Stop hooks** - two of them. The first plays `notify.wav` when the agent
  finishes a turn. The second runs `hooks/run-complete-handoff.mjs`, which
  asks for the three-part handoff when a run of real work ends without one
  (see below).
- **Status line** — calls `bash <home>/.claude/statusline-command.sh`,
  which extracts `used_percentage` from the JSON Claude Code pipes in
  and prints `ctx: NN%`.
- **`skipDangerousModePermissionPrompt: true`** — author has
  acknowledged the dangerous mode warning; do not prompt again.
- **`agentPushNotifEnabled: true`** — push notifications when subagents
  finish.

## The run-complete handoff

`skills/run-complete-handoff` defines the shape of the last message of a run:

    1. What happened
        1.1. ...
    2. Where we are now
        2.1. ...
    3. What's next
        3.1. ...

The whole thing inside one fenced text block, because the terminal renders
the message as markdown and markdown flattened every indent and cut off a
bold first heading. Items are N.M. one-liners indented four spaces, never
wrapped; no blank line between a heading and its items; all three headings
present; section 1 leads with any correction to something said earlier in
the run. Section 3 holds everything forward-looking in one list - questions,
next steps, asks - and only the lines that exist: never "none", never
"nothing until you reply".

Until 2026-09-08 this was five roman-numeral sections (I-V, with separate
Questions / My next steps / What I need from you); for part of that day it
was lettered A/B/C. The hook still accepts both retired forms so a session
that loaded an earlier skill is not asked twice.

The skill is the definition. The Stop hook is the floor: the moment the format
matters most is the end of a long run, when context is full and wrapping up is
exactly when it gets forgotten.

**The hook is deliberately reluctant.** Blocking wrongly costs a turn and
answers a one-line question with three lettered headings; failing to block costs a
handoff the founder can ask for in four words. Those are not symmetric, so every
uncertain case exits 0. It stays silent when:

- `stop_hook_active` is set (it already asked once this turn - the loop guard,
  and the reason a Stop hook cannot wedge a session)
- the last message already has two of the three headings (numbered or
  lettered, or four of the old five), however they were punctuated
- fewer than four tool calls happened since the last human turn, and none of
  them edited a file
- a background task is still running - work in flight is not a finished run.
  The hook input's `background_tasks` lists agents only, so the hook ALSO
  counts launches in the transcript since the last human turn (Agent calls,
  shells started with `run_in_background`, foreground commands the harness
  moved to the background on timeout) against task notifications, and stays
  silent while any launch is unanswered. Measured 2026-09-08 across every
  transcript on the founder's box: 12 firings since install, 4 of them on a
  session that had ended its turn to wait for a backgrounded job - the
  founder's whole operating model, and the case that made him ask.

Set `HANDOFF_HOOK=off` to disable it entirely.

Tests: `node claude/hooks/test-run-complete-handoff.mjs` (39 checks). Every
"stays silent" case is paired with a control that differs in one field and does
block, because a hook that never fires and a hook that is wired correctly
produce identical output on a quiet turn.

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
- The handoff hook reads the transcript to count tool calls since the last
  human turn. Tool RESULTS are recorded as `user` entries (123 of 134 in a
  live transcript), so a reader that stops at the first `user` entry measures
  one tool call instead of the whole run. `test-run-complete-handoff.mjs`
  pins this in both directions.
