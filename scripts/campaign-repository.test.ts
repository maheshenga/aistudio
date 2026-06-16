import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setCampaignApiClientForTest,
  hydrateWorkspaceCampaigns,
  listWorkspaceCampaigns,
  createWorkspaceCampaign,
} from '../src/lib/data/campaignRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'campaigns') return { ok: true, value: { items: [{ id: 'srv1', name: 'Server Cmp' }], nextCursor: null } } as any;
      return { ok: true, value: null } as any;
    },
    post: async () => ({ ok: true, value: {} }) as any,
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
}

async function run() {
  const memA = new Map<string, string>();
  const storageA = { getItem: (k: string) => memA.get(k) ?? null, setItem: (k: string, v: string) => void memA.set(k, v), removeItem: (k: string) => void memA.delete(k) } as any;

  __setCampaignApiClientForTest(fakeApi(true));
  await hydrateWorkspaceCampaigns({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = listWorkspaceCampaigns({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].name, 'Server Cmp');

  createWorkspaceCampaign({ name: 'New One' }, { workspaceId: 'wsA', storage: storageA });
  const afterCreate = listWorkspaceCampaigns({ workspaceId: 'wsA', storage: storageA });
  assert.equal(afterCreate.some((c) => c.name === 'New One'), true);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setCampaignApiClientForTest(fakeApi(false));
  createWorkspaceCampaign({ name: 'Local One' }, { workspaceId: 'wsB', storage });
  const local = listWorkspaceCampaigns({ workspaceId: 'wsB', storage });
  assert.equal(local.length, 1);
  assert.equal(local[0].name, 'Local One');

  console.log('campaign repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
