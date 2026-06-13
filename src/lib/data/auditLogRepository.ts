import type { ModuleId } from '../../types';
import type { AuditAction, AuditLog, AuthSession } from '../../saas/types';
import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';

export const AUDIT_LOG_STORAGE_KEY = 'aistudio_activity_logs';

export interface AuditEventInput {
  action: AuditAction;
  moduleId?: ModuleId;
  targetType?: AuditLog['targetType'];
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditRepositoryContext {
  session: AuthSession;
  storage?: StorageLike | null;
  now?: number;
}

export interface AuditLogFilter {
  moduleId?: ModuleId | 'all';
  action?: AuditAction | 'all';
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  targetType?: AuditLog['targetType'] | 'all';
  targetId?: string;
  from?: number;
  to?: number;
  query?: string;
}

export interface AuditLogExportRow {
  id: string;
  workspaceId: string;
  timestamp: number;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: AuditAction;
  moduleId: string;
  targetType: AuditLog['targetType'];
  targetId: string;
  metadataJson: string;
}

function readAllLogs(storage?: StorageLike | null): AuditLog[] {
  const resolvedStorage = getRepositoryStorage(storage);
  const raw = resolvedStorage?.getItem(AUDIT_LOG_STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as AuditLog[];
  } catch {
    return [];
  }
}

function writeAllLogs(logs: AuditLog[], storage?: StorageLike | null): void {
  const resolvedStorage = getRepositoryStorage(storage);
  resolvedStorage?.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(logs.slice(0, 500)));
}

export interface AuditHydrateContext {
  workspaceId: string;
  storage?: StorageLike | null;
  now?: number;
}

// The repo itself dispatches nothing on write; callers fire a plain `activity_logged` Event
// that every audit view listens for. Mirror that convention on hydrate so listeners refresh.
function dispatchActivityLogged(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event('activity_logged'));
  }
}

let auditApiClient: ApiClient = defaultApiClient;
export function __setAuditApiClientForTest(client: ApiClient): void { auditApiClient = client; }

const auditLogCache = new Map<string, AuditLog[]>(); // key=workspaceId

function sortAuditLogs(logs: AuditLog[]): AuditLog[] {
  return logs.slice().sort((a, b) => b.timestamp - a.timestamp);
}

function normalizeAuditLog(
  raw: Partial<AuditLog> & { actorName?: string; actorRole?: string; actorId?: string; actorEmail?: string; createdAt?: number },
  workspaceId: string,
): AuditLog {
  const actor = raw.actor ?? {
    id: String(raw.actorId ?? ''),
    name: String(raw.actorName ?? ''),
    email: raw.actorEmail ? String(raw.actorEmail) : undefined,
    role: String(raw.actorRole ?? 'viewer'),
  };
  const timestamp = Number.isFinite(raw.timestamp)
    ? Number(raw.timestamp)
    : (Number.isFinite(raw.createdAt) ? Number(raw.createdAt) : Date.now());
  return {
    id: String(raw.id ?? `${timestamp}_${Math.random().toString(36).slice(2, 9)}`),
    workspaceId: raw.workspaceId ?? workspaceId,
    actor: actor as AuditLog['actor'],
    action: raw.action as AuditLog['action'],
    moduleId: raw.moduleId,
    targetType: raw.targetType ?? (raw.moduleId ? 'module' : 'system'),
    targetId: raw.targetId,
    metadata: raw.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata) ? raw.metadata : {},
    timestamp,
  };
}

export async function hydrateAuditLogs(context: AuditHydrateContext): Promise<void> {
  if (!auditApiClient.configured) return;
  const res = await auditApiClient.get<AuditLog[]>(context.workspaceId, 'audit-logs');
  if (res.ok && Array.isArray(res.value)) {
    auditLogCache.set(
      context.workspaceId,
      sortAuditLogs(res.value.map((l) => normalizeAuditLog(l as Partial<AuditLog>, context.workspaceId))),
    );
    dispatchActivityLogged();
  }
}

export function logAuditEvent(input: AuditEventInput, context: AuditRepositoryContext): AuditLog {
  const storage = getRepositoryStorage(context.storage);
  const timestamp = context.now ?? Date.now();
  const workspaceId = context.session.workspace.id;
  const event: AuditLog = {
    id: `${timestamp}_${Math.random().toString(36).slice(2, 9)}`,
    workspaceId,
    actor: {
      id: context.session.user.id,
      name: context.session.user.name,
      email: context.session.user.email,
      role: context.session.membership.role,
    },
    action: input.action,
    moduleId: input.moduleId,
    targetType: input.targetType ?? (input.moduleId ? 'module' : 'system'),
    targetId: input.targetId,
    metadata: input.metadata ?? {},
    timestamp,
  };

  if (auditApiClient.configured) {
    // Optimistic cache append; server timestamp/createdAt is authoritative on next hydrate.
    auditLogCache.set(workspaceId, sortAuditLogs([event, ...(auditLogCache.get(workspaceId) ?? [])]));
    void auditApiClient
      .post(workspaceId, 'audit-logs', {
        action: event.action,
        moduleId: event.moduleId,
        targetType: event.targetType,
        targetId: event.targetId,
        actorId: event.actor.id,
        actorName: event.actor.name,
        actorEmail: event.actor.email,
        actorRole: event.actor.role,
        metadata: event.metadata,
      })
      .then((res) => { if (!res.ok) console.error('logAuditEvent write-through failed', res); })
      .catch((err) => console.error('logAuditEvent write-through failed', err));
    return event;
  }

  writeAllLogs([event, ...readAllLogs(storage)], storage);
  return event;
}

export function listAuditLogs(options: { storage?: StorageLike | null; workspaceId?: string } = {}): AuditLog[] {
  if (auditApiClient.configured) {
    if (!options.workspaceId) {
      // No workspace scope provided; flatten all cached workspaces.
      return sortAuditLogs(Array.from(auditLogCache.values()).flat());
    }
    return auditLogCache.get(options.workspaceId) ?? [];
  }
  const logs = readAllLogs(options.storage);
  if (!options.workspaceId) return logs;
  return logs.filter((log) => log.workspaceId === options.workspaceId);
}

export function filterAuditLogs(logs: AuditLog[], filter: AuditLogFilter = {}): AuditLog[] {
  const query = filter.query?.trim().toLowerCase();
  return logs.filter((log) => {
    if (filter.moduleId && filter.moduleId !== 'all' && log.moduleId !== filter.moduleId) return false;
    if (filter.action && filter.action !== 'all' && log.action !== filter.action) return false;
    if (filter.actorId && log.actor.id !== filter.actorId) return false;
    if (filter.actorEmail && log.actor.email !== filter.actorEmail) return false;
    if (filter.actorRole && log.actor.role !== filter.actorRole) return false;
    if (filter.targetType && filter.targetType !== 'all' && log.targetType !== filter.targetType) return false;
    if (filter.targetId && log.targetId !== filter.targetId) return false;
    if (Number.isFinite(filter.from) && log.timestamp < Number(filter.from)) return false;
    if (Number.isFinite(filter.to) && log.timestamp > Number(filter.to)) return false;
    if (!query) return true;

    const searchable = [
      log.id,
      log.workspaceId,
      log.actor.id,
      log.actor.name,
      log.actor.email ?? '',
      log.actor.role,
      log.action,
      log.moduleId ?? '',
      log.targetType,
      log.targetId ?? '',
      JSON.stringify(log.metadata),
    ].join(' ').toLowerCase();
    return searchable.includes(query);
  });
}

export function exportAuditLogRows(logs: AuditLog[]): AuditLogExportRow[] {
  return logs.map((log) => ({
    id: log.id,
    workspaceId: log.workspaceId,
    timestamp: log.timestamp,
    actorId: log.actor.id,
    actorName: log.actor.name,
    actorEmail: log.actor.email ?? '',
    actorRole: log.actor.role,
    action: log.action,
    moduleId: log.moduleId ?? '',
    targetType: log.targetType,
    targetId: log.targetId ?? '',
    metadataJson: JSON.stringify(log.metadata ?? {}),
  }));
}

export function clearAuditLogs(storage?: StorageLike | null): void {
  // Server audit logs are append-only and immutable (no delete endpoint). When configured we can
  // only clear the LOCAL cache; the localStorage copy is also cleared for the unconfigured path.
  if (auditApiClient.configured) {
    auditLogCache.clear();
  }
  const resolvedStorage = getRepositoryStorage(storage);
  resolvedStorage?.removeItem(AUDIT_LOG_STORAGE_KEY);
}
