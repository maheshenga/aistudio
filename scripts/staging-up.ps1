#Requires -Version 5.1
<#
.SYNOPSIS
  Start staging stack (WSL Docker) and print browser URL.

.EXAMPLE
  .\scripts\staging-up.ps1
#>
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$envFile = ".env.deploy"
if (-not (Test-Path $envFile)) {
  Write-Host "Missing .env.deploy — copy from .env.deploy.example" -ForegroundColor Yellow
  exit 1
}

$webPort = "8080"
$apiPort = "4000"
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*WEB_PORT=(\d+)') { $webPort = $Matches[1] }
  if ($_ -match '^\s*API_PORT=(\d+)') { $apiPort = $Matches[1] }
}

Write-Host "Starting Docker Compose (WSL)..." -ForegroundColor Cyan
wsl -e bash -lc "cd /mnt/e/code/aistudio && docker compose --env-file .env.deploy up -d"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Failed. Is Docker Desktop running with WSL integration?" -ForegroundColor Red
  exit 1
}

Write-Host "Waiting for services (up to 90s)..." -ForegroundColor Cyan
$ok = $false
for ($i = 0; $i -lt 18; $i++) {
  Start-Sleep -Seconds 5
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$webPort/" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) { $ok = $true; break }
  } catch { }
}

wsl -e bash -lc "cd /mnt/e/code/aistudio && docker compose --env-file .env.deploy ps"

if (-not $ok) {
  Write-Host "Web not ready yet. Check: docker compose logs api" -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "Open in browser:" -ForegroundColor Green
Write-Host "  http://127.0.0.1:$webPort"
Write-Host "  http://127.0.0.1:$apiPort  (API; / may return 404)"
Write-Host ""
Write-Host "If browser says 'connection refused': Docker Desktop must be Running." -ForegroundColor Yellow