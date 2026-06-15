import assert from 'node:assert/strict';

import { readRuntimeAuditEvents } from '../src/runtime/runtimeAudit.ts';
import { createWebMockAgentRuntimeProvider } from '../src/runtime/webMockAgentRuntimeProvider.ts';

const storage = new Map<string, string>();
(globalThis as typeof globalThis & { localStorage: Storage }).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
  key: (index: number) => [...storage.keys()][index] ?? null,
  get length() {
    return storage.size;
  },
} as Storage;

const provider = createWebMockAgentRuntimeProvider();

function waitForTaskStatus(
  taskId: string,
  expectedStatus: 'running' | 'succeeded' | 'failed' | 'cancelled',
): Promise<{ status: string; progress?: number; message?: string }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Timed out waiting for ${expectedStatus}`));
    }, 500);

    const unsubscribe = provider.subscribeToTask(taskId, (event) => {
      if (event.status !== expectedStatus) return;
      clearTimeout(timeout);
      unsubscribe();
      resolve(event);
    });
  });
}

const status = await provider.getRuntimeStatus();
assert.equal(status.mode, 'web');
assert.equal(status.providerKind, 'mock');
assert.equal(status.health, 'available');
assert.equal(status.bridgeAvailable, false);

const agents = await provider.listAgents();
assert.equal(agents.length >= 2, true);
assert.equal(agents[0]?.source, 'mock');

let eventCount = 0;
const unsubscribeRuntime = provider.subscribeToRuntime(() => {
  eventCount += 1;
});

const task = await provider.createTask({
  title: 'Mock dispatch',
  description: 'Verify Web mode can create a task without Multica.',
  agentId: agents[0]?.id,
  priority: 'medium',
});

assert.equal(task.status, 'pending');
assert.equal(task.source, 'mock');
assert.equal(readRuntimeAuditEvents()[0]?.action, 'agent_task_dispatched');

const runningEvent = await waitForTaskStatus(task.id, 'running');
assert.equal(runningEvent.progress, 50);

const succeededEvent = await waitForTaskStatus(task.id, 'succeeded');
assert.equal(succeededEvent.progress, 100);
const succeededTasks = await provider.listTasks({ status: 'succeeded' });
assert.equal(succeededTasks.some((item) => item.id === task.id), true);

const cancellableTask = await provider.createTask({
  title: 'Mock cancellation',
  description: 'Verify Web mode can cancel before completion.',
  agentId: agents[0]?.id,
  priority: 'medium',
});
await provider.cancelTask(cancellableTask.id);
const cancelled = await provider.listTasks({ status: 'cancelled' });
assert.equal(cancelled.some((item) => item.id === cancellableTask.id), true);
assert.equal(readRuntimeAuditEvents()[0]?.action, 'agent_task_cancel_requested');

unsubscribeRuntime();
assert.equal(eventCount >= 1, true);

console.log('web runtime provider passed');
