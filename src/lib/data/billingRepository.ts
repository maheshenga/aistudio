import type { StorageLike } from '../../saas/localAuthSession';
import type { GenerationJob } from './generationJobRepository';
import {
  calculateCommercialUsageCredits,
  type CommercialUsagePricingAction,
  type ModuleUsage,
  type WorkspaceUsageEvent,
} from './usageRepository';
import type { RuntimeMode, RuntimeProviderKind } from '../../runtime/agentRuntimeTypes';
import type { Workspace } from '../../saas/types';
import { getRepositoryStorage } from './dataBackend';

export interface BillingUsageInput {
  monthlyAllowance: number;
  rechargeCredits?: number;
  generationJobs: GenerationJob[];
  moduleUsage: ModuleUsage;
  usageEvents?: WorkspaceUsageEvent[];
}

export interface BillingUsageSummary {
  monthlyAllowance: number;
  rechargeCredits: number;
  generationCredits: number;
  activityCredits: number;
  consumedCredits: number;
  remainingCredits: number;
  remainingPercent: number;
}

export interface BillingQuotaGuardInput extends BillingUsageInput {
  requestedCredits?: number;
}

export interface BillingQuotaGuardResult extends BillingUsageSummary {
  requestedCredits: number;
  projectedConsumedCredits: number;
  projectedRemainingCredits: number;
  allowed: boolean;
  overageCredits: number;
}

export interface RequestedGenerationCreditInput {
  providerKind: RuntimeProviderKind;
  runtimeMode: RuntimeMode;
  moduleId?: WorkspaceUsageEvent['moduleId'];
  pricingAction?: CommercialUsagePricingAction;
  taskCount?: number;
  unitCount?: number;
}

export type BillingInterval = 'month' | 'year';
export type BillingPlanStatus = 'active' | 'archived';

export interface WorkspaceBillingPlan {
  id: Workspace['plan'];
  workspaceId: string;
  name: string;
  priceCents: number;
  billingInterval: BillingInterval;
  monthlyAllowance: number;
  maxConcurrentJobs: number;
  storageGb: number;
  features: string[];
  status: BillingPlanStatus;
  activeSubscribers: number;
  sortOrder: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface BillingPlanRepositoryContext {
  workspaceId: string;
  storage?: StorageLike | null;
  now?: number;
}

export const BILLING_PLAN_STORAGE_PREFIX = 'aistudio_workspace_billing_plans';

const BILLING_PLAN_IDS: readonly Workspace['plan'][] = ['free', 'pro', 'business', 'enterprise'];
const BILLING_INTERVALS: readonly BillingInterval[] = ['month', 'year'];
const BILLING_PLAN_STATUSES: readonly BillingPlanStatus[] = ['active', 'archived'];

const DEFAULT_BILLING_PLANS: Array<Omit<WorkspaceBillingPlan, 'workspaceId' | 'updatedAt'>> = [
  {
    id: 'free',
    name: 'Free',
    priceCents: 0,
    billingInterval: 'month',
    monthlyAllowance: 100,
    maxConcurrentJobs: 2,
    storageGb: 5,
    features: ['Standard queue', 'Basic models', 'Community support'],
    status: 'active',
    activeSubscribers: 0,
    sortOrder: 10,
    metadata: { seeded: true },
  },
  {
    id: 'pro',
    name: 'Pro',
    priceCents: 9_900,
    billingInterval: 'month',
    monthlyAllowance: 5_000,
    maxConcurrentJobs: 8,
    storageGb: 50,
    features: ['Priority generation', 'Premium models', 'Smart editing'],
    status: 'active',
    activeSubscribers: 0,
    sortOrder: 20,
    metadata: { seeded: true },
  },
  {
    id: 'business',
    name: 'Business',
    priceCents: 39_900,
    billingInterval: 'month',
    monthlyAllowance: 20_000,
    maxConcurrentJobs: 24,
    storageGb: 200,
    features: ['Team workspaces', 'Shared API credits', 'Invoice support'],
    status: 'active',
    activeSubscribers: 0,
    sortOrder: 30,
    metadata: { seeded: true },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceCents: 199_900,
    billingInterval: 'month',
    monthlyAllowance: 100_000,
    maxConcurrentJobs: 80,
    storageGb: 1_000,
    features: ['Dedicated capacity', 'SSO and audit', 'Success manager'],
    status: 'active',
    activeSubscribers: 0,
    sortOrder: 40,
    metadata: { seeded: true },
  },
];

function billingPlanStorageKey(context: BillingPlanRepositoryContext): string {
  return `${BILLING_PLAN_STORAGE_PREFIX}:${context.workspaceId}`;
}

function isBillingPlanId(value: unknown): value is Workspace['plan'] {
  return typeof value === 'string' && BILLING_PLAN_IDS.includes(value as Workspace['plan']);
}

function isBillingInterval(value: unknown): value is BillingInterval {
  return typeof value === 'string' && BILLING_INTERVALS.includes(value as BillingInterval);
}

function isBillingPlanStatus(value: unknown): value is BillingPlanStatus {
  return typeof value === 'string' && BILLING_PLAN_STATUSES.includes(value as BillingPlanStatus);
}

function normalizeInteger(value: unknown, fallback: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, Math.floor(numericValue)) : fallback;
}

function normalizeFeatures(features: unknown): string[] {
  if (!Array.isArray(features)) return [];
  return features
    .filter((feature): feature is string => typeof feature === 'string' && feature.trim().length > 0)
    .map((feature) => feature.trim());
}

function normalizeBillingPlan(
  plan: Partial<WorkspaceBillingPlan>,
  context: BillingPlanRepositoryContext,
): WorkspaceBillingPlan {
  const now = context.now ?? Date.now();
  const id = isBillingPlanId(plan.id) ? plan.id : 'pro';
  const fallback = DEFAULT_BILLING_PLANS.find((defaultPlan) => defaultPlan.id === id) ?? DEFAULT_BILLING_PLANS[1];

  return {
    id,
    workspaceId: context.workspaceId,
    name: typeof plan.name === 'string' && plan.name.trim() ? plan.name.trim() : fallback.name,
    priceCents: normalizeInteger(plan.priceCents, fallback.priceCents),
    billingInterval: isBillingInterval(plan.billingInterval) ? plan.billingInterval : fallback.billingInterval,
    monthlyAllowance: normalizeInteger(plan.monthlyAllowance, fallback.monthlyAllowance),
    maxConcurrentJobs: normalizeInteger(plan.maxConcurrentJobs, fallback.maxConcurrentJobs),
    storageGb: normalizeInteger(plan.storageGb, fallback.storageGb),
    features: normalizeFeatures(plan.features).length > 0 ? normalizeFeatures(plan.features) : [...fallback.features],
    status: isBillingPlanStatus(plan.status) ? plan.status : fallback.status,
    activeSubscribers: normalizeInteger(plan.activeSubscribers, fallback.activeSubscribers),
    sortOrder: normalizeInteger(plan.sortOrder, fallback.sortOrder),
    updatedAt: normalizeInteger(plan.updatedAt, now),
    metadata: plan.metadata && typeof plan.metadata === 'object' && !Array.isArray(plan.metadata)
      ? plan.metadata
      : { ...fallback.metadata },
  };
}

function sortBillingPlans(plans: WorkspaceBillingPlan[]): WorkspaceBillingPlan[] {
  return plans.slice().sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

function readWorkspaceBillingPlans(context: BillingPlanRepositoryContext): WorkspaceBillingPlan[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(billingPlanStorageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortBillingPlans(parsed.map((plan) => normalizeBillingPlan(plan as Partial<WorkspaceBillingPlan>, context)));
  } catch {
    return [];
  }
}

function writeWorkspaceBillingPlans(
  plans: WorkspaceBillingPlan[],
  context: BillingPlanRepositoryContext,
): WorkspaceBillingPlan[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = sortBillingPlans(plans.map((plan) => normalizeBillingPlan(plan, context)));
  storage?.setItem(billingPlanStorageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('billing_plans_updated', { detail: { workspaceId: context.workspaceId } }));
  }
  return normalized;
}

export function getDefaultWorkspaceBillingPlans(context: BillingPlanRepositoryContext): WorkspaceBillingPlan[] {
  return DEFAULT_BILLING_PLANS.map((plan) => normalizeBillingPlan(
    {
      ...plan,
      workspaceId: context.workspaceId,
      updatedAt: context.now ?? Date.now(),
    },
    context,
  ));
}

export function loadWorkspaceBillingPlans(context: BillingPlanRepositoryContext): WorkspaceBillingPlan[] {
  return readWorkspaceBillingPlans(context);
}

export function saveWorkspaceBillingPlans(
  plans: WorkspaceBillingPlan[],
  context: BillingPlanRepositoryContext,
): WorkspaceBillingPlan[] {
  return writeWorkspaceBillingPlans(plans, context);
}

export function ensureDefaultWorkspaceBillingPlans(context: BillingPlanRepositoryContext): WorkspaceBillingPlan[] {
  const existingPlans = readWorkspaceBillingPlans(context);
  const existingIds = new Set(existingPlans.map((plan) => plan.id));
  if (existingPlans.length > 0 && BILLING_PLAN_IDS.every((planId) => existingIds.has(planId))) {
    return existingPlans;
  }

  const mergedPlans = new Map<string, WorkspaceBillingPlan>();
  for (const plan of getDefaultWorkspaceBillingPlans(context)) {
    mergedPlans.set(plan.id, plan);
  }
  for (const plan of existingPlans) {
    mergedPlans.set(plan.id, plan);
  }

  return writeWorkspaceBillingPlans(
    BILLING_PLAN_IDS.map((planId) => mergedPlans.get(planId)).filter((plan): plan is WorkspaceBillingPlan => Boolean(plan)),
    context,
  );
}

export function updateWorkspaceBillingPlan(
  planId: Workspace['plan'] | string,
  patch: Partial<Omit<WorkspaceBillingPlan, 'id' | 'workspaceId' | 'updatedAt'>>,
  context: BillingPlanRepositoryContext,
): WorkspaceBillingPlan | null {
  if (!isBillingPlanId(planId)) return null;
  const now = context.now ?? Date.now();
  let updatedPlan: WorkspaceBillingPlan | null = null;
  const updatedPlans = ensureDefaultWorkspaceBillingPlans(context).map((plan) => {
    if (plan.id !== planId) return plan;
    updatedPlan = normalizeBillingPlan({ ...plan, ...patch, id: plan.id, updatedAt: now }, context);
    return updatedPlan;
  });

  writeWorkspaceBillingPlans(updatedPlans, context);
  return updatedPlan;
}

export function getPlanMonthlyAllowance(plan: Workspace['plan'] | string, plans: WorkspaceBillingPlan[] = []): number {
  const configuredPlan = plans.find((item) => item.id === plan && item.status === 'active');
  if (configuredPlan) return configuredPlan.monthlyAllowance;

  switch (plan) {
    case 'free':
      return 100;
    case 'business':
      return 20_000;
    case 'enterprise':
      return 100_000;
    case 'pro':
    default:
      return 5_000;
  }
}

function readNumericMetadata(job: GenerationJob, keys: string[]): number | null {
  for (const key of keys) {
    const value = job.metadata[key];
    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return Math.floor(numericValue);
    }
  }
  return null;
}

export function estimateGenerationJobCredits(job: GenerationJob): number {
  if (job.status === 'failed' || job.status === 'cancelled') return 0;

  const metadataCost = readNumericMetadata(job, ['computeCost', 'costCredits', 'creditCost', 'estimatedCredits']);
  if (metadataCost !== null) return metadataCost;

  if (job.moduleId) {
    const priced = calculateCommercialUsageCredits(job.moduleId, 'generation');
    if (priced > 0) return priced;
  }

  if (job.runtimeMode === 'desktop_multica') return 1;
  if (job.providerKind === 'multica') return 3;
  return 5;
}

export function estimateRequestedGenerationCredits(input: RequestedGenerationCreditInput): number {
  const taskCount = Math.max(0, Math.floor(input.taskCount ?? 1));
  if (input.moduleId && input.pricingAction) {
    return calculateCommercialUsageCredits(input.moduleId, input.pricingAction, {
      unitCount: input.unitCount ?? taskCount,
    });
  }

  if (input.runtimeMode === 'desktop_multica') return taskCount;
  if (input.providerKind === 'multica') return taskCount * 3;
  return taskCount * 5;
}

export function calculateBillingUsage(input: BillingUsageInput): BillingUsageSummary {
  const monthlyAllowance = Math.max(0, Math.floor(input.monthlyAllowance));
  const rechargeCredits = Math.max(0, Math.floor(input.rechargeCredits ?? 0));
  const generationCredits = input.generationJobs.reduce(
    (total, job) => total + estimateGenerationJobCredits(job),
    0,
  );
  const activityCredits = Math.floor(
    Object.values(input.moduleUsage).reduce((total, seconds) => total + (seconds ?? 0), 0) / 60,
  );
  const eventCredits = (input.usageEvents ?? []).reduce((total, event) => total + Math.max(0, Math.floor(event.credits)), 0);
  const consumedCredits = generationCredits + activityCredits + eventCredits;
  const totalAvailableCredits = monthlyAllowance + rechargeCredits;
  const remainingCredits = Math.max(0, totalAvailableCredits - consumedCredits);
  const remainingPercent = totalAvailableCredits === 0
    ? 0
    : Math.round((remainingCredits / totalAvailableCredits) * 100);

  return {
    monthlyAllowance,
    rechargeCredits,
    generationCredits,
    activityCredits,
    consumedCredits,
    remainingCredits,
    remainingPercent,
  };
}

export function canStartBillableGeneration(input: BillingQuotaGuardInput): BillingQuotaGuardResult {
  const usage = calculateBillingUsage(input);
  const requestedCredits = Math.max(0, Math.floor(input.requestedCredits ?? 1));
  const projectedConsumedCredits = usage.consumedCredits + requestedCredits;
  const totalAvailableCredits = usage.monthlyAllowance + usage.rechargeCredits;
  const projectedRemainingCredits = Math.max(0, totalAvailableCredits - projectedConsumedCredits);
  const overageCredits = Math.max(0, projectedConsumedCredits - totalAvailableCredits);

  return {
    ...usage,
    requestedCredits,
    projectedConsumedCredits,
    projectedRemainingCredits,
    allowed: overageCredits === 0,
    overageCredits,
  };
}
