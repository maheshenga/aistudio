# 立即发送（Phase 0 下一步）

**工程基线：** `main` @ `b20c4b6`  
**日期：** 2026-06-26

> Staging API smoke 必须在 **本机 Docker** 运行；CI/Agent 环境若无 Docker，请只跑 `npm run test:p0-release` 与 `npm run test:provider-callback`。

---

## 1. Cohort（复制发送）

| 项 | 链接 |
|----|------|
| 正文 | [paid-beta-cohort-notice-2026-06-24.md](./paid-beta-cohort-notice-2026-06-24.md) §邮件正文 |
| 建议标题 | `AI Studio Paid-Beta Staging 内测邀请 — v0.1.0-paid-beta-staging` |

发送后在本文件底部打勾：`- [x] Cohort 已发`

---

## 2. Finance（复制发送）

| 项 | 链接 |
|----|------|
| 正文 | [paid-beta-finance-notice-2026-06-24.md](./paid-beta-finance-notice-2026-06-24.md) |
| 单价表 | [p1-r02-pricing-review.md](./p1-r02-pricing-review.md) |

收到签字后：更新 p1-r02 表 + evidence 关 P1-R02。

---

## 3. Staging（本机 PowerShell）

**Docker Compose：**

```powershell
.\scripts\staging-verify.ps1
```

**k3s：**

```powershell
.\scripts\k3s-deploy.ps1
.\scripts\k3s-verify.ps1 -ApiUrl "http://127.0.0.1:30400"
```

或（API 已起）：`npm run test:staging-verify`

或见 [mvp-phase0-ops-runbook.md](./mvp-phase0-ops-runbook.md)。  
本机 **Clash / k3s**：见 [local-env-clash-k3s.md](./local-env-clash-k3s.md)。  
待 push：`git push origin main`（提交 `ceac7ba`）。

---

## 4. GitHub Release（可选）

```powershell
gh release create v0.1.0-paid-beta-staging `
  --title "v0.1.0 Paid-Beta Staging" `
  --notes-file docs/RELEASE-v0.1.0-paid-beta-staging.md
```

---

## 5. 人工签字（staging 跑通后）

- [ ] [p1-r01-failed-job-retry-manual.md](./p1-r01-failed-job-retry-manual.md)
- [ ] [p1-r05-export-audit-manual.md](./p1-r05-export-audit-manual.md)

---

## 勾选

- [ ] Cohort 已发
- [ ] Finance 已转
- [ ] `staging-verify.ps1` pass
- [ ] GitHub Release 已建