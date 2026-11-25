# Tier A installer - copies Claude Code config into %USERPROFILE%\.claude\.
#
# Idempotent: re-running creates a new timestamped backup and overwrites.
# Safe to run on a clean machine OR an existing one.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\install.ps1

[CmdletBinding()]
param(
    [switch]$NoBackup
)

$ErrorActionPreference = 'Stop'
$here       = Split-Path -Parent $MyInvocation.MyCommand.Path
$claudeDir  = Join-Path $env:USERPROFILE '.claude'
$backupRoot = Join-Path $claudeDir 'backups'
$timestamp  = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDir  = Join-Path $backupRoot $timestamp

function Write-Step($msg) { Write-Host "[claude/install] $msg" -ForegroundColor Cyan }

# --- 1. Make sure the target tree exists ---------------------------------
foreach ($sub in @('', 'skills', 'agents', 'hooks', 'pane-sessions', 'backups')) {
    $p = if ($sub) { Join-Path $claudeDir $sub } else { $claudeDir }
    if (-not (Test-Path $p)) {
        New-Item -ItemType Directory -Force -Path $p | Out-Null
    }
}

# --- 2. Back up anything we might overwrite ------------------------------
function Backup-IfExists($src) {
    if (-not (Test-Path $src)) { return }
    if ($NoBackup)              { return }
    # Compute relative path manually. Resolve-Path's -RelativeBasePath
    # is PowerShell 7+ only; Windows PowerShell 5.1 errors out on the
    # parameter and (under $ErrorActionPreference = 'Stop') aborts the
    # whole install before any backup is written.
    $srcFull  = (Resolve-Path $src).Path
    $baseFull = (Resolve-Path $claudeDir).Path
    if ($srcFull.StartsWith($baseFull, [StringComparison]::OrdinalIgnoreCase)) {
        $rel = $srcFull.Substring($baseFull.Length).TrimStart('\','/')
    } else {
        $rel = Split-Path $src -Leaf
    }
    $dest = Join-Path $backupDir $rel
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    Copy-Item -Path $src -Destination $dest -Recurse -Force
}

Write-Step "Backing up existing config to $backupDir"
foreach ($name in @('CLAUDE.md', 'settings.json', 'statusline-command.sh')) {
    Backup-IfExists (Join-Path $claudeDir $name)
}
Get-ChildItem (Join-Path $here 'skills') -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    Backup-IfExists (Join-Path $claudeDir "skills\$($_.Name)")
}
Get-ChildItem (Join-Path $here 'agents') -File -ErrorAction SilentlyContinue | ForEach-Object {
    Backup-IfExists (Join-Path $claudeDir "agents\$($_.Name)")
}
Get-ChildItem (Join-Path $here 'hooks') -File -ErrorAction SilentlyContinue | ForEach-Object {
    Backup-IfExists (Join-Path $claudeDir "hooks\$($_.Name)")
}

# --- 3. Copy CLAUDE.md ---------------------------------------------------
Write-Step "Installing CLAUDE.md"
Copy-Item (Join-Path $here 'CLAUDE.md') (Join-Path $claudeDir 'CLAUDE.md') -Force

# Hooks are referenced BY ABSOLUTE PATH from settings.json, so they have to land in
# ~/.claude/hooks and the rendered settings has to point at that copy - not at this
# checkout, which may be a temp clone that gets deleted.
#
# COPIED BEFORE THE RENDER, deliberately. Written afterwards, the settings file named a
# hook that did not exist yet, and three throwing statements sat in the gap under
# ErrorActionPreference='Stop' - so an unrelated failure could leave every future session
# pointing at a missing file. Now the target exists before anything references it.
#
# Only real hooks ship: the -Filter keeps this repo's own test-*.mjs suites out of the
# user's home, matching how agents are filtered to *.md two steps down.
Write-Step "Installing hooks"
Get-ChildItem (Join-Path $here 'hooks') -File -Filter '*.mjs' -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notlike 'test-*' } | ForEach-Object {
        Copy-Item $_.FullName (Join-Path $claudeDir "hooks\$($_.Name)") -Force
    }

# --- 4. Render settings.template.json -> settings.json ------------------
Write-Step "Rendering settings.json"
# Convert C:\Users\foo to /c/Users/foo (Git Bash / MSYS convention).
$drive = $env:USERPROFILE.Substring(0, 1).ToLower()
$rest  = $env:USERPROFILE.Substring(2) -replace '\\', '/'
$homeBash = "/$drive$rest"

# Hook commands are JSON string values, so every backslash in the path has to survive
# as an escaped pair. Rendering C:\Users\... raw produces \U and \b, which is invalid
# JSON and would leave Claude Code unable to read its own settings.
$claudeDirJson = $claudeDir -replace '\\', '\\'

$tmpl = Get-Content -Raw (Join-Path $here 'settings.template.json')
$rendered = $tmpl.Replace('__USERHOME_BASH__', $homeBash)
$rendered = $rendered.Replace('__CLAUDE_DIR_JSON__', $claudeDirJson)

# Refuse to write settings Claude Code cannot parse. A template edit that breaks the
# JSON would otherwise land silently and take the whole environment down with it.
try { $null = $rendered | ConvertFrom-Json } catch {
    throw "settings.template.json did not render to valid JSON: $_"
}

# WRITE WITHOUT A BOM, and do not use Set-Content to do it.
#
# `Set-Content -Encoding UTF8` on PowerShell 5.1 emits EF BB BF, and Node's JSON.parse
# throws on those bytes - both verified with controls on 2026-09-07.
#
# BE PRECISE ABOUT THE SEVERITY: Claude Code itself TOLERATES a BOM here. That was tested
# directly - a BOM-prefixed settings file loaded and its hook fired, with a truncated-JSON
# control that correctly did not - so this was never breaking anything. What it breaks is
# any consumer that reads this file with a plain JSON.parse, and it is worth closing on a
# box that has already been bitten by a BOM twice (vercel env add, git commit -F).
#
# The more useful lesson is what the ConvertFrom-Json check above does NOT cover: it
# validates $rendered, the in-memory string, and the BOM is added later by the writer. A
# guard placed before the step that introduces the fault cannot see it - and the installer
# test could not see it either, because Get-Content -Raw strips a BOM on read.
$settingsPath = Join-Path $claudeDir 'settings.json'
[System.IO.File]::WriteAllText($settingsPath, $rendered, (New-Object System.Text.UTF8Encoding($false)))

# Now verify the ARTIFACT, not the intention: read the bytes back off disk.
$head = [System.IO.File]::ReadAllBytes($settingsPath)
if ($head.Length -ge 3 -and $head[0] -eq 0xEF -and $head[1] -eq 0xBB -and $head[2] -eq 0xBF) {
    throw "settings.json was written with a UTF-8 BOM; any consumer using a plain JSON.parse on it will throw"
}

# --- 5. Copy statusline ---------------------------------------------------
Write-Step "Installing statusline-command.sh"
Copy-Item (Join-Path $here 'statusline-command.sh') (Join-Path $claudeDir 'statusline-command.sh') -Force

# --- 6. Copy skills + agents ---------------------------------------------
Write-Step "Installing skills"
Get-ChildItem (Join-Path $here 'skills') -Directory | ForEach-Object {
    $dest = Join-Path $claudeDir "skills\$($_.Name)"
    if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
    Copy-Item $_.FullName $dest -Recurse -Force
}

Write-Step "Installing agents"
Get-ChildItem (Join-Path $here 'agents') -File -Filter '*.md' | ForEach-Object {
    Copy-Item $_.FullName (Join-Path $claudeDir "agents\$($_.Name)") -Force
}

Write-Step "Done."
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  - If this is the first install, install plugins from inside Claude Code:" -ForegroundColor Yellow
Write-Host "      /plugin marketplace add claude-plugins-official"  -ForegroundColor Yellow
Write-Host "      /plugin install code-review@claude-plugins-official"  -ForegroundColor Yellow
Write-Host "    (deep-review ships as a local custom skill in this repo;" -ForegroundColor Yellow
Write-Host "     do NOT install it from the marketplace - it would shadow ours.)" -ForegroundColor Yellow
Write-Host "  - The status line + SessionStart hook need Git Bash on PATH (Tier B installs it)." -ForegroundColor Yellow
