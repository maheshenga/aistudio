import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Cpu,
  CreditCard,
  Key,
  Users,
  Activity,
  Server,
} from 'lucide-react';
import { toast } from './Toast';
import { useSaasSession } from '../saas/SaasAuthContext';
import { hasWorkspacePermission, buildPermissionDeniedMetadata } from '../saas/permissions';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { listAuditLogs } from '../lib/data/auditLogRepository';
import { listGenerationJobs } from '../lib/data/generationJobRepository';
import { loadModuleUsage } from '../lib/data/usageRepository';
import {
  calculateBillingUsage,
  ensureDefaultWorkspaceBillingPlans,
  getPlanMonthlyAllowance,
  loadWorkspaceBillingPlans,
} from '../lib/data/billingRepository';
import {
  loadWorkspaceFinancialRecords,
  sumWorkspacePromotionalCredits,
  sumWorkspaceRechargeCredits,
} from '../lib/data/financialRepository';
import {
  ensureDefaultWorkspaceProviders,
  loadWorkspaceProviders,
} from '../lib/data/providerRepository';
import { loadWorkspaceApiKeys } from '../lib/data/apiKeyRepository';
import { loadWorkspaceMembers } from '../lib/data/workspaceMemberRepository';
import {
  ensureDefaultWorkspaceRiskEvents,
  loadWorkspaceRiskEvents,
  summarizeWorkspaceRiskEvents,
  updateWorkspaceRiskEvent,
  type WorkspaceRiskDecision,
  type WorkspaceRiskEvent,
  type WorkspaceRiskSeverity,
} from '../lib/data/riskRepository';
import { useAgentRuntimeStatus } from '../runtime/useAgentRuntimeStatus';
import {
  assessWorkspaceRisk,
  getRiskCategoryLabel,
  getRiskLevelLabel,
  type RiskSignal,
  type RiskSignalCategory,
  type RiskSignalLevel,
  type WorkspaceRiskAssessment,
} from '../saas/riskPolicy';
import type { ModuleId } from '../types';
import type { WorkspaceRole } from '../saas/types';

interface RiskCenterViewProps {
  /** Deep-link a risk signal to its source. AdminView wires this to admin sub-tabs and cross-module navigation. */
  onNavigateSource?: (signal: RiskSignal) => void;
}

const CATEGORY_ICONS: Record<RiskSignalCategory, React.ComponentType<{ className?: string }>> = {
  quota: CreditCard,
  provider: Cpu,
  permission: Users,
  api_key: Key,
  runtime: Server,
  audit: Activity,
};

const LEVEL_BADGE_CLASSES: Record<RiskSignalLevel, string> = {
  critical: 'bg-red-50 text-red-600 border-red-200',
  high: 'bg-orange-50 text-orange-600 border-orange-200',
  medium: 'bg-amber-50 text-amber-600 border-amber-200',
  low: 'bg-gray-50 text-gray-500 border-gray-200',
};

const ADMIN_PRIVILEGED_ROLES = new Set<WorkspaceRole>(['owner', 'admin']);

export function RiskCenterView({ onNavigateSource }: RiskCenterViewProps) {
  const session = useSaasSession();
  const workspaceId = session.workspace.id;
  const role = session.membership.role;
  const canViewRisk = hasWorkspacePermission(role, 'audit.view');
  const canManageRisk = hasWorkspacePermission(role, 'settings.manage');

  const runtimeStatus = useAgentRuntimeStatus();
  const [assessment, setAssessment] = useState<WorkspaceRiskAssessment | null>(null);
  const [riskEvents, setRiskEvents] = useState<WorkspaceRiskEvent[]>([]);

  const riskContext = useMemo(() => ({ workspaceId }), [workspaceId]);

  // Operational signal aggregation (read-only). Re-runs when any source repo dispatches an update.
  useEffect(() => {
    if (!canViewRisk) return;
    const recompute = () => {
      const now = Date.now();
      const billingPlans = ensureDefaultWorkspaceBillingPlans(riskContext);
      const monthlyAllowance = getPlanMonthlyAllowance(session.workspace.plan, billingPlans);
      const financialRecords = loadWorkspaceFinancialRecords(riskContext);
      const rechargeCredits = sumWorkspaceRechargeCredits(financialRecords) + sumWorkspacePromotionalCredits(financialRecords);
      const usage = calculateBillingUsage({
        monthlyAllowance,
        rechargeCredits,
        generationJobs: listGenerationJobs(riskContext),
        moduleUsage: loadModuleUsage(riskContext),
      });

      const providers = ensureDefaultWorkspaceProviders(riskContext).map((provider) => ({
        id: provider.id,
        name: provider.name,
        status: provider.status,
        enabled: provider.enabled,
        isDefault: provider.isDefault,
      }));

      const members = loadWorkspaceMembers(riskContext);
      const adminCount = members.filter((member) => ADMIN_PRIVILEGED_ROLES.has(member.role)).length;
      const activeMembers = members.filter((member) => member.status === 'active');
      const inactivePrivilegedCount = members.filter((member) =>
        ADMIN_PRIVILEGED_ROLES.has(member.role) && member.status !== 'active',
      ).length;

      const apiKeys = loadWorkspaceApiKeys(riskContext).map((key) => ({
        id: key.id,
        name: key.name,
        status: key.status,
        scopes: key.scopes,
        expiresAt: key.expiresAt,
      }));

      const runtime = runtimeStatus.status
        ? { mode: runtimeStatus.status.mode, health: runtimeStatus.status.health, label: runtimeStatus.status.label }
        : null;

      const next = assessWorkspaceRisk({
        quota: {
          remainingPercent: usage.remainingPercent,
          remainingCredits: usage.remainingCredits,
          consumedCredits: usage.consumedCredits,
          monthlyAllowance: usage.monthlyAllowance,
        },
        providers,
        permission: {
          adminCount,
          memberCount: activeMembers.length,
          inactivePrivilegedCount,
        },
        apiKeys,
        runtime,
        auditLogs: listAuditLogs({ workspaceId }),
        now,
      });
      setAssessment(next);
    };

    recompute();
    const events = [
      'billing_plans_updated',
      'financial_records_updated',
      'workspace_providers_updated',
      'workspace_members_updated',
      'workspace_api_keys_updated',
      'usage_events_updated',
      'activity_logged',
    ];
    events.forEach((name) => window.addEventListener(name, recompute));
    return () => events.forEach((name) => window.removeEventListener(name, recompute));
  }, [canViewRisk, riskContext, session.workspace.plan, workspaceId, runtimeStatus.status]);

  // Content-moderation review queue (existing risk-event store).
  useEffect(() => {
    if (!canViewRisk) return;
    ensureDefaultWorkspaceRiskEvents(riskContext);
    const refreshEvents = () => setRiskEvents(loadWorkspaceRiskEvents(riskContext));
    const handleRiskEventsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== workspaceId) return;
      refreshEvents();
    };
    refreshEvents();
    window.addEventListener('workspace_risk_events_updated', handleRiskEventsUpdated);
    return () => window.removeEventListener('workspace_risk_events_updated', handleRiskEventsUpdated);
  }, [canViewRisk, riskContext, workspaceId]);

  const moderationSummary = useMemo(() => summarizeWorkspaceRiskEvents(riskEvents), [riskEvents]);

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
        targetId: event?.id ?? workspaceId,
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

  const handleNavigateToSource = (signal: RiskSignal) => {
    // Read-only deep link: record that an operator inspected the source, then navigate.
    auditRisk('risk_policy_export', null, {
      operation: 'inspect_risk_signal',
      signalId: signal.id,
      category: signal.category,
      level: signal.level,
      sourceType: signal.source.type,
      sourceModule: signal.source.moduleId,
      sourceRecordId: signal.source.recordId,
    });
    onNavigateSource?.(signal);
  };

  const handleReviewRiskEvent = (event: WorkspaceRiskEvent, decision: WorkspaceRiskDecision) => {
    if (!canManageRisk) {
      logAuditEvent(
        {
          action: 'risk_event_review',
          moduleId: 'admin' as ModuleId,
          targetType: 'risk_event',
          targetId: event.id,
          metadata: buildPermissionDeniedMetadata({
            role,
            permission: 'settings.manage',
            operation: decision === 'allowed' ? 'allow' : 'enforce',
            moduleId: 'admin',
          }),
        },
        { session },
      );
      window.dispatchEvent(new Event('activity_logged'));
      toast('当前角色无权处理风控事件', 'error');
      return;
    }
    const updatedEvent = updateWorkspaceRiskEvent(event.id, { decision, reviewedAt: Date.now() }, riskContext);
    if (!updatedEvent) return;
    setRiskEvents(loadWorkspaceRiskEvents(riskContext));
    auditRisk('risk_event_review', updatedEvent, {
      operation: decision === 'allowed' ? 'allow' : 'enforce',
      previousDecision: event.decision,
    });
    toast(decision === 'allowed' ? '风控事件已放行' : '风控事件已封禁处理', 'success');
  };

  if (!canViewRisk) {
    return (
      <div className="p-[var(--spacing-lg)]">
        <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-8 text-center">
          <ShieldAlert className="icon-lg mx-auto text-[var(--text-muted)] mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-main)]">没有访问风控中心的权限</h2>
          <p className="text-sm text-[var(--text-muted)] mt-2">需要 audit.view 权限。请联系工作区管理员。</p>
        </div>
      </div>
    );
  }

  const signals = assessment?.signals ?? [];
  const highestLevel = assessment?.highestLevel ?? null;

  return (
    <div className="p-[var(--spacing-lg)] space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-y-auto h-[calc(100vh-4rem)]">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">风控中心</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            基于真实配额、服务商、权限、API 密钥、运行时与审计信号的只读风险视图。处置动作需在对应模块单独授权与审计。
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-[var(--radius-lg)] border text-sm font-bold flex items-center gap-2 ${
          highestLevel ? LEVEL_BADGE_CLASSES[highestLevel] : 'bg-green-50 text-green-600 border-green-200'
        }`}>
          {highestLevel ? <AlertTriangle className="icon-sm" /> : <ShieldCheck className="icon-sm" />}
          {highestLevel ? `最高风险：${getRiskLevelLabel(highestLevel)}` : '未发现运营风险'}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-[var(--spacing-md)]">
        {(['critical', 'high', 'medium', 'low'] as RiskSignalLevel[]).map((level) => (
          <div key={level} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm text-center">
            <p className="text-xs text-[var(--text-muted)] font-bold mb-2">{getRiskLevelLabel(level)}风险</p>
            <p className={`text-2xl font-extrabold ${LEVEL_BADGE_CLASSES[level].split(' ')[1]}`}>
              {assessment?.levelCounts[level] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] shadow-sm">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <h3 className="font-bold text-[var(--text-main)]">运营风险信号</h3>
        </div>
        {signals.length === 0 ? (
          <div className="p-10 text-center">
            <ShieldCheck className="icon-lg mx-auto text-green-500 mb-3" />
            <p className="text-sm text-[var(--text-muted)]">当前未检测到运营风险信号。</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {signals.map((signal) => {
              const Icon = CATEGORY_ICONS[signal.category];
              return (
                <li key={signal.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50/50">
                  <div className={`mt-0.5 p-2 rounded-[var(--radius-lg)] border ${LEVEL_BADGE_CLASSES[signal.level]}`}>
                    <Icon className="icon-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-[11px] font-bold rounded border ${LEVEL_BADGE_CLASSES[signal.level]}`}>
                        {getRiskLevelLabel(signal.level)}
                      </span>
                      <span className="text-[11px] font-bold text-[var(--text-muted)]">{getRiskCategoryLabel(signal.category)}</span>
                      <p className="font-bold text-[14px] text-[var(--text-main)]">{signal.title}</p>
                    </div>
                    <p className="text-[13px] text-gray-700 mt-1">{signal.detail}</p>
                    <p className="text-[12px] text-[var(--text-muted)] mt-1">建议：{signal.recommendation}</p>
                  </div>
                  {signal.source.moduleId && (
                    <button
                      onClick={() => handleNavigateToSource(signal)}
                      className="flex-shrink-0 text-[var(--color-primary)] font-bold hover:text-blue-800 text-[13px] flex items-center gap-1"
                    >
                      查看来源
                      <ArrowRight className="icon-xs" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="font-bold text-[var(--text-main)]">内容风控审核队列</h3>
          <div className="flex gap-3 text-[12px] text-[var(--text-muted)] font-bold">
            <span className="text-red-500">今日拦截 {moderationSummary.blockedTodayCount}</span>
            <span className="text-orange-500">待审 {moderationSummary.pendingReviewCount}</span>
            <span>模型 {moderationSummary.modelVersion}</span>
          </div>
        </div>
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
