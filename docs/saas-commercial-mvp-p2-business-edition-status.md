# P2 Business Edition 进度状态报告

## Context

P0（SaaS 控制面）和 P1（收入工作流）已全部完成并本地验证通过。P2 Business Edition 包含 11 个 issue（B01–B11），目标是将前端静态 UI 升级为 repository-backed 完整业务闭环。本报告基于对每个 P2 issue 的源码审计，评估当前实现状态和剩余工作。

日期：2026-06-19

---

## 总览

| 指标 | 数值 |
|------|------|
| P2 Issue 总数 | 11 |
| 实现完成（≥80%） | 2（B05、B06） |
| 部分实现（40–79%） | 6（B01、B03、B04、B07、B09、B11） |
| 薄壳/桩实现（<40%） | 3（B02、B08、B10） |
| 总体平均完成度 | **~56%** |

---

## Issue 详情

### P2-B01: Avatar 授权记录与素材持久化

| 项目 | 状态 |
|------|------|
| 完成度 | **70%** |
| Repository | `src/lib/data/avatarRepository.ts` ✅ (77 行) |
| Component | `src/components/AvatarView.tsx` ✅ (582 行) |
| 关键依赖 | `src/lib/data/assetRepository.ts`, `src/lib/data/auditLogRepository.ts` |

**已完成：**
- Repository 完整：`WorkspaceAvatarConsent` 含 4 种同意类型（voice_clone/face_clone/commercial_use/minor_protection）、3 种状态（granted/revoked/expired）、创建/撤销/校验函数
- `WorkspaceAvatarSource` 含来源材料管理（image/video/audio），与 consent 关联
- AvatarVoice 子组件实现了 consent-aware 工作流（登记授权 → 创建 consent → 创建 source → 审计日志）

**剩余工作：**
- Consent 检查仅在声音克隆（AvatarVoice）中实现
- AvatarCreate（视频生成）和 AvatarSpace（形象管理）未接入 consent 校验
- `hasValidAvatarConsent` 工具函数已定义但未在 UI 中调用

---

### P2-B02: Avatar 语音/产出资产、用量与审计生命周期

| 项目 | 状态 |
|------|------|
| 完成度 | **15%** |
| Repository | `src/lib/data/generationJobRepository.ts` ✅ (334 行) |
| Component | `src/components/AvatarView.tsx` ❌ 未接入 |

**已完成：**
- generationJobRepository 本身功能完善（创建/更新/失败/重试、状态机、API write-through）
- AvatarView UI 展示了视频额度、作品列表等

**剩余工作：**
- AvatarView **未导入** `generationJobRepository`，视频/直播生成按钮纯 UI 展示，无实际 Job 创建
- 输出资产未保存到 `assetRepository`
- 使用量未记录（额度 "45/100 分钟" 为硬编码）
- 最近作品区域为静态 mock 数据

---

### P2-B03: Design 工作流 Brief 持久化、资产保存与项目链接

| 项目 | 状态 |
|------|------|
| 完成度 | **65%** |
| Repository | `src/lib/data/designRepository.ts` ✅ (57 行) |
| Component | `src/components/DesignWorkflowView.tsx` ✅ (563 行) |

**已完成：**
- Repository 完整：`WorkspaceDesignBrief` 含 5 种模块类型、4 种状态、CRUD 全套 + projectId 字段
- DesignWorkflowView 导入并使用 repository：保存 Brief（handleSaveBrief）、启动算力（handleLaunchCompute）、审计日志
- 事件监听自动刷新、按模块类型过滤

**剩余工作：**
- 生成的设计资产未保存到 `assetRepository`
- Brief 的 `projectId` 字段存在但 UI 中未暴露项目关联功能
- 无 Brief 编辑/更新 UI（仅创建和计数）
- 无 Brief 列表展示或状态管理界面

---

### P2-B04: CRM 客户画像与洞察跟进任务

| 项目 | 状态 |
|------|------|
| 完成度 | **70%** |
| Repository | `src/lib/data/customerRepository.ts` ✅ (337 行) |
| Component | `src/components/CrmView.tsx` ✅ (1079 行) + `src/components/CustomerInsights.tsx` ✅ (165 行) |

**已完成：**
- Customer Repository 非常完善：全套 CRUD、生命周期阶段、来源追踪、API write-through、lead 管理（createOrUpdateWorkspaceCustomerLead）、数据规范化
- CrmView 已接入 repository：`loadWorkspaceCustomers` + `mapWorkspaceCustomerToCrmCustomer` 映射、创建 follow-up 任务
- CustomerInsights 展示 AI 推荐、竞品情报、财务数据、满意度管理，含审计日志

**剩余工作：**
- CustomerInsights 中的数据为硬编码（AI_RECOMMENDATIONS、COMPETITOR_NEWS、FINANCIAL_DATA 均为静态）
- Insights 未创建后续跟进任务（仅发送问卷审计日志）
- CRM 仍有大量 demo 数据（CRM_DEMO_CUSTOMERS）与 repository 数据混合展示

---

### P2-B05: 客服响应生命周期与升级审计

| 项目 | 状态 |
|------|------|
| 完成度 | **80%** |
| Repository | `src/lib/data/customerServiceRepository.ts` ✅ (56 行) |
| Component | `src/components/CustomerServiceView.tsx` ✅ (1109 行) |

**已完成：**
- Repository 含完整 Response 生命周期状态：`suggested → accepted → edited → rejected → escalated → sent`
- `updateCustomerServiceResponseStatus` 支持状态转换 + patch
- CustomerServiceView 实现了：
  - **Accept**: 创建 response 记录
  - **Edit**: 含 editedDraft + editorId + editedAt
  - **Escalate**: 创建 escalation task（`createWorkspaceTask` type='cs_escalation'）+ 关联 escalationTaskId
  - **Reject**: 通过状态更新
- 已升级响应过滤和展示
- 审计日志记录完整

**剩余工作：**
- "Sent" 最终状态转换在 UI 中未明确体现
- 响应历史/统计面板不够完善

---

### P2-B06: 财税 Repository 校验与合规

| 项目 | 状态 |
|------|------|
| 完成度 | **85%** |
| Repository | `src/lib/data/financialRepository.ts` ✅ (394 行) + `src/lib/data/taxEventRepository.ts` ✅ (289 行) |
| Component | 5 个组件全部 ✅ (FinanceView/TaxView/FiscalCalendarView/TaxSimulator/TaxReconciliationTool) |

**已完成：**
- Financial Repository 极为完善：记录 CRUD、日收入序列（buildDailyRevenueSeries）、发票构建（buildWorkspaceInvoices）、财务汇总（summarizeWorkspaceFinancials）、API write-through
- Tax Event Repository：完整 CRUD + 种子数据、deadline 计算、类型/状态规范化
- FinanceView：repository-backed 交易/发票/风险发现、任务创建
- TaxView：种子事件 + 审计日志、集成所有税务子组件
- FiscalCalendarView：repository 事件 → 任务中心同步
- TaxSimulator：模拟运行 + 审计日志
- TaxReconciliationTool：financial records 自动对账、税码推断

**剩余工作：**
- 文件名与需求不完全匹配（`financialRepository` vs `financeRepository`，`taxEventRepository` vs `taxRepository`）
- 无独立的 `taxRepository.ts`（税务计算/申报记录）

---

### P2-B07: 团队成员、子账号、角色与共享任务

| 项目 | 状态 |
|------|------|
| 完成度 | **70%** |
| Repository | `src/lib/data/teamRepository.ts` ✅ (178 行) |
| Component | `src/components/TeamView.tsx` ✅ (570 行) + `src/components/SubAccountsView.tsx` ✅ (274 行) |

**已完成：**
- Team Repository 完整：团队成员 CRUD + 角色/权限/状态 + 子账号 CRUD（含平台/凭证/状态）
- TeamView：`hasWorkspacePermission` 权限检查（role-based）、成员创建/角色更新
- SubAccountsView：子账号全套生命周期（创建/激活/冻结/删除）、审计日志、配置弹窗

**剩余工作：**
- 无共享任务与团队成员的关联机制
- 权限检查仅在 TeamView 中出现一次，未在跨模块操作中广泛执行
- 子账号无 API write-through（纯 localStorage）

---

### P2-B08: 共享 Agent 库与资产/权限联动

| 项目 | 状态 |
|------|------|
| 完成度 | **20%** |
| Repository | `src/lib/data/agentLibraryRepository.ts` ✅ (54 行) |
| Component | **无组件接入** ❌ |

**已完成：**
- Repository 定义了 `WorkspaceAgentLibraryEntry`（含 roleVisibility、tags、assetId/agentId 关联、active/archived 状态）、完整 CRUD

**剩余工作：**
- 全项目无任何组件导入 `agentLibraryRepository`（0 次 import）
- TeamView 未展示共享 Agent 资产
- 无权限过滤逻辑（roleVisibility 字段存在但未使用）
- 无与 agentLibrary 关联的 UI 页面或面板

---

### P2-B09: 门店数据基础（门店/订单/库存/员工）

| 项目 | 状态 |
|------|------|
| 完成度 | **65%** |
| Repository | `src/lib/data/storeRepository.ts` ✅ (155 行，含 orders/inventory/staff) |
| Component | `src/components/StoreView.tsx` ✅ (968 行) |

**已完成：**
- storeRepository 统一包含 Stores/Orders/Inventory/Staff 全套 CRUD + 库存调整函数
- StoreView 全面接入：门店创建/更新/删除、订单加载、库存调整、员工管理、Dashboard 展示
- 事件监听自动刷新

**剩余工作：**
- 4 个实体合并为 1 个文件（非独立 repository），架构上不够模块化
- 无 API write-through（纯 localStorage，与其他成熟 repository 不一致）
- Dashboard 部分数据仍为硬编码（统计卡片如"今日销售额 ¥12,450"）
- 无独立的 `orderRepository`/`inventoryRepository`/`storeStaffRepository`

---

### P2-B10: 门店营销与活动资产/审计联动

| 项目 | 状态 |
|------|------|
| 完成度 | **25%** |
| Repository | `src/lib/data/campaignRepository.ts` ✅ (281 行) |
| Component | StoreView ❌ 未接入 campaign |

**已完成：**
- campaignRepository 非常完善：全套 CRUD、渠道类型（含 store_event）、metrics、linkedAssetIds、API write-through
- StoreView 有"营销活动"导航按钮（`store_marketing`）

**剩余工作：**
- StoreView 未导入 campaignRepository
- 门店上下文中无 campaign 创建/管理 UI
- 无资产保存到 assetRepository
- 无事件审计日志（store 相关营销活动）
- Campaign repository 与 Store 完全脱耦

---

### P2-B11: 门店库存调整记录与任务跟进

| 项目 | 状态 |
|------|------|
| 完成度 | **50%** |
| Repository | `src/lib/data/storeRepository.ts`（含 inventory/adjustment） ✅ |
| Component | StoreView 部分 ✅ |

**已完成：**
- `WorkspaceInventoryAdjustment` 结构完整（beforeCount/afterCount/reason/actorId/timestamp）
- `adjustWorkspaceStoreInventory` 函数：调整库存 + 记录调整历史
- StoreView 导入了 `adjustWorkspaceStoreInventory`，在库存管理区域调用

**剩余工作：**
- 无独立的调整历史查看 UI（调整记录虽存储在 `adjustments[]` 数组中，但无专用展示面板）
- 调整后无自动创建跟进任务机制
- 无 taskRepository 导入（StoreView 中无任务功能）

---

## 关键发现

1. **最完善模块**：B06（财税 85%）和 B05（客服 80%）实现了 repository-backed + 审计日志 + 任务联动的完整闭环
2. **最薄弱模块**：B02（Avatar 产出 15%）和 B08（Agent 库 20%）— repository 存在但 UI 完全未接入
3. **共性问题**：
   - 多个模块 Dashboard 统计数据仍为硬编码 mock 数据
   - 部分模块缺少 assetRepository 保存和 taskRepository 联动
   - 门店模块（B09/B10/B11）无 API write-through，与后端未打通

---

## 建议执行顺序

| 优先级 | Issue | 当前 → 目标 | 关键动作 |
|--------|-------|-------------|----------|
| 1 | B05 客服 | 80% → 100% | 补齐 sent 状态转换 + 响应统计面板 |
| 2 | B06 财税 | 85% → 100% | 文件命名规范化 |
| 3 | B01 Avatar 授权 | 70% → 100% | AvatarCreate/AvatarSpace 接入 consent 校验 |
| 4 | B04 CRM | 70% → 100% | Insights 数据源从硬编码切到 repository + 跟进任务创建 |
| 5 | B07 团队 | 70% → 100% | 共享任务关联 + 跨模块权限执行 |
| 6 | B03 设计 | 65% → 100% | 资产保存 + Brief 编辑/列表 UI |
| 7 | B09 门店基础 | 65% → 100% | Dashboard 数据去硬编码 + API write-through |
| 8 | B11 库存调整 | 50% → 100% | 调整历史 UI + 自动任务创建 |
| 9 | B10 门店营销 | 25% → 100% | StoreView 接入 campaignRepository + 资产/审计联动 |
| 10 | B08 Agent 库 | 20% → 100% | TeamView 接入 agentLibraryRepository + 权限过滤 |
| 11 | B02 Avatar 产出 | 15% → 100% | AvatarView 接入 generationJobRepository + 资产/用量记录 |

---

## 验证方式

全部 P2 issue 完成后需运行：

```powershell
npx tsx scripts/launch-readiness.test.ts
npx tsx scripts/saas-foundation.test.ts
npx tsc --noEmit
```

单独 issue 验证可运行各模块对应的 `scripts/*.test.ts` 脚本。
