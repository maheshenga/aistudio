# ⑤b-1 简单 CRUD 业务域批量上后端 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用已验证的 ⑤a 工厂(`WorkspaceResourceService<T>` + `createResourceController` + `createWorkspaceResourceRepository<T>`),把 campaign / announcement / agency / risk / media / keyword 6 个简单 CRUD 域迁到后端真相源,前端保留全部现有导出签名与本地兜底。

**Architecture:** 后端每域三件套(dto/service/controller/module),直接 extends ⑤a 基类、用工厂控制器,除可选 status 过滤外不 override。前端每域重写 repository:`apiClient.configured` 时读后端缓存 + 写穿透(乐观更新 + fire-and-forget),未配置时回退现有 localStorage 逻辑;normalize/sort/summarize/search/ensureDefault 全部原样保留作前端派生与兜底。后端空表起步,不迁种子。

**Tech Stack:** NestJS 10 + Prisma 5 + PostgreSQL(apps/api);React 19 + Vite + TypeScript(src);后端 Jest e2e 打 Docker Postgres(:5433);前端 tsx + node:assert/strict。

**Conventions(每个 task 都适用):**
- 后端 e2e 运行命令(Windows bash):`cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json <spec-file>`
- 前端类型检查:`npm run lint`(= `tsc --noEmit`)。**注意:tsx 不做类型检查,每个 task 收尾必须跑 `npm run lint`。**
- 前端单测:`npx tsx scripts/<domain>-repository.test.ts`
- git user 已是 maheshenga;每个 step 末尾 commit;禁止改 git config;禁止 push。

---

## Task 0: Prisma 6 模型 + migration + resetDb

一次性把 6 个模型加入 schema,跑一次 migration,扩 resetDb。后续每域 task 只依赖此 task 已建表。

**Files:**
- Modify: `apps/api/prisma/schema.prisma`(Workspace 加 6 反向关系 + 追加 6 个 model)
- Modify: `apps/api/test/helpers.ts:20-32`(resetDb 加 6 个 deleteMany)

- [ ] **Step 1: Workspace 模型加 6 个反向关系字段**

在 `apps/api/prisma/schema.prisma` 的 `model Workspace` 关系区(现有 `customers Customer[]` 之后)追加:

```prisma
  campaigns        Campaign[]
  announcements    Announcement[]
  agencyPartners   AgencyPartner[]
  riskEvents       RiskEvent[]
  mediaAccounts    MediaAccount[]
  keywordLibraries KeywordLibrary[]
```

- [ ] **Step 2: 文件末尾追加 6 个 model**

在 `apps/api/prisma/schema.prisma` 末尾(`model Customer {...}` 之后)追加:

```prisma
model Campaign {
  id              String   @id @default(cuid())
  workspaceId     String
  userId          String?
  name            String
  channel         String   @default("other")
  status          String   @default("draft")
  moduleId        String?
  landingUrl      String?
  linkedAssetIds  String[]
  metrics         Json     @default("{}")
  metadata        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, createdAt])
  @@index([workspaceId, status])
}

model Announcement {
  id           String    @id @default(cuid())
  workspaceId  String
  title        String
  channel      String
  status       String    @default("active")
  publishedAt  DateTime?
  metadata     Json?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, createdAt])
}

model AgencyPartner {
  id                   String   @id @default(cuid())
  workspaceId          String
  name                 String
  level                String
  invitedUsers         Int      @default(0)
  totalCommissionCents Int      @default(0)
  commissionRate       Float    @default(0)
  payoutStatus         String   @default("none")
  status               String   @default("active")
  metadata             Json?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  workspace            Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, createdAt])
  @@index([workspaceId, payoutStatus])
}

model RiskEvent {
  id             String    @id @default(cuid())
  workspaceId    String
  action         String
  contentSummary String
  rule           String
  decision       String
  severity       String
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

model MediaAccount {
  id                String   @id @default(cuid())
  workspaceId       String
  platformName      String
  status            String   @default("needs_config")
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
  status       String    @default("active")
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

- [ ] **Step 3: 跑 migration(对测试库 5433)**

Run:
```bash
cd apps/api && DATABASE_URL="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" npx prisma migrate dev --name add_simple_crud_resources
```
Expected: 新建 `prisma/migrations/<ts>_add_simple_crud_resources/migration.sql`,输出 `Your database is now in sync with your schema.`,并重新生成 Prisma Client。

- [ ] **Step 4: resetDb 加 6 个 deleteMany**

在 `apps/api/test/helpers.ts` 的 `resetDb` 中,`await prisma.customer.deleteMany();` 之后、`await prisma.project.deleteMany();` 之前插入:

```typescript
  await prisma.campaign.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.agencyPartner.deleteMany();
  await prisma.riskEvent.deleteMany();
  await prisma.mediaAccount.deleteMany();
  await prisma.keywordLibrary.deleteMany();
```

- [ ] **Step 5: 验证 client 生成 + 既有 e2e 仍绿(回归基线)**

Run:
```bash
cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json customer.e2e-spec.ts
```
Expected: customer 6 tests 全 PASS(证明新 schema 未破坏既有表 + client 已含新 delegate)。

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations apps/api/test/helpers.ts
git commit -m "feat(api): add 6 simple-CRUD resource models + migration + resetDb"
```

---

## Task 1: Campaign 端到端

**Files:**
- Create: `apps/api/src/campaign/dto.ts`
- Create: `apps/api/src/campaign/campaign.service.ts`
- Create: `apps/api/src/campaign/campaign.controller.ts`
- Create: `apps/api/src/campaign/campaign.module.ts`
- Modify: `apps/api/src/app.module.ts`(注册 CampaignModule)
- Create: `apps/api/test/campaign.e2e-spec.ts`
- Modify: `src/lib/data/campaignRepository.ts`(加 apiClient 写穿透 + hydrate)
- Create: `scripts/campaign-repository.test.ts`
- Modify: `package.json`(加 `test:campaign-repo`,纳入 `test:p0-specialized`)

- [ ] **Step 1: 写后端 e2e(先失败)**

Create `apps/api/test/campaign.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Campaign resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'cmp1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/campaigns`)
      .send({ name: 'Launch', channel: 'viral_qr', linkedAssetIds: ['a1'], metrics: { scans: 3 } })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.name).toBe('Launch');
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/campaigns/${id}`)).expect(200);
    expect(got.body.value.channel).toBe('viral_qr');
    expect(got.body.value.linkedAssetIds).toEqual(['a1']);
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/campaigns/${id}`)
      .send({ status: 'active' })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/campaigns`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].status).toBe('active');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/campaigns/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/campaigns`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'cmpiso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/campaigns`).send({ name: 'Secret' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'cmpiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/campaigns/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/campaigns/${id}`).send({ status: 'active' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/campaigns/${id}`)).expect(404);
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'cmppg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/campaigns`)
        .send({ name: `c${i}` })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/campaigns?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    expect(p1.body.value.nextCursor).not.toBeNull();
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/campaigns?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/campaigns?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'cmpm1@test.dev');
    const a2 = await registerUser(app, 'cmpm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/campaigns`)).expect(403);
  });

  it('status filter', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'cmpflt@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/campaigns`)
      .send({ name: 'A', status: 'active' })).expect(201);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/campaigns`)
      .send({ name: 'B', status: 'draft' })).expect(201);
    const q = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/campaigns?status=active`)).expect(200);
    expect(q.body.value.items).toHaveLength(1);
    expect(q.body.value.items[0].name).toBe('A');
  });
});
```

- [ ] **Step 2: 跑 e2e 确认失败**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json campaign.e2e-spec.ts`
Expected: FAIL(404 / 模块不存在 — campaigns 路由尚未注册)。

- [ ] **Step 3: 写 dto.ts**

Create `apps/api/src/campaign/dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsObject, IsOptional, IsString, Max, Min, MinLength, IsInt } from 'class-validator';

const CHANNELS = ['viral_qr', 'nfc_touchpoint', 'website', 'store_event', 'other'] as const;
const STATUSES = ['draft', 'active', 'paused', 'archived'] as const;

export class CreateCampaignDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() userId?: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsIn(CHANNELS as unknown as string[]) channel?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsString() moduleId?: string;
  @IsOptional() @IsString() landingUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) linkedAssetIds?: string[];
  @IsOptional() @IsObject() metrics?: Record<string, unknown>;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateCampaignDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsIn(CHANNELS as unknown as string[]) channel?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsString() moduleId?: string;
  @IsOptional() @IsString() landingUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) linkedAssetIds?: string[];
  @IsOptional() @IsObject() metrics?: Record<string, unknown>;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListCampaignQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
```

- [ ] **Step 4: 写 service(buildWhere status 过滤)**

Create `apps/api/src/campaign/campaign.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { ListCampaignQuery } from './dto';

@Injectable()
export class CampaignService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.campaign as unknown as PrismaResourceDelegate; }
  protected entityName = 'Campaign';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListCampaignQuery;
    return { workspaceId, ...(q.status ? { status: q.status } : {}) };
  }
}
```

- [ ] **Step 5: 写 controller**

Create `apps/api/src/campaign/campaign.controller.ts`:

```typescript
import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateCampaignDto, UpdateCampaignDto, ListCampaignQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/campaigns',
  createDto: CreateCampaignDto, updateDto: UpdateCampaignDto, listQuery: ListCampaignQuery,
});

@Controller('workspaces/:workspaceId/campaigns')
export class CampaignController extends Base {}
```

- [ ] **Step 6: 写 module**

Create `apps/api/src/campaign/campaign.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [CampaignController],
  providers: [CampaignService, { provide: RESOURCE_SERVICE, useExisting: CampaignService }],
})
export class CampaignModule {}
```

- [ ] **Step 7: app.module.ts 注册**

在 `apps/api/src/app.module.ts`:import 区加 `import { CampaignModule } from './campaign/campaign.module';`;`imports: [...]` 数组末尾(`CustomerModule` 后)加 `, CampaignModule`。

- [ ] **Step 8: 跑 e2e 确认通过**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json campaign.e2e-spec.ts`
Expected: 5 tests PASS。

- [ ] **Step 9: Commit 后端**

```bash
git add apps/api/src/campaign apps/api/src/app.module.ts apps/api/test/campaign.e2e-spec.ts
git commit -m "feat(api): add campaign resource (CRUD + status filter)"
```

- [ ] **Step 10: 前端 repo 加 apiClient 写穿透**

Modify `src/lib/data/campaignRepository.ts`。

(a) 顶部 import 区(现有 `import { getRepositoryStorage } from './dataBackend';` 之后)加:
```typescript
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';
```

(b) 改 `listWorkspaceCampaigns`(现 `return readCampaigns(context);`)为:
```typescript
export function listWorkspaceCampaigns(context: CampaignRepositoryContext): WorkspaceCampaign[] {
  if (campaignApiClient.configured) return campaignCache.get(context.workspaceId) ?? [];
  return readCampaigns(context);
}
```

(c) 在 `createWorkspaceCampaign` 的 `writeCampaigns([campaign, ...readCampaigns(context)], context);` 之后、`return campaign;` 之前插入写穿透:
```typescript
  if (campaignApiClient.configured) {
    campaignCache.set(context.workspaceId, sortCampaigns([campaign, ...(campaignCache.get(context.workspaceId) ?? [])]));
    void campaignApiClient.post(context.workspaceId, 'campaigns', {
      id: campaign.id, userId: campaign.userId, name: campaign.name, channel: campaign.channel,
      status: campaign.status, moduleId: campaign.moduleId, landingUrl: campaign.landingUrl,
      linkedAssetIds: campaign.linkedAssetIds, metrics: campaign.metrics, metadata: campaign.metadata,
    }).then((r) => { if (!r.ok) console.error('createWorkspaceCampaign write-through failed', r); })
      .catch((e) => console.error('createWorkspaceCampaign write-through failed', e));
  }
```

(d) 在 `updateWorkspaceCampaign` 的 `writeCampaigns(updatedCampaigns, context);` 之后、`return updatedCampaign;` 之前插入:
```typescript
  if (campaignApiClient.configured && updatedCampaign) {
    const u: WorkspaceCampaign = updatedCampaign;
    campaignCache.set(context.workspaceId, sortCampaigns((campaignCache.get(context.workspaceId) ?? []).map((c) => (c.id === u.id ? u : c))));
    void campaignApiClient.patch(context.workspaceId, `campaigns/${u.id}`, {
      name: u.name, channel: u.channel, status: u.status, moduleId: u.moduleId, landingUrl: u.landingUrl,
      linkedAssetIds: u.linkedAssetIds, metrics: u.metrics, metadata: u.metadata,
    }).then((r) => { if (!r.ok) console.error('updateWorkspaceCampaign write-through failed', r); })
      .catch((e) => console.error('updateWorkspaceCampaign write-through failed', e));
  }
```

(e) 改 `deleteWorkspaceCampaigns`(批量删,对每个 id 发 DELETE):
```typescript
export function deleteWorkspaceCampaigns(
  campaignIds: string[],
  context: CampaignRepositoryContext,
): WorkspaceCampaign[] {
  const campaignIdSet = new Set(campaignIds);
  if (campaignApiClient.configured) {
    campaignCache.set(context.workspaceId, (campaignCache.get(context.workspaceId) ?? []).filter((c) => !campaignIdSet.has(c.id)));
    for (const id of campaignIds) {
      void campaignApiClient.del(context.workspaceId, `campaigns/${id}`)
        .then((r) => { if (!r.ok) console.error('deleteWorkspaceCampaigns write-through failed', r); })
        .catch((e) => console.error('deleteWorkspaceCampaigns write-through failed', e));
    }
    return campaignCache.get(context.workspaceId) ?? [];
  }
  return writeCampaigns(readCampaigns(context).filter((campaign) => !campaignIdSet.has(campaign.id)), context);
}
```

(f) 文件末尾追加 test hook + cache + hydrate:
```typescript
let campaignApiClient: ApiClient = defaultApiClient;
export function __setCampaignApiClientForTest(client: ApiClient): void { campaignApiClient = client; }

const campaignCache = new Map<string, WorkspaceCampaign[]>(); // key = workspaceId

export async function hydrateWorkspaceCampaigns(context: CampaignRepositoryContext): Promise<void> {
  if (!campaignApiClient.configured) return;
  const res = await campaignApiClient.get<{ items: WorkspaceCampaign[]; nextCursor: string | null }>(
    context.workspaceId, 'campaigns');
  if (res.ok && res.value && Array.isArray(res.value.items)) {
    campaignCache.set(context.workspaceId, sortCampaigns(res.value.items.map((c) => normalizeCampaign(c, context))));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('workspace_campaigns_updated', { detail: { workspaceId: context.workspaceId } }));
    }
  }
}
```

- [ ] **Step 11: 写前端单测**

Create `scripts/campaign-repository.test.ts`:

```typescript
import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setCampaignApiClientForTest,
  hydrateWorkspaceCampaigns,
  listWorkspaceCampaigns,
  createWorkspaceCampaign,
} from '../src/lib/data/campaignRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'campaigns') return { ok: true, value: { items: [{ id: 'srv1', name: 'Server Cmp' }], nextCursor: null } } as any;
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

  __setCampaignApiClientForTest(fakeApi(true));
  await hydrateWorkspaceCampaigns({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = listWorkspaceCampaigns({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].name, 'Server Cmp');

  createWorkspaceCampaign({ name: 'New One' }, { workspaceId: 'wsA', storage: storageA });
  const afterCreate = listWorkspaceCampaigns({ workspaceId: 'wsA', storage: storageA });
  assert.equal(afterCreate.some((c) => c.name === 'New One'), true);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setCampaignApiClientForTest(fakeApi(false));
  createWorkspaceCampaign({ name: 'Local One' }, { workspaceId: 'wsB', storage });
  const local = listWorkspaceCampaigns({ workspaceId: 'wsB', storage });
  assert.equal(local.length, 1);
  assert.equal(local[0].name, 'Local One');

  console.log('campaign repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 12: package.json 加脚本**

在 `package.json` 的 `scripts` 中,`"test:customer-repo": "tsx scripts/customer-repository.test.ts"` 之后加:
```json
    "test:campaign-repo": "tsx scripts/campaign-repository.test.ts"
```
并在 `test:p0-specialized` 串末尾(`&& npm run test:customer-repo` 之后)追加 ` && npm run test:campaign-repo`。

- [ ] **Step 13: 跑前端单测 + lint**

Run: `npx tsx scripts/campaign-repository.test.ts && npm run lint`
Expected: 打印 `campaign repository passed`;`tsc --noEmit` 无错误退出。

- [ ] **Step 14: Commit 前端**

```bash
git add src/lib/data/campaignRepository.ts scripts/campaign-repository.test.ts package.json
git commit -m "feat(web): wire campaignRepository to backend with localStorage fallback"
```

---

## Task 2: Announcement 端到端

差异点:**无 delete 导出**;`status` 默认 `active`;`publishedAt` 由前端按 status 算好(draft→0/null,其他→now)再发,后端只存 `DateTime?`。后端返回的 `publishedAt` 是 ISO 字符串,前端 normalize 需解析为 epoch ms。

**Files:**
- Create: `apps/api/src/announcement/dto.ts`
- Create: `apps/api/src/announcement/announcement.service.ts`
- Create: `apps/api/src/announcement/announcement.controller.ts`
- Create: `apps/api/src/announcement/announcement.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/announcement.e2e-spec.ts`
- Modify: `src/lib/data/announcementRepository.ts`
- Create: `scripts/announcement-repository.test.ts`
- Modify: `package.json`

- [ ] **Step 1: 写后端 e2e(先失败)**

Create `apps/api/test/announcement.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Announcement resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'ann1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/announcements`)
      .send({ title: 'Maintenance', channel: 'in-app', status: 'active', publishedAt: new Date().toISOString() })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.title).toBe('Maintenance');
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/announcements/${id}`)).expect(200);
    expect(got.body.value.channel).toBe('in-app');
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/announcements/${id}`)
      .send({ status: 'archived' })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/announcements`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].status).toBe('archived');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/announcements/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/announcements`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'anniso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/announcements`).send({ title: 'Secret', channel: 'in-app' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'anniso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/announcements/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/announcements/${id}`).send({ status: 'archived' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/announcements/${id}`)).expect(404);
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'annpg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/announcements`)
        .send({ title: `t${i}`, channel: 'in-app' })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/announcements?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    expect(p1.body.value.nextCursor).not.toBeNull();
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/announcements?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/announcements?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'annm1@test.dev');
    const a2 = await registerUser(app, 'annm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/announcements`)).expect(403);
  });
});
```

- [ ] **Step 2: 跑 e2e 确认失败**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json announcement.e2e-spec.ts`
Expected: FAIL(announcements 路由未注册)。

- [ ] **Step 3: 写 dto.ts**

Create `apps/api/src/announcement/dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength, IsDateString } from 'class-validator';

const STATUSES = ['draft', 'active', 'scheduled', 'archived'] as const;

export class CreateAnnouncementDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) title!: string;
  @IsString() @MinLength(1) channel!: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsDateString() publishedAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateAnnouncementDto {
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsString() @MinLength(1) channel?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsDateString() publishedAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListAnnouncementQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
```

- [ ] **Step 4: 写 service**

Create `apps/api/src/announcement/announcement.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { ListAnnouncementQuery } from './dto';

@Injectable()
export class AnnouncementService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.announcement as unknown as PrismaResourceDelegate; }
  protected entityName = 'Announcement';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListAnnouncementQuery;
    return { workspaceId, ...(q.status ? { status: q.status } : {}) };
  }
}
```

- [ ] **Step 5: 写 controller**

Create `apps/api/src/announcement/announcement.controller.ts`:

```typescript
import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateAnnouncementDto, UpdateAnnouncementDto, ListAnnouncementQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/announcements',
  createDto: CreateAnnouncementDto, updateDto: UpdateAnnouncementDto, listQuery: ListAnnouncementQuery,
});

@Controller('workspaces/:workspaceId/announcements')
export class AnnouncementController extends Base {}
```

- [ ] **Step 6: 写 module**

Create `apps/api/src/announcement/announcement.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AnnouncementController } from './announcement.controller';
import { AnnouncementService } from './announcement.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [AnnouncementController],
  providers: [AnnouncementService, { provide: RESOURCE_SERVICE, useExisting: AnnouncementService }],
})
export class AnnouncementModule {}
```

- [ ] **Step 7: app.module.ts 注册**

import 区加 `import { AnnouncementModule } from './announcement/announcement.module';`;`imports` 数组末尾加 `, AnnouncementModule`。

- [ ] **Step 8: 跑 e2e 确认通过**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json announcement.e2e-spec.ts`
Expected: 4 tests PASS。

- [ ] **Step 9: Commit 后端**

```bash
git add apps/api/src/announcement apps/api/src/app.module.ts apps/api/test/announcement.e2e-spec.ts
git commit -m "feat(api): add announcement resource"
```

- [ ] **Step 10: 前端 normalizeTimestamp 支持 ISO 字符串**

后端 `publishedAt`/`createdAt`/`updatedAt` 返回 ISO 字符串,现有 `normalizeTimestamp` 用 `Number(value)` 会得 NaN。Modify `src/lib/data/announcementRepository.ts` 的 `normalizeTimestamp`(约 48-51 行)为:

```typescript
function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = typeof value === 'string' && !/^\d+$/.test(value.trim())
    ? Date.parse(value)
    : Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}
```

- [ ] **Step 11: 前端 repo 加 apiClient 写穿透(无 delete)**

Modify `src/lib/data/announcementRepository.ts`。

(a) 顶部 import 区加:
```typescript
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';
```

(b) 改 `loadWorkspaceAnnouncements`(现 `return readAnnouncements(context);`)为:
```typescript
export function loadWorkspaceAnnouncements(context: AnnouncementRepositoryContext): WorkspaceAnnouncement[] {
  if (announcementApiClient.configured) return announcementCache.get(context.workspaceId) ?? [];
  return readAnnouncements(context);
}
```

(c) 在 `createWorkspaceAnnouncement` 的 `writeAnnouncements([announcement, ...readAnnouncements(context)], context);` 之后、`return announcement;` 之前插入:
```typescript
  if (announcementApiClient.configured) {
    announcementCache.set(context.workspaceId, sortAnnouncements([announcement, ...(announcementCache.get(context.workspaceId) ?? [])]));
    void announcementApiClient.post(context.workspaceId, 'announcements', {
      id: announcement.id, title: announcement.title, channel: announcement.channel, status: announcement.status,
      publishedAt: announcement.publishedAt > 0 ? new Date(announcement.publishedAt).toISOString() : undefined,
      metadata: announcement.metadata,
    }).then((r) => { if (!r.ok) console.error('createWorkspaceAnnouncement write-through failed', r); })
      .catch((e) => console.error('createWorkspaceAnnouncement write-through failed', e));
  }
```

(d) 在 `updateWorkspaceAnnouncement` 的 `writeAnnouncements(updatedAnnouncements, context);` 之后、`return updatedAnnouncement;` 之前插入:
```typescript
  if (announcementApiClient.configured && updatedAnnouncement) {
    const u: WorkspaceAnnouncement = updatedAnnouncement;
    announcementCache.set(context.workspaceId, sortAnnouncements((announcementCache.get(context.workspaceId) ?? []).map((a) => (a.id === u.id ? u : a))));
    void announcementApiClient.patch(context.workspaceId, `announcements/${u.id}`, {
      title: u.title, channel: u.channel, status: u.status,
      publishedAt: u.publishedAt > 0 ? new Date(u.publishedAt).toISOString() : undefined,
      metadata: u.metadata,
    }).then((r) => { if (!r.ok) console.error('updateWorkspaceAnnouncement write-through failed', r); })
      .catch((e) => console.error('updateWorkspaceAnnouncement write-through failed', e));
  }
```

(e) 文件末尾追加:
```typescript
let announcementApiClient: ApiClient = defaultApiClient;
export function __setAnnouncementApiClientForTest(client: ApiClient): void { announcementApiClient = client; }

const announcementCache = new Map<string, WorkspaceAnnouncement[]>(); // key = workspaceId

export async function hydrateWorkspaceAnnouncements(context: AnnouncementRepositoryContext): Promise<void> {
  if (!announcementApiClient.configured) return;
  const res = await announcementApiClient.get<{ items: WorkspaceAnnouncement[]; nextCursor: string | null }>(
    context.workspaceId, 'announcements');
  if (res.ok && res.value && Array.isArray(res.value.items)) {
    announcementCache.set(context.workspaceId, sortAnnouncements(res.value.items.map((a) => normalizeAnnouncement(a, context))));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('workspace_announcements_updated', { detail: { workspaceId: context.workspaceId } }));
    }
  }
}
```

- [ ] **Step 12: 写前端单测**

Create `scripts/announcement-repository.test.ts`:

```typescript
import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setAnnouncementApiClientForTest,
  hydrateWorkspaceAnnouncements,
  loadWorkspaceAnnouncements,
  createWorkspaceAnnouncement,
} from '../src/lib/data/announcementRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'announcements') return { ok: true, value: { items: [{ id: 'srv1', title: 'Server Ann', channel: 'in-app', status: 'active' }], nextCursor: null } } as any;
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

  __setAnnouncementApiClientForTest(fakeApi(true));
  await hydrateWorkspaceAnnouncements({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceAnnouncements({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].title, 'Server Ann');

  createWorkspaceAnnouncement({ title: 'New One', channel: 'email' }, { workspaceId: 'wsA', storage: storageA });
  const afterCreate = loadWorkspaceAnnouncements({ workspaceId: 'wsA', storage: storageA });
  assert.equal(afterCreate.some((a) => a.title === 'New One'), true);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setAnnouncementApiClientForTest(fakeApi(false));
  createWorkspaceAnnouncement({ title: 'Local One', channel: 'email' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceAnnouncements({ workspaceId: 'wsB', storage });
  assert.equal(local.length, 1);
  assert.equal(local[0].title, 'Local One');

  console.log('announcement repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 13: package.json 加脚本**

`scripts` 加 `"test:announcement-repo": "tsx scripts/announcement-repository.test.ts"`;`test:p0-specialized` 末尾追加 ` && npm run test:announcement-repo`。

- [ ] **Step 14: 跑前端单测 + lint**

Run: `npx tsx scripts/announcement-repository.test.ts && npm run lint`
Expected: 打印 `announcement repository passed`;lint 无错误。

- [ ] **Step 15: Commit 前端**

```bash
git add src/lib/data/announcementRepository.ts scripts/announcement-repository.test.ts package.json
git commit -m "feat(web): wire announcementRepository to backend with localStorage fallback"
```

---

## Task 3: AgencyPartner 端到端

差异点:数值字段(`invitedUsers`/`totalCommissionCents` 整数、`commissionRate` 浮点);`summarize` 与 `ensureDefault` 保留作前端派生/兜底,后端零端点。configured 模式下 create/update 不调 `ensureDefault`(空表起步)。

**Files:**
- Create: `apps/api/src/agency/dto.ts`
- Create: `apps/api/src/agency/agency.service.ts`
- Create: `apps/api/src/agency/agency.controller.ts`
- Create: `apps/api/src/agency/agency.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/agency.e2e-spec.ts`
- Modify: `src/lib/data/agencyRepository.ts`
- Create: `scripts/agency-repository.test.ts`
- Modify: `package.json`

- [ ] **Step 1: 写后端 e2e(先失败)**

Create `apps/api/test/agency.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('AgencyPartner resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'agc1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/agency-partners`)
      .send({ name: 'MCN', level: 'V3', invitedUsers: 100, totalCommissionCents: 50000, commissionRate: 0.35, payoutStatus: 'pending' })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.invitedUsers).toBe(100);
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/agency-partners/${id}`)).expect(200);
    expect(got.body.value.commissionRate).toBeCloseTo(0.35);
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/agency-partners/${id}`)
      .send({ payoutStatus: 'paid' })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/agency-partners`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].payoutStatus).toBe('paid');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/agency-partners/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/agency-partners`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'agciso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/agency-partners`).send({ name: 'Secret', level: 'V1' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'agciso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/agency-partners/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/agency-partners/${id}`).send({ payoutStatus: 'paid' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/agency-partners/${id}`)).expect(404);
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'agcpg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/agency-partners`)
        .send({ name: `p${i}`, level: 'V1' })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/agency-partners?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/agency-partners?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/agency-partners?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'agcm1@test.dev');
    const a2 = await registerUser(app, 'agcm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/agency-partners`)).expect(403);
  });
});
```

- [ ] **Step 2: 跑 e2e 确认失败**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json agency.e2e-spec.ts`
Expected: FAIL(路由未注册)。

- [ ] **Step 3: 写 dto.ts**

Create `apps/api/src/agency/dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const PAYOUT = ['none', 'pending', 'paid', 'blocked'] as const;
const STATUSES = ['active', 'suspended'] as const;

export class CreateAgencyPartnerDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) name!: string;
  @IsString() @MinLength(1) level!: string;
  @IsOptional() @IsInt() @Min(0) invitedUsers?: number;
  @IsOptional() @IsInt() @Min(0) totalCommissionCents?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) commissionRate?: number;
  @IsOptional() @IsIn(PAYOUT as unknown as string[]) payoutStatus?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateAgencyPartnerDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() @MinLength(1) level?: string;
  @IsOptional() @IsInt() @Min(0) invitedUsers?: number;
  @IsOptional() @IsInt() @Min(0) totalCommissionCents?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(1) commissionRate?: number;
  @IsOptional() @IsIn(PAYOUT as unknown as string[]) payoutStatus?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListAgencyPartnerQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(PAYOUT as unknown as string[]) payoutStatus?: string;
}
```

- [ ] **Step 4: 写 service(buildWhere payoutStatus 过滤)**

Create `apps/api/src/agency/agency.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { ListAgencyPartnerQuery } from './dto';

@Injectable()
export class AgencyService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.agencyPartner as unknown as PrismaResourceDelegate; }
  protected entityName = 'AgencyPartner';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListAgencyPartnerQuery;
    return { workspaceId, ...(q.payoutStatus ? { payoutStatus: q.payoutStatus } : {}) };
  }
}
```

- [ ] **Step 5: 写 controller**

Create `apps/api/src/agency/agency.controller.ts`:

```typescript
import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateAgencyPartnerDto, UpdateAgencyPartnerDto, ListAgencyPartnerQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/agency-partners',
  createDto: CreateAgencyPartnerDto, updateDto: UpdateAgencyPartnerDto, listQuery: ListAgencyPartnerQuery,
});

@Controller('workspaces/:workspaceId/agency-partners')
export class AgencyController extends Base {}
```

- [ ] **Step 6: 写 module**

Create `apps/api/src/agency/agency.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AgencyController } from './agency.controller';
import { AgencyService } from './agency.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [AgencyController],
  providers: [AgencyService, { provide: RESOURCE_SERVICE, useExisting: AgencyService }],
})
export class AgencyModule {}
```

- [ ] **Step 7: app.module.ts 注册**

import 加 `import { AgencyModule } from './agency/agency.module';`;`imports` 末尾加 `, AgencyModule`。

- [ ] **Step 8: 跑 e2e 确认通过**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json agency.e2e-spec.ts`
Expected: 4 tests PASS。

- [ ] **Step 9: Commit 后端**

```bash
git add apps/api/src/agency apps/api/src/app.module.ts apps/api/test/agency.e2e-spec.ts
git commit -m "feat(api): add agency-partner resource (payoutStatus filter)"
```

- [ ] **Step 10: 前端 repo 加 apiClient 写穿透**

Modify `src/lib/data/agencyRepository.ts`。

(a) 顶部 import 区加:
```typescript
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';
```

(b) 改 `loadWorkspaceAgencyPartners`(现 `return readAgencyPartners(context);`)为:
```typescript
export function loadWorkspaceAgencyPartners(context: AgencyRepositoryContext): WorkspaceAgencyPartner[] {
  if (agencyApiClient.configured) return agencyCache.get(context.workspaceId) ?? [];
  return readAgencyPartners(context);
}
```

(c) `createWorkspaceAgencyPartner` 改为 configured 时不调 ensureDefault、走写穿透;在 `writeAgencyPartners([partner, ...ensureDefaultWorkspaceAgencyPartners(context)], context);` 之后、`return partner;` 之前插入:
```typescript
  if (agencyApiClient.configured) {
    agencyCache.set(context.workspaceId, sortAgencyPartners([partner, ...(agencyCache.get(context.workspaceId) ?? [])]));
    void agencyApiClient.post(context.workspaceId, 'agency-partners', {
      id: partner.id, name: partner.name, level: partner.level, invitedUsers: partner.invitedUsers,
      totalCommissionCents: partner.totalCommissionCents, commissionRate: partner.commissionRate,
      payoutStatus: partner.payoutStatus, status: partner.status, metadata: partner.metadata,
    }).then((r) => { if (!r.ok) console.error('createWorkspaceAgencyPartner write-through failed', r); })
      .catch((e) => console.error('createWorkspaceAgencyPartner write-through failed', e));
  }
```

(d) 在 `updateWorkspaceAgencyPartner` 的 `writeAgencyPartners(updatedPartners, context);` 之后、`return updatedPartner;` 之前插入:
```typescript
  if (agencyApiClient.configured && updatedPartner) {
    const u: WorkspaceAgencyPartner = updatedPartner;
    agencyCache.set(context.workspaceId, sortAgencyPartners((agencyCache.get(context.workspaceId) ?? []).map((p) => (p.id === u.id ? u : p))));
    void agencyApiClient.patch(context.workspaceId, `agency-partners/${u.id}`, {
      name: u.name, level: u.level, invitedUsers: u.invitedUsers, totalCommissionCents: u.totalCommissionCents,
      commissionRate: u.commissionRate, payoutStatus: u.payoutStatus, status: u.status, metadata: u.metadata,
    }).then((r) => { if (!r.ok) console.error('updateWorkspaceAgencyPartner write-through failed', r); })
      .catch((e) => console.error('updateWorkspaceAgencyPartner write-through failed', e));
  }
```

(e) 文件末尾追加:
```typescript
let agencyApiClient: ApiClient = defaultApiClient;
export function __setAgencyApiClientForTest(client: ApiClient): void { agencyApiClient = client; }

const agencyCache = new Map<string, WorkspaceAgencyPartner[]>(); // key = workspaceId

export async function hydrateWorkspaceAgencyPartners(context: AgencyRepositoryContext): Promise<void> {
  if (!agencyApiClient.configured) return;
  const res = await agencyApiClient.get<{ items: WorkspaceAgencyPartner[]; nextCursor: string | null }>(
    context.workspaceId, 'agency-partners');
  if (res.ok && res.value && Array.isArray(res.value.items)) {
    agencyCache.set(context.workspaceId, sortAgencyPartners(res.value.items.map((p) => normalizeAgencyPartner(p, context))));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('workspace_agency_partners_updated', { detail: { workspaceId: context.workspaceId } }));
    }
  }
}
```

- [ ] **Step 11: 写前端单测**

Create `scripts/agency-repository.test.ts`:

```typescript
import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setAgencyApiClientForTest,
  hydrateWorkspaceAgencyPartners,
  loadWorkspaceAgencyPartners,
  createWorkspaceAgencyPartner,
} from '../src/lib/data/agencyRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'agency-partners') return { ok: true, value: { items: [{ id: 'srv1', name: 'Server MCN', level: 'V3' }], nextCursor: null } } as any;
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

  __setAgencyApiClientForTest(fakeApi(true));
  await hydrateWorkspaceAgencyPartners({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceAgencyPartners({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].name, 'Server MCN');

  createWorkspaceAgencyPartner({ name: 'New One', level: 'V1' }, { workspaceId: 'wsA', storage: storageA });
  const afterCreate = loadWorkspaceAgencyPartners({ workspaceId: 'wsA', storage: storageA });
  assert.equal(afterCreate.some((p) => p.name === 'New One'), true);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setAgencyApiClientForTest(fakeApi(false));
  createWorkspaceAgencyPartner({ name: 'Local One', level: 'V1' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceAgencyPartners({ workspaceId: 'wsB', storage });
  assert.equal(local.some((p) => p.name === 'Local One'), true);

  console.log('agency repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

注:未配置模式 `createWorkspaceAgencyPartner` 会用 `ensureDefaultWorkspaceAgencyPartners` 种入 3 条默认 + 新 1 条,故用 `some(...)` 断言而非 length。

- [ ] **Step 12: package.json 加脚本**

`scripts` 加 `"test:agency-repo": "tsx scripts/agency-repository.test.ts"`;`test:p0-specialized` 末尾追加 ` && npm run test:agency-repo`。

- [ ] **Step 13: 跑前端单测 + lint**

Run: `npx tsx scripts/agency-repository.test.ts && npm run lint`
Expected: 打印 `agency repository passed`;lint 无错误。

- [ ] **Step 14: Commit 前端**

```bash
git add src/lib/data/agencyRepository.ts scripts/agency-repository.test.ts package.json
git commit -m "feat(web): wire agencyRepository to backend with localStorage fallback"
```

---

## Task 4: RiskEvent 端到端

差异点:业务时间 `occurredAt`(DateTime)+ `reviewedAt`(DateTime?),后端返回 ISO 字符串,前端 normalize 需解析;`ensureDefault`/`summarize` 保留前端;后端 list 按 createdAt 排序,前端 `sortRiskEvents` 按 decision+severity+occurredAt 重排(原样保留)。

**Files:**
- Create: `apps/api/src/risk/dto.ts`
- Create: `apps/api/src/risk/risk.service.ts`
- Create: `apps/api/src/risk/risk.controller.ts`
- Create: `apps/api/src/risk/risk.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/risk.e2e-spec.ts`
- Modify: `src/lib/data/riskRepository.ts`
- Create: `scripts/risk-repository.test.ts`
- Modify: `package.json`

- [ ] **Step 1: 写后端 e2e(先失败)**

Create `apps/api/test/risk.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('RiskEvent resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'rsk1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/risk-events`)
      .send({ action: 'gen', contentSummary: 'blocked prompt', rule: 'policy', decision: 'blocked', severity: 'critical' })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.decision).toBe('blocked');
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/risk-events/${id}`)).expect(200);
    expect(got.body.value.severity).toBe('critical');
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/risk-events/${id}`)
      .send({ decision: 'allowed', reviewedAt: new Date().toISOString() })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/risk-events`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].decision).toBe('allowed');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/risk-events/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/risk-events`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'rskiso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/risk-events`).send({ action: 'x', contentSummary: 's', rule: 'r', decision: 'blocked', severity: 'high' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'rskiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/risk-events/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/risk-events/${id}`).send({ decision: 'allowed' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/risk-events/${id}`)).expect(404);
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'rskpg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/risk-events`)
        .send({ action: `act${i}`, contentSummary: 's', rule: 'r', decision: 'allowed', severity: 'low' })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/risk-events?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/risk-events?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/risk-events?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'rskm1@test.dev');
    const a2 = await registerUser(app, 'rskm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/risk-events`)).expect(403);
  });

  it('decision filter', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'rskflt@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/risk-events`)
      .send({ action: 'A', contentSummary: 's', rule: 'r', decision: 'blocked', severity: 'high' })).expect(201);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/risk-events`)
      .send({ action: 'B', contentSummary: 's', rule: 'r', decision: 'allowed', severity: 'low' })).expect(201);
    const q = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/risk-events?decision=blocked`)).expect(200);
    expect(q.body.value.items).toHaveLength(1);
    expect(q.body.value.items[0].action).toBe('A');
  });
});
```

- [ ] **Step 2: 跑 e2e 确认失败**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json risk.e2e-spec.ts`
Expected: FAIL(路由未注册)。

- [ ] **Step 3: 写 dto.ts**

Create `apps/api/src/risk/dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const DECISIONS = ['blocked', 'pending_review', 'allowed', 'rate_limited', 'account_frozen'] as const;
const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export class CreateRiskEventDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) action!: string;
  @IsString() @MinLength(1) contentSummary!: string;
  @IsString() @MinLength(1) rule!: string;
  @IsIn(DECISIONS as unknown as string[]) decision!: string;
  @IsIn(SEVERITIES as unknown as string[]) severity!: string;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsDateString() reviewedAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateRiskEventDto {
  @IsOptional() @IsString() @MinLength(1) action?: string;
  @IsOptional() @IsString() @MinLength(1) contentSummary?: string;
  @IsOptional() @IsString() @MinLength(1) rule?: string;
  @IsOptional() @IsIn(DECISIONS as unknown as string[]) decision?: string;
  @IsOptional() @IsIn(SEVERITIES as unknown as string[]) severity?: string;
  @IsOptional() @IsDateString() reviewedAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListRiskEventQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(DECISIONS as unknown as string[]) decision?: string;
  @IsOptional() @IsIn(SEVERITIES as unknown as string[]) severity?: string;
}
```

- [ ] **Step 4: 写 service(buildWhere decision/severity 过滤)**

Create `apps/api/src/risk/risk.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { ListRiskEventQuery } from './dto';

@Injectable()
export class RiskService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.riskEvent as unknown as PrismaResourceDelegate; }
  protected entityName = 'RiskEvent';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListRiskEventQuery;
    return {
      workspaceId,
      ...(q.decision ? { decision: q.decision } : {}),
      ...(q.severity ? { severity: q.severity } : {}),
    };
  }
}
```

- [ ] **Step 5: 写 controller**

Create `apps/api/src/risk/risk.controller.ts`:

```typescript
import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateRiskEventDto, UpdateRiskEventDto, ListRiskEventQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/risk-events',
  createDto: CreateRiskEventDto, updateDto: UpdateRiskEventDto, listQuery: ListRiskEventQuery,
});

@Controller('workspaces/:workspaceId/risk-events')
export class RiskController extends Base {}
```

- [ ] **Step 6: 写 module**

Create `apps/api/src/risk/risk.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [RiskController],
  providers: [RiskService, { provide: RESOURCE_SERVICE, useExisting: RiskService }],
})
export class RiskModule {}
```

- [ ] **Step 7: app.module.ts 注册**

import 加 `import { RiskModule } from './risk/risk.module';`;`imports` 末尾加 `, RiskModule`。

- [ ] **Step 8: 跑 e2e 确认通过**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json risk.e2e-spec.ts`
Expected: 5 tests PASS。

- [ ] **Step 9: Commit 后端**

```bash
git add apps/api/src/risk apps/api/src/app.module.ts apps/api/test/risk.e2e-spec.ts
git commit -m "feat(api): add risk-event resource (decision/severity filter)"
```

- [ ] **Step 10: 前端 normalizeTimestamp / normalizeNullableTimestamp 支持 ISO**

Modify `src/lib/data/riskRepository.ts`。

(a) `normalizeTimestamp`(约 105-108 行)改为:
```typescript
function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = typeof value === 'string' && !/^\d+$/.test(value.trim())
    ? Date.parse(value)
    : Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}
```

(b) `normalizeNullableTimestamp`(约 110-114 行)改为:
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

Modify `src/lib/data/riskRepository.ts`。

(a) 顶部 import 区加:
```typescript
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';
```

(b) 改 `loadWorkspaceRiskEvents`(现 `return readRiskEvents(context);`)为:
```typescript
export function loadWorkspaceRiskEvents(context: RiskRepositoryContext): WorkspaceRiskEvent[] {
  if (riskApiClient.configured) return riskCache.get(context.workspaceId) ?? [];
  return readRiskEvents(context);
}
```

(c) 在 `createWorkspaceRiskEvent` 的 `writeRiskEvents([event, ...ensureDefaultWorkspaceRiskEvents(context)], context);` 之后、`return event;` 之前插入:
```typescript
  if (riskApiClient.configured) {
    riskCache.set(context.workspaceId, sortRiskEvents([event, ...(riskCache.get(context.workspaceId) ?? [])]));
    void riskApiClient.post(context.workspaceId, 'risk-events', {
      id: event.id, action: event.action, contentSummary: event.contentSummary, rule: event.rule,
      decision: event.decision, severity: event.severity,
      occurredAt: event.occurredAt > 0 ? new Date(event.occurredAt).toISOString() : undefined,
      reviewedAt: event.reviewedAt && event.reviewedAt > 0 ? new Date(event.reviewedAt).toISOString() : undefined,
      metadata: event.metadata,
    }).then((r) => { if (!r.ok) console.error('createWorkspaceRiskEvent write-through failed', r); })
      .catch((e) => console.error('createWorkspaceRiskEvent write-through failed', e));
  }
```

(d) 在 `updateWorkspaceRiskEvent` 的 `writeRiskEvents(updatedEvents, context);` 之后、`return updatedEvent;` 之前插入:
```typescript
  if (riskApiClient.configured && updatedEvent) {
    const u: WorkspaceRiskEvent = updatedEvent;
    riskCache.set(context.workspaceId, sortRiskEvents((riskCache.get(context.workspaceId) ?? []).map((e) => (e.id === u.id ? u : e))));
    void riskApiClient.patch(context.workspaceId, `risk-events/${u.id}`, {
      action: u.action, contentSummary: u.contentSummary, rule: u.rule, decision: u.decision, severity: u.severity,
      reviewedAt: u.reviewedAt && u.reviewedAt > 0 ? new Date(u.reviewedAt).toISOString() : undefined,
      metadata: u.metadata,
    }).then((r) => { if (!r.ok) console.error('updateWorkspaceRiskEvent write-through failed', r); })
      .catch((e) => console.error('updateWorkspaceRiskEvent write-through failed', e));
  }
```

(e) 文件末尾追加:
```typescript
let riskApiClient: ApiClient = defaultApiClient;
export function __setRiskApiClientForTest(client: ApiClient): void { riskApiClient = client; }

const riskCache = new Map<string, WorkspaceRiskEvent[]>(); // key = workspaceId

export async function hydrateWorkspaceRiskEvents(context: RiskRepositoryContext): Promise<void> {
  if (!riskApiClient.configured) return;
  const res = await riskApiClient.get<{ items: WorkspaceRiskEvent[]; nextCursor: string | null }>(
    context.workspaceId, 'risk-events');
  if (res.ok && res.value && Array.isArray(res.value.items)) {
    riskCache.set(context.workspaceId, sortRiskEvents(res.value.items.map((e) => normalizeRiskEvent(e, context))));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('workspace_risk_events_updated', { detail: { workspaceId: context.workspaceId } }));
    }
  }
}
```

- [ ] **Step 12: 写前端单测**

Create `scripts/risk-repository.test.ts`:

```typescript
import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setRiskApiClientForTest,
  hydrateWorkspaceRiskEvents,
  loadWorkspaceRiskEvents,
  createWorkspaceRiskEvent,
} from '../src/lib/data/riskRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'risk-events') return { ok: true, value: { items: [{ id: 'srv1', action: 'Server Act', contentSummary: 's', rule: 'r', decision: 'blocked', severity: 'high' }], nextCursor: null } } as any;
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

  __setRiskApiClientForTest(fakeApi(true));
  await hydrateWorkspaceRiskEvents({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceRiskEvents({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].action, 'Server Act');

  createWorkspaceRiskEvent({ action: 'New Act', contentSummary: 's', rule: 'r' }, { workspaceId: 'wsA', storage: storageA });
  const afterCreate = loadWorkspaceRiskEvents({ workspaceId: 'wsA', storage: storageA });
  assert.equal(afterCreate.some((e) => e.action === 'New Act'), true);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setRiskApiClientForTest(fakeApi(false));
  createWorkspaceRiskEvent({ action: 'Local Act', contentSummary: 's', rule: 'r' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceRiskEvents({ workspaceId: 'wsB', storage });
  assert.equal(local.some((e) => e.action === 'Local Act'), true);

  console.log('risk repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

注:未配置模式 `createWorkspaceRiskEvent` 会经 `ensureDefaultWorkspaceRiskEvents` 种入默认事件,故用 `some(...)` 断言。

- [ ] **Step 13: package.json 加脚本**

`scripts` 加 `"test:risk-repo": "tsx scripts/risk-repository.test.ts"`;`test:p0-specialized` 末尾追加 ` && npm run test:risk-repo`。

- [ ] **Step 14: 跑前端单测 + lint**

Run: `npx tsx scripts/risk-repository.test.ts && npm run lint`
Expected: 打印 `risk repository passed`;lint 无错误。

- [ ] **Step 15: Commit 前端**

```bash
git add src/lib/data/riskRepository.ts scripts/risk-repository.test.ts package.json
git commit -m "feat(web): wire riskRepository to backend with localStorage fallback"
```

---

## Task 5: MediaAccount 端到端

差异点:`clientId` 为前端瞬态输入,**绝不入库**;前端在 create/update 时已用 `credentialRef()`/`clientIdLast4()` 算好 `credentialRef`(env 引用串)和 `clientIdLast4`(末 4 位),写穿透只发算好的结果,不发 `clientId`。`ensureDefault`/`summarize` 保留前端。

**Files:**
- Create: `apps/api/src/media/dto.ts`
- Create: `apps/api/src/media/media.service.ts`
- Create: `apps/api/src/media/media.controller.ts`
- Create: `apps/api/src/media/media.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/media.e2e-spec.ts`
- Modify: `src/lib/data/mediaRepository.ts`
- Create: `scripts/media-repository.test.ts`
- Modify: `package.json`

- [ ] **Step 1: 写后端 e2e(先失败)**

Create `apps/api/test/media.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('MediaAccount resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'med1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/media-accounts`)
      .send({ platformName: 'YouTube', status: 'active', connectedAccounts: 5, credentialRef: 'env:YT', clientIdLast4: '1234' })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.platformName).toBe('YouTube');
    expect(created.body.value.clientIdLast4).toBe('1234');
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/media-accounts/${id}`)).expect(200);
    expect(got.body.value.credentialRef).toBe('env:YT');
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/media-accounts/${id}`)
      .send({ status: 'rate_limited' })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/media-accounts`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].status).toBe('rate_limited');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/media-accounts/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/media-accounts`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('rejects unknown clientId field (whitelist)', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'medwl@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/media-accounts`)
      .send({ platformName: 'X', clientId: 'rawsecret9999' })).expect(400);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'mediso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/media-accounts`).send({ platformName: 'Secret' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'mediso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/media-accounts/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/media-accounts/${id}`).send({ status: 'offline' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/media-accounts/${id}`)).expect(404);
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'medpg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/media-accounts`)
        .send({ platformName: `p${i}` })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/media-accounts?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/media-accounts?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/media-accounts?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'medm1@test.dev');
    const a2 = await registerUser(app, 'medm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/media-accounts`)).expect(403);
  });
});
```

- [ ] **Step 2: 跑 e2e 确认失败**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json media.e2e-spec.ts`
Expected: FAIL(路由未注册)。

- [ ] **Step 3: 写 dto.ts(无 clientId 字段,whitelist 自动拒绝)**

Create `apps/api/src/media/dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const STATUSES = ['active', 'rate_limited', 'offline', 'needs_config'] as const;

export class CreateMediaAccountDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) platformName!: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsInt() @Min(0) connectedAccounts?: number;
  @IsOptional() @IsString() credentialRef?: string;
  @IsOptional() @IsString() clientIdLast4?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateMediaAccountDto {
  @IsOptional() @IsString() @MinLength(1) platformName?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsInt() @Min(0) connectedAccounts?: number;
  @IsOptional() @IsString() credentialRef?: string;
  @IsOptional() @IsString() clientIdLast4?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListMediaAccountQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
```

- [ ] **Step 4: 写 service**

Create `apps/api/src/media/media.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { ListMediaAccountQuery } from './dto';

@Injectable()
export class MediaService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.mediaAccount as unknown as PrismaResourceDelegate; }
  protected entityName = 'MediaAccount';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListMediaAccountQuery;
    return { workspaceId, ...(q.status ? { status: q.status } : {}) };
  }
}
```

- [ ] **Step 5: 写 controller**

Create `apps/api/src/media/media.controller.ts`:

```typescript
import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateMediaAccountDto, UpdateMediaAccountDto, ListMediaAccountQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/media-accounts',
  createDto: CreateMediaAccountDto, updateDto: UpdateMediaAccountDto, listQuery: ListMediaAccountQuery,
});

@Controller('workspaces/:workspaceId/media-accounts')
export class MediaController extends Base {}
```

- [ ] **Step 6: 写 module**

Create `apps/api/src/media/media.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [MediaController],
  providers: [MediaService, { provide: RESOURCE_SERVICE, useExisting: MediaService }],
})
export class MediaModule {}
```

- [ ] **Step 7: app.module.ts 注册**

import 加 `import { MediaModule } from './media/media.module';`;`imports` 末尾加 `, MediaModule`。

- [ ] **Step 8: 跑 e2e 确认通过**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json media.e2e-spec.ts`
Expected: 5 tests PASS(含 whitelist 拒绝 clientId)。

- [ ] **Step 9: Commit 后端**

```bash
git add apps/api/src/media apps/api/src/app.module.ts apps/api/test/media.e2e-spec.ts
git commit -m "feat(api): add media-account resource (no raw clientId stored)"
```

- [ ] **Step 10: 前端 repo 加 apiClient 写穿透(只发算好的 credentialRef/clientIdLast4)**

Modify `src/lib/data/mediaRepository.ts`。

(a) 顶部 import 区加:
```typescript
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';
```

(b) 改 `loadWorkspaceMediaAccounts`(现 `return readMediaAccounts(context);`)为:
```typescript
export function loadWorkspaceMediaAccounts(context: MediaRepositoryContext): WorkspaceMediaAccount[] {
  if (mediaApiClient.configured) return mediaCache.get(context.workspaceId) ?? [];
  return readMediaAccounts(context);
}
```

(c) 在 `createWorkspaceMediaAccount` 的 `writeMediaAccounts([account, ...ensureDefaultWorkspaceMediaAccounts(context)], context);` 之后、`return account;` 之前插入(`account` 已含算好的 `credentialRef`/`clientIdLast4`,绝不发 `clientId`):
```typescript
  if (mediaApiClient.configured) {
    mediaCache.set(context.workspaceId, sortMediaAccounts([account, ...(mediaCache.get(context.workspaceId) ?? [])]));
    void mediaApiClient.post(context.workspaceId, 'media-accounts', {
      id: account.id, platformName: account.platformName, status: account.status,
      connectedAccounts: account.connectedAccounts, credentialRef: account.credentialRef ?? undefined,
      clientIdLast4: account.clientIdLast4 ?? undefined, metadata: account.metadata,
    }).then((r) => { if (!r.ok) console.error('createWorkspaceMediaAccount write-through failed', r); })
      .catch((e) => console.error('createWorkspaceMediaAccount write-through failed', e));
  }
```

(d) 在 `updateWorkspaceMediaAccount` 的 `writeMediaAccounts(updatedAccounts, context);` 之后、`return updatedAccount;` 之前插入(`updatedAccount` 已是重算后结果):
```typescript
  if (mediaApiClient.configured && updatedAccount) {
    const u: WorkspaceMediaAccount = updatedAccount;
    mediaCache.set(context.workspaceId, sortMediaAccounts((mediaCache.get(context.workspaceId) ?? []).map((m) => (m.id === u.id ? u : m))));
    void mediaApiClient.patch(context.workspaceId, `media-accounts/${u.id}`, {
      platformName: u.platformName, status: u.status, connectedAccounts: u.connectedAccounts,
      credentialRef: u.credentialRef ?? undefined, clientIdLast4: u.clientIdLast4 ?? undefined, metadata: u.metadata,
    }).then((r) => { if (!r.ok) console.error('updateWorkspaceMediaAccount write-through failed', r); })
      .catch((e) => console.error('updateWorkspaceMediaAccount write-through failed', e));
  }
```

(e) 文件末尾追加:
```typescript
let mediaApiClient: ApiClient = defaultApiClient;
export function __setMediaApiClientForTest(client: ApiClient): void { mediaApiClient = client; }

const mediaCache = new Map<string, WorkspaceMediaAccount[]>(); // key = workspaceId

export async function hydrateWorkspaceMediaAccounts(context: MediaRepositoryContext): Promise<void> {
  if (!mediaApiClient.configured) return;
  const res = await mediaApiClient.get<{ items: WorkspaceMediaAccount[]; nextCursor: string | null }>(
    context.workspaceId, 'media-accounts');
  if (res.ok && res.value && Array.isArray(res.value.items)) {
    mediaCache.set(context.workspaceId, sortMediaAccounts(res.value.items.map((m) => normalizeMediaAccount(m, context))));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('workspace_media_accounts_updated', { detail: { workspaceId: context.workspaceId } }));
    }
  }
}
```

- [ ] **Step 11: 写前端单测**

Create `scripts/media-repository.test.ts`:

```typescript
import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setMediaApiClientForTest,
  hydrateWorkspaceMediaAccounts,
  loadWorkspaceMediaAccounts,
  createWorkspaceMediaAccount,
} from '../src/lib/data/mediaRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'media-accounts') return { ok: true, value: { items: [{ id: 'srv1', platformName: 'Server YT', status: 'active' }], nextCursor: null } } as any;
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

  __setMediaApiClientForTest(fakeApi(true));
  await hydrateWorkspaceMediaAccounts({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceMediaAccounts({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].platformName, 'Server YT');

  createWorkspaceMediaAccount({ platformName: 'New One' }, { workspaceId: 'wsA', storage: storageA });
  const afterCreate = loadWorkspaceMediaAccounts({ workspaceId: 'wsA', storage: storageA });
  assert.equal(afterCreate.some((m) => m.platformName === 'New One'), true);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setMediaApiClientForTest(fakeApi(false));
  createWorkspaceMediaAccount({ platformName: 'Local One' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceMediaAccounts({ workspaceId: 'wsB', storage });
  assert.equal(local.some((m) => m.platformName === 'Local One'), true);

  console.log('media repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

注:未配置模式经 `ensureDefaultWorkspaceMediaAccounts` 种入默认账号,故用 `some(...)` 断言。

- [ ] **Step 12: package.json 加脚本**

`scripts` 加 `"test:media-repo": "tsx scripts/media-repository.test.ts"`;`test:p0-specialized` 末尾追加 ` && npm run test:media-repo`。

- [ ] **Step 13: 跑前端单测 + lint**

Run: `npx tsx scripts/media-repository.test.ts && npm run lint`
Expected: 打印 `media repository passed`;lint 无错误。

- [ ] **Step 14: Commit 前端**

```bash
git add src/lib/data/mediaRepository.ts scripts/media-repository.test.ts package.json
git commit -m "feat(web): wire mediaRepository to backend with localStorage fallback"
```

---

## Task 6: KeywordLibrary 端到端

差异点:`archiveWorkspaceKeywordLibrary` = update(status='archived' + archivedAt)走 PATCH;`searchWorkspaceKeywordLibraries` 保留前端,作用于 `list()` 结果(configured 时读缓存),后端无搜索端点;`archivedAt` DateTime? 返回 ISO,前端 normalize 需解析;数组字段 tags/keywords/blockedTerms。

**Files:**
- Create: `apps/api/src/keyword/dto.ts`
- Create: `apps/api/src/keyword/keyword.service.ts`
- Create: `apps/api/src/keyword/keyword.controller.ts`
- Create: `apps/api/src/keyword/keyword.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/keyword.e2e-spec.ts`
- Modify: `src/lib/data/keywordRepository.ts`
- Create: `scripts/keyword-repository.test.ts`
- Modify: `package.json`

- [ ] **Step 1: 写后端 e2e(先失败)**

Create `apps/api/test/keyword.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('KeywordLibrary resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'kw1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/keyword-libraries`)
      .send({ name: 'SEO', tags: ['t1'], keywords: ['k1', 'k2'], blockedTerms: ['b1'] })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.name).toBe('SEO');
    expect(created.body.value.keywords).toEqual(['k1', 'k2']);
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/keyword-libraries/${id}`)).expect(200);
    expect(got.body.value.blockedTerms).toEqual(['b1']);
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/keyword-libraries/${id}`)
      .send({ status: 'archived', archivedAt: new Date().toISOString() })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/keyword-libraries`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].status).toBe('archived');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/keyword-libraries/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/keyword-libraries`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'kwiso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/keyword-libraries`).send({ name: 'Secret' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'kwiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/keyword-libraries/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/keyword-libraries/${id}`).send({ status: 'archived' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/keyword-libraries/${id}`)).expect(404);
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'kwpg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/keyword-libraries`)
        .send({ name: `lib${i}` })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/keyword-libraries?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/keyword-libraries?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/keyword-libraries?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'kwm1@test.dev');
    const a2 = await registerUser(app, 'kwm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/keyword-libraries`)).expect(403);
  });

  it('status filter', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'kwflt@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/keyword-libraries`)
      .send({ name: 'A', status: 'active' })).expect(201);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/keyword-libraries`)
      .send({ name: 'B', status: 'archived' })).expect(201);
    const q = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/keyword-libraries?status=active`)).expect(200);
    expect(q.body.value.items).toHaveLength(1);
    expect(q.body.value.items[0].name).toBe('A');
  });
});
```

- [ ] **Step 2: 跑 e2e 确认失败**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json keyword.e2e-spec.ts`
Expected: FAIL(路由未注册)。

- [ ] **Step 3: 写 dto.ts**

Create `apps/api/src/keyword/dto.ts`:

```typescript
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const STATUSES = ['active', 'paused', 'archived'] as const;

export class CreateKeywordLibraryDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsString() sourceText?: string;
  @IsOptional() @IsString() moduleId?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) keywords?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) blockedTerms?: string[];
  @IsOptional() @IsDateString() archivedAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateKeywordLibraryDto {
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsString() sourceText?: string;
  @IsOptional() @IsString() moduleId?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) keywords?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) blockedTerms?: string[];
  @IsOptional() @IsDateString() archivedAt?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListKeywordLibraryQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
```

- [ ] **Step 4: 写 service**

Create `apps/api/src/keyword/keyword.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { ListKeywordLibraryQuery } from './dto';

@Injectable()
export class KeywordService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.keywordLibrary as unknown as PrismaResourceDelegate; }
  protected entityName = 'KeywordLibrary';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListKeywordLibraryQuery;
    return { workspaceId, ...(q.status ? { status: q.status } : {}) };
  }
}
```

- [ ] **Step 5: 写 controller**

Create `apps/api/src/keyword/keyword.controller.ts`:

```typescript
import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateKeywordLibraryDto, UpdateKeywordLibraryDto, ListKeywordLibraryQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/keyword-libraries',
  createDto: CreateKeywordLibraryDto, updateDto: UpdateKeywordLibraryDto, listQuery: ListKeywordLibraryQuery,
});

@Controller('workspaces/:workspaceId/keyword-libraries')
export class KeywordController extends Base {}
```

- [ ] **Step 6: 写 module**

Create `apps/api/src/keyword/keyword.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { KeywordController } from './keyword.controller';
import { KeywordService } from './keyword.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [KeywordController],
  providers: [KeywordService, { provide: RESOURCE_SERVICE, useExisting: KeywordService }],
})
export class KeywordModule {}
```

- [ ] **Step 7: app.module.ts 注册**

import 加 `import { KeywordModule } from './keyword/keyword.module';`;`imports` 末尾加 `, KeywordModule`。

- [ ] **Step 8: 跑 e2e 确认通过**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json keyword.e2e-spec.ts`
Expected: 5 tests PASS。

- [ ] **Step 9: Commit 后端**

```bash
git add apps/api/src/keyword apps/api/src/app.module.ts apps/api/test/keyword.e2e-spec.ts
git commit -m "feat(api): add keyword-library resource (status filter)"
```

- [ ] **Step 10: 前端 normalizeTimestamp 支持 ISO**

Modify `src/lib/data/keywordRepository.ts` 的 `normalizeTimestamp`(约 64-67 行)为:
```typescript
function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = typeof value === 'string' && !/^\d+$/.test(value.trim())
    ? Date.parse(value)
    : Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}
```

- [ ] **Step 11: 前端 repo 加 apiClient 写穿透 + search 走缓存**

Modify `src/lib/data/keywordRepository.ts`。

(a) 顶部 import 区加:
```typescript
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';
```

(b) 改 `loadWorkspaceKeywordLibraries`(现 `return readLibraries(context);`)为:
```typescript
export function loadWorkspaceKeywordLibraries(context: KeywordRepositoryContext): WorkspaceKeywordLibrary[] {
  if (keywordApiClient.configured) return keywordCache.get(context.workspaceId) ?? [];
  return readLibraries(context);
}
```

(c) 在 `createWorkspaceKeywordLibrary` 的 `writeLibraries([library, ...readLibraries(context)], context);` 之后、`return library;` 之前插入:
```typescript
  if (keywordApiClient.configured) {
    keywordCache.set(context.workspaceId, sortLibraries([library, ...(keywordCache.get(context.workspaceId) ?? [])]));
    void keywordApiClient.post(context.workspaceId, 'keyword-libraries', {
      id: library.id, userId: library.userId, ownerId: library.ownerId, name: library.name,
      description: library.description, channel: library.channel, sourceText: library.sourceText,
      moduleId: library.moduleId, status: library.status, tags: library.tags, keywords: library.keywords,
      blockedTerms: library.blockedTerms, metadata: library.metadata,
    }).then((r) => { if (!r.ok) console.error('createWorkspaceKeywordLibrary write-through failed', r); })
      .catch((e) => console.error('createWorkspaceKeywordLibrary write-through failed', e));
  }
```

(d) 在 `updateWorkspaceKeywordLibrary` 的 `writeLibraries(libraries, context);` 之后、`return updatedLibrary;` 之前插入:
```typescript
  if (keywordApiClient.configured && updatedLibrary) {
    const u: WorkspaceKeywordLibrary = updatedLibrary;
    keywordCache.set(context.workspaceId, sortLibraries((keywordCache.get(context.workspaceId) ?? []).map((l) => (l.id === u.id ? u : l))));
    void keywordApiClient.patch(context.workspaceId, `keyword-libraries/${u.id}`, {
      ownerId: u.ownerId, name: u.name, description: u.description, channel: u.channel, sourceText: u.sourceText,
      moduleId: u.moduleId, status: u.status, tags: u.tags, keywords: u.keywords, blockedTerms: u.blockedTerms,
      archivedAt: u.archivedAt && u.archivedAt > 0 ? new Date(u.archivedAt).toISOString() : undefined,
      metadata: u.metadata,
    }).then((r) => { if (!r.ok) console.error('updateWorkspaceKeywordLibrary write-through failed', r); })
      .catch((e) => console.error('updateWorkspaceKeywordLibrary write-through failed', e));
  }
```

`archiveWorkspaceKeywordLibrary` 无需改:它内部调 `updateWorkspaceKeywordLibrary`,自动走上面的 PATCH 写穿透。

(e) 改 `searchWorkspaceKeywordLibraries`,configured 时基于缓存 list 而非 `readLibraries`:
```typescript
export function searchWorkspaceKeywordLibraries(
  query: string,
  context: KeywordRepositoryContext,
): WorkspaceKeywordLibrary[] {
  const normalizedQuery = query.trim().toLowerCase();
  const libraries = keywordApiClient.configured
    ? (keywordCache.get(context.workspaceId) ?? [])
    : readLibraries(context);
  if (!normalizedQuery) return libraries;

  return libraries.filter((library) => [
    library.name,
    library.description,
    library.channel,
    library.sourceText,
    ...library.tags,
    ...library.keywords,
    ...library.blockedTerms,
    JSON.stringify(library.metadata),
  ].join(' ').toLowerCase().includes(normalizedQuery));
}
```

(f) 文件末尾追加:
```typescript
let keywordApiClient: ApiClient = defaultApiClient;
export function __setKeywordApiClientForTest(client: ApiClient): void { keywordApiClient = client; }

const keywordCache = new Map<string, WorkspaceKeywordLibrary[]>(); // key = workspaceId

export async function hydrateWorkspaceKeywordLibraries(context: KeywordRepositoryContext): Promise<void> {
  if (!keywordApiClient.configured) return;
  const res = await keywordApiClient.get<{ items: WorkspaceKeywordLibrary[]; nextCursor: string | null }>(
    context.workspaceId, 'keyword-libraries');
  if (res.ok && res.value && Array.isArray(res.value.items)) {
    keywordCache.set(context.workspaceId, sortLibraries(res.value.items.map((l) => normalizeKeywordLibrary(l, context))));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('workspace_keyword_libraries_updated', { detail: { workspaceId: context.workspaceId } }));
    }
  }
}
```

- [ ] **Step 12: 写前端单测(含 search + archive)**

Create `scripts/keyword-repository.test.ts`:

```typescript
import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setKeywordApiClientForTest,
  hydrateWorkspaceKeywordLibraries,
  loadWorkspaceKeywordLibraries,
  createWorkspaceKeywordLibrary,
  searchWorkspaceKeywordLibraries,
} from '../src/lib/data/keywordRepository.ts';

function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'keyword-libraries') return { ok: true, value: { items: [{ id: 'srv1', name: 'Server Lib', keywords: ['alpha'] }], nextCursor: null } } as any;
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

  __setKeywordApiClientForTest(fakeApi(true));
  await hydrateWorkspaceKeywordLibraries({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceKeywordLibraries({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].name, 'Server Lib');

  // search 作用于缓存
  const found = searchWorkspaceKeywordLibraries('alpha', { workspaceId: 'wsA', storage: storageA });
  assert.equal(found.length, 1);
  const none = searchWorkspaceKeywordLibraries('zzz', { workspaceId: 'wsA', storage: storageA });
  assert.equal(none.length, 0);

  createWorkspaceKeywordLibrary({ name: 'New One' }, { workspaceId: 'wsA', storage: storageA });
  const afterCreate = loadWorkspaceKeywordLibraries({ workspaceId: 'wsA', storage: storageA });
  assert.equal(afterCreate.some((l) => l.name === 'New One'), true);

  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setKeywordApiClientForTest(fakeApi(false));
  createWorkspaceKeywordLibrary({ name: 'Local One' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceKeywordLibraries({ workspaceId: 'wsB', storage });
  assert.equal(local.length, 1);
  assert.equal(local[0].name, 'Local One');

  console.log('keyword repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 13: package.json 加脚本**

`scripts` 加 `"test:keyword-repo": "tsx scripts/keyword-repository.test.ts"`;`test:p0-specialized` 末尾追加 ` && npm run test:keyword-repo`。

- [ ] **Step 14: 跑前端单测 + lint**

Run: `npx tsx scripts/keyword-repository.test.ts && npm run lint`
Expected: 打印 `keyword repository passed`;lint 无错误。

- [ ] **Step 15: Commit 前端**

```bash
git add src/lib/data/keywordRepository.ts scripts/keyword-repository.test.ts package.json
git commit -m "feat(web): wire keywordRepository to backend with localStorage fallback"
```

---

## Task 7: 全量验收

逐项跑验收线,任一不绿即回到对应 task 修复后重跑。

**Files:** 无新增,仅运行验证。

- [ ] **Step 1: 后端全 e2e(含 6 新域 + customer + 既有)**

Run:
```bash
cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json
```
Expected: 全部 suite PASS(原 16 suites + 6 新 suites = 22 suites,无 fail)。

- [ ] **Step 2: 前端类型检查**

Run: `npm run lint`
Expected: `tsc --noEmit` 无错误退出。

- [ ] **Step 3: 前端 P0 专项套件(含 6 个新 repo 测试)**

Run: `npm run test:p0-specialized`
Expected: 全绿,末尾包含 `campaign/announcement/agency/risk/media/keyword repository passed` 6 行。

- [ ] **Step 4: saas-foundation 回归**

Run: `npm run test:saas-foundation`
Expected: PASS。

- [ ] **Step 5: 前端构建**

Run: `npm run build`
Expected: vite build 成功,无类型/打包错误。

- [ ] **Step 6: 更新 memory 进度**

更新 `C:\Users\Administrator\.claude\projects\E--code-aistudio\memory\project_saas_productization.md`:把 ⑤b-1 标记为已交付(6 域端到端 + 全量验收通过),记录 ⑤b-2 为下一子批。

- [ ] **Step 7: 验收完成提示**

向用户报告:⑤b-1 全 7 个 task 完成,后端 22 suites e2e 全绿、前端 lint+build+test:p0-specialized+saas-foundation 全绿。提示尚有未 push 的 ⑤a(8 commit)+ ⑤b spec + ⑤b-1 实现 commit,询问是否 push origin,以及是否继续 ⑤b-2。

---

## 附:自检结论(写计划时已核对)

- **Spec 覆盖:** §3 的 6 模型 → Task 0;§4 三件套 → 各域 Step 3-7;§5 buildWhere status/payoutStatus/decision/severity 过滤 → campaign/agency/risk/media/keyword service(announcement 也加了 status,符合 §5「可加但非必须」);§6 前端重写 + 签名差异(announcement 无 delete、campaign 批量删、keyword archive=PATCH、media 重算后发)→ 各域 Step 10-11;§7 错误处理沿用基类/全局;§8 测试 → 每域 e2e 4-5 例 + 前端单测 + Task 7 验收。
- **占位符:** 无 TBD/TODO,所有代码块完整。
- **类型/命名一致:** 各域 `__set<Domain>ApiClientForTest` / `hydrate...` / `<domain>Cache` / `<domain>ApiClient` 命名贯穿;路径段 `media-accounts`/`agency-partners`/`risk-events`/`keyword-libraries` 在 e2e、controller、写穿透三处一致;ISO 时间戳 normalize 修正应用于 announcement/risk/keyword(有 DateTime 业务字段的域)。

