import type { ModuleId } from '../../types';
import type { RuntimeMode, RuntimeProviderKind } from '../../runtime/agentRuntimeTypes';
import {
  canStartBillableGeneration,
  estimateRequestedGenerationCredits,
  getPlanMonthlyAllowance,
  loadWorkspaceBillingPlans,
  type RequestedGenerationCreditInput,
} from '../data/billingRepository';
import { isCreditBackendConfigured } from '../data/creditRepository';
import {
  createGenerationJob,
  GenerationJobApiError,
  listGenerationJobs,
  type GenerationJob,
  type GenerationJobInput,
  type GenerationJobRepositoryContext,
} from '../data/generationJobRepository';
import { listWorkspaceUsageEvents, loadModuleUsage } from '../data/usageRepository';
import { preflightCredits } from './creditPreflight';

export type BillableGenerationBlockReason = 'insufficient' | 'unavailable';

/**
 * AIGEN-3: the single mock→real switch. The whole app generates mock output
 * (providerKind:'mock', never billed) until VITE_GENERATION_PROVIDER names a
 * real provider kind ('gemini' | 'render' | 'multica'). A real kind routes the
 * job to the API provider seam and re-enables billing for that job.
 *
 * Default is 'mock' so a normal build/dev stays safe; flipping the env var (or
 * passing an explicit providerKind per call during a staged per-module rollout)
 * is all that's required to go live.
 */
export function resolveGenerationProviderKind(): RuntimeProviderKind {
  let configured: string | undefined;
  try { configured = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_GENERATION_PROVIDER; } catch { configured = undefined; }
  const candidate = (configured ?? '').trim().toLowerCase();
  if (candidate === 'gemini' || candidate === 'render' || candidate === 'multica') return candidate;
  return 'mock';
}

export type BillableGenerationStartResult =
  | { ok: true; job: GenerationJob; requestedCredits: number; remainingCredits: number | null }
  | { ok: false; reason: BillableGenerationBlockReason; message: string; requestedCredits: number; remainingCredits: number | null };

export interface BillableGenerationBillingContext {
  workspaceId: string;
  plan: string;
  pricing: RequestedGenerationCreditInput;
}

export function formatCreditBlockMessage(requestedCredits: number, remainingCredits: number | null): string {
  const remaining = remainingCredits ?? 0;
  return `算力额度不足：本次操作需要 ${requestedCredits} 点，当前剩余 ${remaining} 点，请升级套餐或充值后重试。`;
}

export function formatCreditUnavailableMessage(): string {
  return '无法核验算力额度，请检查网络或稍后重试。';
}

export function estimateBillableGenerationCredits(pricing: RequestedGenerationCreditInput): number {
  // AIGEN-2: mock output is never billed (mirrors API generationCredits()).
  if (pricing.providerKind === 'mock') return 0;
  return estimateRequestedGenerationCredits(pricing);
}

export function buildBillableGenerationPricing(
  moduleId: ModuleId,
  pricingAction: RequestedGenerationCreditInput['pricingAction'] = 'generation',
  extras: Partial<Omit<RequestedGenerationCreditInput, 'moduleId' | 'pricingAction'>> = {},
): RequestedGenerationCreditInput {
  // AIGEN-3: providerKind/runtimeMode resolve from config (mock by default).
  // Callers may still override via `extras` for a staged per-module rollout.
  return {
    moduleId,
    pricingAction,
    providerKind: resolveGenerationProviderKind(),
    runtimeMode: 'web',
    ...extras,
  };
}

export async function startBillableGenerationJob(
  input: GenerationJobInput,
  context: GenerationJobRepositoryContext,
  billing: BillableGenerationBillingContext,
): Promise<BillableGenerationStartResult> {
  const requestedCredits = estimateBillableGenerationCredits(billing.pricing);

  // AIGEN-2: zero-credit (mock) jobs skip preflight and quota guards entirely —
  // nothing is held or captured, so there is no balance to check. The job is
  // still created so the asset/usage/audit flow runs for the preview.
  if (requestedCredits <= 0) {
    const job = await createGenerationJob(input, context);
    return { ok: true, job, requestedCredits: 0, remainingCredits: null };
  }

  if (isCreditBackendConfigured()) {
    const preflight = await preflightCredits({ workspaceId: billing.workspaceId, requiredCredits: requestedCredits });
    if (preflight.ok === false) {
      if (preflight.reason === 'unavailable') {
        return {
          ok: false,
          reason: 'unavailable',
          message: formatCreditUnavailableMessage(),
          requestedCredits,
          remainingCredits: preflight.balance,
        };
      }
      return {
        ok: false,
        reason: 'insufficient',
        message: formatCreditBlockMessage(requestedCredits, preflight.balance),
        requestedCredits,
        remainingCredits: preflight.balance,
      };
    }
  } else {
    const billingCtx = { workspaceId: billing.workspaceId };
    const plans = loadWorkspaceBillingPlans(billingCtx);
    const monthlyAllowance = getPlanMonthlyAllowance(billing.plan, plans);
    const guard = canStartBillableGeneration({
      monthlyAllowance,
      generationJobs: listGenerationJobs(billingCtx),
      moduleUsage: loadModuleUsage(billingCtx),
      usageEvents: listWorkspaceUsageEvents(billingCtx),
      requestedCredits,
    });
    if (!guard.allowed) {
      return {
        ok: false,
        reason: 'insufficient',
        message: formatCreditBlockMessage(requestedCredits, guard.remainingCredits),
        requestedCredits,
        remainingCredits: guard.remainingCredits,
      };
    }
  }

  try {
    const job = await createGenerationJob(input, context);
    return { ok: true, job, requestedCredits, remainingCredits: null };
  } catch (error) {
    if (error instanceof GenerationJobApiError && error.code === 'insufficient_credits') {
      return {
        ok: false,
        reason: 'insufficient',
        message: formatCreditBlockMessage(requestedCredits, null),
        requestedCredits,
        remainingCredits: null,
      };
    }
    throw error;
  }
}

export function isInsufficientCreditsError(error: unknown): boolean {
  return error instanceof GenerationJobApiError && error.code === 'insufficient_credits';
}
