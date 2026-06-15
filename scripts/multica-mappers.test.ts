import assert from 'node:assert/strict';

import {
  multicaAgentFixture,
  multicaDaemonStatusFixtures,
  multicaIssueFixture,
  multicaRuntimeFixture,
  multicaTaskFixture,
} from '../src/runtime/multicaContractFixtures.ts';
import {
  mapDaemonStatusToRuntimeStatus,
  mapMulticaAgentToAgentSummary,
  mapMulticaIssueToAgentTask,
  mapMulticaTaskStatus,
  mapMulticaTaskToAgentTask,
} from '../src/runtime/multicaMappers.ts';

const running = mapDaemonStatusToRuntimeStatus(multicaDaemonStatusFixtures.running);
assert.equal(running.health, 'available');
assert.equal(running.mode, 'desktop_multica');
assert.deepEqual(running.cliProviders, ['codex', 'claude', 'gemini']);

const expired = mapDaemonStatusToRuntimeStatus(multicaDaemonStatusFixtures.authExpired);
assert.equal(expired.health, 'auth_expired');
assert.equal(expired.daemonState, 'auth_expired');

const agent = mapMulticaAgentToAgentSummary(multicaAgentFixture);
assert.equal(agent.runtimeMode, 'local');
assert.equal(agent.provider, 'codex');

const issueTask = mapMulticaIssueToAgentTask(multicaIssueFixture);
assert.equal(issueTask.externalRef?.issueId, 'issue_001');
assert.equal(issueTask.status, 'pending');

assert.equal(mapMulticaTaskStatus('queued'), 'pending');
assert.equal(mapMulticaTaskStatus('dispatched'), 'pending');
assert.equal(mapMulticaTaskStatus('waiting_local_directory'), 'pending');
assert.equal(mapMulticaTaskStatus('running'), 'running');
assert.equal(mapMulticaTaskStatus('completed'), 'succeeded');
assert.equal(mapMulticaTaskStatus('failed'), 'failed');
assert.equal(mapMulticaTaskStatus('cancelled'), 'cancelled');

const runtimeTask = mapMulticaTaskToAgentTask(multicaTaskFixture, multicaIssueFixture);
assert.equal(runtimeTask.status, 'running');
assert.equal(runtimeTask.externalRef?.taskId, 'task_001');
assert.equal(runtimeTask.runtimeId, multicaRuntimeFixture.id);

console.log('multica mappers passed');
