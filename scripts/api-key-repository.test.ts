import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setApiKeyApiClientForTest,
  hydrateWorkspaceApiKeys,
  loadWorkspaceApiKeys,
  createWorkspaceApiKey,
} from '../src/lib/data/apiKeyRepository.ts';

let lastPost: { path: string; body: any } | null = null;
function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'api-keys') return { ok: true, value: { items: [{ id: 'srv1', name: 'Server Key', last4: '0001', status: 'active' }], nextCursor: null } } as any;
      return { ok: true, value: null } as any;
    },
    post: async (_ws: string, path: string, body: any) => { lastPost = { path, body }; return { ok: true, value: {} } as any; },
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
}

async function run() {
  const memA = new Map<string, string>();
  const storageA = { getItem: (k: string) => memA.get(k) ?? null, setItem: (k: string, v: string) => void memA.set(k, v), removeItem: (k: string) => void memA.delete(k) } as any;

  __setApiKeyApiClientForTest(fakeApi(true));
  await hydrateWorkspaceApiKeys({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceApiKeys({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].name, 'Server Key');

  lastPost = null;
  const { secret } = createWorkspaceApiKey({ name: 'New Key', secret: 'sk-live-zzzz4321' }, { workspaceId: 'wsA', storage: storageA });
  assert.equal(secret, 'sk-live-zzzz4321');
  assert.ok(lastPost, 'POST write-through fired');
  assert.equal(lastPost!.path, 'api-keys');
  assert.equal(lastPost!.body.secret, 'sk-live-zzzz4321'); // 明文 secret 发后端加密
  const afterCreate = loadWorkspaceApiKeys({ workspaceId: 'wsA', storage: storageA });
  assert.equal(afterCreate.some((k) => k.name === 'New Key'), true);

  // 未配置:localStorage 兜底
  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setApiKeyApiClientForTest(fakeApi(false));
  createWorkspaceApiKey({ name: 'Local Key', secret: 'sk-local-1111' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceApiKeys({ workspaceId: 'wsB', storage });
  assert.equal(local.some((k) => k.name === 'Local Key'), true);

  console.log('api-key repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
