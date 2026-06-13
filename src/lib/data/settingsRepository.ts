import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

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

function readSettings(context: SettingsRepositoryContext): SettingsRecord {
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
  const storage = getRepositoryStorage(context.storage);
  storage?.setItem(storageKey(context), JSON.stringify(settings));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('settings_updated', {
      detail: {
        workspaceId: context.workspaceId,
        userId: context.userId,
      },
    }));
  }
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
  return writeSettings(nextSettings, context);
}
