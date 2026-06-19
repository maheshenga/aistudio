import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export type EmployeeAccountStatus = 'available' | 'assigned' | 'suspended' | 'removed';

export interface WorkspaceEmployeeAccount {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: string;
  status: EmployeeAccountStatus;
  allowedModules: string[];
  ownerId?: string;
  auditHistory: EmployeeAuditEntry[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface EmployeeAuditEntry {
  action: 'create' | 'assign' | 'suspend' | 'reactivate' | 'remove';
  actorId?: string;
  timestamp: number;
  note?: string;
}

export interface EmployeeAccountRepositoryContext {
  workspaceId: string;
  userId?: string;
  storage?: StorageLike | null;
  now?: number;
}

export const EMPLOYEE_ACCOUNT_PREFIX = 'aistudio_workspace_employee_accounts';

function key(ctx: EmployeeAccountRepositoryContext): string { return `${EMPLOYEE_ACCOUNT_PREFIX}:${ctx.workspaceId}`; }
function read(ctx: EmployeeAccountRepositoryContext): WorkspaceEmployeeAccount[] {
  const s = getRepositoryStorage(ctx.storage); const raw = s?.getItem(key(ctx));
  if (!raw) return []; try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}
function write(items: WorkspaceEmployeeAccount[], ctx: EmployeeAccountRepositoryContext): WorkspaceEmployeeAccount[] {
  const s = getRepositoryStorage(ctx.storage); s?.setItem(key(ctx), JSON.stringify(items));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('workspace_employee_accounts_updated', { detail: { workspaceId: ctx.workspaceId } }));
  return items;
}
const nowFn = (ctx: EmployeeAccountRepositoryContext) => ctx.now ?? Date.now();
const rid = () => `emp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function loadWorkspaceEmployeeAccounts(ctx: EmployeeAccountRepositoryContext): WorkspaceEmployeeAccount[] { return read(ctx); }
export function createWorkspaceEmployeeAccount(input: Omit<WorkspaceEmployeeAccount, 'id' | 'workspaceId' | 'auditHistory' | 'createdAt' | 'updatedAt'>, ctx: EmployeeAccountRepositoryContext): WorkspaceEmployeeAccount {
  const t = nowFn(ctx);
  const entry: EmployeeAuditEntry = { action: 'create', actorId: ctx.userId, timestamp: t };
  const a = { ...input, id: rid(), workspaceId: ctx.workspaceId, auditHistory: [entry], createdAt: t, updatedAt: t };
  write([a, ...read(ctx)], ctx); return a;
}
export function updateEmployeeAccountStatus(id: string, action: EmployeeAuditEntry['action'], status: EmployeeAccountStatus, ctx: EmployeeAccountRepositoryContext, note?: string): WorkspaceEmployeeAccount | null {
  let u: WorkspaceEmployeeAccount | null = null;
  const entry: EmployeeAuditEntry = { action, actorId: ctx.userId, timestamp: nowFn(ctx), note };
  const items = read(ctx).map(a => a.id === id ? (u = { ...a, status, auditHistory: [entry, ...a.auditHistory], id: a.id, workspaceId: a.workspaceId, updatedAt: nowFn(ctx) }) : a);
  write(items, ctx); return u;
}
export function deleteWorkspaceEmployeeAccount(id: string, ctx: EmployeeAccountRepositoryContext): void {
  write(read(ctx).filter(a => a.id !== id), ctx);
}
