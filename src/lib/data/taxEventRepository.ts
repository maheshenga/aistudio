import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export type WorkspaceTaxEventType = 'tax_deadline' | 'audit_window' | 'invoice_due';
export type WorkspaceTaxEventStatus = 'pending' | 'completed' | 'urgent';

export interface WorkspaceTaxEvent {
  id: string;
  workspaceId: string;
  date: string;
  title: string;
  type: WorkspaceTaxEventType;
  description: string;
  summary: string;
  amount?: string;
  status: WorkspaceTaxEventStatus;
  daysUntil: number;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface WorkspaceTaxEventInput {
  date: string;
  title: string;
  type: string;
  description: string;
  summary: string;
  amount?: string;
  status: string;
  metadata?: Record<string, unknown>;
}

export interface TaxEventRepositoryContext {
  workspaceId: string;
  storage?: StorageLike | null;
  now?: number;
}

export const TAX_EVENT_STORAGE_PREFIX = 'aistudio_workspace_tax_events';

type WorkspaceTaxEventDraft = Partial<Omit<WorkspaceTaxEvent, 'type' | 'status' | 'metadata'>> & {
  type?: unknown;
  status?: unknown;
  metadata?: unknown;
};

const TAX_EVENT_TYPES: readonly WorkspaceTaxEventType[] = ['tax_deadline', 'audit_window', 'invoice_due'];
const TAX_EVENT_STATUSES: readonly WorkspaceTaxEventStatus[] = ['pending', 'completed', 'urgent'];
const DAY_MS = 24 * 60 * 60 * 1000;

function storageKey(context: TaxEventRepositoryContext): string {
  return `${TAX_EVENT_STORAGE_PREFIX}:${context.workspaceId}`;
}

function isTaxEventType(value: unknown): value is WorkspaceTaxEventType {
  return typeof value === 'string' && TAX_EVENT_TYPES.includes(value as WorkspaceTaxEventType);
}

function isTaxEventStatus(value: unknown): value is WorkspaceTaxEventStatus {
  return typeof value === 'string' && TAX_EVENT_STATUSES.includes(value as WorkspaceTaxEventStatus);
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function dateOnlyUtcMs(date: string, fallbackNow: number): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return startOfUtcDay(fallbackNow);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function startOfUtcDay(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function formatUtcDate(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0];
}

function addDays(now: number, days: number): string {
  return formatUtcDate(startOfUtcDay(now) + days * DAY_MS);
}

function calculateDaysUntil(date: string, now: number): number {
  return Math.round((dateOnlyUtcMs(date, now) - startOfUtcDay(now)) / DAY_MS);
}

function normalizeTaxEvent(
  event: WorkspaceTaxEventDraft,
  context: TaxEventRepositoryContext,
): WorkspaceTaxEvent {
  const now = context.now ?? Date.now();
  const date = normalizeText(event.date, formatUtcDate(now));
  const status = isTaxEventStatus(event.status) ? event.status : 'pending';

  return {
    id: normalizeText(event.id, `tax_event_${now}_${Math.random().toString(36).slice(2, 8)}`),
    workspaceId: context.workspaceId,
    date,
    title: normalizeText(event.title, 'Tax event'),
    type: isTaxEventType(event.type) ? event.type : 'tax_deadline',
    description: normalizeText(event.description, 'Review and complete the tax event.'),
    summary: normalizeText(event.summary, 'No summary provided.'),
    amount: typeof event.amount === 'string' && event.amount.trim() ? event.amount.trim() : undefined,
    status,
    daysUntil: calculateDaysUntil(date, now),
    createdAt: normalizeTimestamp(event.createdAt, now),
    updatedAt: normalizeTimestamp(event.updatedAt, now),
    metadata: normalizeMetadata(event.metadata),
  };
}

function sortTaxEvents(events: WorkspaceTaxEvent[]): WorkspaceTaxEvent[] {
  const statusWeight: Record<WorkspaceTaxEventStatus, number> = {
    urgent: 0,
    pending: 1,
    completed: 2,
  };
  return events.slice().sort((a, b) => {
    const dateDiff = dateOnlyUtcMs(a.date, a.updatedAt) - dateOnlyUtcMs(b.date, b.updatedAt);
    if (dateDiff !== 0) return dateDiff;
    return statusWeight[a.status] - statusWeight[b.status] || a.title.localeCompare(b.title);
  });
}

function readTaxEvents(context: TaxEventRepositoryContext): WorkspaceTaxEvent[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(storageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortTaxEvents(parsed.map((event) => normalizeTaxEvent(event as WorkspaceTaxEventDraft, context)));
  } catch {
    return [];
  }
}

function writeTaxEvents(events: WorkspaceTaxEvent[], context: TaxEventRepositoryContext): WorkspaceTaxEvent[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = sortTaxEvents(events.map((event) => normalizeTaxEvent(event, context)));
  storage?.setItem(storageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('tax_events_updated', { detail: { workspaceId: context.workspaceId } }));
  }
  return normalized;
}

function buildSeedTaxEvents(context: TaxEventRepositoryContext): WorkspaceTaxEventInput[] {
  const now = context.now ?? Date.now();
  return [
    {
      date: addDays(now, 3),
      title: 'Quarterly corporate income tax prepayment',
      type: 'tax_deadline',
      description: 'Complete quarterly income tax estimate and filing package.',
      summary: 'Review sales invoices, deductible invoices, and current-quarter income records before filing.',
      amount: 'CNY 12,450.00',
      status: 'urgent',
      metadata: { source: 'workspace_seed', workflow: 'corporate_tax' },
    },
    {
      date: addDays(now, 7),
      title: 'VAT filing readiness check',
      type: 'tax_deadline',
      description: 'Confirm monthly input and output VAT invoices before filing.',
      summary: 'Unverified input invoices should be reconciled before the VAT submission window closes.',
      amount: 'CNY 8,500.00',
      status: 'pending',
      metadata: { source: 'workspace_seed', workflow: 'vat' },
    },
    {
      date: addDays(now, 10),
      title: 'High-tech enterprise audit review',
      type: 'audit_window',
      description: 'Prepare R&D expense support materials for audit review.',
      summary: 'Collect outsourcing, payroll, and project records tied to R&D deduction claims.',
      status: 'pending',
      metadata: { source: 'workspace_seed', workflow: 'audit' },
    },
    {
      date: addDays(now, 1),
      title: 'Cross-border remittance invoice verification',
      type: 'invoice_due',
      description: 'Verify customs tax payment vouchers and foreign exchange settlement records.',
      summary: 'Confirm USD-denominated invoice conversion and attach payment proof.',
      amount: 'CNY 10,950.00',
      status: 'pending',
      metadata: { source: 'workspace_seed', workflow: 'invoice' },
    },
    {
      date: addDays(now, -2),
      title: 'Payroll withholding tax filing',
      type: 'tax_deadline',
      description: 'Completed employee payroll withholding declaration.',
      summary: 'Payroll tax submission has been archived with the monthly payroll package.',
      status: 'completed',
      metadata: { source: 'workspace_seed', workflow: 'payroll' },
    },
  ];
}

export function loadWorkspaceTaxEvents(context: TaxEventRepositoryContext): WorkspaceTaxEvent[] {
  return readTaxEvents(context);
}

export function saveWorkspaceTaxEvents(
  events: WorkspaceTaxEvent[],
  context: TaxEventRepositoryContext,
): WorkspaceTaxEvent[] {
  return writeTaxEvents(events, context);
}

export function createWorkspaceTaxEvent(
  input: WorkspaceTaxEventInput,
  context: TaxEventRepositoryContext,
): WorkspaceTaxEvent {
  const now = context.now ?? Date.now();
  const event = normalizeTaxEvent(
    {
      id: `tax_event_${now}_${Math.random().toString(36).slice(2, 8)}`,
      ...input,
      createdAt: now,
      updatedAt: now,
    },
    context,
  );
  writeTaxEvents([...readTaxEvents(context), event], context);
  return event;
}

export function seedWorkspaceTaxEvents(context: TaxEventRepositoryContext): WorkspaceTaxEvent[] {
  const existingEvents = readTaxEvents(context);
  if (existingEvents.length > 0) return existingEvents;
  const now = context.now ?? Date.now();
  const seededEvents = buildSeedTaxEvents(context).map((input, index) => normalizeTaxEvent(
    {
      id: `tax_seed_${index + 1}`,
      ...input,
      createdAt: now,
      updatedAt: now,
    },
    context,
  ));
  return writeTaxEvents(seededEvents, context);
}
