# ⑤a 通用 Workspace 资源基础设施 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建一套泛型 workspace 资源基础设施(后端泛型 Service/Controller 基类 + 前端泛型 repository 工厂),并用 customer 域端到端验证,使后续 14 业务域接入后端降为「声明配置 + 写差异」。

**Architecture:** 后端 `WorkspaceResourceService<T>` 泛型基类(cursor 分页 + `buildWhere` 钩子 + workspace 隔离 CRUD)+ `createResourceController` mixin 工厂;前端 `createWorkspaceResourceRepository<T>` 工厂(apiClient 优先 + SWR 缓存 + 乐观更新/回滚 + localStorage 兜底)。customer 域作为首个落地验证,保留现有前端导出签名使 UI 零改动。

**Tech Stack:** NestJS 10 + Prisma 5 + PostgreSQL(后端);React 19 + Vite + TypeScript(前端);后端 Jest e2e 打 Docker Postgres :5433,前端 tsx + node:assert。

---

## File Structure

**后端新建:**
- `apps/api/src/common/resource/resource-query.dto.ts` — `CursorQuery` DTO + `CursorPage<T>` 接口 + `ResourceValidationPipe`
- `apps/api/src/common/resource/workspace-resource.service.ts` — `WorkspaceResourceService<T>` 泛型基类 + `PrismaResourceDelegate` 接口
- `apps/api/src/common/resource/workspace-resource.controller.ts` — `createResourceController()` mixin 工厂
- `apps/api/src/customer/dto.ts` — `CreateCustomerDto` / `UpdateCustomerDto` / `ListCustomerQuery`
- `apps/api/src/customer/customer.service.ts` — `CustomerService extends WorkspaceResourceService<Customer>`
- `apps/api/src/customer/customer.controller.ts` — 工厂 controller + `POST .../lead`
- `apps/api/src/customer/customer.module.ts`
- `apps/api/test/customer.e2e-spec.ts`

**后端修改:**
- `apps/api/prisma/schema.prisma` — 新增 `Customer` model + `Workspace.customers` 反向关系
- `apps/api/src/app.module.ts` — imports 加 `CustomerModule`
- `apps/api/test/helpers.ts:20-31` — `resetDb` 加 `customer.deleteMany()`

**前端新建:**
- `src/lib/data/workspaceResourceClient.ts` — `createWorkspaceResourceRepository<T>()` 工厂
- `scripts/workspace-resource-client.test.ts` — 工厂单测
- `scripts/customer-repository.test.ts` — customer repository 测试

**前端修改:**
- `src/lib/data/customerRepository.ts` — 重写为调用泛型工厂,保留全部导出签名
- `package.json` — 加 `test:workspace-resource`、`test:customer-repo`,纳入 `test:p0-specialized`

---

## Task 1: Customer Prisma 模型 + migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`(Workspace model 加反向关系;文件末尾加 Customer model)
- Modify: `apps/api/test/helpers.ts:20-31`(resetDb 加 customer 清理)

- [ ] **Step 1: 在 schema.prisma 的 Workspace model 内加反向关系**

找到 `model Workspace { ... }`,在已有关系字段(如 `creditLedger CreditLedger[]`)旁加一行:

```prisma
  customers      Customer[]
```

- [ ] **Step 2: 在 schema.prisma 末尾追加 Customer model**

```prisma
model Customer {
  id                String   @id @default(cuid())
  workspaceId       String
  userId            String?
  name              String
  company           String?
  role              String?
  channel           String   @default("manual")
  lifecycleStage    String   @default("new_lead")
  ownerId           String?
  tags              String[]
  source            Json?
  notes             String?
  lastInteractionAt DateTime @default(now())
  metadata          Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  workspace         Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId, createdAt])
  @@index([workspaceId, lifecycleStage])
  @@index([workspaceId, channel])
}
```

- [ ] **Step 3: 生成并应用 migration 到测试库**

Run:
```bash
cd /e/code/aistudio/apps/api && DATABASE_URL="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" npx prisma migrate dev --name add_customer_resource
```
Expected: 新建 `prisma/migrations/<timestamp>_add_customer_resource/migration.sql`,输出 `Your database is now in sync with your schema.`,并自动 `prisma generate`(`prisma.customer` delegate 可用)。

- [ ] **Step 4: resetDb 加 customer 清理**

`apps/api/test/helpers.ts` 的 `resetDb`,在 `await prisma.project.deleteMany();` 之前加一行(customer 无子表依赖,放 workspace 删除之前即可):

```typescript
  await prisma.customer.deleteMany();
```

- [ ] **Step 5: 验证 Prisma Client 类型生成**

Run: `cd /e/code/aistudio/apps/api && npx tsc --noEmit -p tsconfig.json 2>&1 | head -20`
Expected: 无与 `prisma.customer` 相关的类型错误(已有代码若有无关报错忽略)。

- [ ] **Step 6: Commit**

```bash
cd /e/code/aistudio && git add apps/api/prisma/schema.prisma apps/api/prisma/migrations apps/api/test/helpers.ts && git commit -m "feat(api): add Customer prisma model + migration"
```

---

## Task 2: 分页 DTO + CursorPage 接口

**Files:**
- Create: `apps/api/src/common/resource/resource-query.dto.ts`

- [ ] **Step 1: 写分页 DTO 与分页结果接口**

```typescript
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CursorQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export const DEFAULT_LIMIT = 50;
```

- [ ] **Step 2: 类型检查**

Run: `cd /e/code/aistudio/apps/api && npx tsc --noEmit -p tsconfig.json 2>&1 | grep resource-query | head`
Expected: 无输出(无该文件相关报错)。

- [ ] **Step 3: Commit**

```bash
cd /e/code/aistudio && git add apps/api/src/common/resource/resource-query.dto.ts && git commit -m "feat(api): add CursorQuery dto + CursorPage interface"
```

---

## Task 3: WorkspaceResourceService 泛型基类

**Files:**
- Create: `apps/api/src/common/resource/workspace-resource.service.ts`
- Test: `apps/api/test/customer.e2e-spec.ts`(本任务先建文件,写基础设施的 CRUD/隔离/分页用例;customer 接入在 Task 5)

> 注:本任务通过 customer 域来测试基类(基类是抽象类无法独立实例化)。为保持任务自包含,先在本任务内创建**最小** CustomerService/Module 接到基类跑通,Task 5 再补 lead 合并与完整 DTO。

- [ ] **Step 1: 写 WorkspaceResourceService 基类**

`apps/api/src/common/resource/workspace-resource.service.ts`:

```typescript
import { notFound } from '../errors';
import { CursorQuery, CursorPage, DEFAULT_LIMIT } from './resource-query.dto';

export interface PrismaResourceDelegate {
  findMany(args: unknown): Promise<Array<{ id: string }>>;
  findFirst(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<{ id: string }>;
  update(args: unknown): Promise<{ id: string }>;
  delete(args: unknown): Promise<unknown>;
}

export abstract class WorkspaceResourceService<T extends { id: string }> {
  protected abstract get delegate(): PrismaResourceDelegate;
  protected abstract entityName: string;

  protected buildWhere(workspaceId: string, _query: CursorQuery): Record<string, unknown> {
    return { workspaceId };
  }

  async list(workspaceId: string, query: CursorQuery): Promise<CursorPage<T>> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const order = query.order ?? 'desc';
    const rows = (await this.delegate.findMany({
      where: this.buildWhere(workspaceId, query),
      orderBy: { createdAt: order },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    })) as T[];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  async get(workspaceId: string, id: string): Promise<T> {
    const row = (await this.delegate.findFirst({ where: { id, workspaceId } })) as T | null;
    if (!row) throw notFound(`${this.entityName} not found`);
    return row;
  }

  async create(workspaceId: string, data: Record<string, unknown>): Promise<T> {
    return (await this.delegate.create({ data: { ...data, workspaceId } })) as T;
  }

  async update(workspaceId: string, id: string, data: Record<string, unknown>): Promise<T> {
    await this.get(workspaceId, id);
    return (await this.delegate.update({ where: { id }, data })) as T;
  }

  async remove(workspaceId: string, id: string): Promise<{ id: string }> {
    await this.get(workspaceId, id);
    await this.delegate.delete({ where: { id } });
    return { id };
  }
}
```

- [ ] **Step 2: 建最小 CustomerService 接到基类**

`apps/api/src/customer/customer.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';

@Injectable()
export class CustomerService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.customer as unknown as PrismaResourceDelegate; }
  protected entityName = 'Customer';
}
```

- [ ] **Step 3: 建最小 CustomerController(手写,Task 4 引入工厂后替换)**

`apps/api/src/customer/customer.controller.ts`:

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { CustomerService } from './customer.service';

@Controller('workspaces/:workspaceId/customers')
export class CustomerController {
  constructor(private svc: CustomerService) {}
  @Get() async list(@WorkspaceId() ws: string, @Query() q: CursorQuery) { return { value: await this.svc.list(ws, q) }; }
  @Get(':id') async get(@WorkspaceId() ws: string, @Param('id') id: string) { return { value: await this.svc.get(ws, id) }; }
  @Post() async create(@WorkspaceId() ws: string, @Body() dto: Record<string, unknown>) { return { value: await this.svc.create(ws, dto) }; }
  @Patch(':id') async update(@WorkspaceId() ws: string, @Param('id') id: string, @Body() dto: Record<string, unknown>) { return { value: await this.svc.update(ws, id, dto) }; }
  @Delete(':id') async remove(@WorkspaceId() ws: string, @Param('id') id: string) { return { value: await this.svc.remove(ws, id) }; }
}
```

- [ ] **Step 4: 建 CustomerModule 并注册到 AppModule**

`apps/api/src/customer/customer.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
@Module({ controllers: [CustomerController], providers: [CustomerService] })
export class CustomerModule {}
```

`apps/api/src/app.module.ts`:imports 数组加 `CustomerModule`(import 语句 `import { CustomerModule } from './customer/customer.module';`)。

- [ ] **Step 5: 写基础设施 e2e 测试(CRUD + 隔离 + 分页)**

`apps/api/test/customer.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Customer resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'cu1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/customers`)
      .send({ name: 'Acme', company: 'Acme Inc' })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.name).toBe('Acme');
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/customers/${id}`)).expect(200);
    expect(got.body.value.company).toBe('Acme Inc');
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/customers/${id}`)
      .send({ notes: 'vip' })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/customers`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].notes).toBe('vip');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/customers/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/customers`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'iso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/customers`).send({ name: 'Secret' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'iso2@test.dev');
    // a2 用自己的 workspace 路径访问 a1 的 id → TenantGuard 通过(a2 是自己 ws 成员),但记录不属于 a2 ws → 404
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/customers/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/customers/${id}`).send({ notes: 'x' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/customers/${id}`)).expect(404);
  });

  it('cursor pagination: page through, nextCursor correct, end is null', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'pg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/customers`)
        .send({ name: `c${i}` })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/customers?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    expect(p1.body.value.nextCursor).not.toBeNull();
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/customers?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    expect(p2.body.value.items).toHaveLength(2);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4); // 无重叠
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/customers?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'm1@test.dev');
    const a2 = await registerUser(app, 'm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/customers`)).expect(403);
  });
});
```

- [ ] **Step 6: 跑测试,确认通过**

Run:
```bash
cd /e/code/aistudio/apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest customer --runInBand 2>&1 | tail -20
```
Expected: `Tests: 4 passed`。

- [ ] **Step 7: Commit**

```bash
cd /e/code/aistudio && git add apps/api/src/common/resource/workspace-resource.service.ts apps/api/src/customer apps/api/src/app.module.ts apps/api/test/customer.e2e-spec.ts && git commit -m "feat(api): WorkspaceResourceService base + customer CRUD/isolation/pagination"
```

---

## Task 4: createResourceController mixin 工厂

**Files:**
- Create: `apps/api/src/common/resource/workspace-resource.controller.ts`

**背景:** 全局 ValidationPipe 配置 `forbidNonWhitelisted:true + whitelist:true`,所以 `@Body()` 必须绑定真实 DTO 类(否则未知字段被拒/被剥离)。工厂用 NestJS mixin 模式:接收 DTO 类与 service token,动态生成 controller 类。service 通过构造注入(用一个抽象 token,各域 module 绑定具体 service)。

- [ ] **Step 1: 写工厂**

`apps/api/src/common/resource/workspace-resource.controller.ts`:

```typescript
import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Type } from '@nestjs/common';
import { WorkspaceId } from '../tenant/workspace-id.decorator';
import { CursorQuery } from './resource-query.dto';
import { WorkspaceResourceService } from './workspace-resource.service';

export const RESOURCE_SERVICE = 'RESOURCE_SERVICE';

export interface ResourceControllerOptions {
  path: string;            // 'workspaces/:workspaceId/customers'
  createDto: Type<unknown>;
  updateDto: Type<unknown>;
  listQuery?: Type<CursorQuery>;
}

export function createResourceController(opts: ResourceControllerOptions): Type<unknown> {
  const ListQ = opts.listQuery ?? CursorQuery;

  @Controller(opts.path)
  class ResourceController {
    constructor(@Inject(RESOURCE_SERVICE) public svc: WorkspaceResourceService<{ id: string }>) {}

    @Get() async list(@WorkspaceId() ws: string, @Query() q: CursorQuery) { return { value: await this.svc.list(ws, q) }; }
    @Get(':id') async get(@WorkspaceId() ws: string, @Param('id') id: string) { return { value: await this.svc.get(ws, id) }; }
    @Post() async create(@WorkspaceId() ws: string, @Body() dto: Record<string, unknown>) { return { value: await this.svc.create(ws, dto) }; }
    @Patch(':id') async update(@WorkspaceId() ws: string, @Param('id') id: string, @Body() dto: Record<string, unknown>) { return { value: await this.svc.update(ws, id, dto) }; }
    @Delete(':id') async remove(@WorkspaceId() ws: string, @Param('id') id: string) { return { value: await this.svc.remove(ws, id) }; }
  }

  // 用 DTO 类覆盖参数元数据,使全局 ValidationPipe 按域 DTO 校验/白名单
  const proto = ResourceController.prototype;
  Reflect.defineMetadata('design:paramtypes', [String, ListQ], proto, 'list');
  Reflect.defineMetadata('design:paramtypes', [String, opts.createDto], proto, 'create');
  Reflect.defineMetadata('design:paramtypes', [String, String, opts.updateDto], proto, 'update');
  return ResourceController;
}
```

> 注:`Reflect.defineMetadata('design:paramtypes', ...)` 显式覆盖参数类型元数据,让 ValidationPipe 拿到 DTO 类做校验(`@Body()` 本身不声明类型时 pipe 无 metatype 不校验)。NestJS 内部用 `@nestjs/common` 反射读取 body 参数的 metatype,paramtypes 数组按参数位置对应。

- [ ] **Step 2: 类型检查**

Run: `cd /e/code/aistudio/apps/api && npx tsc --noEmit -p tsconfig.json 2>&1 | grep workspace-resource.controller | head`
Expected: 无输出。

- [ ] **Step 3: Commit**

```bash
cd /e/code/aistudio && git add apps/api/src/common/resource/workspace-resource.controller.ts && git commit -m "feat(api): createResourceController mixin factory"
```

---

## Task 5: Customer DTO + buildWhere 过滤 + lead 合并 + 接入工厂

**Files:**
- Create: `apps/api/src/customer/dto.ts`
- Modify: `apps/api/src/customer/customer.service.ts`(加 buildWhere + createOrUpdateLead)
- Modify: `apps/api/src/customer/customer.controller.ts`(改用工厂 + lead 路由)
- Modify: `apps/api/src/customer/customer.module.ts`(绑定 RESOURCE_SERVICE token)
- Modify: `apps/api/test/customer.e2e-spec.ts`(加 buildWhere 过滤 + lead 合并用例)

- [ ] **Step 1: 写 customer DTO**

`apps/api/src/customer/dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const STAGES = ['new_lead', 'qualified', 'contacted', 'converted', 'inactive'] as const;

export class CreateCustomerDto {
  @IsOptional() @IsString() id?: string;  // 前端生成,供乐观更新 id 一致;Prisma create 接受显式 id
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsIn(STAGES as unknown as string[]) lifecycleStage?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsObject() source?: Record<string, unknown>;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateCustomerDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsIn(STAGES as unknown as string[]) lifecycleStage?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsObject() source?: Record<string, unknown>;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListCustomerQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STAGES as unknown as string[]) lifecycleStage?: string;
  @IsOptional() @IsString() channel?: string;
}
```

- [ ] **Step 2: 扩展 CustomerService(buildWhere + lead 合并)**

替换 `apps/api/src/customer/customer.service.ts` 全文:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { ListCustomerQuery, CreateCustomerDto } from './dto';

@Injectable()
export class CustomerService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.customer as unknown as PrismaResourceDelegate; }
  protected entityName = 'Customer';

  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListCustomerQuery;
    return {
      workspaceId,
      ...(q.lifecycleStage ? { lifecycleStage: q.lifecycleStage } : {}),
      ...(q.channel ? { channel: q.channel } : {}),
    };
  }

  // lead 去重合并:按 (name, company) 匹配。存在则合并 update,否则 create。
  async createOrUpdateLead(workspaceId: string, dto: CreateCustomerDto): Promise<{ id: string }> {
    const existing = (await this.prisma.customer.findFirst({
      where: { workspaceId, name: dto.name, company: dto.company ?? null },
    })) as { id: string; tags: string[]; metadata: Record<string, unknown> | null } | null;

    const incomingTags = [...new Set([...(dto.tags ?? []), 'marketing_lead'])];

    if (!existing) {
      return this.create(workspaceId, {
        ...dto,
        lifecycleStage: dto.lifecycleStage ?? 'new_lead',
        tags: incomingTags,
      });
    }
    const mergedTags = [...new Set([...(existing.tags ?? []), ...incomingTags])];
    return this.update(workspaceId, existing.id, {
      ...dto,
      tags: mergedTags,
      metadata: { ...(existing.metadata ?? {}), ...(dto.metadata ?? {}) },
    });
  }
}
```

- [ ] **Step 3: Controller 改用工厂 + lead 路由**

替换 `apps/api/src/customer/customer.controller.ts` 全文:

```typescript
import { Body, Controller, Post } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateCustomerDto, UpdateCustomerDto, ListCustomerQuery } from './dto';
import { CustomerService } from './customer.service';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/customers',
  createDto: CreateCustomerDto,
  updateDto: UpdateCustomerDto,
  listQuery: ListCustomerQuery,
}) as new (...args: any[]) => { svc: CustomerService };

@Controller('workspaces/:workspaceId/customers')
export class CustomerController extends Base {
  @Post('lead') async lead(@WorkspaceId() ws: string, @Body() dto: CreateCustomerDto) {
    return { value: await this.svc.createOrUpdateLead(ws, dto) };
  }
}
```

> 注:`CustomerController` 继承工厂生成的 Base 类(继承其 5 个 CRUD 路由),并额外加 `POST .../lead`。继承类与 Base 共用 `@Controller` 前缀路径。`svc` 在 Base 构造中通过 `@Inject(RESOURCE_SERVICE)` 注入。

- [ ] **Step 4: Module 绑定 RESOURCE_SERVICE token**

替换 `apps/api/src/customer/customer.module.ts` 全文:

```typescript
import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [CustomerController],
  providers: [CustomerService, { provide: RESOURCE_SERVICE, useExisting: CustomerService }],
})
export class CustomerModule {}
```

- [ ] **Step 5: 加 buildWhere 过滤 + lead 合并测试用例**

在 `apps/api/test/customer.e2e-spec.ts` 的最后一个 `it(...)` 之后(`describe` 闭合 `})` 之前)插入:

```typescript
  it('buildWhere filter: lifecycleStage and channel', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'flt@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/customers`)
      .send({ name: 'A', lifecycleStage: 'qualified', channel: 'web' })).expect(201);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/customers`)
      .send({ name: 'B', lifecycleStage: 'new_lead', channel: 'manual' })).expect(201);
    const q = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/customers?lifecycleStage=qualified`)).expect(200);
    expect(q.body.value.items).toHaveLength(1);
    expect(q.body.value.items[0].name).toBe('A');
  });

  it('lead merge: same (name, company) updates not duplicates', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'lead@test.dev');
    const a = auth(accessToken);
    const first = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/customers/lead`)
      .send({ name: 'Lead', company: 'Co', tags: ['src_a'] })).expect(201);
    const second = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/customers/lead`)
      .send({ name: 'Lead', company: 'Co', tags: ['src_b'] })).expect(201);
    expect(second.body.value.id).toBe(first.body.value.id);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/customers`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].tags.sort()).toEqual(['marketing_lead', 'src_a', 'src_b']);
  });
```

- [ ] **Step 6: 跑测试,确认全通过**

Run:
```bash
cd /e/code/aistudio/apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest customer --runInBand 2>&1 | tail -20
```
Expected: `Tests: 6 passed`。

- [ ] **Step 7: Commit**

```bash
cd /e/code/aistudio && git add apps/api/src/customer apps/api/test/customer.e2e-spec.ts && git commit -m "feat(api): customer DTO, buildWhere filter, lead merge via factory controller"
```

---

## Task 6: 前端泛型 repository 工厂

**Files:**
- Create: `src/lib/data/workspaceResourceClient.ts`
- Test: `scripts/workspace-resource-client.test.ts`

**背景:** 对齐 ④ `creditRepository` 的注入模式(`apiClient` 优先 + 缓存,未配置回退 localStorage)。后端 list 返回 `{ items, nextCursor }`;前端工厂的 `list` 解包为数组并缓存。写操作乐观更新缓存 + 失败回滚。

- [ ] **Step 1: 写工厂**

`src/lib/data/workspaceResourceClient.ts`:

```typescript
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';
import { getRepositoryStorage } from './dataBackend';
import type { StorageLike } from '../../saas/localAuthSession';

export interface ResourceContext {
  workspaceId: string;
  storage?: StorageLike | null;
}

export interface ResourceRepositoryConfig<T extends { id: string }> {
  resource: string;       // API 路径段,如 'customers'
  storagePrefix: string;  // localStorage 兜底键前缀
  normalize: (raw: unknown, ctx: ResourceContext) => T;
  sort?: (a: T, b: T) => number;
}

export interface ResourceRepository<T extends { id: string }> {
  configured: boolean;
  hydrate(ctx: ResourceContext): Promise<void>;
  list(ctx: ResourceContext): T[];
  create(ctx: ResourceContext, input: Partial<T>): Promise<T>;
  update(ctx: ResourceContext, id: string, patch: Partial<T>): Promise<T | null>;
  remove(ctx: ResourceContext, id: string): Promise<void>;
  __setApiClientForTest(client: ApiClient): void;
}

export function createWorkspaceResourceRepository<T extends { id: string }>(
  config: ResourceRepositoryConfig<T>,
): ResourceRepository<T> {
  let api: ApiClient = defaultApiClient;
  const cache = new Map<string, T[]>(); // key = workspaceId

  const storageKey = (ctx: ResourceContext) => `${config.storagePrefix}:${ctx.workspaceId}`;
  const applySort = (rows: T[]) => (config.sort ? rows.slice().sort(config.sort) : rows);

  function readLocal(ctx: ResourceContext): T[] {
    const storage = getRepositoryStorage(ctx.storage);
    const raw = storage?.getItem(storageKey(ctx));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? applySort(parsed.map((r) => config.normalize(r, ctx))) : [];
    } catch { return []; }
  }

  function writeLocal(ctx: ResourceContext, rows: T[]): T[] {
    const storage = getRepositoryStorage(ctx.storage);
    const normalized = applySort(rows.map((r) => config.normalize(r, ctx)));
    storage?.setItem(storageKey(ctx), JSON.stringify(normalized));
    return normalized;
  }

  return {
    get configured() { return api.configured; },

    async hydrate(ctx) {
      if (!api.configured) return;
      const res = await api.get<{ items: unknown[]; nextCursor: string | null }>(ctx.workspaceId, config.resource);
      if (res.ok && res.value && Array.isArray(res.value.items)) {
        cache.set(ctx.workspaceId, applySort(res.value.items.map((r) => config.normalize(r, ctx))));
      }
    },

    list(ctx) {
      if (!api.configured) return readLocal(ctx);
      return cache.get(ctx.workspaceId) ?? [];
    },

    async create(ctx, input) {
      if (!api.configured) {
        const created = config.normalize(input, ctx);
        writeLocal(ctx, [created, ...readLocal(ctx)]);
        return created;
      }
      // 乐观:先入缓存
      const optimistic = config.normalize(input, ctx);
      const prev = cache.get(ctx.workspaceId) ?? [];
      cache.set(ctx.workspaceId, applySort([optimistic, ...prev]));
      const res = await api.post<T>(ctx.workspaceId, config.resource, input);
      if (!res.ok || !res.value) { cache.set(ctx.workspaceId, prev); throw new Error(res.ok ? 'empty response' : res.error.message); }
      const saved = config.normalize(res.value, ctx);
      cache.set(ctx.workspaceId, applySort([saved, ...prev.filter((r) => r.id !== saved.id)]));
      return saved;
    },

    async update(ctx, id, patch) {
      if (!api.configured) {
        let updated: T | null = null;
        const rows = readLocal(ctx).map((r) => {
          if (r.id !== id) return r;
          updated = config.normalize({ ...r, ...patch, id }, ctx);
          return updated;
        });
        writeLocal(ctx, rows);
        return updated;
      }
      const prev = cache.get(ctx.workspaceId) ?? [];
      const res = await api.patch<T>(ctx.workspaceId, `${config.resource}/${id}`, patch);
      if (!res.ok) { cache.set(ctx.workspaceId, prev); throw new Error(res.error.message); }
      if (!res.value) return null;
      const saved = config.normalize(res.value, ctx);
      cache.set(ctx.workspaceId, applySort(prev.map((r) => (r.id === id ? saved : r))));
      return saved;
    },

    async remove(ctx, id) {
      if (!api.configured) {
        writeLocal(ctx, readLocal(ctx).filter((r) => r.id !== id));
        return;
      }
      const prev = cache.get(ctx.workspaceId) ?? [];
      cache.set(ctx.workspaceId, prev.filter((r) => r.id !== id)); // 乐观移除
      const res = await api.del(ctx.workspaceId, `${config.resource}/${id}`);
      if (!res.ok) { cache.set(ctx.workspaceId, prev); throw new Error(res.error.message); }
    },

    __setApiClientForTest(client) { api = client; },
  };
}
```

- [ ] **Step 2: 写工厂单测**

`scripts/workspace-resource-client.test.ts`:

```typescript
import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import { createWorkspaceResourceRepository } from '../src/lib/data/workspaceResourceClient.ts';

interface Row { id: string; name: string }
const normalize = (raw: unknown): Row => {
  const r = (raw ?? {}) as Partial<Row>;
  return { id: String(r.id ?? `row_${Math.random().toString(36).slice(2, 8)}`), name: String(r.name ?? '') };
};

function okApi(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    configured: true,
    get: async () => ({ ok: true, value: { items: [{ id: 'a', name: 'A' }], nextCursor: null } }) as any,
    post: async (_ws, _p, body: any) => ({ ok: true, value: { id: body.id ?? 'srv', name: body.name } }) as any,
    patch: async (_ws, _p, body: any) => ({ ok: true, value: { id: 'a', name: body.name } }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
    ...overrides,
  } as any;
}

async function run() {
  // configured: hydrate 填缓存,list 读缓存
  const repo = createWorkspaceResourceRepository<Row>({ resource: 'rows', storagePrefix: 'test_rows', normalize });
  repo.__setApiClientForTest(okApi());
  await repo.hydrate({ workspaceId: 'w' });
  assert.equal(repo.list({ workspaceId: 'w' }).length, 1);

  // create 乐观 + 服务端覆盖
  const created = await repo.create({ workspaceId: 'w' }, { id: 'b', name: 'B' });
  assert.equal(created.id, 'b');
  assert.equal(repo.list({ workspaceId: 'w' }).some((r) => r.id === 'b'), true);

  // 失败回滚:post 失败,缓存复原(create 前长度)
  const before = repo.list({ workspaceId: 'w' }).length;
  repo.__setApiClientForTest(okApi({ post: async () => ({ ok: false, error: { code: 'network_error', message: 'x' } }) as any }));
  await assert.rejects(repo.create({ workspaceId: 'w' }, { id: 'c', name: 'C' }));
  assert.equal(repo.list({ workspaceId: 'w' }).length, before);

  // 未配置:走 localStorage(用内存 storage stub)
  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  const local = createWorkspaceResourceRepository<Row>({ resource: 'rows', storagePrefix: 'test_rows', normalize });
  local.__setApiClientForTest({ configured: false } as any);
  await local.create({ workspaceId: 'w', storage }, { id: 'l1', name: 'L1' });
  assert.equal(local.list({ workspaceId: 'w', storage }).length, 1);

  console.log('workspace resource client passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: 跑测试**

Run: `cd /e/code/aistudio && npx tsx scripts/workspace-resource-client.test.ts`
Expected: `workspace resource client passed`

- [ ] **Step 4: Commit**

```bash
cd /e/code/aistudio && git add src/lib/data/workspaceResourceClient.ts scripts/workspace-resource-client.test.ts && git commit -m "feat(web): generic workspace resource repository factory"
```

---

## Task 7: 重写 customerRepository 调用工厂(保留导出签名)

**Files:**
- Modify: `src/lib/data/customerRepository.ts`(在文件末尾追加工厂接线 + 改写公开函数;保留所有 interface、normalize、storageKey)

**约束:** 保留全部现有导出函数签名(`loadWorkspaceCustomers`、`saveWorkspaceCustomers`、`createWorkspaceCustomer`、`updateWorkspaceCustomer`、`createOrUpdateWorkspaceCustomerLead`),UI 组件零改动。现有的 `normalizeCustomer`、`sortCustomers`、`storageKey`、`customerMatchKey`、`readCustomers`、`writeCustomers` 保留(本地兜底路径仍用)。

- [ ] **Step 1: 在文件顶部 import 工厂与 apiClient**

`src/lib/data/customerRepository.ts` 顶部 import 区(第 1-3 行附近)加:

```typescript
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';
```

- [ ] **Step 2: 在文件末尾追加 API 接线层**

在 `customerRepository.ts` 末尾(`customerMatchKey` 及现有 CRUD 函数之后)追加。**关键:** 现有同步函数 `createWorkspaceCustomer`/`updateWorkspaceCustomer` 保持同步本地行为不变(UI 依赖同步返回);新增 API 写穿透为「乐观本地 + 后台 fire-and-forget POST/PATCH」,与 ④ usageRepository write-through 模式一致。

```typescript
let customerApiClient: ApiClient = defaultApiClient;
export function __setCustomerApiClientForTest(client: ApiClient): void { customerApiClient = client; }

const customerCache = new Map<string, WorkspaceCustomer[]>(); // key = workspaceId

export async function hydrateWorkspaceCustomers(context: CustomerRepositoryContext): Promise<void> {
  if (!customerApiClient.configured) return;
  const res = await customerApiClient.get<{ items: WorkspaceCustomer[]; nextCursor: string | null }>(
    context.workspaceId, 'customers');
  if (res.ok && res.value && Array.isArray(res.value.items)) {
    customerCache.set(context.workspaceId, sortCustomers(res.value.items.map((c) => normalizeCustomer(c, context))));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('workspace_customers_updated', { detail: { workspaceId: context.workspaceId } }));
    }
  }
}
```

- [ ] **Step 3: 改写公开读函数走缓存优先**

替换 `loadWorkspaceCustomers` 函数体:

```typescript
export function loadWorkspaceCustomers(context: CustomerRepositoryContext): WorkspaceCustomer[] {
  if (customerApiClient.configured) return customerCache.get(context.workspaceId) ?? [];
  return readCustomers(context);
}
```

- [ ] **Step 4: create/update/lead 加 API 写穿透**

在 `createWorkspaceCustomer` 的 `writeCustomers(...)` 行之后、`return customer;` 之前插入写穿透;configured 时同步更新缓存 + 后台 POST:

```typescript
  if (customerApiClient.configured) {
    customerCache.set(context.workspaceId, sortCustomers([customer, ...(customerCache.get(context.workspaceId) ?? [])]));
    void customerApiClient.post(context.workspaceId, 'customers', {
      id: customer.id, name: customer.name, company: customer.company, role: customer.role,
      channel: customer.channel, lifecycleStage: customer.lifecycleStage, ownerId: customer.ownerId,
      tags: customer.tags, source: customer.source, notes: customer.notes, metadata: customer.metadata,
    }).then((r) => { if (!r.ok) console.error('createWorkspaceCustomer write-through failed', r); })
      .catch((e) => console.error('createWorkspaceCustomer write-through failed', e));
  }
```

在 `updateWorkspaceCustomer` 的 `writeCustomers(...)` 行之后、`return updatedCustomer;` 之前插入:

```typescript
  if (customerApiClient.configured && updatedCustomer) {
    const u = updatedCustomer;
    customerCache.set(context.workspaceId, sortCustomers((customerCache.get(context.workspaceId) ?? []).map((c) => (c.id === u.id ? u : c))));
    void customerApiClient.patch(context.workspaceId, `customers/${u.id}`, {
      name: u.name, company: u.company, role: u.role, channel: u.channel, lifecycleStage: u.lifecycleStage,
      ownerId: u.ownerId, tags: u.tags, source: u.source, notes: u.notes, metadata: u.metadata,
    }).then((r) => { if (!r.ok) console.error('updateWorkspaceCustomer write-through failed', r); })
      .catch((e) => console.error('updateWorkspaceCustomer write-through failed', e));
  }
```

`createOrUpdateWorkspaceCustomerLead`:在函数最前面加 configured 分支走后端 lead 端点(同步返回乐观结果,后台对账):

```typescript
  if (customerApiClient.configured) {
    const now = context.now ?? Date.now();
    const optimistic = normalizeCustomer(
      { id: `customer_${now}_${Math.random().toString(36).slice(2, 8)}`, ...input,
        tags: [...normalizeTags(input.tags), 'marketing_lead'], createdAt: now, updatedAt: now },
      context);
    customerCache.set(context.workspaceId, sortCustomers([optimistic, ...(customerCache.get(context.workspaceId) ?? []).filter((c) => customerMatchKey(c) !== customerMatchKey(input))]));
    void customerApiClient.post(context.workspaceId, 'customers/lead', {
      name: input.name, company: input.company, role: input.role, channel: input.channel,
      lifecycleStage: input.lifecycleStage, ownerId: input.ownerId, tags: input.tags,
      source: input.source, notes: input.notes, metadata: input.metadata,
    }).then((r) => { if (r.ok && r.value) void hydrateWorkspaceCustomers(context); })
      .catch((e) => console.error('lead write-through failed', e));
    return optimistic;
  }
```

- [ ] **Step 5: 类型检查**

Run: `cd /e/code/aistudio && npm run lint 2>&1 | tail -15`
Expected: 无 customerRepository 相关错误(`tsc --noEmit` 通过)。

- [ ] **Step 6: Commit**

```bash
cd /e/code/aistudio && git add src/lib/data/customerRepository.ts && git commit -m "feat(web): customerRepository backend write-through + cache, local fallback preserved"
```

---

## Task 8: customer-repository 测试 + package.json 聚合

**Files:**
- Create: `scripts/customer-repository.test.ts`
- Modify: `package.json`(scripts + test:p0-specialized 聚合)

- [ ] **Step 1: 写 customer repository 测试**

`scripts/customer-repository.test.ts`:

```typescript
import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setCustomerApiClientForTest,
  hydrateWorkspaceCustomers,
  loadWorkspaceCustomers,
  createWorkspaceCustomer,
} from '../src/lib/data/customerRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'customers') return { ok: true, value: { items: [{ id: 'srv1', name: 'Server Cust' }], nextCursor: null } } as any;
      return { ok: true, value: null } as any;
    },
    post: async () => ({ ok: true, value: {} }) as any,
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
}

async function run() {
  // configured: hydrate 后 load 读后端缓存
  __setCustomerApiClientForTest(fakeApi(true));
  await hydrateWorkspaceCustomers({ workspaceId: 'wsA' });
  const fromBackend = loadWorkspaceCustomers({ workspaceId: 'wsA' });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].name, 'Server Cust');

  // configured: create 乐观入缓存(同步可见)
  createWorkspaceCustomer({ name: 'New One' }, { workspaceId: 'wsA' });
  const afterCreate = loadWorkspaceCustomers({ workspaceId: 'wsA' });
  assert.equal(afterCreate.some((c) => c.name === 'New One'), true);

  // 未配置:回退 localStorage
  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setCustomerApiClientForTest(fakeApi(false));
  createWorkspaceCustomer({ name: 'Local One' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceCustomers({ workspaceId: 'wsB', storage });
  assert.equal(local.length, 1);
  assert.equal(local[0].name, 'Local One');

  console.log('customer repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: 跑测试**

Run: `cd /e/code/aistudio && npx tsx scripts/customer-repository.test.ts`
Expected: `customer repository passed`

- [ ] **Step 3: 加 package.json scripts 并纳入聚合**

`package.json` 的 `scripts` 加两行:

```json
    "test:workspace-resource": "tsx scripts/workspace-resource-client.test.ts",
    "test:customer-repo": "tsx scripts/customer-repository.test.ts",
```

找到 `test:p0-specialized` 脚本(形如 `"test:p0-specialized": "npm run test:A && npm run test:B && ..."`),在链末尾追加 `&& npm run test:workspace-resource && npm run test:customer-repo`。

- [ ] **Step 4: 跑聚合套件确认绿**

Run: `cd /e/code/aistudio && npm run test:p0-specialized 2>&1 | tail -25`
Expected: 全部通过,含 `workspace resource client passed` 与 `customer repository passed`。

- [ ] **Step 5: Commit**

```bash
cd /e/code/aistudio && git add scripts/customer-repository.test.ts package.json && git commit -m "test(web): customer repository tests + p0-specialized aggregation"
```

---

## Task 9: 全量验收

**Files:** 无(仅运行验收)

- [ ] **Step 1: 后端全 e2e(无回归)**

Run:
```bash
cd /e/code/aistudio/apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand 2>&1 | tail -15
```
Expected: 所有 suite 通过(含 customer.e2e-spec 6 passed),无回归。

- [ ] **Step 2: 前端 lint**

Run: `cd /e/code/aistudio && npm run lint 2>&1 | tail -10`
Expected: 无类型错误。

- [ ] **Step 3: 前端 build**

Run: `cd /e/code/aistudio && npm run build 2>&1 | tail -10`
Expected: 构建成功。

- [ ] **Step 4: 前端 p0-specialized + saas-foundation**

Run: `cd /e/code/aistudio && npm run test:p0-specialized 2>&1 | tail -15 && npx tsx scripts/saas-foundation.test.ts 2>&1 | tail -5`
Expected: 全绿。

- [ ] **Step 5: 最终提交(若验收中有微调)**

```bash
cd /e/code/aistudio && git status
# 若工作树干净则无需提交;若有验收修正,git add <files> && git commit -m "fix(resource): acceptance fixes"
```




