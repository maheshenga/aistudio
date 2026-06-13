import assert from 'node:assert/strict';
import { createApiClient } from '../src/lib/data/apiClient.ts';
import { hydrateWorkspaceUsageEvents, listWorkspaceUsageEvents, __setUsageApiClientForTest } from '../src/lib/data/usageRepository.ts';
import { createMemoryStorage } from '../src/lib/data/dataBackend.ts';

async function run() {
  const ctx = { workspaceId: 'ws1', storage: createMemoryStorage() };
  const client = createApiClient('http://api', async () =>
    new Response(JSON.stringify({ value: [{ id: 'u1', workspaceId: 'ws1', moduleId: 'dashboard', kind: 'automation', targetType: 'system', credits: 3, metadata: {}, createdAt: 5 }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }));
  __setUsageApiClientForTest(client);

  // hydrate 前缓存空
  assert.deepEqual(listWorkspaceUsageEvents(ctx), []);
  // hydrate 后同步读返回 API 数据
  await hydrateWorkspaceUsageEvents(ctx);
  const rows = listWorkspaceUsageEvents(ctx);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'u1');
  console.log('usage repository api migration passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
