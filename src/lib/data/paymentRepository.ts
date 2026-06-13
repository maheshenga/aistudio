import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export type WorkspacePaymentMethodStatus = 'active' | 'expired' | 'disabled' | 'needs_action';

export interface WorkspacePaymentMethod {
  id: string;
  workspaceId: string;
  label: string;
  provider: string;
  brand: string;
  last4: string;
  status: WorkspacePaymentMethodStatus;
  isDefault: boolean;
  credentialRef: string | null;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface WorkspacePaymentMethodInput {
  label?: string;
  provider?: string;
  brand?: string;
  accountNumber?: string;
  status?: string;
  isDefault?: boolean;
  metadata?: Record<string, unknown>;
}

export interface PaymentRepositoryContext {
  workspaceId: string;
  storage?: StorageLike | null;
  now?: number;
}

export const PAYMENT_METHOD_STORAGE_PREFIX = 'aistudio_workspace_payment_methods';

const PAYMENT_METHOD_STATUSES: readonly WorkspacePaymentMethodStatus[] = [
  'active',
  'expired',
  'disabled',
  'needs_action',
];

const DEFAULT_PAYMENT_METHODS: Array<Omit<WorkspacePaymentMethod, 'workspaceId' | 'createdAt' | 'updatedAt'>> = [
  {
    id: 'payment_primary_card',
    label: '主支付方式',
    provider: 'Stripe',
    brand: '招商银行 信用卡',
    last4: '4242',
    status: 'active',
    isDefault: true,
    credentialRef: 'env:STRIPE_DEFAULT_PAYMENT_METHOD',
    metadata: { seeded: true },
  },
];

function paymentStorageKey(context: PaymentRepositoryContext): string {
  return `${PAYMENT_METHOD_STORAGE_PREFIX}:${context.workspaceId}`;
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeStatus(value: unknown): WorkspacePaymentMethodStatus {
  return typeof value === 'string' && PAYMENT_METHOD_STATUSES.includes(value as WorkspacePaymentMethodStatus)
    ? value as WorkspacePaymentMethodStatus
    : 'active';
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}

function accountLast4(accountNumber: string | undefined): string | null {
  if (!accountNumber?.trim()) return null;
  return accountNumber.replace(/\s+/g, '').slice(-4);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'payment';
}

function credentialRef(provider: string, accountNumber: string | undefined, now: number): string | null {
  const last4 = accountLast4(accountNumber);
  if (!last4) return null;
  return `payment_method_${slugify(provider)}_${last4}_${now}`;
}

function normalizePaymentMethod(
  method: Partial<WorkspacePaymentMethod>,
  context: PaymentRepositoryContext,
): WorkspacePaymentMethod {
  const now = context.now ?? Date.now();
  return {
    id: normalizeText(method.id, `payment_${now}_${Math.random().toString(36).slice(2, 8)}`),
    workspaceId: context.workspaceId,
    label: normalizeText(method.label, 'Primary payment method'),
    provider: normalizeText(method.provider, 'Stripe'),
    brand: normalizeText(method.brand, 'Card'),
    last4: normalizeText(method.last4, '0000').slice(-4),
    status: normalizeStatus(method.status),
    isDefault: method.isDefault === true,
    credentialRef: typeof method.credentialRef === 'string' && method.credentialRef.trim()
      ? method.credentialRef.trim()
      : null,
    createdAt: normalizeTimestamp(method.createdAt, now),
    updatedAt: normalizeTimestamp(method.updatedAt, now),
    metadata: method.metadata && typeof method.metadata === 'object' && !Array.isArray(method.metadata)
      ? method.metadata
      : {},
  };
}

function ensureSingleDefault(methods: WorkspacePaymentMethod[]): WorkspacePaymentMethod[] {
  const defaultMethod = methods.find((method) => method.isDefault && method.status === 'active')
    ?? methods.find((method) => method.status === 'active')
    ?? methods[0];
  return methods.map((method) => ({
    ...method,
    isDefault: Boolean(defaultMethod && method.id === defaultMethod.id),
  }));
}

function sortPaymentMethods(methods: WorkspacePaymentMethod[]): WorkspacePaymentMethod[] {
  return methods.slice().sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.label.localeCompare(b.label));
}

function readPaymentMethods(context: PaymentRepositoryContext): WorkspacePaymentMethod[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(paymentStorageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortPaymentMethods(ensureSingleDefault(parsed.map((method) =>
      normalizePaymentMethod(method as Partial<WorkspacePaymentMethod>, context),
    )));
  } catch {
    return [];
  }
}

function writePaymentMethods(
  methods: WorkspacePaymentMethod[],
  context: PaymentRepositoryContext,
): WorkspacePaymentMethod[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = sortPaymentMethods(ensureSingleDefault(methods.map((method) => normalizePaymentMethod(method, context))));
  storage?.setItem(paymentStorageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('workspace_payment_methods_updated', { detail: { workspaceId: context.workspaceId } }));
  }
  return normalized;
}

export function getDefaultWorkspacePaymentMethods(context: PaymentRepositoryContext): WorkspacePaymentMethod[] {
  const now = context.now ?? Date.now();
  return DEFAULT_PAYMENT_METHODS.map((method) => normalizePaymentMethod(
    {
      ...method,
      workspaceId: context.workspaceId,
      createdAt: now,
      updatedAt: now,
    },
    context,
  ));
}

export function loadWorkspacePaymentMethods(context: PaymentRepositoryContext): WorkspacePaymentMethod[] {
  return readPaymentMethods(context);
}

export function saveWorkspacePaymentMethods(
  methods: WorkspacePaymentMethod[],
  context: PaymentRepositoryContext,
): WorkspacePaymentMethod[] {
  return writePaymentMethods(methods, context);
}

export function ensureDefaultWorkspacePaymentMethods(context: PaymentRepositoryContext): WorkspacePaymentMethod[] {
  const existingMethods = readPaymentMethods(context);
  if (existingMethods.length > 0) return existingMethods;
  return writePaymentMethods(getDefaultWorkspacePaymentMethods(context), context);
}

export function createWorkspacePaymentMethod(
  input: WorkspacePaymentMethodInput,
  context: PaymentRepositoryContext,
): WorkspacePaymentMethod {
  const now = context.now ?? Date.now();
  const provider = normalizeText(input.provider, 'Stripe');
  const status = normalizeStatus(input.status);
  const method = normalizePaymentMethod(
    {
      id: `payment_${slugify(provider)}_${now}_${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: context.workspaceId,
      label: input.label ?? 'Payment method',
      provider,
      brand: input.brand,
      last4: accountLast4(input.accountNumber) ?? '0000',
      status,
      isDefault: input.isDefault ?? false,
      credentialRef: credentialRef(provider, input.accountNumber, now),
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    },
    context,
  );

  writePaymentMethods([method, ...ensureDefaultWorkspacePaymentMethods(context)], context);
  return method;
}

export function updateWorkspacePaymentMethod(
  methodId: string,
  patch: Partial<Omit<WorkspacePaymentMethod, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>> & { accountNumber?: string },
  context: PaymentRepositoryContext,
): WorkspacePaymentMethod | null {
  const now = context.now ?? Date.now();
  let updatedMethod: WorkspacePaymentMethod | null = null;
  const updatedMethods = ensureDefaultWorkspacePaymentMethods(context).map((method) => {
    if (method.id !== methodId) return method;
    const nextProvider = normalizeText(patch.provider, method.provider);
    const nextCredentialRef = patch.accountNumber
      ? credentialRef(nextProvider, patch.accountNumber, now)
      : patch.credentialRef ?? method.credentialRef;
    const nextLast4 = patch.accountNumber ? accountLast4(patch.accountNumber) ?? method.last4 : patch.last4 ?? method.last4;
    updatedMethod = normalizePaymentMethod(
      {
        ...method,
        ...patch,
        id: method.id,
        provider: nextProvider,
        last4: nextLast4,
        credentialRef: nextCredentialRef,
        createdAt: method.createdAt,
        updatedAt: now,
      },
      context,
    );
    return updatedMethod;
  });

  writePaymentMethods(updatedMethods, context);
  return updatedMethod;
}

export function getDefaultWorkspacePaymentMethod(context: PaymentRepositoryContext): WorkspacePaymentMethod | null {
  return ensureDefaultWorkspacePaymentMethods(context).find((method) => method.isDefault) ?? null;
}
