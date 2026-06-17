import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setPaymentApiClientForTest,
  hydrateWorkspacePaymentMethods,
  loadWorkspacePaymentMethods,
  createWorkspacePaymentMethod,
} from '../src/lib/data/paymentRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'payment-methods') return { ok: true, value: { items: [{ id: 'srv1', label: 'Server Card', provider: 'Stripe', brand: 'Visa', last4: '4242', status: 'active', isDefault: true }], nextCursor: null } } as any;
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

  __setPaymentApiClientForTest(fakeApi(true));
  await hydrateWorkspacePaymentMethods({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspacePaymentMethods({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].label, 'Server Card');
  assert.equal(fromBackend[0].isDefault, true);

  createWorkspacePaymentMethod({ label: 'New Default', provider: 'Stripe', brand: 'Visa', accountNumber: '5555555555554444', isDefault: true }, { workspaceId: 'wsA', storage: storageA });
  const afterCreate = loadWorkspacePaymentMethods({ workspaceId: 'wsA', storage: storageA });
  const defaults = afterCreate.filter((m) => m.isDefault);
  assert.equal(defaults.length, 1);
  assert.equal(defaults[0].label, 'New Default');
  assert.equal(defaults[0].last4, '4444');
  assert.equal((defaults[0] as any).accountNumber, undefined);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setPaymentApiClientForTest(fakeApi(false));
  createWorkspacePaymentMethod({ label: 'Local One', provider: 'Stripe', brand: 'Visa' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspacePaymentMethods({ workspaceId: 'wsB', storage });
  assert.equal(local.some((m) => m.label === 'Local One'), true);

  console.log('payment repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
