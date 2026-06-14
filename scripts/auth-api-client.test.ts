import assert from 'node:assert/strict';
import { createApiClient } from '../src/lib/data/apiClient.ts';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function run() {
  // 1. 注入 access token 到 Authorization 头
  {
    let seenAuth: string | null = null;
    const client = createApiClient('http://api', async (_url, init) => {
      seenAuth = (init?.headers as Record<string, string>)?.['Authorization'] ?? null;
      return json(200, { value: { ok: true } });
    }, { getAccess: () => 'acc1', onRefresh: async () => null, onAuthFailure: () => {} });
    await client.get('ws1', 'projects');
    assert.equal(seenAuth, 'Bearer acc1');
  }
  // 2. 401 → 触发 refresh → 用新 token 重试成功
  {
    let calls = 0; let refreshed = false;
    const client = createApiClient('http://api', async (_url, init) => {
      calls += 1;
      const auth = (init?.headers as Record<string, string>)?.['Authorization'];
      if (auth === 'Bearer old') return json(401, { error: { code: 'unauthenticated', message: 'x' } });
      return json(200, { value: { ok: true } });
    }, {
      getAccess: () => (refreshed ? 'new' : 'old'),
      onRefresh: async () => { refreshed = true; return 'new'; },
      onAuthFailure: () => {},
    });
    const r = await client.get('ws1', 'projects');
    assert.equal(r.ok, true);
    assert.equal(calls, 2);
  }
  // 3. refresh 失败 → onAuthFailure 调用 + 返回 unauthenticated
  {
    let failed = false;
    const client = createApiClient('http://api', async () => json(401, { error: { code: 'unauthenticated', message: 'x' } }),
      { getAccess: () => 'old', onRefresh: async () => null, onAuthFailure: () => { failed = true; } });
    const r = await client.get('ws1', 'projects');
    assert.equal(r.ok, false);
    assert.equal((r as any).error.code, 'unauthenticated');
    assert.equal(failed, true);
  }
  console.log('auth api client passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
