#Requires -Version 5.1
<#
.SYNOPSIS
  Paid-beta Staging on k3s: build (optional import), deploy, smoke (G1).

.DESCRIPTION
  One entry for Gate G1 when using k3s instead of docker compose.
  Requires: kubectl, Docker (build), .env.deploy with secrets.
  Images must be visible to k3s (use -ImportToK3s or WSL scripts/k3s-import-wsl.sh).

.PARAMETER SkipBuild
  Only apply manifests and run smoke (images already on node).

.PARAMETER ImportToK3s
  After docker build, run k3s ctr images import (Linux/WSL k3s on same machine).

.PARAMETER WslImport
  Run bash scripts/k3s-import-wsl.sh instead of Windows docker build (k3s in WSL).

.EXAMPLE
  .\scripts\k3s-staging.ps1
  .\scripts\k3s-staging.ps1 -SkipBuild
  .\scripts\k3s-staging.ps1 -WslImport
#>
param(
  [string]$EnvFile = ".env.deploy",
  [switch]$SkipBuild,
  [switch]$ImportToK3s,
  [switch]$WslImport,
  [string]$ApiUrl = "http://127.0.0.1:30400",
  [string]$PublicApiUrl = "http://127.0.0.1:30400"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== AI Studio Staging (k3s) ===" -ForegroundColor Cyan

if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
  Write-Error "kubectl not in PATH. Point KUBECONFIG at your k3s cluster."
}

if (-not (Test-Path $EnvFile)) {
  Write-Host "Create $EnvFile from .env.deploy.example (JWT_SECRET, FIELD_ENCRYPTION_KEY, POSTGRES_PASSWORD)." -ForegroundColor Yellow
  exit 1
}

# Recommend CORS for NodePort web
$corsLine = Get-Content $EnvFile | Where-Object { $_ -match '^\s*CORS_ORIGINS=' } | Select-Object -First 1
if ($corsLine -notmatch '30080' -and $corsLine -notmatch '127\.0\.0\.1') {
  Write-Host "Tip: set CORS_ORIGINS=http://127.0.0.1:30080 (or your Web NodePort origin) in $EnvFile" -ForegroundColor Yellow
}

if ($WslImport -and -not $SkipBuild) {
  $env:PUBLIC_API_URL = $PublicApiUrl
  bash "$PSScriptRoot/k3s-import-wsl.sh"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  $SkipBuild = $true
}

if (-not $SkipBuild) {
  $buildArgs = @{ PublicApiUrl = $PublicApiUrl }
  if ($ImportToK3s) { $buildArgs.ImportToK3s = $true }
  & "$PSScriptRoot\k3s-build-images.ps1" @buildArgs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

& "$PSScriptRoot\k3s-deploy.ps1" -EnvFile $EnvFile -SkipBuild -PublicApiUrl $PublicApiUrl
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Checking pods..." -ForegroundColor Cyan
kubectl get pods -n aistudio
$apiPod = kubectl get pods -n aistudio -l app=api -o jsonpath='{.items[0].status.phase}' 2>$null
if ($apiPod -ne "Running") {
  Write-Host "API pod not Running ($apiPod). If ImagePullBackOff, import images: k3s-import-wsl.sh or k3s-build-images.ps1 -ImportToK3s" -ForegroundColor Yellow
}

& "$PSScriptRoot\k3s-verify.ps1" -ApiUrl $ApiUrl -WaitSeconds 30
exit $LASTEXITCODE