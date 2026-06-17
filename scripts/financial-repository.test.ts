import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setFinancialApiClientForTest,
  hydrateWorkspaceFinancialRecords,
  loadWorkspaceFinancialRecords,
  createWorkspaceFinancialRecord,
  saveWorkspaceFinancialRecords,
  summarizeWorkspaceFinancials,
} from '../src/lib/data/financialRepository.ts';

function makeApi(configured: boolean) {
  const patched: string[] = [];
  const api: ApiClient = {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'financial-records') return { ok: true, value: { items: [
        { id: 'srv1', kind: 'subscription', status: 'paid', amountCents: 9900, currency: 'CNY', counterparty: 'Acme', occurredAt: '2026-06-01T00:00:00.000Z' },
      ], nextCursor: null } } as any;
      return { ok: true, value: null } as any;
    },
    post: async () => ({ ok: true, value: {} }) as any,
    patch: async (_ws: string, path: string) => { patched.push(path); return { ok: true, value: {} } as any; },
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
  return { api, patched };
}

async function run() {
  const memA = new Map<string, string>();
  const storageA = { getItem: (k: string) => memA.get(k) ?? null, setItem: (k: string, v: string) => void memA.set(k, v), removeItem: (k: string) => void memA.delete(k) } as any;

  const { api, patched } = makeApi(true);
  __setFinancialApiClientForTest(api);
  await hydrateWorkspaceFinancialRecords({ workspaceId: 'wsA', storage: storageA });
  let recs = loadWorkspaceFinancialRecords({ workspaceId: 'wsA', storage: storageA });
  assert.equal(recs.length, 1);
  assert.equal(recs[0].kind, 'subscription');
  // occurredAt ISO 被 parse 成 number
  assert.equal(typeof recs[0].occurredAt, 'number');
  assert.ok(recs[0].occurredAt > 0);

  // create 写穿透:缓存追加
  createWorkspaceFinancialRecord({ kind: 'payment', status: 'paid', amountCents: 500 }, { workspaceId: 'wsA', storage: storageA });
  recs = loadWorkspaceFinancialRecords({ workspaceId: 'wsA', storage: storageA });
  assert.equal(recs.length, 2);

  // saveWorkspaceFinancialRecords diff:只改 srv1 的 status → 应只 PATCH srv1 一条
  patched.length = 0;
  const mutated = recs.map((r) => (r.id === 'srv1' ? { ...r, status: 'refunded' as const } : r));
  saveWorkspaceFinancialRecords(mutated, { workspaceId: 'wsA', storage: storageA });
  assert.equal(patched.length, 1);
  assert.equal(patched[0], 'financial-records/srv1');

  // 派生函数仍可用
  const summary = summarizeWorkspaceFinancials(loadWorkspaceFinancialRecords({ workspaceId: 'wsA', storage: storageA }));
  assert.equal(typeof summary.monthlyRevenueCents, 'number');

  // 未配置后端:localStorage 兜底
  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setFinancialApiClientForTest(makeApi(false).api);
  createWorkspaceFinancialRecord({ kind: 'invoice', status: 'issued', amountCents: 1000 }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceFinancialRecords({ workspaceId: 'wsB', storage });
  assert.equal(local.some((r) => r.kind === 'invoice'), true);

  console.log('financial repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
