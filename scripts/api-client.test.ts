import assert from 'node:assert/strict';
import { createApiClient } from '../src/lib/data/apiClient.ts';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function run() {
  // 1. 2xx + {value} → ok:true
  {
    const client = createApiClient('http://api', async () => jsonResponse(200, { value: { id: 'p1' } }));
    const r = await client.get('ws1', 'projects');
    assert.equal(r.ok, true);
    assert.deepEqual((r as any).value, { id: 'p1' });
  }
  // 2. 404 → ok:true, value:null
  {
    const client = createApiClient('http://api', async () => jsonResponse(404, { error: { code: 'not_found', message: 'x' } }));
    const r = await client.get('ws1', 'projects/zzz');
    assert.equal(r.ok, true);
    assert.equal((r as any).value, null);
  }
  // 3. 4xx → ok:false 带 code
  {
    const client = createApiClient('http://api', async () => jsonResponse(400, { error: { code: 'validation_error', message: 'bad' } }));
    const r = await client.post('ws1', 'projects', { name: '' });
    assert.equal(r.ok, false);
    assert.equal((r as any).error.code, 'validation_error');
  }
  // 4. 网络异常 → network_error
  {
    const client = createApiClient('http://api', async () => { throw new Error('boom'); });
    const r = await client.get('ws1', 'projects');
    assert.equal(r.ok, false);
    assert.equal((r as any).error.code, 'network_error');
  }
  // 5. 未配 baseUrl → configured=false
  {
    const client = createApiClient(undefined, async () => jsonResponse(200, { value: 1 }));
    assert.equal(client.configured, false);
  }
  console.log('api client contract passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
