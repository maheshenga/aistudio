import React, { useState, useEffect } from 'react';
import { Activity, Network, MemoryStick, Cpu, Clock, CheckCircle2, AlertTriangle, ArrowRight, Settings, Download, RotateCw, X, ShieldAlert, Edit3, Library, ListTodo, History, AlertCircle, Waypoints, Target, MonitorCog, Server, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from './Toast';
import { AgentNodeDiagram } from './AgentNodeDiagram';
import { AgentPersonaEditorModal } from './AgentPersonaEditorModal';
import { SkillsLibraryModal } from './SkillsLibraryModal';
import { CollaborationHistoryModal } from './CollaborationHistoryModal';
import { BatchTaskSchedulerModal } from './BatchTaskSchedulerModal';
import { LatencyProjectionChart } from './LatencyProjectionChart';
import { AutoScaleConfigModal } from './AutoScaleConfigModal';
import { AgentWeeklyHeatmap } from './AgentWeeklyHeatmap';
import { useAgentRuntimeStatus } from '../runtime/useAgentRuntimeStatus.ts';

interface AgentStatus {
   id: string;
   name: string;
   status: 'healthy' | 'busy' | 'degraded';
   uptime: string;
   cpu: number;
   memory: number;
   activeTasks: number;
   successRate: number;
   tokenUsage: number;
   monthlyLimit: number;
   isLimitOverridden?: boolean;
}

export function AgentStatusDashboardView() {
   const { status: runtimeStatus, isLoading: isRuntimeLoading } = useAgentRuntimeStatus();
   const [isConfigOpen, setIsConfigOpen] = useState(false);
   const [isSkillsOpen, setIsSkillsOpen] = useState(false);
   const [isBatchTaskOpen, setIsBatchTaskOpen] = useState(false);
   const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);
   const [isAutoScaleOpen, setIsAutoScaleOpen] = useState(false);
   const [editingPersonaAgent, setEditingPersonaAgent] = useState<string | null>(null);
   const [canaryEnabled, setCanaryEnabled] = useState(false);

   const [latencyThreshold, setLatencyThreshold] = useState('2000');
   const [globalNotify, setGlobalNotify] = useState(true);

   const [agents, setAgents] = useState<AgentStatus[]>([
     { id: '1', name: '全能助手 (Global)', status: 'healthy', uptime: '48h 12m', cpu: 12, memory: 45, activeTasks: 1, successRate: 99.8, tokenUsage: 850000, monthlyLimit: 1000000 },
     { id: '2', name: 'UI Copilot', status: 'busy', uptime: '48h 12m', cpu: 67, memory: 82, activeTasks: 14, successRate: 98.5, tokenUsage: 450000, monthlyLimit: 500000 },
     { id: '3', name: 'Data Analyst', status: 'degraded', uptime: '12h 05m', cpu: 94, memory: 96, activeTasks: 23, successRate: 92.1, tokenUsage: 1250000, monthlyLimit: 1000000 },
     { id: '4', name: 'CodeAssist', status: 'healthy', uptime: '48h 12m', cpu: 5, memory: 20, activeTasks: 0, successRate: 100, tokenUsage: 15000, monthlyLimit: 1000000 },
     { id: '5', name: 'Video Gen', status: 'busy', uptime: '2h 30m', cpu: 88, memory: 70, activeTasks: 3, successRate: 96.4, tokenUsage: 950000, monthlyLimit: 1000000 }
   ]);

   useEffect(() => {
     const interval = setInterval(() => {
        setAgents(prev => prev.map(a => ({
           ...a,
           cpu: Math.max(1, Math.min(100, a.cpu + (Math.random() * 20 - 10))),
           memory: Math.max(1, Math.min(100, a.memory + (Math.random() * 10 - 5)))
        })));
     }, 2000);
     return () => clearInterval(interval);
   }, []);

   const restartAgent = (id: string, name: string) => {
      setAgents(prev => prev.map(a => 
         a.id === id ? { ...a, status: 'healthy', cpu: 10, memory: 15, uptime: '0h 0m' } : a
      ));
      toast(`${name} 实例已重置并重新初始化上线`, 'success');
   };

   const exportReport = () => {
      toast('Agent 算力与延迟健康度报告已导出 (CSV)', 'success');
   };

   const toggleCanary = () => {
      setCanaryEnabled(!canaryEnabled);
      if (!canaryEnabled) {
         toast('Canary 探针已激活，5% 的测试流量将分发给新增的候选模型节点。', 'success');
      } else {
         toast('Canary 探针已关闭，流量路由撤回', 'success');
      }
   };

   return (
     <div className="h-[calc(100vh-4rem)] overflow-y-auto bg-[var(--bg-app)] p-[var(--spacing-xl)] animate-in fade-in duration-300 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-[var(--spacing-xl)] pb-6 border-b border-[var(--border-color)]">
           <div>
              <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight flex items-center">
                 <Activity className="icon-lg mr-3 text-indigo-600" />
                 Agent 状态监测 <span className="ml-3 bg-indigo-100 text-indigo-700 text-[10px] uppercase font-black px-2 py-0.5 rounded-full">Health Monitor</span>
              </h2>
              <p className="text-[14px] text-[var(--text-muted)] mt-2 font-medium">实时健康度、资源消耗与任务并发状态追踪</p>
           </div>
           
           <div className="flex flex-wrap items-center gap-[var(--spacing-md)] mt-4 sm:mt-0">
              <button 
                 onClick={toggleCanary}
                 className={`flex items-center text-sm font-bold transition-all px-3 py-2 rounded-[var(--radius-lg)] border shadow-sm ${canaryEnabled ? 'bg-pink-50 text-pink-700 border-pink-200 ring-1 ring-pink-100' : 'bg-[var(--bg-panel)] text-gray-600 border-[var(--border-color)] hover:text-pink-600'}`}
              >
                 <Target className="icon-sm mr-1.5" />
                 灰度探针 {canaryEnabled ? 'ON' : 'OFF'}
              </button>
              <button onClick={() => setIsCollaborationOpen(true)} className="flex items-center text-sm font-bold text-gray-600 hover:text-indigo-600 transition-colors bg-[var(--bg-panel)] px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-sm">
                 <History className="icon-sm mr-1.5" />
                 协同纪要
              </button>
              <button onClick={() => setIsBatchTaskOpen(true)} className="flex items-center text-sm font-bold text-gray-600 hover:text-indigo-600 transition-colors bg-[var(--bg-panel)] px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-sm">
                 <ListTodo className="icon-sm mr-1.5" />
                 批处理调度
              </button>
              <button onClick={() => setIsAutoScaleOpen(true)} className="flex items-center text-sm font-bold text-gray-600 hover:text-indigo-600 transition-colors bg-[var(--bg-panel)] px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-sm">
                 <Waypoints className="icon-sm mr-1.5" />
                 自动扩缩容
              </button>
              <button onClick={() => setIsSkillsOpen(true)} className="flex items-center text-sm font-bold text-gray-600 hover:text-indigo-600 transition-colors bg-[var(--bg-panel)] px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-sm mr-4">
                 <Library className="icon-sm mr-1.5" />
                 技能预设大厅
              </button>
              
              <div className="flex space-x-6 mr-4 bg-[var(--bg-panel)] px-4 py-2.5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-sm hidden xl:flex">
                 <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-green-500 mr-2 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span>
                    <span className="text-sm font-bold text-gray-700">Healthy (3)</span>
                 </div>
                 <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-amber-500 mr-2 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></span>
                    <span className="text-sm font-bold text-gray-700">Busy (2)</span>
                 </div>
                 <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-red-500 mr-2 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></span>
                    <span className="text-sm font-bold text-gray-700">Degraded (1)</span>
                 </div>
              </div>
              <button 
                 onClick={() => setIsConfigOpen(true)}
                 className="flex items-center bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm"
              >
                 <Settings className="icon-sm mr-2" />
                 偏好设置
              </button>
              <button 
                 onClick={exportReport}
                 className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm"
              >
                 <Download className="icon-sm mr-2" />
                 导出报表
              </button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-4">
            <div className="text-[11px] font-black text-[var(--text-muted)] uppercase flex items-center">
              <MonitorCog className="icon-sm mr-1.5" />
              Runtime Mode
            </div>
            <div className="text-lg font-black text-[var(--text-main)] mt-2">
              {runtimeStatus?.mode ?? (isRuntimeLoading ? 'loading' : 'web')}
            </div>
          </div>
          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-4">
            <div className="text-[11px] font-black text-[var(--text-muted)] uppercase flex items-center">
              <Server className="icon-sm mr-1.5" />
              Runtime Health
            </div>
            <div className="text-lg font-black text-[var(--text-main)] mt-2">
              {runtimeStatus?.health ?? 'available'}
            </div>
          </div>
          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-4">
            <div className="text-[11px] font-black text-[var(--text-muted)] uppercase">CLI Providers</div>
            <div className="text-sm font-bold text-[var(--text-main)] mt-2">
              {runtimeStatus?.cliProviders.join(', ') || 'web'}
            </div>
          </div>
          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-4">
            <div className="text-[11px] font-black text-[var(--text-muted)] uppercase flex items-center">
              <WifiOff className="icon-sm mr-1.5" />
              Bridge
            </div>
            <div className="text-sm font-bold text-[var(--text-main)] mt-2">
              {runtimeStatus?.bridgeAvailable ? 'desktop bridge connected' : 'browser/web only'}
            </div>
          </div>
        </div>

        <AgentNodeDiagram canaryEnabled={canaryEnabled} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--spacing-md)]">
           {agents.map((agent) => (
             <motion.div 
                key={agent.id}
                layout
                className={`bg-[var(--bg-panel)] rounded-[var(--radius-xl)] shadow-sm border ${agent.status === 'degraded' ? 'border-red-200 ring-1 ring-red-100' : agent.status === 'busy' ? 'border-amber-200' : 'border-[var(--border-color)]'} p-[var(--spacing-lg)] relative overflow-hidden`}
             >
                {agent.status === 'degraded' && <div className="absolute top-0 inset-x-0 h-1 bg-red-500"></div>}
                {agent.status === 'busy' && <div className="absolute top-0 inset-x-0 h-1 bg-amber-500"></div>}
                {agent.status === 'healthy' && <div className="absolute top-0 inset-x-0 h-1 bg-green-500"></div>}
                
                <div className="flex items-start justify-between mb-[var(--spacing-md)]">
                   <div>
                      <h3 className="text-lg font-black text-[var(--text-main)] mb-1 flex items-center">
                         {agent.name}
                      </h3>
                      <p className="text-[11px] text-[var(--text-muted)] font-bold tracking-wider uppercase flex items-center">
                         <Clock className="w-3 h-3 mr-1" /> UPTIME: {agent.uptime}
                      </p>
                   </div>
                   <div className={`p-2 rounded-[var(--radius-lg)] ${agent.status === 'healthy' ? 'bg-green-50 text-green-600' : agent.status === 'busy' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                      {agent.status === 'healthy' ? <CheckCircle2 className="icon-md" /> : agent.status === 'busy' ? <Activity className="icon-md" /> : <AlertTriangle className="icon-md" />}
                   </div>
                </div>

                <div className="space-y-[var(--spacing-md)]">
                   <div>
                      <div className="flex items-center justify-between mb-1.5">
                         <span className="text-[12px] font-bold text-gray-600 flex items-center"><Cpu className="w-3.5 h-3.5 mr-1.5" /> 算力负荷 (CPU)</span>
                         <span className={`text-[12px] font-black ${agent.cpu > 85 ? 'text-red-500' : 'text-[var(--text-main)]'}`}>{agent.cpu.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                         <div className={`h-1.5 rounded-full transition-all duration-500 ${agent.cpu > 85 ? 'bg-red-500' : agent.cpu > 60 ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${agent.cpu}%` }}></div>
                      </div>
                   </div>
                   
                   <div>
                      <div className="flex items-center justify-between mb-1.5">
                         <span className="text-[12px] font-bold text-gray-600 flex items-center"><MemoryStick className="w-3.5 h-3.5 mr-1.5" /> 上下文开销 (Mem)</span>
                         <span className={`text-[12px] font-black ${agent.memory > 85 ? 'text-red-500' : 'text-[var(--text-main)]'}`}>{agent.memory.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                         <div className={`h-1.5 rounded-full transition-all duration-500 ${agent.memory > 85 ? 'bg-red-500' : agent.memory > 60 ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${agent.memory}%` }}></div>
                      </div>
                   </div>
                </div>

                <div className="mt-6 pt-5 border-t border-[var(--border-color)]">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-col">
                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">活跃并行任务</span>
                         <span className="text-xl font-black text-[var(--text-main)]">{agent.activeTasks} <span className="text-[12px] text-[var(--text-muted)] font-medium tracking-normal">并线</span></span>
                      </div>
                      <div className="w-px h-8 bg-gray-200"></div>
                      <div className="flex flex-col">
                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">SLA 达标率</span>
                         <span className={`text-xl font-black ${agent.successRate < 95 ? 'text-red-500' : 'text-green-600'}`}>{agent.successRate}%</span>
                      </div>
                   </div>

                   <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">当月 Token 额度 (API)</span>
                         <span className={`text-[10px] font-bold ${agent.tokenUsage >= agent.monthlyLimit && !agent.isLimitOverridden ? 'text-red-500' : 'text-gray-600'}`}>
                            {agent.tokenUsage.toLocaleString()} / {agent.monthlyLimit.toLocaleString()}
                         </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1 relative overflow-hidden">
                         <div className={`h-1 flex rounded-full ${agent.isLimitOverridden ? 'bg-indigo-500' : (agent.tokenUsage >= agent.monthlyLimit ? 'bg-red-500' : 'bg-green-500')}`} style={{ width: `${Math.min((agent.tokenUsage / agent.monthlyLimit) * 100, 100)}%` }}></div>
                         {agent.tokenUsage > agent.monthlyLimit && agent.isLimitOverridden && (
                            <div className="h-1 flex bg-indigo-300" style={{ width: `${Math.min(((agent.tokenUsage - agent.monthlyLimit) / agent.monthlyLimit) * 100, 100)}%` }}></div>
                         )}
                      </div>
                      {agent.tokenUsage >= agent.monthlyLimit && !agent.isLimitOverridden && (
                         <div className="mt-2 flex items-center justify-between">
                            <span className="text-[10px] text-red-600 font-bold flex items-center"><AlertCircle className="w-3 h-3 mr-1" /> 已超用量限制</span>
                            <button 
                               onClick={() => {
                                  toast('已突破本月配额限制，产生的计费将挂载至公账', 'success');
                                  setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, isLimitOverridden: true } : a));
                               }}
                               className="px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-[10px] font-bold border border-red-200 transition-colors"
                            >
                               一键提额 (Override)
                            </button>
                         </div>
                      )}
                   </div>

                   <div className="grid grid-cols-2 gap-2 mt-2">
                       <button 
                          onClick={() => setEditingPersonaAgent(agent.name)}
                          className="flex items-center justify-center space-x-1.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                       >
                          <Edit3 className="w-3.5 h-3.5" /> <span>配置 Persona</span>
                       </button>
                       {agent.status === 'degraded' ? (
                          <button 
                             onClick={() => restartAgent(agent.id, agent.name)}
                             className="flex items-center justify-center space-x-1.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                          >
                             <RotateCw className="w-3.5 h-3.5 border-none" /> <span>强制重启</span>
                          </button>
                       ) : (
                          <div className="flex items-center justify-center space-x-1.5 py-1.5 bg-gray-50 text-gray-400 rounded-lg text-xs font-bold border border-[var(--border-color)] cursor-not-allowed">
                             <RotateCw className="w-3.5 h-3.5" /> <span>重新加载</span>
                          </div>
                       )}
                   </div>

                   {agent.status === 'degraded' && (
                      <div className="mt-3 bg-red-50 border border-red-100 rounded-[var(--radius-lg)] p-2 flex items-center">
                         <ShieldAlert className="icon-sm text-red-600 mr-2 shrink-0" />
                         <span className="text-red-700 text-[10px] font-bold leading-tight">智能探针报警：节点失去响应或超时，请强制重启以提纯系统状态。</span>
                      </div>
                   )}
                </div>
             </motion.div>
           ))}
        </div>

        <LatencyProjectionChart />
        <AgentWeeklyHeatmap />

        <AgentPersonaEditorModal 
           isOpen={!!editingPersonaAgent} 
           onClose={() => setEditingPersonaAgent(null)} 
           agentName={editingPersonaAgent || ''} 
        />
        <SkillsLibraryModal isOpen={isSkillsOpen} onClose={() => setIsSkillsOpen(false)} />
        <CollaborationHistoryModal isOpen={isCollaborationOpen} onClose={() => setIsCollaborationOpen(false)} />
        <BatchTaskSchedulerModal isOpen={isBatchTaskOpen} onClose={() => setIsBatchTaskOpen(false)} />
        <AutoScaleConfigModal isOpen={isAutoScaleOpen} onClose={() => setIsAutoScaleOpen(false)} />

        <AnimatePresence>
           {isConfigOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                 <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[var(--bg-panel)] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-[var(--border-color)]"
                 >
                    <div className="px-6 py-5 border-b border-[var(--border-color)] flex items-center justify-between bg-gray-50/50">
                       <h3 className="font-black text-[var(--text-main)]">全局监测偏好设置</h3>
                       <button onClick={() => setIsConfigOpen(false)} className="text-gray-400 hover:bg-gray-200 p-1 rounded-lg">
                          <X className="icon-md" />
                       </button>
                    </div>
                    
                    <div className="p-[var(--spacing-lg)] space-y-[var(--spacing-lg)] bg-[var(--bg-panel)]">
                       <div>
                          <label className="block text-[13px] font-bold text-[var(--text-main)] mb-2">
                             全局响应超时阈值 (ms)
                          </label>
                          <input 
                             type="number"
                             value={latencyThreshold}
                             onChange={(e) => setLatencyThreshold(e.target.value)}
                             className="w-full border border-[var(--border-color)] rounded-[var(--radius-lg)] px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none"
                             placeholder="例如: 2000"
                          />
                          <p className="text-[11px] text-[var(--text-muted)] mt-1.5 font-medium">超出此阈值将触发链路降级与 UI 告警提示。</p>
                       </div>

                       <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50/50">
                          <div>
                             <span className="block text-[13px] font-bold text-[var(--text-main)]">全局异常弹窗通知</span>
                             <span className="block text-[11px] text-[var(--text-muted)] font-medium mt-0.5">当任一 Agent 算力过载时 Toast 提示</span>
                          </div>
                          <button 
                             onClick={() => setGlobalNotify(!globalNotify)}
                             className={`w-11 h-6 rounded-full transition-colors relative ${globalNotify ? 'bg-indigo-600' : 'bg-gray-300'}`}
                          >
                             <span className={`absolute top-1/2 -translate-y-1/2 icon-sm bg-[var(--bg-panel)] rounded-full transition-all shadow-sm ${globalNotify ? 'left-[22px]' : 'left-1'}`}></span>
                          </button>
                       </div>
                    </div>
                    
                    <div className="px-6 py-4 border-t border-[var(--border-color)] bg-gray-50 flex justify-end space-x-3">
                       <button onClick={() => setIsConfigOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-[var(--text-main)] hover:bg-gray-200 rounded-lg transition-colors">
                          取消
                       </button>
                       <button 
                          onClick={() => {
                             toast('偏好设置已保存生效', 'success');
                             setIsConfigOpen(false);
                          }}
                          className="px-5 py-2 text-sm font-bold bg-gray-900 text-white rounded-lg hover:bg-black transition-colors shadow-sm"
                       >
                          保存配置
                       </button>
                    </div>
                 </motion.div>
              </div>
           )}
        </AnimatePresence>
      </div>
    );
}
