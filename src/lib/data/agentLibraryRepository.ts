import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export interface WorkspaceAgentLibraryEntry {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  assetId?: string;
  agentId?: string;
  ownerId?: string;
  roleVisibility: string[];
  tags: string[];
  status: 'active' | 'archived';
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface AgentLibraryRepositoryContext {
  workspaceId: string;
  userId?: string;
  storage?: StorageLike | null;
  now?: number;
}

export const AGENT_LIBRARY_PREFIX = 'aistudio_workspace_agent_library';

function key(ctx: AgentLibraryRepositoryContext): string { return `${AGENT_LIBRARY_PREFIX}:${ctx.workspaceId}`; }
function read(ctx: AgentLibraryRepositoryContext): WorkspaceAgentLibraryEntry[] {
  const s = getRepositoryStorage(ctx.storage); const raw = s?.getItem(key(ctx));
  if (!raw) return []; try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}
function write(items: WorkspaceAgentLibraryEntry[], ctx: AgentLibraryRepositoryContext): WorkspaceAgentLibraryEntry[] {
  const s = getRepositoryStorage(ctx.storage); s?.setItem(key(ctx), JSON.stringify(items));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('workspace_agent_library_updated', { detail: { workspaceId: ctx.workspaceId } }));
  return items;
}
const nowFn = (ctx: AgentLibraryRepositoryContext) => ctx.now ?? Date.now();
const rid = () => `agentlib_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function loadWorkspaceAgentLibrary(ctx: AgentLibraryRepositoryContext): WorkspaceAgentLibraryEntry[] { return read(ctx); }
export function createWorkspaceAgentLibraryEntry(input: Omit<WorkspaceAgentLibraryEntry, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>, ctx: AgentLibraryRepositoryContext): WorkspaceAgentLibraryEntry {
  const t = nowFn(ctx); const e = { ...input, id: rid(), workspaceId: ctx.workspaceId, createdAt: t, updatedAt: t };
  write([e, ...read(ctx)], ctx); return e;
}
export function updateWorkspaceAgentLibraryEntry(id: string, patch: Partial<WorkspaceAgentLibraryEntry>, ctx: AgentLibraryRepositoryContext): WorkspaceAgentLibraryEntry | null {
  let u: WorkspaceAgentLibraryEntry | null = null;
  const items = read(ctx).map(e => e.id === id ? (u = { ...e, ...patch, id: e.id, workspaceId: e.workspaceId, updatedAt: nowFn(ctx) }) : e);
  write(items, ctx); return u;
}
export function deleteWorkspaceAgentLibraryEntry(id: string, ctx: AgentLibraryRepositoryContext): void {
  write(read(ctx).filter(e => e.id !== id), ctx);
}
