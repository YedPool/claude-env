# Tier B — CLI tools

This module installs the command-line tools the author keeps on PATH on
every workstation. See [`tools.md`](./tools.md) for the rationale per
tool, and [`install-tier-b.ps1`](./install-tier-b.ps1) for the actual
installer.

## Run it

```powershell
powershell -ExecutionPolicy Bypass -File .\install-tier-b.ps1
```

Idempotent — re-runs are safe.

## Why this is separate from Tier A

Some machines (CI runners, shared dev VMs) only need the Claude Code
config — they already have language runtimes and CLI tools managed by
something else. Splitting Tier A from Tier B lets you install just what
you need.

## Why this is separate from Tier C

Tier B is "what tools do I need installed". Tier C is "how is *this
specific user account* configured" — git identity, GitHub auth, editor
preferences. Things that should not bleed onto a shared box.
