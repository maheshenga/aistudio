#Requires -Version 5.1
<#
.SYNOPSIS
  Start paid-beta staging stack and run API smokes (Windows).

.PREREQUISITE
  Docker Desktop + WSL2 integration, or docker in PATH; repo root as cwd.
  WSL-only: bash scripts/staging-verify-wsl.sh

.EXAMPLE
  .\scripts\staging-verify.ps1
  .\scripts\staging-verify.ps1 -SkipBuild
#>
param(
  [switch]$SkipBuild,
  [string]$EnvFile = ".env.deploy"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Test-Path $EnvFile)) {
  Write-Host "Missing $EnvFile — copy from .env.deploy.example and set JWT_SECRET + FIELD_ENCRYPTION_KEY + POSTGRES_PASSWORD" -ForegroundColor Yellow
  exit 1
}

$compose = "docker compose --env-file $EnvFile"
if (-not $SkipBuild) {
  Invoke-Expression "$compose up -d --build"
} else {
  Invoke-Expression "$compose up -d"
}

Write-Host "Waiting for API (30s)..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

npm run test:pricing-matrix-sync
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm run test:staging-api-smoke
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm run test:staging-callback-smoke
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Staging verify passed. Open Web per WEB_PORT in $EnvFile (default 8080)." -ForegroundColor Green