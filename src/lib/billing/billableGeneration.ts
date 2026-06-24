import type { ModuleId } from '../../types';
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
  return estimateRequestedGenerationCredits(pricing);
}

export function buildBillableGenerationPricing(
  moduleId: ModuleId,
  pricingAction: RequestedGenerationCreditInput['pricingAction'] = 'generation',
  extras: Partial<Omit<RequestedGenerationCreditInput, 'moduleId' | 'pricingAction'>> = {},
): RequestedGenerationCreditInput {
  return {
    moduleId,
    pricingAction,
    providerKind: 'mock',
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
