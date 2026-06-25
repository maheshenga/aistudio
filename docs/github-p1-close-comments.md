# GitHub issue 关闭备注（复制到 PR/Issue comment）

Baseline: `b20c4b6` · 2026-06-26

## P1-R04 Marketing → CRM

- `createMarketingLeadHandoff` in `MarketingView.tsx`
- Audit: `marketing_lead_create`, `marketing_followup_task_create`
- `npm run test:launch-readiness` asserts handoff helper

## P1-R06 Keyword library

- `CopywritingView` keywords tab + `keywordRepository`
- Registry `copywriting_keywords` → `implemented` (62/67)
- `npm run test:keyword-repo`

## P1-R07 Chat memory policy

- Explicit save to asset note / task (`handleSaveChatOutput`)
- Audit: `chat_memory_save` (+ `asset_create` / `task_create`)
- Session toggle `memoryEnabled` for in-thread context only (no silent infinite persistence)
- launch-readiness contract

## P1-R08 Speech consent

- `consentRequired` voices gated; `speech_voice_consent` audit on confirm
- Job/asset metadata includes provider + consent flags
- launch-readiness contract

## P1-R01 / P1-R05 / P1-R03 / P1-R02

| ID | Close engineering? | Remaining |
|----|-------------------|-----------|
| P1-R01 | Yes (panel + retry audit) | Manual UI sign-off doc |
| P1-R05 | Yes (export metering in launch-readiness) | Manual export sign-off doc |
| P1-R03 | Partial | Live provider; see `p1-r03-provider-deferral.md` |
| P1-R02 | Partial | Finance approval on unit prices |

Verification: `npm run test:p0-release`, `npm run test:provider-callback`, `npm run test:staging-verify` (requires API on :4000).