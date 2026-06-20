import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export type TaxRecordKind = 'calculation' | 'simulation' | 'filing';
export type TaxRecordCategory = 'individual' | 'vat' | 'corporate' | 'simulation' | 'other';
export type TaxRecordStatus = 'draft' | 'submitted' | 'archived';

export interface WorkspaceTaxRecord {
  id: string;
  workspaceId: string;
  kind: TaxRecordKind;
  category: TaxRecordCategory;
  title: string;
  inputs: Record<string, unknown>;
  result: Record<string, unknown>;
  status: TaxRecordStatus;
  actorId?: string;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface TaxRepositoryContext {
  workspaceId: string;
  userId?: string;
  storage?: StorageLike | null;
  now?: number;
}

export const TAX_RECORD_PREFIX = 'aistudio_workspace_tax_records';

const RECORD_KINDS: readonly TaxRecordKind[] = ['calculation', 'simulation', 'filing'];
const RECORD_CATEGORIES: readonly TaxRecordCategory[] = ['individual', 'vat', 'corporate', 'simulation', 'other'];
const RECORD_STATUSES: readonly TaxRecordStatus[] = ['draft', 'submitted', 'archived'];

function key(ctx: TaxRepositoryContext): string {
  return `${TAX_RECORD_PREFIX}:${ctx.workspaceId}`;
}

function nowFn(ctx: TaxRepositoryContext): number {
  return ctx.now ?? Date.now();
}

function rid(): string {
  return `tax_rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeKind(value: unknown): TaxRecordKind {
  return typeof value === 'string' && RECORD_KINDS.includes(value as TaxRecordKind)
    ? (value as TaxRecordKind)
    : 'calculation';
}

function normalizeCategory(value: unknown): TaxRecordCategory {
  return typeof value === 'string' && RECORD_CATEGORIES.includes(value as TaxRecordCategory)
    ? (value as TaxRecordCategory)
    : 'other';
}

function normalizeStatus(value: unknown): TaxRecordStatus {
  return typeof value === 'string' && RECORD_STATUSES.includes(value as TaxRecordStatus)
    ? (value as TaxRecordStatus)
    : 'draft';
}

function normalizeRecord(record: Partial<WorkspaceTaxRecord>, ctx: TaxRepositoryContext): WorkspaceTaxRecord {
  const t = nowFn(ctx);
  return {
    id: typeof record.id === 'string' && record.id ? record.id : rid(),
    workspaceId: ctx.workspaceId,
    kind: normalizeKind(record.kind),
    category: normalizeCategory(record.category),
    title: typeof record.title === 'string' && record.title.trim() ? record.title.trim() : 'Tax record',
    inputs: record.inputs && typeof record.inputs === 'object' ? record.inputs as Record<string, unknown> : {},
    result: record.result && typeof record.result === 'object' ? record.result as Record<string, unknown> : {},
    status: normalizeStatus(record.status),
    actorId: typeof record.actorId === 'string' ? record.actorId : undefined,
    createdAt: typeof record.createdAt === 'number' && record.createdAt > 0 ? record.createdAt : t,
    updatedAt: typeof record.updatedAt === 'number' && record.updatedAt > 0 ? record.updatedAt : t,
    metadata: record.metadata && typeof record.metadata === 'object' ? record.metadata as Record<string, unknown> : {},
  };
}

function read(ctx: TaxRepositoryContext): WorkspaceTaxRecord[] {
  const s = getRepositoryStorage(ctx.storage);
  const raw = s?.getItem(key(ctx));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((r) => normalizeRecord(r as Partial<WorkspaceTaxRecord>, ctx));
  } catch {
    return [];
  }
}

function write(items: WorkspaceTaxRecord[], ctx: TaxRepositoryContext): WorkspaceTaxRecord[] {
  const s = getRepositoryStorage(ctx.storage);
  s?.setItem(key(ctx), JSON.stringify(items));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('workspace_tax_records_updated', { detail: { workspaceId: ctx.workspaceId } }));
  }
  return items;
}

export function loadWorkspaceTaxRecords(ctx: TaxRepositoryContext): WorkspaceTaxRecord[] {
  return read(ctx).sort((a, b) => b.createdAt - a.createdAt);
}

export function createWorkspaceTaxRecord(
  input: Omit<WorkspaceTaxRecord, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>,
  ctx: TaxRepositoryContext,
): WorkspaceTaxRecord {
  const record = normalizeRecord({ ...input, actorId: input.actorId ?? ctx.userId }, ctx);
  write([record, ...read(ctx)], ctx);
  return record;
}

export function updateTaxRecordStatus(
  id: string,
  status: TaxRecordStatus,
  ctx: TaxRepositoryContext,
  patch: Partial<WorkspaceTaxRecord> = {},
): WorkspaceTaxRecord | null {
  let updated: WorkspaceTaxRecord | null = null;
  const items = read(ctx).map((r) => {
    if (r.id !== id) return r;
    updated = { ...r, ...patch, status, id: r.id, workspaceId: r.workspaceId, updatedAt: nowFn(ctx) };
    return updated;
  });
  write(items, ctx);
  return updated;
}

export function deleteWorkspaceTaxRecord(id: string, ctx: TaxRepositoryContext): void {
  write(read(ctx).filter((r) => r.id !== id), ctx);
}

export function summarizeWorkspaceTaxRecords(ctx: TaxRepositoryContext): {
  total: number;
  byKind: Record<TaxRecordKind, number>;
  byStatus: Record<TaxRecordStatus, number>;
} {
  const records = read(ctx);
  const byKind: Record<TaxRecordKind, number> = { calculation: 0, simulation: 0, filing: 0 };
  const byStatus: Record<TaxRecordStatus, number> = { draft: 0, submitted: 0, archived: 0 };
  for (const r of records) {
    byKind[r.kind] += 1;
    byStatus[r.status] += 1;
  }
  return { total: records.length, byKind, byStatus };
}
