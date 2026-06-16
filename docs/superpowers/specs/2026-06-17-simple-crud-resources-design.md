# ⑤b-1 简单 CRUD 业务域批量上后端 — 设计文档

- 日期:2026-06-17
- 状态:设计已确认,待写实现计划
- 子项目:⑤b-1(⑤b「剩余 16 域迁后端」的第 1 子批;⑤a 通用基础设施已交付)
- 分支基线:`main`(⑤a 8 commit 在本地 main,未 push)

## 1. 背景与目标

⑤a 已交付通用 workspace 资源基础设施(后端 `WorkspaceResourceService<T>` 泛型基类 + `createResourceController` 工厂;前端 `createWorkspaceResourceRepository<T>` 工厂),并用 customer 域端到端验证(后端 e2e 16 suites/61 passed)。

⑤b 把剩余 16 个 local-only repository 迁到后端,按模式拆 4 子批顺序交付:
- **⑤b-1 简单 CRUD 批(本 spec):** campaign、announcement、agency、risk、media、keyword(6 域)
- ⑤b-2 特殊逻辑批:ticket、financial、payment、taxEvent、task(需 override + 聚合端点)
- ⑤b-3 单例 settings(专用 singleton get/put)
- ⑤b-4 加密敏感批:EncryptionService(AES-256-GCM)+ apiKey、webhook

**目标:** 用已验证的 ⑤a 工厂,把 6 个简单 CRUD 域迁到后端真相源,验证基础设施在多域批量复用上的成本与节奏,产出「接一个域」的稳定模板。

## 2. 范围与核心原则

**核心原则(沿用 ⑤a + 本轮 4 决策):**
- 每域纯标准 CRUD,直接套基础设施三件套,**不 override 基类方法**(唯一例外见 §5 buildWhere status 过滤)。
- summarize / search / ensureDefault 全部作为**前端派生计算 / localStorage 兜底**保留,后端零额外端点。
- 后端**空表起步**,不迁历史数据、不种子。
- 前端**保留全部现有导出签名**,UI 零改动。
- 时间戳:DB 用 `DateTime`/`DateTime?`,前端 normalize 转 epoch ms(兼容现有 interface)。

**4 项决策(本轮 brainstorm 确认):**
1. summarize(agency/risk/media)→ 前端拉全量后在前端算,后端不加聚合端点。
2. ensureDefault 种子(risk/media/agency)→ 不迁,后端空表起步,仅 localStorage 兜底保留。
3. keyword 全文搜索 → 保持前端,作用于 `list()` 结果,后端不加搜索端点。
4. plan 组织 → 一个 plan,每域一个端到端任务块,6 域顺序做 + 一次全量验收。

**明确不在范围(YAGNI):**
- ⑤b-2/⑤b-3/⑤b-4 的域。
- 后端 DB 端聚合 / 搜索端点。
- 演示种子数据迁移、localStorage 历史数据迁移。
- 软删除 / 实时推送 / 增量同步。

## 3. 后端 Prisma 模型

**通用列(每个模型都有):** `id String @id @default(cuid())`、`workspaceId String`、`createdAt DateTime @default(now())`、`updatedAt DateTime @updatedAt`、`metadata Json?`;`workspace Workspace @relation(fields:[workspaceId], references:[id], onDelete: Cascade)`;`@@index([workspaceId, createdAt])`。下列仅各域差异字段:

### 3.1 Campaign
```prisma
model Campaign {
  id              String   @id @default(cuid())
  workspaceId     String
  userId          String?
  name            String
  channel         String   @default("other")   // viral_qr|nfc_touchpoint|website|store_event|other
  status          String   @default("draft")    // draft|active|paused|archived
  moduleId        String?
  landingUrl      String?
  linkedAssetIds  String[]
  metrics         Json     @default("{}")        // {scans,shares,exposures,conversions}
  metadata        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, createdAt])
  @@index([workspaceId, status])
}
```

### 3.2 Announcement
```prisma
model Announcement {
  id           String    @id @default(cuid())
  workspaceId  String
  title        String
  channel      String
  status       String    @default("active")     // draft|active|scheduled|archived
  publishedAt  DateTime?
  metadata     Json?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, createdAt])
}
```
`publishedAt` 条件默认(draft=空、其他=now)由**前端 create 算好再发**,后端只存。

### 3.3 AgencyPartner
```prisma
model AgencyPartner {
  id                   String   @id @default(cuid())
  workspaceId          String
  name                 String
  level                String
  invitedUsers         Int      @default(0)
  totalCommissionCents Int      @default(0)
  commissionRate       Float    @default(0)
  payoutStatus         String   @default("none")  // none|pending|paid|blocked
  status               String   @default("active") // active|suspended
  metadata             Json?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  workspace            Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, createdAt])
  @@index([workspaceId, payoutStatus])
}
```

### 3.4 RiskEvent
```prisma
model RiskEvent {
  id             String    @id @default(cuid())
  workspaceId    String
  action         String
  contentSummary String
  rule           String
  decision       String    // blocked|pending_review|allowed|rate_limited|account_frozen
  severity       String    // low|medium|high|critical
  occurredAt     DateTime  @default(now())
  reviewedAt     DateTime?
  metadata       Json?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  workspace      Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, createdAt])
  @@index([workspaceId, decision])
  @@index([workspaceId, severity])
}
```
用 `occurredAt` 作业务时间;list 默认排序按 createdAt(基类约定),前端按 occurredAt+severity 重排。

### 3.5 MediaAccount
```prisma
model MediaAccount {
  id                String   @id @default(cuid())
  workspaceId       String
  platformName      String
  status            String   @default("needs_config") // active|rate_limited|offline|needs_config
  connectedAccounts Int      @default(0)
  credentialRef     String?
  clientIdLast4     String?
  metadata          Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  workspace         Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, createdAt])
  @@index([workspaceId, status])
}
```
`credentialRef`/`clientIdLast4` 派生(clientId 原文不落库)由**前端算好再发**,后端只存。存的是 env 引用字符串 + 末 4 位,非明文,故留在本批(不属加密批)。

### 3.6 KeywordLibrary
```prisma
model KeywordLibrary {
  id           String    @id @default(cuid())
  workspaceId  String
  userId       String?
  ownerId      String?
  name         String
  description  String    @default("")
  channel      String    @default("")
  sourceText   String    @default("")
  moduleId     String    @default("copywriting_keywords")
  status       String    @default("active")  // active|paused|archived
  tags         String[]
  keywords     String[]
  blockedTerms String[]
  archivedAt   DateTime?
  metadata     Json?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, createdAt])
  @@index([workspaceId, status])
}
```

**migration:** 6 模型一次 `prisma migrate dev --name add_simple_crud_resources`(测试库:5433;部署/CI 用 `migrate deploy`)。Workspace 加 6 反向关系字段(`campaigns`/`announcements`/`agencyPartners`/`riskEvents`/`mediaAccounts`/`keywordLibraries`)。`resetDb` 加 6 个 `deleteMany()`。

## 4. 后端接线(每域三件套,照搬 ⑤a customer,无 override)

```
apps/api/src/<domain>/
  dto.ts                 ← Create/Update DTO + ListQuery(extends cursor 字段)
  <domain>.service.ts    ← extends WorkspaceResourceService<{id:string}>:get delegate + entityName
  <domain>.controller.ts ← createResourceController({ path, createDto, updateDto, listQuery })
  <domain>.module.ts     ← providers:[Service, {provide:RESOURCE_SERVICE, useExisting:Service}]
```

- DTO:`id?` 可选(前端乐观更新传 id);数组字段 `@IsArray @IsString({each:true})`;Json 字段 `@IsObject`;枚举字段 `@IsIn(STAGES)`;数值字段 `@IsInt`/`@IsNumber`。
- service:`protected get delegate(){ return this.prisma.<domain> as unknown as PrismaResourceDelegate; }`、`protected entityName = '<Domain>'`。
- controller:`const Base = createResourceController({...}); class <Domain>Controller extends Base {}`(本批无额外路由,直接用 Base 即可,但仍建子类以对齐 customer 形状并预留扩展)。
- app.module.ts 注册 6 个 module。

## 5. buildWhere status 过滤(本批唯一允许的轻量 override)

campaign/agency/risk/media/keyword 的 ListQuery 可选地加 `status` 过滤字段(后台管理按状态筛)。若加,service override `buildWhere`:
```typescript
protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
  const q = query as <Domain>ListQuery;
  return { workspaceId, ...(q.status ? { status: q.status } : {}) };
}
```
仅加 where 条件,不碰其它逻辑。announcement 同样可加但非必须。

## 6. 前端 repo 重写(每域,照搬 ⑤a customerRepository)

- 顶部 `import { apiClient as defaultApiClient, type ApiClient } from './apiClient';`
- 末尾加 `__set<Domain>ApiClientForTest`、`const <domain>Cache = new Map<string, T[]>()`、`hydrate<Domain>s(context)`。
- 改写公开读函数:configured → 读缓存;未配置 → 现有 read 本地。
- create/update/delete 加写穿透:configured 时同步更新缓存 + 后台 fire-and-forget POST/PATCH/DELETE(失败 `console.error`,不抛)。
- **保留全部现有导出 + normalize/sort/summarize/search/ensureDefault**(本地兜底 + 前端派生)。
- 各域签名差异照旧保留:
  - announcement:无 delete 导出。
  - campaign:`deleteWorkspaceCampaigns(ids: string[])` 批量删(写穿透时对每个 id 发 DELETE)。
  - task 同批量删(本批不含 task,记此以备 ⑤b-2)。
  - keyword:`archiveWorkspaceKeywordLibrary` = update status='archived' + archivedAt(走 PATCH)。
  - media:create/update 传入 clientId 时前端重算 credentialRef/clientIdLast4 后再发(后端只存结果)。

## 7. 错误处理

同 ⑤a:get/update/remove 不存在 → `notFound`(404);跨租户 `findFirst({id,workspaceId})` → 404(不泄露存在性);非成员 → 403(全局 TenantGuard);DTO 校验 → 全局 ValidationPipe;前端写失败 → 缓存回滚 / `console.error`。

## 8. 测试策略

后端 Jest e2e 打真实 Docker Postgres(:5433,`--runInBand --config test/jest-e2e.json`);前端 tsx + `node:assert/strict`。

### 8.1 后端 e2e — 每域 `apps/api/test/<domain>.e2e-spec.ts`
照搬 customer e2e 的 4 个核心用例(改域名/字段):
- CRUD round-trip:create→get→list→update→remove,字段往返一致。
- workspace 隔离:A 租户记录,B 租户 get/update/remove → 404;list 不含。
- cursor 分页:建 N(>limit)条,翻页无重叠、末页 nextCursor=null。
- 非成员 → 403。

### 8.2 前端 tsx — 每域 `scripts/<domain>-repository.test.ts`
照搬 customer-repository.test:
- configured:hydrate 后 load 读后端缓存;create 乐观入缓存(同步可见)。
- 未配置:回退 localStorage(内存 storage stub)。
- package.json 加 6 个 `test:<domain>-repo`,纳入 `test:p0-specialized`。

### 8.3 回归保护
既有后端全 e2e(含 customer)+ `saas-foundation.test.ts` + `product-registry.test.ts` 必须仍全绿。

### 8.4 验收线
后端全 e2e + 前端 `npm run lint` + `npm run build` + `test:p0-specialized` + `saas-foundation` 全绿。

## 9. 明确不在范围(YAGNI)

- ⑤b-2/⑤b-3/⑤b-4 各域 → 后续子批。
- 后端 DB 端 summarize / 全文搜索端点 → 前端派生足够,数据量大再说。
- 演示种子 / 历史数据迁移 → 不做(空表起步)。
- 软删除、实时推送、增量同步 → 不做。
