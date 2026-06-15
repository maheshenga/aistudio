import React, { useEffect, useMemo, useState } from 'react';
import { 
  Settings, 
  Users, 
  Cpu, 
  Folder, 
  Briefcase, 
  ListTodo, 
  Share2, 
  Search,
  MoreVertical,
  Plus,
  ShieldAlert,
  Server,
  Activity,
  Key,
  BarChart3,
  Clock,
  AlertCircle,
  CheckCircle2,
  Zap,
  ToggleRight,
  ToggleLeft,
  Settings2,
  X,
  Bot,
  RefreshCw,
  CreditCard,
  LineChart,
  Megaphone,
  Box,
  TrendingUp,
  Download,
  Terminal,
  Upload,
  Lock,
  Mail,
  Database,
  Eye,
  History
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from './Toast';
import {
  createWorkspaceAnnouncement,
  loadWorkspaceAnnouncements,
  updateWorkspaceAnnouncement,
  type WorkspaceAnnouncement,
} from '../lib/data/announcementRepository';
import {
  createWorkspaceAgencyPartner,
  ensureDefaultWorkspaceAgencyPartners,
  loadWorkspaceAgencyPartners,
  summarizeWorkspaceAgencyPartners,
  updateWorkspaceAgencyPartner,
  type WorkspaceAgencyPartner,
  type WorkspaceAgencyPayoutStatus,
} from '../lib/data/agencyRepository';
import { exportAuditLogRows, listAuditLogs, logAuditEvent } from '../lib/data/auditLogRepository';
import { createWorkspaceAsset, loadWorkspaceAssets } from '../lib/data/assetRepository';
import {
  ensureDefaultWorkspaceBillingPlans,
  loadWorkspaceBillingPlans,
  updateWorkspaceBillingPlan,
  type WorkspaceBillingPlan,
} from '../lib/data/billingRepository';
import {
  buildDailyRevenueSeries,
  loadWorkspaceFinancialRecords,
  summarizeWorkspaceFinancials,
} from '../lib/data/financialRepository';
import { getDataBackendDescriptor } from '../lib/data/dataBackend';
import { listGenerationJobs, updateGenerationJob, type GenerationJob } from '../lib/data/generationJobRepository';
import { loadSettings, saveSettings } from '../lib/data/settingsRepository';
import {
  createWorkspaceProvider,
  detectProviderModels,
  ensureDefaultWorkspaceProviders,
  loadWorkspaceProviders,
  setDefaultWorkspaceProvider,
  updateWorkspaceProvider,
  type WorkspaceProviderConfig,
  type WorkspaceProviderStatus,
} from '../lib/data/providerRepository';
import {
  ensureDefaultWorkspacePlugins,
  loadWorkspacePlugins,
  updateWorkspacePlugin,
  type WorkspacePlugin,
  type WorkspacePluginProviderKind,
  type WorkspacePluginStatus,
} from '../lib/data/pluginRepository';
import {
  ensureDefaultWorkspaceTickets,
  loadWorkspaceTickets,
  summarizeWorkspaceTickets,
  updateWorkspaceTicket,
  type WorkspaceTicket,
  type WorkspaceTicketPriority,
  type WorkspaceTicketStatus,
} from '../lib/data/ticketRepository';
import {
  ensureDefaultWorkspaceRiskEvents,
  loadWorkspaceRiskEvents,
  summarizeWorkspaceRiskEvents,
  updateWorkspaceRiskEvent,
  type WorkspaceRiskDecision,
  type WorkspaceRiskEvent,
  type WorkspaceRiskSeverity,
} from '../lib/data/riskRepository';
import {
  ensureDefaultWorkspaceMediaAccounts,
  loadWorkspaceMediaAccounts,
  summarizeWorkspaceMediaAccounts,
  updateWorkspaceMediaAccount,
  type WorkspaceMediaAccount,
  type WorkspaceMediaAccountStatus,
} from '../lib/data/mediaRepository';
import { createWorkspaceUsageEvent, loadModuleUsage } from '../lib/data/usageRepository';
import {
  createWorkspaceMember,
  deleteWorkspaceMembers,
  ensureDemoWorkspaceMembers,
  hydrateWorkspaceMembers,
  loadWorkspaceMembers,
  updateWorkspaceMember,
  type WorkspaceMember,
  type WorkspaceMemberStatus,
} from '../lib/data/workspaceMemberRepository';
import { useSaasSession } from '../saas/SaasAuthContext';
import { ROLE_PERMISSIONS, buildPermissionDeniedMetadata, canManageBilling, hasWorkspacePermission, type WorkspacePermission } from '../saas/permissions';
import type { AuditLog, WorkspaceRole } from '../saas/types';
import type { ModuleId } from '../types';

export function AdminView() {
  const session = useSaasSession();
  const [activeTab, setActiveTab] = useState('dashboard');
  const shellProviderContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const [shellProviders, setShellProviders] = useState<WorkspaceProviderConfig[]>(() =>
    ensureDefaultWorkspaceProviders(shellProviderContext),
  );

  useEffect(() => {
    ensureDefaultWorkspaceProviders(shellProviderContext);
    const refreshProviders = () => setShellProviders(loadWorkspaceProviders(shellProviderContext));
    const handleProvidersUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshProviders();
    };

    refreshProviders();
    window.addEventListener('workspace_providers_updated', handleProvidersUpdated);
    return () => window.removeEventListener('workspace_providers_updated', handleProvidersUpdated);
  }, [shellProviderContext, session.workspace.id]);

  const enabledShellProviders = shellProviders.filter((provider) => provider.enabled);
  const healthyShellProviders = enabledShellProviders.filter((provider) => provider.status === 'healthy');
  const shellProviderTotal = Math.max(enabledShellProviders.length, shellProviders.length);
  const shellClusterHealthy = enabledShellProviders.length > 0 && healthyShellProviders.length === enabledShellProviders.length;
  const shellClusterTitle = enabledShellProviders.length === 0
    ? '服务商未启用'
    : shellClusterHealthy
      ? '集群状态正常'
      : '集群需要关注';
  const shellClusterText = `${healthyShellProviders.length}/${shellProviderTotal} 节点健康运行`;

  const tabs = [
    { id: 'dashboard', icon: BarChart3, label: '数据总览' },
    { id: 'settings', icon: Settings, label: '系统设置' },
    { id: 'saas_plans', icon: CreditCard, label: 'SaaS套餐管理' },
    { id: 'members', icon: Users, label: '会员管理' },
    { id: 'roles', icon: Key, label: '权限与角色控制' },
    { id: 'providers', icon: Cpu, label: 'AI服务商管理' },
    { id: 'sales', icon: LineChart, label: '财务与销售' },
    { id: 'database', icon: Database, label: '数据库与云存储' },
    { id: 'announcements', icon: Megaphone, label: '公告通知管理' },
    { id: 'plugins', icon: Box, label: '插件与扩展' },
    { id: 'logs', icon: Terminal, label: '系统日志审计' },
    { id: 'tickets', icon: Activity, label: '工单与反馈管理' },
    { id: 'agency', icon: Briefcase, label: '分销与代理商' },
    { id: 'risk', icon: ShieldAlert, label: '内容风控与审计' },
    { id: 'assets', icon: Folder, label: '素材管理' },
    { id: 'projects', icon: Briefcase, label: '作品管理' },
    { id: 'tasks', icon: ListTodo, label: '任务管理' },
    { id: 'media', icon: Share2, label: '媒体账号管理' },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[var(--bg-app)]">
      <div className="w-64 bg-[var(--bg-panel)] border-r border-[var(--border-color)] shadow-sm flex flex-col flex-shrink-0 relative z-10">
        <div className="p-5 border-b border-[var(--border-color)] bg-gray-50/50">
          <div className="flex items-center space-x-2 text-blue-700 font-bold">
            <ShieldAlert className="icon-md" />
            <span>后台管理中心</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">全局系统及业务数据配置</p>
        </div>
        <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <ul className="space-y-1 px-3">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-[var(--radius-lg)] text-[15px] transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-gray-600 font-medium hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className={`w-[18px] h-[18px] mr-3 ${activeTab === tab.id ? 'text-[var(--color-primary)]' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-panel)]">
          <div className={`${shellClusterHealthy ? 'bg-green-50' : 'bg-amber-50'} rounded-lg p-3 flex items-start space-x-3`}>
            <Server className={`icon-md ${shellClusterHealthy ? 'text-green-600' : 'text-amber-600'} flex-shrink-0 mt-0.5`} />
            <div>
              <p className={`text-xs font-bold ${shellClusterHealthy ? 'text-green-800' : 'text-amber-800'}`}>
                {shellClusterTitle}
              </p>
              <p className={`text-[10px] ${shellClusterHealthy ? 'text-green-600' : 'text-amber-600'} mt-0.5`}>
                {shellClusterText}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-[var(--spacing-xl)] max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <AdminDashboard setActiveTab={setActiveTab} />}
          {activeTab === 'settings' && <AdminSettings />}
          {activeTab === 'saas_plans' && <AdminSaasPlans />}
          {activeTab === 'members' && <AdminMembers />}
          {activeTab === 'roles' && <AdminRoles />}
          {activeTab === 'providers' && <AdminProviders />}
          {activeTab === 'sales' && <AdminSales />}
          {activeTab === 'database' && <AdminDatabase />}
          {activeTab === 'announcements' && <AdminAnnouncements />}
          {activeTab === 'plugins' && <AdminPlugins />}
          {activeTab === 'logs' && <AdminLogs />}
          {activeTab === 'tickets' && <AdminTickets />}
          {activeTab === 'agency' && <AdminAgency />}
          {activeTab === 'risk' && <AdminRisk />}
          {activeTab === 'assets' && <AdminAssets />}
          {activeTab === 'projects' && <AdminProjects />}
          {activeTab === 'tasks' && <AdminTasks />}
          {activeTab === 'media' && <AdminMedia />}
        </div>
      </div>
    </div>
  );
}

function AdminDatabase() {
  const session = useSaasSession();
  const [isBackuping, setIsBackuping] = useState(false);
  const workspaceContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const dataBackend = getDataBackendDescriptor();
  const members = loadWorkspaceMembers(workspaceContext);
  const assets = loadWorkspaceAssets(workspaceContext);
  const jobs = listGenerationJobs(workspaceContext);
  const auditLogs = listAuditLogs({ workspaceId: session.workspace.id });
  const billingPlans = loadWorkspaceBillingPlans(workspaceContext);
  const providers = loadWorkspaceProviders(workspaceContext);
  const financialRecords = loadWorkspaceFinancialRecords(workspaceContext);
  const currentPlan = billingPlans.find((plan) => plan.id === session.workspace.plan);

  const parseAssetSizeGb = (size: string): number => {
    const match = size.trim().match(/^([\d.]+)\s*(KB|MB|GB|TB)$/i);
    if (!match?.[1] || !match[2]) return 0;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) return 0;
    const unit = match[2].toUpperCase();
    if (unit === 'KB') return value / 1024 / 1024;
    if (unit === 'MB') return value / 1024;
    if (unit === 'TB') return value * 1024;
    return value;
  };

  const assetStorageGb = assets.reduce((total, asset) => total + parseAssetSizeGb(asset.size), 0);
  const storageLimitGb = currentPlan?.storageGb ?? 0;
  const assetStoragePercent = storageLimitGb > 0
    ? Math.min(100, Math.round((assetStorageGb / storageLimitGb) * 100))
    : 0;
  const repositoryStats = [
    { label: 'Members', count: members.length, collection: 'workspace_members' },
    { label: 'Assets', count: assets.length, collection: 'workspace_assets' },
    { label: 'Generation Jobs', count: jobs.length, collection: 'generation_jobs' },
    { label: 'Audit Logs', count: auditLogs.length, collection: 'audit_logs' },
    { label: 'Billing Plans', count: billingPlans.length, collection: 'billing_plans' },
    { label: 'Providers', count: providers.length, collection: 'provider_configs' },
    { label: 'Financial Records', count: financialRecords.length, collection: 'financial_records' },
  ];
  const totalRecords = repositoryStats.reduce((total, stat) => total + stat.count, 0);
  const completedJobs = jobs.filter((job) => job.status === 'succeeded').length;
  const jobArchivePercent = jobs.length === 0 ? 0 : Math.round((completedJobs / jobs.length) * 100);

  const handleBackup = () => {
    setIsBackuping(true);
    logAuditEvent(
      {
        action: 'data_snapshot_export',
        moduleId: 'admin' as ModuleId,
        targetType: 'system',
        targetId: dataBackend.mode,
        metadata: {
          backendMode: dataBackend.mode,
          storageKind: dataBackend.storageKind,
          configured: dataBackend.configured,
          recordCount: totalRecords,
          assetCount: assets.length,
          auditLogCount: auditLogs.length,
        },
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
    setIsBackuping(false);
    toast('工作区数据快照清单已生成并写入审计日志', 'success');
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">数据库与云存储 (Database & CDN)</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">当前数据后端、工作区记录规模与素材存储配额。</p>
          </div>
         <div className="flex space-x-2">
           <button onClick={handleBackup} disabled={isBackuping} className="flex items-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm disabled:opacity-50">
             {isBackuping ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div> : <Database className="icon-sm" />}
             <span>{isBackuping ? '正在生成快照...' : '一键生成冷备快照'}</span>
           </button>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
         <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-6">
             <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-[var(--spacing-md)] flex items-center"><span className={`w-2 h-2 rounded-full ${dataBackend.configured ? 'bg-emerald-500' : 'bg-amber-500'} mr-2`}></span> Data Backend ({dataBackend.mode})</h3>
             <div className="space-y-4">
                <div>
                   <div className="flex justify-between text-sm mb-1 font-bold">
                      <span className="text-gray-600">持久化记录</span>
                      <span className="text-[var(--text-main)]">{totalRecords.toLocaleString()} records</span>
                   </div>
                   <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(100, totalRecords)}%` }}></div>
                   </div>
                </div>
                <div>
                   <div className="flex justify-between text-sm mb-1 font-bold">
                      <span className="text-gray-600">审计覆盖</span>
                      <span className="text-[var(--text-main)]">{auditLogs.length.toLocaleString()} events</span>
                   </div>
                   <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, auditLogs.length)}%` }}></div>
                   </div>
                </div>
             </div>
             <div className="mt-6 flex justify-between items-center text-[12px] text-[var(--text-muted)] font-mono border-t border-gray-100 pt-4">
                <span>Storage: {dataBackend.storageKind}</span>
                <span>{dataBackend.configured ? 'configured' : dataBackend.warnings[0]}</span>
             </div>
          </div>

          <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-6">
             <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-[var(--spacing-md)] flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span> Workspace Storage</h3>
             <div className="space-y-4">
                <div>
                   <div className="flex justify-between text-sm mb-1 font-bold">
                      <span className="text-gray-600">素材存储用量</span>
                      <span className="text-[var(--text-main)]">{assetStorageGb.toFixed(2)} GB / {storageLimitGb.toLocaleString()} GB</span>
                   </div>
                   <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${assetStoragePercent}%` }}></div>
                   </div>
                </div>
                <div>
                   <div className="flex justify-between text-sm mb-1 font-bold">
                      <span className="text-gray-600">生成任务归档</span>
                      <span className="text-[var(--text-main)]">{completedJobs.toLocaleString()} / {jobs.length.toLocaleString()}</span>
                   </div>
                   <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${jobArchivePercent}%` }}></div>
                   </div>
                </div>
             </div>
             <div className="mt-6 flex justify-between items-center text-[12px] text-[var(--text-muted)] font-mono border-t border-gray-100 pt-4">
                <span>Workspace: {session.workspace.slug}</span>
                <span>Plan: {session.workspace.plan}</span>
             </div>
          </div>
        </div>

       <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-6">
          <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-[var(--spacing-md)]">仓库记录分布</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {repositoryStats.map((stat) => (
              <div key={stat.collection} className="rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-gray-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{stat.collection}</p>
                <p className="mt-2 text-xl font-black text-[var(--text-main)]">{stat.count.toLocaleString()}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
       </div>
     </div>
  );
}

function AdminDashboard({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const session = useSaasSession();
  const workspaceContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const usageContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const readDashboardData = () => ({
    members: loadWorkspaceMembers(workspaceContext),
    jobs: listGenerationJobs(workspaceContext),
    logs: listAuditLogs({ workspaceId: session.workspace.id }),
    tickets: loadWorkspaceTickets(workspaceContext),
    riskEvents: loadWorkspaceRiskEvents(workspaceContext),
    usage: loadModuleUsage(usageContext),
    providers: loadWorkspaceProviders(workspaceContext),
  });
  const [dashboardData, setDashboardData] = useState(readDashboardData);

  useEffect(() => {
    ensureDemoWorkspaceMembers(session);
    ensureDefaultWorkspaceProviders(workspaceContext);
    ensureDefaultWorkspaceTickets(workspaceContext);
    ensureDefaultWorkspaceRiskEvents(workspaceContext);

    const refreshDashboard = () => setDashboardData(readDashboardData());
    const handleWorkspaceScopedUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshDashboard();
    };

    refreshDashboard();
    window.addEventListener('workspace_members_updated', handleWorkspaceScopedUpdate);
    window.addEventListener('generation_jobs_updated', handleWorkspaceScopedUpdate);
    window.addEventListener('workspace_tickets_updated', handleWorkspaceScopedUpdate);
    window.addEventListener('workspace_risk_events_updated', handleWorkspaceScopedUpdate);
    window.addEventListener('workspace_providers_updated', handleWorkspaceScopedUpdate);
    window.addEventListener('usage_updated', handleWorkspaceScopedUpdate);
    window.addEventListener('activity_logged', refreshDashboard);
    window.addEventListener('storage', refreshDashboard);
    return () => {
      window.removeEventListener('workspace_members_updated', handleWorkspaceScopedUpdate);
      window.removeEventListener('generation_jobs_updated', handleWorkspaceScopedUpdate);
      window.removeEventListener('workspace_tickets_updated', handleWorkspaceScopedUpdate);
      window.removeEventListener('workspace_risk_events_updated', handleWorkspaceScopedUpdate);
      window.removeEventListener('workspace_providers_updated', handleWorkspaceScopedUpdate);
      window.removeEventListener('usage_updated', handleWorkspaceScopedUpdate);
      window.removeEventListener('activity_logged', refreshDashboard);
      window.removeEventListener('storage', refreshDashboard);
    };
  }, [session, workspaceContext, usageContext]);

  const { members, jobs, logs, tickets, riskEvents, usage, providers } = dashboardData;
  const now = Date.now();
  const recentWindowMs = 24 * 60 * 60 * 1000;
  const activeProviders = providers.filter((provider) => provider.enabled);
  const healthyProviders = activeProviders.filter((provider) => provider.status === 'healthy');
  const recentJobs = jobs.filter((job) => now - job.updatedAt <= recentWindowMs);
  const completedRecentJobs = recentJobs.filter((job) => ['succeeded', 'failed', 'cancelled'].includes(job.status));
  const successfulRecentJobs = completedRecentJobs.filter((job) => job.status === 'succeeded');
  const highRiskOpenEvents = riskEvents.filter((event) =>
    event.decision === 'pending_review' &&
    (event.severity === 'high' || event.severity === 'critical'),
  );
  const providerScore = activeProviders.length === 0
    ? 0
    : (healthyProviders.length / activeProviders.length) * 100;
  const jobScore = completedRecentJobs.length === 0
    ? 100
    : (successfulRecentJobs.length / completedRecentJobs.length) * 100;
  const riskScore = riskEvents.length === 0
    ? 100
    : Math.max(0, 100 - (highRiskOpenEvents.length / riskEvents.length) * 100);
  const healthScore = Math.round(providerScore * 0.6 + jobScore * 0.25 + riskScore * 0.15);
  const recentActivityWindow = 30 * 60 * 1000;
  const activeMemberCount = members.filter((member) =>
    member.status === 'active' &&
    typeof member.lastActiveAt === 'number' &&
    now - member.lastActiveAt <= recentActivityWindow,
  ).length;
  const activeAuditActors = new Set(
    logs
      .filter((log) => now - log.timestamp <= recentActivityWindow)
      .map((log) => log.actor.id),
  );
  const activeSessions = Math.max(1, activeMemberCount, activeAuditActors.size);
  const totalUsageSeconds = Object.values(usage).reduce<number>((total, seconds) => {
    const numericSeconds = Number(seconds);
    return Number.isFinite(numericSeconds) ? total + numericSeconds : total;
  }, 0);
  const formatUsage = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3_600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3_600).toFixed(1)}h`;
  };
  const formatRelativeTime = (timestamp: number) => {
    const diffMinutes = Math.max(0, Math.round((now - timestamp) / 60_000));
    if (diffMinutes < 60) return `${diffMinutes || 1} 分钟前`;
    if (diffMinutes < 1_440) return `${Math.round(diffMinutes / 60)} 小时前`;
    return `${Math.round(diffMinutes / 1_440)} 天前`;
  };
  const statusLabels: Record<WorkspaceTicketStatus, string> = {
    open: '待处理',
    in_progress: '处理中',
    resolved: '已解决',
    closed: '已关闭',
  };
  const riskDecisionLabels: Record<WorkspaceRiskDecision, string> = {
    blocked: '已拦截',
    pending_review: '待人工确认',
    allowed: '已放行',
    rate_limited: '已限流',
    account_frozen: '已冻结',
  };
  const dashboardStats = [
    {
      label: '系统健康度 (System Health)',
      value: `${healthScore}%`,
      sub: `${healthyProviders.length} / ${Math.max(activeProviders.length, providers.length)} 服务健康`,
      color: healthScore >= 90 ? 'text-emerald-600' : healthScore >= 70 ? 'text-amber-600' : 'text-red-600',
    },
    {
      label: '实时活跃会话 (Active Sessions)',
      value: activeSessions.toLocaleString(),
      sub: `${activeMemberCount.toLocaleString()} 成员近期在线`,
      color: 'text-blue-600',
    },
    {
      label: '工作区使用时长',
      value: formatUsage(totalUsageSeconds),
      sub: `${Object.keys(usage).length.toLocaleString()} 个模块有使用记录`,
      color: 'text-purple-600',
    },
    {
      label: '当前在线节点',
      value: `${healthyProviders.length} / ${Math.max(activeProviders.length, providers.length)}`,
      sub: activeProviders.length === 0 ? '尚未启用服务商' : `${activeProviders.length.toLocaleString()} 个服务商启用`,
      color: healthyProviders.length === activeProviders.length && activeProviders.length > 0 ? 'text-emerald-600' : 'text-amber-600',
    },
  ];
  const activityTrend = Array.from({ length: 7 }, (_, index) => {
    const bucketDurationMs = 2 * 60 * 60 * 1000;
    const start = now - (6 - index) * bucketDurationMs;
    const end = start + bucketDurationMs;
    const activityScore =
      new Set(logs.filter((log) => log.timestamp >= start && log.timestamp < end).map((log) => log.actor.id)).size +
      jobs.filter((job) => job.updatedAt >= start && job.updatedAt < end).length +
      members.filter((member) => typeof member.lastActiveAt === 'number' && member.lastActiveAt >= start && member.lastActiveAt < end).length;
    return {
      time: new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      activeUsers: activityScore,
    };
  });
  const priorityRank: Record<'High' | 'Medium' | 'Low', number> = { High: 0, Medium: 1, Low: 2 };
  const dashboardAlerts = [
    ...tickets
      .filter((ticket) => ticket.status === 'open' || ticket.status === 'in_progress')
      .map((ticket) => ({
        id: ticket.id,
        type: ticket.category || ticket.subject,
        stat: statusLabels[ticket.status],
        timestamp: ticket.updatedAt,
        priority: ticket.priority === 'urgent' || ticket.priority === 'high'
          ? 'High' as const
          : ticket.priority === 'medium'
            ? 'Medium' as const
            : 'Low' as const,
        pending: ticket.status === 'open',
      })),
    ...riskEvents
      .filter((event) => event.decision !== 'allowed')
      .map((event) => ({
        id: event.id,
        type: event.action,
        stat: riskDecisionLabels[event.decision],
        timestamp: event.updatedAt,
        priority: event.severity === 'critical' || event.severity === 'high'
          ? 'High' as const
          : event.severity === 'medium'
            ? 'Medium' as const
            : 'Low' as const,
        pending: event.decision === 'pending_review',
      })),
    ...jobs
      .filter((job) => job.status === 'failed' || job.status === 'running' || job.status === 'pending')
      .map((job) => ({
        id: job.id,
        type: job.title,
        stat: job.status === 'failed' ? '执行失败' : job.status === 'running' ? '运行中' : '排队中',
        timestamp: job.updatedAt,
        priority: job.status === 'failed' ? 'High' as const : 'Medium' as const,
        pending: job.status !== 'running',
      })),
  ]
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || b.timestamp - a.timestamp)
    .slice(0, 3);

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">系统控制台大盘</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">工作区运行健康、活跃度与待处理运营事项。</p>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)] mb-[var(--spacing-md)]">
         {dashboardStats.map((s) => (
           <div key={s.label} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">{s.label}</p>
              <div className="flex items-end mb-1">
                 <p className="text-2xl font-bold text-[var(--text-main)]">{s.value}</p>
              </div>
              <p className={`text-[11px] font-bold ${s.color}`}>{s.sub}</p>
           </div>
         ))}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
          <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] md:col-span-2">
             <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-[var(--spacing-md)]">日常用户活跃趋势 (Daily User Activity)</h3>
             <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
                  <AreaChart data={activityTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                   <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                   <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                   <Area type="monotone" dataKey="activeUsers" name="活跃用户数" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                 </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)]">
            <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-[var(--spacing-md)] flex justify-between items-center">
               <span>近期风险及工单预警</span>
               <button className="text-xs text-[var(--color-primary)] hover:underline" onClick={() => setActiveTab('tickets')}>全部发现</button>
             </h3>
             <div className="space-y-3">
               {dashboardAlerts.length === 0 ? (
                 <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-sm font-bold text-emerald-700">
                   当前没有待处理的高优先级运营事项
                 </div>
               ) : dashboardAlerts.map((t) => (
                   <div key={t.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center space-x-3">
                        <span className="text-[12px] font-bold text-[var(--color-primary)] w-24 truncate">{t.type}</span>
                        <span className="text-[11px] text-[var(--text-muted)] font-mono">{t.id}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{formatRelativeTime(t.timestamp)}</span>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${t.pending ? 'text-red-500 bg-red-50 border-red-100 animate-pulse' : 'text-gray-500 bg-gray-100 border-gray-200'}`}>
                        {t.stat}
                      </span>
                   </div>
              ))}
            </div>
         </div>
         <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)]">
            <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-[var(--spacing-md)]">快捷管理操作</h3>
            <div className="grid grid-cols-2 gap-3">
               <button onClick={() => setActiveTab('announcements')} className="p-4 flex flex-col items-center justify-center border border-[var(--border-color)] rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-gray-700 hover:text-blue-700">
                  <Megaphone className="icon-md mb-2" />
                  <span className="text-[13px] font-bold">发布新公告</span>
               </button>
               <button onClick={() => setActiveTab('members')} className="p-4 flex flex-col items-center justify-center border border-[var(--border-color)] rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-gray-700 hover:text-blue-700">
                  <Users className="icon-md mb-2" />
                  <span className="text-[13px] font-bold">邀请新租户</span>
               </button>
               <button onClick={() => setActiveTab('saas_plans')} className="p-4 flex flex-col items-center justify-center border border-[var(--border-color)] rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-gray-700 hover:text-blue-700">
                  <CreditCard className="icon-md mb-2" />
                  <span className="text-[13px] font-bold">配置定价表</span>
               </button>
               <button onClick={() => setActiveTab('logs')} className="p-4 flex flex-col items-center justify-center border border-[var(--border-color)] rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-gray-700 hover:text-blue-700">
                  <Terminal className="icon-md mb-2" />
                  <span className="text-[13px] font-bold">查询审计日志</span>
               </button>
            </div>
         </div>
       </div>
    </div>
  );
}

type AdminSettingsForm = {
  systemName: string;
  filingNumber: string;
  defaultSignupCredits: number;
  openSignup: boolean;
  enforceTwoFactor: boolean;
  sessionTimeoutMinutes: number;
  smtpHost: string;
  smtpPort: number;
  smtpFrom: string;
  stripePublishableKeyLast4: string;
  stripePublishableCredentialRef: string;
  stripeSecretKeyLast4: string;
  stripeSecretCredentialRef: string;
  stripePublishableKeyInput: string;
  stripeSecretKeyInput: string;
};

function AdminSettings() {
  const session = useSaasSession();
  const settingsContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const canManageSettings = hasWorkspacePermission(session.membership.role, 'settings.manage');
  const buildForm = (): AdminSettingsForm => {
    const settings = loadSettings(settingsContext);
    const getString = (key: string, fallback: string) => (
      typeof settings[key] === 'string' ? settings[key] as string : fallback
    );
    const getNumber = (key: string, fallback: number) => {
      const numericValue = Number(settings[key]);
      return Number.isFinite(numericValue) ? numericValue : fallback;
    };
    const getBoolean = (key: string, fallback: boolean) => (
      typeof settings[key] === 'boolean' ? settings[key] as boolean : fallback
    );

    return {
      systemName: getString('admin.systemName', session.workspace.name),
      filingNumber: getString('admin.filingNumber', ''),
      defaultSignupCredits: getNumber('admin.defaultSignupCredits', 0),
      openSignup: getBoolean('admin.openSignup', false),
      enforceTwoFactor: getBoolean('admin.enforceTwoFactor', false),
      sessionTimeoutMinutes: getNumber('admin.sessionTimeoutMinutes', 30),
      smtpHost: getString('admin.smtpHost', ''),
      smtpPort: getNumber('admin.smtpPort', 587),
      smtpFrom: getString('admin.smtpFrom', ''),
      stripePublishableKeyLast4: getString('admin.stripePublishableKeyLast4', ''),
      stripePublishableCredentialRef: getString('admin.stripePublishableCredentialRef', ''),
      stripeSecretKeyLast4: getString('admin.stripeSecretKeyLast4', ''),
      stripeSecretCredentialRef: getString('admin.stripeSecretCredentialRef', ''),
      stripePublishableKeyInput: '',
      stripeSecretKeyInput: '',
    };
  };
  const [form, setForm] = useState<AdminSettingsForm>(buildForm);

  useEffect(() => {
    const refreshSettings = () => {
      setForm((previous) => ({
        ...buildForm(),
        stripePublishableKeyInput: previous.stripePublishableKeyInput,
        stripeSecretKeyInput: previous.stripeSecretKeyInput,
      }));
    };
    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshSettings();
    };

    refreshSettings();
    window.addEventListener('settings_updated', handleSettingsUpdated);
    window.addEventListener('storage', refreshSettings);
    return () => {
      window.removeEventListener('settings_updated', handleSettingsUpdated);
      window.removeEventListener('storage', refreshSettings);
    };
  }, [settingsContext, session.workspace.id]);

  const updateForm = <K extends keyof AdminSettingsForm>(key: K, value: AdminSettingsForm[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };
  const normalizeNonNegativeNumber = (value: string) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue >= 0 ? Math.round(numericValue) : 0;
  };
  const credentialLast4 = (value: string) => value.trim().slice(-4);
  const buildCredentialRef = (kind: string, last4: string) => (
    `credential:admin:${session.workspace.id}:${kind}:${last4}:${Date.now()}`
  );
  const auditSettingsChange = (operation: string, metadata: Record<string, unknown>) => {
    logAuditEvent(
      {
        action: 'settings_change',
        moduleId: 'admin' as ModuleId,
        targetType: 'settings',
        targetId: 'admin_console_settings',
        metadata: {
          operation,
          ...metadata,
        },
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
  };

  const auditAdminPermissionDenied = (operation: string, metadata: Record<string, unknown> = {}) => {
    logAuditEvent(
      {
        action: 'permission_denied',
        moduleId: 'admin' as ModuleId,
        targetType: 'settings',
        targetId: 'admin_console_settings',
        metadata: {
          ...buildPermissionDeniedMetadata({
            role: session.membership.role,
            permission: 'settings.manage',
            operation,
            moduleId: 'admin',
          }),
          ...metadata,
        },
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
  };

  const handleSaveSettings = () => {
    if (!canManageSettings) {
      auditAdminPermissionDenied('save_admin_settings');
      toast('当前角色无权保存系统设置', 'warning');
      return;
    }

    const previousSettings = loadSettings(settingsContext);
    const settingsPatch: Record<string, string | number | boolean | null> = {
      'admin.systemName': form.systemName.trim() || session.workspace.name,
      'admin.filingNumber': form.filingNumber.trim(),
      'admin.defaultSignupCredits': Math.max(0, Math.round(form.defaultSignupCredits)),
      'admin.openSignup': form.openSignup,
      'admin.enforceTwoFactor': form.enforceTwoFactor,
      'admin.sessionTimeoutMinutes': Math.max(15, Math.round(form.sessionTimeoutMinutes)),
      'admin.smtpHost': form.smtpHost.trim(),
      'admin.smtpPort': Math.max(1, Math.round(form.smtpPort)),
      'admin.smtpFrom': form.smtpFrom.trim(),
    };
    const publishableKeyLast4 = credentialLast4(form.stripePublishableKeyInput);
    const secretKeyLast4 = credentialLast4(form.stripeSecretKeyInput);

    if (publishableKeyLast4) {
      settingsPatch['admin.stripePublishableKeyLast4'] = publishableKeyLast4;
      settingsPatch['admin.stripePublishableCredentialRef'] = buildCredentialRef('stripe_publishable_key', publishableKeyLast4);
    }
    if (secretKeyLast4) {
      settingsPatch['admin.stripeSecretKeyLast4'] = secretKeyLast4;
      settingsPatch['admin.stripeSecretCredentialRef'] = buildCredentialRef('stripe_secret_key', secretKeyLast4);
    }

    saveSettings(settingsPatch, settingsContext);
    const changedKeys = Object.keys(settingsPatch).filter((key) => previousSettings[key] !== settingsPatch[key]);
    auditSettingsChange('save_admin_settings', {
      changedKeys,
      smtpConfigured: Boolean(settingsPatch['admin.smtpHost']),
      paymentCredentialRotated: Boolean(publishableKeyLast4 || secretKeyLast4),
      sensitiveValuesStored: false,
    });
    setForm(buildForm());
    toast('系统设置已保存并写入审计日志', 'success');
  };

  const handleTestEmailConnection = () => {
    auditSettingsChange('smtp_connection_test', {
      smtpHostConfigured: Boolean(form.smtpHost.trim()),
      smtpPort: form.smtpPort,
    });
    toast('SMTP 连接测试请求已记录', 'info');
  };

  const handleVerifyStripeGateway = () => {
    auditSettingsChange('payment_gateway_verify', {
      publishableKeyConfigured: Boolean(form.stripePublishableKeyLast4 || form.stripePublishableKeyInput.trim()),
      secretKeyConfigured: Boolean(form.stripeSecretKeyLast4 || form.stripeSecretKeyInput.trim()),
      sensitiveValuesStored: false,
    });
    toast('支付网关验证请求已记录', 'info');
  };

  const handleKillSessions = () => {
    auditSettingsChange('force_session_logout', {
      workspaceId: session.workspace.id,
      requestedBy: session.user.id,
    });
    toast('在线会话注销请求已记录', 'warning');
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">全局系统设置</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">管理系统核心参数和安全策略</p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={!canManageSettings}
          className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          保存所有配置
        </button>
      </div>

      <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-xl)] space-y-8">
        <div>
          <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-4">基本信息配置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">系统名称</label>
              <input
                type="text"
                value={form.systemName}
                onChange={(event) => updateForm('systemName', event.target.value)}
                className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50 text-[15px]"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">系统备案号</label>
              <input
                type="text"
                value={form.filingNumber}
                onChange={(event) => updateForm('filingNumber', event.target.value)}
                placeholder="未配置"
                className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50 text-[15px]"
              />
            </div>
          </div>
        </div>
        
        <hr className="border-[var(--border-color)]" />
        
        <div>
          <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-4">用户与配额策略</h3>
          <div className="space-y-[var(--spacing-md)]">
            <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50/50">
               <div>
                 <p className="font-bold text-[var(--text-main)] text-[15px]">新用户默认赠送算力</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">注册成功后免费赠送的体验额度</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={form.defaultSignupCredits}
                    onChange={(event) => updateForm('defaultSignupCredits', normalizeNonNegativeNumber(event.target.value))}
                    className="w-32 px-3 py-2 border border-[var(--border-color)] rounded-lg text-center font-bold bg-white"
                  />
                  <span className="hidden lg:inline-block text-sm text-[var(--text-muted)] ml-2">Tokens</span>
                </div>
             </div>
            <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50/50">
               <div>
                 <p className="font-bold text-[var(--text-main)] text-[15px]">允许公共注册 (Open Signup)</p>
                 <p className="text-xs text-[var(--text-muted)] mt-1">关闭后仅能通过邀请码或管理员后台添加用户</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={form.openSignup}
                    onChange={(event) => updateForm('openSignup', event.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--bg-panel)] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                </label>
             </div>
          </div>
        </div>

        <hr className="border-[var(--border-color)]" />

        <div>
          <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-4">安全与合规策略 (Security Policies)</h3>
          <div className="space-y-[var(--spacing-md)]">
            <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50/50">
               <div>
                 <p className="font-bold text-[var(--text-main)] text-[15px] flex items-center">强制全员开启二次验证 (2FA Enforcement)</p>
                 <p className="text-xs text-[var(--text-muted)] mt-1">要求所有拥有后台访问权限的用户绑定 Authenticator App</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={form.enforceTwoFactor}
                    onChange={(event) => updateForm('enforceTwoFactor', event.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--bg-panel)] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                </label>
             </div>
            
            <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50/50">
               <div>
                 <p className="font-bold text-[var(--text-main)] text-[15px]">后台会话超时自动注销 (Session Timeout)</p>
                 <p className="text-xs text-[var(--text-muted)] mt-1">设定管理后台在无操作时自动登出的时长</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-[13px] font-bold text-gray-700 bg-white outline-none"
                    value={String(form.sessionTimeoutMinutes)}
                    onChange={(event) => updateForm('sessionTimeoutMinutes', normalizeNonNegativeNumber(event.target.value))}
                  >
                     <option value="15">15 分钟</option>
                     <option value="30">30 分钟</option>
                     <option value="60">1 小时</option>
                    <option value="1440">永不超时 (不安全)</option>
                 </select>
               </div>
             </div>
             <div className="mt-4 flex justify-end">
                 <button
                   onClick={handleKillSessions}
                   className="text-[13px] text-red-600 font-bold hover:text-red-700 underline decoration-red-200 underline-offset-4 decoration-2"
                 >
                    紧急注销所有当前在线会话 (Kill all sessions)
                 </button>
             </div>
          </div>
        </div>

        <hr className="border-[var(--border-color)]" />

        <div>
          <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-4">SMTP 邮件服务配置 (Email Service)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">SMTP 服务器地址</label>
              <input
                type="text"
                value={form.smtpHost}
                onChange={(event) => updateForm('smtpHost', event.target.value)}
                placeholder="未配置"
                className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-[15px]"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">SMTP 端口</label>
              <input
                type="number"
                value={form.smtpPort}
                onChange={(event) => updateForm('smtpPort', normalizeNonNegativeNumber(event.target.value))}
                className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-[15px]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">发送者邮箱 (From Address)</label>
              <input
                type="email"
                value={form.smtpFrom}
                onChange={(event) => updateForm('smtpFrom', event.target.value)}
                placeholder="未配置"
                className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-[15px]"
              />
            </div>
          </div>
          <button
            onClick={handleTestEmailConnection}
            className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 rounded-lg text-sm font-bold transition-colors"
          >
             一键测试发送连接
          </button>
        </div>

        <hr className="border-[var(--border-color)]" />

        <div>
          <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-4">聚合支付网关 (Payment Gateways)</h3>
          <div className="space-y-[var(--spacing-md)]">
            <div className="p-4 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50/50">
               <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                 <div>
                    <p className="font-bold text-[var(--text-main)] text-[15px] flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span> Stripe (全球信用卡与外币结算)</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">支持 USD, EUR, GBP等货币扣款与循环订阅</p>
                  </div>
                  <button
                    onClick={handleVerifyStripeGateway}
                    className="px-4 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 rounded text-sm font-bold transition-colors"
                  >
                    验证密钥
                  </button>
                </div>
                <div className="space-y-3">
                   <div>
                     <label className="block text-[12px] font-bold text-gray-500 mb-1">Publishable Key</label>
                     <input
                       type="text"
                       value={form.stripePublishableKeyInput}
                       onChange={(event) => updateForm('stripePublishableKeyInput', event.target.value)}
                       placeholder={form.stripePublishableKeyLast4 ? `保留当前 ****${form.stripePublishableKeyLast4}` : '未配置'}
                       className="w-full px-3 py-2 border border-[var(--border-color)] rounded bg-white text-sm font-mono text-gray-600 outline-none focus:border-blue-500 max-w-lg"
                     />
                     <p className="mt-1 text-[11px] text-[var(--text-muted)] font-mono">
                       {form.stripePublishableCredentialRef || 'credential:unconfigured'}
                     </p>
                   </div>
                   <div>
                     <label className="block text-[12px] font-bold text-gray-500 mb-1">Secret Key / Webhook Signing Secret</label>
                     <input
                       type="password"
                       value={form.stripeSecretKeyInput}
                       onChange={(event) => updateForm('stripeSecretKeyInput', event.target.value)}
                       placeholder={form.stripeSecretKeyLast4 ? `保留当前 ****${form.stripeSecretKeyLast4}` : '未配置'}
                       className="w-full px-3 py-2 border border-[var(--border-color)] rounded bg-white text-sm font-mono text-gray-600 outline-none focus:border-blue-500 max-w-lg"
                     />
                     <p className="mt-1 text-[11px] text-[var(--text-muted)] font-mono">
                       {form.stripeSecretCredentialRef || 'credential:unconfigured'}
                     </p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const WORKSPACE_ROLE_ORDER: WorkspaceRole[] = ['owner', 'admin', 'operator', 'finance', 'viewer'];
const WORKSPACE_MEMBER_DEPARTMENTS = ['Founding Team', 'Operations', 'Finance', 'Marketing', 'Partners', 'General'];
const WORKSPACE_MEMBER_STATUSES: WorkspaceMemberStatus[] = ['active', 'inactive', 'invited', 'suspended'];
const MEMBER_BULK_HISTORY_SETTING_KEY = 'admin.memberBulkOperationHistory';
const MEMBER_BULK_HISTORY_LIMIT = 8;

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  operator: 'Operator',
  finance: 'Finance',
  viewer: 'Viewer',
};

const ROLE_DESCRIPTIONS: Record<WorkspaceRole, string> = {
  owner: 'Full workspace ownership, billing, settings, dispatch, and audit access.',
  admin: 'Day-to-day workspace administration with billing, settings, users, and audit access.',
  operator: 'Production operations role for assets, settings, and agent dispatch without billing authority.',
  finance: 'Billing, finance, tax, and audit role without agent dispatch authority.',
  viewer: 'Read-only workspace visibility for dashboards and billing overview.',
};

const ROLE_MODULE_CHECKS: { id: string; label: string; permission: string }[] = [
  { id: 'dashboard', label: 'Dashboard', permission: 'module.dashboard.view' },
  { id: 'billing', label: 'Billing', permission: 'module.billing.view' },
  { id: 'admin', label: 'Admin Console', permission: 'module.admin.view' },
  { id: 'finance', label: 'Finance', permission: 'module.finance.view' },
  { id: 'tax', label: 'Tax', permission: 'module.tax.view' },
  { id: 'crm', label: 'CRM', permission: 'module.crm.view' },
  { id: 'assets', label: 'Assets', permission: 'module.assets.view' },
  { id: 'tasks', label: 'Tasks', permission: 'module.tasks.view' },
  { id: 'store', label: 'Marketplace', permission: 'module.store.view' },
];

const PERMISSION_LABELS: Record<WorkspacePermission, string> = {
  'workspace.view': 'View workspace',
  'workspace.manage': 'Manage workspace',
  'billing.view': 'View billing',
  'billing.manage': 'Manage billing',
  'tasks.manage': 'Manage tasks',
  'generation.dispatch': 'Dispatch agents',
  'settings.manage': 'Manage settings',
  'assets.manage': 'Manage assets',
  'audit.view': 'View audit logs',
  'api_keys.manage': 'Manage API keys',
};

interface WorkspaceMemberBulkHistoryEntry {
  id: string;
  action: string;
  count: number;
  timestamp: number;
  status: 'Success' | 'Skipped';
}

function normalizeMemberBulkHistoryEntry(value: unknown): WorkspaceMemberBulkHistoryEntry | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entry = value as Partial<WorkspaceMemberBulkHistoryEntry>;
  const action = typeof entry.action === 'string' && entry.action.trim() ? entry.action.trim() : '';
  const count = Number(entry.count);
  const timestamp = Number(entry.timestamp);
  if (!action || !Number.isFinite(count) || !Number.isFinite(timestamp)) return null;
  return {
    id: typeof entry.id === 'string' && entry.id.trim() ? entry.id : `bulk_${timestamp}`,
    action,
    count: Math.max(0, Math.round(count)),
    timestamp: Math.max(0, Math.round(timestamp)),
    status: entry.status === 'Skipped' ? 'Skipped' : 'Success',
  };
}

function loadMemberBulkHistory(context: Parameters<typeof loadSettings>[0]): WorkspaceMemberBulkHistoryEntry[] {
  const rawHistory = loadSettings(context)[MEMBER_BULK_HISTORY_SETTING_KEY];
  if (!Array.isArray(rawHistory)) return [];
  return rawHistory
    .map(normalizeMemberBulkHistoryEntry)
    .filter((entry): entry is WorkspaceMemberBulkHistoryEntry => entry !== null)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MEMBER_BULK_HISTORY_LIMIT);
}

function AdminMembers() {
  const session = useSaasSession();
  const memberContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const memberSettingsContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const [members, setMembers] = useState<WorkspaceMember[]>(() => ensureDemoWorkspaceMembers(session));
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isImporting, setIsImporting] = useState(false);
  const [bulkHistory, setBulkHistory] = useState<WorkspaceMemberBulkHistoryEntry[]>(() =>
    loadMemberBulkHistory(memberSettingsContext),
  );

  const refreshMembers = () => {
    setMembers(loadWorkspaceMembers(memberContext));
  };
  const refreshBulkHistory = () => {
    setBulkHistory(loadMemberBulkHistory(memberSettingsContext));
  };

  useEffect(() => {
    ensureDemoWorkspaceMembers(session);
    refreshMembers();
    refreshBulkHistory();
    // Hydrate members from API (dispatches `workspace_members_updated` to refresh listeners).
    void hydrateWorkspaceMembers(memberContext);

    const handleMembersUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshMembers();
    };
    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshBulkHistory();
    };

    window.addEventListener('workspace_members_updated', handleMembersUpdated);
    window.addEventListener('settings_updated', handleSettingsUpdated);
    window.addEventListener('storage', refreshMembers);
    window.addEventListener('storage', refreshBulkHistory);
    return () => {
      window.removeEventListener('workspace_members_updated', handleMembersUpdated);
      window.removeEventListener('settings_updated', handleSettingsUpdated);
      window.removeEventListener('storage', refreshMembers);
      window.removeEventListener('storage', refreshBulkHistory);
    };
  }, [memberContext, memberSettingsContext, session]);

  const filteredMembers = members.filter((member) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = !query || [member.name, member.email, member.department, member.role]
      .join(' ')
      .toLowerCase()
      .includes(query);
    const matchesDepartment = departmentFilter === 'all' || member.department === departmentFilter;
    return matchesQuery && matchesDepartment;
  });

  const selectedMembers = members.filter((member) => selectedMemberIds.includes(member.id));
  const allFilteredSelected = filteredMembers.length > 0 &&
    filteredMembers.every((member) => selectedMemberIds.includes(member.id));

  const writeMemberAudit = (
    action: 'member_create' | 'member_update' | 'member_delete' | 'member_import',
    metadata: Record<string, unknown>,
    targetId?: string,
  ) => {
    logAuditEvent({
      action,
      moduleId: 'admin' as ModuleId,
      targetType: 'workspace',
      targetId,
      metadata,
    }, { session });
    window.dispatchEvent(new Event('activity_logged'));
  };

  const addBulkHistory = (action: string, count: number) => {
    const timestamp = Date.now();
    const nextHistory = [
      {
        id: `bulk_${timestamp}_${Math.random().toString(36).slice(2, 6)}`,
        action,
        count,
        timestamp,
        status: 'Success' as const,
      },
      ...bulkHistory,
    ].slice(0, MEMBER_BULK_HISTORY_LIMIT);
    saveSettings({ [MEMBER_BULK_HISTORY_SETTING_KEY]: nextHistory }, memberSettingsContext);
    setBulkHistory(nextHistory);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.checked) {
      setSelectedMemberIds((prev) => prev.filter((id) => !filteredMembers.some((member) => member.id === id)));
      return;
    }
    setSelectedMemberIds((prev) => Array.from(new Set([...prev, ...filteredMembers.map((member) => member.id)])));
  };

  const handleSelectMember = (memberId: string) => {
    setSelectedMemberIds((prev) => (
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    ));
  };

  const updateMember = (
    member: WorkspaceMember,
    patch: Partial<Pick<WorkspaceMember, 'role' | 'department' | 'status'>>,
  ) => {
    const updatedMember = updateWorkspaceMember(member.id, patch, memberContext);
    if (!updatedMember) return;
    writeMemberAudit('member_update', {
      email: member.email,
      before: {
        role: member.role,
        department: member.department,
        status: member.status,
      },
      after: patch,
    }, member.id);
    toast(`Updated ${member.name}`, 'success');
  };

  const handleBulkStatus = (status: WorkspaceMemberStatus) => {
    if (selectedMembers.length === 0) return toast('Select members first', 'info');
    selectedMembers.forEach((member) => updateWorkspaceMember(member.id, { status }, memberContext));
    writeMemberAudit('member_update', {
      operation: 'bulk_status_update',
      status,
      memberIds: selectedMemberIds,
      count: selectedMembers.length,
    });
    addBulkHistory(`Bulk set status: ${status}`, selectedMembers.length);
    toast(`Updated ${selectedMembers.length} members`, 'success');
    setSelectedMemberIds([]);
  };

  const handleBulkDepartment = (department: string) => {
    if (!department || selectedMembers.length === 0) return;
    selectedMembers.forEach((member) => updateWorkspaceMember(member.id, { department }, memberContext));
    writeMemberAudit('member_update', {
      operation: 'bulk_department_update',
      department,
      memberIds: selectedMemberIds,
      count: selectedMembers.length,
    });
    addBulkHistory(`Bulk assign department: ${department}`, selectedMembers.length);
    toast(`Assigned ${selectedMembers.length} members to ${department}`, 'success');
    setSelectedMemberIds([]);
  };

  const handleDeleteSelected = () => {
    if (selectedMembers.length === 0) return toast('Select members first', 'info');
    deleteWorkspaceMembers(selectedMemberIds, memberContext);
    writeMemberAudit('member_delete', {
      memberIds: selectedMemberIds,
      emails: selectedMembers.map((member) => member.email),
      count: selectedMembers.length,
    });
    addBulkHistory('Deleted selected members', selectedMembers.length);
    toast(`Deleted ${selectedMembers.length} members`, 'success');
    setSelectedMemberIds([]);
  };

  const handleImportCSV = () => {
    setIsImporting(true);
    const importedMember = createWorkspaceMember(
      {
        name: `Imported Operator ${members.length + 1}`,
        email: `operator.${members.length + 1}@example.com`,
        role: 'operator',
        department: 'Operations',
        status: 'invited',
        metadata: { source: 'admin_csv_import' },
      },
      memberContext,
    );
    writeMemberAudit('member_import', {
      importedCount: 1,
      memberId: importedMember.id,
      email: importedMember.email,
    }, importedMember.id);
    addBulkHistory('CSV import created invited operator', 1);
    setIsImporting(false);
    toast('Imported 1 invited member', 'success');
  };

  const handleInviteSelected = () => {
    if (selectedMembers.length === 0) return toast('Select members first', 'info');
    writeMemberAudit('member_update', {
      operation: 'email_invite',
      memberIds: selectedMemberIds,
      emails: selectedMembers.map((member) => member.email),
    });
    addBulkHistory('Sent email invites', selectedMembers.length);
    toast(`Sent ${selectedMembers.length} invites`, 'success');
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">Workspace Members</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage persisted workspace members, departments, canonical roles, and account status.
          </p>
        </div>
        <div className="flex space-x-3">
          <button onClick={handleImportCSV} disabled={isImporting} className="flex items-center space-x-2 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm disabled:opacity-50">
            {isImporting ? <div className="w-4 h-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" /> : <Upload className="icon-sm" />}
            <span>{isImporting ? 'Importing...' : 'CSV Import'}</span>
          </button>
          <button onClick={handleInviteSelected} className="flex items-center space-x-2 bg-[#F3F4F6] text-gray-700 border border-gray-200 hover:bg-gray-200 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm">
            <Mail className="icon-sm" />
            <span>Email Invite</span>
          </button>
          <button onClick={handleImportCSV} className="flex items-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm">
            <Plus className="icon-sm" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between flex-wrap gap-4">
          <div className="relative">
            <Search className="icon-sm absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search name, email, department, or role..."
              className="pl-9 pr-4 py-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] w-80 bg-gray-50 focus:bg-[var(--bg-panel)] focus:ring-2 focus:ring-blue-500 outline-none text-[15px]"
            />
          </div>

          {selectedMemberIds.length > 0 ? (
            <div className="flex items-center space-x-2 bg-blue-50 border border-blue-100 rounded-[var(--radius-md)] px-3 py-2">
              <span className="text-[13px] font-bold text-blue-700 mx-2">Selected {selectedMemberIds.length}</span>
              <button onClick={() => handleBulkStatus('active')} className="px-3 py-1 bg-white border border-gray-200 rounded text-[13px] font-bold text-gray-700 hover:bg-gray-50">Activate</button>
              <button onClick={() => handleBulkStatus('suspended')} className="px-3 py-1 bg-white border border-gray-200 rounded text-[13px] font-bold text-red-600 hover:bg-gray-50">Suspend</button>
              <button onClick={handleDeleteSelected} className="px-3 py-1 bg-white border border-red-200 rounded text-[13px] font-bold text-red-600 hover:bg-red-50">Delete</button>
              <select onChange={(event) => handleBulkDepartment(event.target.value)} className="px-3 py-1 bg-white border border-gray-200 rounded text-[13px] font-bold text-gray-700 hover:bg-gray-50 outline-none" defaultValue="">
                <option value="" disabled>Assign department...</option>
                {WORKSPACE_MEMBER_DEPARTMENTS.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </div>
          ) : (
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="border border-[var(--border-color)] rounded-[var(--radius-lg)] px-4 py-2 text-[15px] bg-[var(--bg-panel)] font-medium outline-none"
            >
              <option value="all">All departments</option>
              {WORKSPACE_MEMBER_DEPARTMENTS.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          )}
        </div>
        <table className="w-full text-left flex-1">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">
              <th className="py-4 px-6 w-12">
                <input type="checkbox" checked={allFilteredSelected} onChange={handleSelectAll} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
              </th>
              <th className="py-4 px-6">Member</th>
              <th className="py-4 px-6">Department</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6">Role</th>
              <th className="py-4 px-6 text-right">Last Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredMembers.map((member) => (
              <tr key={member.id} className={`hover:bg-gray-50/50 ${selectedMemberIds.includes(member.id) ? 'bg-blue-50/30' : ''}`}>
                <td className="py-4 px-6">
                  <input type="checkbox" checked={selectedMemberIds.includes(member.id)} onChange={() => handleSelectMember(member.id)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">{member.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <p className="font-bold text-[var(--text-main)] text-[15px]">{member.name}</p>
                      <p className="text-xs text-[var(--text-muted)] font-medium">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <select
                    value={member.department}
                    onChange={(event) => updateMember(member, { department: event.target.value })}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-[13px] font-bold text-gray-700 bg-white outline-none"
                  >
                    {WORKSPACE_MEMBER_DEPARTMENTS.map((department) => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
                </td>
                <td className="py-4 px-6">
                  <select
                    value={member.status}
                    onChange={(event) => updateMember(member, { status: event.target.value as WorkspaceMemberStatus })}
                    className={`border rounded-lg px-2 py-1.5 text-[13px] font-bold outline-none ${
                      member.status === 'active'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : member.status === 'suspended'
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {WORKSPACE_MEMBER_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </td>
                <td className="py-4 px-6 text-[13px] text-indigo-700 font-bold bg-indigo-50/30">
                  <select
                    value={member.role}
                    onChange={(event) => updateMember(member, { role: event.target.value as WorkspaceRole })}
                    className="border border-indigo-100 rounded-lg px-2 py-1.5 bg-white text-indigo-700 font-bold outline-none"
                  >
                    {WORKSPACE_ROLE_ORDER.map((role) => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                </td>
                <td className="py-4 px-6 text-right text-xs text-[var(--text-muted)] font-bold">
                  {member.lastActiveAt ? new Date(member.lastActiveAt).toLocaleString() : 'No activity yet'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden p-6">
        <h3 className="text-[16px] flex items-center font-bold text-[var(--text-main)] mb-4">
          <History className="w-5 h-5 mr-2 text-blue-500" /> Workspace Member Operations
        </h3>
        <div className="space-y-3">
          {bulkHistory.map((history) => (
            <div key={history.id} className="flex flex-wrap items-center justify-between p-4 rounded-[16px] bg-gray-50 border border-gray-100/50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col">
                <span className="font-bold text-[14px] text-gray-800 flex items-center">
                  {history.action}
                  {history.status === 'Success' && <span className="ml-2 px-2.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-bold">Success</span>}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  Affected: <strong className="text-blue-600">{history.count}</strong> members - {formatAdminDateTime(history.timestamp)}
                </span>
              </div>
            </div>
          ))}
          {bulkHistory.length === 0 && (
            <div className="p-4 rounded-[16px] bg-gray-50 border border-gray-100/50 text-sm font-bold text-[var(--text-muted)]">
              No persisted bulk member operations yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminRoles() {
  const session = useSaasSession();
  const [simulatedRole, setSimulatedRole] = useState<WorkspaceRole>('operator');
  const roleEntries = WORKSPACE_ROLE_ORDER.map((role) => ({
    id: role,
    name: ROLE_LABELS[role],
    desc: ROLE_DESCRIPTIONS[role],
    permissions: ROLE_PERMISSIONS[role],
  }));

  const simulatedPermissions = ROLE_PERMISSIONS[simulatedRole];

  const handleReviewMatrix = () => {
    logAuditEvent({
      action: 'role_policy_review',
      moduleId: 'admin' as ModuleId,
      targetType: 'settings',
      targetId: 'role_permissions',
      metadata: {
        roles: WORKSPACE_ROLE_ORDER,
        simulatedRole,
      },
    }, { session });
    window.dispatchEvent(new Event('activity_logged'));
    toast('Role policy matrix reviewed', 'success');
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">Roles & Access Control</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Canonical SaaS roles are derived from ROLE_PERMISSIONS and module permission checks.
          </p>
        </div>
        <button
          onClick={handleReviewMatrix}
          className="flex items-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm"
        >
          <ShieldAlert className="icon-sm" />
          <span>Audit Review</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest px-2">Canonical Workspace Roles</h3>
          {roleEntries.map((role) => (
            <button
              key={role.id}
              onClick={() => setSimulatedRole(role.id)}
              className={`w-full text-left p-5 rounded-[20px] border bg-[var(--bg-panel)] shadow-sm transition-all ${
                simulatedRole === role.id ? 'border-blue-400 ring-4 ring-blue-50' : 'border-[var(--border-color)] hover:border-blue-300'
              }`}
            >
              <div className="flex items-center space-x-2 mb-3">
                <Lock className="w-5 h-5 text-blue-500" />
                <h4 className="font-bold text-[var(--text-main)] text-[16px]">{role.name}</h4>
              </div>
              <p className="text-[13px] text-gray-500 mb-4 leading-relaxed">{role.desc}</p>
              <div className="flex flex-wrap gap-2">
                {role.permissions.map((permission) => (
                  <span key={permission} className="text-[11px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md font-bold">
                    {PERMISSION_LABELS[permission]}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <h3 className="text-[15px] font-bold text-[var(--text-main)]">Permission Matrix</h3>
            <select
              value={simulatedRole}
              onChange={(event) => setSimulatedRole(event.target.value as WorkspaceRole)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-[13px] font-bold text-gray-700 outline-none hover:bg-gray-50 focus:ring-2 focus:ring-blue-100"
            >
              {roleEntries.map((role) => (
                <option key={role.id} value={role.id}>Simulate: {role.name}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-2 text-[12px] font-bold text-gray-400 uppercase tracking-widest">Capability</th>
                  {roleEntries.map((role) => (
                    <th key={role.id} className="py-3 px-2 text-center text-[12px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50/50 rounded-t-lg">{role.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(Object.keys(PERMISSION_LABELS) as WorkspacePermission[]).map((permission) => (
                  <tr key={permission} className="hover:bg-gray-50/50">
                    <td className="py-4 px-2 text-[14px] font-bold text-[var(--text-main)]">{PERMISSION_LABELS[permission]}</td>
                    {roleEntries.map((role) => {
                      const hasAccess = hasWorkspacePermission(role.id, permission);
                      return (
                        <td key={role.id} className={`py-4 px-2 text-center ${hasAccess ? 'bg-emerald-50/30' : ''}`}>
                          {hasAccess ? (
                            <CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" />
                          ) : (
                            <X className="w-4 h-4 mx-auto text-gray-300" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl animate-in fade-in">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="flex items-center text-blue-900 font-bold text-lg">
                  <Eye className="w-5 h-5 mr-2" /> Module Visibility Simulation
                </h4>
                <p className="text-sm text-blue-700 mt-1">
                  Current role: {ROLE_LABELS[simulatedRole]}. Visibility is computed through hasWorkspacePermission.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {ROLE_MODULE_CHECKS.map((moduleCheck) => {
                const hasAccess = hasWorkspacePermission(simulatedRole, moduleCheck.permission);
                return (
                  <div key={moduleCheck.id} className={`px-4 py-2 rounded-xl flex items-center shadow-sm ${hasAccess ? 'bg-white border text-blue-800 border-blue-200' : 'bg-gray-100 border text-gray-400 border-gray-200 opacity-60'}`}>
                    {hasAccess ? <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> : <Lock className="w-4 h-4 mr-2 text-gray-400" />}
                    <span className={hasAccess ? 'font-bold' : ''}>{moduleCheck.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {simulatedPermissions.map((permission) => (
                <span key={permission} className="text-[11px] bg-white text-blue-800 border border-blue-100 px-2.5 py-1 rounded-md font-bold">
                  {permission}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminProviders() {
  const session = useSaasSession();
  const providerContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const providerUsageContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const canManageProviderConfig = hasWorkspacePermission(session.membership.role, 'settings.manage');
  const [providerTab, setProviderTab] = useState<'list' | 'models'>('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProviderPlatform, setNewProviderPlatform] = useState('OpenAI');
  const [newProviderKey, setNewProviderKey] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedModels, setDetectedModels] = useState<string[]>([]);
  const [providers, setProviders] = useState<WorkspaceProviderConfig[]>(() =>
    ensureDefaultWorkspaceProviders(providerContext),
  );

  useEffect(() => {
    ensureDefaultWorkspaceProviders(providerContext);
    const refreshProviders = () => setProviders(loadWorkspaceProviders(providerContext));
    const handleProvidersUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshProviders();
    };

    refreshProviders();
    window.addEventListener('workspace_providers_updated', handleProvidersUpdated);
    return () => window.removeEventListener('workspace_providers_updated', handleProvidersUpdated);
  }, [providerContext, session.workspace.id]);

  const activeProviders = providers.filter((provider) => provider.enabled);
  const averageLatency = activeProviders
    .map((provider) => provider.latencyMs)
    .filter((latency): latency is number => typeof latency === 'number')
    .reduce((total, latency, _, latencies) => total + latency / latencies.length, 0);
  const statusCounts = providers.reduce<Record<WorkspaceProviderStatus, number>>(
    (counts, provider) => ({ ...counts, [provider.status]: counts[provider.status] + 1 }),
    { healthy: 0, rate_limited: 0, sleeping: 0, offline: 0 },
  );
  const enabledModelCount = activeProviders.reduce((total, provider) => total + provider.modelIds.length, 0);

  const statusLabels: Record<WorkspaceProviderStatus, string> = {
    healthy: '健康',
    rate_limited: '限流',
    sleeping: '休眠',
    offline: '离线',
  };

  const statusClassNames: Record<WorkspaceProviderStatus, string> = {
    healthy: 'text-green-600',
    rate_limited: 'text-amber-600',
    sleeping: 'text-gray-400',
    offline: 'text-red-600',
  };

  const statusDotClassNames: Record<WorkspaceProviderStatus, string> = {
    healthy: 'bg-green-500',
    rate_limited: 'bg-amber-500 animate-pulse',
    sleeping: 'bg-gray-400',
    offline: 'bg-red-500',
  };

  const auditProviderChange = (
    action: 'provider_config_create' | 'provider_config_update' | 'provider_config_default',
    provider: WorkspaceProviderConfig,
    metadata: Record<string, unknown>,
  ) => {
    logAuditEvent(
      {
        action,
        moduleId: 'admin' as ModuleId,
        targetType: 'provider_config',
        targetId: provider.id,
        metadata: {
          providerName: provider.name,
          platform: provider.platform,
          ...metadata,
        },
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
  };

  const refreshProviders = () => setProviders(loadWorkspaceProviders(providerContext));

  const handleDetectModels = () => {
    if (!newProviderKey) return;
    setIsDetecting(true);
    setDetectedModels(detectProviderModels(newProviderPlatform));
    setIsDetecting(false);
  };

  const handleAddProvider = () => {
    if (!canManageProviderConfig) {
      toast('当前角色无权接入服务商', 'warning');
      return;
    }
    if (detectedModels.length === 0) return;
    const provider = createWorkspaceProvider(
      {
        platform: newProviderPlatform,
        apiKey: newProviderKey,
        modelIds: detectedModels,
        billingLabel: '按量计费',
      },
      providerContext,
    );
    refreshProviders();
    auditProviderChange('provider_config_create', provider, {
      modelCount: provider.modelIds.length,
      apiKeyLast4: provider.apiKeyLast4,
    });
    toast(`${provider.name} 已接入`, 'success');
    setShowAddModal(false);
    setNewProviderKey('');
    setDetectedModels([]);
  };

  const handleToggleProvider = (provider: WorkspaceProviderConfig) => {
    if (!canManageProviderConfig) {
      toast('当前角色无权修改服务商配置', 'warning');
      return;
    }
    const enabled = !provider.enabled;
    const updatedProvider = updateWorkspaceProvider(
      provider.id,
      { enabled, status: enabled ? 'healthy' : 'sleeping' },
      providerContext,
    );
    if (!updatedProvider) return;
    refreshProviders();
    auditProviderChange('provider_config_update', updatedProvider, {
      enabled,
      status: updatedProvider.status,
    });
    toast(enabled ? '服务商已启用' : '服务商已停用', 'success');
  };

  const handleTestProvider = (provider: WorkspaceProviderConfig) => {
    if (!canManageProviderConfig) {
      toast('Provider test requires settings permission', 'warning');
      return;
    }
    const lastTestedAt = Date.now();
    const latencyMs = provider.latencyMs ?? Math.max(60, 80 + provider.modelIds.length * 24);
    const updatedProvider = updateWorkspaceProvider(
      provider.id,
      {
        status: provider.enabled ? 'healthy' : 'sleeping',
        latencyMs,
        lastTestedAt,
        metadata: {
          ...provider.metadata,
          lastProviderTest: {
            testedAt: lastTestedAt,
            latencyMs,
            modelCount: provider.modelIds.length,
          },
        },
      },
      providerContext,
    );
    if (!updatedProvider) return;
    createWorkspaceUsageEvent(
      {
        moduleId: 'saas_api_keys',
        kind: 'provider_test',
        targetType: 'provider_config',
        targetId: updatedProvider.id,
        credits: 1,
        metadata: {
          operation: 'provider_test',
          providerName: updatedProvider.name,
          platform: updatedProvider.platform,
          modelCount: updatedProvider.modelIds.length,
          latencyMs,
          lastTestedAt,
        },
      },
      providerUsageContext,
    );
    refreshProviders();
    auditProviderChange('provider_config_update', updatedProvider, {
      operation: 'provider_test',
      latencyMs,
      lastTestedAt,
      usageEventKind: 'provider_test',
    });
    toast(`${updatedProvider.name} provider test recorded`, 'success');
  };

  const handleSetDefaultProvider = (provider: WorkspaceProviderConfig) => {
    if (!canManageProviderConfig) {
      toast('当前角色无权修改默认服务商', 'warning');
      return;
    }
    const updatedProvider = setDefaultWorkspaceProvider(provider.id, providerContext);
    if (!updatedProvider) return;
    refreshProviders();
    auditProviderChange('provider_config_default', updatedProvider, { operation: 'set_default' });
    toast(`${updatedProvider.name} 已设为全局首选`, 'success');
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">AI 服务商管理</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">配置上游 LLM 和生图生视频 API 密钥池与路由策略</p>
        </div>
        <div className="flex space-x-3">
           <button className="flex items-center space-x-2 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm">
             <Settings2 className="icon-sm" />
             <span>路由策略</span>
           </button>
           <button
             onClick={() => setShowAddModal(true)}
             disabled={!canManageProviderConfig}
             className="flex items-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm"
           >
              <Plus className="icon-sm" />
              <span>添加模型服务</span>
            </button>
        </div>
      </div>

      <div className="flex bg-gray-100 p-1 rounded-[var(--radius-lg)] w-fit mb-4">
        <button 
          onClick={() => setProviderTab('list')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${providerTab === 'list' ? 'bg-[var(--bg-panel)] text-blue-700 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
        >
          服务商列表
        </button>
        <button 
          onClick={() => setProviderTab('models')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${providerTab === 'models' ? 'bg-[var(--bg-panel)] text-blue-700 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
        >
          已启用模型管理
        </button>
      </div>

      {providerTab === 'list' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)] mb-[var(--spacing-md)]">
             <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm">
                <div className="flex items-center text-[var(--text-muted)] mb-2">
                   <Activity className="icon-sm mr-2" />
                   <span className="text-xs font-bold uppercase tracking-widest">今日调用总数</span>
                </div>
                 <p className="text-2xl font-bold text-[var(--text-main)]">{enabledModelCount.toLocaleString()}</p>
                 <p className="text-[11px] font-medium text-green-600 mt-1 flex items-center">已启用模型总数</p>
             </div>
             <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm">
                <div className="flex items-center text-[var(--text-muted)] mb-2">
                   <Clock className="icon-sm mr-2" />
                   <span className="text-xs font-bold uppercase tracking-widest">平均响应延迟</span>
                </div>
                 <p className="text-2xl font-bold text-[var(--text-main)]">{Math.round(averageLatency) || '--'}<span className="text-sm text-[var(--text-muted)] ml-1">ms</span></p>
                 <p className="text-[11px] font-medium text-[var(--text-muted)] mt-1">来自已启用服务商配置</p>
             </div>
             <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm">
                <div className="flex items-center text-[var(--text-muted)] mb-2">
                   <AlertCircle className="icon-sm mr-2" />
                   <span className="text-xs font-bold uppercase tracking-widest">API 错误率</span>
                </div>
                 <p className="text-2xl font-bold text-[var(--text-main)]">{statusCounts.rate_limited + statusCounts.offline}</p>
                 <p className="text-[11px] font-medium text-red-500 mt-1 flex items-center">需处理的异常服务商</p>
             </div>
             <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm">
                <div className="flex items-center text-[var(--text-muted)] mb-2">
                   <Zap className="icon-sm mr-2" />
                   <span className="text-xs font-bold uppercase tracking-widest">活跃服务商</span>
                </div>
                 <p className="text-2xl font-bold text-[var(--text-main)]">{activeProviders.length}<span className="text-sm text-[var(--text-muted)] ml-1">/ {providers.length}</span></p>
                 <p className="text-[11px] font-medium text-[var(--text-muted)] mt-1">{statusCounts.sleeping} 个备用提供商已休眠</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
            {providers.map((prov) => (
              <div key={prov.id} className={`bg-[var(--bg-panel)] rounded-[24px] border ${prov.enabled ? 'border-[var(--border-color)] hover:border-blue-300' : 'border-[var(--border-color)] opacity-75'} shadow-sm p-[var(--spacing-lg)] relative group transition-colors`}>
                {prov.isDefault && (
                   <div className="absolute -top-3 -right-3 bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border-2 border-white shadow-sm flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      全局首选
                   </div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div>
                     <h3 className={`font-bold text-lg flex items-center ${prov.enabled ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                        {prov.name}
                     </h3>
                     <div className="flex items-center space-x-3 mt-1.5">
                         <span className={`flex items-center bg-gray-50 px-2 py-0.5 rounded text-[11px] font-bold ${statusClassNames[prov.status]}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusDotClassNames[prov.status]}`}></span>
                            {statusLabels[prov.status]}
                         </span>
                         <span className="text-[11px] font-medium text-gray-400 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {prov.latencyMs === null ? '--' : `${prov.latencyMs}ms`}
                         </span>
                      </div>
                   </div>
                   <button
                     onClick={() => handleToggleProvider(prov)}
                     disabled={!canManageProviderConfig}
                     className={`${prov.enabled ? 'text-[var(--color-primary)]' : 'text-gray-300'} disabled:cursor-not-allowed`}
                   >
                      {prov.enabled ? <ToggleRight className="icon-xl" /> : <ToggleLeft className="icon-xl" />}
                   </button>
                 </div>
                <div className="space-y-[var(--spacing-md)] mb-[var(--spacing-md)]">
                  <div>
                     <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">可用模型 ({prov.modelIds.length})</p>
                     <div className="flex flex-wrap gap-2">
                       {prov.modelIds.map((m) => (
                         <span key={m} className={`text-xs font-medium px-2 py-1.5 rounded-md border ${prov.enabled ? 'bg-gray-50 border-[var(--border-color)] text-gray-700' : 'bg-gray-50/50 border-[var(--border-color)] text-gray-400'}`}>{m}</span>
                       ))}
                     </div>
                   </div>
                  <div className="flex justify-between text-sm py-2 px-3 bg-gray-50 rounded-[var(--radius-lg)] border border-[var(--border-color)]">
                    <span className="text-[var(--text-muted)] font-medium">账户余额 / 计费</span>
                    <span className={`font-bold ${prov.enabled ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>{prov.billingLabel}</span>
                  </div>
                </div>
                <div className="border-t border-[var(--border-color)] pt-4 flex space-x-3">
                  <button className="flex-1 flex items-center justify-center space-x-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 font-bold py-2 rounded-[var(--radius-lg)] text-sm transition-colors">
                     <Key className="icon-sm" />
                     <span>{prov.apiKeyLast4 ? `密钥尾号 ${prov.apiKeyLast4}` : '密钥管理'}</span>
                  </button>
                  <button
                    onClick={() => handleTestProvider(prov)}
                    disabled={!canManageProviderConfig}
                    className="flex-1 flex items-center justify-center space-x-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-bold py-2 rounded-[var(--radius-lg)] text-sm transition-colors"
                  >
                     <Activity className="icon-sm" />
                     <span>Test</span>
                  </button>
                  <button
                    onClick={() => handleSetDefaultProvider(prov)}
                    disabled={!canManageProviderConfig || prov.isDefault}
                    className="flex-1 flex items-center justify-center space-x-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-bold py-2 rounded-[var(--radius-lg)] text-sm transition-colors"
                  >
                     <BarChart3 className="icon-sm" />
                     <span>{prov.isDefault ? '当前首选' : '设为首选'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {providerTab === 'models' && (
        <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden">
          {providers.map((prov) => (
            <div key={prov.id} className="border-b border-[var(--border-color)] last:border-b-0">
               <div className="bg-gray-50/80 px-6 py-4 flex items-center justify-between border-b border-[var(--border-color)]">
                 <div className="flex items-center">
                    <div className="icon-xl rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold mr-3">{prov.name.charAt(0)}</div>
                    <h3 className="font-bold text-[var(--text-main)]">{prov.name}</h3>
                    <span className={`ml-3 px-2 py-0.5 rounded text-[11px] font-bold ${prov.enabled ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-[var(--text-muted)]'}`}>
                      {prov.enabled ? '已连接' : '已停用'}
                    </span>
                 </div>
               </div>
               <div className="p-[var(--spacing-lg)]">
                  {prov.modelIds.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--spacing-md)]">
                       {prov.modelIds.map((model) => (
                         <div key={model} className="flex items-center justify-between p-3 border border-[var(--border-color)] rounded-[var(--radius-lg)] hover:border-blue-300 transition-colors bg-[var(--bg-panel)]">
                          <div className="flex items-center">
                            <Bot className="icon-sm text-gray-400 mr-2" />
                            <span className="font-bold text-[var(--text-main)] text-[14px]">{model}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                             <select className="text-[11px] font-medium text-[var(--text-muted)] bg-gray-50 border border-[var(--border-color)] rounded px-2 py-1 outline-none">
                               <option>全部用户可用</option>
                               <option>仅专业版</option>
                               <option>仅尊享版</option>
                             </select>
                             <ToggleRight className={`icon-lg ${prov.enabled ? 'text-green-500' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                 ) : (
                    <p className="text-sm text-[var(--text-muted)] py-2">暂无已启用的模型</p>
                 )}
               </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-panel)] rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-[var(--border-color)] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center space-x-2">
                <Bot className="icon-md text-[var(--color-primary)]" />
                <h3 className="text-[17px] font-bold text-[var(--text-main)]">接入新服务商</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
                title="关闭"
              >
                <X className="icon-md" />
              </button>
            </div>
            
            <div className="p-[var(--spacing-lg)] space-y-[var(--spacing-md)] overflow-y-auto max-h-[65vh]">
              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">选择预设平台</label>
                 <select 
                   value={newProviderPlatform}
                   onChange={(e) => {
                     setNewProviderPlatform(e.target.value);
                     setDetectedModels([]);
                   }}
                   className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-[var(--radius-lg)] font-medium text-gray-700 bg-[var(--bg-panel)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                 >
                   <option value="OpenAI">OpenAI 系列</option>
                   <option value="Anthropic">Anthropic (Claude)</option>
                   <option value="Google Vertex AI">Google Vertex AI</option>
                   <option value="Midjourney API (Unofficial)">Midjourney API</option>
                   <option value="Custom">自定义 OpenAI 兼容接口</option>
                 </select>
              </div>

              {newProviderPlatform === 'Custom' && (
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">自定义网关地址 (Base URL)</label>
                   <input 
                     type="text" 
                     placeholder="https://api.example.com/v1"
                     className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-[var(--radius-lg)] text-[15px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                   />
                </div>
              )}

              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">API 密钥 (API Key)</label>
                 <input 
                   type="password" 
                   value={newProviderKey}
                   onChange={(e) => setNewProviderKey(e.target.value)}
                   placeholder="sk-..."
                   className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-[var(--radius-lg)] text-[15px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                 />
              </div>

              {detectedModels.length === 0 ? (
                <div className="pt-2">
                  <button 
                    onClick={handleDetectModels}
                    disabled={!newProviderKey || isDetecting}
                    className="w-full bg-blue-50 text-blue-700 font-bold py-3 text-[15px] rounded-[var(--radius-lg)] hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isDetecting ? (
                      <RefreshCw className="icon-sm animate-spin" />
                    ) : (
                      <Activity className="icon-sm" />
                    )}
                    <span>{isDetecting ? '正在与网关通信探测模型...' : '自动连接并获取模型列表'}</span>
                  </button>
                </div>
              ) : (
                <div className="bg-green-50 rounded-[var(--radius-lg)] p-4 border border-green-100">
                   <p className="font-bold text-green-800 text-[14px] flex items-center mb-3">
                     <CheckCircle2 className="icon-sm mr-2" />
                     探测成功，共发现 {detectedModels.length} 个可用模型:
                   </p>
                   <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                     {detectedModels.map(name => (
                       <span key={name} className="px-2 py-1 bg-[var(--bg-panel)] border border-green-200 text-green-700 text-xs font-bold rounded-lg shadow-sm">
                         {name}
                       </span>
                     ))}
                   </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[var(--border-color)] bg-gray-50 flex justify-end space-x-3">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-gray-600 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-100 transition-colors shadow-sm text-sm"
              >
                取消
              </button>
              <button 
                onClick={handleAddProvider}
                disabled={detectedModels.length === 0}
                className="px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-white bg-[var(--color-primary)] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm text-sm"
              >
                保存并接入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminAssets() {
  const session = useSaasSession();
  const assetContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [assets, setAssets] = useState(() => loadWorkspaceAssets(assetContext));

  useEffect(() => {
    const refreshAssets = () => setAssets(loadWorkspaceAssets(assetContext));
    const handleAssetsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshAssets();
    };

    refreshAssets();
    window.addEventListener('assets_updated', handleAssetsUpdated);
    return () => window.removeEventListener('assets_updated', handleAssetsUpdated);
  }, [assetContext, session.workspace.id]);

  const parseAssetSizeMb = (size: string): number => {
    const match = size.match(/([\d.]+)\s*(KB|MB|GB)/i);
    if (!match) return 0;
    const value = Number(match[1]);
    const unit = match[2]?.toUpperCase();
    if (!Number.isFinite(value)) return 0;
    if (unit === 'GB') return value * 1024;
    if (unit === 'KB') return value / 1024;
    return value;
  };

  const totalSizeMb = assets.reduce((sum, asset) => sum + parseAssetSizeMb(asset.size), 0);
  const riskyAssets = assets.filter((asset) => (
    asset.metadata.riskLevel === 'high' ||
    asset.metadata.complianceStatus === 'blocked' ||
    asset.metadata.quarantined === true
  ));
  const reclaimableAssets = assets.filter((asset) => asset.source === 'mock' || asset.metadata.temporary === true);
  const recentAssets = assets
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 8);
  const stats = [
    { label: '总素材数量', value: assets.length.toLocaleString(), sub: `${recentAssets.length} recent records` },
    { label: '总存储占用', value: `${totalSizeMb >= 1024 ? (totalSizeMb / 1024).toFixed(1) : totalSizeMb.toFixed(1)} ${totalSizeMb >= 1024 ? 'GB' : 'MB'}`, sub: 'workspace repository' },
    { label: '合规风险', value: `${riskyAssets.length} 项`, sub: 'metadata risk flags' },
    { label: '可回收缓存', value: `${reclaimableAssets.length} 项`, sub: 'mock or temporary assets' },
  ];

  const handleComplianceScan = () => {
    logAuditEvent({
      action: 'asset_export',
      moduleId: 'admin' as ModuleId,
      targetType: 'asset',
      metadata: {
        operation: 'admin_compliance_scan',
        assetCount: assets.length,
        riskyAssetCount: riskyAssets.length,
      },
    }, { session });
    window.dispatchEvent(new Event('activity_logged'));
    toast(`Scanned ${assets.length} workspace assets`, 'success');
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">全局素材管理</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">系统范围内多媒体内容的监控与清理</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)] mb-[var(--spacing-md)]">
        {stats.map((s) => (
          <div key={s.label} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm">
             <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">{s.label}</p>
             <p className="text-2xl font-bold text-[var(--text-main)] mb-1">{s.value}</p>
             <p className="text-[11px] font-bold text-[var(--text-muted)]">{s.sub}</p>
          </div>
        ))}
      </div>

       <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">
              <th className="py-4 px-6">素材</th>
              <th className="py-4 px-6">类型</th>
              <th className="py-4 px-6">来源</th>
              <th className="py-4 px-6">大小</th>
              <th className="py-4 px-6 text-right">更新</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recentAssets.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm font-bold text-[var(--text-muted)]">暂无工作区素材</td>
              </tr>
            ) : recentAssets.map((asset) => (
              <tr key={asset.id} className="hover:bg-gray-50/50">
                <td className="py-4 px-6">
                  <p className="font-bold text-[15px] text-[var(--text-main)]">{asset.name}</p>
                  <p className="text-xs text-[var(--text-muted)] font-medium">{asset.id}</p>
                </td>
                <td className="py-4 px-6 text-sm font-bold text-gray-700">{asset.type}</td>
                <td className="py-4 px-6 text-sm text-[var(--text-muted)]">{asset.source}</td>
                <td className="py-4 px-6 text-sm font-bold text-[var(--text-main)]">{asset.size}</td>
                <td className="py-4 px-6 text-right text-xs text-[var(--text-muted)] font-bold">{formatAdminDateTime(asset.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
       </div>

       <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-xl)] text-center mt-6">
         <div className="w-16 h-16 bg-red-50 text-red-600 flex items-center justify-center rounded-full mx-auto mb-4 relative">
           <Folder className="icon-xl" />
           {riskyAssets.length > 0 && <span className="absolute top-0 right-0 icon-sm bg-red-500 border-2 border-white rounded-full"></span>}
         </div>
         <h2 className="text-lg font-bold text-[var(--text-main)] mb-2">安全引擎扫描分析</h2>
         <p className="text-sm text-[var(--text-muted)] max-w-lg mx-auto">基于当前 workspace assetRepository 记录执行合规扫描。当前发现 {riskyAssets.length} 个风险标记，{reclaimableAssets.length} 个可回收临时素材。</p>
         <button onClick={handleComplianceScan} className="mt-6 bg-red-50 text-red-600 hover:bg-red-100 font-bold px-6 py-2.5 rounded-[var(--radius-lg)] transition-colors">执行深度合规扫描</button>
       </div>
    </div>
  );
}

function AdminProjects() {
  const session = useSaasSession();
  const jobContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const assetContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [jobs, setJobs] = useState<GenerationJob[]>(() => listGenerationJobs(jobContext));
  const [assets, setAssets] = useState(() => loadWorkspaceAssets(assetContext));

  useEffect(() => {
    const refreshProjects = () => {
      setJobs(listGenerationJobs(jobContext));
      setAssets(loadWorkspaceAssets(assetContext));
    };
    const handleWorkspaceDataUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshProjects();
    };

    refreshProjects();
    window.addEventListener('generation_jobs_updated', handleWorkspaceDataUpdated);
    window.addEventListener('assets_updated', handleWorkspaceDataUpdated);
    return () => {
      window.removeEventListener('generation_jobs_updated', handleWorkspaceDataUpdated);
      window.removeEventListener('assets_updated', handleWorkspaceDataUpdated);
    };
  }, [assetContext, jobContext, session.workspace.id]);

  const projectRows = [
    ...jobs.map((job) => ({
      id: job.id,
      title: job.title,
      author: job.userId ?? 'workspace',
      views: Number(job.metadata.views ?? 0).toLocaleString(),
      stat: job.status,
      link: `${session.workspace.slug}/jobs/${job.id}`,
      updatedAt: job.updatedAt,
      targetType: 'generation_job' as const,
    })),
    ...assets.map((asset) => ({
      id: asset.id,
      title: asset.name,
      author: asset.userId ?? 'workspace',
      views: Number(asset.metadata.views ?? 0).toLocaleString(),
      stat: asset.metadata.published === true ? 'published' : asset.source,
      link: `${session.workspace.slug}/assets/${asset.id}`,
      updatedAt: asset.updatedAt,
      targetType: 'asset' as const,
    })),
  ].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 20);

  const handleInspectProject = (project: typeof projectRows[number]) => {
    logAuditEvent({
      action: 'general',
      moduleId: 'admin' as ModuleId,
      targetType: project.targetType,
      targetId: project.id,
      metadata: {
        operation: 'admin_project_inspect',
        title: project.title,
      },
    }, { session });
    window.dispatchEvent(new Event('activity_logged'));
    toast(`Opened project record: ${project.title}`, 'info');
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">全站作品监控</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">查看与管理生成分享的项目内容</p>
         </div>
       </div>

       <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">
              <th className="py-4 px-6">作品 / 链接</th>
              <th className="py-4 px-6">创作者</th>
              <th className="py-4 px-6">查看数</th>
              <th className="py-4 px-6">状态</th>
              <th className="py-4 px-6 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projectRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm font-bold text-[var(--text-muted)]">暂无生成作品或素材记录</td>
              </tr>
            ) : projectRows.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/50">
                <td className="py-4 px-6">
                   <p className="font-bold text-[15px] text-[var(--text-main)]">{p.title}</p>
                   <p className="text-xs text-[var(--color-primary)] font-medium hover:underline cursor-pointer">{p.link}</p>
                </td>
                <td className="py-4 px-6 text-[14px] text-gray-700 font-bold">{p.author}</td>
                <td className="py-4 px-6 text-[14px] text-[var(--text-muted)] font-medium">{p.views}</td>
                <td className="py-4 px-6">
                   <span className={`px-2.5 py-1 text-[13px] font-bold rounded-lg ${
                     p.stat === 'failed' || p.stat === 'cancelled' ? 'bg-red-100 text-red-700' :
                     p.stat === 'queued' || p.stat === 'uploaded' || p.stat === 'mock' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'
                   }`}>{p.stat}</span>
                </td>
                <td className="py-4 px-6 text-right space-x-3">
                  <button onClick={() => handleInspectProject(p)} className="text-[var(--color-primary)] font-bold hover:text-blue-800 text-[14px]">详情</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
       </div>
    </div>
  );
}

function formatAdminDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function getGenerationJobStatusLabel(status: GenerationJob['status']): string {
  if (status === 'succeeded') return 'done';
  return status;
}

function AdminTasks() {
  const session = useSaasSession();
  const jobContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [jobs, setJobs] = useState<GenerationJob[]>(() => listGenerationJobs(jobContext));

  useEffect(() => {
    const refreshJobs = () => setJobs(listGenerationJobs(jobContext));
    const handleJobsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshJobs();
    };

    refreshJobs();
    window.addEventListener('generation_jobs_updated', handleJobsUpdated);
    return () => window.removeEventListener('generation_jobs_updated', handleJobsUpdated);
  }, [jobContext, session.workspace.id]);

  const activeJobs = jobs
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 20);

  const handleCancelJob = (job: GenerationJob) => {
    updateGenerationJob(job.id, { status: 'cancelled', progress: 100, error: 'Cancelled by admin console' }, jobContext);
    logAuditEvent({
      action: 'generation_job_failed',
      moduleId: 'admin' as ModuleId,
      targetType: 'generation_job',
      targetId: job.id,
      metadata: {
        reason: 'admin_cancelled',
        runtimeTaskId: job.runtimeTaskId,
        title: job.title,
      },
    }, { session });
    window.dispatchEvent(new Event('activity_logged'));
    toast(`Cancelled ${job.title}`, 'success');
  };

  const handleRetryJob = (job: GenerationJob) => {
    updateGenerationJob(job.id, { status: 'pending', progress: 0, error: undefined, completedAt: undefined }, jobContext);
    logAuditEvent({
      action: 'generation_job_start',
      moduleId: 'admin' as ModuleId,
      targetType: 'generation_job',
      targetId: job.id,
      metadata: {
        reason: 'admin_retry',
        runtimeTaskId: job.runtimeTaskId,
        title: job.title,
      },
    }, { session });
    window.dispatchEvent(new Event('activity_logged'));
    toast(`Queued retry for ${job.title}`, 'success');
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">异步任务队列</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">监控正在执行的云端生成与渲染任务</p>
         </div>
         <button onClick={() => setJobs(listGenerationJobs(jobContext))} className="text-sm text-[var(--color-primary)] font-bold bg-blue-50 px-4 py-2 rounded-[var(--radius-lg)]">刷新队列</button>
       </div>

       <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] max-h-[600px] overflow-y-auto custom-scrollbar">
          {activeJobs.length === 0 ? (
            <div className="py-16 text-center text-[var(--text-muted)]">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm font-bold">暂无工作区生成任务</p>
              <p className="text-xs mt-1">Agent Dispatcher 创建任务后会自动进入这里。</p>
            </div>
          ) : (
            <div className="space-y-[var(--spacing-md)]">
              {activeJobs.map((job) => {
                const statusLabel = getGenerationJobStatusLabel(job.status);
                return (
              <div key={job.id} className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-[var(--radius-xl)]">
                 <div className="flex items-center space-x-4 w-1/3">
                   <div className="p-2.5 bg-gray-50 rounded-[var(--radius-lg)]">
                     <Activity className={`icon-md ${job.status === 'running' ? 'text-blue-500 animate-pulse' : job.status === 'failed' || job.status === 'cancelled' ? 'text-red-500' : 'text-green-500'}`} />
                   </div>
                   <div>
                     <p className="font-bold text-[15px] text-[var(--text-main)]">{job.title} <span className="text-xs text-gray-400 ml-1 font-medium bg-gray-100 px-1 rounded">{job.providerKind} / {job.runtimeMode}</span></p>
                     <p className="text-[12px] text-[var(--text-muted)]">发起人: {job.userId ?? 'workspace'} · {formatAdminDateTime(job.updatedAt)}</p>
                   </div>
                 </div>
                 
                 <div className="flex-1 px-8">
                    {job.status === 'pending' || job.status === 'running' ? (
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-[var(--color-primary)] h-2 rounded-full" style={{ width: `${job.progress}%` }}></div>
                      </div>
                    ) : job.status === 'succeeded' ? (
                      <p className="text-sm font-bold text-green-600">处理完成</p>
                    ) : (
                      <p className="text-sm font-bold text-red-600">{job.error ?? `${statusLabel}，等待重试`}</p>
                    )}
                 </div>

                 <div className="w-24 text-right">
                   {job.status === 'pending' || job.status === 'running' ? (
                     <button onClick={() => handleCancelJob(job)} className="text-red-500 text-[13px] font-bold hover:underline">终止任务</button>
                   ) : job.status === 'failed' || job.status === 'cancelled' ? (
                     <button onClick={() => handleRetryJob(job)} className="text-[var(--color-primary)] text-[13px] font-bold hover:underline">重试</button>
                   ) : (
                     <span className="text-gray-400 text-[13px]">已归档</span>
                   )}
                 </div>
              </div>
                );
              })}
            </div>
          )}
       </div>
    </div>
  );
}

function AdminMedia() {
  const session = useSaasSession();
  const mediaContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const canManageMedia = hasWorkspacePermission(session.membership.role, 'settings.manage');
  const [accounts, setAccounts] = useState<WorkspaceMediaAccount[]>(() =>
    ensureDefaultWorkspaceMediaAccounts(mediaContext),
  );

  useEffect(() => {
    ensureDefaultWorkspaceMediaAccounts(mediaContext);
    const refreshAccounts = () => setAccounts(loadWorkspaceMediaAccounts(mediaContext));
    const handleAccountsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshAccounts();
    };

    refreshAccounts();
    window.addEventListener('workspace_media_accounts_updated', handleAccountsUpdated);
    return () => window.removeEventListener('workspace_media_accounts_updated', handleAccountsUpdated);
  }, [mediaContext, session.workspace.id]);

  const summary = useMemo(() => summarizeWorkspaceMediaAccounts(accounts), [accounts]);
  const statusLabels: Record<WorkspaceMediaAccountStatus, string> = {
    active: 'Active',
    rate_limited: 'Rate Limited',
    offline: 'Offline',
    needs_config: 'Needs Config',
  };
  const statusClassNames: Record<WorkspaceMediaAccountStatus, string> = {
    active: 'bg-green-50 text-green-600',
    rate_limited: 'bg-red-50 text-red-600',
    offline: 'bg-gray-100 text-gray-600',
    needs_config: 'bg-orange-50 text-orange-600',
  };

  const auditMedia = (
    action: 'media_account_update' | 'media_oauth_export',
    account: WorkspaceMediaAccount | null,
    metadata: Record<string, unknown>,
  ) => {
    logAuditEvent(
      {
        action,
        moduleId: 'admin' as ModuleId,
        targetType: account ? 'media_account' : 'workspace',
        targetId: account?.id ?? session.workspace.id,
        metadata: {
          platformName: account?.platformName,
          status: account?.status,
          connectedAccounts: account?.connectedAccounts,
          ...metadata,
        },
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
  };

  const handleExportOauthInventory = () => {
    auditMedia('media_oauth_export', null, {
      accountCount: accounts.length,
      totalConnectedAccounts: summary.totalConnectedAccounts,
      activeProviderCount: summary.activeProviderCount,
      rateLimitedCount: summary.rateLimitedCount,
    });
    toast('媒体授权池报表已记录到审计日志', 'success');
  };

  const handleRotateClientId = (account: WorkspaceMediaAccount) => {
    if (!canManageMedia) {
      toast('当前角色无权更新媒体 OAuth 配置', 'warning');
      return;
    }
    const rotatedClientId = `${account.platformName}-${Date.now()}`.replace(/\s+/g, '-');
    const updatedAccount = updateWorkspaceMediaAccount(
      account.id,
      {
        status: 'active',
        clientId: rotatedClientId,
        metadata: {
          ...account.metadata,
          rotatedAt: Date.now(),
        },
      },
      mediaContext,
    );
    if (!updatedAccount) return;
    setAccounts(loadWorkspaceMediaAccounts(mediaContext));
    auditMedia('media_account_update', updatedAccount, {
      operation: 'rotate_client_id',
      previousStatus: account.status,
      clientIdLast4: updatedAccount.clientIdLast4,
    });
    toast('媒体 OAuth Client ID 已轮换', 'success');
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">媒体全局授权池</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">
             配置系统的 OAuth 应用参数信息，累计授权 {summary.totalConnectedAccounts.toLocaleString()} 个账号
           </p>
         </div>
         <button
           onClick={handleExportOauthInventory}
           className="bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm"
         >
           导出授权池报表
         </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
         {accounts.map((account) => (
           <div key={account.id} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] p-[var(--spacing-lg)] flex flex-col justify-between shadow-sm">
             <div className="flex justify-between items-start mb-4">
               <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-50 text-[var(--color-primary)] flex items-center justify-center rounded-[var(--radius-lg)] mr-3 font-bold">{account.platformName.charAt(0)}</div>
                  <div>
                    <h3 className="font-bold text-lg text-[var(--text-main)]">{account.platformName}</h3>
                    <p className="text-xs text-[var(--text-muted)] font-mono">
                      {account.clientIdLast4 ? `Client ID ****${account.clientIdLast4}` : account.credentialRef ?? '未配置凭证'}
                    </p>
                  </div>
               </div>
               <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${statusClassNames[account.status]}`}>
                 {statusLabels[account.status]}
               </span>
             </div>
             <div>
               <p className="text-sm text-[var(--text-muted)]">累计用户授权数: <span className="font-bold text-[var(--text-main)]">{account.connectedAccounts.toLocaleString()}</span></p>
             </div>
             <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex space-x-3">
               <button
                 onClick={() => handleRotateClientId(account)}
                 disabled={!canManageMedia}
                 className="flex-1 text-sm font-bold bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-700 py-2 rounded-[var(--radius-lg)] hover:bg-gray-50 transition-colors shadow-sm disabled:text-gray-300 disabled:cursor-not-allowed"
               >
                 更新 Client ID
               </button>
             </div>
           </div>
         ))}
       </div>
    </div>
  );
}

function AdminSaasPlans() {
  const session = useSaasSession();
  const canManagePlans = canManageBilling(session.membership.role);
  const planContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const [plans, setPlans] = useState<WorkspaceBillingPlan[]>(() => ensureDefaultWorkspaceBillingPlans(planContext));
  const [selectedPlanId, setSelectedPlanId] = useState<WorkspaceBillingPlan['id']>(session.workspace.plan);

  useEffect(() => {
    ensureDefaultWorkspaceBillingPlans(planContext);
    const refreshPlans = () => setPlans(loadWorkspaceBillingPlans(planContext));
    const handlePlansUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshPlans();
    };

    refreshPlans();
    window.addEventListener('billing_plans_updated', handlePlansUpdated);
    return () => window.removeEventListener('billing_plans_updated', handlePlansUpdated);
  }, [planContext, session.workspace.id]);

  useEffect(() => {
    if (plans.length > 0 && !plans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null;
  const totalSubscribers = plans.reduce((total, plan) => total + plan.activeSubscribers, 0);

  const refreshPlans = () => setPlans(loadWorkspaceBillingPlans(planContext));

  const auditPlanUpdate = (planId: string, patch: Record<string, unknown>) => {
    logAuditEvent(
      {
        action: 'billing_plan_update',
        targetType: 'billing_plan',
        targetId: planId,
        metadata: {
          planId,
          patch,
        },
      },
      { session },
    );
  };

  const updatePlan = (
    planId: WorkspaceBillingPlan['id'],
    patch: Partial<Omit<WorkspaceBillingPlan, 'id' | 'workspaceId' | 'updatedAt'>>,
    message: string,
  ) => {
    if (!canManagePlans) {
      toast('当前角色无权修改套餐配置', 'warning');
      return;
    }

    const updatedPlan = updateWorkspaceBillingPlan(planId, patch, planContext);
    if (!updatedPlan) {
      toast('未找到可更新的套餐', 'warning');
      return;
    }

    refreshPlans();
    auditPlanUpdate(planId, patch as Record<string, unknown>);
    toast(message, 'success');
  };

  const syncDefaultPlans = () => {
    if (!canManagePlans) {
      toast('当前角色无权同步套餐配置', 'warning');
      return;
    }

    const syncedPlans = ensureDefaultWorkspaceBillingPlans(planContext);
    setPlans(syncedPlans);
    logAuditEvent(
      {
        action: 'billing_plan_update',
        targetType: 'workspace',
        targetId: session.workspace.id,
        metadata: {
          operation: 'sync_default_billing_plans',
          planIds: syncedPlans.map((plan) => plan.id),
        },
      },
      { session },
    );
    toast('默认套餐配置已同步', 'success');
  };

  const formatPlanPrice = (plan: WorkspaceBillingPlan) => {
    if (plan.priceCents === 0) return '免费';
    return `¥${Math.round(plan.priceCents / 100).toLocaleString()}`;
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">SaaS 套餐与业务配置</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">维护订阅套餐、阶梯定价以及权限隔离规则。</p>
        </div>
        <button
          onClick={syncDefaultPlans}
          disabled={!canManagePlans}
          className="bg-[var(--color-primary)] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm flex items-center"
        >
          <Plus className="icon-sm mr-2" />
          同步默认套餐
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[var(--spacing-md)]">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] p-[var(--spacing-lg)] shadow-sm flex flex-col relative group hover:border-blue-500 hover:shadow-md transition-all">
            <div className={`absolute top-4 right-4 text-[11px] font-bold px-2 py-0.5 rounded border ${
              plan.status === 'active'
                ? 'bg-green-50 text-green-600 border-green-100'
                : 'bg-gray-100 text-gray-500 border-gray-200'
            }`}>
              {plan.status === 'active' ? '上架中' : '已下架'}
            </div>
            <h3 className="text-lg font-black text-[var(--text-main)] mb-2 pr-16">{plan.name}</h3>
            <div className="flex items-baseline mb-4">
              <span className="text-2xl font-black text-[var(--text-main)]">{formatPlanPrice(plan)}</span>
              <span className="text-sm font-medium text-[var(--text-muted)] ml-1">/{plan.billingInterval === 'month' ? '月' : '年'}</span>
            </div>

            <p className="text-sm font-bold text-gray-700 mb-2">包含核心权益:</p>
            <ul className="space-y-2 mb-[var(--spacing-md)] flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="text-[13px] text-gray-600 flex items-center">
                  <CheckCircle2 className="icon-sm text-blue-500 mr-2 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="bg-gray-50 p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[var(--text-muted)]">活跃订阅数</span>
                <span className="text-sm font-black text-[var(--text-main)]">{plan.activeSubscribers} <span className="text-[10px] text-gray-400 font-normal">租户</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[var(--text-muted)]">月度点数</span>
                <span className="text-sm font-black text-[var(--text-main)]">{plan.monthlyAllowance.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-auto">
              <button
                onClick={() => {
                  setSelectedPlanId(plan.id);
                  updatePlan(plan.id, { monthlyAllowance: plan.monthlyAllowance + 500 }, '套餐点数额度已更新');
                }}
                disabled={!canManagePlans}
                className="py-2 text-sm font-bold text-gray-600 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                增加点数
              </button>
              <button
                onClick={() => updatePlan(
                  plan.id,
                  { status: plan.status === 'active' ? 'archived' : 'active' },
                  plan.status === 'active' ? '套餐已下架' : '套餐已上架',
                )}
                disabled={!canManagePlans}
                className="py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-[var(--radius-lg)] transition-colors"
              >
                {plan.status === 'active' ? '下架' : '上架'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden mt-8">
        <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)] flex items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-[var(--text-main)] text-lg">资源配额限制</h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">按套餐维护并发、存储和月度点数阈值。</p>
          </div>
          <select
            value={selectedPlan?.id ?? ''}
            onChange={(event) => setSelectedPlanId(event.target.value as WorkspaceBillingPlan['id'])}
            className="px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-panel)] text-sm font-bold text-[var(--text-main)]"
          >
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>{plan.name}</option>
            ))}
          </select>
        </div>
        {selectedPlan && (
          <>
            <div className="p-[var(--spacing-lg)] grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
              <div className="border border-[var(--border-color)] rounded-[var(--radius-lg)] p-5 bg-gray-50">
                <label className="block text-sm font-bold text-[var(--text-main)] mb-1">单租户最大并发任务数</label>
                <p className="text-[11px] text-[var(--text-muted)] mb-3">超出部分将进入等待队列</p>
                <input
                  type="number"
                  min={0}
                  value={selectedPlan.maxConcurrentJobs}
                  disabled={!canManagePlans}
                  onChange={(event) => updatePlan(selectedPlan.id, { maxConcurrentJobs: Number(event.target.value) }, '并发任务配额已更新')}
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg outline-none focus:border-blue-500 text-sm font-medium bg-[var(--bg-panel)] disabled:opacity-60"
                />
              </div>
              <div className="border border-[var(--border-color)] rounded-[var(--radius-lg)] p-5 bg-gray-50">
                <label className="block text-sm font-bold text-[var(--text-main)] mb-1">图片/素材存储配额 (GB)</label>
                <p className="text-[11px] text-[var(--text-muted)] mb-3">该套餐租户可使用的工作空间容量</p>
                <input
                  type="number"
                  min={0}
                  value={selectedPlan.storageGb}
                  disabled={!canManagePlans}
                  onChange={(event) => updatePlan(selectedPlan.id, { storageGb: Number(event.target.value) }, '存储配额已更新')}
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg outline-none focus:border-blue-500 text-sm font-medium bg-[var(--bg-panel)] disabled:opacity-60"
                />
              </div>
              <div className="border border-[var(--border-color)] rounded-[var(--radius-lg)] p-5 bg-gray-50">
                <label className="block text-sm font-bold text-[var(--text-main)] mb-1">月度点数额度</label>
                <p className="text-[11px] text-[var(--text-muted)] mb-3">生成任务和工作区活跃度共享扣减</p>
                <input
                  type="number"
                  min={0}
                  value={selectedPlan.monthlyAllowance}
                  disabled={!canManagePlans}
                  onChange={(event) => updatePlan(selectedPlan.id, { monthlyAllowance: Number(event.target.value) }, '月度点数额度已更新')}
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg outline-none focus:border-blue-500 text-sm font-medium bg-[var(--bg-panel)] disabled:opacity-60"
                />
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-[var(--border-color)] flex justify-between items-center">
              <p className="text-xs font-bold text-[var(--text-muted)]">当前共 {totalSubscribers} 个活跃订阅，配置会按工作空间持久化。</p>
              <button
                onClick={() => updatePlan(
                  selectedPlan.id,
                  { metadata: { ...selectedPlan.metadata, savedAt: Date.now() } },
                  '配额规则已保存',
                )}
                disabled={!canManagePlans}
                className="bg-[var(--color-primary)] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-[var(--radius-lg)] font-bold shadow-sm transition-colors text-sm"
              >
                保存配额规则
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AdminSales() {
  const session = useSaasSession();
  const financeContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const [records, setRecords] = useState(() => loadWorkspaceFinancialRecords(financeContext));

  useEffect(() => {
    const refreshRecords = () => setRecords(loadWorkspaceFinancialRecords(financeContext));
    const handleRecordsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshRecords();
    };

    refreshRecords();
    window.addEventListener('financial_records_updated', handleRecordsUpdated);
    return () => window.removeEventListener('financial_records_updated', handleRecordsUpdated);
  }, [financeContext, session.workspace.id]);

  const summary = useMemo(() => summarizeWorkspaceFinancials(records), [records]);
  const revenueSeries = useMemo(() => buildDailyRevenueSeries(records, { days: 7 }), [records]);

  const formatCurrencyCents = (amountCents: number) => `¥${Math.round(amountCents / 100).toLocaleString()}`;
  const formatChange = (value: number) => `${value >= 0 ? '+' : ''}${value}% 较上月`;
  const handleExportReport = () => {
    logAuditEvent(
      {
        action: 'financial_report_export',
        moduleId: 'admin' as ModuleId,
        targetType: 'workspace',
        targetId: session.workspace.id,
        metadata: {
          recordCount: records.length,
          monthlyRevenueCents: summary.monthlyRevenueCents,
          pendingWithdrawalCents: summary.pendingWithdrawalCents,
        },
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
    toast('财务报表导出已记录到审计日志', 'success');
  };

  const stats = [
    {
      label: '本月总营收',
      value: formatCurrencyCents(summary.monthlyRevenueCents),
      sub: formatChange(summary.monthlyRevenueChangePercent),
      color: summary.monthlyRevenueChangePercent >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      label: '新增付费订阅',
      value: summary.paidSubscriptionCount.toLocaleString(),
      sub: '本月已支付订阅',
      color: 'text-[var(--color-primary)]',
    },
    {
      label: '退款/取消单数',
      value: summary.refundCount.toLocaleString(),
      sub: records.length === 0 ? '暂无财务流水' : `占流水 ${Math.round((summary.refundCount / records.length) * 100)}%`,
      color: 'text-orange-500',
    },
    {
      label: '提现待审批',
      value: formatCurrencyCents(summary.pendingWithdrawalCents),
      sub: '待处理伙伴结算',
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">财务与销售管理</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">查看系统营收、套餐销售情况以及发票</p>
         </div>
         <button
           onClick={handleExportReport}
           className="flex items-center space-x-2 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm"
         >
           <Download className="icon-sm" />
           <span>导出财报</span>
         </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)] mb-[var(--spacing-md)]">
         {stats.map((s) => (
           <div key={s.label} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">{s.label}</p>
              <div className="flex items-end mb-1">
                 <p className="text-2xl font-bold text-[var(--text-main)]">{s.value}</p>
              </div>
              <p className={`text-[11px] font-bold ${s.color}`}>{s.sub}</p>
           </div>
         ))}
       </div>

       <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] mb-[var(--spacing-md)]">
          <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-[var(--spacing-md)]">最近7天销售趋势</h3>
          <div className="h-72 w-full">
             <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
               <AreaChart data={revenueSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                 <defs>
                   <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} tickFormatter={(val) => `¥${val}`} />
                 <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                 <Area type="monotone" dataKey="revenue" name="营收" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
               </AreaChart>
             </ResponsiveContainer>
          </div>
       </div>
    </div>
  );
}

function AdminAnnouncements() {
  const session = useSaasSession();
  const announcementContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const [announcements, setAnnouncements] = useState<WorkspaceAnnouncement[]>(() =>
    loadWorkspaceAnnouncements(announcementContext),
  );
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementChannel, setNewAnnouncementChannel] = useState('主站弹窗');

  useEffect(() => {
    const refreshAnnouncements = () => setAnnouncements(loadWorkspaceAnnouncements(announcementContext));
    const handleAnnouncementsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshAnnouncements();
    };

    refreshAnnouncements();
    window.addEventListener('workspace_announcements_updated', handleAnnouncementsUpdated);
    return () => window.removeEventListener('workspace_announcements_updated', handleAnnouncementsUpdated);
  }, [announcementContext, session.workspace.id]);

  const statusLabels: Record<WorkspaceAnnouncement['status'], string> = {
    draft: '草稿',
    active: '展示中',
    scheduled: '已排期',
    archived: '已撤下',
  };

  const auditAnnouncement = (
    action: 'announcement_publish' | 'announcement_update',
    announcement: WorkspaceAnnouncement,
    metadata: Record<string, unknown>,
  ) => {
    logAuditEvent(
      {
        action,
        moduleId: 'admin' as ModuleId,
        targetType: 'announcement',
        targetId: announcement.id,
        metadata: {
          title: announcement.title,
          channel: announcement.channel,
          status: announcement.status,
          ...metadata,
        },
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
  };

  const handlePublishAnnouncement = () => {
    if (!newAnnouncementTitle.trim()) {
      toast('请输入公告标题', 'warning');
      return;
    }
    const announcement = createWorkspaceAnnouncement(
      {
        title: newAnnouncementTitle,
        channel: newAnnouncementChannel,
        status: 'active',
        metadata: { source: 'admin_announcements' },
      },
      announcementContext,
    );
    setAnnouncements(loadWorkspaceAnnouncements(announcementContext));
    auditAnnouncement('announcement_publish', announcement, { operation: 'publish' });
    setNewAnnouncementTitle('');
    toast('公告已发布', 'success');
  };

  const handleArchiveAnnouncement = (announcement: WorkspaceAnnouncement) => {
    const updatedAnnouncement = updateWorkspaceAnnouncement(
      announcement.id,
      { status: 'archived' },
      announcementContext,
    );
    if (!updatedAnnouncement) return;
    setAnnouncements(loadWorkspaceAnnouncements(announcementContext));
    auditAnnouncement('announcement_update', updatedAnnouncement, { operation: 'archive' });
    toast('公告已撤下', 'success');
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">公告与通知管理</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">发布全站公告、系统更新或营销活动推送</p>
          </div>
          <button
            onClick={handlePublishAnnouncement}
            className="flex items-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm"
          >
            <Plus className="icon-sm" />
            <span>发布新公告</span>
          </button>
        </div>

       <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] shadow-sm p-4 flex flex-col md:flex-row gap-3">
         <input
           value={newAnnouncementTitle}
           onChange={(event) => setNewAnnouncementTitle(event.target.value)}
           placeholder="公告标题"
           className="flex-1 px-4 py-2.5 border border-[var(--border-color)] rounded-[var(--radius-lg)] text-sm font-medium outline-none focus:border-blue-500"
         />
         <select
           value={newAnnouncementChannel}
           onChange={(event) => setNewAnnouncementChannel(event.target.value)}
           className="px-4 py-2.5 border border-[var(--border-color)] rounded-[var(--radius-lg)] text-sm font-bold bg-[var(--bg-panel)]"
         >
           <option>主站弹窗</option>
           <option>邮件 + 弹窗</option>
           <option>通知中心小红点</option>
         </select>
       </div>

       <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">
              <th className="py-4 px-6">公告内容</th>
              <th className="py-4 px-6">推送渠道</th>
              <th className="py-4 px-6">发布时间</th>
              <th className="py-4 px-6">状态</th>
              <th className="py-4 px-6 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {announcements.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 px-6 text-center text-sm font-bold text-[var(--text-muted)]">
                  暂无公告记录
                </td>
              </tr>
            ) : announcements.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/50">
                <td className="py-4 px-6">
                   <p className="font-bold text-[15px] text-[var(--text-main)]">{p.title}</p>
                </td>
                <td className="py-4 px-6 text-[14px] text-[var(--text-muted)] font-medium">{p.channel}</td>
                <td className="py-4 px-6 text-[14px] text-[var(--text-muted)] font-medium">
                  {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : '-'}
                </td>
                <td className="py-4 px-6">
                   <span className={`px-2.5 py-1 text-[13px] font-bold rounded-lg ${
                      p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>{statusLabels[p.status]}</span>
                </td>
                <td className="py-4 px-6 text-right space-x-3">
                  <button className="text-[var(--color-primary)] font-bold hover:text-blue-800 text-[14px]">编辑</button>
                  <button
                    onClick={() => handleArchiveAnnouncement(p)}
                    disabled={p.status === 'archived'}
                    className="text-red-500 font-bold hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed text-[14px]"
                  >
                    撤下
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
       </div>
    </div>
  );
}

function AdminPlugins() {
  const session = useSaasSession();
  const pluginContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const canManagePluginConfig = hasWorkspacePermission(session.membership.role, 'settings.manage');
  const [plugins, setPlugins] = useState<WorkspacePlugin[]>(() =>
    ensureDefaultWorkspacePlugins(pluginContext),
  );

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
  const pluginIconByName = {
    folder: Folder,
    share: Share2,
    briefcase: Briefcase,
    box: Box,
  } as const;
  const enabledCount = plugins.filter((plugin) => plugin.enabled).length;

  const auditPluginChange = (
    plugin: WorkspacePlugin,
    metadata: Record<string, unknown>,
  ) => {
    logAuditEvent(
      {
        action: 'plugin_config_update',
        moduleId: 'admin' as ModuleId,
        targetType: 'plugin_config',
        targetId: plugin.id,
        metadata: {
          pluginName: plugin.name,
          provider: plugin.provider,
          providerKind: plugin.providerKind,
          enabled: plugin.enabled,
          status: plugin.status,
          ...metadata,
        },
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
  };

  const handleTogglePlugin = (plugin: WorkspacePlugin) => {
    if (!canManagePluginConfig) {
      toast('当前角色无权修改插件配置', 'warning');
      return;
    }
    const nextEnabled = !plugin.enabled;
    const updatedPlugin = updateWorkspacePlugin(
      plugin.id,
      {
        enabled: nextEnabled,
        status: nextEnabled ? 'active' : 'disabled',
      },
      pluginContext,
    );
    if (!updatedPlugin) return;
    setPlugins(loadWorkspacePlugins(pluginContext));
    auditPluginChange(updatedPlugin, {
      operation: nextEnabled ? 'enable' : 'disable',
      previousEnabled: plugin.enabled,
    });
    toast(nextEnabled ? '插件已启用' : '插件已停用', 'success');
  };

  const handleConfigurePlugin = (plugin: WorkspacePlugin) => {
    if (!canManagePluginConfig) {
      toast('当前角色无权修改插件配置', 'warning');
      return;
    }
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
    auditPluginChange(updatedPlugin, { operation: 'configure' });
    toast('插件配置检查已记录', 'success');
  };

  const handleSyncPluginCatalog = () => {
    const latestPlugins = ensureDefaultWorkspacePlugins(pluginContext);
    setPlugins(latestPlugins);
    toast('插件市场配置已同步', 'success');
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">插件与扩展能力中心</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">
             已启用 {enabledCount}/{plugins.length} 个扩展，配置随当前工作区持久保存
           </p>
         </div>
         <button
           onClick={handleSyncPluginCatalog}
           className="flex items-center space-x-2 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm"
         >
           <RefreshCw className="icon-sm" />
           <span>同步插件市场</span>
         </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--spacing-md)]">
          {plugins.map((plugin) => {
            const iconKey = typeof plugin.metadata.icon === 'string' ? plugin.metadata.icon : 'box';
            const PluginIcon = pluginIconByName[iconKey as keyof typeof pluginIconByName] ?? Box;

            return (
            <div key={plugin.id} className="bg-[var(--bg-panel)] border text-left border-[var(--border-color)] rounded-[24px] p-[var(--spacing-lg)] shadow-sm flex flex-col hover:border-blue-300 transition-all">
               <div className="flex justify-between items-start mb-4">
                 <div className="bg-gray-50 p-3 rounded-[var(--radius-xl)]">
                    <PluginIcon className="icon-lg text-gray-700" />
                 </div>
                 <button
                   onClick={() => handleTogglePlugin(plugin)}
                   disabled={!canManagePluginConfig}
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
               <h3 className="font-bold text-[var(--text-main)] text-[16px] mb-2">{plugin.name}</h3>
               <p className="text-xs text-[var(--text-muted)] mb-[var(--spacing-md)] flex-1">
                 {providerDescriptions[plugin.providerKind]} · {plugin.category}
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
                 <button
                   onClick={() => handleConfigurePlugin(plugin)}
                   disabled={!canManagePluginConfig}
                   className="text-sm font-bold text-[var(--color-primary)] hover:text-blue-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                 >
                   配置参数
                 </button>
               </div>
            </div>
            );
          })}
       </div>
    </div>
  );
}

function AdminLogs() {
  const session = useSaasSession();
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [logs, setLogs] = useState<AuditLog[]>(() => listAuditLogs({ workspaceId: session.workspace.id }));

  useEffect(() => {
    const refreshLogs = () => setLogs(listAuditLogs({ workspaceId: session.workspace.id }));
    refreshLogs();
    window.addEventListener('activity_logged', refreshLogs);
    window.addEventListener('storage', refreshLogs);
    return () => {
      window.removeEventListener('activity_logged', refreshLogs);
      window.removeEventListener('storage', refreshLogs);
    };
  }, [session.workspace.id]);

  const getRiskLevel = (log: AuditLog): 'High' | 'Medium' | 'Low' => {
    if (log.action === 'generation_job_failed' || log.action === 'member_delete') return 'High';
    if (
      log.action === 'asset_delete' ||
      log.action === 'asset_export' ||
      log.action === 'export_workspace' ||
      log.action === 'settings_change'
    ) return 'Medium';
    return 'Low';
  };

  const getLogDescription = (log: AuditLog): string => {
    if (typeof log.metadata.description === 'string') return log.metadata.description;
    if (typeof log.metadata.operation === 'string') return `${log.action}: ${log.metadata.operation}`;
    return log.action;
  };

  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = !query || [
      log.id,
      log.actor.name,
      log.actor.email ?? '',
      log.action,
      log.targetId ?? '',
      getLogDescription(log),
    ].join(' ').toLowerCase().includes(query);
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesQuery && matchesAction;
  });
  const actionOptions = Array.from(new Set(logs.map((log) => log.action))).sort();

  const handleGenerateAudit = () => {
    setIsGenerating(true);
    const reportLogs = listAuditLogs({ workspaceId: session.workspace.id });
    const auditRows = exportAuditLogRows(reportLogs);
    const content = [
      'Admin Audit Log - Security Compliance Report',
      `Workspace: ${session.workspace.id}`,
      `Generated on: ${new Date().toISOString()}`,
      '',
      'Log Entries:',
      ...auditRows.map((row) => [
        formatAdminDateTime(row.timestamp),
        row.actorName,
        row.actorRole,
        row.action,
        row.targetType,
        row.targetId,
        row.metadataJson,
      ].join(' | ')),
    ].join('\n');
    const auditExportAsset = createWorkspaceAsset(
      {
        name: `Admin Audit Report ${new Date().toISOString().slice(0, 10)}`,
        type: 'document',
        size: `${Math.max(1, Math.ceil(content.length / 1024))} KB`,
        source: 'generated',
        moduleId: 'admin' as ModuleId,
        tags: ['audit_report', 'admin_export', 'compliance'],
        metadata: {
          kind: 'audit_report',
          format: 'audit_report_txt',
          exportedLogCount: reportLogs.length,
          rowCount: auditRows.length,
          generatedBy: session.user.id,
          generatedAt: Date.now(),
        },
      },
      { workspaceId: session.workspace.id, userId: session.user.id },
    );
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Admin_Audit_Report_${new Date().getTime()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    logAuditEvent({
      action: 'export_workspace',
      moduleId: 'admin' as ModuleId,
      targetType: 'asset',
      targetId: auditExportAsset.id,
      metadata: {
        auditExportAsset: auditExportAsset.id,
        format: 'audit_report_txt',
        exportedLogCount: reportLogs.length,
        rowCount: auditRows.length,
        assetName: auditExportAsset.name,
      },
    }, { session });
    window.dispatchEvent(new Event('activity_logged'));
    setIsGenerating(false);
    toast('审计报告已生成并下载', 'success');
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">系统安全与审计日志</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">全局系统操作、账号登录及风控记录</p>
         </div>
         <button
           onClick={handleGenerateAudit}
           disabled={isGenerating}
           className="flex items-center space-x-2 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm disabled:opacity-50"
         >
           {isGenerating ? <div className="w-4 h-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin"></div> : <Download className="icon-sm" />}
           <span>{isGenerating ? '生成中...' : 'Generate Admin Audit'}</span>
         </button>
       </div>

       <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
           <div className="relative">
             <Search className="icon-sm absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
             <input
               type="text"
               value={searchQuery}
               onChange={(event) => setSearchQuery(event.target.value)}
               placeholder="搜索操作人员、事件 ID 或目标..."
               className="pl-9 pr-4 py-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] w-80 bg-gray-50 focus:bg-[var(--bg-panel)] focus:ring-2 focus:ring-blue-500 outline-none text-[15px]"
             />
           </div>
           <div className="flex space-x-3">
             <select
               value={actionFilter}
               onChange={(event) => setActionFilter(event.target.value)}
               className="border border-[var(--border-color)] rounded-[var(--radius-lg)] px-4 py-2 text-[14px] bg-[var(--bg-panel)] font-medium outline-none"
             >
                <option value="all">全部日志类型</option>
                {actionOptions.map((action) => (
                  <option key={action} value={action}>{action}</option>
                ))}
             </select>
           </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">
              <th className="py-4 px-6">时间戳</th>
              <th className="py-4 px-6">操作人员</th>
              <th className="py-4 px-6">事件内容</th>
              <th className="py-4 px-6">目标 / 来源</th>
              <th className="py-4 px-6 text-right">风险级别</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm font-bold text-[var(--text-muted)]">暂无匹配审计日志</td>
              </tr>
            ) : filteredLogs.map((log) => {
              const risk = getRiskLevel(log);
              return (
              <tr key={log.id} className="hover:bg-gray-50/50">
                <td className="py-4 px-6 text-[13px] text-[var(--text-muted)] font-mono">{formatAdminDateTime(log.timestamp)}</td>
                <td className="py-4 px-6">
                   <p className="font-bold text-[14px] text-[var(--text-main)]">{log.actor.name}</p>
                   <p className="text-xs text-[var(--text-muted)]">{log.actor.role}</p>
                </td>
                <td className="py-4 px-6 text-[14px] text-gray-700 font-medium">{getLogDescription(log)}</td>
                <td className="py-4 px-6 text-[13px] text-[var(--text-muted)]">{log.targetType} / {log.targetId ?? log.moduleId ?? log.id}</td>
                <td className="py-4 px-6 text-right">
                   <span className={`px-2.5 py-1 text-[11px] font-bold rounded border ${
                     risk === 'High' ? 'bg-red-50 text-red-600 border-red-100' :
                     risk === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-gray-50 text-[var(--text-muted)] border-[var(--border-color)]'
                   }`}>{risk.toUpperCase()}</span>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
       </div>
    </div>
  );
}

function AdminTickets() {
  const session = useSaasSession();
  const ticketContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const canManageTickets = hasWorkspacePermission(session.membership.role, 'settings.manage');
  const [tickets, setTickets] = useState<WorkspaceTicket[]>(() =>
    ensureDefaultWorkspaceTickets(ticketContext),
  );

  useEffect(() => {
    ensureDefaultWorkspaceTickets(ticketContext);
    const refreshTickets = () => setTickets(loadWorkspaceTickets(ticketContext));
    const handleTicketsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshTickets();
    };

    refreshTickets();
    window.addEventListener('workspace_tickets_updated', handleTicketsUpdated);
    return () => window.removeEventListener('workspace_tickets_updated', handleTicketsUpdated);
  }, [ticketContext, session.workspace.id]);

  const summary = useMemo(() => summarizeWorkspaceTickets(tickets), [tickets]);
  const formatResponseTime = (minutes: number) => {
    if (minutes <= 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    return `${(minutes / 60).toFixed(1)}h`;
  };
  const formatRelativeTime = (timestamp: number) => {
    const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
    if (diffMinutes < 60) return `${diffMinutes || 1} 分钟前`;
    if (diffMinutes < 1_440) return `${Math.round(diffMinutes / 60)} 小时前`;
    return `${Math.round(diffMinutes / 1_440)} 天前`;
  };
  const statusLabels: Record<WorkspaceTicketStatus, string> = {
    open: '待处理',
    in_progress: '处理中',
    resolved: '已解决',
    closed: '已关闭',
  };
  const statusClassNames: Record<WorkspaceTicketStatus, string> = {
    open: 'bg-red-50 text-red-600 border-red-100',
    in_progress: 'bg-orange-50 text-orange-600 border-orange-100',
    resolved: 'bg-green-50 text-green-600 border-green-100',
    closed: 'bg-gray-50 text-gray-500 border-gray-100',
  };
  const priorityLabels: Record<WorkspaceTicketPriority, string> = {
    urgent: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };

  const auditTicket = (
    action: 'ticket_update' | 'ticket_export',
    ticket: WorkspaceTicket | null,
    metadata: Record<string, unknown>,
  ) => {
    logAuditEvent(
      {
        action,
        moduleId: 'admin' as ModuleId,
        targetType: ticket ? 'ticket' : 'workspace',
        targetId: ticket?.id ?? session.workspace.id,
        metadata: {
          ticketSubject: ticket?.subject,
          requesterEmail: ticket?.requesterEmail,
          status: ticket?.status,
          ...metadata,
        },
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
  };

  const handleExportTickets = () => {
    auditTicket('ticket_export', null, {
      ticketCount: tickets.length,
      openCount: summary.openCount,
      inProgressCount: summary.inProgressCount,
      resolvedTodayCount: summary.resolvedTodayCount,
    });
    toast('工单报表导出已记录到审计日志', 'success');
  };

  const handleAddAutoReplyRule = () => {
    auditTicket('ticket_update', null, {
      operation: 'auto_reply_rule_create',
      categoryCount: new Set(tickets.map((ticket) => ticket.category)).size,
    });
    toast('自动回复规则变更已记录', 'success');
  };

  const handleReplyTicket = (ticket: WorkspaceTicket) => {
    if (!canManageTickets) {
      toast('当前角色无权处理工单', 'warning');
      return;
    }
    const nextStatus: WorkspaceTicketStatus = ticket.status === 'open'
      ? 'in_progress'
      : ticket.status === 'in_progress'
        ? 'resolved'
        : ticket.status;
    const updatedTicket = updateWorkspaceTicket(
      ticket.id,
      {
        status: nextStatus,
        firstResponseMinutes: ticket.firstResponseMinutes ?? Math.max(1, Math.round((Date.now() - ticket.createdAt) / 60_000)),
        resolvedAt: nextStatus === 'resolved' ? Date.now() : ticket.resolvedAt,
      },
      ticketContext,
    );
    if (!updatedTicket) return;
    setTickets(loadWorkspaceTickets(ticketContext));
    auditTicket('ticket_update', updatedTicket, {
      operation: nextStatus === 'resolved' ? 'resolve' : 'reply',
      previousStatus: ticket.status,
    });
    toast(nextStatus === 'resolved' ? '工单已标记为已解决' : '工单已进入处理中', 'success');
  };

  const stats = [
    { label: '待处理工单', value: summary.openCount.toLocaleString(), color: 'text-red-500' },
    { label: '处理中', value: summary.inProgressCount.toLocaleString(), color: 'text-orange-500' },
    { label: '已解决 (今日)', value: summary.resolvedTodayCount.toLocaleString(), color: 'text-green-500' },
    { label: '平均响应时间', value: formatResponseTime(summary.averageFirstResponseMinutes), color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">客服工单与用户反馈</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">处理用户的求助、投诉建议及退款请求，队列数据按工作区持久保存</p>
         </div>
         <div className="flex space-x-2">
           <button
             onClick={handleExportTickets}
             className="bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm"
           >
             导出工单报表
           </button>
           <button
             onClick={handleAddAutoReplyRule}
             disabled={!canManageTickets}
             className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
           >
             添加自动回复规则
           </button>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)] mb-[var(--spacing-md)]">
         {stats.map((s) => (
           <div key={s.label} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm text-center">
              <p className="text-xs text-[var(--text-muted)] font-bold mb-2">{s.label}</p>
              <p className={`text-[var(--text-main)]xl font-extrabold ${s.color}`}>{s.value}</p>
           </div>
         ))}
       </div>

       <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">
              <th className="py-4 px-6">工单编号</th>
              <th className="py-4 px-6">用户</th>
              <th className="py-4 px-6">分类 / 问题摘要</th>
              <th className="py-4 px-6">状态</th>
              <th className="py-4 px-6">时间</th>
              <th className="py-4 px-6 text-right">管理</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-gray-50/50">
                <td className="py-4 px-6 text-[13px] text-[var(--text-muted)] font-mono">{ticket.id}</td>
                <td className="py-4 px-6">
                  <p className="text-[14px] font-bold text-[var(--text-main)]">{ticket.requesterName}</p>
                  <p className="text-xs text-[var(--text-muted)]">{ticket.requesterEmail}</p>
                </td>
                <td className="py-4 px-6">
                   <div className="flex flex-col">
                     <span className="text-[12px] font-bold text-[var(--color-primary)] mb-1">{ticket.category} / {priorityLabels[ticket.priority]}</span>
                     <span className="text-[14px] text-[var(--text-main)] font-medium">{ticket.subject}</span>
                   </div>
                </td>
                <td className="py-4 px-6">
                   <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${statusClassNames[ticket.status]}`}>
                     {statusLabels[ticket.status]}
                   </span>
                </td>
                <td className="py-4 px-6 text-[13px] text-[var(--text-muted)]">{formatRelativeTime(ticket.updatedAt)}</td>
                <td className="py-4 px-6 text-right">
                  <button
                    onClick={() => handleReplyTicket(ticket)}
                    disabled={!canManageTickets || ticket.status === 'resolved' || ticket.status === 'closed'}
                    className="text-[var(--color-primary)] font-bold hover:text-blue-800 disabled:text-gray-300 disabled:cursor-not-allowed text-[14px]"
                  >
                    {ticket.status === 'in_progress' ? '标记解决' : '回复工单'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
       </div>
    </div>
  );
}

function AdminAgency() {
  const session = useSaasSession();
  const agencyContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const canManageAgency = hasWorkspacePermission(session.membership.role, 'settings.manage');
  const [partners, setPartners] = useState<WorkspaceAgencyPartner[]>(() =>
    ensureDefaultWorkspaceAgencyPartners(agencyContext),
  );

  useEffect(() => {
    ensureDefaultWorkspaceAgencyPartners(agencyContext);
    const refreshPartners = () => setPartners(loadWorkspaceAgencyPartners(agencyContext));
    const handlePartnersUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshPartners();
    };

    refreshPartners();
    window.addEventListener('workspace_agency_partners_updated', handlePartnersUpdated);
    return () => window.removeEventListener('workspace_agency_partners_updated', handlePartnersUpdated);
  }, [agencyContext, session.workspace.id]);

  const summary = useMemo(() => summarizeWorkspaceAgencyPartners(partners), [partners]);
  const formatCurrencyCents = (amountCents: number) => `¥ ${Math.round(amountCents / 100).toLocaleString()}`;
  const formatRate = (rate: number) => `${Math.round(rate * 100)}%`;
  const payoutLabels: Record<WorkspaceAgencyPayoutStatus, string> = {
    none: '无待办',
    pending: '待提现审批',
    paid: '已打款',
    blocked: '已冻结',
  };

  const auditAgency = (
    action: 'agency_partner_update' | 'agency_payout_export',
    partner: WorkspaceAgencyPartner | null,
    metadata: Record<string, unknown>,
  ) => {
    logAuditEvent(
      {
        action,
        moduleId: 'admin' as ModuleId,
        targetType: partner ? 'agency_partner' : 'workspace',
        targetId: partner?.id ?? session.workspace.id,
        metadata: {
          partnerName: partner?.name,
          payoutStatus: partner?.payoutStatus,
          ...metadata,
        },
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
  };

  const handleCreatePartner = () => {
    if (!canManageAgency) {
      toast('当前角色无权新增代理商', 'warning');
      return;
    }
    const partner = createWorkspaceAgencyPartner(
      {
        name: `新渠道伙伴 ${partners.length + 1}`,
        level: 'V1 个人',
        invitedUsers: 0,
        commissionRate: 0.15,
        totalCommissionCents: 0,
        payoutStatus: 'none',
        metadata: { source: 'admin_agency' },
      },
      agencyContext,
    );
    setPartners(loadWorkspaceAgencyPartners(agencyContext));
    auditAgency('agency_partner_update', partner, { operation: 'create' });
    toast('代理商已创建', 'success');
  };

  const handleExportPayouts = () => {
    auditAgency('agency_payout_export', null, {
      partnerCount: partners.length,
      totalInvitedUsers: summary.totalInvitedUsers,
      totalCommissionCents: summary.totalCommissionCents,
      pendingPayoutCents: summary.pendingPayoutCents,
    });
    toast('代理商结算报表导出已记录', 'success');
  };

  const handleViewPartner = (partner: WorkspaceAgencyPartner) => {
    auditAgency('agency_partner_update', partner, { operation: 'view_detail' });
    toast(`${partner.name} 详情已记录`, 'success');
  };

  const handlePayPartner = (partner: WorkspaceAgencyPartner) => {
    if (!canManageAgency) {
      toast('当前角色无权处理打款', 'warning');
      return;
    }
    const updatedPartner = updateWorkspaceAgencyPartner(
      partner.id,
      {
        payoutStatus: 'paid',
        metadata: {
          ...partner.metadata,
          paidAt: Date.now(),
        },
      },
      agencyContext,
    );
    if (!updatedPartner) return;
    setPartners(loadWorkspaceAgencyPartners(agencyContext));
    auditAgency('agency_partner_update', updatedPartner, {
      operation: 'approve_payout',
      previousPayoutStatus: partner.payoutStatus,
    });
    toast('代理商打款状态已更新', 'success');
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">分销、返水与代理商管理</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">
             管理渠道分销网络、代理商提现请求和佣金结算，累计邀请 {summary.totalInvitedUsers.toLocaleString()} 人
           </p>
         </div>
         <div className="flex items-center gap-2">
           <button
             onClick={handleExportPayouts}
             className="bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm"
           >
             导出结算报表
           </button>
           <button
             onClick={handleCreatePartner}
             disabled={!canManageAgency}
             className="flex items-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
           >
             <Plus className="icon-sm" />
             <span>新增代理商</span>
           </button>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)]">
         {[
           { label: '渠道伙伴', value: partners.length.toLocaleString(), color: 'text-[var(--color-primary)]' },
           { label: '累计邀请注册', value: summary.totalInvitedUsers.toLocaleString(), color: 'text-green-600' },
           { label: '累计佣金', value: formatCurrencyCents(summary.totalCommissionCents), color: 'text-purple-600' },
           { label: '待打款', value: formatCurrencyCents(summary.pendingPayoutCents), color: 'text-orange-500' },
         ].map((stat) => (
           <div key={stat.label} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm text-center">
             <p className="text-xs text-[var(--text-muted)] font-bold mb-2">{stat.label}</p>
             <p className={`text-[var(--text-main)] text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
           </div>
         ))}
       </div>

       <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">
              <th className="py-4 px-6">代理商名称/层级</th>
              <th className="py-4 px-6">邀请注册数</th>
              <th className="py-4 px-6">分佣比例</th>
              <th className="py-4 px-6">累计佣金 (¥)</th>
              <th className="py-4 px-6">提现状态</th>
              <th className="py-4 px-6 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {partners.map((partner) => (
              <tr key={partner.id} className="hover:bg-gray-50/50">
                <td className="py-4 px-6">
                   <p className="font-bold text-[15px] text-[var(--text-main)]">{partner.name}</p>
                   <p className="text-[12px] font-bold text-[var(--color-primary)] mt-1">{partner.level}</p>
                </td>
                <td className="py-4 px-6 text-[14px] text-gray-700 font-medium">{partner.invitedUsers.toLocaleString()}</td>
                <td className="py-4 px-6">
                   <span className="bg-gray-100 text-[var(--text-main)] text-[12px] font-bold px-2 py-1 rounded">{formatRate(partner.commissionRate)}</span>
                </td>
                <td className="py-4 px-6 text-[15px] font-bold text-[var(--text-main)]">{formatCurrencyCents(partner.totalCommissionCents)}</td>
                <td className="py-4 px-6">
                   {partner.payoutStatus === 'pending' ? (
                     <span className="flex items-center text-[13px] font-bold text-orange-600">
                        <span className="w-2 h-2 rounded-full bg-orange-500 mr-2 animate-pulse"></span>
                        {payoutLabels[partner.payoutStatus]}
                     </span>
                   ) : (
                     <span className="text-[13px] text-[var(--text-muted)]">{payoutLabels[partner.payoutStatus]}</span>
                   )}
                </td>
                <td className="py-4 px-6 text-right space-x-3">
                  <button
                    onClick={() => handleViewPartner(partner)}
                    className="text-[var(--color-primary)] font-bold hover:text-blue-800 text-[14px]"
                  >
                    详情
                  </button>
                  {partner.payoutStatus === 'pending' && (
                     <button
                       onClick={() => handlePayPartner(partner)}
                       disabled={!canManageAgency}
                       className="text-green-600 font-bold hover:text-green-800 disabled:text-gray-300 disabled:cursor-not-allowed text-[14px]"
                     >
                       打款
                     </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
       </div>
    </div>
  );
}

function AdminRisk() {
  const session = useSaasSession();
  const riskContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const canManageRisk = hasWorkspacePermission(session.membership.role, 'settings.manage');
  const [riskEvents, setRiskEvents] = useState<WorkspaceRiskEvent[]>(() =>
    ensureDefaultWorkspaceRiskEvents(riskContext),
  );

  useEffect(() => {
    ensureDefaultWorkspaceRiskEvents(riskContext);
    const refreshEvents = () => setRiskEvents(loadWorkspaceRiskEvents(riskContext));
    const handleRiskEventsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshEvents();
    };

    refreshEvents();
    window.addEventListener('workspace_risk_events_updated', handleRiskEventsUpdated);
    return () => window.removeEventListener('workspace_risk_events_updated', handleRiskEventsUpdated);
  }, [riskContext, session.workspace.id]);

  const summary = useMemo(() => summarizeWorkspaceRiskEvents(riskEvents), [riskEvents]);
  const decisionLabels: Record<WorkspaceRiskDecision, string> = {
    blocked: '系统自动拦截',
    pending_review: '待人工确认',
    allowed: '人工放行',
    rate_limited: '已限流',
    account_frozen: '已冻结账号',
  };
  const decisionClassNames: Record<WorkspaceRiskDecision, string> = {
    blocked: 'bg-green-50 text-green-600 border-green-100',
    pending_review: 'bg-orange-50 text-orange-600 border-orange-100',
    allowed: 'bg-blue-50 text-blue-600 border-blue-100',
    rate_limited: 'bg-red-50 text-red-600 border-red-100',
    account_frozen: 'bg-red-50 text-red-600 border-red-100',
  };
  const severityLabels: Record<WorkspaceRiskSeverity, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  };

  const auditRisk = (
    action: 'risk_event_review' | 'risk_policy_export',
    event: WorkspaceRiskEvent | null,
    metadata: Record<string, unknown>,
  ) => {
    logAuditEvent(
      {
        action,
        moduleId: 'admin' as ModuleId,
        targetType: event ? 'risk_event' : 'workspace',
        targetId: event?.id ?? session.workspace.id,
        metadata: {
          actionName: event?.action,
          rule: event?.rule,
          decision: event?.decision,
          severity: event?.severity,
          ...metadata,
        },
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
  };

  const handleExportPolicy = (operation: string) => {
    auditRisk('risk_policy_export', null, {
      operation,
      eventCount: riskEvents.length,
      blockedTodayCount: summary.blockedTodayCount,
      pendingReviewCount: summary.pendingReviewCount,
      modelVersion: summary.modelVersion,
    });
    toast('风控策略查询已记录到审计日志', 'success');
  };

  const handleReviewRiskEvent = (event: WorkspaceRiskEvent, decision: WorkspaceRiskDecision) => {
    if (!canManageRisk) {
      toast('当前角色无权处理风控事件', 'warning');
      return;
    }
    const updatedEvent = updateWorkspaceRiskEvent(
      event.id,
      {
        decision,
        reviewedAt: Date.now(),
      },
      riskContext,
    );
    if (!updatedEvent) return;
    setRiskEvents(loadWorkspaceRiskEvents(riskContext));
    auditRisk('risk_event_review', updatedEvent, {
      operation: decision === 'allowed' ? 'allow' : 'enforce',
      previousDecision: event.decision,
    });
    toast(decision === 'allowed' ? '风控事件已放行' : '风控事件已封禁处理', 'success');
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">系统内容风控与审计审核</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">处理违规敏感词汇拦截记录，审核用户被举报生成内容</p>
         </div>
         <div className="flex space-x-2">
           <button
             onClick={() => handleExportPolicy('sensitive_word_library')}
             className="bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm"
           >
             敏感词库管理
           </button>
           <button
             onClick={() => handleExportPolicy('account_freeze_lookup')}
             className="bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm"
           >
             封停记录查询
           </button>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)] mb-[var(--spacing-md)]">
         {[
           { label: '今日拦截违规', value: `${summary.blockedTodayCount.toLocaleString()} 次`, color: 'text-red-500' },
           { label: '人工审核积压', value: `${summary.pendingReviewCount.toLocaleString()} 单`, color: 'text-orange-500' },
           { label: '风险模型版本', value: `${summary.modelVersion} (实时)`, color: 'text-green-500' },
         ].map((s) => (
           <div key={s.label} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm text-center">
              <p className="text-xs text-[var(--text-muted)] font-bold mb-2">{s.label}</p>
              <p className={`text-[var(--text-main)] text-2xl font-extrabold ${s.color}`}>{s.value}</p>
           </div>
         ))}
       </div>

       <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">
              <th className="py-4 px-6">事件追踪 ID</th>
              <th className="py-4 px-6">触发动作</th>
              <th className="py-4 px-6">涉及内容/命中规则</th>
              <th className="py-4 px-6">处理决策</th>
              <th className="py-4 px-6 text-right">人工介入</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {riskEvents.map((event) => (
              <tr key={event.id} className="hover:bg-gray-50/50">
                <td className="py-4 px-6 text-[13px] text-[var(--text-muted)] font-mono">{event.id}</td>
                <td className="py-4 px-6">
                   <p className="font-bold text-[14px] text-[var(--text-main)]">{event.action}</p>
                   <p className="text-[11px] font-bold text-[var(--text-muted)] mt-1">{severityLabels[event.severity]}</p>
                </td>
                <td className="py-4 px-6 text-[13px] text-gray-700 max-w-sm">
                  <p className="truncate">{event.contentSummary}</p>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono mt-1">{event.rule}</p>
                </td>
                <td className="py-4 px-6">
                   <span className={`px-2.5 py-1 text-[11px] font-bold rounded border ${decisionClassNames[event.decision]}`}>
                     {decisionLabels[event.decision]}
                   </span>
                </td>
                <td className="py-4 px-6 text-right space-x-3">
                  {event.decision === 'pending_review' ? (
                     <>
                        <button
                          onClick={() => handleReviewRiskEvent(event, 'allowed')}
                          disabled={!canManageRisk}
                          className="text-green-600 font-bold hover:text-green-800 disabled:text-gray-300 disabled:cursor-not-allowed text-[14px]"
                        >
                          放行
                        </button>
                        <button
                          onClick={() => handleReviewRiskEvent(event, 'account_frozen')}
                          disabled={!canManageRisk}
                          className="text-red-500 font-bold hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed text-[14px]"
                        >
                          封禁
                        </button>
                     </>
                  ) : (
                     <button
                       onClick={() => auditRisk('risk_event_review', event, { operation: 'view_detail' })}
                       className="text-[var(--color-primary)] font-bold hover:text-blue-800 text-[14px]"
                     >
                       查看详情
                     </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
       </div>
    </div>
  );
}
