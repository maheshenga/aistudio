# 部署上线指南(自托管 / VPS)

本指南覆盖用 Docker Compose 在单台 VPS 上一键起生产栈:**PostgreSQL + NestJS API + Vite/nginx 前端**。

## 架构

```
浏览器 ──HTTP──> web (nginx:80, 静态 SPA)
   │
   └────HTTP API 调用──> api (NestJS:4000) ──> db (PostgreSQL:5432)
```

- **web**:`Dockerfile`(根)→ Vite 构建静态产物,nginx 托管 + SPA history fallback。前端调用后端的地址 `VITE_DATA_API_URL` 在**构建期**烘焙进包,因此必须是浏览器可达的公网地址。
- **api**:`apps/api/Dockerfile`(多阶段)→ 容器启动时先 `prisma migrate deploy` 再 `node dist/src/main.js`。启动强制校验 `JWT_SECRET` 与 `FIELD_ENCRYPTION_KEY`,缺失即拒绝启动。
- **db**:`postgres:16-alpine`,数据落 `db-data` 卷,带 healthcheck;api `depends_on` 数据库 healthy 后才启动。

## 前置条件

- 一台装有 Docker Engine + Docker Compose v2 的 Linux 主机
- 开放端口(默认):web `8080`、api `4000`(生产建议只暴露反代后的 443,见下)

## 步骤

### 1. 准备密钥配置

```bash
cp .env.deploy.example .env.deploy
```

编辑 `.env.deploy`,**必填**两个密钥:

```bash
# JWT 签名密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 字段加密密钥(AES-256-GCM,32 字节 hex)
openssl rand -hex 32
```

分别填入 `JWT_SECRET` 与 `FIELD_ENCRYPTION_KEY`。同时设置强数据库密码 `POSTGRES_PASSWORD`。

> `.env.deploy` 已被 `.gitignore` 忽略,不会进版本库。切勿提交真实密钥。

### 2. 配置对外地址

`.env.deploy` 中:

- `PUBLIC_API_URL`:**浏览器**访问 API 的地址。本地单机试跑用 `http://localhost:4000`;正式部署填反代后的公网地址,如 `https://api.example.com`。此值会烘焙进前端包,改它需要重新 `--build`。
- `CORS_ORIGINS`:API 的 CORS 允许来源,必须包含前端被访问的来源(如 `https://app.example.com` 或 `http://localhost:8080`)。多个用逗号分隔。
- `WEB_PORT` / `API_PORT`:宿主机映射端口。

### 3. 启动

```bash
docker compose --env-file .env.deploy up -d --build
```

首次启动 api 容器会自动执行 `prisma migrate deploy` 应用全部迁移。

### 4. 验证

```bash
docker compose ps                       # 三个服务应为 running/healthy
docker compose logs -f api              # 应看到 migrate deploy 完成 + Nest 启动
curl -i http://localhost:4000/          # API 健康探测
# 浏览器打开 http://<host>:8080
```

## 数据库迁移

迁移在 api 容器启动时由 entrypoint 自动 `prisma migrate deploy` 应用——这是生产安全命令,只执行已生成的迁移,不会重置库或交互提示。新增迁移后重新部署即可:

```bash
docker compose --env-file .env.deploy up -d --build api
```

手动单独执行迁移:

```bash
docker compose exec api npx prisma migrate deploy
```

## 反向代理与 HTTPS(生产建议)

生产环境不要直接暴露 `8080`/`4000`,在前面放 nginx/Caddy/Traefik 反代并签发 TLS:

- `app.example.com` → web 容器 `:80`
- `api.example.com` → api 容器 `:4000`

相应地把 `PUBLIC_API_URL=https://api.example.com`、`CORS_ORIGINS=https://app.example.com` 配好后 `--build` 重建前端。

Caddy 示例:

```
app.example.com {
  reverse_proxy localhost:8080
}
api.example.com {
  reverse_proxy localhost:4000
}
```

## 备份

数据全部在 `db-data` 卷。备份:

```bash
docker compose exec db pg_dump -U postgres aistudio > backup-$(date +%F).sql
```

恢复:

```bash
cat backup.sql | docker compose exec -T db psql -U postgres aistudio
```

## 环境变量清单

### API(`apps/api`)

| 变量 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `DATABASE_URL` | 是 | — | Postgres 连接串(compose 自动注入) |
| `JWT_SECRET` | 是 | — | JWT 签名密钥,缺失拒启动 |
| `FIELD_ENCRYPTION_KEY` | 是 | — | 64-hex(32 字节)字段加密密钥,缺失拒启动 |
| `JWT_ACCESS_TTL` | 否 | `15m` | 访问令牌有效期 |
| `JWT_REFRESH_TTL_DAYS` | 否 | `30` | 刷新令牌天数 |
| `PORT` | 否 | `4000` | API 监听端口 |
| `CORS_ORIGINS` | 否 | 空=全拒 | 逗号分隔的允许来源 |
| `ORCHESTRATION_RECONCILE_ENABLED` | 否 | `false` | 编排对账开关 |
| `MULTICA_API_URL` / `MULTICA_API_TOKEN` | 否 | 空 | 自托管 Multica 运行时 |

### 前端(构建期烘焙)

| 变量 | 默认 | 说明 |
|------|------|------|
| `VITE_DATA_BACKEND` | `http` | 数据后端模式(local/http/firebase) |
| `VITE_DATA_API_URL` | `http://localhost:4000` | 浏览器访问 API 的地址 |

## CI

`.github/workflows/ci.yml` 在 push/PR 到 `main` 时运行:

- **frontend**:`test:p0-specialized` + `test:saas-foundation` + `test:launch-readiness` + `lint` + `build`
- **backend**:起 Postgres service 容器 → `prisma generate` → `prisma migrate deploy` → Jest e2e

> 注:`test:browser-smoke` 依赖 `@playwright/cli` 与浏览器二进制(运行时按需拉取),未纳入 CI,保留为本地验证。

## 故障排查

- **api 反复重启**:多半是 `JWT_SECRET`/`FIELD_ENCRYPTION_KEY` 未设或 `FIELD_ENCRYPTION_KEY` 非 64-hex。看 `docker compose logs api`。
- **前端能开但请求失败/CORS 报错**:检查 `PUBLIC_API_URL`(是否浏览器可达)与 `CORS_ORIGINS`(是否包含前端来源);改 `PUBLIC_API_URL` 后必须 `--build` 重建 web。
- **迁移失败**:确认 db 已 healthy;手动 `docker compose exec api npx prisma migrate deploy` 看详细错误。
