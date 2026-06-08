import React, { useState } from 'react';
import { X, History, Bot, MessageSquare, ThumbsUp, AlertTriangle, Activity } from 'lucide-react';
import { motion } from 'motion/react';

export function CollaborationHistoryModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [logs] = useState([
    { id: 1, type: 'agent', role: 'UI Copilot', content: '我已完成卡片组件的 Tailwind 骨架设计，请 CodeAssist 进行逻辑绑定。', time: '10:42:01', sentiment: 'neutral' },
    { id: 2, type: 'system', content: '上下文传递: UI Copilot -> CodeAssist', time: '10:42:05' },
    { id: 3, type: 'agent', role: 'CodeAssist', content: '接收到样式骨架，正在注入 React Hooks 状态管理...', time: '10:42:08', sentiment: 'neutral' },
    { id: 4, type: 'agent', role: 'Data Analyst', content: '我在这里提供一组 Mock 数据，可以直接渲染在表格里。高效协同！', time: '10:42:15', sentiment: 'positive' },
    { id: 5, type: 'agent', role: 'CodeAssist', content: '发现数据结构冲突：字段 id 和 key 不匹配，必须手动转译阻断了流水线。', time: '10:42:18', sentiment: 'negative' },
    { id: 6, type: 'agent', role: 'Data Analyst', content: '已修正结构规范，重新下发有效载荷。', time: '10:42:21', sentiment: 'positive' },
    { id: 7, type: 'agent', role: 'CodeAssist', content: 'Mock数据已融合完毕，模块可预览。', time: '10:42:25', sentiment: 'positive' },
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
       <motion.div
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         exit={{ opacity: 0, scale: 0.95 }}
         className="bg-[var(--bg-panel)] rounded-3xl w-full max-w-3xl shadow-2xl border border-[var(--border-color)] flex flex-col h-[75vh]"
       >
         <div className="px-6 py-5 border-b border-[var(--border-color)] flex items-center justify-between bg-gray-50/50">
            <div>
               <h3 className="font-black text-[var(--text-main)] flex items-center text-lg">
                  <History className="icon-md mr-2 text-indigo-600" />
                  协同握手抓包 (Collaboration Transcript)
               </h3>
               <p className="text-[11px] text-[var(--text-muted)] font-medium mt-1 ml-7">带情感分析的跨 Agent 决策通讯日志追踪。</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:bg-gray-200 p-1 rounded-lg">
               <X className="icon-md" />
            </button>
         </div>
         
         <div className="flex-1 overflow-y-auto p-[var(--spacing-lg)] space-y-[var(--spacing-md)] bg-gray-50">
            <p className="text-xs font-bold text-center text-gray-400 mb-[var(--spacing-md)]">- 今日并行任务追踪 -</p>
            {logs.map((log) => (
               <div key={log.id} className="flex flex-col">
                  {log.type === 'system' ? (
                     <div className="flex justify-center my-3">
                        <span className="text-[10px] font-bold bg-[var(--bg-panel)] px-3 py-1 rounded-full border border-[var(--border-color)] text-[var(--text-muted)] shadow-sm flex items-center gap-2">
                           <MessageSquare className="w-3 h-3 text-blue-500" /> {log.content} <span className="text-gray-400 opacity-60 ml-2">{log.time}</span>
                        </span>
                     </div>
                  ) : (
                     <div className="flex items-start max-w-[85%] bg-[var(--bg-panel)] border p-4 rounded-[var(--radius-xl)] rounded-tl-sm shadow-sm relative group overflow-hidden" 
                          style={{
                             borderColor: log.sentiment === 'positive' ? '#bbf7d0' : log.sentiment === 'negative' ? '#fecaca' : '#e5e7eb'
                          }}>
                        {log.sentiment === 'positive' && <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>}
                        {log.sentiment === 'negative' && <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>}
                        
                        <div className={`icon-xl rounded-full flex items-center justify-center mr-3 mt-1 shrink-0 ${log.sentiment === 'positive' ? 'bg-green-100' : log.sentiment === 'negative' ? 'bg-red-100' : 'bg-indigo-100'}`}>
                           {log.sentiment === 'positive' ? <ThumbsUp className="icon-sm text-green-600" /> : log.sentiment === 'negative' ? <AlertTriangle className="icon-sm text-red-600" /> : <Bot className="icon-sm text-indigo-600" />}
                        </div>
                        <div className="flex flex-col flex-1 pl-1">
                           <div className="flex items-baseline justify-between w-full mb-1">
                              <span className="text-[13px] font-bold text-[var(--text-main)]">{log.role}</span>
                              <div className="flex items-center space-x-2">
                                 {log.sentiment === 'positive' && <span className="text-[9px] font-black uppercase text-green-600 bg-green-50 px-1.5 py-0.5 rounded tracking-widest hidden group-hover:block">EFFICIENT</span>}
                                 {log.sentiment === 'negative' && <span className="text-[9px] font-black uppercase text-red-600 bg-red-50 px-1.5 py-0.5 rounded tracking-widest hidden group-hover:block">BLOCKER</span>}
                                 <span className="text-[10px] text-gray-400 font-medium">{log.time}</span>
                              </div>
                           </div>
                           <p className="text-[14px] text-gray-700 leading-relaxed font-medium">{log.content}</p>
                        </div>
                     </div>
                  )}
               </div>
            ))}
         </div>
       </motion.div>
    </div>
  );
}
