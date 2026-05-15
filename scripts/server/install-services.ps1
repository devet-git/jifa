# install-services.ps1 — Run ONCE on the Windows Server to install Jifa as Windows Services
# Requires: NSSM (Non-Sucking Service Manager) — https://nssm.cc/download
# Requires: Node.js 20+ installed on the server
# Requires: Run as Administrator
#
# Usage:
#   .\install-services.ps1 -AppDir 'C:\jifa' -NodePath 'C:\Program Files\nodejs\node.exe'
param(
    [Parameter(Mandatory)][string]$AppDir,
    [string]$NodePath  = "node",
    [string]$NssmPath  = "nssm",
    [int]$BackendPort  = 8080,
    [int]$FrontendPort = 3000
)

$ErrorActionPreference = "Stop"

# Verify NSSM is available
try { & $NssmPath version 2>&1 | Out-Null }
catch {
    Write-Error @"
NSSM not found at '$NssmPath'.
Download from https://nssm.cc/download, extract, and either:
  - Put nssm.exe in C:\Windows\System32, or
  - Pass -NssmPath 'C:\tools\nssm\nssm.exe'
"@
    exit 1
}

# Verify Node.js
$nodeExe = (Get-Command $NodePath -ErrorAction SilentlyContinue)?.Source
if (-not $nodeExe) {
    Write-Error "Node.js not found. Install from https://nodejs.org (LTS) then retry."
    exit 1
}

Write-Host "Installing Jifa Windows Services..." -ForegroundColor Cyan
Write-Host "  App directory : $AppDir"
Write-Host "  Node.js       : $nodeExe"
Write-Host ""

# ── jifa-backend ──────────────────────────────────────────────────────────────
Write-Host "[1/2] Installing jifa-backend service..." -ForegroundColor Yellow

$backendExe = "$AppDir\backend\jifa-server.exe"
if (-not (Test-Path $backendExe)) {
    Write-Error "Binary not found: $backendExe`nRun deploy.ps1 first to copy files."
    exit 1
}

& $NssmPath install jifa-backend $backendExe
& $NssmPath set jifa-backend AppDirectory "$AppDir\backend"
& $NssmPath set jifa-backend AppEnvironmentExtra "PORT=$BackendPort"
& $NssmPath set jifa-backend AppStdout "$AppDir\logs\backend.log"
& $NssmPath set jifa-backend AppStderr "$AppDir\logs\backend-error.log"
& $NssmPath set jifa-backend AppRotateFiles 1
& $NssmPath set jifa-backend AppRotateBytes 10485760  # 10 MB
& $NssmPath set jifa-backend Start SERVICE_AUTO_START
Write-Host "  jifa-backend installed." -ForegroundColor Green

# ── jifa-frontend ─────────────────────────────────────────────────────────────
Write-Host "[2/2] Installing jifa-frontend service..." -ForegroundColor Yellow

$frontendServer = "$AppDir\frontend\server.js"
if (-not (Test-Path $frontendServer)) {
    Write-Error "server.js not found: $frontendServer`nRun deploy.ps1 first to copy files."
    exit 1
}

New-Item -ItemType Directory -Force "$AppDir\logs" | Out-Null

& $NssmPath install jifa-frontend $nodeExe "$frontendServer"
& $NssmPath set jifa-frontend AppDirectory "$AppDir\frontend"
& $NssmPath set jifa-frontend AppEnvironmentExtra "PORT=$FrontendPort" "HOSTNAME=0.0.0.0"
& $NssmPath set jifa-frontend AppStdout "$AppDir\logs\frontend.log"
& $NssmPath set jifa-frontend AppStderr "$AppDir\logs\frontend-error.log"
& $NssmPath set jifa-frontend AppRotateFiles 1
& $NssmPath set jifa-frontend AppRotateBytes 10485760  # 10 MB
& $NssmPath set jifa-frontend Start SERVICE_AUTO_START
Write-Host "  jifa-frontend installed." -ForegroundColor Green

# ── Verify .env ───────────────────────────────────────────────────────────────
if (-not (Test-Path "$AppDir\backend\.env")) {
    Write-Host ""
    Write-Host "WARNING: $AppDir\backend\.env not found!" -ForegroundColor Red
    Write-Host "Copy .env.example to .env and fill in the real values before starting services."
} else {
    # Start services
    Write-Host ""
    Write-Host "Starting services..." -ForegroundColor Yellow
    Start-Service jifa-backend
    Start-Service jifa-frontend
    Write-Host "Services started." -ForegroundColor Green
}

Write-Host ""
Write-Host "Done! Manage services:" -ForegroundColor Cyan
Write-Host "  Start : Start-Service jifa-backend; Start-Service jifa-frontend"
Write-Host "  Stop  : Stop-Service  jifa-backend; Stop-Service  jifa-frontend"
Write-Host "  Logs  : Get-Content $AppDir\logs\backend.log -Wait"
Write-Host "  UI    : Services.msc  (search 'jifa')"
