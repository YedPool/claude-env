# Tier C — Personal dotfiles

This tier configures the *user account*, not the *machine*. It is
deliberately separate so you can:

- Install Tier A + B on a shared box without leaking your personal git
  identity or GitHub auth onto it.
- Re-run Tier C on a personal laptop to bring git config + gh auth back
  in line if they drift.

## Contents

| File | Purpose |
|------|---------|
| [`git-config.md`](./git-config.md) | Global git config — user identity, credential helper, LFS, line endings. |
| [`gh-auth.md`](./gh-auth.md) | GitHub CLI authentication walkthrough. |
| [`vscode-extensions.md`](./vscode-extensions.md) | VS Code extension list (only if you use VS Code). |
| [`install-tier-c.ps1`](./install-tier-c.ps1) | Applies all of the above. Interactive — prompts for identity. |

## Run it

```powershell
powershell -ExecutionPolicy Bypass -File .\install-tier-c.ps1
```

The script will:

1. Prompt for your name + email if `git config --global user.name` is
   not already set.
2. Configure git's `credential.helper`, LFS filters, and `http.sslverify`.
3. Run `gh auth login` interactively if you are not already
   authenticated.
4. (Optional) Install VS Code extensions if `code` is on PATH.

Re-running with everything already configured is a no-op.

## What is intentionally not automated

- **The actual `gh auth login` token grant.** That requires a browser
  + device code, which is by design — you should authenticate
  manually, not paste a token from a script.
- **SSH keys.** If you use SSH for git remotes, generate a fresh key
  with `ssh-keygen` and upload it to GitHub yourself. Reusing an old
  key on a new machine is a security smell.
