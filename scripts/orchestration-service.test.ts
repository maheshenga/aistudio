import assert from 'node:assert/strict';
import { createOrchestrationService } from '../src/runtime/orchestrationService.ts';
import type { ApiClient } from '../src/lib/data/apiClient.ts';

function fakeApi(): { client: ApiClient; calls: Array<{ method: string; path: string; body?: unknown }> } {
  const calls: Array<{ method: string; path: string; body?: unknown }> = [];
  const client: ApiClient = {
    configured: true,
    get: async () => ({ ok: true, value: null }),
    post: async (_ws, path, body) => {
      calls.push({ method: 'POST', path, body });
      if (path.endsWith('/dispatch')) return { ok: true, value: { job: { id: 'job-1', status: 'pending' } } } as any;
      return { ok: true, value: { job: { id: 'job-1' } } } as any;
    },
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  };
  return { client, calls };
}

async function run() {
  // dispatch:POST dispatch → POST link-external(task 由调用方创建并传入,service 不再重复 createTask)
  const { client, calls } = fakeApi();
  const providerCalls: string[] = [];
  const provider = {
    cancelTask: async (taskId: string) => { providerCalls.push(`cancelTask:${taskId}`); },
  };
  const svc = createOrchestrationService({ apiClient: client, workspaceId: 'ws1', getProvider: () => provider as any });

  const task = { id: 'multica-task-mt1', title: 'Make a cat', status: 'pending', source: 'multica',
    externalRef: { system: 'multica', taskId: 'mt1' }, createdAt: '', updatedAt: '' };
  const result = await svc.dispatchTask({ type: 'image', input: { prompt: 'cat' }, runtimeMode: 'desktop_multica', agentId: 'agent-1', providerKind: 'codex' }, task as any);
  assert.equal(result.jobId, 'job-1');
  assert.equal(result.externalTaskId, 'mt1');
  assert.deepEqual(calls.map((c) => c.path), ['orchestration/dispatch', 'orchestration/jobs/job-1/link-external']);
  assert.deepEqual(providerCalls, []);
  assert.equal((calls[0].body as any).runtimeMode, 'desktop_multica');
  assert.equal((calls[1].body as any).externalTaskId, 'mt1');

  // externalRef 仅有 issueId 时回退到 issueId
  {
    const { client: ci, calls: callsI } = fakeApi();
    const svcI = createOrchestrationService({ apiClient: ci, workspaceId: 'ws1', getProvider: () => provider as any });
    const resI = await svcI.dispatchTask({ type: 'image', input: {}, runtimeMode: 'desktop_multica' }, { externalRef: { system: 'multica', issueId: 'iss9' } } as any);
    assert.equal(resI.externalTaskId, 'iss9');
    assert.equal((callsI[1].body as any).externalTaskId, 'iss9');
  }

  // cancel:先 provider.cancelTask 再 POST cancel
  const { client: c2, calls: calls2 } = fakeApi();
  const provider2 = { cancelTask: async (id: string) => { providerCalls.push(`cancelTask:${id}`); } };
  const svc2 = createOrchestrationService({ apiClient: c2, workspaceId: 'ws1', getProvider: () => provider2 as any });
  await svc2.cancelTask('job-9', 'multica-task-mt9');
  assert.ok(providerCalls.includes('cancelTask:multica-task-mt9'));
  assert.deepEqual(calls2.map((c) => c.path), ['orchestration/jobs/job-9/cancel']);

  // retry:仅 POST retry
  const { client: c3, calls: calls3 } = fakeApi();
  const svc3 = createOrchestrationService({ apiClient: c3, workspaceId: 'ws1', getProvider: () => provider2 as any });
  await svc3.retryTask('job-7');
  assert.deepEqual(calls3.map((c) => c.path), ['orchestration/jobs/job-7/retry']);

  console.log('orchestration service passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
