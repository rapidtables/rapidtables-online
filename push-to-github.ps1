# RapidTables.online - 1-Click Push to GitHub PowerShell Script
$Host.UI.RawUI.WindowTitle = "Push RapidTables to GitHub"
Set-Location -Path $PSScriptRoot

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  RapidTables.online - 1-Click Push to GitHub" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# Check Git
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    Write-Host "[!] Git is not installed." -ForegroundColor Yellow
    Write-Host "[*] Installing Git automatically via winget..." -ForegroundColor Cyan
    winget install --id Git.Git -e --source winget
    Write-Host "[*] Git installed! Please re-open PowerShell and run this script again." -ForegroundColor Green
    Read-Host "Press Enter to exit"
    exit
}

# Init git
if (-not (Test-Path ".git")) {
    Write-Host "[*] Initializing local Git repository..." -ForegroundColor Cyan
    git init
    git branch -M main
}

$repoUrl = Read-Host "Enter your GitHub Repository URL (e.g. https://github.com/yourname/rapidtables-online.git)"
if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    Write-Host "[!] Repository URL cannot be empty." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

git remote remove origin 2>$null
git remote add origin $repoUrl.Trim()

Write-Host "[*] Adding all files..." -ForegroundColor Cyan
git add .

Write-Host "[*] Creating commit..." -ForegroundColor Cyan
git commit -m "Deploy RapidTables.online full suite with all PDF tools & calculators"

Write-Host "[*] Pushing to GitHub (main)..." -ForegroundColor Cyan
git push -u origin main

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  SUCCESS! Your codebase is now live on GitHub!" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Read-Host "Press Enter to finish"
