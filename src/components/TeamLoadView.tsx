import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { Users, AlertTriangle, CheckCircle, TrendingUp, Cpu } from 'lucide-react';

const LOAD_DATA = [
   { name: '陈效', 待办: 12, 跟进: 8, 完成: 25, 饱和度: 85 },
   { name: '林设计', 待办: 5, 跟进: 3, 完成: 15, 饱和度: 45 },
   { name: '张经理', 待办: 18, 跟进: 12, 完成: 40, 饱和度: 95 },
   { name: '王梦璇', 待办: 8, 跟进: 5, 完成: 20, 饱和度: 60 }
];

export function TeamLoadView() {
   return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
         <div className="flex items-center justify-between">
            <div>
               <h3 className="text-lg font-black text-gray-800 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-500" />
                  团队任务负载均衡与智能调度
               </h3>
               <p className="text-sm text-gray-500 mt-1">AI 实时监控团队成员任务饱和度，并自动推荐任务流转方案</p>
            </div>
            <button className="bg-white border border-[var(--border-color)] px-4 py-2 rounded-xl text-[13px] font-bold shadow-sm hover:bg-gray-50 transition-colors flex items-center">
               <Cpu className="w-4 h-4 mr-2 text-indigo-500" /> 一键采纳 AI 调度建议
            </button>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-[20px] shadow-sm border border-[var(--border-color)] p-6">
               <h4 className="text-[14px] font-bold text-gray-800 mb-6">团队实时工作状态饱和度</h4>
               <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={LOAD_DATA} margin={{ top: 20, right: 30, left: -20, bottom: 5 }} barSize={30}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 'bold', fill: '#6b7280' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                        <Bar dataKey="待办" stackId="a" fill="#f87171" radius={[0, 0, 4, 4]} />
                        <Bar dataKey="跟进" stackId="a" fill="#60a5fa" />
                        <Bar dataKey="完成" stackId="a" fill="#34d399" radius={[4, 4, 0, 0]} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-white rounded-[20px] shadow-sm border border-[var(--border-color)] p-6 flex flex-col">
               <h4 className="text-[14px] font-bold text-gray-800 mb-4 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-500" /> AI 调度建议
               </h4>

               <div className="space-y-4 flex-1">
                  <div className="p-4 border border-red-100 bg-red-50/50 rounded-xl">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-[13px] font-bold text-red-800">张经理：过载 (95%)</span>
                        <span className="text-[10px] font-bold bg-white border border-red-200 text-red-600 px-1.5 py-0.5 rounded">优先级: 高</span>
                     </div>
                     <p className="text-[12px] text-red-700 leading-relaxed font-medium mb-3">
                        检测到张经理目前有 18 个待办，超出了历史最佳效率区间（日均 10-12 单）。长时间过载可能增加客诉率。
                     </p>
                     <div className="bg-white p-3 rounded-lg border border-red-100">
                        <div className="text-[12px] font-bold text-gray-700 mb-2 flex items-center"><TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-500" /> 推荐调度方案:</div>
                        <ul className="text-[11px] text-gray-600 space-y-1.5 font-medium">
                           <li>• 将 3 个「线索跟进」转移至 <span className="font-bold text-indigo-600">王梦璇</span> (当前 60%)</li>
                           <li>• 将 2 个「合同撰写」转移至 <span className="font-bold text-indigo-600">林设计</span> (当前 45%)</li>
                        </ul>
                     </div>
                  </div>

                  <div className="p-4 border border-emerald-100 bg-emerald-50/50 rounded-xl">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-[13px] font-bold text-emerald-800">林设计：空闲 (45%)</span>
                        <span className="text-[10px] font-bold bg-white border border-emerald-200 text-emerald-600 px-1.5 py-0.5 rounded">健康</span>
                     </div>
                     <p className="text-[12px] text-emerald-700 leading-relaxed font-medium">
                        当前工作量较为充裕，可承接更多协作性质的推进任务。建议分配更多高优支持工作。
                     </p>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
