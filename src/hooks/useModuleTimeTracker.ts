import { useEffect, useRef } from 'react';
import type { ModuleId } from '../types';
import { incrementModuleUsage } from '../lib/data/usageRepository';
import { useSaasSession } from '../saas/SaasAuthContext';

export function useModuleTimeTracker(activeModule: ModuleId) {
  const session = useSaasSession();
  const currentModule = useRef(activeModule);
  const startTime = useRef(Date.now());

  useEffect(() => {
    // Save previous module time
    const saveTime = () => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime.current) / 1000);
      
      if (elapsedSeconds > 0) {
        try {
          incrementModuleUsage(currentModule.current, elapsedSeconds, {
            workspaceId: session.workspace.id,
            userId: session.user.id,
          });
        } catch (e) {
          console.error("Failed to save module time", e);
        }
      }
    };

    saveTime();
    
    // Switch to new module
    currentModule.current = activeModule;
    startTime.current = Date.now();

    // Also save periodically or on unmount
    const interval = setInterval(saveTime, 60000); // save every minute
    
    return () => {
      clearInterval(interval);
      saveTime();
    };
  }, [activeModule, session.user.id, session.workspace.id]);
}
