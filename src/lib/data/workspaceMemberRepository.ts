import type { AuthSession, WorkspaceRole } from '../../saas/types';
import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

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

function writeMembers(
  members: WorkspaceMember[],
  context: WorkspaceMemberRepositoryContext,
): WorkspaceMember[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = members.map((member) => normalizeMember(member, context));
  storage?.setItem(storageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('workspace_members_updated', { detail: { workspaceId: context.workspaceId } }));
  }
  return normalized;
}

export function loadWorkspaceMembers(context: WorkspaceMemberRepositoryContext): WorkspaceMember[] {
  return readMembers(context);
}

export function saveWorkspaceMembers(
  members: WorkspaceMember[],
  context: WorkspaceMemberRepositoryContext,
): WorkspaceMember[] {
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
  const updatedMembers = readMembers(context).map((member) => {
    if (member.id !== memberId) return member;
    updatedMember = normalizeMember({ ...member, ...patch, updatedAt: now }, context);
    return updatedMember;
  });

  writeMembers(updatedMembers, context);
  return updatedMember;
}

export function deleteWorkspaceMembers(
  memberIds: string[],
  context: WorkspaceMemberRepositoryContext,
): WorkspaceMember[] {
  const memberIdSet = new Set(memberIds);
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
