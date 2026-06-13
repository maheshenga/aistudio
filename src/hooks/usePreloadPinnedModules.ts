import { useEffect } from 'react';
import { ModuleId } from '../types';
import { getProductFeature } from '../product/registry';

const preloadedModules = new Set<ModuleId>();

export function usePreloadPinnedModules(pinnedModules: ModuleId[]) {
  useEffect(() => {
    try {
      pinnedModules.forEach(moduleId => {
        if (moduleId === 'dashboard' || preloadedModules.has(moduleId)) return;
        const feature = getProductFeature(moduleId);
        if (!feature || !feature.visible) return;

        preloadedModules.add(moduleId);
        window.dispatchEvent(new CustomEvent('module_preload_requested', {
          detail: {
            moduleId,
            componentKey: feature.componentKey,
            dataDependencies: feature.dataDependencies,
          },
        }));
      });
    } catch (e) {
      console.warn('Failed to preload pinned modules:', e);
    }
  }, [pinnedModules]);
}
