import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export type WorkspaceAgencyPayoutStatus = 'none' | 'pending' | 'paid' | 'blocked';
export type WorkspaceAgencyStatus = 'active' | 'suspended';

export interface WorkspaceAgencyPartner {
  id: string;
  workspaceId: string;
  name: string;
  level: string;
  invitedUsers: number;
  commissionRate: number;
  totalCommissionCents: number;
  payoutStatus: WorkspaceAgencyPayoutStatus;
  status: WorkspaceAgencyStatus;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface WorkspaceAgencyPartnerInput {
  name: string;
  level: string;
  invitedUsers?: number;
  commissionRate?: number;
  totalCommissionCents?: number;
  payoutStatus?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface AgencyRepositoryContext {
  workspaceId: string;
  storage?: StorageLike | null;
  now?: number;
}

export interface WorkspaceAgencySummary {
  totalInvitedUsers: number;
  totalCommissionCents: number;
  pendingPayoutCount: number;
  pendingPayoutCents: number;
}

export const AGENCY_PARTNER_STORAGE_PREFIX = 'aistudio_workspace_agency_partners';

const PAYOUT_STATUSES: readonly WorkspaceAgencyPayoutStatus[] = ['none', 'pending', 'paid', 'blocked'];
const AGENCY_STATUSES: readonly WorkspaceAgencyStatus[] = ['active', 'suspended'];

const DEFAULT_AGENCY_PARTNERS: Array<Omit<WorkspaceAgencyPartner, 'workspaceId' | 'createdAt' | 'updatedAt'>> = [
  {
    id: 'agency_nebula_mcn',
    name: '北京星云MCN节点',
    level: 'V3 核心服务商',
    invitedUsers: 1_204,
    commissionRate: 0.35,
    totalCommissionCents: 14_250_000,
    payoutStatus: 'none',
    status: 'active',
    metadata: { seeded: true, region: 'Beijing' },
  },
  {
    id: 'agency_personal_zhangwei',
    name: '个人推客 Zhangwei',
    level: 'V1 个人',
    invitedUsers: 42,
    commissionRate: 0.15,
    totalCommissionCents: 324_000,
    payoutStatus: 'pending',
    status: 'active',
    metadata: { seeded: true, payoutRequestedAt: 1_780_000_000_000 },
  },
  {
    id: 'agency_shenzhen_zhichuang',
    name: '深圳市智创网络',
    level: 'V2 渠道代理',
    invitedUsers: 512,
    commissionRate: 0.25,
    totalCommissionCents: 4_580_000,
    payoutStatus: 'none',
    status: 'active',
    metadata: { seeded: true, region: 'Shenzhen' },
  },
];

function agencyStorageKey(context: AgencyRepositoryContext): string {
  return `${AGENCY_PARTNER_STORAGE_PREFIX}:${context.workspaceId}`;
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeCount(value: unknown): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? Math.floor(numericValue) : 0;
}

function normalizeRate(value: unknown): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) return 0;
  return Math.min(1, Number(numericValue.toFixed(4)));
}

function normalizePayoutStatus(value: unknown): WorkspaceAgencyPayoutStatus {
  return typeof value === 'string' && PAYOUT_STATUSES.includes(value as WorkspaceAgencyPayoutStatus)
    ? value as WorkspaceAgencyPayoutStatus
    : 'none';
}

function normalizeAgencyStatus(value: unknown): WorkspaceAgencyStatus {
  return typeof value === 'string' && AGENCY_STATUSES.includes(value as WorkspaceAgencyStatus)
    ? value as WorkspaceAgencyStatus
    : 'active';
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}

function normalizeAgencyPartner(
  partner: Partial<WorkspaceAgencyPartner>,
  context: AgencyRepositoryContext,
): WorkspaceAgencyPartner {
  const now = context.now ?? Date.now();
  return {
    id: normalizeText(partner.id, `agency_${now}_${Math.random().toString(36).slice(2, 8)}`),
    workspaceId: context.workspaceId,
    name: normalizeText(partner.name, 'Untitled partner'),
    level: normalizeText(partner.level, 'V1 个人'),
    invitedUsers: normalizeCount(partner.invitedUsers),
    commissionRate: normalizeRate(partner.commissionRate),
    totalCommissionCents: normalizeCount(partner.totalCommissionCents),
    payoutStatus: normalizePayoutStatus(partner.payoutStatus),
    status: normalizeAgencyStatus(partner.status),
    createdAt: normalizeTimestamp(partner.createdAt, now),
    updatedAt: normalizeTimestamp(partner.updatedAt, now),
    metadata: partner.metadata && typeof partner.metadata === 'object' && !Array.isArray(partner.metadata)
      ? partner.metadata
      : {},
  };
}

function sortAgencyPartners(partners: WorkspaceAgencyPartner[]): WorkspaceAgencyPartner[] {
  return partners.slice().sort((a, b) =>
    Number(b.payoutStatus === 'pending') - Number(a.payoutStatus === 'pending') ||
    b.totalCommissionCents - a.totalCommissionCents ||
    a.name.localeCompare(b.name),
  );
}

function readAgencyPartners(context: AgencyRepositoryContext): WorkspaceAgencyPartner[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(agencyStorageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortAgencyPartners(parsed.map((partner) => normalizeAgencyPartner(partner as Partial<WorkspaceAgencyPartner>, context)));
  } catch {
    return [];
  }
}

function writeAgencyPartners(
  partners: WorkspaceAgencyPartner[],
  context: AgencyRepositoryContext,
): WorkspaceAgencyPartner[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = sortAgencyPartners(partners.map((partner) => normalizeAgencyPartner(partner, context)));
  storage?.setItem(agencyStorageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('workspace_agency_partners_updated', { detail: { workspaceId: context.workspaceId } }));
  }
  return normalized;
}

export function getDefaultWorkspaceAgencyPartners(context: AgencyRepositoryContext): WorkspaceAgencyPartner[] {
  const now = context.now ?? Date.now();
  return DEFAULT_AGENCY_PARTNERS.map((partner) => normalizeAgencyPartner(
    {
      ...partner,
      workspaceId: context.workspaceId,
      createdAt: now,
      updatedAt: now,
    },
    context,
  ));
}

export function loadWorkspaceAgencyPartners(context: AgencyRepositoryContext): WorkspaceAgencyPartner[] {
  return readAgencyPartners(context);
}

export function saveWorkspaceAgencyPartners(
  partners: WorkspaceAgencyPartner[],
  context: AgencyRepositoryContext,
): WorkspaceAgencyPartner[] {
  return writeAgencyPartners(partners, context);
}

export function ensureDefaultWorkspaceAgencyPartners(context: AgencyRepositoryContext): WorkspaceAgencyPartner[] {
  const existingPartners = readAgencyPartners(context);
  if (existingPartners.length > 0) return existingPartners;
  return writeAgencyPartners(getDefaultWorkspaceAgencyPartners(context), context);
}

export function createWorkspaceAgencyPartner(
  input: WorkspaceAgencyPartnerInput,
  context: AgencyRepositoryContext,
): WorkspaceAgencyPartner {
  const now = context.now ?? Date.now();
  const partner = normalizeAgencyPartner(
    {
      id: `agency_${now}_${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: context.workspaceId,
      name: input.name,
      level: input.level,
      invitedUsers: input.invitedUsers,
      commissionRate: input.commissionRate,
      totalCommissionCents: input.totalCommissionCents,
      payoutStatus: normalizePayoutStatus(input.payoutStatus),
      status: normalizeAgencyStatus(input.status),
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    },
    context,
  );

  writeAgencyPartners([partner, ...ensureDefaultWorkspaceAgencyPartners(context)], context);
  return partner;
}

export function updateWorkspaceAgencyPartner(
  partnerId: string,
  patch: Partial<Omit<WorkspaceAgencyPartner, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>,
  context: AgencyRepositoryContext,
): WorkspaceAgencyPartner | null {
  const now = context.now ?? Date.now();
  let updatedPartner: WorkspaceAgencyPartner | null = null;
  const updatedPartners = ensureDefaultWorkspaceAgencyPartners(context).map((partner) => {
    if (partner.id !== partnerId) return partner;
    updatedPartner = normalizeAgencyPartner(
      {
        ...partner,
        ...patch,
        id: partner.id,
        createdAt: partner.createdAt,
        updatedAt: now,
      },
      context,
    );
    return updatedPartner;
  });

  writeAgencyPartners(updatedPartners, context);
  return updatedPartner;
}

export function summarizeWorkspaceAgencyPartners(
  partners: WorkspaceAgencyPartner[],
): WorkspaceAgencySummary {
  return partners.reduce<WorkspaceAgencySummary>(
    (summary, partner) => ({
      totalInvitedUsers: summary.totalInvitedUsers + partner.invitedUsers,
      totalCommissionCents: summary.totalCommissionCents + partner.totalCommissionCents,
      pendingPayoutCount: summary.pendingPayoutCount + (partner.payoutStatus === 'pending' ? 1 : 0),
      pendingPayoutCents: summary.pendingPayoutCents + (partner.payoutStatus === 'pending' ? partner.totalCommissionCents : 0),
    }),
    {
      totalInvitedUsers: 0,
      totalCommissionCents: 0,
      pendingPayoutCount: 0,
      pendingPayoutCents: 0,
    },
  );
}
