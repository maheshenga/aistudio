import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import { createWorkspaceResourceRepository } from '../src/lib/data/workspaceResourceClient.ts';

interface Row { id: string; name: string }
const normalize = (raw: unknown): Row => {
  const r = (raw ?? {}) as Partial<Row>;
  return { id: String(r.id ?? `row_${Math.random().toString(36).slice(2, 8)}`), name: String(r.name ?? '') };
};

function okApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    configured: true,
    get: async () => ({ ok: true, value: { items: [{ id: 'a', name: 'A' }], nextCursor: null } }) as any,
    post: async (_ws, _p, body: any) => ({ ok: true, value: { id: body.id ?? 'srv', name: body.name } }) as any,
    patch: async (_ws, _p, body: any) => ({ ok: true, value: { id: 'a', name: body.name } }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
    ...overrides,
  } as any;
}

async function run() {
  // configured: hydrate 填缓存,list 读缓存
  const repo = createWorkspaceResourceRepository<Row>({ resource: 'rows', storagePrefix: 'test_rows', normalize });
  repo.__setApiClientForTest(okApi());
  await repo.hydrate({ workspaceId: 'w' });
  assert.equal(repo.list({ workspaceId: 'w' }).length, 1);

  // create 乐观 + 服务端覆盖
  const created = await repo.create({ workspaceId: 'w' }, { id: 'b', name: 'B' });
  assert.equal(created.id, 'b');
  assert.equal(repo.list({ workspaceId: 'w' }).some((r) => r.id === 'b'), true);

  // 失败回滚:post 失败,缓存复原(create 前长度)
  const before = repo.list({ workspaceId: 'w' }).length;
  repo.__setApiClientForTest(okApi({ post: async () => ({ ok: false, error: { code: 'network_error', message: 'x' } }) as any }));
  await assert.rejects(repo.create({ workspaceId: 'w' }, { id: 'c', name: 'C' }));
  assert.equal(repo.list({ workspaceId: 'w' }).length, before);

  // 未配置:走 localStorage(用内存 storage stub)
  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  const local = createWorkspaceResourceRepository<Row>({ resource: 'rows', storagePrefix: 'test_rows', normalize });
  local.__setApiClientForTest({ configured: false } as any);
  await local.create({ workspaceId: 'w', storage }, { id: 'l1', name: 'L1' });
  assert.equal(local.list({ workspaceId: 'w', storage }).length, 1);

  console.log('workspace resource client passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
