import React, { useMemo } from 'react';
import { Compass, ArrowRight, Zap, Target, Star } from 'lucide-react';
import { ModuleId } from '../types';
import { getProductNavGroupsForRole } from '../product/registry';
import { iconMap } from '../product/icons';
import { useWorkspaceUsage } from '../hooks/useWorkspaceUsage';
import { useSaasSession } from '../saas/SaasAuthContext';

export function RecommendedModulesWidget({ onNavigate }: { onNavigate?: (id: ModuleId) => void }) {
  const session = useSaasSession();
  const timeData = useWorkspaceUsage();
  const accessibleModules = useMemo(
    () => getProductNavGroupsForRole(session.membership.role).flatMap((group) => group.items),
    [session.membership.role],
  );
  const recommendations = useMemo(() => {
      const allModules = accessibleModules;

      // Modules that haven't been visited or have very low time
      const unseen = allModules.filter(m => (timeData[m.id] || 0) < 10);

      // Just pick top 3 seemingly random but consistent for the user
      const selected = [...unseen].sort(() => 0.5 - Math.random()).slice(0, 3);

      if (selected.length < 3) {
         selected.push(...allModules.slice(0, 3 - selected.length));
      }
      return selected;
  }, [accessibleModules, timeData]);

  return (
    <div className="bg-[var(--bg-panel)] p-[var(--spacing-lg)] rounded-[24px] border border-[var(--border-color)] shadow-sm h-full max-h-[300px] flex flex-col">
       <div className="flex justify-between items-center mb-5">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center mr-3 hidden sm:flex">
                <Compass className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[var(--text-main)] tracking-tight">Recommended for You</h3>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Explore unseen workflow tools</p>
            </div>
          </div>
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
          {recommendations.map((mod, i) => {
             const Icon = iconMap[mod.icon] || Target;
             return (
               <div 
                 key={i} 
                 onClick={() => onNavigate && onNavigate(mod.id as ModuleId)}
                 className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-color)] hover:border-amber-300 hover:bg-amber-50/30 group cursor-pointer transition-all"
               >
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-[var(--bg-app)] rounded-lg text-amber-600 group-hover:scale-110 transition-transform">
                        <Icon className="w-4 h-4" />
                     </div>
                     <div>
                        <h4 className="text-[13px] font-bold text-[var(--text-main)]">{mod.label}</h4>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5 max-w-[120px] truncate">{mod.id} module</p>
                     </div>
                  </div>
                  <button className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-500 transition-colors shadow-sm">
                     <ArrowRight className="w-3 h-3" />
                  </button>
               </div>
             );
          })}
       </div>
    </div>
  );
}
