# Paid-Beta Staging Announcement Templates

Updated: 2026-06-24  
Build: `main` @ `b4f65c9` (tag `v0.1.0-paid-beta-staging`)

**Ready-to-send notice:** [paid-beta-cohort-notice-2026-06-24.md](./paid-beta-cohort-notice-2026-06-24.md)

Use after P0 sign-off in [saas-commercial-mvp-p0-release-evidence.md](./saas-commercial-mvp-p0-release-evidence.md).  
Scope details: [paid-beta-scope.md](./paid-beta-scope.md)  
Pricing review: [p1-r02-pricing-review.md](./p1-r02-pricing-review.md)

---

## Internal cohort (engineering / early users)

**Subject:** AI Studio Paid-Beta Staging — `v0.1.0-paid-beta-staging`

团队好，

Paid-beta **staging** 环境已就绪，欢迎小范围试用。

**环境**
- Web: `http://<your-host>:8081`（本地示例）
- API: `http://<your-host>:4000`
- 必须使用 **HTTP 后端**（JWT 注册/登录，刷新后会话保持）

**范围内**
- P0 控制面：Dashboard、Tasks、Billing、Assets、Settings、Admin、审计等
- P1 创作：电商、图像/视频、文案、Chat、Speech、混剪、营销、导演台、设计工作流等
- 计费：按模块 hold/capture（如 image 8 credits、video 24 credits）

**范围外 / 预览**
- AI Canvas、关键词库、Avatar 分身套件（mock）

**已知限制**
- Web 独立模式使用 **mock provider**，非真实 Gemini/Multica 集群
- 单价为工程 **estimated** 矩阵，正式对外计费前需财务确认（P1-R02）

**部署与验证**
- 见 [deployment.md](./deployment.md)
- Smoke: `npm run test:staging-api-smoke`

问题反馈：\[填写渠道\]

---

## Finance / product (P1-R02 pricing review)

**Subject:** P1-R02 — Commercial credit unit price review (Paid-Beta)

请产品/财务确认付费 Beta 使用的算力单价表。

**文档：** [p1-r02-pricing-review.md](./p1-r02-pricing-review.md)

**要点**
- 前端用量展示与 API hold/capture 已对齐同一矩阵（`test:pricing-matrix-sync`）
- 需确认各模块 `unitCredits` 是否为对外售价
- 确认后请在文档底部 sign-off 表填写决策与日期

**示例单价（generation）**

| Module | Credits |
|--------|---------|
| `image` | 8 |
| `video` | 24 |
| `remix_smart` | 20 |
| `director_desk` | 6 |
| `chat` | 2 |

完整表见 pricing review 文档。

---

## P0 sign-off reminder (product owner)

请在 [saas-commercial-mvp-p0-release-evidence.md](./saas-commercial-mvp-p0-release-evidence.md) 填写：

- Decision: `go`
- Approver name / date
- Paid-beta authorized: yes (staging cohort)
- Self-hosted authorized: yes

工程侧已验证：P0 自动化门禁、staging Docker、credit 生命周期、P1-R03 mock-render API。

---

## Release tag

```powershell
git tag -a v0.1.0-paid-beta-staging -m "Paid-beta staging: P0 control plane + P1 revenue on HTTP stack."
git push origin v0.1.0-paid-beta-staging
```
