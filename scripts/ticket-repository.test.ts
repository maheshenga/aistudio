import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setTicketApiClientForTest,
  hydrateWorkspaceTickets,
  loadWorkspaceTickets,
  createWorkspaceTicket,
} from '../src/lib/data/ticketRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'tickets') return { ok: true, value: { items: [{ id: 'srv1', requesterName: 'Server', category: 'c', subject: 'Srv', status: 'open' }], nextCursor: null } } as any;
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

  __setTicketApiClientForTest(fakeApi(true));
  await hydrateWorkspaceTickets({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceTickets({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].requesterName, 'Server');

  createWorkspaceTicket({ requesterName: 'New', category: 'c', subject: 'New One' }, { workspaceId: 'wsA', storage: storageA });
  const afterCreate = loadWorkspaceTickets({ workspaceId: 'wsA', storage: storageA });
  assert.equal(afterCreate.some((t) => t.subject === 'New One'), true);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setTicketApiClientForTest(fakeApi(false));
  createWorkspaceTicket({ requesterName: 'Local', category: 'c', subject: 'Local One' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceTickets({ workspaceId: 'wsB', storage });
  assert.equal(local.some((t) => t.subject === 'Local One'), true);

  console.log('ticket repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
