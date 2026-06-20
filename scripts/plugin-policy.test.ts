import assert from 'node:assert/strict';
import {
  canExecutePlugin,
  isPluginReviewed,
  resolvePluginBilling,
  resolvePluginReviewState,
  getPluginReviewStateLabel,
  PLUGIN_ACTION_PERMISSION,
  PLUGIN_ACTION_AUDIT,
  PLUGIN_REVIEW_STATES,
} from '../src/saas/pluginPolicy.ts';
import type { WorkspacePlugin } from '../src/lib/data/pluginRepository.ts';

function plugin(overrides: Partial<WorkspacePlugin> = {}): WorkspacePlugin {
  return {
    id: 'plugin_1',
    workspaceId: 'ws1',
    name: 'Test Plugin',
    provider: 'Community',
    providerKind: 'community',
    status: 'active',
    enabled: true,
    category: 'Social',
    configSchema: [],
    installedAt: 1,
    updatedAt: 1,
    metadata: {},
    ...overrides,
  };
}

// 1. Community plugin without explicit review → internal (unreviewed) → cannot execute.
{
  const p = plugin();
  assert.equal(resolvePluginReviewState(p), 'internal');
  assert.equal(isPluginReviewed('internal'), false);
  const decision = canExecutePlugin(p, { hasPermission: true });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'not_reviewed');
}

// 2. Official enabled plugin is reviewed by provenance → executable with permission.
{
  const p = plugin({ providerKind: 'official', provider: 'Official' });
  assert.equal(resolvePluginReviewState(p), 'enabled');
  assert.equal(canExecutePlugin(p, { hasPermission: true }).allowed, true);
}

// 3. Explicit reviewState metadata wins.
{
  const p = plugin({ metadata: { reviewState: 'reviewed' } });
  assert.equal(resolvePluginReviewState(p), 'reviewed');
  assert.equal(canExecutePlugin(p, { hasPermission: true }).allowed, true);
}

// 4. No permission → permission_denied regardless of review state.
{
  const p = plugin({ providerKind: 'official' });
  const decision = canExecutePlugin(p, { hasPermission: false });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'permission_denied');
}

// 5. Reviewed but disabled → not_enabled.
{
  const p = plugin({ metadata: { reviewState: 'reviewed' }, enabled: false, status: 'disabled' });
  const decision = canExecutePlugin(p, { hasPermission: true });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'not_enabled');
}

// 6. Reviewed + enabled but needs_config → needs_config.
{
  const p = plugin({ metadata: { reviewState: 'enabled' }, status: 'needs_config' });
  const decision = canExecutePlugin(p, { hasPermission: true });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'needs_config');
}

// 7. Deprecated plugin → hidden review state.
{
  const p = plugin({ status: 'deprecated' });
  assert.equal(resolvePluginReviewState(p), 'hidden');
  assert.equal(canExecutePlugin(p, { hasPermission: true }).allowed, false);
}

// 8. Billing metadata: explicit credits → estimated; billable flag → review_required; none → unpriced.
{
  assert.deepEqual(resolvePluginBilling(plugin({ metadata: { estimatedCreditsPerRun: 7 } })), {
    estimatedCreditsPerRun: 7,
    billingStatus: 'estimated',
  });
  assert.equal(resolvePluginBilling(plugin({ metadata: { billable: true } })).billingStatus, 'review_required');
  assert.equal(resolvePluginBilling(plugin()).billingStatus, 'unpriced');
}

// 9. Every lifecycle action requires plugins.manage and maps to an audit action.
for (const action of ['install', 'enable', 'disable', 'configure', 'execute'] as const) {
  assert.equal(PLUGIN_ACTION_PERMISSION[action], 'plugins.manage');
  assert.ok(PLUGIN_ACTION_AUDIT[action].startsWith('plugin_'));
}

// 10. Review-state labels + state set.
assert.equal(PLUGIN_REVIEW_STATES.length, 5);
assert.equal(getPluginReviewStateLabel('reviewed'), '已审核');

console.log('✓ P3-E05: pluginPolicy gating (review states + permission + execution + billing)');
console.log('plugin policy contract passed');
