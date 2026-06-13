import type { ModuleId } from '../../types';
import type { AuditAction, AuditLog, AuthSession } from '../../saas/types';
import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

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

export function logAuditEvent(input: AuditEventInput, context: AuditRepositoryContext): AuditLog {
  const storage = getRepositoryStorage(context.storage);
  const timestamp = context.now ?? Date.now();
  const event: AuditLog = {
    id: `${timestamp}_${Math.random().toString(36).slice(2, 9)}`,
    workspaceId: context.session.workspace.id,
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

  writeAllLogs([event, ...readAllLogs(storage)], storage);
  return event;
}

export function listAuditLogs(options: { storage?: StorageLike | null; workspaceId?: string } = {}): AuditLog[] {
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
  const resolvedStorage = getRepositoryStorage(storage);
  resolvedStorage?.removeItem(AUDIT_LOG_STORAGE_KEY);
}
