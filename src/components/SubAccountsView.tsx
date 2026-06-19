import React, { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Search, Shield, Settings2, MoreHorizontal, Power, PiggyBank, Briefcase, AlertCircle, Mail, Bell, Check, X } from 'lucide-react';
import { useSaasSession } from '../saas/SaasAuthContext';
import { loadWorkspaceSubAccounts, createWorkspaceSubAccount, updateWorkspaceSubAccount, deleteWorkspaceSubAccount, type WorkspaceSubAccount, type TeamRepositoryContext } from '../lib/data/teamRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { toast } from './Toast';

export function SubAccountsView() {
  const session = useSaasSession();
  const repoContext = useMemo<TeamRepositoryContext>(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.workspace.id, session.user.id],
  );
  const [accounts, setAccounts] = useState<WorkspaceSubAccount[]>([]);

  useEffect(() => {
    setAccounts(loadWorkspaceSubAccounts(repoContext));
  }, [repoContext]);

  useEffect(() => {
    const handler = () => setAccounts(loadWorkspaceSubAccounts(repoContext));
    if (typeof window !== 'undefined') window.addEventListener('workspace_sub_accounts_updated', handler);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('workspace_sub_accounts_updated', handler); };
  }, [repoContext]);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<WorkspaceSubAccount | null>(null);

  const handleCreate = () => {
    const account = createWorkspaceSubAccount({
      platform: 'custom', accountName: '新子账户', status: 'active', credentialsMeta: {},
    }, repoContext);
    logAuditEvent({
      action: 'member_create', moduleId: 'sub_accounts', targetType: 'workspace',
      targetId: account.id, metadata: { name: account.accountName, platform: account.platform },
    }, { session });
    setAccounts(loadWorkspaceSubAccounts(repoContext));
    toast('子账户已创建', 'success');
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disconnected' : 'active';
    updateWorkspaceSubAccount(id, { status: newStatus }, repoContext);
    logAuditEvent({
      action: 'member_update', moduleId: 'sub_accounts', targetType: 'workspace',
      targetId: id, metadata: { status: newStatus },
    }, { session });
    setAccounts(loadWorkspaceSubAccounts(repoContext));
    toast(newStatus === 'active' ? '账户已激活' : '账户已冻结', 'success');
  };

  const handleDelete = (id: string) => {
    deleteWorkspaceSubAccount(id, repoContext);
    logAuditEvent({
      action: 'member_delete', moduleId: 'sub_accounts', targetType: 'workspace',
      targetId: id, metadata: {},
    }, { session });
    setAccounts(loadWorkspaceSubAccounts(repoContext));
    toast('账户已删除', 'success');
  };

  const openConfig = (acc: WorkspaceSubAccount) => {
    setSelectedAccount(acc);
    setShowConfigModal(true);
  };

  const activeCount = accounts.filter(a => a.status === 'active').length;

  return (
    <div className="p-4 sm:p-[var(--spacing-lg)] lg:p-[var(--spacing-xl)] max-w-[1600px] mx-auto space-y-[var(--spacing-lg)]">
      <div className="flex flex-col md:flex-row items-center justify-between gap-[var(--spacing-md)] bg-[var(--bg-panel)] p-[var(--spacing-lg)] rounded-[24px] border border-[var(--border-color)] shadow-sm relative overflow-hidden">
         <div className="absolute right-0 top-0 w-64 h-64 bg-blue-50 rounded-full translate-x-1/3 -translate-y-1/3 opacity-50 blur-3xl pointer-events-none"></div>
         <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-2">
               <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-blue-100 text-[var(--color-primary)] flex items-center justify-center">
                  <Briefcase className="icon-md" />
               </div>
               <h2 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">矩阵分发子账户管理</h2>
            </div>
            <p className="text-sm text-[var(--text-muted)] max-w-xl">
               创建具有独立算力或共享额度的子账号，适用于多店铺矩阵运营、不同业务线独立核算或是外部合作伙伴协作。
            </p>
         </div>
         <div className="relative z-10 flex gap-3">
            <button className="bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-700 px-5 py-2.5 rounded-[var(--radius-lg)] font-bold shadow-sm hover:bg-gray-50 transition-colors text-sm">
               额度划拨记录
            </button>
            <button className="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold hover:bg-blue-700 shadow-sm transition-colors text-sm flex items-center" onClick={handleCreate}>
               <Plus className="icon-sm mr-2" />
               开通子账户
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
         <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] p-[var(--spacing-lg)] flex flex-col justify-center">
            <h3 className="text-sm font-bold text-[var(--text-muted)] mb-1">主账户可用算力余额</h3>
            <div className="text-[var(--text-main)]xl font-black text-[var(--text-main)] mt-2">124,500 <span className="text-sm font-bold text-gray-400">点</span></div>
         </div>
         <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] p-[var(--spacing-lg)] flex flex-col justify-center">
            <h3 className="text-sm font-bold text-[var(--text-muted)] mb-1">已累计分配算力</h3>
            <div className="text-[var(--text-main)]xl font-black text-[var(--text-main)] mt-2">45,000 <span className="text-sm font-bold text-gray-400">点</span></div>
         </div>
         <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] p-[var(--spacing-lg)] flex flex-col justify-center">
            <h3 className="text-sm font-bold text-[var(--text-muted)] mb-1">当前活跃子账户</h3>
            <div className="text-[var(--text-main)]xl font-black text-[var(--text-main)] mt-2">{activeCount} <span className="text-sm font-bold text-gray-400">个</span></div>
         </div>
      </div>

      <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden">
         <div className="p-5 border-b border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-center gap-[var(--spacing-md)]">
            <h3 className="font-bold text-[var(--text-main)] text-lg">账户列表</h3>
            <div className="relative w-full sm:w-64">
               <Search className="icon-sm absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
               <input 
                 type="text" 
                 placeholder="搜索账户名称..." 
                 className="pl-9 pr-4 py-2 w-full border border-[var(--border-color)] rounded-lg text-sm bg-gray-50 focus:bg-[var(--bg-panel)] focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
               />
            </div>
         </div>
         <div className="overflow-x-auto min-h-[400px]">
            {accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Briefcase className="icon-xl text-gray-300 mb-4" />
                <p className="text-[var(--text-muted)] font-medium">还没有子账户。点击「开通子账户」开始管理多店铺矩阵。</p>
              </div>
            ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
               <thead>
                  <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)]">
                     <th className="py-3 px-6 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">账户信息</th>
                     <th className="py-3 px-6 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">平台</th>
                     <th className="py-3 px-6 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">状态</th>
                     <th className="py-3 px-6 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-right whitespace-nowrap">操作</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {accounts.map(acc => (
                     <tr key={acc.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="py-4 px-6">
                           <div className="font-bold text-sm text-[var(--text-main)]">{acc.accountName}</div>
                           <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{acc.accountId ?? '—'}</div>
                        </td>
                        <td className="py-4 px-6">
                           <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded border bg-blue-50 text-[var(--color-primary)] border-blue-100">
                              {acc.platform}
                           </span>
                        </td>
                        <td className="py-4 px-6">
                           {acc.status === 'active' ? (
                              <span className="inline-flex items-center text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                 <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>正常
                              </span>
                           ) : (
                              <span className="inline-flex items-center text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                 <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>{acc.status === 'disconnected' ? '已冻结' : acc.status}
                              </span>
                           )}
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                           <button onClick={() => openConfig(acc)} className="text-[11px] font-bold text-gray-600 hover:text-white hover:bg-gray-800 border border-[var(--border-color)] bg-gray-50 px-2 py-1 rounded transition-colors tooltip" title="参数配置">
                              <Settings2 className="w-3.5 h-3.5" />
                           </button>
                           <button onClick={() => handleToggleStatus(acc.id, acc.status)} className={`text-[11px] font-bold px-2 py-1 rounded transition-colors border ${acc.status === 'active' ? 'text-red-500 hover:text-white hover:bg-red-500 border-red-100 bg-red-50' : 'text-green-500 hover:text-white hover:bg-green-500 border-green-100 bg-green-50'}`} title={acc.status === 'active' ? '冻结账户' : '解冻账户'}>
                              <Power className="w-3.5 h-3.5" />
                           </button>
                           <button onClick={() => handleDelete(acc.id)} className="text-[11px] font-bold text-red-500 hover:text-white hover:bg-red-500 border border-red-100 bg-red-50 px-2 py-1 rounded transition-colors" title="删除账户">
                              <X className="w-3.5 h-3.5" />
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
            )}
         </div>
      </div>

      {showConfigModal && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConfigModal(false)}></div>
          <div className="bg-[var(--bg-panel)] w-full max-w-lg rounded-[24px] shadow-2xl relative z-10 p-7 border border-[var(--border-color)] animate-in fade-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-[var(--spacing-md)]">
                <div className="flex items-center space-x-3">
                   <div className="w-10 h-10 bg-gray-100 rounded-[var(--radius-lg)] flex items-center justify-center text-gray-700">
                      <Settings2 className="icon-md" />
                   </div>
                   <div>
                      <h3 className="font-bold text-[var(--text-main)] text-lg">配额与告警配置</h3>
                      <p className="text-xs text-[var(--text-muted)]">{selectedAccount.accountName}</p>
                   </div>
                </div>
                <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                   <X className="icon-md" />
                </button>
             </div>

             <div className="space-y-[var(--spacing-lg)]">
                <div>
                   <label className="block text-[13px] font-bold text-gray-700 mb-2">算力控制模式</label>
                   <div className="flex bg-gray-50 p-1 rounded-[var(--radius-lg)] border border-[var(--border-color)]">
                      <button className={`flex-1 py-2 text-sm font-bold rounded-lg ${selectedAccount.type === '独立核算' ? 'bg-[var(--bg-panel)] shadow-sm text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>独立硬限额</button>
                      <button className={`flex-1 py-2 text-sm font-bold rounded-lg ${selectedAccount.type === '共享额度' ? 'bg-[var(--bg-panel)] shadow-sm text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>主账户软共享</button>
                   </div>
                </div>

                <div>
                   <label className="block text-[13px] font-bold text-gray-700 mb-2">硬性调用限制 (Token/点数)</label>
                   <div className="relative">
                      <input type="number" defaultValue={selectedAccount.limit === '共享' ? 20000 : selectedAccount.limit} disabled={selectedAccount.type === '共享额度'} className="w-full pl-4 pr-12 py-3 border border-[var(--border-color)] rounded-[var(--radius-lg)] text-sm font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:bg-gray-50 transition-all outline-none" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">点/月</span>
                   </div>
                </div>

                <div className="border border-red-100 bg-red-50/50 rounded-[var(--radius-lg)] p-4">
                   <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2 text-red-700 font-bold text-[13px]">
                         <Bell className="icon-sm" />
                         <span>预算消耗告警策略</span>
                      </div>
                      <div className="w-10 h-5 bg-red-500 rounded-full relative cursor-pointer border border-red-600 shadow-inner">
                         <div className="icon-sm bg-[var(--bg-panel)] rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                      </div>
                   </div>
                   <p className="text-[11px] text-gray-600 mb-4 leading-relaxed font-medium">开启后，当该子账号单月消耗达到指定阈值时，将会发送通知给相关负责人。</p>
                   
                   <div className="space-y-3">
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-bold text-gray-700">告警阈值</span>
                         <span className="text-xs font-bold text-red-600 px-2 py-0.5 bg-red-100 rounded border border-red-200">80%</span>
                      </div>
                      <input type="range" min="50" max="100" defaultValue="80" className="w-full accent-red-500 bg-gray-200 h-1 rounded-full cursor-pointer appearance-none" />
                   </div>

                   <div className="mt-4 pt-4 border-t border-red-100 space-y-[var(--spacing-md)]">
                      <div>
                         <label className="block text-[11px] font-bold text-gray-700 mb-1.5">通知渠道配置</label>
                         <div className="flex bg-[var(--bg-panel)] rounded-lg border border-red-200 overflow-hidden divide-x divide-red-100">
                            <label className="flex-1 flex items-center justify-center py-2 px-3 cursor-pointer hover:bg-red-50 transition-colors">
                               <input type="checkbox" className="mr-2 accent-red-500" defaultChecked />
                               <Mail className="w-3.5 h-3.5 text-[var(--text-muted)] mr-1" />
                               <span className="text-xs font-bold text-gray-700">Email</span>
                            </label>
                            <label className="flex-1 flex items-center justify-center py-2 px-3 cursor-pointer hover:bg-red-50 transition-colors bg-red-50/50">
                               <input type="checkbox" className="mr-2 accent-red-500" defaultChecked />
                               <Bell className="w-3.5 h-3.5 text-red-600 mr-1" />
                               <span className="text-xs font-bold text-red-800">系统应用内消息</span>
                            </label>
                         </div>
                      </div>
                      <div>
                         <label className="block text-[11px] font-bold text-gray-700 mb-1.5">接收账号配置 (Email / 员工 ID)</label>
                         <div className="flex items-center bg-[var(--bg-panel)] border border-red-200 rounded-lg focus-within:ring-1 focus-within:ring-red-500 px-3 py-2 shadow-sm">
                            <Mail className="w-3.5 h-3.5 text-gray-400 mr-2" />
                            <input type="text" defaultValue={selectedAccount.email} className="w-full outline-none text-xs text-gray-700" />
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             <div className="mt-8 flex justify-end space-x-3">
                <button onClick={() => setShowConfigModal(false)} className="px-5 py-2.5 rounded-[var(--radius-lg)] border border-[var(--border-color)] text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors">取消</button>
                <button onClick={() => setShowConfigModal(false)} className="px-5 py-2.5 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white font-bold text-sm hover:bg-blue-700 shadow-sm transition-colors flex items-center">
                   <Check className="icon-sm mr-1.5" /> 保存配置
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
