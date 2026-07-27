# stage-asset.ps1
# Moves a Nano Banana candidate from _raw/candidates/ to _raw/, then runs the
# optimization pipeline so it ships in public/assets/ as AVIF + WebP variants
# at 5 widths plus a blur LQIP entry.
#
# Usage:
#   .\tools\stage-asset.ps1 _raw\candidates\2026-06-03_hero-landing-desktop-v3.png hero-landing-16x9-light

param(
  [Parameter(Mandatory = $true)][string] $Candidate,
  [Parameter(Mandatory = $true)][string] $Basename
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path $Candidate)) { throw "not found: $Candidate" }

$leaf = Split-Path $Candidate -Leaf
$dest = Join-Path "_raw" $leaf
$sidecarSrc = [IO.Path]::ChangeExtension($Candidate, ".json")
$sidecarDst = [IO.Path]::ChangeExtension($dest, ".json")

Move-Item $Candidate $dest -Force
if (Test-Path $sidecarSrc) { Move-Item $sidecarSrc $sidecarDst -Force }

& node tools/optimize-asset.mjs $dest $Basename
if ($LASTEXITCODE -ne 0) { throw "optimize-asset failed" }

Write-Host "staged: public/assets/$Basename-w{640..2560}.{avif,webp}"
Write-Host "blur:   public/assets/_blur.json updated"
Write-Host "next:   reference '$Basename' in your hero / next/image component"
