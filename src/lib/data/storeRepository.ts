import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export interface WorkspaceStore {
  id: string;
  workspaceId: string;
  name: string;
  channel: string;
  location?: string;
  ownerId?: string;
  status: 'active' | 'paused' | 'closed';
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceStoreOrder {
  id: string;
  workspaceId: string;
  storeId: string;
  orderNumber: string;
  customerChannel?: string;
  amountCents: number;
  currency: string;
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'refunded' | 'cancelled';
  placedAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface WorkspaceStoreInventory {
  id: string;
  workspaceId: string;
  storeId: string;
  sku: string;
  name: string;
  stock: number;
  threshold: number;
  adjustments: WorkspaceInventoryAdjustment[];
  updatedAt: number;
}

export interface WorkspaceInventoryAdjustment {
  id: string;
  sku: string;
  storeId: string;
  beforeCount: number;
  afterCount: number;
  reason: string;
  actorId?: string;
  timestamp: number;
}

export interface WorkspaceStoreStaff {
  id: string;
  workspaceId: string;
  storeId: string;
  name: string;
  role: string;
  status: 'active' | 'on_leave' | 'terminated';
  ownerId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoreRepositoryContext {
  workspaceId: string;
  userId?: string;
  storage?: StorageLike | null;
  now?: number;
}

export const STORE_STORAGE_PREFIX = 'aistudio_workspace_stores';
export const STORE_ORDER_STORAGE_PREFIX = 'aistudio_workspace_store_orders';
export const STORE_INVENTORY_STORAGE_PREFIX = 'aistudio_workspace_store_inventory';
export const STORE_STAFF_STORAGE_PREFIX = 'aistudio_workspace_store_staff';

function key(prefix: string, ctx: StoreRepositoryContext): string { return `${prefix}:${ctx.workspaceId}`; }
function read<T>(prefix: string, ctx: StoreRepositoryContext): T[] {
  const storage = getRepositoryStorage(ctx.storage);
  const raw = storage?.getItem(key(prefix, ctx));
  if (!raw) return [];
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}
function write<T>(prefix: string, items: T[], ctx: StoreRepositoryContext): T[] {
  const storage = getRepositoryStorage(ctx.storage);
  storage?.setItem(key(prefix, ctx), JSON.stringify(items));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('workspace_stores_updated', { detail: { workspaceId: ctx.workspaceId } }));
  return items;
}

const now = (ctx: StoreRepositoryContext) => ctx.now ?? Date.now();
const rid = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Stores
export function loadWorkspaceStores(ctx: StoreRepositoryContext): WorkspaceStore[] { return read<WorkspaceStore>(STORE_STORAGE_PREFIX, ctx); }
export function createWorkspaceStore(input: Omit<WorkspaceStore, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>, ctx: StoreRepositoryContext): WorkspaceStore {
  const t = now(ctx); const s = { ...input, id: rid('store'), workspaceId: ctx.workspaceId, createdAt: t, updatedAt: t };
  write(STORE_STORAGE_PREFIX, [s, ...loadWorkspaceStores(ctx)], ctx); return s;
}
export function updateWorkspaceStore(id: string, patch: Partial<WorkspaceStore>, ctx: StoreRepositoryContext): WorkspaceStore | null {
  let u: WorkspaceStore | null = null;
  const items = loadWorkspaceStores(ctx).map(s => s.id === id ? (u = { ...s, ...patch, id: s.id, workspaceId: s.workspaceId, updatedAt: now(ctx) }) : s);
  write(STORE_STORAGE_PREFIX, items, ctx); return u;
}
export function deleteWorkspaceStore(id: string, ctx: StoreRepositoryContext): void {
  write(STORE_STORAGE_PREFIX, loadWorkspaceStores(ctx).filter(s => s.id !== id), ctx);
  write(STORE_ORDER_STORAGE_PREFIX, read<WorkspaceStoreOrder>(STORE_ORDER_STORAGE_PREFIX, ctx).filter(o => o.storeId !== id), ctx);
  write(STORE_INVENTORY_STORAGE_PREFIX, read<WorkspaceStoreInventory>(STORE_INVENTORY_STORAGE_PREFIX, ctx).filter(i => i.storeId !== id), ctx);
  write(STORE_STAFF_STORAGE_PREFIX, read<WorkspaceStoreStaff>(STORE_STAFF_STORAGE_PREFIX, ctx).filter(s => s.storeId !== id), ctx);
}

// Orders
export function loadWorkspaceStoreOrders(ctx: StoreRepositoryContext): WorkspaceStoreOrder[] { return read<WorkspaceStoreOrder>(STORE_ORDER_STORAGE_PREFIX, ctx); }
export function createWorkspaceStoreOrder(input: Omit<WorkspaceStoreOrder, 'id' | 'workspaceId' | 'placedAt' | 'updatedAt'>, ctx: StoreRepositoryContext): WorkspaceStoreOrder {
  const t = now(ctx); const o = { ...input, id: rid('order'), workspaceId: ctx.workspaceId, placedAt: t, updatedAt: t };
  write(STORE_ORDER_STORAGE_PREFIX, [o, ...loadWorkspaceStoreOrders(ctx)], ctx); return o;
}
export function updateWorkspaceStoreOrder(id: string, patch: Partial<WorkspaceStoreOrder>, ctx: StoreRepositoryContext): WorkspaceStoreOrder | null {
  let u: WorkspaceStoreOrder | null = null;
  const items = loadWorkspaceStoreOrders(ctx).map(o => o.id === id ? (u = { ...o, ...patch, id: o.id, workspaceId: o.workspaceId, updatedAt: now(ctx) }) : o);
  write(STORE_ORDER_STORAGE_PREFIX, items, ctx); return u;
}

// Inventory
export function loadWorkspaceStoreInventory(ctx: StoreRepositoryContext): WorkspaceStoreInventory[] { return read<WorkspaceStoreInventory>(STORE_INVENTORY_STORAGE_PREFIX, ctx); }
export function createWorkspaceStoreInventory(input: Omit<WorkspaceStoreInventory, 'id' | 'workspaceId' | 'adjustments' | 'updatedAt'>, ctx: StoreRepositoryContext): WorkspaceStoreInventory {
  const item = { ...input, id: rid('inv'), workspaceId: ctx.workspaceId, adjustments: [], updatedAt: now(ctx) };
  write(STORE_INVENTORY_STORAGE_PREFIX, [item, ...loadWorkspaceStoreInventory(ctx)], ctx); return item;
}
export function adjustWorkspaceStoreInventory(id: string, adjustment: Omit<WorkspaceInventoryAdjustment, 'id' | 'timestamp'>, ctx: StoreRepositoryContext): WorkspaceStoreInventory | null {
  let u: WorkspaceStoreInventory | null = null;
  const adj: WorkspaceInventoryAdjustment = { ...adjustment, id: rid('adj'), timestamp: now(ctx) };
  const items = loadWorkspaceStoreInventory(ctx).map(i => {
    if (i.id !== id) return i;
    u = { ...i, stock: adjustment.afterCount, adjustments: [adj, ...i.adjustments], updatedAt: now(ctx) };
    return u;
  });
  write(STORE_INVENTORY_STORAGE_PREFIX, items, ctx); return u;
}

// Staff
export function loadWorkspaceStoreStaff(ctx: StoreRepositoryContext): WorkspaceStoreStaff[] { return read<WorkspaceStoreStaff>(STORE_STAFF_STORAGE_PREFIX, ctx); }
export function createWorkspaceStoreStaff(input: Omit<WorkspaceStoreStaff, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>, ctx: StoreRepositoryContext): WorkspaceStoreStaff {
  const t = now(ctx); const s = { ...input, id: rid('staff'), workspaceId: ctx.workspaceId, createdAt: t, updatedAt: t };
  write(STORE_STAFF_STORAGE_PREFIX, [s, ...loadWorkspaceStoreStaff(ctx)], ctx); return s;
}
export function updateWorkspaceStoreStaff(id: string, patch: Partial<WorkspaceStoreStaff>, ctx: StoreRepositoryContext): WorkspaceStoreStaff | null {
  let u: WorkspaceStoreStaff | null = null;
  const items = loadWorkspaceStoreStaff(ctx).map(s => s.id === id ? (u = { ...s, ...patch, id: s.id, workspaceId: s.workspaceId, updatedAt: now(ctx) }) : s);
  write(STORE_STAFF_STORAGE_PREFIX, items, ctx); return u;
}
export function deleteWorkspaceStoreStaff(id: string, ctx: StoreRepositoryContext): void {
  write(STORE_STAFF_STORAGE_PREFIX, loadWorkspaceStoreStaff(ctx).filter(s => s.id !== id), ctx);
}
