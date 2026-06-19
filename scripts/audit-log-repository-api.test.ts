import assert from 'node:assert/strict';
import { createApiClient } from '../src/lib/data/apiClient.ts';
import { hydrateAuditLogs, listAuditLogs, __setAuditApiClientForTest } from '../src/lib/data/auditLogRepository.ts';
import { createMemoryStorage } from '../src/lib/data/dataBackend.ts';

async function run() {
  const storage = createMemoryStorage();
  const ctx = { workspaceId: 'ws1', storage };
  // Simulate backend response with backend field names (userId, createdAt) and ISO timestamps
  const client = createApiClient('http://api', async () =>
    new Response(JSON.stringify({ value: [{
      id: 'l1',
      workspaceId: 'ws1',
      userId: 'u1',
      actorName: 'Alice',
      actorEmail: 'alice@example.com',
      actorRole: 'owner',
      action: 'asset_export',
      targetType: 'asset',
      targetId: 't1',
      moduleId: 'assets',
      createdAt: '2026-06-19T12:00:00.000Z',
    }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }));
  __setAuditApiClientForTest(client);

  // hydrate 前缓存空
  assert.deepEqual(listAuditLogs({ storage, workspaceId: 'ws1' }), []);
  // hydrate 后同步读返回 API 数据
  await hydrateAuditLogs(ctx);
  const rows = listAuditLogs({ storage, workspaceId: 'ws1' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'l1');
  // Verify field mapping: userId→actor.id
  assert.equal(rows[0].actor.id, 'u1');
  assert.equal(rows[0].actor.name, 'Alice');
  assert.equal(rows[0].actor.email, 'alice@example.com');
  // Verify ISO timestamp → ms conversion
  assert.equal(rows[0].timestamp, Date.parse('2026-06-19T12:00:00.000Z'));
  console.log('audit log repository api migration passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
