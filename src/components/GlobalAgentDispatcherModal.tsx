import React, { useState, useEffect } from 'react';
import { Network, Search, X, Play, Loader2, CheckCircle2, FileText, Send, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BaseModal } from './ui/BaseModal';

interface AgentTarget {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
}

export function GlobalAgentDispatcherModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [taskInput, setTaskInput] = useState('');
  const [agents, setAgents] = useState<AgentTarget[]>([
    { id: '1', name: 'Agent-X 编导', role: '文本/创意', status: 'idle', progress: 0 },
    { id: '2', name: 'Agent-Y 数据', role: '分析/统计', status: 'idle', progress: 0 },
    { id: '3', name: 'DesignCopilot', role: 'UI/视觉', status: 'idle', progress: 0 },
    { id: '4', name: 'CodeAssist', role: '架构/研发', status: 'idle', progress: 0 }
  ]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isDispatching, setIsDispatching] = useState(false);

  useEffect(() => {
    if (!isOpen) {
       setTaskInput('');
       setAgents(agents.map(a => ({ ...a, status: 'idle', progress: 0 })));
       setIsDispatching(false);
    }
  }, [isOpen]);

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const startDispatch = () => {
    if (selectedAgents.length === 0 || !taskInput.trim()) return;
    setIsDispatching(true);
    
    selectedAgents.forEach(id => {
      // Simulation of async agent tasks
      setAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'running', progress: 10 } : a));
      
      const interval = setInterval(() => {
        setAgents(prev => {
           return prev.map(a => {
              if (a.id === id && a.status === 'running') {
                 const newProgress = Math.min(a.progress + Math.random() * 20, 100);
                 if (newProgress >= 100) {
                    clearInterval(interval);
                    return { ...a, status: 'completed', progress: 100 };
                 }
                 return { ...a, progress: newProgress };
              }
              return a;
           });
        });
      }, 500);
    });
  };

  return (
    <BaseModal 
         isOpen={isOpen} 
         onClose={onClose} 
         maxWidth="max-w-4xl" 
         zIndex={100} 
         hideHeader
         className="flex flex-col md:flex-row h-[75vh]"
    >
         {/* Left Side: Task Configuration */}
         <div className="w-full md:w-1/2 p-[var(--spacing-xl)] border-r border-[var(--border-color)] bg-[var(--bg-hover)] flex flex-col h-full">
            <div className="flex items-center justify-between mb-[var(--spacing-xl)]">
               <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight flex items-center">
                  <Network className="icon-lg mr-3 text-indigo-600" />
                  全局 Agent 调度器
               </h2>
               <button onClick={onClose} className="md:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-panel)] rounded-full border border-[var(--border-color)] shadow-sm">
                 <X className="icon-md" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
               <div className="mb-[var(--spacing-md)]">
                  <label className="text-[13px] font-bold text-[var(--text-main)] mb-2 flex items-center">
                     <FileText className="icon-sm mr-2 text-blue-500" /> 调度任务描述
                  </label>
                  <textarea 
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    placeholder="输入需要多Agent并行处理的复杂任务指令..."
                    className="w-full h-32 px-4 py-3 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all resize-none shadow-sm placeholder:text-[var(--text-muted)]"
                    disabled={isDispatching}
                  />
               </div>
               
               <div>
                  <label className="text-[13px] font-bold text-[var(--text-main)] mb-3 flex items-center justify-between">
                     <span>选择编排 Agent (多选)</span>
                     <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{selectedAgents.length} 已选</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     {agents.map(agent => (
                        <button
                          key={agent.id}
                          onClick={() => !isDispatching && toggleAgent(agent.id)}
                          className={`p-3 rounded-[var(--radius-lg)] border text-left transition-all ${selectedAgents.includes(agent.id) ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/50' : 'border-[var(--border-color)] hover:border-gray-300 bg-[var(--bg-panel)]'}`}
                          disabled={isDispatching}
                        >
                           <div className="flex items-center justify-between mb-1">
                              <span className={`text-[13px] font-bold ${selectedAgents.includes(agent.id) ? 'text-indigo-900' : 'text-[var(--text-main)]'}`}>{agent.name}</span>
                           </div>
                           <span className="text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded uppercase tracking-wider">{agent.role}</span>
                        </button>
                     ))}
                  </div>
               </div>
            </div>
            
            <div className="pt-6 border-t border-[var(--border-color)] mt-4">
               <button 
                 onClick={startDispatch}
                 disabled={isDispatching || selectedAgents.length === 0 || !taskInput.trim()}
                 className={`w-full py-4 rounded-[var(--radius-lg)] flex items-center justify-center font-bold text-[15px] transition-all shadow-sm ${isDispatching || selectedAgents.length === 0 || !taskInput.trim() ? 'bg-[var(--bg-panel)] text-[var(--text-muted)] border border-[var(--border-color)] cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black hover:shadow-md'}`}
               >
                 {isDispatching ? (
                    <><Loader2 className="icon-md mr-2 animate-spin" /> 正在并行执行调度...</>
                 ) : (
                    <><Send className="icon-md mr-2" /> 开始并发下发执行</>
                 )}
               </button>
            </div>
         </div>
         
         {/* Right Side: Execution Status */}
         <div className="w-full md:w-1/2 bg-[var(--bg-panel)] flex flex-col relative h-full">
            <button onClick={onClose} className="absolute top-[var(--spacing-lg)] right-6 p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] rounded-full transition-colors hidden md:block">
              <X className="icon-md" />
            </button>
            <div className="p-[var(--spacing-xl)] pb-4">
               <h3 className="text-lg font-black text-[var(--text-main)] mb-1">执行链路追踪</h3>
               <p className="text-sm text-[var(--text-muted)] font-medium">实时监控各节点 Agent 的并发响应进度。</p>
            </div>
            <div className="flex-1 overflow-y-auto p-[var(--spacing-xl)] pt-0 custom-scrollbar">
               {isDispatching || selectedAgents.some(id => agents.find(a => a.id === id)?.status !== 'idle') ? (
                  <div className="space-y-[var(--spacing-md)]">
                     {selectedAgents.map(id => {
                        const agent = agents.find(a => a.id === id)!;
                        return (
                           <div key={agent.id} className="bg-[var(--bg-hover)] rounded-[var(--radius-lg)] p-4 border border-[var(--border-color)]">
                              <div className="flex justify-between items-center mb-2">
                                 <span className="text-[13px] font-bold text-[var(--text-main)]">{agent.name}</span>
                                 {agent.status === 'running' && <span className="text-[11px] font-bold text-[var(--color-primary)] flex items-center"><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> 处理中</span>}
                                 {agent.status === 'completed' && <span className="text-[11px] font-bold text-[var(--color-success)] flex items-center"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 已完成</span>}
                              </div>
                              <div className="w-full bg-[var(--border-color)] rounded-full h-1.5 mb-2 overflow-hidden">
                                 <div 
                                    className={`h-1.5 rounded-full transition-all duration-300 ${agent.status === 'completed' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-primary)]'}`} 
                                    style={{ width: `${agent.progress}%`, backgroundColor: agent.status === 'completed' ? 'var(--color-success)' : 'var(--color-primary)' }}
                                 ></div>
                              </div>
                              {agent.status === 'completed' && (
                                 <div className="mt-3 p-3 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-color)] shadow-sm text-[12px] text-[var(--text-muted)]">
                                    <span className="font-bold text-[var(--text-main)] block mb-1">执行结果回执：</span>
                                    该子任务已成功生成并挂载至工作流上下文。
                                 </div>
                              )}
                           </div>
                        );
                     })}
                  </div>
               ) : (
                  <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                     <AlertTriangle className="icon-xl mb-4 opacity-20" />
                     <p className="text-[14px] font-bold">等待任务调度下发</p>
                  </div>
               )}
            </div>
         </div>
    </BaseModal>
  );
}
