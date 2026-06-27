import { Injectable, Logger } from '@nestjs/common';
import type { ProviderAdapter } from './provider-adapter';
import { createGeminiAdapter } from './gemini-adapter';
import { createRenderAdapter } from './render-adapter';

/**
 * R03-3: config-driven provider registry keyed by providerKind.
 *
 * Adapters are constructed from env at boot. The app stays mock-by-default:
 * `resolve('mock')` (and any unconfigured kind) returns null, so the orchestrator
 * keeps the existing mock/no-op behavior until a real provider is configured.
 *
 *   GEMINI_API_KEY                          → enables the 'gemini' adapter
 *   PROVIDER_<KIND>_API_URL / _TOKEN / _SECRET → enables an async render adapter
 *     for that kind (e.g. PROVIDER_RENDER_API_URL → kind 'render').
 */
@Injectable()
export class ProviderRegistry {
  private readonly logger = new Logger(ProviderRegistry.name);
  private readonly adapters = new Map<string, ProviderAdapter>();

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.buildFromEnv(env);
  }

  private register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.kind, adapter);
    this.logger.log(`registered provider adapter: ${adapter.kind} (synchronous=${adapter.synchronous})`);
  }

  private buildFromEnv(env: NodeJS.ProcessEnv): void {
    if (env.GEMINI_API_KEY) {
      this.register(createGeminiAdapter({ apiKey: env.GEMINI_API_KEY }));
    }
    // Discover async render providers from PROVIDER_<KIND>_API_URL env triples.
    for (const [key, value] of Object.entries(env)) {
      const match = /^PROVIDER_([A-Z0-9_]+)_API_URL$/.exec(key);
      if (!match || !value) continue;
      const kind = match[1].toLowerCase();
      this.register(
        createRenderAdapter({
          kind,
          apiUrl: value,
          token: env[`PROVIDER_${match[1]}_TOKEN`],
          secret: env[`PROVIDER_${match[1]}_SECRET`],
        }),
      );
    }
  }

  /** Returns the adapter for a providerKind, or null for mock/unconfigured. */
  resolve(providerKind: string | null | undefined): ProviderAdapter | null {
    if (!providerKind || providerKind === 'mock') return null;
    return this.adapters.get(providerKind) ?? null;
  }

  /** Test/diagnostics: register an adapter at runtime. */
  registerForTest(adapter: ProviderAdapter): void {
    this.register(adapter);
  }

  has(providerKind: string): boolean {
    return this.adapters.has(providerKind);
  }
}
