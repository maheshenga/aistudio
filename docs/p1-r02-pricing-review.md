# P1-R02 Commercial Pricing Review

Updated: 2026-06-24  
Status: **pending product / finance sign-off**  
Code source of truth (UI usage estimates): `src/lib/data/usageRepository.ts` → `COMMERCIAL_USAGE_PRICING`  
API generation-job hold/capture: `apps/api/src/billing/credit-cost.ts` → **flat 5 credits** per job today

## Why this review blocks production billing

Paid-beta staging already charges credits on the **API** when `VITE_DATA_BACKEND=http`:

- Job create → **hold 5** (API `generationCredits()`)
- Job succeed → capture hold
- Job fail → refund

The **Billing / usage UI** shows different per-module estimates from `COMMERCIAL_USAGE_PRICING` (e.g. `image` generation = **8** credits in usage events, API hold = **5**).

Finance must either:

1. **Approve the mismatch** for staging (document as known beta gap), or  
2. **Align API holds** with the commercial matrix before real invoices.

## Proposed matrix (engineering estimates — all `billingStatus: estimated`)

| Module | Action | Credits / unit | Unit label | Description |
|--------|--------|----------------|------------|-------------|
| `e_main_image` | generation | 4 | image_variant | E-commerce main image variant |
| `e_main_image` | export | 1 | export_file | Export |
| `e_video` | generation | 24 | short_video | Product video |
| `e_video` | export | 2 | export_file | Export |
| `e_detail_page` | generation | 4 | detail_page_variant | Detail page creative |
| `e_detail_page` | export | 1 | export_file | Export |
| `e_poster` | generation | 4 | poster_variant | Poster |
| `e_poster` | export | 1 | export_file | Export |
| `e_clone` | generation | 4 | clone_variant | Clone design |
| `e_clone` | export | 1 | export_file | Export |
| `ai_image_edit` | generation | 6 | edit_operation | AI image edit |
| `image` | generation | 8 | image_output | Standalone image |
| `image` | export | 1 | export_file | Export |
| `video` | generation | 24 | short_video | Standalone video |
| `video` | export | 2 | export_file | Export |
| `copywriting_create` | generation | 3 | copy_pack | Copy pack |
| `copywriting_create` | export | 1 | export_file | Export |
| `chat` | generation | 2 | message_unit | Assistant reply |
| `speech` | generation | 2 | speech_unit | Speech unit |
| `remix_smart` | generation | 20 | preview_video | Smart remix preview |
| `remix_smart` | export | 2 | export_file | Export |
| `remix_materials` | automation | 2 | material_import | Material processing |
| `remix_materials` | export | 1 | export_file | Export |
| `remix_titles` | automation | 1 | template_save | Title template |
| `remix_titles` | export | 1 | export_file | Export |
| `remix_templates` | automation | 2 | template_save | Video template |
| `remix_templates` | export | 1 | export_file | Export |
| `remix_viral` | generation | 18 | viral_analysis | Viral clone analysis |
| `remix_viral` | export | 1 | export_file | Export |
| `marketing_viral` | generation | 12 | campaign_kit | Viral QR kit |
| `marketing_nfc` | automation | 4 | touchpoint_config | NFC config |
| `marketing_website` | generation | 16 | landing_page | Landing page |
| `director_desk` | automation | 2 | director_automation_unit | Director automation |
| `director_desk` | generation | 6 | director_generation_unit | Director generation |
| `tasks` | runtime_dispatch | 5 | agent_dispatch | Agent dispatcher |

## Plan allowances (workspace packages)

Defined in `src/lib/data/billingRepository.ts` (`loadWorkspaceBillingPlans`):

| Plan | Monthly allowance (credits) | Notes |
|------|------------------------------|--------|
| Free / trial | per product defaults | Staging new workspaces get monthly grant via API |
| Pro / team tiers | see BillingView | Confirm list prices with finance |

## Finance / product sign-off checklist

- [ ] Approve or revise each **unitCredits** value in the table above
- [ ] Decide **API hold policy**: keep flat 5 vs sync with matrix per `moduleId` + action
- [ ] Confirm **monthly plan allowances** and overage pricing
- [ ] Confirm **export** actions are billable in paid-beta scope
- [ ] Sign approver name + date below

| Field | Value |
|-------|-------|
| Decision | pending |
| Approver | |
| Date | |
| API alignment required before production? | yes / no |

## After sign-off (engineering)

1. Update `COMMERCIAL_USAGE_PRICING` if prices change  
2. Align `apps/api/src/billing/credit-cost.ts` (or module-aware pricing service) with approved matrix  
3. Re-run `npm run test:saas-foundation`, `npm run test:billable-generation`, `npm run test:staging-api-smoke`  
4. Mark P1-R02 closed in [saas-commercial-mvp-p0-release-evidence.md](./saas-commercial-mvp-p0-release-evidence.md)

## Related docs

- [paid-beta-scope.md](./paid-beta-scope.md) — cohort scope  
- [saas-commercial-mvp-p0-release-evidence.md](./saas-commercial-mvp-p0-release-evidence.md) — P0 sign-off template
