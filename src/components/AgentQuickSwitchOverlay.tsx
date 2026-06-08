import React, { useState, useEffect } from 'react';
import { Bot, User, Code, PenTool, Sparkles, X, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from './Toast';

export function AgentQuickSwitchOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState('agent-1');

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open_quick_switch', handleOpen);
    return () => window.removeEventListener('open_quick_switch', handleOpen);
  }, []);

  const agents = [
    { id: 'agent-1', name: '全能助手', desc: '默认全局上下文，通用辅助', icon: Bot, color: 'text-blue-500' },
    { id: 'agent-2', name: '代码开发师', desc: '精通前端及架构设计', icon: Code, color: 'text-green-500' },
    { id: 'agent-3', name: 'UI / UX 设计', desc: '页面审美与样式微调', icon: PenTool, color: 'text-purple-500' },
    { id: 'agent-4', name: '文案策划', desc: '撰写推文及多语言翻译', icon: Sparkles, color: 'text-amber-500' },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed bottom-24 left-24 z-50 w-80 bg-[var(--bg-panel)]/90 backdrop-blur-xl border border-[var(--border-color)]/50 rounded-[var(--radius-xl)] shadow-2xl overflow-hidden"
        >
          <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
            <h3 className="font-black text-[var(--text-main)] text-sm flex items-center">
              <Bot className="icon-sm mr-2 text-indigo-600" />
              Agent 上下文游标切换
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="icon-sm" />
            </button>
          </div>
          <div className="p-2 max-h-[60vh] overflow-y-auto">
            {agents.map((agent) => {
               const isActive = activeAgent === agent.id;
               const Icon = agent.icon;
               return (
                 <button
                   key={agent.id}
                   onClick={() => {
                      setActiveAgent(agent.id);
                      toast(`已切换模块上下文至：${agent.name}`, 'success');
                      setIsOpen(false);
                   }}
                   className={`w-full flex items-center p-3 rounded-[var(--radius-lg)] transition-all text-left group ${isActive ? 'bg-indigo-50 border border-indigo-100/50' : 'hover:bg-gray-50 border border-transparent'}`}
                 >
                   <div className={`icon-xl rounded-full ${isActive ? 'bg-indigo-100' : 'bg-gray-100'} flex items-center justify-center mr-3 shrink-0`}>
                      <Icon className={`icon-sm ${agent.color}`} />
                   </div>
                   <div className="flex-1">
                      <div className="flex items-center justify-between">
                         <span className={`text-[13px] font-bold ${isActive ? 'text-indigo-900' : 'text-[var(--text-main)]'}`}>{agent.name}</span>
                         {isActive && <Check className="icon-sm text-indigo-600" />}
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] font-medium">{agent.desc}</span>
                   </div>
                 </button>
               )
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
