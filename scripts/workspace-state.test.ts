import assert from 'node:assert/strict';

import {
  areModuleIdListsEqual,
  keepModuleIdListIfEqual,
} from '../src/product/moduleListState.ts';

const current = ['dashboard', 'tasks'] as const;
const same = ['dashboard', 'tasks'] as const;
const reordered = ['tasks', 'dashboard'] as const;

assert.equal(areModuleIdListsEqual(current, same), true);
assert.equal(areModuleIdListsEqual(current, reordered), false);
assert.equal(keepModuleIdListIfEqual(current, same), current, 'equal module lists should keep the current reference');
assert.equal(keepModuleIdListIfEqual(current, reordered), reordered, 'changed module lists should use the next value');

console.log('workspace state contract passed');
