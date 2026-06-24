# Commercial MVP P0 Batch 1 Release Evidence

Status: **P0 go signed** (2026-06-24); paid-beta staging authorized; P1-R02 unit-price sign-off still open  
Owner: Commercial MVP workspace owner  
Date: 2026-06-24 (progress snapshot)  
Build: `main` @ `a0456fe` (tag `v0.1.0-paid-beta-staging`)  
Branch: `main`

## Release Scope

- Included: Dashboard, Workflow, Tasks, Agent Status, Data, Assets, Projects, Billing, API Keys, Settings, Admin, and Activity Logs.
- Excluded: `ai_canvas`, P1/P2/P3 expansion modules, and live desktop Multica certification unless explicitly recorded below.
- Runtime posture: Web standalone must pass without Multica. Desktop Multica and self-hosted Multica are optional modes with documented compatibility evidence.

## Automated Verification

Run this command before release sign-off:

```powershell
npm.cmd run test:p0-release
```

The `test:p0-release` gate runs:

- `npm run test:p0-specialized`
- `npm run test:launch-readiness`
- `npm run test:saas-foundation`
- `npm run lint`
- `npm run build`
- `npm run test:browser-smoke`

Recorded current result:

- `npm.cmd run test:p0-specialized`: pass on 2026-06-10 local verification.
- `npm.cmd run test:p0-release`: pass on 2026-06-10 local verification.
- `git diff --check`: pass on 2026-06-10 local verification. PowerShell may show LF/CRLF warnings, but no whitespace errors were reported.

## Specialized Verification

These checks are included in `npm.cmd run test:p0-specialized`, which is part of `npm.cmd run test:p0-release`, to prove repository, registry, runtime, and Multica compatibility boundaries:

- `npm.cmd run test:product-registry`: pass.
- `npm.cmd run test:data-backend`: pass.
- `npm.cmd run test:workspace-state`: pass.
- `npm.cmd run test:runtime-contract`: pass.
- `npm.cmd run test:desktop-bridge`: pass.
- `npm.cmd run test:multica-mappers`: pass.
- `npm.cmd run test:multica-runtime-provider`: pass.
- `npm.cmd run test:web-runtime-provider`: pass.
- `npm.cmd run test:multica-api-client`: pass.

## Browser Smoke Evidence

- Dashboard -> task -> asset -> billing -> audit -> reload: pass in automated browser smoke. The smoke seeds P0 task, asset, usage, billing, settings, and audit records, reloads the app, and verifies state remains visible.
- Web standalone: pass in automated browser smoke. The app runs in normal Vite browser mode with no Multica bridge, daemon, API URL, or WS URL required for P0 navigation and manual work.
- Permission matrix for viewer/operator/admin/owner: pass in automated browser smoke. Viewer, operator, admin, billing, and owner role expectations are checked across protected P0 actions and navigation.
- Quota block before runtime/provider execution: pass in automated browser smoke. Low-quota state blocks quota-sensitive execution before provider or runtime dispatch.
- Activity Logs evidence for task, asset, settings, API key, billing, runtime, and admin/provider events: pass in automated browser smoke and SaaS foundation tests. Seeded and repository-backed events are asserted after reload.

## Manual Smoke

- Web standalone: pass via automated browser smoke.
- Desktop Multica: not promoted for live-device release certification in this P0 evidence package. Compatibility checks passed through runtime contract, desktop bridge, Multica mapper, runtime provider, and API client tests.
- Self-hosted Multica: not promoted for live-deployment release certification in this P0 evidence package. Compatibility checks passed through Multica runtime provider, API client, mapper, and runtime contract tests.
- P0 cockpit: pass via automated Dashboard, task, asset, billing, audit, reload, runtime, and permission smoke.
- P1 revenue workflow: not in P0 Batch 1 release scope.
- P2 selected modules: not in P0 Batch 1 release scope.
- Permissions and quota: pass via automated permission matrix and quota-block browser smoke.

## Known Warnings

- Vite may report the `app-ops` chunk as larger than 500 kB.
- Desktop Multica is release-blocking only when the release explicitly promotes desktop mode.
- Self-hosted Multica is release-blocking only when the release explicitly promotes self-hosted mode.

## Release Decision

Decision: pending human `go` / `no-go`
Approver: pending
Notes: P0 Batch 1 automated release gate is ready for sign-off. Desktop Multica and self-hosted Multica are compatibility modes for this evidence package, not release-blocking promoted modes unless the release scope is expanded.

## Human Sign-Off Record

Complete this section after re-running the release gate on the target build (branch/commit) and any staging smoke.

### Verification rerun (fill before sign-off)

| Check | Command / action | Result | Date | Operator |
|---|---|---|---|---|
| Full P0 release gate | `npm run test:p0-release` | pass | 2026-06-24 | agent verification |
| API e2e (if HTTP backend deployed) | `cd apps/api && npm test` | pass (36 suites / 170 tests) | 2026-06-24 | agent verification |
| Staging compose smoke | `docker compose --env-file .env.deploy up -d --build` then register → job → reload | pass (login persists on reload; generation job hold 5 + capture on succeed) | 2026-06-24 | agent + user verification |
| Staging API automated smoke | `npm run test:staging-api-smoke` | pass (hold/capture/refund + refresh) | 2026-06-24 | agent verification (re-run pass) |
| Staging callback smoke (P1-R03) | `npm run test:staging-callback-smoke` | pass (video/remix/director hold/capture/refund/idempotent) | 2026-06-24 | agent verification |
| Pricing matrix API/UI sync | `npm run test:pricing-matrix-sync` | pass | 2026-06-24 | agent verification |
| Staging UI image module smoke | Login → 商用级图像生成 → asset on dashboard | pass (`image-*.jpg` asset visible; JWT session persists) | 2026-06-24 | user + agent verification |
| Git cleanliness | `git diff --check` | pass | 2026-06-24 | agent verification |

Target build:

- Branch: `main` (merged 2026-06-24 from `fix/credit-retry-fund-loss`)
- Commit: `a0456fe`
- Environment: local Docker staging (`http://localhost:8081` + API `:4000`)

### P0 scope checklist

| # | Gate | Pass? | Notes |
|---|------|-------|-------|
| 1 | All 12 P0 work packages behave as documented | yes | automated + staging |
| 2 | Web standalone works without Multica | yes | browser smoke + staging |
| 3 | Reload preserves workspace state | yes | user verified JWT session |
| 4 | Protected actions respect role matrix | yes | browser smoke |
| 5 | Quota block before billable dispatch | yes | browser smoke + credit hold API |
| 6 | Activity Logs capture key P0 actions | yes | saas-foundation + smoke |
| 7 | No raw secrets visible after save (Settings / API Keys) | yes | P3 release gate contracts |
| 8 | Known warnings accepted (chunk size, optional Multica) | yes | Vite chunk warning only |

### Go / No-Go

| Field | Value |
|---|---|
| **Decision** | **go** |
| **Approver name** | Maheshenga |
| **Approver role** | Product owner |
| **Sign-off date** | 2026-06-24 |
| **Paid-beta authorized?** | **yes** (staging cohort) |
| **Self-hosted authorized?** | **yes** |
| **Blockers (if no-go)** | P1-R02 finance unit-price sign-off; live external provider (non-blocking for staging) |

### Product owner sign-off (copy when ready)

```
Decision: go
Approver name: Maheshenga
Approver role: Product owner
Sign-off date: 2026-06-24
Paid-beta authorized: yes (staging cohort)
Self-hosted authorized: yes
Notes: P0 automated + staging API/UI smoke complete on main @ a0456fe (tag v0.1.0-paid-beta-staging). P1-R02 pricing review scheduled. P1-R03 external provider deferred; mock-render API path certified.
```

### P1 follow-ups (post P0 go)

| ID | Item | Owner | Status |
|---|---|---|---|
| P1-R02 | Lock billing credit estimates vs commercial pricing | Product / Finance | API aligned with matrix (2026-06-24); unit price sign-off open — [p1-r02-pricing-review.md](./p1-r02-pricing-review.md) |
| P1-R03 | Real provider callback smoke (video/remix/director) | Engineering | contract + staging API pass (`test:provider-callback`, `test:staging-callback-smoke`, 2026-06-24); live external provider open — see [paid-beta-scope.md](./paid-beta-scope.md) |

### Post sign-off actions

- [x] Merge release branch to `main` (2026-06-24, `f7f527a`)
- [x] Tag release: `v0.1.0-paid-beta-staging` (2026-06-24)
- [x] Deploy staging with `docs/deployment.md` (Docker stack running on `:8081` / `:4000`, 2026-06-24)
- [ ] Notify team of paid-beta scope — templates in [paid-beta-announcement.md](./paid-beta-announcement.md)
- [ ] Schedule provider smoke (P1-R03) and pricing review (P1-R02)

## MVP Progress Snapshot (2026-06-24)

Engineering assessment for paid-beta staging on `main` @ `593b378`.

| Layer | ~Complete | Notes |
|-------|-----------|--------|
| P0 control plane | **100%** | Go signed 2026-06-24; staging authorized |
| P1 paid-beta revenue | **85%** | Creation/marketing/remix/director chains wired; mock-render API certified |
| Self-hosted deploy | **90%** | Docker compose + smoke scripts; JWT + module-priced credits verified |
| Registry honesty | **91%** | **61 / 67** visible modules `implemented`; 6 mock (canvas, keywords, avatar×4) |
| Commercial billing | **80%** | API/UI pricing matrix aligned; **finance unit-price sign-off open** (P1-R02) |
| Live external provider | **40%** | P1-R03 contract + staging API pass; real Multica/render provider deferred |

**Paid-beta staging:** **authorized** (P0 go, 2026-06-24).

**Production card billing blockers:** P1-R02 finance confirmation of `COMMERCIAL_USAGE_PRICING` unit credits only.

**Mock / out of cohort scope:** `ai_canvas`, `copywriting_keywords`, `avatar_home`, `avatar_create`, `avatar_voice`, `avatar_space`.

**Key verification commands:**

```powershell
npm run test:p0-release
npm run test:staging-api-smoke
npm run test:staging-callback-smoke
npm run test:pricing-matrix-sync
cd apps/api && npm test
```
