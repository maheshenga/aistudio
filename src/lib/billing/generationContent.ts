import { resolveGenerationProviderKind } from './billableGeneration';
import { apiClient } from '../data/apiClient';
import type { RuntimeProviderKind } from '../../runtime/agentRuntimeTypes';

/**
 * AIGEN-1/AIGEN-3: front-end entry point for real generated content.
 *
 * When the resolved provider kind is real ('gemini' etc.) and the HTTP backend
 * is configured, this dispatches a generation job through the orchestration
 * endpoint — the API provider seam runs the synchronous adapter (e.g. Gemini)
 * and finalizes the job with the real output, which we read back from the
 * created asset. When the kind is 'mock' (the default), the caller's provided
 * mock/template content is returned unchanged and unbilled.
 *
 * This lets a view be migrated to real output by replacing its hardcoded result
 * with `generateText({ ... , mockFallback: <existing template> })` — the single
 * VITE_GENERATION_PROVIDER switch then governs mock vs real for the whole app.
 */

export interface GenerateTextParams {
  workspaceId: string;
  moduleId: string;
  prompt: string;
  mockFallback: string;
  metadata?: Record<string, unknown>;
}

export interface GeneratedTextResult {
  text: string;
  providerKind: RuntimeProviderKind;
  /** true when the text is the real provider output, false when it is the mock fallback. */
  real: boolean;
}

interface DispatchedJob { id: string; status: string; }
interface AssetRow { metadata?: Record<string, unknown> | null; }

export async function generateText(params: GenerateTextParams): Promise<GeneratedTextResult> {
  const providerKind = resolveGenerationProviderKind();
  if (providerKind === 'mock' || !apiClient.configured) {
    return { text: params.mockFallback, providerKind: 'mock', real: false };
  }

  try {
    // Synchronous adapters finalize the job inline, so by the time dispatch
    // returns the job is terminal and the asset (with inline text) exists.
    const dispatched = await apiClient.post<{ job?: DispatchedJob } | DispatchedJob>(params.workspaceId, 'orchestration/dispatch', {
      type: params.moduleId,
      moduleId: params.moduleId,
      runtimeMode: 'web',
      providerKind,
      prompt: params.prompt,
      input: { prompt: params.prompt, ...(params.metadata ?? {}) },
    });
    if (!dispatched.ok) return { text: params.mockFallback, providerKind, real: false };
    const job = (dispatched.value as { job?: DispatchedJob }).job ?? (dispatched.value as DispatchedJob);
    if (!job?.id) return { text: params.mockFallback, providerKind, real: false };

    const assetsRes = await apiClient.get<AssetRow[]>(params.workspaceId, `assets?jobId=${encodeURIComponent(job.id)}`);
    if (assetsRes.ok && Array.isArray(assetsRes.value)) {
      for (const asset of assetsRes.value) {
        const text = asset.metadata?.text;
        if (typeof text === 'string' && text.trim()) {
          return { text, providerKind, real: true };
        }
      }
    }
    // Real provider configured but produced no inline text → safe fallback.
    return { text: params.mockFallback, providerKind, real: false };
  } catch {
    return { text: params.mockFallback, providerKind, real: false };
  }
}
