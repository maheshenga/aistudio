# MVP 执行记录

Date: 2026-06-26

## 已完成

| 项 | 结果 |
|----|------|
| 新增 [mvp-completion-plan-2026.md](./mvp-completion-plan-2026.md) | 含 Phase 0–3 勾选清单 |
| `npm run test:pricing-matrix-sync` | **pass**（22 API / 35 UI entries） |
| Gate G1 定价同步 | 已在计划中勾选 |
| P1-R06 / 关键词库 | registry `copywriting_keywords` → **implemented**（62/67） |
| Preview 横幅 | [ModulePreviewBanner.tsx](../src/components/ModulePreviewBanner.tsx) + App 主/分屏 |
| `git push origin main` | **done** → `9fcca22` on GitHub |
| P1-R04 营销→CRM | 代码+`test:launch-readiness` 已覆盖，计划勾选 3.1 |
| `test:launch-readiness` | **pass**（2026-06-26 文档同步后） |
| 按优先级全量工程项 | P1-R07/R08 审计+契约；Phase0/1 Runbook；cohort 文案；`test:p0-release` **pass** |
| `npm run test:staging-verify` | 脚本已加（pricing-matrix + staging smokes）；需 API :4000 |
| P1 工程快照 + Issue 关闭备注 | [remaining-issues](./saas-commercial-mvp-remaining-issues.md) 表；[github-p1-close-comments](./github-p1-close-comments.md) |
| READY-TO-SEND 基线 | `b20c4b6` |
| k3s 部署包 | `deploy/k3s` + `k3s-deploy.ps1` / `k3s-verify.ps1` / `k3s-import-wsl.sh`（`07e6cbb`） |
| `npm run test:p0-release` | **pass**（2026-06-26 优先级回归） |
| 优先级队列 | [mvp-priority-queue-2026-06-26.md](./mvp-priority-queue-2026-06-26.md) |

## 阻塞 / 待环境

| 项 | 结果 | 下一步 |
|----|------|--------|
| `npm run test:staging-api-smoke` | **fail** — `ECONNREFUSED` @ `http://localhost:4000` | 启动 API 栈后重跑 |

### 启动 staging 栈（本机）

```powershell
cp .env.deploy.example .env.deploy
# 填写 JWT_SECRET、FIELD_ENCRYPTION_KEY、POSTGRES_PASSWORD
.\scripts\staging-verify.ps1
# 或 API 已起：
npm run test:staging-verify
```

可选：`STAGING_API_URL=http://127.0.0.1:4000 npm run test:staging-api-smoke`（若脚本支持环境变量）

## 仍需人工（Phase 0）

1. 发送 cohort 通知  
2. 财务 P1-R02 评审签字  
3. GitHub Release 页面  
4. mock 策略已文档化 — 见 [mock-module-strategy-2026-06-26.md](./mock-module-strategy-2026-06-26.md)  

## 建议下一批（人工 / 环境）

- 发送 cohort + 转 finance → [READY-TO-SEND-next-steps.md](./READY-TO-SEND-next-steps.md)  
- Staging `staging-verify.ps1` pass 后 P1-R01/R05 人工签字  
- GitHub issue 关闭文案 → [github-p1-close-comments.md](./github-p1-close-comments.md)