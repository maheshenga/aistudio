export const MULTICA_SERVER_CLIENT = 'MULTICA_SERVER_CLIENT';

export type CanonicalTaskStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface MulticaTaskSnapshot {
  status: CanonicalTaskStatus;
  progress?: number;
  currentStep?: string;
  raw: Record<string, unknown>;
}

export interface MulticaArtifact {
  id?: string;
  url?: string;
  kind?: string;
  [k: string]: unknown;
}

export interface MulticaServerClient {
  getTask(externalTaskId: string): Promise<MulticaTaskSnapshot>;
  getArtifacts(externalTaskId: string): Promise<MulticaArtifact[]>;
}

export interface MulticaServerClientOptions {
  apiUrl?: string;
  token?: string;
  fetchImpl?: typeof fetch;
}

const TERMINAL: Record<string, CanonicalTaskStatus> = {
  completed: 'succeeded', succeeded: 'succeeded', success: 'succeeded',
  failed: 'failed', error: 'failed',
  cancelled: 'cancelled', canceled: 'cancelled',
};
const PENDING = new Set(['queued', 'pending', 'created', 'scheduled']);

export function mapMulticaTaskStatus(raw: string): CanonicalTaskStatus {
  const k = String(raw ?? '').toLowerCase();
  if (TERMINAL[k]) return TERMINAL[k];
  if (PENDING.has(k)) return 'pending';
  return 'running'; // in_progress/running/unknown 非终态 → running
}

function headers(token?: string): Record<string, string> {
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function parse(res: Response, endpoint: string): Promise<unknown> {
  if (!res.ok) throw new Error(`${endpoint} failed with ${res.status} ${res.statusText}`);
  if (res.status === 204) return undefined;
  return res.json();
}

export function createMulticaServerClient(options: MulticaServerClientOptions): MulticaServerClient | null {
  const apiUrl = options.apiUrl?.replace(/\/+$/, '');
  if (!apiUrl) return null;
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    async getTask(externalTaskId) {
      const res = await fetchImpl(`${apiUrl}/api/tasks/${encodeURIComponent(externalTaskId)}`, { headers: headers(options.token) });
      const body = (await parse(res, 'GET /api/tasks/:id')) as Record<string, unknown>;
      const progressRaw = body.progress;
      const stepRaw = body.current_step ?? body.currentStep;
      return {
        status: mapMulticaTaskStatus(String(body.status ?? '')),
        progress: typeof progressRaw === 'number' ? progressRaw : undefined,
        currentStep: typeof stepRaw === 'string' ? stepRaw : undefined,
        raw: body,
      };
    },
    async getArtifacts(externalTaskId) {
      const res = await fetchImpl(`${apiUrl}/api/tasks/${encodeURIComponent(externalTaskId)}/artifacts`, { headers: headers(options.token) });
      const body = (await parse(res, 'GET /api/tasks/:id/artifacts')) as { artifacts?: MulticaArtifact[] };
      return Array.isArray(body?.artifacts) ? body.artifacts : [];
    },
  };
}
