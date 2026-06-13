# SaaS Commercial MVP Acceptance Criteria And Test Checklist

Date: 2026-06-10

Status: Commercial MVP perfect edition release checklist

Related plan: `docs/superpowers/plans/2026-06-10-commercial-mvp-custom-development-plan.md`

## 1. Release Decision

The commercial MVP can ship only when all P0 gates pass, selected P1 revenue workflows pass, Web standalone mode is stable, and optional Multica mode fails soft when unavailable.

Go decision:

- P0: all pass.
- P1: at least one complete revenue workflow pass, and remaining included P1 modules are marked paid-beta with safe limits.
- P2: included business-edition modules use repository-backed records and audit logs.
- P3: gated or internal unless security, billing, API, and permission contracts pass.
- `ai_canvas`: excluded from this release checklist and tracked as an independent canvas project.

No-go conditions:

- A P0 action reports success without repository, runtime, or audit evidence.
- A generation or automation action completes without a usage or billing estimate.
- A saved output disappears after reload.
- Web standalone mode requires Multica to navigate or complete manual work.
- Desktop Multica failure breaks Web SaaS mode.
- Raw secrets, API keys, or local daemon tokens are visible after saving configuration.

## 2. Global Acceptance Criteria

| Area | Acceptance Criteria | Evidence |
|---|---|---|
| Workspace tenancy | Every business mutation includes workspace context | Repository tests or inspected records include `workspaceId` |
| Persistence | Created assets, tasks, settings, finance/tax/customer/store records survive reload | Browser smoke with reload |
| Auditability | Key actions create audit events with actor, workspace, module, action, target, metadata, timestamp | Activity Logs view and repository records |
| Usage and billing | Generation, automation, export, and runtime dispatch create usage estimates | Billing view and usage repository records |
| Runtime abstraction | Modules call runtime provider instead of Multica internals | Type imports and runtime tests |
| Web standalone | App works without Multica URL, bridge, or daemon | Browser smoke in normal Vite environment |
| Desktop Multica | Desktop bridge and API states map to runtime status and task metadata | Runtime contract tests |
| Permissions | Viewer, operator, admin, and owner roles see correct action availability | Permission tests and manual role smoke |
| Error recovery | Failed jobs remain inspectable, retryable, and auditable | Failed-generation manual smoke |
| Empty states | Empty dashboards and lists provide useful actions without fake business rows | Manual first-workspace smoke |
| Security | Raw provider keys and daemon tokens are not displayed after save | Settings and API Keys manual smoke |
| Accessibility baseline | Keyboard navigation, focus states, labels, and contrast pass basic manual checks | Browser manual smoke |

## 3. Required Automated Verification

Run these commands from `E:\code\aistudio` before claiming release readiness:

```powershell
npm.cmd run test:p0-specialized
npm.cmd run test:launch-readiness
npm.cmd run test:saas-foundation
npm.cmd run lint
npm.cmd run build
npm.cmd run test:browser-smoke
npm.cmd run test:p0-release
git diff --check
```

Expected successful evidence:

```text
Specialized registry, data, runtime, and Multica checks exit 0
Launch readiness checks passed
SaaS foundation checks passed
lint exits 0
build exits 0
Browser smoke checks passed
```

Accepted warnings:

- Vite may warn that the `app-ops` chunk is larger than 500 kB.
- `git diff --check` may show pre-existing CRLF warnings outside files touched for the current release; newly changed release files must not add whitespace errors.

Runtime-mode verification commands are included in `npm.cmd run test:p0-specialized` and can also be run individually:

```powershell
npm.cmd run test:runtime-contract
npm.cmd run test:desktop-bridge
npm.cmd run test:multica-mappers
npm.cmd run test:multica-runtime-provider
npm.cmd run test:web-runtime-provider
npm.cmd run test:multica-api-client
```

Expected successful evidence:

```text
Runtime contract checks passed
Desktop bridge checks passed
Multica mapper checks passed
Multica runtime provider checks passed
Web runtime provider checks passed
Multica API client checks passed
```

## 4. P0 Acceptance Checklist

### Dashboard And Agent Cockpit

- [ ] Dashboard loads workspace KPIs from repository-backed state.
- [ ] Empty workspace shows zero-state actions instead of fake completed business data.
- [ ] Agent Workflow shows provider/runtime status or a degraded state.
- [ ] Agent Status shows Web runtime in browser mode.
- [ ] Agent Status shows Desktop Multica runtime only when bridge or endpoint is configured.
- [ ] Runtime latency and health are derived from runtime status, not a timer-only mock.
- [ ] Opening cockpit modules emits module navigation or activity audit where required.

### Tasks And Task Center

- [ ] Creating a task from Dashboard, generation module, CRM, finance/tax, or store flow writes through `taskRepository`.
- [ ] Task status changes persist after reload.
- [ ] Task Center and Tasks View show the same task data.
- [ ] Runtime-backed tasks include provider, runtime mode, external task id, and status.
- [ ] Cancelling or completing a task emits audit events.
- [ ] Permission-denied task actions are disabled with a clear reason.

### Topbar, Search, And Navigation

- [ ] Sidebar, command palette, search, and pinned modules use registry labels.
- [ ] No P0 module falls through to a generic under-development fallback.
- [ ] Pinned modules persist after reload.
- [ ] Search opens the correct module and respects permissions.
- [ ] Offline/degraded status is visible without blocking manual navigation.

### Assets And Projects

- [ ] Generated assets are saved with workspace, module, job id, owner, tags, metadata, and created time.
- [ ] Imported assets are saved with file metadata and audit events.
- [ ] Assets View supports search, filter, preview, export, and delete.
- [ ] Export emits an audit event.
- [ ] Delete requires permission and emits an audit event.
- [ ] Project or brand knowledge records can link to saved assets.

### Billing, API Keys, Settings, Admin, Audit

- [ ] Billing shows usage estimates from generation, automation, export, and runtime dispatch.
- [ ] Quota warnings appear before provider execution when quota is insufficient.
- [ ] API key save stores provider metadata without displaying the raw key afterward.
- [ ] API key test, disable, and remove actions emit audit events.
- [ ] Settings persist runtime mode, workspace preferences, and provider configuration metadata.
- [ ] Admin backup, restore, import, export, and permission actions emit audit events.
- [ ] Activity Logs show key events with filterable module, action, actor, and timestamp.

## 5. P1 Revenue Workflow Acceptance Checklist

### E-Commerce Content

- [ ] Main image workflow validates product name, platform, style, and output count.
- [ ] Product video workflow creates a storyboard, script, or video generation job.
- [ ] Detail page workflow produces structured sections and saves them as an asset or project record.
- [ ] Poster workflow saves creative output with campaign metadata.
- [ ] AI image edit records source asset, edit instruction, and output asset.
- [ ] Clone design records reference source, derived output, and usage estimate.
- [ ] Every successful e-commerce output appears in Assets View after reload.
- [ ] Every failed e-commerce generation creates a recoverable failed job and audit event.

### Image, Copywriting, Chat, Speech

- [ ] Image generation creates a generation job, output asset, usage record, and audit event.
- [ ] Copywriting create produces channel-specific copy and saves it as an asset or project note.
- [ ] Copywriting tools produce rewrite, title, hook, translation, or polish outputs with source text preserved.
- [ ] Keyword library creates, updates, and deletes workspace-scoped keyword records.
- [ ] Chat recommendation can be saved as a task, asset note, or project memory.
- [ ] Speech workflow records script, language, voice, provider, usage, and output asset or job.

### Video, Remix, Director Desk, Marketing

- [ ] Video Creation creates a project or generation job with source prompt and output target.
- [ ] Remix materials are stored as assets or material records.
- [ ] Remix titles and templates are saved for reuse.
- [ ] Viral clone records source analysis and derived structure.
- [ ] Director Desk saves shot list, storyboard, asset references, and production tasks.
- [x] Marketing viral code, NFC, and website flows create campaign records, generated assets, usage records, and audit events.
- [ ] P1 export actions write usage and audit records.

## 6. P2 Business Edition Acceptance Checklist

### CRM And Customer Service

- [ ] Customer profiles persist with name, channel, tag, lifecycle stage, owner, notes, and last interaction.
- [ ] Customer insights are generated from repository-backed customer data.
- [ ] Insight follow-up creates a task.
- [ ] Customer service response suggestion can be accepted, edited, rejected, or escalated.
- [ ] Escalation creates a task and audit event.

### Finance And Tax

- [ ] Finance records are workspace-scoped and period-aware.
- [ ] Finance Meeting Assistant summarizes repository-backed finance data.
- [ ] Finance export creates report asset or export record.
- [ ] Tax events persist and appear in fiscal calendar.
- [ ] Tax simulator shows input assumptions, calculated result, and audit event.
- [ ] Tax reconciliation links source events, calculation result, and export record.
- [ ] Finance and tax screens avoid presenting advisory calculations as certified accounting or legal conclusions.

### Team, Avatar, Design, Store

- [ ] Team members and sub-accounts persist with role, status, owner, and permissions.
- [ ] Team collaboration tasks persist and appear in shared task views.
- [ ] Shared agent library references saved assets.
- [ ] Avatar and voice workflows record consent, source material, output asset, and audit events.
- [ ] Design workflows create design brief, generated asset, and project linkage.
- [ ] Store dashboard reads store, order, inventory, marketing, event, and staff records.
- [ ] Store inventory adjustments create tasks or adjustment records.
- [ ] Store marketing and event actions create campaign assets and audit logs.

## 7. P3 Expansion Acceptance Checklist

P3 is not required for the first commercial MVP launch unless explicitly promoted.

- [ ] Media account metadata is stored without raw credential exposure.
- [ ] Employee account pool entries include owner, role, status, and audit history.
- [ ] Public API keys are scoped, rate-limited, revocable, and audited.
- [ ] Risk Center reads real provider, billing, permission, and runtime risk signals.
- [ ] Plugin Center remains gated until plugin permissions, billing, security review, and audit contracts pass.
- [ ] P3 modules cannot create unaudited external side effects.

## 8. Runtime Mode Test Checklist

### Web Standalone Mode

- [ ] Start app without Multica environment variables.
- [ ] Confirm Settings does not expose local daemon controls.
- [ ] Confirm Agent Status reports Web/cloud runtime state.
- [ ] Create a manual task and complete it.
- [ ] Save an asset and reload.
- [ ] Trigger a generation or simulated provider action and confirm usage estimate.
- [ ] Confirm Activity Logs record the action.

### Desktop Multica Mode

- [ ] Start app with trusted desktop bridge fixture or desktop shell.
- [ ] Confirm runtime mode is `desktop_multica`.
- [ ] Confirm daemon state displays running, stopped, starting, stopping, installing CLI, CLI not found, and auth expired states correctly.
- [ ] Start, stop, or restart daemon only when desktop bridge allows the action.
- [ ] List local agents from Multica API or fixture.
- [ ] Dispatch a runtime-backed task.
- [ ] Confirm external Multica metadata is stored on the task.
- [ ] Simulate auth expired and confirm Web SaaS remains usable.

### Self-Hosted Multica Mode

- [ ] Configure Multica API and WS endpoints.
- [ ] Confirm runtime mode is `self_hosted_multica` when configured.
- [ ] Confirm unreachable endpoint marks runtime degraded.
- [ ] Confirm restored endpoint recovers without losing local tasks or assets.
- [ ] Confirm desktop daemon token is not exposed to browser Web mode.

## 9. Manual End-To-End Smoke Paths

### Smoke Path A: First Paid User

- [ ] Open app in Web standalone mode.
- [ ] Land on Dashboard.
- [ ] Create a product main image job.
- [ ] Save generated output into Assets.
- [ ] Create a follow-up task from the output.
- [ ] Check Billing for usage estimate.
- [ ] Check Activity Logs for generation, asset save, and task creation.
- [ ] Reload the app and confirm asset and task remain.

### Smoke Path B: Creator Revenue Workflow

- [ ] Create copywriting draft for a product.
- [ ] Generate title or hook variants.
- [ ] Save selected copy to project knowledge base.
- [ ] Use the saved copy in a poster or detail page workflow.
- [ ] Export output and confirm audit event.

### Smoke Path C: Business Operations

- [ ] Create or update a CRM customer.
- [ ] Generate customer insight.
- [ ] Create follow-up task.
- [ ] Add finance or tax event.
- [ ] Confirm fiscal calendar and finance summary reflect repository data.

### Smoke Path D: Desktop Agent Runtime

- [ ] Enable Desktop Multica runtime.
- [ ] Confirm daemon state is visible.
- [ ] Dispatch an agent task from Global Dispatcher.
- [ ] Observe task in Task Center.
- [ ] Cancel or complete task.
- [ ] Confirm audit event and runtime metadata.

### Smoke Path E: Permissions And Quota

- [ ] Switch to viewer role.
- [ ] Confirm admin, billing mutation, API key mutation, and destructive asset actions are disabled.
- [ ] Simulate low quota.
- [ ] Confirm generation is blocked before provider execution.
- [ ] Confirm quota warning is visible and audited.

## 10. Data Integrity Checklist

- [ ] Repository records include `workspaceId`.
- [ ] Repository records include stable `id`.
- [ ] Time fields use a consistent timestamp format.
- [ ] Deleted records are either soft-deleted or audited before removal.
- [ ] Asset records preserve source module and source job.
- [ ] Usage records link to job, task, module, or export target.
- [ ] Audit records are append-only from the UI perspective.
- [ ] Runtime external ids are stored as metadata and do not replace local ids.
- [ ] Imports validate file type and size before saving.
- [ ] Exports record file name, target format, actor, and timestamp.

## 11. Security And Compliance Checklist

- [ ] Raw API keys are accepted only in secure input controls.
- [ ] Saved API keys display masked values or metadata only.
- [ ] Desktop daemon tokens are never displayed in Web mode.
- [ ] Permission checks guard all destructive actions.
- [ ] Admin actions require admin or owner role.
- [ ] Billing actions require owner or billing permission.
- [ ] Finance and tax calculations show assumptions and are not presented as certified advice.
- [ ] Avatar and voice workflows require consent metadata before generation.
- [ ] External account actions are gated behind explicit permissions and audit logs.

## 12. UI Quality Checklist

- [ ] All module pages fit desktop viewport without incoherent overlap.
- [ ] Key controls are reachable by keyboard.
- [ ] Buttons do not change layout size when loading.
- [ ] Empty states include a relevant next action.
- [ ] Error states include retry or recovery where the action is recoverable.
- [ ] Long labels do not overflow cards, tables, buttons, or sidebars.
- [ ] Loading states do not claim completion before repository or runtime confirmation.
- [ ] Mobile or narrow viewport smoke covers sidebar, topbar, modal, and primary P0/P1 flows.

## 13. Release Evidence Template

Use this template for the release sign-off note:

```markdown
## Commercial MVP Release Evidence

Date:
Build:
Branch:

### Automated Verification

- `npm.cmd run test:launch-readiness`: pass
- `npm.cmd run test:saas-foundation`: pass
- `npm.cmd run test:p0-specialized`: pass
- `npm.cmd run lint`: pass
- `npm.cmd run build`: pass
- `npm.cmd run test:browser-smoke`: pass
- `npm.cmd run test:p0-release`: pass
- `git diff --check`: pass or only accepted pre-existing warnings

### Manual Smoke

- Web standalone: pass
- Desktop Multica: pass or gated with documented compatibility reason
- Self-hosted Multica: pass or gated with documented deployment reason
- P0 cockpit: pass
- P1 revenue workflow: pass
- P2 selected modules: pass
- Permissions and quota: pass

### Known Release Notes

- `ai_canvas` is excluded from this commercial MVP checklist.
- P3 modules are gated unless explicitly promoted.
- Accepted warning: Vite `app-ops` chunk size warning.
```
