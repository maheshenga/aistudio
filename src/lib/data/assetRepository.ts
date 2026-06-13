import type { ModuleId } from '../../types';
import type { AuditLog, AuthSession } from '../../saas/types';
import type { StorageLike } from '../../saas/localAuthSession';
import { logAuditEvent } from './auditLogRepository';
import { getRepositoryStorage } from './dataBackend';
import { createPricedWorkspaceUsageEvent, type WorkspaceUsageEvent } from './usageRepository';
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';

export type WorkspaceAssetType = 'image' | 'video' | 'audio' | 'document' | 'text' | 'other';
export type WorkspaceAssetSource = 'generated' | 'uploaded' | 'imported' | 'mock';

export interface WorkspaceAsset {
  id: string;
  workspaceId: string;
  userId?: string;
  name: string;
  type: WorkspaceAssetType;
  size: string;
  source: WorkspaceAssetSource;
  moduleId?: ModuleId;
  tags: string[];
  url?: string;
  previewUrl?: string;
  generationJobId?: string;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt?: number;
  metadata: Record<string, unknown>;
}

export interface WorkspaceAssetInput {
  name: string;
  type: WorkspaceAssetType;
  size?: string;
  source?: WorkspaceAssetSource;
  moduleId?: ModuleId;
  tags?: string[];
  url?: string;
  previewUrl?: string;
  generationJobId?: string;
  metadata?: Record<string, unknown>;
}

export interface AssetRepositoryContext {
  workspaceId: string;
  userId?: string;
  storage?: StorageLike | null;
  now?: number;
}

export interface WorkspaceAssetExportInput {
  asset: WorkspaceAsset;
  moduleId?: ModuleId;
  format: string;
  fileName: string;
  sourceAction: string;
  metered?: boolean;
  unitCount?: number;
  metadata?: Record<string, unknown>;
}

export interface AssetExportRepositoryContext extends AssetRepositoryContext {
  session: AuthSession;
}

export interface WorkspaceAssetExportRecord {
  asset: WorkspaceAsset;
  auditLog: AuditLog;
  usageEvent: WorkspaceUsageEvent | null;
}

export const ASSET_STORAGE_PREFIX = 'aistudio_workspace_assets';

function storageKey(context: AssetRepositoryContext): string {
  return `${ASSET_STORAGE_PREFIX}:${context.workspaceId}`;
}

function normalizeType(type: unknown): WorkspaceAssetType {
  if (type === 'image' || type === 'video' || type === 'audio' || type === 'document' || type === 'text') {
    return type;
  }
  return 'other';
}

function normalizeSource(source: unknown): WorkspaceAssetSource {
  if (source === 'generated' || source === 'uploaded' || source === 'imported' || source === 'mock') {
    return source;
  }
  return 'uploaded';
}

function normalizeAsset(asset: Partial<WorkspaceAsset>, context: AssetRepositoryContext): WorkspaceAsset {
  const now = context.now ?? Date.now();
  const name = typeof asset.name === 'string' && asset.name.trim() ? asset.name.trim() : 'Untitled asset';

  return {
    id: String(asset.id ?? `asset_${now}_${Math.random().toString(36).slice(2, 8)}`),
    workspaceId: context.workspaceId,
    userId: asset.userId ?? context.userId,
    name,
    type: normalizeType(asset.type),
    size: typeof asset.size === 'string' && asset.size.trim() ? asset.size.trim() : '0 KB',
    source: normalizeSource(asset.source),
    moduleId: asset.moduleId,
    tags: Array.isArray(asset.tags) ? asset.tags.map(String).filter(Boolean) : [],
    url: asset.url,
    previewUrl: asset.previewUrl,
    generationJobId: asset.generationJobId,
    createdAt: Number.isFinite(asset.createdAt) ? Number(asset.createdAt) : now,
    updatedAt: Number.isFinite(asset.updatedAt) ? Number(asset.updatedAt) : now,
    lastAccessedAt: Number.isFinite(asset.lastAccessedAt) ? Number(asset.lastAccessedAt) : undefined,
    metadata: asset.metadata && typeof asset.metadata === 'object' && !Array.isArray(asset.metadata)
      ? asset.metadata
      : {},
  };
}

function readAssets(context: AssetRepositoryContext): WorkspaceAsset[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(storageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((asset) => normalizeAsset(asset as Partial<WorkspaceAsset>, context));
  } catch {
    return [];
  }
}

function dispatchAssetsUpdated(workspaceId: string): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('assets_updated', { detail: { workspaceId } }));
  }
}

function writeAssets(assets: WorkspaceAsset[], context: AssetRepositoryContext): WorkspaceAsset[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = assets.map((asset) => normalizeAsset(asset, context));
  storage?.setItem(storageKey(context), JSON.stringify(normalized));
  dispatchAssetsUpdated(context.workspaceId);
  return normalized;
}

let assetApiClient: ApiClient = defaultApiClient;
export function __setAssetApiClientForTest(client: ApiClient): void { assetApiClient = client; }

const assetCache = new Map<string, WorkspaceAsset[]>(); // key=workspaceId

export async function hydrateWorkspaceAssets(context: AssetRepositoryContext): Promise<void> {
  if (!assetApiClient.configured) return;
  const res = await assetApiClient.get<WorkspaceAsset[]>(context.workspaceId, 'assets');
  if (res.ok && Array.isArray(res.value)) {
    assetCache.set(
      context.workspaceId,
      res.value.map((a) => normalizeAsset(a as Partial<WorkspaceAsset>, context)),
    );
    dispatchAssetsUpdated(context.workspaceId);
  }
}

export function loadWorkspaceAssets(context: AssetRepositoryContext): WorkspaceAsset[] {
  if (assetApiClient.configured) return assetCache.get(context.workspaceId) ?? [];
  return readAssets(context);
}

export function saveWorkspaceAssets(assets: WorkspaceAsset[], context: AssetRepositoryContext): WorkspaceAsset[] {
  if (assetApiClient.configured) {
    const normalized = assets.map((asset) => normalizeAsset(asset, context));
    assetCache.set(context.workspaceId, normalized);
    dispatchAssetsUpdated(context.workspaceId);
    return normalized;
  }
  return writeAssets(assets, context);
}

export function createWorkspaceAsset(input: WorkspaceAssetInput, context: AssetRepositoryContext): WorkspaceAsset {
  const now = context.now ?? Date.now();
  const asset = normalizeAsset(
    {
      ...input,
      id: `asset_${now}_${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: context.workspaceId,
      userId: context.userId,
      source: input.source ?? 'uploaded',
      size: input.size ?? '0 KB',
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      metadata: input.metadata ?? {},
    },
    context,
  );

  if (assetApiClient.configured) {
    assetCache.set(context.workspaceId, [...(assetCache.get(context.workspaceId) ?? []), asset]);
    dispatchAssetsUpdated(context.workspaceId);
    void assetApiClient
      .post(context.workspaceId, 'assets', {
        name: asset.name,
        type: asset.type,
        size: asset.size,
        source: asset.source,
        moduleId: asset.moduleId,
        tags: asset.tags,
        url: asset.url,
        previewUrl: asset.previewUrl,
        generationJobId: asset.generationJobId,
        metadata: asset.metadata,
      })
      .then((res) => { if (!res.ok) console.error('createWorkspaceAsset write-through failed', res); })
      .catch((err) => console.error('createWorkspaceAsset write-through failed', err));
    return asset;
  }

  writeAssets([...readAssets(context), asset], context);
  return asset;
}

export function updateWorkspaceAsset(
  assetId: string,
  patch: Partial<Omit<WorkspaceAsset, 'id' | 'workspaceId' | 'createdAt'>>,
  context: AssetRepositoryContext,
): WorkspaceAsset | null {
  const now = context.now ?? Date.now();
  let updatedAsset: WorkspaceAsset | null = null;
  const applyPatch = (asset: WorkspaceAsset): WorkspaceAsset => {
    if (asset.id !== assetId) return asset;
    updatedAsset = normalizeAsset({ ...asset, ...patch, updatedAt: now }, context);
    return updatedAsset;
  };

  if (assetApiClient.configured) {
    const current = assetCache.get(context.workspaceId) ?? [];
    assetCache.set(context.workspaceId, current.map(applyPatch));
    dispatchAssetsUpdated(context.workspaceId);
    if (updatedAsset) {
      void assetApiClient
        .patch(context.workspaceId, `assets/${assetId}`, { ...patch })
        .then((res) => { if (!res.ok) console.error('updateWorkspaceAsset write-through failed', res); })
        .catch((err) => console.error('updateWorkspaceAsset write-through failed', err));
    }
    return updatedAsset;
  }

  const updatedAssets = readAssets(context).map(applyPatch);

  writeAssets(updatedAssets, context);
  return updatedAsset;
}

export function deleteWorkspaceAssets(assetIds: string[], context: AssetRepositoryContext): WorkspaceAsset[] {
  const assetIdSet = new Set(assetIds);
  if (assetApiClient.configured) {
    const remaining = (assetCache.get(context.workspaceId) ?? []).filter((asset) => !assetIdSet.has(asset.id));
    assetCache.set(context.workspaceId, remaining);
    dispatchAssetsUpdated(context.workspaceId);
    for (const id of assetIds) {
      void assetApiClient
        .del(context.workspaceId, `assets/${id}`)
        .then((res) => { if (!res.ok) console.error('deleteWorkspaceAssets write-through failed', res); })
        .catch((err) => console.error('deleteWorkspaceAssets write-through failed', err));
    }
    return remaining;
  }
  return writeAssets(readAssets(context).filter((asset) => !assetIdSet.has(asset.id)), context);
}

export function listRecentWorkspaceAssets(
  context: AssetRepositoryContext,
  limit = 6,
): WorkspaceAsset[] {
  const source = assetApiClient.configured ? (assetCache.get(context.workspaceId) ?? []) : readAssets(context);
  return [...source]
    .sort((a, b) => (b.lastAccessedAt ?? b.updatedAt) - (a.lastAccessedAt ?? a.updatedAt))
    .slice(0, limit);
}

export function recordWorkspaceAssetExport(
  input: WorkspaceAssetExportInput,
  context: AssetExportRepositoryContext,
): WorkspaceAssetExportRecord {
  const exportedAt = context.now ?? Date.now();
  const moduleId = input.moduleId ?? input.asset.moduleId ?? 'assets';
  // Cascade: this does NOT call the asset endpoint directly. The asset-update part flows
  // through the migrated updateWorkspaceAsset, and the audit + usage sub-calls each
  // independently write-through via their own now-migrated sibling repositories.
  const asset = updateWorkspaceAsset(
    input.asset.id,
    { lastAccessedAt: exportedAt },
    context,
  ) ?? input.asset;
  const metadata = {
    ...(input.metadata ?? {}),
    assetId: asset.id,
    assetName: asset.name,
    assetType: asset.type,
    moduleId,
    format: input.format,
    fileName: input.fileName,
    sourceAction: input.sourceAction,
    actorId: context.session.user.id,
    actorRole: context.session.membership.role,
    workspaceId: context.workspaceId,
    exportedAt,
  };

  const auditLog = logAuditEvent(
    {
      action: 'asset_export',
      moduleId,
      targetType: 'asset',
      targetId: asset.id,
      metadata,
    },
    {
      session: context.session,
      storage: context.storage,
      now: exportedAt,
    },
  );

  const usageEvent = input.metered === false
    ? null
    : createPricedWorkspaceUsageEvent(
      {
        moduleId,
        pricingAction: 'export',
        kind: 'export',
        targetType: 'asset',
        targetId: asset.id,
        runtimeMode: 'web',
        unitCount: input.unitCount ?? 1,
        metadata,
      },
      context,
    );

  return { asset, auditLog, usageEvent };
}
