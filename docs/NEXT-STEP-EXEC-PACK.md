# 下一步执行包（push 已完成 @ `fa498bc`）

**当前阻塞 G1：** 本机 **Staging smoke**（序 2）  
**可并行：** Cohort（序 3）、Finance（序 4）

---

## 序 2 — Staging（你本机 PowerShell，二选一）

### k3s

```powershell
cd E:\code\aistudio
# 确保 .env.deploy 已填密钥；CORS 含 Web 来源，例 http://127.0.0.1:30080
```

WSL（若 k3s 在 WSL）：

```bash
cd /mnt/e/code/aistudio   # 按你的盘符
export PUBLIC_API_URL=http://127.0.0.1:30400
bash scripts/k3s-import-wsl.sh
```

Windows：

```powershell
.\scripts\k3s-deploy.ps1 -SkipBuild   # 若 WSL 已 build+import
# 或全量：.\scripts\k3s-deploy.ps1
.\scripts\k3s-verify.ps1 -ApiUrl "http://127.0.0.1:30400"
```

### Docker Compose

```powershell
.\scripts\staging-verify.ps1
```

通过后：在 [READY-TO-SEND-next-steps.md](./READY-TO-SEND-next-steps.md) 勾选 staging。

---

## 序 3 — Cohort（复制发送）

**标题：** `AI Studio Paid-Beta Staging 内测邀请 — v0.1.0-paid-beta-staging`

**正文：** 打开 [paid-beta-cohort-notice-2026-06-24.md](./paid-beta-cohort-notice-2026-06-24.md) → §「邮件 / Slack / 飞书」整段复制。

**发前改地址表（若用 k3s NodePort）：**

| 服务 | k3s 默认 |
|------|----------|
| Web | `http://<节点IP>:30080` |
| API | `http://<节点IP>:30400` |

Compose 默认：Web `8080`/`8081`，API `4000`（见 `.env.deploy` 的 `WEB_PORT`）。

---

## 序 4 — Finance（复制发送）

**标题：** `【需确认】AI Studio Paid-Beta 算力单价表 P1-R02`

**正文：** [paid-beta-finance-notice-2026-06-24.md](./paid-beta-finance-notice-2026-06-24.md)  
**附表：** [p1-r02-pricing-review.md](./p1-r02-pricing-review.md)

---

## 序 5 — GitHub Release（可选，本机 Clash）

```powershell
$env:HTTPS_PROXY = "http://127.0.0.1:7897"
gh release create v0.1.0-paid-beta-staging `
  --title "v0.1.0 Paid-Beta Staging" `
  --notes-file docs/RELEASE-v0.1.0-paid-beta-staging.md
```

若 tag 已存在：`gh release upload` 或改 patch tag。

---

## 序 6–7 — Staging 通过后

- [p1-r01-failed-job-retry-manual.md](./p1-r01-failed-job-retry-manual.md)
- [p1-r05-export-audit-manual.md](./p1-r05-export-audit-manual.md)

---

## 工程已绿（无需重复）

- `npm run test:p0-release`
- `npm run test:pricing-matrix-sync`
- `origin/main` @ `fa498bc`

总表：[mvp-priority-queue-2026-06-26.md](./mvp-priority-queue-2026-06-26.md)