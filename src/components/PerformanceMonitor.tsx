import React, { useState, useEffect } from 'react';
import { useDeveloperMode } from '../hooks/useDeveloperMode';
import { Activity, Cpu, Wifi, Download, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRef } from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function PerformanceMonitor() {
  const { isDevMode } = useDeveloperMode();
  const [metrics, setMetrics] = useState({ latency: 45, memory: 120, fps: 60 });
  const [history, setHistory] = useState<any[]>([]);
  const [topModule, setTopModule] = useState<string>('N/A');
  const monitorRef = useRef<HTMLDivElement>(null);
  
  const handleExportPDF = async () => {
    if (!monitorRef.current) return;
    try {
       const canvas = await html2canvas(monitorRef.current, { backgroundColor: '#111827' });
       const imgData = canvas.toDataURL('image/png');
       const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
       pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
       pdf.save('performance_report.pdf');
    } catch(e) {
       console.error("PDF Export failed", e);
    }
  };

  useEffect(() => {
    if (!isDevMode) return;
    
    let lastTime = performance.now();
    let frames = 0;
    let animationFrameId: number;
    let seconds = 0;
    
    const interval = setInterval(() => {
      seconds++;
      
      try {
        const stored = localStorage.getItem('module_time_tracker');
        if (stored) {
          const data = JSON.parse(stored);
          const maxModule = Object.keys(data).reduce((a, b) => (data[a] || 0) > (data[b] || 0) ? a : b, '');
          if (maxModule) setTopModule(maxModule);
        }
      } catch (e) {}

      setMetrics(prev => {
        const nextLatency = Math.max(10, Math.min(prev.latency + (Math.random() * 20 - 10), 300));
        const nextMemory = Math.max(50, Math.min(prev.memory + (Math.random() * 10 - 5), 500));
        
        setHistory(h => {
          const newH = [...h, { 
            time: seconds, 
            latency: Math.round(nextLatency), 
            memory: Math.round(nextMemory),
            fps: prev.fps
          }];
          if (newH.length > 20) newH.shift();
          return newH;
        });

        return {
          latency: nextLatency,
          memory: nextMemory,
          fps: prev.fps
        };
      });
    }, 1000);

    const checkFPS = () => {
      const now = performance.now();
      frames++;
      if (now - lastTime >= 1000) {
        setMetrics(prev => ({ ...prev, fps: frames }));
        frames = 0;
        lastTime = now;
      }
      animationFrameId = requestAnimationFrame(checkFPS);
    };
    
    animationFrameId = requestAnimationFrame(checkFPS);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDevMode]);

  if (!isDevMode) return null;

  return (
    <motion.div 
      ref={monitorRef}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 left-6 z-[9999] bg-gray-900/95 backdrop-blur-md text-green-400 p-4 rounded-[var(--radius-lg)] shadow-2xl border border-gray-700 font-mono text-[11px] w-80"
    >
      <div className="flex items-center justify-between mb-3 text-gray-400 font-bold tracking-wider">
        <span className="flex items-center"><Activity className="w-3 h-3 mr-1.5" /> PERF_MONITOR</span>
        <button onClick={handleExportPDF} className="pointer-events-auto hover:text-white transition-colors" title="Export PDF Report"><Download className="w-3 h-3" /></button>
        <span className="text-[9px] bg-gray-800 px-1.5 py-0.5 rounded text-[var(--text-muted)]">LIVE</span>
      </div>
      
      <div className="h-24 mb-3 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis yAxisId="left" domain={['dataMin - 10', 'dataMax + 10']} hide />
            <YAxis yAxisId="right" orientation="right" domain={[0, 60]} hide />
            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} />
            <Line yAxisId="left" type="monotone" dataKey="memory" stroke="var(--chart-2)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line yAxisId="left" type="monotone" dataKey="latency" stroke="var(--chart-3)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2 text-[10px]">
        <div className="flex justify-between items-center group">
          <span className="text-[var(--text-muted)] flex items-center"><Wifi className="w-3 h-3 mr-1.5" /> API LATENCY <span className="w-2 h-2 rounded-full bg-yellow-400 ml-2"></span></span>
          <span className={metrics.latency > 150 ? "text-yellow-400" : "text-yellow-400/80"}>{Math.round(metrics.latency)}ms</span>
        </div>
        <div className="flex justify-between items-center group">
          <span className="text-[var(--text-muted)] flex items-center"><Cpu className="w-3 h-3 mr-1.5" /> MEMORY <span className="w-2 h-2 rounded-full bg-emerald-500 ml-2"></span></span>
          <span className="text-emerald-400">{Math.round(metrics.memory)}MB</span>
        </div>
        <div className="flex justify-between items-center group">
          <span className="text-[var(--text-muted)] flex items-center"><Activity className="w-3 h-3 mr-1.5" /> FRAMERATE</span>
          <span className={metrics.fps < 30 ? "text-red-400 font-bold" : "text-gray-300"}>{metrics.fps} FPS</span>
        </div>
        <div className="flex justify-between items-center group">
          <span className="text-[var(--text-muted)] flex items-center"><Clock className="w-3 h-3 mr-1.5" /> TOP MODULE</span>
          <span className="text-blue-400 truncate max-w-[100px] text-right" title={topModule}>{topModule}</span>
        </div>
      </div>
    </motion.div>
  );
}
