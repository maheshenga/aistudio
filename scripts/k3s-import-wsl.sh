#!/usr/bin/env bash
# Import aistudio images built on Windows (Docker Desktop) into WSL k3s.
# Run inside WSL from repo root (e.g. /mnt/e/code/aistudio).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PUBLIC_API_URL="${PUBLIC_API_URL:-http://localhost:4000}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found in WSL. Enable Docker Desktop WSL integration, or build on the k3s node."
  exit 1
fi

echo "Building images (PUBLIC_API_URL=$PUBLIC_API_URL for web)..."
docker build -t aistudio/api:latest ./apps/api
docker build \
  --build-arg VITE_DATA_BACKEND=http \
  --build-arg VITE_DATA_API_URL="$PUBLIC_API_URL" \
  -t aistudio/web:latest .

if command -v k3s >/dev/null 2>&1; then
  echo "Importing into k3s ctr..."
  docker save aistudio/api:latest | sudo k3s ctr images import -
  docker save aistudio/web:latest | sudo k3s ctr images import -
  sudo k3s ctr images ls | grep aistudio || true
else
  echo "k3s not in PATH. Pipe manually on the node:"
  echo "  docker save aistudio/api:latest | sudo k3s ctr images import -"
fi

echo "Done. kubectl apply via: ./scripts/k3s-deploy.ps1 -SkipBuild (from Windows) or kubectl apply -f deploy/k3s/"