import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Building2, LogIn, ShieldCheck, Loader2, UserPlus } from 'lucide-react';

import { logAuditEvent } from '../lib/data/auditLogRepository';
import { setAuthFailureHandler } from '../lib/data/apiClient';
import {
  apiLogin,
  apiLogout,
  apiMe,
  apiRefresh,
  apiRegister,
  type ApiMembership,
  type AuthUser,
} from '../lib/data/authApi';
import { appAuthTokens } from './authTokenStore';
import { loadAuthSession } from './localAuthSession';
import type { AuthSession, WorkspaceRole } from './types';

/**
 * AUTH-07/08: E2E-only auth bypass. Real production auth is JWT-via-API ONLY
 * (apiLogin/apiRegister below). This flag is never set in production builds; it
 * exists so the local-backend browser smoke (which runs vite with no API) can
 * adopt a pre-seeded `aistudio_auth_session` fixture instead of calling the API.
 * Guarded by an explicit env var so a normal `npm run dev` is unaffected.
 */
const E2E_AUTH_BYPASS = (() => {
  try { return (import.meta as any).env?.VITE_E2E_AUTH_BYPASS === 'true'; } catch { return false; }
})();

interface SaasAuthContextValue {
  session: AuthSession | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateWorkspacePlan: (plan: AuthSession['workspace']['plan']) => void;
}

function deriveSlug(workspaceName: string, workspaceId: string): string {
  const slug = workspaceName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return slug || workspaceId;
}

function mapToSession(payload: { user: AuthUser; memberships: ApiMembership[] }): AuthSession {
  const { user, memberships } = payload;
  if (!memberships || memberships.length === 0) {
    throw new Error('当前用户没有可用的工作区成员资格');
  }
  const m = memberships[0];
  const now = Date.now();
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarLabel: user.avatarLabel ?? undefined,
    },
    workspace: {
      id: m.workspaceId,
      name: m.workspaceName,
      slug: deriveSlug(m.workspaceName, m.workspaceId),
      plan: 'free',
      createdAt: now,
    },
    membership: {
      id: `membership_${m.workspaceId}`,
      userId: user.id,
      workspaceId: m.workspaceId,
      role: m.role as WorkspaceRole,
      joinedAt: now,
    },
    issuedAt: now,
    lastActiveAt: now,
  };
}

const SaasAuthContext = createContext<SaasAuthContextValue | null>(null);

export function SaasAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    setAuthFailureHandler(() => setSession(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // AUTH-07: E2E bypass — adopt a pre-seeded local session without the API.
      if (E2E_AUTH_BYPASS) {
        const seeded = loadAuthSession();
        if (seeded) {
          if (!cancelled) { setSession(seeded); setInitializing(false); }
          return;
        }
      }
      const refresh = appAuthTokens.getRefresh();
      if (!refresh) {
        if (!cancelled) setInitializing(false);
        return;
      }
      try {
        const tokens = await apiRefresh(refresh);
        if (!tokens) throw new Error('refresh failed');
        appAuthTokens.set(tokens);
        const me = await apiMe(tokens.accessToken);
        if (!cancelled) setSession(mapToSession(me));
      } catch {
        appAuthTokens.clear();
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const value = useMemo<SaasAuthContextValue>(() => ({
    session,
    initializing,
    signIn: async (email, password) => {
      const result = await apiLogin(email, password);
      appAuthTokens.set({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      const me = await apiMe(result.accessToken);
      const nextSession = mapToSession(me);
      logAuditEvent({
        action: 'workspace_sign_in',
        targetType: 'workspace',
        targetId: nextSession.workspace.id,
        metadata: { source: 'jwt_login' },
      }, { session: nextSession });
      setSession(nextSession);
    },
    register: async (email, password, name) => {
      const result = await apiRegister(email, password, name);
      appAuthTokens.set({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      const me = await apiMe(result.accessToken);
      const nextSession = mapToSession(me);
      logAuditEvent({
        action: 'workspace_sign_in',
        targetType: 'workspace',
        targetId: nextSession.workspace.id,
        metadata: { source: 'jwt_register' },
      }, { session: nextSession });
      setSession(nextSession);
    },
    signOut: async () => {
      if (session) {
        logAuditEvent({
          action: 'workspace_sign_out',
          targetType: 'workspace',
          targetId: session.workspace.id,
        }, { session });
      }
      const refresh = appAuthTokens.getRefresh();
      const access = appAuthTokens.getAccess();
      if (access && refresh) {
        await apiLogout(access, refresh).catch(() => undefined);
      }
      appAuthTokens.clear();
      setSession(null);
    },
    updateWorkspacePlan: (plan) => {
      if (!session || session.workspace.plan === plan) return;
      setSession({
        ...session,
        workspace: { ...session.workspace, plan },
        lastActiveAt: Date.now(),
      });
    },
  }), [session, initializing]);

  return (
    <SaasAuthContext.Provider value={value}>
      {children}
    </SaasAuthContext.Provider>
  );
}

export function useSaasAuth(): SaasAuthContextValue {
  const value = useContext(SaasAuthContext);
  if (!value) {
    throw new Error('useSaasAuth must be used inside SaasAuthProvider');
  }
  return value;
}

export function useSaasSession(): AuthSession {
  const { session } = useSaasAuth();
  if (!session) {
    throw new Error('useSaasSession requires an authenticated workspace');
  }
  return session;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, initializing, signIn, register } = useSaasAuth();
  const [mode, setMode] = useState<'signIn' | 'register'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (initializing) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] shadow-xl p-8 flex items-center justify-center gap-3 text-sm text-[var(--text-muted)]">
          <Loader2 className="w-5 h-5 animate-spin" />
          正在恢复会话…
        </div>
      </div>
    );
  }

  if (session) {
    return <>{children}</>;
  }

  const inputClass = 'w-full rounded-[var(--radius-lg)] border border-[var(--border-color)] px-3 py-2 text-sm bg-[var(--bg-app)] text-[var(--text-main)]';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await register(email, password, name);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] shadow-xl p-8">
        <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-blue-50 text-[var(--color-primary)] flex items-center justify-center mb-6">
          <Building2 className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">
          {mode === 'register' ? '创建 AI 工作空间' : '进入 AI 工作空间'}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-3 leading-6">
          {mode === 'register'
            ? '注册后会自动为你创建工作区，并以 owner 角色加入。'
            : '使用邮箱与密码登录你的工作区。'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">姓名</label>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="你的名字"
                autoComplete="name"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">邮箱</label>
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">密码</label>
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
            />
          </div>

          {error && (
            <div className="text-xs text-red-600 leading-5">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:bg-blue-700 text-white rounded-[var(--radius-lg)] px-4 py-3 text-sm font-bold shadow-sm transition-colors disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'register' ? (
              <UserPlus className="w-4 h-4" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {mode === 'register' ? '注册并进入' : '登录'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setMode(mode === 'register' ? 'signIn' : 'register'); setError(null); }}
          className="mt-4 w-full text-center text-xs text-[var(--color-primary)] hover:underline"
        >
          {mode === 'register' ? '已有账号？去登录' : '还没有账号？去注册'}
        </button>

        <div className="mt-5 flex items-start gap-2 text-xs text-[var(--text-muted)] leading-5">
          <ShieldCheck className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          <span>登录后所有审计日志会带上 workspaceId、actor 和角色信息。</span>
        </div>
      </div>
    </div>
  );
}
