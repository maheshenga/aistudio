# ⑤b-2 特殊逻辑业务域上后端 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 ticket / payment / taxEvent / task 4 个带特殊逻辑的 local-only repository 迁到后端,套 ⑤a 工厂模板,所有派生/聚合逻辑保留前端、后端零自定义端点。

**Architecture:** 每域后端「四件套」(dto + service extends `WorkspaceResourceService` + controller via `createResourceController` + module),注册进 `app.module.ts`;前端 repo 加 apiClient 写穿透 + cache + hydrate,保留全部现有导出与本地兜底。唯一允许的后端 override 是 `buildWhere` status/column 过滤(同 ⑤b-1)。

**Tech Stack:** NestJS 10 + Prisma 5 + PostgreSQL(后端);React 19 + Vite + TypeScript(前端);后端 Jest e2e 打 Docker Postgres(:5433),前端 tsx + `node:assert/strict`。

**关键约定:**
- 后端 e2e 跑测命令(`--config test/jest-e2e.json` 必须带):
  `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json <spec-file>`
- 前端测试是 tsx 脚本(无 Jest);`npm run lint` = `tsc --noEmit`,tsx 不做类型检查,lint 必须单独跑。
- controller 用 `createResourceController` 工厂,返回类型 `unknown`,故 `const Base = createResourceController({...}) as new (...args: any[]) => object;`(同 ⑤b-1 media)。
- git user 是 maheshenga,绝不改 git config,绝不 push。
- 全局 ValidationPipe `whitelist:true, forbidNonWhitelisted:true`——DTO 没有的字段会被拒 400(payment 借此拒 accountNumber、taxEvent 拒 daysUntil)。
- 时间戳:DB 用 `DateTime?` 返 ISO 字符串,前端 normalizeTimestamp 需解析 ISO:`typeof value === 'string' && !/^\d+$/.test(value.trim()) ? Date.parse(value) : Number(value)`。

---

## Task 0: Prisma 4 模型 + migration + resetDb

**Files:**
- Modify: `apps/api/prisma/schema.prisma`(加 4 模型 + Workspace 4 反向关系)
- Modify: `apps/api/test/helpers.ts:26-32`(resetDb 加 4 deleteMany)

- [ ] **Step 1: 加 4 个 Prisma 模型**

在 `apps/api/prisma/schema.prisma` 末尾(`KeywordLibrary` 模型之后)追加:

```prisma
model Ticket {
  id                   String    @id @default(cuid())
  workspaceId          String
  requesterName        String
  requesterEmail       String    @default("")
  category             String
  subject              String
  status               String    @default("open")
  priority             String    @default("medium")
  resolvedAt           DateTime?
  firstResponseMinutes Int?
  metadata             Json?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  workspace            Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, createdAt])
  @@index([workspaceId, status])
}

model PaymentMethod {
  id            String    @id @default(cuid())
  workspaceId   String
  label         String
  provider      String
  brand         String
  last4         String    @default("")
  status        String    @default("active")
  isDefault     Boolean   @default(false)
  credentialRef String?
  metadata      Json?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  workspace     Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, createdAt])
}

model TaxEvent {
  id           String    @id @default(cuid())
  workspaceId  String
  date         String
  title        String
  type         String
  description  String    @default("")
  summary      String    @default("")
  amount       String?
  status       String    @default("pending")
  metadata     Json?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, createdAt])
  @@index([workspaceId, status])
}

model Task {
  id                  String    @id @default(cuid())
  workspaceId         String
  title               String
  column              String    @default("todo")
  priority            String    @default("Medium")
  type                String    @default("")
  date                String    @default("")
  isAuto              Boolean   @default(false)
  status              String?
  runtimeMode         String?
  runtimeProviderKind String?
  runtimeTaskId       String?
  runtimeStatus       String?
  agentId             String?
  runtimeId           String?
  externalRef         String?
  lastRuntimeEventAt  DateTime?
  metadata            Json?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  workspace           Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, createdAt])
  @@index([workspaceId, column])
}
```

- [ ] **Step 2: Workspace 加 4 反向关系**

在 `apps/api/prisma/schema.prisma` 的 `Workspace` 模型里,`keywordLibraries KeywordLibrary[]` 行之后追加:

```prisma
  tickets          Ticket[]
  paymentMethods   PaymentMethod[]
  taxEvents        TaxEvent[]
  tasks            Task[]
```

- [ ] **Step 3: 跑 migration**

Run:
```bash
cd apps/api && DATABASE_URL="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" npx prisma migrate dev --name add_special_logic_resources
```
Expected: 新 migration 生成,Prisma Client 重新生成,无错误。

- [ ] **Step 4: resetDb 加 4 deleteMany**

在 `apps/api/test/helpers.ts` 的 `await prisma.keywordLibrary.deleteMany();`(第 32 行)之后插入:

```typescript
  await prisma.ticket.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.taxEvent.deleteMany();
  await prisma.task.deleteMany();
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations apps/api/test/helpers.ts
git commit -m "feat(api): add 4 special-logic resource models + migration + resetDb"
```

---

## Task 1: Ticket 端到端

差异点:`resolvedAt`(status→resolved 时前端置 now)写穿透转 ISO;`summarizeWorkspaceTickets` 留前端;无 delete 导出但工厂仍暴露 DELETE;status 过滤。

**Files:**
- Create: `apps/api/src/ticket/dto.ts`
- Create: `apps/api/src/ticket/ticket.service.ts`
- Create: `apps/api/src/ticket/ticket.controller.ts`
- Create: `apps/api/src/ticket/ticket.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/ticket.e2e-spec.ts`
- Modify: `src/lib/data/ticketRepository.ts`
- Create: `scripts/ticket-repository.test.ts`
- Modify: `package.json`

- [ ] **Step 1: 写后端 e2e(先失败)**

Create `apps/api/test/ticket.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Ticket resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'tk1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tickets`)
      .send({ requesterName: 'Chen', category: 'billing', subject: 'Refund', priority: 'high' })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.requesterName).toBe('Chen');
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/tickets/${id}`)).expect(200);
    expect(got.body.value.subject).toBe('Refund');
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/tickets/${id}`)
      .send({ status: 'resolved', resolvedAt: new Date().toISOString(), firstResponseMinutes: 30 })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/tickets`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].status).toBe('resolved');
    expect(listed.body.value.items[0].firstResponseMinutes).toBe(30);
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/tickets/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/tickets`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'tkiso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/tickets`).send({ requesterName: 'X', category: 'c', subject: 'Secret' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'tkiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/tickets/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/tickets/${id}`).send({ status: 'closed' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/tickets/${id}`)).expect(404);
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'tkpg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tickets`)
        .send({ requesterName: `r${i}`, category: 'c', subject: `s${i}` })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tickets?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tickets?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tickets?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'tkm1@test.dev');
    const a2 = await registerUser(app, 'tkm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/tickets`)).expect(403);
  });

  it('status filter', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'tkflt@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tickets`)
      .send({ requesterName: 'A', category: 'c', subject: 's', status: 'open' })).expect(201);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tickets`)
      .send({ requesterName: 'B', category: 'c', subject: 's', status: 'closed' })).expect(201);
    const q = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tickets?status=open`)).expect(200);
    expect(q.body.value.items).toHaveLength(1);
    expect(q.body.value.items[0].requesterName).toBe('A');
  });
});
```

- [ ] **Step 2: 跑 e2e 确认失败**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json ticket.e2e-spec.ts`
Expected: FAIL(路由未注册)。

- [ ] **Step 3: 写 dto.ts**

Create `apps/api/src/ticket/dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export class CreateTicketDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) requesterName!: string;
  @IsOptional() @IsString() requesterEmail?: string;
  @IsString() @MinLength(1) category!: string;
  @IsString() @MinLength(1) subject!: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsIn(PRIORITIES as unknown as string[]) priority?: string;
  @IsOptional() @IsDateString() resolvedAt?: string;
  @IsOptional() @IsInt() @Min(0) firstResponseMinutes?: number;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateTicketDto {
  @IsOptional() @IsString() @MinLength(1) requesterName?: string;
  @IsOptional() @IsString() requesterEmail?: string;
  @IsOptional() @IsString() @MinLength(1) category?: string;
  @IsOptional() @IsString() @MinLength(1) subject?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsIn(PRIORITIES as unknown as string[]) priority?: string;
  @IsOptional() @IsDateString() resolvedAt?: string;
  @IsOptional() @IsInt() @Min(0) firstResponseMinutes?: number;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListTicketQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
```

- [ ] **Step 4: 写 service**

Create `apps/api/src/ticket/ticket.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { ListTicketQuery } from './dto';

@Injectable()
export class TicketService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.ticket as unknown as PrismaResourceDelegate; }
  protected entityName = 'Ticket';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListTicketQuery;
    return { workspaceId, ...(q.status ? { status: q.status } : {}) };
  }
}
```

- [ ] **Step 5: 写 controller**

Create `apps/api/src/ticket/ticket.controller.ts`:

```typescript
import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateTicketDto, UpdateTicketDto, ListTicketQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/tickets',
  createDto: CreateTicketDto, updateDto: UpdateTicketDto, listQuery: ListTicketQuery,
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/tickets')
export class TicketController extends Base {}
```

- [ ] **Step 6: 写 module**

Create `apps/api/src/ticket/ticket.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [TicketController],
  providers: [TicketService, { provide: RESOURCE_SERVICE, useExisting: TicketService }],
})
export class TicketModule {}
```

- [ ] **Step 7: app.module.ts 注册**

在 `apps/api/src/app.module.ts` import 区(`import { KeywordModule } ...` 之后)加:
```typescript
import { TicketModule } from './ticket/ticket.module';
```
`imports` 数组末尾(`KeywordModule` 之后)加 `, TicketModule`。

- [ ] **Step 8: 跑 e2e 确认通过**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json ticket.e2e-spec.ts`
Expected: 5 tests PASS。

- [ ] **Step 9: Commit 后端**

```bash
git add apps/api/src/ticket apps/api/src/app.module.ts apps/api/test/ticket.e2e-spec.ts
git commit -m "feat(api): add ticket resource (status filter)"
```

- [ ] **Step 10: 前端 normalizeTimestamp 支持 ISO**

Modify `src/lib/data/ticketRepository.ts` 的 `normalizeTimestamp`(108-111 行)为:
```typescript
function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = typeof value === 'string' && !/^\d+$/.test(value.trim())
    ? Date.parse(value)
    : Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}
```
并把 `normalizeNullableTimestamp`(113-117 行)为:
```typescript
function normalizeNullableTimestamp(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = typeof value === 'string' && !/^\d+$/.test(value.trim())
    ? Date.parse(value)
    : Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : null;
}
```

- [ ] **Step 11: 前端 repo 加 apiClient 写穿透**

Modify `src/lib/data/ticketRepository.ts`。

(a) 顶部 import 区(`import { getRepositoryStorage } from './dataBackend';` 之后)加:
```typescript
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';
```

(b) 改 `loadWorkspaceTickets`(现 `return readTickets(context);`)为:
```typescript
export function loadWorkspaceTickets(context: TicketRepositoryContext): WorkspaceTicket[] {
  if (ticketApiClient.configured) return ticketCache.get(context.workspaceId) ?? [];
  return readTickets(context);
}
```

(c) 在 `createWorkspaceTicket` 的 `writeTickets([ticket, ...ensureDefaultWorkspaceTickets(context)], context);` 之后、`return ticket;` 之前插入:
```typescript
  if (ticketApiClient.configured) {
    ticketCache.set(context.workspaceId, sortTickets([ticket, ...(ticketCache.get(context.workspaceId) ?? [])]));
    void ticketApiClient.post(context.workspaceId, 'tickets', {
      id: ticket.id, requesterName: ticket.requesterName, requesterEmail: ticket.requesterEmail,
      category: ticket.category, subject: ticket.subject, status: ticket.status, priority: ticket.priority,
      resolvedAt: ticket.resolvedAt && ticket.resolvedAt > 0 ? new Date(ticket.resolvedAt).toISOString() : undefined,
      firstResponseMinutes: ticket.firstResponseMinutes ?? undefined, metadata: ticket.metadata,
    }).then((r) => { if (!r.ok) console.error('createWorkspaceTicket write-through failed', r); })
      .catch((e) => console.error('createWorkspaceTicket write-through failed', e));
  }
```

(d) 在 `updateWorkspaceTicket` 的 `writeTickets(updatedTickets, context);` 之后、`return updatedTicket;` 之前插入:
```typescript
  if (ticketApiClient.configured && updatedTicket) {
    const u: WorkspaceTicket = updatedTicket;
    ticketCache.set(context.workspaceId, sortTickets((ticketCache.get(context.workspaceId) ?? []).map((t) => (t.id === u.id ? u : t))));
    void ticketApiClient.patch(context.workspaceId, `tickets/${u.id}`, {
      requesterName: u.requesterName, requesterEmail: u.requesterEmail, category: u.category, subject: u.subject,
      status: u.status, priority: u.priority,
      resolvedAt: u.resolvedAt && u.resolvedAt > 0 ? new Date(u.resolvedAt).toISOString() : undefined,
      firstResponseMinutes: u.firstResponseMinutes ?? undefined, metadata: u.metadata,
    }).then((r) => { if (!r.ok) console.error('updateWorkspaceTicket write-through failed', r); })
      .catch((e) => console.error('updateWorkspaceTicket write-through failed', e));
  }
```

(e) 文件末尾(`summarizeWorkspaceTickets` 函数之后)追加:
```typescript
let ticketApiClient: ApiClient = defaultApiClient;
export function __setTicketApiClientForTest(client: ApiClient): void { ticketApiClient = client; }

const ticketCache = new Map<string, WorkspaceTicket[]>(); // key = workspaceId

export async function hydrateWorkspaceTickets(context: TicketRepositoryContext): Promise<void> {
  if (!ticketApiClient.configured) return;
  const res = await ticketApiClient.get<{ items: WorkspaceTicket[]; nextCursor: string | null }>(
    context.workspaceId, 'tickets');
  if (res.ok && res.value && Array.isArray(res.value.items)) {
    ticketCache.set(context.workspaceId, sortTickets(res.value.items.map((t) => normalizeTicket(t, context))));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('workspace_tickets_updated', { detail: { workspaceId: context.workspaceId } }));
    }
  }
}
```

- [ ] **Step 12: 写前端单测**

Create `scripts/ticket-repository.test.ts`:

```typescript
import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setTicketApiClientForTest,
  hydrateWorkspaceTickets,
  loadWorkspaceTickets,
  createWorkspaceTicket,
} from '../src/lib/data/ticketRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'tickets') return { ok: true, value: { items: [{ id: 'srv1', requesterName: 'Server', category: 'c', subject: 'Srv', status: 'open' }], nextCursor: null } } as any;
      return { ok: true, value: null } as any;
    },
    post: async () => ({ ok: true, value: {} }) as any,
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
}

async function run() {
  const memA = new Map<string, string>();
  const storageA = { getItem: (k: string) => memA.get(k) ?? null, setItem: (k: string, v: string) => void memA.set(k, v), removeItem: (k: string) => void memA.delete(k) } as any;

  __setTicketApiClientForTest(fakeApi(true));
  await hydrateWorkspaceTickets({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceTickets({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].requesterName, 'Server');

  createWorkspaceTicket({ requesterName: 'New', category: 'c', subject: 'New One' }, { workspaceId: 'wsA', storage: storageA });
  const afterCreate = loadWorkspaceTickets({ workspaceId: 'wsA', storage: storageA });
  assert.equal(afterCreate.some((t) => t.subject === 'New One'), true);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setTicketApiClientForTest(fakeApi(false));
  createWorkspaceTicket({ requesterName: 'Local', category: 'c', subject: 'Local One' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceTickets({ workspaceId: 'wsB', storage });
  assert.equal(local.some((t) => t.subject === 'Local One'), true);

  console.log('ticket repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 13: package.json 加脚本**

`scripts` 块(`"test:keyword-repo": ...` 之后)加 `"test:ticket-repo": "tsx scripts/ticket-repository.test.ts"`(注意前一行补逗号);`test:p0-specialized` 末尾追加 ` && npm run test:ticket-repo`。

- [ ] **Step 14: 跑前端单测 + lint**

Run: `npx tsx scripts/ticket-repository.test.ts && npm run lint`
Expected: 打印 `ticket repository passed`;lint 无错误。

- [ ] **Step 15: Commit 前端**

```bash
git add src/lib/data/ticketRepository.ts scripts/ticket-repository.test.ts package.json
git commit -m "feat(web): wire ticketRepository to backend with localStorage fallback"
```

---

## Task 2: PaymentMethod 端到端

差异点:DTO 无 accountNumber(明文账号不上后端,whitelist 400 验证);create/update 前端从 accountNumber 派生 last4/credentialRef 后只发派生值;`ensureSingleDefault` 留前端(isDefault=true 时把其它方法置 false 并对每条变更发 PATCH);无 delete 导出。

**Files:**
- Create: `apps/api/src/payment/dto.ts`
- Create: `apps/api/src/payment/payment.service.ts`
- Create: `apps/api/src/payment/payment.controller.ts`
- Create: `apps/api/src/payment/payment.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/payment.e2e-spec.ts`
- Modify: `src/lib/data/paymentRepository.ts`
- Create: `scripts/payment-repository.test.ts`
- Modify: `package.json`

- [ ] **Step 1: 写后端 e2e(先失败)**

Create `apps/api/test/payment.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('PaymentMethod resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'pm1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/payment-methods`)
      .send({ label: 'Primary', provider: 'Stripe', brand: 'Visa', last4: '4242', isDefault: true })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.last4).toBe('4242');
    expect(created.body.value.isDefault).toBe(true);
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/payment-methods/${id}`)).expect(200);
    expect(got.body.value.provider).toBe('Stripe');
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/payment-methods/${id}`)
      .send({ status: 'disabled' })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/payment-methods`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].status).toBe('disabled');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/payment-methods/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/payment-methods`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('rejects unknown accountNumber field (whitelist)', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'pmwl@test.dev');
    await auth(accessToken)(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/payment-methods`)
      .send({ label: 'X', provider: 'Stripe', brand: 'Visa', last4: '1111', accountNumber: '4242424242424242' })).expect(400);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'pmiso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/payment-methods`).send({ label: 'Secret', provider: 'Stripe', brand: 'Visa', last4: '9999' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'pmiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/payment-methods/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/payment-methods/${id}`).send({ status: 'disabled' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/payment-methods/${id}`)).expect(404);
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'pmpg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/payment-methods`)
        .send({ label: `m${i}`, provider: 'Stripe', brand: 'Visa', last4: `000${i}` })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/payment-methods?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/payment-methods?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/payment-methods?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'pmm1@test.dev');
    const a2 = await registerUser(app, 'pmm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/payment-methods`)).expect(403);
  });
});
```

- [ ] **Step 2: 跑 e2e 确认失败**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json payment.e2e-spec.ts`
Expected: FAIL(路由未注册)。

- [ ] **Step 3: 写 dto.ts**

Create `apps/api/src/payment/dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const STATUSES = ['active', 'expired', 'disabled', 'needs_action'] as const;

export class CreatePaymentMethodDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) label!: string;
  @IsString() @MinLength(1) provider!: string;
  @IsString() @MinLength(1) brand!: string;
  @IsOptional() @IsString() last4?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsString() credentialRef?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdatePaymentMethodDto {
  @IsOptional() @IsString() @MinLength(1) label?: string;
  @IsOptional() @IsString() @MinLength(1) provider?: string;
  @IsOptional() @IsString() @MinLength(1) brand?: string;
  @IsOptional() @IsString() last4?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsString() credentialRef?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListPaymentMethodQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
```
注意:**无 accountNumber 字段**——明文账号绝不上后端。

- [ ] **Step 4: 写 service**

Create `apps/api/src/payment/payment.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { ListPaymentMethodQuery } from './dto';

@Injectable()
export class PaymentService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.paymentMethod as unknown as PrismaResourceDelegate; }
  protected entityName = 'PaymentMethod';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListPaymentMethodQuery;
    return { workspaceId, ...(q.status ? { status: q.status } : {}) };
  }
}
```

- [ ] **Step 5: 写 controller**

Create `apps/api/src/payment/payment.controller.ts`:

```typescript
import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto, ListPaymentMethodQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/payment-methods',
  createDto: CreatePaymentMethodDto, updateDto: UpdatePaymentMethodDto, listQuery: ListPaymentMethodQuery,
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/payment-methods')
export class PaymentController extends Base {}
```

- [ ] **Step 6: 写 module**

Create `apps/api/src/payment/payment.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, { provide: RESOURCE_SERVICE, useExisting: PaymentService }],
})
export class PaymentModule {}
```

- [ ] **Step 7: app.module.ts 注册**

import 区加 `import { PaymentModule } from './payment/payment.module';`;`imports` 数组末尾加 `, PaymentModule`。

- [ ] **Step 8: 跑 e2e 确认通过**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json payment.e2e-spec.ts`
Expected: 5 tests PASS。

- [ ] **Step 9: Commit 后端**

```bash
git add apps/api/src/payment apps/api/src/app.module.ts apps/api/test/payment.e2e-spec.ts
git commit -m "feat(api): add payment-method resource (no raw accountNumber stored)"
```

- [ ] **Step 10: 前端 normalizeTimestamp 支持 ISO**

Modify `src/lib/data/paymentRepository.ts` 的 `normalizeTimestamp`(74-77 行)为:
```typescript
function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = typeof value === 'string' && !/^\d+$/.test(value.trim())
    ? Date.parse(value)
    : Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}
```

- [ ] **Step 11: 前端 repo 加 apiClient 写穿透(含 ensureSingleDefault 多条 PATCH)**

Modify `src/lib/data/paymentRepository.ts`。

(a) 顶部 import 区(`import { getRepositoryStorage } from './dataBackend';` 之后)加:
```typescript
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';
```

(b) 改 `loadWorkspacePaymentMethods`(现 `return readPaymentMethods(context);`)为:
```typescript
export function loadWorkspacePaymentMethods(context: PaymentRepositoryContext): WorkspacePaymentMethod[] {
  if (paymentApiClient.configured) return paymentCache.get(context.workspaceId) ?? [];
  return readPaymentMethods(context);
}
```

(c) 在 `createWorkspacePaymentMethod` 的 `writePaymentMethods([method, ...ensureDefaultWorkspacePaymentMethods(context)], context);` 之后、`return method;` 之前插入:
```typescript
  if (paymentApiClient.configured) {
    const nextCache = sortPaymentMethods(ensureSingleDefault([method, ...(paymentCache.get(context.workspaceId) ?? [])]));
    paymentCache.set(context.workspaceId, nextCache);
    void paymentApiClient.post(context.workspaceId, 'payment-methods', {
      id: method.id, label: method.label, provider: method.provider, brand: method.brand, last4: method.last4,
      status: method.status, isDefault: method.isDefault, credentialRef: method.credentialRef ?? undefined,
      metadata: method.metadata,
    }).then((r) => { if (!r.ok) console.error('createWorkspacePaymentMethod write-through failed', r); })
      .catch((e) => console.error('createWorkspacePaymentMethod write-through failed', e));
    if (method.isDefault) {
      for (const other of nextCache) {
        if (other.id !== method.id && other.isDefault === false) {
          void paymentApiClient.patch(context.workspaceId, `payment-methods/${other.id}`, { isDefault: false })
            .then((r) => { if (!r.ok) console.error('payment ensureSingleDefault PATCH failed', r); })
            .catch((e) => console.error('payment ensureSingleDefault PATCH failed', e));
        }
      }
    }
  }
```
注意:`ensureSingleDefault` 是纯函数,已把缓存里其它方法 isDefault 置 false;上面循环对每条非新方法且 isDefault=false 的发 PATCH(幂等,后端多收无害)。

(d) 在 `updateWorkspacePaymentMethod` 的 `writePaymentMethods(updatedMethods, context);` 之后、`return updatedMethod;` 之前插入:
```typescript
  if (paymentApiClient.configured && updatedMethod) {
    const u: WorkspacePaymentMethod = updatedMethod;
    const nextCache = sortPaymentMethods(ensureSingleDefault((paymentCache.get(context.workspaceId) ?? []).map((m) => (m.id === u.id ? u : m))));
    paymentCache.set(context.workspaceId, nextCache);
    void paymentApiClient.patch(context.workspaceId, `payment-methods/${u.id}`, {
      label: u.label, provider: u.provider, brand: u.brand, last4: u.last4, status: u.status,
      isDefault: u.isDefault, credentialRef: u.credentialRef ?? undefined, metadata: u.metadata,
    }).then((r) => { if (!r.ok) console.error('updateWorkspacePaymentMethod write-through failed', r); })
      .catch((e) => console.error('updateWorkspacePaymentMethod write-through failed', e));
    if (u.isDefault) {
      for (const other of nextCache) {
        if (other.id !== u.id && other.isDefault === false) {
          void paymentApiClient.patch(context.workspaceId, `payment-methods/${other.id}`, { isDefault: false })
            .then((r) => { if (!r.ok) console.error('payment ensureSingleDefault PATCH failed', r); })
            .catch((e) => console.error('payment ensureSingleDefault PATCH failed', e));
        }
      }
    }
  }
```
注意:写穿透 payload **绝无 accountNumber**(只发 last4/credentialRef 派生值)。前端 create/update 已在 normalizePaymentMethod 里从 accountNumber 算好 last4/credentialRef。

(e) 文件末尾(`getDefaultWorkspacePaymentMethod` 函数之后)追加:
```typescript
let paymentApiClient: ApiClient = defaultApiClient;
export function __setPaymentApiClientForTest(client: ApiClient): void { paymentApiClient = client; }

const paymentCache = new Map<string, WorkspacePaymentMethod[]>(); // key = workspaceId

export async function hydrateWorkspacePaymentMethods(context: PaymentRepositoryContext): Promise<void> {
  if (!paymentApiClient.configured) return;
  const res = await paymentApiClient.get<{ items: WorkspacePaymentMethod[]; nextCursor: string | null }>(
    context.workspaceId, 'payment-methods');
  if (res.ok && res.value && Array.isArray(res.value.items)) {
    paymentCache.set(context.workspaceId, sortPaymentMethods(ensureSingleDefault(res.value.items.map((m) => normalizePaymentMethod(m, context)))));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('workspace_payment_methods_updated', { detail: { workspaceId: context.workspaceId } }));
    }
  }
}
```

- [ ] **Step 12: 写前端单测(含 ensureSingleDefault 断言)**

Create `scripts/payment-repository.test.ts`:

```typescript
import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setPaymentApiClientForTest,
  hydrateWorkspacePaymentMethods,
  loadWorkspacePaymentMethods,
  createWorkspacePaymentMethod,
} from '../src/lib/data/paymentRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'payment-methods') return { ok: true, value: { items: [{ id: 'srv1', label: 'Server Card', provider: 'Stripe', brand: 'Visa', last4: '4242', status: 'active', isDefault: true }], nextCursor: null } } as any;
      return { ok: true, value: null } as any;
    },
    post: async () => ({ ok: true, value: {} }) as any,
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
}

async function run() {
  const memA = new Map<string, string>();
  const storageA = { getItem: (k: string) => memA.get(k) ?? null, setItem: (k: string, v: string) => void memA.set(k, v), removeItem: (k: string) => void memA.delete(k) } as any;

  __setPaymentApiClientForTest(fakeApi(true));
  await hydrateWorkspacePaymentMethods({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspacePaymentMethods({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].label, 'Server Card');
  assert.equal(fromBackend[0].isDefault, true);

  // 新增一个 default,旧 default 应被置 false(ensureSingleDefault)
  createWorkspacePaymentMethod({ label: 'New Default', provider: 'Stripe', brand: 'Visa', accountNumber: '5555555555554444', isDefault: true }, { workspaceId: 'wsA', storage: storageA });
  const afterCreate = loadWorkspacePaymentMethods({ workspaceId: 'wsA', storage: storageA });
  const defaults = afterCreate.filter((m) => m.isDefault);
  assert.equal(defaults.length, 1);
  assert.equal(defaults[0].label, 'New Default');
  // last4 从 accountNumber 派生,且 accountNumber 不在对象上
  assert.equal(defaults[0].last4, '4444');
  assert.equal((defaults[0] as any).accountNumber, undefined);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setPaymentApiClientForTest(fakeApi(false));
  createWorkspacePaymentMethod({ label: 'Local One', provider: 'Stripe', brand: 'Visa' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspacePaymentMethods({ workspaceId: 'wsB', storage });
  assert.equal(local.some((m) => m.label === 'Local One'), true);

  console.log('payment repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 13: package.json 加脚本**

`scripts` 块加 `"test:payment-repo": "tsx scripts/payment-repository.test.ts"`;`test:p0-specialized` 末尾追加 ` && npm run test:payment-repo`。

- [ ] **Step 14: 跑前端单测 + lint**

Run: `npx tsx scripts/payment-repository.test.ts && npm run lint`
Expected: 打印 `payment repository passed`;lint 无错误。

- [ ] **Step 15: Commit 前端**

```bash
git add src/lib/data/paymentRepository.ts scripts/payment-repository.test.ts package.json
git commit -m "feat(web): wire paymentRepository to backend with localStorage fallback"
```

---

## Task 3: TaxEvent 端到端

差异点:`daysUntil` 是纯派生字段,DTO 不接收(whitelist 400 验证)、后端不存,前端 normalize 时按 now 算;`seedWorkspaceTaxEvents` 留 localStorage 兜底;无 update/delete 导出(工厂仍暴露,但前端不调);status 过滤。

**Files:**
- Create: `apps/api/src/tax-event/dto.ts`
- Create: `apps/api/src/tax-event/tax-event.service.ts`
- Create: `apps/api/src/tax-event/tax-event.controller.ts`
- Create: `apps/api/src/tax-event/tax-event.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/tax-event.e2e-spec.ts`
- Modify: `src/lib/data/taxEventRepository.ts`
- Create: `scripts/tax-event-repository.test.ts`
- Modify: `package.json`

- [ ] **Step 1: 写后端 e2e(先失败)**

Create `apps/api/test/tax-event.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('TaxEvent resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'tx1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tax-events`)
      .send({ date: '2026-09-30', title: 'VAT filing', type: 'tax_deadline', status: 'pending', amount: 'CNY 8,500.00' })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.title).toBe('VAT filing');
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/tax-events/${id}`)).expect(200);
    expect(got.body.value.amount).toBe('CNY 8,500.00');
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/tax-events/${id}`)
      .send({ status: 'completed' })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/tax-events`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].status).toBe('completed');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/tax-events/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/tax-events`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('rejects unknown daysUntil field (whitelist)', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'txwl@test.dev');
    await auth(accessToken)(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tax-events`)
      .send({ date: '2026-09-30', title: 'X', type: 'tax_deadline', status: 'pending', daysUntil: 5 })).expect(400);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'txiso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/tax-events`).send({ date: '2026-09-30', title: 'Secret', type: 'tax_deadline', status: 'pending' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'txiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/tax-events/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/tax-events/${id}`).send({ status: 'completed' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/tax-events/${id}`)).expect(404);
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'txpg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tax-events`)
        .send({ date: '2026-09-30', title: `e${i}`, type: 'tax_deadline', status: 'pending' })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tax-events?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tax-events?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tax-events?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'txm1@test.dev');
    const a2 = await registerUser(app, 'txm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/tax-events`)).expect(403);
  });

  it('status filter', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'txflt@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tax-events`)
      .send({ date: '2026-09-30', title: 'A', type: 'tax_deadline', status: 'pending' })).expect(201);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tax-events`)
      .send({ date: '2026-09-30', title: 'B', type: 'tax_deadline', status: 'completed' })).expect(201);
    const q = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tax-events?status=pending`)).expect(200);
    expect(q.body.value.items).toHaveLength(1);
    expect(q.body.value.items[0].title).toBe('A');
  });
});
```

- [ ] **Step 2: 跑 e2e 确认失败**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json tax-event.e2e-spec.ts`
Expected: FAIL(路由未注册)。

- [ ] **Step 3: 写 dto.ts**

Create `apps/api/src/tax-event/dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const STATUSES = ['pending', 'completed', 'urgent'] as const;
const TYPES = ['tax_deadline', 'audit_window', 'invoice_due'] as const;

export class CreateTaxEventDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) date!: string;
  @IsString() @MinLength(1) title!: string;
  @IsIn(TYPES as unknown as string[]) type!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() amount?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateTaxEventDto {
  @IsOptional() @IsString() @MinLength(1) date?: string;
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsIn(TYPES as unknown as string[]) type?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() amount?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListTaxEventQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
```
注意:**无 daysUntil 字段**(纯派生,前端算)。

- [ ] **Step 4: 写 service**

Create `apps/api/src/tax-event/tax-event.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { ListTaxEventQuery } from './dto';

@Injectable()
export class TaxEventService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.taxEvent as unknown as PrismaResourceDelegate; }
  protected entityName = 'TaxEvent';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListTaxEventQuery;
    return { workspaceId, ...(q.status ? { status: q.status } : {}) };
  }
}
```

- [ ] **Step 5: 写 controller**

Create `apps/api/src/tax-event/tax-event.controller.ts`:

```typescript
import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateTaxEventDto, UpdateTaxEventDto, ListTaxEventQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/tax-events',
  createDto: CreateTaxEventDto, updateDto: UpdateTaxEventDto, listQuery: ListTaxEventQuery,
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/tax-events')
export class TaxEventController extends Base {}
```

- [ ] **Step 6: 写 module**

Create `apps/api/src/tax-event/tax-event.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TaxEventController } from './tax-event.controller';
import { TaxEventService } from './tax-event.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [TaxEventController],
  providers: [TaxEventService, { provide: RESOURCE_SERVICE, useExisting: TaxEventService }],
})
export class TaxEventModule {}
```

- [ ] **Step 7: app.module.ts 注册**

import 区加 `import { TaxEventModule } from './tax-event/tax-event.module';`;`imports` 数组末尾加 `, TaxEventModule`。

- [ ] **Step 8: 跑 e2e 确认通过**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json tax-event.e2e-spec.ts`
Expected: 6 tests PASS。

- [ ] **Step 9: Commit 后端**

```bash
git add apps/api/src/tax-event apps/api/src/app.module.ts apps/api/test/tax-event.e2e-spec.ts
git commit -m "feat(api): add tax-event resource (status filter, daysUntil derived client-side)"
```

- [ ] **Step 10: 前端 normalizeTimestamp 支持 ISO**

Modify `src/lib/data/taxEventRepository.ts` 的 `normalizeTimestamp`(68-71 行)为:
```typescript
function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = typeof value === 'string' && !/^\d+$/.test(value.trim())
    ? Date.parse(value)
    : Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}
```
注意:此处只动 createdAt/updatedAt 的解析;`date` 字段是 YYYY-MM-DD 字符串、`daysUntil` 仍由 `calculateDaysUntil(date, now)` 在 normalizeTaxEvent 里算,不改。

- [ ] **Step 11: 前端 repo 加 apiClient 写穿透**

Modify `src/lib/data/taxEventRepository.ts`。

(a) 顶部 import 区(`import { getRepositoryStorage } from './dataBackend';` 之后)加:
```typescript
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';
```

(b) 改 `loadWorkspaceTaxEvents`(现 `return readTaxEvents(context);`)为:
```typescript
export function loadWorkspaceTaxEvents(context: TaxEventRepositoryContext): WorkspaceTaxEvent[] {
  if (taxEventApiClient.configured) return taxEventCache.get(context.workspaceId) ?? [];
  return readTaxEvents(context);
}
```

(c) 在 `createWorkspaceTaxEvent` 的 `writeTaxEvents([...readTaxEvents(context), event], context);` 之后、`return event;` 之前插入:
```typescript
  if (taxEventApiClient.configured) {
    taxEventCache.set(context.workspaceId, sortTaxEvents([...(taxEventCache.get(context.workspaceId) ?? []), event]));
    void taxEventApiClient.post(context.workspaceId, 'tax-events', {
      id: event.id, date: event.date, title: event.title, type: event.type,
      description: event.description, summary: event.summary, amount: event.amount,
      status: event.status, metadata: event.metadata,
    }).then((r) => { if (!r.ok) console.error('createWorkspaceTaxEvent write-through failed', r); })
      .catch((e) => console.error('createWorkspaceTaxEvent write-through failed', e));
  }
```
注意:payload **不含 daysUntil**(派生字段不上后端)。

(d) 文件末尾(`seedWorkspaceTaxEvents` 函数之后)追加:
```typescript
let taxEventApiClient: ApiClient = defaultApiClient;
export function __setTaxEventApiClientForTest(client: ApiClient): void { taxEventApiClient = client; }

const taxEventCache = new Map<string, WorkspaceTaxEvent[]>(); // key = workspaceId

export async function hydrateWorkspaceTaxEvents(context: TaxEventRepositoryContext): Promise<void> {
  if (!taxEventApiClient.configured) return;
  const res = await taxEventApiClient.get<{ items: WorkspaceTaxEvent[]; nextCursor: string | null }>(
    context.workspaceId, 'tax-events');
  if (res.ok && res.value && Array.isArray(res.value.items)) {
    taxEventCache.set(context.workspaceId, sortTaxEvents(res.value.items.map((e) => normalizeTaxEvent(e as WorkspaceTaxEventDraft, context))));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('tax_events_updated', { detail: { workspaceId: context.workspaceId } }));
    }
  }
}
```

- [ ] **Step 12: 写前端单测**

Create `scripts/tax-event-repository.test.ts`:

```typescript
import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setTaxEventApiClientForTest,
  hydrateWorkspaceTaxEvents,
  loadWorkspaceTaxEvents,
  createWorkspaceTaxEvent,
} from '../src/lib/data/taxEventRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'tax-events') return { ok: true, value: { items: [{ id: 'srv1', date: '2026-09-30', title: 'Server Event', type: 'tax_deadline', status: 'pending' }], nextCursor: null } } as any;
      return { ok: true, value: null } as any;
    },
    post: async () => ({ ok: true, value: {} }) as any,
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
}

async function run() {
  const memA = new Map<string, string>();
  const storageA = { getItem: (k: string) => memA.get(k) ?? null, setItem: (k: string, v: string) => void memA.set(k, v), removeItem: (k: string) => void memA.delete(k) } as any;

  __setTaxEventApiClientForTest(fakeApi(true));
  await hydrateWorkspaceTaxEvents({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceTaxEvents({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].title, 'Server Event');
  // daysUntil 是派生字段,应为 number
  assert.equal(typeof fromBackend[0].daysUntil, 'number');

  createWorkspaceTaxEvent({ date: '2026-10-15', title: 'New One', type: 'tax_deadline', description: '', summary: '', status: 'pending' }, { workspaceId: 'wsA', storage: storageA });
  const afterCreate = loadWorkspaceTaxEvents({ workspaceId: 'wsA', storage: storageA });
  assert.equal(afterCreate.some((e) => e.title === 'New One'), true);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setTaxEventApiClientForTest(fakeApi(false));
  createWorkspaceTaxEvent({ date: '2026-10-15', title: 'Local One', type: 'tax_deadline', description: '', summary: '', status: 'pending' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceTaxEvents({ workspaceId: 'wsB', storage });
  assert.equal(local.some((e) => e.title === 'Local One'), true);

  console.log('tax-event repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 13: package.json 加脚本**

`scripts` 块加 `"test:tax-event-repo": "tsx scripts/tax-event-repository.test.ts"`;`test:p0-specialized` 末尾追加 ` && npm run test:tax-event-repo`。

- [ ] **Step 14: 跑前端单测 + lint**

Run: `npx tsx scripts/tax-event-repository.test.ts && npm run lint`
Expected: 打印 `tax-event repository passed`;lint 无错误。

- [ ] **Step 15: Commit 前端**

```bash
git add src/lib/data/taxEventRepository.ts scripts/tax-event-repository.test.ts package.json
git commit -m "feat(web): wire taxEventRepository to backend with localStorage fallback"
```

---

## Task 4: Task 端到端

差异点:`deleteWorkspaceTasks(ids[])` 批量删——写穿透对每个 id 发单条 DELETE(照搬 ⑤b-1 campaign);runtime 外键字段(runtimeMode/runtimeProviderKind/runtimeTaskId/runtimeStatus/agentId/runtimeId/lastRuntimeEventAt)当普通可空列写穿透;`externalRef`(类型 `AgentTask['externalRef']`,可能是对象)写穿透时 JSON.stringify、normalize 时 parse;`calculateTaskCompletion` 留前端;column 过滤。

**Files:**
- Create: `apps/api/src/task/dto.ts`
- Create: `apps/api/src/task/task.service.ts`
- Create: `apps/api/src/task/task.controller.ts`
- Create: `apps/api/src/task/task.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/task.e2e-spec.ts`
- Modify: `src/lib/data/taskRepository.ts`
- Create: `scripts/task-repository.test.ts`
- Modify: `package.json`

- [ ] **Step 1: 写后端 e2e(先失败)**

Create `apps/api/test/task.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Task resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip with runtime fields', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'ta1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tasks`)
      .send({ title: 'Render video', column: 'auto_exec', priority: 'High', type: 'video', date: '2026-09-30', isAuto: true,
        status: 'running', runtimeMode: 'self_hosted_multica', agentId: 'agent_1', externalRef: '{"jobId":"j1"}' })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.title).toBe('Render video');
    expect(created.body.value.agentId).toBe('agent_1');
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/tasks/${id}`)).expect(200);
    expect(got.body.value.column).toBe('auto_exec');
    expect(got.body.value.externalRef).toBe('{"jobId":"j1"}');
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/tasks/${id}`)
      .send({ column: 'done', status: 'completed' })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/tasks`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].column).toBe('done');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/tasks/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/tasks`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'taiso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/tasks`).send({ title: 'Secret', column: 'todo', priority: 'Low', type: 't', date: '', isAuto: false })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'taiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/tasks/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/tasks/${id}`).send({ column: 'done' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/tasks/${id}`)).expect(404);
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'tapg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tasks`)
        .send({ title: `t${i}`, column: 'todo', priority: 'Medium', type: 't', date: '', isAuto: false })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tasks?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tasks?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tasks?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'tam1@test.dev');
    const a2 = await registerUser(app, 'tam2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/tasks`)).expect(403);
  });

  it('column filter', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'taflt@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tasks`)
      .send({ title: 'A', column: 'todo', priority: 'Medium', type: 't', date: '', isAuto: false })).expect(201);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tasks`)
      .send({ title: 'B', column: 'done', priority: 'Medium', type: 't', date: '', isAuto: false })).expect(201);
    const q = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tasks?column=todo`)).expect(200);
    expect(q.body.value.items).toHaveLength(1);
    expect(q.body.value.items[0].title).toBe('A');
  });
});
```

- [ ] **Step 2: 跑 e2e 确认失败**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json task.e2e-spec.ts`
Expected: FAIL(路由未注册)。

- [ ] **Step 3: 写 dto.ts**

Create `apps/api/src/task/dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const COLUMNS = ['todo', 'in_progress', 'auto_exec', 'review', 'done'] as const;
const PRIORITIES = ['High', 'Medium', 'Low'] as const;

export class CreateTaskDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) title!: string;
  @IsIn(COLUMNS as unknown as string[]) column!: string;
  @IsIn(PRIORITIES as unknown as string[]) priority!: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() date?: string;
  @IsOptional() @IsBoolean() isAuto?: boolean;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() runtimeMode?: string;
  @IsOptional() @IsString() runtimeProviderKind?: string;
  @IsOptional() @IsString() runtimeTaskId?: string;
  @IsOptional() @IsString() runtimeStatus?: string;
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsString() runtimeId?: string;
  @IsOptional() @IsString() externalRef?: string;
  @IsOptional() @IsDateString() lastRuntimeEventAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateTaskDto {
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsIn(COLUMNS as unknown as string[]) column?: string;
  @IsOptional() @IsIn(PRIORITIES as unknown as string[]) priority?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() date?: string;
  @IsOptional() @IsBoolean() isAuto?: boolean;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() runtimeMode?: string;
  @IsOptional() @IsString() runtimeProviderKind?: string;
  @IsOptional() @IsString() runtimeTaskId?: string;
  @IsOptional() @IsString() runtimeStatus?: string;
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsString() runtimeId?: string;
  @IsOptional() @IsString() externalRef?: string;
  @IsOptional() @IsDateString() lastRuntimeEventAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListTaskQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(COLUMNS as unknown as string[]) column?: string;
}
```

- [ ] **Step 4: 写 service**

Create `apps/api/src/task/task.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { ListTaskQuery } from './dto';

@Injectable()
export class TaskService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.task as unknown as PrismaResourceDelegate; }
  protected entityName = 'Task';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListTaskQuery;
    return { workspaceId, ...(q.column ? { column: q.column } : {}) };
  }
}
```

- [ ] **Step 5: 写 controller**

Create `apps/api/src/task/task.controller.ts`:

```typescript
import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateTaskDto, UpdateTaskDto, ListTaskQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/tasks',
  createDto: CreateTaskDto, updateDto: UpdateTaskDto, listQuery: ListTaskQuery,
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/tasks')
export class TaskController extends Base {}
```

- [ ] **Step 6: 写 module**

Create `apps/api/src/task/task.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [TaskController],
  providers: [TaskService, { provide: RESOURCE_SERVICE, useExisting: TaskService }],
})
export class TaskModule {}
```

- [ ] **Step 7: app.module.ts 注册**

import 区加 `import { TaskModule } from './task/task.module';`;`imports` 数组末尾加 `, TaskModule`。

- [ ] **Step 8: 跑 e2e 确认通过**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json task.e2e-spec.ts`
Expected: 5 tests PASS。

- [ ] **Step 9: Commit 后端**

```bash
git add apps/api/src/task apps/api/src/app.module.ts apps/api/test/task.e2e-spec.ts
git commit -m "feat(api): add task resource (column filter, runtime fields as nullable columns)"
```

- [ ] **Step 10: 前端 normalizeTask 支持 externalRef parse + lastRuntimeEventAt**

Modify `src/lib/data/taskRepository.ts`。后端返回的 `externalRef` 是 string(前端写穿透时 JSON.stringify),读回需 parse 回对象;本地 localStorage 路径 externalRef 仍是原对象。改 `normalizeTask`(64-86 行)里 `externalRef: task.externalRef,` 一行为:

```typescript
    externalRef: typeof task.externalRef === 'string'
      ? (() => { try { return JSON.parse(task.externalRef as unknown as string); } catch { return task.externalRef; } })()
      : task.externalRef,
```
其余字段不动。

- [ ] **Step 11: 前端 repo 加 apiClient 写穿透(含批量删多条 DELETE)**

Modify `src/lib/data/taskRepository.ts`。

(a) 顶部 import 区(`import { getRepositoryStorage } from './dataBackend';` 之后)加:
```typescript
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';
```

(b) 改 `loadWorkspaceTasks`(现 `return readTasks(context);`)为:
```typescript
export function loadWorkspaceTasks(context: TaskRepositoryContext): WorkspaceTask[] {
  if (taskApiClient.configured) return taskCache.get(context.workspaceId) ?? [];
  return readTasks(context);
}
```

(c) 在 `createWorkspaceTask` 的 `writeTasks([...readTasks(context), task], context);` 之后、`return task;` 之前插入:
```typescript
  if (taskApiClient.configured) {
    taskCache.set(context.workspaceId, [...(taskCache.get(context.workspaceId) ?? []), task]);
    void taskApiClient.post(context.workspaceId, 'tasks', {
      id: task.id, title: task.title, column: task.column, priority: task.priority, type: task.type,
      date: task.date, isAuto: task.isAuto, status: task.status, runtimeMode: task.runtimeMode,
      runtimeProviderKind: task.runtimeProviderKind, runtimeTaskId: task.runtimeTaskId,
      runtimeStatus: task.runtimeStatus, agentId: task.agentId, runtimeId: task.runtimeId,
      externalRef: task.externalRef === undefined ? undefined : JSON.stringify(task.externalRef),
      lastRuntimeEventAt: task.lastRuntimeEventAt, metadata: task.metadata,
    }).then((r) => { if (!r.ok) console.error('createWorkspaceTask write-through failed', r); })
      .catch((e) => console.error('createWorkspaceTask write-through failed', e));
  }
```

(d) 在 `updateWorkspaceTask` 的 `writeTasks(updatedTasks, context);` 之后、`return updatedTask;` 之前插入:
```typescript
  if (taskApiClient.configured && updatedTask) {
    const u: WorkspaceTask = updatedTask;
    taskCache.set(context.workspaceId, (taskCache.get(context.workspaceId) ?? []).map((t) => (t.id === u.id ? u : t)));
    void taskApiClient.patch(context.workspaceId, `tasks/${u.id}`, {
      title: u.title, column: u.column, priority: u.priority, type: u.type, date: u.date, isAuto: u.isAuto,
      status: u.status, runtimeMode: u.runtimeMode, runtimeProviderKind: u.runtimeProviderKind,
      runtimeTaskId: u.runtimeTaskId, runtimeStatus: u.runtimeStatus, agentId: u.agentId, runtimeId: u.runtimeId,
      externalRef: u.externalRef === undefined ? undefined : JSON.stringify(u.externalRef),
      lastRuntimeEventAt: u.lastRuntimeEventAt, metadata: u.metadata,
    }).then((r) => { if (!r.ok) console.error('updateWorkspaceTask write-through failed', r); })
      .catch((e) => console.error('updateWorkspaceTask write-through failed', e));
  }
```

(e) 改 `deleteWorkspaceTasks`(现 `return writeTasks(readTasks(context).filter(...), context);`)为:
```typescript
export function deleteWorkspaceTasks(taskIds: string[], context: TaskRepositoryContext): WorkspaceTask[] {
  const taskIdSet = new Set(taskIds);
  if (taskApiClient.configured) {
    const next = (taskCache.get(context.workspaceId) ?? []).filter((task) => !taskIdSet.has(task.id));
    taskCache.set(context.workspaceId, next);
    for (const id of taskIds) {
      void taskApiClient.del(context.workspaceId, `tasks/${id}`)
        .then((r) => { if (!r.ok) console.error('deleteWorkspaceTasks write-through failed', r); })
        .catch((e) => console.error('deleteWorkspaceTasks write-through failed', e));
    }
    return next;
  }
  return writeTasks(readTasks(context).filter((task) => !taskIdSet.has(task.id)), context);
}
```

(f) 文件末尾(`calculateTaskCompletion` 函数之后)追加:
```typescript
let taskApiClient: ApiClient = defaultApiClient;
export function __setTaskApiClientForTest(client: ApiClient): void { taskApiClient = client; }

const taskCache = new Map<string, WorkspaceTask[]>(); // key = workspaceId

export async function hydrateWorkspaceTasks(context: TaskRepositoryContext): Promise<void> {
  if (!taskApiClient.configured) return;
  const res = await taskApiClient.get<{ items: WorkspaceTask[]; nextCursor: string | null }>(
    context.workspaceId, 'tasks');
  if (res.ok && res.value && Array.isArray(res.value.items)) {
    taskCache.set(context.workspaceId, res.value.items.map((t) => normalizeTask(t as WorkspaceTask, context)));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('tasks_updated', { detail: { workspaceId: context.workspaceId } }));
    }
  }
}
```

- [ ] **Step 12: 写前端单测(含批量删 + externalRef 往返)**

Create `scripts/task-repository.test.ts`:

```typescript
import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setTaskApiClientForTest,
  hydrateWorkspaceTasks,
  loadWorkspaceTasks,
  createWorkspaceTask,
  deleteWorkspaceTasks,
} from '../src/lib/data/taskRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'tasks') return { ok: true, value: { items: [
        { id: 'srv1', title: 'Server Task', column: 'todo', priority: 'Medium', type: 't', date: '', isAuto: false, externalRef: '{"jobId":"j1"}' },
        { id: 'srv2', title: 'Server Task 2', column: 'done', priority: 'Low', type: 't', date: '', isAuto: false },
      ], nextCursor: null } } as any;
      return { ok: true, value: null } as any;
    },
    post: async () => ({ ok: true, value: {} }) as any,
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
}

async function run() {
  const memA = new Map<string, string>();
  const storageA = { getItem: (k: string) => memA.get(k) ?? null, setItem: (k: string, v: string) => void memA.set(k, v), removeItem: (k: string) => void memA.delete(k) } as any;

  __setTaskApiClientForTest(fakeApi(true));
  await hydrateWorkspaceTasks({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceTasks({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 2);
  assert.equal(fromBackend[0].title, 'Server Task');
  // externalRef string 应被 parse 回对象
  assert.deepEqual(fromBackend[0].externalRef, { jobId: 'j1' });

  createWorkspaceTask({ title: 'New One', column: 'todo', priority: 'High', type: 't', date: '', isAuto: false }, { workspaceId: 'wsA', storage: storageA });
  let now = loadWorkspaceTasks({ workspaceId: 'wsA', storage: storageA });
  assert.equal(now.some((t) => t.title === 'New One'), true);

  // 批量删 srv1 + srv2
  deleteWorkspaceTasks(['srv1', 'srv2'], { workspaceId: 'wsA', storage: storageA });
  now = loadWorkspaceTasks({ workspaceId: 'wsA', storage: storageA });
  assert.equal(now.some((t) => t.id === 'srv1'), false);
  assert.equal(now.some((t) => t.id === 'srv2'), false);
  assert.equal(now.some((t) => t.title === 'New One'), true);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setTaskApiClientForTest(fakeApi(false));
  createWorkspaceTask({ title: 'Local One', column: 'todo', priority: 'Low', type: 't', date: '', isAuto: false }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceTasks({ workspaceId: 'wsB', storage });
  assert.equal(local.some((t) => t.title === 'Local One'), true);

  console.log('task repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 13: package.json 加脚本**

`scripts` 块加 `"test:task-repo": "tsx scripts/task-repository.test.ts"`;`test:p0-specialized` 末尾追加 ` && npm run test:task-repo`。

- [ ] **Step 14: 跑前端单测 + lint**

Run: `npx tsx scripts/task-repository.test.ts && npm run lint`
Expected: 打印 `task repository passed`;lint 无错误。

- [ ] **Step 15: Commit 前端**

```bash
git add src/lib/data/taskRepository.ts scripts/task-repository.test.ts package.json
git commit -m "feat(web): wire taskRepository to backend with localStorage fallback"
```

---

## Task 5: 全量验收

逐项跑验收线,任一不绿即回到对应 task 修复后重跑。**Files:** 无新增,仅运行验证。

- [ ] **Step 1: 后端全 e2e(含 4 新域 + ⑤b-1 6 域 + customer + 既有)**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json`
Expected: 26 suites PASS(此前 22 + ticket/payment/tax-event/task 4 新)。

- [ ] **Step 2: 前端 lint**

Run: `npm run lint`
Expected: `tsc --noEmit` 0 error。

- [ ] **Step 3: 前端 p0-specialized(含 4 新 test:*-repo)**

Run: `npm run test:p0-specialized`
Expected: 全部子测试通过,末尾打印 `task repository passed`(链尾)。

- [ ] **Step 4: saas-foundation 回归**

Run: `npm run test:saas-foundation`
Expected: `saas foundation contract passed`。

- [ ] **Step 5: build**

Run: `npm run build`
Expected: `✓ built`,无类型/打包错误。

- [ ] **Step 6: 更新 memory**

更新 `C:\Users\Administrator\.claude\projects\E--code-aistudio\memory\project_saas_productization.md` 的 ⑤b 段:把 ⑤b-2(ticket/payment/taxEvent/task 4 域)标记为已交付,注明 financial 拆为 ⑤b-2.5。

- [ ] **Step 7: 向用户汇报 + 询问 push**

汇报后端 e2e suites 数、前端测试、lint、build 全绿;列出本批新增 commit;**询问是否 push**(本地 main 累积大量未推送 commit,绝不擅自 push)。
