# Paid-Beta Release Checklist

Updated: 2026-06-24 · `main` @ `c22a2c7`

## Done

| # | Item | Evidence |
|---|------|----------|
| 1 | P0 automated gates | `test:p0-release` pass (2026-06-24) |
| 2 | API e2e | 36 suites / 170 tests |
| 3 | Staging Docker deploy | `:8081` / `:4000` |
| 4 | P0 formal go | Maheshenga, 2026-06-24 — [evidence](./saas-commercial-mvp-p0-release-evidence.md) |
| 5 | Git tag | `v0.1.0-paid-beta-staging` |
| 6 | API/UI pricing alignment | [p1-r02](./p1-r02-pricing-review.md) + `test:pricing-matrix-sync` |
| 7 | Staging smokes (re-run pass) | `staging-api-smoke`, `staging-callback-smoke` |
| 8 | Cohort notice drafted | [paid-beta-cohort-notice-2026-06-24.md](./paid-beta-cohort-notice-2026-06-24.md) |
| 9 | Finance notice drafted | [paid-beta-finance-notice-2026-06-24.md](./paid-beta-finance-notice-2026-06-24.md) |
| 10 | Release notes | [RELEASE-v0.1.0-paid-beta-staging.md](./RELEASE-v0.1.0-paid-beta-staging.md) |

## Pending (non-blocking for staging cohort)

| # | Item | Owner | Action |
|---|------|-------|--------|
| A | Send cohort notice | Product | Copy cohort notice → Slack/邮件 |
| B | Finance P1-R02 sign-off | Finance | Reply or sign pricing doc |
| C | GitHub Release page | Admin | `gh release create` or web UI |
| D | P1-R03 live provider | Engineering | Optional before production SLA |
| E | `gh auth login` | Admin | Enable CI/release automation from CLI |

## After finance approves prices

1. Update `COMMERCIAL_USAGE_PRICING` (frontend + `apps/api/.../commercial-pricing.ts`)
2. `npm run test:pricing-matrix-sync && npm run test:staging-api-smoke`
3. `docker compose --env-file .env.deploy up -d --build api`
4. Mark P1-R02 closed in evidence doc

## MVP completion (current)

| Layer | ~% |
|-------|-----|
| P0 control plane | **100%** (signed) |
| Paid-beta staging | **~90%** (await finance + optional GH release page) |
| Production billing | **~75%** (P1-R02) |
| Registry | **91%** (61/67) |
