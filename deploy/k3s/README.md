# AI Studio on k3s (local / single-node)

Mirrors [docker-compose.yml](../../docker-compose.yml): **PostgreSQL + Nest API + nginx web**.

## Prerequisites

- k3s running (`kubectl get nodes`)
- **Docker** to build images (Docker Desktop on Windows, or build on the k3s node)
- `.env.deploy` with `JWT_SECRET`, `FIELD_ENCRYPTION_KEY`, `POSTGRES_PASSWORD` (see [.env.deploy.example](../../.env.deploy.example))

## Quick deploy (Windows / PowerShell)

```powershell
cd E:\code\aistudio
Copy-Item .env.deploy.example .env.deploy
# edit secrets

# Build images + apply manifests
.\scripts\k3s-deploy.ps1

# Import images into k3s (if API pods ImagePullBackOff — build on another machine)
.\scripts\k3s-build-images.ps1 -ImportToK3s
```

### URLs (default NodePort)

| Service | NodePort | Browser / smoke |
|---------|----------|-----------------|
| API | **30400** | `STAGING_API_URL=http://<node-ip>:30400` |
| Web | **30080** | Open `http://<node-ip>:30080` |

Single-node k3s on the same PC: `<node-ip>` is often the LAN IP or `127.0.0.1` if k3s binds it.

**Web build arg:** `PUBLIC_API_URL` must match what the **browser** uses to call the API. Examples:

- Same host, NodePort: `http://192.168.x.x:30400` → rebuild web:  
  `.\scripts\k3s-build-images.ps1 -PublicApiUrl "http://192.168.x.x:30400"`
- Local port-forward (below): `http://localhost:4000`

Set `CORS_ORIGINS` in `.env.deploy` to include the web origin (e.g. `http://localhost:30080` or `http://192.168.x.x:30080`).

## Smoke (Gate G1)

```powershell
.\scripts\k3s-verify.ps1 -ApiUrl "http://127.0.0.1:30400"
# or port-forward:
kubectl port-forward -n aistudio svc/api 4000:4000
$env:STAGING_API_URL = "http://127.0.0.1:4000"
npm run test:staging-verify
```

## Image workflow on k3s

k3s uses **containerd**, not Docker daemon inside the cluster.

1. `docker build` on your workstation (scripts/k3s-build-images.ps1).
2. **Import** into k3s:
   - Linux / WSL k3s: `bash scripts/k3s-import-wsl.sh` (set `PUBLIC_API_URL` if not localhost:4000)
   - Or: `docker save aistudio/api:latest | sudo k3s ctr images import -`
   - Or push to a registry and set `image:` + `imagePullPolicy: Always` in yaml.

**Windows Docker + WSL k3s (common):** build in WSL with Docker Desktop integration, then `k3s-import-wsl.sh`. From Windows PowerShell deploy manifests only: `.\scripts\k3s-deploy.ps1 -SkipBuild`.

Deployments use `imagePullPolicy: IfNotPresent` and tags `aistudio/api:latest`, `aistudio/web:latest`.

## Manual apply

```bash
kubectl apply -f deploy/k3s/namespace.yaml
# create secrets from secret.example.yaml or secret.generated.yaml
kubectl apply -f deploy/k3s/postgres-pvc.yaml
kubectl apply -f deploy/k3s/postgres.yaml
kubectl apply -f deploy/k3s/api.yaml
kubectl apply -f deploy/k3s/web.yaml
```

## Files

| File | Purpose |
|------|---------|
| namespace.yaml | `aistudio` namespace |
| secret.example.yaml | Template secrets (edit locally) |
| secret.generated.yaml | From `k3s-deploy.ps1` (**gitignored**) |
| postgres-pvc.yaml | 5Gi local-path PVC |
| postgres.yaml | postgres:16-alpine |
| api.yaml | Nest API, NodePort 30400 |
| web.yaml | nginx SPA, NodePort 30080 |

## Teardown

```bash
kubectl delete namespace aistudio
```

PVC is removed with the namespace unless you keep PVs per cluster policy.

## Related

- [deployment.md](../../docs/deployment.md) — Compose reference
- [local-env-clash-k3s.md](../../docs/local-env-clash-k3s.md) — Clash + push
- [mvp-phase0-ops-runbook.md](../../docs/mvp-phase0-ops-runbook.md)