# 配额预检裂缝修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 AssetsView 导出与 GlobalAgentDispatcherModal 调度两处配额守卫改用后端真值 `creditBalance`,弃用本地聚合,消除"配额预检裂缝"。

**Architecture:** 新增共享工具 `preflightCredits`,内部 `await hydrateCreditBalance` → 读 `getCreditBalanceSnapshot` → 与本次所需 credits 比对,返回三态结果 `{ ok, balance, reason? }`。两个组件调用它,对 `unavailable` 各自决策:AssetsView fail-closed(拦截),Dispatcher fail-open(放行交后端 402 兜底)。扣减仍由后端原子完成,前端不碰。

**Tech Stack:** React 19 + TypeScript;测试为独立 `tsx` 脚本 + `node:assert/strict`(无测试框架);`npm run lint`(tsc --noEmit)+ `npm run build` 做集成验证。

---

### Task 1: 共享守卫工具 `preflightCredits`

**Files:**
- Create: `src/lib/billing/creditPreflight.ts`
- Test: `scripts/credit-preflight.test.ts`
- Modify: `package.json`(新增 `test:credit-preflight` 脚本)

- [ ] **Step 1: 写失败测试**

参照 `scripts/credit-repository.test.ts` 的注入模式(`__setCreditApiClientForTest` 注入 fake ApiClient,通过 `credits/balance` 路由喂余额)。`preflightCredits` 内部调用 `hydrateCreditBalance` + `getCreditBalanceSnapshot`,所以用 fake api 驱动即可,无需 mock 模块。`balanceCache` 是模块级且跨用例保留,故每个用例用不同 workspaceId 隔离。

创建 `scripts/credit-preflight.test.ts`:

```ts
import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import { __setCreditApiClientForTest } from '../src/lib/data/creditRepository.ts';
import { preflightCredits } from '../src/lib/billing/creditPreflight.ts';

function balanceApi(balance: number): ApiClient {
  return {
    configured: true,
    get: async (_ws: string, path: string) => {
      if (path === 'credits/balance') {
        return { ok: true, value: { balance, plan: 'free', monthlyAllowance: 100, periodKey: '2026-06' } } as any;
      }
      return { ok: true, value: [] } as any;
    },
    post: async () => ({ ok: true, value: {} }) as any,
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
}

function unconfiguredApi(): ApiClient {
  return {
    configured: false,
    get: async () => ({ ok: true, value: {} }) as any,
    post: async () => ({ ok: true, value: {} }) as any,
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
}

function throwingApi(): ApiClient {
  return {
    configured: true,
    get: async () => { throw new Error('network down'); },
    post: async () => ({ ok: true, value: {} }) as any,
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
}

async function run() {
  // 1) 余额充足 → ok
  __setCreditApiClientForTest(balanceApi(50));
  const sufficient = await preflightCredits({ workspaceId: 'ws-ok', requiredCredits: 10 });
  assert.equal(sufficient.ok, true);
  assert.equal(sufficient.balance, 50);
  assert.equal(sufficient.reason, undefined);

  // 2) 余额不足 → insufficient
  __setCreditApiClientForTest(balanceApi(3));
  const insufficient = await preflightCredits({ workspaceId: 'ws-low', requiredCredits: 10 });
  assert.equal(insufficient.ok, false);
  assert.equal(insufficient.balance, 3);
  assert.equal(insufficient.reason, 'insufficient');

  // 3) 未配置后端 → snapshot 为 null → unavailable
  __setCreditApiClientForTest(unconfiguredApi());
  const nullSnap = await preflightCredits({ workspaceId: 'ws-null', requiredCredits: 10 });
  assert.equal(nullSnap.ok, false);
  assert.equal(nullSnap.balance, null);
  assert.equal(nullSnap.reason, 'unavailable');

  // 4) 水合 reject → unavailable(且不抛出)
  __setCreditApiClientForTest(throwingApi());
  const rejected = await preflightCredits({ workspaceId: 'ws-throw', requiredCredits: 10 });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.balance, null);
  assert.equal(rejected.reason, 'unavailable');

  console.log('credit preflight passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `tsx scripts/credit-preflight.test.ts`
Expected: FAIL —— 报错找不到模块 `../src/lib/billing/creditPreflight.ts`(文件尚未创建)。

- [ ] **Step 3: 写最小实现**

创建 `src/lib/billing/creditPreflight.ts`:

```ts
import { hydrateCreditBalance, getCreditBalanceSnapshot } from '../data/creditRepository';

export interface CreditPreflightResult {
  ok: boolean;
  balance: number | null;
  reason?: 'insufficient' | 'unavailable';
}

export async function preflightCredits(params: {
  workspaceId: string;
  requiredCredits: number;
}): Promise<CreditPreflightResult> {
  const { workspaceId, requiredCredits } = params;
  try {
    await hydrateCreditBalance({ workspaceId });
  } catch {
    return { ok: false, balance: null, reason: 'unavailable' };
  }
  const snapshot = getCreditBalanceSnapshot({ workspaceId });
  if (!snapshot) {
    return { ok: false, balance: null, reason: 'unavailable' };
  }
  if (snapshot.balance >= requiredCredits) {
    return { ok: true, balance: snapshot.balance };
  }
  return { ok: false, balance: snapshot.balance, reason: 'insufficient' };
}
```

- [ ] **Step 4: 运行测试,确认通过**

Run: `tsx scripts/credit-preflight.test.ts`
Expected: PASS —— 输出 `credit preflight passed`。

- [ ] **Step 5: 加 npm 脚本**

在 `package.json` 的 `scripts` 块,紧跟 `"test:credit-repo": "tsx scripts/credit-repository.test.ts",` 之后新增一行:

```json
    "test:credit-preflight": "tsx scripts/credit-preflight.test.ts",
```

- [ ] **Step 6: 提交**

```bash
git add src/lib/billing/creditPreflight.ts scripts/credit-preflight.test.ts package.json
git commit -m "feat(billing): add preflightCredits shared quota guard backed by server balance"
```

---

### Task 2: AssetsView 导出守卫改用 `preflightCredits`(fail-closed)

**Files:**
- Modify: `src/components/AssetsView.tsx`

- [ ] **Step 1: 替换 import**

删除 import 块(第 13–17 行,billingRepository 的 `canStartBillableGeneration` / `getPlanMonthlyAllowance` / `loadWorkspaceBillingPlans`):

```ts
import {
  canStartBillableGeneration,
  getPlanMonthlyAllowance,
  loadWorkspaceBillingPlans,
} from '../lib/data/billingRepository';
```

删除 import 块(第 18–22 行,financialRepository 聚合):

```ts
import {
  loadWorkspaceFinancialRecords,
  sumWorkspacePromotionalCredits,
  sumWorkspaceRechargeCredits,
} from '../lib/data/financialRepository';
```

删除第 23 行(`listGenerationJobs` 守卫专用):

```ts
import { listGenerationJobs } from '../lib/data/generationJobRepository';
```

将 usageRepository import(第 25–29 行)收窄为只保留仍被使用的 `createWorkspaceUsageEvent`:

```ts
import { createWorkspaceUsageEvent } from '../lib/data/usageRepository';
```

在第 7 行 `import { useSaasSession } ...` 之后新增:

```ts
import { preflightCredits } from '../lib/billing/creditPreflight';
```

- [ ] **Step 2: 重写 `preflightAssetExport`**

把第 108–157 行整个 `preflightAssetExport` 函数替换为 async 版本(用 `result.balance` 重算 remaining/overage,因为 `canStartBillableGeneration` 已删):

```ts
  const preflightAssetExport = async (format: 'csv' | 'zip', selectedAssetRecords: WorkspaceAsset[]) => {
    const requestedCredits = estimateAssetExportCredits(selectedAssetRecords.length);
    const result = await preflightCredits({
      workspaceId: session.workspace.id,
      requiredCredits: requestedCredits,
    });

    if (result.ok) return true;

    if (result.reason === 'unavailable') {
      // 导出无后端兜底,核验不到余额时 fail-closed
      toast('无法核验算力额度，请稍后重试。', 'warning');
      return false;
    }

    const remainingCredits = result.balance ?? 0;
    const overageCredits = Math.max(0, requestedCredits - remainingCredits);
    createWorkspaceUsageEvent({
      moduleId: 'assets',
      kind: 'quota_block',
      targetType: 'asset',
      targetId: selectedAssetRecords.length === 1 ? selectedAssetRecords[0]?.id : 'asset_export',
      credits: 0,
      metadata: {
        format,
        reason: 'quota_exceeded',
        requestedCredits,
        remainingCredits,
        overageCredits,
        assetCount: selectedAssetRecords.length,
        assetIds: selectedAssetRecords.map((asset) => asset.id),
      },
    }, assetContext);
    logAuditEvent({
      action: 'general',
      moduleId: 'billing',
      targetType: 'workspace',
      targetId: session.workspace.id,
      metadata: {
        operation: 'asset_export_quota_block',
        format,
        requestedCredits,
        remainingCredits,
        overageCredits,
        assetCount: selectedAssetRecords.length,
      },
    }, { session });
    toast(`算力额度不足：导出需要 ${requestedCredits} 点，当前剩余 ${remainingCredits} 点。`, 'warning');
    return false;
  };
```

- [ ] **Step 3: 调用点改 await**

第 185 行 `handleExportCSV` 改为 async,第 191 行守卫调用加 await:

```ts
  const handleExportCSV = async () => {
    if (!requireAssetManagement('asset_export', 'asset_export', { format: 'csv', selectedAssetCount: selectedAssets.length })) return;
    if (selectedAssets.length === 0) return;
    const selectedAssetRecords = selectedAssets
      .map(id => assets.find(a => a.id === id))
      .filter((asset): asset is WorkspaceAsset => Boolean(asset));
    if (!(await preflightAssetExport('csv', selectedAssetRecords))) return;
```

`handleBulkDownload` 已是 async,只改第 229 行守卫调用加 await:

```ts
      if (!(await preflightAssetExport('zip', selectedAssetRecords))) return;
```

- [ ] **Step 4: 类型检查**

Run: `npm run lint`
Expected: PASS —— 无类型错误,无 "declared but never used" 之类(已删除的 import 不再被引用)。

- [ ] **Step 5: 提交**

```bash
git add src/components/AssetsView.tsx
git commit -m "fix(assets): export quota guard uses server credit balance (fail-closed)"
```

---

### Task 3: GlobalAgentDispatcherModal 调度守卫改用 `preflightCredits`(fail-open)

**Files:**
- Modify: `src/components/GlobalAgentDispatcherModal.tsx`

- [ ] **Step 1: 替换 import**

将 billingRepository import(第 6–11 行)收窄为只保留仍用的 `estimateRequestedGenerationCredits`:

```ts
import { estimateRequestedGenerationCredits } from '../lib/data/billingRepository';
```

删除 financialRepository import 块(第 12–16 行):

```ts
import {
  loadWorkspaceFinancialRecords,
  sumWorkspacePromotionalCredits,
  sumWorkspaceRechargeCredits,
} from '../lib/data/financialRepository';
```

将 generationJobRepository import(第 17 行)去掉守卫专用的 `listGenerationJobs`,保留另两个:

```ts
import { createGenerationJob, updateGenerationJob } from '../lib/data/generationJobRepository';
```

将 usageRepository import(第 19 行)去掉 `listWorkspaceUsageEvents` / `loadModuleUsage`,保留 `createWorkspaceUsageEvent`:

```ts
import { createWorkspaceUsageEvent } from '../lib/data/usageRepository';
```

在第 23 行 `import { useSaasSession } ...` 之后新增:

```ts
import { preflightCredits } from '../lib/billing/creditPreflight';
```

- [ ] **Step 2: 重写守卫段**

把第 116–169 行(从 `const billingPlans = ...` 到 quota 拦截块结束的 `return;`)整段替换为下面内容。即:删除本地聚合与 `canStartBillableGeneration`,改调 `preflightCredits`;只在 `reason === 'insufficient'` 时拦截,`unavailable` 与 `ok` 都放行(交后端 402 兜底)。`requestedCredits`(第 109–115 行)与上方 `billingContext`(第 108 行)保持不变。

```ts
    const result = await preflightCredits({
      workspaceId: session.workspace.id,
      requiredCredits: requestedCredits,
    });

    if (!result.ok && result.reason === 'insufficient') {
      const remainingCredits = result.balance ?? 0;
      const overageCredits = Math.max(0, requestedCredits - remainingCredits);
      setRuntimeError(
        `算力额度不足：本次调度需要 ${requestedCredits} 点，当前剩余 ${remainingCredits} 点，请升级套餐或充值后重试。`,
      );
      setAgents((prev) =>
        prev.map((agent) =>
          selectedAgents.includes(agent.id) ? { ...agent, dispatchStatus: 'failed', progress: 100 } : agent,
        ),
      );
      logAuditEvent({
        action: 'generation_job_failed',
        targetType: 'generation_job',
        targetId: 'billing_quota',
        metadata: {
          reason: 'quota_exceeded',
          requestedCredits,
          remainingCredits,
          overageCredits,
          selectedAgentCount: selectedAgents.length,
          runtimeMode: runtime.mode,
          providerKind: runtime.providerKind,
        },
      }, { session });
      createWorkspaceUsageEvent({
        moduleId: 'tasks',
        kind: 'quota_block',
        targetType: 'runtime',
        targetId: 'billing_quota',
        providerKind: runtime.providerKind,
        runtimeMode: runtime.mode,
        credits: 0,
        metadata: {
          reason: 'quota_exceeded',
          requestedCredits,
          remainingCredits,
          overageCredits,
          selectedAgentCount: selectedAgents.length,
        },
      }, billingContext);
      return;
    }
```

- [ ] **Step 3: 类型检查**

Run: `npm run lint`
Expected: PASS —— 无类型错误,无未使用 import。

- [ ] **Step 4: 提交**

```bash
git add src/components/GlobalAgentDispatcherModal.tsx
git commit -m "fix(dispatch): quota guard uses server credit balance (fail-open to backend 402)"
```

---

### Task 4: 集成验证

**Files:** 无(仅运行验证命令)

- [ ] **Step 1: 跑预检单测**

Run: `tsx scripts/credit-preflight.test.ts`
Expected: PASS —— `credit preflight passed`。

- [ ] **Step 2: lint**

Run: `npm run lint`
Expected: PASS —— 无输出(tsc --noEmit 通过)。

- [ ] **Step 3: build**

Run: `npm run build`
Expected: PASS —— Vite 构建成功,无错误。

- [ ] **Step 4: 确认裂缝已消除(人工核对)**

`grep -n "sumWorkspaceRechargeCredits\|canStartBillableGeneration" src/components/AssetsView.tsx src/components/GlobalAgentDispatcherModal.tsx`
Expected: 无匹配(两个守卫已不再引用本地聚合)。`BillingView.tsx` 的展示用途不在本次范围,不受影响。

---

## 自检结论

- **Spec 覆盖**:共享工具(Task 1)、AssetsView fail-closed(Task 2)、Dispatcher fail-open(Task 3)、lint+build+四态测试(Task 1/4)——spec 各节均有对应任务。
- **无占位符**:所有代码步骤均为完整可用代码。
- **类型一致**:`CreditPreflightResult { ok, balance, reason? }` 与 `preflightCredits({ workspaceId, requiredCredits })` 在三个 Task 中签名一致;`reason` 取值 `'insufficient' | 'unavailable'` 前后统一。
