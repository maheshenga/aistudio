import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setCustomerApiClientForTest,
  hydrateWorkspaceCustomers,
  loadWorkspaceCustomers,
  createWorkspaceCustomer,
} from '../src/lib/data/customerRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'customers') return { ok: true, value: { items: [{ id: 'srv1', name: 'Server Cust' }], nextCursor: null } } as any;
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

  // configured: hydrate 后 load 读后端缓存
  __setCustomerApiClientForTest(fakeApi(true));
  await hydrateWorkspaceCustomers({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceCustomers({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].name, 'Server Cust');

  // configured: create 乐观入缓存(同步可见)
  createWorkspaceCustomer({ name: 'New One' }, { workspaceId: 'wsA', storage: storageA });
  const afterCreate = loadWorkspaceCustomers({ workspaceId: 'wsA', storage: storageA });
  assert.equal(afterCreate.some((c) => c.name === 'New One'), true);

  // 未配置:回退 localStorage
  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setCustomerApiClientForTest(fakeApi(false));
  createWorkspaceCustomer({ name: 'Local One' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceCustomers({ workspaceId: 'wsB', storage });
  assert.equal(local.length, 1);
  assert.equal(local[0].name, 'Local One');

  console.log('customer repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
