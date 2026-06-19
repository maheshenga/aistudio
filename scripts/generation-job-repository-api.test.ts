import assert from 'node:assert/strict';
import { createApiClient } from '../src/lib/data/apiClient.ts';
import { hydrateGenerationJobs, listGenerationJobs, __setGenerationJobApiClientForTest } from '../src/lib/data/generationJobRepository.ts';
import { createMemoryStorage } from '../src/lib/data/dataBackend.ts';

async function run() {
  const ctx = { workspaceId: 'ws1', storage: createMemoryStorage() };
  // Simulate backend response with backend field names (externalTaskId, finishedAt) and ISO timestamps
  const client = createApiClient('http://api', async () =>
    new Response(JSON.stringify({ value: [{
      id: 'j1',
      workspaceId: 'ws1',
      title: 'Gen Job',
      prompt: 'generate something',
      status: 'succeeded',
      providerKind: 'gemini',
      runtimeMode: 'single',
      moduleId: 'content',
      externalTaskId: 'ext-123',
      progress: 100,
      createdAt: '2026-06-19T08:00:00.000Z',
      updatedAt: '2026-06-19T08:05:00.000Z',
      finishedAt: '2026-06-19T08:04:00.000Z',
    }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }));
  __setGenerationJobApiClientForTest(client);

  // hydrate 前缓存空
  assert.deepEqual(listGenerationJobs(ctx), []);
  // hydrate 后同步读返回 API 数据
  await hydrateGenerationJobs(ctx);
  const rows = listGenerationJobs(ctx);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'j1');
  // Verify field mapping: externalTaskId→runtimeTaskId
  assert.equal(rows[0].runtimeTaskId, 'ext-123');
  // Verify finishedAt→completedAt mapping
  assert.equal(rows[0].completedAt, Date.parse('2026-06-19T08:04:00.000Z'));
  // Verify ISO timestamp → ms conversion
  assert.equal(rows[0].createdAt, Date.parse('2026-06-19T08:00:00.000Z'));
  assert.equal(rows[0].updatedAt, Date.parse('2026-06-19T08:05:00.000Z'));
  assert.equal(rows[0].title, 'Gen Job');
  assert.equal(rows[0].prompt, 'generate something');
  assert.equal(rows[0].moduleId, 'content');
  console.log('generation job repository api migration passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
