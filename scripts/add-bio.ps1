$ErrorActionPreference = "Stop"

Clear-Host

# ============================================================
# Find project root
# ============================================================

# add-bio.ps1 is inside:
#   me/scripts/add-bio.ps1
#
# Therefore project root is one level above "scripts".

$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = Split-Path -Parent $ScriptDirectory

Set-Location $ProjectRoot

# ============================================================
# Header
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "        Add Bio Profile" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Project: $ProjectRoot" -ForegroundColor DarkGray
Write-Host ""

# ============================================================
# Get username
# ============================================================

$Username = Read-Host "Username"

if ([string]::IsNullOrWhiteSpace($Username)) {
    Write-Host "Username cannot be empty." -ForegroundColor Red
    exit 1
}

if ($Username -notmatch '^[a-zA-Z0-9][a-zA-Z0-9._-]*$') {
    Write-Host "Invalid username." -ForegroundColor Red
    Write-Host "Allowed characters: letters, numbers, dots, underscores and hyphens."
    exit 1
}

# ============================================================
# Get repository URL
# ============================================================

$RepoUrl = Read-Host "Repository URL"

if ([string]::IsNullOrWhiteSpace($RepoUrl)) {
    Write-Host "Repository URL cannot be empty." -ForegroundColor Red
    exit 1
}

# Normalize accidentally escaped https://
$RepoUrl = $RepoUrl -replace '^https\\://', 'https://'

if ($RepoUrl -notmatch '^https://.+/.+\.git$') {
    Write-Host "Invalid repository URL:" -ForegroundColor Red
    Write-Host $RepoUrl
    Write-Host ""
    Write-Host "Example:"
    Write-Host "https://github.com/owner/repository.git"
    exit 1
}

# ============================================================
# Configuration
# ============================================================

$SubmodulePath = Join-Path "bio" $Username
$CommitMessage = "Add $Username profile as submodule"

Write-Host ""
Write-Host "----------------------------------------"
Write-Host "Username   : $Username"
Write-Host "Repository : $RepoUrl"
Write-Host "Path       : $SubmodulePath"
Write-Host "----------------------------------------"
Write-Host ""

# ============================================================
# Check Git
# ============================================================

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git is not installed or not available in PATH." -ForegroundColor Red
    exit 1
}

git rev-parse --show-toplevel *> $null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Project root is not a Git repository." -ForegroundColor Red
    exit 1
}

# ============================================================
# Check destination
# ============================================================

if (Test-Path $SubmodulePath) {
    Write-Host "Destination already exists:" -ForegroundColor Red
    Write-Host $SubmodulePath
    exit 1
}

# ============================================================
# Create bio directory
# ============================================================

if (-not (Test-Path "bio")) {
    New-Item -ItemType Directory -Path "bio" | Out-Null
}

# ============================================================
# Check .gitmodules
# ============================================================

if (Test-Path ".gitmodules") {
    $GitModulesContent = Get-Content ".gitmodules" -Raw

    if ($GitModulesContent -match [regex]::Escape("path = $SubmodulePath")) {
        Write-Host "This profile already exists in .gitmodules." -ForegroundColor Red
        exit 1
    }
}

# ============================================================
# Confirmation
# ============================================================

$Confirm = Read-Host "Add this profile? [Y/n]"

if ($Confirm -and $Confirm -notmatch '^[Yy]$') {
    Write-Host "Cancelled."
    exit 0
}

# ============================================================
# Add submodule
# ============================================================

Write-Host ""
Write-Host "Adding submodule..." -ForegroundColor Yellow

git submodule add $RepoUrl $SubmodulePath

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to add submodule." -ForegroundColor Red
    exit 1
}

Write-Host "Submodule added successfully." -ForegroundColor Green

# ============================================================
# Stage
# ============================================================

Write-Host "Staging changes..." -ForegroundColor Yellow

git add .gitmodules $SubmodulePath

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to stage changes." -ForegroundColor Red
    exit 1
}

Write-Host "Changes staged." -ForegroundColor Green

# ============================================================
# Commit
# ============================================================

Write-Host "Creating commit..." -ForegroundColor Yellow

git commit -m $CommitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to create commit." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "            Done!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Profile : $Username"
Write-Host "Path    : $SubmodulePath"
Write-Host "Commit  : $CommitMessage"
Write-Host ""
Write-Host "Nothing was pushed."
Write-Host ""

