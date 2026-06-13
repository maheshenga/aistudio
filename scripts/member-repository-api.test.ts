import assert from 'node:assert/strict';
import { createApiClient } from '../src/lib/data/apiClient.ts';
import { hydrateWorkspaceMembers, loadWorkspaceMembers, __setMemberApiClientForTest } from '../src/lib/data/workspaceMemberRepository.ts';
import { createMemoryStorage } from '../src/lib/data/dataBackend.ts';

async function run() {
  const ctx = { workspaceId: 'ws1', storage: createMemoryStorage() };
  const client = createApiClient('http://api', async () =>
    new Response(JSON.stringify({ value: [{ id: 'm1', userId: 'u1', workspaceId: 'ws1', name: 'Member', email: 'm@x.com', role: 'admin', department: 'Ops', status: 'active', joinedAt: 1, updatedAt: 1, metadata: {} }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }));
  __setMemberApiClientForTest(client);

  // hydrate 前缓存空
  assert.deepEqual(loadWorkspaceMembers(ctx), []);
  // hydrate 后同步读返回 API 数据
  await hydrateWorkspaceMembers(ctx);
  const rows = loadWorkspaceMembers(ctx);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'm1');
  console.log('member repository api migration passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
