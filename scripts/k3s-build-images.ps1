#Requires -Version 5.1
<#
.SYNOPSIS
  Build aistudio/api and aistudio/web images for local k3s.

.PARAMETER PublicApiUrl
  Baked into web bundle (browser must reach this URL). Default http://localhost:4000
  with NodePort 30400 on the k3s node.

.PARAMETER ImportToK3s
  After docker build, import tarballs into k3s containerd (Linux k3s / WSL).

.EXAMPLE
  .\scripts\k3s-build-images.ps1
  .\scripts\k3s-build-images.ps1 -PublicApiUrl "http://192.168.1.10:30400" -ImportToK3s
#>
param(
  [string]$PublicApiUrl = "http://localhost:4000",
  [switch]$ImportToK3s
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "docker not in PATH. Install Docker Desktop or use Linux node with docker."
}

Write-Host "Building aistudio/api:latest ..." -ForegroundColor Cyan
docker build -t aistudio/api:latest ./apps/api
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Building aistudio/web:latest (VITE_DATA_API_URL=$PublicApiUrl) ..." -ForegroundColor Cyan
docker build `
  --build-arg VITE_DATA_BACKEND=http `
  --build-arg VITE_DATA_API_URL=$PublicApiUrl `
  -t aistudio/web:latest .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($ImportToK3s) {
  $tmp = Join-Path $env:TEMP "aistudio-k3s-import"
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  $apiTar = Join-Path $tmp "api.tar"
  $webTar = Join-Path $tmp "web.tar"
  docker save aistudio/api:latest -o $apiTar
  docker save aistudio/web:latest -o $webTar
  if (Get-Command k3s -ErrorAction SilentlyContinue) {
    sudo k3s ctr images import $apiTar
    sudo k3s ctr images import $webTar
    Write-Host "Imported into k3s ctr." -ForegroundColor Green
  } else {
    Write-Host "k3s CLI not found. On the k3s node run:" -ForegroundColor Yellow
    Write-Host "  sudo k3s ctr images import $apiTar"
    Write-Host "  sudo k3s ctr images import $webTar"
  }
}

Write-Host "Done. Images: aistudio/api:latest, aistudio/web:latest" -ForegroundColor Green