import assert from 'node:assert/strict';
import {
  assessWorkspaceRisk,
  getRiskCategoryLabel,
  getRiskLevelLabel,
  type AssessWorkspaceRiskInput,
} from '../src/saas/riskPolicy.ts';
import type { AuditLog } from '../src/saas/types.ts';

const NOW = 1_700_000_000_000;

function auditLog(action: AuditLog['action'], offsetMs: number, id: string): AuditLog {
  return {
    id,
    workspaceId: 'ws1',
    actor: { id: 'u1', name: 'U', role: 'admin' },
    action,
    moduleId: 'admin',
    targetType: 'workspace',
    metadata: {},
    timestamp: NOW - offsetMs,
  };
}

function baseInput(overrides: Partial<AssessWorkspaceRiskInput> = {}): AssessWorkspaceRiskInput {
  return {
    quota: { remainingPercent: 80, remainingCredits: 800, consumedCredits: 200, monthlyAllowance: 1000 },
    providers: [
      { id: 'p1', name: 'Primary', status: 'healthy', enabled: true, isDefault: true },
    ],
    permission: { adminCount: 1, memberCount: 5, inactivePrivilegedCount: 0 },
    apiKeys: [
      { id: 'k1', name: 'Key', status: 'active', scopes: ['generation.read'], expiresAt: NOW + 90 * 24 * 60 * 60 * 1000 },
    ],
    runtime: { mode: 'web', health: 'available', label: 'Web' },
    auditLogs: [],
    now: NOW,
    ...overrides,
  };
}

// 1. Clean workspace → no signals.
{
  const result = assessWorkspaceRisk(baseInput());
  assert.equal(result.signals.length, 0, 'clean workspace should produce no risk signals');
  assert.equal(result.highestLevel, null);
  assert.deepEqual(result.levelCounts, { critical: 0, high: 0, medium: 0, low: 0 });
}

// 2. Quota near-exhaustion → critical signal linked to billing module.
{
  const result = assessWorkspaceRisk(baseInput({
    quota: { remainingPercent: 4, remainingCredits: 40, consumedCredits: 960, monthlyAllowance: 1000 },
  }));
  const quota = result.signals.find((s) => s.category === 'quota');
  assert.ok(quota, 'low quota should emit a quota signal');
  assert.equal(quota?.level, 'critical');
  assert.equal(quota?.source.moduleId, 'billing');
}

// 3. Quota with zero allowance is not penalized (unmetered/dev).
{
  const result = assessWorkspaceRisk(baseInput({
    quota: { remainingPercent: 0, remainingCredits: 0, consumedCredits: 0, monthlyAllowance: 0 },
  }));
  assert.equal(result.signals.find((s) => s.category === 'quota'), undefined, 'zero allowance should not be a quota risk');
}

// 4. Default provider offline with no healthy fallback → critical, links to providers tab.
{
  const result = assessWorkspaceRisk(baseInput({
    providers: [{ id: 'p1', name: 'Primary', status: 'offline', enabled: true, isDefault: true }],
  }));
  const provider = result.signals.find((s) => s.category === 'provider');
  assert.equal(provider?.level, 'critical');
  assert.equal(provider?.source.adminTab, 'providers');
  assert.equal(provider?.source.recordId, 'p1');
}

// 5. No provider enabled → high.
{
  const result = assessWorkspaceRisk(baseInput({
    providers: [{ id: 'p1', name: 'Primary', status: 'healthy', enabled: false, isDefault: true }],
  }));
  const provider = result.signals.find((s) => s.category === 'provider');
  assert.equal(provider?.id, 'provider_none_enabled');
  assert.equal(provider?.level, 'high');
}

// 6. Inactive privileged member retains access → high permission signal.
{
  const result = assessWorkspaceRisk(baseInput({
    permission: { adminCount: 2, memberCount: 5, inactivePrivilegedCount: 1 },
  }));
  const permission = result.signals.find((s) => s.category === 'permission');
  assert.equal(permission?.level, 'high');
  assert.equal(permission?.source.adminTab, 'members');
}

// 7. Expired-but-not-revoked API key → high, links to saas_api_keys.
{
  const result = assessWorkspaceRisk(baseInput({
    apiKeys: [{ id: 'k1', name: 'Old', status: 'active', scopes: ['generation.read'], expiresAt: NOW - 1000 }],
  }));
  const apiKey = result.signals.find((s) => s.category === 'api_key');
  assert.equal(apiKey?.level, 'high');
  assert.equal(apiKey?.source.moduleId, 'saas_api_keys');
  assert.equal(apiKey?.source.recordId, 'k1');
}

// 8. Broad-scope key without expiry → medium.
{
  const result = assessWorkspaceRisk(baseInput({
    apiKeys: [{ id: 'k2', name: 'Admin', status: 'active', scopes: ['webhooks.manage'], expiresAt: null }],
  }));
  const apiKey = result.signals.find((s) => s.category === 'api_key');
  assert.equal(apiKey?.level, 'medium');
}

// 9. Runtime degraded → medium; offline → high; available → none.
{
  const degraded = assessWorkspaceRisk(baseInput({ runtime: { mode: 'self_hosted_multica', health: 'degraded', label: 'Self-hosted' } }));
  assert.equal(degraded.signals.find((s) => s.category === 'runtime')?.level, 'medium');
  const offline = assessWorkspaceRisk(baseInput({ runtime: { mode: 'self_hosted_multica', health: 'offline', label: 'Self-hosted' } }));
  assert.equal(offline.signals.find((s) => s.category === 'runtime')?.level, 'high');
  const ok = assessWorkspaceRisk(baseInput({ runtime: { mode: 'web', health: 'available', label: 'Web' } }));
  assert.equal(ok.signals.find((s) => s.category === 'runtime'), undefined);
}

// 10. Audit anomaly: >=3 permission denials in 24h → signal linking to latest log id.
{
  const logs: AuditLog[] = [
    auditLog('permission_denied', 1000, 'a1'),
    auditLog('permission_denied', 2000, 'a2'),
    auditLog('permission_denied', 3000, 'a3'),
    auditLog('permission_denied', 40 * 60 * 60 * 1000, 'old'), // outside 24h window
  ];
  const result = assessWorkspaceRisk(baseInput({ auditLogs: logs }));
  const audit = result.signals.find((s) => s.category === 'audit');
  assert.ok(audit, 'audit anomaly should be detected');
  assert.equal(audit?.signalCount, 3, 'only in-window denials should count');
  assert.equal(audit?.source.recordId, 'a1', 'should link to the most recent anomaly');
}

// 11. Ordering: critical signals come before lower levels; highestLevel reflects the top.
{
  const result = assessWorkspaceRisk(baseInput({
    quota: { remainingPercent: 3, remainingCredits: 30, consumedCredits: 970, monthlyAllowance: 1000 }, // critical
    runtime: { mode: 'self_hosted_multica', health: 'degraded', label: 'Self-hosted' }, // medium
  }));
  assert.equal(result.highestLevel, 'critical');
  assert.equal(result.signals[0].level, 'critical');
  assert.ok(result.signals.length >= 2);
}

// 12. Label helpers.
assert.equal(getRiskLevelLabel('critical'), '严重');
assert.equal(getRiskCategoryLabel('api_key'), 'API 密钥');

console.log('✓ P3-E04: riskPolicy aggregation (quota/provider/permission/api_key/runtime/audit + ordering + deep-link sources)');
console.log('risk policy contract passed');
