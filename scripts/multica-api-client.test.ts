import assert from 'node:assert/strict';

import { createMulticaApiClient } from '../src/runtime/multicaApiClient.ts';

const calls: Array<{ url: string; init?: RequestInit }> = [];

const fakeFetch: typeof fetch = async (url, init) => {
  calls.push({ url: String(url), init });
  const path = String(url);
  if (path.endsWith('/api/agents?workspace_id=workspace_aistudio_001')) {
    return Response.json([{ id: 'agent_001', name: 'Codex', runtime_id: 'runtime_001', runtime_mode: 'local', status: 'idle' }]);
  }
  if (path.endsWith('/api/runtimes?workspace_id=workspace_aistudio_001&owner=me')) {
    return Response.json([{ id: 'runtime_001', provider: 'codex', status: 'online' }]);
  }
  if (path.endsWith('/api/issues')) {
    return Response.json({ id: 'issue_001', identifier: 'AIS-1', title: 'Dispatch', assignee_type: 'agent', assignee_id: 'agent_001' });
  }
  if (path.endsWith('/api/tasks/task_001/cancel')) {
    return new Response(null, { status: 204 });
  }
  return new Response(JSON.stringify({ error: 'not found' }), { status: 404, statusText: 'Not Found' });
};

const client = createMulticaApiClient({
  apiUrl: 'http://127.0.0.1:3000',
  token: 'token_001',
  fetchImpl: fakeFetch,
});

const agents = await client.listAgents('workspace_aistudio_001');
assert.equal((agents[0] as { id?: string } | undefined)?.id, 'agent_001');

const runtimes = await client.listRuntimes('workspace_aistudio_001', 'me');
assert.equal((runtimes[0] as { provider?: string } | undefined)?.provider, 'codex');

const issue = await client.createIssue({
  title: 'Dispatch',
  description: 'Dispatch through Multica.',
  assignee_type: 'agent',
  assignee_id: 'agent_001',
});
assert.equal(issue.id, 'issue_001');

await client.cancelTask('task_001');

assert.equal(calls[0]?.init?.headers && (calls[0].init.headers as Record<string, string>).Authorization, 'Bearer token_001');
assert.equal(calls[2]?.init?.method, 'POST');
assert.equal(calls[3]?.init?.method, 'POST');

console.log('multica api client passed');
