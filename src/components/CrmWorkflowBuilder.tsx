import React, { useState } from 'react';
import { GitMerge, Mail, Bell, ShieldCheck, Plus, CheckCircle2, Bot, ArrowRight } from 'lucide-react';

const INITIAL_NODES = [
   { id: 1, type: 'trigger', title: '新增高意向线索', desc: '当线索转化概率 > 80%', icon: ShieldCheck, color: 'text-purple-500', bg: 'bg-purple-100', border: 'border-purple-200' },
   { id: 2, type: 'action', title: 'AI 自动评分与打标', desc: '提取行业与意向金额', icon: Bot, color: 'text-indigo-500', bg: 'bg-indigo-100', border: 'border-indigo-200' },
   { id: 3, type: 'condition', title: '是否企业大客户?', desc: '金额 > 100万', icon: GitMerge, color: 'text-blue-500', bg: 'bg-blue-100', border: 'border-blue-200' },
   { id: 4, type: 'action', title: '分配至「王梦璇」跟进', desc: '并发送飞书提醒', icon: Bell, color: 'text-emerald-500', bg: 'bg-emerald-100', border: 'border-emerald-200' },
   { id: 5, type: 'action', title: '发送标准化营销邮件', desc: '含公司产品白皮书', icon: Mail, color: 'text-amber-500', bg: 'bg-amber-100', border: 'border-amber-200' },
];

export function CrmWorkflowBuilder() {
   const [nodes, setNodes] = useState(INITIAL_NODES);

   return (
      <div className="bg-white rounded-[20px] shadow-sm border border-[var(--border-color)] p-6 mt-6">
         <div className="flex justify-between items-center mb-6">
            <div>
               <h3 className="font-bold text-[16px] text-gray-800">可视化销售工作流编排库 (Automation)</h3>
               <p className="text-[12px] text-gray-500 mt-1">拖拽节点编排自动化 CRM 流程，减少人工干预</p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[13px] font-bold shadow-sm transition-colors flex items-center">
               <CheckCircle2 className="w-4 h-4 mr-2" /> 发布工作流
            </button>
         </div>
         
         <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 overflow-x-auto custom-scrollbar flex items-center min-h-[300px]">
            <div className="flex items-center mx-auto space-x-4">
               {nodes.map((node, i) => (
                  <React.Fragment key={node.id}>
                     <div className={`w-56 flex-shrink-0 bg-white border ${node.border} shadow-sm rounded-xl p-4 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group`}>
                        <div className="flex items-start justify-between mb-3">
                           <div className={`w-10 h-10 rounded-lg ${node.bg} flex items-center justify-center shrink-0`}>
                              <node.icon className={`w-5 h-5 ${node.color}`} />
                           </div>
                           <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded uppercase">{node.type}</span>
                        </div>
                        <h4 className="text-[13px] font-black text-gray-800 mb-1">{node.title}</h4>
                        <p className="text-[11px] text-gray-500 font-medium leading-relaxed">{node.desc}</p>
                     </div>
                     
                     {i < nodes.length - 1 && (
                        <div className="flex flex-col items-center justify-center flex-shrink-0">
                           <ArrowRight className="w-6 h-6 text-gray-300" />
                        </div>
                     )}
                  </React.Fragment>
               ))}
               
               <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors ml-4 flex-shrink-0">
                  <Plus className="w-6 h-6" />
               </div>
            </div>
         </div>
         <div className="mt-4 flex justify-between items-center text-[12px]">
            <div className="flex items-center space-x-2">
               <span className="flex items-center font-bold text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span> 工作流引擎已激活</span>
            </div>
            <div className="text-gray-400 font-medium">近 7 天触发次数: <span className="font-bold text-gray-700">1,208 次</span></div>
         </div>
      </div>
   );
}
