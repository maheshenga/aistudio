import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';

export type WorkspaceTeamMemberStatus = 'active' | 'invited' | 'suspended' | 'removed';

export interface WorkspaceTeamMember {
  id: string;
  workspaceId: string;
  userId?: string;
  name: string;
  email: string;
  role: string;
  status: WorkspaceTeamMemberStatus;
  permissions: string[];
  ownerId?: string;
  joinedAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface WorkspaceTeamMemberInput {
  name: string;
  email: string;
  role?: string;
  status?: WorkspaceTeamMemberStatus;
  permissions?: string[];
  ownerId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface TeamRepositoryContext {
  workspaceId: string;
  userId?: string;
  storage?: StorageLike | null;
  now?: number;
}

export const TEAM_STORAGE_PREFIX = 'aistudio_workspace_team_members';

function storageKey(ctx: TeamRepositoryContext): string {
  return `${TEAM_STORAGE_PREFIX}:${ctx.workspaceId}`;
}

function normalizeMember(m: Partial<WorkspaceTeamMember>, ctx: TeamRepositoryContext): WorkspaceTeamMember {
  const now = ctx.now ?? Date.now();
  return {
    id: m.id ?? `team_${now}_${Math.random().toString(36).slice(2, 8)}`,
    workspaceId: ctx.workspaceId,
    userId: m.userId,
    name: m.name ?? 'Unknown',
    email: m.email ?? '',
    role: m.role ?? 'viewer',
    status: m.status ?? 'active',
    permissions: Array.isArray(m.permissions) ? m.permissions : [],
    ownerId: m.ownerId ?? ctx.userId,
    joinedAt: m.joinedAt ?? now,
    updatedAt: m.updatedAt ?? now,
    metadata: m.metadata && typeof m.metadata === 'object' && !Array.isArray(m.metadata) ? m.metadata : {},
  };
}

function readMembers(ctx: TeamRepositoryContext): WorkspaceTeamMember[] {
  const storage = getRepositoryStorage(ctx.storage);
  const raw = storage?.getItem(storageKey(ctx));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((m: Partial<WorkspaceTeamMember>) => normalizeMember(m, ctx)) : [];
  } catch { return []; }
}

function writeMembers(members: WorkspaceTeamMember[], ctx: TeamRepositoryContext): WorkspaceTeamMember[] {
  const storage = getRepositoryStorage(ctx.storage);
  const normalized = members.map((m) => normalizeMember(m, ctx));
  storage?.setItem(storageKey(ctx), JSON.stringify(normalized));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('workspace_team_members_updated', { detail: { workspaceId: ctx.workspaceId } }));
  }
  return normalized;
}

let teamApiClient: ApiClient = defaultApiClient;
export function __setTeamApiClientForTest(client: ApiClient): void { teamApiClient = client; }

export function loadWorkspaceTeamMembers(ctx: TeamRepositoryContext): WorkspaceTeamMember[] {
  return readMembers(ctx);
}

export function createWorkspaceTeamMember(input: WorkspaceTeamMemberInput, ctx: TeamRepositoryContext): WorkspaceTeamMember {
  const now = ctx.now ?? Date.now();
  const member = normalizeMember({ ...input, id: `team_${now}_${Math.random().toString(36).slice(2, 8)}`, joinedAt: now, updatedAt: now }, ctx);
  writeMembers([member, ...readMembers(ctx)], ctx);
  return member;
}

export function updateWorkspaceTeamMember(id: string, patch: Partial<Omit<WorkspaceTeamMember, 'id' | 'workspaceId' | 'joinedAt'>>, ctx: TeamRepositoryContext): WorkspaceTeamMember | null {
  const now = ctx.now ?? Date.now();
  let updated: WorkspaceTeamMember | null = null;
  const members = readMembers(ctx).map((m) => {
    if (m.id !== id) return m;
    updated = normalizeMember({ ...m, ...patch, id: m.id, workspaceId: m.workspaceId, joinedAt: m.joinedAt, updatedAt: now }, ctx);
    return updated;
  });
  writeMembers(members, ctx);
  return updated;
}

export function deleteWorkspaceTeamMember(id: string, ctx: TeamRepositoryContext): void {
  writeMembers(readMembers(ctx).filter((m) => m.id !== id), ctx);
}

/** 子账号（关联第三方平台账号，如抖音/小红书店铺账号） */
export interface WorkspaceSubAccount {
  id: string;
  workspaceId: string;
  platform: string;
  accountName: string;
  accountId?: string;
  ownerMemberId?: string;
  status: 'active' | 'disconnected' | 'expired';
  credentialsMeta: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export const SUBACCOUNT_STORAGE_PREFIX = 'aistudio_workspace_sub_accounts';

function subAccountKey(ctx: TeamRepositoryContext): string {
  return `${SUBACCOUNT_STORAGE_PREFIX}:${ctx.workspaceId}`;
}

function readSubAccounts(ctx: TeamRepositoryContext): WorkspaceSubAccount[] {
  const storage = getRepositoryStorage(ctx.storage);
  const raw = storage?.getItem(subAccountKey(ctx));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeSubAccounts(accounts: WorkspaceSubAccount[], ctx: TeamRepositoryContext): WorkspaceSubAccount[] {
  const storage = getRepositoryStorage(ctx.storage);
  storage?.setItem(subAccountKey(ctx), JSON.stringify(accounts));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('workspace_sub_accounts_updated', { detail: { workspaceId: ctx.workspaceId } }));
  }
  return accounts;
}

export function loadWorkspaceSubAccounts(ctx: TeamRepositoryContext): WorkspaceSubAccount[] {
  return readSubAccounts(ctx);
}

export function createWorkspaceSubAccount(input: Omit<WorkspaceSubAccount, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>, ctx: TeamRepositoryContext): WorkspaceSubAccount {
  const now = ctx.now ?? Date.now();
  const account: WorkspaceSubAccount = { ...input, id: `subacc_${now}_${Math.random().toString(36).slice(2, 8)}`, workspaceId: ctx.workspaceId, createdAt: now, updatedAt: now };
  writeSubAccounts([account, ...readSubAccounts(ctx)], ctx);
  return account;
}

export function updateWorkspaceSubAccount(id: string, patch: Partial<WorkspaceSubAccount>, ctx: TeamRepositoryContext): WorkspaceSubAccount | null {
  const now = ctx.now ?? Date.now();
  let updated: WorkspaceSubAccount | null = null;
  const accounts = readSubAccounts(ctx).map((a) => {
    if (a.id !== id) return a;
    updated = { ...a, ...patch, id: a.id, workspaceId: a.workspaceId, updatedAt: now };
    return updated;
  });
  writeSubAccounts(accounts, ctx);
  return updated;
}

export function deleteWorkspaceSubAccount(id: string, ctx: TeamRepositoryContext): void {
  writeSubAccounts(readSubAccounts(ctx).filter((a) => a.id !== id), ctx);
}
