import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setCreditApiClientForTest,
  hydrateCreditBalance,
  getCreditBalanceSnapshot,
} from '../src/lib/data/creditRepository.ts';

function fakeApi(configured: boolean, balance: number): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'credits/balance') {
        return { ok: true, value: { balance, plan: 'free', monthlyAllowance: 100, periodKey: '2026-06' } } as any;
      }
      return { ok: true, value: [] } as any;
    },
    post: async () => ({ ok: true, value: {} }) as any,
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
}

async function run() {
  __setCreditApiClientForTest(fakeApi(true, 73));
  await hydrateCreditBalance({ workspaceId: 'ws1' });
  const snap = getCreditBalanceSnapshot({ workspaceId: 'ws1' });
  assert.equal(snap?.balance, 73);
  assert.equal(snap?.monthlyAllowance, 100);

  __setCreditApiClientForTest(fakeApi(false, 0));
  await hydrateCreditBalance({ workspaceId: 'ws2' });
  assert.equal(getCreditBalanceSnapshot({ workspaceId: 'ws2' }), null);

  console.log('credit repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
