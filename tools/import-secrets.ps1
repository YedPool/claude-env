# import-secrets.ps1
# ---------------------------------------------------------------------------
# Decrypt a claude-env secrets bundle produced by export-secrets.ps1 and
# place each file at its correct location on THIS box, with strict ACLs on
# any SSH keys.
#
# Requires 7-Zip (winget install 7zip.7zip if missing) and the same
# encryption password that was used at export.
#
# Usage:
#   .\tools\import-secrets.ps1 path\to\claude-env-secrets-YYYYMMDD-HHMMSS.7z
#
# Never overwrites an existing file without confirmation (pass -Force to
# skip prompts).
# ---------------------------------------------------------------------------

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$ArchivePath,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'

function L   { param($m, $c='Cyan') Write-Host "[import-secrets] $m" -Fore $c }
function Die { param($m) Write-Host "[import-secrets] ERROR: $m" -Fore Red; exit 1 }

if (-not (Test-Path $ArchivePath)) { Die "archive not found: $ArchivePath" }
$ArchivePath = (Resolve-Path $ArchivePath).Path

# --- 7-Zip locate --------------------------------------------------------
$7z = $null
foreach ($p in @('C:\Program Files\7-Zip\7z.exe', 'C:\Program Files (x86)\7-Zip\7z.exe')) {
    if (Test-Path $p) { $7z = $p; break }
}
if (-not $7z -and (Get-Command 7z -EA SilentlyContinue)) { $7z = '7z' }
if (-not $7z) { Die "7-Zip not found. Install with:  winget install 7zip.7zip" }
L "using 7-Zip at $7z"

# --- password + extract to staging --------------------------------------
$pw    = Read-Host 'Decryption password (chars hidden)' -AsSecureString
$pwStr = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw))

$stage = Join-Path $env:TEMP ("claude-env-secrets-stage-" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage -Force | Out-Null

& $7z x -y "-p$pwStr" "-o$stage" $ArchivePath | Out-Null
if ($LASTEXITCODE -ne 0) {
    Remove-Item $stage -Recurse -Force -EA SilentlyContinue
    Die "7z extraction failed (wrong password? corrupt archive?)"
}

# --- placement map: staged relative -> absolute dest ---------------------
$placements = @(
    @{Rel='ssh/id_ed25519';                 Dst="$env:USERPROFILE\.ssh\id_ed25519";                 LockAcl=$true}
    @{Rel='ssh/id_ed25519.pub';             Dst="$env:USERPROFILE\.ssh\id_ed25519.pub";             LockAcl=$false}
    @{Rel='ssh/orah-wireguard-hub.pem';     Dst="$env:USERPROFILE\.ssh\orah-wireguard-hub.pem";     LockAcl=$true}
    @{Rel='aws/credentials';                Dst="$env:USERPROFILE\.aws\credentials";                LockAcl=$true}
    @{Rel='aws/config';                     Dst="$env:USERPROFILE\.aws\config";                     LockAcl=$false}
)

foreach ($p in $placements) {
    $src = Join-Path $stage $p.Rel
    if (-not (Test-Path $src)) {
        L "  - not in archive: $($p.Rel)" 'DarkGray'
        continue
    }
    $dstDir = Split-Path $p.Dst -Parent
    if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }

    if ((Test-Path $p.Dst) -and -not $Force) {
        $r = Read-Host "  $($p.Dst) already exists. Overwrite? [y/N]"
        if ($r -notmatch '^[Yy]') { L "    skipped $($p.Rel)" 'Yellow'; continue }
    }
    Copy-Item $src $p.Dst -Force

    if ($p.LockAcl) {
        # Lock down to current user only (mirrors ssh-keygen default ACLs)
        $user = "$env:USERDOMAIN\$env:USERNAME"
        icacls $p.Dst /inheritance:r  | Out-Null
        icacls $p.Dst /grant "${user}:F" | Out-Null
        L "  + $($p.Rel) -> $($p.Dst) (ACL locked)" 'Green'
    } else {
        L "  + $($p.Rel) -> $($p.Dst)" 'Green'
    }
}

Remove-Item $stage -Recurse -Force

L ""
L "SUCCESS -- secrets imported." 'Green'
L "Verify:"
L "  ssh ov615-hub 'echo hub reachable'"
L "  gh auth status                       # (gh auth is separate; run 'gh auth login' if needed)"
L "  aws sts get-caller-identity          # (if you bundled AWS creds)"
