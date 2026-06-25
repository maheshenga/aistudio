# 立即发送（Phase 0 下一步）

**工程基线：** `main` @ `5f0c227`  
**日期：** 2026-06-26

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

```powershell
cp .env.deploy.example .env.deploy
# 填写 JWT_SECRET、FIELD_ENCRYPTION_KEY、POSTGRES_PASSWORD
# 若 Web 用 8081：WEB_PORT=8081 且 CORS_ORIGINS=http://localhost:8081
.\scripts\staging-verify.ps1
```

或见 [mvp-phase0-ops-runbook.md](./mvp-phase0-ops-runbook.md)。

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