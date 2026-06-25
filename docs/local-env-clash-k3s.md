# 本机环境：Clash + k3s（Windows）

适用：GitHub push 失败、`staging-verify` 需要起 API 栈。

## 1. Clash → Git push

在 Clash 面板确认 **HTTP 代理端口**（常见 `7890`，以你实际为准）。

PowerShell（仅当前窗口）：

```powershell
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
$env:HTTP_PROXY  = "http://127.0.0.1:7890"
cd E:\code\aistudio
git push origin main
```

或长期仅对本仓库：

```powershell
git config --local http.https://github.com.proxy http://127.0.0.1:7890
```

推送未提交的提交：`ceac7ba`（`test:staging-verify` + P1 文档）。若已 push 可忽略。

## 2. Staging 验证（推荐：Docker Compose）

仓库默认路径是 **Docker Compose**（[deployment.md](./deployment.md)），不是 k3s 清单。

1. 安装并启动 **Docker Desktop**（Windows 上 `docker` 在 PATH 里可用）。
2. 准备密钥：

```powershell
cd E:\code\aistudio
Copy-Item .env.deploy.example .env.deploy
# 编辑 .env.deploy：JWT_SECRET、FIELD_ENCRYPTION_KEY、POSTGRES_PASSWORD
```

3. 一键：

```powershell
.\scripts\staging-verify.ps1
```

通过后在 [READY-TO-SEND-next-steps.md](./READY-TO-SEND-next-steps.md) 勾选 `staging-verify.ps1 pass`。

若 Web 用 3000 开发端口、API 仍 4000：保证 `CORS_ORIGINS` 含 `http://localhost:3000`；`PUBLIC_API_URL=http://localhost:4000`。

## 3. k3s（可选，需自行映射）

当前 **没有** 官方 Helm/K8s 清单；`docker-compose.yml` 定义三服务：`db` / `api` / `web`。

可选做法：

| 方式 | 说明 |
|------|------|
| **A. 仅 k3s 跑 DB** | 在 k3s 起 PostgreSQL，把 `DATABASE_URL` 指到集群 Service；本机或集群内跑 `apps/api`（`npm run` / 镜像）。 |
| **B. kompose** | `kompose convert -f docker-compose.yml` 生成 YAML 后按 k3s 改 image、Secret、Ingress。 |
| **C. 混合** | API+Web 仍用 `docker compose` 做 paid-beta smoke；生产再上 k3s。 |

paid-beta **Gate G1** 只要求本机可访问 `http://localhost:4000` 且 `npm run test:staging-verify` pass，不要求必须 k3s。

## 4. k3s 与 Docker 关系

- k3s 自带 **containerd**；构建镜像可在节点上用 `docker build`（若装了 docker CLI）或 `nerdctl` / `buildkit`。
- Windows 上常见：**Docker Desktop** 负责 compose 试跑；**k3s** 多在 WSL2/Linux 节点或远程 VPS。

## 5. 无 Docker 时的最小 API 冒烟

若只在 k3s/Linux 节点有 Postgres，可在该节点：

```bash
cd apps/api
# 配置 DATABASE_URL、JWT_SECRET、FIELD_ENCRYPTION_KEY
npm ci && npx prisma migrate deploy && npm run start:prod
```

在开发机（Clash 无关）：

```powershell
$env:STAGING_API_URL = "http://<api-host>:4000"
npm run test:staging-verify
```

## 相关

- [mvp-phase0-ops-runbook.md](./mvp-phase0-ops-runbook.md)
- [READY-TO-SEND-next-steps.md](./READY-TO-SEND-next-steps.md)