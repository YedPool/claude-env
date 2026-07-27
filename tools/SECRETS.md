# Secrets inventory

This repo is public. Nothing here is a secret. This document catalogs
the secrets your Claude Code + Windows environment expects, categorizes
each by how it moves to a new dev box, and points to the handoff scripts
for the ones that transfer.

## Categories

**Auth flow** -- re-obtain fresh on each new box via a browser or
interactive prompt. No transfer needed, no artifact to lose. Preferred
where available.

**Transfer** -- must be the same bytes on both boxes (paired keys,
device-specific IDs, or long-lived tokens). Moved via
`tools/export-secrets.ps1` and `tools/import-secrets.ps1` (7-Zip AES-256
archive, password prompted at both ends).

**Regenerate** -- possible to re-issue but not automated. Only fall
back to this if the transfer artifact is lost.

## Inventory

| Secret | Location | Category | Notes |
|---|---|---|---|
| Claude Code session token | `~/.claude/.credentials.json` | Auth flow | Run `claude` then `/login` on new box |
| GitHub CLI token | Windows Credential Manager (`gh:github.com`) | Auth flow | `gh auth login`, choose SSH for git ops |
| GitHub SSH key | `~/.ssh/id_ed25519` + `.pub` | Transfer | Same key across boxes = one `gh ssh-key add` per user, not per box |
| WireGuard hub SSH key | `~/.ssh/orah-wireguard-hub.pem` | Transfer | Hub's `authorized_keys` is keyed to this specific key; regen means updating the hub |
| AWS access keys | `~/.aws/credentials` | Transfer | If using long-lived access keys. Prefer AWS SSO (`aws sso login`) which is auth-flow |
| AWS profile config | `~/.aws/config` | Transfer | Not secret but per-user; bundled with credentials for convenience |
| WireGuard enrollment token | Hub-side, at `/etc/orahvision/enroll-token` | Auth flow | Fetch with `ssh ov615-hub 'sudo cat /etc/orahvision/enroll-token'`; used once per device onboard |

## Why "handoff script, not private repo"

Encrypted secrets in a private repo:
- Git history preserves every version -- even "deleted" secrets stay
  recoverable to anyone who ever had read access
- Adds a decryption key management problem on top of the secret
  management problem
- The private repo itself becomes a high-value target

Handoff-per-box:
- Encrypted at rest only for the seconds/minutes of transit
- Zero standing infrastructure
- Password is chosen fresh per transfer, never persisted
- If the encrypted blob leaks, it protects itself with AES-256 + hidden
  filenames

## Handoff flow

**On the current (source) box:**
```powershell
cd path\to\claude-env
.\tools\export-secrets.ps1
# prompts for encryption password (twice)
# writes ~/Desktop/claude-env-secrets-YYYYMMDD-HHMMSS.7z
```

**Transfer** the `.7z` however you like:
- Over the WireGuard mesh (once new box is enrolled):
  `scp yedid@10.0.0.<current>:~/Desktop/claude-env-secrets-*.7z .`
- USB stick
- Any file-transfer tool (the file self-protects with AES-256)

**On the new (destination) box:**
```powershell
cd path\to\claude-env
.\tools\import-secrets.ps1 path\to\claude-env-secrets-YYYYMMDD-HHMMSS.7z
# prompts for the same password used at export
```

## What is NOT transferred

By design:
- Session tokens, telemetry, caches -- these are per-machine
- Auto-memory under `~/.claude/projects/*/memory/` -- rebuilds
  naturally as you work; syncing across machines would collide
- Windows Credential Manager entries -- OS-managed, per-machine
- SSH agent state, keyring state, browser cookies -- per-machine
