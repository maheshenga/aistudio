import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, Settings2, Sparkles, SlidersHorizontal, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from './Toast';

export function AgentPersonaEditorModal({ isOpen, onClose, agentName = 'Agent' }: { isOpen: boolean, onClose: () => void, agentName?: string }) {
  const [systemPrompt, setSystemPrompt] = useState('作为高级辅助AI，你的目标是给出精准、结构化的解决方案。');
  const [temperature, setTemperature] = useState(0.7);
  const [responseStyle, setResponseStyle] = useState('professional');

  const handleSave = () => {
    toast(`已将配置保存为 ${agentName} 的私有 Persona 预设`, 'success');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
       <motion.div
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         exit={{ opacity: 0, scale: 0.95 }}
         className="bg-[var(--bg-panel)] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-[var(--border-color)] flex flex-col max-h-[85vh]"
       >
         <div className="px-6 py-5 border-b border-[var(--border-color)] flex items-center justify-between bg-gray-50/50">
            <h3 className="font-black text-[var(--text-main)] flex items-center">
               <Edit3 className="icon-md mr-2 text-indigo-600" />
               Agent 角色工程配置 (Persona Editor)
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:bg-gray-200 p-1 rounded-lg">
               <X className="icon-md" />
            </button>
         </div>
         
         <div className="p-[var(--spacing-lg)] flex-1 overflow-y-auto space-y-[var(--spacing-lg)]">
            <div className="flex items-center space-x-3 mb-2 p-3 bg-indigo-50 border border-indigo-100 rounded-[var(--radius-lg)]">
               <Sparkles className="icon-md text-indigo-600" />
               <span className="text-sm font-bold text-indigo-900">正在调优 Agent：{agentName}</span>
            </div>

            <div>
               <label className="text-[13px] font-bold text-[var(--text-main)] mb-2 block flex items-center">
                  <BookOpen className="icon-sm mr-2 text-blue-500" /> 核心系统指令 (System Prompt)
               </label>
               <textarea 
                 value={systemPrompt}
                 onChange={(e) => setSystemPrompt(e.target.value)}
                 className="w-full h-32 px-4 py-3 bg-gray-50 border border-[var(--border-color)] rounded-[var(--radius-lg)] text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all resize-none shadow-sm placeholder:text-gray-400"
               />
               <p className="text-[11px] text-[var(--text-muted)] mt-1.5 font-medium">定义其底层人设、必须遵循的法则及其认知边界。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)] pt-4 border-t border-[var(--border-color)]">
               <div>
                  <label className="text-[13px] font-bold text-[var(--text-main)] mb-3 block flex items-center">
                     <SlidersHorizontal className="icon-sm mr-2 text-purple-500" /> 发散度 (Temperature): {temperature}
                  </label>
                  <input 
                     type="range" 
                     min="0.0" 
                     max="2.0" 
                     step="0.1" 
                     value={temperature}
                     onChange={(e) => setTemperature(parseFloat(e.target.value))}
                     className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-1">
                     <span>严谨/确定 (0.0)</span>
                     <span>发散/创造 (2.0)</span>
                  </div>
               </div>

               <div>
                  <label className="text-[13px] font-bold text-[var(--text-main)] mb-3 block flex items-center">
                     <Settings2 className="icon-sm mr-2 text-green-500" /> 回复调性 (Response Style)
                  </label>
                  <select 
                     value={responseStyle}
                     onChange={(e) => setResponseStyle(e.target.value)}
                     className="w-full bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                     <option value="professional">专家型 (严谨、学术、结构化)</option>
                     <option value="creative">创意型 (活泼、网感强、幽默)</option>
                     <option value="concise">极简型 (要点直达、不废话)</option>
                  </select>
               </div>
            </div>
         </div>
         
         <div className="px-6 py-4 border-t border-[var(--border-color)] bg-gray-50 flex justify-end space-x-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-[var(--text-main)] hover:bg-gray-200 rounded-lg transition-colors">
               取消
            </button>
            <button 
               onClick={handleSave}
               className="flex items-center space-x-2 px-5 py-2 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
               <Save className="icon-sm" />
               <span>保存 Persona</span>
            </button>
         </div>
       </motion.div>
    </div>
  );
}
