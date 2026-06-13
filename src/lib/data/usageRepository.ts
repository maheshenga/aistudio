import type { ModuleId } from '../../types';
import type { RuntimeMode, RuntimeProviderKind } from '../../runtime/agentRuntimeTypes';
import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';

export type ModuleUsage = Partial<Record<ModuleId, number>>;
export type WorkspaceUsageEventKind =
  | 'generation'
  | 'automation'
  | 'export'
  | 'runtime_dispatch'
  | 'provider_test'
  | 'quota_block';

export type CommercialUsagePricingAction =
  | 'generation'
  | 'automation'
  | 'export'
  | 'runtime_dispatch'
  | 'provider_test';

export interface CommercialUsagePricingRecord {
  action: CommercialUsagePricingAction;
  unitCredits: number;
  unitLabel: string;
  billingStatus: 'estimated' | 'review_required' | 'unpriced';
  description: string;
}

export type CommercialUsagePricingMatrix = Partial<Record<ModuleId, Partial<Record<CommercialUsagePricingAction, CommercialUsagePricingRecord>>>>;

export interface WorkspaceUsageEvent {
  id: string;
  workspaceId: string;
  userId?: string;
  moduleId: ModuleId;
  kind: WorkspaceUsageEventKind;
  targetType: 'generation_job' | 'asset' | 'task' | 'runtime' | 'provider_config' | 'export' | 'system';
  targetId?: string;
  providerKind?: RuntimeProviderKind;
  runtimeMode?: RuntimeMode;
  credits: number;
  metadata: Record<string, unknown>;
  createdAt: number;
}

export interface WorkspaceUsageEventInput {
  moduleId: ModuleId;
  kind: WorkspaceUsageEventKind;
  targetType: WorkspaceUsageEvent['targetType'];
  targetId?: string;
  providerKind?: RuntimeProviderKind;
  runtimeMode?: RuntimeMode;
  credits?: number;
  metadata?: Record<string, unknown>;
}

export interface PricedWorkspaceUsageEventInput extends Omit<WorkspaceUsageEventInput, 'credits'> {
  pricingAction: CommercialUsagePricingAction;
  unitCount?: number;
}

export interface UsageRepositoryContext {
  workspaceId: string;
  userId?: string;
  storage?: StorageLike | null;
  now?: number;
}

export const USAGE_STORAGE_PREFIX = 'aistudio_module_usage';
export const USAGE_EVENT_STORAGE_PREFIX = 'aistudio_usage_events';

export const COMMERCIAL_USAGE_PRICING: CommercialUsagePricingMatrix = {
  e_main_image: {
    generation: { action: 'generation', unitCredits: 4, unitLabel: 'image_variant', billingStatus: 'estimated', description: 'E-commerce main image generation variant' },
    export: { action: 'export', unitCredits: 1, unitLabel: 'export_file', billingStatus: 'estimated', description: 'E-commerce generated image export' },
  },
  e_video: {
    generation: { action: 'generation', unitCredits: 24, unitLabel: 'short_video', billingStatus: 'estimated', description: 'E-commerce product video generation' },
    export: { action: 'export', unitCredits: 2, unitLabel: 'export_file', billingStatus: 'estimated', description: 'E-commerce generated video export' },
  },
  e_detail_page: {
    generation: { action: 'generation', unitCredits: 4, unitLabel: 'detail_page_variant', billingStatus: 'estimated', description: 'E-commerce detail page creative output' },
    export: { action: 'export', unitCredits: 1, unitLabel: 'export_file', billingStatus: 'estimated', description: 'E-commerce detail page export' },
  },
  e_poster: {
    generation: { action: 'generation', unitCredits: 4, unitLabel: 'poster_variant', billingStatus: 'estimated', description: 'E-commerce poster creative output' },
    export: { action: 'export', unitCredits: 1, unitLabel: 'export_file', billingStatus: 'estimated', description: 'E-commerce poster export' },
  },
  e_clone: {
    generation: { action: 'generation', unitCredits: 4, unitLabel: 'clone_variant', billingStatus: 'estimated', description: 'Reference design clone output' },
    export: { action: 'export', unitCredits: 1, unitLabel: 'export_file', billingStatus: 'estimated', description: 'Reference design clone export' },
  },
  ai_image_edit: {
    generation: { action: 'generation', unitCredits: 6, unitLabel: 'edit_operation', billingStatus: 'estimated', description: 'AI image edit operation' },
  },
  image: {
    generation: { action: 'generation', unitCredits: 8, unitLabel: 'image_output', billingStatus: 'estimated', description: 'Standalone commercial image generation' },
    export: { action: 'export', unitCredits: 1, unitLabel: 'export_file', billingStatus: 'estimated', description: 'Standalone commercial image export' },
  },
  video: {
    generation: { action: 'generation', unitCredits: 24, unitLabel: 'short_video', billingStatus: 'estimated', description: 'Standalone video generation' },
    export: { action: 'export', unitCredits: 2, unitLabel: 'export_file', billingStatus: 'estimated', description: 'Standalone generated video export' },
  },
  copywriting_create: {
    generation: { action: 'generation', unitCredits: 3, unitLabel: 'copy_pack', billingStatus: 'estimated', description: 'Copywriting generation pack' },
    export: { action: 'export', unitCredits: 1, unitLabel: 'export_file', billingStatus: 'estimated', description: 'Copywriting output export' },
  },
  chat: {
    generation: { action: 'generation', unitCredits: 2, unitLabel: 'message_unit', billingStatus: 'estimated', description: 'Assistant response text unit' },
  },
  speech: {
    generation: { action: 'generation', unitCredits: 2, unitLabel: 'speech_unit', billingStatus: 'estimated', description: 'Speech generation text/audio unit' },
  },
  remix_smart: {
    generation: { action: 'generation', unitCredits: 20, unitLabel: 'preview_video', billingStatus: 'estimated', description: 'Smart remix preview render' },
    export: { action: 'export', unitCredits: 2, unitLabel: 'export_file', billingStatus: 'estimated', description: 'Smart remix preview export' },
  },
  remix_materials: {
    automation: { action: 'automation', unitCredits: 2, unitLabel: 'material_import', billingStatus: 'estimated', description: 'Remix material processing' },
    export: { action: 'export', unitCredits: 1, unitLabel: 'export_file', billingStatus: 'estimated', description: 'Remix material export' },
  },
  remix_titles: {
    automation: { action: 'automation', unitCredits: 1, unitLabel: 'template_save', billingStatus: 'estimated', description: 'Reusable title template save' },
    export: { action: 'export', unitCredits: 1, unitLabel: 'export_file', billingStatus: 'estimated', description: 'Remix title template export' },
  },
  remix_templates: {
    automation: { action: 'automation', unitCredits: 2, unitLabel: 'template_save', billingStatus: 'estimated', description: 'Reusable video template save' },
    export: { action: 'export', unitCredits: 1, unitLabel: 'export_file', billingStatus: 'estimated', description: 'Remix video template export' },
  },
  remix_viral: {
    generation: { action: 'generation', unitCredits: 18, unitLabel: 'viral_analysis', billingStatus: 'estimated', description: 'Viral clone analysis job' },
    export: { action: 'export', unitCredits: 1, unitLabel: 'export_file', billingStatus: 'estimated', description: 'Viral clone analysis export' },
  },
  marketing_viral: {
    generation: { action: 'generation', unitCredits: 12, unitLabel: 'campaign_kit', billingStatus: 'estimated', description: 'Viral QR campaign kit generation' },
  },
  marketing_nfc: {
    automation: { action: 'automation', unitCredits: 4, unitLabel: 'touchpoint_config', billingStatus: 'estimated', description: 'NFC touchpoint configuration' },
  },
  marketing_website: {
    generation: { action: 'generation', unitCredits: 16, unitLabel: 'landing_page', billingStatus: 'estimated', description: 'Marketing landing page generation' },
  },
  director_desk: {
    automation: { action: 'automation', unitCredits: 2, unitLabel: 'director_automation_unit', billingStatus: 'estimated', description: 'Director desk automation unit' },
    generation: { action: 'generation', unitCredits: 6, unitLabel: 'director_generation_unit', billingStatus: 'estimated', description: 'Director desk generated asset unit' },
  },
  tasks: {
    runtime_dispatch: { action: 'runtime_dispatch', unitCredits: 5, unitLabel: 'agent_dispatch', billingStatus: 'estimated', description: 'Global agent dispatcher task reservation' },
  },
};

function storageKey(context: UsageRepositoryContext): string {
  const ownerId = context.userId ?? 'workspace';
  return `${USAGE_STORAGE_PREFIX}:${context.workspaceId}:${ownerId}`;
}

function usageEventStorageKey(context: UsageRepositoryContext): string {
  return `${USAGE_EVENT_STORAGE_PREFIX}:${context.workspaceId}`;
}

function normalizeUsage(value: unknown): ModuleUsage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value).reduce<ModuleUsage>((usage, [moduleId, seconds]) => {
    const numericSeconds = Number(seconds);
    if (Number.isFinite(numericSeconds) && numericSeconds > 0) {
      usage[moduleId as ModuleId] = Math.floor(numericSeconds);
    }
    return usage;
  }, {});
}

function readUsage(context: UsageRepositoryContext): ModuleUsage {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(storageKey(context));
  if (!raw) return {};

  try {
    return normalizeUsage(JSON.parse(raw));
  } catch {
    return {};
  }
}

function writeUsage(usage: ModuleUsage, context: UsageRepositoryContext): ModuleUsage {
  const storage = getRepositoryStorage(context.storage);
  const normalized = normalizeUsage(usage);
  storage?.setItem(storageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('usage_updated', { detail: { workspaceId: context.workspaceId, userId: context.userId } }));
  }
  return normalized;
}

function normalizeCredits(value: unknown): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : 0;
}

function normalizeUnitCount(value: unknown): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.ceil(numericValue) : 1;
}

export function getCommercialUsagePricing(
  moduleId: ModuleId,
  action: CommercialUsagePricingAction,
): CommercialUsagePricingRecord | null {
  return COMMERCIAL_USAGE_PRICING[moduleId]?.[action] ?? null;
}

export function calculateCommercialUsageCredits(
  moduleId: ModuleId,
  action: CommercialUsagePricingAction,
  options: { unitCount?: number } = {},
): number {
  const pricing = getCommercialUsagePricing(moduleId, action);
  if (!pricing || pricing.billingStatus === 'unpriced') return 0;
  return normalizeCredits(pricing.unitCredits * normalizeUnitCount(options.unitCount));
}

function normalizeUsageEvent(
  event: Partial<WorkspaceUsageEvent>,
  context: UsageRepositoryContext,
): WorkspaceUsageEvent {
  const now = context.now ?? Date.now();
  return {
    id: String(event.id ?? `usage_${now}_${Math.random().toString(36).slice(2, 8)}`),
    workspaceId: context.workspaceId,
    userId: event.userId ?? context.userId,
    moduleId: event.moduleId ?? 'dashboard',
    kind: event.kind ?? 'automation',
    targetType: event.targetType ?? 'system',
    targetId: event.targetId,
    providerKind: event.providerKind,
    runtimeMode: event.runtimeMode,
    credits: normalizeCredits(event.credits),
    metadata: event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata)
      ? event.metadata
      : {},
    createdAt: Number.isFinite(event.createdAt) ? Number(event.createdAt) : now,
  };
}

function sortUsageEvents(events: WorkspaceUsageEvent[]): WorkspaceUsageEvent[] {
  return events.slice().sort((a, b) => b.createdAt - a.createdAt);
}

function readUsageEvents(context: UsageRepositoryContext): WorkspaceUsageEvent[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(usageEventStorageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortUsageEvents(parsed.map((event) => normalizeUsageEvent(event as Partial<WorkspaceUsageEvent>, context)));
  } catch {
    return [];
  }
}

function dispatchUsageEventsUpdated(context: UsageRepositoryContext): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('usage_events_updated', { detail: { workspaceId: context.workspaceId, userId: context.userId } }));
    window.dispatchEvent(new CustomEvent('usage_updated', { detail: { workspaceId: context.workspaceId, userId: context.userId } }));
  }
}

function writeUsageEvents(events: WorkspaceUsageEvent[], context: UsageRepositoryContext): WorkspaceUsageEvent[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = sortUsageEvents(events.map((event) => normalizeUsageEvent(event, context)));
  storage?.setItem(usageEventStorageKey(context), JSON.stringify(normalized.slice(0, 500)));
  dispatchUsageEventsUpdated(context);
  return normalized;
}

// NOTE: only the usage-EVENT functions migrate to the API. loadModuleUsage / saveModuleUsage /
// incrementModuleUsage below are a LOCAL aggregated UI-state (per-module time tracking) and stay
// entirely on localStorage. getCommercialUsagePricing / calculateCommercialUsageCredits are pure.
let usageApiClient: ApiClient = defaultApiClient;
export function __setUsageApiClientForTest(client: ApiClient): void { usageApiClient = client; }

const usageEventCache = new Map<string, WorkspaceUsageEvent[]>(); // key=workspaceId

export async function hydrateWorkspaceUsageEvents(context: UsageRepositoryContext): Promise<void> {
  if (!usageApiClient.configured) return;
  const res = await usageApiClient.get<WorkspaceUsageEvent[]>(context.workspaceId, 'usage-events');
  if (res.ok && Array.isArray(res.value)) {
    usageEventCache.set(
      context.workspaceId,
      sortUsageEvents(res.value.map((e) => normalizeUsageEvent(e as Partial<WorkspaceUsageEvent>, context))),
    );
    dispatchUsageEventsUpdated(context);
  }
}

export function loadModuleUsage(context: UsageRepositoryContext): ModuleUsage {
  return readUsage(context);
}

export function saveModuleUsage(usage: ModuleUsage, context: UsageRepositoryContext): ModuleUsage {
  return writeUsage(usage, context);
}

export function incrementModuleUsage(
  moduleId: ModuleId,
  elapsedSeconds: number,
  context: UsageRepositoryContext,
): ModuleUsage {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return readUsage(context);
  const usage = readUsage(context);
  return writeUsage({
    ...usage,
    [moduleId]: Math.floor((usage[moduleId] ?? 0) + elapsedSeconds),
  }, context);
}

export function listWorkspaceUsageEvents(context: UsageRepositoryContext): WorkspaceUsageEvent[] {
  const events = usageApiClient.configured
    ? (usageEventCache.get(context.workspaceId) ?? [])
    : readUsageEvents(context);
  if (!context.userId) return events;
  return events.filter((event) => !event.userId || event.userId === context.userId);
}

export function createWorkspaceUsageEvent(
  input: WorkspaceUsageEventInput,
  context: UsageRepositoryContext,
): WorkspaceUsageEvent {
  const now = context.now ?? Date.now();
  const event = normalizeUsageEvent(
    {
      id: `usage_${now}_${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: context.workspaceId,
      userId: context.userId,
      moduleId: input.moduleId,
      kind: input.kind,
      targetType: input.targetType,
      targetId: input.targetId,
      providerKind: input.providerKind,
      runtimeMode: input.runtimeMode,
      credits: input.credits ?? 0,
      metadata: input.metadata ?? {},
      createdAt: now,
    },
    context,
  );

  if (usageApiClient.configured) {
    usageEventCache.set(
      context.workspaceId,
      sortUsageEvents([event, ...(usageEventCache.get(context.workspaceId) ?? [])]),
    );
    dispatchUsageEventsUpdated(context);
    void usageApiClient
      .post(context.workspaceId, 'usage-events', {
        moduleId: event.moduleId,
        kind: event.kind,
        targetType: event.targetType,
        targetId: event.targetId,
        providerKind: event.providerKind,
        runtimeMode: event.runtimeMode,
        credits: event.credits,
        metadata: event.metadata,
      })
      .then((res) => { if (!res.ok) console.error('createWorkspaceUsageEvent write-through failed', res); })
      .catch((err) => console.error('createWorkspaceUsageEvent write-through failed', err));
    return event;
  }

  writeUsageEvents([event, ...readUsageEvents(context)], context);
  return event;
}

export function createPricedWorkspaceUsageEvent(
  input: PricedWorkspaceUsageEventInput,
  context: UsageRepositoryContext,
): WorkspaceUsageEvent {
  const pricing = getCommercialUsagePricing(input.moduleId, input.pricingAction);
  const unitCount = normalizeUnitCount(input.unitCount);
  const credits = calculateCommercialUsageCredits(input.moduleId, input.pricingAction, { unitCount });

  return createWorkspaceUsageEvent(
    {
      moduleId: input.moduleId,
      kind: input.kind,
      targetType: input.targetType,
      targetId: input.targetId,
      providerKind: input.providerKind,
      runtimeMode: input.runtimeMode,
      credits,
      metadata: {
        ...(input.metadata ?? {}),
        providerKind: input.providerKind ?? 'workspace',
        runtimeMode: input.runtimeMode ?? 'web',
        pricingKey: `${input.moduleId}.${input.pricingAction}`,
        unitCount,
        unitCredits: pricing?.unitCredits ?? 0,
        unitLabel: pricing?.unitLabel ?? 'unpriced_unit',
        creditEstimate: credits,
        billingStatus: pricing?.billingStatus ?? 'unpriced',
        pricingDescription: pricing?.description ?? 'No commercial pricing record configured.',
      },
    },
    context,
  );
}
