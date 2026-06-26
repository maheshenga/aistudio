# 本机环境：WSL2 + Docker + Clash（Windows）

## Staging（G1，推荐）

前提：**Docker Desktop** 已启动，并为你的 WSL 发行版开启 **Settings → Resources → WSL Integration**。

### 方式 A — Windows PowerShell（docker 在 PATH）

```powershell
cd E:\code\aistudio
Copy-Item .env.deploy.example .env.deploy   # 首次
# 编辑：JWT_SECRET、FIELD_ENCRYPTION_KEY、POSTGRES_PASSWORD
# CORS_ORIGINS=http://localhost:8080
.\scripts\staging-verify.ps1
```

### 方式 B — WSL 内执行

```bash
cd /mnt/e/code/aistudio   # 按实际盘符
cp .env.deploy.example .env.deploy
# nano .env.deploy 填密钥
chmod +x scripts/staging-verify-wsl.sh
./scripts/staging-verify-wsl.sh
```

冒烟在 WSL 里跑 **Node/npm**；若 WSL 未装 Node 22，可在 Windows 起完 compose 后只跑：

```powershell
npm run test:staging-verify
```

### 访问

| 服务 | 地址 |
|------|------|
| API | http://localhost:4000 |
| Web | http://localhost:8080（或 `.env.deploy` 的 `WEB_PORT`） |

端口由 Docker Desktop 转发到 Windows `localhost`，浏览器在 Windows 打开即可。

### 常见问题

| 现象 | 处理 |
|------|------|
| `docker: command not found`（WSL） | 打开 Docker Desktop，勾选该 WSL 发行版集成 |
| `ECONNREFUSED :4000` | `docker compose ps` 看 api 是否 healthy；多等 30s 或 `docker compose logs api` |
| CORS | `CORS_ORIGINS` 必须含 Web 的 origin（含端口） |
| 拉镜像 `auth.docker.io` 超时 | WSL：`export HTTP_PROXY=http://$(ip route|awk '/default/{print $3}'):7897`（Clash 开 **Allow LAN**） |

## Clash → Git push（Windows）

```powershell
$env:HTTPS_PROXY = "http://127.0.0.1:7897"
git push origin main
```

## 相关

- [deployment.md](./deployment.md)
- [mvp-phase0-ops-runbook.md](./mvp-phase0-ops-runbook.md)
- [READY-TO-SEND-next-steps.md](./READY-TO-SEND-next-steps.md)