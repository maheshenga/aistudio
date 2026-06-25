# Paid-Beta Scope And Readiness

Updated: 2026-06-24  
Target build: `main` @ `593b378`

## Purpose

Define what paid-beta cohorts may use on **self-hosted / staging HTTP mode**, what remains mock or deferred, and the manual certification checklist before charging real customers.

Related docs:

- P0 sign-off: [saas-commercial-mvp-p0-release-evidence.md](./saas-commercial-mvp-p0-release-evidence.md)
- Deploy: [deployment.md](./deployment.md)
- P1 revenue modules: [saas-commercial-mvp-p1-revenue-progress.md](./saas-commercial-mvp-p1-revenue-progress.md)
- Open issues: [saas-commercial-mvp-remaining-issues.md](./saas-commercial-mvp-remaining-issues.md)

## Runtime Requirements

Paid-beta staging **must** run with HTTP backend, not browser-only localStorage:

| Setting | Staging example | Notes |
|---|---|---|
| `VITE_DATA_BACKEND` | `http` | Baked at Docker build time |
| `VITE_DATA_API_URL` | `http://localhost:4000` | Browser-reachable API URL |
| `CORS_ORIGINS` | include web origin, e.g. `http://localhost:8081` | Must match how users open the app |
| Auth | JWT register/login | Session persists on reload (user verified 2026-06-24) |
| Credits | API hold/capture/refund | Module-priced holds verified (e.g. `image` −8, `video` −24); see `test:staging-api-smoke` |

Start stack:

```powershell
docker compose --env-file .env.deploy up -d --build
```

## In Scope (Paid-Beta)

### P0 control plane (required baseline)

Dashboard, Workflow, Tasks, Agent Status, Data, Assets, Projects, Billing, API Keys, Settings, Admin, Activity Logs, Finance, Tax, Team, Store ops modules, CRM, Customer Service, Media, and related permission/quota/audit flows.

Evidence: `npm run test:p0-release` + API e2e (36 suites / 170 tests) on 2026-06-24.

### P1 creation and revenue modules (paid-beta ready)

Per [saas-commercial-mvp-p1-revenue-progress.md](./saas-commercial-mvp-p1-revenue-progress.md), these modules persist **generation job → asset → usage → audit → billing visibility**:

| Domain | Modules |
|---|---|
| E-commerce | `e_main_image`, `e_video`, `e_detail_page`, `e_poster`, `e_clone`, `ai_image_edit` |
| Image / video | `image`, `video` |
| Copy / chat / speech | `copywriting_create`, `copywriting_tools`, `chat`, `speech` |
| Remix | `remix_home`, `remix_smart`, `remix_viral`, `remix_materials`, `remix_titles`, `remix_templates` |
| Marketing | `marketing_viral`, `marketing_nfc`, `marketing_website` |
| Director | `director_desk` |
| Design workflows | `design_logo`, `design_packaging`, `design_ads`, `design_interior`, `design_fashion` |

Registry: **62 / 67** visible features marked `implemented` (`scripts/product-registry.test.ts`; `copywriting_keywords` promoted 2026-06-26).

### P3 developer surface (staging)

Webhook outbox, delivery history, HMAC signing, test send — available when API + migration `20260624120000_add_webhook_delivery` are deployed.

## Out Of Scope Or Mock (Do Not Promote)

| Module(s) | Readiness | Reason |
|---|---|---|
| `ai_canvas` | mock (default) | No persisted creation pipeline |
| `copywriting_keywords` | mock (default) | Keyword library CRUD incomplete (P1-R06) |
| `avatar_home`, `avatar_create`, `avatar_voice`, `avatar_space` | mock (default) | Deferred to P2; consent workflow missing |
| Live Desktop Multica certification | optional mode | Contract tests pass; live device not in this release |
| Live self-hosted Multica cluster | optional mode | Same as above |

Tell cohort users these nav items are **preview-only** or hidden from paid flows.

## Known Gaps Before Production Billing

| ID | Item | Status | Owner |
|---|---|---|---|
| P1-R02 | Lock credit estimates vs commercial pricing matrix | open | Product / Finance |
| P1-R03 | Real external provider callback smoke (video / remix / director) | contract tests pass; live smoke open | Engineering |
| P0 sign-off | Formal approver name + date in evidence doc | pending | Product owner |

Engineering recommendation: **authorize paid-beta on staging** after P0 sign-off; block production card charges until P1-R02 + P1-R03 live smoke complete.

---

## P1-R03 Manual Provider Smoke Checklist

Automated contract coverage (local fixtures):

```powershell
npm run test:provider-callback
```

Recorded: **pass** (7 cases) on 2026-06-24.

Live certification still required for async providers. Run on **staging HTTP stack** with real keys.

### Prerequisites

- [ ] Staging up (`docker compose ...`) with migrated DB
- [ ] Workspace registered; owner role; sufficient credits (e.g. ≥ 50)
- [ ] Automated API path verified: `npm run test:staging-api-smoke` (against `STAGING_API_URL`, default `http://localhost:4000`)
- [ ] Activity Logs and Billing views open in second tab for manual UI verification

**Note:** Web standalone creation modules (`image`, `video`, etc.) currently use **`providerKind: mock`** in the browser — they do not call Gemini directly. Section A validates the **billing + job + asset** chain on staging; live external provider certification (Sections B–D) applies when Multica or a real render callback endpoint is wired.

### A. Image generation (baseline — billing + job chain)

Module: **商用级图像生成** (`image`)

**Automated (API):** `npm run test:staging-api-smoke` — pass on 2026-06-24 against `http://localhost:4000`.

**Automated (P1-R03 callback path):**

```powershell
npm run test:provider-callback          # local handler fixtures (7 cases)
npm run test:staging-callback-smoke     # video / remix_smart / director_desk on live API
```

Recorded: **pass** on 2026-06-24 (mock-render provider id mapping, hold/capture/refund, terminal idempotency, asset link).

**Manual (UI on staging web):**

1. [ ] Open Image Creation, submit prompt, confirm credit preflight / hold
2. [ ] Job reaches `succeeded`; asset appears in Assets
3. [ ] Billing balance reflects hold then capture (no double charge)
4. [ ] Activity Logs: generation + billing events
5. [ ] Reload page — job and asset still visible

### B. Video creation (async callback path)

Module: **视频创作引擎** (`video`)

**Automated:** `npm run test:staging-callback-smoke` — **pass** 2026-06-24 (API: externalTaskId mapping, succeed capture, failed refund, idempotent terminal).

**Manual (UI on staging web):**

1. [ ] Start video job; note local `generationJobId` in UI or network tab
2. [ ] Job enters `running`; provider external id stored in job metadata (not replacing local id)
3. [ ] On provider completion: job → `succeeded`, video asset linked
4. [ ] Duplicate callback (retry webhook or simulate): **no duplicate assets**, idempotent
5. [ ] Failed provider path: job stays failed/retryable; credits refunded per policy
6. [ ] Audit: `generation_job_complete` or failure equivalent

### C. Smart remix (async)

Module: **智能混剪** (`remix_smart`)

**Automated:** `npm run test:staging-callback-smoke` — **pass** 2026-06-24 (API path).

**Manual (UI):**

1. [ ] Create remix job with test media
2. [ ] Callback success → assets + task follow-up if configured
3. [ ] Partial success metadata preserved on job
4. [ ] Timeout / error callback → job failed, retry available

### D. Director desk render (async)

Module: **全局导演台** (`director_desk`)

**Automated:** `npm run test:staging-callback-smoke` — **pass** 2026-06-24 (API path).

**Manual (UI):**

1. [ ] Trigger billable director action that enqueues render/generation
2. [ ] Callback links output to director asset version
3. [ ] Usage + audit events present
4. [ ] Production/review task created where applicable

### E. Sign-off row (fill after live smoke)

| Module | Operator | Date | Result | Notes |
|---|---|---|---|---|
| `image` | user + agent | 2026-06-24 | pass | Staging UI asset `image-*.jpg` + API smoke |
| `video` | agent | 2026-06-24 | pass (API) | `test:staging-callback-smoke`; UI manual optional |
| `remix_smart` | agent | 2026-06-24 | pass (API) | `test:staging-callback-smoke`; UI manual optional |
| `director_desk` | agent | 2026-06-24 | pass (API) | `test:staging-callback-smoke`; UI manual optional |

When all required rows are **pass**, update P1-R03 status in [saas-commercial-mvp-p0-release-evidence.md](./saas-commercial-mvp-p0-release-evidence.md) and [saas-commercial-mvp-remaining-issues.md](./saas-commercial-mvp-remaining-issues.md).

---

## P1-R02 Pricing Review (Product)

Before enabling paid invoices:

1. [ ] Export current credit estimate table from Billing / code (`billableGeneration`, API pricing endpoints if any)
2. [ ] Finance confirms per-module credit costs vs commercial matrix
3. [ ] Document approved numbers in evidence or finance runbook
4. [ ] Re-run `npm run test:billable-generation` after any pricing code change

---

## Suggested Cohort Messaging

**Included:** Full workspace control plane, P1 creation modules listed above, JWT auth, credit holds, webhooks (beta), self-hosted Docker deploy.

**Excluded / preview:** AI Canvas, Avatar suite, keyword library admin, live Multica certification.

**Caveats:** Credit prices are estimates until P1-R02 sign-off; async video/remix/director paths need P1-R03 live smoke before SLA promises.
