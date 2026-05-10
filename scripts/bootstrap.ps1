# bootstrap.ps1 - top-level orchestrator for claude-env.
#
# Interactively prompts which tiers to install, then chains the
# per-tier installers in order. Each tier installer is itself
# idempotent, so you can re-run bootstrap.ps1 safely.
#
# Usage (interactive):
#   powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1
#
# Usage (non-interactive):
#   .\scripts\bootstrap.ps1 -Tiers A,B,C
#   .\scripts\bootstrap.ps1 -Tiers A
#   .\scripts\bootstrap.ps1 -Tiers A,B

[CmdletBinding()]
param(
    [ValidateSet('A','B','C', IgnoreCase=$true)]
    [string[]]$Tiers
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Write-Banner($msg) {
    Write-Host ""
    Write-Host "===== $msg =====" -ForegroundColor Magenta
    Write-Host ""
}

# Interactive picker if no tiers passed
if (-not $Tiers) {
    Write-Host ""
    Write-Host "claude-env bootstrap" -ForegroundColor Magenta
    Write-Host "--------------------"
    Write-Host "Select which tiers to install:"
    Write-Host "  A - Claude Code config (CLAUDE.md, settings, skills, agents, statusline)"
    Write-Host "  B - CLI tools on PATH (gh, git, python, node, aws, sam, docker, wsl)"
    Write-Host "  C - Personal dotfiles (git config, gh auth, VS Code extensions)"
    Write-Host ""
    $reply = Read-Host "Enter tiers (e.g. 'A', 'AB', 'ABC') [default: ABC]"
    if (-not $reply) { $reply = 'ABC' }
    $Tiers = $reply.ToUpper().ToCharArray() | ForEach-Object { "$_" } | Where-Object { $_ -match '^[ABC]$' }
}

$Tiers = $Tiers | ForEach-Object { $_.ToUpper() } | Sort-Object -Unique

if ('A' -in $Tiers) {
    Write-Banner "Tier A - Claude Code config"
    & (Join-Path $repoRoot 'claude\install.ps1')
}

if ('B' -in $Tiers) {
    Write-Banner "Tier B - CLI tools"
    & (Join-Path $repoRoot 'cli\install-tier-b.ps1')
}

if ('C' -in $Tiers) {
    Write-Banner "Tier C - Personal dotfiles"
    & (Join-Path $repoRoot 'dotfiles\install-tier-c.ps1')
}

Write-Banner "Bootstrap complete"
Write-Host "Selected tiers: $($Tiers -join ', ')" -ForegroundColor Green
Write-Host ""
Write-Host "If you installed Tier A, also install plugins from inside Claude Code:" -ForegroundColor Yellow
Write-Host "  /plugin marketplace add claude-plugins-official" -ForegroundColor Yellow
Write-Host "  /plugin install code-review@claude-plugins-official" -ForegroundColor Yellow
Write-Host "(deep-review is a local custom skill, not a marketplace plugin -" -ForegroundColor Yellow
Write-Host " Tier A already installed it under ~/.claude/skills/deep-review/.)" -ForegroundColor Yellow
