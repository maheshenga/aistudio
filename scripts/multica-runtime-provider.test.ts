import assert from 'node:assert/strict';

import type { RawMulticaDaemonStatus } from '../src/runtime/agentRuntimeTypes.ts';
import type { DesktopAgentBridge } from '../src/runtime/desktopAgentBridge.ts';
import { createMulticaAgentRuntimeProvider } from '../src/runtime/multicaAgentRuntimeProvider.ts';

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

const selfHostedProvider = createMulticaAgentRuntimeProvider({
  mode: 'self_hosted_multica',
  env: {
    multicaApiUrl: 'http://127.0.0.1:3000',
    multicaWsUrl: 'ws://127.0.0.1:3000',
    multicaWorkspaceId: 'workspace_aistudio_001',
  },
  apiClient: {
    listAgents: async () => [],
    listRuntimes: async (workspaceId, owner) => {
      assert.equal(workspaceId, 'workspace_aistudio_001');
      assert.equal(owner, 'me');
      return [
        { id: 'runtime_codex', provider: 'codex', status: 'online' },
        { id: 'runtime_claude', provider: 'claude', status: 'online' },
      ];
    },
    createIssue: async () => ({ id: 'issue_001', title: 'Dispatch' }),
    cancelTask: async () => undefined,
  },
});

const selfHostedStatus = await selfHostedProvider.getRuntimeStatus();
assert.equal(selfHostedStatus.mode, 'self_hosted_multica');
assert.equal(selfHostedStatus.health, 'available');
assert.equal(selfHostedStatus.runtimeCount, 2);
assert.deepEqual(selfHostedStatus.cliProviders, ['codex', 'claude']);

const bridge: DesktopAgentBridge = {
  isAvailable: () => true,
  getDaemonStatus: async (): Promise<RawMulticaDaemonStatus> => ({
    state: 'running',
    daemonId: 'daemon_local_001',
    deviceName: 'Windows Workstation',
    agents: ['codex'],
    serverUrl: 'http://127.0.0.1:3000',
  }),
  startDaemon: async () => ({ success: true }),
  stopDaemon: async () => ({ success: true }),
  restartDaemon: async () => ({ success: true }),
  streamDaemonLogs: () => () => undefined,
  subscribeToDaemonStatus: () => () => undefined,
  syncAuthToken: async () => undefined,
  setTargetApiUrl: async () => undefined,
};

const desktopProvider = createMulticaAgentRuntimeProvider({
  mode: 'desktop_multica',
  env: {
    multicaApiUrl: 'http://127.0.0.1:3000',
    multicaWorkspaceId: 'workspace_aistudio_001',
  },
  bridge,
  apiClient: {
    listAgents: async () => [],
    listRuntimes: async () => [
      { id: 'runtime_codex', provider: 'codex', status: 'online' },
      { id: 'runtime_gemini', provider: 'gemini', status: 'online' },
    ],
    createIssue: async () => ({ id: 'issue_001', title: 'Dispatch' }),
    cancelTask: async () => undefined,
  },
});

const desktopStatus = await desktopProvider.getRuntimeStatus();
assert.equal(desktopStatus.mode, 'desktop_multica');
assert.equal(desktopStatus.health, 'available');
assert.equal(desktopStatus.runtimeCount, 2);
assert.deepEqual(desktopStatus.cliProviders, ['codex', 'gemini']);

const degradedProvider = createMulticaAgentRuntimeProvider({
  mode: 'self_hosted_multica',
  env: {
    multicaApiUrl: 'http://127.0.0.1:3000',
    multicaWsUrl: 'ws://127.0.0.1:3000',
  },
  apiClient: {
    listAgents: async () => [],
    listRuntimes: async () => {
      throw new Error('runtime API unavailable');
    },
    createIssue: async () => ({ id: 'issue_001', title: 'Dispatch' }),
    cancelTask: async () => undefined,
  },
});

const degradedStatus = await degradedProvider.getRuntimeStatus();
assert.equal(degradedStatus.health, 'degraded');
assert.equal(degradedStatus.compatibilityWarning, 'runtime API unavailable');

// listTasks 走后端注入的 listJobs(不再返回 [])
{
  const backendTasks = [{ id: 'job-1', title: 'T1', status: 'running', source: 'multica', createdAt: '', updatedAt: '' }];
  const provider = createMulticaAgentRuntimeProvider({
    mode: 'desktop_multica',
    env: { multicaApiUrl: 'http://m', multicaWsUrl: 'ws://m/ws' },
    apiClient: { listAgents: async () => [], listRuntimes: async () => [], createIssue: async () => ({ id: 'i1' }), cancelTask: async () => {} } as any,
    listJobs: async () => backendTasks as any,
  });
  const tasks = await provider.listTasks();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, 'job-1');
}

// subscribeToTask 连真实 WS:收到 message 转 AgentTaskEvent 回调
{
  const events: any[] = [];
  let onMessage: ((e: { data: string }) => void) | null = null;
  const fakeWs = { addEventListener: (t: string, cb: any) => { if (t === 'message') onMessage = cb; }, close() {} };
  const provider = createMulticaAgentRuntimeProvider({
    mode: 'desktop_multica',
    env: { multicaApiUrl: 'http://m', multicaWsUrl: 'ws://m/ws' },
    apiClient: { listAgents: async () => [], listRuntimes: async () => [], createIssue: async () => ({ id: 'i1' }), cancelTask: async () => {} } as any,
    wsFactory: (url: string) => { assert.ok(url.includes('mt1')); return fakeWs as any; },
  });
  const unsub = provider.subscribeToTask('multica-task-mt1', (e) => events.push(e));
  onMessage!({ data: JSON.stringify({ status: 'running', progress: 30, message: 'step' }) });
  assert.equal(events.length, 1);
  assert.equal(events[0].status, 'running');
  assert.equal(events[0].progress, 30);
  unsub();
}

console.log('multica runtime provider passed');
