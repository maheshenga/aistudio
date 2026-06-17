import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setTaxEventApiClientForTest,
  hydrateWorkspaceTaxEvents,
  loadWorkspaceTaxEvents,
  createWorkspaceTaxEvent,
} from '../src/lib/data/taxEventRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'tax-events') return { ok: true, value: { items: [{ id: 'srv1', date: '2026-09-30', title: 'Server Event', type: 'tax_deadline', status: 'pending' }], nextCursor: null } } as any;
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

  __setTaxEventApiClientForTest(fakeApi(true));
  await hydrateWorkspaceTaxEvents({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceTaxEvents({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].title, 'Server Event');
  assert.equal(typeof fromBackend[0].daysUntil, 'number');

  createWorkspaceTaxEvent({ date: '2026-10-15', title: 'New One', type: 'tax_deadline', description: '', summary: '', status: 'pending' }, { workspaceId: 'wsA', storage: storageA });
  const afterCreate = loadWorkspaceTaxEvents({ workspaceId: 'wsA', storage: storageA });
  assert.equal(afterCreate.some((e) => e.title === 'New One'), true);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setTaxEventApiClientForTest(fakeApi(false));
  createWorkspaceTaxEvent({ date: '2026-10-15', title: 'Local One', type: 'tax_deadline', description: '', summary: '', status: 'pending' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceTaxEvents({ workspaceId: 'wsB', storage });
  assert.equal(local.some((e) => e.title === 'Local One'), true);

  console.log('tax-event repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
