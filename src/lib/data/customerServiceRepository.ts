import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export type ResponseStatus = 'suggested' | 'accepted' | 'edited' | 'rejected' | 'escalated' | 'sent';

export interface WorkspaceCustomerServiceResponse {
  id: string;
  workspaceId: string;
  customerId?: string;
  channel: string;
  draft: string;
  editedDraft?: string;
  status: ResponseStatus;
  editorId?: string;
  editedAt?: number;
  escalationTaskId?: string;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface CustomerServiceRepositoryContext {
  workspaceId: string;
  userId?: string;
  storage?: StorageLike | null;
  now?: number;
}

export const CS_RESPONSE_PREFIX = 'aistudio_workspace_cs_responses';

function key(ctx: CustomerServiceRepositoryContext): string { return `${CS_RESPONSE_PREFIX}:${ctx.workspaceId}`; }
function read(ctx: CustomerServiceRepositoryContext): WorkspaceCustomerServiceResponse[] {
  const s = getRepositoryStorage(ctx.storage); const raw = s?.getItem(key(ctx));
  if (!raw) return []; try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}
function write(items: WorkspaceCustomerServiceResponse[], ctx: CustomerServiceRepositoryContext): WorkspaceCustomerServiceResponse[] {
  const s = getRepositoryStorage(ctx.storage); s?.setItem(key(ctx), JSON.stringify(items));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('workspace_cs_responses_updated', { detail: { workspaceId: ctx.workspaceId } }));
  return items;
}
const nowFn = (ctx: CustomerServiceRepositoryContext) => ctx.now ?? Date.now();
const rid = () => `cs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function loadWorkspaceCustomerServiceResponses(ctx: CustomerServiceRepositoryContext): WorkspaceCustomerServiceResponse[] { return read(ctx); }
export function createWorkspaceCustomerServiceResponse(input: Omit<WorkspaceCustomerServiceResponse, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>, ctx: CustomerServiceRepositoryContext): WorkspaceCustomerServiceResponse {
  const t = nowFn(ctx); const r = { ...input, id: rid(), workspaceId: ctx.workspaceId, createdAt: t, updatedAt: t };
  write([r, ...read(ctx)], ctx); return r;
}
export function updateCustomerServiceResponseStatus(id: string, status: ResponseStatus, patch: Partial<WorkspaceCustomerServiceResponse>, ctx: CustomerServiceRepositoryContext): WorkspaceCustomerServiceResponse | null {
  let u: WorkspaceCustomerServiceResponse | null = null;
  const items = read(ctx).map(r => r.id === id ? (u = { ...r, ...patch, status, id: r.id, workspaceId: r.workspaceId, updatedAt: nowFn(ctx) }) : r);
  write(items, ctx); return u;
}
export function deleteWorkspaceCustomerServiceResponse(id: string, ctx: CustomerServiceRepositoryContext): void {
  write(read(ctx).filter(r => r.id !== id), ctx);
}
