# VS Code extensions

The author currently does not have VS Code on PATH on this workstation
(`where.exe code` returns "Could not find").

If you want VS Code on a fresh machine, add it via winget and pick a
starter extension set. This file is a *template* — adjust before
running the installer if you want different extensions.

## Install VS Code itself

```powershell
winget install --id Microsoft.VisualStudioCode --exact --silent
```

## Suggested starter extensions

These are not the author's literal extension set (none recorded). They
are sensible defaults for the kind of work the author does (Python +
PowerShell + Markdown + IaC):

| Extension ID | Purpose |
|--------------|---------|
| `ms-python.python` | Python language server, debugger, environment picker. |
| `ms-python.vscode-pylance` | Pyright-based type checker (bundled with the Python extension). |
| `ms-vscode.powershell` | PowerShell language server. |
| `redhat.vscode-yaml` | YAML schema validation, helpful for SAM templates. |
| `hashicorp.terraform` | Terraform language support. |
| `eamodio.gitlens` | Inline blame, git history. |
| `streetsidesoftware.code-spell-checker` | Spell-check across code + comments + markdown. |
| `anthropic.claude-code` | Claude Code IDE integration (if you use the IDE adapter). |

## Apply

If `code` is on PATH after VS Code is installed:

```powershell
code --install-extension ms-python.python
code --install-extension ms-python.vscode-pylance
code --install-extension ms-vscode.powershell
code --install-extension redhat.vscode-yaml
code --install-extension hashicorp.terraform
code --install-extension eamodio.gitlens
code --install-extension streetsidesoftware.code-spell-checker
code --install-extension anthropic.claude-code
```

The Tier C installer wraps these with an "is `code` on PATH?" guard so
they no-op when VS Code is not installed.
