# Tier C installer - personal dotfiles (git config, gh auth, VS Code extensions).
#
# Interactive: prompts for name + email if git identity is unset, and
# launches `gh auth login` if not already authenticated.
#
# Idempotent. Re-running with everything in place is a no-op.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\install-tier-c.ps1

[CmdletBinding()]
param(
    [string]$Name,
    [string]$Email,
    [switch]$SkipVSCode
)

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "[dotfiles] $msg" -ForegroundColor Cyan }
function Write-Skip($msg) { Write-Host "[dotfiles] (skip) $msg" -ForegroundColor DarkGray }

# --- 1. Git identity -----------------------------------------------------
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "git is not on PATH. Run cli/install-tier-b.ps1 first."
    exit 1
}

$existingName  = (& git config --global user.name)  2>$null
$existingEmail = (& git config --global user.email) 2>$null

if (-not $existingName) {
    if (-not $Name) { $Name = Read-Host "Git user.name" }
    & git config --global user.name $Name
    Write-Step "Set user.name = $Name"
} else {
    Write-Skip "user.name already set to '$existingName'"
}

if (-not $existingEmail) {
    if (-not $Email) { $Email = Read-Host "Git user.email" }
    & git config --global user.email $Email
    Write-Step "Set user.email = $Email"
} else {
    Write-Skip "user.email already set to '$existingEmail'"
}

# --- 2. Git core settings (always-apply, idempotent) --------------------
Write-Step "Configuring credential helper, LFS filters, sslverify"
& git config --global credential.helper manager
& git config --global filter.lfs.clean    "git-lfs clean -- %f"
& git config --global filter.lfs.smudge   "git-lfs smudge -- %f"
& git config --global filter.lfs.process  "git-lfs filter-process"
& git config --global filter.lfs.required true
& git config --global http.sslverify true

# --- 3. gh auth ---------------------------------------------------------
if (Get-Command gh -ErrorAction SilentlyContinue) {
    $authStatus = & gh auth status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Skip "gh already authenticated"
    } else {
        Write-Step "Launching 'gh auth login' (interactive, opens browser)"
        Write-Host "  Recommended answers: GitHub.com -> HTTPS -> Yes -> Login with web browser" -ForegroundColor Yellow
        & gh auth login
    }
} else {
    Write-Skip "gh not on PATH; skipping auth (Tier B installs gh)"
}

# --- 4. VS Code extensions ----------------------------------------------
if ($SkipVSCode) {
    Write-Skip "VS Code extensions skipped (--SkipVSCode)"
} elseif (Get-Command code -ErrorAction SilentlyContinue) {
    $extensions = @(
        'ms-python.python',
        'ms-python.vscode-pylance',
        'ms-vscode.powershell',
        'redhat.vscode-yaml',
        'hashicorp.terraform',
        'eamodio.gitlens',
        'streetsidesoftware.code-spell-checker',
        'anthropic.claude-code'
    )
    foreach ($ext in $extensions) {
        Write-Step "code --install-extension $ext"
        # See note in install-tier-b.ps1: avoid `2>&1 | Out-Host` on
        # native commands under PS 5.1 + ErrorAction='Stop'.
        & code --install-extension $ext --force
    }
} else {
    Write-Skip "VS Code 'code' not on PATH; skipping extension install"
    Write-Host "  Install VS Code with: winget install --id Microsoft.VisualStudioCode --silent" -ForegroundColor Yellow
}

Write-Step "Done."
Write-Host ""
Write-Host "Verify with:" -ForegroundColor Yellow
Write-Host "  git config --global --list" -ForegroundColor Yellow
Write-Host "  gh auth status" -ForegroundColor Yellow
