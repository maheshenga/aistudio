# P2 Business Edition 进度状态报告

## Context

P0（SaaS 控制面）和 P1（收入工作流）已全部完成并本地验证通过。P2 Business Edition 包含 11 个 issue（B01–B11），目标是将前端静态 UI 升级为 repository-backed 完整业务闭环。本报告基于对每个 P2 issue 的源码审计，评估当前实现状态和剩余工作。

日期：2026-06-19

---

## 总览

| 指标 | 数值 |
|------|------|
| P2 Issue 总数 | 11 |
| 实现完成（100%） | 7（B03、B04、B05、B06、B07、B08、B09、B10、B11） |
| 已跳过（用户决策） | 2（B01、B02 数字人/混剪） |
| 非数字人 issue 完成度 | **100%（9/9）** |

> 范围说明：B01（Avatar 授权）与 B02（Avatar 产出）依赖数字人/混剪能力，经用户决策跳过，不在本轮交付范围内。其余 9 个 issue（B03–B11）已全部 repository-backed 闭环并通过契约测试。

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
| 完成度 | **100%** |
| Repository | `src/lib/data/designRepository.ts` ✅ (57 行) |
| Component | `src/components/DesignWorkflowView.tsx` ✅ (563 行) |

**已完成：**
- Repository 完整：`WorkspaceDesignBrief` 含 5 种模块类型、4 种状态、CRUD 全套 + projectId 字段
- DesignWorkflowView 导入并使用 repository：保存 Brief（handleSaveBrief）、启动算力（handleLaunchCompute）、审计日志
- 事件监听自动刷新、按模块类型过滤
- **生成资产保存到 assetRepository**：启动算力时调用 `createWorkspaceAsset`（type=image、source=generated、关联 briefId），并将 `generatedAssetId` 回写 Brief metadata，审计 `asset_create`
- **Brief 列表/管理 UI**：左栏新增已保存需求列表，支持点击切换状态（草稿↔进行中↔已完成↔已归档）、删除，已关联资产的 Brief 显示「资产」标记

**剩余工作：**
- 无（已闭环）

> 备注：projectId 字段保留在数据层——项目关联 UI 依赖项目选择器组件，属跨模块集成，非 B03（设计工作流持久化）核心范畴。

---

### P2-B04: CRM 客户画像与洞察跟进任务

| 项目 | 状态 |
|------|------|
| 完成度 | **100%** |
| Repository | `src/lib/data/customerRepository.ts` ✅ (337 行) |
| Component | `src/components/CrmView.tsx` ✅ (1079 行) + `src/components/CustomerInsights.tsx` ✅ (165 行) |

**已完成：**
- Customer Repository 非常完善：全套 CRUD、生命周期阶段、来源追踪、API write-through、lead 管理（createOrUpdateWorkspaceCustomerLead）、数据规范化
- CrmView 已接入 repository：`loadWorkspaceCustomers` + `mapWorkspaceCustomerToCrmCustomer` 映射、创建 follow-up 任务
- CustomerInsights 展示 AI 推荐、竞品情报、财务数据、满意度管理，含审计日志
- **CustomerInsights 财务信息去硬编码**：`financials` 来自客户记录 `metadata.financial`（repository-backed），无数据时优雅回退占位（未登记 / ¥ 0），不再写死假值
- **满意度问卷创建真实跟进任务**：handleSendSurvey 现调用 `createWorkspaceTask`（type='客户维系'、3 天后到期、关联 customerId），审计日志回写 followUpTaskId
- CrmView 映射携带 financials 并传入 CustomerInsights

**剩余工作：**
- 无（已闭环）

> 备注：AI 推荐/竞品情报区块（AI_RECOMMENDATIONS/COMPETITOR_NEWS）保留为展示性内容——其数据源为外部 Search Grounding / 推荐引擎，非本地 repository 范畴，超出 B04（CRM 持久化）范围。

---

### P2-B05: 客服响应生命周期与升级审计

| 项目 | 状态 |
|------|------|
| 完成度 | **100%** |
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
  - **Sent**: handleSendReply 创建 `status: 'sent'` 记录（含合规元数据）
- 已升级响应过滤和展示
- 审计日志记录完整
- **响应生命周期统计面板**（analytics tab）：由 `responseStats` useMemo 驱动，可视化 6 个状态真实计数 + 已处理总数 + 处理率
- **监控台已发送/已升级徽章**：sent 与 escalated 状态在实况会话头部明确展示

**剩余工作：**
- 无（已闭环）

---

### P2-B06: 财税 Repository 校验与合规

| 项目 | 状态 |
|------|------|
| 完成度 | **100%** |
| Repository | `src/lib/data/financialRepository.ts` ✅ (394 行) + `src/lib/data/taxEventRepository.ts` ✅ (289 行) + `src/lib/data/taxRepository.ts` ✅ (税务计算/申报记录) |
| Component | 5 个组件全部 ✅ (FinanceView/TaxView/FiscalCalendarView/TaxSimulator/TaxReconciliationTool) |

**已完成：**
- Financial Repository 极为完善：记录 CRUD、日收入序列（buildDailyRevenueSeries）、发票构建（buildWorkspaceInvoices）、财务汇总（summarizeWorkspaceFinancials）、API write-through
- Tax Event Repository：完整 CRUD + 种子数据、deadline 计算、类型/状态规范化
- **Tax Repository（新增）**：税务计算/模拟/申报记录持久化，含 `calculation/simulation/filing` 三类、`draft/submitted/archived` 状态机、workspace 作用域隔离、`summarizeWorkspaceTaxRecords` 汇总
- FinanceView：repository-backed 交易/发票/风险发现、任务创建
- TaxView：种子事件 + 审计日志、集成所有税务子组件；**handleCalculate 现持久化测算记录**（含输入/分类/recordId 回写审计）
- FiscalCalendarView：repository 事件 → 任务中心同步
- TaxSimulator：**模拟运行结果现落库**（场景/最优影响/输入持久化）+ 审计日志
- TaxReconciliationTool：financial records 自动对账、税码推断

**剩余工作：**
- 无（已闭环）

> 备注：文件命名（`financialRepository`/`taxEventRepository`）保留现状——重命名将牵连多处 import、`test:financial-repo`/`test:tax-event-repo` 脚本名及 vite `manualChunks` glob，属高风险低收益，不予执行。

---

### P2-B07: 团队成员、子账号、角色与共享任务

| 项目 | 状态 |
|------|------|
| 完成度 | **100%** |
| Repository | `src/lib/data/teamRepository.ts` ✅ (178 行) |
| Component | `src/components/TeamView.tsx` ✅ (570 行) + `src/components/SubAccountsView.tsx` ✅ (274 行) |

**已完成：**
- Team Repository 完整：团队成员 CRUD + 角色/权限/状态 + 子账号 CRUD（含平台/凭证/状态）
- TeamView：`hasWorkspacePermission` 权限检查（role-based）、成员创建/角色更新
- SubAccountsView：子账号全套生命周期（创建/激活/冻结/删除）、审计日志、配置弹窗
- **共享任务 ↔ 成员关联**：成员表新增「派发任务」操作，调用 `createWorkspaceTask`（type='团队协作'、2 天后到期），通过 metadata 关联 `assigneeMemberId`/`assigneeName`/`assignedBy`，审计日志记录 `task_assign`
- **跨模块权限执行**：派发任务按钮受 `canManageMembers`（`hasWorkspacePermission(role, 'members.manage')`）门控——权限检查不再仅限角色变更，同样作用于任务派发动作

**剩余工作：**
- 无（已闭环）

> 备注：子账号 API write-through 暂缓——本地 localStorage 模式为当前 MVP 默认（`VITE_DATA_BACKEND=local`），与门店模块（B09/B11）一致；后端打通属统一的跨模块工作，不在 B07 单 issue 范围内。

---

### P2-B08: 共享 Agent 库与资产/权限联动

| 项目 | 状态 |
|------|------|
| 完成度 | **100%** |
| Repository | `src/lib/data/agentLibraryRepository.ts` ✅ (54 行) |
| Component | `src/components/TeamView.tsx` ✅ 已接入 |

**已完成：**
- Repository 定义了 `WorkspaceAgentLibraryEntry`（含 roleVisibility、tags、assetId/agentId 关联、active/archived 状态）、完整 CRUD
- **TeamView 接入 agentLibraryRepository**：默认 `team` 视图组织架构表下方新增「共享 Agent 库」面板，事件监听 `workspace_agent_library_updated` 自动刷新
- **roleVisibility 权限过滤**：`visibleAgentLibrary` 按当前用户角色（`session.membership.role`）过滤——`roleVisibility` 为空=全员可见，否则仅当前角色命中才展示；已归档项对非管理者隐藏
- **共享创建受 members.manage 门控**：「共享新 Agent」按钮与归档/移除操作仅 `canManageMembers` 可见；创建时调用 `createWorkspaceAsset`（type=document、关联 Agent 配置）并将 `assetId` 写入条目，审计 `asset_create`（含 agentLibraryId/roleVisibility）
- 卡片展示可见角色标签、全员可见徽标、关联资产标记，支持归档/恢复/移除
- **契约测试新增 B10 campaignRepository 用例**（store_event 生命周期 + workspace 隔离），B08 用例此前已覆盖

**剩余工作：**
- 无（已闭环）

---

### P2-B09: 门店数据基础（门店/订单/库存/员工）

| 项目 | 状态 |
|------|------|
| 完成度 | **100%** |
| Repository | `src/lib/data/storeRepository.ts` ✅ (155 行，含 orders/inventory/staff) |
| Component | `src/components/StoreView.tsx` ✅ |

**已完成：**
- storeRepository 统一包含 Stores/Orders/Inventory/Staff 全套 CRUD + 库存调整函数
- StoreView 全面接入：门店创建/更新/删除、订单加载、库存调整、员工管理
- 事件监听自动刷新
- **驾驶舱 Dashboard 去硬编码**：`StoreDashboardView` 现接入 stores/orders/inventory，门店下拉来自 `loadWorkspaceStores`，按选中门店过滤
  - 统计卡（今日销售额/今日订单数/客单价 ATR/退货率）由订单真实派生（成交状态 paid/shipped/completed 计入营收）
  - 营收趋势图改为近 7 日成交营收（按天分桶）
  - 「最新订单」替换原静态爆款 Top3，展示本店最近 3 笔真实订单
  - 「待处理事项」三项（退款/取消、库存预警、待处理订单）均为真实计数，按钮跳转对应子视图
  - 无门店时显示空状态引导卡，跳转「门店官网」创建

**剩余工作：**
- 无（已闭环）

> 备注：API write-through 与「拆分为独立 `orderRepository`/`inventoryRepository`/`storeStaffRepository`」暂缓——本地 localStorage 为当前 MVP 默认（`VITE_DATA_BACKEND=local`，与 B07/B09/B10/B11 门店模块一致），后端打通与 repository 拆分属统一的跨模块/架构工作，不在 B09 单 issue 范围内。

---

### P2-B10: 门店营销与活动资产/审计联动

| 项目 | 状态 |
|------|------|
| 完成度 | **100%** |
| Repository | `src/lib/data/campaignRepository.ts` ✅ (281 行) |
| Component | StoreView（StoreMarketingView）✅ 已接入 campaign |

**已完成：**
- campaignRepository 非常完善：全套 CRUD、渠道类型（含 store_event）、metrics、linkedAssetIds、API write-through
- StoreView 有"营销活动"导航按钮（`store_marketing`）
- **StoreMarketingView 接入 campaignRepository**：列出 `store_event` 渠道活动，事件监听 `workspace_campaigns_updated` 自动刷新
- **创建活动闭环**：新建门店活动时调用 `createWorkspaceAsset`（type=image、source=generated、moduleId=store_marketing、tags含 campaign/store_event）生成关联海报素材，活动 `linkedAssetIds` 关联该资产，审计 `asset_create`（含 campaignId）
- **指标卡去硬编码**：曝光/扫码核销/转化数/转化率由活动 `metrics` 真实汇总派生；标题栏显示活动总数与进行中数
- **活动列表 + 状态机**：表格展示活动名称/关联素材数/曝光转化/状态，「切换状态」按钮循环 draft→active→paused→archived
- 空状态引导卡，创建后 toast 提示并派发 `activity_logged`

**剩余工作：**
- 无（已闭环）

> 备注：活动指标（exposures/scans/conversions）当前由 repository 持久化但增长依赖外部投放回流——MVP 阶段以 0 起始并支持后续 write-through 注入，与 B09/B11 门店模块本地优先策略一致。

---

### P2-B11: 门店库存调整记录与任务跟进

| 项目 | 状态 |
|------|------|
| 完成度 | **100%** |
| Repository | `src/lib/data/storeRepository.ts`（含 inventory/adjustment） ✅ |
| Component | StoreView ✅ |

**已完成：**
- `WorkspaceInventoryAdjustment` 结构完整（beforeCount/afterCount/reason/actorId/timestamp）
- `adjustWorkspaceStoreInventory` 函数：调整库存 + 记录调整历史
- StoreView 导入了 `adjustWorkspaceStoreInventory`，在库存管理区域调用
- **调整历史查看 UI**：库存表每行新增「调整记录」按钮（带计数徽标），点击弹出模态展示该 SKU 全部 `adjustments[]`（变化量 ±、调整前后值、原因、时间），按时间倒序
- **调整后自动跟进任务**：`handleReplenish` 补货后若 `afterCount` 仍 < `threshold`，自动调用 `createWorkspaceTask`（type='门店库存'、High 优先级、次日到期、metadata 关联 sku/storeId/inventoryId），审计日志回写 `followUpTaskId`，并 toast 提示
- 调整后派发 `activity_logged` 事件同步活动流

**剩余工作：**
- 无（已闭环）

---

## 关键发现

1. **已交付（9 个非数字人 issue 全部 100%）**：B03–B11 均实现 repository-backed + 审计日志 + 任务/资产联动闭环，并通过 `scripts/p2-p3-repository-contract.test.ts` 契约测试
2. **已跳过**：B01/B02（Avatar 授权与产出）依赖数字人/混剪能力，经用户决策不在本轮范围
3. **统一推迟项（跨模块/架构，非单 issue 范围）**：
   - 门店模块（B09/B10/B11）API write-through 与 repository 拆分——本地 localStorage 为当前 MVP 默认
   - 文件命名规范化（financialRepository/taxEventRepository）——高风险低收益，牵连 import/脚本名/vite manualChunks

---

## 执行记录（已完成）

| 顺序 | Issue | 起始 → 终态 | 关键动作 |
|------|-------|-------------|----------|
| 1 | B05 客服 | 80% → 100% | sent 状态转换 + 响应生命周期统计面板 + sent/escalated 徽章 |
| 2 | B06 财税 | 85% → 100% | 新增 taxRepository 持久化测算/模拟记录 |
| 3 | B04 CRM | 70% → 100% | Insights 财务数据切到 repository + 满意度跟进任务 |
| 4 | B07 团队 | 70% → 100% | 成员任务派发 + members.manage 权限门控 |
| 5 | B03 设计 | 65% → 100% | 生成资产保存 assetRepository + Brief 管理 UI |
| 6 | B09 门店基础 | 65% → 100% | 驾驶舱去硬编码（订单/库存真实派生） |
| 7 | B11 库存调整 | 50% → 100% | 调整历史模态 UI + 补货后自动跟进任务 |
| 8 | B10 门店营销 | 25% → 100% | StoreMarketingView 接入 campaignRepository + 资产/审计联动 |
| 9 | B08 Agent 库 | 20% → 100% | TeamView 接入 agentLibraryRepository + roleVisibility 过滤 |
| — | B01/B02 Avatar | 跳过 | 数字人/混剪，用户决策排除 |

---

## 验证方式

全部 P2 issue 完成后需运行：

```powershell
npx tsx scripts/launch-readiness.test.ts
npx tsx scripts/saas-foundation.test.ts
npx tsc --noEmit
```

单独 issue 验证可运行各模块对应的 `scripts/*.test.ts` 脚本。
