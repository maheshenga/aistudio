import React, { useEffect, useState } from 'react';
import { navGroups } from './Sidebar';
import { Clock, Star, Zap, Activity } from 'lucide-react';
import { ModuleId } from '../types';

export function FrequentWorkflowsWidget() {
  const [topModules, setTopModules] = useState<{ id: string; name: string; time: number; icon: any }[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('module_time_tracker');
      if (stored) {
        const data = JSON.parse(stored);
        const sorted = Object.entries(data)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([id, time]) => {
            // Find module info
            let name = id;
            let icon = 'Activity';
            for (const group of navGroups) {
              const item = group.items.find((i: any) => i.id === id);
              if (item) {
                name = item.label;
                icon = item.icon;
                break;
              }
            }
            return { id, name, time: time as number, icon };
          })
          .filter(t => t.id !== 'dashboard' && t.id !== 'activity_logs')
          .slice(0, 3);
          
        setTopModules(sorted);
      }
    } catch {}
  }, []);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.floor(seconds)}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
    return `${(seconds / 3600).toFixed(1)}小时`;
  };

  const getIcon = (iconName: string) => {
    const icons: any = { Activity, Star, Zap, Clock };
    const Icon = icons[iconName] || Activity;
    return <Icon className="w-5 h-5" />;
  };

  if (topModules.length === 0) return null;

  return (
    <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden flex flex-col p-[var(--spacing-lg)] h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[16px] font-black text-[var(--text-main)] flex items-center border-l-4 border-emerald-500 pl-3">
          <Clock className="w-5 h-5 mr-1.5 text-emerald-500" /> 最常使用工作流
        </h2>
        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">按停留时长估算</span>
      </div>
      
      <div className="flex-1 flex flex-col justify-center space-y-3">
        {topModules.map((mod, index) => (
          <div key={mod.id} className="group flex items-center justify-between p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--bg-app)] hover:bg-[var(--bg-hover)] transition-colors">
            <div className="flex items-center">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-gray-200 text-gray-600' : 'bg-orange-100 text-orange-600'}`}>
                 <span className="font-bold text-sm">#{index + 1}</span>
               </div>
               <div>
                  <div className="text-[13px] font-bold text-[var(--text-main)] group-hover:text-emerald-600 transition-colors cursor-pointer">{mod.name}</div>
                  <div className="text-[11px] text-[var(--text-muted)] font-medium mt-0.5">累计投入 {formatTime(mod.time)}</div>
               </div>
            </div>
            <button 
              onClick={() => {
                // Pin module
                try {
                  const stored = localStorage.getItem('pinned_modules');
                  let pins = stored ? JSON.parse(stored) : [];
                  if (!pins.includes(mod.id)) {
                    pins.push(mod.id);
                    localStorage.setItem('pinned_modules', JSON.stringify(pins));
                    import('./Toast').then(({ toast }) => toast(`已将 ${mod.name} 固钉到顶部`, 'success'));
                    // Dispatch an event to refresh pins in App
                    window.dispatchEvent(new Event('app:restore-preset'));
                  }
                } catch(e) {}
              }}
              className="text-white hover:text-white bg-emerald-600 hover:bg-emerald-700 p-1.5 rounded-[var(--radius-md)] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              title="固钉到顶部"
            >
              <Zap className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
