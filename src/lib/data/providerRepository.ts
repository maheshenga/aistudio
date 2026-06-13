import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export type WorkspaceProviderStatus = 'healthy' | 'rate_limited' | 'sleeping' | 'offline';

export interface WorkspaceProviderConfig {
  id: string;
  workspaceId: string;
  name: string;
  platform: string;
  status: WorkspaceProviderStatus;
  latencyMs: number | null;
  modelIds: string[];
  billingLabel: string;
  enabled: boolean;
  isDefault: boolean;
  credentialRef: string | null;
  apiKeyLast4: string | null;
  apiKeyFingerprint: string | null;
  scopes: string[];
  ownerId?: string;
  lastTestedAt: number | null;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface WorkspaceProviderInput {
  name?: string;
  platform: string;
  apiKey?: string;
  modelIds: string[];
  billingLabel?: string;
  enabled?: boolean;
  isDefault?: boolean;
  status?: WorkspaceProviderStatus;
  latencyMs?: number | null;
  scopes?: string[];
  ownerId?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderRepositoryContext {
  workspaceId: string;
  storage?: StorageLike | null;
  now?: number;
}

export const PROVIDER_CONFIG_STORAGE_PREFIX = 'aistudio_workspace_provider_configs';

const PROVIDER_STATUSES: readonly WorkspaceProviderStatus[] = ['healthy', 'rate_limited', 'sleeping', 'offline'];
const SENSITIVE_METADATA_KEYS = new Set(['secret', 'apiKey', 'api_key', 'key', 'token', 'rawKey', 'fullKey']);

const DEFAULT_PROVIDER_CONFIGS: Array<Omit<WorkspaceProviderConfig, 'workspaceId' | 'createdAt' | 'updatedAt'>> = [
  {
    id: 'provider_multica',
    name: 'Multica Runtime',
    platform: 'Multica',
    status: 'healthy',
    latencyMs: 80,
    modelIds: ['codex', 'claude', 'gemini'],
    billingLabel: 'desktop/self-hosted runtime',
    enabled: true,
    isDefault: true,
    credentialRef: null,
    apiKeyLast4: null,
    apiKeyFingerprint: null,
    scopes: [],
    lastTestedAt: null,
    metadata: { seeded: true, runtimeMode: 'dual' },
  },
  {
    id: 'provider_google_vertex',
    name: 'Google Vertex AI',
    platform: 'Google Vertex AI',
    status: 'healthy',
    latencyMs: 120,
    modelIds: ['gemini-1.5-pro', 'gemini-1.5-flash', 'imagen-3'],
    billingLabel: 'workspace contract',
    enabled: true,
    isDefault: false,
    credentialRef: 'env:GOOGLE_APPLICATION_CREDENTIALS',
    apiKeyLast4: null,
    apiKeyFingerprint: null,
    scopes: [],
    lastTestedAt: null,
    metadata: { seeded: true },
  },
  {
    id: 'provider_openai',
    name: 'OpenAI API',
    platform: 'OpenAI',
    status: 'healthy',
    latencyMs: 240,
    modelIds: ['gpt-4o', 'gpt-4o-mini', 'dall-e-3'],
    billingLabel: 'metered billing',
    enabled: false,
    isDefault: false,
    credentialRef: null,
    apiKeyLast4: null,
    apiKeyFingerprint: null,
    scopes: [],
    lastTestedAt: null,
    metadata: { seeded: true },
  },
  {
    id: 'provider_anthropic',
    name: 'Anthropic',
    platform: 'Anthropic',
    status: 'healthy',
    latencyMs: 320,
    modelIds: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'],
    billingLabel: 'metered billing',
    enabled: false,
    isDefault: false,
    credentialRef: null,
    apiKeyLast4: null,
    apiKeyFingerprint: null,
    scopes: [],
    lastTestedAt: null,
    metadata: { seeded: true },
  },
];

function providerStorageKey(context: ProviderRepositoryContext): string {
  return `${PROVIDER_CONFIG_STORAGE_PREFIX}:${context.workspaceId}`;
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeStatus(value: unknown, fallback: WorkspaceProviderStatus): WorkspaceProviderStatus {
  return typeof value === 'string' && PROVIDER_STATUSES.includes(value as WorkspaceProviderStatus)
    ? value as WorkspaceProviderStatus
    : fallback;
}

function normalizeLatency(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? Math.floor(numericValue) : null;
}

function normalizeNullableTimestamp(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : null;
}

function normalizeModels(modelIds: unknown): string[] {
  if (!Array.isArray(modelIds)) return [];
  return modelIds
    .filter((model): model is string => typeof model === 'string' && model.trim().length > 0)
    .map((model) => model.trim());
}

function normalizeScopes(scopes: unknown): string[] {
  if (!Array.isArray(scopes)) return [];
  return Array.from(new Set(
    scopes
      .filter((scope): scope is string => typeof scope === 'string' && scope.trim().length > 0)
      .map((scope) => scope.trim()),
  ));
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'provider';
}

function apiKeyLast4(apiKey: string | undefined): string | null {
  if (!apiKey?.trim()) return null;
  return apiKey.trim().slice(-4);
}

function credentialRef(platform: string, apiKey: string | undefined, now: number): string | null {
  const last4 = apiKeyLast4(apiKey);
  if (!last4) return null;
  return `provider_credential_${slugify(platform)}_${last4}_${now}`;
}

function apiKeyFingerprint(platform: string, apiKey: string | undefined): string | null {
  const trimmedKey = apiKey?.trim();
  const last4 = apiKeyLast4(trimmedKey);
  if (!trimmedKey || !last4) return null;
  return `provider_key_${slugify(platform)}_${trimmedKey.length}_${last4}`;
}

function sanitizeMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_METADATA_KEYS.has(key)) continue;
    sanitized[key] = value;
  }
  return sanitized;
}

function normalizeProvider(
  provider: Partial<WorkspaceProviderConfig>,
  context: ProviderRepositoryContext,
): WorkspaceProviderConfig {
  const now = context.now ?? Date.now();
  const id = normalizeText(provider.id, `provider_${now}_${Math.random().toString(36).slice(2, 8)}`);
  const platform = normalizeText(provider.platform, 'Custom');
  const createdAt = Number.isFinite(provider.createdAt) ? Number(provider.createdAt) : now;

  return {
    id,
    workspaceId: context.workspaceId,
    name: normalizeText(provider.name, platform),
    platform,
    status: normalizeStatus(provider.status, provider.enabled === false ? 'sleeping' : 'healthy'),
    latencyMs: normalizeLatency(provider.latencyMs),
    modelIds: normalizeModels(provider.modelIds),
    billingLabel: normalizeText(provider.billingLabel, 'metered billing'),
    enabled: provider.enabled !== false,
    isDefault: provider.isDefault === true,
    credentialRef: typeof provider.credentialRef === 'string' && provider.credentialRef.trim()
      ? provider.credentialRef.trim()
      : null,
    apiKeyLast4: typeof provider.apiKeyLast4 === 'string' && provider.apiKeyLast4.trim()
      ? provider.apiKeyLast4.trim()
      : null,
    apiKeyFingerprint: typeof provider.apiKeyFingerprint === 'string' && provider.apiKeyFingerprint.trim()
      ? provider.apiKeyFingerprint.trim()
      : null,
    scopes: normalizeScopes(provider.scopes),
    ownerId: typeof provider.ownerId === 'string' && provider.ownerId.trim()
      ? provider.ownerId.trim()
      : undefined,
    lastTestedAt: normalizeNullableTimestamp(provider.lastTestedAt),
    createdAt,
    updatedAt: Number.isFinite(provider.updatedAt) ? Number(provider.updatedAt) : now,
    metadata: sanitizeMetadata(provider.metadata),
  };
}

function ensureSingleDefault(providers: WorkspaceProviderConfig[]): WorkspaceProviderConfig[] {
  const defaultProvider = providers.find((provider) => provider.isDefault && provider.enabled)
    ?? providers.find((provider) => provider.enabled)
    ?? providers[0];
  return providers.map((provider) => ({
    ...provider,
    isDefault: Boolean(defaultProvider && provider.id === defaultProvider.id),
  }));
}

function sortProviders(providers: WorkspaceProviderConfig[]): WorkspaceProviderConfig[] {
  return providers.slice().sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name));
}

function readProviders(context: ProviderRepositoryContext): WorkspaceProviderConfig[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(providerStorageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortProviders(ensureSingleDefault(parsed.map((provider) => normalizeProvider(provider as Partial<WorkspaceProviderConfig>, context))));
  } catch {
    return [];
  }
}

function writeProviders(
  providers: WorkspaceProviderConfig[],
  context: ProviderRepositoryContext,
): WorkspaceProviderConfig[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = sortProviders(ensureSingleDefault(providers.map((provider) => normalizeProvider(provider, context))));
  storage?.setItem(providerStorageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('workspace_providers_updated', { detail: { workspaceId: context.workspaceId } }));
  }
  return normalized;
}

export function getDefaultWorkspaceProviders(context: ProviderRepositoryContext): WorkspaceProviderConfig[] {
  const now = context.now ?? Date.now();
  return DEFAULT_PROVIDER_CONFIGS.map((provider) => normalizeProvider(
    {
      ...provider,
      workspaceId: context.workspaceId,
      createdAt: now,
      updatedAt: now,
    },
    context,
  ));
}

export function loadWorkspaceProviders(context: ProviderRepositoryContext): WorkspaceProviderConfig[] {
  return readProviders(context);
}

export function saveWorkspaceProviders(
  providers: WorkspaceProviderConfig[],
  context: ProviderRepositoryContext,
): WorkspaceProviderConfig[] {
  return writeProviders(providers, context);
}

export function ensureDefaultWorkspaceProviders(context: ProviderRepositoryContext): WorkspaceProviderConfig[] {
  const existingProviders = readProviders(context);
  if (existingProviders.length > 0) return existingProviders;
  return writeProviders(getDefaultWorkspaceProviders(context), context);
}

export function createWorkspaceProvider(
  input: WorkspaceProviderInput,
  context: ProviderRepositoryContext,
): WorkspaceProviderConfig {
  const now = context.now ?? Date.now();
  const provider = normalizeProvider(
    {
      id: `provider_${slugify(input.platform)}_${now}_${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: context.workspaceId,
      name: input.name ?? `${input.platform} (Custom)`,
      platform: input.platform,
      status: input.status ?? 'healthy',
      latencyMs: input.latencyMs ?? null,
      modelIds: input.modelIds,
      billingLabel: input.billingLabel ?? 'metered billing',
      enabled: input.enabled ?? true,
      isDefault: input.isDefault ?? false,
      credentialRef: credentialRef(input.platform, input.apiKey, now),
      apiKeyLast4: apiKeyLast4(input.apiKey),
      apiKeyFingerprint: apiKeyFingerprint(input.platform, input.apiKey),
      scopes: input.scopes ?? [],
      ownerId: input.ownerId,
      lastTestedAt: null,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    },
    context,
  );

  writeProviders([provider, ...ensureDefaultWorkspaceProviders(context)], context);
  return provider;
}

export function updateWorkspaceProvider(
  providerId: string,
  patch: Partial<Omit<WorkspaceProviderConfig, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>,
  context: ProviderRepositoryContext,
): WorkspaceProviderConfig | null {
  const now = context.now ?? Date.now();
  let updatedProvider: WorkspaceProviderConfig | null = null;
  const updatedProviders = ensureDefaultWorkspaceProviders(context).map((provider) => {
    if (provider.id !== providerId) return provider;
    updatedProvider = normalizeProvider({ ...provider, ...patch, id: provider.id, createdAt: provider.createdAt, updatedAt: now }, context);
    return updatedProvider;
  });

  writeProviders(updatedProviders, context);
  return updatedProvider;
}

export function setDefaultWorkspaceProvider(
  providerId: string,
  context: ProviderRepositoryContext,
): WorkspaceProviderConfig | null {
  const now = context.now ?? Date.now();
  let defaultProvider: WorkspaceProviderConfig | null = null;
  const updatedProviders = ensureDefaultWorkspaceProviders(context).map((provider) => {
    const isDefault = provider.id === providerId;
    const updatedProvider = normalizeProvider(
      {
        ...provider,
        enabled: isDefault ? true : provider.enabled,
        isDefault,
        updatedAt: isDefault ? now : provider.updatedAt,
      },
      context,
    );
    if (isDefault) defaultProvider = updatedProvider;
    return updatedProvider;
  });

  writeProviders(updatedProviders, context);
  return defaultProvider;
}

export function detectProviderModels(platform: string): string[] {
  switch (platform) {
    case 'OpenAI':
      return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'dall-e-3', 'tts-1'];
    case 'Anthropic':
      return ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'];
    case 'Google Vertex AI':
      return ['gemini-1.5-pro', 'gemini-1.5-flash', 'imagen-3', 'veo-2'];
    case 'Midjourney API (Unofficial)':
      return ['midjourney-v6', 'niji-v6'];
    default:
      return ['model-a', 'model-b', 'model-c'];
  }
}
