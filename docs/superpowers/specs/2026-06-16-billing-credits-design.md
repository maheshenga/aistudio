# ④ 计费 / 积分余额扣减系统 — 设计文档

- 日期:2026-06-16
- 状态:设计已确认,待写实现计划
- 子项目:④(SaaS 产品化 6 子项目之一;①②③ 已交付)
- 分支基线:`main`(③ 已合并)

## 1. 背景与目标

当前余额完全在前端 localStorage 用 `billingRepository.calculateBillingUsage` 计算:
余额 = `plan 月额度(getPlanMonthlyAllowance)+ 充值/兑码(financialRepository,localStorage)− 已消耗(本地累加)`。

问题:

- 余额无后端真相源,清缓存即丢、跨设备不同步。
- 超额拦截只在前端软校验(`canStartBillableGeneration`),可绕过 → 可超卖。
- 后端 `UsageEvent` 虽已记录真实 credits(③ 末尾修复),但只是"用量明细",不构成"余额"。
- 充值/兑码写入路径只在前端,无服务端持久化。

**目标(完整方案 C):** 把余额、扣减、配额拦截、充值入账做成**后端真相源**,采用**预扣+结算(authorize/capture)**模型杜绝超卖,余额变动走**可对账的流水账本**。真实支付网关集成不在本 spec 范围(留作独立后续子项目)。

## 2. 数据模型

混合模型:**`CreditLedger` 流水账本(真相源)+ `Workspace.creditBalance` 快照(查询缓存)**。

### 2.1 Prisma schema 变更(走 `prisma migrate dev`)

`Workspace` 新增:

```prisma
creditBalance Int @default(0)   // 余额快照 = 账本 delta 之和;高频校验读此字段
```

新增模型:

```prisma
model CreditLedger {
  id             String   @id @default(cuid())
  workspaceId    String
  delta          Int      // 正=入账(充值/兑码/月额度),负=出账(预扣/过期)
  reason         String   // monthly_grant | expire | hold | capture | refund | recharge | coupon | adjustment
  refType        String?  // 关联实体类型,如 "generation_job" | "payment"
  refId          String?  // 关联实体 id
  idempotencyKey String?  // 幂等键,见 2.2
  balanceAfter   Int      // 本笔分录后的余额快照(对账锚点)
  metadata       Json?
  createdAt      DateTime @default(now())

  workspace      Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, idempotencyKey])
  @@index([workspaceId, createdAt])
  @@index([workspaceId, reason])
}
```

`Workspace` 增加反向关系 `creditLedger CreditLedger[]`。

### 2.2 幂等键约定

`@@unique([workspaceId, idempotencyKey])` 保证同一变动只发生一次:

| reason | idempotencyKey | 触发方 |
|---|---|---|
| monthly_grant / expire | `grant:<workspaceId>:<YYYY-MM>` | 懒发放 |
| hold | `job:<jobId>:hold` | dispatch 预扣 |
| capture | `job:<jobId>:capture` | finalize succeeded |
| refund | `job:<jobId>:refund` | finalize failed/cancelled / cancel / 孤儿清理 |
| recharge/coupon/adjustment | 调用方传入(如 `payment:<paymentId>`) | grant 端点 |

`idempotencyKey` 为 null 时不做去重(预留给一次性调整等,默认所有自动分录都带键)。

### 2.3 UsageEvent 不变

`UsageEvent` 保持原样,继续记"用量明细"(时长、模块、providerKind)。职责切分:
**UsageEvent = 用了多少算力(分析);CreditLedger = 余额怎么变的(财务对账)**。两者通过 `jobId`/`refId` 关联。

## 3. CreditService(余额服务与扣减事务)

新建 `apps/api/src/billing/credit.service.ts`,所有余额变动的唯一入口。

### 3.1 私有核心 `applyLedgerEntry`

```
applyLedgerEntry(tx, { workspaceId, delta, reason, refType?, refId?, idempotencyKey?, metadata? }):
  1. 若有 idempotencyKey:查 (workspaceId, idempotencyKey) 已存在 → 直接返回现有分录(幂等短路)
  2. 若 delta < 0(出账):条件原子更新(用 updateMany,因 where 含非唯一字段)
       updateMany Workspace where { id, creditBalance: { gte: -delta } } data { creditBalance: { decrement: -delta } }
     返回 { count };count === 0 → 抛 insufficientCredits(402)(余额不足或并发竞争)
     否则重读 workspace.creditBalance 得 balanceAfter
  3. 若 delta >= 0(入账):update Workspace { creditBalance: { increment: delta } } 读回 balanceAfter
  4. create CreditLedger 分录(balanceAfter 落库)
  5. 返回分录
```

全程在调用方传入的 `$transaction` 内执行。负 delta 用**条件原子更新**(`where creditBalance >= amount`)而非"先读后写",从根本上杜绝并发超卖。

### 3.2 对外能力(薄封装)

| 方法 | delta | reason | 幂等键 | 触发 |
|---|---|---|---|---|
| `ensureMonthlyGrant(tx, ws)` | +plan额度(先对上月 grant 余量写 expire 负分录) | monthly_grant / expire | `grant:<ws>:<YYYY-MM>` | 校验/查询前 |
| `hold(tx, ws, jobId, amount)` | −amount | hold | `job:<id>:hold` | dispatch |
| `capture(tx, ws, jobId)` | 0 | capture | `job:<id>:capture` | finalize succeeded |
| `refund(tx, ws, jobId, amount)` | +amount | refund | `job:<id>:refund` | finalize failed/cancelled / cancel / 孤儿 |
| `grant(tx, ws, amount, reason, key)` | +amount | recharge/coupon/adjustment | 调用方 | 入账端点 |
| `getBalance(ws)` | — | 读快照(先 ensureMonthlyGrant) | — | 查询端点 |

### 3.3 capture 的简化(确定性成本模型)

成本模型确定性(只依赖 `runtimeMode`/`providerKind`,dispatch 时已知)→ **预估=实际,无补差**。故 hold 时已扣足额,capture 仅写 delta=0 分录,作"此 hold 已结算"的审计锚点 + 占用幂等键(防后续误退款)。

### 3.4 月额度懒发放(不结转)

无定时任务依赖。`ensureMonthlyGrant` 在每次校验/查询前调用:检查当前周期 `YYYY-MM` 的 `monthly_grant` 是否已发放(幂等键命中即已发)。未发放时,同一事务内:
1. 若存在上一周期 grant 的剩余额度,写一笔 `expire` 负分录(**月额度不结转**;充值部分不过期)。
2. 写当月 `monthly_grant` 正分录(金额 = `getPlanMonthlyAllowance(plan)` 对应的后端常量)。

> 注:plan→月额度的映射需在后端有权威常量表(对齐前端 `billingRepository` 默认值 free=100/pro=5000/business=20000/enterprise=100000)。

## 4. 集成点

### 4.1 dispatch 预扣拦截(`orchestration.service.ts`)

```
dispatch(workspaceId, dto, actor):  // 整体 $transaction
  1. ensureMonthlyGrant(tx, workspaceId)
  2. amount = generationCredits(dto.runtimeMode, dto.providerKind)   // 共享成本模型
  3. job = create GenerationJob (pending)
  4. creditService.hold(tx, workspaceId, job.id, amount)  // 不足 → 402,事务回滚,job 不落库
  5. audit task_dispatched(metadata.heldCredits = amount)
  返回 job
```

`generationCredits` 从 `reconciliation.service.ts` 抽到共享 `apps/api/src/billing/credit-cost.ts`,dispatch 与 finalize 共用同一算法(desktop_multica=1 / multica=3 / 否则=5)。

### 4.2 finalize 结算(`reconciliation.service.ts`,已有 $transaction)

```
succeeded        → creditService.capture(tx, ws, jobId)            // delta=0 标记结算
failed/cancelled → creditService.refund(tx, ws, jobId, heldAmount) // 退还预扣
```

`heldAmount` 由确定性成本模型重算(`generationCredits(job)`)。现有 UsageEvent 记录逻辑不变。

### 4.3 cancel 路径(`orchestration.service.ts` 的 cancel)

直接置 cancelled 的 cancel 端点路径,在置终态的同一事务内触发 `refund`(幂等键保证与 reconciliation 不重复退)。

### 4.4 新增 API 端点(新建 `apps/api/src/billing/` 模块)

| 端点 | 方法 | 权限 | 说明 |
|---|---|---|---|
| `GET /workspaces/:id/credits/balance` | 读 | 成员 | `{ balance, plan, monthlyAllowance, periodKey }`(先 ensureMonthlyGrant) |
| `GET /workspaces/:id/credits/ledger` | 读 | 成员 | 账本分录列表(时间范围/分页) |
| `POST /workspaces/:id/credits/grant` | 写 | **owner/admin** | body `{ amount, reason, refType?, refId?, idempotencyKey? }` → 入账 |

权限用现有 `req.member.role`(TenantGuard 注入)。grant 校验 role ∈ {owner, admin},否则 `permissionDenied`(403)。

### 4.5 错误类型(`common/errors.ts`)

新增 `insufficientCredits(msg, metadata?)` → DomainError,`AllExceptionsFilter` 映射 **402** + code `insufficient_credits`,metadata 带 `{ required, balance }` 供前端弹充值引导。

## 5. 前端真相源切换(`src/`)

### 5.1 新建 `src/lib/data/creditRepository.ts`

对齐现有 repository 模式(workspace-scoped、apiClient 优先 + localStorage 兜底):

- `hydrateCreditBalance(context)` → `apiClient.get(ws, 'credits/balance')`,缓存。
- `getCreditBalance(context)` → 后端余额快照;`apiClient.configured === false` 时回退现有 `calculateBillingUsage` 本地算法。
- `listCreditLedger(context)` → `apiClient.get(ws, 'credits/ledger')`。

### 5.2 配额拦截改为后端真相

`AssetsView.tsx`、`GlobalAgentDispatcherModal.tsx` 现调本地 `canStartBillableGeneration`。改为:**乐观 dispatch → 捕获 402 `insufficient_credits` 作为权威拦截** → 弹充值引导。本地 `canStartBillableGeneration` 降级为**派发前即时预检提示**(UX),最终裁决以后端 402 为准。理由:后端 hold 是唯一防超卖真相,前端预检不能作安全边界。

### 5.3 BillingView

余额面板改读 `getCreditBalance`(后端快照);充值/兑码成功后改调 `POST credits/grant`(取代纯写 localStorage 的 `createWorkspaceFinancialRecord`)。支付校验仍 mock(真支付留独立子项目)。

### 5.4 兼容边界

`apiClient.configured === false`(纯前端 demo / web mock)时全部回退现有 localStorage 行为,不破坏 `test:saas-foundation` 等前端脚本测试假设。

## 6. 测试策略

后端 Jest e2e 打真实 Docker Postgres(`aistudio-pg`:5433,`--runInBand`);前端 tsx 脚本 + `node:assert/strict`。

### 6.1 后端 e2e — 新建 `apps/api/test/credit.e2e-spec.ts`

- **ensureMonthlyGrant**:首查发放当月 grant(free=100);同周期重复不重发;跨周期发新 grant 且对上月余量写 expire(不结转)。
- **hold**:dispatch 扣减,快照减少,账本 +hold 分录;余额不足 dispatch 返回 **402 insufficient_credits** 且 job 未创建(回滚)。
- **防超卖(核心)**:余额恰够 N 个,连续 dispatch N+1,第 N+1 个 402;快照不为负;分录数正确。
- **capture**:succeeded → capture 分录(delta=0),余额不变;重复 reconcile 幂等。
- **refund**:failed/cancelled → refund 正分录,余额复原;cancel 端点路径也退;重复不重退。
- **孤儿 hold**:pending 超时→failed 触发 refund。
- **grant 端点**:owner 入账(余额增、账本 +分录);非 owner/admin → 403;幂等键重复不重入。
- **查询端点**:成员可读余额/账本;非成员 403。
- **对账**:一连串操作后 `creditBalance` 快照 === 账本 delta 之和。

### 6.2 前端 tsx — 新建 `scripts/credit-repository.test.ts`

- `getCreditBalance`:apiClient 配置时读后端;未配置时回退本地 `calculateBillingUsage`。
- 拦截语义:模拟 dispatch 抛 402 → 拦截路径触发。
- 纳入 `test:p0-specialized` 聚合。

### 6.3 回归保护

`reconciliation.e2e-spec.ts`、`orchestration.e2e-spec.ts`(dispatch/finalize 改动后的回归网)、`saas-foundation.test.ts` 必须仍全绿。

### 6.4 验收线

后端全 e2e + 前端 `test:p0-specialized` + `npm run lint` + `npm run build`。

## 7. 明确不在范围(YAGNI)

- 真实支付网关(Stripe 等)集成、webhook、退款、税务 → 独立后续子项目。
- 非确定性成本(按实际算力/token 计费)→ 当前确定性模型够用,预估=实际。
- 月额度结转 → 明确不结转。
- issueId/taskId fallback 语义修复 → 与本 spec 无关,需 Multica 外部契约信息,另议。
