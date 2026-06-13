export type RuntimeAuditAction =
  | 'runtime_status_checked'
  | 'daemon_start_requested'
  | 'daemon_stop_requested'
  | 'daemon_restart_requested'
  | 'agent_task_dispatched'
  | 'agent_task_cancel_requested'
  | 'runtime_auth_expired'
  | 'runtime_compatibility_warning';

export interface RuntimeAuditEvent {
  action: RuntimeAuditAction;
  runtimeMode: string;
  providerKind: string;
  targetId?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
  occurredAt: string;
}

const STORAGE_KEY = 'aistudio_runtime_audit_events';

function canUseLocalStorage() {
  return (
    typeof localStorage !== 'undefined' &&
    typeof localStorage.getItem === 'function' &&
    typeof localStorage.setItem === 'function'
  );
}

export function recordRuntimeAuditEvent(event: Omit<RuntimeAuditEvent, 'occurredAt'>): RuntimeAuditEvent {
  const next: RuntimeAuditEvent = {
    ...event,
    occurredAt: new Date().toISOString(),
  };

  if (canUseLocalStorage()) {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as RuntimeAuditEvent[];
    localStorage.setItem(STORAGE_KEY, JSON.stringify([next, ...existing].slice(0, 200)));
  }

  if (
    typeof window !== 'undefined' &&
    typeof window.dispatchEvent === 'function' &&
    typeof CustomEvent !== 'undefined'
  ) {
    window.dispatchEvent(new CustomEvent('AISTUDIO_RUNTIME_AUDIT', { detail: next }));
  }

  return next;
}

export function readRuntimeAuditEvents(): RuntimeAuditEvent[] {
  if (!canUseLocalStorage()) return [];
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as RuntimeAuditEvent[];
}
