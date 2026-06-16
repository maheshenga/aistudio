import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setRiskApiClientForTest,
  hydrateWorkspaceRiskEvents,
  loadWorkspaceRiskEvents,
  createWorkspaceRiskEvent,
} from '../src/lib/data/riskRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'risk-events') return { ok: true, value: { items: [{ id: 'srv1', action: 'Server Act', contentSummary: 's', rule: 'r', decision: 'blocked', severity: 'high' }], nextCursor: null } } as any;
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

  __setRiskApiClientForTest(fakeApi(true));
  await hydrateWorkspaceRiskEvents({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceRiskEvents({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].action, 'Server Act');

  createWorkspaceRiskEvent({ action: 'New Act', contentSummary: 's', rule: 'r' }, { workspaceId: 'wsA', storage: storageA });
  const afterCreate = loadWorkspaceRiskEvents({ workspaceId: 'wsA', storage: storageA });
  assert.equal(afterCreate.some((e) => e.action === 'New Act'), true);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setRiskApiClientForTest(fakeApi(false));
  createWorkspaceRiskEvent({ action: 'Local Act', contentSummary: 's', rule: 'r' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceRiskEvents({ workspaceId: 'wsB', storage });
  assert.equal(local.some((e) => e.action === 'Local Act'), true);

  console.log('risk repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
