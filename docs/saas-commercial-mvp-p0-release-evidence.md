# Commercial MVP P0 Batch 1 Release Evidence

Status: automated P0 gate passed; pending business release sign-off
Owner: Commercial MVP workspace owner
Date: 2026-06-10
Build: local working tree on `cf7dcbd` plus P0 Batch 1 changes
Branch: `codex/p0-commercial-control-plane`

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
