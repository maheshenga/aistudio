import type { StorageLike } from '../../saas/localAuthSession';
import type {
  AgentTask,
  AgentTaskStatus,
  RuntimeMode,
  RuntimeProviderKind,
} from '../../runtime/agentRuntimeTypes';
import { getRepositoryStorage } from './dataBackend';

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
    externalRef: task.externalRef,
    lastRuntimeEventAt: task.lastRuntimeEventAt,
    metadata,
    createdAt: task.createdAt ?? now,
    updatedAt: task.updatedAt ?? now,
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
  return updatedTask;
}

export function deleteWorkspaceTasks(taskIds: string[], context: TaskRepositoryContext): WorkspaceTask[] {
  const taskIdSet = new Set(taskIds);
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
