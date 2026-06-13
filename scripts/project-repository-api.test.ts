import assert from 'node:assert/strict';
import { createApiClient } from '../src/lib/data/apiClient.ts';
import { hydrateWorkspaceProjects, loadWorkspaceProjects, __setProjectApiClientForTest } from '../src/lib/data/projectRepository.ts';
import { createMemoryStorage } from '../src/lib/data/dataBackend.ts';

async function run() {
  const ctx = { workspaceId: 'ws1', storage: createMemoryStorage() };
  const client = createApiClient('http://api', async () =>
    new Response(JSON.stringify({ value: [{ id: 'p1', workspaceId: 'ws1', name: 'P', type: 'general', status: 'active', linkedAssetIds: [], favorite: false, createdAt: 1, updatedAt: 1, metadata: {} }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }));
  __setProjectApiClientForTest(client);

  // hydrate 前缓存空
  assert.deepEqual(loadWorkspaceProjects(ctx), []);
  // hydrate 后同步读返回 API 数据
  await hydrateWorkspaceProjects(ctx);
  const rows = loadWorkspaceProjects(ctx);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'p1');
  console.log('project repository api migration passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
