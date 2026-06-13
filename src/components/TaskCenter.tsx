import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Tag,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';

import { toast } from './Toast';
import { useAgentRuntime } from '../runtime/AgentRuntimeContext.tsx';
import { useAgentRuntimeStatus } from '../runtime/useAgentRuntimeStatus.ts';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import {
  deleteWorkspaceTasks,
  loadWorkspaceTasks,
  updateWorkspaceTask,
  type WorkspaceTask,
  type WorkspaceTaskColumn,
  type WorkspaceTaskLifecycleStatus,
} from '../lib/data/taskRepository';
import { useSaasSession } from '../saas/SaasAuthContext';
import { buildPermissionDeniedMetadata, canManageTasks } from '../saas/permissions';

interface TaskCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const TASK_COLUMNS: Array<{ id: WorkspaceTaskColumn; title: string; color: string }> = [
  { id: 'todo', title: '待处理', color: 'text-[var(--text-muted)]' },
  { id: 'in_progress', title: '进行中', color: 'text-blue-500' },
  { id: 'auto_exec', title: '自动执行', color: 'text-purple-500' },
  { id: 'review', title: '待复核', color: 'text-amber-500' },
  { id: 'done', title: '已完成', color: 'text-green-500' },
];

const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };

function getColumnStatus(column: WorkspaceTaskColumn): WorkspaceTaskLifecycleStatus {
  if (column === 'done') return 'completed';
  if (column === 'review') return 'blocked';
  if (column === 'in_progress' || column === 'auto_exec') return 'running';
  return 'queued';
}

function getPriorityColor(priority: string) {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'text-rose-600 bg-rose-50 border-rose-100';
    case 'medium':
      return 'text-[var(--color-primary)] bg-blue-50 border-blue-100';
    case 'low':
      return 'text-teal-600 bg-teal-50 border-teal-100';
    default:
      return 'text-gray-600 bg-gray-50 border-[var(--border-color)]';
  }
}

function getPriorityLabel(priority: string) {
  switch (priority.toLowerCase()) {
    case 'high':
      return '高优';
    case 'medium':
      return '中优';
    case 'low':
      return '低优';
    default:
      return '普通';
  }
}

function getTaskTime(task: WorkspaceTask) {
  return task.lastRuntimeEventAt ?? task.date ?? new Date(task.updatedAt).toLocaleString();
}

function getSortableTime(task: WorkspaceTask) {
  const parsed = Date.parse(task.lastRuntimeEventAt ?? task.date);
  return Number.isNaN(parsed) ? task.updatedAt : parsed;
}

function isRuntimeActive(task: WorkspaceTask) {
  return task.runtimeStatus === 'queued' || task.runtimeStatus === 'running' || task.status === 'queued' || task.status === 'running';
}

function getRuntimeBadge(task: WorkspaceTask) {
  if (!task.runtimeTaskId) return null;
  return `${task.runtimeProviderKind ?? 'runtime'} / ${task.runtimeStatus ?? task.status ?? 'queued'}`;
}

export function TaskCenter({ isOpen, onClose }: TaskCenterProps) {
  const runtime = useAgentRuntime();
  const { status: runtimeStatus } = useAgentRuntimeStatus();
  const session = useSaasSession();
  const canMutateTasks = canManageTasks(session.membership.role);
  const taskContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority'>('dueDate');
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    const loadTasks = () => setTasks(loadWorkspaceTasks(taskContext));
    const handleTasksUpdated = (event: Event) => {
      const workspaceId = (event as CustomEvent<{ workspaceId?: string }>).detail?.workspaceId;
      if (workspaceId && workspaceId !== taskContext.workspaceId) return;
      loadTasks();
    };

    loadTasks();
    window.addEventListener('tasks_updated', handleTasksUpdated);
    return () => window.removeEventListener('tasks_updated', handleTasksUpdated);
  }, [taskContext]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (sortBy === 'priority') {
        const diff = (priorityWeight[b.priority.toLowerCase()] ?? 0) - (priorityWeight[a.priority.toLowerCase()] ?? 0);
        if (diff !== 0) return diff;
      }
      return getSortableTime(b) - getSortableTime(a);
    });
  }, [sortBy, tasks]);

  const activeRuntimeTasks = sortedTasks.filter(isRuntimeActive);
  const openTasks = sortedTasks.filter((task) => task.column !== 'done' && !isRuntimeActive(task));
  const archivedTasks = sortedTasks.filter((task) => task.column === 'done' || task.status === 'completed' || task.status === 'cancelled');

  const writeTaskAudit = (
    action: 'task_assign' | 'task_cancel' | 'task_delete' | 'task_status_change',
    task: WorkspaceTask,
    metadata: Record<string, unknown> = {},
  ) => {
    logAuditEvent({
      action,
      moduleId: 'tasks',
      targetType: 'task',
      targetId: task.id,
      metadata: {
        title: task.title,
        column: task.column,
        status: task.status,
        runtimeTaskId: task.runtimeTaskId,
        runtimeProviderKind: task.runtimeProviderKind,
        runtimeStatus: task.runtimeStatus,
        ...metadata,
      },
    }, { session });
  };

  const writeTaskPermissionDenied = (
    operation: string,
    targetId = 'task_mutation',
    metadata: Record<string, unknown> = {},
  ) => {
    logAuditEvent({
      action: 'permission_denied',
      moduleId: 'tasks',
      targetType: 'task',
      targetId,
      metadata: {
        ...buildPermissionDeniedMetadata({
          role: session.membership.role,
          permission: 'tasks.manage',
          operation,
          moduleId: 'tasks',
        }),
        ...metadata,
      },
    }, { session });
    window.dispatchEvent(new Event('activity_logged'));
  };

  const refreshTasks = () => setTasks(loadWorkspaceTasks(taskContext));

  const updateTaskColumn = (task: WorkspaceTask, column: WorkspaceTaskColumn) => {
    if (!canMutateTasks) {
      writeTaskPermissionDenied('task_status_change', task.id, {
        title: task.title,
        previousColumn: task.column,
        nextColumn: column,
      });
      setMutationError('当前角色只能查看任务，不能修改状态。');
      return;
    }

    const updatedTask = updateWorkspaceTask(task.id, { column, status: getColumnStatus(column) }, taskContext);
    if (!updatedTask) {
      setMutationError('任务状态更新失败，原状态已保留。');
      return;
    }

    writeTaskAudit('task_status_change', updatedTask, { previousColumn: task.column, nextColumn: column });
    setMutationError(null);
    refreshTasks();
  };

  const handleDragStart = (event: React.DragEvent, taskId: string) => {
    if (!canMutateTasks) return;
    setDraggedTaskId(taskId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (event: React.DragEvent) => {
    if (!canMutateTasks) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event: React.DragEvent, column: WorkspaceTaskColumn) => {
    event.preventDefault();
    const task = tasks.find((item) => item.id === draggedTaskId);
    if (task) updateTaskColumn(task, column);
    setDraggedTaskId(null);
  };

  const toggleSelection = (taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!canMutateTasks) return;
    setSelectedTasks((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]));
  };

  const handleDeleteSelectedTasks = () => {
    if (!canMutateTasks) {
      writeTaskPermissionDenied('task_delete', 'task_bulk_delete', {
        selectedTaskCount: selectedTasks.length,
      });
      setMutationError('当前角色只能查看任务，不能删除任务。');
      return;
    }

    const deletedTasks = tasks.filter((task) => selectedTasks.includes(task.id));
    setTasks(deleteWorkspaceTasks(selectedTasks, taskContext));
    deletedTasks.forEach((task) => writeTaskAudit('task_delete', task));
    toast(`已删除 ${deletedTasks.length} 个任务`, 'success');
    setSelectedTasks([]);
  };

  const handleAssignSelectedTasks = () => {
    const selected = tasks.filter((task) => selectedTasks.includes(task.id));
    selected.forEach((task) => writeTaskAudit('task_assign', task, { assignee: session.user.id }));
    toast(`已指派 ${selected.length} 个任务`, 'success');
    setSelectedTasks([]);
  };

  const handleCancelRuntimeTask = async (task: WorkspaceTask) => {
    if (!canMutateTasks) {
      writeTaskPermissionDenied('task_cancel', task.id, { runtimeTaskId: task.runtimeTaskId });
      return;
    }
    if (!task.runtimeTaskId) return;
    try {
      await runtime.cancelTask(task.runtimeTaskId);
      const cancelledTask = updateWorkspaceTask(
        task.id,
        {
          column: 'review',
          status: 'cancelled',
          runtimeStatus: 'cancelled',
          lastRuntimeEventAt: new Date().toISOString(),
        },
        taskContext,
      );
      if (!cancelledTask) throw new Error('Task update failed');
      writeTaskAudit('task_cancel', cancelledTask, { runtimeTaskId: task.runtimeTaskId });
      refreshTasks();
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : '取消 runtime 任务失败，原状态已保留。');
    }
  };

  const renderTaskCard = (task: WorkspaceTask) => {
    const runtimeBadge = getRuntimeBadge(task);
    return (
      <div
        key={task.id}
        draggable={canMutateTasks}
        onDragStart={(event) => handleDragStart(event, task.id)}
        className={`bg-[var(--bg-panel)] border ${
          draggedTaskId === task.id ? 'border-blue-400 opacity-50 shadow-none scale-95' : 'border-[var(--border-color)] shadow-sm hover:shadow-md'
        } rounded-[var(--radius-lg)] p-3 transition-all ${canMutateTasks ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
      >
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="flex items-center min-w-0">
            <button
              type="button"
              onClick={(event) => toggleSelection(task.id, event)}
              disabled={!canMutateTasks}
              className={`w-4 h-4 mr-2 rounded border flex items-center justify-center transition-colors ${
                selectedTasks.includes(task.id) ? 'bg-[var(--color-primary)] border-blue-600 shadow-sm' : 'border-gray-300 bg-white hover:border-blue-400'
              } ${canMutateTasks ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
              title={canMutateTasks ? '选择任务' : '当前角色无任务修改权限'}
            >
              {selectedTasks.includes(task.id) && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </button>
            <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded tracking-wider uppercase border border-purple-100 truncate">
              {task.type}
            </span>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getPriorityColor(task.priority)} uppercase tracking-wider`}>
            {getPriorityLabel(task.priority)}
          </span>
        </div>
        <h4 className="text-[13px] font-bold text-[var(--text-main)] leading-tight mb-2">{task.title}</h4>
        <div className="flex flex-wrap gap-2 text-[11px] text-[var(--text-muted)] font-medium">
          <span>ID: {task.id}</span>
          <span>{getTaskTime(task)}</span>
          {runtimeBadge && (
            <span className="inline-flex items-center rounded border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
              <Bot className="w-3 h-3 mr-1" />
              {runtimeBadge}
            </span>
          )}
          {task.externalRef?.issueIdentifier && (
            <span className="inline-flex rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
              {task.externalRef.issueIdentifier}
            </span>
          )}
        </div>
        {task.runtimeTaskId && isRuntimeActive(task) && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => void handleCancelRuntimeTask(task)}
              disabled={!canMutateTasks}
              className="text-[11px] font-bold text-red-600 disabled:text-[var(--text-muted)] disabled:cursor-not-allowed"
            >
              取消 runtime 任务
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderKanbanColumn = (columnId: WorkspaceTaskColumn, title: string, color: string) => {
    const ColumnIcon = columnId === 'todo' ? Clock : columnId === 'done' ? CheckCircle2 : columnId === 'review' ? AlertCircle : Loader2;
    const columnTasks = tasks.filter((task) => task.column === columnId);
    return (
      <div
        className="flex-1 min-w-[260px] bg-gray-50/50 rounded-[var(--radius-xl)] flex flex-col h-full border border-[var(--border-color)] overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={(event) => handleDrop(event, columnId)}
      >
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-panel)] shadow-sm flex items-center justify-between">
          <h3 className="font-black text-[var(--text-main)] flex items-center tracking-wide text-sm">
            <ColumnIcon className={`icon-sm mr-2 ${color} ${columnId === 'in_progress' || columnId === 'auto_exec' ? 'animate-spin' : ''}`} />
            {title}
          </h3>
          <span className="bg-gray-100 text-gray-600 text-[11px] font-bold px-2 py-0.5 rounded-full">{columnTasks.length}</span>
        </div>
        <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
          {columnTasks.map(renderTaskCard)}
          {columnTasks.length === 0 && (
            <div className="h-24 flex items-center justify-center text-gray-400 border-2 border-dashed border-[var(--border-color)] rounded-[var(--radius-lg)] text-xs font-medium">
              {canMutateTasks ? '拖拽任务到这里' : '暂无任务'}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderListSection = (title: string, sectionTasks: WorkspaceTask[], icon: React.ReactNode) => (
    <section className="space-y-[var(--spacing-md)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-[var(--text-main)] flex items-center tracking-wide">
          {icon}
          {title} ({sectionTasks.length})
        </h3>
      </div>
      <div className="space-y-3">
        {sectionTasks.length > 0 ? (
          sectionTasks.map(renderTaskCard)
        ) : (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-color)] bg-[var(--bg-panel)] p-4 text-sm font-bold text-[var(--text-muted)]">
            暂无记录
          </div>
        )}
      </div>
    </section>
  );

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] transition-opacity" onClick={onClose} />}
      <div
        className={`fixed inset-y-0 right-0 ${
          viewMode === 'kanban' ? 'w-[1000px]' : 'w-[480px]'
        } max-w-[calc(100vw-1rem)] bg-[var(--bg-app)] shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5 lg:p-[var(--spacing-lg)] border-b border-[var(--border-color)] bg-[var(--bg-panel)] shadow-sm z-10">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight flex items-center">
                任务调度中心
                <span className="ml-2 bg-emerald-50 text-emerald-700 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wide border border-emerald-100">
                  {runtimeStatus?.mode ?? 'web'} / {runtimeStatus?.health ?? 'available'}
                </span>
              </h2>
              <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Repository-backed task state shared with Tasks View</p>
              {!canMutateTasks && (
                <p className="text-xs font-bold text-amber-700 mt-2">当前角色可查看任务，但不能修改状态或删除任务。</p>
              )}
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[var(--bg-panel)] shadow-sm text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              >
                列表
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-[var(--bg-panel)] shadow-sm text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              >
                看板
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
            <X className="icon-md" />
          </button>
        </div>

        {mutationError && (
          <div className="mx-5 mt-4 rounded-[var(--radius-lg)] border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
            {mutationError}
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col p-5 lg:p-[var(--spacing-lg)]">
          {viewMode === 'kanban' ? (
            <div className="flex-1 flex flex-col min-w-0">
              {selectedTasks.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-[var(--radius-lg)] flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center text-sm font-bold text-blue-800">
                    <CheckCircle2 className="w-4 h-4 mr-2 text-blue-600" />
                    {selectedTasks.length} 个任务已选择
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        toast(`已为 ${selectedTasks.length} 个任务添加标签`, 'success');
                        setSelectedTasks([]);
                      }}
                      className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-md text-xs font-bold transition-colors flex items-center"
                    >
                      <Tag className="w-3.5 h-3.5 mr-1" /> Label
                    </button>
                    <button
                      onClick={handleAssignSelectedTasks}
                      className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-md text-xs font-bold transition-colors flex items-center"
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1" /> Assign
                    </button>
                    <button
                      onClick={handleDeleteSelectedTasks}
                      className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-md text-xs font-bold transition-colors flex items-center"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </button>
                  </div>
                </div>
              )}
              <div className="flex-1 flex gap-[var(--spacing-md)] overflow-x-auto min-w-0">
                {TASK_COLUMNS.map((column) => renderKanbanColumn(column.id, column.title, column.color))}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar bg-[var(--bg-app)] -m-5 p-5">
              <div className="flex justify-end">
                <button
                  onClick={() => setSortBy(sortBy === 'dueDate' ? 'priority' : 'dueDate')}
                  className="flex items-center text-[11px] text-gray-600 hover:text-[var(--text-main)] font-bold bg-[var(--bg-panel)] border border-[var(--border-color)] shadow-sm px-2 py-1 rounded-md transition-colors"
                >
                  <ArrowUpDown className="w-3 h-3 mr-1" />
                  {sortBy === 'dueDate' ? '优先级排序' : '时间排序'}
                </button>
              </div>
              {renderListSection('运行中', activeRuntimeTasks, <Loader2 className="icon-sm text-blue-500 mr-2 animate-spin" />)}
              {renderListSection('计划与待办', openTasks, <Clock className="icon-sm text-purple-500 mr-2" />)}
              {renderListSection('近期归档记录', archivedTasks, <CheckCircle2 className="icon-sm text-gray-400 mr-2" />)}
              {tasks.length === 0 && (
                <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-color)] bg-[var(--bg-panel)] p-6 text-center">
                  <Play className="icon-lg mx-auto mb-3 text-[var(--text-muted)]" />
                  <p className="text-sm font-bold text-[var(--text-main)]">还没有任务</p>
                  <p className="text-xs font-medium text-[var(--text-muted)] mt-1">从 Dashboard、Tasks View 或 Agent Dispatcher 创建任务后会出现在这里。</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
