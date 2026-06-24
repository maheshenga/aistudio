import assert from 'node:assert/strict';
import { createMemoryStorage } from '../src/lib/data/dataBackend.ts';
import { __setCreditApiClientForTest } from '../src/lib/data/creditRepository.ts';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import { __setGenerationJobApiClientForTest } from '../src/lib/data/generationJobRepository.ts';
import {
  estimateBillableGenerationCredits,
  formatCreditBlockMessage,
  startBillableGenerationJob,
} from '../src/lib/billing/billableGeneration.ts';

function balanceApi(balance: number): ApiClient {
  return {
    configured: true,
    get: async (_ws: string, path: string) => {
      if (path === 'credits/balance') {
        return { ok: true, value: { balance, plan: 'free', monthlyAllowance: 100, periodKey: '2026-06' } } as any;
      }
      if (path === 'generation-jobs') return { ok: true, value: [] } as any;
      return { ok: true, value: [] } as any;
    },
    post: async (_ws: string, path: string) => {
      if (path === 'generation-jobs') {
        return { ok: false, error: { code: 'insufficient_credits', message: 'Insufficient credits' } } as any;
      }
      return { ok: true, value: {} } as any;
    },
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
}

function passingApi(): ApiClient {
  return {
    configured: true,
    get: async (_ws: string, path: string) => {
      if (path === 'credits/balance') {
        return { ok: true, value: { balance: 100, plan: 'free', monthlyAllowance: 100, periodKey: '2026-06' } } as any;
      }
      return { ok: true, value: [] } as any;
    },
    post: async (_ws: string, path: string) => {
      if (path === 'generation-jobs') {
        return { ok: true, value: {
          id: 'job-server-1',
          workspaceId: 'ws1',
          title: 't',
          prompt: 'p',
          status: 'running',
          providerKind: 'mock',
          runtimeMode: 'web',
          progress: 0,
          createdAt: '2026-06-19T08:00:00.000Z',
          updatedAt: '2026-06-19T08:00:00.000Z',
        } } as any;
      }
      return { ok: true, value: {} } as any;
    },
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
}

async function run() {
  assert.equal(
    formatCreditBlockMessage(10, 3),
    '算力额度不足：本次操作需要 10 点，当前剩余 3 点，请升级套餐或充值后重试。',
  );

  const ctx = { workspaceId: 'ws1', storage: createMemoryStorage() };
  const pricing = { moduleId: 'image' as const, pricingAction: 'generation' as const, providerKind: 'mock' as const, runtimeMode: 'web' as const };
  assert.equal(estimateBillableGenerationCredits(pricing) > 0, true);

  __setCreditApiClientForTest(balanceApi(3));
  __setGenerationJobApiClientForTest({ configured: false, get: async () => ({ ok: true, value: [] }) as any, post: async () => ({ ok: true, value: {} }) as any, patch: async () => ({ ok: true, value: {} }) as any, del: async () => ({ ok: true, value: {} }) as any } as ApiClient);
  const blocked = await startBillableGenerationJob({
    title: 'Image',
    prompt: 'cat',
    status: 'running',
    providerKind: 'mock',
    runtimeMode: 'web',
    moduleId: 'image',
    progress: 0,
  }, ctx, { workspaceId: 'ws1', plan: 'free', pricing });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) {
    assert.equal(blocked.reason, 'insufficient');
    assert.match(blocked.message, /算力额度不足/);
  }

  __setCreditApiClientForTest(passingApi());
  __setGenerationJobApiClientForTest(passingApi());
  const started = await startBillableGenerationJob({
    title: 'Image',
    prompt: 'cat',
    status: 'running',
    providerKind: 'mock',
    runtimeMode: 'web',
    moduleId: 'image',
    progress: 0,
  }, ctx, { workspaceId: 'ws1', plan: 'free', pricing });
  assert.equal(started.ok, true);
  if (started.ok) assert.equal(started.job.id, 'job-server-1');

  __setCreditApiClientForTest(balanceApi(100));
  __setGenerationJobApiClientForTest(balanceApi(100));
  const raceBlocked = await startBillableGenerationJob({
    title: 'Image',
    prompt: 'cat',
    status: 'running',
    providerKind: 'mock',
    runtimeMode: 'web',
    moduleId: 'image',
    progress: 0,
  }, ctx, { workspaceId: 'ws1', plan: 'free', pricing });
  assert.equal(raceBlocked.ok, false);
  if (!raceBlocked.ok) assert.equal(raceBlocked.reason, 'insufficient');

  console.log('billable generation passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
