import type { AuthSession, WorkspaceRole } from '../../saas/types';
import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';

export type WorkspaceMemberStatus = 'active' | 'inactive' | 'invited' | 'suspended';

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  department: string;
  status: WorkspaceMemberStatus;
  joinedAt: number;
  updatedAt: number;
  lastActiveAt?: number;
  metadata: Record<string, unknown>;
}

export interface WorkspaceMemberInput {
  userId?: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  department?: string;
  status?: WorkspaceMemberStatus;
  joinedAt?: number;
  lastActiveAt?: number;
  metadata?: Record<string, unknown>;
}

export interface WorkspaceMemberRepositoryContext {
  workspaceId: string;
  storage?: StorageLike | null;
  now?: number;
}

export const WORKSPACE_MEMBER_STORAGE_PREFIX = 'aistudio_workspace_members';

const WORKSPACE_ROLES: readonly WorkspaceRole[] = ['owner', 'admin', 'operator', 'finance', 'viewer'];
const WORKSPACE_MEMBER_STATUSES: readonly WorkspaceMemberStatus[] = ['active', 'inactive', 'invited', 'suspended'];

function storageKey(context: WorkspaceMemberRepositoryContext): string {
  return `${WORKSPACE_MEMBER_STORAGE_PREFIX}:${context.workspaceId}`;
}

function isWorkspaceRole(role: unknown): role is WorkspaceRole {
  return typeof role === 'string' && WORKSPACE_ROLES.includes(role as WorkspaceRole);
}

function isWorkspaceMemberStatus(status: unknown): status is WorkspaceMemberStatus {
  return typeof status === 'string' && WORKSPACE_MEMBER_STATUSES.includes(status as WorkspaceMemberStatus);
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function slugifyEmail(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'member';
}

function normalizeMember(
  member: Partial<WorkspaceMember>,
  context: WorkspaceMemberRepositoryContext,
): WorkspaceMember {
  const now = context.now ?? Date.now();
  const email = normalizeText(member.email, 'member@example.com').toLowerCase();
  const name = normalizeText(member.name, email.split('@')[0] ?? 'Workspace Member');
  const joinedAt = Number.isFinite(member.joinedAt) ? Number(member.joinedAt) : now;

  return {
    id: String(member.id ?? `member_${now}_${Math.random().toString(36).slice(2, 8)}`),
    userId: normalizeText(member.userId, `user_${slugifyEmail(email)}`),
    workspaceId: context.workspaceId,
    name,
    email,
    role: isWorkspaceRole(member.role) ? member.role : 'viewer',
    department: normalizeText(member.department, 'General'),
    status: isWorkspaceMemberStatus(member.status) ? member.status : 'invited',
    joinedAt,
    updatedAt: Number.isFinite(member.updatedAt) ? Number(member.updatedAt) : now,
    lastActiveAt: Number.isFinite(member.lastActiveAt) ? Number(member.lastActiveAt) : undefined,
    metadata: member.metadata && typeof member.metadata === 'object' && !Array.isArray(member.metadata)
      ? member.metadata
      : {},
  };
}

function readMembers(context: WorkspaceMemberRepositoryContext): WorkspaceMember[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(storageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((member) => normalizeMember(member as Partial<WorkspaceMember>, context));
  } catch {
    return [];
  }
}

function dispatchMembersUpdated(workspaceId: string): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('workspace_members_updated', { detail: { workspaceId } }));
  }
}

function writeMembers(
  members: WorkspaceMember[],
  context: WorkspaceMemberRepositoryContext,
): WorkspaceMember[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = members.map((member) => normalizeMember(member, context));
  storage?.setItem(storageKey(context), JSON.stringify(normalized));
  dispatchMembersUpdated(context.workspaceId);
  return normalized;
}

let memberApiClient: ApiClient = defaultApiClient;
export function __setMemberApiClientForTest(client: ApiClient): void { memberApiClient = client; }

const memberCache = new Map<string, WorkspaceMember[]>(); // key=workspaceId

export async function hydrateWorkspaceMembers(context: WorkspaceMemberRepositoryContext): Promise<void> {
  if (!memberApiClient.configured) return;
  const res = await memberApiClient.get<WorkspaceMember[]>(context.workspaceId, 'members');
  if (res.ok && Array.isArray(res.value)) {
    memberCache.set(
      context.workspaceId,
      res.value.map((m) => normalizeMember(m as Partial<WorkspaceMember>, context)),
    );
    dispatchMembersUpdated(context.workspaceId);
  }
}

export function loadWorkspaceMembers(context: WorkspaceMemberRepositoryContext): WorkspaceMember[] {
  if (memberApiClient.configured) return memberCache.get(context.workspaceId) ?? [];
  return readMembers(context);
}

export function saveWorkspaceMembers(
  members: WorkspaceMember[],
  context: WorkspaceMemberRepositoryContext,
): WorkspaceMember[] {
  if (memberApiClient.configured) {
    const normalized = members.map((member) => normalizeMember(member, context));
    memberCache.set(context.workspaceId, normalized);
    dispatchMembersUpdated(context.workspaceId);
    return normalized;
  }
  return writeMembers(members, context);
}

export function createWorkspaceMember(
  input: WorkspaceMemberInput,
  context: WorkspaceMemberRepositoryContext,
): WorkspaceMember {
  const now = context.now ?? Date.now();
  const member = normalizeMember(
    {
      ...input,
      id: `member_${now}_${Math.random().toString(36).slice(2, 8)}`,
      status: input.status ?? 'invited',
      joinedAt: input.joinedAt ?? now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    },
    context,
  );

  if (memberApiClient.configured) {
    memberCache.set(context.workspaceId, [...(memberCache.get(context.workspaceId) ?? []), member]);
    dispatchMembersUpdated(context.workspaceId);
    void memberApiClient
      .post(context.workspaceId, 'members', {
        userId: member.userId,
        name: member.name,
        email: member.email,
        role: member.role,
        department: member.department,
        status: member.status,
        joinedAt: member.joinedAt,
        lastActiveAt: member.lastActiveAt,
        metadata: member.metadata,
      })
      // Backend enforces unique (workspaceId,userId) and returns `conflict` on duplicate.
      // For MVP we log and keep the optimistic cache entry; signature stays sync, never throws.
      .then((res) => { if (!res.ok) console.error('createWorkspaceMember write-through failed', res); })
      .catch((err) => console.error('createWorkspaceMember write-through failed', err));
    return member;
  }

  writeMembers([...readMembers(context), member], context);
  return member;
}

export function updateWorkspaceMember(
  memberId: string,
  patch: Partial<Omit<WorkspaceMember, 'id' | 'workspaceId' | 'joinedAt'>>,
  context: WorkspaceMemberRepositoryContext,
): WorkspaceMember | null {
  const now = context.now ?? Date.now();
  let updatedMember: WorkspaceMember | null = null;
  const applyPatch = (member: WorkspaceMember): WorkspaceMember => {
    if (member.id !== memberId) return member;
    updatedMember = normalizeMember({ ...member, ...patch, updatedAt: now }, context);
    return updatedMember;
  };

  if (memberApiClient.configured) {
    const current = memberCache.get(context.workspaceId) ?? [];
    memberCache.set(context.workspaceId, current.map(applyPatch));
    dispatchMembersUpdated(context.workspaceId);
    if (updatedMember) {
      void memberApiClient
        .patch(context.workspaceId, `members/${memberId}`, { ...patch })
        .then((res) => { if (!res.ok) console.error('updateWorkspaceMember write-through failed', res); })
        .catch((err) => console.error('updateWorkspaceMember write-through failed', err));
    }
    return updatedMember;
  }

  const updatedMembers = readMembers(context).map(applyPatch);

  writeMembers(updatedMembers, context);
  return updatedMember;
}

export function deleteWorkspaceMembers(
  memberIds: string[],
  context: WorkspaceMemberRepositoryContext,
): WorkspaceMember[] {
  const memberIdSet = new Set(memberIds);
  if (memberApiClient.configured) {
    const remaining = (memberCache.get(context.workspaceId) ?? []).filter((member) => !memberIdSet.has(member.id));
    memberCache.set(context.workspaceId, remaining);
    dispatchMembersUpdated(context.workspaceId);
    for (const id of memberIds) {
      void memberApiClient
        .del(context.workspaceId, `members/${id}`)
        .then((res) => { if (!res.ok) console.error('deleteWorkspaceMembers write-through failed', res); })
        .catch((err) => console.error('deleteWorkspaceMembers write-through failed', err));
    }
    return remaining;
  }
  return writeMembers(readMembers(context).filter((member) => !memberIdSet.has(member.id)), context);
}

export function ensureDemoWorkspaceMembers(
  session: AuthSession,
  options: { storage?: StorageLike | null; now?: number } = {},
): WorkspaceMember[] {
  const context: WorkspaceMemberRepositoryContext = {
    workspaceId: session.workspace.id,
    storage: options.storage,
    now: options.now,
  };
  // When the API is configured, real member data comes from the backend (hydrated into cache).
  // Skip demo seeding entirely and return whatever the cache currently holds.
  if (memberApiClient.configured) {
    return memberCache.get(context.workspaceId) ?? [];
  }
  const existingMembers = readMembers(context);
  if (existingMembers.length > 0) return existingMembers;

  const now = options.now ?? Date.now();
  return writeMembers(
    [
      {
        id: session.membership.id,
        userId: session.user.id,
        workspaceId: session.workspace.id,
        name: session.user.name,
        email: session.user.email,
        role: session.membership.role,
        department: 'Founding Team',
        status: 'active',
        joinedAt: session.membership.joinedAt,
        updatedAt: now,
        lastActiveAt: session.lastActiveAt,
        metadata: { seeded: true, currentUser: true },
      },
      {
        id: 'member_demo_admin_ops',
        userId: 'user_demo_admin_ops',
        workspaceId: session.workspace.id,
        name: 'Operations Admin',
        email: 'ops.admin@example.com',
        role: 'admin',
        department: 'Operations',
        status: 'active',
        joinedAt: now - 86_400_000 * 42,
        updatedAt: now,
        lastActiveAt: now - 60_000 * 30,
        metadata: { seeded: true },
      },
      {
        id: 'member_demo_finance',
        userId: 'user_demo_finance',
        workspaceId: session.workspace.id,
        name: 'Finance Lead',
        email: 'finance.lead@example.com',
        role: 'finance',
        department: 'Finance',
        status: 'active',
        joinedAt: now - 86_400_000 * 28,
        updatedAt: now,
        lastActiveAt: now - 60_000 * 90,
        metadata: { seeded: true },
      },
      {
        id: 'member_demo_operator',
        userId: 'user_demo_operator',
        workspaceId: session.workspace.id,
        name: 'Campaign Operator',
        email: 'operator@example.com',
        role: 'operator',
        department: 'Marketing',
        status: 'active',
        joinedAt: now - 86_400_000 * 18,
        updatedAt: now,
        lastActiveAt: now - 60_000 * 12,
        metadata: { seeded: true },
      },
      {
        id: 'member_demo_viewer',
        userId: 'user_demo_viewer',
        workspaceId: session.workspace.id,
        name: 'External Viewer',
        email: 'viewer@example.com',
        role: 'viewer',
        department: 'Partners',
        status: 'invited',
        joinedAt: now - 86_400_000 * 3,
        updatedAt: now,
        metadata: { seeded: true },
      },
    ],
    context,
  );
}
