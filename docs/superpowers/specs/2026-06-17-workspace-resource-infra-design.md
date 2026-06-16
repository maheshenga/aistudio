# ⑤a 通用 Workspace 资源基础设施 — 设计文档

- 日期:2026-06-17
- 状态:设计已确认,待写实现计划
- 子项目:⑤a(SaaS 产品化第⑤步「业务模块补全」的基础设施批;①②③④ 已交付)
- 分支基线:`main`(④ 已合并并 push)

## 1. 背景与目标

前端 19 个业务 repository 仍只走 localStorage,无后端真相源:清缓存即丢、跨设备不同步、后台无法管理。这些 repository **结构高度同构**(统一 workspace-scoped `storageKey` + context + CRUD + normalize 模式)。

逐个手写 controller/service/repository 会产生约 19×4 份雷同代码,既慢又难维护。

**目标:** 建一套**泛型 workspace 资源基础设施**(后端泛型 Service/Controller 基类 + 前端泛型 repository 工厂),使后续业务域接入后端从「写 4 份文件」降为「声明配置 + 写差异」。本 spec 用 **customer** 域端到端验证契约。其余 14 域迁移 + 敏感域加密留作 ⑤b。

## 2. 范围分层(全局决策,本 spec 只交付基础设施 + customer)

19 个 local repository 分三层处置:

| 层 | repository | 处置 |
|---|---|---|
| **A. 上后端(真相源)** | customer, campaign, ticket, financial, payment, taxEvent, task, risk, agency, keyword, media, announcement, settings | 后端持久化(⑤b) |
| **B. 敏感数据(后端+AES加密)** | apiKey, webhook | 后端 + AES-256-GCM(⑤b) |
| **C. 端侧状态(保持本地)** | searchHistory, offlineQueue, plugin | 留 localStorage,不迁移 |

**本 spec(⑤a)只交付:** 通用基础设施 + customer 域(A 类首个,验证基础设施)。

## 3. 架构总览

```
后端 apps/api/src/common/resource/
  ├─ workspace-resource.service.ts    ← 泛型基类 WorkspaceResourceService<T>
  ├─ workspace-resource.controller.ts ← 工厂 createResourceController()
  └─ resource-query.dto.ts            ← 统一 CursorQuery / CursorPage

后端 apps/api/src/customer/           ← 首个落地域(验证基础设施)
  ├─ customer.module.ts
  ├─ customer.service.ts   ← extends WorkspaceResourceService(声明 delegate + entityName)
  ├─ customer.controller.ts ← 工厂生成 + customer DTO
  └─ dto.ts

前端 src/lib/data/
  ├─ workspaceResourceClient.ts ← 泛型工厂 createWorkspaceResourceRepository<T>()
  └─ customerRepository.ts       ← 重写为调用工厂(保留现有导出签名,UI 零改动)
```

**数据流**(沿用 ③④ 已验证双层):
- 读:`apiClient.configured` → GET 后端(cursor 分页)+ SWR 缓存(Map by workspaceId);未配置 → localStorage 兜底。
- 写:乐观更新本地缓存 → POST/PATCH/DELETE 后端 → 失败回滚。

**原则:** 泛型基类对齐现有 `project.service`/`project.controller` 全部约定(`{ value }` 封装、`@WorkspaceId()` 装饰器、`findFirst({id, workspaceId})` 隔离、`notFound` 工厂、`orderBy createdAt`),不引入新模式。

## 4. 后端泛型基类契约

### 4.1 WorkspaceResourceService<T>

```typescript
export interface PrismaResourceDelegate {
  findMany(args: unknown): Promise<unknown[]>;
  findFirst(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  delete(args: unknown): Promise<unknown>;
  count(args: unknown): Promise<number>;
}

export abstract class WorkspaceResourceService<T extends { id: string }> {
  protected abstract get delegate(): PrismaResourceDelegate; // 如 prisma.customer
  protected abstract entityName: string;                     // notFound 文案用

  // where 子句钩子:子类覆盖以加自定义过滤(默认仅 workspace 隔离)
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    return { workspaceId };
  }

  async list(workspaceId: string, query: CursorQuery): Promise<CursorPage<T>>
  async get(workspaceId: string, id: string): Promise<T>        // 不存在 → notFound(404)
  async create(workspaceId: string, data: object): Promise<T>    // 注入 workspaceId
  async update(workspaceId: string, id: string, data: object): Promise<T> // 先 get 校验归属
  async remove(workspaceId: string, id: string): Promise<{ id: string }>  // 先 get 校验归属
}
```

- `get`/`update`/`remove` 均先 `findFirst({ id, workspaceId })`,缺失抛 `notFound(`${entityName} not found`)`。跨租户访问自动 404,不泄露存在性。
- 所有方法 `protected`/可覆盖,作为逃生舱口:特殊域(apiKey 加密、ticket 状态机)override 对应方法,在 `super.xxx()` 前后插入逻辑。

### 4.2 游标分页 CursorQuery / CursorPage

```typescript
export class CursorQuery {
  @IsOptional() @IsString() cursor?: string;        // 上一页最后一条 id
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number; // 默认 50
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';  // 按 createdAt,默认 desc
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;  // null = 无更多
}
```

`list` 实现:取 `take = limit + 1` 多查一条判断是否有下一页;有 `cursor` 时用 Prisma `{ cursor: { id: cursor }, skip: 1 }`。返回 `items`(裁到 limit)+ `nextCursor`(第 limit+1 条的 id,否则 null)。`orderBy: { createdAt: order }`。

### 4.3 createResourceController()

工厂返回一个 controller 类,挂标准 5 路由,对齐 `project.controller` 形状:

```typescript
function createResourceController<TCreate, TUpdate>(opts: {
  path: string;                    // 'workspaces/:workspaceId/customers'
  createDto: Type<TCreate>;
  updateDto: Type<TUpdate>;
}): Type<unknown>
```

- `GET /` → `{ value: await svc.list(ws, query) }`
- `GET /:id` → `{ value: await svc.get(ws, id) }`
- `POST /` → `{ value: await svc.create(ws, dto) }`
- `PATCH /:id` → `{ value: await svc.update(ws, id, dto) }`
- `DELETE /:id` → `{ value: await svc.remove(ws, id) }`

service 通过 NestJS DI 注入(各域 module 把自己的 service 绑到工厂 controller 依赖的 token)。`@WorkspaceId()` 装饰器 + 全局 TenantGuard 保证成员鉴权与 workspace 注入。

## 5. Customer 域(验证落地)

### 5.1 Prisma 模型(对齐现有 `WorkspaceCustomer` interface)

```prisma
model Customer {
  id                String   @id @default(cuid())
  workspaceId       String
  userId            String?
  name              String
  company           String?
  role              String?
  channel           String   @default("manual")
  lifecycleStage    String   @default("new_lead")  // new_lead|qualified|contacted|converted|inactive
  ownerId           String?
  tags              String[]
  source            Json?    // WorkspaceCustomerSource 嵌套对象
  notes             String?
  lastInteractionAt DateTime @default(now())
  metadata          Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  workspace         Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId, createdAt])
  @@index([workspaceId, lifecycleStage])  // 后台按生命周期阶段筛
  @@index([workspaceId, channel])         // 后台按渠道筛
}
```

`Workspace` 加反向关系 `customers Customer[]`。走 `prisma migrate dev`(开发库无 `.env` → 仅应用到测试库 :5433;部署/CI 用 `prisma migrate deploy`)。时间戳:DB 用 `DateTime`,前端 normalize 仍转 epoch ms(兼容现有 interface)。

### 5.2 CustomerService

```typescript
@Injectable()
export class CustomerService extends WorkspaceResourceService<Customer> {
  constructor(private prisma: PrismaService) { super(); }
  protected get delegate() { return this.prisma.customer; } // getter 避免字段初始化顺序坑
  protected entityName = 'Customer';

  // 自定义过滤:后台/前端可按 lifecycleStage、channel 筛
  protected buildWhere(workspaceId, query: ListCustomerQuery) {
    return { workspaceId,
      ...(query.lifecycleStage ? { lifecycleStage: query.lifecycleStage } : {}),
      ...(query.channel ? { channel: query.channel } : {}) };
  }

  // lead 去重合并(customer 特有,验证逃生舱口对真实业务逻辑够用)
  async createOrUpdateLead(workspaceId, dto: CreateCustomerDto): Promise<Customer>
}
```

`createOrUpdateLead`:按 **name + company** 匹配键(对齐现有 `customerMatchKey`)查重 → 存在则合并 update(tags 并集 + `'marketing_lead'`,字段 fallback 到现有值)、否则 create(tags 追加 `'marketing_lead'`)。匹配查重在同一请求内 `findFirst({ workspaceId, name, company })` 实现。

### 5.3 DTO

- `CreateCustomerDto`:`name` 必填(IsString MinLength1);`company/role/channel/notes/ownerId` 可选 string;`lifecycleStage` 可选 IsIn(5 值);`tags` 可选 string[];`source` 可选 object;`lastInteractionAt` 可选;`metadata` 可选 object。
- `UpdateCustomerDto`:`PartialType(CreateCustomerDto)`。
- `ListCustomerQuery extends CursorQuery`:加可选 `lifecycleStage`、`channel` 过滤字段。

### 5.4 路由

`createResourceController({ path: 'workspaces/:workspaceId/customers', createDto: CreateCustomerDto, updateDto: UpdateCustomerDto })`,外加一条自定义路由 `POST .../customers/lead` → `createOrUpdateLead`(在 customer.controller 显式补充,不进泛型工厂)。

## 6. 前端泛型工厂

### 6.1 createWorkspaceResourceRepository<T>(config)

```typescript
interface ResourceRepositoryConfig<T> {
  resource: string;                       // API 路径段,如 'customers'
  storagePrefix: string;                  // localStorage 兜底键前缀
  normalize: (raw: unknown, ctx) => T;    // 复用各域现有 normalize
}
// 返回:{ hydrate, list, get, create, update, remove, __setApiClientForTest }
```

对齐 ④ `creditRepository` 注入模式:`apiClient.configured` 优先后端 + SWR 缓存(Map by workspaceId);未配置回退 localStorage。写操作乐观更新缓存 → 后台 flush API → 失败回滚缓存。

### 6.2 customerRepository 重写

内部改调泛型工厂,但**保留现有所有导出函数签名**(`loadWorkspaceCustomers`、`saveWorkspaceCustomers`、`createWorkspaceCustomer`、`updateWorkspaceCustomer`、`createOrUpdateWorkspaceCustomerLead`)→ UI 组件零改动。`createOrUpdateWorkspaceCustomerLead` 在 configured 时调后端 `POST customers/lead`,未配置时走现有本地合并逻辑。现有 `normalizeCustomer` 逻辑复用作工厂的 `normalize`。

## 7. 错误处理

- `get`/`update`/`remove` 不存在 → `notFound`(404),复用 `common/errors.ts`。
- workspace 隔离:`findFirst({ id, workspaceId })`,跨租户 404(不泄露存在性)。
- 校验:`class-validator` DTO + 全局 ValidationPipe(`transform:true` 已生效)。
- 前端写失败:乐观更新回滚 + 错误透出(沿用 ④ 模式)。
- 非成员访问:全局 TenantGuard → 403。

## 8. 测试策略

后端 Jest e2e 打真实 Docker Postgres(`aistudio-pg`:5433,`--runInBand`);前端 tsx 脚本 + `node:assert/strict`。

### 8.1 后端 e2e — 新建 `apps/api/test/customer.e2e-spec.ts`

- **CRUD 全程**:create→get→list→update→remove,字段往返一致。
- **workspace 隔离**:A 租户创建的 customer,B 租户 get/update/remove → 404;list 不含。
- **cursor 分页**:建 N(>limit)条,首页返回 limit 条 + nextCursor;末页 nextCursor=null;翻页无重叠无遗漏。
- **buildWhere 过滤**:按 lifecycleStage / channel 筛,只返回匹配项。
- **lead 合并**:同 (name, company) 二次 `POST customers/lead` → update 而非新建(数量不增,tags 并集含 marketing_lead)。
- **非成员 403**:非 workspace 成员访问任一端点 → 403。

### 8.2 前端 tsx — 新建 `scripts/customer-repository.test.ts`

- configured 时读/写后端;未配置时回退 localStorage。
- 乐观更新 + 失败回滚(模拟 API 失败,缓存复原)。
- `createOrUpdateWorkspaceCustomerLead` 两路径(后端 / 本地合并)。
- 纳入 `test:p0-specialized` 聚合(`package.json` 加 `test:customer-repo`)。

### 8.3 回归保护

`saas-foundation.test.ts`、`product-registry.test.ts`、既有后端 e2e 全套必须仍全绿。

### 8.4 验收线

后端全 e2e + 前端 `test:p0-specialized` + `npm run lint` + `npm run build`。

## 9. 明确不在范围(YAGNI)

- 其余 14 域迁移(campaign/ticket/financial/payment/taxEvent/task/risk/agency/keyword/media/announcement/settings)→ ⑤b。
- B 类加密(apiKey/webhook,AES-256-GCM)→ ⑤b(加密是子类差异,基础设施先就绪)。
- C 类(searchHistory/offlineQueue/plugin)保持 localStorage,不迁移。
- 增量同步(按 `updatedAt` 拉变更)→ 模型预留 `updatedAt`,拉取逻辑留后续。
- 实时推送(WebSocket)、全文搜索 → 不做。
- localStorage 历史数据迁移 → 不做(空表起步)。
- 软删除/回收站 → 不做(直接 delete;后续后台需要再加)。
