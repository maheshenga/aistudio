import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Cpu, Database, Server } from 'lucide-react';

export function SystemResources() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    // Initial data
    const initialData = Array.from({ length: 20 }, (_, i) => ({
      time: `-${20 - i}s`,
      cpu: 30 + Math.random() * 20,
      memory: 50 + Math.random() * 10,
      api: 10 + Math.random() * 30
    }));
    setData(initialData);

    const interval = setInterval(() => {
      setData(prev => {
        const newData = [...prev.slice(1)];
        newData.push({
          time: '现在',
          cpu: 30 + Math.random() * 30, // Random CPU
          memory: 50 + Math.random() * 10, // More stable memory
          api: Math.max(0, prev[prev.length - 1].api + (Math.random() * 20 - 10)) // somewhat continuous API
        });
        // Update labels
        return newData.map((d, i) => ({ ...d, time: i === newData.length - 1 ? '现在' : `-${newData.length - 1 - i}s` }));
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] flex flex-col hover:shadow-md transition-all h-full">
      <div className="flex justify-between items-center mb-[var(--spacing-md)] border-b border-[var(--border-color)] pb-4">
        <h2 className="text-lg font-black text-[var(--text-main)] tracking-tight flex items-center">
          <Server className="icon-md mr-2 text-[var(--color-primary)]" /> 
          系统资源监控 (System Resources)
        </h2>
        <div className="flex space-x-4">
           <div className="flex items-center text-[11px] font-bold text-[var(--text-muted)]">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-1.5 animate-pulse"></span> CPU
           </div>
           <div className="flex items-center text-[11px] font-bold text-[var(--text-muted)]">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 mr-1.5 animate-pulse"></span> Memory
           </div>
           <div className="flex items-center text-[11px] font-bold text-[var(--text-muted)]">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 mr-1.5 animate-pulse"></span> API Requests
           </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-[var(--spacing-md)] mb-[var(--spacing-md)]">
        <div className="bg-slate-50 rounded-[var(--radius-lg)] p-3 border border-slate-100">
          <div className="flex items-center justify-between text-slate-500 mb-1">
             <Cpu className="icon-sm" />
             <span className="text-[10px] uppercase font-bold tracking-wider">CPU Core</span>
          </div>
          <p className="text-lg font-black text-slate-800">{data.length ? data[data.length-1].cpu.toFixed(1) : 0}%</p>
        </div>
        <div className="bg-indigo-50 rounded-[var(--radius-lg)] p-3 border border-indigo-100">
          <div className="flex items-center justify-between text-indigo-500 mb-1">
             <Database className="icon-sm" />
             <span className="text-[10px] uppercase font-bold tracking-wider">RAM Usage</span>
          </div>
          <p className="text-lg font-black text-indigo-800">{data.length ? data[data.length-1].memory.toFixed(1) : 0}%</p>
        </div>
        <div className="bg-pink-50 rounded-[var(--radius-lg)] p-3 border border-pink-100">
          <div className="flex items-center justify-between text-pink-500 mb-1">
             <Activity className="icon-sm" />
             <span className="text-[10px] uppercase font-bold tracking-wider">API Load</span>
          </div>
          <p className="text-lg font-black text-pink-800">{data.length ? Math.floor(data[data.length-1].api) : 0} req/s</p>
        </div>
      </div>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorApi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} dy={10} minTickGap={20} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} domain={[0, 100]} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
            />
            <Area type="monotone" dataKey="cpu" name="CPU (%)" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" isAnimationActive={false} />
            <Area type="monotone" dataKey="memory" name="Memory (%)" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorMem)" isAnimationActive={false} />
            <Area type="monotone" dataKey="api" name="API (req/s)" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorApi)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
