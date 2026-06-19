import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export type DesignModuleType = 'logo' | 'packaging' | 'ads' | 'interior' | 'fashion';

export interface WorkspaceDesignBrief {
  id: string;
  workspaceId: string;
  module: DesignModuleType;
  businessGoal: string;
  audience: string;
  style: string;
  constraints: string;
  references: string[];
  ownerId?: string;
  projectId?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface DesignRepositoryContext {
  workspaceId: string;
  userId?: string;
  storage?: StorageLike | null;
  now?: number;
}

export const DESIGN_BRIEF_PREFIX = 'aistudio_workspace_design_briefs';

function key(ctx: DesignRepositoryContext): string { return `${DESIGN_BRIEF_PREFIX}:${ctx.workspaceId}`; }
function read(ctx: DesignRepositoryContext): WorkspaceDesignBrief[] {
  const s = getRepositoryStorage(ctx.storage); const raw = s?.getItem(key(ctx));
  if (!raw) return []; try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}
function write(items: WorkspaceDesignBrief[], ctx: DesignRepositoryContext): WorkspaceDesignBrief[] {
  const s = getRepositoryStorage(ctx.storage); s?.setItem(key(ctx), JSON.stringify(items));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('workspace_design_briefs_updated', { detail: { workspaceId: ctx.workspaceId } }));
  return items;
}
const nowFn = (ctx: DesignRepositoryContext) => ctx.now ?? Date.now();
const rid = () => `design_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function loadWorkspaceDesignBriefs(ctx: DesignRepositoryContext): WorkspaceDesignBrief[] { return read(ctx); }
export function createWorkspaceDesignBrief(input: Omit<WorkspaceDesignBrief, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>, ctx: DesignRepositoryContext): WorkspaceDesignBrief {
  const t = nowFn(ctx); const b = { ...input, id: rid(), workspaceId: ctx.workspaceId, createdAt: t, updatedAt: t };
  write([b, ...read(ctx)], ctx); return b;
}
export function updateWorkspaceDesignBrief(id: string, patch: Partial<WorkspaceDesignBrief>, ctx: DesignRepositoryContext): WorkspaceDesignBrief | null {
  let u: WorkspaceDesignBrief | null = null;
  const items = read(ctx).map(b => b.id === id ? (u = { ...b, ...patch, id: b.id, workspaceId: b.workspaceId, updatedAt: nowFn(ctx) }) : b);
  write(items, ctx); return u;
}
export function deleteWorkspaceDesignBrief(id: string, ctx: DesignRepositoryContext): void {
  write(read(ctx).filter(b => b.id !== id), ctx);
}
