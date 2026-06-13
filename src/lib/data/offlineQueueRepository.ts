import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export interface OfflineQueueItem {
  id: string;
  workspaceId: string;
  userId?: string;
  key: string;
  value: unknown;
  timestamp: string;
}

export interface OfflineQueueInput {
  key: string;
  value: unknown;
}

export interface OfflineQueueRepositoryContext {
  workspaceId: string;
  userId?: string;
  storage?: StorageLike | null;
  now?: number;
}

export const OFFLINE_QUEUE_STORAGE_PREFIX = 'aistudio_offline_queue';

function storageKey(context: OfflineQueueRepositoryContext): string {
  const ownerId = context.userId ?? 'workspace';
  return `${OFFLINE_QUEUE_STORAGE_PREFIX}:${context.workspaceId}:${ownerId}`;
}

function emitQueueUpdated(context: OfflineQueueRepositoryContext) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent('offlineQueueUpdated', {
    detail: {
      workspaceId: context.workspaceId,
      userId: context.userId,
    },
  }));
}

function normalizeItem(item: Partial<OfflineQueueItem>, context: OfflineQueueRepositoryContext): OfflineQueueItem {
  const now = context.now ?? Date.now();
  return {
    id: String(item.id ?? `offline_${now}_${Math.random().toString(36).slice(2, 8)}`),
    workspaceId: context.workspaceId,
    userId: item.userId ?? context.userId,
    key: typeof item.key === 'string' ? item.key : '',
    value: item.value,
    timestamp: typeof item.timestamp === 'string' ? item.timestamp : new Date(now).toISOString(),
  };
}

function readQueue(context: OfflineQueueRepositoryContext): OfflineQueueItem[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(storageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeItem(item as Partial<OfflineQueueItem>, context));
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineQueueItem[], context: OfflineQueueRepositoryContext): OfflineQueueItem[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = queue.map((item) => normalizeItem(item, context));
  storage?.setItem(storageKey(context), JSON.stringify(normalized));
  emitQueueUpdated(context);
  return normalized;
}

export function loadOfflineQueue(context: OfflineQueueRepositoryContext): OfflineQueueItem[] {
  return readQueue(context);
}

export function saveOfflineQueue(
  queue: OfflineQueueItem[],
  context: OfflineQueueRepositoryContext,
): OfflineQueueItem[] {
  return writeQueue(queue, context);
}

export function createOfflineQueueItem(
  input: OfflineQueueInput,
  context: OfflineQueueRepositoryContext,
): OfflineQueueItem {
  const now = context.now ?? Date.now();
  const item = normalizeItem(
    {
      id: `offline_${now}_${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: context.workspaceId,
      userId: context.userId,
      key: input.key,
      value: input.value,
      timestamp: new Date(now).toISOString(),
    },
    context,
  );
  writeQueue([...readQueue(context), item], context);
  return item;
}

export function deleteOfflineQueueItem(
  itemId: string,
  context: OfflineQueueRepositoryContext,
): OfflineQueueItem[] {
  return writeQueue(readQueue(context).filter((item) => item.id !== itemId), context);
}
