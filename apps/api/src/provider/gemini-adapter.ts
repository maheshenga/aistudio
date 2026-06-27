import type {
  ProviderAdapter,
  ProviderArtifact,
  ProviderJobContext,
  ProviderSubmitResult,
} from './provider-adapter';

/**
 * AIGEN-1/AIGEN-4: real synchronous Gemini text/image adapter.
 *
 * Calls the Gemini REST API directly via fetch (no SDK dependency in the API
 * workspace), authenticating with the workspace's decrypted credential or the
 * GEMINI_API_KEY env fallback. Returns terminal output inline so the
 * orchestrator finalizes the job without a callback/poll.
 *
 * Image modules return an artifact with a data: URL; text modules return inline
 * `text`. The adapter never logs or returns the API key.
 */

const DEFAULT_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL ?? 'gemini-1.5-flash';
const DEFAULT_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? 'imagen-3.0-generate-002';
const GEMINI_BASE = (process.env.GEMINI_API_URL ?? 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');

const IMAGE_MODULES = new Set(['image', 'ai_image_edit', 'e_main_image', 'e_poster', 'e_detail_page', 'e_clone', 'e_white_bg']);

function isImageModule(moduleId: string | null, type: string | null): boolean {
  const key = moduleId ?? type ?? '';
  return IMAGE_MODULES.has(key) || /image|poster|logo|design/.test(key);
}

export interface GeminiAdapterOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

export function createGeminiAdapter(options: GeminiAdapterOptions = {}): ProviderAdapter {
  const envKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  const fetchImpl = options.fetchImpl ?? fetch;

  async function generateText(job: ProviderJobContext, apiKey: string): Promise<ProviderArtifact[]> {
    const model = job.modelId ?? DEFAULT_TEXT_MODEL;
    const url = `${GEMINI_BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: job.prompt ?? '' }] }] }),
    });
    if (!res.ok) throw new Error(`Gemini generateContent failed: ${res.status}`);
    const body = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    return [{ kind: 'text', text }];
  }

  async function generateImage(job: ProviderJobContext, apiKey: string): Promise<ProviderArtifact[]> {
    const model = job.modelId ?? DEFAULT_IMAGE_MODEL;
    const url = `${GEMINI_BASE}/v1beta/models/${encodeURIComponent(model)}:predict?key=${encodeURIComponent(apiKey)}`;
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instances: [{ prompt: job.prompt ?? '' }], parameters: { sampleCount: 1 } }),
    });
    if (!res.ok) throw new Error(`Gemini image predict failed: ${res.status}`);
    const body = (await res.json()) as { predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }> };
    const pred = body.predictions?.[0];
    if (!pred?.bytesBase64Encoded) throw new Error('Gemini image predict returned no image');
    const mime = pred.mimeType ?? 'image/png';
    return [{ kind: 'image', url: `data:${mime};base64,${pred.bytesBase64Encoded}` }];
  }

  return {
    kind: 'gemini',
    synchronous: true,
    async submit(job: ProviderJobContext): Promise<ProviderSubmitResult> {
      const apiKey = job.credential ?? envKey;
      const externalTaskId = `gemini:${job.id}`;
      if (!apiKey) {
        return { externalTaskId, immediate: { status: 'failed', error: 'no Gemini credential configured' } };
      }
      try {
        const artifacts = isImageModule(job.moduleId, job.type)
          ? await generateImage(job, apiKey)
          : await generateText(job, apiKey);
        return { externalTaskId, immediate: { status: 'succeeded', artifacts } };
      } catch (e) {
        return { externalTaskId, immediate: { status: 'failed', error: e instanceof Error ? e.message : String(e) } };
      }
    },
  };
}
