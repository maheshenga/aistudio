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

## 3. k3s（本机集群）

官方清单与脚本：

```powershell
.\scripts\k3s-deploy.ps1      # 读 .env.deploy，build 镜像，kubectl apply
.\scripts\k3s-verify.ps1      # NodePort 30400 或改 -ApiUrl
```

详见 [deploy/k3s/README.md](../deploy/k3s/README.md)。

**WSL 里跑 k3s、Windows 上 Docker：** 在 WSL 仓库根目录：

```bash
export PUBLIC_API_URL=http://$(hostname -I | awk '{print $1}'):30400   # 或你的节点 IP
bash scripts/k3s-import-wsl.sh
```

Windows 再执行：`.\scripts\k3s-deploy.ps1 -SkipBuild`

| 方式 | 说明 |
|------|------|
| **k3s 全栈** | 上列脚本；镜像需 `docker build` 后 `k3s ctr images import`（见 README） |
| **Compose 试跑** | `.\scripts\staging-verify.ps1`（Gate G1 等价） |

paid-beta **Gate G1** 只要求 API 可达且 `npm run test:staging-verify` pass。

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