# Multica Compatibility Matrix

Date: 2026-06-09

## Integration Policy

`aistudio` integrates Multica through adapter contracts only. Product modules consume `AgentRuntimeProvider`; they do not import Multica UI or copy Multica source files.

## Tested Source

| Area | Local Source Used For Contract | Required Surface |
|---|---|---|
| Desktop preload | `E:\code\_tmp\multica\apps\desktop\src\preload\index.ts` | `window.daemonAPI`, `window.desktopAPI.runtimeConfig` |
| Daemon states | `E:\code\_tmp\multica\apps\desktop\src\shared\daemon-types.ts` | `running`, `stopped`, `starting`, `stopping`, `installing_cli`, `cli_not_found`, `auth_expired` |
| Runtime config | `E:\code\_tmp\multica\apps\desktop\src\shared\runtime-config.ts` | `apiUrl`, `wsUrl`, `appUrl` |
| Agents/runtimes API | `E:\code\_tmp\multica\packages\core\api\client.ts` | `GET /api/agents`, `GET /api/runtimes` |
| Dispatch API | `E:\code\_tmp\multica\packages\core\api\client.ts` | `POST /api/issues`, `POST /api/tasks/:id/cancel` |

## Minimum Contract

- Web mode works when every Multica URL and bridge object is absent.
- Desktop mode detects `window.daemonAPI` without throwing in a normal browser.
- Daemon status maps to an `aistudio` runtime status.
- Runtime and agent lists map to local provider availability.
- Multica task references are stored as external runtime metadata on `aistudio` tasks.
- Compatibility failure marks desktop runtime degraded and never blocks Web SaaS navigation.

## Release Verification

- `npm run lint`
- `npm run build`
- `npm run test:runtime-contract`
- `npm run test:desktop-bridge`
- `npm run test:multica-mappers`
- `npm run test:multica-runtime-provider`
- `npm run test:web-runtime-provider`
- `npm run test:multica-api-client`

## Token And Auth Rules

- Browser Web mode must not receive local daemon tokens.
- `VITE_MULTICA_TOKEN` is development-only for local smoke verification.
- Production desktop mode should obtain or sync auth through a trusted desktop bridge.
- If Multica reports `auth_expired`, `aistudio` marks desktop runtime `auth_expired` and leaves Web SaaS usable.

## Verification Log

| Date | Verification | Result |
|---|---|---|
| 2026-06-09 | Runtime contract scripts | Pass when all `npm run test:*` runtime scripts complete. |
| 2026-06-09 | Web mode smoke | Dashboard, Settings runtime tab, Agent Status, Dispatcher, Task Center, and Tasks render without console errors. |
| 2026-06-09 | Desktop bridge fixture smoke | `window.daemonAPI` fixture maps to `desktop_multica`, daemon `running`, and CLI provider list. |
