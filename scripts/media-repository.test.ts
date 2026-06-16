import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setMediaApiClientForTest,
  hydrateWorkspaceMediaAccounts,
  loadWorkspaceMediaAccounts,
  createWorkspaceMediaAccount,
} from '../src/lib/data/mediaRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'media-accounts') return { ok: true, value: { items: [{ id: 'srv1', platformName: 'Server YT', status: 'active' }], nextCursor: null } } as any;
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

  __setMediaApiClientForTest(fakeApi(true));
  await hydrateWorkspaceMediaAccounts({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceMediaAccounts({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].platformName, 'Server YT');

  createWorkspaceMediaAccount({ platformName: 'New One' }, { workspaceId: 'wsA', storage: storageA });
  const afterCreate = loadWorkspaceMediaAccounts({ workspaceId: 'wsA', storage: storageA });
  assert.equal(afterCreate.some((m) => m.platformName === 'New One'), true);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setMediaApiClientForTest(fakeApi(false));
  createWorkspaceMediaAccount({ platformName: 'Local One' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceMediaAccounts({ workspaceId: 'wsB', storage });
  assert.equal(local.some((m) => m.platformName === 'Local One'), true);

  console.log('media repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
