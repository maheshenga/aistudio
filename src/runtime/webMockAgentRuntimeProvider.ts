import type {
  AgentRuntimeProvider,
  AgentSummary,
  AgentTask,
  AgentTaskEvent,
  CreateAgentTaskInput,
  RuntimeStatus,
  TaskQuery,
  Unsubscribe,
} from './agentRuntimeTypes.ts';
import { recordRuntimeAuditEvent } from './runtimeAudit.ts';

const nowIso = () => new Date().toISOString();

const MOCK_AGENTS: AgentSummary[] = [
  {
    id: 'mock-global-agent',
    name: 'Web Cloud Agent',
    role: 'SaaS assistant',
    provider: 'web',
    runtimeMode: 'mock',
    status: 'idle',
    maxConcurrentTasks: 4,
    source: 'mock',
  },
  {
    id: 'mock-copy-agent',
    name: 'Copywriting Agent',
    role: 'Copy and campaign generation',
    provider: 'web',
    runtimeMode: 'mock',
    status: 'idle',
    maxConcurrentTasks: 2,
    source: 'mock',
  },
];

export function createWebMockAgentRuntimeProvider(): AgentRuntimeProvider {
  const tasks = new Map<string, AgentTask>();
  const runtimeListeners = new Set<(status: RuntimeStatus) => void>();
  const taskListeners = new Map<string, Set<(event: AgentTaskEvent) => void>>();
  const taskTimers = new Map<string, Array<ReturnType<typeof setTimeout>>>();

  const baseStatus: RuntimeStatus = {
    mode: 'web',
    providerKind: 'mock',
    health: 'available',
    label: 'Web SaaS Runtime',
    message: 'Standalone Web mode is available. Desktop Agent Runtime is optional.',
    bridgeAvailable: false,
    runtimeCount: 1,
    cliProviders: ['web'],
    capabilities: ['runtime_status', 'list_agents', 'list_tasks', 'create_task', 'cancel_task', 'task_events'],
    lastHeartbeatAt: nowIso(),
  };

  const runtimeSnapshot = (): RuntimeStatus => ({ ...baseStatus, lastHeartbeatAt: nowIso() });

  const emitRuntime = () => {
    const next = runtimeSnapshot();
    for (const listener of runtimeListeners) listener(next);
  };

  const emitTask = (event: AgentTaskEvent) => {
    const listeners = taskListeners.get(event.taskId);
    if (!listeners) return;
    for (const listener of listeners) listener(event);
  };

  const clearTaskTimers = (taskId: string) => {
    const timers = taskTimers.get(taskId);
    if (!timers) return;
    for (const timer of timers) clearTimeout(timer);
    taskTimers.delete(taskId);
  };

  const updateTaskStatus = (
    taskId: string,
    patch: Pick<AgentTask, 'status'> & Partial<Pick<AgentTask, 'progress' | 'error'>>,
    message: string,
  ) => {
    const existing = tasks.get(taskId);
    if (!existing) return null;
    const updatedAt = nowIso();
    const updated: AgentTask = {
      ...existing,
      ...patch,
      updatedAt,
    };
    tasks.set(taskId, updated);
    emitTask({
      taskId,
      status: updated.status,
      progress: updated.progress,
      message,
      occurredAt: updatedAt,
    });
    emitRuntime();
    return updated;
  };

  const scheduleTaskLifecycle = (taskId: string) => {
    clearTaskTimers(taskId);
    const timers = [
      setTimeout(() => {
        const task = tasks.get(taskId);
        if (!task || task.status !== 'queued') return;
        updateTaskStatus(taskId, { status: 'running', progress: 50 }, 'Mock task is running in Web SaaS mode.');
      }, 25),
      setTimeout(() => {
        const task = tasks.get(taskId);
        if (!task || task.status === 'cancelled') return;
        updateTaskStatus(taskId, { status: 'succeeded', progress: 100 }, 'Mock task completed in Web SaaS mode.');
        clearTaskTimers(taskId);
      }, 50),
    ];
    taskTimers.set(taskId, timers);
  };

  return {
    mode: 'web',
    providerKind: 'mock',
    async getRuntimeStatus() {
      return runtimeSnapshot();
    },
    async listAgents() {
      return MOCK_AGENTS.map((agent) => ({ ...agent }));
    },
    async listTasks(params?: TaskQuery) {
      return [...tasks.values()].filter((task) => {
        if (params?.status && task.status !== params.status) return false;
        if (params?.agentId && task.agentId !== params.agentId) return false;
        if (params?.runtimeId && task.runtimeId !== params.runtimeId) return false;
        return true;
      });
    },
    async createTask(input: CreateAgentTaskInput) {
      const timestamp = nowIso();
      const task: AgentTask = {
        id: `mock-task-${Date.now()}`,
        title: input.title,
        description: input.description,
        status: 'queued',
        agentId: input.agentId ?? MOCK_AGENTS[0]!.id,
        runtimeId: 'mock-web-runtime',
        progress: 0,
        source: 'mock',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      tasks.set(task.id, task);
      recordRuntimeAuditEvent({
        action: 'agent_task_dispatched',
        runtimeMode: 'web',
        providerKind: 'mock',
        targetId: task.id,
        metadata: {
          agentId: task.agentId,
          priority: input.priority ?? 'medium',
        },
      });
      emitRuntime();
      emitTask({
        taskId: task.id,
        status: task.status,
        progress: 0,
        message: 'Mock task queued in Web SaaS mode.',
        occurredAt: timestamp,
      });
      scheduleTaskLifecycle(task.id);
      return task;
    },
    async cancelTask(taskId: string) {
      const existing = tasks.get(taskId);
      if (!existing) return;
      clearTaskTimers(taskId);
      const updated = updateTaskStatus(taskId, { status: 'cancelled', progress: 100 }, 'Mock task cancelled.');
      recordRuntimeAuditEvent({
        action: 'agent_task_cancel_requested',
        runtimeMode: 'web',
        providerKind: 'mock',
        targetId: taskId,
      });
      if (!updated) return;
    },
    subscribeToTask(taskId: string, cb: (event: AgentTaskEvent) => void): Unsubscribe {
      const listeners = taskListeners.get(taskId) ?? new Set<(event: AgentTaskEvent) => void>();
      listeners.add(cb);
      taskListeners.set(taskId, listeners);
      return () => listeners.delete(cb);
    },
    subscribeToRuntime(cb: (status: RuntimeStatus) => void): Unsubscribe {
      runtimeListeners.add(cb);
      cb(runtimeSnapshot());
      return () => runtimeListeners.delete(cb);
    },
  };
}
