# MVP 优先级队列（2026-06-26）

按 **Gate G1 → G2** 与 [mvp-completion-plan-2026.md](./mvp-completion-plan-2026.md) 排序。同一序号内可并行。

## P0 — 必须先做（L1 / G1）

| 序 | 动作 | 负责 | 状态 |
|----|------|------|------|
| **0** | `git push origin main`（Clash 代理见 [local-env-clash-k3s.md](./local-env-clash-k3s.md)） | 工程 | 本地 4 commits 待推 |
| **1** | 工程回归：`npm run test:p0-release` | 工程 | 本机/CI |
| **2** | Staging 栈 + smoke | 工程/运维 | **阻塞 G1** |
| | Compose：`.\scripts\staging-verify.ps1` | | |
| | k3s：`k3s-import-wsl.sh` + `k3s-deploy.ps1` + `k3s-verify.ps1` | | |
| **3** | 发 **Cohort** | 产品/运营 | 人工 |
| **4** | 转 **Finance** + P1-R02 表 | 财务 | 人工 |
| **5** | GitHub Release（可选） | 工程 | `gh release create ...` |

**G1 关闭条件：** 2 pass + 3 完成 + pricing-matrix 已绿（工程已绿）。

## P1 — G1 之后（L2 / G2）

| 序 | 动作 | 链接 |
|----|------|------|
| **6** | P1-R01 失败任务重试 UI 签字 | [p1-r01-failed-job-retry-manual.md](./p1-r01-failed-job-retry-manual.md) |
| **7** | P1-R05 导出审计签字 | [p1-r05-export-audit-manual.md](./p1-r05-export-audit-manual.md) |
| **8** | P1-R02 财务书面批准 → evidence | [p1-r02-pricing-review.md](./p1-r02-pricing-review.md) |
| **9** | GitHub Issue 工程关闭备注 | [github-p1-close-comments.md](./github-p1-close-comments.md) |

## P2 — 已完成的工程（仅跟踪签字/真机）

- P1-R04 / R06 / R07 / R08：工程 done，见 [remaining-issues](./saas-commercial-mvp-remaining-issues.md)
- P1-R03：staging callback smoke + 单测；真机 provider 见 [p1-r03-provider-deferral.md](./p1-r03-provider-deferral.md)

## 本机无 Docker 时工程最小集

```powershell
npm run test:p0-release
npm run test:provider-callback
```

Staging 必须在有 API 的环境跑：`npm run test:staging-verify`。

## 单页操作

[READY-TO-SEND-next-steps.md](./READY-TO-SEND-next-steps.md)