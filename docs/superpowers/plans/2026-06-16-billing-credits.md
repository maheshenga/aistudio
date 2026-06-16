# ④ 计费 / 积分余额扣减系统 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把积分余额、扣减、配额拦截、充值入账做成后端真相源,采用预扣+结算(authorize/capture)模型杜绝超卖,余额变动走可对账的 CreditLedger 流水账本。

**Architecture:** 混合存储——`CreditLedger`(append-only 分录,真相源)+ `Workspace.creditBalance`(快照缓存,高频校验读它)。`CreditService.applyLedgerEntry` 是所有余额变动的唯一入口,用 `updateMany` 条件原子更新(`where creditBalance >= amount`)杜绝并发超卖,幂等键去重。dispatch 时 hold 预扣,reconciliation finalize 时 capture(成功)/refund(失败/取消),月额度懒发放、不结转。

**Tech Stack:** NestJS 10 + Prisma 5 + PostgreSQL;后端 Jest e2e 打真实 Docker Postgres(`aistudio-pg`:5433,`--runInBand`);前端 tsx 脚本 + `node:assert/strict`。

**设计依据:** `docs/superpowers/specs/2026-06-16-billing-credits-design.md`

**测试环境变量(后端 e2e 统一前缀):**
```
DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret"
```

---

## 文件结构

**后端新建 `apps/api/src/billing/`:**
- `credit-cost.ts` — 确定性成本模型(从 reconciliation.service 抽出),dispatch 与 finalize 共用。
- `plan-allowance.ts` — plan→月额度常量表(后端权威,对齐前端默认值)。
- `credit.service.ts` — CreditService:applyLedgerEntry + hold/capture/refund/grant/ensureMonthlyGrant/getBalance/listLedger。
- `billing.controller.ts` — 三端点:GET balance / GET ledger / POST grant。
- `billing.module.ts` — 注册 controller + service,**exports: [CreditService]**(供 OrchestrationModule 复用)。
- `dto.ts` — GrantCreditDto + LedgerRangeQuery。

**后端修改:**
- `apps/api/prisma/schema.prisma` — Workspace 加 `creditBalance Int @default(0)` + 反向关系;新增 `CreditLedger` 模型。
- `apps/api/src/common/errors.ts` — 加 `insufficientCredits`(402)+ DomainError 带 metadata。
- `apps/api/src/common/filters/all-exceptions.filter.ts` — 透传 DomainError.metadata + 增加 `insufficient_credits` 错误码。
- `apps/api/src/orchestration/orchestration.service.ts` — dispatch 预扣 + cancel refund;改造 dispatch 走事务。
- `apps/api/src/orchestration/orchestration.module.ts` — imports: [BillingModule]。
- `apps/api/src/orchestration/reconciliation.service.ts` — finalize capture/refund;孤儿清理 refund;成本模型改 import 共享。
- `apps/api/src/app.module.ts` — imports 加 BillingModule。

**前端新建 / 修改 `src/`:**
- `src/lib/data/creditRepository.ts`(新建)— hydrate/get balance + list ledger + grant,apiClient 优先 + 本地兜底。
- `src/components/AssetsView.tsx`、`src/components/GlobalAgentDispatcherModal.tsx`、`src/components/BillingView.tsx` — 拦截/余额/充值切后端真相源。

**测试新建:**
- `apps/api/test/credit.e2e-spec.ts`
- `scripts/credit-repository.test.ts`(纳入 `test:p0-specialized`)

---

## Task 1: 共享成本模型与 plan 额度常量

把成本模型从 reconciliation 抽到 billing,新增 plan 额度表。纯函数,先建无依赖的基石。

**Files:**
- Create: `apps/api/src/billing/credit-cost.ts`
- Create: `apps/api/src/billing/plan-allowance.ts`
- Modify: `apps/api/src/orchestration/reconciliation.service.ts`(删除本地 `generationCredits`,改 import)

- [ ] **Step 1: 写成本模型函数**

Create `apps/api/src/billing/credit-cost.ts`:

```typescript
// 确定性生成成本(与前端 src/lib/data/billingRepository.ts estimateGenerationJobCredits 对齐)。
// 仅依赖 runtimeMode/providerKind,dispatch 时已知 → 预估=实际,无补差。
export function generationCredits(job: { runtimeMode: string | null; providerKind: string | null }): number {
  if (job.runtimeMode === 'desktop_multica') return 1;
  if (job.providerKind === 'multica') return 3;
  return 5;
}
```

- [ ] **Step 2: 写 plan 额度常量**

Create `apps/api/src/billing/plan-allowance.ts`:

```typescript
// plan → 月度积分额度(后端权威,对齐前端 billingRepository DEFAULT_BILLING_PLANS)。
const PLAN_MONTHLY_ALLOWANCE: Record<string, number> = {
  free: 100,
  pro: 5_000,
  business: 20_000,
  enterprise: 100_000,
};

export function planMonthlyAllowance(plan: string): number {
  return PLAN_MONTHLY_ALLOWANCE[plan] ?? PLAN_MONTHLY_ALLOWANCE.free;
}
```

- [ ] **Step 3: reconciliation 改用共享成本模型**

In `apps/api/src/orchestration/reconciliation.service.ts`, 删除文件顶部本地定义的 `generationCredits` 函数(约 9-15 行的那段注释+函数),改为在 import 区加:

```typescript
import { generationCredits } from '../billing/credit-cost';
```

`finalize` 内 `credits: generationCredits(job)` 调用点不变(签名一致)。

- [ ] **Step 4: 类型检查**

Run: `cd apps/api && npx tsc --noEmit`
Expected: 无输出(通过)

- [ ] **Step 5: 跑 reconciliation e2e 确认无回归**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --config ./test/jest-e2e.json --runInBand reconciliation`
Expected: PASS,5 passed

- [ ] **Step 6: 提交**

```bash
git add apps/api/src/billing/credit-cost.ts apps/api/src/billing/plan-allowance.ts apps/api/src/orchestration/reconciliation.service.ts
git commit -m "refactor(api): extract shared credit-cost model + plan allowance table"
```

---

## Task 2: Prisma schema —— CreditLedger 模型 + Workspace.creditBalance

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: migration(由 `prisma migrate dev` 生成)

- [ ] **Step 1: Workspace 加余额字段 + 反向关系**

In `apps/api/prisma/schema.prisma`, `Workspace` 模型(第 10-24 行)内:
- 在 `plan` 行下加:`creditBalance Int @default(0)`
- 在关系块(`auditLogs AuditLog[]` 后)加:`creditLedger CreditLedger[]`

- [ ] **Step 2: 新增 CreditLedger 模型**

在 schema 末尾追加:

```prisma
model CreditLedger {
  id             String   @id @default(cuid())
  workspaceId    String
  delta          Int
  reason         String
  refType        String?
  refId          String?
  idempotencyKey String?
  balanceAfter   Int
  metadata       Json?
  createdAt      DateTime @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, idempotencyKey])
  @@index([workspaceId, createdAt])
  @@index([workspaceId, reason])
}
```

- [ ] **Step 3: 生成并应用 migration(开发库)**

Run: `cd apps/api && npx prisma migrate dev --name add_credit_ledger_and_balance`
Expected: 生成 `prisma/migrations/<timestamp>_add_credit_ledger_and_balance/migration.sql`,Prisma Client 重新生成。

> 注:`migrate dev` 作用于 `DATABASE_URL`(开发库)。e2e 测试库由 jest 启动时同步 schema(沿用现有 helper 机制),无需手动迁移测试库。

- [ ] **Step 4: 验证 schema 应用到测试库**

Run: `cd apps/api && DATABASE_URL="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" npx prisma db push --skip-generate --accept-data-loss`
Expected: "Your database is now in sync with your Prisma schema."

- [ ] **Step 5: 类型检查(Prisma Client 已含 CreditLedger 类型)**

Run: `cd apps/api && npx tsc --noEmit`
Expected: 无输出

- [ ] **Step 6: 提交**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat(api): add CreditLedger model + Workspace.creditBalance snapshot"
```

---

## Task 3: insufficientCredits 错误类型 + filter metadata 透传

**Files:**
- Modify: `apps/api/src/common/errors.ts`
- Modify: `apps/api/src/common/filters/all-exceptions.filter.ts`

- [ ] **Step 1: 扩展 DomainError 带 metadata + 加 insufficientCredits**

In `apps/api/src/common/errors.ts`:

整体替换为(在 ErrorCode union 加 `'insufficient_credits'`,DomainError 加可选 metadata,新增工厂):

```typescript
export type ErrorCode =
  | 'backend_unconfigured' | 'network_error' | 'permission_denied'
  | 'parse_error' | 'validation_error' | 'not_found' | 'conflict'
  | 'unauthenticated' | 'insufficient_credits' | 'unknown_error';

export class DomainError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number,
    public metadata?: Record<string, unknown>,
  ) { super(message); }
}
export const notFound = (m = 'Resource not found') => new DomainError('not_found', m, 404);
export const validationError = (m: string) => new DomainError('validation_error', m, 400);
export const conflict = (m: string) => new DomainError('conflict', m, 409);
export const unauthenticated = (m = 'Authentication required') => new DomainError('unauthenticated', m, 401);
export const permissionDenied = (m = 'Permission denied') => new DomainError('permission_denied', m, 403);
export const insufficientCredits = (m = 'Insufficient credits', metadata?: Record<string, unknown>) =>
  new DomainError('insufficient_credits', m, 402, metadata);
```

- [ ] **Step 2: filter 透传 metadata**

In `apps/api/src/common/filters/all-exceptions.filter.ts`:

第 10 行下加 metadata 局部变量;DomainError 分支(第 12-13 行)读取 metadata;最后响应(第 27 行)条件加 metadata。改动后:

```typescript
    let status = 500; let code: ErrorCode = 'unknown_error'; let message = 'Internal server error';
    let metadata: Record<string, unknown> | undefined;

    if (exception instanceof DomainError) {
      status = exception.status; code = exception.code; message = exception.message; metadata = exception.metadata;
    } else if (exception instanceof HttpException) {
```

并把最后一行响应改为:

```typescript
    res.status(status).json({ error: { code, message, ...(metadata ? { metadata } : {}) } });
```

- [ ] **Step 3: 类型检查**

Run: `cd apps/api && npx tsc --noEmit`
Expected: 无输出

- [ ] **Step 4: 提交**

```bash
git add apps/api/src/common/errors.ts apps/api/src/common/filters/all-exceptions.filter.ts
git commit -m "feat(api): add insufficient_credits (402) error + filter metadata passthrough"
```

---

## Task 4: CreditService 核心(applyLedgerEntry + 能力方法)

这是系统核心。先写 e2e 测试驱动(TDD),再实现。CreditService 注入全局 PrismaService。

**Files:**
- Create: `apps/api/src/billing/credit.service.ts`
- Create: `apps/api/src/billing/billing.module.ts`
- Test: `apps/api/test/credit.e2e-spec.ts`(本任务建测试骨架 + ensureMonthlyGrant/grant/hold/refund 用例)

- [ ] **Step 1: 写失败测试(余额服务核心行为)**

Create `apps/api/test/credit.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { CreditService } from '../src/billing/credit.service';

describe('CreditService (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; let credit: CreditService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); credit = app.get(CreditService); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  async function freshWs(email: string) {
    const { workspaceId } = await registerUser(app, email);
    return workspaceId;
  }

  it('ensureMonthlyGrant: first call grants plan allowance (free=100), idempotent within period', async () => {
    const ws = await freshWs('c1@test.dev');
    const b1 = await credit.getBalance(ws);
    expect(b1.balance).toBe(100);
    expect(b1.monthlyAllowance).toBe(100);
    // 再查不重复发放
    const b2 = await credit.getBalance(ws);
    expect(b2.balance).toBe(100);
    const grants = await prisma.creditLedger.findMany({ where: { workspaceId: ws, reason: 'monthly_grant' } });
    expect(grants).toHaveLength(1);
  });

  it('hold deducts, refund restores; idempotent by key', async () => {
    const ws = await freshWs('c2@test.dev');
    await credit.getBalance(ws); // trigger grant → 100
    await prisma.$transaction((tx) => credit.hold(tx, ws, 'job-A', 30));
    expect((await credit.getBalance(ws)).balance).toBe(70);
    // 重复 hold 同 key 不重复扣
    await prisma.$transaction((tx) => credit.hold(tx, ws, 'job-A', 30));
    expect((await credit.getBalance(ws)).balance).toBe(70);
    // refund 退回
    await prisma.$transaction((tx) => credit.refund(tx, ws, 'job-A', 30));
    expect((await credit.getBalance(ws)).balance).toBe(100);
    // 重复 refund 不重复退
    await prisma.$transaction((tx) => credit.refund(tx, ws, 'job-A', 30));
    expect((await credit.getBalance(ws)).balance).toBe(100);
  });

  it('hold throws insufficient_credits (402) when balance too low', async () => {
    const ws = await freshWs('c3@test.dev');
    await credit.getBalance(ws); // 100
    await expect(prisma.$transaction((tx) => credit.hold(tx, ws, 'job-B', 150)))
      .rejects.toMatchObject({ code: 'insufficient_credits', status: 402 });
    expect((await credit.getBalance(ws)).balance).toBe(100); // 不变
  });

  it('grant adds credits; ledger balanceAfter === snapshot', async () => {
    const ws = await freshWs('c4@test.dev');
    await credit.getBalance(ws); // 100
    await prisma.$transaction((tx) => credit.grant(tx, ws, 500, 'recharge', 'pay:1'));
    const b = await credit.getBalance(ws);
    expect(b.balance).toBe(600);
    const last = await prisma.creditLedger.findFirst({ where: { workspaceId: ws }, orderBy: { createdAt: 'desc' } });
    expect(last!.balanceAfter).toBe(600);
  });

  it('reconciliation: balance snapshot always equals sum of ledger deltas', async () => {
    const ws = await freshWs('c5@test.dev');
    await credit.getBalance(ws);
    await prisma.$transaction((tx) => credit.hold(tx, ws, 'j1', 10));
    await prisma.$transaction((tx) => credit.grant(tx, ws, 50, 'coupon', 'cp:1'));
    await prisma.$transaction((tx) => credit.refund(tx, ws, 'j1', 10));
    const agg = await prisma.creditLedger.aggregate({ where: { workspaceId: ws }, _sum: { delta: true } });
    const ws2 = await prisma.workspace.findUnique({ where: { id: ws } });
    expect(ws2!.creditBalance).toBe(agg._sum.delta ?? 0);
  });
});
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --config ./test/jest-e2e.json --runInBand credit`
Expected: FAIL —— `Cannot find module '../src/billing/credit.service'`

- [ ] **Step 3: 实现 CreditService(part 1:类型 + applyLedgerEntry + hold/capture/refund/grant)**

Create `apps/api/src/billing/credit.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { insufficientCredits } from '../common/errors';
import { planMonthlyAllowance } from './plan-allowance';

type Tx = Prisma.TransactionClient;

interface LedgerInput {
  workspaceId: string;
  delta: number;
  reason: string;
  refType?: string;
  refId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class CreditService {
  constructor(private prisma: PrismaService) {}

  private async applyLedgerEntry(tx: Tx, input: LedgerInput) {
    if (input.idempotencyKey) {
      const existing = await tx.creditLedger.findUnique({
        where: { workspaceId_idempotencyKey: { workspaceId: input.workspaceId, idempotencyKey: input.idempotencyKey } },
      });
      if (existing) return existing;
    }

    let balanceAfter: number;
    if (input.delta < 0) {
      const amount = -input.delta;
      const res = await tx.workspace.updateMany({
        where: { id: input.workspaceId, creditBalance: { gte: amount } },
        data: { creditBalance: { decrement: amount } },
      });
      if (res.count === 0) {
        const ws = await tx.workspace.findUnique({ where: { id: input.workspaceId } });
        throw insufficientCredits('Insufficient credits', { required: amount, balance: ws?.creditBalance ?? 0 });
      }
      const ws = await tx.workspace.findUnique({ where: { id: input.workspaceId } });
      balanceAfter = ws!.creditBalance;
    } else {
      const ws = await tx.workspace.update({
        where: { id: input.workspaceId },
        data: { creditBalance: { increment: input.delta } },
      });
      balanceAfter = ws.creditBalance;
    }

    return tx.creditLedger.create({
      data: {
        workspaceId: input.workspaceId, delta: input.delta, reason: input.reason,
        refType: input.refType ?? null, refId: input.refId ?? null,
        idempotencyKey: input.idempotencyKey ?? null, balanceAfter,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  hold(tx: Tx, workspaceId: string, jobId: string, amount: number) {
    return this.applyLedgerEntry(tx, {
      workspaceId, delta: -amount, reason: 'hold',
      refType: 'generation_job', refId: jobId, idempotencyKey: `job:${jobId}:hold`,
    });
  }

  capture(tx: Tx, workspaceId: string, jobId: string) {
    return this.applyLedgerEntry(tx, {
      workspaceId, delta: 0, reason: 'capture',
      refType: 'generation_job', refId: jobId, idempotencyKey: `job:${jobId}:capture`,
    });
  }

  refund(tx: Tx, workspaceId: string, jobId: string, amount: number) {
    return this.applyLedgerEntry(tx, {
      workspaceId, delta: amount, reason: 'refund',
      refType: 'generation_job', refId: jobId, idempotencyKey: `job:${jobId}:refund`,
    });
  }

  grant(tx: Tx, workspaceId: string, amount: number, reason: string, idempotencyKey?: string, refType?: string, refId?: string) {
    return this.applyLedgerEntry(tx, { workspaceId, delta: amount, reason, idempotencyKey, refType, refId });
  }

  // part 2 在下一步追加:ensureMonthlyGrant / getBalance / listLedger
}
```

- [ ] **Step 4: 实现 CreditService(part 2:ensureMonthlyGrant + getBalance + listLedger)**

把 `// part 2 在下一步追加` 注释替换为:

```typescript
  private periodKey(now = new Date()): string {
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  // 懒发放:当前周期未发月额度则补发;同时对上一周期 monthly_grant 余量写 expire(不结转)。
  async ensureMonthlyGrant(tx: Tx, workspaceId: string, now = new Date()): Promise<void> {
    const period = this.periodKey(now);
    const key = `grant:${workspaceId}:${period}`;
    const already = await tx.creditLedger.findUnique({
      where: { workspaceId_idempotencyKey: { workspaceId, idempotencyKey: key } },
    });
    if (already) return;

    const ws = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId } });

    // 上一周期月额度余量过期(不结转):把"当前余额中仍属于上月 grant 的部分"清零。
    // 策略:expire 掉当前全部余额里的"非充值"部分——简化为:发放新 grant 前,
    // 若存在上一周期 grant,则将余额中不超过该 grant 金额的剩余部分写负分录。
    const prevGrant = await tx.creditLedger.findFirst({
      where: { workspaceId, reason: 'monthly_grant' },
      orderBy: { createdAt: 'desc' },
    });
    if (prevGrant) {
      const expireAmount = Math.min(ws.creditBalance, prevGrant.delta);
      if (expireAmount > 0) {
        await this.applyLedgerEntry(tx, {
          workspaceId, delta: -expireAmount, reason: 'expire',
          idempotencyKey: `expire:${workspaceId}:${period}`,
          metadata: { expiredFromPeriod: prevGrant.createdAt },
        });
      }
    }

    const allowance = planMonthlyAllowance(ws.plan);
    await this.applyLedgerEntry(tx, {
      workspaceId, delta: allowance, reason: 'monthly_grant', idempotencyKey: key,
      metadata: { period, plan: ws.plan },
    });
  }

  async getBalance(workspaceId: string, now = new Date()) {
    await this.prisma.$transaction((tx) => this.ensureMonthlyGrant(tx, workspaceId, now));
    const ws = await this.prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    return {
      balance: ws.creditBalance,
      plan: ws.plan,
      monthlyAllowance: planMonthlyAllowance(ws.plan),
      periodKey: this.periodKey(now),
    };
  }

  listLedger(workspaceId: string, range?: { from?: Date; to?: Date }) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (range?.from) createdAt.gte = range.from;
    if (range?.to) createdAt.lte = range.to;
    return this.prisma.creditLedger.findMany({
      where: { workspaceId, ...(Object.keys(createdAt).length ? { createdAt } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

- [ ] **Step 5: 建 BillingModule(暂只注册 service,controller 在 Task 6 加)**

Create `apps/api/src/billing/billing.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CreditService } from './credit.service';

@Module({
  providers: [CreditService],
  exports: [CreditService],
})
export class BillingModule {}
```

In `apps/api/src/app.module.ts`:
- import 区加:`import { BillingModule } from './billing/billing.module';`
- `imports: [...]` 数组加 `BillingModule`。

- [ ] **Step 6: 运行测试,确认通过**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --config ./test/jest-e2e.json --runInBand credit`
Expected: PASS,5 passed

- [ ] **Step 7: 提交**

```bash
git add apps/api/src/billing/credit.service.ts apps/api/src/billing/billing.module.ts apps/api/src/app.module.ts apps/api/test/credit.e2e-spec.ts
git commit -m "feat(api): CreditService with ledger entries, holds, refunds, grants, lazy monthly grant"
```

---

## Task 5: dispatch 预扣拦截 + cancel 退款

`dispatch` 改为事务:ensureMonthlyGrant → 创建 job → hold(余额不足抛 402 回滚)。`cancel` 在置终态同一事务内 refund。

**Files:**
- Modify: `apps/api/src/orchestration/orchestration.service.ts`
- Modify: `apps/api/src/orchestration/orchestration.module.ts`
- Test: `apps/api/test/orchestration.e2e-spec.ts`(加预扣 + 余额不足 + cancel 退款用例)

- [ ] **Step 1: 写失败测试**

In `apps/api/test/orchestration.e2e-spec.ts`,在现有 describe 内追加(顶部需有 `import { PrismaService }`,若无则加;helper 已有 `registerUser`):

```typescript
  it('dispatch holds credits; insufficient balance → 402 and no job created', async () => {
    // free plan = 100 credits;runtimeMode 非 desktop_multica、providerKind 非 multica → 每次 5 credits
    const dispatchOnce = (rt: string) => auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/orchestration/dispatch`)
      .send({ type: 'image', input: { p: 1 }, runtimeMode: rt, providerKind: 'codex' }), accessToken);

    const ok = await dispatchOnce('web').expect(201);
    expect(ok.body.value.job.status).toBe('pending');
    // 余额 100 → 扣 5 → 95
    const bal = await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/credits/balance`), accessToken).expect(200);
    expect(bal.body.value.balance).toBe(95);

    // 把余额耗尽:再扣 19 次(95/5=19)正好到 0
    for (let i = 0; i < 19; i++) await dispatchOnce('web').expect(201);
    const drained = await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/credits/balance`), accessToken).expect(200);
    expect(drained.body.value.balance).toBe(0);

    const jobsBefore = await prisma.generationJob.count({ where: { workspaceId } });
    const denied = await dispatchOnce('web').expect(402);
    expect(denied.body.error.code).toBe('insufficient_credits');
    expect(denied.body.error.metadata).toMatchObject({ required: 5, balance: 0 });
    const jobsAfter = await prisma.generationJob.count({ where: { workspaceId } });
    expect(jobsAfter).toBe(jobsBefore); // 事务回滚,job 未创建
  });

  it('cancel refunds the held credits', async () => {
    const d = await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/orchestration/dispatch`)
      .send({ type: 'image', input: { p: 1 }, runtimeMode: 'web', providerKind: 'codex' }), accessToken).expect(201);
    const jobId = d.body.value.job.id;
    const afterHold = await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/credits/balance`), accessToken).expect(200);
    expect(afterHold.body.value.balance).toBe(95);
    await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/orchestration/jobs/${jobId}/cancel`), accessToken).expect(201);
    const afterCancel = await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/credits/balance`), accessToken).expect(200);
    expect(afterCancel.body.value.balance).toBe(100); // 退回
  });
```

> 注:这些用例依赖 Task 6 的 `/credits/balance` 端点。若按顺序执行,Task 6 完成后这些断言才全绿;subagent-driven 模式下本任务先让前半(dispatch/cancel 行为)在 Task 6 完成后统一验证。实现步骤本身(预扣/退款逻辑)在本任务完成。

- [ ] **Step 2: 运行测试,确认失败**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --config ./test/jest-e2e.json --runInBand orchestration`
Expected: FAIL(余额未扣 / 端点 404）

- [ ] **Step 3: dispatch 改事务 + 预扣**

In `apps/api/src/orchestration/orchestration.service.ts`:
- import 区加:`import { CreditService } from '../billing/credit.service';` 和 `import { generationCredits } from '../billing/credit-cost';`
- 构造函数注入:`constructor(private prisma: PrismaService, private credit: CreditService) {}`
- 替换 `dispatch` 方法:

```typescript
  async dispatch(workspaceId: string, dto: DispatchDto, actor: Actor) {
    const amount = generationCredits({ runtimeMode: dto.runtimeMode, providerKind: dto.providerKind ?? null });
    return this.prisma.$transaction(async (tx) => {
      await this.credit.ensureMonthlyGrant(tx, workspaceId);
      const job = await tx.generationJob.create({
        data: {
          workspaceId, type: dto.type, input: dto.input as Prisma.InputJsonValue,
          status: 'pending', runtimeMode: dto.runtimeMode,
          projectId: dto.projectId ?? null, agentId: dto.agentId ?? null,
          providerKind: dto.providerKind ?? null,
        },
      });
      await this.credit.hold(tx, workspaceId, job.id, amount); // 不足 → 402,事务回滚
      await tx.auditLog.create({
        data: {
          workspaceId, action: 'task_dispatched', userId: actor.userId, actorRole: actor.role,
          targetType: 'generation_job', targetId: job.id,
          metadata: { runtimeMode: dto.runtimeMode, heldCredits: amount } as Prisma.InputJsonValue,
        },
      });
      return job;
    });
  }
```

- [ ] **Step 4: cancel 退款**

替换 `cancel` 方法为事务版(置终态 + refund 同一事务):

```typescript
  async cancel(workspaceId: string, id: string, actor: Actor) {
    const job = await this.getJob(workspaceId, id);
    if (TERMINAL.has(job.status)) throw validationError('Job already in a terminal state');
    const amount = generationCredits(job);
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.generationJob.update({
        where: { id }, data: { status: 'cancelled', finishedAt: new Date() },
      });
      await this.credit.refund(tx, workspaceId, id, amount);
      await tx.auditLog.create({
        data: {
          workspaceId, action: 'task_cancelled', userId: actor.userId, actorRole: actor.role,
          targetType: 'generation_job', targetId: id, metadata: { refundedCredits: amount } as Prisma.InputJsonValue,
        },
      });
      return u;
    });
    return updated;
  }
```

- [ ] **Step 5: OrchestrationModule 导入 BillingModule**

In `apps/api/src/orchestration/orchestration.module.ts`:
- import 区加:`import { BillingModule } from '../billing/billing.module';`
- `@Module({ imports: [BillingModule], controllers: [...], providers: [...] })`(加 imports 数组)。

- [ ] **Step 6: 类型检查**

Run: `cd apps/api && npx tsc --noEmit`
Expected: 无输出

- [ ] **Step 7: 提交(测试在 Task 6 后统一跑绿)**

```bash
git add apps/api/src/orchestration/orchestration.service.ts apps/api/src/orchestration/orchestration.module.ts apps/api/test/orchestration.e2e-spec.ts
git commit -m "feat(api): hold credits on dispatch (402 on insufficient), refund on cancel"
```

---

## Task 6: finalize capture/refund + 孤儿清理退款 + billing 端点

reconciliation finalize 接 capture/refund;孤儿 pending 超时退款;新增 billing controller 三端点。

**Files:**
- Modify: `apps/api/src/orchestration/reconciliation.service.ts`
- Create: `apps/api/src/billing/dto.ts`
- Create: `apps/api/src/billing/billing.controller.ts`
- Modify: `apps/api/src/billing/billing.module.ts`(注册 controller)
- Test: `apps/api/test/credit.e2e-spec.ts`(加 capture/refund via reconciliation + grant 端点权限 + 查询权限)

- [ ] **Step 1: 写失败测试(追加到 credit.e2e-spec.ts)**

在 `apps/api/test/credit.e2e-spec.ts` 的 describe 内追加。需要 `import * as request from 'supertest'`:

```typescript
  it('grant endpoint: owner can grant, non-member 403, idempotent', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'g1@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/credits/balance`)).expect(200); // grant 100
    const res = await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/credits/grant`)
      .send({ amount: 200, reason: 'recharge', idempotencyKey: 'pay:xyz' })).expect(201);
    expect(res.body.value.balance).toBe(300);
    // 幂等:同 key 不重复入账
    await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/credits/grant`)
      .send({ amount: 200, reason: 'recharge', idempotencyKey: 'pay:xyz' })).expect(201);
    const bal = await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/credits/balance`)).expect(200);
    expect(bal.body.value.balance).toBe(300);

    // 非成员 403
    const other = await registerUser(app, 'g2@test.dev');
    await request(app.getHttpServer()).post(`/workspaces/${workspaceId}/credits/grant`)
      .set('Authorization', `Bearer ${other.accessToken}`).send({ amount: 1, reason: 'recharge' }).expect(403);
  });

  it('ledger endpoint lists entries for members', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'l1@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/credits/balance`)).expect(200);
    const res = await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/credits/ledger`)).expect(200);
    expect(Array.isArray(res.body.value)).toBe(true);
    expect(res.body.value.some((e: any) => e.reason === 'monthly_grant')).toBe(true);
  });
```

并在 `apps/api/test/reconciliation.e2e-spec.ts` 追加 capture/refund 用例(该文件已有 `seedJob`、`fake`、`ReconciliationService`)。seedJob 默认 `providerKind:'codex'`+`runtimeMode:'desktop_multica'`(成本=1)。需先给 workspace 发放余额并 hold:

```typescript
  it('finalize succeeded → capture (delta 0); failed → refund restores balance', async () => {
    const credit = app.get(CreditService);
    // succeeded:先 hold 再 capture,余额=grant-1
    const s = await seedJob({ status: 'pending' });
    await app.get(PrismaService).$transaction((tx) => credit.hold(tx, workspaceId, s.job.id, 1));
    fake.snap = { status: 'succeeded', progress: 100, raw: {} };
    fake.artifacts = [];
    await app.get(ReconciliationService).reconcileOnce();
    const capLedger = await app.get(PrismaService).creditLedger.findFirst({ where: { workspaceId, refId: s.job.id, reason: 'capture' } });
    expect(capLedger!.delta).toBe(0);

    // failed:hold 后 finalize failed → refund
    const f = await seedJob({ status: 'pending' });
    const balBefore = (await credit.getBalance(workspaceId)).balance;
    await app.get(PrismaService).$transaction((tx) => credit.hold(tx, workspaceId, f.job.id, 1));
    fake.snap = { status: 'failed', progress: 0, raw: {} };
    await app.get(ReconciliationService).reconcileOnce();
    const balAfter = (await credit.getBalance(workspaceId)).balance;
    expect(balAfter).toBe(balBefore); // hold-1 然后 refund+1
  });
```

> 注:reconciliation.e2e-spec.ts 顶部需 `import { CreditService } from '../src/billing/credit.service';`,且 `workspaceId` 需是有 member 的真实 workspace(若现有 seedJob 用裸 workspace,需改用 registerUser 的 workspaceId 或先发放余额——按现有该文件的 seed 方式适配)。

- [ ] **Step 2: 运行测试,确认失败**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --config ./test/jest-e2e.json --runInBand credit reconciliation`
Expected: FAIL(端点 404 / capture 分录不存在)

- [ ] **Step 3: finalize 接 capture/refund**

In `apps/api/src/orchestration/reconciliation.service.ts`:
- 构造函数注入 CreditService:`@Optional()` 不需要(CreditService 必有)。改为:

```typescript
  constructor(
    private prisma: PrismaService,
    private credit: CreditService,
    @Optional() @Inject(MULTICA_SERVER_CLIENT) private client: MulticaServerClient | null,
  ) {}
```

- import 区加:`import { CreditService } from '../billing/credit.service';`
- 在 `finalize` 的事务内(`tx.generationJob.update` 之后、audit 之前)加:

```typescript
      if (terminal === 'succeeded') {
        await this.credit.capture(tx, job.workspaceId, job.id);
      } else {
        await this.credit.refund(tx, job.workspaceId, job.id, generationCredits(job));
      }
```

- [ ] **Step 4: 孤儿清理退款**

替换 `reconcileOnce` 顶部的 bulk orphan `updateMany`(第 34-37 行)为"逐个 fail + refund":

```typescript
    const orphans = await this.prisma.generationJob.findMany({
      where: { status: 'pending', externalTaskId: null, createdAt: { lt: new Date(now.getTime() - ORPHAN_PENDING_TIMEOUT_MS) } },
    });
    for (const orphan of orphans) {
      await this.prisma.$transaction(async (tx) => {
        const fresh = await tx.generationJob.findUnique({ where: { id: orphan.id } });
        if (!fresh || fresh.status !== 'pending') return;
        await tx.generationJob.update({ where: { id: orphan.id }, data: { status: 'failed', error: 'dispatch not confirmed', finishedAt: now } });
        await this.credit.refund(tx, orphan.workspaceId, orphan.id, generationCredits(orphan));
      });
    }
```

- [ ] **Step 5: billing dto + controller**

Create `apps/api/src/billing/dto.ts`:

```typescript
import { IsInt, IsObject, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class GrantCreditDto {
  @IsInt() @IsPositive() amount!: number;
  @IsString() @MinLength(1) reason!: string;
  @IsOptional() @IsString() refType?: string;
  @IsOptional() @IsString() refId?: string;
  @IsOptional() @IsString() idempotencyKey?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class LedgerRangeQuery {
  @IsOptional() @Type(() => Date) from?: Date;
  @IsOptional() @Type(() => Date) to?: Date;
}
```

Create `apps/api/src/billing/billing.controller.ts`:

```typescript
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { permissionDenied } from '../common/errors';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreditService } from './credit.service';
import { GrantCreditDto, LedgerRangeQuery } from './dto';

const GRANT_ROLES = new Set(['owner', 'admin']);

@Controller('workspaces/:workspaceId/credits')
export class BillingController {
  constructor(private credit: CreditService, private prisma: PrismaService) {}

  @Get('balance')
  async balance(@WorkspaceId() ws: string) {
    return { value: await this.credit.getBalance(ws) };
  }

  @Get('ledger')
  async ledger(@WorkspaceId() ws: string, @Query() q: LedgerRangeQuery) {
    return { value: await this.credit.listLedger(ws, q) };
  }

  @Post('grant')
  async grant(@WorkspaceId() ws: string, @Body() dto: GrantCreditDto, @CurrentUser() user: { userId: string; role?: string }) {
    if (!user.role || !GRANT_ROLES.has(user.role)) throw permissionDenied('Only owner/admin can grant credits');
    await this.prisma.$transaction((tx) => this.credit.grant(tx, ws, dto.amount, dto.reason, dto.idempotencyKey, dto.refType, dto.refId));
    return { value: await this.credit.getBalance(ws) };
  }
}
```

- [ ] **Step 6: BillingModule 注册 controller**

In `apps/api/src/billing/billing.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CreditService } from './credit.service';
import { BillingController } from './billing.controller';

@Module({
  controllers: [BillingController],
  providers: [CreditService],
  exports: [CreditService],
})
export class BillingModule {}
```

- [ ] **Step 7: 运行全部相关 e2e,确认通过**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --config ./test/jest-e2e.json --runInBand credit orchestration reconciliation`
Expected: 全 PASS(含 Task 5 的 dispatch/cancel 用例此时也应绿)

- [ ] **Step 8: 跑后端全量 e2e 确认无回归**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test`
Expected: 全 PASS

- [ ] **Step 9: 提交**

```bash
git add apps/api/src/orchestration/reconciliation.service.ts apps/api/src/billing/dto.ts apps/api/src/billing/billing.controller.ts apps/api/src/billing/billing.module.ts apps/api/test/credit.e2e-spec.ts apps/api/test/reconciliation.e2e-spec.ts apps/api/test/orchestration.e2e-spec.ts
git commit -m "feat(api): finalize capture/refund, orphan refund, billing credits endpoints"
```

---

## Task 7: 前端 creditRepository(后端余额真相源 + 本地兜底)

**Files:**
- Create: `src/lib/data/creditRepository.ts`
- Test: `scripts/credit-repository.test.ts`
- Modify: `package.json`(注册 test:credit-repo + 纳入 test:p0-specialized)

- [ ] **Step 1: 写失败测试**

Create `scripts/credit-repository.test.ts`:

```typescript
import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setCreditApiClientForTest,
  hydrateCreditBalance,
  getCreditBalanceSnapshot,
} from '../src/lib/data/creditRepository.ts';

function fakeApi(configured: boolean, balance: number): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'credits/balance') {
        return { ok: true, value: { balance, plan: 'free', monthlyAllowance: 100, periodKey: '2026-06' } } as any;
      }
      return { ok: true, value: [] } as any;
    },
    post: async () => ({ ok: true, value: {} }) as any,
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  };
}

async function run() {
  // 后端配置时:hydrate 后读后端快照
  __setCreditApiClientForTest(fakeApi(true, 73));
  await hydrateCreditBalance({ workspaceId: 'ws1' });
  const snap = getCreditBalanceSnapshot({ workspaceId: 'ws1' });
  assert.equal(snap?.balance, 73);
  assert.equal(snap?.monthlyAllowance, 100);

  // 未配置后端:快照为 null(调用方回退本地 calculateBillingUsage)
  __setCreditApiClientForTest(fakeApi(false, 0));
  await hydrateCreditBalance({ workspaceId: 'ws2' });
  assert.equal(getCreditBalanceSnapshot({ workspaceId: 'ws2' }), null);

  console.log('credit repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `tsx scripts/credit-repository.test.ts`
Expected: FAIL —— 模块不存在

- [ ] **Step 3: 实现 creditRepository**

Create `src/lib/data/creditRepository.ts`:

```typescript
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';

export interface CreditBalanceSnapshot {
  balance: number;
  plan: string;
  monthlyAllowance: number;
  periodKey: string;
}

export interface CreditLedgerEntry {
  id: string;
  delta: number;
  reason: string;
  refType?: string | null;
  refId?: string | null;
  balanceAfter: number;
  createdAt: string;
}

export interface CreditRepositoryContext {
  workspaceId: string;
}

let creditApiClient: ApiClient = defaultApiClient;
export function __setCreditApiClientForTest(client: ApiClient): void { creditApiClient = client; }

const balanceCache = new Map<string, CreditBalanceSnapshot>(); // key=workspaceId

export async function hydrateCreditBalance(context: CreditRepositoryContext): Promise<void> {
  if (!creditApiClient.configured) return;
  const res = await creditApiClient.get<CreditBalanceSnapshot>(context.workspaceId, 'credits/balance');
  if (res.ok && res.value) balanceCache.set(context.workspaceId, res.value);
}

// 后端快照;未配置或未 hydrate 时返回 null → 调用方回退本地 calculateBillingUsage。
export function getCreditBalanceSnapshot(context: CreditRepositoryContext): CreditBalanceSnapshot | null {
  if (!creditApiClient.configured) return null;
  return balanceCache.get(context.workspaceId) ?? null;
}

export async function listCreditLedger(context: CreditRepositoryContext): Promise<CreditLedgerEntry[]> {
  if (!creditApiClient.configured) return [];
  const res = await creditApiClient.get<CreditLedgerEntry[]>(context.workspaceId, 'credits/ledger');
  return res.ok && Array.isArray(res.value) ? res.value : [];
}

export async function grantCredits(
  context: CreditRepositoryContext,
  body: { amount: number; reason: string; idempotencyKey?: string; refType?: string; refId?: string },
): Promise<CreditBalanceSnapshot | null> {
  if (!creditApiClient.configured) return null;
  const res = await creditApiClient.post<CreditBalanceSnapshot>(context.workspaceId, 'credits/grant', body);
  if (res.ok && res.value) { balanceCache.set(context.workspaceId, res.value); return res.value; }
  return null;
}
```

- [ ] **Step 4: 运行测试,确认通过**

Run: `tsx scripts/credit-repository.test.ts`
Expected: `credit repository passed`

- [ ] **Step 5: 注册到 package.json**

In `package.json` scripts:
- 加一行(在 test:orchestration-service 后):`"test:credit-repo": "tsx scripts/credit-repository.test.ts",`
- `test:p0-specialized` 末尾追加 ` && npm run test:credit-repo`

- [ ] **Step 6: 提交**

```bash
git add src/lib/data/creditRepository.ts scripts/credit-repository.test.ts package.json
git commit -m "feat(web): creditRepository reads backend balance with local fallback"
```

---

## Task 8: 前端 UI 接线(拦截 / 余额 / 充值切后端真相源)

把配额拦截改为捕获后端 402;BillingView 余额读后端快照、充值调 grant。保留 apiClient 未配置时的本地兜底。

**Files:**
- Modify: `src/components/AssetsView.tsx`(拦截点,约 L114)
- Modify: `src/components/GlobalAgentDispatcherModal.tsx`(拦截点,约 L120)
- Modify: `src/components/BillingView.tsx`(余额展示 L159 / 充值 L367,431,512)

> 这些是已存在的大组件。改动遵循:**最小侵入**——只在已调用 `canStartBillableGeneration` / `calculateBillingUsage` / `createWorkspaceFinancialRecord` 的点切换数据源,不重构组件其余部分。实现者须先 Read 每个文件确认当前确切行号与上下文,再 Edit。

- [ ] **Step 1: BillingView 余额读后端快照(本地兜底)**

In `src/components/BillingView.tsx`:
- 顶部 import 加:`import { hydrateCreditBalance, getCreditBalanceSnapshot } from '../lib/data/creditRepository';`
- 在组件挂载/workspace 变更的 effect 里调 `void hydrateCreditBalance({ workspaceId })`。
- 余额展示处(现用 `calculateBillingUsage(...).remainingCredits`,约 L159/L583):改为优先用后端快照:

```typescript
const backendSnapshot = getCreditBalanceSnapshot({ workspaceId });
const remainingCredits = backendSnapshot?.balance ?? calculateBillingUsage(billingInput).remainingCredits;
```

(保留 `calculateBillingUsage` 作为 `backendSnapshot === null` 时的兜底,变量名 `billingInput` 沿用该组件现有构造。)

- [ ] **Step 2: BillingView 充值/兑码调 grant 端点**

In `src/components/BillingView.tsx`,充值成功(约 L367)、兑码成功(约 L431/L512)写 `createWorkspaceFinancialRecord` 处,**追加**后端入账(不删除本地记录,作离线兜底):

```typescript
import { grantCredits } from '../lib/data/creditRepository';
// 充值成功后:
await grantCredits({ workspaceId }, { amount: rechargedPoints, reason: 'recharge', idempotencyKey: `pay:${paymentRecordId}` });
await hydrateCreditBalance({ workspaceId });
// 兑码成功后:
await grantCredits({ workspaceId }, { amount: couponPoints, reason: 'coupon', idempotencyKey: `coupon:${couponCode}` });
await hydrateCreditBalance({ workspaceId });
```

(`rechargedPoints`/`paymentRecordId`/`couponPoints`/`couponCode` 沿用该组件现有变量;实现者按实际命名适配。)

- [ ] **Step 2.5: 类型检查 + 跑前端测试基线**

Run: `npm run lint`
Expected: 无输出(通过)

- [ ] **Step 3: AssetsView 拦截改捕获后端 402**

In `src/components/AssetsView.tsx`(约 L114,现调 `canStartBillableGeneration` 阻断):
- 保留 `canStartBillableGeneration` 作为**派发前即时预检提示**(UX),不作硬阻断。
- 实际派发(dispatch 调用处)用 try/catch 捕获后端错误,`error.code === 'insufficient_credits'` 时弹充值引导。dispatch 经由 runtime/orchestrationService → apiClient,错误以 `DataBackendResult.error.code` 形式返回(参见 apiClient.ts L60-62,402 的 body.error.code 即 `insufficient_credits`)。

```typescript
// 派发结果处理(orchestrationService.dispatchTask 内部走 apiClient,失败抛 Error('dispatch failed');
// 需让 dispatchTask 在 !dispatched.ok 时透出 error.code —— 见 Step 3b)
```

- [ ] **Step 3b: 让 dispatchTask 透出后端错误码**

In `src/runtime/orchestrationService.ts`,`dispatchTask` 当前在 `!dispatched.ok` 时 `throw new Error('dispatch failed')`(吞掉了 code)。改为透出 code:

```typescript
      if (!dispatched.ok || !dispatched.value) {
        const err = new Error(dispatched.ok ? 'dispatch failed' : dispatched.error.message) as Error & { code?: string };
        if (!dispatched.ok) err.code = dispatched.error.code;
        throw err;
      }
```

调用方(AssetsView / GlobalAgentDispatcherModal)即可 `catch (e) { if ((e as any).code === 'insufficient_credits') showRechargePrompt(); }`。

- [ ] **Step 4: GlobalAgentDispatcherModal 同样处理**

In `src/components/GlobalAgentDispatcherModal.tsx`(约 L120):同 Step 3,本地 `canStartBillableGeneration` 降级为预检提示,派发 catch `insufficient_credits` 弹充值引导。

- [ ] **Step 5: 类型检查 + build**

Run: `npm run lint && npm run build`
Expected: lint 无输出;build 成功(既有 chunk 大小警告可忽略)

- [ ] **Step 6: 跑受影响的前端脚本测试**

Run: `npm run test:orchestration-service && npm run test:credit-repo && npm run test:saas-foundation`
Expected: 全 passed

- [ ] **Step 7: 提交**

```bash
git add src/components/AssetsView.tsx src/components/GlobalAgentDispatcherModal.tsx src/components/BillingView.tsx src/runtime/orchestrationService.ts
git commit -m "feat(web): wire credit balance + 402 insufficient_credits interception to backend"
```

---

## Task 9: 全量验收

- [ ] **Step 1: 后端全量 e2e**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test`
Expected: 全 PASS(原 43 + 新增 credit 套件)

- [ ] **Step 2: 前端 P0 specialized(含新 credit-repo)**

Run: `npm run test:p0-specialized`
Expected: 全 passed

- [ ] **Step 3: lint + build**

Run: `npm run lint && npm run build`
Expected: lint 无输出;build 成功

- [ ] **Step 4: 对账自检(手动确认设计不变量)**

确认:任意一连串 dispatch/cancel/grant/reconcile 后,某 workspace 的 `Workspace.creditBalance` 始终等于其 `CreditLedger` 全部 delta 之和(已由 credit.e2e-spec "balance snapshot equals sum of ledger deltas" 用例覆盖)。

- [ ] **Step 5: 最终提交(若有验收期间的修复)**

```bash
git add -A
git commit -m "test(billing): full acceptance — backend e2e + frontend p0 + lint + build green"
```

---

## 自检覆盖映射(spec → task)

- spec §2 数据模型 → Task 2
- spec §3 CreditService / applyLedgerEntry / 能力方法 / 懒发放 → Task 4
- spec §3.3 capture 简化(delta=0)→ Task 4 + Task 6
- spec §4.1 dispatch 预扣 → Task 5
- spec §4.2 finalize capture/refund → Task 6
- spec §4.3 cancel refund → Task 5
- spec §4.4 三端点 → Task 6
- spec §4.5 insufficientCredits 402 → Task 3
- spec §5 前端真相源切换 → Task 7 + Task 8
- spec §6 测试策略 → 各 Task 的 e2e/tsx + Task 9
- spec §1 成本模型共享 → Task 1

