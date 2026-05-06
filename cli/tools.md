# Tier B — CLI tools on PATH

These are the executables the author relies on from any shell. The
install script uses **winget** (built into Windows 11) for everything
that has a winget manifest, and `pip`/`npm` for language-runtime
packages.

## Manifest

| Tool | winget id | Version pinned to | Why |
|------|-----------|-------------------|-----|
| Git for Windows | `Git.Git` | latest | git, Git Bash, git-lfs. Required for the Claude Code statusline + SessionStart hook. |
| GitHub CLI | `GitHub.cli` | latest | `gh pr`, `gh auth`, etc. — author's daily driver for PRs. |
| Python 3.12 | `Python.Python.3.12` | 3.12.x | Primary Python runtime. |
| Node.js LTS | `OpenJS.NodeJS.LTS` | 22.x | Required for the `claude` CLI npm install + general JS tooling. |
| AWS CLI v2 | `Amazon.AWSCLI` | latest | `aws s3`, `aws dynamodb`, etc. |
| AWS SAM CLI | `Amazon.SAM-CLI` | latest | Lambda deploys. |
| Docker Desktop | `Docker.DockerDesktop` | latest | Local container work + the `docker compose` PreToolUse hook depends on it being present. |
| WSL | (built-in) | - | `wsl --install` if not already present. |

## pip-installed Python packages

Installed into the Python 3.12 system interpreter:

| Package | Why |
|---------|-----|
| `flake8` | Pre-commit linting. |
| `pytest` | Test runner. |
| `pyinstaller` | Building Windows EXEs. |

## npm-installed packages

| Package | Why |
|---------|-----|
| `@anthropic-ai/claude-code` | The `claude` CLI. |

## Apply this tier

```powershell
powershell -ExecutionPolicy Bypass -File .\install-tier-b.ps1
```

The script checks for an existing install before each `winget install`,
so it is safe to re-run.

## What is NOT installed by Tier B

- VS Code — see Tier C (`dotfiles/`). Author currently does not have VS
  Code on PATH; if you want it, Tier C's installer adds it.
- Older Python versions (3.10, 3.11) — author has them on this machine
  but they are legacy. Add them to `install-tier-b.ps1` manually if
  needed for a specific project.
- Inkscape, 7-Zip, browsers — out of scope. Use `winget` directly.

## Verifying the install

After running:

```powershell
git --version
gh --version
python --version
node --version
aws --version
sam --version
docker --version
claude --version
flake8 --version
pytest --version
pyinstaller --version
```

Every line should print a version, not "command not found". If any are
missing, open a fresh PowerShell window — `winget` updates `PATH` but
existing shells need to restart to pick it up.
