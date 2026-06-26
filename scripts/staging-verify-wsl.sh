#!/usr/bin/env bash
# Paid-beta staging via Docker Compose (WSL2 + Docker).
# Run from repo root inside WSL, e.g. cd /mnt/e/code/aistudio
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ENV_FILE="${ENV_FILE:-.env.deploy}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — cp .env.deploy.example .env.deploy and set secrets."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found. Enable Docker Desktop WSL integration for your distro."
  exit 1
fi

# Optional: Docker Hub via Windows Clash (WSL can't reach registry without proxy)
GW="$(ip route show default 2>/dev/null | awk '{print $3}')"
if [[ -z "${HTTP_PROXY:-}" && -n "$GW" ]]; then
  export HTTP_PROXY="http://${GW}:7897"
  export HTTPS_PROXY="http://${GW}:7897"
fi

BUILD_FLAG=(--build)
if [[ "${SKIP_BUILD:-}" == "1" ]]; then
  BUILD_FLAG=()
fi

docker compose --env-file "$ENV_FILE" up -d "${BUILD_FLAG[@]}"

echo "Waiting 30s for API..."
sleep 30

npm run test:pricing-matrix-sync
npm run test:staging-api-smoke
npm run test:staging-callback-smoke

echo "Staging verify passed. Web: see WEB_PORT in $ENV_FILE (default 8080)."