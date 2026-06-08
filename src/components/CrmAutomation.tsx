import React, { useState } from 'react';
import { Plus, Trash2, ArrowRight, Save, Play, Settings } from 'lucide-react';
import { toast } from './Toast';

export function CrmAutomation() {
    const [rules, setRules] = useState([
        { id: 1, trigger: '客户状态变更为活跃', action: '自动触发欢迎邮件', active: true },
        { id: 2, trigger: '客户评分低于 3 星', action: '自动创建挽回任务', active: false },
        { id: 3, trigger: '项目交付满 7 天', action: '自动发送满意度评测问卷(CSAT)', active: true }
    ]);

    const handleSave = () => {
        toast('自动化规则已应用', 'success');
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--border-color)] p-6 min-h-[500px]">
           <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-gray-800 flex items-center">
                 <Settings className="w-5 h-5 mr-2 text-indigo-500" /> CRM 自动化规则
              </h3>
              <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors flex items-center">
                 <Save className="w-4 h-4 mr-1.5" /> 保存配置
              </button>
           </div>
           
           <div className="space-y-4">
              {rules.map((rule, idx) => (
                 <div key={rule.id} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between bg-gray-50/50 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4 flex-1">
                       <span className="font-black text-gray-400 text-lg">{idx + 1}</span>
                       <div className="flex items-center space-x-3 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm font-bold text-gray-700 shadow-sm">
                           IF <span className="text-blue-600 mx-2">{rule.trigger}</span>
                       </div>
                       <ArrowRight className="w-5 h-5 text-gray-400" />
                       <div className="flex items-center space-x-3 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm font-bold text-indigo-700 shadow-sm">
                           THEN <span className="mx-2">{rule.action}</span>
                       </div>
                    </div>
                    <div className="flex items-center space-x-3">
                       <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={rule.active} onChange={() => {
                             setRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: !r.active } : r));
                          }} />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                       </label>
                       <button className="p-2 text-gray-400 hover:text-rose-500 transition-colors" title="删除规则">
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                 </div>
              ))}
              
              <button className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-center text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors flex items-center justify-center font-bold text-sm">
                 <Plus className="w-4 h-4 mr-2" />
                 添加新规则
              </button>
           </div>
        </div>
    );
}
