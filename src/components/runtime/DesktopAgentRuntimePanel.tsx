import { AlertTriangle, CheckCircle2, Loader2, MonitorCog, Play, RotateCcw, Server, Square } from 'lucide-react';
import { useState } from 'react';

import { RuntimeCapabilityError } from '../../runtime/agentRuntimeTypes.ts';
import { useAgentRuntime } from '../../runtime/AgentRuntimeContext.tsx';
import { runDesktopRuntimeAction } from '../../runtime/desktopRuntimeActions.ts';
import { useAgentRuntimeStatus } from '../../runtime/useAgentRuntimeStatus.ts';

function healthLabel(health: string) {
  switch (health) {
    case 'available':
      return '可用';
    case 'degraded':
      return '降级';
    case 'offline':
      return '离线';
    case 'auth_expired':
      return '需要重新登录';
    case 'incompatible':
      return '版本不兼容';
    default:
      return '未知';
  }
}

export function DesktopAgentRuntimePanel() {
  const provider = useAgentRuntime();
  const { status, isLoading, error, refresh } = useAgentRuntimeStatus();
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (action: 'start' | 'stop' | 'restart') => {
    setActionError(null);
    try {
      if (!status?.bridgeAvailable) {
        throw new RuntimeCapabilityError(
          'DESKTOP_BRIDGE_UNAVAILABLE',
          '当前环境没有桌面桥接，无法控制本机 daemon。',
        );
      }
      await runDesktopRuntimeAction(action);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '桌面运行时操作失败。');
    }
  };

  return (
    <section className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)] flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center">
            <MonitorCog className="icon-md mr-2 text-indigo-600" />
            Desktop Agent Runtime
          </h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Web 模式独立运行，桌面模式可连接 Multica 本地 daemon。
          </p>
        </div>
        <span className="text-xs font-bold px-2 py-1 rounded-md bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-main)]">
          {status ? healthLabel(status.health) : '读取中'}
        </span>
      </div>

      <div className="p-[var(--spacing-xl)] space-y-5">
        {isLoading && (
          <div className="flex items-center text-sm text-[var(--text-muted)]">
            <Loader2 className="icon-sm mr-2 animate-spin" />
            正在读取运行时状态
          </div>
        )}

        {(error || actionError || status?.compatibilityWarning) && (
          <div className="flex items-start text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-[var(--radius-lg)] p-3">
            <AlertTriangle className="icon-sm mr-2 mt-0.5 shrink-0" />
            <span>{error || actionError || status?.compatibilityWarning}</span>
          </div>
        )}

        {status && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--bg-hover)] border border-[var(--border-color)]">
              <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Mode</div>
              <div className="font-bold text-[var(--text-main)] mt-1">{status.mode}</div>
            </div>
            <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--bg-hover)] border border-[var(--border-color)]">
              <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Daemon</div>
              <div className="font-bold text-[var(--text-main)] mt-1">{status.daemonState ?? 'not detected'}</div>
            </div>
            <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--bg-hover)] border border-[var(--border-color)]">
              <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Providers</div>
              <div className="font-bold text-[var(--text-main)] mt-1">{status.cliProviders.join(', ') || 'web'}</div>
            </div>
            <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--bg-hover)] border border-[var(--border-color)]">
              <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Server</div>
              <div className="font-bold text-[var(--text-main)] mt-1 flex items-center">
                <Server className="icon-sm mr-1" />
                {status.serverUrl ?? 'not configured'}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {status?.bridgeAvailable && (
            <>
              <button
                type="button"
                onClick={() => void runAction('start')}
                className="px-3 py-2 rounded-[var(--radius-lg)] bg-gray-900 text-white text-sm font-bold flex items-center"
              >
                <Play className="icon-sm mr-1.5" />
                Start
              </button>
              <button
                type="button"
                onClick={() => void runAction('stop')}
                className="px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] text-sm font-bold flex items-center"
              >
                <Square className="icon-sm mr-1.5" />
                Stop
              </button>
              <button
                type="button"
                onClick={() => void runAction('restart')}
                className="px-3 py-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] text-sm font-bold flex items-center"
              >
                <RotateCcw className="icon-sm mr-1.5" />
                Restart
              </button>
            </>
          )}
          {!status?.bridgeAvailable && provider.mode !== 'web' && (
            <div className="text-sm text-[var(--text-muted)] flex items-center">
              <AlertTriangle className="icon-sm mr-1.5 text-amber-600" />
              Desktop daemon controls appear after the Multica desktop bridge is detected.
            </div>
          )}
          {provider.mode === 'web' && (
            <div className="text-sm text-[var(--text-muted)] flex items-center">
              <CheckCircle2 className="icon-sm mr-1.5 text-green-600" />
              当前是 Web SaaS 模式，桌面运行时为可选能力。
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
