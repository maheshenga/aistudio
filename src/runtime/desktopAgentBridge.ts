import type { RawMulticaDaemonStatus, Unsubscribe } from './agentRuntimeTypes.ts';

export interface BridgeActionResult {
  success: boolean;
  error?: string;
}

export interface DesktopAgentBridge {
  isAvailable(): boolean;
  getDaemonStatus(): Promise<RawMulticaDaemonStatus>;
  startDaemon(): Promise<BridgeActionResult>;
  stopDaemon(): Promise<BridgeActionResult>;
  restartDaemon(): Promise<BridgeActionResult>;
  streamDaemonLogs(cb: (line: string) => void): Unsubscribe;
  subscribeToDaemonStatus(cb: (status: RawMulticaDaemonStatus) => void): Unsubscribe;
  syncAuthToken(token: string, userId: string): Promise<void>;
  setTargetApiUrl(url: string): Promise<void>;
}

interface MulticaDaemonApi {
  start(): Promise<BridgeActionResult>;
  stop(): Promise<BridgeActionResult>;
  restart(): Promise<BridgeActionResult>;
  getStatus(): Promise<RawMulticaDaemonStatus>;
  onStatusChange(cb: (status: RawMulticaDaemonStatus) => void): Unsubscribe;
  syncToken(token: string, userId: string): Promise<void>;
  setTargetApiUrl(url: string): Promise<void>;
  startLogStream(): void;
  stopLogStream(): void;
  onLogLine(cb: (line: string) => void): Unsubscribe;
}

interface WindowWithDaemonApi {
  daemonAPI?: Partial<MulticaDaemonApi>;
}

function readWindow(): WindowWithDaemonApi | null {
  const maybeWindow = (globalThis as { window?: unknown }).window;
  if (!maybeWindow || typeof maybeWindow !== 'object') return null;
  return maybeWindow as WindowWithDaemonApi;
}

function hasBridgeApi(api: Partial<MulticaDaemonApi> | undefined): api is MulticaDaemonApi {
  return Boolean(
    api &&
      typeof api.start === 'function' &&
      typeof api.stop === 'function' &&
      typeof api.restart === 'function' &&
      typeof api.getStatus === 'function' &&
      typeof api.onStatusChange === 'function' &&
      typeof api.syncToken === 'function' &&
      typeof api.setTargetApiUrl === 'function' &&
      typeof api.startLogStream === 'function' &&
      typeof api.stopLogStream === 'function' &&
      typeof api.onLogLine === 'function',
  );
}

export function detectDesktopAgentBridge(): DesktopAgentBridge | null {
  const api = readWindow()?.daemonAPI;
  if (!hasBridgeApi(api)) return null;

  return {
    isAvailable: () => true,
    getDaemonStatus: () => api.getStatus(),
    startDaemon: () => api.start(),
    stopDaemon: () => api.stop(),
    restartDaemon: () => api.restart(),
    streamDaemonLogs: (cb) => {
      api.startLogStream();
      const unsubscribe = api.onLogLine(cb);
      return () => {
        unsubscribe();
        api.stopLogStream();
      };
    },
    subscribeToDaemonStatus: (cb) => api.onStatusChange(cb),
    syncAuthToken: (token, userId) => api.syncToken(token, userId),
    setTargetApiUrl: (url) => api.setTargetApiUrl(url),
  };
}
