import assert from 'node:assert/strict';

import { detectDesktopAgentBridge } from '../src/runtime/desktopAgentBridge.ts';
import { runDesktopRuntimeAction } from '../src/runtime/desktopRuntimeActions.ts';
import { createMulticaAgentRuntimeProvider } from '../src/runtime/multicaAgentRuntimeProvider.ts';
import { readRuntimeAuditEvents } from '../src/runtime/runtimeAudit.ts';
import { resolveRuntimeMode } from '../src/runtime/runtimeMode.ts';

const storage = new Map<string, string>();
(globalThis as typeof globalThis & { localStorage: Storage }).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
  key: (index: number) => [...storage.keys()][index] ?? null,
  get length() {
    return storage.size;
  },
} as Storage;

delete (globalThis as { window?: unknown }).window;
assert.equal(detectDesktopAgentBridge(), null);

(globalThis as { window?: unknown }).window = {
  daemonAPI: {
    start: async () => ({ success: true }),
    stop: async () => ({ success: true }),
    restart: async () => ({ success: true }),
    getStatus: async () => ({
      state: 'running',
      daemonId: 'daemon_local_001',
      deviceName: 'Windows Workstation',
      agents: ['codex', 'claude', 'gemini'],
      serverUrl: 'http://127.0.0.1:3000',
    }),
    onStatusChange: (callback: (status: unknown) => void) => {
      callback({ state: 'running', agents: ['codex'] });
      return () => undefined;
    },
    syncToken: async () => undefined,
    setTargetApiUrl: async () => undefined,
    startLogStream: () => undefined,
    stopLogStream: () => undefined,
    onLogLine: (callback: (line: string) => void) => {
      callback('daemon ready');
      return () => undefined;
    },
  },
};

const bridge = detectDesktopAgentBridge();
assert.notEqual(bridge, null);
assert.equal(bridge?.isAvailable(), true);

const status = await bridge!.getDaemonStatus();
assert.equal(status.state, 'running');
assert.deepEqual(status.agents, ['codex', 'claude', 'gemini']);
assert.equal(resolveRuntimeMode({}), 'desktop_multica');

const startResult = await bridge!.startDaemon();
assert.equal(startResult.success, true);

let logLine = '';
bridge!.streamDaemonLogs((line) => {
  logLine = line;
})();
assert.equal(logLine, 'daemon ready');

const provider = createMulticaAgentRuntimeProvider({
  mode: 'desktop_multica',
  env: {},
  bridge,
});
const runtimeStatus = await provider.getRuntimeStatus();
assert.equal(runtimeStatus.mode, 'desktop_multica');
assert.equal(runtimeStatus.health, 'available');
assert.equal(runtimeStatus.daemonState, 'running');
assert.deepEqual(runtimeStatus.cliProviders, ['codex', 'claude', 'gemini']);

await runDesktopRuntimeAction('restart');
assert.equal(readRuntimeAuditEvents()[0]?.action, 'daemon_restart_requested');

console.log('desktop bridge detection passed');
