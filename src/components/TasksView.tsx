import React, { useEffect, useMemo, useState } from 'react';
import {
  AlignLeft,
  BarChart2,
  Bot,
  CheckCircle2,
  Clock,
  LayoutGrid,
  MoreHorizontal,
  PieChart,
  Play,
  Plus,
  X,
  Zap,
} from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { useAgentRuntimeStatus } from '../runtime/useAgentRuntimeStatus.ts';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import {
  createWorkspaceTask,
  deleteWorkspaceTasks,
  loadWorkspaceTasks,
  saveWorkspaceTasks,
  updateWorkspaceTask,
  type WorkspaceTask,
  type WorkspaceTaskColumn,
  type WorkspaceTaskLifecycleStatus,
} from '../lib/data/taskRepository';
import { useSaasSession } from '../saas/SaasAuthContext';
import { buildPermissionDeniedMetadata, canManageTasks } from '../saas/permissions';

const columns: Array<{ id: WorkspaceTaskColumn; title: string; color: string }> = [
  { id: 'todo', title: '待处理', color: 'bg-gray-100' },
  { id: 'in_progress', title: '进行中', color: 'bg-blue-50' },
  { id: 'auto_exec', title: '自动执行', color: 'bg-purple-50' },
  { id: 'review', title: '待复核', color: 'bg-amber-50' },
  { id: 'done', title: '已完成', color: 'bg-green-50' },
];

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6B7280'];

function getColumnStatus(column: WorkspaceTaskColumn): WorkspaceTaskLifecycleStatus {
  if (column === 'done') return 'completed';
  if (column === 'review') return 'blocked';
  if (column === 'in_progress' || column === 'auto_exec') return 'running';
  return 'queued';
}

function getRuntimeBadge(task: WorkspaceTask) {
  if (!task.runtimeTaskId) return null;
  return `${task.runtimeProviderKind ?? 'runtime'} / ${task.runtimeStatus ?? task.status ?? 'queued'}`;
}

export function TasksView() {
  const { status: runtimeStatus } = useAgentRuntimeStatus();
  const session = useSaasSession();
  const canMutateTasks = canManageTasks(session.membership.role);
  const taskContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'analytics'>('board');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
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

  const analyticsData = useMemo(() => {
    const statusData = columns
      .map((column) => ({
        name: column.title,
        value: tasks.filter((task) => task.column === column.id).length,
      }))
      .filter((item) => item.value > 0);

    const userData = [
      { name: '人工任务', value: tasks.filter((task) => !task.isAuto).length },
      { name: 'Agent 任务', value: tasks.filter((task) => task.isAuto || task.runtimeTaskId).length },
      { name: 'Runtime 任务', value: tasks.filter((task) => task.runtimeTaskId).length },
    ].filter((item) => item.value > 0);

    return { statusData, userData };
  }, [tasks]);

  const refreshTasks = () => setTasks(loadWorkspaceTasks(taskContext));

  const writeTaskAudit = (
    action: 'task_create' | 'task_status_change' | 'task_delete',
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

  const handleAddTask = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTaskTitle.trim()) return;
    if (!canMutateTasks) {
      writeTaskPermissionDenied('task_create', 'task_create', {
        titleConfigured: Boolean(newTaskTitle.trim()),
      });
      setMutationError('当前角色只能查看任务，不能创建任务。');
      return;
    }

    const task = createWorkspaceTask({
      title: newTaskTitle.trim(),
      column: 'todo',
      priority: 'Medium',
      type: 'Manual',
      date: new Date().toISOString(),
      isAuto: false,
      status: 'queued',
      metadata: { source: 'tasks_view' },
    }, taskContext);
    writeTaskAudit('task_create', task, { source: 'tasks_view' });
    refreshTasks();
    setNewTaskTitle('');
    setIsAdding(false);
    setMutationError(null);
  };

  const moveTask = (taskId: string, newCol: WorkspaceTaskColumn) => {
    if (!canMutateTasks) {
      writeTaskPermissionDenied('task_status_change', taskId, { nextColumn: newCol });
      setMutationError('当前角色只能查看任务，不能修改状态。');
      return;
    }

    const existing = tasks.find((task) => task.id === taskId);
    const updated = updateWorkspaceTask(taskId, { column: newCol, status: getColumnStatus(newCol) }, taskContext);
    if (!updated) {
      setMutationError('任务状态更新失败，原状态已保留。');
      return;
    }

    writeTaskAudit('task_status_change', updated, { previousColumn: existing?.column, nextColumn: newCol });
    refreshTasks();
    setMutationError(null);
  };

  const toggleTaskSelection = (taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!canMutateTasks) return;
    setSelectedTaskIds((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]));
  };

  const clearSelection = () => setSelectedTaskIds([]);

  const bulkMoveTasks = (newCol: WorkspaceTaskColumn) => {
    if (!canMutateTasks) {
      writeTaskPermissionDenied('task_status_change', 'task_bulk_move', {
        selectedTaskCount: selectedTaskIds.length,
        nextColumn: newCol,
      });
      return;
    }
    const nextStatus = getColumnStatus(newCol);
    const updatedTasks = tasks.map((task) =>
      selectedTaskIds.includes(task.id)
        ? { ...task, column: newCol, status: nextStatus, updatedAt: Date.now() }
        : task,
    );
    const savedTasks = saveWorkspaceTasks(updatedTasks, taskContext);
    savedTasks
      .filter((task) => selectedTaskIds.includes(task.id))
      .forEach((task) => writeTaskAudit('task_status_change', task, { nextColumn: newCol, bulk: true }));
    setTasks(savedTasks);
    clearSelection();
  };

  const bulkDeleteTasks = () => {
    if (!canMutateTasks) {
      writeTaskPermissionDenied('task_delete', 'task_bulk_delete', {
        selectedTaskCount: selectedTaskIds.length,
      });
      return;
    }
    const deletedTasks = tasks.filter((task) => selectedTaskIds.includes(task.id));
    setTasks(deleteWorkspaceTasks(selectedTaskIds, taskContext));
    deletedTasks.forEach((task) => writeTaskAudit('task_delete', task));
    clearSelection();
  };

  const renderTaskCard = (task: WorkspaceTask, colId: WorkspaceTaskColumn) => {
    const runtimeBadge = getRuntimeBadge(task);
    return (
      <div
        key={task.id}
        onClick={(event) => toggleTaskSelection(task.id, event)}
        className={`bg-[var(--bg-panel)] p-4 shadow-sm rounded-[var(--radius-lg)] transition-all group flex flex-col hover:-translate-y-0.5 hover:shadow-md border ${
          selectedTaskIds.includes(task.id)
            ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10'
            : task.isAuto || task.runtimeTaskId
              ? 'border-blue-200 ring-1 ring-blue-100/50 hover:border-blue-400'
              : 'border-[var(--border-color)] hover:border-gray-300'
        } relative overflow-hidden ${canMutateTasks ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {(task.isAuto || task.runtimeTaskId) && (
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-gray-700 to-gray-900" />
        )}

        <div className="flex justify-between items-start mb-2.5 mt-0.5">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedTaskIds.includes(task.id)}
              onChange={() => {}}
              disabled={!canMutateTasks}
              className="icon-sm rounded border-gray-300 text-[var(--color-primary)] focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
            />
            <span
              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                task.priority === 'High'
                  ? 'bg-[#FCE8E6] text-[#D93025] border-[#FAD2CF]'
                  : task.priority === 'Medium'
                    ? 'bg-[#FEF7E0] text-[#B06000] border-[#FDE293]'
                    : 'bg-gray-100 text-gray-600 border-[var(--border-color)]'
              }`}
            >
              {task.priority}
            </span>
          </div>

          <div className="dropdown relative">
            <button className="text-gray-300 hover:text-gray-600 transition-colors p-1">
              {colId === 'done' ? <CheckCircle2 className="w-[15px] h-[15px] text-[#1E8E3E]" /> : <MoreHorizontal className="w-[15px] h-[15px]" />}
            </button>
            {canMutateTasks && (
              <div className="absolute right-0 top-full mt-1 bg-[var(--bg-panel)] border border-[var(--border-color)] shadow-xl rounded-[var(--radius-lg)] py-1.5 w-36 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                {columns.map((column) => (
                  <button
                    key={column.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      moveTask(task.id, column.id);
                    }}
                    className={`w-full text-left px-4 py-2 text-[13px] font-bold transition-colors ${
                      task.column === column.id ? 'text-[var(--text-main)] bg-gray-100/50' : 'text-gray-700 hover:bg-gray-50 hover:text-[var(--text-main)]'
                    }`}
                  >
                    &rarr; {column.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <h4 className="font-bold text-[var(--text-main)] text-[14px] leading-snug mb-4">{task.title}</h4>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-muted)] mt-auto pt-3 border-t border-[var(--border-color)]">
          <span
            className={`px-2 py-1 rounded-md font-bold border ${
              task.isAuto || task.runtimeTaskId
                ? 'bg-gray-100 border-gray-300 text-[var(--text-main)] flex items-center shadow-sm'
                : 'bg-gray-50 border-[var(--border-color)] text-gray-600'
            }`}
          >
            {(task.isAuto || task.runtimeTaskId) && <Bot className="w-3 h-3 mr-1" />}
            {task.type}
          </span>
          <span className={`flex items-center font-bold ${task.isAuto || task.runtimeTaskId ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
            {task.isAuto || task.runtimeTaskId ? <Play className="w-3 h-3 mr-1 animate-pulse" fill="currentColor" /> : <Clock className="w-3.5 h-3.5 mr-1" />}
            {task.lastRuntimeEventAt ?? task.date}
          </span>
          {runtimeBadge && (
            <span className="w-full rounded border border-indigo-100 bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">
              {runtimeBadge} {task.externalRef?.issueIdentifier ? `/ ${task.externalRef.issueIdentifier}` : ''}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col items-stretch overflow-hidden bg-[var(--bg-app)] p-[var(--spacing-lg)] lg:px-8 animate-in fade-in duration-300 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-[var(--spacing-md)] flex-shrink-0 gap-[var(--spacing-md)] border-b border-[var(--border-color)] pb-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight flex items-center">
            任务中心 <span className="ml-3 bg-gray-100/50 text-[var(--text-main)] text-[10px] uppercase font-black px-2.5 py-0.5 rounded shadow-sm border border-[var(--border-color)]/50">Swarm Dispatcher</span>
          </h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-2 font-medium">与 Task Center 共用同一份 repository-backed 任务状态。</p>
          <div className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] px-3 py-2 inline-flex items-center mt-3">
            Runtime: {runtimeStatus?.mode ?? 'web'} / {runtimeStatus?.health ?? 'available'}
          </div>
          {!canMutateTasks && (
            <div className="text-xs font-bold text-amber-700 mt-2">当前角色可查看任务，但不能创建、移动或删除任务。</div>
          )}
          {mutationError && (
            <div className="text-xs font-bold text-red-700 bg-red-50 border border-red-100 rounded-[var(--radius-lg)] px-3 py-2 mt-2">
              {mutationError}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="text-[13px] font-bold text-gray-600 hover:text-[var(--text-main)] bg-[var(--bg-panel)] border border-[var(--border-color)] px-4 py-2 rounded-[var(--radius-lg)] shadow-sm hover:shadow transition-all hidden md:flex items-center">
            <Bot className="icon-sm mr-1.5 text-[var(--text-main)]" />
            Agent 任务
          </button>
          <div className="flex items-center bg-[var(--bg-panel)] p-1 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-sm">
            <button onClick={() => setViewMode('board')} className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center transition-colors ${viewMode === 'board' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-gray-50'}`}>
              <LayoutGrid className="icon-sm mr-1.5" /> 看板
            </button>
            <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center transition-colors ${viewMode === 'list' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-gray-50'}`}>
              <AlignLeft className="icon-sm mr-1.5" /> 列表
            </button>
            <button onClick={() => setViewMode('analytics')} className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center transition-colors ${viewMode === 'analytics' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-gray-50'}`}>
              <PieChart className="icon-sm mr-1.5" /> 分析
            </button>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            disabled={!canMutateTasks}
            className="bg-[var(--color-primary)] hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-[var(--radius-lg)] flex items-center transition-colors shadow-sm text-[13px] disabled:bg-[var(--bg-panel)] disabled:text-[var(--text-muted)] disabled:border disabled:border-[var(--border-color)]"
          >
            <Plus className="icon-sm mr-1" /> 新建任务
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar">
        {viewMode === 'board' && (
          <div className="flex gap-[var(--spacing-md)] h-full pb-4">
            {columns.map((col) => {
              const colTasks = tasks.filter((task) => task.column === col.id);
              const isAutoCol = col.id === 'auto_exec';

              return (
                <div key={col.id} className={`flex-1 min-w-[280px] w-[320px] max-w-[350px] flex flex-col rounded-[var(--radius-xl)] border ${isAutoCol ? 'bg-[#E8F0FE]/50 border-blue-200' : 'bg-[#F1F3F4] border-transparent'} relative`}>
                  <div className="p-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-black text-[14px] flex items-center text-[var(--text-main)]">
                        {isAutoCol && <Zap className="w-[14px] h-[14px] mr-1.5 text-[var(--text-main)]" fill="currentColor" />}
                        {col.title}
                      </h3>
                      <span className="bg-gray-200/80 text-gray-600 text-[11px] font-black icon-lg flex items-center justify-center rounded-full ml-1">{colTasks.length}</span>
                    </div>
                    <button className="text-gray-400 hover:bg-[var(--bg-panel)] p-1.5 rounded-full transition-colors">
                      <MoreHorizontal className="w-[18px] h-[18px]" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 custom-scrollbar relative">
                    {isAdding && col.id === 'todo' && (
                      <form onSubmit={handleAddTask} className="bg-[var(--bg-panel)] p-4 rounded-[var(--radius-lg)] shadow-md border border-gray-900 animate-in fade-in zoom-in duration-200">
                        <input
                          autoFocus
                          value={newTaskTitle}
                          onChange={(event) => setNewTaskTitle(event.target.value)}
                          placeholder="输入任务标题..."
                          className="w-full text-[13px] font-bold outline-none mb-3 text-[var(--text-main)] placeholder:font-medium placeholder:text-gray-400 focus:ring-0"
                        />
                        <div className="flex justify-end space-x-2">
                          <button type="button" onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-700 font-bold text-xs px-2 py-1">
                            取消
                          </button>
                          <button type="submit" className="bg-[var(--color-primary)] text-white px-3 py-1.5 text-xs font-bold rounded-lg hover:bg-black transition-colors shadow-sm">
                            创建
                          </button>
                        </div>
                      </form>
                    )}

                    {colTasks.map((task) => renderTaskCard(task, col.id))}

                    {col.id === 'todo' && !isAdding && (
                      <button
                        onClick={() => setIsAdding(true)}
                        disabled={!canMutateTasks}
                        className="w-full mt-2 py-2.5 border border-dashed border-gray-300 rounded-[12px] text-[var(--text-muted)] text-[13px] font-bold hover:border-gray-900 hover:text-[var(--text-main)] bg-transparent hover:bg-gray-100/30 transition-all flex justify-center items-center disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Plus className="icon-sm mr-1" /> 添加任务
                      </button>
                    )}
                    {colTasks.length === 0 && !(col.id === 'todo' && isAdding) && (
                      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-color)] bg-[var(--bg-panel)] p-4 text-center text-xs font-bold text-[var(--text-muted)]">
                        暂无任务
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="h-full overflow-y-auto px-2 pb-10 space-y-3">
            {tasks.length === 0 ? (
              <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-color)] bg-[var(--bg-panel)] p-6 text-center">
                <Clock className="icon-lg mx-auto mb-3 text-[var(--text-muted)]" />
                <p className="text-sm font-bold text-[var(--text-main)]">还没有任务</p>
                <p className="text-xs font-medium text-[var(--text-muted)] mt-1">从 Dashboard、Task Center 或 Agent Dispatcher 创建任务后会出现在这里。</p>
              </div>
            ) : (
              tasks.map((task) => renderTaskCard(task, task.column))
            )}
          </div>
        )}

        {viewMode === 'analytics' && (
          <div className="h-full overflow-y-auto px-2 pb-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--spacing-xl)] max-w-5xl">
              <div className="bg-[var(--bg-panel)] p-[var(--spacing-lg)] rounded-[24px] shadow-sm border border-[var(--border-color)] flex flex-col">
                <h3 className="text-[16px] font-bold text-[var(--text-main)] mb-[var(--spacing-md)] flex items-center tracking-tight">
                  <BarChart2 className="w-[18px] h-[18px] mr-2 text-[var(--text-main)]" /> 状态分布
                </h3>
                <div className="h-64 relative flex-1">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
                    <RechartsPieChart>
                      <Pie data={analyticsData.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {analyticsData.statusData.map((entry, index) => (
                          <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[var(--bg-panel)] p-[var(--spacing-lg)] rounded-[24px] shadow-sm border border-[var(--border-color)] flex flex-col">
                <h3 className="text-[16px] font-bold text-[var(--text-main)] mb-[var(--spacing-md)] flex items-center tracking-tight">
                  <BarChart2 className="w-[18px] h-[18px] mr-2 text-[var(--text-main)]" /> 来源分布
                </h3>
                <div className="h-64 relative flex-1">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
                    <RechartsPieChart>
                      <Pie data={analyticsData.userData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {analyticsData.userData.map((entry, index) => (
                          <Cell key={`cell-${entry.name}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedTaskIds.length > 0 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 border border-gray-700 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="flex items-center">
            <span className="bg-[var(--color-primary)] text-white icon-lg rounded-full flex justify-center items-center text-xs font-bold mr-2">{selectedTaskIds.length}</span>
            <span className="text-[13px] font-bold">已选择</span>
          </div>

          <div className="h-4 w-px bg-gray-700" />

          <div className="flex items-center space-x-2">
            <span className="text-gray-400 text-xs font-medium mr-2">移动到</span>
            {columns.map((column) => (
              <button
                key={column.id}
                onClick={() => bulkMoveTasks(column.id)}
                className="text-[12px] font-bold bg-transparent hover:bg-[var(--bg-panel)]/10 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-gray-600"
              >
                {column.title}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-gray-700" />

          <button onClick={bulkDeleteTasks} className="text-red-400 hover:text-red-300 hover:bg-red-900/30 px-3 py-1.5 rounded-lg transition-colors text-[12px] font-bold flex items-center">
            <X className="w-3.5 h-3.5 mr-1" /> 删除
          </button>

          <div className="h-4 w-px bg-gray-700" />

          <button onClick={clearSelection} className="text-gray-400 hover:text-white transition-colors" title="取消选择">
            <X className="icon-md" />
          </button>
        </div>
      )}
    </div>
  );
}
