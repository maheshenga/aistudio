import React, { useState, useEffect } from 'react';
import { Activity, Clock, LogIn, LayoutGrid, ToggleLeft, Pin, ArrowLeftRight, Paintbrush, Sparkles } from 'lucide-react';
import { ModuleId } from '../types';

interface ActivityLog {
  id: string;
  timestamp: number;
  type: 'module_switch' | 'split_screen' | 'pin_module' | 'unpin_module' | 'theme_change' | 'ai_command' | 'general';
  description: string;
  details?: string;
  icon?: any;
}

const STORAGE_KEY = 'aistudio_activity_logs';

export function useActivityLogger() {
  const logActivity = (type: ActivityLog['type'], description: string, details?: string) => {
    try {
      const logsStr = localStorage.getItem(STORAGE_KEY);
      const logs: ActivityLog[] = logsStr ? JSON.parse(logsStr) : [];
      logs.unshift({
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        type,
        description,
        details
      });
      // Keep only last 500 logs
      if (logs.length > 500) logs.length = 500;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch {}
  };

  return { logActivity };
}

export function ActivityLogsView() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'module_switch' | 'config'>('all');

  useEffect(() => {
    const loadLogs = () => {
      try {
        const logsStr = localStorage.getItem(STORAGE_KEY);
        if (logsStr) setLogs(JSON.parse(logsStr));
      } catch {}
    };
    loadLogs();
    
    // Listen for storage changes if logs are updated in another tab or same window
    window.addEventListener('storage', loadLogs);
    // Custom event for internal updates
    window.addEventListener('activity_logged', loadLogs);
    return () => {
      window.removeEventListener('storage', loadLogs);
      window.removeEventListener('activity_logged', loadLogs);
    };
  }, []);

  const getIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'module_switch': return <LayoutGrid className="icon-sm text-blue-500" />;
      case 'split_screen': return <ArrowLeftRight className="icon-sm text-purple-500" />;
      case 'pin_module': return <Pin className="icon-sm text-green-500" />;
      case 'unpin_module': return <Pin className="icon-sm text-red-500" />;
      case 'theme_change': return <Paintbrush className="icon-sm text-amber-500" />;
      case 'ai_command': return <Sparkles className="icon-sm text-indigo-500" />;
      default: return <Activity className="icon-sm text-[var(--text-muted)]" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'module_switch') return log.type === 'module_switch';
    if (filter === 'config') return ['split_screen', 'pin_module', 'unpin_module', 'theme_change'].includes(log.type);
    return true;
  });

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[var(--bg-app)] p-[var(--spacing-xl)] animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-[var(--spacing-xl)] gap-[var(--spacing-md)] border-b border-[var(--border-color)] pb-6">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight flex items-center">
            <Activity className="icon-lg mr-3 text-[var(--color-primary)]" />
            全站活动日志 <span className="ml-3 bg-gray-100/50 text-[var(--text-main)] text-[10px] uppercase font-black px-2.5 py-0.5 rounded shadow-sm border border-[var(--border-color)]/50">Activity Monitor</span>
          </h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-2 font-medium">实时追踪系统的配置变更、模块导航与使用痕迹，便于回顾与审计。</p>
        </div>
        <div className="flex items-center gap-2 bg-[var(--bg-panel)] p-1.5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-sm">
          <button 
            onClick={() => setFilter('all')} 
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === 'all' ? 'bg-gray-100 text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:bg-gray-50'}`}
          >全部事件</button>
          <button 
            onClick={() => setFilter('module_switch')} 
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === 'module_switch' ? 'bg-gray-100 text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:bg-gray-50'}`}
          >模块导航</button>
          <button 
            onClick={() => setFilter('config')} 
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === 'config' ? 'bg-gray-100 text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:bg-gray-50'}`}
          >配置变更</button>
        </div>
      </div>

      <div className="flex-1 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] shadow-sm overflow-hidden flex flex-col">
        {filteredLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
             <Activity className="w-12 h-12 mb-4 opacity-20" />
             <p className="text-[14px] font-bold">暂无相关操作记录</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-[var(--spacing-lg)]">
            <div className="space-y-[var(--spacing-lg)]">
              {filteredLogs.map(log => (
                <div key={log.id} className="flex group">
                  <div className="flex flex-col items-center mr-4">
                    <div className="icon-xl rounded-full bg-gray-50 border border-[var(--border-color)] flex items-center justify-center shadow-sm shrink-0">
                      {getIcon(log.type)}
                    </div>
                    <div className="w-px h-full bg-gray-100 group-last:hidden my-2"></div>
                  </div>
                  <div className="pb-6">
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-[var(--text-main)] mb-1">{log.description}</span>
                      {log.details && <span className="text-[13px] text-[var(--text-muted)] line-clamp-2">{log.details}</span>}
                      <span className="text-[11px] font-bold text-gray-400 flex items-center mt-2 uppercase tracking-wider">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
