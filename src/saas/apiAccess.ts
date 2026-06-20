/**
 * Public API access policy (P3-E03).
 *
 * Pure, side-effect-free contract for scoping, rate-limiting, and billing-estimating
 * external API key usage. The repository layer persists `scopes`/`rateLimit` on each
 * key; this module defines the vocabulary and the enforcement decisions so that both
 * the UI and any future server-side gateway can share one source of truth.
 */

export type ApiScopeCategory = 'read' | 'write' | 'admin';

export interface ApiScopeDefinition {
  scope: string;
  label: string;
  category: ApiScopeCategory;
  description: string;
  /** Estimated billing credits per successful API call made under this scope. */
  estimatedCreditsPerCall: number;
}

/** Canonical catalog of public API scopes, keyed by `<module>.<action>`. */
export const API_SCOPES: readonly ApiScopeDefinition[] = [
  { scope: 'generation.read', label: 'Read generations', category: 'read', description: 'List and read generation jobs and their results.', estimatedCreditsPerCall: 0 },
  { scope: 'generation.write', label: 'Create generations', category: 'write', description: 'Dispatch new generation jobs (billable).', estimatedCreditsPerCall: 4 },
  { scope: 'assets.read', label: 'Read assets', category: 'read', description: 'List and download workspace assets.', estimatedCreditsPerCall: 0 },
  { scope: 'assets.write', label: 'Write assets', category: 'write', description: 'Create or update workspace assets.', estimatedCreditsPerCall: 1 },
  { scope: 'tasks.read', label: 'Read tasks', category: 'read', description: 'List workspace and agent tasks.', estimatedCreditsPerCall: 0 },
  { scope: 'tasks.write', label: 'Write tasks', category: 'write', description: 'Create or update tasks.', estimatedCreditsPerCall: 1 },
  { scope: 'webhooks.manage', label: 'Manage webhooks', category: 'admin', description: 'Configure webhook endpoints and delivery.', estimatedCreditsPerCall: 0 },
  { scope: 'billing.read', label: 'Read billing', category: 'read', description: 'Read usage and billing estimates.', estimatedCreditsPerCall: 0 },
] as const;

const API_SCOPE_SET = new Set(API_SCOPES.map((definition) => definition.scope));

/** Default scopes granted to a newly created key when none are specified. */
export const DEFAULT_API_SCOPES: readonly string[] = ['generation.read', 'assets.read'];

export interface ApiRateLimit {
  /** Sliding window length in milliseconds. */
  windowMs: number;
  /** Maximum number of calls permitted inside the window. */
  maxRequests: number;
}

/** Conservative default: 600 requests per minute. */
export const DEFAULT_API_RATE_LIMIT: ApiRateLimit = { windowMs: 60_000, maxRequests: 600 };

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  limit: number;
  /** Milliseconds until the window frees a slot; 0 when a slot is available now. */
  retryAfterMs: number;
  resetAt: number;
}

export function isValidApiScope(scope: unknown): scope is string {
  return typeof scope === 'string' && API_SCOPE_SET.has(scope);
}

export function getApiScopeDefinition(scope: string): ApiScopeDefinition | null {
  return API_SCOPES.find((definition) => definition.scope === scope) ?? null;
}

/** Drop unknown/blank scopes, trim, and de-duplicate while preserving catalog order. */
export function normalizeApiScopes(scopes: unknown): string[] {
  if (!Array.isArray(scopes)) return [];
  const requested = new Set(
    scopes
      .filter((scope): scope is string => typeof scope === 'string')
      .map((scope) => scope.trim())
      .filter((scope) => API_SCOPE_SET.has(scope)),
  );
  return API_SCOPES.map((definition) => definition.scope).filter((scope) => requested.has(scope));
}

export function normalizeApiRateLimit(value: unknown): ApiRateLimit {
  if (!value || typeof value !== 'object') return { ...DEFAULT_API_RATE_LIMIT };
  const candidate = value as Partial<ApiRateLimit>;
  const windowMs = Number(candidate.windowMs);
  const maxRequests = Number(candidate.maxRequests);
  return {
    windowMs: Number.isFinite(windowMs) && windowMs >= 1_000 ? Math.floor(windowMs) : DEFAULT_API_RATE_LIMIT.windowMs,
    maxRequests: Number.isFinite(maxRequests) && maxRequests >= 1 ? Math.floor(maxRequests) : DEFAULT_API_RATE_LIMIT.maxRequests,
  };
}

/** Does the granted scope set permit a required scope? */
export function hasApiScope(grantedScopes: readonly string[], requiredScope: string): boolean {
  return grantedScopes.includes(requiredScope);
}

/**
 * Evaluate a sliding-window rate limit against recent request timestamps.
 * `recentTimestamps` is the list of prior call times (ms epoch); `now` is the candidate call time.
 * This is a pure decision — callers persist the request log separately.
 */
export function evaluateRateLimit(
  recentTimestamps: readonly number[],
  rateLimit: ApiRateLimit,
  now: number,
): RateLimitDecision {
  const { windowMs, maxRequests } = normalizeApiRateLimit(rateLimit);
  const windowStart = now - windowMs;
  const inWindow = recentTimestamps.filter((timestamp) => timestamp > windowStart).sort((a, b) => a - b);
  const used = inWindow.length;
  const allowed = used < maxRequests;
  const oldest = inWindow[0];
  const resetAt = oldest !== undefined ? oldest + windowMs : now + windowMs;
  return {
    allowed,
    remaining: Math.max(0, maxRequests - used - (allowed ? 1 : 0)),
    limit: maxRequests,
    retryAfterMs: allowed ? 0 : Math.max(0, resetAt - now),
    resetAt,
  };
}

/** Estimate billing credits for a single API call made under the given scope. */
export function estimateApiCallCredits(scope: string, callCount = 1): number {
  const definition = getApiScopeDefinition(scope);
  if (!definition) return 0;
  const count = Number.isFinite(callCount) && callCount > 0 ? Math.ceil(callCount) : 1;
  return definition.estimatedCreditsPerCall * count;
}
