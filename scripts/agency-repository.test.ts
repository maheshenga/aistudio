import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setAgencyApiClientForTest,
  hydrateWorkspaceAgencyPartners,
  loadWorkspaceAgencyPartners,
  createWorkspaceAgencyPartner,
} from '../src/lib/data/agencyRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'agency-partners') return { ok: true, value: { items: [{ id: 'srv1', name: 'Server MCN', level: 'V3' }], nextCursor: null } } as any;
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

  __setAgencyApiClientForTest(fakeApi(true));
  await hydrateWorkspaceAgencyPartners({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceAgencyPartners({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].name, 'Server MCN');

  createWorkspaceAgencyPartner({ name: 'New One', level: 'V1' }, { workspaceId: 'wsA', storage: storageA });
  const afterCreate = loadWorkspaceAgencyPartners({ workspaceId: 'wsA', storage: storageA });
  assert.equal(afterCreate.some((p) => p.name === 'New One'), true);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setAgencyApiClientForTest(fakeApi(false));
  createWorkspaceAgencyPartner({ name: 'Local One', level: 'V1' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceAgencyPartners({ workspaceId: 'wsB', storage });
  assert.equal(local.some((p) => p.name === 'Local One'), true);

  console.log('agency repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
