import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell } from 'recharts';
import { Calendar } from 'lucide-react';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hours = Array.from({ length: 24 }, (_, i) => i);

export function AgentWeeklyHeatmap() {
  const data = [];
  
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      // Simulate higher activity during working hours and weekdays
      let baseVolume = (hour >= 9 && hour <= 18) ? Math.random() * 80 + 20 : Math.random() * 20;
      if (day >= 5) baseVolume = baseVolume * 0.3; // Weekend drop
      
      data.push({
        x: hour,
        y: day,
        z: Math.round(baseVolume * 10), // volume of requests
      });
    }
  }

  return (
    <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] mb-[var(--spacing-xl)] overflow-hidden">
      <div className="flex items-center justify-between mb-[var(--spacing-md)]">
         <h2 className="text-lg font-black text-[var(--text-main)] tracking-tight flex items-center">
            <Calendar className="w-[18px] h-[18px] mr-2 text-indigo-500" /> 
            Weekly Agent Workload Heatmap
         </h2>
         <div className="flex items-center gap-[var(--spacing-md)] text-xs font-bold text-[var(--text-muted)] bg-gray-50 px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--border-color)]">
           <span>Intensity:</span>
           <div className="flex items-center gap-1">
             <div className="w-3 h-3 rounded-sm bg-indigo-100"></div>
             <span>Low</span>
           </div>
           <div className="flex items-center gap-1">
             <div className="w-3 h-3 rounded-sm bg-indigo-300"></div>
             <span>Med</span>
           </div>
           <div className="flex items-center gap-1">
             <div className="w-3 h-3 rounded-sm bg-indigo-600"></div>
             <span>High</span>
           </div>
         </div>
      </div>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Hour" 
              domain={[0, 23]} 
              tickCount={24}
              tickFormatter={(tick) => `${tick}h`}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 'bold' }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Day" 
              domain={[0, 6]}
              reversed
              tickCount={7}
              tickFormatter={(tick) => days[tick]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#4B5563', fontWeight: 'black' }}
              width={40}
            />
            <ZAxis 
              type="number" 
              dataKey="z" 
              range={[20, 400]} 
              name="Request Volume" 
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3', stroke: '#E5E7EB' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-gray-900 border border-gray-700 text-white p-3 rounded-[var(--radius-lg)] shadow-xl z-50">
                      <p className="font-bold text-sm mb-1">{`${days[data.y]} @ ${data.x}:00`}</p>
                      <p className="text-xs text-indigo-300">Volume: {data.z} reqs</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter data={data}>
              {data.map((entry, index) => {
                // Color mapping: <= 200: light, <= 600 med, > 600 high
                let color = '#E0E7FF'; // indigo-100
                if (entry.z > 600) color = '#4F46E5'; // indigo-600
                else if (entry.z > 200) color = '#A5B4FC'; // indigo-300
                
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
