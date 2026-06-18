# 配额预检裂缝修复设计

- 日期:2026-06-18
- 子项目:⑤ 业务模块补全 — follow-up
- 状态:设计已确认,待实施

## 背景与问题根因

前端有两个"配额预检守卫"(quota guard),在用户触发计费动作前判断算力额度是否充足:

1. `src/components/AssetsView.tsx` 的 `preflightAssetExport`(第 108–157 行)— 在 CSV 导出 / 批量打包下载前检查。
2. `src/components/GlobalAgentDispatcherModal.tsx` 的 `startDispatch`(第 108–169 行)— 在 Agent 调度前检查。

两者当前都用**本地 localStorage 镜像**做判断:

```
rechargeCredits = sumWorkspaceRechargeCredits(financialRecords)
                + sumWorkspacePromotionalCredits(financialRecords)
quota = canStartBillableGeneration({
  monthlyAllowance, rechargeCredits,
  generationJobs, moduleUsage, usageEvents,
  requestedCredits
})
```

即:`本地所有历史充值 points 之和 + monthlyAllowance − 本地估算消耗`。这套数据全部来自浏览器 localStorage 镜像。

后端 `apps/api/src/billing/credit.service.ts` 维护的 `Workspace.creditBalance` 才是真实余额:它是一个运行时累计整数,**已包含**月度免费额度(`ensureMonthlyGrant`)+ 手动 grant 充值 − 已消耗(hold)− 上月过期清零,是单一真值。`CreditLedger` 表是其事件溯源账本,`balanceAfter` 仅为审计快照。

**裂缝**:本地镜像会因「余额未及时水合」「消费事件未同步」「credits 被其他客户端/会话消耗」等原因与后端真值失准,导致守卫判断错误(放行实际不足、或拦截实际充足)。

## 目标与范围

**范围(A — 最小修复,只统一"读"的来源):**

- 两个守卫改用后端真值 `creditRepository.getCreditBalanceSnapshot().balance` 作为余额判断依据,彻底弃用本地聚合(`sumWorkspaceRechargeCredits` / `sumWorkspacePromotionalCredits` / `canStartBillableGeneration` 的守卫用途)。
- "本次需要多少 credits"的估算函数保持不变。

**不在范围内:**

- 不新增前端主动扣减额度的调用。扣减由后端在 `OrchestrationService.dispatch()` 内通过 `credit.hold()` 原子完成(余额不足抛 HTTP 402 `insufficient_credits`),前端补扣减会有双重扣减/并发风险。
- 不改 `BillingView.tsx` 中 `sumWorkspaceRechargeCredits` 的**展示用途**(第 159–160 行),那是展示剩余额度,与守卫无关。
- 不迁移 `billingRepository`(仍 local-only,按既定计划保留)。

## 关键事实(后端余额语义,已核实)

- `getCreditBalanceSnapshot(context)` 定义于 `src/lib/data/creditRepository.ts:35`,**同步**函数,workspace-scoped,返回 `CreditBalanceSnapshot | null`(`{ balance, plan, monthlyAllowance, periodKey }`)。它只读缓存,不发网络请求。
- 缓存由 **async** `hydrateCreditBalance(context)`(`creditRepository.ts:29`)从后端 `credits/balance` 拉取后写入。
- 后端 `balance` = `Workspace.creditBalance`,已是混合所有来源后的统一可用余额,前端无需区分 monthlyAllowance / recharge。判断口径就是 `balance >= requiredCredits`。

## 架构与数据流

新增一个共享守卫工具,封装「水合 → 读快照 → 比对」,两个组件共用,消除重复逻辑。

新守卫流程:

```
用户点击导出 / 调度
  → requiredCredits = 估算函数(不变)
  → result = await preflightCredits({ workspaceId, requiredCredits })
  → 按 result 决策(见下)
```

`preflightCredits` 内部:

```
await hydrateCreditBalance({ workspaceId })          // 主动拉后端最新余额
snapshot = getCreditBalanceSnapshot({ workspaceId })
if (!snapshot) → { ok: false, balance: null, reason: 'unavailable' }
else if (snapshot.balance >= requiredCredits) → { ok: true, balance }
else → { ok: false, balance, reason: 'insufficient' }
// hydrateCreditBalance 抛异常 → catch → { ok: false, balance: null, reason: 'unavailable' }
```

## 组件单元

### 1. 共享守卫工具(新文件)

- 路径:`src/lib/billing/creditPreflight.ts`
- 导出:
  ```ts
  export interface CreditPreflightResult {
    ok: boolean;
    balance: number | null;
    reason?: 'insufficient' | 'unavailable';
  }
  export async function preflightCredits(params: {
    workspaceId: string;
    requiredCredits: number;
  }): Promise<CreditPreflightResult>;
  ```
- 职责:水合 + 读快照 + 比对 + 捕获水合异常。**不**做任何 toast / audit / usage-event 写入(那是调用方各自的责任)。
- 依赖:`creditRepository`(`hydrateCreditBalance` + `getCreditBalanceSnapshot`)。

### 2. AssetsView.tsx

- `preflightAssetExport` 改为 `async`,内部 `requiredCredits = max(1, ceil(assetCount / 5))`(保留),调用 `preflightCredits`。
- 移除本地聚合(`loadWorkspaceFinancialRecords` / `loadWorkspaceBillingPlans` / `sumWorkspaceRechargeCredits` / `sumWorkspacePromotionalCredits` / `canStartBillableGeneration`)的守卫用途。
- 调用点 `handleExportCSV`、`handleBulkDownload` 改为 `await preflightAssetExport(...)`。
- 决策:
  - `ok: true` → 放行。
  - `reason: 'insufficient'` → 拦截,维持现有处理:写 `quota_block` usage event + audit log + `toast('算力额度不足:...', 'warning')`,返回 false。
  - `reason: 'unavailable'` → **拦截(fail-closed)**。导出是配额管控点且无后端 402 兜底,拿不到真值不放水。toast 提示"无法核验算力额度,请稍后重试",返回 false。

### 3. GlobalAgentDispatcherModal.tsx

- `startDispatch` 守卫段改用 `preflightCredits`。`estimateRequestedGenerationCredits(...)` 保留。
- 移除本地聚合守卫用途。
- 决策:
  - `ok: true` → 放行。
  - `reason: 'insufficient'` → 拦截,维持现有处理:`setRuntimeError` + 所选 Agent `dispatchStatus='failed'` + audit log + `quota_block` usage event,提前 return。
  - `reason: 'unavailable'` → **放行(fail-open)**,交由后端 `dispatch()` 的 402 `insufficient_credits` 原子兜底(第 203–208 行的 catch 已存在,保留不动)。

## 错误处理

- 水合网络异常 / snapshot 为 null,统一在 `preflightCredits` 内归为 `reason: 'unavailable'`,由调用方分别决策(AssetsView 拦截、Dispatcher 放行)。理由:导出无后端兜底,需 fail-closed 保安全;调度有后端原子兜底,可 fail-open 避免因网络抖动卡死用户。
- 守卫通过后的本地 usage event 写入维持现状(本地事件日志,不影响后端扣减)。

## 测试

项目用独立 `tsx` 脚本 + `node:assert/strict`,无测试框架。

新增 `scripts/credit-preflight.test.ts`,对 `preflightCredits` 做单元测试,mock `creditRepository` 的 `hydrateCreditBalance` / `getCreditBalanceSnapshot`,覆盖四态:

1. 余额充足 → `{ ok: true }`。
2. 余额不足 → `{ ok: false, reason: 'insufficient' }`。
3. snapshot 为 null → `{ ok: false, reason: 'unavailable' }`。
4. `hydrateCreditBalance` reject → `{ ok: false, reason: 'unavailable' }`(且不抛出)。

集成验证:仓库根 `npm run lint`(tsc --noEmit)+ `npm run build`。

## 验收标准

- 两个守卫不再引用 `sumWorkspaceRechargeCredits` / `sumWorkspacePromotionalCredits` / `canStartBillableGeneration` 做判断。
- `preflightCredits` 单元测试四态全过。
- `npm run lint` 与 `npm run build` 通过。
- `BillingView` 展示用途、`billingRepository`、后端扣减路径均未被改动。
