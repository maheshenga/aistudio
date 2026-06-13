import assert from 'node:assert/strict';

import { RuntimeCapabilityError } from '../src/runtime/agentRuntimeTypes.ts';
import {
  multicaAgentFixture,
  multicaDaemonStatusFixtures,
  multicaIssueFixture,
  multicaRuntimeFixture,
  multicaTaskFixture,
} from '../src/runtime/multicaContractFixtures.ts';

assert.equal(multicaDaemonStatusFixtures.running.state, 'running');
assert.equal(multicaDaemonStatusFixtures.authExpired.state, 'auth_expired');
assert.equal(multicaRuntimeFixture.provider, 'codex');
assert.equal(multicaAgentFixture.runtime_id, multicaRuntimeFixture.id);
assert.equal(multicaIssueFixture.assignee_type, 'agent');
assert.equal(multicaTaskFixture.status, 'running');

const error = new RuntimeCapabilityError(
  'TASK_DISPATCH_UNAVAILABLE',
  'Task dispatch is disabled for this runtime.',
);
assert.equal(error.code, 'TASK_DISPATCH_UNAVAILABLE');
assert.equal(error.name, 'RuntimeCapabilityError');

console.log('runtime contract fixtures passed');
