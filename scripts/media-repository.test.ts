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

  // P3-E01: owner + scopes persist; raw client secret never stored (only last4 ref)
  createWorkspaceMediaAccount(
    { platformName: 'Scoped Channel', ownerId: 'user_owner_1', scopes: ['content.read', 'content.publish', 'content.read'], clientId: 'abcd1234secret9876' },
    { workspaceId: 'wsB', storage },
  );
  const scoped = loadWorkspaceMediaAccounts({ workspaceId: 'wsB', storage }).find((m) => m.platformName === 'Scoped Channel');
  assert.ok(scoped, 'scoped account should persist');
  assert.equal(scoped!.ownerId, 'user_owner_1');
  assert.deepEqual(scoped!.scopes, ['content.read', 'content.publish'], 'scopes deduped + persisted');
  assert.equal(scoped!.clientIdLast4, '9876', 'only last4 of client id retained');
  const raw = mem.get('aistudio_workspace_media_accounts:wsB') ?? '';
  assert.equal(raw.includes('abcd1234secret9876'), false, 'raw credential must not be persisted');

  console.log('media repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
