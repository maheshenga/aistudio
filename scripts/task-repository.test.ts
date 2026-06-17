import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setTaskApiClientForTest,
  hydrateWorkspaceTasks,
  loadWorkspaceTasks,
  createWorkspaceTask,
  deleteWorkspaceTasks,
} from '../src/lib/data/taskRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'tasks') return { ok: true, value: { items: [
        { id: 'srv1', title: 'Server Task', column: 'todo', priority: 'Medium', type: 't', date: '', isAuto: false, externalRef: '{"jobId":"j1"}' },
        { id: 'srv2', title: 'Server Task 2', column: 'done', priority: 'Low', type: 't', date: '', isAuto: false },
      ], nextCursor: null } } as any;
      return { ok: true, value: null } as any;
    },
    post: async () => ({ ok: true, value: {} }) as any,
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
}

async function run() {
  const memA = new Map<string, string>();
  const storageA = { getItem: (k: string) => memA.get(k) ?? null, setItem: (k: string, v: string) => void memA.set(k, v), removeItem: (k: string) => void memA.delete(k) } as any;

  __setTaskApiClientForTest(fakeApi(true));
  await hydrateWorkspaceTasks({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceTasks({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 2);
  assert.equal(fromBackend[0].title, 'Server Task');
  assert.deepEqual(fromBackend[0].externalRef, { jobId: 'j1' });

  createWorkspaceTask({ title: 'New One', column: 'todo', priority: 'High', type: 't', date: '', isAuto: false }, { workspaceId: 'wsA', storage: storageA });
  let now = loadWorkspaceTasks({ workspaceId: 'wsA', storage: storageA });
  assert.equal(now.some((t) => t.title === 'New One'), true);

  deleteWorkspaceTasks(['srv1', 'srv2'], { workspaceId: 'wsA', storage: storageA });
  now = loadWorkspaceTasks({ workspaceId: 'wsA', storage: storageA });
  assert.equal(now.some((t) => t.id === 'srv1'), false);
  assert.equal(now.some((t) => t.id === 'srv2'), false);
  assert.equal(now.some((t) => t.title === 'New One'), true);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setTaskApiClientForTest(fakeApi(false));
  createWorkspaceTask({ title: 'Local One', column: 'todo', priority: 'Low', type: 't', date: '', isAuto: false }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceTasks({ workspaceId: 'wsB', storage });
  assert.equal(local.some((t) => t.title === 'Local One'), true);

  console.log('task repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
