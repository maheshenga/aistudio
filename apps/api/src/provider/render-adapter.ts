import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  CanonicalTaskStatus,
  ProviderAdapter,
  ProviderArtifact,
  ProviderCallbackVerification,
  ProviderJobContext,
  ProviderSubmitResult,
  ProviderTaskSnapshot,
} from './provider-adapter';

/**
 * AIGEN-5 / R03-1/2/4/5: generic async render adapter for long-running media
 * (video / remix / director). On submit it POSTs to an external render API and
 * stores the returned task id; the vendor later POSTs a signed completion
 * callback that the callback controller verifies and finalizes. Also supports
 * polling for the reconcile safety net.
 *
 * Signature scheme: HMAC-SHA256 over `${timestamp}.${rawBody}`, sent as
 *   X-Provider-Signature: t=<unix_seconds>,v1=<hex>
 * with a configurable tolerance window to bound replay.
 */

const SIG_TOLERANCE_MS = Number(process.env.PROVIDER_CALLBACK_TOLERANCE_MS ?? 5 * 60 * 1000);

const TERMINAL: Record<string, CanonicalTaskStatus> = {
  completed: 'succeeded', succeeded: 'succeeded', success: 'succeeded',
  failed: 'failed', error: 'failed', cancelled: 'cancelled', canceled: 'cancelled',
};
const PENDING = new Set(['queued', 'pending', 'created', 'scheduled']);

function mapStatus(raw: string): CanonicalTaskStatus {
  const k = String(raw ?? '').toLowerCase();
  if (TERMINAL[k]) return TERMINAL[k];
  if (PENDING.has(k)) return 'pending';
  return 'running';
}

export interface RenderAdapterOptions {
  kind: string;
  apiUrl: string;
  token?: string;
  secret?: string;
  /** Injectable clock for tests; returns epoch ms. */
  now?: () => number;
  fetchImpl?: typeof fetch;
}

function headers(token?: string): Record<string, string> {
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export function createRenderAdapter(options: RenderAdapterOptions): ProviderAdapter {
  const apiUrl = options.apiUrl.replace(/\/+$/, '');
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => Date.now());

  function verify(rawBody: string, hdrs: Record<string, string | undefined>): ProviderCallbackVerification {
    if (!options.secret) return { ok: false, reason: 'no signing secret configured' };
    const header = hdrs['x-provider-signature'] ?? hdrs['X-Provider-Signature'];
    if (!header) return { ok: false, reason: 'missing signature header' };
    const parts = Object.fromEntries(header.split(',').map((kv) => kv.trim().split('=', 2) as [string, string]));
    const ts = Number(parts.t);
    const provided = parts.v1;
    if (!Number.isFinite(ts) || !provided) return { ok: false, reason: 'malformed signature' };
    if (Math.abs(now() - ts * 1000) > SIG_TOLERANCE_MS) return { ok: false, reason: 'signature timestamp outside tolerance' };
    const expected = createHmac('sha256', options.secret).update(`${ts}.${rawBody}`).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'signature mismatch' };
    let externalEventId: string | undefined;
    try { externalEventId = (JSON.parse(rawBody) as { eventId?: string; id?: string }).eventId ?? undefined; } catch { /* ignore */ }
    return { ok: true, externalEventId };
  }

  return {
    kind: options.kind,
    synchronous: false,
    async submit(job: ProviderJobContext): Promise<ProviderSubmitResult> {
      const res = await fetchImpl(`${apiUrl}/v1/render`, {
        method: 'POST',
        headers: headers(options.token),
        body: JSON.stringify({ jobId: job.id, moduleId: job.moduleId, type: job.type, prompt: job.prompt, input: job.input }),
      });
      if (!res.ok) throw new Error(`render submit failed: ${res.status}`);
      const body = (await res.json()) as { taskId?: string; id?: string };
      const externalTaskId = body.taskId ?? body.id;
      if (!externalTaskId) throw new Error('render submit returned no task id');
      return { externalTaskId };
    },
    async getTask(externalTaskId: string): Promise<ProviderTaskSnapshot> {
      const res = await fetchImpl(`${apiUrl}/v1/render/${encodeURIComponent(externalTaskId)}`, { headers: headers(options.token) });
      if (!res.ok) throw new Error(`render getTask failed: ${res.status}`);
      const body = (await res.json()) as Record<string, unknown>;
      return {
        status: mapStatus(String(body.status ?? '')),
        progress: typeof body.progress === 'number' ? body.progress : undefined,
        raw: body,
      };
    },
    async getArtifacts(externalTaskId: string): Promise<ProviderArtifact[]> {
      const res = await fetchImpl(`${apiUrl}/v1/render/${encodeURIComponent(externalTaskId)}/artifacts`, { headers: headers(options.token) });
      if (!res.ok) throw new Error(`render getArtifacts failed: ${res.status}`);
      const body = (await res.json()) as { artifacts?: ProviderArtifact[] };
      return Array.isArray(body.artifacts) ? body.artifacts : [];
    },
    verifyCallback: verify,
    mapCallback(body: Record<string, unknown>) {
      const artifacts = Array.isArray(body.artifacts) ? (body.artifacts as ProviderArtifact[]) : [];
      return {
        status: mapStatus(String(body.status ?? '')),
        artifacts,
        error: typeof body.error === 'string' ? body.error : undefined,
      };
    },
  };
}
