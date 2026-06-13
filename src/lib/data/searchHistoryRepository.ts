import { onValue, ref as dbRef, set } from 'firebase/database';

import { initFirebaseDb } from '../firebaseConfig';
import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export const SEARCH_HISTORY_STORAGE_PREFIX = 'aistudio_search_history';

export interface SearchHistoryContext {
  workspaceId: string;
  userId: string;
  storage?: StorageLike | null;
}

function storageKey(context: SearchHistoryContext): string {
  return `${SEARCH_HISTORY_STORAGE_PREFIX}:${context.workspaceId}:${context.userId}`;
}

function normalizeHistory(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 5);
}

function firebasePath(context: SearchHistoryContext): string {
  return `workspaces/${context.workspaceId}/users/${context.userId}/search_history`;
}

export function loadSearchHistory(context: SearchHistoryContext): string[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(storageKey(context));
  if (!raw) return [];

  try {
    return normalizeHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveSearchHistory(items: string[], context: SearchHistoryContext): string[] {
  const normalized = normalizeHistory(items);
  const storage = getRepositoryStorage(context.storage);
  storage?.setItem(storageKey(context), JSON.stringify(normalized));

  const db = initFirebaseDb();
  if (db) {
    void set(dbRef(db, firebasePath(context)), normalized);
  }

  return normalized;
}

export function subscribeSearchHistory(
  context: SearchHistoryContext,
  onChange: (items: string[]) => void,
): () => void {
  const cached = loadSearchHistory(context);
  onChange(cached);

  const db = initFirebaseDb();
  if (!db) return () => {};

  return onValue(dbRef(db, firebasePath(context)), (snapshot) => {
    const next = normalizeHistory(snapshot.val());
    const storage = getRepositoryStorage(context.storage);
    storage?.setItem(storageKey(context), JSON.stringify(next));
    onChange(next);
  });
}
