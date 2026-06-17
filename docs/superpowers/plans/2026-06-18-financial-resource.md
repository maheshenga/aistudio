# ⑤b-2.5 Financial 资源实现计划

依据 spec:`docs/superpowers/specs/2026-06-18-financial-resource-design.md`
策略 A:建独立 FinancialRecord 资源,派生全留前端,不动 ④ 计费。

执行方式:Subagent-Driven Development。Task 0(Prisma)+ Task 1(后端+前端端到端)+ Task 2(全量验收)。

---

## Task 0: Prisma 模型 + migration + resetDb

**Files:** `apps/api/prisma/schema.prisma`、`apps/api/test/helpers.ts`

- [ ] **Step 1:** schema.prisma 的 Workspace model 反向关系区(`tasks Task[]` 之后)加一行:
```prisma
  financialRecords FinancialRecord[]
```

- [ ] **Step 2:** schema.prisma 末尾(Task model 之后)加 model:
```prisma
model FinancialRecord {
  id           String    @id @default(cuid())
  workspaceId  String
  kind         String
  status       String
  amountCents  Int       @default(0)
  currency     String    @default("CNY")
  planId       String?
  counterparty String    @default("Workspace Customer")
  occurredAt   DateTime  @default(now())
  metadata     Json?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, occurredAt])
  @@index([workspaceId, kind])
}
```

- [ ] **Step 3:** test/helpers.ts 的 `resetDb` 里,在 `await prisma.task.deleteMany();` 之后、`await prisma.project.deleteMany();` 之前加:
```typescript
  await prisma.financialRecord.deleteMany();
```

- [ ] **Step 4:** 跑 migration(确认 Docker aistudio-pg :5433 在跑,否则 `docker start aistudio-pg` 等 pg_isready):
```bash
cd apps/api && DATABASE_URL="postgresql://postgres:postgres@localhost:5433/aistudio?schema=public" npx prisma migrate dev --name add_financial_record
```
然后对测试库同步 schema:
```bash
cd apps/api && DATABASE_URL="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" npx prisma migrate deploy
```
(注:测试库用 migrate deploy 应用迁移;若测试库走 `prisma db push` 约定则用 push。沿用本仓库既有约定——参考前几个域 migration 后测试库怎么同步的,保持一致。)

- [ ] **Step 5:** `npx prisma generate` 确认 client 含 financialRecord delegate。

- [ ] **Step 6:** Commit:
```bash
git add apps/api/prisma apps/api/test/helpers.ts
git commit -m "feat(api): add FinancialRecord model + migration + resetDb"
```

---

## Task 1: Financial 端到端(后端四件套 + 前端写穿透)

差异点:occurredAt 业务时间戳(写穿透转 ISO、DTO IsDateString、前端 normalize 支持 ISO);列表排序前端 sortFinancialRecords 兜底(按 occurredAt desc);kind+status 双 filter;saveWorkspaceFinancialRecords diff 逐条 PATCH;无单条 update/delete 导出;所有派生函数不动。

**Files:**
- Create `apps/api/src/financial/dto.ts`
- Create `apps/api/src/financial/financial.service.ts`
- Create `apps/api/src/financial/financial.controller.ts`
- Create `apps/api/src/financial/financial.module.ts`
- Modify `apps/api/src/app.module.ts`
- Create `apps/api/test/financial.e2e-spec.ts`
- Modify `src/lib/data/financialRepository.ts`
- Create `scripts/financial-repository.test.ts`
- Modify `package.json`

- [ ] **Step 1: 写后端 e2e(先失败)** — Create `apps/api/test/financial.e2e-spec.ts`:
```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('FinancialRecord resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip with occurredAt', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'fin1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/financial-records`)
      .send({ kind: 'subscription', status: 'paid', amountCents: 9900, currency: 'CNY', counterparty: 'Acme', occurredAt: '2026-06-01T00:00:00.000Z' })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.amountCents).toBe(9900);
    expect(created.body.value.kind).toBe('subscription');
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/financial-records/${id}`)).expect(200);
    expect(got.body.value.counterparty).toBe('Acme');
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/financial-records/${id}`)
      .send({ status: 'refunded' })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/financial-records`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].status).toBe('refunded');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/financial-records/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/financial-records`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('kind filter', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'finkind@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/financial-records`)
      .send({ kind: 'subscription', status: 'paid', amountCents: 100 })).expect(201);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/financial-records`)
      .send({ kind: 'refund', status: 'refunded', amountCents: 50 })).expect(201);
    const q = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/financial-records?kind=refund`)).expect(200);
    expect(q.body.value.items).toHaveLength(1);
    expect(q.body.value.items[0].kind).toBe('refund');
  });

  it('status filter', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'finstat@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/financial-records`)
      .send({ kind: 'invoice', status: 'issued', amountCents: 100 })).expect(201);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/financial-records`)
      .send({ kind: 'invoice', status: 'paid', amountCents: 200 })).expect(201);
    const q = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/financial-records?status=issued`)).expect(200);
    expect(q.body.value.items).toHaveLength(1);
    expect(q.body.value.items[0].status).toBe('issued');
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'finpg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/financial-records`)
        .send({ kind: 'payment', status: 'paid', amountCents: 100 + i })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/financial-records?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/financial-records?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/financial-records?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'finiso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/financial-records`).send({ kind: 'payment', status: 'paid', amountCents: 100 })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'finiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/financial-records/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/financial-records/${id}`).send({ status: 'cancelled' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/financial-records/${id}`)).expect(404);
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'finm1@test.dev');
    const a2 = await registerUser(app, 'finm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/financial-records`)).expect(403);
  });
});
```

- [ ] **Step 2:** 跑 e2e 确认失败(路由未注册):
```bash
cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json financial.e2e-spec.ts
```

- [ ] **Step 3: dto.ts** — Create `apps/api/src/financial/dto.ts`:
```typescript
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

const KINDS = ['subscription', 'invoice', 'payment', 'refund', 'withdrawal', 'credit'] as const;
const STATUSES = ['paid', 'pending', 'issued', 'refunded', 'cancelled', 'approved'] as const;

export class CreateFinancialRecordDto {
  @IsOptional() @IsString() id?: string;
  @IsIn(KINDS as unknown as string[]) kind!: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsInt() @Min(0) amountCents!: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() planId?: string;
  @IsOptional() @IsString() counterparty?: string;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateFinancialRecordDto {
  @IsOptional() @IsIn(KINDS as unknown as string[]) kind?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsInt() @Min(0) amountCents?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() planId?: string;
  @IsOptional() @IsString() counterparty?: string;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListFinancialRecordQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(KINDS as unknown as string[]) kind?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
```

- [ ] **Step 4: service** — Create `apps/api/src/financial/financial.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { ListFinancialRecordQuery } from './dto';

@Injectable()
export class FinancialService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.financialRecord as unknown as PrismaResourceDelegate; }
  protected entityName = 'FinancialRecord';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListFinancialRecordQuery;
    return {
      workspaceId,
      ...(q.kind ? { kind: q.kind } : {}),
      ...(q.status ? { status: q.status } : {}),
    };
  }
}
```

- [ ] **Step 5: controller** — Create `apps/api/src/financial/financial.controller.ts`:
```typescript
import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateFinancialRecordDto, UpdateFinancialRecordDto, ListFinancialRecordQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/financial-records',
  createDto: CreateFinancialRecordDto, updateDto: UpdateFinancialRecordDto, listQuery: ListFinancialRecordQuery,
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/financial-records')
export class FinancialController extends Base {}
```

- [ ] **Step 6: module** — Create `apps/api/src/financial/financial.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [FinancialController],
  providers: [FinancialService, { provide: RESOURCE_SERVICE, useExisting: FinancialService }],
})
export class FinancialModule {}
```

- [ ] **Step 7:** app.module.ts:import 区加 `import { FinancialModule } from './financial/financial.module';`(放 TaskModule import 附近);imports 数组末尾追加 `, FinancialModule`。

- [ ] **Step 8:** 跑 e2e 确认 6 tests PASS:
```bash
cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json financial.e2e-spec.ts
```

- [ ] **Step 9: Commit 后端:**
```bash
git add apps/api/src/financial apps/api/src/app.module.ts apps/api/test/financial.e2e-spec.ts
git commit -m "feat(api): add financial-record resource (kind/status filter, occurredAt)"
```

- [ ] **Step 10: 前端 normalizeTimestamp 支持 ISO** — 先 Read `src/lib/data/financialRepository.ts` 整个文件。改现有 `normalizeTimestamp`(约 106-109 行)为:
```typescript
function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = typeof value === 'string' && !/^\d+$/.test(value.trim())
    ? Date.parse(value)
    : Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}
```
这同时覆盖 occurredAt/createdAt/updatedAt 三个时间戳的 ISO 解析(它们都走 normalizeTimestamp)。

- [ ] **Step 11: 前端写穿透**

(a) 顶部 import 区(`import { getRepositoryStorage } from './dataBackend';` 之后)加:
```typescript
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';
```

(b) 改 `loadWorkspaceFinancialRecords`(现 `return readFinancialRecords(context);`)为:
```typescript
export function loadWorkspaceFinancialRecords(context: FinancialRepositoryContext): WorkspaceFinancialRecord[] {
  if (financialApiClient.configured) return financialCache.get(context.workspaceId) ?? [];
  return readFinancialRecords(context);
}
```

(c) 在 `createWorkspaceFinancialRecord` 的 `writeFinancialRecords([record, ...readFinancialRecords(context)], context);` 之后、`return record;` 之前插入:
```typescript
  if (financialApiClient.configured) {
    financialCache.set(context.workspaceId, sortFinancialRecords([record, ...(financialCache.get(context.workspaceId) ?? [])]));
    void financialApiClient.post(context.workspaceId, 'financial-records', {
      id: record.id, kind: record.kind, status: record.status, amountCents: record.amountCents,
      currency: record.currency, planId: record.planId ?? undefined, counterparty: record.counterparty,
      occurredAt: record.occurredAt > 0 ? new Date(record.occurredAt).toISOString() : undefined,
      metadata: record.metadata,
    }).then((r) => { if (!r.ok) console.error('createWorkspaceFinancialRecord write-through failed', r); })
      .catch((e) => console.error('createWorkspaceFinancialRecord write-through failed', e));
  }
```

(d) 改 `saveWorkspaceFinancialRecords`。现有实现是 `return writeFinancialRecords(records, context);`。改为:
```typescript
export function saveWorkspaceFinancialRecords(
  records: WorkspaceFinancialRecord[],
  context: FinancialRepositoryContext,
): WorkspaceFinancialRecord[] {
  if (financialApiClient.configured) {
    const normalized = sortFinancialRecords(records.map((record) => normalizeFinancialRecord(record, context)));
    const prev = new Map((financialCache.get(context.workspaceId) ?? []).map((r) => [r.id, r]));
    financialCache.set(context.workspaceId, normalized);
    for (const r of normalized) {
      const before = prev.get(r.id);
      // 只对相对缓存有变化(status/amountCents/metadata 等)的记录发 PATCH
      if (!before || JSON.stringify(before) !== JSON.stringify(r)) {
        void financialApiClient.patch(context.workspaceId, `financial-records/${r.id}`, {
          kind: r.kind, status: r.status, amountCents: r.amountCents, currency: r.currency,
          planId: r.planId ?? undefined, counterparty: r.counterparty,
          occurredAt: r.occurredAt > 0 ? new Date(r.occurredAt).toISOString() : undefined,
          metadata: r.metadata,
        }).then((res) => { if (!res.ok) console.error('saveWorkspaceFinancialRecords write-through failed', res); })
          .catch((e) => console.error('saveWorkspaceFinancialRecords write-through failed', e));
      }
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('financial_records_updated', { detail: { workspaceId: context.workspaceId } }));
    }
    return normalized;
  }
  return writeFinancialRecords(records, context);
}
```
注意:diff 用整对象 JSON 比对(只发变化的);PATCH 不含 createdAt/updatedAt/id(基类不接受、id 在 path)。

(e) 文件末尾追加:
```typescript
let financialApiClient: ApiClient = defaultApiClient;
export function __setFinancialApiClientForTest(client: ApiClient): void { financialApiClient = client; }

const financialCache = new Map<string, WorkspaceFinancialRecord[]>(); // key = workspaceId

export async function hydrateWorkspaceFinancialRecords(context: FinancialRepositoryContext): Promise<void> {
  if (!financialApiClient.configured) return;
  const res = await financialApiClient.get<{ items: WorkspaceFinancialRecord[]; nextCursor: string | null }>(
    context.workspaceId, 'financial-records');
  if (res.ok && res.value && Array.isArray(res.value.items)) {
    financialCache.set(context.workspaceId, sortFinancialRecords(res.value.items.map((r) => normalizeFinancialRecord(r as Partial<WorkspaceFinancialRecord>, context))));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('financial_records_updated', { detail: { workspaceId: context.workspaceId } }));
    }
  }
}
```
注意:派生函数(summarizeWorkspaceFinancials/buildDailyRevenueSeries/buildWorkspaceInvoices/sumWorkspaceRechargeCredits/sumWorkspacePromotionalCredits/hasWorkspaceCouponRedemption)**全部不动**。

- [ ] **Step 12: 前端单测** — Create `scripts/financial-repository.test.ts`:
```typescript
import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setFinancialApiClientForTest,
  hydrateWorkspaceFinancialRecords,
  loadWorkspaceFinancialRecords,
  createWorkspaceFinancialRecord,
  saveWorkspaceFinancialRecords,
  summarizeWorkspaceFinancials,
} from '../src/lib/data/financialRepository.ts';

function makeApi(configured: boolean) {
  const patched: string[] = [];
  const api: ApiClient = {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'financial-records') return { ok: true, value: { items: [
        { id: 'srv1', kind: 'subscription', status: 'paid', amountCents: 9900, currency: 'CNY', counterparty: 'Acme', occurredAt: '2026-06-01T00:00:00.000Z' },
      ], nextCursor: null } } as any;
      return { ok: true, value: null } as any;
    },
    post: async () => ({ ok: true, value: {} }) as any,
    patch: async (_ws: string, path: string) => { patched.push(path); return { ok: true, value: {} } as any; },
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
  return { api, patched };
}

async function run() {
  const memA = new Map<string, string>();
  const storageA = { getItem: (k: string) => memA.get(k) ?? null, setItem: (k: string, v: string) => void memA.set(k, v), removeItem: (k: string) => void memA.delete(k) } as any;

  const { api, patched } = makeApi(true);
  __setFinancialApiClientForTest(api);
  await hydrateWorkspaceFinancialRecords({ workspaceId: 'wsA', storage: storageA });
  let recs = loadWorkspaceFinancialRecords({ workspaceId: 'wsA', storage: storageA });
  assert.equal(recs.length, 1);
  assert.equal(recs[0].kind, 'subscription');
  // occurredAt ISO 被 parse 成 number
  assert.equal(typeof recs[0].occurredAt, 'number');
  assert.ok(recs[0].occurredAt > 0);

  // create 写穿透:缓存追加
  createWorkspaceFinancialRecord({ kind: 'payment', status: 'paid', amountCents: 500 }, { workspaceId: 'wsA', storage: storageA });
  recs = loadWorkspaceFinancialRecords({ workspaceId: 'wsA', storage: storageA });
  assert.equal(recs.length, 2);

  // saveWorkspaceFinancialRecords diff:只改 srv1 的 status → 应只 PATCH srv1 一条
  patched.length = 0;
  const mutated = recs.map((r) => (r.id === 'srv1' ? { ...r, status: 'refunded' as const } : r));
  saveWorkspaceFinancialRecords(mutated, { workspaceId: 'wsA', storage: storageA });
  assert.equal(patched.length, 1);
  assert.equal(patched[0], 'financial-records/srv1');

  // 派生函数仍可用
  const summary = summarizeWorkspaceFinancials(loadWorkspaceFinancialRecords({ workspaceId: 'wsA', storage: storageA }));
  assert.equal(typeof summary.monthlyRevenueCents, 'number');

  // 未配置后端:localStorage 兜底
  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setFinancialApiClientForTest(makeApi(false).api);
  createWorkspaceFinancialRecord({ kind: 'invoice', status: 'issued', amountCents: 1000 }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceFinancialRecords({ workspaceId: 'wsB', storage });
  assert.equal(local.some((r) => r.kind === 'invoice'), true);

  console.log('financial repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```
注意:`createWorkspaceFinancialRecord`/`saveWorkspaceFinancialRecords` 入参须匹配现有签名;先 Read 确认。若现有 `WorkspaceFinancialRecordInput` 与测试 payload 不符,调整测试入参但保持测试意图:(1) hydrate 读 1 条且 occurredAt 为 number;(2) create 缓存追加为 2 条;(3) save diff 只 PATCH 变化的 srv1 一条;(4) 派生 summarize 可用;(5) 未配置走 localStorage。任何调整在报告说明。

- [ ] **Step 13:** package.json:`scripts` 块加 `"test:financial-repo": "tsx scripts/financial-repository.test.ts"`;`test:p0-specialized` 末尾追加 ` && npm run test:financial-repo`。

- [ ] **Step 14:** 验证:
```bash
npx tsx scripts/financial-repository.test.ts && npm run lint
```
期望:打印 `financial repository passed`;lint 无错误。有类型错误就修。

- [ ] **Step 15: Commit 前端:**
```bash
git add src/lib/data/financialRepository.ts scripts/financial-repository.test.ts package.json
git commit -m "feat(web): wire financialRepository to backend with localStorage fallback"
```

---

## Task 2: 全量验收

- [ ] **Step 1:** 后端全 e2e(期望 27 suites):
```bash
cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json
```
- [ ] **Step 2:** `npm run lint`(根目录)→ 0 error。
- [ ] **Step 3:** `npm run test:p0-specialized` → 链尾打印 `financial repository passed`。
- [ ] **Step 4:** `npm run test:saas-foundation` → `saas foundation contract passed`。
- [ ] **Step 5:** `npm run build` → `✓ built`。
- [ ] **Step 6:** 更新 memory `project_saas_productization.md`:⑤b-2.5 financial 标记已交付(独立 FinancialRecord 资源,A 方案,6 kind 全上,派生留前端,saveWorkspaceFinancialRecords diff PATCH;不动 ④;配额预检裂缝记为 follow-up)。
- [ ] **Step 7:** 汇报后端 suites 数 + 前端 + lint + build;列出新增 commit;询问是否 push。
