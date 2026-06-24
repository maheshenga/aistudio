import { commercialUsageCredits, type CommercialUsagePricingAction } from './commercial-pricing';

export type GenerationCreditInput = {
  moduleId?: string | null;
  type?: string | null;
  runtimeMode?: string | null;
  providerKind?: string | null;
  pricingAction?: CommercialUsagePricingAction;
};

/** Deterministic generation hold/capture amount (aligned with frontend usage matrix). */
export function generationCredits(job: GenerationCreditInput): number {
  if (job.runtimeMode === 'desktop_multica') return 1;
  if (job.providerKind === 'multica') return 3;

  const moduleId = job.moduleId ?? job.type ?? null;
  if (moduleId) {
    const priced = commercialUsageCredits(moduleId, job.pricingAction ?? 'generation');
    if (priced !== null) return priced;
  }

  return 5;
}
