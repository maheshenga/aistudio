# P1-R03 外部 Provider 认证说明

Updated: 2026-06-26

## 工程结论（不阻塞 Paid-Beta Staging Cohort）

| 层级 | 状态 |
|------|------|
| 契约测试 `npm run test:provider-callback` | pass（本地 fixtures） |
| Staging API `npm run test:staging-callback-smoke` | 需在 API `:4000` 运行时 pass（2026-06-24 已记录） |
| **真实** Multica / 外部 render 集群 live 回调 | **延后**至生产 SLA 承诺前 |

## 对用户/运营的表述

- Staging cohort 使用 **mock-render** 路径验证：job → hold/capture → asset → audit。
- **不对**外承诺视频/混剪/导演台的第三方渲染 SLA，直至 P1-R03 live 行全部 **pass**（见 [paid-beta-scope.md](./paid-beta-scope.md) §P1-R03 Manual）。

## 生产前必做

1. 配置 `MULTICA_API_URL` / 真实回调 URL  
2. 完成 paid-beta-scope §B–D **Manual (UI)** 行  
3. 更新 [saas-commercial-mvp-p0-release-evidence.md](./saas-commercial-mvp-p0-release-evidence.md) 中 P1-R03 状态