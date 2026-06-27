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

/**
 * AUTH-08: TEST/E2E FIXTURE ONLY — not part of the production auth path.
 * Production auth is JWT-via-API (see src/saas/SaasAuthContext.tsx). These
 * helpers back (a) the standalone repository/contract tests and (b) the
 * VITE_E2E_AUTH_BYPASS browser smoke, which seeds AUTH_SESSION_STORAGE_KEY so
 * the local-backend (no-API) build can render the authenticated shell.
 * Do NOT call these from application code.
 */
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
