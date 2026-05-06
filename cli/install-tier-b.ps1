# Tier B installer - installs PATH-level CLI tools via winget, pip, npm.
#
# Idempotent: winget already short-circuits "already installed" packages.
# pip/npm packages use `--upgrade` so they self-update.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\install-tier-b.ps1

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "[cli/tier-b] $msg" -ForegroundColor Cyan }
function Write-Skip($msg) { Write-Host "[cli/tier-b] (skip) $msg" -ForegroundColor DarkGray }

function Have-Winget {
    return [bool](Get-Command winget -ErrorAction SilentlyContinue)
}

if (-not (Have-Winget)) {
    Write-Error "winget is not on PATH. Install 'App Installer' from the Microsoft Store first."
    exit 1
}

# winget package list. Order matters slightly: Git first so subsequent
# installs can use Git Bash if they need to.
$packages = @(
    @{ Id = 'Git.Git';                Name = 'Git for Windows' },
    @{ Id = 'GitHub.cli';             Name = 'GitHub CLI' },
    @{ Id = 'Python.Python.3.12';     Name = 'Python 3.12' },
    @{ Id = 'OpenJS.NodeJS.LTS';      Name = 'Node.js LTS' },
    @{ Id = 'Amazon.AWSCLI';          Name = 'AWS CLI v2' },
    @{ Id = 'Amazon.SAM-CLI';         Name = 'AWS SAM CLI' },
    @{ Id = 'Docker.DockerDesktop';   Name = 'Docker Desktop' }
)

foreach ($pkg in $packages) {
    Write-Step "Installing $($pkg.Name) ($($pkg.Id))"
    & winget install --id $pkg.Id --exact --silent --accept-package-agreements --accept-source-agreements 2>&1 | Out-Host
}

# WSL - built into Windows. Idempotent: re-running prints a no-op message.
Write-Step "Ensuring WSL is enabled"
try {
    & wsl --install --no-distribution 2>&1 | Out-Host
} catch {
    Write-Skip "wsl --install reported: $($_.Exception.Message)"
}

# Refresh PATH for the current process so subsequent pip/npm calls find
# the freshly-installed Python and Node.
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
            [Environment]::GetEnvironmentVariable('Path', 'User')

# pip packages
$pipPkgs = @('flake8', 'pytest', 'pyinstaller')
if (Get-Command python -ErrorAction SilentlyContinue) {
    foreach ($p in $pipPkgs) {
        Write-Step "pip install --upgrade $p"
        & python -m pip install --upgrade --quiet $p 2>&1 | Out-Host
    }
} else {
    Write-Skip "python not on PATH yet; open a new shell and re-run this script to finish pip installs"
}

# npm packages
$npmPkgs = @('@anthropic-ai/claude-code')
if (Get-Command npm -ErrorAction SilentlyContinue) {
    foreach ($p in $npmPkgs) {
        Write-Step "npm install -g $p"
        & npm install -g $p 2>&1 | Out-Host
    }
} else {
    Write-Skip "npm not on PATH yet; open a new shell and re-run this script to finish npm installs"
}

Write-Step "Done."
Write-Host ""
Write-Host "Verify with:" -ForegroundColor Yellow
Write-Host "  git --version; gh --version; python --version; node --version" -ForegroundColor Yellow
Write-Host "  aws --version; sam --version; docker --version; claude --version" -ForegroundColor Yellow
Write-Host "  flake8 --version; pytest --version; pyinstaller --version" -ForegroundColor Yellow
Write-Host ""
Write-Host "If anything is missing, open a fresh PowerShell window and re-run." -ForegroundColor Yellow
