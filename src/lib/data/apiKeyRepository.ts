import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export type WorkspaceApiKeyStatus = 'active' | 'rotating' | 'revoked' | 'expired';

export interface WorkspaceApiKey {
  id: string;
  workspaceId: string;
  name: string;
  prefix: string;
  last4: string;
  keyPreview: string;
  credentialRef: string;
  status: WorkspaceApiKeyStatus;
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number | null;
  expiresAt: number | null;
  metadata: Record<string, unknown>;
}

export interface WorkspaceApiKeyInput {
  name: string;
  secret?: string;
  expiresAt?: number | null;
  metadata?: Record<string, unknown>;
}

export interface ApiKeyRepositoryContext {
  workspaceId: string;
  storage?: StorageLike | null;
  now?: number;
}

export interface WorkspaceApiKeySecretResult {
  record: WorkspaceApiKey;
  secret: string;
}

export interface WorkspaceApiKeyRotationResult {
  previous: WorkspaceApiKey;
  replacement: WorkspaceApiKey;
  secret: string;
}

export interface WorkspaceApiKeyExportRow {
  id: string;
  name: string;
  keyPreview: string;
  status: WorkspaceApiKeyStatus;
  lastUsedAt: number | null;
  expiresAt: number | null;
}

export const API_KEY_STORAGE_PREFIX = 'aistudio_workspace_api_keys';

const API_KEY_STATUSES: readonly WorkspaceApiKeyStatus[] = ['active', 'rotating', 'revoked', 'expired'];
const SENSITIVE_METADATA_KEYS = new Set(['secret', 'apiKey', 'api_key', 'key', 'token', 'rawKey', 'fullKey']);

function apiKeyStorageKey(context: ApiKeyRepositoryContext): string {
  return `${API_KEY_STORAGE_PREFIX}:${context.workspaceId}`;
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeStatus(value: unknown): WorkspaceApiKeyStatus {
  return typeof value === 'string' && API_KEY_STATUSES.includes(value as WorkspaceApiKeyStatus)
    ? value as WorkspaceApiKeyStatus
    : 'active';
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}

function normalizeNullableTimestamp(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : null;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'api_key';
}

function randomToken(): string {
  const first = Math.random().toString(36).slice(2, 12);
  const second = Math.random().toString(36).slice(2, 12);
  return `${first}${second}`;
}

function generatedSecret(name: string): string {
  return `sk-${slugify(name).replace(/_/g, '-')}-${randomToken()}`;
}

function secretPrefix(secret: string): string {
  const [prefix] = secret.trim().split('-');
  return prefix || 'sk';
}

function secretLast4(secret: string): string {
  const compact = secret.trim().replace(/\s+/g, '');
  return compact.slice(-4) || '0000';
}

function keyPreview(prefix: string, last4: string): string {
  return `${prefix}-...${last4}`;
}

function credentialRef(name: string, last4: string, now: number): string {
  return `api_key_${slugify(name)}_${last4}_${now}`;
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

function normalizeApiKey(record: Partial<WorkspaceApiKey>, context: ApiKeyRepositoryContext): WorkspaceApiKey {
  const now = context.now ?? Date.now();
  const name = normalizeText(record.name, 'API key');
  const prefix = normalizeText(record.prefix, 'sk');
  const last4 = normalizeText(record.last4, '0000').slice(-4);

  return {
    id: normalizeText(record.id, `api_key_${now}_${Math.random().toString(36).slice(2, 8)}`),
    workspaceId: context.workspaceId,
    name,
    prefix,
    last4,
    keyPreview: normalizeText(record.keyPreview, keyPreview(prefix, last4)),
    credentialRef: normalizeText(record.credentialRef, credentialRef(name, last4, now)),
    status: normalizeStatus(record.status),
    createdAt: normalizeTimestamp(record.createdAt, now),
    updatedAt: normalizeTimestamp(record.updatedAt, now),
    lastUsedAt: normalizeNullableTimestamp(record.lastUsedAt),
    expiresAt: normalizeNullableTimestamp(record.expiresAt),
    metadata: sanitizeMetadata(record.metadata),
  };
}

function sortApiKeys(records: WorkspaceApiKey[]): WorkspaceApiKey[] {
  return records.slice().sort((a, b) => b.createdAt - a.createdAt || b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
}

function readApiKeys(context: ApiKeyRepositoryContext): WorkspaceApiKey[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(apiKeyStorageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortApiKeys(parsed.map((record) => normalizeApiKey(record as Partial<WorkspaceApiKey>, context)));
  } catch {
    return [];
  }
}

function writeApiKeys(records: WorkspaceApiKey[], context: ApiKeyRepositoryContext): WorkspaceApiKey[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = sortApiKeys(records.map((record) => normalizeApiKey(record, context)));
  storage?.setItem(apiKeyStorageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('workspace_api_keys_updated', { detail: { workspaceId: context.workspaceId } }));
  }
  return normalized;
}

function buildApiKeyRecord(input: WorkspaceApiKeyInput, secret: string, context: ApiKeyRepositoryContext): WorkspaceApiKey {
  const now = context.now ?? Date.now();
  const name = normalizeText(input.name, 'API key');
  const prefix = secretPrefix(secret);
  const last4 = secretLast4(secret);

  return normalizeApiKey(
    {
      id: `api_key_${slugify(name)}_${now}_${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: context.workspaceId,
      name,
      prefix,
      last4,
      keyPreview: keyPreview(prefix, last4),
      credentialRef: credentialRef(name, last4, now),
      status: 'active',
      createdAt: now,
      updatedAt: now,
      lastUsedAt: null,
      expiresAt: input.expiresAt ?? null,
      metadata: input.metadata ?? {},
    },
    context,
  );
}

export function loadWorkspaceApiKeys(context: ApiKeyRepositoryContext): WorkspaceApiKey[] {
  return readApiKeys(context);
}

export function saveWorkspaceApiKeys(records: WorkspaceApiKey[], context: ApiKeyRepositoryContext): WorkspaceApiKey[] {
  return writeApiKeys(records, context);
}

export function createWorkspaceApiKey(
  input: WorkspaceApiKeyInput,
  context: ApiKeyRepositoryContext,
): WorkspaceApiKeySecretResult {
  const secret = input.secret?.trim() || generatedSecret(input.name);
  const record = buildApiKeyRecord(input, secret, context);
  writeApiKeys([record, ...readApiKeys(context)], context);
  return { record, secret };
}

export function rotateWorkspaceApiKey(
  keyId: string,
  input: { secret?: string; gracePeriodMs?: number } = {},
  context: ApiKeyRepositoryContext,
): WorkspaceApiKeyRotationResult | null {
  const now = context.now ?? Date.now();
  const existingRecords = readApiKeys(context);
  const current = existingRecords.find((record) => record.id === keyId);
  if (!current || current.status === 'revoked') return null;

  const gracePeriodMs = Math.max(0, Math.floor(input.gracePeriodMs ?? 86_400_000));
  const previous = normalizeApiKey(
    {
      ...current,
      status: 'rotating',
      expiresAt: now + gracePeriodMs,
      updatedAt: now,
    },
    context,
  );
  const secret = input.secret?.trim() || generatedSecret(current.name);
  const replacement = buildApiKeyRecord(
    {
      name: current.name,
      secret,
      expiresAt: current.expiresAt,
      metadata: { ...current.metadata, rotatedFrom: current.id },
    },
    secret,
    context,
  );

  writeApiKeys(
    [replacement, previous, ...existingRecords.filter((record) => record.id !== keyId)],
    context,
  );
  return { previous, replacement, secret };
}

export function revokeWorkspaceApiKey(
  keyId: string,
  context: ApiKeyRepositoryContext,
): WorkspaceApiKey | null {
  const now = context.now ?? Date.now();
  let revoked: WorkspaceApiKey | null = null;
  const records = readApiKeys(context).map((record) => {
    if (record.id !== keyId) return record;
    revoked = normalizeApiKey(
      {
        ...record,
        status: 'revoked',
        expiresAt: now,
        updatedAt: now,
      },
      context,
    );
    return revoked;
  });

  writeApiKeys(records, context);
  return revoked;
}

export function exportWorkspaceApiKeyRows(records: WorkspaceApiKey[]): WorkspaceApiKeyExportRow[] {
  return sortApiKeys(records).map((record) => ({
    id: record.id,
    name: record.name,
    keyPreview: record.keyPreview,
    status: record.status,
    lastUsedAt: record.lastUsedAt,
    expiresAt: record.expiresAt,
  }));
}
