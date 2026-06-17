# ⑤b-2 特殊逻辑业务域上后端 — 设计文档

- 日期:2026-06-17
- 状态:设计已确认,待写实现计划
- 子项目:⑤b-2(⑤b「剩余 16 域迁后端」的第 2 子批;⑤a 通用基础设施 + ⑤b-1 简单 CRUD 批已交付)
- 分支基线:`main`(⑤a + ⑤b-1 commit 在本地 main,未 push)

## 1. 背景与目标

⑤a 已交付通用 workspace 资源基础设施(后端 `WorkspaceResourceService<T>` 泛型基类 + `createResourceController` 工厂;前端 `createWorkspaceResourceRepository<T>` 工厂)。⑤b-1 用该基础设施把 6 个简单 CRUD 域(campaign/announcement/agency/risk/media/keyword)端到端迁后端,验证了「接一个域」的稳定模板:后端工厂四件套 + 前端写穿透/cache/hydrate,UI 零改动、保留全部现有导出,后端全 e2e 22 suites/89 passed。

⑤b 把剩余 16 个 local-only repository 迁后端,拆子批顺序交付。本 spec 是 ⑤b-2:把有「特殊逻辑」(状态机派生时间戳、唯一默认约束、纯派生字段、runtime 外键)的域迁后端。

**目标:** 验证 ⑤b-1 的工厂模板对「带派生/聚合逻辑」的域是否依然适用——通过把所有派生/聚合逻辑保留在前端、后端仍是纯工厂四件套,证明无需为这些域引入后端 override 或自定义端点。

## 2. 范围与核心决策

**本批 4 域:** ticket(工单)、payment(支付方式)、taxEvent(税务事件)、task(看板任务)。

**4 项核心决策(本轮 brainstorm 确认):**

1. **financial 域拆出本批**,作为独立子批 ⑤b-2.5 后续单独 spec。理由:financial 与 ④ 已上线的 credit/usage 后端耦合最深(`hasWorkspaceCouponRedemption` 兑券幂等、`sumWorkspaceRechargeCredits`/`sumWorkspacePromotionalCredits` 积分聚合),且兑券幂等若留前端会防不住并发重复兑券——这是真正的架构问题,塞进「特殊逻辑批」会让本 spec 同时背负两种复杂度。先做有明确模式的 4 域。

2. **所有 summarize / calculate / daysUntil 留前端派生**,后端只存原始字段、零聚合端点(严格延续 ⑤b-1 原则)。`daysUntil`(taxEvent)是纯派生值,后端干脆不存,前端 normalize 时按"现在"算——留前端反而更准(后端存了会过期)。

3. **payment `ensureSingleDefault` 留前端**:create/update 时前端把其它方法 isDefault 置 false,再对每条变更发 PATCH(多条写穿透)。**task 批量删 `deleteWorkspaceTasks(ids[])` 照搬 ⑤b-1 campaign**:前端对每个 id 发单条 `DELETE /:id`(工厂已提供单条删除路由)。全程套工厂、零自定义端点。

4. **task 的 runtime 外键字段**(runtimeMode/runtimeProviderKind/runtimeTaskId/runtimeStatus/agentId/runtimeId/externalRef/lastRuntimeEventAt)当普通可空列存,前端写穿透;本批不碰 ③ 的 runtime→task 同步链路。runtime 如何驱动 task 状态是 ③ 的职责,本批只保证这些字段能正确持久化往返。

**核心原则(沿用 ⑤a + ⑤b-1):**
- 每域套基础设施工厂四件套,**唯一允许的 override 是 buildWhere status/column 过滤**(同 ⑤b-1)。
- summarize/calculate/daysUntil/ensureDefault/ensureSingleDefault 全部作为前端派生计算 / localStorage 兜底保留,后端零额外端点。
- 后端空表起步,不迁历史数据、不种子。
- 前端保留全部现有导出签名,UI 零改动。
- 时间戳:DB 用 `DateTime?`,前端 normalize 转 epoch ms(兼容现有 interface)。明文敏感值(payment accountNumber)绝不上后端,前端派生 last4/credentialRef 后只发派生值。

**明确不在范围(YAGNI):**
- financial 域(→ ⑤b-2.5 独立子批)。
- ⑤b-3 settings、⑤b-4 加密批的域。
- 后端 DB 端聚合 / 搜索 / 批量 / 幂等端点。
- 演示种子数据迁移、localStorage 历史数据迁移。
- 软删除 / 实时推送 / 增量同步 / runtime→task 后端回写通道。

## 3. 后端 Prisma 模型

**通用列(每模型都有):** `id String @id @default(cuid())`、`workspaceId String`、`createdAt DateTime @default(now())`、`updatedAt DateTime @updatedAt`、`metadata Json?`;`workspace Workspace @relation(fields:[workspaceId], references:[id], onDelete: Cascade)`;`@@index([workspaceId, createdAt])`。下列仅各域差异字段。

### 3.1 Ticket
```prisma
model Ticket {
  id                   String    @id @default(cuid())
  workspaceId          String
  requesterName        String
  requesterEmail       String    @default("")
  category             String
  subject              String
  status               String    @default("open")     // open|in_progress|resolved|closed
  priority             String    @default("medium")   // low|medium|high|urgent
  resolvedAt           DateTime?
  firstResponseMinutes Int?
  metadata             Json?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  workspace            Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, createdAt])
  @@index([workspaceId, status])
}
```
`resolvedAt`(status→resolved 时置 now)由**前端算好再发**,后端只存。`summarizeWorkspaceTickets`(openCount/resolvedTodayCount/averageFirstResponseMinutes)留前端派生。

### 3.2 PaymentMethod
```prisma
model PaymentMethod {
  id            String    @id @default(cuid())
  workspaceId   String
  label         String
  provider      String
  brand         String
  last4         String    @default("")
  status        String    @default("active")  // active|expired|disabled|needs_action
  isDefault     Boolean   @default(false)
  credentialRef String?
  metadata      Json?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  workspace     Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, createdAt])
}
```
`credentialRef`/`last4` 由前端从 accountNumber 派生后发(**明文账号不落库**,DTO 无 accountNumber 字段,同 ⑤b-1 media 拒 clientId)。`ensureSingleDefault` 前端保证。

### 3.3 TaxEvent
```prisma
model TaxEvent {
  id           String    @id @default(cuid())
  workspaceId  String
  date         String                          // YYYY-MM-DD 业务日期(字符串,沿用现有 interface)
  title        String
  type         String                          // tax_deadline|audit_window|invoice_due
  description  String    @default("")
  summary      String    @default("")
  amount       String?                         // 字符串金额(非 cents)
  status       String    @default("pending")   // pending|completed|urgent
  metadata     Json?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, createdAt])
  @@index([workspaceId, status])
}
```
**`daysUntil` 不入库**(纯派生,DTO 也不接收,whitelist 400 验证),前端 normalize 时按"现在"算。`seedWorkspaceTaxEvents` 留 localStorage 兜底。

### 3.4 Task
```prisma
model Task {
  id                  String    @id @default(cuid())
  workspaceId         String
  title               String
  column              String    @default("todo")   // todo|in_progress|auto_exec|review|done
  priority            String    @default("Medium") // High|Medium|Low
  type                String    @default("")
  date                String    @default("")
  isAuto              Boolean   @default(false)
  status              String?                       // queued|running|blocked|completed|cancelled
  runtimeMode         String?
  runtimeProviderKind String?
  runtimeTaskId       String?
  runtimeStatus       String?
  agentId             String?
  runtimeId           String?
  externalRef         String?                       // 前端 JSON.stringify 存、parse 取
  lastRuntimeEventAt  DateTime?
  metadata            Json?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  workspace           Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, createdAt])
  @@index([workspaceId, column])
}
```
runtime 外键字段全部可空 String 存储,后端不感知 runtime 语义。`externalRef`(现有类型 `AgentTask['externalRef']`,可能是对象)序列化为 `String?`(前端 stringify/parse),保持后端无 runtime 语义。`lastRuntimeEventAt` 是 `DateTime?`(前端 normalize 转 epoch/保留 string)。`calculateTaskCompletion` 留前端派生。

**migration:** 4 模型一次 `prisma migrate dev --name add_special_logic_resources`(测试库:5433;部署/CI 用 `migrate deploy`)。Workspace 加 4 反向关系字段(`tickets`/`paymentMethods`/`taxEvents`/`tasks`)。`resetDb` 加 4 个 `deleteMany()`。

## 4. 后端接线(每域工厂四件套,零 override 例外)

```
apps/api/src/<domain>/
  dto.ts                 ← Create/Update DTO + ListQuery(extends cursor 字段)
  <domain>.service.ts    ← extends WorkspaceResourceService<{id:string}>:delegate + entityName + buildWhere(status/column 过滤)
  <domain>.controller.ts ← createResourceController({ path, createDto, updateDto, listQuery }),TS2509 断言(同 ⑤b-1)
  <domain>.module.ts     ← providers:[Service, {provide:RESOURCE_SERVICE, useExisting:Service}]
```

**各域 DTO 字段要点:**
- **ticket:** `CreateTicketDto`(requesterName `@MinLength(1)` 必填;requesterEmail/category/subject `@IsString`;status/priority `@IsIn`;firstResponseMinutes `@IsInt @IsOptional`;resolvedAt `@IsDateString @IsOptional`)。`buildWhere` 加 status 过滤。无 delete 业务约束但工厂仍暴露 DELETE。
- **payment:** `CreatePaymentMethodDto`(label/provider/brand `@IsString`;last4 `@IsString`;status `@IsIn`;isDefault `@IsBoolean @IsOptional`;credentialRef `@IsString @IsOptional`)。**DTO 无 accountNumber 字段**——明文账号绝不上后端,e2e 验 whitelist 400。
- **taxEvent:** `CreateTaxEventDto`(date `@IsString`;title/description/summary `@IsString`;type `@IsIn`;amount `@IsString @IsOptional`;status `@IsIn`)。**DTO 无 daysUntil**(派生字段不接收,whitelist 400 验证)。`buildWhere` 加 status 过滤。
- **task:** `CreateTaskDto`(title `@MinLength(1)`;column/priority `@IsIn`;type/date `@IsString`;isAuto `@IsBoolean @IsOptional`;status/runtimeMode/runtimeProviderKind/runtimeTaskId/runtimeStatus/agentId/runtimeId/externalRef 全 `@IsString @IsOptional`;lastRuntimeEventAt `@IsDateString @IsOptional`;metadata `@IsObject @IsOptional`)。`buildWhere` 加 column 过滤。

`app.module.ts` 注册 4 个 module。**本批零自定义路由、零 override 例外**(除 buildWhere status/column 过滤,与 ⑤b-1 一致)。

## 5. 前端 repo 重写(每域写穿透+cache+hydrate,照搬 ⑤b-1)

- 顶部 `import { apiClient as defaultApiClient, type ApiClient } from './apiClient';`
- 末尾加 `__set<Domain>ApiClientForTest`、`const <domain>Cache = new Map<string, T[]>()`、`hydrate<Domain>s(context)`。
- 读函数 configured → 读缓存;未配置 → 现有 read 本地。
- create/update/delete 加写穿透:configured 时同步更新缓存 + fire-and-forget POST/PATCH/DELETE(失败 `console.error`,不抛)。
- **保留全部现有导出 + normalize/sort/summarize/calculate/ensureDefault/ensureSingleDefault**(本地兜底 + 前端派生)。
- normalizeTimestamp 各域修 ISO 解析(同 ⑤b-1 announcement/risk 模式):`typeof value === 'string' && !/^\d+$/.test(value.trim()) ? Date.parse(value) : Number(value)`。

**各域差异:**

- **ticket:** `resolvedAt`(status→resolved 自动置 now)前端算好后,写穿透转 `>0 ? new Date(resolvedAt).toISOString() : undefined`。`summarizeWorkspaceTickets` 留前端派生。无 delete 导出。
- **payment:** create/update 传 accountNumber 时,前端先算 last4/credentialRef,写穿透 payload **只发派生值无 accountNumber**(同 media)。`ensureSingleDefault`:isDefault=true 时前端把其它方法置 false,对每条变更发 PATCH(多条写穿透)。无 delete 导出。
- **taxEvent:** `daysUntil` 前端 normalize 时按 now 算(不进 payload)。`seedWorkspaceTaxEvents` 留 localStorage 兜底。无 update/delete 导出。
- **task:** `deleteWorkspaceTasks(ids[])` 批量删——写穿透对每个 id 发单条 DELETE(照搬 campaign)。runtime 字段原样写穿透;`externalRef` 写穿透时 JSON.stringify、normalize 时 parse。`lastRuntimeEventAt`(string)往返保持。`calculateTaskCompletion` 留前端。

## 6. 错误处理

同 ⑤a/⑤b-1:get/update/remove 不存在 → `notFound`(404);跨租户 `findFirst({id,workspaceId})` → 404(不泄露存在性);非成员 → 403(全局 TenantGuard);DTO 校验 + whitelist 拒未知字段(payment accountNumber、taxEvent daysUntil)→ 400(全局 ValidationPipe);前端写失败 → 缓存回滚 / `console.error`。

## 7. 测试策略

后端 Jest e2e 打真实 Docker Postgres(:5433,`--runInBand --config test/jest-e2e.json`);前端 tsx + `node:assert/strict`。

### 7.1 后端 e2e — 每域 `apps/api/test/<domain>.e2e-spec.ts`
照搬 ⑤b-1 customer e2e 的 4 个核心用例(改域名/字段):
- CRUD round-trip:create→get→list→update→remove,字段往返一致。
- workspace 隔离:A 租户记录,B 租户 get/update/remove → 404;list 不含。
- cursor 分页:建 N(>limit)条,翻页无重叠、末页 nextCursor=null。
- 非成员 → 403。

各域额外用例:
- ticket / taxEvent:status 过滤断言。task:column 过滤断言。
- payment:**whitelist 拒 accountNumber → 400**(验明文账号不上后端)。
- taxEvent:**whitelist 拒 daysUntil → 400**(验派生字段不接收)。

### 7.2 前端 tsx — 每域 `scripts/<domain>-repository.test.ts`
照搬 ⑤b-1 customer-repository.test:
- configured:hydrate 后 load 读后端缓存;create 乐观入缓存(同步可见)。
- 未配置:回退 localStorage(内存 storage stub)。
- payment 额外:`ensureSingleDefault`——新增 isDefault=true 把旧 default 置 false。
- task 额外:`deleteWorkspaceTasks` 批量删多 id;externalRef 对象 JSON 往返。
- package.json 加 4 个 `test:<domain>-repo`,纳入 `test:p0-specialized`。

### 7.3 回归保护
既有后端全 e2e(含 customer + ⑤b-1 6 域)+ `saas-foundation.test.ts` + `product-registry.test.ts` 必须仍全绿。

### 7.4 验收线
后端全 e2e(预计 26 suites)+ `npm run lint` + `npm run build` + `test:p0-specialized` + `test:saas-foundation` 全绿。

### 7.5 plan 组织
一个 plan,每域一个端到端任务块(4 域顺序做)+ 一次全量验收,照搬 ⑤b-1 节奏。

## 8. 明确不在范围(YAGNI)

- financial 域 → ⑤b-2.5 独立子批(与 ④ credit/usage 耦合深,兑券幂等/积分聚合需仔细设计)。
- ⑤b-3 settings、⑤b-4 加密批 → 后续子批。
- 后端 DB 端 summarize / 全文搜索 / 批量 / 幂等端点 → 前端派生足够。
- 演示种子 / 历史数据迁移 → 不做(空表起步)。
- 软删除、实时推送、增量同步、runtime→task 后端回写通道 → 不做。
