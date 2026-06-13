import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Command,
  Database,
  Folder,
  ImageIcon,
  ListTodo,
  Network,
  Search,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';

import { ActivityHeatmap } from './ActivityHeatmap';
import { DailyFocusGoal } from './DailyFocusGoal';
import { DailyInsightsWidget } from './DailyInsightsWidget';
import { FocusTimer } from './FocusTimer';
import { FrequentWorkflowsWidget } from './FrequentWorkflowsWidget';
import { ModuleFlowMap } from './ModuleFlowMap';
import { RecentFilesWidget } from './RecentFilesWidget';
import { RecommendedModulesWidget } from './RecommendedModulesWidget';
import { SessionArchiver } from './SessionArchiver';
import { SystemResources } from './SystemResources';
import { TimeSpentChart } from './TimeSpentChart';
import { toast } from './Toast';
import { WorkflowEfficiencyWidget } from './WorkflowEfficiencyWidget';
import { listAuditLogs, logAuditEvent } from '../lib/data/auditLogRepository';
import {
  calculateTaskCompletion,
  createWorkspaceTask,
  loadWorkspaceTasks,
  type WorkspaceTask,
} from '../lib/data/taskRepository';
import { useWorkspaceAssets } from '../hooks/useWorkspaceAssets';
import { useWorkspaceUsage } from '../hooks/useWorkspaceUsage';
import { useAgentRuntimeStatus } from '../runtime/useAgentRuntimeStatus';
import { useSaasSession } from '../saas/SaasAuthContext';
import type { AuditLog } from '../saas/types';
import type { RuntimeStatus } from '../runtime/agentRuntimeTypes';
import type { ModuleId } from '../types';

interface DashboardViewProps {
  onNavigate?: (moduleId: ModuleId) => void;
}

const dayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const quickCommands = [
  { label: '打开全局任务调度', moduleId: 'tasks' as ModuleId },
  { label: '查看数字资产保险库', moduleId: 'assets' as ModuleId },
  { label: '检查算力与 Token 监控', moduleId: 'billing' as ModuleId },
  { label: '创建今日运营复盘任务', taskTitle: '今日运营复盘与优先级整理' },
];

function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}万`;
  return String(value);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatRelativeTime(timestamp: number): string {
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) return '刚刚';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} 分钟前`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} 小时前`;
  return `${Math.floor(diffSeconds / 86400)} 天前`;
}

function getRuntimeHealthLabel(status: RuntimeStatus | null, isLoading: boolean, error: string | null): string {
  if (isLoading) return '检测中';
  if (error) return '状态异常';
  if (!status) return '未连接';
  const labels: Record<RuntimeStatus['health'], string> = {
    available: '健康',
    degraded: '降级',
    offline: '离线',
    auth_expired: '授权过期',
    incompatible: '不兼容',
  };
  return labels[status.health];
}

function buildWeeklyActivityData(
  logs: AuditLog[],
  tasks: WorkspaceTask[],
  assets: ReturnType<typeof useWorkspaceAssets>,
) {
  const today = new Date();
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - offset));
    date.setHours(0, 0, 0, 0);
    const start = date.getTime();
    const end = start + 86_400_000;

    return {
      name: dayLabels[date.getDay()],
      uses: logs.filter((log) => log.timestamp >= start && log.timestamp < end).length,
      active: tasks.filter((task) => task.updatedAt >= start && task.updatedAt < end).length
        + assets.filter((asset) => asset.updatedAt >= start && asset.updatedAt < end).length,
    };
  });
}

export function DashboardView({ onNavigate }: DashboardViewProps = {}) {
  const session = useSaasSession();
  const assets = useWorkspaceAssets();
  const usage = useWorkspaceUsage();
  const runtime = useAgentRuntimeStatus();
  const taskContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [isInsightOpen, setIsInsightOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<any>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [tasks, setTasks] = useState<WorkspaceTask[]>(() => loadWorkspaceTasks(taskContext));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => listAuditLogs({ workspaceId: session.workspace.id }));

  const refreshWorkspaceData = useCallback(() => {
    setTasks(loadWorkspaceTasks(taskContext));
    setAuditLogs(listAuditLogs({ workspaceId: session.workspace.id }));
  }, [session.workspace.id, taskContext]);

  useEffect(() => {
    refreshWorkspaceData();
    const handleWorkspaceEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshWorkspaceData();
    };

    window.addEventListener('tasks_updated', handleWorkspaceEvent);
    window.addEventListener('assets_updated', handleWorkspaceEvent);
    window.addEventListener('usage_updated', handleWorkspaceEvent);
    window.addEventListener('activity_logged', handleWorkspaceEvent);
    return () => {
      window.removeEventListener('tasks_updated', handleWorkspaceEvent);
      window.removeEventListener('assets_updated', handleWorkspaceEvent);
      window.removeEventListener('usage_updated', handleWorkspaceEvent);
      window.removeEventListener('activity_logged', handleWorkspaceEvent);
    };
  }, [refreshWorkspaceData, session.workspace.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen(true);
      }
      if (e.key === 'Escape' && isCommandOpen) {
        setIsCommandOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandOpen]);

  const logDashboardAction = useCallback((command: string, metadata: Record<string, unknown> = {}) => {
    const auditEvent = logAuditEvent({
      action: 'ai_command',
      moduleId: 'dashboard',
      targetType: 'module',
      targetId: 'dashboard_command',
      metadata: {
        command,
        source: 'dashboard_command_overlay',
        ...metadata,
      },
    }, { session });

    window.dispatchEvent(new CustomEvent('dashboard_ai_command', {
      detail: {
        command,
        auditLogId: auditEvent.id,
        workspaceId: session.workspace.id,
      },
    }));
    window.dispatchEvent(new Event('activity_logged'));
    return auditEvent;
  }, [session]);

  const createDashboardTask = useCallback((title: string) => {
    const task = createWorkspaceTask({
      title,
      column: 'todo',
      priority: 'Medium',
      type: 'dashboard',
      date: new Date().toISOString().slice(0, 10),
      isAuto: false,
    }, taskContext);

    logAuditEvent({
      action: 'general',
      moduleId: 'dashboard',
      targetType: 'task',
      targetId: task.id,
      metadata: {
        title: task.title,
        source: 'dashboard_quick_action',
      },
    }, { session });
    window.dispatchEvent(new Event('activity_logged'));
    refreshWorkspaceData();
    toast(`已创建任务：${task.title}`, 'success');
    return task;
  }, [refreshWorkspaceData, session, taskContext]);

  const navigateFromDashboard = useCallback((moduleId: ModuleId, command: string) => {
    logDashboardAction(command, { moduleId });
    onNavigate?.(moduleId);
  }, [logDashboardAction, onNavigate]);

  const handleExecuteCommand = (command: string) => {
    const commandAction = quickCommands.find((item) => item.label === command);
    if (commandAction?.moduleId) {
      navigateFromDashboard(commandAction.moduleId, command);
      toast(`已打开：${command}`, 'success');
    } else if (commandAction?.taskTitle) {
      createDashboardTask(commandAction.taskTitle);
    } else {
      logDashboardAction(command);
      toast(`已记录指令：${command}`, 'success');
    }
    setCommandQuery('');
    setIsCommandOpen(false);
  };

  const taskSummary = useMemo(() => calculateTaskCompletion(tasks), [tasks]);
  const autoTaskCount = tasks.filter((task) => task.isAuto).length;
  const runningTaskCount = tasks.filter((task) => task.column === 'in_progress' || task.column === 'auto_exec').length;
  const assetsCreated24h = assets.filter((asset) => Date.now() - asset.createdAt <= 86_400_000).length;
  const totalUsageSeconds = Object.values(usage).reduce((sum, seconds) => sum + (seconds ?? 0), 0);
  const weeklyActivityData = useMemo(
    () => buildWeeklyActivityData(auditLogs, tasks, assets),
    [assets, auditLogs, tasks],
  );
  const recentEvents = auditLogs.slice(0, 4);
  const runtimeHealthLabel = getRuntimeHealthLabel(runtime.status, runtime.isLoading, runtime.error);
  const runtimeIsDegraded = Boolean(
    runtime.error ||
    runtime.status?.health === 'degraded' ||
    runtime.status?.health === 'offline' ||
    runtime.status?.health === 'auth_expired' ||
    runtime.status?.health === 'incompatible'
  );
  const runtimeProviders = runtime.status?.cliProviders.length
    ? runtime.status.cliProviders
    : [runtime.status?.label ?? 'Web Runtime'];

  const stats = [
    {
      label: '工作区任务总数',
      value: formatCompactNumber(taskSummary.total),
      increase: `${taskSummary.completed} 已完成`,
      icon: ListTodo,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      upClass: 'text-[#1E8E3E] bg-[#E6F4EA]',
    },
    {
      label: '24H 新增数字资产',
      value: formatCompactNumber(assetsCreated24h),
      increase: `${assets.length} 总资产`,
      icon: Folder,
      color: 'text-purple-500',
      bg: 'bg-purple-50',
      upClass: 'text-[#1E8E3E] bg-[#E6F4EA]',
    },
    {
      label: '自动化任务节省工时',
      value: `${(autoTaskCount * 0.75).toFixed(1)} h`,
      increase: `${autoTaskCount} 自动任务`,
      icon: Clock,
      color: 'text-green-500',
      bg: 'bg-green-50',
      upClass: 'text-[#1E8E3E] bg-[#E6F4EA]',
    },
    {
      label: '工作区累计使用时长',
      value: formatDuration(totalUsageSeconds),
      increase: `${runtimeHealthLabel}运行时`,
      icon: Activity,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
      upClass: runtimeIsDegraded ? 'text-red-700 bg-red-50' : 'text-gray-600 bg-gray-100',
    },
  ];

  const automationCards = [
    { name: '整理全局任务', icon: ListTodo, moduleId: 'tasks' as ModuleId, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: '资产入库复核', icon: ImageIcon, moduleId: 'assets' as ModuleId, color: 'text-green-600', bg: 'bg-green-50' },
    { name: '检查算力账单', icon: Database, moduleId: 'billing' as ModuleId, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { name: '查看审计日志', icon: Activity, moduleId: 'activity_logs' as ModuleId, color: 'text-slate-700', bg: 'bg-gray-100' },
  ];

  const filteredCommands = quickCommands.filter((cmd) => cmd.label.includes(commandQuery.trim()));

  return (
    <div className="layout-section layout-container space-y-[var(--spacing-lg)] min-h-[calc(100vh-4rem)] animate-in fade-in slide-in-from-bottom-2 duration-300 relative">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
        <DailyFocusGoal />
        <FocusTimer />
        <DailyInsightsWidget />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-md)]">
        <div className="lg:col-span-2 bg-[#0F172A] rounded-[24px] p-[var(--spacing-xl)] shadow-xl relative overflow-hidden flex flex-col justify-between text-white border border-gray-800">
          <div className="absolute top-0 right-0 p-[var(--spacing-xl)] opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
            <div className="relative">
              <div className="w-64 h-64 border-4 border-white/20 rounded-full animate-[spin_10s_linear_infinite]" style={{ borderStyle: 'dashed' }}></div>
              <div className="w-48 h-48 border-2 border-white/40 rounded-full absolute top-[var(--spacing-xl)] left-8 animate-[spin_8s_linear_infinite_reverse]"></div>
            </div>
          </div>

          <div className="absolute top-4 right-4 flex items-center space-x-2">
            <span className={`${runtimeIsDegraded ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-green-500/10 border-green-500/30 text-green-400'} border font-bold px-3 py-1.5 rounded-full text-[11px] shadow-sm flex items-center`}>
              <span className="relative flex h-2 w-2 mr-2">
                <span className={`${runtimeIsDegraded ? 'bg-red-400' : 'bg-green-400'} animate-ping absolute inline-flex h-full w-full rounded-full opacity-75`}></span>
                <span className={`${runtimeIsDegraded ? 'bg-red-500' : 'bg-green-500'} relative inline-flex rounded-full h-2 w-2`}></span>
              </span>
              Agent Runtime · {runtimeHealthLabel}
            </span>
          </div>

          <div className="relative z-10 max-w-2xl mb-[var(--spacing-xl)] mt-2">
            <h2 className="text-[var(--text-main)]xl font-black mb-3 tracking-tight text-white flex items-center drop-shadow-sm">
              上午好，主理人 (Solo Founder)
            </h2>
            <p className="text-gray-300 text-[15px] leading-relaxed font-medium">
              当前工作区已记录 <span className="text-blue-400 font-bold">{taskSummary.total}</span> 个任务、<span className="text-blue-400 font-bold">{assets.length}</span> 个资产，运行时状态为 <span className={runtimeIsDegraded ? 'text-red-300 font-bold' : 'text-green-400 font-bold'}>{runtimeHealthLabel}</span>。<br />
              今天可以继续调度任务、整理资产，或检查算力与审计记录。
            </p>
          </div>
          <div className="relative z-10 flex flex-wrap gap-3">
            <button
              onClick={() => navigateFromDashboard('workflow', '打开 Agent 集群状态')}
              className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-6 py-3 rounded-[var(--radius-lg)] font-bold text-[13px] transition-all shadow-lg flex items-center group"
            >
              <Sparkles className="icon-sm mr-1.5 group-hover:scale-110 transition-transform" />
              唤醒全栖调度台
            </button>
            <button
              onClick={() => {
                setIsRestoring(true);
                createDashboardTask('恢复昨日未完工作堆栈');
                onNavigate?.('tasks');
                setIsRestoring(false);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-[var(--radius-lg)] font-bold text-[13px] transition-all shadow-lg flex items-center group"
            >
              <ListTodo className={`icon-sm mr-1.5 ${isRestoring ? 'animate-spin' : ''}`} />
              {isRestoring ? '正在恢复...' : '恢复昨日未完工作堆栈'}
            </button>
            <button
              onClick={() => navigateFromDashboard('data', '查看团队绩效报告')}
              className="bg-[var(--bg-panel)]/10 hover:bg-[var(--bg-panel)]/20 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-[var(--radius-lg)] font-bold text-[13px] transition-all flex items-center"
            >
              <Database className="icon-sm mr-1.5" />
              查看团队 (AI) 绩效报告
            </button>
          </div>
        </div>

        <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-black text-[var(--text-main)] flex items-center">
              <Network className="w-[18px] h-[18px] mr-2 text-[var(--text-main)]" /> 重点 Agent 状态
            </h3>
            <button onClick={() => navigateFromDashboard('agent_status', '查看 Agent 状态监测')} className="text-[11px] font-bold text-[var(--text-main)] bg-gray-100 px-3 py-1 rounded-full cursor-pointer hover:bg-gray-200">查看集群</button>
          </div>

          {runtimeIsDegraded ? (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-[var(--radius-lg)] p-3 flex items-start animate-in fade-in duration-300">
              <AlertTriangle className="icon-sm text-red-500 mt-0.5 mr-2 shrink-0" />
              <div className="flex-1">
                <p className="text-[12px] font-bold text-red-800">Agent 运行时需要处理</p>
                <p className="text-[11px] font-medium text-red-600 mt-0.5 leading-relaxed">{runtime.error ?? runtime.status?.message ?? '当前运行时处于降级状态。'}</p>
              </div>
              <button onClick={() => navigateFromDashboard('settings', '打开运行时设置')} className="text-[11px] font-bold bg-[var(--bg-panel)] text-red-600 px-2 py-1 border border-red-200 rounded shadow-sm hover:bg-red-50 ml-2 whitespace-nowrap shrink-0 transition-colors">检查设置</button>
            </div>
          ) : (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-[var(--radius-lg)] p-3 flex items-start animate-in fade-in duration-300">
              <Network className="icon-sm text-green-600 mt-0.5 mr-2 shrink-0" />
              <div className="flex-1">
                <p className="text-[12px] font-bold text-green-800">{runtime.status?.label ?? 'Web Runtime'} 正常</p>
                <p className="text-[11px] font-medium text-green-700 mt-0.5 leading-relaxed">{runtime.status?.message ?? 'Web standalone 模式可用，任务与资产操作不会被本地运行时阻塞。'}</p>
              </div>
            </div>
          )}

          <div className="space-y-[var(--spacing-md)] flex-1 overflow-y-auto custom-scrollbar pr-1">
            {runtimeProviders.slice(0, 3).map((provider) => (
              <div key={provider} className={`flex items-center justify-between ${runtimeIsDegraded ? 'opacity-70' : ''}`}>
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${runtimeIsDegraded ? 'bg-gray-100 border-gray-200' : 'bg-blue-50 border-blue-100'}`}>
                    <Zap className={`icon-md ${runtimeIsDegraded ? 'text-[var(--text-muted)]' : 'text-[var(--color-primary)]'}`} />
                  </div>
                  <div className="ml-3">
                    <p className="text-[13px] font-bold text-[var(--text-main)]">{provider}</p>
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">{runtime.status?.mode ?? 'web'} · {runtime.status?.providerKind ?? 'mock'}</p>
                  </div>
                </div>
                <span className={`text-[11px] font-bold ${runtimeIsDegraded ? 'text-red-500' : 'text-green-600'}`}>{runtimeHealthLabel}</span>
              </div>
            ))}
            <div className="text-[11px] text-[var(--text-muted)] font-bold pt-2 border-t border-[var(--border-color)]">
              Runtime count: {runtime.status?.runtimeCount ?? 0} · Running tasks: {runningTaskCount}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)]">
        {stats.map((stat) => (
          <div
            key={stat.label}
            onClick={() => {
              setSelectedInsight(stat);
              setIsInsightOpen(true);
            }}
            className="bg-[var(--bg-panel)] rounded-[24px] p-[var(--spacing-lg)] border border-[var(--border-color)] shadow-sm flex flex-col hover:shadow-md hover:border-blue-300 transition-all cursor-pointer relative overflow-hidden group"
            title="点击查看趋势详情"
          >
            <div className="flex justify-between items-start mb-[var(--spacing-md)]">
              <div className={`p-3.5 rounded-[var(--radius-xl)] ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className={`w-[22px] h-[22px] ${stat.color}`} />
              </div>
              <span className={`flex items-center text-xs font-bold px-3 py-1 rounded-full ${stat.upClass}`}>
                {stat.increase} {stat.increase.startsWith('+') && <ArrowUpRight className="w-3 h-3 ml-0.5" />}
              </span>
            </div>
            <div>
              <p className="text-[32px] font-extrabold text-[#111827] tracking-tight group-hover:text-[var(--color-primary)] transition-colors">{stat.value}</p>
              <p className="text-[14px] text-[var(--text-muted)] font-bold mt-1 flex items-center justify-between">
                {stat.label}
                <span className="opacity-0 group-hover:opacity-100 text-[11px] text-blue-500 transition-opacity flex items-center">详情 <ArrowUpRight className="w-3 h-3 ml-0.5" /></span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-md)]">
        <div className="lg:col-span-2 bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)]">
          <div className="flex items-center justify-between mb-[var(--spacing-md)]">
            <h2 className="text-lg font-black text-[var(--text-main)] tracking-tight">工作区审计与操作趋势</h2>
            <span className="text-sm font-bold border-[var(--border-color)] rounded-full shadow-sm px-4 py-2 bg-[var(--bg-app)] text-gray-700 border">
              最近 7 天
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
              <AreaChart data={weeklyActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#111827" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#111827" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontWeight: 600 }} />
                <Area type="monotone" dataKey="uses" stroke="#111827" strokeWidth={4} fillOpacity={1} fill="url(#colorUses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] flex flex-col">
          <h2 className="text-lg font-black text-[var(--text-main)] mb-[var(--spacing-md)] tracking-tight">任务与资产活跃度</h2>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
              <BarChart data={weeklyActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} />
                <Tooltip cursor={{fill: '#F8F9FA'}} contentStyle={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontWeight: 600 }} />
                <Bar dataKey="active" fill="#111827" radius={[8, 8, 8, 8]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--spacing-md)]">
        <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden">
          <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)] flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-main)] border-l-4 border-blue-500 pl-3">24H Agent 事件流</h2>
            <button onClick={() => navigateFromDashboard('activity_logs', '查看全部审计日志')} className="text-[12px] font-bold text-[var(--text-main)]">查看全部</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-gray-100">
                {recentEvents.length > 0 ? recentEvents.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80 transition-colors group cursor-pointer">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-[var(--radius-lg)] flex items-center justify-center mr-4 ${
                          row.moduleId === 'assets' ? 'bg-green-50 text-green-500 border border-green-100' :
                          row.targetType === 'task' ? 'bg-blue-50 text-blue-500 border border-blue-100' :
                          'bg-purple-50 text-purple-500 border border-purple-100'
                        }`}>
                          {row.moduleId === 'assets' ? <ImageIcon className="w-[18px] h-[18px]" /> : row.targetType === 'task' ? <ListTodo className="w-[18px] h-[18px]" /> : <Zap className="w-[18px] h-[18px]" />}
                        </div>
                        <span className="text-[13px] font-bold text-[var(--text-main)]">{row.action} · {row.targetType}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-green-50 text-green-700 border border-green-100">
                        已记录
                      </span>
                    </td>
                    <td className="py-4 px-6 text-[12px] text-gray-400 font-medium text-right whitespace-nowrap">{formatRelativeTime(row.timestamp)}</td>
                  </tr>
                )) : (
                  <tr className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-6 px-6" colSpan={3}>
                      <div className="flex items-center text-[13px] font-bold text-[var(--text-muted)]">
                        <Activity className="w-[18px] h-[18px] mr-3 text-gray-300" />
                        暂无审计事件，完成一次任务或资产操作后会显示在这里。
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] overflow-hidden">
          <div className="flex items-center justify-between mb-[var(--spacing-md)]">
            <h2 className="text-lg font-black text-[var(--text-main)] flex items-center border-l-4 border-indigo-500 pl-3">
              自动化专区
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-[var(--spacing-md)]">
            {automationCards.map((wf) => (
              <button key={wf.moduleId} onClick={() => navigateFromDashboard(wf.moduleId, wf.name)} className="flex items-center justify-start p-4 rounded-[16px] border border-[var(--border-color)] bg-[var(--bg-app)] hover:bg-[var(--bg-panel)] hover:shadow-md hover:border-[var(--border-color)] transition-all group">
                <div className={`p-3 rounded-[12px] ${wf.bg} mr-4 group-hover:scale-110 transition-transform duration-300`}>
                  <wf.icon className={`icon-md ${wf.color}`} />
                </div>
                <div className="text-left flex-1">
                  <span className="text-[13px] font-bold text-[var(--text-main)] block truncate">{wf.name}</span>
                  <span className="text-[11px] font-medium text-gray-400 mt-0.5 flex items-center"><Zap className="w-3 h-3 mr-0.5 text-blue-400" /> P0 控制面入口</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 border-t border-[var(--border-color)] pt-6">
            <h2 className="text-[15px] font-black text-[var(--text-main)] flex items-center mb-4">
              <Activity className="w-[18px] h-[18px] mr-2 text-indigo-500" /> 近期交互分布图 (Heatmap)
            </h2>
            <div className="bg-gray-50 border border-[var(--border-color)] rounded-[16px] p-4 flex flex-col items-center">
              <p className="text-[11px] font-bold text-[var(--text-muted)] w-full mb-2">按审计日志统计的工作区活跃热力</p>
              <ActivityHeatmap />
            </div>
          </div>
        </div>
      </div>

      <RecentFilesWidget />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-[var(--spacing-md)] items-start">
        <TimeSpentChart />
        <WorkflowEfficiencyWidget />
        <RecommendedModulesWidget onNavigate={onNavigate} />
        <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
          <FrequentWorkflowsWidget />
          <ModuleFlowMap />
          <SessionArchiver />
        </div>
        <div className="xl:col-span-3">
          <SystemResources />
        </div>
      </div>

      {isCommandOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCommandOpen(false)}></div>
          <div className="bg-[var(--bg-panel)] w-full max-w-xl rounded-[var(--radius-xl)] shadow-2xl relative z-10 overflow-hidden border border-[var(--border-color)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center px-4 py-3 border-b border-[var(--border-color)]">
              <Search className="icon-md text-gray-400 mr-3" />
              <input
                type="text"
                autoFocus
                placeholder="搜索模块或输入指令..."
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                className="flex-1 text-sm font-medium text-[var(--text-main)] outline-none bg-transparent placeholder-gray-400"
              />
              <span className="text-[10px] font-bold text-gray-400 border border-[var(--border-color)] rounded px-1.5 py-0.5 whitespace-nowrap">ESC 退出</span>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {(filteredCommands.length > 0 ? filteredCommands : quickCommands).map((cmd) => (
                <button key={cmd.label} onClick={() => handleExecuteCommand(cmd.label)} className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-[var(--radius-lg)] transition-colors flex items-center group">
                  <Command className="icon-sm mr-3 text-gray-400 group-hover:text-blue-500" />
                  {cmd.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isInsightOpen && selectedInsight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsInsightOpen(false)}></div>
          <div className="bg-[var(--bg-panel)] w-full max-w-3xl rounded-[24px] shadow-2xl relative z-10 p-[var(--spacing-lg)] border border-[var(--border-color)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-[var(--spacing-md)]">
              <div>
                <h2 className="text-xl font-black text-[var(--text-main)]">{selectedInsight.label} - 7 天趋势详情</h2>
                <p className="text-sm font-bold text-[var(--text-muted)] mt-1">当前数据: {selectedInsight.value}</p>
              </div>
              <button onClick={() => setIsInsightOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="icon-md text-[var(--text-muted)]" />
              </button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
                <AreaChart data={weeklyActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #E5E7EB' }} />
                  <Area type="monotone" dataKey="active" stroke="#2563EB" strokeWidth={3} fillOpacity={0.2} fill="#3B82F6" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
