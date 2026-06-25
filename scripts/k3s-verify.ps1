#Requires -Version 5.1
<#
.SYNOPSIS
  k3s paid-beta smoke: wait for API then run test:staging-verify.

.EXAMPLE
  .\scripts\k3s-verify.ps1
  .\scripts\k3s-verify.ps1 -ApiUrl "http://127.0.0.1:30400"
#>
param(
  [string]$ApiUrl = "http://127.0.0.1:30400",
  [int]$WaitSeconds = 45
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Waiting ${WaitSeconds}s for API at $ApiUrl ..." -ForegroundColor Cyan
Start-Sleep -Seconds $WaitSeconds

$env:STAGING_API_URL = $ApiUrl
npm run test:staging-verify
exit $LASTEXITCODE