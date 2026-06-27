/**
 * Phase 3 (R03-3): provider adapter seam.
 *
 * `providerKind` was historically a cosmetic free string used only for credit
 * pricing. This interface turns it into the key for a real adapter that can
 * submit work to an external vendor, verify its signed callbacks, and map its
 * payloads to our canonical job/artifact shapes.
 *
 * The seam is config-driven (ProviderRegistry, populated from env), so the app
 * defaults to mock and only routes to a real provider when one is configured.
 */

export type CanonicalTaskStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface ProviderArtifact {
  id?: string;
  url?: string;
  kind?: string;
  /** Inline text output (e.g. copywriting/chat) when there is no artifact URL. */
  text?: string;
  [k: string]: unknown;
}

export interface ProviderTaskSnapshot {
  status: CanonicalTaskStatus;
  progress?: number;
  currentStep?: string;
  raw: Record<string, unknown>;
}

/** The job fields an adapter needs to submit work and price/route it. */
export interface ProviderJobContext {
  id: string;
  workspaceId: string;
  type: string | null;
  moduleId: string | null;
  prompt: string | null;
  input: unknown;
  providerKind: string | null;
  /** Decrypted, server-side-only credential for the workspace's provider config. */
  credential?: string | null;
  modelId?: string | null;
}

export interface ProviderSubmitResult {
  /** External vendor task id, persisted via linkExternal for later reconcile/callback. */
  externalTaskId: string;
  /**
   * Synchronous adapters (e.g. text generation) may return terminal output
   * immediately; the orchestrator then finalizes the job inline rather than
   * waiting for a callback.
   */
  immediate?: { status: 'succeeded' | 'failed'; artifacts?: ProviderArtifact[]; error?: string };
}

export interface ProviderCallbackVerification {
  ok: boolean;
  /** Stable external event id used to dedup at-least-once deliveries. */
  externalEventId?: string;
  reason?: string;
}

export interface ProviderAdapter {
  readonly kind: string;
  /** True when this adapter resolves output synchronously (no callback/poll needed). */
  readonly synchronous: boolean;

  /** Kick off work at the vendor (or run it inline for synchronous adapters). */
  submit(job: ProviderJobContext): Promise<ProviderSubmitResult>;

  /** Poll a previously-submitted task (used by the reconcile safety net). */
  getTask?(externalTaskId: string): Promise<ProviderTaskSnapshot>;
  getArtifacts?(externalTaskId: string): Promise<ProviderArtifact[]>;

  /** Verify an inbound callback's signature + freshness. Async adapters only. */
  verifyCallback?(rawBody: string, headers: Record<string, string | undefined>): ProviderCallbackVerification;
  /** Map a verified callback body to a canonical terminal state + artifacts. */
  mapCallback?(body: Record<string, unknown>): { status: CanonicalTaskStatus; artifacts: ProviderArtifact[]; error?: string };
}
