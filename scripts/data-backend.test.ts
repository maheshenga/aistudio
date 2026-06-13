import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildDataBackendPath,
  createDataBackendAdapter,
  createMemoryStorage,
  getDataBackendDescriptor,
  getRepositoryStorage,
  normalizeDataBackendError,
  resolveDataBackendMode,
} from '../src/lib/data/dataBackend.ts';

assert.equal(resolveDataBackendMode({}), 'local');
assert.equal(resolveDataBackendMode({ VITE_DATA_BACKEND: 'local' }), 'local');
assert.equal(resolveDataBackendMode({ VITE_DATA_BACKEND: 'firebase' }), 'firebase');
assert.equal(resolveDataBackendMode({ VITE_DATA_BACKEND: 'http' }), 'http');
assert.equal(resolveDataBackendMode({ VITE_DATA_BACKEND: 'unknown' }), 'local');

assert.deepEqual(
  getDataBackendDescriptor({ VITE_DATA_BACKEND: 'local' }),
  {
    mode: 'local',
    configured: true,
    storageKind: 'localStorage',
    warnings: [],
  },
);

assert.deepEqual(
  getDataBackendDescriptor({ VITE_DATA_BACKEND: 'firebase', VITE_FIREBASE_DATABASE_URL: 'https://example.firebaseio.com' }),
  {
    mode: 'firebase',
    configured: true,
    storageKind: 'remote',
    remoteKind: 'firebase',
    warnings: [],
  },
);

assert.equal(
  getDataBackendDescriptor({ VITE_DATA_BACKEND: 'http' }).configured,
  false,
  'http data backend should require VITE_DATA_API_URL',
);

const memoryStorage = createMemoryStorage({ existing: 'value' });
assert.equal(memoryStorage.getItem('existing'), 'value');
memoryStorage.setItem('next', '42');
assert.equal(memoryStorage.getItem('next'), '42');
memoryStorage.removeItem('next');
assert.equal(memoryStorage.getItem('next'), null);
assert.equal(getRepositoryStorage(memoryStorage), memoryStorage);

const settingsPath = {
  workspaceId: 'workspace_demo',
  userId: 'user_demo',
  collection: 'settings',
  recordId: 'daily_focus_goal',
};
assert.equal(
  buildDataBackendPath(settingsPath),
  'workspaces/workspace_demo/users/user_demo/settings/daily_focus_goal',
  'backend paths should preserve workspace and user tenancy',
);

const localStorage = createMemoryStorage();
const localBackend = createDataBackendAdapter({
  env: { VITE_DATA_BACKEND: 'local' },
  storage: localStorage,
});
assert.equal(localBackend.mode, 'local');
assert.equal(localBackend.configured, true);
assert.deepEqual(await localBackend.readJson(settingsPath), { ok: true, value: null });
assert.deepEqual(
  await localBackend.writeJson(settingsPath, { goal: 'Ship adapter' }),
  { ok: true, value: { goal: 'Ship adapter' } },
);
assert.deepEqual(await localBackend.readJson(settingsPath), { ok: true, value: { goal: 'Ship adapter' } });
assert.deepEqual(await localBackend.remove(settingsPath), { ok: true, value: undefined });
assert.deepEqual(await localBackend.readJson(settingsPath), { ok: true, value: null });

const httpRequests: Array<{ url: string; init?: RequestInit }> = [];
const httpBackend = createDataBackendAdapter({
  env: { VITE_DATA_BACKEND: 'http', VITE_DATA_API_URL: 'https://api.example.test/v1' },
  fetcher: async (url, init) => {
    httpRequests.push({ url: String(url), init });
    return new Response(JSON.stringify({ value: { source: 'http' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
assert.equal(httpBackend.mode, 'http');
assert.equal(httpBackend.configured, true);
assert.deepEqual(await httpBackend.readJson(settingsPath), { ok: true, value: { source: 'http' } });
assert.equal(
  httpRequests[0]?.url,
  'https://api.example.test/v1/workspaces/workspace_demo/users/user_demo/settings/daily_focus_goal',
);
assert.equal(httpRequests[0]?.init?.method, 'GET');
await httpBackend.writeJson(settingsPath, { source: 'http' });
assert.equal(httpRequests[1]?.init?.method, 'PUT');
assert.equal(httpRequests[1]?.init?.body, JSON.stringify({ value: { source: 'http' } }));
await httpBackend.remove(settingsPath);
assert.equal(httpRequests[2]?.init?.method, 'DELETE');

const firebasePaths: string[] = [];
const firebaseBackend = createDataBackendAdapter({
  env: { VITE_DATA_BACKEND: 'firebase', VITE_FIREBASE_DATABASE_URL: 'https://example.firebaseio.com' },
  firebaseDriver: {
    read: async (path) => {
      firebasePaths.push(`read:${path}`);
      return { source: 'firebase' };
    },
    write: async (path, value) => {
      firebasePaths.push(`write:${path}:${JSON.stringify(value)}`);
    },
    remove: async (path) => {
      firebasePaths.push(`remove:${path}`);
    },
  },
});
assert.equal(firebaseBackend.mode, 'firebase');
assert.equal(firebaseBackend.configured, true);
assert.deepEqual(await firebaseBackend.readJson(settingsPath), { ok: true, value: { source: 'firebase' } });
await firebaseBackend.writeJson(settingsPath, { source: 'firebase' });
await firebaseBackend.remove(settingsPath);
assert.deepEqual(firebasePaths, [
  'read:workspaces/workspace_demo/users/user_demo/settings/daily_focus_goal',
  'write:workspaces/workspace_demo/users/user_demo/settings/daily_focus_goal:{"source":"firebase"}',
  'remove:workspaces/workspace_demo/users/user_demo/settings/daily_focus_goal',
]);

const unconfiguredHttpBackend = createDataBackendAdapter({ env: { VITE_DATA_BACKEND: 'http' } });
const unconfiguredResult = await unconfiguredHttpBackend.readJson(settingsPath);
assert.equal(unconfiguredResult.ok, false);
assert.equal(unconfiguredResult.ok ? null : unconfiguredResult.error.code, 'backend_unconfigured');

assert.deepEqual(
  normalizeDataBackendError(new Error('permission denied'), 'permission_denied'),
  { code: 'permission_denied', message: 'permission denied' },
);

for (const filePath of [
  'src/lib/data/assetRepository.ts',
  'src/lib/data/auditLogRepository.ts',
  'src/lib/data/generationJobRepository.ts',
  'src/lib/data/offlineQueueRepository.ts',
  'src/lib/data/searchHistoryRepository.ts',
  'src/lib/data/settingsRepository.ts',
  'src/lib/data/taskRepository.ts',
  'src/lib/data/usageRepository.ts',
]) {
  const source = readFileSync(filePath, 'utf8');
  assert.ok(source.includes('./dataBackend'), `${filePath} should use the shared data backend adapter`);
  assert.equal(source.includes('function getDefaultStorage'), false, `${filePath} should not define its own default storage`);
}

console.log('data backend contract passed');
