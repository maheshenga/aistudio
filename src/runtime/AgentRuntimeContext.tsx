import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import type { AgentRuntimeProvider } from './agentRuntimeTypes.ts';
import { detectDesktopAgentBridge } from './desktopAgentBridge.ts';
import { createMulticaAgentRuntimeProvider } from './multicaAgentRuntimeProvider.ts';
import {
  readRuntimeEnvironment,
  readWorkspaceRuntimeSettings,
  resolveRuntimeMode,
} from './runtimeMode.ts';
import { createWebMockAgentRuntimeProvider } from './webMockAgentRuntimeProvider.ts';
import { useSaasSession } from '../saas/SaasAuthContext';

const AgentRuntimeContext = createContext<AgentRuntimeProvider | null>(null);

function createDefaultAgentRuntimeProvider(context: { workspaceId: string; userId: string }): AgentRuntimeProvider {
  const runtimeSettings = readWorkspaceRuntimeSettings({
    workspaceId: context.workspaceId,
    userId: context.userId,
  });
  const env = readRuntimeEnvironment(undefined, runtimeSettings);
  const bridge = detectDesktopAgentBridge();
  const mode = resolveRuntimeMode(env, runtimeSettings, bridge);
  if (mode === 'web') return createWebMockAgentRuntimeProvider();
  return createMulticaAgentRuntimeProvider({
    mode,
    env,
    bridge,
  });
}

export function AgentRuntimeContextProvider({
  children,
  provider,
}: {
  children: React.ReactNode;
  provider?: AgentRuntimeProvider;
}) {
  const session = useSaasSession();
  const [settingsRevision, setSettingsRevision] = useState(0);

  useEffect(() => {
    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string; userId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      if (detail?.userId && detail.userId !== session.user.id) return;
      setSettingsRevision((revision) => revision + 1);
    };

    window.addEventListener('settings_updated', handleSettingsUpdated);
    window.addEventListener('storage', handleSettingsUpdated);
    return () => {
      window.removeEventListener('settings_updated', handleSettingsUpdated);
      window.removeEventListener('storage', handleSettingsUpdated);
    };
  }, [session.user.id, session.workspace.id]);

  const runtimeProvider = useMemo(
    () => provider ?? createDefaultAgentRuntimeProvider({
      workspaceId: session.workspace.id,
      userId: session.user.id,
    }),
    [provider, session.user.id, session.workspace.id, settingsRevision],
  );

  return <AgentRuntimeContext.Provider value={runtimeProvider}>{children}</AgentRuntimeContext.Provider>;
}

export function useAgentRuntime(): AgentRuntimeProvider {
  const provider = useContext(AgentRuntimeContext);
  if (!provider) {
    throw new Error('useAgentRuntime must be used within AgentRuntimeContextProvider');
  }
  return provider;
}
