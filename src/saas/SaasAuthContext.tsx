import React, { createContext, useContext, useMemo, useState } from 'react';
import { Building2, LogIn, ShieldCheck } from 'lucide-react';

import { logAuditEvent } from '../lib/data/auditLogRepository';
import {
  clearAuthSession,
  createDemoAuthSession,
  loadAuthSession,
  saveAuthSession,
} from './localAuthSession';
import type { AuthSession } from './types';

interface SaasAuthContextValue {
  session: AuthSession | null;
  signInDemo: () => void;
  signOut: () => void;
  updateWorkspacePlan: (plan: AuthSession['workspace']['plan']) => void;
}

const SaasAuthContext = createContext<SaasAuthContextValue | null>(null);

export function SaasAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession());

  const value = useMemo<SaasAuthContextValue>(() => ({
    session,
    signInDemo: () => {
      const nextSession = createDemoAuthSession();
      saveAuthSession(nextSession);
      logAuditEvent({
        action: 'workspace_sign_in',
        targetType: 'workspace',
        targetId: nextSession.workspace.id,
        metadata: { source: 'demo_local_auth' },
      }, { session: nextSession });
      setSession(nextSession);
    },
    signOut: () => {
      if (session) {
        logAuditEvent({
          action: 'workspace_sign_out',
          targetType: 'workspace',
          targetId: session.workspace.id,
        }, { session });
      }
      clearAuthSession();
      setSession(null);
    },
    updateWorkspacePlan: (plan) => {
      if (!session || session.workspace.plan === plan) return;
      const nextSession: AuthSession = {
        ...session,
        workspace: {
          ...session.workspace,
          plan,
        },
        lastActiveAt: Date.now(),
      };
      saveAuthSession(nextSession);
      setSession(nextSession);
    },
  }), [session]);

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
  const { session, signInDemo } = useSaasAuth();

  if (session) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] shadow-xl p-8">
        <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-blue-50 text-[var(--color-primary)] flex items-center justify-center mb-6">
          <Building2 className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">
          进入 AI 工作空间
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-3 leading-6">
          SaaS 模式需要先绑定用户、工作区和成员角色。当前提供本地 Demo 工作区，后续可替换为正式 OAuth/Firebase Auth。
        </p>
        <button
          onClick={signInDemo}
          className="mt-8 w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:bg-blue-700 text-white rounded-[var(--radius-lg)] px-4 py-3 text-sm font-bold shadow-sm transition-colors"
        >
          <LogIn className="w-4 h-4" />
          使用 Demo 工作区登录
        </button>
        <div className="mt-5 flex items-start gap-2 text-xs text-[var(--text-muted)] leading-5">
          <ShieldCheck className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          <span>登录后所有审计日志会带上 workspaceId、actor 和角色信息。</span>
        </div>
      </div>
    </div>
  );
}
