# 本机环境：Clash（Windows）

适用：GitHub push 失败、本机跑 `staging-verify` 需 Docker。

## Clash → Git push

在 Clash 面板确认 **HTTP 代理端口**（本机曾用 `7897`，以实际为准）。

```powershell
$env:HTTPS_PROXY = "http://127.0.0.1:7897"
$env:HTTP_PROXY  = "http://127.0.0.1:7897"
cd E:\code\aistudio
git push origin main
```

或：

```powershell
git config --local http.https://github.com.proxy http://127.0.0.1:7897
```

## Staging（Docker Compose）

见 [deployment.md](./deployment.md)。

```powershell
Copy-Item .env.deploy.example .env.deploy
# JWT_SECRET、FIELD_ENCRYPTION_KEY、POSTGRES_PASSWORD
# CORS_ORIGINS=http://localhost:8080
.\scripts\staging-verify.ps1
```

Gate G1：`npm run test:staging-verify`（API 在 :4000）。

## 相关

- [mvp-phase0-ops-runbook.md](./mvp-phase0-ops-runbook.md)
- [READY-TO-SEND-next-steps.md](./READY-TO-SEND-next-steps.md)