import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Loader2, Network, Send, X } from 'lucide-react';

import type { AgentSummary, AgentTask } from '../runtime/agentRuntimeTypes.ts';
import { useAgentRuntime } from '../runtime/AgentRuntimeContext.tsx';
import { estimateRequestedGenerationCredits } from '../lib/data/billingRepository';
import { createGenerationJob, updateGenerationJob } from '../lib/data/generationJobRepository';
import { createWorkspaceTask, updateWorkspaceTask } from '../lib/data/taskRepository';
import { createWorkspaceUsageEvent } from '../lib/data/usageRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { apiClient } from '../lib/data/apiClient';
import { createOrchestrationService } from '../runtime/orchestrationService.ts';
import { useSaasSession } from '../saas/SaasAuthContext';
import { preflightCredits, type CreditPreflightResult } from '../lib/billing/creditPreflight';
import { canDispatchAgent } from '../saas/permissions';
import { BaseModal } from './ui/BaseModal';

type AgentTarget = AgentSummary & {
  progress: number;
  dispatchStatus: 'idle' | 'running' | 'completed' | 'failed';
};

const isFinalTaskStatus = (status: AgentTask['status']) =>
  status === 'succeeded' || status === 'failed' || status === 'cancelled';

const mapRuntimeStatusToWorkspaceTask = (status: AgentTask['status']) => {
  switch (status) {
    case 'pending':
      return { column: 'auto_exec' as const, status: 'queued' as const };
    case 'running':
      return { column: 'auto_exec' as const, status: 'running' as const };
    case 'succeeded':
      return { column: 'done' as const, status: 'completed' as const };
    case 'cancelled':
      return { column: 'review' as const, status: 'cancelled' as const };
    case 'failed':
    default:
      return { column: 'review' as const, status: 'blocked' as const };
  }
};

export function GlobalAgentDispatcherModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const runtime = useAgentRuntime();
  const session = useSaasSession();
  const canDispatch = canDispatchAgent(session.membership.role);
  const [taskInput, setTaskInput] = useState('');
  const [agents, setAgents] = useState<AgentTarget[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResults, setDispatchResults] = useState<AgentTask[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [localExecAcknowledged, setLocalExecAcknowledged] = useState(false);
  const requiresLocalExecDisclosure = runtime.mode === 'desktop_multica';

  useEffect(() => {
    if (!isOpen) {
      setTaskInput('');
      setAgents((prev) => prev.map((agent) => ({ ...agent, dispatchStatus: 'idle', progress: 0 })));
      setSelectedAgents([]);
      setDispatchResults([]);
      setRuntimeError(null);
      setIsDispatching(false);
      setLocalExecAcknowledged(false);
      return;
    }

    let isMounted = true;
    setRuntimeError(null);
    runtime
      .listAgents()
      .then((items) => {
        if (!isMounted) return;
        setAgents(items.map((agent) => ({ ...agent, progress: 0, dispatchStatus: 'idle' })));
      })
      .catch((err) => {
        if (!isMounted) return;
        setRuntimeError(err instanceof Error ? err.message : '无法读取 Agent 列表。');
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, runtime]);

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) => (prev.includes(id) ? prev.filter((agentId) => agentId !== id) : [...prev, id]));
  };

  const startDispatch = async () => {
    if (selectedAgents.length === 0 || !taskInput.trim()) return;
    setRuntimeError(null);
    setDispatchResults([]);

    if (!canDispatch) {
      setRuntimeError('当前角色没有 Agent 调度权限，请联系工作区管理员。');
      return;
    }

    const billingContext = { workspaceId: session.workspace.id, userId: session.user.id };
    const requestedCredits = estimateRequestedGenerationCredits({
      providerKind: runtime.providerKind,
      runtimeMode: runtime.mode,
      moduleId: 'tasks',
      pricingAction: 'runtime_dispatch',
      taskCount: selectedAgents.length,
    });
    const result = await preflightCredits({
      workspaceId: session.workspace.id,
      requiredCredits: requestedCredits,
    });

    if (!result.ok) {
      const failure = result as Extract<CreditPreflightResult, { ok: false }>;
      if (failure.reason === 'insufficient') {
        const remainingCredits = failure.balance ?? 0;
        const overageCredits = Math.max(0, requestedCredits - remainingCredits);
        setRuntimeError(
          `算力额度不足：本次调度需要 ${requestedCredits} 点，当前剩余 ${remainingCredits} 点，请升级套餐或充值后重试。`,
        );
        setAgents((prev) =>
          prev.map((agent) =>
            selectedAgents.includes(agent.id) ? { ...agent, dispatchStatus: 'failed', progress: 100 } : agent,
          ),
        );
        logAuditEvent({
          action: 'generation_job_failed',
          targetType: 'generation_job',
          targetId: 'billing_quota',
          metadata: {
            reason: 'quota_exceeded',
            requestedCredits,
            remainingCredits,
            overageCredits,
            selectedAgentCount: selectedAgents.length,
            runtimeMode: runtime.mode,
            providerKind: runtime.providerKind,
          },
        }, { session });
        createWorkspaceUsageEvent({
          moduleId: 'tasks',
          kind: 'quota_block',
          targetType: 'runtime',
          targetId: 'billing_quota',
          providerKind: runtime.providerKind,
          runtimeMode: runtime.mode,
          credits: 0,
          metadata: {
            reason: 'quota_exceeded',
            requestedCredits,
            remainingCredits,
            overageCredits,
            selectedAgentCount: selectedAgents.length,
          },
        }, billingContext);
        return;
      }
      // reason === 'unavailable':核验不到余额，fail-open 放行，交由后端 dispatch 的 402 insufficient_credits 原子兜底
    }

    setIsDispatching(true);

    try {
      const createdTasks = await Promise.all(
        selectedAgents.map(async (id) => {
          setAgents((prev) =>
            prev.map((agent) => (agent.id === id ? { ...agent, dispatchStatus: 'running', progress: 20 } : agent)),
          );
          const orchestration = createOrchestrationService({
            apiClient,
            workspaceId: session.workspace.id,
            getProvider: () => runtime,
          });
          let backendJobId: string | undefined;
          const task = await runtime.createTask({
            title: taskInput.trim().slice(0, 80),
            description: taskInput.trim(),
            agentId: id,
            priority: 'medium',
            metadata: { source: 'global_agent_dispatcher' },
          });
          if (apiClient.configured) {
            try {
              const dispatched = await orchestration.dispatchTask({
                type: 'agent_dispatch',
                input: { prompt: taskInput.trim() },
                runtimeMode: runtime.mode,
                agentId: id,
                providerKind: task.source,
              }, task);
              backendJobId = dispatched.jobId;
            } catch (e) {
              if ((e as { code?: string }).code === 'insufficient_credits') {
                setRuntimeError('算力余额不足:本次调度被后端拦截,请升级套餐或充值后重试。');
                throw e;
              }
              console.error('backend orchestration dispatch failed; continuing with local mirror', e);
            }
          }
          const generationJob = createGenerationJob({
            title: task.title,
            prompt: task.description ?? taskInput.trim(),
            status: task.status,
            providerKind: task.source,
            runtimeMode: runtime.mode,
            agentId: task.agentId,
            runtimeTaskId: task.id,
            progress: task.progress ?? 0,
            metadata: {
              source: 'global_agent_dispatcher',
              runtimeId: task.runtimeId,
              externalRef: task.externalRef,
              backendJobId,
            },
          }, billingContext);
          const initialTaskState = mapRuntimeStatusToWorkspaceTask(task.status);
          const workspaceTask = createWorkspaceTask({
            title: task.title,
            column: initialTaskState.column,
            priority: 'Medium',
            type: 'Agent Dispatch',
            date: task.updatedAt,
            isAuto: true,
            status: initialTaskState.status,
            runtimeMode: runtime.mode,
            runtimeProviderKind: task.source,
            runtimeTaskId: task.id,
            runtimeStatus: task.status,
            agentId: task.agentId,
            runtimeId: task.runtimeId,
            externalRef: task.externalRef,
            lastRuntimeEventAt: task.updatedAt,
            metadata: {
              source: 'global_agent_dispatcher',
              generationJobId: generationJob.id,
              prompt: task.description ?? taskInput.trim(),
              backendJobId,
            },
          }, billingContext);
          createWorkspaceUsageEvent({
            moduleId: 'tasks',
            kind: 'runtime_dispatch',
            targetType: 'runtime',
            targetId: task.id,
            providerKind: task.source,
            runtimeMode: runtime.mode,
            credits: 0,
            metadata: {
              source: 'global_agent_dispatcher',
              requestedCredits,
              generationJobId: generationJob.id,
              workspaceTaskId: workspaceTask.id,
              agentId: task.agentId,
              runtimeTaskId: task.id,
            },
          }, billingContext);
          logAuditEvent({
            action: 'generation_job_start',
            targetType: 'generation_job',
            targetId: generationJob.id,
            metadata: {
              runtimeTaskId: task.id,
              agentId: task.agentId,
              runtimeMode: runtime.mode,
              providerKind: task.source,
              status: task.status,
            },
          }, { session });
          logAuditEvent({
            action: 'task_create',
            moduleId: 'tasks',
            targetType: 'task',
            targetId: workspaceTask.id,
            metadata: {
              source: 'global_agent_dispatcher',
              generationJobId: generationJob.id,
              runtimeTaskId: task.id,
              agentId: task.agentId,
              runtimeMode: runtime.mode,
              providerKind: task.source,
              runtimeStatus: task.status,
            },
          }, { session });
          let finalAuditLogged = false;
          const logFinalAudit = (status: AgentTask['status'], progress?: number, message?: string) => {
            if (finalAuditLogged || !isFinalTaskStatus(status)) return;
            finalAuditLogged = true;
            logAuditEvent({
              action: status === 'succeeded' ? 'generation_job_complete' : 'generation_job_failed',
              targetType: 'generation_job',
              targetId: generationJob.id,
              metadata: {
                runtimeTaskId: task.id,
                agentId: task.agentId,
                runtimeMode: runtime.mode,
                providerKind: task.source,
                status,
                progress,
                message,
              },
            }, { session });
            logAuditEvent({
              action:
                status === 'succeeded'
                  ? 'task_complete'
                  : status === 'cancelled'
                    ? 'task_cancel'
                    : 'task_runtime_failure',
              moduleId: 'tasks',
              targetType: 'task',
              targetId: workspaceTask.id,
              metadata: {
                runtimeTaskId: task.id,
                generationJobId: generationJob.id,
                agentId: task.agentId,
                runtimeMode: runtime.mode,
                providerKind: task.source,
                runtimeStatus: status,
                progress,
                message,
              },
            }, { session });
          };
          let unsubscribe: (() => void) | undefined;
          unsubscribe = runtime.subscribeToTask(task.id, (event) => {
            const nextProgress = event.progress ?? (isFinalTaskStatus(event.status) ? 100 : task.progress ?? 0);
            const nextTaskState = mapRuntimeStatusToWorkspaceTask(event.status);
            updateGenerationJob(
              generationJob.id,
              {
                status: event.status,
                progress: nextProgress,
                error: event.status === 'failed' || event.status === 'cancelled' ? event.message : undefined,
              },
              billingContext,
            );
            updateWorkspaceTask(
              workspaceTask.id,
              {
                column: nextTaskState.column,
                status: nextTaskState.status,
                runtimeStatus: event.status,
                lastRuntimeEventAt: event.occurredAt,
                date: event.occurredAt,
                metadata: {
                  ...workspaceTask.metadata,
                  generationJobId: generationJob.id,
                  lastRuntimeMessage: event.message,
                  progress: nextProgress,
                },
              },
              billingContext,
            );
            logAuditEvent({
              action: 'task_status_change',
              moduleId: 'tasks',
              targetType: 'task',
              targetId: workspaceTask.id,
              metadata: {
                runtimeTaskId: task.id,
                generationJobId: generationJob.id,
                agentId: task.agentId,
                runtimeMode: runtime.mode,
                providerKind: task.source,
                runtimeStatus: event.status,
                taskStatus: nextTaskState.status,
                column: nextTaskState.column,
                progress: nextProgress,
                message: event.message,
              },
            }, { session });
            logFinalAudit(event.status, nextProgress, event.message);
            if (isFinalTaskStatus(event.status)) unsubscribe?.();
          });
          logFinalAudit(task.status, task.progress, task.error);
          setAgents((prev) =>
            prev.map((agent) => (agent.id === id ? { ...agent, dispatchStatus: 'completed', progress: 100 } : agent)),
          );
          return task;
        }),
      );
      setDispatchResults(createdTasks);
    } catch (err) {
      setRuntimeError(
        (err as { code?: string }).code === 'insufficient_credits'
          ? '算力余额不足:本次调度被后端拦截,请升级套餐或充值后重试。'
          : err instanceof Error ? err.message : 'Agent 调度失败。',
      );
      setAgents((prev) =>
        prev.map((agent) =>
          selectedAgents.includes(agent.id) && agent.dispatchStatus === 'running'
            ? { ...agent, dispatchStatus: 'failed', progress: 100 }
            : agent,
        ),
      );
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-4xl"
      zIndex={100}
      hideHeader
      className="flex flex-col md:flex-row h-[75vh]"
    >
      <div className="w-full md:w-1/2 p-[var(--spacing-xl)] border-r border-[var(--border-color)] bg-[var(--bg-hover)] flex flex-col h-full">
        <div className="flex items-center justify-between mb-[var(--spacing-xl)]">
          <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight flex items-center">
            <Network className="icon-lg mr-3 text-indigo-600" />
            全局 Agent 调度器
          </h2>
          <button
            onClick={onClose}
            className="md:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--bg-panel)] rounded-full border border-[var(--border-color)] shadow-sm"
          >
            <X className="icon-md" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="mb-[var(--spacing-md)]">
            <label className="text-[13px] font-bold text-[var(--text-main)] mb-2 flex items-center">
              <FileText className="icon-sm mr-2 text-blue-500" />
              调度任务描述
            </label>
            <textarea
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="输入需要 Agent 处理的任务指令..."
              className="w-full h-32 px-4 py-3 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all resize-none shadow-sm placeholder:text-[var(--text-muted)]"
              disabled={isDispatching}
            />
          </div>

          <div>
            <label className="text-[13px] font-bold text-[var(--text-main)] mb-3 flex items-center justify-between">
              <span>选择 Agent</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                {selectedAgents.length} selected
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => !isDispatching && toggleAgent(agent.id)}
                  className={`p-3 rounded-[var(--radius-lg)] border text-left transition-all ${
                    selectedAgents.includes(agent.id)
                      ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/50'
                      : 'border-[var(--border-color)] hover:border-gray-300 bg-[var(--bg-panel)]'
                  }`}
                  disabled={isDispatching}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[13px] font-bold ${selectedAgents.includes(agent.id) ? 'text-indigo-900' : 'text-[var(--text-main)]'}`}>
                      {agent.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded uppercase tracking-wider">
                    {agent.provider} · {agent.runtimeMode}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--border-color)] mt-4">
          {runtimeError && (
            <div className="mb-3 text-xs font-bold text-red-700 bg-red-50 border border-red-100 rounded-[var(--radius-lg)] p-3">
              {runtimeError}
            </div>
          )}
          {requiresLocalExecDisclosure && (
            <label className="mb-3 flex items-start gap-2 text-xs font-medium text-[var(--text-muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={localExecAcknowledged}
                onChange={(e) => setLocalExecAcknowledged(e.target.checked)}
                disabled={isDispatching}
                className="mt-0.5"
              />
              <span>
                本地执行模式（{runtime.mode}）：任务将在你的桌面 Multica 运行时执行，产物与日志通过后端对账回传。勾选即确认知悉。
              </span>
            </label>
          )}
          <button
            onClick={() => void startDispatch()}
            disabled={isDispatching || selectedAgents.length === 0 || !taskInput.trim() || !canDispatch || (requiresLocalExecDisclosure && !localExecAcknowledged)}
            className={`w-full py-4 rounded-[var(--radius-lg)] flex items-center justify-center font-bold text-[15px] transition-all shadow-sm ${
              isDispatching || selectedAgents.length === 0 || !taskInput.trim() || !canDispatch || (requiresLocalExecDisclosure && !localExecAcknowledged)
                ? 'bg-[var(--bg-panel)] text-[var(--text-muted)] border border-[var(--border-color)] cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-black hover:shadow-md'
            }`}
          >
            {isDispatching ? (
              <>
                <Loader2 className="icon-md mr-2 animate-spin" />
                正在下发任务...
              </>
            ) : (
              <>
                <Send className="icon-md mr-2" />
                开始调度
              </>
            )}
          </button>
        </div>
      </div>

      <div className="w-full md:w-1/2 bg-[var(--bg-panel)] flex flex-col relative h-full">
        <button
          onClick={onClose}
          className="absolute top-[var(--spacing-lg)] right-6 p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-hover)] rounded-full transition-colors hidden md:block"
        >
          <X className="icon-md" />
        </button>
        <div className="p-[var(--spacing-xl)] pb-4">
          <h3 className="text-lg font-black text-[var(--text-main)] mb-1">执行链路追踪</h3>
          <p className="text-sm text-[var(--text-muted)] font-medium">Runtime: {runtime.mode}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-[var(--spacing-xl)] pt-0 custom-scrollbar">
          {selectedAgents.length > 0 ? (
            <div className="space-y-[var(--spacing-md)]">
              {selectedAgents.map((id) => {
                const agent = agents.find((item) => item.id === id);
                if (!agent) return null;
                return (
                  <div key={agent.id} className="bg-[var(--bg-hover)] rounded-[var(--radius-lg)] p-4 border border-[var(--border-color)]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[13px] font-bold text-[var(--text-main)]">{agent.name}</span>
                      {agent.dispatchStatus === 'running' && (
                        <span className="text-[11px] font-bold text-[var(--color-primary)] flex items-center">
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          处理中
                        </span>
                      )}
                      {agent.dispatchStatus === 'completed' && (
                        <span className="text-[11px] font-bold text-[var(--color-success)] flex items-center">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          已下发
                        </span>
                      )}
                      {agent.dispatchStatus === 'failed' && (
                        <span className="text-[11px] font-bold text-red-600 flex items-center">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                          失败
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-[var(--border-color)] rounded-full h-1.5 mb-2 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          agent.dispatchStatus === 'failed'
                            ? 'bg-red-500'
                            : agent.dispatchStatus === 'completed'
                              ? 'bg-[var(--color-success)]'
                              : 'bg-[var(--color-primary)]'
                        }`}
                        style={{ width: `${agent.progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {dispatchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  {dispatchResults.map((task) => (
                    <div
                      key={task.id}
                      className="text-[12px] text-[var(--text-muted)] bg-[var(--bg-hover)] border border-[var(--border-color)] rounded-lg p-2"
                    >
                      {task.title} · {task.status} · {task.externalRef?.issueIdentifier ?? task.id}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
              <AlertTriangle className="icon-xl mb-4 opacity-20" />
              <p className="text-[14px] font-bold">等待任务调度下发</p>
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
