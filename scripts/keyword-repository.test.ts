import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setKeywordApiClientForTest,
  hydrateWorkspaceKeywordLibraries,
  loadWorkspaceKeywordLibraries,
  createWorkspaceKeywordLibrary,
  searchWorkspaceKeywordLibraries,
} from '../src/lib/data/keywordRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'keyword-libraries') return { ok: true, value: { items: [{ id: 'srv1', name: 'Server Lib', keywords: ['alpha'] }], nextCursor: null } } as any;
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

  __setKeywordApiClientForTest(fakeApi(true));
  await hydrateWorkspaceKeywordLibraries({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceKeywordLibraries({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].name, 'Server Lib');

  const found = searchWorkspaceKeywordLibraries('alpha', { workspaceId: 'wsA', storage: storageA });
  assert.equal(found.length, 1);
  const none = searchWorkspaceKeywordLibraries('zzz', { workspaceId: 'wsA', storage: storageA });
  assert.equal(none.length, 0);

  createWorkspaceKeywordLibrary({ name: 'New One' }, { workspaceId: 'wsA', storage: storageA });
  const afterCreate = loadWorkspaceKeywordLibraries({ workspaceId: 'wsA', storage: storageA });
  assert.equal(afterCreate.some((l) => l.name === 'New One'), true);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setKeywordApiClientForTest(fakeApi(false));
  createWorkspaceKeywordLibrary({ name: 'Local One' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceKeywordLibraries({ workspaceId: 'wsB', storage });
  assert.equal(local.length, 1);
  assert.equal(local[0].name, 'Local One');

  console.log('keyword repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
