# Staging 浏览器访问

## 「localhost 拒绝了我们的连接请求」

几乎总是下面之一：

| 原因 | 处理 |
|------|------|
| **Docker Desktop 没开** | 托盘启动 Docker Desktop，等到 **Running**，再执行 `.\scripts\staging-up.ps1` |
| **栈没起来** | PowerShell：`.\scripts\staging-up.ps1`（会读 `.env.deploy` 的 `WEB_PORT`） |
| **端口写错** | 你当前是 **8081**，不是 8080 → `http://127.0.0.1:8081` |
| **Clash 代理 localhost** | Clash：**绕过** `localhost,127.0.0.1`，或关「系统代理」后刷新 |
| **用了 https** | 必须用 **http://** ，没有 TLS |

优先试：**http://127.0.0.1:8081**（比 `localhost` 少踩 IPv6 坑）。

## 正确地址（看 `.env.deploy`）

| 服务 | 本机默认 | 你当前配置 |
|------|----------|------------|
| **Web 工作台** | http://localhost:8080 | **http://localhost:8081**（`WEB_PORT=8081`） |
| API | http://localhost:4000 | 同上 |

根路径 `/` 返回 **404 是正常的**（Nest 无首页）；Web 由 nginx 提供 SPA。

## 打不开时逐项检查

### 1. 容器在跑

```powershell
wsl -e bash -lc "cd /mnt/e/code/aistudio && docker compose --env-file .env.deploy ps"
```

`api` / `web` 应为 **Up**，`db` 为 **healthy**。若 `api` 不断重启，先看：

```powershell
wsl -e bash -lc "cd /mnt/e/code/aistudio && docker compose --env-file .env.deploy logs api --tail 40"
```

### 2. 用对端口

不要用 `8080`，除非你 `.env.deploy` 里 `WEB_PORT=8080`。

### 3. Clash / 系统代理

代理若劫持 `localhost`，浏览器会连不上。在 Clash 规则里 **直连** `localhost`、`127.0.0.1`，或临时关闭系统代理再试。

### 4. Windows 浏览器 vs WSL

Docker Desktop 会把端口转到 Windows。在 **Windows** 浏览器打开：

`http://127.0.0.1:8081`

### 5. 快速探测（PowerShell）

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:8081/ -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest -Uri http://127.0.0.1:4000/ -UseBasicParsing -SkipHttpErrorCheck | Select-Object StatusCode
```

Web 期望 **200**；API 根路径 **404** 即表示 API 已监听。

### 6. 仍失败：重启栈

```powershell
wsl -e bash -lc "cd /mnt/e/code/aistudio && docker compose --env-file .env.deploy up -d"
```

等 **60 秒** 再开浏览器。

## 开发模式（不走 Docker Web）

```powershell
npm run dev
# http://localhost:3000 — 需 API :4000 已起，且 CORS 含 http://localhost:3000
```