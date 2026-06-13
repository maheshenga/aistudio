# Commercial MVP Custom Development Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the AI Studio feature panel, excluding `ai_canvas`, into a commercially shippable SaaS MVP with reliable data, auditability, billing visibility, and optional Multica desktop agent runtime.

**Architecture:** Build on a three-layer product architecture: SaaS foundation, Agent runtime capability, and vertical business modules. Keep Web standalone mode fully usable while Multica Desktop and self-hosted Multica connect through runtime adapters rather than product modules.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, workspace-scoped repository modules under `src/lib/data/`, product registry under `src/product/registry.ts`, SaaS contracts under `src/saas/`, runtime providers under `src/runtime/`, local contract scripts through `tsx`, and existing launch-readiness verification scripts.

---

## 1. Scope

This document formalizes the customization plan for the commercial MVP perfect edition.

Included scope:

- The user-facing SaaS feature panel, using the user's 64-feature business scope as the commercial planning baseline.
- Current registry-backed feature domains in `src/product/registry.ts`.
- P0, P1, P2, and P3 product milestones for the remaining non-canvas modules.
- Web standalone, Desktop Multica, and self-hosted Multica operating modes.
- Data persistence, audit logs, generated assets, tasks, usage, billing estimates, permissions, and release verification.

Explicitly excluded scope:

- `ai_canvas` / 无限模态 AI 画布. Canvas remains a separate specialist project and is not part of this remaining-feature MVP plan.
- Hidden compatibility routes such as `e_white_bg` and `marketing_diy` unless they are promoted into the visible product registry by a separate decision.
- Full enterprise ERP, full accounting replacement, professional video editor parity, and plugin marketplace commercialization before the MVP foundation passes release acceptance.

## 2. Commercial MVP Definition

The commercial MVP perfect edition is ready when a paying workspace can repeatedly complete these loops without mock-only business completion:

1. Sign in or enter a workspace session.
2. Navigate the product registry without broken routes.
3. Start a business workflow from a P0 or approved P1 module.
4. Run an AI or automation action through the configured runtime provider.
5. Save generated or imported output into the asset repository.
6. Create or update cross-module tasks in the task repository.
7. Record usage, billing estimate, and audit events for key actions.
8. Reload the app and recover workspace state.
9. Use the same business UI in Web standalone mode and, when configured, Desktop Multica mode.

## 3. Source Inputs

- Product PRD: `docs/saas-product-prd.md`
- MVP roadmap: `docs/mvp-development-roadmap.md`
- Multica design: `docs/superpowers/specs/2026-06-09-multica-dual-mode-integration-design.md`
- Multica implementation plan: `docs/superpowers/plans/2026-06-09-multica-dual-mode-runtime-implementation-plan.md`
- Multica compatibility matrix: `docs/multica-compatibility.md`
- Product registry: `src/product/registry.ts`
- Module id contract: `src/types.ts`
- App shell: `src/App.tsx`
- Runtime layer: `src/runtime/`
- SaaS contracts: `src/saas/`
- Data repositories: `src/lib/data/`
- Verification scripts: `package.json`, `scripts/`

## 4. Architecture Principles

### SaaS Foundation Layer

- Every business record is workspace-scoped.
- UI components call repository modules rather than direct storage, Firebase, or browser-only state for business completion.
- Key actions emit audit events.
- Generated files and structured outputs are saved as asset records.
- Cross-module follow-ups are created as task records.
- Usage and billing estimates are created for generation, automation, export, and runtime actions.

### Agent Capability Layer

- Product modules call the local runtime provider boundary, not Multica internals.
- Web standalone mode always has a working cloud or web-compatible runtime provider.
- Desktop Multica mode is optional and only exposes local daemon controls when a trusted desktop bridge exists.
- Self-hosted Multica mode is configuration-driven and fails soft when unavailable.
- Runtime failures degrade agent execution but do not break navigation, assets, audit logs, or manual task operations.

### Vertical Business Layer

- Each module must provide a complete business loop, not only a demonstration screen.
- A module is commercially ready only when input, execution, output, save, audit, usage, and error recovery are all present.
- Placeholder copy, timer-only completion, alert-only success, and static fake data cannot count as complete business behavior.
- Modules share repositories and runtime contracts instead of duplicating local state formats.

## 5. File Responsibility Map

### Shared Product And Routing

- Modify: `src/product/registry.ts`
  - Maintain phase, readiness, permissions, data dependencies, and route status for every visible feature.
- Modify: `src/types.ts`
  - Keep `ModuleId` aligned with registry entries and hidden compatibility routes.
- Modify: `src/App.tsx`
  - Keep module rendering stable and ensure no commercial MVP route falls through to generic fallback.
- Modify: `src/components/Sidebar.tsx`
  - Continue rendering navigation from registry metadata.
- Modify: `src/components/CommandPalette.tsx`
  - Use registry labels, permissions, and readiness metadata for command routing.

### Shared SaaS Data

- Modify or extend: `src/lib/data/assetRepository.ts`
  - Persist generated/imported assets with workspace, module, source job, metadata, and owner.
- Modify or extend: `src/lib/data/taskRepository.ts`
  - Persist cross-module tasks, status transitions, runtime references, and due dates.
- Modify or extend: `src/lib/data/auditLogRepository.ts`
  - Record actor, workspace, module, action, target, metadata, and timestamp for key events.
- Modify or extend: `src/lib/data/usageRepository.ts`
  - Record token/credit estimates, runtime action costs, provider attribution, and billing linkage.
- Modify or extend: `src/lib/data/settingsRepository.ts`
  - Persist workspace preferences, provider settings, API key metadata, and runtime configuration references.
- Modify or extend: `src/lib/data/generationJobRepository.ts`
  - Track prompt, provider, status, output assets, errors, usage estimate, and retry metadata.

### Shared Runtime

- Modify or extend: `src/runtime/agentRuntimeTypes.ts`
  - Maintain canonical runtime, agent, task, event, and provider types.
- Modify or extend: `src/runtime/webMockAgentRuntimeProvider.ts`
  - Keep Web mode functional and deterministic for tests.
- Modify or extend: `src/runtime/multicaAgentRuntimeProvider.ts`
  - Integrate Multica API and desktop bridge without leaking implementation details into modules.
- Modify or extend: `src/runtime/useAgentRuntimeStatus.ts`
  - Provide status, degraded states, latency, runtime list, and last heartbeat to UI modules.

### P0 Cockpit And SaaS Operations

- Modify: `src/components/Dashboard.tsx`
- Modify: `src/components/TasksView.tsx`
- Modify: `src/components/TaskCenter.tsx`
- Modify: `src/components/AgentStatusDashboardView.tsx`
- Modify: `src/components/Topbar.tsx`
- Modify: `src/components/AssetsView.tsx`
- Modify: `src/components/BillingView.tsx`
- Modify: `src/components/AdminView.tsx`
- Modify: `src/components/ApiKeysView.tsx`
- Modify: `src/components/ActivityLogsView.tsx`
- Modify: `src/components/SettingsView.tsx`

These files own the commercial control plane: workspace status, tasks, runtime health, asset vault, billing, settings, API keys, audit, and administration.

### P1 Content Production

- Modify: `src/components/ECommerceView.tsx`
- Modify: `src/components/ImageCreationView.tsx`
- Modify: `src/components/ImageEditorView.tsx`
- Modify: `src/components/CopywritingView.tsx`
- Modify: `src/components/VideoCreationView.tsx`
- Modify: `src/components/RemixView.tsx`
- Modify: `src/components/DirectorDeskView.tsx`
- Modify: `src/components/SpeechView.tsx`
- Modify: `src/components/ChatView.tsx`
- Modify: `src/components/MarketingView.tsx`

These modules must turn prompts, uploaded references, templates, or business data into saved assets, tasks, audits, and usage records.

### P2 Business Operations

- Modify: `src/components/CrmView.tsx`
- Modify: `src/components/CustomerServiceView.tsx`
- Modify: `src/components/FinanceView.tsx`
- Modify: `src/components/FinanceMeetingAssistant.tsx`
- Modify: `src/components/TaxView.tsx`
- Modify: `src/components/FiscalCalendarView.tsx`
- Modify: `src/components/TaxSimulator.tsx`
- Modify: `src/components/TaxReconciliationTool.tsx`
- Modify: `src/components/TeamView.tsx`
- Modify: `src/components/SubAccountsView.tsx`
- Modify: `src/components/StoreView.tsx`

These modules must move from static panels toward workspace records, operational tasks, compliance-safe audit trails, and role-aware actions.

### P3 Commercial Expansion

- Modify: `src/components/MediaAccountsView.tsx`
- Modify: `src/components/EmployeeAccountsView.tsx`
- Modify: `src/components/AdminView.tsx`
- Modify or create: `src/saas/apiAccess.ts`
- Modify or create: `src/saas/riskPolicy.ts`

P3 turns the MVP into a broader commercial platform after P0-P2 release gates pass.

## 6. Priority Matrix

| Priority | Product Area | Included Modules | Commercial Outcome | Release Gate |
|---|---|---|---|---|
| P0 | Core SaaS control plane | Dashboard, Workflow, Tasks, Agent Status, Topbar, Assets, Projects, Billing, API Keys, Settings, Admin, Activity Logs | Workspace can operate, persist, audit, meter, and recover | Required for MVP launch |
| P1 | Revenue-generating creation workflows | E-commerce image/detail/poster/clone/edit, Image, Copywriting, Chat, Video, Remix, Director Desk, Speech, Marketing | User can create sellable content and save/export assets | Required for paid beta |
| P2 | Business operation depth | CRM, Customer Service, Finance, Tax, Team, Sub Accounts, Store group, Avatar group | User can manage customer, fiscal, team, and store operations | Required for business edition |
| P3 | Platform expansion | Media Accounts, Employee Accounts, Public API, Risk Center, Plugin Center, self-hosted operations | Partner, team, API, and governance expansion | Required after MVP stability |

## 7. Uniform Development Rules

Every non-canvas module must follow these rules:

1. Business state goes through a workspace-scoped repository.
2. Key actions emit audit events with actor, workspace, module, target, and metadata.
3. Generated outputs are saved to `assetRepository`.
4. Cross-module follow-ups are saved to `taskRepository`.
5. Agent execution and automation go through `AgentRuntimeProvider`.
6. Generation and automation actions create usage or billing estimate records.
7. UI success states must reflect completed repository or runtime operations.
8. Empty, loading, degraded, permission-denied, quota-exceeded, and retry states are visible and recoverable.
9. Static fixtures can support tests and demos but cannot be the only path for commercial completion.
10. Browser Web mode must work without Multica configuration.
11. Desktop Multica mode must fail soft when daemon, auth, API, or local runtime is unavailable.
12. Release claims require fresh verification commands and manual smoke evidence.

## 8. Milestone Plan

### Milestone 0: Commercial Scope Lock

**Outcome:** The team has one source of truth for what ships in the commercial MVP, what is deferred, and why `ai_canvas` is outside this plan.

**Files:**

- Modify: `src/product/registry.ts`
- Modify: `docs/mvp-development-roadmap.md`
- Create or maintain: `docs/saas-commercial-mvp-acceptance-test-checklist.md`

- [ ] **Step 1: Mark commercial readiness in the registry**

Set every visible non-canvas feature to one of these launch statuses through existing registry metadata or a new launch-readiness field:

```ts
type CommercialLaunchStatus = "mvp_required" | "paid_beta" | "business_edition" | "post_mvp";
```

Expected mapping:

- `mvp_required`: P0 control plane and asset/task/billing/audit modules.
- `paid_beta`: P1 creation workflows that directly produce commercial assets.
- `business_edition`: P2 operational modules.
- `post_mvp`: P3 platform expansion and hidden/internal compatibility routes.

- [ ] **Step 2: Exclude `ai_canvas` from the remaining-feature release scope**

Keep the route available only if already implemented, but label it outside this commercial MVP plan in docs and readiness checks.

Expected behavior:

- Commercial MVP readiness scripts do not fail because `ai_canvas` has separate canvas-specific work.
- The user-facing plan does not count `ai_canvas` as part of remaining-feature completion.

- [ ] **Step 3: Verify scope lock**

Run:

```powershell
npm.cmd run test:launch-readiness
```

Expected result:

```text
Launch readiness checks passed
```

### Milestone 1: SaaS Foundation Closure

**Outcome:** The application foundation supports real workspace behavior, not screen-local completion.

**Files:**

- Modify: `src/lib/data/assetRepository.ts`
- Modify: `src/lib/data/taskRepository.ts`
- Modify: `src/lib/data/auditLogRepository.ts`
- Modify: `src/lib/data/usageRepository.ts`
- Modify: `src/lib/data/settingsRepository.ts`
- Modify: `src/lib/data/generationJobRepository.ts`
- Modify: `src/saas/permissions.ts`
- Modify: `src/saas/types.ts`

- [ ] **Step 1: Confirm repository coverage for required business objects**

Required repository coverage:

- Assets
- Tasks
- Audit logs
- Usage and billing estimates
- Workspace settings
- Provider/API key metadata
- Generation jobs
- Finance events
- Tax events

Expected evidence:

- Each repository accepts `workspaceId`.
- Each mutation returns a typed result or normalized error.
- Each mutation can be exercised by a script or component-level smoke test.

- [ ] **Step 2: Enforce audit coverage**

Required audit actions:

- Module open from command palette or sidebar for key modules.
- Generation job created, completed, failed, retried, and saved.
- Asset created, updated, exported, and deleted.
- Task created, status changed, assigned, completed, and cancelled.
- Provider key created, tested, disabled, and removed.
- Billing estimate created and quota warning displayed.
- Runtime mode changed or degraded.
- Admin import, export, backup, restore, and permission changes.

- [ ] **Step 3: Run SaaS foundation verification**

Run:

```powershell
npm.cmd run test:saas-foundation
```

Expected result:

```text
SaaS foundation checks passed
```

### Milestone 2: P0 Cockpit Perfect Closure

**Outcome:** The MVP has a dependable operating cockpit for tasks, assets, runtime health, billing, settings, admin, and audit.

**Files:**

- Modify: `src/components/Dashboard.tsx`
- Modify: `src/components/Topbar.tsx`
- Modify: `src/components/TaskCenter.tsx`
- Modify: `src/components/TasksView.tsx`
- Modify: `src/components/AgentStatusDashboardView.tsx`
- Modify: `src/components/AssetsView.tsx`
- Modify: `src/components/BillingView.tsx`
- Modify: `src/components/AdminView.tsx`
- Modify: `src/components/ApiKeysView.tsx`
- Modify: `src/components/ActivityLogsView.tsx`
- Modify: `src/components/SettingsView.tsx`

- [ ] **Step 1: Replace remaining display-only P0 flows**

For every P0 action button, confirm one of these outcomes:

- It opens a real module view.
- It creates or updates a repository record.
- It dispatches through the runtime provider.
- It is disabled with a permission, quota, or configuration reason.

- [ ] **Step 2: Close task and activity loops**

Expected task behavior:

- A task created from any P0 module appears in Task Center and Tasks View.
- Completing the task updates both views after reload.
- Status changes create audit logs.
- Runtime-backed tasks display provider and runtime state.

- [ ] **Step 3: Close asset vault loop**

Expected asset behavior:

- Generated or imported assets appear in Assets View.
- Asset metadata includes source module, source job, workspace, owner, tags, and created time.
- Export and delete actions emit audit logs.
- Empty and search states are useful without static fake rows.

- [ ] **Step 4: Close billing and settings loop**

Expected billing behavior:

- Usage estimates appear after generation, automation, and runtime actions.
- Quota warnings are shown before destructive failure.
- API key metadata never exposes raw secrets after save.
- Settings changes persist after reload and emit audit logs.

- [ ] **Step 5: Verify P0 closure**

Run:

```powershell
npm.cmd run test:launch-readiness
npm.cmd run test:saas-foundation
npm.cmd run test:browser-smoke
```

Expected result:

```text
Launch readiness checks passed
SaaS foundation checks passed
Browser smoke checks passed
```

### Milestone 3: P1 Revenue Workflow Closure

**Outcome:** Creation modules generate or structure commercial outputs that are saved, billable, auditable, and reusable.

**Files:**

- Modify: `src/components/ECommerceView.tsx`
- Modify: `src/components/ImageCreationView.tsx`
- Modify: `src/components/ImageEditorView.tsx`
- Modify: `src/components/CopywritingView.tsx`
- Modify: `src/components/VideoCreationView.tsx`
- Modify: `src/components/RemixView.tsx`
- Modify: `src/components/DirectorDeskView.tsx`
- Modify: `src/components/SpeechView.tsx`
- Modify: `src/components/ChatView.tsx`
- Modify: `src/components/MarketingView.tsx`
- Modify or extend: `src/lib/data/generationJobRepository.ts`
- Modify or extend: `src/lib/data/assetRepository.ts`
- Modify or extend: `src/lib/data/usageRepository.ts`

- [ ] **Step 1: Standardize generation job lifecycle**

Every generation-capable module uses this lifecycle:

```text
draft input -> validate -> create generation job -> execute provider/runtime -> save output asset -> record usage -> audit completion -> offer task/export/follow-up
```

Required job statuses:

- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`
- `saved`

- [ ] **Step 2: Close e-commerce workflows**

Required e-commerce outputs:

- Main image brief and output asset.
- Product video brief or storyboard.
- Detail page section structure.
- Poster creative output.
- AI image edit source and result asset.
- Clone design reference record and derived asset.

Each output must include:

- Product name or campaign name.
- Platform/channel.
- Style or template.
- Source prompt or reference.
- Generated asset record.
- Usage estimate.
- Audit trail.

- [ ] **Step 3: Close copywriting workflows**

Required copywriting outputs:

- Channel-specific copy draft.
- Title and hook variants.
- Rewrite or polish result.
- Keyword library entry.
- Banned or preferred word handling.
- Asset or project note saved for reuse.

- [ ] **Step 4: Close video, director, speech, and chat workflows**

Required outputs:

- Video project or storyboard record.
- Remix material or template record.
- Director Desk shot list and production checklist.
- Speech script, voice choice, and generated voice asset or job record.
- Chat-generated recommendation saved as task, asset note, or project memory.

- [ ] **Step 5: Verify P1 revenue workflows**

Run:

```powershell
npm.cmd run test:launch-readiness
npm.cmd run test:saas-foundation
npm.cmd run build
```

Expected result:

```text
Launch readiness checks passed
SaaS foundation checks passed
✓ built
```

### Milestone 4: P2 Business Operation Closure

**Outcome:** CRM, finance, tax, team, and store modules become operational records rather than static dashboards.

**Files:**

- Modify: `src/components/CrmView.tsx`
- Modify: `src/components/CustomerServiceView.tsx`
- Modify: `src/components/FinanceView.tsx`
- Modify: `src/components/FinanceMeetingAssistant.tsx`
- Modify: `src/components/TaxView.tsx`
- Modify: `src/components/FiscalCalendarView.tsx`
- Modify: `src/components/TaxSimulator.tsx`
- Modify: `src/components/TaxReconciliationTool.tsx`
- Modify: `src/components/TeamView.tsx`
- Modify: `src/components/SubAccountsView.tsx`
- Modify: `src/components/StoreView.tsx`
- Create or extend: `src/lib/data/customerRepository.ts`
- Create or extend: `src/lib/data/financeRepository.ts`
- Create or extend: `src/lib/data/taxEventRepository.ts`
- Create or extend: `src/lib/data/storeRepository.ts`
- Create or extend: `src/lib/data/teamRepository.ts`

- [ ] **Step 1: Close CRM and customer service**

Required behavior:

- Customer profiles persist with tags, lifecycle stage, owner, notes, and last interaction.
- AI customer insight can create a follow-up task.
- Customer service suggestions can be accepted, rejected, or escalated.
- Accepted or escalated service actions emit audit logs.

- [ ] **Step 2: Close finance and tax**

Required behavior:

- Finance records persist by workspace and period.
- Finance Meeting Assistant summarizes repository-backed data.
- Tax events persist and appear in calendar, simulator, and reconciliation tools.
- Tax calculations show assumptions and audit events.
- Export actions generate assets or report records.

- [ ] **Step 3: Close team and staff workflows**

Required behavior:

- Team member and sub-account records are workspace-scoped.
- Role and permission states are visible in the UI.
- Collaboration and approval tasks persist across reload.
- Shared agent library or team asset references point to asset records.

- [ ] **Step 4: Close store group workflows**

Required behavior:

- Store dashboard reads store, order, inventory, marketing, event, and staff records.
- Store list can create or update a store record.
- Inventory action creates a task or adjustment record.
- Marketing/event actions create campaign assets and audit logs.
- Mini app management shows configuration state and release readiness.

- [ ] **Step 5: Verify P2 operations**

Run:

```powershell
npm.cmd run test:saas-foundation
npm.cmd run test:browser-smoke
npm.cmd run lint
```

Expected result:

```text
SaaS foundation checks passed
Browser smoke checks passed
✓ lint passed
```

### Milestone 5: Multica Dual-Mode Product Integration

**Outcome:** The same SaaS product can run standalone on the Web or use Multica as the desktop agent runtime.

**Files:**

- Modify: `src/runtime/agentRuntimeTypes.ts`
- Modify: `src/runtime/webMockAgentRuntimeProvider.ts`
- Modify: `src/runtime/multicaAgentRuntimeProvider.ts`
- Modify: `src/runtime/multicaApiClient.ts`
- Modify: `src/runtime/desktopAgentBridge.ts`
- Modify: `src/runtime/useAgentRuntimeStatus.ts`
- Modify: `src/components/runtime/DesktopAgentRuntimePanel.tsx`
- Modify: `src/components/AgentStatusDashboardView.tsx`
- Modify: `src/components/GlobalAgentDispatcherModal.tsx`
- Modify: `src/components/TaskCenter.tsx`
- Modify: `src/components/SettingsView.tsx`
- Modify: `docs/multica-compatibility.md`

- [ ] **Step 1: Protect Web standalone mode**

Required behavior:

- App starts with no Multica URL.
- App starts with no `window.daemonAPI`.
- Desktop controls are hidden in normal browser mode.
- Runtime status shows Web/cloud provider state.
- P0 manual task and asset flows remain usable when Multica is unavailable.

- [ ] **Step 2: Close Desktop Multica mode**

Required behavior:

- Trusted desktop bridge detection sets runtime mode to `desktop_multica`.
- Daemon states map to user-facing runtime states.
- Local agent list appears when Multica API is reachable.
- Runtime task dispatch stores external Multica task metadata in local tasks.
- Auth-expired, daemon-stopped, and server-unreachable states are recoverable.

- [ ] **Step 3: Close self-hosted Multica mode**

Required behavior:

- API and WS endpoints are configurable.
- Self-hosted runtime can be marked healthy, degraded, or unavailable.
- No local daemon token is exposed to Web mode.
- Compatibility failures are recorded in audit or runtime diagnostics.

- [ ] **Step 4: Verify runtime contracts**

Run:

```powershell
npm.cmd run test:runtime-contract
npm.cmd run test:desktop-bridge
npm.cmd run test:multica-mappers
npm.cmd run test:multica-runtime-provider
npm.cmd run test:web-runtime-provider
npm.cmd run test:multica-api-client
```

Expected result:

```text
Runtime contract checks passed
Desktop bridge checks passed
Multica mapper checks passed
Multica runtime provider checks passed
Web runtime provider checks passed
Multica API client checks passed
```

### Milestone 6: P3 Commercial Expansion

**Outcome:** The MVP has a path to team, partner, API, risk, and plugin expansion without blocking the first commercial release.

**Files:**

- Modify: `src/components/MediaAccountsView.tsx`
- Modify: `src/components/EmployeeAccountsView.tsx`
- Modify: `src/components/AdminView.tsx`
- Create or extend: `src/saas/apiAccess.ts`
- Create or extend: `src/saas/riskPolicy.ts`
- Create or extend: `src/lib/data/integrationRepository.ts`

- [ ] **Step 1: Close media and employee account governance**

Required behavior:

- Media account metadata is stored without exposing raw credentials.
- Employee account pool entries have owner, role, status, and audit history.
- Risky actions require permission checks and audit events.

- [ ] **Step 2: Define public API and plugin boundaries**

Required behavior:

- Public API access uses scoped keys, rate limits, and audit events.
- Plugin Center remains disabled or internal until repository, permission, billing, and security contracts are complete.
- Risk Center reports provider, billing, permission, and runtime risks from real app state.

- [ ] **Step 3: Verify expansion readiness**

Run:

```powershell
npm.cmd run test:saas-foundation
npm.cmd run lint
npm.cmd run build
```

Expected result:

```text
SaaS foundation checks passed
✓ lint passed
✓ built
```

### Milestone 7: Release Hardening

**Outcome:** The commercial MVP can be demoed, sold, deployed, and supported with known quality gates.

**Files:**

- Modify: `package.json`
- Modify: `scripts/`
- Modify: `docs/saas-commercial-mvp-acceptance-test-checklist.md`
- Modify: `docs/multica-compatibility.md`
- Modify: `.env.example`

- [ ] **Step 1: Run full release verification**

Run:

```powershell
npm.cmd run test:launch-readiness
npm.cmd run test:saas-foundation
npm.cmd run lint
npm.cmd run build
npm.cmd run test:browser-smoke
git diff --check
```

Expected result:

```text
Launch readiness checks passed
SaaS foundation checks passed
✓ lint passed
✓ built
Browser smoke checks passed
```

Acceptable known warnings:

- Vite may warn that the `app-ops` chunk is larger than 500 kB.
- `git diff --check` may report pre-existing CRLF warnings outside the changed files; new files in this plan must not introduce whitespace errors.

- [ ] **Step 2: Complete manual release smoke**

Required smoke paths:

- Web standalone: Dashboard -> generation -> asset -> task -> billing -> audit -> reload.
- Desktop Multica: Settings runtime panel -> daemon status -> agent dispatch -> task status -> audit.
- Self-hosted Multica: configured endpoint -> degraded handling -> recovery after endpoint returns.
- Permission path: viewer cannot execute admin or billing mutation.
- Quota path: insufficient quota blocks generation before provider execution.
- Error path: failed generation creates recoverable job record and audit event.

- [ ] **Step 3: Freeze commercial MVP release notes**

Release notes must state:

- Included P0/P1 modules.
- P2 modules included as business edition or beta.
- P3 modules gated after MVP stability.
- `ai_canvas` is excluded from this plan and tracked separately.
- Web standalone mode is supported.
- Desktop Multica mode is optional and depends on bridge/runtime compatibility.

## 9. Module Customization Matrix

| Domain | Modules | MVP Customization Standard | Priority |
|---|---|---|---|
| 我的 Agent 看板 | Dashboard, Workflow, Tasks, Agent Status | Real runtime status, persisted tasks, audit timeline, workspace KPIs | P0 |
| 主理人：电商操盘 | Main Image, Product Video, Detail Page, Poster, Image Edit, Clone | Generation job, saved asset, channel metadata, usage estimate, audit | P1 |
| 主理人：无界创作 | Video, Image, Chat, Speech | Provider-backed job, saved output, reusable prompt/asset/task; `ai_canvas` excluded | P1 |
| 主理人：文案营销 | Create, Tools, Keywords | Copy result, keyword library, channel variant, asset or project note | P1 |
| 主理人：视频工业 | Remix Home, Smart Remix, Viral Clone, Materials, Titles, Templates | Video project records, material library, storyboard/task export | P1 |
| 主理人：分身直播 | Avatar Home, Create, Voice, Space | Consent-aware avatar/voice asset records and generation jobs | P2 |
| 主理人：私域与客户 | CRM, AI Customer Service | Customer records, service suggestions, escalation tasks, audit | P2 |
| 大航海：全域裂变 | Viral Code, NFC, Website | Campaign records, page assets, lead/task tracking | P1 |
| 导演台与分镜流 | Director Desk | Shot list, storyboard records, production tasks | P1 |
| 主理人：包揽设计 | Logo, Packaging, Ads, Interior, Fashion | Design brief, generated asset, project grouping, usage estimate | P2 |
| 我的数字资产库 | Data, Assets, Projects | Repository-backed analytics, asset vault, brand knowledge records | P0 |
| 虚拟数字员工 | Team, Sub Accounts, Write, Tasks, Assets, Approval | Role-aware collaboration, shared assets, approval tasks | P2 |
| 云连锁与小店群 | Dashboard, List, Orders, Inventory, Design, Staff, Marketing, Distribution, Events, Miniapp | Store records, operational tasks, marketing assets, audit | P2 |
| 系统引擎与权限 | Media, Employee Accounts, Billing, API Keys, Settings, Admin, Finance, Tax, Activity Logs | Governance, quota, provider config, admin operations, audit, finance/tax records | P0-P3 |

## 10. Delivery Rhythm

Recommended execution order:

1. Finish P0 control plane before expanding more business modules.
2. Finish one complete P1 revenue workflow before cloning patterns across other P1 workflows.
3. Promote P2 modules only after their repository and audit contracts are stable.
4. Keep Multica adapter work isolated from product modules.
5. Run release verification after each milestone, not only at the end.

Recommended commit cadence:

- One commit for shared repository or runtime contract changes.
- One commit per module group.
- One commit for tests and release documentation.
- Commit messages follow the Lore Commit Protocol in `AGENTS.md`.

## 11. Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Feature surface is broad for one MVP | Delivery spreads too thin | Gate by P0/P1/P2/P3 and require full business loop only for launch modules |
| Static demo state remains hidden in modules | Paid users hit non-persistent behavior | Launch-readiness tests and manual checklist inspect every action button |
| Multica upstream changes | Desktop mode breaks | Keep adapter tests and compatibility matrix; fail soft to Web mode |
| Billing estimates are inconsistent | Commercial trust and margin risk | Centralize usage records and show estimates before execution |
| API keys or local daemon tokens leak | Security incident | Store only metadata in UI; hide desktop tokens from Web mode |
| Large bundle grows further | Slower first load | Track build warnings and split post-MVP operational chunks |
| P2 finance/tax claims overreach | Compliance risk | Present calculations as assistance with assumptions and audit trails |

## 12. Definition Of Done

The commercial MVP perfect edition is done when:

- `ai_canvas` is excluded from this plan and does not block release readiness.
- Every P0 module passes its commercial acceptance criteria.
- At least one complete P1 revenue workflow is production-ready and the remaining P1 workflows meet paid-beta gates.
- P2 modules selected for business edition use repository-backed data and audit logs.
- P3 modules are either gated, internal, or documented as post-MVP expansion.
- Web standalone mode passes smoke tests without Multica.
- Desktop Multica mode passes adapter and bridge contract tests.
- All generation/automation actions produce usage or billing records.
- Key actions produce audit logs.
- Saved outputs are visible in the asset vault or project knowledge base.
- Manual and automated acceptance checks in `docs/saas-commercial-mvp-acceptance-test-checklist.md` pass.

