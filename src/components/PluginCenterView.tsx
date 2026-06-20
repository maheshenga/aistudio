import React, { useEffect, useMemo, useState } from 'react';
import {
  Folder,
  Share2,
  Briefcase,
  Box,
  RefreshCw,
  ToggleRight,
  ToggleLeft,
  ShieldCheck,
  ShieldAlert,
  Play,
  Lock,
} from 'lucide-react';
import { toast } from './Toast';
import { useSaasSession } from '../saas/SaasAuthContext';
import { hasWorkspacePermission, buildPermissionDeniedMetadata } from '../saas/permissions';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import {
  ensureDefaultWorkspacePlugins,
  loadWorkspacePlugins,
  updateWorkspacePlugin,
  type WorkspacePlugin,
  type WorkspacePluginProviderKind,
  type WorkspacePluginStatus,
} from '../lib/data/pluginRepository';
import { createWorkspaceUsageEvent } from '../lib/data/usageRepository';
import {
  canExecutePlugin,
  getPluginReviewStateLabel,
  isPluginReviewed,
  resolvePluginBilling,
  resolvePluginReviewState,
  type PluginLifecycleAction,
  type PluginReviewState,
} from '../saas/pluginPolicy';
import type { ModuleId } from '../types';

const pluginIconByName = {
  folder: Folder,
  share: Share2,
  briefcase: Briefcase,
  box: Box,
} as const;

const REVIEW_STATE_CLASSES: Record<PluginReviewState, string> = {
  hidden: 'bg-gray-100 text-gray-500',
  internal: 'bg-amber-50 text-amber-700',
  reviewed: 'bg-blue-50 text-blue-700',
  enabled: 'bg-emerald-50 text-emerald-700',
  disabled: 'bg-gray-100 text-gray-400',
};

export function PluginCenterView() {
  const session = useSaasSession();
  const role = session.membership.role;
  const pluginContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const canManagePlugins = hasWorkspacePermission(role, 'plugins.manage');
  const [plugins, setPlugins] = useState<WorkspacePlugin[]>(() => ensureDefaultWorkspacePlugins(pluginContext));

  useEffect(() => {
    ensureDefaultWorkspacePlugins(pluginContext);
    const refreshPlugins = () => setPlugins(loadWorkspacePlugins(pluginContext));
    const handlePluginsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshPlugins();
    };
    refreshPlugins();
    window.addEventListener('workspace_plugins_updated', handlePluginsUpdated);
    return () => window.removeEventListener('workspace_plugins_updated', handlePluginsUpdated);
  }, [pluginContext, session.workspace.id]);

  const providerKindLabels: Record<WorkspacePluginProviderKind, string> = {
    official: 'Official',
    community: 'Community',
    workspace: 'Workspace',
  };
  const providerDescriptions: Record<WorkspacePluginProviderKind, string> = {
    official: '官方维护的插件功能合集',
    community: '由社区开发者提供的扩展应用',
    workspace: '当前工作区安装的自定义扩展',
  };
  const providerKindClassNames: Record<WorkspacePluginProviderKind, string> = {
    official: 'bg-blue-50 text-blue-700',
    community: 'bg-gray-100 text-gray-700',
    workspace: 'bg-emerald-50 text-emerald-700',
  };
  const statusLabels: Record<WorkspacePluginStatus, string> = {
    active: '运行中',
    disabled: '已停用',
    needs_config: '待配置',
    deprecated: '已弃用',
  };
  const statusClassNames: Record<WorkspacePluginStatus, string> = {
    active: 'text-green-600',
    disabled: 'text-gray-400',
    needs_config: 'text-amber-600',
    deprecated: 'text-red-500',
  };
  const enabledCount = plugins.filter((plugin) => plugin.enabled).length;
  const reviewedCount = plugins.filter((plugin) => isPluginReviewed(resolvePluginReviewState(plugin))).length;

  const auditPlugin = (
    action: 'plugin_install' | 'plugin_enable' | 'plugin_disable' | 'plugin_config_update' | 'plugin_execute' | 'plugin_execute_blocked',
    plugin: WorkspacePlugin,
    metadata: Record<string, unknown>,
  ) => {
    logAuditEvent(
      {
        action,
        moduleId: 'admin' as ModuleId,
        targetType: 'plugin_config',
        targetId: plugin.id,
        metadata: {
          pluginName: plugin.name,
          provider: plugin.provider,
          providerKind: plugin.providerKind,
          enabled: plugin.enabled,
          status: plugin.status,
          reviewState: resolvePluginReviewState(plugin),
          ...metadata,
        },
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
  };

  const guardManage = (action: PluginLifecycleAction, plugin: WorkspacePlugin): boolean => {
    if (canManagePlugins) return true;
    logAuditEvent(
      {
        action: 'plugin_config_update',
        moduleId: 'admin' as ModuleId,
        targetType: 'plugin_config',
        targetId: plugin.id,
        metadata: buildPermissionDeniedMetadata({
          role,
          permission: 'plugins.manage',
          operation: action,
          moduleId: 'admin',
        }),
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
    toast('权限不足：需要插件管理权限', 'error');
    return false;
  };

  const handleTogglePlugin = (plugin: WorkspacePlugin) => {
    const nextEnabled = !plugin.enabled;
    if (!guardManage(nextEnabled ? 'enable' : 'disable', plugin)) return;
    const updatedPlugin = updateWorkspacePlugin(
      plugin.id,
      { enabled: nextEnabled, status: nextEnabled ? 'active' : 'disabled' },
      pluginContext,
    );
    if (!updatedPlugin) return;
    setPlugins(loadWorkspacePlugins(pluginContext));
    auditPlugin(nextEnabled ? 'plugin_enable' : 'plugin_disable', updatedPlugin, { previousEnabled: plugin.enabled });
    toast(nextEnabled ? '插件已启用' : '插件已停用', 'success');
  };

  const handleReviewPlugin = (plugin: WorkspacePlugin) => {
    if (!guardManage('install', plugin)) return;
    const updatedPlugin = updateWorkspacePlugin(
      plugin.id,
      { metadata: { ...plugin.metadata, reviewState: 'reviewed', reviewedAt: Date.now(), reviewedBy: session.user.id } },
      pluginContext,
    );
    if (!updatedPlugin) return;
    setPlugins(loadWorkspacePlugins(pluginContext));
    auditPlugin('plugin_install', updatedPlugin, { operation: 'mark_reviewed' });
    toast('插件已标记为已审核', 'success');
  };

  const handleConfigurePlugin = (plugin: WorkspacePlugin) => {
    if (!guardManage('configure', plugin)) return;
    const updatedPlugin = updateWorkspacePlugin(
      plugin.id,
      {
        metadata: {
          ...plugin.metadata,
          lastConfiguredAt: Date.now(),
          requiredConfigKeys: plugin.configSchema.filter((field) => field.required).map((field) => field.key),
        },
      },
      pluginContext,
    );
    if (!updatedPlugin) return;
    setPlugins(loadWorkspacePlugins(pluginContext));
    auditPlugin('plugin_config_update', updatedPlugin, { operation: 'configure' });
    toast('插件配置检查已记录', 'success');
  };

  const handleExecutePlugin = (plugin: WorkspacePlugin) => {
    const decision = canExecutePlugin(plugin, { hasPermission: canManagePlugins });
    if (!decision.allowed) {
      // Blocked execution is itself audited so unreviewed/denied attempts are traceable.
      auditPlugin('plugin_execute_blocked', plugin, {
        reason: decision.reason,
        billingStatus: decision.billing.billingStatus,
      });
      const reasonText: Record<typeof decision.reason, string> = {
        ok: '',
        not_reviewed: '插件未通过安全审核，无法执行',
        not_enabled: '插件未启用，无法执行',
        permission_denied: '权限不足：需要插件管理权限',
        needs_config: '插件待配置，无法执行',
      };
      toast(reasonText[decision.reason] || '插件无法执行', 'error');
      return;
    }
    const credits = decision.billing.estimatedCreditsPerRun;
    if (credits > 0) {
      createWorkspaceUsageEvent(
        {
          moduleId: 'admin',
          kind: 'automation',
          targetType: 'system',
          targetId: plugin.id,
          credits,
          metadata: { pluginId: plugin.id, pluginName: plugin.name, billingStatus: decision.billing.billingStatus },
        },
        { workspaceId: session.workspace.id, userId: session.user.id },
      );
    }
    auditPlugin('plugin_execute', plugin, {
      operation: 'execute',
      estimatedCredits: credits,
      billingStatus: decision.billing.billingStatus,
    });
    toast(credits > 0 ? `插件已执行（预计计费 ${credits} credits）` : '插件已执行', 'success');
  };

  const handleSyncPluginCatalog = () => {
    if (!canManagePlugins) {
      toast('权限不足：需要插件管理权限', 'error');
      return;
    }
    setPlugins(ensureDefaultWorkspacePlugins(pluginContext));
    toast('插件市场配置已同步', 'success');
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">插件与扩展能力中心</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            已启用 {enabledCount}/{plugins.length} 个扩展，已审核 {reviewedCount} 个。未通过安全审核的插件不可执行。
          </p>
        </div>
        <button
          onClick={handleSyncPluginCatalog}
          disabled={!canManagePlugins}
          className="flex items-center space-x-2 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm"
        >
          <RefreshCw className="icon-sm" />
          <span>同步插件市场</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--spacing-md)]">
        {plugins.map((plugin) => {
          const iconKey = typeof plugin.metadata.icon === 'string' ? plugin.metadata.icon : 'box';
          const PluginIcon = pluginIconByName[iconKey as keyof typeof pluginIconByName] ?? Box;
          const reviewState = resolvePluginReviewState(plugin);
          const reviewed = isPluginReviewed(reviewState);
          const billing = resolvePluginBilling(plugin);
          const executable = canExecutePlugin(plugin, { hasPermission: canManagePlugins }).allowed;

          return (
            <div key={plugin.id} className="bg-[var(--bg-panel)] border text-left border-[var(--border-color)] rounded-[24px] p-[var(--spacing-lg)] shadow-sm flex flex-col hover:border-blue-300 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-gray-50 p-3 rounded-[var(--radius-xl)]">
                  <PluginIcon className="icon-lg text-gray-700" />
                </div>
                <button
                  onClick={() => handleTogglePlugin(plugin)}
                  disabled={!canManagePlugins}
                  className="disabled:cursor-not-allowed"
                  title={plugin.enabled ? '停用插件' : '启用插件'}
                >
                  {plugin.enabled ? (
                    <ToggleRight className="icon-xl text-green-500" />
                  ) : (
                    <ToggleLeft className="icon-xl text-gray-300" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-[var(--text-main)] text-[16px]">{plugin.name}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 ${REVIEW_STATE_CLASSES[reviewState]}`}>
                  {reviewed ? <ShieldCheck className="icon-xs" /> : <ShieldAlert className="icon-xs" />}
                  {getPluginReviewStateLabel(reviewState)}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-[var(--spacing-md)] flex-1">
                {providerDescriptions[plugin.providerKind]} · {plugin.category}
                {billing.billingStatus !== 'unpriced' && (
                  <span className="block mt-1 text-[var(--text-muted)]">
                    计费：{billing.billingStatus === 'estimated' ? `约 ${billing.estimatedCreditsPerRun} credits/次` : '需计费复核'}
                  </span>
                )}
              </p>
              <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-4">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${providerKindClassNames[plugin.providerKind]}`}>
                    {providerKindLabels[plugin.providerKind]}
                  </span>
                  <span className={`text-[11px] font-bold ${statusClassNames[plugin.status]}`}>
                    {statusLabels[plugin.status]}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {!reviewed && (
                    <button
                      onClick={() => handleReviewPlugin(plugin)}
                      disabled={!canManagePlugins}
                      className="text-sm font-bold text-emerald-600 hover:text-emerald-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                    >
                      标记已审核
                    </button>
                  )}
                  <button
                    onClick={() => handleConfigurePlugin(plugin)}
                    disabled={!canManagePlugins}
                    className="text-sm font-bold text-[var(--color-primary)] hover:text-blue-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                  >
                    配置参数
                  </button>
                  <button
                    onClick={() => handleExecutePlugin(plugin)}
                    disabled={!canManagePlugins}
                    title={executable ? '执行插件' : '未通过审核或未启用，无法执行'}
                    className={`text-sm font-bold inline-flex items-center gap-1 disabled:cursor-not-allowed ${
                      executable ? 'text-green-600 hover:text-green-800' : 'text-gray-300'
                    }`}
                  >
                    {executable ? <Play className="icon-xs" /> : <Lock className="icon-xs" />}
                    执行
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
