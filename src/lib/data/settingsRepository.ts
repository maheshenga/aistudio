import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';

export type SettingValue = string | number | boolean | null | Record<string, unknown> | unknown[];
export type SettingsRecord = Record<string, SettingValue>;

export interface SettingsRepositoryContext {
  workspaceId: string;
  userId?: string;
  storage?: StorageLike | null;
}

export const SETTINGS_STORAGE_PREFIX = 'aistudio_settings';

function storageKey(context: SettingsRepositoryContext): string {
  const ownerId = context.userId ?? 'workspace';
  return `${SETTINGS_STORAGE_PREFIX}:${context.workspaceId}:${ownerId}`;
}

let settingsApiClient: ApiClient = defaultApiClient;
export function __setSettingsApiClientForTest(client: ApiClient): void { settingsApiClient = client; }

const settingsCache = new Map<string, SettingsRecord>(); // key = `${workspaceId}:${ownerId}`

function ownerIdOf(context: SettingsRepositoryContext): string {
  return context.userId ?? 'workspace';
}
function cacheKeyOf(context: SettingsRepositoryContext): string {
  return `${context.workspaceId}:${ownerIdOf(context)}`;
}

function emitSettingsUpdated(context: SettingsRepositoryContext): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('settings_updated', {
      detail: {
        workspaceId: context.workspaceId,
        userId: context.userId,
      },
    }));
  }
}

export async function hydrateSettings(context: SettingsRepositoryContext): Promise<void> {
  if (!settingsApiClient.configured) return;
  const res = await settingsApiClient.get<SettingsRecord>(
    context.workspaceId,
    `settings?ownerId=${encodeURIComponent(ownerIdOf(context))}`,
  );
  if (res.ok && res.value && typeof res.value === 'object' && !Array.isArray(res.value)) {
    settingsCache.set(cacheKeyOf(context), res.value as SettingsRecord);
    emitSettingsUpdated(context);
  }
}

function readSettings(context: SettingsRepositoryContext): SettingsRecord {
  if (settingsApiClient.configured) {
    const cached = settingsCache.get(cacheKeyOf(context));
    if (cached) return cached;
  }
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(storageKey(context));
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as SettingsRecord;
  } catch {
    return {};
  }
}

function writeSettings(settings: SettingsRecord, context: SettingsRepositoryContext): SettingsRecord {
  if (settingsApiClient.configured) {
    settingsCache.set(cacheKeyOf(context), settings);
    void settingsApiClient
      .patch(context.workspaceId, `settings?ownerId=${encodeURIComponent(ownerIdOf(context))}`, { patch: settings })
      .then((r) => { if (!r.ok) console.error('writeSettings write-through failed', r); })
      .catch((e) => console.error('writeSettings write-through failed', e));
  } else {
    const storage = getRepositoryStorage(context.storage);
    storage?.setItem(storageKey(context), JSON.stringify(settings));
  }
  emitSettingsUpdated(context);
  return settings;
}

export function loadSettings(context: SettingsRepositoryContext): SettingsRecord {
  return readSettings(context);
}

export function getSetting<T extends SettingValue>(
  key: string,
  fallback: T,
  context: SettingsRepositoryContext,
): T {
  const settings = readSettings(context);
  return Object.prototype.hasOwnProperty.call(settings, key) ? (settings[key] as T) : fallback;
}

export function saveSetting<T extends SettingValue>(
  key: string,
  value: T,
  context: SettingsRepositoryContext,
): SettingsRecord {
  return writeSettings({ ...readSettings(context), [key]: value }, context);
}

export function saveSettings(
  patch: SettingsRecord,
  context: SettingsRepositoryContext,
): SettingsRecord {
  return writeSettings({ ...readSettings(context), ...patch }, context);
}

export function deleteSetting(key: string, context: SettingsRepositoryContext): SettingsRecord {
  const nextSettings = { ...readSettings(context) };
  delete nextSettings[key];
  if (settingsApiClient.configured) {
    settingsCache.set(cacheKeyOf(context), nextSettings);
    void settingsApiClient
      .del(context.workspaceId, `settings/${encodeURIComponent(key)}?ownerId=${encodeURIComponent(ownerIdOf(context))}`)
      .then((r) => { if (!r.ok) console.error('deleteSetting write-through failed', r); })
      .catch((e) => console.error('deleteSetting write-through failed', e));
    emitSettingsUpdated(context);
    return nextSettings;
  }
  return writeSettings(nextSettings, context);
}
