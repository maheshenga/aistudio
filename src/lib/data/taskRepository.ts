import type { StorageLike } from '../../saas/localAuthSession';
import type {
  AgentTask,
  AgentTaskStatus,
  RuntimeMode,
  RuntimeProviderKind,
} from '../../runtime/agentRuntimeTypes';
import { getRepositoryStorage } from './dataBackend';
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';

export type WorkspaceTaskColumn = 'todo' | 'in_progress' | 'auto_exec' | 'review' | 'done';
export type WorkspaceTaskPriority = 'High' | 'Medium' | 'Low';
export type WorkspaceTaskLifecycleStatus = 'queued' | 'running' | 'blocked' | 'completed' | 'cancelled';

export interface WorkspaceTask {
  id: string;
  workspaceId: string;
  title: string;
  column: WorkspaceTaskColumn;
  priority: WorkspaceTaskPriority;
  type: string;
  date: string;
  isAuto: boolean;
  status?: WorkspaceTaskLifecycleStatus;
  runtimeMode?: RuntimeMode;
  runtimeProviderKind?: RuntimeProviderKind;
  runtimeTaskId?: string;
  runtimeStatus?: AgentTaskStatus;
  agentId?: string;
  runtimeId?: string;
  externalRef?: AgentTask['externalRef'];
  lastRuntimeEventAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export type WorkspaceTaskInput = Pick<WorkspaceTask, 'title' | 'column' | 'priority' | 'type' | 'date' | 'isAuto'> &
  Partial<Pick<
    WorkspaceTask,
    | 'status'
    | 'runtimeMode'
    | 'runtimeProviderKind'
    | 'runtimeTaskId'
    | 'runtimeStatus'
    | 'agentId'
    | 'runtimeId'
    | 'externalRef'
    | 'lastRuntimeEventAt'
    | 'metadata'
  >>;

export interface TaskRepositoryContext {
  workspaceId: string;
  storage?: StorageLike | null;
  now?: number;
}

export const TASK_STORAGE_PREFIX = 'aistudio_workspace_tasks';

function storageKey(context: TaskRepositoryContext): string {
  return `${TASK_STORAGE_PREFIX}:${context.workspaceId}`;
}

function toTimestamp(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return fallback;
}

function normalizeTask(task: WorkspaceTask, context: TaskRepositoryContext): WorkspaceTask {
  const now = context.now ?? Date.now();
  const metadata = task.metadata && typeof task.metadata === 'object' ? task.metadata : undefined;
  return {
    ...task,
    id: String(task.id),
    workspaceId: context.workspaceId,
    column: task.column,
    priority: task.priority,
    status: task.status,
    runtimeMode: task.runtimeMode,
    runtimeProviderKind: task.runtimeProviderKind,
    runtimeTaskId: task.runtimeTaskId ? String(task.runtimeTaskId) : undefined,
    runtimeStatus: task.runtimeStatus,
    agentId: task.agentId ? String(task.agentId) : undefined,
    runtimeId: task.runtimeId ? String(task.runtimeId) : undefined,
    externalRef: typeof task.externalRef === 'string'
      ? (() => { try { return JSON.parse(task.externalRef as unknown as string); } catch { return task.externalRef; } })()
      : task.externalRef,
    lastRuntimeEventAt: task.lastRuntimeEventAt,
    metadata,
    createdAt: toTimestamp(task.createdAt, now),
    updatedAt: toTimestamp(task.updatedAt, now),
  };
}

function readTasks(context: TaskRepositoryContext): WorkspaceTask[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(storageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((task) => normalizeTask(task as WorkspaceTask, context));
  } catch {
    return [];
  }
}

function writeTasks(tasks: WorkspaceTask[], context: TaskRepositoryContext): WorkspaceTask[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = tasks.map((task) => normalizeTask(task, context));
  storage?.setItem(storageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('tasks_updated', { detail: { workspaceId: context.workspaceId } }));
  }
  return normalized;
}

export function loadWorkspaceTasks(context: TaskRepositoryContext): WorkspaceTask[] {
  if (taskApiClient.configured) return taskCache.get(context.workspaceId) ?? [];
  return readTasks(context);
}

export function saveWorkspaceTasks(tasks: WorkspaceTask[], context: TaskRepositoryContext): WorkspaceTask[] {
  return writeTasks(tasks, context);
}

export function createWorkspaceTask(input: WorkspaceTaskInput, context: TaskRepositoryContext): WorkspaceTask {
  const now = context.now ?? Date.now();
  const task: WorkspaceTask = {
    id: `task_${now}_${Math.random().toString(36).slice(2, 8)}`,
    workspaceId: context.workspaceId,
    title: input.title,
    column: input.column,
    priority: input.priority,
    type: input.type,
    date: input.date,
    isAuto: input.isAuto,
    status: input.status,
    runtimeMode: input.runtimeMode,
    runtimeProviderKind: input.runtimeProviderKind,
    runtimeTaskId: input.runtimeTaskId,
    runtimeStatus: input.runtimeStatus,
    agentId: input.agentId,
    runtimeId: input.runtimeId,
    externalRef: input.externalRef,
    lastRuntimeEventAt: input.lastRuntimeEventAt,
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  };

  writeTasks([...readTasks(context), task], context);
  if (taskApiClient.configured) {
    taskCache.set(context.workspaceId, [...(taskCache.get(context.workspaceId) ?? []), task]);
    void taskApiClient.post(context.workspaceId, 'tasks', {
      id: task.id, title: task.title, column: task.column, priority: task.priority, type: task.type,
      date: task.date, isAuto: task.isAuto, status: task.status, runtimeMode: task.runtimeMode,
      runtimeProviderKind: task.runtimeProviderKind, runtimeTaskId: task.runtimeTaskId,
      runtimeStatus: task.runtimeStatus, agentId: task.agentId, runtimeId: task.runtimeId,
      externalRef: task.externalRef === undefined ? undefined : JSON.stringify(task.externalRef),
      lastRuntimeEventAt: task.lastRuntimeEventAt, metadata: task.metadata,
    }).then((r) => { if (!r.ok) console.error('createWorkspaceTask write-through failed', r); })
      .catch((e) => console.error('createWorkspaceTask write-through failed', e));
  }
  return task;
}

export function updateWorkspaceTask(
  taskId: string,
  patch: Partial<Omit<WorkspaceTask, 'id' | 'workspaceId' | 'createdAt'>>,
  context: TaskRepositoryContext,
): WorkspaceTask | null {
  const now = context.now ?? Date.now();
  let updatedTask: WorkspaceTask | null = null;
  const updatedTasks = readTasks(context).map((task) => {
    if (task.id !== taskId) return task;
    updatedTask = normalizeTask({ ...task, ...patch, updatedAt: now }, context);
    return updatedTask;
  });

  writeTasks(updatedTasks, context);
  if (taskApiClient.configured && updatedTask) {
    const u: WorkspaceTask = updatedTask;
    taskCache.set(context.workspaceId, (taskCache.get(context.workspaceId) ?? []).map((t) => (t.id === u.id ? u : t)));
    void taskApiClient.patch(context.workspaceId, `tasks/${u.id}`, {
      title: u.title, column: u.column, priority: u.priority, type: u.type, date: u.date, isAuto: u.isAuto,
      status: u.status, runtimeMode: u.runtimeMode, runtimeProviderKind: u.runtimeProviderKind,
      runtimeTaskId: u.runtimeTaskId, runtimeStatus: u.runtimeStatus, agentId: u.agentId, runtimeId: u.runtimeId,
      externalRef: u.externalRef === undefined ? undefined : JSON.stringify(u.externalRef),
      lastRuntimeEventAt: u.lastRuntimeEventAt, metadata: u.metadata,
    }).then((r) => { if (!r.ok) console.error('updateWorkspaceTask write-through failed', r); })
      .catch((e) => console.error('updateWorkspaceTask write-through failed', e));
  }
  return updatedTask;
}

export function deleteWorkspaceTasks(taskIds: string[], context: TaskRepositoryContext): WorkspaceTask[] {
  const taskIdSet = new Set(taskIds);
  if (taskApiClient.configured) {
    const next = (taskCache.get(context.workspaceId) ?? []).filter((task) => !taskIdSet.has(task.id));
    taskCache.set(context.workspaceId, next);
    for (const id of taskIds) {
      void taskApiClient.del(context.workspaceId, `tasks/${id}`)
        .then((r) => { if (!r.ok) console.error('deleteWorkspaceTasks write-through failed', r); })
        .catch((e) => console.error('deleteWorkspaceTasks write-through failed', e));
    }
    return next;
  }
  return writeTasks(readTasks(context).filter((task) => !taskIdSet.has(task.id)), context);
}

export function calculateTaskCompletion(tasks: WorkspaceTask[]) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.column === 'done').length;
  return {
    total,
    completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

let taskApiClient: ApiClient = defaultApiClient;
export function __setTaskApiClientForTest(client: ApiClient): void { taskApiClient = client; }

const taskCache = new Map<string, WorkspaceTask[]>(); // key = workspaceId

export async function hydrateWorkspaceTasks(context: TaskRepositoryContext): Promise<void> {
  if (!taskApiClient.configured) return;
  const res = await taskApiClient.get<{ items: WorkspaceTask[]; nextCursor: string | null }>(
    context.workspaceId, 'tasks');
  if (res.ok && res.value && Array.isArray(res.value.items)) {
    taskCache.set(context.workspaceId, res.value.items.map((t) => normalizeTask(t as WorkspaceTask, context)));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('tasks_updated', { detail: { workspaceId: context.workspaceId } }));
    }
  }
}
