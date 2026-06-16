import { apiClient as defaultApiClient, type ApiClient } from './apiClient';
import { getRepositoryStorage } from './dataBackend';
import type { StorageLike } from '../../saas/localAuthSession';

export interface ResourceContext {
  workspaceId: string;
  storage?: StorageLike | null;
}

export interface ResourceRepositoryConfig<T extends { id: string }> {
  resource: string;       // API 路径段,如 'customers'
  storagePrefix: string;  // localStorage 兜底键前缀
  normalize: (raw: unknown, ctx: ResourceContext) => T;
  sort?: (a: T, b: T) => number;
}

export interface ResourceRepository<T extends { id: string }> {
  configured: boolean;
  hydrate(ctx: ResourceContext): Promise<void>;
  list(ctx: ResourceContext): T[];
  create(ctx: ResourceContext, input: Partial<T>): Promise<T>;
  update(ctx: ResourceContext, id: string, patch: Partial<T>): Promise<T | null>;
  remove(ctx: ResourceContext, id: string): Promise<void>;
  __setApiClientForTest(client: ApiClient): void;
}

export function createWorkspaceResourceRepository<T extends { id: string }>(
  config: ResourceRepositoryConfig<T>,
): ResourceRepository<T> {
  let api: ApiClient = defaultApiClient;
  const cache = new Map<string, T[]>(); // key = workspaceId

  const storageKey = (ctx: ResourceContext) => `${config.storagePrefix}:${ctx.workspaceId}`;
  const applySort = (rows: T[]) => (config.sort ? rows.slice().sort(config.sort) : rows);

  function readLocal(ctx: ResourceContext): T[] {
    const storage = getRepositoryStorage(ctx.storage);
    const raw = storage?.getItem(storageKey(ctx));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? applySort(parsed.map((r) => config.normalize(r, ctx))) : [];
    } catch { return []; }
  }

  function writeLocal(ctx: ResourceContext, rows: T[]): T[] {
    const storage = getRepositoryStorage(ctx.storage);
    const normalized = applySort(rows.map((r) => config.normalize(r, ctx)));
    storage?.setItem(storageKey(ctx), JSON.stringify(normalized));
    return normalized;
  }

  return {
    get configured() { return api.configured; },

    async hydrate(ctx) {
      if (!api.configured) return;
      const res = await api.get<{ items: unknown[]; nextCursor: string | null }>(ctx.workspaceId, config.resource);
      if (res.ok && res.value && Array.isArray(res.value.items)) {
        cache.set(ctx.workspaceId, applySort(res.value.items.map((r) => config.normalize(r, ctx))));
      }
    },

    list(ctx) {
      if (!api.configured) return readLocal(ctx);
      return cache.get(ctx.workspaceId) ?? [];
    },

    async create(ctx, input) {
      if (!api.configured) {
        const created = config.normalize(input, ctx);
        writeLocal(ctx, [created, ...readLocal(ctx)]);
        return created;
      }
      // 乐观:先入缓存
      const optimistic = config.normalize(input, ctx);
      const prev = cache.get(ctx.workspaceId) ?? [];
      cache.set(ctx.workspaceId, applySort([optimistic, ...prev]));
      const res = await api.post<T>(ctx.workspaceId, config.resource, input);
      if (!res.ok || !res.value) { cache.set(ctx.workspaceId, prev); throw new Error(res.ok ? 'empty response' : res.error.message); }
      const saved = config.normalize(res.value, ctx);
      cache.set(ctx.workspaceId, applySort([saved, ...prev.filter((r) => r.id !== saved.id)]));
      return saved;
    },

    async update(ctx, id, patch) {
      if (!api.configured) {
        let updated: T | null = null;
        const rows = readLocal(ctx).map((r) => {
          if (r.id !== id) return r;
          updated = config.normalize({ ...r, ...patch, id }, ctx);
          return updated;
        });
        writeLocal(ctx, rows);
        return updated;
      }
      const prev = cache.get(ctx.workspaceId) ?? [];
      const res = await api.patch<T>(ctx.workspaceId, `${config.resource}/${id}`, patch);
      if (!res.ok) { cache.set(ctx.workspaceId, prev); throw new Error(res.error.message); }
      if (!res.value) return null;
      const saved = config.normalize(res.value, ctx);
      cache.set(ctx.workspaceId, applySort(prev.map((r) => (r.id === id ? saved : r))));
      return saved;
    },

    async remove(ctx, id) {
      if (!api.configured) {
        writeLocal(ctx, readLocal(ctx).filter((r) => r.id !== id));
        return;
      }
      const prev = cache.get(ctx.workspaceId) ?? [];
      cache.set(ctx.workspaceId, prev.filter((r) => r.id !== id)); // 乐观移除
      const res = await api.del(ctx.workspaceId, `${config.resource}/${id}`);
      if (!res.ok) { cache.set(ctx.workspaceId, prev); throw new Error(res.error.message); }
    },

    __setApiClientForTest(client) { api = client; },
  };
}
