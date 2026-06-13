import type { ModuleId } from '../../types';
import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export type WorkspaceCampaignStatus = 'draft' | 'active' | 'paused' | 'archived';
export type WorkspaceCampaignChannel = 'viral_qr' | 'nfc_touchpoint' | 'website' | 'store_event' | 'other';

export interface WorkspaceCampaignMetrics {
  scans: number;
  shares: number;
  exposures: number;
  conversions: number;
}

export interface WorkspaceCampaign {
  id: string;
  workspaceId: string;
  userId?: string;
  name: string;
  channel: WorkspaceCampaignChannel;
  status: WorkspaceCampaignStatus;
  moduleId?: ModuleId;
  linkedAssetIds: string[];
  landingUrl?: string;
  metrics: WorkspaceCampaignMetrics;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface WorkspaceCampaignInput {
  name: string;
  channel?: WorkspaceCampaignChannel;
  status?: WorkspaceCampaignStatus;
  moduleId?: ModuleId;
  linkedAssetIds?: string[];
  landingUrl?: string;
  metrics?: Partial<WorkspaceCampaignMetrics>;
  metadata?: Record<string, unknown>;
}

export interface CampaignRepositoryContext {
  workspaceId: string;
  userId?: string;
  storage?: StorageLike | null;
  now?: number;
}

export const CAMPAIGN_STORAGE_PREFIX = 'aistudio_workspace_campaigns';

const CAMPAIGN_STATUSES: readonly WorkspaceCampaignStatus[] = ['draft', 'active', 'paused', 'archived'];
const CAMPAIGN_CHANNELS: readonly WorkspaceCampaignChannel[] = [
  'viral_qr',
  'nfc_touchpoint',
  'website',
  'store_event',
  'other',
];

function storageKey(context: CampaignRepositoryContext): string {
  return `${CAMPAIGN_STORAGE_PREFIX}:${context.workspaceId}`;
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}

function normalizeStatus(value: unknown): WorkspaceCampaignStatus {
  return CAMPAIGN_STATUSES.includes(value as WorkspaceCampaignStatus)
    ? value as WorkspaceCampaignStatus
    : 'draft';
}

function normalizeChannel(value: unknown): WorkspaceCampaignChannel {
  return CAMPAIGN_CHANNELS.includes(value as WorkspaceCampaignChannel)
    ? value as WorkspaceCampaignChannel
    : 'other';
}

function normalizeLinkedAssetIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).filter(Boolean))];
}

function normalizeMetric(value: unknown): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : 0;
}

function normalizeMetrics(value: unknown): WorkspaceCampaignMetrics {
  const metrics = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<WorkspaceCampaignMetrics>
    : {};

  return {
    scans: normalizeMetric(metrics.scans),
    shares: normalizeMetric(metrics.shares),
    exposures: normalizeMetric(metrics.exposures),
    conversions: normalizeMetric(metrics.conversions),
  };
}

function normalizeCampaign(
  campaign: Partial<WorkspaceCampaign>,
  context: CampaignRepositoryContext,
): WorkspaceCampaign {
  const now = context.now ?? Date.now();

  return {
    id: normalizeText(campaign.id, `campaign_${now}_${Math.random().toString(36).slice(2, 8)}`),
    workspaceId: context.workspaceId,
    userId: campaign.userId ?? context.userId,
    name: normalizeText(campaign.name, 'Untitled campaign'),
    channel: normalizeChannel(campaign.channel),
    status: normalizeStatus(campaign.status),
    moduleId: campaign.moduleId,
    linkedAssetIds: normalizeLinkedAssetIds(campaign.linkedAssetIds),
    landingUrl: typeof campaign.landingUrl === 'string' && campaign.landingUrl.trim()
      ? campaign.landingUrl.trim()
      : undefined,
    metrics: normalizeMetrics(campaign.metrics),
    createdAt: normalizeTimestamp(campaign.createdAt, now),
    updatedAt: normalizeTimestamp(campaign.updatedAt, now),
    metadata: campaign.metadata && typeof campaign.metadata === 'object' && !Array.isArray(campaign.metadata)
      ? campaign.metadata
      : {},
  };
}

function sortCampaigns(campaigns: WorkspaceCampaign[]): WorkspaceCampaign[] {
  return campaigns.slice().sort((a, b) => b.updatedAt - a.updatedAt);
}

function readCampaigns(context: CampaignRepositoryContext): WorkspaceCampaign[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(storageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortCampaigns(parsed.map((campaign) => normalizeCampaign(campaign as Partial<WorkspaceCampaign>, context)));
  } catch {
    return [];
  }
}

function writeCampaigns(campaigns: WorkspaceCampaign[], context: CampaignRepositoryContext): WorkspaceCampaign[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = sortCampaigns(campaigns.map((campaign) => normalizeCampaign(campaign, context)));
  storage?.setItem(storageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('workspace_campaigns_updated', { detail: { workspaceId: context.workspaceId } }));
  }
  return normalized;
}

export function listWorkspaceCampaigns(context: CampaignRepositoryContext): WorkspaceCampaign[] {
  return readCampaigns(context);
}

export function saveWorkspaceCampaigns(
  campaigns: WorkspaceCampaign[],
  context: CampaignRepositoryContext,
): WorkspaceCampaign[] {
  return writeCampaigns(campaigns, context);
}

export function createWorkspaceCampaign(
  input: WorkspaceCampaignInput,
  context: CampaignRepositoryContext,
): WorkspaceCampaign {
  const now = context.now ?? Date.now();
  const campaign = normalizeCampaign(
    {
      id: `campaign_${now}_${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: context.workspaceId,
      userId: context.userId,
      name: input.name,
      channel: input.channel ?? 'other',
      status: input.status ?? 'draft',
      moduleId: input.moduleId,
      linkedAssetIds: input.linkedAssetIds ?? [],
      landingUrl: input.landingUrl,
      metrics: normalizeMetrics(input.metrics ?? {}),
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    },
    context,
  );

  writeCampaigns([campaign, ...readCampaigns(context)], context);
  return campaign;
}

export function updateWorkspaceCampaign(
  campaignId: string,
  patch: Partial<Omit<WorkspaceCampaign, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>,
  context: CampaignRepositoryContext,
): WorkspaceCampaign | null {
  const now = context.now ?? Date.now();
  let updatedCampaign: WorkspaceCampaign | null = null;
  const updatedCampaigns = readCampaigns(context).map((campaign) => {
    if (campaign.id !== campaignId) return campaign;
    updatedCampaign = normalizeCampaign(
      {
        ...campaign,
        ...patch,
        id: campaign.id,
        workspaceId: campaign.workspaceId,
        createdAt: campaign.createdAt,
        updatedAt: now,
      },
      context,
    );
    return updatedCampaign;
  });

  writeCampaigns(updatedCampaigns, context);
  return updatedCampaign;
}

export function deleteWorkspaceCampaigns(
  campaignIds: string[],
  context: CampaignRepositoryContext,
): WorkspaceCampaign[] {
  const campaignIdSet = new Set(campaignIds);
  return writeCampaigns(readCampaigns(context).filter((campaign) => !campaignIdSet.has(campaign.id)), context);
}
