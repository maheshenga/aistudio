import assert from 'node:assert/strict';
import { createApiClient } from '../src/lib/data/apiClient.ts';
import { hydrateGenerationJobs, listGenerationJobs, __setGenerationJobApiClientForTest } from '../src/lib/data/generationJobRepository.ts';
import { createMemoryStorage } from '../src/lib/data/dataBackend.ts';

async function run() {
  const ctx = { workspaceId: 'ws1', storage: createMemoryStorage() };
  const client = createApiClient('http://api', async () =>
    new Response(JSON.stringify({ value: [{ id: 'j1', workspaceId: 'ws1', title: 'Job', prompt: 'p', status: 'queued', providerKind: 'web_mock', runtimeMode: 'web', progress: 0, metadata: {}, createdAt: 1, updatedAt: 1 }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }));
  __setGenerationJobApiClientForTest(client);

  // hydrate 前缓存空
  assert.deepEqual(listGenerationJobs(ctx), []);
  // hydrate 后同步读返回 API 数据
  await hydrateGenerationJobs(ctx);
  const rows = listGenerationJobs(ctx);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'j1');
  console.log('generation job repository api migration passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
