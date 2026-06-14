import type { DataBackendResult, DataBackendError, DataBackendErrorCode } from './dataBackend';

export interface ApiClient {
  configured: boolean;
  get<T = unknown>(workspaceId: string, path: string): Promise<DataBackendResult<T | null>>;
  post<T = unknown>(workspaceId: string, path: string, body: unknown): Promise<DataBackendResult<T>>;
  patch<T = unknown>(workspaceId: string, path: string, body: unknown): Promise<DataBackendResult<T>>;
  del<T = unknown>(workspaceId: string, path: string): Promise<DataBackendResult<T>>;
}

function readApiUrl(): string | undefined {
  try { return (import.meta as any).env?.VITE_DATA_API_URL || undefined; } catch { return undefined; }
}
function fail(code: DataBackendErrorCode, message: string): DataBackendResult<never> {
  return { ok: false, error: { code, message } as DataBackendError };
}

export interface AuthHooks {
  getAccess: () => string | null;
  onRefresh: () => Promise<string | null>;
  onAuthFailure: () => void;
}

export function createApiClient(
  baseUrl: string | undefined = readApiUrl(),
  fetcher: typeof fetch = fetch,
  authHooks?: AuthHooks,
): ApiClient {
  const configured = Boolean(baseUrl);
  const url = (workspaceId: string, path: string) =>
    `${baseUrl!.replace(/\/+$/, '')}/workspaces/${encodeURIComponent(workspaceId)}/${path}`;

  async function doFetch(method: string, fullUrl: string, body: unknown, accessToken: string | null) {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    return fetcher(fullUrl, {
      method,
      headers: Object.keys(headers).length ? headers : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async function send<T>(method: string, workspaceId: string, path: string, body?: unknown): Promise<DataBackendResult<T | null>> {
    if (!configured) return fail('backend_unconfigured', 'VITE_DATA_API_URL is not configured.');
    const fullUrl = url(workspaceId, path);
    try {
      let res = await doFetch(method, fullUrl, body, authHooks?.getAccess() ?? null);
      if (res.status === 401 && authHooks) {
        const newAccess = await authHooks.onRefresh();
        if (!newAccess) { authHooks.onAuthFailure(); return fail('unauthenticated', 'Session expired'); }
        res = await doFetch(method, fullUrl, body, newAccess);
        if (res.status === 401) { authHooks.onAuthFailure(); return fail('unauthenticated', 'Session expired'); }
      }
      if (res.status === 404) return { ok: true, value: null };
      let payload: any = null;
      try { payload = await res.json(); } catch { /* tolerate empty */ }
      if (!res.ok) {
        const code: DataBackendErrorCode = payload?.error?.code ?? (res.status === 403 ? 'permission_denied' : 'network_error');
        return fail(code, payload?.error?.message ?? `Request failed with status ${res.status}.`);
      }
      return { ok: true, value: (payload && 'value' in payload ? payload.value : payload) as T };
    } catch (e) {
      return fail('network_error', e instanceof Error ? e.message : String(e));
    }
  }

  return {
    configured,
    get: (ws, path) => send('GET', ws, path),
    post: (ws, path, body) => send('POST', ws, path, body) as any,
    patch: (ws, path, body) => send('PATCH', ws, path, body) as any,
    del: (ws, path) => send('DELETE', ws, path) as any,
  };
}

export const apiClient = createApiClient();
