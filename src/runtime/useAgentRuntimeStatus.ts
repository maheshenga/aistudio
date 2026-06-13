import { useEffect, useState } from 'react';

import type { RuntimeStatus } from './agentRuntimeTypes.ts';
import { useAgentRuntime } from './AgentRuntimeContext.tsx';

export function useAgentRuntimeStatus() {
  const provider = useAgentRuntime();
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      try {
        const next = await provider.getRuntimeStatus();
        if (!isMounted) return;
        setStatus(next);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Unable to read runtime status.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void load();
    const unsubscribe = provider.subscribeToRuntime((next) => {
      if (!isMounted) return;
      setStatus(next);
      setIsLoading(false);
      setError(null);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [provider]);

  return {
    status,
    isLoading,
    error,
    refresh: async () => {
      const next = await provider.getRuntimeStatus();
      setStatus(next);
      return next;
    },
  };
}
