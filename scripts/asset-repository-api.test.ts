import assert from 'node:assert/strict';
import { createApiClient } from '../src/lib/data/apiClient.ts';
import { hydrateWorkspaceAssets, loadWorkspaceAssets, __setAssetApiClientForTest } from '../src/lib/data/assetRepository.ts';
import { createMemoryStorage } from '../src/lib/data/dataBackend.ts';

async function run() {
  const ctx = { workspaceId: 'ws1', storage: createMemoryStorage() };
  const client = createApiClient('http://api', async () =>
    new Response(JSON.stringify({ value: [{ id: 'a1', workspaceId: 'ws1', name: 'Asset', type: 'image', size: '1 KB', source: 'uploaded', tags: [], createdAt: 1, updatedAt: 1, metadata: {} }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }));
  __setAssetApiClientForTest(client);

  // hydrate 前缓存空
  assert.deepEqual(loadWorkspaceAssets(ctx), []);
  // hydrate 后同步读返回 API 数据
  await hydrateWorkspaceAssets(ctx);
  const rows = loadWorkspaceAssets(ctx);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'a1');
  console.log('asset repository api migration passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
