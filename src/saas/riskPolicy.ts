/**
 * Operational risk aggregation policy (P3-E04).
 *
 * Pure, side-effect-free contract that turns already-loaded operational records
 * (billing/quota, provider health, permission posture, API keys, runtime status,
 * and audit logs) into a classified, deduplicated list of risk signals. The Risk
 * Center reads these signals; it never mutates source records here. Remediation is
 * a separately-permissioned, separately-audited concern and is intentionally out of
 * scope for this module — `assessWorkspaceRisk` only *describes* risk.
 */

import type { AuditLog } from './types';
import type { ModuleId } from '../types';

export type RiskSignalCategory =
  | 'quota'
  | 'provider'
  | 'permission'
  | 'api_key'
  | 'runtime'
  | 'audit';

export type RiskSignalLevel = 'low' | 'medium' | 'high' | 'critical';

/** Where a risk item came from, so the UI can deep-link to the source record. */
export interface RiskSignalSource {
  /** module/workspace/api_key/provider_config/runtime/audit_event — matches audit targetType vocabulary where applicable. */
  type: 'module' | 'workspace' | 'api_key' | 'provider_config' | 'runtime' | 'audit_event';
  /** Module tab to navigate to (when the source is a workspace module/admin tab). */
  moduleId?: ModuleId;
  /** Admin sub-tab to focus (providers/risk/members/logs/...). */
  adminTab?: string;
  /** Identifier of the underlying record (provider id, api key id, audit log id). */
  recordId?: string;
}

export interface RiskSignal {
  id: string;
  category: RiskSignalCategory;
  level: RiskSignalLevel;
  title: string;
  detail: string;
  recommendation: string;
  /** Number of underlying records this signal aggregates (>=1). */
  signalCount: number;
  source: RiskSignalSource;
}

export interface RiskQuotaSignalInput {
  remainingPercent: number;
  remainingCredits: number;
  consumedCredits: number;
  monthlyAllowance: number;
}

export interface RiskProviderSignalInput {
  id: string;
  name: string;
  status: 'healthy' | 'rate_limited' | 'sleeping' | 'offline';
  enabled: boolean;
  isDefault: boolean;
}

export interface RiskPermissionSignalInput {
  /** Count of members whose role grants full workspace administration (owner/admin). */
  adminCount: number;
  /** Count of active members in the workspace. */
  memberCount: number;
  /** Count of members in a non-active state (suspended/invited/etc.) still holding access. */
  inactivePrivilegedCount: number;
}

export interface RiskApiKeySignalInput {
  id: string;
  name: string;
  status: 'active' | 'rotating' | 'revoked' | 'expired';
  scopes: string[];
  expiresAt: number | null;
}

export interface RiskRuntimeSignalInput {
  mode: string;
  health: 'available' | 'degraded' | 'offline' | 'auth_expired' | 'incompatible';
  label: string;
}

export interface AssessWorkspaceRiskInput {
  quota: RiskQuotaSignalInput;
  providers: RiskProviderSignalInput[];
  permission: RiskPermissionSignalInput;
  apiKeys: RiskApiKeySignalInput[];
  runtime: RiskRuntimeSignalInput | null;
  auditLogs: AuditLog[];
  /** Evaluation clock; defaults to Date.now() in callers that omit it. */
  now: number;
}

export interface WorkspaceRiskAssessment {
  signals: RiskSignal[];
  levelCounts: Record<RiskSignalLevel, number>;
  highestLevel: RiskSignalLevel | null;
  generatedAt: number;
}

/** Admin scopes considered "broad" — granting these without expiry is a standing risk. */
const BROAD_API_SCOPES = new Set(['webhooks.manage']);
const ADMIN_WRITE_SCOPES = new Set(['generation.write', 'assets.write', 'tasks.write', 'webhooks.manage']);

/** Window for counting audit anomalies (permission denials / failures). */
const AUDIT_ANOMALY_WINDOW_MS = 24 * 60 * 60 * 1000;
const API_KEY_EXPIRY_SOON_MS = 7 * 24 * 60 * 60 * 1000;

const LEVEL_RANK: Record<RiskSignalLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function quotaSignal(input: RiskQuotaSignalInput): RiskSignal | null {
  if (input.monthlyAllowance <= 0) return null;
  const percent = Math.max(0, Math.min(100, Math.round(input.remainingPercent)));
  if (percent > 25) return null;

  const level: RiskSignalLevel = percent <= 5 ? 'critical' : percent <= 15 ? 'high' : 'medium';
  return {
    id: 'quota_remaining',
    category: 'quota',
    level,
    title: `配额余量偏低（剩余 ${percent}%）`,
    detail: `已消耗 ${input.consumedCredits.toLocaleString()} / ${input.monthlyAllowance.toLocaleString()} credits，剩余 ${input.remainingCredits.toLocaleString()}。`,
    recommendation: level === 'critical'
      ? '立即在计费中心充值或提升套餐，否则计费型生成将被拦截。'
      : '关注本周期消耗速度，必要时提前充值或调整套餐。',
    signalCount: 1,
    source: { type: 'module', moduleId: 'billing' },
  };
}

function providerSignal(providers: RiskProviderSignalInput[]): RiskSignal | null {
  const enabled = providers.filter((provider) => provider.enabled);
  if (enabled.length === 0) {
    return {
      id: 'provider_none_enabled',
      category: 'provider',
      level: 'high',
      title: '没有启用任何 AI 服务商',
      detail: '当前工作区未启用可用的 AI 服务商，生成请求将无法路由。',
      recommendation: '前往服务商管理启用至少一个健康服务商。',
      signalCount: 1,
      source: { type: 'module', moduleId: 'admin', adminTab: 'providers' },
    };
  }

  const failing = enabled.filter((provider) => provider.status === 'offline' || provider.status === 'rate_limited');
  if (failing.length === 0) return null;

  const defaultFailing = failing.some((provider) => provider.isDefault);
  const healthyRemaining = enabled.length - failing.length;
  const level: RiskSignalLevel = defaultFailing && healthyRemaining === 0
    ? 'critical'
    : defaultFailing
      ? 'high'
      : 'medium';
  const names = failing.map((provider) => provider.name).join('、');
  return {
    id: 'provider_failing',
    category: 'provider',
    level,
    title: `${failing.length} 个服务商不可用`,
    detail: `异常服务商：${names}。${defaultFailing ? '其中包含默认服务商。' : ''}健康服务商剩余 ${healthyRemaining} 个。`,
    recommendation: defaultFailing
      ? '切换默认服务商到健康节点，并排查离线/限流原因。'
      : '排查异常服务商或将流量切换到健康节点。',
    signalCount: failing.length,
    source: { type: 'module', moduleId: 'admin', adminTab: 'providers', recordId: failing[0]?.id },
  };
}

function permissionSignal(input: RiskPermissionSignalInput): RiskSignal | null {
  const signals: string[] = [];
  let level: RiskSignalLevel = 'low';

  if (input.memberCount > 0 && input.adminCount / input.memberCount > 0.5 && input.adminCount >= 3) {
    signals.push(`管理员占比过高（${input.adminCount}/${input.memberCount}）`);
    level = 'medium';
  }
  if (input.inactivePrivilegedCount > 0) {
    signals.push(`${input.inactivePrivilegedCount} 个非活跃成员仍保留访问权`);
    level = 'high';
  }
  if (signals.length === 0) return null;

  return {
    id: 'permission_posture',
    category: 'permission',
    level,
    title: '权限分布存在风险',
    detail: signals.join('；') + '。',
    recommendation: '在会员管理中复核高权限成员，回收非活跃账号的访问权。',
    signalCount: signals.length,
    source: { type: 'module', moduleId: 'admin', adminTab: 'members' },
  };
}

function apiKeySignal(apiKeys: RiskApiKeySignalInput[], now: number): RiskSignal | null {
  const active = apiKeys.filter((key) => key.status === 'active' || key.status === 'rotating');
  const expired = apiKeys.filter((key) => key.status === 'expired' || (key.expiresAt !== null && key.expiresAt <= now && key.status !== 'revoked'));
  const expiringSoon = active.filter((key) => key.expiresAt !== null && key.expiresAt > now && key.expiresAt - now <= API_KEY_EXPIRY_SOON_MS);
  const broadNoExpiry = active.filter((key) =>
    key.expiresAt === null && key.scopes.some((scope) => BROAD_API_SCOPES.has(scope) || ADMIN_WRITE_SCOPES.has(scope)),
  );

  const issues: string[] = [];
  let level: RiskSignalLevel = 'low';
  let recordId: string | undefined;

  if (expired.length > 0) {
    issues.push(`${expired.length} 个密钥已过期但未撤销`);
    level = 'high';
    recordId = expired[0]?.id;
  }
  if (expiringSoon.length > 0) {
    issues.push(`${expiringSoon.length} 个密钥 7 天内到期`);
    if (level !== 'high') level = 'medium';
    recordId = recordId ?? expiringSoon[0]?.id;
  }
  if (broadNoExpiry.length > 0) {
    issues.push(`${broadNoExpiry.length} 个高权限密钥未设置到期时间`);
    if (level === 'low') level = 'medium';
    recordId = recordId ?? broadNoExpiry[0]?.id;
  }
  if (issues.length === 0) return null;

  return {
    id: 'api_key_posture',
    category: 'api_key',
    level,
    title: 'API 密钥存在风险',
    detail: issues.join('；') + '。',
    recommendation: '在 API 密钥页轮换或撤销过期密钥，为高权限密钥设置到期时间。',
    signalCount: issues.length,
    source: { type: 'module', moduleId: 'saas_api_keys', recordId },
  };
}

function runtimeSignal(runtime: RiskRuntimeSignalInput | null): RiskSignal | null {
  if (!runtime || runtime.health === 'available') return null;
  const level: RiskSignalLevel = runtime.health === 'offline' || runtime.health === 'incompatible'
    ? 'high'
    : runtime.health === 'auth_expired'
      ? 'high'
      : 'medium';
  const healthLabels: Record<RiskRuntimeSignalInput['health'], string> = {
    available: '正常',
    degraded: '降级',
    offline: '离线',
    auth_expired: '凭证过期',
    incompatible: '不兼容',
  };
  return {
    id: 'runtime_health',
    category: 'runtime',
    level,
    title: `Agent 运行时${healthLabels[runtime.health]}`,
    detail: `运行时模式 ${runtime.mode}（${runtime.label}）当前状态：${healthLabels[runtime.health]}。`,
    recommendation: runtime.health === 'auth_expired'
      ? '在设置中重新认证 Multica 运行时凭证。'
      : 'Web 独立模式仍可用；排查自托管 Multica 端点连通性后将自动恢复。',
    signalCount: 1,
    source: { type: 'runtime', moduleId: 'agent_status' },
  };
}

const ANOMALY_FAILURE_ACTIONS = new Set<string>([
  'generation_job_failed',
  'task_runtime_failure',
]);

function auditAnomalySignal(auditLogs: AuditLog[], now: number): RiskSignal | null {
  const windowStart = now - AUDIT_ANOMALY_WINDOW_MS;
  const recent = auditLogs.filter((log) => log.timestamp >= windowStart);
  const denials = recent.filter((log) => log.action === 'permission_denied');
  const failures = recent.filter((log) => ANOMALY_FAILURE_ACTIONS.has(log.action));

  if (denials.length < 3 && failures.length < 3) return null;

  const parts: string[] = [];
  if (denials.length > 0) parts.push(`${denials.length} 次权限拒绝`);
  if (failures.length > 0) parts.push(`${failures.length} 次任务/生成失败`);
  const level: RiskSignalLevel = denials.length >= 10 || failures.length >= 10 ? 'high' : 'medium';
  const latest = [...denials, ...failures].sort((a, b) => b.timestamp - a.timestamp)[0];

  return {
    id: 'audit_anomaly',
    category: 'audit',
    level,
    title: '审计日志出现异常聚集',
    detail: `过去 24 小时内：${parts.join('、')}。`,
    recommendation: '在系统日志审计中排查异常来源（被拒操作的账号/失败任务的运行时）。',
    signalCount: denials.length + failures.length,
    source: { type: 'audit_event', moduleId: 'admin', adminTab: 'logs', recordId: latest?.id },
  };
}

/**
 * Aggregate all operational signals into a classified, ordered risk list.
 * Ordering: severity first (critical→low), then category for stable display.
 */
export function assessWorkspaceRisk(input: AssessWorkspaceRiskInput): WorkspaceRiskAssessment {
  const signals = [
    quotaSignal(input.quota),
    providerSignal(input.providers),
    permissionSignal(input.permission),
    apiKeySignal(input.apiKeys, input.now),
    runtimeSignal(input.runtime),
    auditAnomalySignal(input.auditLogs, input.now),
  ].filter((signal): signal is RiskSignal => signal !== null);

  signals.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || a.category.localeCompare(b.category));

  const levelCounts: Record<RiskSignalLevel, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const signal of signals) levelCounts[signal.level] += 1;

  const highestLevel = signals[0]?.level ?? null;

  return { signals, levelCounts, highestLevel, generatedAt: input.now };
}

const RISK_LEVEL_LABELS: Record<RiskSignalLevel, string> = {
  critical: '严重',
  high: '高',
  medium: '中',
  low: '低',
};

export function getRiskLevelLabel(level: RiskSignalLevel): string {
  return RISK_LEVEL_LABELS[level];
}

const RISK_CATEGORY_LABELS: Record<RiskSignalCategory, string> = {
  quota: '配额计费',
  provider: 'AI 服务商',
  permission: '权限治理',
  api_key: 'API 密钥',
  runtime: '运行时',
  audit: '审计异常',
};

export function getRiskCategoryLabel(category: RiskSignalCategory): string {
  return RISK_CATEGORY_LABELS[category];
}
