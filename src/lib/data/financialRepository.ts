import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

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
  const numericValue = Number(value);
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
  return readFinancialRecords(context);
}

export function saveWorkspaceFinancialRecords(
  records: WorkspaceFinancialRecord[],
  context: FinancialRepositoryContext,
): WorkspaceFinancialRecord[] {
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
