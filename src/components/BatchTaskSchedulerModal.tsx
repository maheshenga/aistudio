import React, { useState } from 'react';
import { X, ListTodo, Plus, Play, Pause, Clock, MoveRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from './Toast';

export function BatchTaskSchedulerModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [tasks, setTasks] = useState([
    { id: 1, name: '电商素材渲染', agent: 'Video Gen', status: 'running', progress: 45 },
    { id: 2, name: '季度数据报表', agent: 'Data Analyst', status: 'queued', progress: 0 },
    { id: 3, name: '主站多语言文案', agent: '全能助手', status: 'queued', progress: 0 },
  ]);

  const handleStartQueue = () => {
     toast('批处理队列流水线已并行启动', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
       <motion.div
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         exit={{ opacity: 0, scale: 0.95 }}
         className="bg-[var(--bg-panel)] rounded-3xl w-full max-w-4xl shadow-2xl border border-[var(--border-color)] flex flex-col h-[80vh]"
       >
         <div className="px-6 py-5 border-b border-[var(--border-color)] flex items-center justify-between bg-gray-50/50">
            <h3 className="font-black text-[var(--text-main)] flex items-center text-lg">
               <ListTodo className="icon-md mr-2 text-indigo-600" />
               全局 Agent 串联任务流 (Batch Task Scheduler)
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:bg-gray-200 p-1 rounded-lg">
               <X className="icon-md" />
            </button>
         </div>
         
         <div className="flex-1 overflow-y-auto p-[var(--spacing-lg)] bg-gray-50 flex flex-col">
            <div className="flex justify-between items-center mb-[var(--spacing-md)]">
               <div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">排队缓冲区</h4>
                  <p className="text-[11px] text-[var(--text-muted)] font-medium">配置多个Agent顺序或并行流转的任务节点。</p>
               </div>
               <div className="flex gap-2">
                  <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 text-[12px] font-bold rounded-lg transition-colors">
                     <Plus className="w-3.5 h-3.5" />
                     <span>添加节点</span>
                  </button>
                  <button onClick={handleStartQueue} className="flex items-center space-x-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-bold rounded-lg transition-colors shadow-sm">
                     <Play className="w-3.5 h-3.5" />
                     <span>下发并发流水线</span>
                  </button>
               </div>
            </div>

            <div className="space-y-[var(--spacing-md)] relative">
               <div className="absolute top-[28px] bottom-8 left-6 w-0.5 bg-gray-200 z-0"></div>
               {tasks.map((task, idx) => (
                  <div key={task.id} className="relative z-10 flex gap-[var(--spacing-md)]">
                     <div className="w-12 pt-2 flex flex-col items-center">
                        <div className={`icon-lg rounded-full flex items-center justify-center font-black text-[10px] ${task.status === 'running' ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-[var(--bg-panel)] border-2 border-gray-300 text-gray-400'}`}>
                           {idx + 1}
                        </div>
                     </div>
                     <div className="flex-1 bg-[var(--bg-panel)] border border-[var(--border-color)] p-5 rounded-[var(--radius-xl)] shadow-sm group hover:border-indigo-300 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                           <div>
                              <h5 className="font-bold text-[var(--text-main)] text-sm mb-1">{task.name}</h5>
                              <div className="flex items-center text-[11px] font-bold text-[var(--text-muted)] space-x-2">
                                 <span className="bg-gray-100 px-2 py-0.5 rounded text-indigo-700">{task.agent}</span>
                                 <span>分配优先级: P0</span>
                              </div>
                           </div>
                           <div className="flex items-center">
                              {task.status === 'running' ? (
                                 <span className="flex items-center text-[10px] font-bold text-[var(--color-primary)] bg-blue-50 px-2 py-1 rounded">
                                    <Clock className="w-3 h-3 mr-1 animate-spin-slow" /> 响应中
                                 </span>
                              ) : (
                                 <span className="flex items-center text-[10px] font-bold text-[var(--text-muted)] bg-gray-100 px-2 py-1 rounded">
                                    <Pause className="w-3 h-3 mr-1" /> 已搁置
                                 </span>
                              )}
                           </div>
                        </div>

                        {task.status === 'running' && (
                           <div className="mt-4">
                              <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)] mb-1">
                                 <span>节点生成进度...</span>
                                 <span className="text-indigo-600">{task.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                 <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${task.progress}%` }}></div>
                              </div>
                           </div>
                        )}
                        
                        {idx < tasks.length - 1 && (
                           <div className="flex items-center mt-3 text-[10px] font-bold text-gray-400">
                              <MoveRight className="w-3.5 h-3.5 mr-1" />
                              触发条件: 前置节点成功
                           </div>
                        )}
                     </div>
                  </div>
               ))}
            </div>
         </div>
       </motion.div>
    </div>
  );
}
