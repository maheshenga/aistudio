import React, { useState } from 'react';
import { UserCircle2, Plus, Search, Shield, Edit2, PlayCircle, MoreHorizontal, Power, Briefcase, Mail } from 'lucide-react';

export function EmployeeAccountsView() {
  const [employees, setEmployees] = useState([
    { id: 1, name: 'Alice Wang', role: '内容创作者', email: 'alice@company.com', status: '正常', lastLogin: '今天 09:30', views: ['工作台概览', '文案创作', '智能混剪'] },
    { id: 2, name: 'Ethan Lin', role: '运营专员', email: 'ethan@company.com', status: '正常', lastLogin: '昨天 14:15', views: ['数据分析', '营销中心', '媒体账号'] },
    { id: 3, name: 'Diana Zhao', role: '设计师', email: 'diana@company.com', status: '离线', lastLogin: '3 天前', views: ['主图设计', '创意海报', '素材管理'] },
  ]);

  return (
    <div className="p-4 sm:p-[var(--spacing-lg)] lg:p-[var(--spacing-xl)] max-w-[1600px] mx-auto space-y-[var(--spacing-lg)]">
      <div className="flex flex-col md:flex-row items-center justify-between gap-[var(--spacing-md)] bg-[var(--bg-panel)] p-[var(--spacing-lg)] rounded-[24px] border border-[var(--border-color)] shadow-sm relative overflow-hidden">
         <div className="absolute right-0 top-0 w-64 h-64 bg-green-50 rounded-full translate-x-1/3 -translate-y-1/3 opacity-50 blur-3xl pointer-events-none"></div>
         <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-2">
               <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-green-100 text-green-600 flex items-center justify-center">
                  <UserCircle2 className="icon-md" />
               </div>
               <h2 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">兼职/外包员工账号管理</h2>
            </div>
            <p className="text-sm text-[var(--text-muted)] max-w-xl">
               为您的员工创建独立的控制面板体系，每个员工仅能访问被授权的模块，数据与工作台状态互相隔离。
            </p>
         </div>
         <div className="relative z-10 flex gap-3">
            <button className="bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-700 px-5 py-2.5 rounded-[var(--radius-lg)] font-bold shadow-sm hover:bg-gray-50 transition-colors text-sm">
               权限组配置
            </button>
            <button className="bg-green-600 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold hover:bg-green-700 shadow-sm transition-colors text-sm flex items-center">
               <Plus className="icon-sm mr-2" />
               新增外包/兼职账号
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
         <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] p-[var(--spacing-lg)] flex flex-col justify-center">
            <h3 className="text-sm font-bold text-[var(--text-muted)] mb-1">兼职/外包总数</h3>
            <div className="text-[var(--text-main)]xl font-black text-[var(--text-main)] mt-2">12 <span className="text-sm font-bold text-gray-400">个</span></div>
         </div>
         <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] p-[var(--spacing-lg)] flex flex-col justify-center">
            <h3 className="text-sm font-bold text-[var(--text-muted)] mb-1">今日活跃(在线)</h3>
            <div className="text-[var(--text-main)]xl font-black text-[var(--text-main)] mt-2">4 <span className="text-sm font-bold text-gray-400">人</span></div>
         </div>
         <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] p-[var(--spacing-lg)] flex flex-col justify-center">
            <h3 className="text-sm font-bold text-[var(--text-muted)] mb-1">即将到期的权限</h3>
            <div className="text-[var(--text-main)]xl font-black text-[var(--text-main)] mt-2">0 <span className="text-sm font-bold text-gray-400">个</span></div>
         </div>
      </div>

      <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden">
         <div className="p-5 border-b border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-center gap-[var(--spacing-md)]">
            <h3 className="font-bold text-[var(--text-main)] text-lg">员工列表</h3>
            <div className="relative w-full sm:w-64">
               <Search className="icon-sm absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
               <input 
                 type="text" 
                 placeholder="搜索员工姓名或邮箱..." 
                 className="pl-9 pr-4 py-2 w-full border border-[var(--border-color)] rounded-lg text-sm bg-gray-50 focus:bg-[var(--bg-panel)] focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors"
               />
            </div>
         </div>
         <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse min-w-[900px]">
               <thead>
                  <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)]">
                     <th className="py-3 px-6 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">基本信息</th>
                     <th className="py-3 px-6 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">角色/岗位</th>
                     <th className="py-3 px-6 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">已授权面板</th>
                     <th className="py-3 px-6 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap text-right">上次登录</th>
                     <th className="py-3 px-6 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">状态</th>
                     <th className="py-3 px-6 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-right whitespace-nowrap">操作</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {employees.map(emp => (
                     <tr key={emp.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="py-4 px-6">
                           <div className="font-bold text-sm text-[var(--text-main)] flex items-center">
                              <span className="w-7 h-7 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] mr-2">
                                 {emp.name.charAt(0)}
                              </span>
                              {emp.name}
                           </div>
                           <div className="text-[11px] text-[var(--text-muted)] mt-0.5 flex items-center">
                              <Mail className="w-3 h-3 mr-1" /> {emp.email}
                           </div>
                        </td>
                        <td className="py-4 px-6">
                           <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 text-gray-700 bg-gray-100 rounded">
                              {emp.role}
                           </span>
                        </td>
                        <td className="py-4 px-6">
                           <div className="flex flex-wrap gap-1">
                              {emp.views.map((v, i) => (
                                <span key={i} className="text-[10px] font-bold text-[var(--color-primary)] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                                   {v}
                                </span>
                              ))}
                           </div>
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-[var(--text-muted)] text-xs">
                           {emp.lastLogin}
                        </td>
                        <td className="py-4 px-6">
                           {emp.status === '正常' ? (
                              <span className="inline-flex items-center text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                 <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>正常
                              </span>
                           ) : (
                              <span className="inline-flex items-center text-[11px] font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-[var(--border-color)]">
                                 <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5"></span>离线/冻结
                              </span>
                           )}
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                           <button className="text-[11px] font-bold text-green-600 hover:text-white hover:bg-green-600 border border-green-200 bg-green-50 px-2 py-1 rounded transition-colors tooltip" title="模拟登录以预览其控制面板">
                              <PlayCircle className="w-3.5 h-3.5 inline mr-1" />
                              预览面板
                           </button>
                           <button className="text-[11px] font-bold text-gray-600 hover:text-white hover:bg-gray-800 border border-[var(--border-color)] bg-gray-50 px-2 py-1 rounded transition-colors tooltip" title="编辑授权">
                              <Edit2 className="w-3.5 h-3.5" />
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
