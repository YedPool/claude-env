# Claude Code plugins

Plugins live under `~/.claude/plugins/` and are managed via the
`/plugin` slash command in Claude Code. This file documents which
plugins the author has installed so a fresh machine can match.

## Currently installed

| Plugin | Marketplace | Notes |
|--------|-------------|-------|
| `code-review` | `claude-plugins-official` | Listed in `settings.json` under `enabledPlugins`. Provides a slash-command code-review workflow. |
| `deep-review` | `claude-plugins-official` | Installed under `~/.claude/plugins/marketplaces/...`. Shows up as a Skill. Provides the multi-agent security/optimization/traceability review. |

## Install on a fresh machine

Open Claude Code in any directory and run:

```text
/plugin marketplace add claude-plugins-official
/plugin install code-review@claude-plugins-official
/plugin install deep-review@claude-plugins-official
```

If the `claude-plugins-official` marketplace is the default, the first
line is unnecessary. The `claude/install.ps1` script does NOT install
plugins — they require running Claude Code interactively to authorize
the marketplace.

## Skills vs plugins vs agents

Three things that all show up in different parts of `~/.claude/`:

- **Skills** (`~/.claude/skills/<name>/SKILL.md`) — invoked via the
  `Skill` tool or via `/<name>`. Author maintains custom ones in
  `claude/skills/` (mentor, deep-review-as-a-Skill copy is technically a
  plugin but lives under skills too).
- **Plugins** (`~/.claude/plugins/`) — third-party bundles installed
  via `/plugin`. Need a marketplace add + install.
- **Agents** (`~/.claude/agents/<name>.md`) — custom subagent
  definitions invoked via the `Agent` tool. Author maintains
  `plan-executor`.
