import type { AuthSession } from './types';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const AUTH_SESSION_STORAGE_KEY = 'aistudio_auth_session';

function getDefaultStorage(): StorageLike | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage;
}

export function createDemoAuthSession(options: { now?: number } = {}): AuthSession {
  const now = options.now ?? Date.now();

  return {
    user: {
      id: 'user_demo_maheshenga',
      email: 'maheshenga@example.com',
      name: 'Maheshenga',
      avatarLabel: 'M',
    },
    workspace: {
      id: 'workspace_demo_maheshenga',
      name: 'Maheshenga AI 工作空间',
      slug: 'maheshenga-ai',
      plan: 'pro',
      createdAt: now,
    },
    membership: {
      id: 'membership_demo_owner',
      userId: 'user_demo_maheshenga',
      workspaceId: 'workspace_demo_maheshenga',
      role: 'owner',
      joinedAt: now,
    },
    issuedAt: now,
    lastActiveAt: now,
  };
}

export function saveAuthSession(session: AuthSession, storage: StorageLike | null = getDefaultStorage()): void {
  storage?.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function loadAuthSession(storage: StorageLike | null = getDefaultStorage()): AuthSession | null {
  const raw = storage?.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as AuthSession;
    if (!session.user?.id || !session.workspace?.id || !session.membership?.role) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearAuthSession(storage: StorageLike | null = getDefaultStorage()): void {
  storage?.removeItem(AUTH_SESSION_STORAGE_KEY);
}
