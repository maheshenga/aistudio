import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeftRight,
  Clock,
  Download,
  LayoutGrid,
  Paintbrush,
  Pin,
  Search,
  Sparkles,
} from 'lucide-react';

import {
  exportAuditLogRows,
  filterAuditLogs,
  listAuditLogs,
  logAuditEvent,
} from '../lib/data/auditLogRepository';
import { useSaasSession } from '../saas/SaasAuthContext';
import type { AuditAction, AuditLog } from '../saas/types';
import type { ModuleId } from '../types';

interface ActivityMetadata {
  moduleId?: ModuleId;
  targetType?: AuditLog['targetType'];
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export function useActivityLogger() {
  const session = useSaasSession();

  const logActivity = (type: AuditAction, description: string, details?: string, options: ActivityMetadata = {}) => {
    try {
      logAuditEvent({
        action: type,
        moduleId: options.moduleId,
        targetType: options.targetType,
        targetId: options.targetId,
        metadata: {
          description,
          details,
          ...options.metadata,
        },
      }, { session });
      window.dispatchEvent(new Event('activity_logged'));
    } catch {}
  };

  return { logActivity };
}

export function ActivityLogsView() {
  const session = useSaasSession();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');
  const [timePeriodFilter, setTimePeriodFilter] = useState('all');

  useEffect(() => {
    const loadLogs = () => {
      try {
        setLogs(listAuditLogs({ workspaceId: session.workspace.id }));
      } catch {}
    };
    loadLogs();

    window.addEventListener('storage', loadLogs);
    window.addEventListener('activity_logged', loadLogs);
    return () => {
      window.removeEventListener('storage', loadLogs);
      window.removeEventListener('activity_logged', loadLogs);
    };
  }, [session.workspace.id]);

  const getIcon = (type: AuditAction) => {
    switch (type) {
      case 'module_switch': return <LayoutGrid className="icon-sm text-blue-500" />;
      case 'split_screen': return <ArrowLeftRight className="icon-sm text-purple-500" />;
      case 'pin_module': return <Pin className="icon-sm text-green-500" />;
      case 'unpin_module': return <Pin className="icon-sm text-red-500" />;
      case 'theme_change': return <Paintbrush className="icon-sm text-amber-500" />;
      case 'ai_command': return <Sparkles className="icon-sm text-indigo-500" />;
      default: return <Activity className="icon-sm text-[var(--text-muted)]" />;
    }
  };

  const now = Date.now();
  const fromByTimePeriod: Record<string, number | undefined> = {
    all: undefined,
    day: now - 24 * 60 * 60 * 1000,
    week: now - 7 * 24 * 60 * 60 * 1000,
    month: now - 30 * 24 * 60 * 60 * 1000,
  };
  const filteredLogs = filterAuditLogs(logs, {
    query: searchQuery,
    moduleId: moduleFilter === 'all' ? 'all' : moduleFilter as ModuleId,
    action: actionFilter === 'all' ? 'all' : actionFilter as AuditAction,
    actorId: actorFilter === 'all' ? undefined : actorFilter,
    targetType: targetTypeFilter === 'all' ? 'all' : targetTypeFilter as AuditLog['targetType'],
    from: fromByTimePeriod[timePeriodFilter],
  });
  const moduleOptions = Array.from(new Set(logs.map((log) => log.moduleId).filter(Boolean))).sort() as string[];
  const actionOptions = Array.from(new Set(logs.map((log) => log.action))).sort();
  const actorOptions = Array.from(
    new Map<string, AuditLog['actor']>(logs.map((log) => [log.actor.id, log.actor])).values(),
  );
  const targetTypeOptions = Array.from(new Set(logs.map((log) => log.targetType))).sort();

  const getDescription = (log: AuditLog) => (
    typeof log.metadata.description === 'string' ? log.metadata.description : log.action
  );

  const getDetails = (log: AuditLog) => {
    if (typeof log.metadata.details === 'string') return log.metadata.details;
    if (typeof log.metadata.operation === 'string') return log.metadata.operation;
    return undefined;
  };

  const handleExportLogs = () => {
    const rows = exportAuditLogRows(filteredLogs);
    const metadataJson = JSON.stringify(rows, null, 2);
    const blob = new Blob([metadataJson], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity_logs_${session.workspace.id}_${Date.now()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    logAuditEvent({
      action: 'export_workspace',
      moduleId: 'activity_logs',
      targetType: 'workspace',
      targetId: session.workspace.id,
      metadata: {
        format: 'audit_log_rows_json',
        exportedLogCount: rows.length,
        moduleFilter,
        actionFilter,
        actorFilter,
        targetTypeFilter,
        timePeriodFilter,
        metadataJson: rows[0]?.metadataJson ?? '{}',
      },
    }, { session });
    window.dispatchEvent(new Event('activity_logged'));
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[var(--bg-app)] p-[var(--spacing-xl)] animate-in fade-in duration-300">
      <div className="flex flex-col gap-[var(--spacing-md)] mb-[var(--spacing-xl)] border-b border-[var(--border-color)] pb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight flex items-center">
              <Activity className="icon-lg mr-3 text-[var(--color-primary)]" />
              Activity Logs
              <span className="ml-3 bg-gray-100/50 text-[var(--text-main)] text-[10px] uppercase font-black px-2.5 py-0.5 rounded shadow-sm border border-[var(--border-color)]/50">Audit Monitor</span>
            </h2>
            <p className="text-[14px] text-[var(--text-muted)] mt-2 font-medium">
              Workspace-scoped audit evidence for operations, settings, runtime, billing, and support review.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportLogs}
            className="px-3 py-2 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white text-sm font-bold flex items-center justify-center"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search audit logs"
              className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--bg-panel)] text-sm font-medium outline-none"
            />
          </div>
          <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} className="px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--bg-panel)] text-sm font-bold">
            <option value="all">All modules</option>
            {moduleOptions.map((moduleId) => <option key={moduleId} value={moduleId}>{moduleId}</option>)}
          </select>
          <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} className="px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--bg-panel)] text-sm font-bold">
            <option value="all">All actions</option>
            {actionOptions.map((action) => <option key={action} value={action}>{action}</option>)}
          </select>
          <select value={actorFilter} onChange={(event) => setActorFilter(event.target.value)} className="px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--bg-panel)] text-sm font-bold">
            <option value="all">All actors</option>
            {actorOptions.map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}
          </select>
          <select value={targetTypeFilter} onChange={(event) => setTargetTypeFilter(event.target.value)} className="px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--bg-panel)] text-sm font-bold">
            <option value="all">All targets</option>
            {targetTypeOptions.map((targetType) => <option key={targetType} value={targetType}>{targetType}</option>)}
          </select>
          <select value={timePeriodFilter} onChange={(event) => setTimePeriodFilter(event.target.value)} className="px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--bg-panel)] text-sm font-bold">
            <option value="all">All time</option>
            <option value="day">Last 24h</option>
            <option value="week">Last 7d</option>
            <option value="month">Last 30d</option>
          </select>
        </div>
      </div>

      <div className="flex-1 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] shadow-sm overflow-hidden flex flex-col">
        {filteredLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
             <Activity className="w-12 h-12 mb-4 opacity-20" />
             <p className="text-[14px] font-bold">No matching audit records</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-[var(--spacing-lg)]">
            <div className="space-y-[var(--spacing-lg)]">
              {filteredLogs.map(log => (
                <div key={log.id} className="flex group">
                  <div className="flex flex-col items-center mr-4">
                    <div className="icon-xl rounded-full bg-gray-50 border border-[var(--border-color)] flex items-center justify-center shadow-sm shrink-0">
                      {getIcon(log.action)}
                    </div>
                    <div className="w-px h-full bg-gray-100 group-last:hidden my-2"></div>
                  </div>
                  <div className="pb-6 min-w-0">
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-[var(--text-main)] mb-1">{getDescription(log)}</span>
                      {getDetails(log) && <span className="text-[13px] text-[var(--text-muted)] line-clamp-2">{getDetails(log)}</span>}
                      <span className="text-[11px] font-bold text-gray-400 flex items-center mt-2 uppercase tracking-wider">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(log.timestamp).toLocaleString()} / {log.actor.name} / {log.targetType} / {log.targetId ?? log.moduleId ?? log.id}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
