# Tier C installer - personal dotfiles (git config, gh auth, VS Code
# extensions, SSH config, WezTerm config).
#
# Interactive: prompts for name + email if git identity is unset, and
# launches `gh auth login` if not already authenticated.
#
# Idempotent. Re-running with everything in place is a no-op. Existing
# files (~/.ssh/config, ~/.wezterm.lua) are backed up before overwrite.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\install-tier-c.ps1

[CmdletBinding()]
param(
    [string]$Name,
    [string]$Email,
    [switch]$SkipVSCode,
    [switch]$SkipSSH,
    [switch]$SkipWezTerm,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "[dotfiles] $msg" -ForegroundColor Cyan }
function Write-Skip($msg) { Write-Host "[dotfiles] (skip) $msg" -ForegroundColor DarkGray }

$here = Split-Path -Parent $MyInvocation.MyCommand.Path

# Backup existing file to .bak-YYYYMMDDHHMMSS. Returns $true if it copied,
# $false if the destination didn't exist. Skips (returns $true) if the
# existing content already matches source.
function Install-DotFile {
    param([string]$Src, [string]$Dst, [string]$Label)
    if (-not (Test-Path $Src)) {
        Write-Skip "$Label template missing at $Src"
        return $false
    }
    $dstDir = Split-Path $Dst -Parent
    if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }

    if (Test-Path $Dst) {
        # Skip if identical
        $srcHash = (Get-FileHash $Src -Algorithm SHA256).Hash
        $dstHash = (Get-FileHash $Dst -Algorithm SHA256).Hash
        if ($srcHash -eq $dstHash) {
            Write-Skip "$Label already matches template at $Dst"
            return $true
        }
        if (-not $Force) {
            $r = Read-Host "  $Dst exists and differs from template. Overwrite? [y/N]"
            if ($r -notmatch '^[Yy]') {
                Write-Skip "$Label kept as-is"
                return $false
            }
        }
        $bak = "$Dst.bak-$(Get-Date -Format 'yyyyMMddHHmmss')"
        Copy-Item $Dst $bak -Force
        Write-Step "  backed up existing to $bak"
    }
    Copy-Item $Src $Dst -Force
    Write-Step "  installed $Label -> $Dst"
    return $true
}

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
        Write-Host "  Recommended: GitHub.com -> SSH -> upload key -> Login with web browser" -ForegroundColor Yellow
        & gh auth login
    }
} else {
    Write-Skip "gh not on PATH; skipping auth (Tier B installs gh)"
}

# --- 4. SSH config ------------------------------------------------------
if ($SkipSSH) {
    Write-Skip "SSH config skipped (--SkipSSH)"
} else {
    Write-Step "Installing ~/.ssh/config (fleet host aliases)"
    $sshSrc = Join-Path $here 'ssh\config.template'
    $sshDst = Join-Path $env:USERPROFILE '.ssh\config'
    Install-DotFile -Src $sshSrc -Dst $sshDst -Label 'SSH config' | Out-Null
    Write-Host "  Note: fleet SSH keys (id_ed25519, orah-wireguard-hub.pem)" -ForegroundColor Yellow
    Write-Host "  are transferred via tools/import-secrets.ps1, not this installer." -ForegroundColor Yellow
}

# --- 5. WezTerm ---------------------------------------------------------
if ($SkipWezTerm) {
    Write-Skip "WezTerm config skipped (--SkipWezTerm)"
} else {
    Write-Step "Installing ~/.wezterm.lua"
    $wtSrc = Join-Path $here 'wezterm\wezterm.lua.template'
    $wtDst = Join-Path $env:USERPROFILE '.wezterm.lua'
    Install-DotFile -Src $wtSrc -Dst $wtDst -Label 'WezTerm config' | Out-Null
}

# --- 6. VS Code extensions ----------------------------------------------
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
Write-Host "  Get-Content ~/.ssh/config | Select-String '^Host '" -ForegroundColor Yellow
Write-Host "  Get-Item ~/.wezterm.lua" -ForegroundColor Yellow
Write-Host ""
Write-Host "For fleet SSH keys, run on a source box:" -ForegroundColor Yellow
Write-Host "  .\tools\export-secrets.ps1" -ForegroundColor Yellow
Write-Host "Then on this box:" -ForegroundColor Yellow
Write-Host "  .\tools\import-secrets.ps1 path\to\claude-env-secrets-*.7z" -ForegroundColor Yellow
