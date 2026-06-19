import assert from 'node:assert/strict';
import { createApiClient } from '../src/lib/data/apiClient.ts';
import { hydrateWorkspaceAssets, loadWorkspaceAssets, __setAssetApiClientForTest } from '../src/lib/data/assetRepository.ts';
import { createMemoryStorage } from '../src/lib/data/dataBackend.ts';

async function run() {
  const ctx = { workspaceId: 'ws1', storage: createMemoryStorage() };
  // Simulate backend response with backend field names (kind, jobId) and ISO timestamps
  const client = createApiClient('http://api', async () =>
    new Response(JSON.stringify({ value: [{
      id: 'a1',
      workspaceId: 'ws1',
      kind: 'image',
      jobId: 'job42',
      name: 'Asset',
      size: '1 KB',
      source: 'uploaded',
      tags: [],
      createdAt: '2026-06-19T10:00:00.000Z',
      updatedAt: '2026-06-19T10:05:00.000Z',
      lastAccessedAt: '2026-06-19T10:10:00.000Z',
    }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }));
  __setAssetApiClientForTest(client);

  // hydrate 前缓存空
  assert.deepEqual(loadWorkspaceAssets(ctx), []);
  // hydrate 后同步读返回 API 数据
  await hydrateWorkspaceAssets(ctx);
  const rows = loadWorkspaceAssets(ctx);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'a1');
  // Verify field mapping: kind→type, jobId→generationJobId
  assert.equal(rows[0].type, 'image');
  assert.equal(rows[0].generationJobId, 'job42');
  // Verify ISO timestamp → ms conversion
  assert.equal(rows[0].createdAt, Date.parse('2026-06-19T10:00:00.000Z'));
  assert.equal(rows[0].updatedAt, Date.parse('2026-06-19T10:05:00.000Z'));
  assert.equal(rows[0].lastAccessedAt, Date.parse('2026-06-19T10:10:00.000Z'));
  console.log('asset repository api migration passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
