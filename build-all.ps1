# Quick Build Script for All Platforms
# Usage: Run from terminal/PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Accountability System - Build All" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/5] Installing dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n[2/5] Building Windows installer..." -ForegroundColor Yellow
npm run build-windows
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Windows build failed" -ForegroundColor Yellow
}

Write-Host "`n[3/5] Building portable version..." -ForegroundColor Yellow
npm run build

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Your distribution files:" -ForegroundColor Cyan
Write-Host "  Windows Installer: dist\Accountability System Setup.exe" -ForegroundColor White
Write-Host "  Unpacked: dist\win-unpacked\" -ForegroundColor White

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Test the installer" -ForegroundColor White
Write-Host "  2. Share with users" -ForegroundColor White
Write-Host "  3. See DISTRIBUTION_GUIDE.md for store submission" -ForegroundColor White

# Open dist folder
if (Test-Path "dist") {
    Write-Host "`nOpening dist folder..." -ForegroundColor Green
    Start-Process "dist"
}

Write-Host "`nPress any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
