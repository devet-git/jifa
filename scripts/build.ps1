# build.ps1 — Build backend (Go) and frontend (Next.js) into dist/
# Usage:
#   .\scripts\build.ps1
#   .\scripts\build.ps1 -Os linux     (for Linux server)
param(
    [string]$Os = "windows",
    [string]$Arch = "amd64",
    [string]$OutDir = "$PSScriptRoot\..\dist"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\.."

# Ensure dist directory exists
if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Force $OutDir | Out-Null
}
$dist = Resolve-Path $OutDir

Write-Host ""
Write-Host "=== JIFA BUILD ===" -ForegroundColor Cyan
Write-Host "OS: $Os | Arch: $Arch | Output: $dist"
Write-Host ""

# ── Backend ──────────────────────────────────────────────────────────────────
Write-Host "[1/2] Building backend (Go)..." -ForegroundColor Yellow

New-Item -ItemType Directory -Force "$dist\backend" | Out-Null
$backendOut = if ($Os -eq "windows") { "$dist\backend\jifa-server.exe" } else { "$dist\backend\jifa-server" }

$env:GOOS   = $Os
$env:GOARCH = $Arch
Set-Location "$root\backend"
go build -ldflags="-s -w" -o $backendOut ./cmd/server/main.go
if ($LASTEXITCODE -ne 0) { Write-Error "Backend build failed"; exit 1 }

# Copy .env template if dist doesn't have one yet
if (-not (Test-Path "$dist\backend\.env")) {
    Copy-Item "$root\backend\.env.example" "$dist\backend\.env.example"
    Write-Host "  Copied .env.example -> dist\backend\ (rename to .env and fill in real values)" -ForegroundColor DarkYellow
}
Write-Host "  -> $backendOut" -ForegroundColor Green

# ── Frontend ─────────────────────────────────────────────────────────────────
Write-Host "[2/2] Building frontend (Next.js)..." -ForegroundColor Yellow

Set-Location "$root\frontend"

# NEXT_PUBLIC_API_URL is baked in at build time — require .env.local
if (-not (Test-Path ".env.local")) {
    Write-Error @"

frontend\.env.local not found!
Create it with the real server address before building:

  NEXT_PUBLIC_API_URL=http://<server-ip-or-domain>:8080/api/v1

"@
    exit 1
}

npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend build failed"; exit 1 }

# Package standalone output (static assets are NOT bundled inside standalone)
$frontendDist = "$dist\frontend"
if (Test-Path $frontendDist) { Remove-Item -Recurse -Force $frontendDist }
New-Item -ItemType Directory -Force $frontendDist | Out-Null

Copy-Item -Recurse ".next\standalone\*" $frontendDist
New-Item -ItemType Directory -Force "$frontendDist\.next" | Out-Null
Copy-Item -Recurse ".next\static" "$frontendDist\.next\static"
if (Test-Path "public") {
    Copy-Item -Recurse "public" "$frontendDist\public"
}
Write-Host "  -> $frontendDist" -ForegroundColor Green

# ── Summary ──────────────────────────────────────────────────────────────────
Set-Location $root
Write-Host ""
Write-Host "Build complete!" -ForegroundColor Cyan
Write-Host "  dist\backend\   — Go server binary"
Write-Host "  dist\frontend\  — Next.js standalone server"
Write-Host ""
Write-Host "Next step: .\scripts\deploy.ps1 -Server '\\<server-ip>\jifa' (or a local path for testing)"
