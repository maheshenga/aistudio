import React, { useState, useEffect, useMemo } from 'react';
import { Plus, CheckCircle2, AlertCircle, Smartphone, TrendingUp, Users } from 'lucide-react';
import { useSaasSession } from '../saas/SaasAuthContext';
import { loadWorkspaceMediaAccounts, createWorkspaceMediaAccount, updateWorkspaceMediaAccount, saveWorkspaceMediaAccounts, type MediaRepositoryContext, type WorkspaceMediaAccount } from '../lib/data/mediaRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { hasWorkspacePermission } from '../saas/permissions';
import { toast } from './Toast';

export function MediaAccountsView() {
  const session = useSaasSession();
  const repoContext = useMemo<MediaRepositoryContext>(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.workspace.id, session.user.id],
  );
  const [accounts, setAccounts] = useState<WorkspaceMediaAccount[]>([]);
  const canWrite = hasWorkspacePermission(session.membership.role, 'resources.write');

  useEffect(() => {
    setAccounts(loadWorkspaceMediaAccounts(repoContext));
  }, [repoContext]);

  useEffect(() => {
    const handler = () => setAccounts(loadWorkspaceMediaAccounts(repoContext));
    if (typeof window !== 'undefined') window.addEventListener('workspace_media_accounts_updated', handler);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('workspace_media_accounts_updated', handler); };
  }, [repoContext]);

  const handleCreate = () => {
    if (!canWrite) { toast('权限不足', 'error'); return; }
    // 安全：只存元数据引用，不存原始 token/secret
    const account = createWorkspaceMediaAccount({
      platformName: '新平台账号',
      status: 'needs_config',
      connectedAccounts: 0,
      ownerId: session.user.id,
      scopes: ['content.publish'],
      metadata: {},
    }, repoContext);
    logAuditEvent({
      action: 'media_account_update', targetType: 'media_account',
      targetId: account.id, metadata: { platform: account.platformName, action: 'connect', ownerId: account.ownerId, scopes: account.scopes },
    }, { session });
    setAccounts(loadWorkspaceMediaAccounts(repoContext));
    toast('账号已添加（需配置授权）', 'success');
  };

  const handleReconnect = (id: string) => {
    if (!canWrite) { toast('权限不足', 'error'); return; }
    updateWorkspaceMediaAccount(id, { status: 'active', ownerId: session.user.id }, repoContext);
    logAuditEvent({
      action: 'media_account_update', targetType: 'media_account',
      targetId: id, metadata: { action: 'reauthorize', ownerId: session.user.id },
    }, { session });
    setAccounts(loadWorkspaceMediaAccounts(repoContext));
    toast('账号已重新授权', 'success');
  };

  const handleDisconnect = (id: string) => {
    if (!canWrite) { toast('权限不足', 'error'); return; }
    updateWorkspaceMediaAccount(id, { status: 'offline', credentialRef: null, clientIdLast4: null }, repoContext);
    logAuditEvent({
      action: 'media_account_update', targetType: 'media_account',
      targetId: id, metadata: { action: 'disconnect' },
    }, { session });
    setAccounts(loadWorkspaceMediaAccounts(repoContext));
    toast('账号已断开', 'success');
  };

  const handleDelete = (id: string) => {
    if (!canWrite) { toast('权限不足', 'error'); return; }
    saveWorkspaceMediaAccounts(accounts.filter(a => a.id !== id), repoContext);
    logAuditEvent({
      action: 'media_account_update', targetType: 'media_account',
      targetId: id, metadata: { action: 'delete' },
    }, { session });
    setAccounts(loadWorkspaceMediaAccounts(repoContext));
    toast('账号已删除', 'success');
  };

  const activeCount = accounts.filter(a => a.status === 'active').length;
  return (
    <div className="p-[var(--spacing-lg)] max-w-7xl mx-auto space-y-[var(--spacing-lg)] bg-[var(--bg-app)] min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-color)]">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight flex items-center">
            全域社媒分发神经枢纽 
            <span className="ml-3 bg-purple-100/50 text-purple-600 text-[10px] uppercase font-black px-2.5 py-0.5 rounded shadow-sm border border-purple-200/50">Matrix Node</span>
          </h2>
          <p className="text-[14px] font-medium text-[var(--text-muted)] mt-2">集中管理全网社媒矩阵状态，保障 Agent 集群内容自动分发顺畅无阻。</p>
        </div>
        {canWrite && (
          <button onClick={handleCreate} className="flex items-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm mt-4 sm:mt-0">
            <Plus className="icon-md" />
            <span>挂载新节点</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
        <div className="bg-[var(--bg-panel)] rounded-[24px] p-[var(--spacing-lg)] border border-[var(--border-color)] shadow-sm flex items-center space-x-5 hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-blue-50 text-[var(--color-primary)] rounded-[var(--radius-xl)] shadow-sm border border-blue-100/50">
            <Smartphone className="w-[22px] h-[22px]" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-[var(--text-muted)]">已绑定账号</p>
            <p className="text-[var(--text-main)]xl font-extrabold text-[var(--text-main)] mt-1">{accounts.length}</p>
          </div>
        </div>
        <div className="bg-[var(--bg-panel)] rounded-[24px] p-[var(--spacing-lg)] border border-[var(--border-color)] shadow-sm flex items-center space-x-5 hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-green-50 text-green-600 rounded-[var(--radius-xl)] shadow-sm border border-green-100/50">
            <Users className="w-[22px] h-[22px]" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-[var(--text-muted)]">全网总粉丝</p>
            <p className="text-[var(--text-main)]xl font-extrabold text-[var(--text-main)] mt-1">484.8w</p>
          </div>
        </div>
        <div className="bg-[var(--bg-panel)] rounded-[24px] p-[var(--spacing-lg)] border border-[var(--border-color)] shadow-sm flex items-center space-x-5 hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-purple-50 text-purple-600 rounded-[var(--radius-xl)] shadow-sm border border-purple-100/50">
            <TrendingUp className="w-[22px] h-[22px]" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-[var(--text-muted)]">本月新增展现量</p>
            <p className="text-[var(--text-main)]xl font-extrabold text-[var(--text-main)] mt-1">+32%</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Smartphone className="icon-xl text-gray-300 mb-4" />
              <p className="text-[var(--text-muted)] font-medium">还没有绑定社媒账号。点击「挂载新节点」开始管理。</p>
            </div>
          ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)]">
                <th className="py-4 px-6 text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">账号信息</th>
                <th className="py-4 px-6 text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">平台</th>
                <th className="py-4 px-6 text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">连接数</th>
                <th className="py-4 px-6 text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">授权范围</th>
                <th className="py-4 px-6 text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">状态</th>
                <th className="py-4 px-6 text-[12px] font-extrabold text-gray-400 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm shadow-inner">
                        {account.platformName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-[var(--text-main)]">{account.platformName}</p>
                        <p className="text-[13px] text-[var(--text-muted)] font-medium">{account.clientIdLast4 ? `ID: ****${account.clientIdLast4}` : '未配置'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-[15px] font-bold text-gray-700">{account.platformName}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-[15px] font-bold text-[var(--text-main)]">{account.connectedAccounts}</span>
                  </td>
                  <td className="py-4 px-6">
                    {account.scopes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {account.scopes.map((scope) => (
                          <span key={scope} className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded">{scope}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[13px] text-gray-400 font-medium">未配置</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {account.status === 'active' ? (
                      <span className="inline-flex items-center px-2.5 py-1 text-[13px] font-bold text-green-700 bg-green-50 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-500" />
                        正常授权
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 text-[13px] font-bold text-red-700 bg-red-50 rounded-md">
                        <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                        {account.status === 'needs_config' ? '待配置' : account.status === 'rate_limited' ? '限流中' : '离线'}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right space-x-4">
                    {!canWrite ? (
                      <span className="text-[13px] font-medium text-gray-400">只读</span>
                    ) : (
                      <>
                        {account.status === 'active' ? (
                          <button onClick={() => handleDisconnect(account.id)} className="text-amber-600 hover:text-amber-800 text-[14px] font-bold transition-colors">断开</button>
                        ) : (
                          <button onClick={() => handleReconnect(account.id)} className="text-green-600 hover:text-green-800 text-[14px] font-bold transition-colors">授权</button>
                        )}
                        <button onClick={() => handleDelete(account.id)} className="text-red-500 hover:text-red-800 text-[14px] font-bold transition-colors">删除</button>
                      </>
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
