import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, Clock } from 'lucide-react';

const data = [
  { time: '10:00', historical: 120, projected: null },
  { time: '10:30', historical: 180, projected: null },
  { time: '11:00', historical: 250, projected: null },
  { time: '11:30', historical: 220, projected: null },
  { time: '12:00', historical: 350, projected: 350 },
  { time: '12:30', historical: null, projected: 410 },
  { time: '13:00', historical: null, projected: 550 },
  { time: '13:30', historical: null, projected: 820 },
  { time: '14:00', historical: null, projected: 700 },
];

export function LatencyProjectionChart() {
  return (
    <div className="w-full bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] shadow-sm p-[var(--spacing-lg)] mb-[var(--spacing-xl)] mt-6">
       <div className="mb-[var(--spacing-md)] flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-black text-[var(--text-main)] leading-tight flex items-center">
               <Clock className="icon-sm mr-2 text-indigo-600" /> 
               延迟趋势预测 (Latency Projection)
            </h3>
            <p className="text-[12px] text-[var(--text-muted)] font-medium mt-1">基于当前积压的任务队列与历史负载曲线的性能预估模型。</p>
          </div>
          <div className="flex items-center space-x-4 text-[12px] font-bold">
             <div className="flex items-center text-gray-600">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-1.5 opacity-80"></span>
                历史负载
             </div>
             <div className="flex items-center text-indigo-700">
                <span className="w-3 h-3 border-2 border-indigo-400 border-dashed rounded-full mr-1.5"></span>
                预测拥堵点
             </div>
          </div>
       </div>
       <div className="h-64 w-full">
         <ResponsiveContainer width="100%" height="100%">
           <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
             <defs>
               <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                 <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
               </linearGradient>
               <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                 <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
               </linearGradient>
             </defs>
             <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
             <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
             <Tooltip 
               contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
               labelStyle={{ fontWeight: 'bold', color: '#374151' }}
             />
             <ReferenceLine x="12:00" stroke="#9CA3AF" strokeDasharray="3 3" label={{ position: 'top', value: '当前时间点', fill: '#6B7280', fontSize: 10, fontWeight: 'bold' }} />
             <Area type="monotone" dataKey="historical" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorHist)" name="历史延迟 (ms)" />
             <Area type="monotone" dataKey="projected" stroke="#818cf8" strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorProj)" name="预测延迟 (ms)" />
           </AreaChart>
         </ResponsiveContainer>
       </div>
    </div>
  );
}
