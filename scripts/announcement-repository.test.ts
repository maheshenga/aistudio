import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setAnnouncementApiClientForTest,
  hydrateWorkspaceAnnouncements,
  loadWorkspaceAnnouncements,
  createWorkspaceAnnouncement,
} from '../src/lib/data/announcementRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'announcements') return { ok: true, value: { items: [{ id: 'srv1', title: 'Server Ann', channel: 'in-app', status: 'active' }], nextCursor: null } } as any;
      return { ok: true, value: null } as any;
    },
    post: async () => ({ ok: true, value: {} }) as any,
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
}

async function run() {
  const memA = new Map<string, string>();
  const storageA = { getItem: (k: string) => memA.get(k) ?? null, setItem: (k: string, v: string) => void memA.set(k, v), removeItem: (k: string) => void memA.delete(k) } as any;

  __setAnnouncementApiClientForTest(fakeApi(true));
  await hydrateWorkspaceAnnouncements({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceAnnouncements({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].title, 'Server Ann');

  createWorkspaceAnnouncement({ title: 'New One', channel: 'email' }, { workspaceId: 'wsA', storage: storageA });
  const afterCreate = loadWorkspaceAnnouncements({ workspaceId: 'wsA', storage: storageA });
  assert.equal(afterCreate.some((a) => a.title === 'New One'), true);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setAnnouncementApiClientForTest(fakeApi(false));
  createWorkspaceAnnouncement({ title: 'Local One', channel: 'email' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceAnnouncements({ workspaceId: 'wsB', storage });
  assert.equal(local.length, 1);
  assert.equal(local[0].title, 'Local One');

  console.log('announcement repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
