# ⑤b-2.5 Financial 资源设计规格

状态:已批准(2026-06-18)
所属:SaaS 产品化 ⑤ 业务模块补全 / ⑤b 数据层迁移 / ⑤b-2.5(从 ⑤b-2 拆出)

## 背景

`src/lib/data/financialRepository.ts` 是最后一批 local-only 仓库之一,记录 workspace 的财务流水(订阅/发票/支付/退款/提现/积分 6 种 kind)。它当初从 ⑤b-2 拆出,因为其 coupon 幂等与 credit 聚合疑似与已交付的 ④ 计费后端(`CreditLedger` + `CreditService`)强耦合。

经调查(见对话记录)确认:
- 充值(`compute_points_recharge`)与优惠券(`compute_points_coupon_redemption`)路径**已经**通过 `grantCredits` 双写后端 `CreditLedger`(幂等 key `pay:xxx`/`coupon:xxx`,后端唯一约束兜底)。financial localStorage 记录在这两条路径上是 CreditLedger 的冗余影子。
- 后端**没有** FinancialRecord 或任何 transaction/invoice 表,只有 `CreditLedger`。
- financial 还存 subscription/invoice/withdrawal 等**非积分类**记录,后端无对应物。
- 大量纯派生函数(summarize / buildDailyRevenue / buildInvoices / sumCredits / hasCouponRedemption)。

## 决策(已与用户对齐)

**总策略 = A**:建独立 `FinancialRecord` 资源,与 ⑤b 其它域同模式;派生全留前端;**不动已交付的 ④ 计费代码**。配额预检裂缝(AssetsView/GlobalAgentDispatcherModal 用本地聚合而非后端余额)记为独立 follow-up,不混入本次迁移。

1. **kind 范围**:6 种 kind 全部上后端,建一张 `FinancialRecord` 表。积分类记录与 CreditLedger 并存(冗余但符合"独立资源"定位)。
2. **coupon 幂等**:`hasWorkspaceCouponRedemption` 留前端纯查询(查缓存)。后端 CreditLedger 的 idempotencyKey 已是双保险,数据层迁移不碰此校验。
3. **批量覆写写穿透**:`saveWorkspaceFinancialRecords` 配置后端时,diff 出相对缓存 metadata/字段有变化的记录,**逐条 PATCH**(只发真正变化的);未配置时保持 localStorage 全量覆写。

## 数据模型

新增 Prisma model `FinancialRecord`,字段对齐 `WorkspaceFinancialRecord`:

```
model FinancialRecord {
  id           String    @id @default(cuid())
  workspaceId  String
  kind         String                      // subscription|invoice|payment|refund|withdrawal|credit
  status       String                      // paid|pending|issued|refunded|cancelled|approved
  amountCents  Int       @default(0)
  currency     String    @default("CNY")
  planId       String?
  counterparty String    @default("Workspace Customer")
  occurredAt   DateTime  @default(now())   // 业务发生时间(可由 input 指定,区别于 createdAt)
  metadata     Json?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, occurredAt])
  @@index([workspaceId, kind])
}
```

- Workspace 加反向关系 `financialRecords FinancialRecord[]`。
- `resetDb`(test/helpers.ts)加 `financialRecord.deleteMany()`(在 workspace 删除前)。
- 排序:列表按 `occurredAt desc`(资源基类用 createdAt;此处通过 buildWhere 不变,排序差异交前端 sortFinancialRecords 兜底——见下"差异点")。

## 差异点(相对标准资源克隆)

1. **occurredAt 业务时间戳**:DTO 接收(可选,number 或 ISO);后端存 DateTime;前端 normalize 用支持 ISO 的 `normalizeTimestamp`。`createdAt/updatedAt` 同样支持 ISO。
2. **列表排序按 occurredAt**:后端资源基类默认按 `createdAt` 游标排序。为保持前端 `sortFinancialRecords`(occurredAt desc, updatedAt desc)语义,**hydrate 后前端再 sort**(已有 sortFinancialRecords),后端排序不强求一致。游标分页仍按基类 createdAt+id(稳定即可)。
3. **kind/status filter**:ListQuery 支持可选 `kind`、`status` 过滤,buildWhere 注入。
4. **写穿透**:
   - `createWorkspaceFinancialRecord` → 缓存 unshift + POST。
   - `saveWorkspaceFinancialRecords` → diff 出变化记录逐条 PATCH(决策 3)。无单条 update/delete 导出。
5. **派生函数全留前端**:summarizeWorkspaceFinancials / buildDailyRevenueSeries / buildWorkspaceInvoices / sumWorkspaceRechargeCredits / sumWorkspacePromotionalCredits / hasWorkspaceCouponRedemption 一律不动,继续接收前端记录数组。
6. **不碰 ④**:不调用、不修改 billing/credit 任何后端代码;BillingView 的 grantCredits 双写逻辑保持原样。

## 后端四件套

- `apps/api/src/financial/dto.ts`:CreateFinancialRecordDto / UpdateFinancialRecordDto / ListFinancialRecordQuery。
  - Create:id?、kind(IsIn 6 种)、status?(IsIn 6 种)、amountCents(IsInt Min 0)、currency?、planId?、counterparty?、occurredAt?(IsNumber 或 IsDateString —— 用宽松 string|number,见 plan)、metadata?。
  - Update:全部可选。
  - ListQuery:cursor?、limit?、order?、kind?、status?。
- `financial.service.ts`:extends WorkspaceResourceService,delegate = prisma.financialRecord,entityName 'FinancialRecord',buildWhere 注入 kind/status。
- `financial.controller.ts`:createResourceController(path `workspaces/:workspaceId/financial-records`)+ TS2509 cast。
- `financial.module.ts`:RESOURCE_SERVICE useExisting。
- 注册进 app.module.ts。

## 前端改动 `src/lib/data/financialRepository.ts`

- import apiClient。
- normalizeTimestamp 支持 ISO(改现有 106-109 行)。
- loadWorkspaceFinancialRecords:configured 时返回缓存。
- createWorkspaceFinancialRecord:configured 时缓存 + POST 写穿透。
- saveWorkspaceFinancialRecords:configured 时 diff 逐条 PATCH + 更新缓存。
- 文件末尾加 `__setFinancialApiClientForTest`、`financialCache`、`hydrateWorkspaceFinancialRecords`。
- 派生函数不动。

## 验收

- 后端新增 `financial.e2e-spec.ts`:6 tests(CRUD round-trip with occurredAt、kind filter、status filter、cursor pagination、workspace isolation 404、non-member 403)。
- 前端 `scripts/financial-repository.test.ts`:hydrate 读缓存、create 写穿透、saveWorkspaceFinancialRecords diff PATCH(只变化的)、未配置 localStorage 兜底、派生函数仍可用(summarize 一个断言)。
- package.json 加 `test:financial-repo`,挂到 `test:p0-specialized` 链尾。
- 全量验收:后端 27 suites e2e、lint、test:p0-specialized、test:saas-foundation、build 全绿。

## 不做(超出本批)

- 不修配额预检裂缝(AssetsView/GlobalAgentDispatcherModal)——独立 follow-up。
- 不重构 BillingView 的 financial+CreditLedger 双写。
- 不打通 financial 与 CreditLedger。
