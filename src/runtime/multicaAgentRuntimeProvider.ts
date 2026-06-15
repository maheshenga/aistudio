import type {
  AgentRuntimeProvider,
  AgentSummary,
  AgentTask,
  AgentTaskEvent,
  CreateAgentTaskInput,
  RuntimeMode,
  RuntimeStatus,
  TaskQuery,
  Unsubscribe,
} from './agentRuntimeTypes.ts';
import { RuntimeCapabilityError } from './agentRuntimeTypes.ts';
import type { DesktopAgentBridge } from './desktopAgentBridge.ts';
import { createMulticaApiClient, type MulticaApiClient } from './multicaApiClient.ts';
import {
  mapDaemonStatusToRuntimeStatus,
  mapMulticaAgentToAgentSummary,
  mapMulticaIssueToAgentTask,
  type MulticaAgentLike,
  type MulticaIssueLike,
} from './multicaMappers.ts';
import { recordRuntimeAuditEvent } from './runtimeAudit.ts';
import type { RuntimeEnvironment } from './runtimeMode.ts';

export interface MulticaRuntimeProviderOptions {
  mode: Exclude<RuntimeMode, 'web'>;
  env: RuntimeEnvironment;
  bridge?: DesktopAgentBridge | null;
  apiClient?: MulticaApiClient;
  // ③: 列任务走后端真相源(注入,默认空)
  listJobs?: () => Promise<AgentTask[]>;
  // ③: 实时进度走直连 WS(注入工厂便于测试,默认用全局 WebSocket)
  wsFactory?: (url: string) => { addEventListener: (type: string, cb: (e: { data: string }) => void) => void; close: () => void };
}

interface MulticaRuntimeLike {
  provider?: unknown;
  launch_header?: unknown;
  status?: unknown;
}

function runtimeProviderName(runtime: MulticaRuntimeLike): string | null {
  const value = runtime.provider ?? runtime.launch_header;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function createMulticaAgentRuntimeProvider(options: MulticaRuntimeProviderOptions): AgentRuntimeProvider {
  const client =
    options.apiClient ??
    createMulticaApiClient({
      apiUrl: options.env.multicaApiUrl ?? 'http://127.0.0.1:3000',
      token: options.env.multicaToken,
    });
  const runtimeListeners = new Set<(status: RuntimeStatus) => void>();
  const taskListeners = new Map<string, Set<(event: AgentTaskEvent) => void>>();

  const getStatusWithoutBridge = (): RuntimeStatus => ({
    mode: options.mode,
    providerKind: 'multica',
    health: options.env.multicaApiUrl ? 'degraded' : 'offline',
    label: options.mode === 'self_hosted_multica' ? 'Self-hosted Multica Runtime' : 'Desktop Agent Runtime',
    message: options.env.multicaApiUrl
      ? 'Multica API is configured. Desktop daemon bridge is not available in this surface.'
      : 'Multica API is not configured.',
    serverUrl: options.env.multicaApiUrl,
    wsUrl: options.env.multicaWsUrl,
    appUrl: options.env.multicaAppUrl,
    bridgeAvailable: false,
    runtimeCount: 0,
    cliProviders: [],
    capabilities: ['runtime_status', 'list_agents', 'list_tasks'],
    lastHeartbeatAt: new Date().toISOString(),
  });

  const shouldReadRuntimeList = () => Boolean(options.env.multicaApiUrl);

  const applyRuntimeList = async (status: RuntimeStatus): Promise<RuntimeStatus> => {
    if (!shouldReadRuntimeList()) return status;

    try {
      const runtimes = (await client.listRuntimes(options.env.multicaWorkspaceId, 'me')) as MulticaRuntimeLike[];
      const providers = runtimes.map(runtimeProviderName).filter((provider): provider is string => Boolean(provider));
      const mergedProviders = [...new Set([...status.cliProviders, ...providers])];
      return {
        ...status,
        health:
          options.mode === 'self_hosted_multica' && runtimes.length > 0
            ? 'available'
            : status.health,
        runtimeCount: Math.max(status.runtimeCount, runtimes.length),
        cliProviders: mergedProviders,
        message:
          runtimes.length > 0
            ? `${status.message} Multica reports ${runtimes.length} runtime(s).`
            : status.message,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to read Multica runtimes.';
      recordRuntimeAuditEvent({
        action: 'runtime_compatibility_warning',
        runtimeMode: options.mode,
        providerKind: 'multica',
        metadata: { message },
      });
      return {
        ...status,
        health: status.health === 'auth_expired' ? 'auth_expired' : 'degraded',
        compatibilityWarning: message,
      };
    }
  };

  const emitRuntime = async () => {
    const status = await provider.getRuntimeStatus();
    for (const listener of runtimeListeners) listener(status);
  };

  const provider: AgentRuntimeProvider = {
    mode: options.mode,
    providerKind: 'multica',
    async getRuntimeStatus() {
      recordRuntimeAuditEvent({
        action: 'runtime_status_checked',
        runtimeMode: options.mode,
        providerKind: 'multica',
      });

      if (!options.bridge) return applyRuntimeList(getStatusWithoutBridge());

      try {
        const daemonStatus = await options.bridge.getDaemonStatus();
        const status = mapDaemonStatusToRuntimeStatus(daemonStatus);
        if (status.health === 'auth_expired') {
          recordRuntimeAuditEvent({
            action: 'runtime_auth_expired',
            runtimeMode: options.mode,
            providerKind: 'multica',
          });
        }
        return applyRuntimeList({
          ...status,
          mode: options.mode,
          serverUrl: daemonStatus.serverUrl ?? options.env.multicaApiUrl,
          wsUrl: options.env.multicaWsUrl,
          appUrl: options.env.multicaAppUrl,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to read Multica daemon status.';
        recordRuntimeAuditEvent({
          action: 'runtime_compatibility_warning',
          runtimeMode: options.mode,
          providerKind: 'multica',
          metadata: { message },
        });
        return applyRuntimeList({
          ...getStatusWithoutBridge(),
          health: 'degraded',
          compatibilityWarning: message,
        });
      }
    },
    async listAgents(): Promise<AgentSummary[]> {
      const agents = await client.listAgents(options.env.multicaWorkspaceId);
      return agents.map((agent) => mapMulticaAgentToAgentSummary(agent as MulticaAgentLike));
    },
    async listTasks(_params?: TaskQuery): Promise<AgentTask[]> {
      // 列任务从后端 GenerationJob 真相源读(注入);未注入则空
      return options.listJobs ? options.listJobs() : [];
    },
    async createTask(input: CreateAgentTaskInput): Promise<AgentTask> {
      if (!input.agentId) {
        throw new RuntimeCapabilityError(
          'TASK_DISPATCH_UNAVAILABLE',
          'Choose a Multica agent before dispatching a desktop task.',
        );
      }

      const issue = await client.createIssue({
        title: input.title,
        description: input.description,
        assignee_type: 'agent',
        assignee_id: input.agentId,
        priority: input.priority === 'high' ? 'high' : input.priority === 'low' ? 'low' : 'medium',
      });

      recordRuntimeAuditEvent({
        action: 'agent_task_dispatched',
        runtimeMode: options.mode,
        providerKind: 'multica',
        targetId: String(issue.id ?? ''),
        metadata: {
          agentId: input.agentId,
          priority: input.priority ?? 'medium',
        },
      });

      await emitRuntime();
      return mapMulticaIssueToAgentTask(issue as unknown as MulticaIssueLike);
    },
    async cancelTask(taskId: string): Promise<void> {
      const rawTaskId = taskId.replace(/^multica-task-/, '');
      await client.cancelTask(rawTaskId);
      recordRuntimeAuditEvent({
        action: 'agent_task_cancel_requested',
        runtimeMode: options.mode,
        providerKind: 'multica',
        targetId: taskId,
      });

      const listeners = taskListeners.get(taskId);
      if (listeners) {
        for (const listener of listeners) {
          listener({
            taskId,
            status: 'cancelled',
            message: 'Multica task cancellation requested.',
            occurredAt: new Date().toISOString(),
          });
        }
      }
      await emitRuntime();
    },
    subscribeToTask(taskId: string, cb: (event: AgentTaskEvent) => void): Unsubscribe {
      const listeners = taskListeners.get(taskId) ?? new Set<(event: AgentTaskEvent) => void>();
      listeners.add(cb);
      taskListeners.set(taskId, listeners);

      // 接真实 WS:有 wsUrl 时连直连流,逐行回调
      let socket: { close: () => void } | null = null;
      const wsBase = options.env.multicaWsUrl;
      if (wsBase) {
        const rawId = taskId.replace(/^multica-task-/, '');
        const url = `${wsBase.replace(/\/+$/, '')}/tasks/${encodeURIComponent(rawId)}`;
        const factory = options.wsFactory ?? ((u: string) => new WebSocket(u) as unknown as { addEventListener: (t: string, c: (e: { data: string }) => void) => void; close: () => void });
        try {
          const ws = factory(url);
          ws.addEventListener('message', (e: { data: string }) => {
            try {
              const payload = JSON.parse(e.data) as { status?: string; progress?: number; message?: string };
              cb({
                taskId,
                status: (payload.status as AgentTaskEvent['status']) ?? 'running',
                progress: payload.progress,
                message: payload.message,
                occurredAt: new Date().toISOString(),
              });
            } catch { /* 忽略坏帧 */ }
          });
          socket = ws;
        } catch { /* WS 不可用降级为仅本地回调 */ }
      }

      return () => {
        listeners.delete(cb);
        socket?.close();
      };
    },
    subscribeToRuntime(cb: (status: RuntimeStatus) => void): Unsubscribe {
      runtimeListeners.add(cb);
      const bridgeUnsubscribe = options.bridge?.subscribeToDaemonStatus(() => {
        void emitRuntime();
      });
      void emitRuntime();
      return () => {
        runtimeListeners.delete(cb);
        bridgeUnsubscribe?.();
      };
    },
  };

  return provider;
}
