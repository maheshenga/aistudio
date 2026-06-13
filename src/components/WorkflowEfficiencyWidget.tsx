import React, { useMemo } from 'react';
import { LineChart, Clock, TrendingUp, Sparkles, BrainCircuit } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useWorkspaceUsage } from '../hooks/useWorkspaceUsage';

export function WorkflowEfficiencyWidget() {
  const moduleTimes = useWorkspaceUsage();
  const data = useMemo(
    () => Object.entries(moduleTimes)
      .map(([key, value]) => ({ name: key, value: value ?? 0 }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5),
    [moduleTimes],
  );
  const totalTime = useMemo(
    () => Object.values(moduleTimes).reduce((sum, value) => sum + (value ?? 0), 0),
    [moduleTimes],
  );

  const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

  const getImprovementSuggestion = () => {
     if (data.length === 0) return "Not enough data collected yet. Keep working!";
     const topActivity = data[0];
     return `You spend ${Math.round((topActivity.value / totalTime) * 100)}% of your time in ${topActivity.name}. Let AI Copilot automate repetitive actions there to boost your efficiency.`;
  };

  return (
    <div className="bg-[var(--bg-panel)] p-[var(--spacing-lg)] rounded-[24px] border border-[var(--border-color)] shadow-sm h-full flex flex-col">
       <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-[15px] font-bold text-[var(--text-main)] tracking-tight flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-indigo-500" /> Workflow Efficiency
            </h3>
            <p className="text-[12px] text-[var(--text-muted)] mt-1">Live time distribution</p>
          </div>
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full">
            <LineChart className="w-4 h-4" />
          </div>
       </div>

       {data.length > 0 ? (
         <div className="flex-1 flex flex-col justify-between">
           <div className="h-[140px] w-full">
             <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
               <PieChart>
                 <Pie
                   data={data}
                   innerRadius={45}
                   outerRadius={65}
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {data.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip formatter={(val: number) => [`${Math.round(val / 60)} mins`, 'Time Spent']} />
               </PieChart>
             </ResponsiveContainer>
           </div>
           
           <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 p-4 rounded-xl mt-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                 <BrainCircuit className="w-12 h-12 text-indigo-600" />
              </div>
              <div className="flex items-center text-xs font-bold text-indigo-800 mb-1">
                 <Sparkles className="w-3.5 h-3.5 mr-1" /> AI Suggestion
              </div>
              <p className="text-xs text-indigo-700/80 leading-relaxed max-w-[90%]">
                 {getImprovementSuggestion()}
              </p>
           </div>
         </div>
       ) : (
         <div className="flex-1 flex items-center justify-center flex-col text-gray-400">
           <Clock className="w-8 h-8 mb-2 opacity-50" />
           <p className="text-sm font-medium">Tracking time spent...</p>
         </div>
       )}
    </div>
  );
}
