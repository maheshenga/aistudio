import assert from 'node:assert/strict';
import { createApiClient } from '../src/lib/data/apiClient.ts';
import { hydrateWorkspaceUsageEvents, listWorkspaceUsageEvents, __setUsageApiClientForTest } from '../src/lib/data/usageRepository.ts';
import { createMemoryStorage } from '../src/lib/data/dataBackend.ts';

async function run() {
  const ctx = { workspaceId: 'ws1', storage: createMemoryStorage() };
  // Simulate backend response with backend field names (category, createdAt) and ISO timestamps
  const client = createApiClient('http://api', async () =>
    new Response(JSON.stringify({ value: [{
      id: 'u1',
      workspaceId: 'ws1',
      category: 'automation',
      moduleId: 'dashboard',
      targetType: 'system',
      credits: 3,
      providerKind: 'gemini',
      runtimeMode: 'single',
      createdAt: '2026-06-19T09:00:00.000Z',
    }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }));
  __setUsageApiClientForTest(client);

  // hydrate 前缓存空
  assert.deepEqual(listWorkspaceUsageEvents(ctx), []);
  // hydrate 后同步读返回 API 数据
  await hydrateWorkspaceUsageEvents(ctx);
  const rows = listWorkspaceUsageEvents(ctx);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'u1');
  // Verify field mapping: category→kind
  assert.equal(rows[0].kind, 'automation');
  // Verify ISO timestamp → ms conversion
  assert.equal(rows[0].createdAt, Date.parse('2026-06-19T09:00:00.000Z'));
  console.log('usage repository api migration passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
