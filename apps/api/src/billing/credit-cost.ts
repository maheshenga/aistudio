import { commercialUsageCredits, type CommercialUsagePricingAction } from './commercial-pricing';

export type GenerationCreditInput = {
  moduleId?: string | null;
  type?: string | null;
  runtimeMode?: string | null;
  providerKind?: string | null;
  pricingAction?: CommercialUsagePricingAction;
  unitCount?: number | null;
};

/** Deterministic generation hold/capture amount (aligned with frontend usage matrix). */
export function generationCredits(job: GenerationCreditInput): number {
  // AIGEN-2: mock output is never billed. The creative pipeline returns
  // placeholder/template content (no real inference), so charging commercial
  // credits for it would be a consumer-protection problem. Mock jobs cost 0
  // until a real provider is wired and the module is promoted (FLIP-01).
  if (job.providerKind === 'mock') return 0;

  if (job.runtimeMode === 'desktop_multica') return 1;
  if (job.providerKind === 'multica') return 3;

  const moduleId = job.moduleId ?? job.type ?? null;
  if (moduleId) {
    const unitCount = Math.max(1, Math.floor(Number(job.unitCount ?? 1)) || 1);
    const priced = commercialUsageCredits(moduleId, job.pricingAction ?? 'generation');
    if (priced !== null) return priced * unitCount;
  }

  return 5;
}
