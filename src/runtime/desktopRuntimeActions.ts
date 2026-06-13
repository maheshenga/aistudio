import { detectDesktopAgentBridge } from './desktopAgentBridge.ts';
import { recordRuntimeAuditEvent } from './runtimeAudit.ts';

export async function runDesktopRuntimeAction(action: 'start' | 'stop' | 'restart') {
  const bridge = detectDesktopAgentBridge();
  if (!bridge) throw new Error('当前环境没有桌面桥接，无法控制本机 daemon。');

  const result =
    action === 'start'
      ? await bridge.startDaemon()
      : action === 'stop'
        ? await bridge.stopDaemon()
        : await bridge.restartDaemon();

  recordRuntimeAuditEvent({
    action:
      action === 'start'
        ? 'daemon_start_requested'
        : action === 'stop'
          ? 'daemon_stop_requested'
          : 'daemon_restart_requested',
    runtimeMode: 'desktop_multica',
    providerKind: 'multica',
  });

  return result;
}
