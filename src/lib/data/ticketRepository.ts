import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export type WorkspaceTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type WorkspaceTicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface WorkspaceTicket {
  id: string;
  workspaceId: string;
  requesterName: string;
  requesterEmail: string;
  category: string;
  subject: string;
  status: WorkspaceTicketStatus;
  priority: WorkspaceTicketPriority;
  createdAt: number;
  updatedAt: number;
  resolvedAt: number | null;
  firstResponseMinutes: number | null;
  metadata: Record<string, unknown>;
}

export interface WorkspaceTicketInput {
  requesterName: string;
  requesterEmail?: string;
  category: string;
  subject: string;
  status?: string;
  priority?: string;
  firstResponseMinutes?: number | null;
  metadata?: Record<string, unknown>;
}

export interface TicketRepositoryContext {
  workspaceId: string;
  storage?: StorageLike | null;
  now?: number;
}

export interface WorkspaceTicketSummary {
  openCount: number;
  inProgressCount: number;
  resolvedTodayCount: number;
  averageFirstResponseMinutes: number;
}

export const TICKET_STORAGE_PREFIX = 'aistudio_workspace_tickets';

const TICKET_STATUSES: readonly WorkspaceTicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
const TICKET_PRIORITIES: readonly WorkspaceTicketPriority[] = ['low', 'medium', 'high', 'urgent'];

const DEFAULT_WORKSPACE_TICKETS: Array<Omit<WorkspaceTicket, 'workspaceId' | 'createdAt' | 'updatedAt' | 'resolvedAt'>> = [
  {
    id: 'ticket_billing_refund_dispute',
    requesterName: 'Chen Launch',
    requesterEmail: 'support-billing@example.com',
    category: '账单及退款',
    subject: '重复扣费争议',
    status: 'open',
    priority: 'high',
    firstResponseMinutes: null,
    metadata: { seeded: true, source: 'admin_tickets' },
  },
  {
    id: 'ticket_avatar_video_black_screen',
    requesterName: 'Agent Lee',
    requesterEmail: 'agent.lee@example.com',
    category: '功能异常',
    subject: '数字人生成视频黑屏',
    status: 'in_progress',
    priority: 'medium',
    firstResponseMinutes: 72,
    metadata: { seeded: true, source: 'admin_tickets', plan: 'Pro' },
  },
  {
    id: 'ticket_capacity_extension_request',
    requesterName: 'Wang Studio',
    requesterEmail: 'studio@example.com',
    category: '扩展额度申请',
    subject: '矩阵账号算力扩容请求',
    status: 'resolved',
    priority: 'low',
    firstResponseMinutes: 45,
    metadata: { seeded: true, source: 'admin_tickets' },
  },
];

function ticketStorageKey(context: TicketRepositoryContext): string {
  return `${TICKET_STORAGE_PREFIX}:${context.workspaceId}`;
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeStatus(value: unknown): WorkspaceTicketStatus {
  return typeof value === 'string' && TICKET_STATUSES.includes(value as WorkspaceTicketStatus)
    ? value as WorkspaceTicketStatus
    : 'open';
}

function normalizePriority(value: unknown): WorkspaceTicketPriority {
  return typeof value === 'string' && TICKET_PRIORITIES.includes(value as WorkspaceTicketPriority)
    ? value as WorkspaceTicketPriority
    : 'medium';
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}

function normalizeNullableTimestamp(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : null;
}

function normalizeMinutes(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? Math.round(numericValue) : null;
}

function normalizeTicket(
  ticket: Partial<WorkspaceTicket>,
  context: TicketRepositoryContext,
): WorkspaceTicket {
  const now = context.now ?? Date.now();
  const status = normalizeStatus(ticket.status);
  const resolvedAt = normalizeNullableTimestamp(ticket.resolvedAt) ?? (status === 'resolved' ? now : null);
  return {
    id: normalizeText(ticket.id, `ticket_${now}_${Math.random().toString(36).slice(2, 8)}`),
    workspaceId: context.workspaceId,
    requesterName: normalizeText(ticket.requesterName, 'Workspace user'),
    requesterEmail: normalizeText(ticket.requesterEmail, 'unknown@example.com'),
    category: normalizeText(ticket.category, 'General'),
    subject: normalizeText(ticket.subject, 'Untitled support request'),
    status,
    priority: normalizePriority(ticket.priority),
    createdAt: normalizeTimestamp(ticket.createdAt, now),
    updatedAt: normalizeTimestamp(ticket.updatedAt, now),
    resolvedAt,
    firstResponseMinutes: normalizeMinutes(ticket.firstResponseMinutes),
    metadata: ticket.metadata && typeof ticket.metadata === 'object' && !Array.isArray(ticket.metadata)
      ? ticket.metadata
      : {},
  };
}

function sortTickets(tickets: WorkspaceTicket[]): WorkspaceTicket[] {
  const statusRank: Record<WorkspaceTicketStatus, number> = {
    open: 0,
    in_progress: 1,
    resolved: 2,
    closed: 3,
  };
  const priorityRank: Record<WorkspaceTicketPriority, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return tickets.slice().sort((a, b) =>
    statusRank[a.status] - statusRank[b.status] ||
    priorityRank[a.priority] - priorityRank[b.priority] ||
    b.updatedAt - a.updatedAt,
  );
}

function readTickets(context: TicketRepositoryContext): WorkspaceTicket[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(ticketStorageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortTickets(parsed.map((ticket) => normalizeTicket(ticket as Partial<WorkspaceTicket>, context)));
  } catch {
    return [];
  }
}

function writeTickets(
  tickets: WorkspaceTicket[],
  context: TicketRepositoryContext,
): WorkspaceTicket[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = sortTickets(tickets.map((ticket) => normalizeTicket(ticket, context)));
  storage?.setItem(ticketStorageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('workspace_tickets_updated', { detail: { workspaceId: context.workspaceId } }));
  }
  return normalized;
}

export function getDefaultWorkspaceTickets(context: TicketRepositoryContext): WorkspaceTicket[] {
  const now = context.now ?? Date.now();
  return DEFAULT_WORKSPACE_TICKETS.map((ticket, index) => normalizeTicket(
    {
      ...ticket,
      workspaceId: context.workspaceId,
      createdAt: now - (index + 1) * 60 * 60 * 1000,
      updatedAt: now - index * 30 * 60 * 1000,
      resolvedAt: ticket.status === 'resolved' ? now - 20 * 60 * 1000 : null,
    },
    context,
  ));
}

export function loadWorkspaceTickets(context: TicketRepositoryContext): WorkspaceTicket[] {
  return readTickets(context);
}

export function saveWorkspaceTickets(
  tickets: WorkspaceTicket[],
  context: TicketRepositoryContext,
): WorkspaceTicket[] {
  return writeTickets(tickets, context);
}

export function ensureDefaultWorkspaceTickets(context: TicketRepositoryContext): WorkspaceTicket[] {
  const existingTickets = readTickets(context);
  if (existingTickets.length > 0) return existingTickets;
  return writeTickets(getDefaultWorkspaceTickets(context), context);
}

export function createWorkspaceTicket(
  input: WorkspaceTicketInput,
  context: TicketRepositoryContext,
): WorkspaceTicket {
  const now = context.now ?? Date.now();
  const status = normalizeStatus(input.status);
  const ticket = normalizeTicket(
    {
      id: `ticket_${now}_${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: context.workspaceId,
      requesterName: input.requesterName,
      requesterEmail: input.requesterEmail,
      category: input.category,
      subject: input.subject,
      status,
      priority: normalizePriority(input.priority),
      createdAt: now,
      updatedAt: now,
      resolvedAt: status === 'resolved' ? now : null,
      firstResponseMinutes: input.firstResponseMinutes ?? null,
      metadata: input.metadata ?? {},
    },
    context,
  );

  writeTickets([ticket, ...ensureDefaultWorkspaceTickets(context)], context);
  return ticket;
}

export function updateWorkspaceTicket(
  ticketId: string,
  patch: Partial<Omit<WorkspaceTicket, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>,
  context: TicketRepositoryContext,
): WorkspaceTicket | null {
  const now = context.now ?? Date.now();
  let updatedTicket: WorkspaceTicket | null = null;
  const updatedTickets = ensureDefaultWorkspaceTickets(context).map((ticket) => {
    if (ticket.id !== ticketId) return ticket;
    const nextStatus = normalizeStatus(patch.status ?? ticket.status);
    updatedTicket = normalizeTicket(
      {
        ...ticket,
        ...patch,
        id: ticket.id,
        createdAt: ticket.createdAt,
        updatedAt: now,
        status: nextStatus,
        resolvedAt: patch.resolvedAt ?? (nextStatus === 'resolved' ? ticket.resolvedAt ?? now : ticket.resolvedAt),
      },
      context,
    );
    return updatedTicket;
  });

  writeTickets(updatedTickets, context);
  return updatedTicket;
}

export function summarizeWorkspaceTickets(
  tickets: WorkspaceTicket[],
  options: { now?: number } = {},
): WorkspaceTicketSummary {
  const now = options.now ?? Date.now();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayStart = startOfToday.getTime();
  const responseTimes = tickets
    .map((ticket) => ticket.firstResponseMinutes)
    .filter((minutes): minutes is number => typeof minutes === 'number' && Number.isFinite(minutes));

  return {
    openCount: tickets.filter((ticket) => ticket.status === 'open').length,
    inProgressCount: tickets.filter((ticket) => ticket.status === 'in_progress').length,
    resolvedTodayCount: tickets.filter((ticket) =>
      ticket.status === 'resolved' &&
      typeof ticket.resolvedAt === 'number' &&
      ticket.resolvedAt >= todayStart &&
      ticket.resolvedAt <= now,
    ).length,
    averageFirstResponseMinutes: responseTimes.length === 0
      ? 0
      : Math.round(responseTimes.reduce((total, minutes) => total + minutes, 0) / responseTimes.length),
  };
}
