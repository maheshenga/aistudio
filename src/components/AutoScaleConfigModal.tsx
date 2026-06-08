import React, { useState } from 'react';
import { X, Network, Settings2, Plus, ArrowRight, Save, ShieldAlert, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from './Toast';

export function AutoScaleConfigModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [rules, setRules] = useState([
    { id: 1, metric: 'queue_depth', operator: '>', value: 50, action: 'spawn', amount: 2, isActive: true },
    { id: 2, metric: 'latency', operator: '>', value: 1500, action: 'spawn', amount: 1, isActive: true },
    { id: 3, metric: 'cpu', operator: '<', value: 20, action: 'kill', amount: 1, isActive: false },
  ]);

  const handleSave = () => {
    toast('弹性扩缩容策略已更新，实时生效', 'success');
    onClose();
  };

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
            <h3 className="font-black text-[var(--text-main)] flex items-center text-lg">
               <Network className="icon-md mr-2 text-indigo-600" />
               Auto-Scale 弹性伸缩配置
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:bg-gray-200 p-1 rounded-lg">
               <X className="icon-md" />
            </button>
         </div>
         
         <div className="flex-1 overflow-y-auto p-[var(--spacing-lg)] bg-gray-50 flex flex-col">
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-[var(--radius-xl)] mb-[var(--spacing-md)] flex items-start">
               <ShieldAlert className="icon-md text-indigo-600 mr-3 mt-0.5 shrink-0" />
               <div>
                  <h4 className="font-bold text-indigo-900 text-sm mb-1">自动扩缩容引擎已连接 Kubernetes 集群</h4>
                  <p className="text-xs text-indigo-700 opacity-90 leading-relaxed">设置基于任务积压深度 (Queue Depth)、延迟水位 (Latency ms) 或算力基准 (CPU) 的自动化扩容规则，保障高并发下的 Multi-Agent 响应力。</p>
               </div>
            </div>

            <div className="flex justify-between items-center mb-4">
               <h4 className="text-sm font-bold text-[var(--text-main)]">活跃触发策略 (Scaling Rules)</h4>
               <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 text-[12px] font-bold rounded-lg transition-colors shadow-sm">
                  <Plus className="w-3.5 h-3.5" />
                  <span>添加规则</span>
               </button>
            </div>

            <div className="space-y-3">
               {rules.map((rule) => (
                  <div key={rule.id} className={`flex items-center justify-between bg-[var(--bg-panel)] p-4 rounded-[var(--radius-lg)] border ${rule.isActive ? 'border-indigo-200 shadow-sm' : 'border-[var(--border-color)] opacity-60'} transition-all`}>
                     <div className="flex items-center space-x-3 flex-1 flex-wrap gap-y-2">
                        <span className="text-[12px] font-bold text-[var(--text-muted)] uppercase">IF</span>
                        <select className="bg-gray-50 border border-[var(--border-color)] rounded text-[12px] font-bold px-2 py-1 text-[var(--text-main)] outline-none focus:ring-1 focus:ring-indigo-500">
                           <option value="queue_depth" selected={rule.metric === 'queue_depth'}>任务积压数</option>
                           <option value="latency" selected={rule.metric === 'latency'}>P99 延迟 (ms)</option>
                           <option value="cpu" selected={rule.metric === 'cpu'}>CPU 负荷 (%)</option>
                        </select>
                        <select className="bg-gray-50 border border-[var(--border-color)] rounded text-[12px] font-bold px-2 py-1 text-[var(--text-main)] outline-none focus:ring-1 focus:ring-indigo-500 w-16">
                           <option value=">" selected={rule.operator === '>'}>&gt;</option>
                           <option value="<" selected={rule.operator === '<'}>&lt;</option>
                           <option value="=" selected={rule.operator === '='}>=</option>
                        </select>
                        <input type="text" defaultValue={rule.value} className="bg-gray-50 border border-[var(--border-color)] rounded text-[12px] font-bold px-2 py-1 w-20 text-[var(--text-main)] outline-none focus:ring-1 focus:ring-indigo-500" />
                        <ArrowRight className="icon-sm text-gray-400 mx-2" />
                        <span className="text-[12px] font-bold text-[var(--text-muted)] uppercase">THEN</span>
                        <select className="bg-gray-50 border border-[var(--border-color)] rounded text-[12px] font-bold px-2 py-1 text-indigo-700 outline-none focus:ring-1 focus:ring-indigo-500">
                           <option value="spawn" selected={rule.action === 'spawn'}>裂变 (Spawn)</option>
                           <option value="kill" selected={rule.action === 'kill'}>销毁 (Kill)</option>
                        </select>
                        <div className="flex items-center space-x-2">
                           <input type="number" defaultValue={rule.amount} className="bg-gray-50 border border-[var(--border-color)] rounded text-[12px] font-bold px-2 py-1 w-16 text-[var(--text-main)] outline-none focus:ring-1 focus:ring-indigo-500 text-center" />
                           <span className="text-[12px] font-bold text-gray-600">个实例</span>
                        </div>
                     </div>
                     <div className="ml-4">
                        <button 
                           onClick={() => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r))}
                           className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${rule.isActive ? 'bg-indigo-600' : 'bg-gray-300'}`}
                        >
                           <span className={`absolute top-1/2 -translate-y-1/2 icon-sm bg-[var(--bg-panel)] rounded-full transition-all shadow-sm ${rule.isActive ? 'left-[22px]' : 'left-1'}`}></span>
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         </div>
         <div className="px-6 py-4 border-t border-[var(--border-color)] bg-gray-50 flex justify-end space-x-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-[var(--text-main)] hover:bg-gray-200 rounded-lg transition-colors">
               放弃更改
            </button>
            <button 
               onClick={handleSave}
               className="flex items-center space-x-2 px-5 py-2 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
               <Save className="icon-sm" />
               <span>部署策略集群</span>
            </button>
         </div>
       </motion.div>
    </div>
  );
}
