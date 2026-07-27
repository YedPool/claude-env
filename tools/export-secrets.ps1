# export-secrets.ps1
# ---------------------------------------------------------------------------
# Gather transferable secrets from THIS box into a single AES-256 encrypted
# 7z archive on the Desktop, ready to move to a new dev box.
#
# Encrypts with 7-Zip's -mhe flag (hides filenames inside the archive too --
# without the password even the file list is unreadable).
#
# Files bundled (each optional -- silently skipped if not present):
#   ~/.ssh/id_ed25519       ~/.ssh/id_ed25519.pub
#   ~/.ssh/orah-wireguard-hub.pem
#   ~/.aws/credentials      ~/.aws/config
#
# NOT bundled: Claude Code creds, gh token -- those are auth-flow, re-login
# on the new box. See tools/SECRETS.md for the full inventory.
#
# Requires 7-Zip (winget install 7zip.7zip if missing).
#
# Usage:
#   .\tools\export-secrets.ps1
#
# Output:
#   ~/Desktop/claude-env-secrets-YYYYMMDD-HHMMSS.7z
# ---------------------------------------------------------------------------

$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'

function L   { param($m, $c='Cyan') Write-Host "[export-secrets] $m" -Fore $c }
function Die { param($m) Write-Host "[export-secrets] ERROR: $m" -Fore Red; exit 1 }

# --- 7-Zip locate --------------------------------------------------------
$7z = $null
foreach ($p in @('C:\Program Files\7-Zip\7z.exe', 'C:\Program Files (x86)\7-Zip\7z.exe')) {
    if (Test-Path $p) { $7z = $p; break }
}
if (-not $7z -and (Get-Command 7z -EA SilentlyContinue)) { $7z = '7z' }
if (-not $7z) {
    Die "7-Zip not found. Install with:  winget install 7zip.7zip"
}
L "using 7-Zip at $7z"

# --- staging -------------------------------------------------------------
$stage = Join-Path $env:TEMP ("claude-env-secrets-stage-" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage -Force | Out-Null

$candidates = @(
    @{Src="$env:USERPROFILE\.ssh\id_ed25519";                 Rel='ssh/id_ed25519'}
    @{Src="$env:USERPROFILE\.ssh\id_ed25519.pub";             Rel='ssh/id_ed25519.pub'}
    @{Src="$env:USERPROFILE\.ssh\orah-wireguard-hub.pem";     Rel='ssh/orah-wireguard-hub.pem'}
    @{Src="$env:USERPROFILE\.aws\credentials";                Rel='aws/credentials'}
    @{Src="$env:USERPROFILE\.aws\config";                     Rel='aws/config'}
)

$bundled = @()
foreach ($c in $candidates) {
    if (Test-Path $c.Src) {
        $dst = Join-Path $stage $c.Rel
        New-Item -ItemType Directory -Path (Split-Path $dst -Parent) -Force | Out-Null
        Copy-Item $c.Src $dst -Force
        $bundled += $c.Rel
        L "  + $($c.Rel)"
    } else {
        L "  - skipped (not on this box): $($c.Rel)" 'DarkGray'
    }
}

if (-not $bundled) {
    Remove-Item $stage -Recurse -Force
    Die "no secrets found to bundle -- nothing to export"
}

# --- password prompt (twice, matched) ------------------------------------
$pw1 = Read-Host 'Encryption password (chars hidden)' -AsSecureString
$pw2 = Read-Host 'Encryption password (repeat)      ' -AsSecureString
$s1 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw1))
$s2 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw2))
if ($s1 -ne $s2) {
    Remove-Item $stage -Recurse -Force
    Die "passwords did not match"
}
if ($s1.Length -lt 12) {
    Remove-Item $stage -Recurse -Force
    Die "password must be at least 12 characters"
}

# --- create archive ------------------------------------------------------
$stamp   = Get-Date -Format 'yyyyMMdd-HHmmss'
$outPath = Join-Path ([Environment]::GetFolderPath('Desktop')) "claude-env-secrets-$stamp.7z"

# -mhe=on : header encryption (hides filenames + structure)
# -mx=9   : maximum compression (not that it matters for small files)
# -p<pw>  : password
& $7z a -t7z "-p$s1" -mhe=on -mx=9 $outPath "$stage\*" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Remove-Item $stage -Recurse -Force
    Die "7z archive creation failed with exit code $LASTEXITCODE"
}

Remove-Item $stage -Recurse -Force

L "SUCCESS" 'Green'
L "  wrote $outPath" 'Green'
L "  bundled: $($bundled -join ', ')" 'Green'
L ""
L "Transfer this .7z file to the new box (scp over WG, USB, etc.)."
L "On the new box, in an ELEVATED PowerShell inside the claude-env checkout:"
L "  .\tools\import-secrets.ps1 path\to\claude-env-secrets-$stamp.7z"
