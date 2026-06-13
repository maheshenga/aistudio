import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export type WorkspaceWebhookStatus = 'active' | 'disabled' | 'failing';

export interface WorkspaceWebhookEndpoint {
  id: string;
  workspaceId: string;
  name: string;
  url: string;
  status: WorkspaceWebhookStatus;
  events: string[];
  signingSecretRef: string;
  signingSecretLast4: string;
  createdAt: number;
  updatedAt: number;
  lastDeliveredAt: number | null;
  failureCount: number;
  metadata: Record<string, unknown>;
}

export interface WorkspaceWebhookEndpointInput {
  name: string;
  url: string;
  events: string[];
  signingSecret?: string;
  metadata?: Record<string, unknown>;
}

export interface WebhookRepositoryContext {
  workspaceId: string;
  storage?: StorageLike | null;
  now?: number;
}

export interface WorkspaceWebhookSecretResult {
  record: WorkspaceWebhookEndpoint;
  signingSecret: string;
}

export interface WorkspaceWebhookExportRow {
  id: string;
  name: string;
  url: string;
  status: WorkspaceWebhookStatus;
  events: string[];
  signingSecretLast4: string;
  failureCount: number;
}

export const WEBHOOK_ENDPOINT_STORAGE_PREFIX = 'aistudio_workspace_webhook_endpoints';

const WEBHOOK_STATUSES: readonly WorkspaceWebhookStatus[] = ['active', 'disabled', 'failing'];
const SENSITIVE_METADATA_KEYS = new Set([
  'secret',
  'signingSecret',
  'signing_secret',
  'webhookSecret',
  'token',
  'rawSecret',
]);

function webhookStorageKey(context: WebhookRepositoryContext): string {
  return `${WEBHOOK_ENDPOINT_STORAGE_PREFIX}:${context.workspaceId}`;
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeStatus(value: unknown): WorkspaceWebhookStatus {
  return typeof value === 'string' && WEBHOOK_STATUSES.includes(value as WorkspaceWebhookStatus)
    ? value as WorkspaceWebhookStatus
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

function normalizeInteger(value: unknown, fallback = 0): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, Math.floor(numericValue)) : fallback;
}

function normalizeEvents(events: unknown): string[] {
  if (!Array.isArray(events)) return [];
  return Array.from(new Set(
    events
      .filter((event): event is string => typeof event === 'string' && event.trim().length > 0)
      .map((event) => event.trim()),
  ));
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'webhook';
}

function randomToken(): string {
  return `${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
}

function generatedSigningSecret(name: string): string {
  return `whsec-${slugify(name).replace(/_/g, '-')}-${randomToken()}`;
}

function secretLast4(secret: string): string {
  return secret.trim().replace(/\s+/g, '').slice(-4) || '0000';
}

function signingSecretRef(name: string, last4: string, now: number): string {
  return `webhook_secret_${slugify(name)}_${last4}_${now}`;
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

function normalizeWebhookEndpoint(
  endpoint: Partial<WorkspaceWebhookEndpoint>,
  context: WebhookRepositoryContext,
): WorkspaceWebhookEndpoint {
  const now = context.now ?? Date.now();
  const name = normalizeText(endpoint.name, 'Webhook endpoint');
  const signingSecretLast4 = normalizeText(endpoint.signingSecretLast4, '0000').slice(-4);

  return {
    id: normalizeText(endpoint.id, `webhook_${now}_${Math.random().toString(36).slice(2, 8)}`),
    workspaceId: context.workspaceId,
    name,
    url: normalizeText(endpoint.url, 'https://example.com/webhook'),
    status: normalizeStatus(endpoint.status),
    events: normalizeEvents(endpoint.events),
    signingSecretRef: normalizeText(endpoint.signingSecretRef, signingSecretRef(name, signingSecretLast4, now)),
    signingSecretLast4,
    createdAt: normalizeTimestamp(endpoint.createdAt, now),
    updatedAt: normalizeTimestamp(endpoint.updatedAt, now),
    lastDeliveredAt: normalizeNullableTimestamp(endpoint.lastDeliveredAt),
    failureCount: normalizeInteger(endpoint.failureCount),
    metadata: sanitizeMetadata(endpoint.metadata),
  };
}

function sortWebhookEndpoints(endpoints: WorkspaceWebhookEndpoint[]): WorkspaceWebhookEndpoint[] {
  return endpoints.slice().sort((a, b) => b.createdAt - a.createdAt || b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
}

function readWebhookEndpoints(context: WebhookRepositoryContext): WorkspaceWebhookEndpoint[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(webhookStorageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortWebhookEndpoints(parsed.map((endpoint) =>
      normalizeWebhookEndpoint(endpoint as Partial<WorkspaceWebhookEndpoint>, context),
    ));
  } catch {
    return [];
  }
}

function writeWebhookEndpoints(
  endpoints: WorkspaceWebhookEndpoint[],
  context: WebhookRepositoryContext,
): WorkspaceWebhookEndpoint[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = sortWebhookEndpoints(endpoints.map((endpoint) => normalizeWebhookEndpoint(endpoint, context)));
  storage?.setItem(webhookStorageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('workspace_webhooks_updated', { detail: { workspaceId: context.workspaceId } }));
  }
  return normalized;
}

function buildWebhookEndpoint(
  input: WorkspaceWebhookEndpointInput,
  signingSecret: string,
  context: WebhookRepositoryContext,
): WorkspaceWebhookEndpoint {
  const now = context.now ?? Date.now();
  const name = normalizeText(input.name, 'Webhook endpoint');
  const last4 = secretLast4(signingSecret);

  return normalizeWebhookEndpoint(
    {
      id: `webhook_${slugify(name)}_${now}_${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: context.workspaceId,
      name,
      url: normalizeText(input.url, 'https://example.com/webhook'),
      status: 'active',
      events: input.events,
      signingSecretRef: signingSecretRef(name, last4, now),
      signingSecretLast4: last4,
      createdAt: now,
      updatedAt: now,
      lastDeliveredAt: null,
      failureCount: 0,
      metadata: input.metadata ?? {},
    },
    context,
  );
}

export function loadWorkspaceWebhookEndpoints(context: WebhookRepositoryContext): WorkspaceWebhookEndpoint[] {
  return readWebhookEndpoints(context);
}

export function saveWorkspaceWebhookEndpoints(
  endpoints: WorkspaceWebhookEndpoint[],
  context: WebhookRepositoryContext,
): WorkspaceWebhookEndpoint[] {
  return writeWebhookEndpoints(endpoints, context);
}

export function createWorkspaceWebhookEndpoint(
  input: WorkspaceWebhookEndpointInput,
  context: WebhookRepositoryContext,
): WorkspaceWebhookSecretResult {
  const signingSecret = input.signingSecret?.trim() || generatedSigningSecret(input.name);
  const record = buildWebhookEndpoint(input, signingSecret, context);
  writeWebhookEndpoints([record, ...readWebhookEndpoints(context)], context);
  return { record, signingSecret };
}

export function updateWorkspaceWebhookEndpoint(
  endpointId: string,
  patch: Partial<Omit<WorkspaceWebhookEndpoint, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>> & {
    signingSecret?: string;
  },
  context: WebhookRepositoryContext,
): WorkspaceWebhookEndpoint | null {
  const now = context.now ?? Date.now();
  let updatedEndpoint: WorkspaceWebhookEndpoint | null = null;
  const endpoints = readWebhookEndpoints(context).map((endpoint) => {
    if (endpoint.id !== endpointId) return endpoint;
    const nextName = normalizeText(patch.name, endpoint.name);
    const nextSecret = patch.signingSecret?.trim();
    const nextLast4 = nextSecret ? secretLast4(nextSecret) : patch.signingSecretLast4 ?? endpoint.signingSecretLast4;
    updatedEndpoint = normalizeWebhookEndpoint(
      {
        ...endpoint,
        ...patch,
        id: endpoint.id,
        name: nextName,
        signingSecretLast4: nextLast4,
        signingSecretRef: nextSecret ? signingSecretRef(nextName, nextLast4, now) : patch.signingSecretRef ?? endpoint.signingSecretRef,
        createdAt: endpoint.createdAt,
        updatedAt: now,
      },
      context,
    );
    return updatedEndpoint;
  });

  writeWebhookEndpoints(endpoints, context);
  return updatedEndpoint;
}

export function deleteWorkspaceWebhookEndpoint(
  endpointId: string,
  context: WebhookRepositoryContext,
): boolean {
  const endpoints = readWebhookEndpoints(context);
  const remaining = endpoints.filter((endpoint) => endpoint.id !== endpointId);
  if (remaining.length === endpoints.length) return false;
  writeWebhookEndpoints(remaining, context);
  return true;
}

export function exportWorkspaceWebhookEndpointRows(
  endpoints: WorkspaceWebhookEndpoint[],
): WorkspaceWebhookExportRow[] {
  return sortWebhookEndpoints(endpoints).map((endpoint) => ({
    id: endpoint.id,
    name: endpoint.name,
    url: endpoint.url,
    status: endpoint.status,
    events: endpoint.events,
    signingSecretLast4: endpoint.signingSecretLast4,
    failureCount: endpoint.failureCount,
  }));
}
