# MVP Phase 0 运维 Runbook

Updated: 2026-06-26  
对应计划：0.3、0.4、G1 staging smoke

## 0.3 部署演练

```powershell
cp .env.deploy.example .env.deploy
# 必填：JWT_SECRET, FIELD_ENCRYPTION_KEY, POSTGRES_PASSWORD
# 浏览器访问 Web 的 origin 写入 CORS_ORIGINS（例：http://localhost:8081）
docker compose --env-file .env.deploy up -d --build
docker compose --env-file .env.deploy ps
```

期望：`db` healthy，`api` :4000，`web` :8081（或 `WEB_PORT`）。

## 0.4 Staging 环境检查

| 检查项 | 命令/操作 |
|--------|-----------|
| API 健康 | 浏览器或 `curl http://localhost:4000/health`（若有路由） |
| Web 构建变量 | 镜像构建时 `VITE_DATA_BACKEND=http`、`VITE_DATA_API_URL` 指向浏览器可达 API |
| CORS | 注册/登录无 CORS 错误 |
| JWT | 注册 → 刷新页面仍登录 |

## G1 Smoke（API 运行后）

```powershell
npm run test:staging-verify
# 或分步：
npm run test:pricing-matrix-sync
npm run test:staging-api-smoke
npm run test:staging-callback-smoke
```

**优先级总表：** [mvp-priority-queue-2026-06-26.md](./mvp-priority-queue-2026-06-26.md)

## 0.5 GitHub Release

见 [RELEASE-v0.1.0-paid-beta-staging.md](./RELEASE-v0.1.0-paid-beta-staging.md)。

## 0.1 / 0.2 人工

- Cohort：[paid-beta-cohort-notice-2026-06-24.md](./paid-beta-cohort-notice-2026-06-24.md)
- Finance：[paid-beta-finance-notice-2026-06-24.md](./paid-beta-finance-notice-2026-06-24.md) + [p1-r02-pricing-review.md](./p1-r02-pricing-review.md)