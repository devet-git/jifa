# deploy.ps1 — Build and deploy Jifa to a Windows Server
#
# Usage (copy via network share):
#   .\scripts\deploy.ps1 -Server '\\192.168.1.10\jifa'
#
# Usage (deploy to local path, e.g. for testing):
#   .\scripts\deploy.ps1 -Server 'C:\jifa'
#
# The script will:
#   1. Build backend + frontend (calls build.ps1)
#   2. Copy dist\ to the server path
#   3. Restart Windows Services on the server (optional)
param(
    [Parameter(Mandatory)][string]$Server,
    [string]$Os       = "windows",
    [string]$Arch     = "amd64",
    # Set to $true to restart services after deploy (requires admin on server)
    [bool]$RestartServices = $false,
    # Server machine name for remote service restart (only needed with -RestartServices $true)
    [string]$ServerName = ""
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\.."
$dist = "$root\dist"

# ── Step 1: Build ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== STEP 1: Build ===" -ForegroundColor Cyan
& "$PSScriptRoot\build.ps1" -Os $Os -Arch $Arch -OutDir $dist
if ($LASTEXITCODE -ne 0) { exit 1 }

# ── Step 2: Copy to server ───────────────────────────────────────────────────
Write-Host ""
Write-Host "=== STEP 2: Copy to server ===" -ForegroundColor Cyan
Write-Host "Destination: $Server"

if (-not (Test-Path $Server)) {
    Write-Error "Server path not reachable: $Server`nMake sure the network share is mounted or the path exists."
    exit 1
}

# Stop services before overwriting binaries (avoids file-lock errors)
if ($RestartServices -and $ServerName) {
    Write-Host "Stopping services on $ServerName..." -ForegroundColor Yellow
    try {
        Invoke-Command -ComputerName $ServerName -ScriptBlock {
            Stop-Service -Name "jifa-backend"  -ErrorAction SilentlyContinue
            Stop-Service -Name "jifa-frontend" -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Host "  Could not stop services remotely (will copy anyway): $_" -ForegroundColor DarkYellow
    }
}

# Robocopy: /MIR mirrors the dist folder, /XF .env skips existing .env files
# /NFL /NDL suppress verbose file listing; /NP hides progress percentage
robocopy "$dist\backend"  "$Server\backend"  /MIR /XF ".env" /NFL /NDL /NP /NJH
robocopy "$dist\frontend" "$Server\frontend" /MIR              /NFL /NDL /NP /NJH

# robocopy exit codes 0-7 are success (8+ are errors)
if ($LASTEXITCODE -ge 8) {
    Write-Error "File copy failed (robocopy exit code $LASTEXITCODE)"
    exit 1
}
Write-Host "Files copied successfully." -ForegroundColor Green

# ── Step 3: Restart services (optional) ─────────────────────────────────────
if ($RestartServices -and $ServerName) {
    Write-Host ""
    Write-Host "=== STEP 3: Restart services on $ServerName ===" -ForegroundColor Cyan
    Invoke-Command -ComputerName $ServerName -ScriptBlock {
        Start-Service -Name "jifa-backend"
        Start-Service -Name "jifa-frontend"
        Write-Host "Services restarted." -ForegroundColor Green
    }
} elseif ($RestartServices) {
    Write-Host ""
    Write-Host "=== STEP 3: Restart local services ===" -ForegroundColor Cyan
    Restart-Service -Name "jifa-backend"  -ErrorAction SilentlyContinue
    Restart-Service -Name "jifa-frontend" -ErrorAction SilentlyContinue
    Write-Host "Services restarted." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Skipping service restart (pass -RestartServices `$true to enable)." -ForegroundColor DarkYellow
    Write-Host "Manually restart services on the server when ready."
}

# ── Done ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Deploy complete!" -ForegroundColor Cyan
Write-Host "  Frontend: http://<server>:3000"
Write-Host "  Backend:  http://<server>:8080"
