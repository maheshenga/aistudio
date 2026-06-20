import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';

export type WorkspaceMediaAccountStatus = 'active' | 'rate_limited' | 'offline' | 'needs_config';

export interface WorkspaceMediaAccount {
  id: string;
  workspaceId: string;
  platformName: string;
  status: WorkspaceMediaAccountStatus;
  connectedAccounts: number;
  ownerId: string | null;
  scopes: string[];
  credentialRef: string | null;
  clientIdLast4: string | null;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface WorkspaceMediaAccountInput {
  platformName: string;
  status?: string;
  connectedAccounts?: number;
  ownerId?: string;
  scopes?: string[];
  clientId?: string;
  metadata?: Record<string, unknown>;
}

export interface MediaRepositoryContext {
  workspaceId: string;
  storage?: StorageLike | null;
  now?: number;
}

export interface WorkspaceMediaSummary {
  totalConnectedAccounts: number;
  activeProviderCount: number;
  rateLimitedCount: number;
}

export const MEDIA_ACCOUNT_STORAGE_PREFIX = 'aistudio_workspace_media_accounts';

const MEDIA_ACCOUNT_STATUSES: readonly WorkspaceMediaAccountStatus[] = [
  'active',
  'rate_limited',
  'offline',
  'needs_config',
];

const DEFAULT_MEDIA_ACCOUNTS: Array<Omit<WorkspaceMediaAccount, 'workspaceId' | 'createdAt' | 'updatedAt'>> = [
  {
    id: 'media_youtube_api',
    platformName: 'YouTube API v3',
    status: 'active',
    connectedAccounts: 423,
    ownerId: null,
    scopes: ['content.read', 'content.publish'],
    credentialRef: 'env:YOUTUBE_OAUTH_CLIENT',
    clientIdLast4: null,
    metadata: { seeded: true },
  },
  {
    id: 'media_x_api',
    platformName: 'X API v2',
    status: 'rate_limited',
    connectedAccounts: 102,
    ownerId: null,
    scopes: ['content.read', 'content.publish'],
    credentialRef: 'env:X_OAUTH_CLIENT',
    clientIdLast4: null,
    metadata: { seeded: true },
  },
  {
    id: 'media_tiktok_creator',
    platformName: 'TikTok Creator',
    status: 'active',
    connectedAccounts: 340,
    ownerId: null,
    scopes: ['content.publish'],
    credentialRef: 'env:TIKTOK_OAUTH_CLIENT',
    clientIdLast4: null,
    metadata: { seeded: true },
  },
  {
    id: 'media_wechat_mp',
    platformName: '微信公众号',
    status: 'active',
    connectedAccounts: 89,
    ownerId: null,
    scopes: ['content.publish'],
    credentialRef: 'env:WECHAT_MP_APP_ID',
    clientIdLast4: null,
    metadata: { seeded: true },
  },
];

function mediaStorageKey(context: MediaRepositoryContext): string {
  return `${MEDIA_ACCOUNT_STORAGE_PREFIX}:${context.workspaceId}`;
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeStatus(value: unknown): WorkspaceMediaAccountStatus {
  return typeof value === 'string' && MEDIA_ACCOUNT_STATUSES.includes(value as WorkspaceMediaAccountStatus)
    ? value as WorkspaceMediaAccountStatus
    : 'needs_config';
}

function normalizeCount(value: unknown): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? Math.floor(numericValue) : 0;
}

function normalizeScopes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((scope): scope is string => typeof scope === 'string' && scope.trim().length > 0)
      .map((scope) => scope.trim()),
  ));
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}

function clientIdLast4(clientId: string | undefined): string | null {
  if (!clientId?.trim()) return null;
  return clientId.trim().slice(-4);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'media';
}

function credentialRef(platformName: string, clientId: string | undefined, now: number): string | null {
  const last4 = clientIdLast4(clientId);
  if (!last4) return null;
  return `media_oauth_${slugify(platformName)}_${last4}_${now}`;
}

function normalizeMediaAccount(
  account: Partial<WorkspaceMediaAccount>,
  context: MediaRepositoryContext,
): WorkspaceMediaAccount {
  const now = context.now ?? Date.now();
  return {
    id: normalizeText(account.id, `media_${now}_${Math.random().toString(36).slice(2, 8)}`),
    workspaceId: context.workspaceId,
    platformName: normalizeText(account.platformName, 'Untitled platform'),
    status: normalizeStatus(account.status),
    connectedAccounts: normalizeCount(account.connectedAccounts),
    ownerId: typeof account.ownerId === 'string' && account.ownerId.trim()
      ? account.ownerId.trim()
      : null,
    scopes: normalizeScopes(account.scopes),
    credentialRef: typeof account.credentialRef === 'string' && account.credentialRef.trim()
      ? account.credentialRef.trim()
      : null,
    clientIdLast4: typeof account.clientIdLast4 === 'string' && account.clientIdLast4.trim()
      ? account.clientIdLast4.trim()
      : null,
    createdAt: normalizeTimestamp(account.createdAt, now),
    updatedAt: normalizeTimestamp(account.updatedAt, now),
    metadata: account.metadata && typeof account.metadata === 'object' && !Array.isArray(account.metadata)
      ? account.metadata
      : {},
  };
}

function sortMediaAccounts(accounts: WorkspaceMediaAccount[]): WorkspaceMediaAccount[] {
  return accounts.slice().sort((a, b) =>
    Number(b.status === 'active') - Number(a.status === 'active') ||
    b.connectedAccounts - a.connectedAccounts ||
    a.platformName.localeCompare(b.platformName),
  );
}

function readMediaAccounts(context: MediaRepositoryContext): WorkspaceMediaAccount[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(mediaStorageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortMediaAccounts(parsed.map((account) => normalizeMediaAccount(account as Partial<WorkspaceMediaAccount>, context)));
  } catch {
    return [];
  }
}

function writeMediaAccounts(
  accounts: WorkspaceMediaAccount[],
  context: MediaRepositoryContext,
): WorkspaceMediaAccount[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = sortMediaAccounts(accounts.map((account) => normalizeMediaAccount(account, context)));
  storage?.setItem(mediaStorageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('workspace_media_accounts_updated', { detail: { workspaceId: context.workspaceId } }));
  }
  return normalized;
}

export function getDefaultWorkspaceMediaAccounts(context: MediaRepositoryContext): WorkspaceMediaAccount[] {
  const now = context.now ?? Date.now();
  return DEFAULT_MEDIA_ACCOUNTS.map((account) => normalizeMediaAccount(
    {
      ...account,
      workspaceId: context.workspaceId,
      createdAt: now,
      updatedAt: now,
    },
    context,
  ));
}

export function loadWorkspaceMediaAccounts(context: MediaRepositoryContext): WorkspaceMediaAccount[] {
  if (mediaApiClient.configured) return mediaCache.get(context.workspaceId) ?? [];
  return readMediaAccounts(context);
}

export function saveWorkspaceMediaAccounts(
  accounts: WorkspaceMediaAccount[],
  context: MediaRepositoryContext,
): WorkspaceMediaAccount[] {
  return writeMediaAccounts(accounts, context);
}

export function ensureDefaultWorkspaceMediaAccounts(context: MediaRepositoryContext): WorkspaceMediaAccount[] {
  const existingAccounts = readMediaAccounts(context);
  if (existingAccounts.length > 0) return existingAccounts;
  return writeMediaAccounts(getDefaultWorkspaceMediaAccounts(context), context);
}

export function createWorkspaceMediaAccount(
  input: WorkspaceMediaAccountInput,
  context: MediaRepositoryContext,
): WorkspaceMediaAccount {
  const now = context.now ?? Date.now();
  const account = normalizeMediaAccount(
    {
      id: `media_${slugify(input.platformName)}_${now}_${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: context.workspaceId,
      platformName: input.platformName,
      status: normalizeStatus(input.status),
      connectedAccounts: input.connectedAccounts,
      ownerId: input.ownerId,
      scopes: input.scopes,
      credentialRef: credentialRef(input.platformName, input.clientId, now),
      clientIdLast4: clientIdLast4(input.clientId),
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    },
    context,
  );

  writeMediaAccounts([account, ...ensureDefaultWorkspaceMediaAccounts(context)], context);
  if (mediaApiClient.configured) {
    mediaCache.set(context.workspaceId, sortMediaAccounts([account, ...(mediaCache.get(context.workspaceId) ?? [])]));
    void mediaApiClient.post(context.workspaceId, 'media-accounts', {
      id: account.id, platformName: account.platformName, status: account.status,
      connectedAccounts: account.connectedAccounts, ownerId: account.ownerId ?? undefined, scopes: account.scopes,
      credentialRef: account.credentialRef ?? undefined,
      clientIdLast4: account.clientIdLast4 ?? undefined, metadata: account.metadata,
    }).then((r) => { if (!r.ok) console.error('createWorkspaceMediaAccount write-through failed', r); })
      .catch((e) => console.error('createWorkspaceMediaAccount write-through failed', e));
  }
  return account;
}

export function updateWorkspaceMediaAccount(
  accountId: string,
  patch: Partial<Omit<WorkspaceMediaAccount, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>> & { clientId?: string },
  context: MediaRepositoryContext,
): WorkspaceMediaAccount | null {
  const now = context.now ?? Date.now();
  let updatedAccount: WorkspaceMediaAccount | null = null;
  const updatedAccounts = ensureDefaultWorkspaceMediaAccounts(context).map((account) => {
    if (account.id !== accountId) return account;
    const nextCredentialRef = patch.clientId
      ? credentialRef(account.platformName, patch.clientId, now)
      : patch.credentialRef ?? account.credentialRef;
    const nextClientIdLast4 = patch.clientId ? clientIdLast4(patch.clientId) : patch.clientIdLast4 ?? account.clientIdLast4;
    updatedAccount = normalizeMediaAccount(
      {
        ...account,
        ...patch,
        id: account.id,
        createdAt: account.createdAt,
        updatedAt: now,
        credentialRef: nextCredentialRef,
        clientIdLast4: nextClientIdLast4,
      },
      context,
    );
    return updatedAccount;
  });

  writeMediaAccounts(updatedAccounts, context);
  if (mediaApiClient.configured && updatedAccount) {
    const u: WorkspaceMediaAccount = updatedAccount;
    mediaCache.set(context.workspaceId, sortMediaAccounts((mediaCache.get(context.workspaceId) ?? []).map((m) => (m.id === u.id ? u : m))));
    void mediaApiClient.patch(context.workspaceId, `media-accounts/${u.id}`, {
      platformName: u.platformName, status: u.status, connectedAccounts: u.connectedAccounts,
      ownerId: u.ownerId ?? undefined, scopes: u.scopes,
      credentialRef: u.credentialRef ?? undefined, clientIdLast4: u.clientIdLast4 ?? undefined, metadata: u.metadata,
    }).then((r) => { if (!r.ok) console.error('updateWorkspaceMediaAccount write-through failed', r); })
      .catch((e) => console.error('updateWorkspaceMediaAccount write-through failed', e));
  }
  return updatedAccount;
}

export function summarizeWorkspaceMediaAccounts(
  accounts: WorkspaceMediaAccount[],
): WorkspaceMediaSummary {
  return accounts.reduce<WorkspaceMediaSummary>(
    (summary, account) => ({
      totalConnectedAccounts: summary.totalConnectedAccounts + account.connectedAccounts,
      activeProviderCount: summary.activeProviderCount + (account.status === 'active' ? 1 : 0),
      rateLimitedCount: summary.rateLimitedCount + (account.status === 'rate_limited' ? 1 : 0),
    }),
    {
      totalConnectedAccounts: 0,
      activeProviderCount: 0,
      rateLimitedCount: 0,
    },
  );
}

let mediaApiClient: ApiClient = defaultApiClient;
export function __setMediaApiClientForTest(client: ApiClient): void { mediaApiClient = client; }

const mediaCache = new Map<string, WorkspaceMediaAccount[]>(); // key = workspaceId

export async function hydrateWorkspaceMediaAccounts(context: MediaRepositoryContext): Promise<void> {
  if (!mediaApiClient.configured) return;
  const res = await mediaApiClient.get<{ items: WorkspaceMediaAccount[]; nextCursor: string | null }>(
    context.workspaceId, 'media-accounts');
  if (res.ok && res.value && Array.isArray(res.value.items)) {
    mediaCache.set(context.workspaceId, sortMediaAccounts(res.value.items.map((m) => normalizeMediaAccount(m, context))));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('workspace_media_accounts_updated', { detail: { workspaceId: context.workspaceId } }));
    }
  }
}
