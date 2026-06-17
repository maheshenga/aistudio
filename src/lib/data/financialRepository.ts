import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';

export type FinancialRecordKind = 'subscription' | 'invoice' | 'payment' | 'refund' | 'withdrawal' | 'credit';
export type FinancialRecordStatus = 'paid' | 'pending' | 'issued' | 'refunded' | 'cancelled' | 'approved';

export interface WorkspaceFinancialRecord {
  id: string;
  workspaceId: string;
  kind: FinancialRecordKind;
  status: FinancialRecordStatus;
  amountCents: number;
  currency: string;
  planId?: string;
  counterparty: string;
  occurredAt: number;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface WorkspaceFinancialRecordInput {
  kind: string;
  status: string;
  amountCents: number;
  currency?: string;
  planId?: string;
  counterparty?: string;
  occurredAt?: number;
  metadata?: Record<string, unknown>;
}

export interface FinancialRepositoryContext {
  workspaceId: string;
  storage?: StorageLike | null;
  now?: number;
}

export interface WorkspaceFinancialSummary {
  monthlyRevenueCents: number;
  paidSubscriptionCount: number;
  refundCount: number;
  pendingWithdrawalCents: number;
  previousMonthlyRevenueCents: number;
  monthlyRevenueChangePercent: number;
}

export interface DailyRevenuePoint {
  name: string;
  revenue: number;
}

export interface WorkspaceInvoiceRow {
  id: string;
  date: string;
  amountCents: number;
  currency: string;
  status: FinancialRecordStatus;
  sourceRecordId: string;
}

export const FINANCIAL_RECORD_STORAGE_PREFIX = 'aistudio_workspace_financial_records';

const FINANCIAL_RECORD_KINDS: readonly FinancialRecordKind[] = [
  'subscription',
  'invoice',
  'payment',
  'refund',
  'withdrawal',
  'credit',
];
const FINANCIAL_RECORD_STATUSES: readonly FinancialRecordStatus[] = [
  'paid',
  'pending',
  'issued',
  'refunded',
  'cancelled',
  'approved',
];

function financialRecordStorageKey(context: FinancialRepositoryContext): string {
  return `${FINANCIAL_RECORD_STORAGE_PREFIX}:${context.workspaceId}`;
}

function isFinancialRecordKind(value: unknown): value is FinancialRecordKind {
  return typeof value === 'string' && FINANCIAL_RECORD_KINDS.includes(value as FinancialRecordKind);
}

function isFinancialRecordStatus(value: unknown): value is FinancialRecordStatus {
  return typeof value === 'string' && FINANCIAL_RECORD_STATUSES.includes(value as FinancialRecordStatus);
}

function normalizeAmountCents(value: unknown): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, Math.floor(numericValue)) : 0;
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeCouponCode(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = typeof value === 'string' && !/^\d+$/.test(value.trim())
    ? Date.parse(value)
    : Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}

function normalizeFinancialRecord(
  record: Partial<WorkspaceFinancialRecord>,
  context: FinancialRepositoryContext,
): WorkspaceFinancialRecord {
  const now = context.now ?? Date.now();
  const kind = isFinancialRecordKind(record.kind) ? record.kind : 'payment';
  const fallbackStatus: FinancialRecordStatus =
    kind === 'refund' ? 'refunded' : kind === 'withdrawal' ? 'pending' : kind === 'credit' ? 'approved' : 'paid';

  return {
    id: normalizeText(record.id, `financial_${now}_${Math.random().toString(36).slice(2, 8)}`),
    workspaceId: context.workspaceId,
    kind,
    status: isFinancialRecordStatus(record.status) ? record.status : fallbackStatus,
    amountCents: normalizeAmountCents(record.amountCents),
    currency: normalizeText(record.currency, 'CNY').toUpperCase(),
    planId: typeof record.planId === 'string' && record.planId.trim() ? record.planId.trim() : undefined,
    counterparty: normalizeText(record.counterparty, 'Workspace Customer'),
    occurredAt: normalizeTimestamp(record.occurredAt, now),
    createdAt: normalizeTimestamp(record.createdAt, now),
    updatedAt: normalizeTimestamp(record.updatedAt, now),
    metadata: record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
      ? record.metadata
      : {},
  };
}

function sortFinancialRecords(records: WorkspaceFinancialRecord[]): WorkspaceFinancialRecord[] {
  return records.slice().sort((a, b) => b.occurredAt - a.occurredAt || b.updatedAt - a.updatedAt);
}

function readFinancialRecords(context: FinancialRepositoryContext): WorkspaceFinancialRecord[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(financialRecordStorageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortFinancialRecords(parsed.map((record) => normalizeFinancialRecord(record as Partial<WorkspaceFinancialRecord>, context)));
  } catch {
    return [];
  }
}

function writeFinancialRecords(
  records: WorkspaceFinancialRecord[],
  context: FinancialRepositoryContext,
): WorkspaceFinancialRecord[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = sortFinancialRecords(records.map((record) => normalizeFinancialRecord(record, context)));
  storage?.setItem(financialRecordStorageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('financial_records_updated', { detail: { workspaceId: context.workspaceId } }));
  }
  return normalized;
}

export function loadWorkspaceFinancialRecords(context: FinancialRepositoryContext): WorkspaceFinancialRecord[] {
  if (financialApiClient.configured) return financialCache.get(context.workspaceId) ?? [];
  return readFinancialRecords(context);
}

export function saveWorkspaceFinancialRecords(
  records: WorkspaceFinancialRecord[],
  context: FinancialRepositoryContext,
): WorkspaceFinancialRecord[] {
  if (financialApiClient.configured) {
    const normalized = sortFinancialRecords(records.map((record) => normalizeFinancialRecord(record, context)));
    const prev = new Map((financialCache.get(context.workspaceId) ?? []).map((r) => [r.id, r]));
    financialCache.set(context.workspaceId, normalized);
    for (const r of normalized) {
      const before = prev.get(r.id);
      // 只对相对缓存有变化(status/amountCents/metadata 等)的记录发 PATCH
      if (!before || JSON.stringify(before) !== JSON.stringify(r)) {
        void financialApiClient.patch(context.workspaceId, `financial-records/${r.id}`, {
          kind: r.kind, status: r.status, amountCents: r.amountCents, currency: r.currency,
          planId: r.planId ?? undefined, counterparty: r.counterparty,
          occurredAt: r.occurredAt > 0 ? new Date(r.occurredAt).toISOString() : undefined,
          metadata: r.metadata,
        }).then((res) => { if (!res.ok) console.error('saveWorkspaceFinancialRecords write-through failed', res); })
          .catch((e) => console.error('saveWorkspaceFinancialRecords write-through failed', e));
      }
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('financial_records_updated', { detail: { workspaceId: context.workspaceId } }));
    }
    return normalized;
  }
  return writeFinancialRecords(records, context);
}

export function createWorkspaceFinancialRecord(
  input: WorkspaceFinancialRecordInput,
  context: FinancialRepositoryContext,
): WorkspaceFinancialRecord {
  const now = context.now ?? Date.now();
  const kind: FinancialRecordKind = isFinancialRecordKind(input.kind) ? input.kind : 'payment';
  const fallbackStatus: FinancialRecordStatus =
    kind === 'refund' ? 'refunded' : kind === 'withdrawal' ? 'pending' : kind === 'credit' ? 'approved' : 'paid';
  const status: FinancialRecordStatus = isFinancialRecordStatus(input.status) ? input.status : fallbackStatus;
  const record = normalizeFinancialRecord(
    {
      id: `financial_${now}_${Math.random().toString(36).slice(2, 8)}`,
      kind,
      status,
      amountCents: input.amountCents,
      currency: input.currency,
      planId: input.planId,
      counterparty: input.counterparty,
      occurredAt: input.occurredAt ?? now,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata,
    },
    context,
  );

  writeFinancialRecords([record, ...readFinancialRecords(context)], context);
  if (financialApiClient.configured) {
    financialCache.set(context.workspaceId, sortFinancialRecords([record, ...(financialCache.get(context.workspaceId) ?? [])]));
    void financialApiClient.post(context.workspaceId, 'financial-records', {
      id: record.id, kind: record.kind, status: record.status, amountCents: record.amountCents,
      currency: record.currency, planId: record.planId ?? undefined, counterparty: record.counterparty,
      occurredAt: record.occurredAt > 0 ? new Date(record.occurredAt).toISOString() : undefined,
      metadata: record.metadata,
    }).then((r) => { if (!r.ok) console.error('createWorkspaceFinancialRecord write-through failed', r); })
      .catch((e) => console.error('createWorkspaceFinancialRecord write-through failed', e));
  }
  return record;
}

function startOfMonth(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function addMonths(timestamp: number, count: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth() + count, 1).getTime();
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dayLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
}

function invoiceId(record: WorkspaceFinancialRecord): string {
  const invoiceNumber = record.metadata.invoiceNumber;
  if (typeof invoiceNumber === 'string' && invoiceNumber.trim()) return invoiceNumber.trim();
  return `INV-${record.id}`;
}

function netRevenueCents(record: WorkspaceFinancialRecord): number {
  if (record.kind === 'refund' && record.status === 'refunded') return -record.amountCents;
  if (record.kind === 'withdrawal' || record.kind === 'credit') return 0;
  if (record.status !== 'paid' && record.status !== 'issued') return 0;
  return record.amountCents;
}

export function sumWorkspaceRechargeCredits(records: WorkspaceFinancialRecord[]): number {
  return records.reduce((total, record) => {
    if (record.kind !== 'payment' || record.status !== 'paid') return total;
    if (record.metadata.operation !== 'compute_points_recharge') return total;
    const points = Number(record.metadata.points);
    return Number.isFinite(points) && points > 0 ? total + Math.floor(points) : total;
  }, 0);
}

export function sumWorkspacePromotionalCredits(records: WorkspaceFinancialRecord[]): number {
  return records.reduce((total, record) => {
    if (record.kind !== 'credit' || record.status !== 'approved') return total;
    if (record.metadata.operation !== 'compute_points_coupon_redemption') return total;
    const points = Number(record.metadata.points);
    return Number.isFinite(points) && points > 0 ? total + Math.floor(points) : total;
  }, 0);
}

export function hasWorkspaceCouponRedemption(records: WorkspaceFinancialRecord[], couponCode: string): boolean {
  const normalizedCode = normalizeCouponCode(couponCode);
  if (!normalizedCode) return false;

  return records.some((record) =>
    record.kind === 'credit' &&
    record.status === 'approved' &&
    record.metadata.operation === 'compute_points_coupon_redemption' &&
    normalizeCouponCode(record.metadata.couponCode) === normalizedCode,
  );
}

function sumNetRevenueInRange(records: WorkspaceFinancialRecord[], start: number, end: number): number {
  return records.reduce((total, record) => {
    if (record.occurredAt < start || record.occurredAt >= end) return total;
    return total + netRevenueCents(record);
  }, 0);
}

export function summarizeWorkspaceFinancials(
  records: WorkspaceFinancialRecord[],
  options: { now?: number } = {},
): WorkspaceFinancialSummary {
  const now = options.now ?? Date.now();
  const currentMonthStart = startOfMonth(now);
  const nextMonthStart = addMonths(currentMonthStart, 1);
  const previousMonthStart = addMonths(currentMonthStart, -1);
  const currentMonthRecords = records.filter((record) =>
    record.occurredAt >= currentMonthStart && record.occurredAt < nextMonthStart,
  );
  const previousMonthlyRevenueCents = sumNetRevenueInRange(records, previousMonthStart, currentMonthStart);
  const monthlyRevenueCents = sumNetRevenueInRange(records, currentMonthStart, nextMonthStart);
  const monthlyRevenueChangePercent = previousMonthlyRevenueCents === 0
    ? monthlyRevenueCents > 0 ? 100 : 0
    : Math.round(((monthlyRevenueCents - previousMonthlyRevenueCents) / previousMonthlyRevenueCents) * 100);

  return {
    monthlyRevenueCents,
    paidSubscriptionCount: currentMonthRecords.filter((record) =>
      record.kind === 'subscription' && record.status === 'paid',
    ).length,
    refundCount: currentMonthRecords.filter((record) =>
      record.kind === 'refund' && record.status === 'refunded',
    ).length,
    pendingWithdrawalCents: currentMonthRecords
      .filter((record) => record.kind === 'withdrawal' && record.status === 'pending')
      .reduce((total, record) => total + record.amountCents, 0),
    previousMonthlyRevenueCents,
    monthlyRevenueChangePercent,
  };
}

export function buildDailyRevenueSeries(
  records: WorkspaceFinancialRecord[],
  options: { now?: number; days?: number } = {},
): DailyRevenuePoint[] {
  const days = Math.max(1, Math.floor(options.days ?? 7));
  const todayStart = startOfDay(options.now ?? Date.now());
  const firstDayStart = todayStart - (days - 1) * 86_400_000;

  return Array.from({ length: days }, (_, index) => {
    const dayStart = firstDayStart + index * 86_400_000;
    const dayEnd = dayStart + 86_400_000;
    return {
      name: dayLabel(dayStart),
      revenue: Math.round(sumNetRevenueInRange(records, dayStart, dayEnd) / 100),
    };
  });
}

export function buildWorkspaceInvoices(records: WorkspaceFinancialRecord[]): WorkspaceInvoiceRow[] {
  return records
    .filter((record) => record.kind === 'invoice')
    .map((record) => ({
      id: invoiceId(record),
      date: new Date(record.occurredAt).toLocaleDateString(),
      amountCents: record.amountCents,
      currency: record.currency,
      status: record.status,
      sourceRecordId: record.id,
    }));
}

let financialApiClient: ApiClient = defaultApiClient;
export function __setFinancialApiClientForTest(client: ApiClient): void { financialApiClient = client; }

const financialCache = new Map<string, WorkspaceFinancialRecord[]>(); // key = workspaceId

export async function hydrateWorkspaceFinancialRecords(context: FinancialRepositoryContext): Promise<void> {
  if (!financialApiClient.configured) return;
  const res = await financialApiClient.get<{ items: WorkspaceFinancialRecord[]; nextCursor: string | null }>(
    context.workspaceId, 'financial-records');
  if (res.ok && res.value && Array.isArray(res.value.items)) {
    financialCache.set(context.workspaceId, sortFinancialRecords(res.value.items.map((r) => normalizeFinancialRecord(r as Partial<WorkspaceFinancialRecord>, context))));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('financial_records_updated', { detail: { workspaceId: context.workspaceId } }));
    }
  }
}
