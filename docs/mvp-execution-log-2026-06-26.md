# MVP 执行记录

Date: 2026-06-26

## 已完成

| 项 | 结果 |
|----|------|
| 新增 [mvp-completion-plan-2026.md](./mvp-completion-plan-2026.md) | 含 Phase 0–3 勾选清单 |
| `npm run test:pricing-matrix-sync` | **pass**（22 API / 35 UI entries） |
| Gate G1 定价同步 | 已在计划中勾选 |
| P1-R06 / 关键词库 | registry `copywriting_keywords` → **implemented**（62/67） |
| Preview 横幅 | [ModulePreviewBanner.tsx](../src/components/ModulePreviewBanner.tsx) + App 主/分屏 |
| `lint` + `test:product-registry` + `test:keyword-repo` | **pass** |

## 阻塞 / 待环境

| 项 | 结果 | 下一步 |
|----|------|--------|
| `npm run test:staging-api-smoke` | **fail** — `ECONNREFUSED` @ `http://localhost:4000` | 启动 API 栈后重跑 |

### 启动 staging 栈（本机）

```powershell
cp .env.deploy.example .env.deploy
# 填写 JWT_SECRET、FIELD_ENCRYPTION_KEY、POSTGRES_PASSWORD
docker compose --env-file .env.deploy up -d --build
npm run test:staging-api-smoke
npm run test:staging-callback-smoke
```

可选：`STAGING_API_URL=http://127.0.0.1:4000 npm run test:staging-api-smoke`（若脚本支持环境变量）

## 仍需人工（Phase 0）

1. 发送 cohort 通知  
2. 财务 P1-R02 评审签字  
3. GitHub Release 页面  
4. 6 个 mock 模块策略会  

## 建议下一批工程

- P1-R06 关键词库（若产品选 Implement）  
- `ModulePreviewBanner`（mock 模块预览提示）  
- evidence 文档追加本执行记录链接  