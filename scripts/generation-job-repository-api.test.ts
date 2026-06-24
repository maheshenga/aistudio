import assert from 'node:assert/strict';
import { createApiClient } from '../src/lib/data/apiClient.ts';
import {
  createGenerationJob,
  hydrateGenerationJobs,
  listGenerationJobs,
  updateGenerationJob,
  __setGenerationJobApiClientForTest,
} from '../src/lib/data/generationJobRepository.ts';
import { createMemoryStorage } from '../src/lib/data/dataBackend.ts';

async function run() {
  const ctx = { workspaceId: 'ws1', storage: createMemoryStorage() };
  const client = createApiClient('http://api', async (url, init) => {
    const method = init?.method ?? 'GET';
    const path = String(url);
    if (method === 'GET' && path.endsWith('/generation-jobs')) {
      return new Response(JSON.stringify({ value: [{
        id: 'j1',
        workspaceId: 'ws1',
        title: 'Gen Job',
        prompt: 'generate something',
        status: 'succeeded',
        providerKind: 'mock',
        runtimeMode: 'single',
        moduleId: 'content',
        externalTaskId: 'ext-123',
        progress: 100,
        createdAt: '2026-06-19T08:00:00.000Z',
        updatedAt: '2026-06-19T08:05:00.000Z',
        finishedAt: '2026-06-19T08:04:00.000Z',
      }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (method === 'POST' && path.endsWith('/generation-jobs')) {
      const body = JSON.parse(String(init?.body ?? '{}'));
      return new Response(JSON.stringify({ value: {
        id: 'server-job-1',
        workspaceId: 'ws1',
        title: body.title,
        prompt: body.prompt,
        status: body.status ?? 'pending',
        providerKind: body.providerKind,
        runtimeMode: body.runtimeMode,
        moduleId: body.moduleId,
        progress: body.progress ?? 0,
        createdAt: '2026-06-19T08:00:00.000Z',
        updatedAt: '2026-06-19T08:00:00.000Z',
      } }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }
    if (method === 'PATCH' && path.includes('/generation-jobs/server-job-1/status')) {
      const body = JSON.parse(String(init?.body ?? '{}'));
      return new Response(JSON.stringify({ value: {
        id: 'server-job-1',
        workspaceId: 'ws1',
        title: 'Created Job',
        prompt: 'prompt',
        status: body.status,
        providerKind: 'mock',
        runtimeMode: 'web',
        progress: body.progress ?? 100,
        createdAt: '2026-06-19T08:00:00.000Z',
        updatedAt: '2026-06-19T08:06:00.000Z',
        finishedAt: '2026-06-19T08:06:00.000Z',
      } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: { code: 'not_found', message: 'missing' } }), { status: 404 });
  });
  __setGenerationJobApiClientForTest(client);

  assert.deepEqual(listGenerationJobs(ctx), []);
  await hydrateGenerationJobs(ctx);
  const rows = listGenerationJobs(ctx);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'j1');
  assert.equal(rows[0].runtimeTaskId, 'ext-123');
  assert.equal(rows[0].completedAt, Date.parse('2026-06-19T08:04:00.000Z'));

  const created = await createGenerationJob({
    title: 'Created Job',
    prompt: 'prompt',
    status: 'running',
    providerKind: 'mock',
    runtimeMode: 'web',
    moduleId: 'image',
    progress: 10,
  }, ctx);
  assert.equal(created.id, 'server-job-1', 'createGenerationJob should adopt server id from API response');

  const updated = await updateGenerationJob('server-job-1', { status: 'succeeded', progress: 100 }, ctx);
  assert.equal(updated?.status, 'succeeded');
  assert.equal(listGenerationJobs(ctx).find((job) => job.id === 'server-job-1')?.status, 'succeeded');

  console.log('generation job repository api migration passed');
}

run().catch((e) => { console.error(e); process.exit(1); });
