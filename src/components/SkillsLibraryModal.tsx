import React, { useState } from 'react';
import { X, Search, FileJson, Upload, Download, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from './Toast';

export function SkillsLibraryModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [skills, setSkills] = useState([
    { id: '1', name: 'UI / UX 专家', description: '精通前端及架构设计，熟练掌握 Tailwind/React 最佳实践', downloads: 1420 },
    { id: '2', name: '数据分析科学家', description: '精通 D3.js 报表及多维数据挖掘透视，适合分析任务', downloads: 890 },
    { id: '3', name: '文案优化大师', description: '基于社交媒体爆款模型的文案风格化编辑', downloads: 350 },
  ]);

  const handleExport = (name: string) => {
    toast(`已成功导出 ${name} 的配置文件 (JSON)`, 'success');
  };

  const handleImport = () => {
    toast('已选择并导入本地 JSON 技能预设', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
       <motion.div
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         exit={{ opacity: 0, scale: 0.95 }}
         className="bg-[var(--bg-panel)] rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-[var(--border-color)] flex flex-col max-h-[80vh]"
       >
         <div className="px-6 py-5 border-b border-[var(--border-color)] flex items-center justify-between bg-gray-50/50">
            <h3 className="font-black text-[var(--text-main)] flex items-center">
               <Library className="icon-md mr-2 text-indigo-600" />
               Agent 技能预设大厅 (Skills Library)
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:bg-gray-200 p-1 rounded-lg">
               <X className="icon-md" />
            </button>
         </div>
         
         <div className="p-[var(--spacing-lg)] flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-[var(--spacing-md)]">
               <div className="relative w-64">
                  <Search className="icon-sm absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="搜索已保存的 Persona..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-[var(--border-color)] rounded-lg text-sm font-medium focus:ring-1 focus:ring-indigo-500 outline-none" />
               </div>
               <button onClick={handleImport} className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-sm rounded-lg border border-indigo-200 transition-colors">
                  <Upload className="icon-sm" />
                  <span>导入预设</span>
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
               {skills.map(skill => (
                  <div key={skill.id} className="border border-[var(--border-color)] rounded-[var(--radius-lg)] p-5 hover:border-indigo-300 hover:ring-1 hover:ring-indigo-100 transition-all group bg-[var(--bg-panel)] shadow-sm hover:shadow-md">
                     <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-[var(--text-main)] text-sm">{skill.name}</h4>
                        <span className="text-[10px] bg-gray-100 text-[var(--text-muted)] font-bold px-2 py-0.5 rounded-full">{skill.downloads} 次使用</span>
                     </div>
                     <p className="text-xs text-[var(--text-muted)] mb-4 line-clamp-2 leading-relaxed">{skill.description}</p>
                     <div className="flex items-center space-x-2 pt-3 border-t border-gray-50">
                        <button onClick={() => handleExport(skill.name)} className="flex-1 flex items-center justify-center space-x-1 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded text-xs font-bold transition-colors">
                           <Download className="w-3.5 h-3.5" />
                           <span>导出 JSON</span>
                        </button>
                        <button className="flex items-center justify-center space-x-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded text-xs font-bold transition-colors">
                           <Share2 className="w-3.5 h-3.5" />
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         </div>
       </motion.div>
    </div>
  );
}

// Needed Icon imports
import { Library } from 'lucide-react';
