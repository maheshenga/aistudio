# MVP 完成计划（2026）

Updated: 2026-06-26  
Baseline: `main`, P0 signed 2026-06-24, tag `v0.1.0-paid-beta-staging`

## 完成定义

| 层级 | 名称 | 门禁 |
|------|------|------|
| L1 | Cohort MVP | G1 — staging + cohort 通知 + smoke pass |
| L2 | Production MVP | G2 — P1-R02 财务签字 + 失败重试/导出验收 |
| L3 | Product MVP | G3 — mock 模块策略 + 营销→CRM（P1-R04 等） |

## Phase 0 — Cohort（L1）

- [x] 0.1 通知稿就绪 — [paid-beta-cohort-notice-2026-06-24.md](./paid-beta-cohort-notice-2026-06-24.md)（**待发送** → [READY-TO-SEND-next-steps.md](./READY-TO-SEND-next-steps.md)）
- [x] 0.2 财务稿就绪 — [paid-beta-finance-notice-2026-06-24.md](./paid-beta-finance-notice-2026-06-24.md)（**待签字**）
- [x] 0.3 Runbook — [mvp-phase0-ops-runbook.md](./mvp-phase0-ops-runbook.md)
- [x] 0.4 环境检查清单 — 同上 Runbook §0.4
- [ ] 0.5 GitHub Release 页面（文案已有 [RELEASE](./RELEASE-v0.1.0-paid-beta-staging.md)）
- [x] 0.6 预览模块策略 — [mock-module-strategy-2026-06-26.md](./mock-module-strategy-2026-06-26.md)

### Gate G1

- [ ] `npm run test:staging-verify` pass（或 `.\scripts\staging-verify.ps1`；需 Docker API）
- [x] `npm run test:pricing-matrix-sync` pass
- [ ] Cohort 通知已发（人工）

## Phase 1 — Production revenue（L2）

- [ ] 1.1 P1-R02 财务书面批准 — [p1-r02-pricing-review.md](./p1-r02-pricing-review.md)
- [x] 1.2 工程对齐 — `test:pricing-matrix-sync` + `test:billable-generation`（本地跑）
- [x] 1.3 P1-R01 人工清单 — [p1-r01-failed-job-retry-manual.md](./p1-r01-failed-job-retry-manual.md)
- [x] 1.4 P1-R05 人工清单 — [p1-r05-export-audit-manual.md](./p1-r05-export-audit-manual.md)
- [x] 1.5 P1-R03 延后说明 — [p1-r03-provider-deferral.md](./p1-r03-provider-deferral.md)
- [ ] 1.6 evidence 标记 P1-R02 closed（财务后）

### Gate G2

- [ ] 财务定价已批
- [ ] image 全链路 UI+API 验收
- [ ] 生产密钥与环境与 staging 分离

## Phase 2 — Product surface（L3a）

- [x] 2.1 mock 模块策略 — [mock-module-strategy-2026-06-26.md](./mock-module-strategy-2026-06-26.md)
- [x] 2.2 P1-R06 关键词库
- [x] 2.3 `ModulePreviewBanner`
- [x] 2.4 文档同步

## Phase 3 — Growth loop（L3b）

- [x] 3.1 P1-R04 Marketing → CRM
- [x] 3.2 P1-R07 Chat — 显式保存 + `chat_memory_save` 审计 + launch-readiness
- [x] 3.3 P1-R08 Speech — consent 门控 + `speech_voice_consent` 审计 + launch-readiness

## 每周回归

- [x] `npm run test:p0-release`（2026-06-26 pass）

## 明确不做（本计划）

- App.tsx 大重构、ai_canvas 全栈、Avatar B01/B02 全量（单独立项）

## 相关文档

- [paid-beta-release-checklist.md](./paid-beta-release-checklist.md)
- [saas-commercial-mvp-remaining-issues.md](./saas-commercial-mvp-remaining-issues.md)
- [paid-beta-scope.md](./paid-beta-scope.md)
- [mvp-phase0-ops-runbook.md](./mvp-phase0-ops-runbook.md)
- [READY-TO-SEND-next-steps.md](./READY-TO-SEND-next-steps.md)
- [github-p1-close-comments.md](./github-p1-close-comments.md)