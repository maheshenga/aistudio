import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setSettingsApiClientForTest,
  hydrateSettings,
  loadSettings,
  getSetting,
  saveSetting,
  deleteSetting,
} from '../src/lib/data/settingsRepository.ts';

function makeApi(configured: boolean) {
  const calls: string[] = [];
  const api = {
    configured,
    get: async (_ws: string, path: string) => {
      calls.push(`GET ${path}`);
      if (path.startsWith('settings?ownerId=')) {
        if (path.includes('user_a')) return { ok: true, value: { theme: 'dark' } } as any;
        return { ok: true, value: {} } as any;
      }
      return { ok: true, value: null } as any;
    },
    post: async () => ({ ok: true, value: {} }) as any,
    patch: async (_ws: string, path: string) => { calls.push(`PATCH ${path}`); return { ok: true, value: {} } as any; },
    del: async (_ws: string, path: string) => { calls.push(`DEL ${path}`); return { ok: true, value: {} } as any; },
  } as unknown as ApiClient;
  return { api, calls };
}

async function run() {
  // per-user hydrate + read cache
  const { api, calls } = makeApi(true);
  __setSettingsApiClientForTest(api);
  const ctxUser = { workspaceId: 'wsA', userId: 'user_a' };
  await hydrateSettings(ctxUser);
  assert.equal(getSetting('theme', 'light', ctxUser), 'dark');

  // saveSetting 写穿透(PATCH)
  calls.length = 0;
  saveSetting('pinned', ['x'], ctxUser);
  assert.deepEqual(getSetting('pinned', [], ctxUser), ['x']);
  assert.ok(calls.some((c) => c.startsWith('PATCH settings?ownerId=user_a')));

  // saveSetting(null) 缓存里 key=null(存在)
  saveSetting('maybe', null, ctxUser);
  const all = loadSettings(ctxUser);
  assert.equal(Object.prototype.hasOwnProperty.call(all, 'maybe'), true);
  assert.equal(all.maybe, null);

  // deleteSetting 走 DELETE
  calls.length = 0;
  deleteSetting('theme', ctxUser);
  assert.equal(getSetting('theme', 'fallback', ctxUser), 'fallback');
  assert.ok(calls.some((c) => c.startsWith('DEL settings/theme?ownerId=user_a')));

  // per-workspace(无 userId)与 per-user 缓存隔离
  const wsMem = new Map<string, string>();
  const wsStorage = {
    getItem: (k: string) => wsMem.get(k) ?? null,
    setItem: (k: string, v: string) => void wsMem.set(k, v),
    removeItem: (k: string) => void wsMem.delete(k),
  } as any;
  const ctxWs = { workspaceId: 'wsA', storage: wsStorage };
  saveSetting('smtp', 'host', ctxWs);
  assert.equal(getSetting('smtp', null, ctxWs), 'host');
  assert.equal(getSetting('smtp', 'none', ctxUser), 'none'); // user 命名空间看不到 workspace 的

  // 未配置后端:localStorage 兜底
  const mem = new Map<string, string>();
  const storage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  } as any;
  __setSettingsApiClientForTest(makeApi(false).api);
  saveSetting('local_only', 'yes', { workspaceId: 'wsB', storage });
  assert.equal(getSetting('local_only', 'no', { workspaceId: 'wsB', storage }), 'yes');

  console.log('settings repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
