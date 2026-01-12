# AL-IHSAN Academy - Auto Push Script
# This script automates Git commits and pushes for CI/CD

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMsg = "Antigravity Auto-Sync: $timestamp"

Write-Host "--- Starting CI/CD Sync at $timestamp ---" -ForegroundColor Cyan

# 1. Check for changes
$changes = git status --porcelain
if (-not $changes) {
    Write-Host "No changes detected. Skipping deployment." -ForegroundColor Yellow
    exit 0
}

Write-Host "Changes detected:" -ForegroundColor Gray
Write-Host $changes

# 2. Stage and Commit
Write-Host "Staging files..." -ForegroundColor Gray
git add .

Write-Host "Committing changes..." -ForegroundColor Gray
git commit -m "$commitMsg"

# 3. Push to GitHub
Write-Host "Pushing to GitHub (origin main)..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "--- Deployment Successful! ---" -ForegroundColor Green
    Write-Host "Check Vercel for live update: https://alihsanacademy.vercel.app/" -ForegroundColor Green
} else {
    Write-Error "Push failed. Please check your internet connection or git permissions."
    exit 1
}
