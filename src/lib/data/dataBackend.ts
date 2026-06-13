import { get as getDbValue, ref as dbRef, remove as removeDbValue, set as setDbValue } from 'firebase/database';

import type { StorageLike } from '../../saas/localAuthSession';
import { initFirebaseDb } from '../firebaseConfig';

export type DataBackendMode = 'local' | 'firebase' | 'http';
export type DataBackendStorageKind = 'localStorage' | 'remote';
export type DataBackendErrorCode =
  | 'backend_unconfigured'
  | 'network_error'
  | 'permission_denied'
  | 'parse_error'
  | 'unknown_error';

export interface DataBackendEnvironment {
  VITE_DATA_BACKEND?: string;
  VITE_DATA_API_URL?: string;
  VITE_FIREBASE_DATABASE_URL?: string;
}

export interface DataBackendDescriptor {
  mode: DataBackendMode;
  configured: boolean;
  storageKind: DataBackendStorageKind;
  remoteKind?: Exclude<DataBackendMode, 'local'>;
  warnings: string[];
}

export interface DataBackendRecordPath {
  workspaceId: string;
  collection: string;
  userId?: string;
  recordId?: string;
}

export interface DataBackendError {
  code: DataBackendErrorCode;
  message: string;
}

export type DataBackendResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: DataBackendError };

export interface DataBackendAdapter {
  mode: DataBackendMode;
  configured: boolean;
  storageKind: DataBackendStorageKind;
  remoteKind?: Exclude<DataBackendMode, 'local'>;
  readJson<T = unknown>(path: DataBackendRecordPath): Promise<DataBackendResult<T | null>>;
  writeJson<T = unknown>(path: DataBackendRecordPath, value: T): Promise<DataBackendResult<T>>;
  remove(path: DataBackendRecordPath): Promise<DataBackendResult<void>>;
}

export interface FirebaseDataBackendDriver {
  read(path: string): Promise<unknown | null>;
  write(path: string, value: unknown): Promise<void>;
  remove(path: string): Promise<void>;
}

export interface CreateDataBackendAdapterOptions {
  env?: DataBackendEnvironment;
  storage?: StorageLike | null;
  fetcher?: typeof fetch;
  firebaseDriver?: FirebaseDataBackendDriver | null;
}

function readImportMetaEnv(): DataBackendEnvironment {
  try {
    return (import.meta.env ?? {}) as DataBackendEnvironment;
  } catch {
    return {};
  }
}

export function resolveDataBackendMode(env: DataBackendEnvironment = readImportMetaEnv()): DataBackendMode {
  if (env.VITE_DATA_BACKEND === 'firebase') return 'firebase';
  if (env.VITE_DATA_BACKEND === 'http') return 'http';
  return 'local';
}

export function getDataBackendDescriptor(env: DataBackendEnvironment = readImportMetaEnv()): DataBackendDescriptor {
  const mode = resolveDataBackendMode(env);
  if (mode === 'firebase') {
    const configured = Boolean(env.VITE_FIREBASE_DATABASE_URL);
    return {
      mode,
      configured,
      storageKind: 'remote',
      remoteKind: 'firebase',
      warnings: configured ? [] : ['VITE_FIREBASE_DATABASE_URL is required for firebase data backend.'],
    };
  }

  if (mode === 'http') {
    const configured = Boolean(env.VITE_DATA_API_URL);
    return {
      mode,
      configured,
      storageKind: 'remote',
      remoteKind: 'http',
      warnings: configured ? [] : ['VITE_DATA_API_URL is required for http data backend.'],
    };
  }

  return {
    mode,
    configured: true,
    storageKind: 'localStorage',
    warnings: [],
  };
}

export function createMemoryStorage(initialRecords: Record<string, string> = {}): StorageLike {
  const records = new Map(Object.entries(initialRecords));

  return {
    getItem: (key) => records.get(key) ?? null,
    setItem: (key, value) => {
      records.set(key, value);
    },
    removeItem: (key) => {
      records.delete(key);
    },
  };
}

export function getBrowserLocalStorage(): StorageLike | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage;
}

export function getRepositoryStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage !== undefined) return storage;
  return getBrowserLocalStorage();
}

function ok<T>(value: T): DataBackendResult<T> {
  return { ok: true, value };
}

function fail<T = never>(error: DataBackendError): DataBackendResult<T> {
  return { ok: false, error };
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value.trim());
}

export function buildDataBackendPath(path: DataBackendRecordPath): string {
  const segments = ['workspaces', path.workspaceId];
  if (path.userId) {
    segments.push('users', path.userId);
  }
  segments.push(path.collection);
  if (path.recordId) {
    segments.push(path.recordId);
  }
  return segments.map(encodePathSegment).join('/');
}

function storageKey(path: DataBackendRecordPath): string {
  return `aistudio_data:${buildDataBackendPath(path)}`;
}

export function normalizeDataBackendError(
  error: unknown,
  fallbackCode: DataBackendErrorCode = 'unknown_error',
): DataBackendError {
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    const maybeError = error as { code?: unknown; message?: unknown };
    if (typeof maybeError.code === 'string' && typeof maybeError.message === 'string') {
      return {
        code: maybeError.code as DataBackendErrorCode,
        message: maybeError.message,
      };
    }
  }

  if (error instanceof Error) {
    return {
      code: fallbackCode,
      message: error.message,
    };
  }

  return {
    code: fallbackCode,
    message: String(error || 'Unknown data backend error.'),
  };
}

function unconfiguredAdapter(descriptor: DataBackendDescriptor): DataBackendAdapter {
  const error: DataBackendError = {
    code: 'backend_unconfigured',
    message: descriptor.warnings[0] ?? `${descriptor.mode} data backend is not configured.`,
  };

  return {
    mode: descriptor.mode,
    configured: false,
    storageKind: descriptor.storageKind,
    remoteKind: descriptor.remoteKind,
    readJson: async () => fail(error),
    writeJson: async () => fail(error),
    remove: async () => fail(error),
  };
}

export function createLocalDataBackendAdapter(storage: StorageLike | null = getRepositoryStorage()): DataBackendAdapter {
  if (!storage) {
    return unconfiguredAdapter({
      mode: 'local',
      configured: false,
      storageKind: 'localStorage',
      warnings: ['localStorage is unavailable for the local data backend.'],
    });
  }

  return {
    mode: 'local',
    configured: true,
    storageKind: 'localStorage',
    readJson: async <T>(path: DataBackendRecordPath) => {
      const raw = storage.getItem(storageKey(path));
      if (!raw) return ok<T | null>(null);

      try {
        return ok(JSON.parse(raw) as T);
      } catch (error) {
        return fail(normalizeDataBackendError(error, 'parse_error'));
      }
    },
    writeJson: async <T>(path: DataBackendRecordPath, value: T) => {
      storage.setItem(storageKey(path), JSON.stringify(value));
      return ok(value);
    },
    remove: async (path: DataBackendRecordPath) => {
      storage.removeItem(storageKey(path));
      return ok(undefined);
    },
  };
}

function buildHttpUrl(baseUrl: string, path: DataBackendRecordPath): string {
  return `${baseUrl.replace(/\/+$/, '')}/${buildDataBackendPath(path)}`;
}

function mapHttpStatusToErrorCode(status: number): DataBackendErrorCode {
  if (status === 401 || status === 403) return 'permission_denied';
  return 'network_error';
}

export function createHttpDataBackendAdapter(
  baseUrl: string | undefined,
  fetcher: typeof fetch = fetch,
): DataBackendAdapter {
  if (!baseUrl) {
    return unconfiguredAdapter({
      mode: 'http',
      configured: false,
      storageKind: 'remote',
      remoteKind: 'http',
      warnings: ['VITE_DATA_API_URL is required for http data backend.'],
    });
  }

  return {
    mode: 'http',
    configured: true,
    storageKind: 'remote',
    remoteKind: 'http',
    readJson: async <T>(path: DataBackendRecordPath) => {
      try {
        const response = await fetcher(buildHttpUrl(baseUrl, path), { method: 'GET' });
        if (response.status === 404) return ok<T | null>(null);
        if (!response.ok) {
          return fail({
            code: mapHttpStatusToErrorCode(response.status),
            message: `HTTP data backend request failed with status ${response.status}.`,
          });
        }

        const payload = await response.json() as { value?: T };
        return ok((Object.prototype.hasOwnProperty.call(payload, 'value') ? payload.value : payload) as T);
      } catch (error) {
        return fail(normalizeDataBackendError(error, 'network_error'));
      }
    },
    writeJson: async <T>(path: DataBackendRecordPath, value: T) => {
      try {
        const response = await fetcher(buildHttpUrl(baseUrl, path), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value }),
        });
        if (!response.ok) {
          return fail({
            code: mapHttpStatusToErrorCode(response.status),
            message: `HTTP data backend write failed with status ${response.status}.`,
          });
        }
        return ok(value);
      } catch (error) {
        return fail(normalizeDataBackendError(error, 'network_error'));
      }
    },
    remove: async (path: DataBackendRecordPath) => {
      try {
        const response = await fetcher(buildHttpUrl(baseUrl, path), { method: 'DELETE' });
        if (!response.ok && response.status !== 404) {
          return fail({
            code: mapHttpStatusToErrorCode(response.status),
            message: `HTTP data backend delete failed with status ${response.status}.`,
          });
        }
        return ok(undefined);
      } catch (error) {
        return fail(normalizeDataBackendError(error, 'network_error'));
      }
    },
  };
}

export function createFirebaseDataBackendDriver(): FirebaseDataBackendDriver | null {
  const database = initFirebaseDb();
  if (!database) return null;

  return {
    read: async (path) => {
      const snapshot = await getDbValue(dbRef(database, path));
      return snapshot.exists() ? snapshot.val() : null;
    },
    write: async (path, value) => {
      await setDbValue(dbRef(database, path), value);
    },
    remove: async (path) => {
      await removeDbValue(dbRef(database, path));
    },
  };
}

export function createFirebaseDataBackendAdapter(driver: FirebaseDataBackendDriver | null): DataBackendAdapter {
  if (!driver) {
    return unconfiguredAdapter({
      mode: 'firebase',
      configured: false,
      storageKind: 'remote',
      remoteKind: 'firebase',
      warnings: ['Firebase database driver is unavailable for the firebase data backend.'],
    });
  }

  return {
    mode: 'firebase',
    configured: true,
    storageKind: 'remote',
    remoteKind: 'firebase',
    readJson: async <T>(path: DataBackendRecordPath) => {
      try {
        return ok(await driver.read(buildDataBackendPath(path)) as T | null);
      } catch (error) {
        return fail(normalizeDataBackendError(error, 'network_error'));
      }
    },
    writeJson: async <T>(path: DataBackendRecordPath, value: T) => {
      try {
        await driver.write(buildDataBackendPath(path), value);
        return ok(value);
      } catch (error) {
        return fail(normalizeDataBackendError(error, 'network_error'));
      }
    },
    remove: async (path: DataBackendRecordPath) => {
      try {
        await driver.remove(buildDataBackendPath(path));
        return ok(undefined);
      } catch (error) {
        return fail(normalizeDataBackendError(error, 'network_error'));
      }
    },
  };
}

export function createDataBackendAdapter(options: CreateDataBackendAdapterOptions = {}): DataBackendAdapter {
  const env = options.env ?? readImportMetaEnv();
  const descriptor = getDataBackendDescriptor(env);
  if (!descriptor.configured) return unconfiguredAdapter(descriptor);

  if (descriptor.mode === 'http') {
    return createHttpDataBackendAdapter(env.VITE_DATA_API_URL, options.fetcher);
  }

  if (descriptor.mode === 'firebase') {
    return createFirebaseDataBackendAdapter(options.firebaseDriver ?? createFirebaseDataBackendDriver());
  }

  return createLocalDataBackendAdapter(getRepositoryStorage(options.storage));
}
