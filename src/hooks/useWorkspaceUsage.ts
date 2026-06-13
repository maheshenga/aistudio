import { useEffect, useMemo, useState } from 'react';

import { loadModuleUsage, type ModuleUsage } from '../lib/data/usageRepository';
import { useSaasSession } from '../saas/SaasAuthContext';

export function useWorkspaceUsage(): ModuleUsage {
  const session = useSaasSession();
  const usageContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [usage, setUsage] = useState<ModuleUsage>(() => loadModuleUsage(usageContext));

  useEffect(() => {
    const refreshUsage = () => setUsage(loadModuleUsage(usageContext));
    const handleUsageUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string; userId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== usageContext.workspaceId) return;
      if (detail?.userId && detail.userId !== usageContext.userId) return;
      refreshUsage();
    };

    refreshUsage();
    window.addEventListener('usage_updated', handleUsageUpdated);
    return () => window.removeEventListener('usage_updated', handleUsageUpdated);
  }, [usageContext]);

  return usage;
}
