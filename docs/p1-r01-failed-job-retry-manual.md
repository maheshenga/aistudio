# P1-R01 失败任务重试 — 人工验收

Updated: 2026-06-26  
自动化：`GenerationFailureRecoveryPanel` + `retryGenerationJob` + `generation_job_retry`（`test:launch-readiness`）

## 环境

- Staging：`docker compose --env-file .env.deploy up -d --build`
- Web：`http://localhost:8081`，`VITE_DATA_BACKEND=http`

## 步骤（约 10 分钟）

1. [ ] 打开 **智能混剪** 或 **视频创作**，触发一次生成；若 UI 无真实失败，在 **Agent 调度 / 失败恢复面板** 查看是否列出 `failed` job。
2. [ ] 对 **failed** 任务点击 **重试**；确认 job 进入 `running` 或新 attempt，非重复扣费（Billing 余额合理）。
3. [ ] **全站操作审计** 搜索 `generation_job_retry` 或 `generation_job_failed`。
4. [ ] 刷新页面，job 状态与资产仍一致。

## 通过标准

- 失败 job 可见、可重试、有审计记录；无静默丢失。

Sign-off: __________ / 日期 __________