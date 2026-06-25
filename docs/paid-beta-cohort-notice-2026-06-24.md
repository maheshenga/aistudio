# Paid-Beta Staging Cohort Notice (ready to send)

**Send date:** 2026-06-24  
**Release:** `v0.1.0-paid-beta-staging` (`main` @ `fa498bc`)  
**P0 sign-off:** go — Maheshenga, 2026-06-24

---

## 邮件 / Slack / 飞书（复制下方正文）

**标题：** AI Studio Paid-Beta Staging 内测邀请 — v0.1.0-paid-beta-staging

---

各位好，

AI Studio **Paid-Beta Staging** 现已开放小范围内测（P0 已签字通过）。

### 访问地址

| 服务 | 地址（当前 staging） |
|------|----------------------|
| Web 工作台 | http://localhost:8080 或 8081（见 `WEB_PORT`） |
| API | http://localhost:4000 |

> 若部署在 VPS，请将 `localhost` 替换为实际域名/IP，并确保 `CORS_ORIGINS` 包含 Web 来源。

### 首次使用

1. 打开 Web 地址 → **注册** 工作区账号（邮箱 + 密码）
2. 登录后刷新页面，确认会话保持
3. 建议先走一遍：**商用级图像生成** → **数字资产保险库** → **算力与 Token 监控**

### 本次内测可用功能

- **控制面：** 指挥概览、任务、资产、项目、Billing、Settings、Admin、审计日志等
- **创作 / 营收：** 电商主图/视频、图像/视频引擎、文案、**关键词库**、Chat、Speech、混剪、营销（爆店码/碰一碰/官网）、导演台、设计工作流等
- **计费：** 真实 API hold/capture（例：图像生成 8 点、视频 24 点）

### 请勿依赖 / 仅预览

- 无限模态 AI 画布（`ai_canvas`）
- Avatar 分身套件（4 个模块，mock；界面会显示预览横幅）

### 已知限制（请知悉）

- Web 独立模式当前为 **mock provider**，非真实 Gemini / Multica 生产集群
- 算力单价为工程 **estimated** 矩阵，正式对外售卖前财务仍会复核（不影响内测体验）
- 视频/混剪/导演台的 **真实外部 render 回调** 尚未认证；mock-render API 路径已测通

### 问题反馈

- GitHub Issues: https://github.com/maheshenga/aistudio/issues
- 或回复本 thread / 联系 @Maheshenga

### 参考文档（仓库内）

- 范围说明：`docs/paid-beta-scope.md`
- 部署指南：`docs/deployment.md`

感谢参与内测。

— AI Studio / Maheshenga

---

## 运维备忘（仅管理员）

```powershell
.\scripts\staging-verify.ps1
```

当前验证端口：`WEB_PORT=8081`，`API_PORT=4000`。
