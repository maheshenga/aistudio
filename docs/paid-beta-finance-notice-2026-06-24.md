# P1-R02 Finance Pricing Review Notice (ready to send)

**Send date:** 2026-06-24  
**Context:** Paid-beta staging authorized (P0 go, `v0.1.0-paid-beta-staging`)  
**Full matrix:** [p1-r02-pricing-review.md](./p1-r02-pricing-review.md)

---

## 邮件 / Slack / 飞书（复制下方正文）

**标题：** 【需确认】AI Studio Paid-Beta 算力单价表 P1-R02

---

产品 / 财务同事好，

Paid-Beta Staging 已对内开放（`v0.1.0-paid-beta-staging`）。在**正式对外售卖 / 开票**前，需要你们确认当前 **算力 credit 单价矩阵**。

### 工程现状（已完成）

- 前端 Billing 展示与 API **hold/capture/refund** 已使用**同一套**单价
- 自动化校验：`npm run test:pricing-matrix-sync`（防 API/UI 漂移）
- Staging 已按模块扣费（例：图像生成 hold **8** 点，视频 **24** 点）

### 请你们确认（P1-R02）

1. 下表 **generation / automation** 单价是否可作为 Paid-Beta 对外售价？  
2. **Export** 动作是否计入计费？（当前矩阵含 export，1–2 点/次）  
3. 各套餐 **月度赠送额度** 与超额单价（见 BillingView / `billingRepository`）  
4. 确认后在文档底部 sign-off 表签字，或回复本邮件标注修改项

### 核心 generation 单价（engineering estimated）

| 模块 | 动作 | Credits |
|------|------|---------|
| 电商主图 `e_main_image` | generation | 4 |
| 电商视频 `e_video` | generation | 24 |
| AI 图像编辑 `ai_image_edit` | generation | 6 |
| 商用图像 `image` | generation | 8 |
| 视频引擎 `video` | generation | 24 |
| 文案 `copywriting_create` | generation | 3 |
| Chat `chat` | generation | 2 |
| Speech `speech` | generation | 2 |
| 智能混剪 `remix_smart` | generation | 20 |
| 爆款复刻 `remix_viral` | generation | 18 |
| 爆店码 `marketing_viral` | generation | 12 |
| 智能官网 `marketing_website` | generation | 16 |
| 导演台 `director_desk` | generation | 6 |
| Agent 调度 `tasks` | runtime_dispatch | 5 |

> 完整矩阵（含 export / automation）：仓库 `docs/p1-r02-pricing-review.md`

### 签字模板（确认后回复或更新文档）

```
Decision: approve / revise
Approver: ___________
Role: Finance / Product
Date: ___________
Notes: (如有调价请列 moduleId + 新 credits)
```

### 工程后续（你们确认后）

- 若调价：同步更新前端 + API 两处矩阵并重跑 smoke  
- 关闭 P1-R02，解除「正式 card 计费」最后一道门禁

谢谢。

— AI Studio / Maheshenga

---

## 附件 / 链接

- 定价评审文档：`docs/p1-r02-pricing-review.md`  
- Paid-beta 范围：`docs/paid-beta-scope.md`  
- GitHub tag：https://github.com/maheshenga/aistudio/releases/tag/v0.1.0-paid-beta-staging
