# SaaS Commercial MVP P1 Revenue Workflow Progress

Updated: 2026-06-11

## Current Gate

P1 revenue workflow work now uses the same commercial evidence chain as P0 control-plane work:

`user action -> campaign or generation job -> saved asset -> usage event -> audit event -> billing visibility`

Latest local verification for this batch:

- `npm.cmd run test:launch-readiness`: pass
- `npm.cmd run test:saas-foundation`: pass
- `npm.cmd run lint`: pass

## Completion Table

| Area | Module(s) | Status | Repository Evidence | Remaining Risk |
| --- | --- | --- | --- | --- |
| E-commerce creation | `e_main_image`, `e_video`, `e_detail_page`, `e_poster`, `e_clone`, `ai_image_edit` | Paid-beta ready | Generation jobs, assets, usage events, audit lifecycle | Failed-provider retry UX still needs manual smoke |
| Standalone image | `image` | Paid-beta ready | Generation job, image asset, usage event, audit lifecycle | Provider-specific pricing still uses estimates |
| Video creation | `video` | Paid-beta ready | Generation job, video asset, usage event, audit lifecycle | Real provider callback path not certified |
| Copywriting | `copywriting_create` | Paid-beta ready | Generation job, text asset, usage event, audit lifecycle | Keyword library CRUD remains separate |
| Chat | `chat` | Paid-beta ready | Assistant reply job, text asset, usage event, audit lifecycle | Long-session memory policy still product review |
| Speech | `speech` | Paid-beta ready | Speech job, audio asset, text-length usage event, audit lifecycle | Voice/provider consent policy needs legal review |
| Remix | `remix_smart`, `remix_materials`, `remix_titles`, `remix_templates`, `remix_viral` | Paid-beta ready | Smart remix jobs, material assets, reusable title/template assets, viral clone analysis jobs, usage events, production tasks, and audit lifecycle | Real video provider callback path not certified |
| Marketing | `marketing_viral`, `marketing_nfc`, `marketing_website` | Paid-beta ready | Campaign records, generated assets, usage events, audit lifecycle | Lead/task follow-up is not yet wired to CRM/tasks |
| Director Desk | `director_desk` | Paid-beta ready | Director assets, automation/generation usage events, production task follow-up, and audit events for asset version, consistency, storyboard fix, and script split actions | Real render provider callback path not certified |
| Avatar | `avatar_create`, `avatar_voice`, `avatar_space` | Deferred to P2 | Static UI only | Consent-aware avatar/voice records, assets, usage, and audit required |
| Design workflows | `design_logo`, `design_packaging`, `design_ads`, `design_interior`, `design_fashion` | Deferred to P2 | Static workflow UI only | Design brief, generated asset, usage, and project linkage required |

## New In This Batch

- Added `src/lib/data/campaignRepository.ts` for workspace-scoped campaign records.
- Wired `MarketingView` viral QR publishing to campaign, generation job, print asset, usage, and audit events.
- Wired `MarketingView` NFC touchpoint configuration to campaign, generated config asset, automation usage, and audit events.
- Wired `MarketingView` website generation to campaign, generation job, page asset, usage, and audit events.
- Extended launch and foundation contracts so Marketing cannot regress into static-only actions.
- Wired `DirectorDeskView` billable director actions to usage events for asset version updates, consistency checks, storyboard fixes, and script splitting.
- Wired `DirectorDeskView` storyboard checks, storyboard fixes, and script splits to production/review task records with `task_create` audit events.
- Wired `RemixView` material uploads, title templates, video templates, and viral clone analysis to assets, usage events, audit events, and viral-clone production tasks.

## Next Development Targets

1. Avatar consent workflow: require consent metadata before avatar/voice generation and save source/output assets.
2. Design workflow persistence: save design briefs, generated assets, usage estimates, and project links.
3. Billing review: confirm P1 credit estimates with business pricing before paid beta.
4. Failed-provider recovery smoke: certify failed P1 generation jobs remain retryable and auditable.
