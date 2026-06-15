import type { ApiClient } from '../lib/data/apiClient.ts';
import type { AgentRuntimeProvider } from './agentRuntimeTypes.ts';

export interface DispatchTaskInput {
  type: string;
  input: Record<string, unknown>;
  runtimeMode: string;
  title: string;
  description: string;
  projectId?: string;
  agentId?: string;
  providerKind?: string;
}

export interface DispatchTaskResult {
  jobId: string;
  externalTaskId?: string;
}

export interface OrchestrationServiceOptions {
  apiClient: ApiClient;
  workspaceId: string;
  getProvider: () => Pick<AgentRuntimeProvider, 'createTask' | 'cancelTask'>;
}

export interface OrchestrationService {
  dispatchTask(input: DispatchTaskInput): Promise<DispatchTaskResult>;
  cancelTask(jobId: string, externalTaskId?: string): Promise<void>;
  retryTask(jobId: string): Promise<void>;
}

function extractExternalTaskId(task: { externalRef?: { taskId?: string; issueId?: string } }): string | undefined {
  return task.externalRef?.taskId ?? task.externalRef?.issueId;
}

export function createOrchestrationService(options: OrchestrationServiceOptions): OrchestrationService {
  const { apiClient, workspaceId, getProvider } = options;

  return {
    async dispatchTask(input) {
      const dispatched = await apiClient.post<{ job: { id: string } }>(workspaceId, 'orchestration/dispatch', {
        type: input.type, input: input.input, runtimeMode: input.runtimeMode,
        projectId: input.projectId, agentId: input.agentId, providerKind: input.providerKind,
      });
      if (!dispatched.ok || !dispatched.value) throw new Error('dispatch failed');
      const jobId = dispatched.value.job.id;

      const task = await getProvider().createTask({
        title: input.title, description: input.description, agentId: input.agentId,
      });
      const externalTaskId = extractExternalTaskId(task);

      if (externalTaskId) {
        await apiClient.post(workspaceId, `orchestration/jobs/${jobId}/link-external`, { externalTaskId });
      }
      return { jobId, externalTaskId };
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
