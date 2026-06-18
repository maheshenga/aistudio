import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import { __setCreditApiClientForTest } from '../src/lib/data/creditRepository.ts';
import { preflightCredits } from '../src/lib/billing/creditPreflight.ts';

function balanceApi(balance: number): ApiClient {
  return {
    configured: true,
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

function unconfiguredApi(): ApiClient {
  return {
    configured: false,
    get: async () => ({ ok: true, value: {} }) as any,
    post: async () => ({ ok: true, value: {} }) as any,
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
}

function throwingApi(): ApiClient {
  return {
    configured: true,
    get: async () => { throw new Error('network down'); },
    post: async () => ({ ok: true, value: {} }) as any,
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
}

async function run() {
  // 1) 余额充足 → ok
  __setCreditApiClientForTest(balanceApi(50));
  const sufficient = await preflightCredits({ workspaceId: 'ws-ok', requiredCredits: 10 });
  assert.equal(sufficient.ok, true);
  assert.equal(sufficient.balance, 50);
  assert.equal(sufficient.reason, undefined);

  // 2) 余额不足 → insufficient
  __setCreditApiClientForTest(balanceApi(3));
  const insufficient = await preflightCredits({ workspaceId: 'ws-low', requiredCredits: 10 });
  assert.equal(insufficient.ok, false);
  assert.equal(insufficient.balance, 3);
  assert.equal(insufficient.reason, 'insufficient');

  // 3) 未配置后端 → snapshot 为 null → unavailable
  __setCreditApiClientForTest(unconfiguredApi());
  const nullSnap = await preflightCredits({ workspaceId: 'ws-null', requiredCredits: 10 });
  assert.equal(nullSnap.ok, false);
  assert.equal(nullSnap.balance, null);
  assert.equal(nullSnap.reason, 'unavailable');

  // 4) 水合 reject → unavailable(且不抛出)
  __setCreditApiClientForTest(throwingApi());
  const rejected = await preflightCredits({ workspaceId: 'ws-throw', requiredCredits: 10 });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.balance, null);
  assert.equal(rejected.reason, 'unavailable');

  console.log('credit preflight passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
