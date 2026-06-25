# 下一步执行包

**当前阻塞 G1：** 本机 **Staging smoke**（序 2）  
**可并行：** Cohort（序 3）、Finance（序 4）

---

## 序 2 — Staging（Docker Compose，G1）

```powershell
cd E:\code\aistudio
Copy-Item .env.deploy.example .env.deploy   # 首次
.\scripts\staging-verify.ps1
```

WSL2：`./scripts/staging-verify-wsl.sh`（见 [local-env-clash.md](./local-env-clash.md)）

通过后：在 [READY-TO-SEND-next-steps.md](./READY-TO-SEND-next-steps.md) 勾选 staging。

---

## 序 3 — Cohort（复制发送）

**标题：** `AI Studio Paid-Beta Staging 内测邀请 — v0.1.0-paid-beta-staging`

**正文：** [paid-beta-cohort-notice-2026-06-24.md](./paid-beta-cohort-notice-2026-06-24.md)

默认地址：Web `http://localhost:8080`（或 `WEB_PORT`），API `http://localhost:4000`。

---

## 序 4 — Finance（复制发送）

**标题：** `【需确认】AI Studio Paid-Beta 算力单价表 P1-R02`

**正文：** [paid-beta-finance-notice-2026-06-24.md](./paid-beta-finance-notice-2026-06-24.md)  
**附表：** [p1-r02-pricing-review.md](./p1-r02-pricing-review.md)

---

## 序 5 — GitHub Release（可选）

```powershell
$env:HTTPS_PROXY = "http://127.0.0.1:7897"
gh release create v0.1.0-paid-beta-staging `
  --title "v0.1.0 Paid-Beta Staging" `
  --notes-file docs/RELEASE-v0.1.0-paid-beta-staging.md
```

---

## 序 6–7 — Staging 通过后

- [p1-r01-failed-job-retry-manual.md](./p1-r01-failed-job-retry-manual.md)
- [p1-r05-export-audit-manual.md](./p1-r05-export-audit-manual.md)

---

## 工程已绿

- `npm run test:p0-release`
- `npm run test:pricing-matrix-sync`

总表：[mvp-priority-queue-2026-06-26.md](./mvp-priority-queue-2026-06-26.md)