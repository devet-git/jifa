# restart-services.ps1 — Restart Jifa services on the server after a deploy
# Run this on the server itself (or call via Invoke-Command from deploy machine)
# Requires: Run as Administrator

$ErrorActionPreference = "Stop"

Write-Host "Restarting Jifa services..." -ForegroundColor Cyan

Restart-Service -Name "jifa-backend"  -Force
Write-Host "  jifa-backend  restarted" -ForegroundColor Green

Restart-Service -Name "jifa-frontend" -Force
Write-Host "  jifa-frontend restarted" -ForegroundColor Green

Write-Host ""
$b = Get-Service "jifa-backend"
$f = Get-Service "jifa-frontend"
Write-Host "Status:"
Write-Host "  jifa-backend  : $($b.Status)"
Write-Host "  jifa-frontend : $($f.Status)"
