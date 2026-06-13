import type { ModuleId } from '../../types';
import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export type WorkspaceCustomerLifecycleStage =
  | 'new_lead'
  | 'qualified'
  | 'contacted'
  | 'converted'
  | 'inactive';

export interface WorkspaceCustomerSource {
  moduleId?: ModuleId;
  campaignId?: string;
  campaignName?: string;
  sourceChannel?: string;
  landingPage?: string;
  touchpoint?: string;
  assetId?: string;
}

export interface WorkspaceCustomer {
  id: string;
  workspaceId: string;
  userId?: string;
  name: string;
  company?: string;
  role?: string;
  channel: string;
  lifecycleStage: WorkspaceCustomerLifecycleStage;
  ownerId?: string;
  tags: string[];
  source?: WorkspaceCustomerSource;
  notes?: string;
  lastInteractionAt: number;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface WorkspaceCustomerInput {
  name: string;
  company?: string;
  role?: string;
  channel?: string;
  lifecycleStage?: WorkspaceCustomerLifecycleStage;
  ownerId?: string;
  tags?: string[];
  source?: WorkspaceCustomerSource;
  notes?: string;
  lastInteractionAt?: number;
  metadata?: Record<string, unknown>;
}

export interface CustomerRepositoryContext {
  workspaceId: string;
  userId?: string;
  storage?: StorageLike | null;
  now?: number;
}

export const CUSTOMER_STORAGE_PREFIX = 'aistudio_workspace_customers';

const CUSTOMER_LIFECYCLE_STAGES: readonly WorkspaceCustomerLifecycleStage[] = [
  'new_lead',
  'qualified',
  'contacted',
  'converted',
  'inactive',
];

function storageKey(context: CustomerRepositoryContext): string {
  return `${CUSTOMER_STORAGE_PREFIX}:${context.workspaceId}`;
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeOptionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}

function normalizeLifecycleStage(value: unknown): WorkspaceCustomerLifecycleStage {
  return CUSTOMER_LIFECYCLE_STAGES.includes(value as WorkspaceCustomerLifecycleStage)
    ? value as WorkspaceCustomerLifecycleStage
    : 'new_lead';
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).map((item) => item.trim()).filter(Boolean))];
}

function normalizeSource(value: unknown): WorkspaceCustomerSource | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as WorkspaceCustomerSource;
  const normalized: WorkspaceCustomerSource = {
    moduleId: source.moduleId,
    campaignId: normalizeOptionalText(source.campaignId),
    campaignName: normalizeOptionalText(source.campaignName),
    sourceChannel: normalizeOptionalText(source.sourceChannel),
    landingPage: normalizeOptionalText(source.landingPage),
    touchpoint: normalizeOptionalText(source.touchpoint),
    assetId: normalizeOptionalText(source.assetId),
  };
  return Object.values(normalized).some(Boolean) ? normalized : undefined;
}

function normalizeCustomer(
  customer: Partial<WorkspaceCustomer>,
  context: CustomerRepositoryContext,
): WorkspaceCustomer {
  const now = context.now ?? Date.now();
  const createdAt = normalizeTimestamp(customer.createdAt, now);

  return {
    id: normalizeText(customer.id, `customer_${now}_${Math.random().toString(36).slice(2, 8)}`),
    workspaceId: context.workspaceId,
    userId: customer.userId ?? context.userId,
    name: normalizeText(customer.name, 'Unnamed customer'),
    company: normalizeOptionalText(customer.company),
    role: normalizeOptionalText(customer.role),
    channel: normalizeText(customer.channel, customer.source?.sourceChannel ?? 'manual'),
    lifecycleStage: normalizeLifecycleStage(customer.lifecycleStage),
    ownerId: normalizeOptionalText(customer.ownerId ?? context.userId),
    tags: normalizeTags(customer.tags),
    source: normalizeSource(customer.source),
    notes: normalizeOptionalText(customer.notes),
    lastInteractionAt: normalizeTimestamp(customer.lastInteractionAt, now),
    createdAt,
    updatedAt: normalizeTimestamp(customer.updatedAt, now),
    metadata: customer.metadata && typeof customer.metadata === 'object' && !Array.isArray(customer.metadata)
      ? customer.metadata
      : {},
  };
}

function sortCustomers(customers: WorkspaceCustomer[]): WorkspaceCustomer[] {
  return customers.slice().sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
}

function readCustomers(context: CustomerRepositoryContext): WorkspaceCustomer[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(storageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortCustomers(parsed.map((customer) => normalizeCustomer(customer as Partial<WorkspaceCustomer>, context)));
  } catch {
    return [];
  }
}

function writeCustomers(customers: WorkspaceCustomer[], context: CustomerRepositoryContext): WorkspaceCustomer[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = sortCustomers(customers.map((customer) => normalizeCustomer(customer, context)));
  storage?.setItem(storageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('workspace_customers_updated', { detail: { workspaceId: context.workspaceId } }));
  }
  return normalized;
}

function customerMatchKey(input: Pick<WorkspaceCustomerInput, 'name' | 'company'>): string {
  return `${normalizeText(input.name, '').toLowerCase()}::${normalizeOptionalText(input.company)?.toLowerCase() ?? ''}`;
}

export function loadWorkspaceCustomers(context: CustomerRepositoryContext): WorkspaceCustomer[] {
  return readCustomers(context);
}

export function saveWorkspaceCustomers(
  customers: WorkspaceCustomer[],
  context: CustomerRepositoryContext,
): WorkspaceCustomer[] {
  return writeCustomers(customers, context);
}

export function createWorkspaceCustomer(
  input: WorkspaceCustomerInput,
  context: CustomerRepositoryContext,
): WorkspaceCustomer {
  const now = context.now ?? Date.now();
  const customer = normalizeCustomer(
    {
      id: `customer_${now}_${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: context.workspaceId,
      userId: context.userId,
      name: input.name,
      company: input.company,
      role: input.role,
      channel: input.channel ?? input.source?.sourceChannel ?? 'manual',
      lifecycleStage: input.lifecycleStage ?? 'new_lead',
      ownerId: input.ownerId ?? context.userId,
      tags: input.tags ?? [],
      source: input.source,
      notes: input.notes,
      lastInteractionAt: input.lastInteractionAt ?? now,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    },
    context,
  );

  writeCustomers([customer, ...readCustomers(context)], context);
  return customer;
}

export function updateWorkspaceCustomer(
  customerId: string,
  patch: Partial<Omit<WorkspaceCustomer, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>,
  context: CustomerRepositoryContext,
): WorkspaceCustomer | null {
  const now = context.now ?? Date.now();
  let updatedCustomer: WorkspaceCustomer | null = null;
  const customers = readCustomers(context).map((customer) => {
    if (customer.id !== customerId) return customer;
    updatedCustomer = normalizeCustomer(
      {
        ...customer,
        ...patch,
        id: customer.id,
        workspaceId: customer.workspaceId,
        createdAt: customer.createdAt,
        updatedAt: now,
      },
      context,
    );
    return updatedCustomer;
  });

  writeCustomers(customers, context);
  return updatedCustomer;
}

export function createOrUpdateWorkspaceCustomerLead(
  input: WorkspaceCustomerInput,
  context: CustomerRepositoryContext,
): WorkspaceCustomer {
  const existing = readCustomers(context).find((customer) => customerMatchKey(customer) === customerMatchKey(input));
  if (!existing) {
    return createWorkspaceCustomer(
      {
        ...input,
        lifecycleStage: input.lifecycleStage ?? 'new_lead',
        tags: [...normalizeTags(input.tags), 'marketing_lead'],
      },
      context,
    );
  }

  return updateWorkspaceCustomer(
    existing.id,
    {
      name: input.name,
      company: input.company ?? existing.company,
      role: input.role ?? existing.role,
      channel: input.channel ?? input.source?.sourceChannel ?? existing.channel,
      lifecycleStage: input.lifecycleStage ?? existing.lifecycleStage,
      ownerId: input.ownerId ?? existing.ownerId,
      tags: [...new Set([...existing.tags, ...normalizeTags(input.tags), 'marketing_lead'])],
      source: input.source ?? existing.source,
      notes: input.notes ?? existing.notes,
      lastInteractionAt: input.lastInteractionAt ?? context.now ?? Date.now(),
      metadata: {
        ...existing.metadata,
        ...(input.metadata ?? {}),
      },
    },
    context,
  ) ?? existing;
}
