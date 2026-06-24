import type { ApiClient } from '../lib/data/apiClient.ts';
import type { AgentRuntimeProvider, AgentTask } from './agentRuntimeTypes.ts';

export interface DispatchTaskInput {
  type: string;
  input: Record<string, unknown>;
  runtimeMode: string;
  projectId?: string;
  agentId?: string;
  providerKind?: string;
}

export interface DispatchTaskResult {
  jobId: string;
  job: Record<string, unknown>;
  externalTaskId?: string;
}

export interface OrchestrationServiceOptions {
  apiClient: ApiClient;
  workspaceId: string;
  getProvider: () => Pick<AgentRuntimeProvider, 'cancelTask'>;
}

export interface OrchestrationService {
  dispatchTask(input: DispatchTaskInput, task: Pick<AgentTask, 'externalRef'>): Promise<DispatchTaskResult>;
  cancelTask(jobId: string, externalTaskId?: string): Promise<void>;
  retryTask(jobId: string): Promise<void>;
}

function extractExternalTaskId(task: { externalRef?: { taskId?: string; issueId?: string } }): string | undefined {
  return task.externalRef?.taskId ?? task.externalRef?.issueId;
}

export function createOrchestrationService(options: OrchestrationServiceOptions): OrchestrationService {
  const { apiClient, workspaceId, getProvider } = options;

  return {
    async dispatchTask(input, task) {
      const dispatched = await apiClient.post<{ job: { id: string } }>(workspaceId, 'orchestration/dispatch', {
        type: input.type, input: input.input, runtimeMode: input.runtimeMode,
        projectId: input.projectId, agentId: input.agentId, providerKind: input.providerKind,
      });
      if (!dispatched.ok) {
        const failure = dispatched as { ok: false; error: { code: string; message: string } };
        const err = new Error(failure.error.message) as Error & { code?: string };
        err.code = failure.error.code;
        throw err;
      }
      if (!dispatched.value) throw new Error('dispatch failed');
      const job = dispatched.value.job;
      const jobId = job.id;
      // task 已由调用方(modal)通过 provider.createTask 创建,这里只绑定外部任务,避免重复创建
      const externalTaskId = extractExternalTaskId(task);
      if (externalTaskId) {
        await apiClient.post(workspaceId, `orchestration/jobs/${jobId}/link-external`, { externalTaskId });
      }
      return { jobId, job, externalTaskId };
    },

    async cancelTask(jobId, externalTaskId) {
      if (externalTaskId) {
        try { await getProvider().cancelTask(externalTaskId); } catch { /* 直连取消失败不阻塞后端意图 */ }
      }
      await apiClient.post(workspaceId, `orchestration/jobs/${jobId}/cancel`, {});
    },

    async retryTask(jobId) {
      await apiClient.post(workspaceId, `orchestration/jobs/${jobId}/retry`, {});
    },
  };
}
