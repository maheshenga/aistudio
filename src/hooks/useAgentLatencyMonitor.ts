import { useEffect, useRef } from 'react';
import { toast } from '../components/Toast';
import { useAgentRuntimeStatus } from '../runtime/useAgentRuntimeStatus';

export function useAgentLatencyMonitor() {
  const { status, error } = useAgentRuntimeStatus();
  const lastAlertKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const alertKey = error
      ? `error:${error}`
      : status && status.health !== 'available'
        ? `${status.mode}:${status.providerKind}:${status.health}:${status.message ?? ''}`
        : null;

    if (!alertKey || lastAlertKeyRef.current === alertKey) return;
    lastAlertKeyRef.current = alertKey;

    const message = error
      ? `Agent runtime status check failed: ${error}`
      : `${status?.label ?? 'Agent runtime'} is ${status?.health ?? 'degraded'}. ${status?.message ?? ''}`.trim();

    toast(message, status?.health === 'auth_expired' || error ? 'error' : 'warning');
    window.dispatchEvent(new CustomEvent('activity_logged', {
      detail: {
        message,
        runtimeMode: status?.mode,
        providerKind: status?.providerKind,
        health: status?.health,
      },
    }));
  }, [error, status]);
}
