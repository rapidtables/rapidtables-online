@echo off
title Push RapidTables to GitHub
cd /d "%~dp0"

echo ==================================================================
echo   RapidTables.online - 1-Click Push to GitHub
echo ==================================================================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Git is not installed on your system.
    echo [*] Installing Git automatically via Windows Package Manager (winget)...
    winget install --id Git.Git -e --source winget
    echo.
    echo [*] Please restart this script after the installer finishes.
    pause
    exit /b
)

echo [*] Initializing Git repository...
if not exist ".git" (
    git init
    git branch -M main
)

set /p REPO_URL="Enter your GitHub Repository URL (e.g., https://github.com/yourusername/rapidtables-online.git): "
if "%REPO_URL%"=="" (
    echo [!] Repository URL cannot be empty.
    pause
    exit /b
)

echo [*] Configuring remote origin...
git remote remove origin >nul 2>nul
git remote add origin %REPO_URL%

echo [*] Staging all files...
git add .

echo [*] Creating commit...
git commit -m "Deploy RapidTables.online full suite with all PDF tools & calculators"

echo [*] Pushing to GitHub (main branch)...
git push -u origin main

echo.
echo ==================================================================
echo   SUCCESS! Your codebase is now live on GitHub!
echo ==================================================================
echo.
pause
