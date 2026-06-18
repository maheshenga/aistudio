import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setWebhookApiClientForTest,
  hydrateWorkspaceWebhookEndpoints,
  loadWorkspaceWebhookEndpoints,
  createWorkspaceWebhookEndpoint,
  deleteWorkspaceWebhookEndpoint,
} from '../src/lib/data/webhookRepository.ts';

let lastPost: { path: string; body: any } | null = null;
let lastDel: string | null = null;
function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'webhooks') return { ok: true, value: { items: [{ id: 'srv1', name: 'Server Hook', url: 'https://ex.com', status: 'active', events: ['a'], signingSecretLast4: '0001' }], nextCursor: null } } as any;
      return { ok: true, value: null } as any;
    },
    post: async (_ws: string, path: string, body: any) => { lastPost = { path, body }; return { ok: true, value: {} } as any; },
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async (_ws: string, path: string) => { lastDel = path; return { ok: true, value: {} } as any; },
  } as any;
}

async function run() {
  const memA = new Map<string, string>();
  const storageA = { getItem: (k: string) => memA.get(k) ?? null, setItem: (k: string, v: string) => void memA.set(k, v), removeItem: (k: string) => void memA.delete(k) } as any;

  __setWebhookApiClientForTest(fakeApi(true));
  await hydrateWorkspaceWebhookEndpoints({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceWebhookEndpoints({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].name, 'Server Hook');

  lastPost = null;
  const { signingSecret } = createWorkspaceWebhookEndpoint({ name: 'New Hook', url: 'https://ex.com/n', events: ['order.created'], signingSecret: 'whsec-zzzz4321' }, { workspaceId: 'wsA', storage: storageA });
  assert.equal(signingSecret, 'whsec-zzzz4321');
  assert.ok(lastPost, 'POST write-through fired');
  assert.equal(lastPost!.path, 'webhooks');
  assert.equal(lastPost!.body.signingSecret, 'whsec-zzzz4321'); // 明文 secret 发后端加密
  const afterCreate = loadWorkspaceWebhookEndpoints({ workspaceId: 'wsA', storage: storageA });
  const newHook = afterCreate.find((w) => w.name === 'New Hook');
  assert.ok(newHook, 'new hook in cache');

  lastDel = null;
  deleteWorkspaceWebhookEndpoint(newHook!.id, { workspaceId: 'wsA', storage: storageA });
  assert.equal(lastDel, `webhooks/${newHook!.id}`); // DELETE write-through

  // 未配置:localStorage 兜底
  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setWebhookApiClientForTest(fakeApi(false));
  createWorkspaceWebhookEndpoint({ name: 'Local Hook', url: 'https://ex.com/l', events: [], signingSecret: 'whsec-local1111' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceWebhookEndpoints({ workspaceId: 'wsB', storage });
  assert.equal(local.some((w) => w.name === 'Local Hook'), true);

  console.log('webhook repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
