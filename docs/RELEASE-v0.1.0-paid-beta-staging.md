# Release v0.1.0-paid-beta-staging

**Date:** 2026-06-24  
**Tag:** `v0.1.0-paid-beta-staging`  
**Branch:** `main` @ `fa498bc`

## Summary

First **paid-beta staging** release: P0 control plane + P1 revenue workflows on self-hosted HTTP stack (PostgreSQL + NestJS API + Vite/nginx).

## Highlights

- JWT auth with session persistence on reload
- Module-priced credit hold/capture/refund on API (aligned with UI matrix)
- Generation jobs, webhooks outbox, staging smoke scripts
- P0 go signed; cohort + finance review notices prepared

## Deploy

```powershell
cp .env.deploy.example .env.deploy
# fill JWT_SECRET, FIELD_ENCRYPTION_KEY, POSTGRES_PASSWORD
docker compose --env-file .env.deploy up -d --build
```

Default ports: web **8081**, api **4000**. See [deployment.md](./deployment.md).

## Verify

```powershell
npm run test:staging-verify
```

## In scope

See [paid-beta-scope.md](./paid-beta-scope.md) — **62/67** modules implemented; mock preview: `ai_canvas`, avatar×4 (`ModulePreviewBanner`).

## Known limitations

- Web standalone uses **mock provider** (not live Gemini/Multica)
- P1-R02 finance unit-price sign-off pending before production card billing
- P1-R03 live external render provider not certified (mock-render API path pass)

## Docs

| Doc | Purpose |
|-----|---------|
| [paid-beta-scope.md](./paid-beta-scope.md) | Cohort scope |
| [paid-beta-cohort-notice-2026-06-24.md](./paid-beta-cohort-notice-2026-06-24.md) | User announcement |
| [paid-beta-finance-notice-2026-06-24.md](./paid-beta-finance-notice-2026-06-24.md) | Finance P1-R02 |
| [saas-commercial-mvp-p0-release-evidence.md](./saas-commercial-mvp-p0-release-evidence.md) | P0 sign-off record |
| [p1-r02-pricing-review.md](./p1-r02-pricing-review.md) | Pricing matrix |

## Create GitHub Release (manual)

`gh` is not authenticated in this environment. On a machine with `gh auth login`:

```powershell
gh release create v0.1.0-paid-beta-staging `
  --title "v0.1.0 Paid-Beta Staging" `
  --notes-file docs/RELEASE-v0.1.0-paid-beta-staging.md
```

Or paste this file body in https://github.com/maheshenga/aistudio/releases/new?tag=v0.1.0-paid-beta-staging
