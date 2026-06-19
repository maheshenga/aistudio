import React, { useState, useEffect, useMemo } from 'react';
import { UserCircle2, Plus, Search, Shield, Edit2, PlayCircle, MoreHorizontal, Power, Briefcase, Mail } from 'lucide-react';
import { useSaasSession } from '../saas/SaasAuthContext';
import { loadWorkspaceEmployeeAccounts, createWorkspaceEmployeeAccount, updateEmployeeAccountStatus, deleteWorkspaceEmployeeAccount, type EmployeeAccountRepositoryContext, type WorkspaceEmployeeAccount } from '../lib/data/employeeAccountRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { toast } from './Toast';

export function EmployeeAccountsView() {
  const session = useSaasSession();
  const repoContext = useMemo<EmployeeAccountRepositoryContext>(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.workspace.id, session.user.id],
  );
  const [employees, setEmployees] = useState<WorkspaceEmployeeAccount[]>([]);

  useEffect(() => {
    setEmployees(loadWorkspaceEmployeeAccounts(repoContext));
  }, [repoContext]);

  useEffect(() => {
    const handler = () => setEmployees(loadWorkspaceEmployeeAccounts(repoContext));
    if (typeof window !== 'undefined') window.addEventListener('workspace_employee_accounts_updated', handler);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('workspace_employee_accounts_updated', handler); };
  }, [repoContext]);

  const handleCreate = () => {
    const emp = createWorkspaceEmployeeAccount({
      name: '新员工', email: 'new@test.dev', role: 'viewer',
      status: 'available', allowedModules: ['dashboard'], metadata: {},
    }, repoContext);
    logAuditEvent({
      action: 'member_create', moduleId: 'employee_accounts', targetType: 'workspace',
      targetId: emp.id, metadata: { name: emp.name, role: emp.role },
    }, { session });
    setEmployees(loadWorkspaceEmployeeAccounts(repoContext));
    toast('员工账号已创建', 'success');
  };

  const handleSuspend = (id: string) => {
    updateEmployeeAccountStatus(id, 'suspend', 'suspended', repoContext, '手动暂停');
    logAuditEvent({
      action: 'member_update', moduleId: 'employee_accounts', targetType: 'workspace',
      targetId: id, metadata: { action: 'suspend' },
    }, { session });
    setEmployees(loadWorkspaceEmployeeAccounts(repoContext));
    toast('账号已暂停', 'success');
  };

  const handleReactivate = (id: string) => {
    updateEmployeeAccountStatus(id, 'reactivate', 'available', repoContext);
    logAuditEvent({
      action: 'member_update', moduleId: 'employee_accounts', targetType: 'workspace',
      targetId: id, metadata: { action: 'reactivate' },
    }, { session });
    setEmployees(loadWorkspaceEmployeeAccounts(repoContext));
    toast('账号已恢复', 'success');
  };

  const handleDelete = (id: string) => {
    updateEmployeeAccountStatus(id, 'remove', 'removed', repoContext);
    logAuditEvent({
      action: 'member_delete', moduleId: 'employee_accounts', targetType: 'workspace',
      targetId: id, metadata: {},
    }, { session });
    setEmployees(loadWorkspaceEmployeeAccounts(repoContext));
    toast('账号已移除', 'success');
  };

  const activeCount = employees.filter(e => e.status === 'available' || e.status === 'assigned').length;

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
            <button className="bg-green-600 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold hover:bg-green-700 shadow-sm transition-colors text-sm flex items-center" onClick={handleCreate}>
               <Plus className="icon-sm mr-2" />
               新增外包/兼职账号
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
         <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] p-[var(--spacing-lg)] flex flex-col justify-center">
            <h3 className="text-sm font-bold text-[var(--text-muted)] mb-1">兼职/外包总数</h3>
            <div className="text-[var(--text-main)]xl font-black text-[var(--text-main)] mt-2">{employees.length} <span className="text-sm font-bold text-gray-400">个</span></div>
         </div>
         <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] p-[var(--spacing-lg)] flex flex-col justify-center">
            <h3 className="text-sm font-bold text-[var(--text-muted)] mb-1">今日活跃(在线)</h3>
            <div className="text-[var(--text-main)]xl font-black text-[var(--text-main)] mt-2">{activeCount} <span className="text-sm font-bold text-gray-400">人</span></div>
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
            {employees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <UserCircle2 className="icon-xl text-gray-300 mb-4" />
                <p className="text-[var(--text-muted)] font-medium">还没有员工账号。点击「新增外包/兼职账号」开始管理。</p>
              </div>
            ) : (
            <table className="w-full text-left border-collapse min-w-[900px]">
               <thead>
                  <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)]">
                     <th className="py-3 px-6 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">基本信息</th>
                     <th className="py-3 px-6 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">角色/岗位</th>
                     <th className="py-3 px-6 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">已授权面板</th>
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
                              {emp.allowedModules.map((m, i) => (
                                <span key={i} className="text-[10px] font-bold text-[var(--color-primary)] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                                   {m}
                                </span>
                              ))}
                           </div>
                        </td>
                        <td className="py-4 px-6">
                           {emp.status === 'available' || emp.status === 'assigned' ? (
                              <span className="inline-flex items-center text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                 <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>{emp.status === 'available' ? '可用' : '已分配'}
                              </span>
                           ) : (
                              <span className="inline-flex items-center text-[11px] font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-[var(--border-color)]">
                                 <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5"></span>{emp.status === 'suspended' ? '已暂停' : '已移除'}
                              </span>
                           )}
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                           {emp.status === 'suspended' ? (
                             <button onClick={() => handleReactivate(emp.id)} className="text-[11px] font-bold text-green-600 hover:text-white hover:bg-green-600 border border-green-200 bg-green-50 px-2 py-1 rounded transition-colors">
                               恢复
                             </button>
                           ) : emp.status !== 'removed' ? (
                             <button onClick={() => handleSuspend(emp.id)} className="text-[11px] font-bold text-amber-600 hover:text-white hover:bg-amber-600 border border-amber-200 bg-amber-50 px-2 py-1 rounded transition-colors">
                               暂停
                             </button>
                           ) : null}
                           {emp.status !== 'removed' && (
                             <button onClick={() => handleDelete(emp.id)} className="text-[11px] font-bold text-red-500 hover:text-white hover:bg-red-500 border border-red-100 bg-red-50 px-2 py-1 rounded transition-colors">
                               移除
                             </button>
                           )}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
            )}
         </div>
      </div>
    </div>
  );
}
