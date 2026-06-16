import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';

export type WorkspaceRiskDecision = 'blocked' | 'pending_review' | 'allowed' | 'rate_limited' | 'account_frozen';
export type WorkspaceRiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface WorkspaceRiskEvent {
  id: string;
  workspaceId: string;
  action: string;
  contentSummary: string;
  rule: string;
  decision: WorkspaceRiskDecision;
  severity: WorkspaceRiskSeverity;
  occurredAt: number;
  reviewedAt: number | null;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface WorkspaceRiskEventInput {
  action: string;
  contentSummary: string;
  rule: string;
  decision?: string;
  severity?: string;
  occurredAt?: number;
  metadata?: Record<string, unknown>;
}

export interface RiskRepositoryContext {
  workspaceId: string;
  storage?: StorageLike | null;
  now?: number;
}

export interface WorkspaceRiskSummary {
  blockedTodayCount: number;
  pendingReviewCount: number;
  highRiskCount: number;
  modelVersion: string;
}

export const RISK_EVENT_STORAGE_PREFIX = 'aistudio_workspace_risk_events';

const RISK_DECISIONS: readonly WorkspaceRiskDecision[] = [
  'blocked',
  'pending_review',
  'allowed',
  'rate_limited',
  'account_frozen',
];
const RISK_SEVERITIES: readonly WorkspaceRiskSeverity[] = ['low', 'medium', 'high', 'critical'];

const DEFAULT_RISK_EVENTS: Array<Omit<WorkspaceRiskEvent, 'workspaceId' | 'occurredAt' | 'reviewedAt' | 'updatedAt'>> = [
  {
    id: 'risk_sensitive_prompt_blocked',
    action: 'Prompt 生成请求',
    contentSummary: '命中涉政/色情敏感词，系统拦截并返回占位图',
    rule: 'sensitive_prompt_policy',
    decision: 'blocked',
    severity: 'critical',
    metadata: { seeded: true, modelVersion: 'v2.4' },
  },
  {
    id: 'risk_public_asset_reported',
    action: '公开作品发布',
    contentSummary: '用户举报图片包含血腥暴力元素',
    rule: 'user_report_violence',
    decision: 'pending_review',
    severity: 'high',
    metadata: { seeded: true, modelVersion: 'v2.4' },
  },
  {
    id: 'risk_api_rate_abuse',
    action: '异常高频调用',
    contentSummary: '单 IP 一小时内高频调用图片 API',
    rule: 'api_rate_anomaly',
    decision: 'rate_limited',
    severity: 'high',
    metadata: { seeded: true, modelVersion: 'v2.4' },
  },
];

function riskStorageKey(context: RiskRepositoryContext): string {
  return `${RISK_EVENT_STORAGE_PREFIX}:${context.workspaceId}`;
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeDecision(value: unknown): WorkspaceRiskDecision {
  return typeof value === 'string' && RISK_DECISIONS.includes(value as WorkspaceRiskDecision)
    ? value as WorkspaceRiskDecision
    : 'pending_review';
}

function normalizeSeverity(value: unknown): WorkspaceRiskSeverity {
  return typeof value === 'string' && RISK_SEVERITIES.includes(value as WorkspaceRiskSeverity)
    ? value as WorkspaceRiskSeverity
    : 'medium';
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = typeof value === 'string' && !/^\d+$/.test(value.trim())
    ? Date.parse(value)
    : Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}

function normalizeNullableTimestamp(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = typeof value === 'string' && !/^\d+$/.test(value.trim())
    ? Date.parse(value)
    : Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : null;
}

function normalizeRiskEvent(
  event: Partial<WorkspaceRiskEvent>,
  context: RiskRepositoryContext,
): WorkspaceRiskEvent {
  const now = context.now ?? Date.now();
  return {
    id: normalizeText(event.id, `risk_${now}_${Math.random().toString(36).slice(2, 8)}`),
    workspaceId: context.workspaceId,
    action: normalizeText(event.action, 'Unknown action'),
    contentSummary: normalizeText(event.contentSummary, 'No content summary'),
    rule: normalizeText(event.rule, 'general_policy'),
    decision: normalizeDecision(event.decision),
    severity: normalizeSeverity(event.severity),
    occurredAt: normalizeTimestamp(event.occurredAt, now),
    reviewedAt: normalizeNullableTimestamp(event.reviewedAt),
    updatedAt: normalizeTimestamp(event.updatedAt, now),
    metadata: event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata)
      ? event.metadata
      : {},
  };
}

function sortRiskEvents(events: WorkspaceRiskEvent[]): WorkspaceRiskEvent[] {
  const decisionRank: Record<WorkspaceRiskDecision, number> = {
    pending_review: 0,
    blocked: 1,
    account_frozen: 2,
    rate_limited: 3,
    allowed: 4,
  };
  const severityRank: Record<WorkspaceRiskSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return events.slice().sort((a, b) =>
    decisionRank[a.decision] - decisionRank[b.decision] ||
    severityRank[a.severity] - severityRank[b.severity] ||
    b.occurredAt - a.occurredAt,
  );
}

function readRiskEvents(context: RiskRepositoryContext): WorkspaceRiskEvent[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(riskStorageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortRiskEvents(parsed.map((event) => normalizeRiskEvent(event as Partial<WorkspaceRiskEvent>, context)));
  } catch {
    return [];
  }
}

function writeRiskEvents(
  events: WorkspaceRiskEvent[],
  context: RiskRepositoryContext,
): WorkspaceRiskEvent[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = sortRiskEvents(events.map((event) => normalizeRiskEvent(event, context)));
  storage?.setItem(riskStorageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('workspace_risk_events_updated', { detail: { workspaceId: context.workspaceId } }));
  }
  return normalized;
}

export function getDefaultWorkspaceRiskEvents(context: RiskRepositoryContext): WorkspaceRiskEvent[] {
  const now = context.now ?? Date.now();
  return DEFAULT_RISK_EVENTS.map((event, index) => normalizeRiskEvent(
    {
      ...event,
      workspaceId: context.workspaceId,
      occurredAt: now - index * 45 * 60 * 1000,
      reviewedAt: event.decision === 'pending_review' ? null : now - index * 30 * 60 * 1000,
      updatedAt: now - index * 30 * 60 * 1000,
    },
    context,
  ));
}

export function loadWorkspaceRiskEvents(context: RiskRepositoryContext): WorkspaceRiskEvent[] {
  if (riskApiClient.configured) return riskCache.get(context.workspaceId) ?? [];
  return readRiskEvents(context);
}

export function saveWorkspaceRiskEvents(
  events: WorkspaceRiskEvent[],
  context: RiskRepositoryContext,
): WorkspaceRiskEvent[] {
  return writeRiskEvents(events, context);
}

export function ensureDefaultWorkspaceRiskEvents(context: RiskRepositoryContext): WorkspaceRiskEvent[] {
  const existingEvents = readRiskEvents(context);
  if (existingEvents.length > 0) return existingEvents;
  return writeRiskEvents(getDefaultWorkspaceRiskEvents(context), context);
}

export function createWorkspaceRiskEvent(
  input: WorkspaceRiskEventInput,
  context: RiskRepositoryContext,
): WorkspaceRiskEvent {
  const now = context.now ?? Date.now();
  const decision = normalizeDecision(input.decision);
  const severity = normalizeSeverity(input.severity);
  const event = normalizeRiskEvent(
    {
      id: `risk_${now}_${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: context.workspaceId,
      action: input.action,
      contentSummary: input.contentSummary,
      rule: input.rule,
      decision,
      severity,
      occurredAt: input.occurredAt ?? now,
      updatedAt: now,
      reviewedAt: null,
      metadata: input.metadata ?? {},
    },
    context,
  );

  writeRiskEvents([event, ...ensureDefaultWorkspaceRiskEvents(context)], context);
  if (riskApiClient.configured) {
    riskCache.set(context.workspaceId, sortRiskEvents([event, ...(riskCache.get(context.workspaceId) ?? [])]));
    void riskApiClient.post(context.workspaceId, 'risk-events', {
      id: event.id, action: event.action, contentSummary: event.contentSummary, rule: event.rule,
      decision: event.decision, severity: event.severity,
      occurredAt: event.occurredAt > 0 ? new Date(event.occurredAt).toISOString() : undefined,
      reviewedAt: event.reviewedAt && event.reviewedAt > 0 ? new Date(event.reviewedAt).toISOString() : undefined,
      metadata: event.metadata,
    }).then((r) => { if (!r.ok) console.error('createWorkspaceRiskEvent write-through failed', r); })
      .catch((e) => console.error('createWorkspaceRiskEvent write-through failed', e));
  }
  return event;
}

export function updateWorkspaceRiskEvent(
  eventId: string,
  patch: Partial<Omit<WorkspaceRiskEvent, 'id' | 'workspaceId' | 'occurredAt' | 'updatedAt'>>,
  context: RiskRepositoryContext,
): WorkspaceRiskEvent | null {
  const now = context.now ?? Date.now();
  let updatedEvent: WorkspaceRiskEvent | null = null;
  const updatedEvents = ensureDefaultWorkspaceRiskEvents(context).map((event) => {
    if (event.id !== eventId) return event;
    updatedEvent = normalizeRiskEvent(
      {
        ...event,
        ...patch,
        id: event.id,
        occurredAt: event.occurredAt,
        updatedAt: now,
        reviewedAt: patch.reviewedAt ?? event.reviewedAt,
      },
      context,
    );
    return updatedEvent;
  });

  writeRiskEvents(updatedEvents, context);
  if (riskApiClient.configured && updatedEvent) {
    const u: WorkspaceRiskEvent = updatedEvent;
    riskCache.set(context.workspaceId, sortRiskEvents((riskCache.get(context.workspaceId) ?? []).map((e) => (e.id === u.id ? u : e))));
    void riskApiClient.patch(context.workspaceId, `risk-events/${u.id}`, {
      action: u.action, contentSummary: u.contentSummary, rule: u.rule, decision: u.decision, severity: u.severity,
      reviewedAt: u.reviewedAt && u.reviewedAt > 0 ? new Date(u.reviewedAt).toISOString() : undefined,
      metadata: u.metadata,
    }).then((r) => { if (!r.ok) console.error('updateWorkspaceRiskEvent write-through failed', r); })
      .catch((e) => console.error('updateWorkspaceRiskEvent write-through failed', e));
  }
  return updatedEvent;
}

export function summarizeWorkspaceRiskEvents(
  events: WorkspaceRiskEvent[],
  options: { now?: number } = {},
): WorkspaceRiskSummary {
  const now = options.now ?? Date.now();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayStart = startOfToday.getTime();
  const modelVersionCounts = new Map<string, number>();

  for (const event of events) {
    const modelVersion = typeof event.metadata.modelVersion === 'string' ? event.metadata.modelVersion : '';
    if (modelVersion) modelVersionCounts.set(modelVersion, (modelVersionCounts.get(modelVersion) ?? 0) + 1);
  }

  const modelVersion = [...modelVersionCounts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0]?.[0] ?? 'unknown';

  return {
    blockedTodayCount: events.filter((event) =>
      ['blocked', 'rate_limited', 'account_frozen'].includes(event.decision) &&
      event.occurredAt >= todayStart &&
      event.occurredAt <= now,
    ).length,
    pendingReviewCount: events.filter((event) => event.decision === 'pending_review').length,
    highRiskCount: events.filter((event) => event.severity === 'high' || event.severity === 'critical').length,
    modelVersion,
  };
}

let riskApiClient: ApiClient = defaultApiClient;
export function __setRiskApiClientForTest(client: ApiClient): void { riskApiClient = client; }

const riskCache = new Map<string, WorkspaceRiskEvent[]>(); // key = workspaceId

export async function hydrateWorkspaceRiskEvents(context: RiskRepositoryContext): Promise<void> {
  if (!riskApiClient.configured) return;
  const res = await riskApiClient.get<{ items: WorkspaceRiskEvent[]; nextCursor: string | null }>(
    context.workspaceId, 'risk-events');
  if (res.ok && res.value && Array.isArray(res.value.items)) {
    riskCache.set(context.workspaceId, sortRiskEvents(res.value.items.map((e) => normalizeRiskEvent(e, context))));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('workspace_risk_events_updated', { detail: { workspaceId: context.workspaceId } }));
    }
  }
}
