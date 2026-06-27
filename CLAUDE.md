# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A React 19 + Vite + TypeScript SaaS workbench ("AI Studio" / multi-Agent workspace) bundling content creation, e-commerce assets, CRM, store ops, finance/tax, team, and agent-dispatch modules into one panel. Originated as an AI Studio applet. UI is Tailwind v4 (via `@tailwindcss/vite`), `motion`, `recharts`/`d3`, and `lucide-react`.

**Generation is mock by default.** The creative pipeline returns placeholder/template output and is NOT billed (`providerKind: 'mock'` → 0 credits). Real inference goes through the API provider seam (`apps/api/src/provider/`): set `VITE_GENERATION_PROVIDER` (frontend) + `GEMINI_API_KEY` / `PROVIDER_<KIND>_*` (API) to flip a workspace to real output (see `docs/secret-rotation.md` and `.env.example`). Only `CopywritingView` is wired to real text so far (reference for the `generateText` pattern); the rest of the creative surface is the documented migration tail.

## Commands

```bash
npm run dev          # Vite dev server on :3000, host 0.0.0.0
npm run build        # Production build (manual chunking, see vite.config.ts)
npm run preview      # Preview built output
npm run lint         # tsc --noEmit (type check — this is the "lint")

# Tests are standalone tsx scripts (no test framework). Run one:
tsx scripts/product-registry.test.ts
npm run test:product-registry     # equivalent via package script

# Aggregate suites:
npm run test:p0-specialized       # all P0 unit-style suites
npm run test:p0-release           # specialized + launch-readiness + saas-foundation + lint + build + browser-smoke
```

Each `scripts/*.test.ts` runs directly under `tsx` and uses `node:assert/strict`; there is no Jest/Vitest. To run a single test, invoke its script directly. `test:browser-smoke` and `scripts/browser-smoke-flow.js` exercise a built/preview flow, so run `build` first.

## Architecture

**Composition root** — `src/main.tsx` wraps `<App>` in provider order: `SaasAuthProvider` → `AuthGate` → `ThemeProvider` → `UndoRedoProvider` → `AgentRuntimeContextProvider`. `AuthGate` blocks rendering until a workspace session exists.

**App shell** — `src/App.tsx` (~900 lines) owns active-module state, sidebar/topbar layout, split-screen, pinned modules, modals, and `renderContent` which maps each `ModuleId` to a feature component in `src/components/`. There are ~98 components; one per module/view.

**Product registry is the source of truth for navigation** — `src/product/registry.ts` defines the 14 nav groups and ~67 visible features. Each `ProductFeatureRecord` carries `phase` (p0/p1/p2/later), `readiness` (implemented/mock/placeholder/hidden), `permission`, `dataDependencies`, and `routeStatus`. `src/types.ts` defines the `ModuleId` union. When adding or changing a module you must keep `ModuleId` (types.ts), the registry entry, and the `renderContent` switch in App.tsx in sync — `scripts/product-registry.test.ts` asserts exact counts (e.g. 67 visible features, 14 domains) and the P0 batch list, so those tests will fail if you add a module without updating expectations.

**Permissions** — `src/saas/permissions.ts` maps `WorkspaceRole` → `WorkspacePermission[]` and gates `ProtectedWorkspaceAction`s. Registry visibility uses `canViewProductModule` against the session role.

**Data layer** — `src/lib/data/` holds one repository per domain (`projectRepository`, `billingRepository`, `auditLogRepository`, etc.), all built on `dataBackend.ts`. The backend has three modes selected by `VITE_DATA_BACKEND`: `local` (browser localStorage, the MVP default), `firebase` (Realtime DB via `src/lib/firebaseConfig.ts`), and `http`. Repositories are workspace-scoped: keys/paths are namespaced by `workspaceId` (and optionally `userId`) — see `settingsRepository.ts` storage-key pattern. Preserve this scoping when adding repositories.

**Agent runtime (dual/triple mode)** — `src/runtime/` abstracts where agents actually run. `runtimeMode.ts` resolves one of `web` (mock provider), `desktop_multica` (desktop bridge detected), or `self_hosted_multica` (Multica API/WS endpoints configured). Strategy comes from workspace settings (`auto` by default) and env (`VITE_MULTICA_*`). `AgentRuntimeContext.tsx` provides the active provider; `webMockAgentRuntimeProvider.ts` vs `multicaAgentRuntimeProvider.ts` implement the contract, with `multicaMappers.ts`/`multicaApiClient.ts` bridging to the external Multica API. `runtimeContract.test.ts` and the `multica-*` tests pin this contract.

**Auth** — `src/saas/SaasAuthContext.tsx` uses the real JWT API (`apiLogin`/`apiRegister`/`apiRefresh` in `authApi.ts`) against `apps/api/src/auth`. Registration is gated by an invite allowlist (`REGISTRATION_OPEN`/`REGISTRATION_ALLOWLIST`). The `createDemoAuthSession`/`loadAuthSession` helpers in `localAuthSession.ts` are TEST/E2E fixtures only (the browser smoke seeds a session behind `VITE_E2E_AUTH_BYPASS`); they are not part of the production auth path. Boot refuses placeholder/weak secrets (`secret-validation.ts`).

## Conventions & gotchas

- Path alias `@` → repo root (`vite.config.ts`).
- `build` uses explicit `manualChunks` grouping components into `app-commerce` / `app-creative` / `app-ops` and vendor splits; if you move component files between these domains, update the chunking globs.
- HMR/file-watching is disabled when `DISABLE_HMR=true` (AI Studio agent-edit environment) — do not "fix" the watch config in `vite.config.ts`.
- The repo root contains many throwaway `*.cjs`/`*.js` codemod scripts (`fix_*.cjs`, `update_*.cjs`, `add_*.cjs`) from prior bulk edits — these are not part of the app and not wired into build/test.
- `docs/` tracks the SaaS commercial MVP plan, P0 acceptance/evidence, and Multica compatibility; consult it for feature phasing and acceptance criteria.
- Gemini access needs `GEMINI_API_KEY`; copy `.env.example` to `.env.local`.
