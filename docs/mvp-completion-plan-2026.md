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

- [ ] 0.1 发送 [paid-beta-cohort-notice-2026-06-24.md](./paid-beta-cohort-notice-2026-06-24.md)
- [ ] 0.2 财务评审 [p1-r02-pricing-review.md](./p1-r02-pricing-review.md)
- [ ] 0.3 部署 Runbook 演练（[deployment.md](./deployment.md)）
- [ ] 0.4 Staging 环境检查（CORS、JWT、VITE_DATA_API_URL）
- [ ] 0.5 GitHub Release `v0.1.0-paid-beta-staging`
- [ ] 0.6 用户预期：预览模块（画布/关键词/Avatar）

### Gate G1

- [ ] `npm run test:staging-api-smoke` pass（目标 API）
- [x] `npm run test:pricing-matrix-sync` pass（2026-06-26 本地）
- [ ] Cohort 通知已发

## Phase 1 — Production revenue（L2）

- [ ] 1.1 P1-R02 财务书面批准 → 必要时改 `COMMERCIAL_USAGE_PRICING` + `commercial-pricing.ts`
- [ ] 1.2 `test:pricing-matrix-sync` + `test:billable-generation` + staging smoke 复跑
- [ ] 1.3 P1-R01 人工：失败 job → 重试 → 审计
- [ ] 1.4 P1-R05 导出 usage + audit（≥3 创作模块）
- [ ] 1.5 P1-R03：真实 provider live smoke **或** 文档声明延后
- [ ] 1.6 evidence 标记 P1-R02 closed

### Gate G2

- [ ] 财务定价已批
- [ ] image 全链路 UI+API 验收
- [ ] 生产密钥与环境与 staging 分离

## Phase 2 — Product surface（L3a）

- [ ] 2.1 决策：6 mock 模块 Implement / Preview / Hide
- [x] 2.2 P1-R06 关键词库 — registry `implemented`（UI+repo 已存在，2026-06-26）
- [x] 2.3 mock 模块统一 Preview 提示 — `ModulePreviewBanner`（2026-06-26）
- [x] 2.4 同步 P1 progress / paid-beta-scope 文档（2026-06-26 push `9fcca22`）

## Phase 3 — Growth loop（L3b）

- [x] 3.1 P1-R04 Marketing → CRM + tasks（`createMarketingLeadHandoff` + launch-readiness，已存在）
- [ ] 3.2 P1-R07 Chat 记忆策略
- [ ] 3.3 P1-R08 Speech consent + audit

## 每周回归

- [ ] `npm run test:p0-release`（主分支合并前）

## 明确不做（本计划）

- App.tsx 大重构、ai_canvas 全栈、Avatar B01/B02 全量（单独立项）

## 相关文档

- [paid-beta-release-checklist.md](./paid-beta-release-checklist.md)
- [saas-commercial-mvp-remaining-issues.md](./saas-commercial-mvp-remaining-issues.md)
- [paid-beta-scope.md](./paid-beta-scope.md)