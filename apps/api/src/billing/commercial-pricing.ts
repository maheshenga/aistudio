/**
 * Mirrors `COMMERCIAL_USAGE_PRICING` in src/lib/data/usageRepository.ts.
 * Keep both in sync until a shared package exists.
 */
export type CommercialUsagePricingAction = 'generation' | 'export' | 'automation' | 'runtime_dispatch';

export interface CommercialUsagePricingEntry {
  action: CommercialUsagePricingAction;
  unitCredits: number;
}

export type CommercialUsagePricingMatrix = Record<
  string,
  Partial<Record<CommercialUsagePricingAction, CommercialUsagePricingEntry>>
>;

export const COMMERCIAL_USAGE_PRICING: CommercialUsagePricingMatrix = {
  e_main_image: { generation: { action: 'generation', unitCredits: 4 } },
  e_video: { generation: { action: 'generation', unitCredits: 24 } },
  e_detail_page: { generation: { action: 'generation', unitCredits: 4 } },
  e_poster: { generation: { action: 'generation', unitCredits: 4 } },
  e_clone: { generation: { action: 'generation', unitCredits: 4 } },
  ai_image_edit: { generation: { action: 'generation', unitCredits: 6 } },
  image: { generation: { action: 'generation', unitCredits: 8 } },
  video: { generation: { action: 'generation', unitCredits: 24 } },
  copywriting_create: { generation: { action: 'generation', unitCredits: 3 } },
  chat: { generation: { action: 'generation', unitCredits: 2 } },
  speech: { generation: { action: 'generation', unitCredits: 2 } },
  remix_smart: { generation: { action: 'generation', unitCredits: 20 } },
  remix_materials: { automation: { action: 'automation', unitCredits: 2 } },
  remix_titles: { automation: { action: 'automation', unitCredits: 1 } },
  remix_templates: { automation: { action: 'automation', unitCredits: 2 } },
  remix_viral: { generation: { action: 'generation', unitCredits: 18 } },
  marketing_viral: { generation: { action: 'generation', unitCredits: 12 } },
  marketing_nfc: { automation: { action: 'automation', unitCredits: 4 } },
  marketing_website: { generation: { action: 'generation', unitCredits: 16 } },
  director_desk: {
    automation: { action: 'automation', unitCredits: 2 },
    generation: { action: 'generation', unitCredits: 6 },
  },
  tasks: { runtime_dispatch: { action: 'runtime_dispatch', unitCredits: 5 } },
};

export function commercialUsageCredits(
  moduleId: string,
  action: CommercialUsagePricingAction = 'generation',
): number | null {
  const entry = COMMERCIAL_USAGE_PRICING[moduleId]?.[action];
  return entry?.unitCredits ?? null;
}
