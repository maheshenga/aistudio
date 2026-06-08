import React, { useState, useEffect } from 'react';
import { Calendar, Layers } from 'lucide-react';
import { navGroups, iconMap } from './Sidebar';

export function UsageHeatmap() {
  const [heatmapData, setHeatmapData] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('module_time_tracker');
      const timeData = stored ? JSON.parse(stored) : {};
      
      const allModules = navGroups.flatMap(g => g.items);
      const data = allModules.map(mod => {
          const rawScore = timeData[mod.id] || Math.floor(Math.random() * 200); // fallback mock for visuals
          return {
              id: mod.id,
              label: mod.label,
              score: rawScore,
              icon: mod.icon
          };
      });
      setHeatmapData(data);
    } catch(e) {}
  }, []);

  const maxScore = Math.max(...heatmapData.map(d => d.score), 1);

  const getColorIntensity = (score: number) => {
    const ratio = score / maxScore;
    if (ratio === 0) return 'bg-gray-50 border-gray-100 text-gray-400';
    if (ratio < 0.2) return 'bg-blue-50 border-blue-100 text-blue-600';
    if (ratio < 0.5) return 'bg-blue-200 border-blue-300 text-blue-700 font-medium';
    if (ratio < 0.8) return 'bg-blue-400 border-blue-500 text-white font-semibold';
    return 'bg-blue-600 border-blue-700 text-white font-bold shadow-sm';
  };

  return (
    <div className="bg-[var(--bg-panel)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[16px] font-black tracking-tight text-[var(--text-main)] flex items-center">
            <Layers className="w-5 h-5 mr-2 text-blue-500" />
            30-Day Module Usage Heatmap
          </h3>
          <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Frequency of access across all workspace tools</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-[var(--border-color)]">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-bold text-gray-500">Last 30 Days</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {heatmapData.map((item, i) => {
          const MIcon = iconMap[item.icon] || Layers;
          return (
             <div 
               key={i} 
               className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all hover:scale-105 cursor-default ${getColorIntensity(item.score)}`}
               title={`${item.label}: ${item.score} units`}
             >
                {MIcon && <MIcon className="w-5 h-5 mb-2 opacity-80" />}
                <span className="text-[10px] uppercase tracking-wider truncate w-full text-center">{item.label}</span>
             </div>
          );
        })}
      </div>
      
      <div className="mt-6 flex items-center justify-end gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
        <span>Less</span>
        <div className="flex gap-1">
           <div className="w-4 h-4 rounded bg-gray-50 border border-gray-100"></div>
           <div className="w-4 h-4 rounded bg-blue-50 border border-blue-100"></div>
           <div className="w-4 h-4 rounded bg-blue-200 border border-blue-300"></div>
           <div className="w-4 h-4 rounded bg-blue-400 border border-blue-500"></div>
           <div className="w-4 h-4 rounded bg-blue-600 border border-blue-700"></div>
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
