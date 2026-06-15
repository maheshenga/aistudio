# AI 编排服务(③)实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把后端做成 GenerationJob 编排真相源,补齐 desktop_multica 派发闭环(派发→直连开跑→后端轮询对账回写产物/用量/审计),并对齐前后端任务契约。

**Architecture:** 新增后端 `apps/api/src/orchestration/` 域(dispatch/link-external/cancel/retry 端点 + ReconciliationService 轮询对账 + 服务侧 MulticaServerClient),GenerationJob 模型 canonical 升级(补 cancelled/进度/external* 字段)。前端新增非 UI 的 `orchestrationService` 下沉派发逻辑,provider 补真实 WS + listTasks 走后端,status 枚举统一(queued→pending)。

**Tech Stack:** NestJS 10 + Prisma 5 + PostgreSQL + @nestjs/schedule;前端 React + tsx 测试脚本。后端 Jest e2e 连真实 DB(不 mock),唯一 mock 边界是 Multica server(fixture)。

**设计依据:** `docs/superpowers/specs/2026-06-15-ai-orchestration-design.md`(5 决策 Q1=C/Q2=B/Q3=A/Q4=A/Q5=A)。

---

## 关键工程决策(实现计划锁定,补充设计文档开放问题)

1. **对账终态写入直接用 Prisma 事务客户端,不注入 AssetService/UsageEventService/AuditLogService。** 理由:设计要求"落终态+写产物+写用量在同一 `prisma.$transaction`",而①现有这三个 service 用注入的 `this.prisma`(非事务客户端),无法参与同一事务。OrchestrationModule 因此自包含,只依赖全局 `PrismaService`,在 `prisma.$transaction(tx => ...)` 内用 `tx.asset.create` / `tx.usageEvent.create` / `tx.auditLog.create` / `tx.generationJob.update`。写入的是同一批①已有的表,审计 action 词汇与①一致。
2. **派发时 OrchestrationService 直接用 Prisma 建 GenerationJob**(不经 GenerationJobService.create),以便一次写入 `runtimeMode/agentId/providerKind` 等新字段。GenerationJobService 仅扩展 `cancelled` 状态机供 `/status` 端点用。
3. **Multica server 查询/产物端点形状**(设计开放问题 2):据现有 `multicaApiClient` 端点风格推断为 `GET /api/tasks/:id`(任务状态)与 `GET /api/tasks/:id/artifacts`(产物),由后端侧 `MulticaServerClient` 用 fakeFetch 契约测试 pin 死 URL + 状态映射。若上游实际不同,只需改这一个 client。
4. **对账定时器测试默认关闭**:env 开关 `ORCHESTRATION_RECONCILE_ENABLED`(默认 `false`);`@Interval` 方法体首行检查开关早退。测试直接调 `reconcileOnce()` 断言,不依赖定时器。
5. **MulticaServerClient 经 DI token `MULTICA_SERVER_CLIENT` 注入**:工厂从 env(`MULTICA_API_URL`/`MULTICA_API_TOKEN`)构造;缺失则提供 `null`,`ReconciliationService` 见 `null` 时对账降级为 no-op(不影响其余后端)。reconciliation e2e 用 `overrideProvider(MULTICA_SERVER_CLIENT).useValue(fakeClient)`。

---

## 文件结构(创建/修改一览)

**后端新增 `apps/api/src/orchestration/`:**
- `multica-server-client.ts` — 服务侧 Multica 查询 client 接口 + 工厂 + 状态映射 + DI token。一职责:后端↔Multica server HTTP。
- `dto.ts` — DispatchDto / LinkExternalDto。
- `orchestration.service.ts` — dispatch / linkExternal / cancel / retry(派发真相落库 + 审计)。
- `orchestration.controller.ts` — 4 个 workspace 范围端点。
- `reconciliation.service.ts` — `@Interval` 轮询 + `reconcileOnce()` + 状态映射回写 + 终态事务(产物/用量/审计)+ 幂等 + 孤儿 pending 清理。
- `orchestration.module.ts` — 装配,提供 `MULTICA_SERVER_CLIENT` 工厂 + 两个 service。

**后端修改:**
- `apps/api/prisma/schema.prisma` — GenerationJob 加列 + 索引(Task 1)。
- `apps/api/prisma/migrations/.../migration.sql` — 新迁移(Task 1)。
- `apps/api/src/generation-job/generation-job.service.ts` — ALLOWED 加 cancelled 出边(Task 2)。
- `apps/api/src/generation-job/dto.ts` — STATUSES 加 'cancelled'(Task 2)。
- `apps/api/src/app.module.ts` — 引入 OrchestrationModule + ScheduleModule.forRoot()(Task 6)。
- `apps/api/package.json` — 加 `@nestjs/schedule` 依赖(Task 6)。

**后端测试新增 `apps/api/test/`:**
- `orchestration.e2e-spec.ts`(Task 4)、`reconciliation.e2e-spec.ts`(Task 5)、`generation-job.e2e-spec.ts` 扩展 cancelled(Task 2)。

**前端修改 `src/`:**
- `src/runtime/agentRuntimeTypes.ts` — AgentTaskStatus 去 queued 用 pending(Task 7)。
- `src/lib/data/generationJobRepository.ts` — GenerationJobStatus 去 queued 用 pending + 默认值(Task 7)。
- `src/runtime/multicaMappers.ts` — queued→pending 边界映射(Task 7)。
- `src/runtime/multicaContractFixtures.ts` + 受影响 6 个 runtime 测试 fixtures(Task 7)。
- `src/runtime/orchestrationService.ts` — 新建,派发逻辑下沉(Task 8)。
- `src/runtime/multicaAgentRuntimeProvider.ts` — subscribeToTask 接真实 WS + listTasks 走后端(Task 9)。

**前端测试新增 `scripts/`:**
- `orchestration-service.test.ts`(Task 8)、`multica-server-client` 后端侧测试随 Task 3、扩展 `multica-runtime-provider.test.ts`(Task 9)。

---

## Task 1: GenerationJob canonical 模型升级(加列 + 索引)

**Files:**
- Modify: `apps/api/prisma/schema.prisma:62-78`
- Create: `apps/api/prisma/migrations/<timestamp>_extend_generation_job_orchestration/migration.sql`(由 prisma 生成)

非破坏性:全是加可空列 + 加索引;status 仍是 String,值域扩展(加 'cancelled')无需 DB 约束改动。

- [ ] **Step 1: 修改 schema 给 GenerationJob 加字段**

把 `apps/api/prisma/schema.prisma` 的 GenerationJob 模型(当前 62-78 行)替换为:

```prisma
model GenerationJob {
  id          String   @id @default(cuid())
  workspaceId String
  projectId   String?
  type        String
  status      String   @default("pending")
  input       Json
  error       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // ③ orchestration 升级字段
  runtimeMode    String?
  agentId        String?
  providerKind   String?
  externalTaskId String?
  externalRef    Json?
  progress       Int?
  currentStep    String?
  startedAt      DateTime?
  finishedAt     DateTime?

  workspace   Workspace    @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  assets      Asset[]
  usageEvents UsageEvent[]

  @@index([workspaceId, status])
  @@index([externalTaskId])
}
```

- [ ] **Step 2: 生成迁移到本地 dev 库**

Run(从仓库根):
```bash
cd apps/api && DATABASE_URL="postgresql://postgres:postgres@localhost:5433/aistudio_dev?schema=public" npx prisma migrate dev --name extend_generation_job_orchestration
```
Expected: 生成 `prisma/migrations/<ts>_extend_generation_job_orchestration/migration.sql`,内容含 `ALTER TABLE "GenerationJob" ADD COLUMN ...` 9 列 + `CREATE INDEX ... ON "GenerationJob"("externalTaskId")`。Prisma Client 重新生成成功。

> 若本地无 `aistudio_dev` 库:先 `DATABASE_URL="postgresql://postgres:postgres@localhost:5433/aistudio_dev?schema=public" npx prisma migrate deploy` 建库,或直接用测试库名跑一次 migrate dev 再 reset。关键产物是 migration.sql 文件入库。

- [ ] **Step 3: 迁移应用到测试库**

Run(从仓库根):
```bash
cd apps/api && DATABASE_URL="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" npx prisma migrate deploy
```
Expected: `extend_generation_job_orchestration` applied,无报错。

- [ ] **Step 4: 跑一次现有 generation-job e2e 确认未破坏**

Run(从仓库根):
```bash
cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test -- generation-job
```
Expected: 现有 2 个用例 PASS(create→running→succeeded、filters by status)。

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(api): extend GenerationJob with orchestration fields"
```

## Task 2: GenerationJob 状态机补 cancelled

**Files:**
- Modify: `apps/api/src/generation-job/generation-job.service.ts:7-12`(ALLOWED)
- Modify: `apps/api/src/generation-job/dto.ts:2`(STATUSES)
- Test: `apps/api/test/generation-job.e2e-spec.ts`(新增 cancelled 用例)

- [ ] **Step 1: 写失败测试 — cancelled 流转**

在 `apps/api/test/generation-job.e2e-spec.ts` 的 describe 内、最后一个 `it` 后追加:

```typescript
  it('pending → cancelled and running → cancelled are legal', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'gj3@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    const post = () => auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/generation-jobs`).send({ type: 'image', input: {} }));
    const patch = (id: string, status: string) => auth(request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/generation-jobs/${id}/status`).send({ status }));

    const a = (await post().expect(201)).body.value.id;
    await patch(a, 'cancelled').expect(200); // pending → cancelled

    const b = (await post().expect(201)).body.value.id;
    await patch(b, 'running').expect(200);
    await patch(b, 'cancelled').expect(200); // running → cancelled
  });

  it('cancelled is terminal — further transition → 400', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'gj4@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    const made = await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/generation-jobs`).send({ type: 'image', input: {} })).expect(201);
    const id = made.body.value.id;
    await auth(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/generation-jobs/${id}/status`).send({ status: 'cancelled' })).expect(200);
    const bad = await auth(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/generation-jobs/${id}/status`).send({ status: 'running' })).expect(400);
    expect(bad.body.error.code).toBe('validation_error');
  });
```

- [ ] **Step 2: 跑测试确认失败**

Run(从仓库根):
```bash
cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test -- generation-job
```
Expected: 新用例 FAIL —— `pending → cancelled` 返回 400(当前 ALLOWED 无 cancelled),且 dto STATUSES 不含 cancelled 会先被 ValidationPipe 拒为 400(原因不同但仍失败)。

- [ ] **Step 3: dto STATUSES 加 cancelled**

把 `apps/api/src/generation-job/dto.ts` 第 2 行改为:

```typescript
const STATUSES = ['pending', 'running', 'succeeded', 'failed', 'cancelled'] as const;
```

- [ ] **Step 4: ALLOWED 加 cancelled 出边**

把 `apps/api/src/generation-job/generation-job.service.ts` 的 ALLOWED(7-12 行)改为:

```typescript
const ALLOWED: Record<string, string[]> = {
  pending: ['running', 'failed', 'cancelled'],
  running: ['succeeded', 'failed', 'cancelled'],
  succeeded: [],
  failed: [],
  cancelled: [],
};
```

- [ ] **Step 5: 跑测试确认通过**

Run(从仓库根):
```bash
cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test -- generation-job
```
Expected: 全部 4 个用例 PASS。

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/generation-job apps/api/test/generation-job.e2e-spec.ts
git commit -m "feat(api): allow cancelled transitions on GenerationJob"
```

## Task 3: 后端侧 MulticaServerClient(服务凭据 + 状态映射)

后端独立于前端浏览器侧 `multicaApiClient`。带服务凭据,从 env 读;缺失则工厂返回 null(对账降级)。用 fakeFetch 契约测试 pin 端点 URL + 状态映射。

**Files:**
- Create: `apps/api/src/orchestration/multica-server-client.ts`
- Test: `apps/api/test/multica-server-client.e2e-spec.ts`(纯单元,不连 DB,用同一 jest 配置跑)

- [ ] **Step 1: 写失败测试**

Create `apps/api/test/multica-server-client.e2e-spec.ts`:

```typescript
import { createMulticaServerClient, mapMulticaTaskStatus } from '../src/orchestration/multica-server-client';

describe('MulticaServerClient (contract)', () => {
  it('mapMulticaTaskStatus maps daemon states to canonical job status', () => {
    expect(mapMulticaTaskStatus('queued')).toBe('pending');
    expect(mapMulticaTaskStatus('pending')).toBe('pending');
    expect(mapMulticaTaskStatus('in_progress')).toBe('running');
    expect(mapMulticaTaskStatus('running')).toBe('running');
    expect(mapMulticaTaskStatus('completed')).toBe('succeeded');
    expect(mapMulticaTaskStatus('succeeded')).toBe('succeeded');
    expect(mapMulticaTaskStatus('failed')).toBe('failed');
    expect(mapMulticaTaskStatus('error')).toBe('failed');
    expect(mapMulticaTaskStatus('cancelled')).toBe('cancelled');
    expect(mapMulticaTaskStatus('canceled')).toBe('cancelled');
    expect(mapMulticaTaskStatus('weird_unknown')).toBe('running'); // unknown 非终态 → running
  });

  it('getTask hits GET /api/tasks/:id and returns mapped snapshot', async () => {
    const calls: Array<{ url: string; auth?: string }> = [];
    const fakeFetch = (async (url: string, init?: any) => {
      calls.push({ url, auth: init?.headers?.Authorization });
      return new Response(JSON.stringify({ id: 't1', status: 'in_progress', progress: 42, current_step: 'running tests' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as unknown as typeof fetch;
    const client = createMulticaServerClient({ apiUrl: 'http://multica', token: 'svc-token', fetchImpl: fakeFetch })!;
    const snap = await client.getTask('t1');
    expect(calls[0].url).toBe('http://multica/api/tasks/t1');
    expect(calls[0].auth).toBe('Bearer svc-token');
    expect(snap).toEqual({ status: 'running', progress: 42, currentStep: 'running tests', raw: { id: 't1', status: 'in_progress', progress: 42, current_step: 'running tests' } });
  });

  it('getArtifacts hits GET /api/tasks/:id/artifacts and returns array', async () => {
    const fakeFetch = (async () =>
      new Response(JSON.stringify({ artifacts: [{ id: 'a1', url: 'http://f/1', kind: 'image' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } })) as unknown as typeof fetch;
    const client = createMulticaServerClient({ apiUrl: 'http://multica', token: 't', fetchImpl: fakeFetch })!;
    const arts = await client.getArtifacts('t1');
    expect(arts).toEqual([{ id: 'a1', url: 'http://f/1', kind: 'image' }]);
  });

  it('factory returns null when apiUrl missing (degraded reconciliation)', () => {
    expect(createMulticaServerClient({ apiUrl: undefined, token: 't' })).toBeNull();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run(从仓库根):
```bash
cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test -- multica-server-client
```
Expected: FAIL —— Cannot find module '../src/orchestration/multica-server-client'。

- [ ] **Step 3: 实现 MulticaServerClient**

Create `apps/api/src/orchestration/multica-server-client.ts`:

```typescript
export const MULTICA_SERVER_CLIENT = 'MULTICA_SERVER_CLIENT';

export type CanonicalTaskStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface MulticaTaskSnapshot {
  status: CanonicalTaskStatus;
  progress?: number;
  currentStep?: string;
  raw: Record<string, unknown>;
}

export interface MulticaArtifact {
  id?: string;
  url?: string;
  kind?: string;
  [k: string]: unknown;
}

export interface MulticaServerClient {
  getTask(externalTaskId: string): Promise<MulticaTaskSnapshot>;
  getArtifacts(externalTaskId: string): Promise<MulticaArtifact[]>;
}

export interface MulticaServerClientOptions {
  apiUrl?: string;
  token?: string;
  fetchImpl?: typeof fetch;
}

const TERMINAL: Record<string, CanonicalTaskStatus> = {
  completed: 'succeeded', succeeded: 'succeeded', success: 'succeeded',
  failed: 'failed', error: 'failed',
  cancelled: 'cancelled', canceled: 'cancelled',
};
const PENDING = new Set(['queued', 'pending', 'created', 'scheduled']);

export function mapMulticaTaskStatus(raw: string): CanonicalTaskStatus {
  const k = String(raw ?? '').toLowerCase();
  if (TERMINAL[k]) return TERMINAL[k];
  if (PENDING.has(k)) return 'pending';
  return 'running'; // in_progress/running/unknown 非终态 → running
}

function headers(token?: string): Record<string, string> {
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function parse(res: Response, endpoint: string): Promise<unknown> {
  if (!res.ok) throw new Error(`${endpoint} failed with ${res.status} ${res.statusText}`);
  if (res.status === 204) return undefined;
  return res.json();
}

export function createMulticaServerClient(options: MulticaServerClientOptions): MulticaServerClient | null {
  const apiUrl = options.apiUrl?.replace(/\/+$/, '');
  if (!apiUrl) return null;
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    async getTask(externalTaskId) {
      const res = await fetchImpl(`${apiUrl}/api/tasks/${encodeURIComponent(externalTaskId)}`, { headers: headers(options.token) });
      const body = (await parse(res, 'GET /api/tasks/:id')) as Record<string, unknown>;
      const progressRaw = body.progress;
      const stepRaw = body.current_step ?? body.currentStep;
      return {
        status: mapMulticaTaskStatus(String(body.status ?? '')),
        progress: typeof progressRaw === 'number' ? progressRaw : undefined,
        currentStep: typeof stepRaw === 'string' ? stepRaw : undefined,
        raw: body,
      };
    },
    async getArtifacts(externalTaskId) {
      const res = await fetchImpl(`${apiUrl}/api/tasks/${encodeURIComponent(externalTaskId)}/artifacts`, { headers: headers(options.token) });
      const body = (await parse(res, 'GET /api/tasks/:id/artifacts')) as { artifacts?: MulticaArtifact[] };
      return Array.isArray(body?.artifacts) ? body.artifacts : [];
    },
  };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run(从仓库根):
```bash
cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test -- multica-server-client
```
Expected: 4 个用例 PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/orchestration/multica-server-client.ts apps/api/test/multica-server-client.e2e-spec.ts
git commit -m "feat(api): add backend MulticaServerClient with status mapping"
```

## Task 4: Orchestration 域(dispatch / link-external / cancel / retry)

后端编排层:接收派发意图、登记外部引用、写审计。不替代 GenerationJob 状态机。所有端点 workspace 范围,经全局 AuthGuard + TenantGuard(无需写守卫代码)。OrchestrationService 直接用 PrismaService 建/改 job(一次写入 runtimeMode/agentId/providerKind 等新字段),审计用 `prisma.auditLog.create`。

**Files:**
- Create: `apps/api/src/orchestration/dto.ts`
- Create: `apps/api/src/orchestration/orchestration.service.ts`
- Create: `apps/api/src/orchestration/orchestration.controller.ts`
- Test: `apps/api/test/orchestration.e2e-spec.ts`

> 说明:本任务暂不创建 `orchestration.module.ts`/不改 AppModule(留到 Task 6 统一装配 + ScheduleModule)。本任务无法独立跑 e2e。**因此 Task 4 的 e2e 在 Task 6 装配后才能跑绿**;Task 4 只写代码 + 写测试 + 确认 tsc 通过,e2e 验证移到 Task 6。这是有意的依赖顺序(reconciliation.service 与 module 在 Task 5/6),避免重复装配。

- [ ] **Step 1: 写 DTO**

Create `apps/api/src/orchestration/dto.ts`:

```typescript
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class DispatchDto {
  @IsString() @MinLength(1) type!: string;
  @IsObject() input!: Record<string, unknown>;
  @IsString() @MinLength(1) runtimeMode!: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsString() providerKind?: string;
}

export class LinkExternalDto {
  @IsString() @MinLength(1) externalTaskId!: string;
  @IsOptional() @IsObject() externalRef?: Record<string, unknown>;
}
```

- [ ] **Step 2: 写 OrchestrationService**

Create `apps/api/src/orchestration/orchestration.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { notFound, validationError } from '../common/errors';
import { DispatchDto, LinkExternalDto } from './dto';

const TERMINAL = new Set(['succeeded', 'failed', 'cancelled']);

interface Actor { userId: string; role?: string }

@Injectable()
export class OrchestrationService {
  constructor(private prisma: PrismaService) {}

  private async getJob(workspaceId: string, id: string) {
    const job = await this.prisma.generationJob.findFirst({ where: { id, workspaceId } });
    if (!job) throw notFound('Generation job not found');
    return job;
  }

  private audit(workspaceId: string, action: string, job: { id: string }, actor: Actor, metadata?: Record<string, unknown>) {
    return this.prisma.auditLog.create({
      data: {
        workspaceId, action, userId: actor.userId, actorRole: actor.role,
        targetType: 'generation_job', targetId: job.id,
        metadata: (metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async dispatch(workspaceId: string, dto: DispatchDto, actor: Actor) {
    const job = await this.prisma.generationJob.create({
      data: {
        workspaceId, type: dto.type, input: dto.input as Prisma.InputJsonValue,
        status: 'pending', runtimeMode: dto.runtimeMode,
        projectId: dto.projectId ?? null, agentId: dto.agentId ?? null,
        providerKind: dto.providerKind ?? null,
      },
    });
    await this.audit(workspaceId, 'task_dispatched', job, actor, { runtimeMode: dto.runtimeMode });
    return job;
  }

  async linkExternal(workspaceId: string, id: string, dto: LinkExternalDto, actor: Actor) {
    const job = await this.getJob(workspaceId, id);
    if (TERMINAL.has(job.status)) throw validationError('Cannot link external task to a terminal job');
    const updated = await this.prisma.generationJob.update({
      where: { id },
      data: { externalTaskId: dto.externalTaskId, externalRef: (dto.externalRef ?? undefined) as Prisma.InputJsonValue | undefined },
    });
    await this.audit(workspaceId, 'task_linked', updated, actor, { externalTaskId: dto.externalTaskId });
    return updated;
  }

  async cancel(workspaceId: string, id: string, actor: Actor) {
    const job = await this.getJob(workspaceId, id);
    if (TERMINAL.has(job.status)) throw validationError('Job already in a terminal state');
    await this.audit(workspaceId, 'task_cancelled', job, actor, {});
    // 仅写意图 + 审计;实际终态由对账确认(desktop 取消由前端直连 daemon 执行)
    return job;
  }

  async retry(workspaceId: string, id: string, actor: Actor) {
    const job = await this.getJob(workspaceId, id);
    if (!TERMINAL.has(job.status)) throw validationError('Only terminal jobs can be retried');
    const updated = await this.prisma.generationJob.update({
      where: { id },
      data: {
        status: 'pending', externalTaskId: null, externalRef: Prisma.DbNull,
        progress: null, currentStep: null, error: null, startedAt: null, finishedAt: null,
      },
    });
    await this.audit(workspaceId, 'generation_job_retry', updated, actor, {});
    return updated;
  }
}
```

- [ ] **Step 3: 写 OrchestrationController**

Create `apps/api/src/orchestration/orchestration.controller.ts`:

```typescript
import { Body, Controller, Param, Post } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { OrchestrationService } from './orchestration.service';
import { DispatchDto, LinkExternalDto } from './dto';

@Controller('workspaces/:workspaceId/orchestration')
export class OrchestrationController {
  constructor(private svc: OrchestrationService) {}

  @Post('dispatch')
  async dispatch(@WorkspaceId() ws: string, @Body() dto: DispatchDto, @CurrentUser() user: { userId: string; role?: string }) {
    return { value: { job: await this.svc.dispatch(ws, dto, user) } };
  }

  @Post('jobs/:jobId/link-external')
  async link(@WorkspaceId() ws: string, @Param('jobId') jobId: string, @Body() dto: LinkExternalDto, @CurrentUser() user: { userId: string; role?: string }) {
    return { value: { job: await this.svc.linkExternal(ws, jobId, dto, user) } };
  }

  @Post('jobs/:jobId/cancel')
  async cancel(@WorkspaceId() ws: string, @Param('jobId') jobId: string, @CurrentUser() user: { userId: string; role?: string }) {
    return { value: { job: await this.svc.cancel(ws, jobId, user) } };
  }

  @Post('jobs/:jobId/retry')
  async retry(@WorkspaceId() ws: string, @Param('jobId') jobId: string, @CurrentUser() user: { userId: string; role?: string }) {
    return { value: { job: await this.svc.retry(ws, jobId, user) } };
  }
}
```

- [ ] **Step 4: 写 e2e 测试(本任务先写,Task 6 装配后才跑绿)**

Create `apps/api/test/orchestration.e2e-spec.ts`:

```typescript
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Orchestration (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  const auth = (r: request.Test, token: string) => r.set('Authorization', `Bearer ${token}`);

  it('dispatch creates pending job + task_dispatched audit', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'orc1@test.dev');
    const res = await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/orchestration/dispatch`)
      .send({ type: 'image', input: { prompt: 'cat' }, runtimeMode: 'desktop_multica', agentId: 'agent-1', providerKind: 'codex' }), accessToken).expect(201);
    expect(res.body.value.job.status).toBe('pending');
    expect(res.body.value.job.runtimeMode).toBe('desktop_multica');
    const audits = await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/audit-logs?action=task_dispatched`), accessToken).expect(200);
    expect(audits.body.value).toHaveLength(1);
    expect(audits.body.value[0].targetId).toBe(res.body.value.job.id);
  });

  it('link-external binds externalTaskId; terminal job rejected', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'orc2@test.dev');
    const job = (await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/orchestration/dispatch`)
      .send({ type: 'image', input: {}, runtimeMode: 'desktop_multica' }), accessToken).expect(201)).body.value.job;
    const linked = await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/orchestration/jobs/${job.id}/link-external`)
      .send({ externalTaskId: 'mt-1', externalRef: { issue: 'i1' } }), accessToken).expect(201);
    expect(linked.body.value.job.externalTaskId).toBe('mt-1');
  });

  it('cancel writes intent for non-terminal; rejects terminal', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'orc3@test.dev');
    const job = (await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/orchestration/dispatch`)
      .send({ type: 'image', input: {}, runtimeMode: 'desktop_multica' }), accessToken).expect(201)).body.value.job;
    await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/orchestration/jobs/${job.id}/cancel`), accessToken).expect(201);
    const audits = await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/audit-logs?action=task_cancelled`), accessToken).expect(200);
    expect(audits.body.value).toHaveLength(1);
    // 置终态后再 cancel → 400
    await prisma.generationJob.update({ where: { id: job.id }, data: { status: 'succeeded' } });
    const bad = await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/orchestration/jobs/${job.id}/cancel`), accessToken).expect(400);
    expect(bad.body.error.code).toBe('validation_error');
  });

  it('retry resets terminal job to pending and clears external*/progress/error', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'orc4@test.dev');
    const job = (await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/orchestration/dispatch`)
      .send({ type: 'image', input: {}, runtimeMode: 'desktop_multica' }), accessToken).expect(201)).body.value.job;
    await prisma.generationJob.update({ where: { id: job.id }, data: { status: 'failed', externalTaskId: 'mt-9', progress: 80, error: 'boom', finishedAt: new Date() } });
    const retried = await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/orchestration/jobs/${job.id}/retry`), accessToken).expect(201);
    expect(retried.body.value.job.status).toBe('pending');
    expect(retried.body.value.job.externalTaskId).toBeNull();
    expect(retried.body.value.job.progress).toBeNull();
    expect(retried.body.value.job.error).toBeNull();
    // 非终态 retry → 400
    const bad = await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/orchestration/jobs/${job.id}/retry`), accessToken).expect(400);
    expect(bad.body.error.code).toBe('validation_error');
  });

  it('non-member → 403, no token → 401', async () => {
    const a = await registerUser(app, 'orc5a@test.dev');
    const b = await registerUser(app, 'orc5b@test.dev');
    // B 访问 A 的 workspace → 403
    await auth(request(app.getHttpServer())
      .post(`/workspaces/${a.workspaceId}/orchestration/dispatch`)
      .send({ type: 'image', input: {}, runtimeMode: 'web' }), b.accessToken).expect(403);
    // 无 token → 401
    await request(app.getHttpServer())
      .post(`/workspaces/${a.workspaceId}/orchestration/dispatch`)
      .send({ type: 'image', input: {}, runtimeMode: 'web' }).expect(401);
  });
});
```

- [ ] **Step 5: tsc 检查(e2e 暂不可跑,等 Task 6 装配)**

Run(从仓库根):
```bash
cd apps/api && npx tsc --noEmit -p tsconfig.json
```
Expected: 无类型错误(controller/service/dto 自洽;CurrentUser/WorkspaceId 装饰器已存在)。

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/orchestration/dto.ts apps/api/src/orchestration/orchestration.service.ts apps/api/src/orchestration/orchestration.controller.ts apps/api/test/orchestration.e2e-spec.ts
git commit -m "feat(api): add orchestration dispatch/link/cancel/retry endpoints"
```

## Task 5: ReconciliationService(轮询对账 + 终态事务 + 幂等)

Q2=B 核心。`reconcileOnce()` 扫未终态 + 有 externalTaskId 的 job,查 MulticaServerClient,映射状态回写;终态时同一 `prisma.$transaction` 内拉产物入 Asset + 写 UsageEvent + 写 AuditLog。`@Interval` 调度,env 开关默认关。孤儿 pending 超时清理。

**Files:**
- Create: `apps/api/src/orchestration/reconciliation.service.ts`
- Test: `apps/api/test/reconciliation.e2e-spec.ts`(同 Task 4,装配在 Task 6;但本任务的 e2e 用 `overrideProvider` 注入 fake client,需 module 存在 → 见 Step 4 说明)

> 依赖顺序:reconciliation.e2e 需要 OrchestrationModule 提供 `MULTICA_SERVER_CLIENT` token 以便 `overrideProvider`。因此本任务**连同 Task 6 的 module 装配一起跑测试**。本任务步骤:写 service + 写测试 + tsc;e2e 跑绿在 Task 6 完成后。

- [ ] **Step 1: 写 ReconciliationService**

Create `apps/api/src/orchestration/reconciliation.service.ts`:

```typescript
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { MULTICA_SERVER_CLIENT, type MulticaServerClient } from './multica-server-client';

const ORPHAN_PENDING_TIMEOUT_MS = Number(process.env.ORCHESTRATION_ORPHAN_TIMEOUT_MS ?? 15 * 60 * 1000);

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() @Inject(MULTICA_SERVER_CLIENT) private client: MulticaServerClient | null,
  ) {}

  @Interval(Number(process.env.ORCHESTRATION_RECONCILE_INTERVAL_MS ?? 10000))
  async scheduled(): Promise<void> {
    if (process.env.ORCHESTRATION_RECONCILE_ENABLED !== 'true') return;
    try { await this.reconcileOnce(); }
    catch (e) { this.logger.warn(`reconcile tick failed: ${e instanceof Error ? e.message : e}`); }
  }

  async reconcileOnce(now: Date = new Date()): Promise<void> {
    // 孤儿 pending 清理:pending 且无 externalTaskId 且超时 → failed
    await this.prisma.generationJob.updateMany({
      where: { status: 'pending', externalTaskId: null, createdAt: { lt: new Date(now.getTime() - ORPHAN_PENDING_TIMEOUT_MS) } },
      data: { status: 'failed', error: 'dispatch not confirmed', finishedAt: now },
    });

    if (!this.client) return; // 降级:未配置 Multica server,对账 no-op

    const jobs = await this.prisma.generationJob.findMany({
      where: { status: { in: ['pending', 'running'] }, externalTaskId: { not: null } },
    });

    for (const job of jobs) {
      try { await this.reconcileJob(job, now); }
      catch (e) { this.logger.warn(`reconcile job ${job.id} failed: ${e instanceof Error ? e.message : e}`); }
    }
  }

  private async reconcileJob(job: { id: string; workspaceId: string; status: string; externalTaskId: string | null; providerKind: string | null; startedAt: Date | null }, now: Date): Promise<void> {
    const snap = await this.client!.getTask(job.externalTaskId!);

    if (snap.status === 'running') {
      await this.prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: 'running',
          progress: snap.progress ?? undefined,
          currentStep: snap.currentStep ?? undefined,
          startedAt: job.startedAt ?? now,
        },
      });
      return;
    }
    if (snap.status === 'pending') return; // 仍排队,无变化

    // 终态:succeeded / failed / cancelled
    await this.finalize(job, snap.status, now);
  }

  private async finalize(
    job: { id: string; workspaceId: string; externalTaskId: string | null; providerKind: string | null; startedAt: Date | null },
    terminal: 'succeeded' | 'failed' | 'cancelled',
    now: Date,
  ): Promise<void> {
    // 仅 succeeded 拉产物 + 写用量;failed/cancelled 只落终态
    const artifacts = terminal === 'succeeded' ? await this.client!.getArtifacts(job.externalTaskId!) : [];

    await this.prisma.$transaction(async (tx) => {
      // 幂等:事务内重新读,若已终态则短路(防并发/重复 tick)
      const fresh = await tx.generationJob.findUnique({ where: { id: job.id } });
      if (!fresh || ['succeeded', 'failed', 'cancelled'].includes(fresh.status)) return;

      await tx.generationJob.update({
        where: { id: job.id },
        data: { status: terminal, progress: terminal === 'succeeded' ? 100 : undefined, finishedAt: now, startedAt: fresh.startedAt ?? now },
      });

      if (terminal === 'succeeded') {
        for (const [idx, art] of artifacts.entries()) {
          // 产物去重键:(workspaceId, jobId, 产物标识)。无稳定 id 则用 externalTaskId+序号
          const externalArtifactId = String(art.id ?? `${job.externalTaskId}#${idx}`);
          const exists = await tx.asset.findFirst({
            where: { workspaceId: job.workspaceId, jobId: job.id, metadata: { path: ['externalArtifactId'], equals: externalArtifactId } },
          });
          if (exists) continue;
          await tx.asset.create({
            data: {
              workspaceId: job.workspaceId, jobId: job.id,
              kind: String(art.kind ?? 'output'), url: art.url ?? null,
              metadata: { externalArtifactId, source: 'multica' } as Prisma.InputJsonValue,
            },
          });
        }
        // 用量去重:该 job 已有 generation 类 UsageEvent 则跳过
        const usageExists = await tx.usageEvent.findFirst({ where: { workspaceId: job.workspaceId, jobId: job.id, category: 'generation' } });
        if (!usageExists) {
          const durationMs = job.startedAt ? Math.max(0, now.getTime() - job.startedAt.getTime()) : 0;
          await tx.usageEvent.create({
            data: {
              workspaceId: job.workspaceId, jobId: job.id, category: 'generation', credits: 0,
              metadata: { providerKind: job.providerKind ?? null, durationMs } as Prisma.InputJsonValue,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          workspaceId: job.workspaceId,
          action: terminal === 'succeeded' ? 'generation_job_complete' : terminal === 'failed' ? 'generation_job_failed' : 'task_cancelled',
          targetType: 'generation_job', targetId: job.id,
          metadata: { terminal, artifactCount: artifacts.length } as Prisma.InputJsonValue,
        },
      });

      if (terminal === 'succeeded' && artifacts.length > 0) {
        await tx.auditLog.create({
          data: {
            workspaceId: job.workspaceId, action: 'output_asset_imported',
            targetType: 'generation_job', targetId: job.id,
            metadata: { count: artifacts.length } as Prisma.InputJsonValue,
          },
        });
      }
    });
  }
}
```

- [ ] **Step 2: 写 e2e 测试(装配后跑,见 Task 6)**

Create `apps/api/test/reconciliation.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ValidationPipe } from '@nestjs/common';
import { resetDb, seedUserWithMember } from './helpers';
import { ReconciliationService } from '../src/orchestration/reconciliation.service';
import { MULTICA_SERVER_CLIENT, type MulticaServerClient, type MulticaTaskSnapshot, type MulticaArtifact } from '../src/orchestration/multica-server-client';

class FakeClient implements MulticaServerClient {
  constructor(public snap: MulticaTaskSnapshot, public artifacts: MulticaArtifact[] = []) {}
  async getTask(): Promise<MulticaTaskSnapshot> { return this.snap; }
  async getArtifacts(): Promise<MulticaArtifact[]> { return this.artifacts; }
}

describe('Reconciliation (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; let fake: FakeClient;

  beforeEach(async () => {
    fake = new FakeClient({ status: 'running', progress: 10, raw: {} });
    process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MULTICA_SERVER_CLIENT).useValue(fake).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await resetDb(prisma);
  });
  afterEach(async () => { await app.close(); });

  const seedJob = async (data: Partial<{ status: string; externalTaskId: string | null; providerKind: string; startedAt: Date }>) => {
    const { workspace } = await seedUserWithMember(prisma);
    const job = await prisma.generationJob.create({
      data: {
        workspaceId: workspace.id, type: 'image', input: {}, status: data.status ?? 'running',
        externalTaskId: data.externalTaskId ?? 'mt-1', providerKind: data.providerKind ?? 'codex',
        runtimeMode: 'desktop_multica', startedAt: data.startedAt ?? new Date(),
      },
    });
    return { workspaceId: workspace.id, job };
  };

  it('running snapshot updates progress/currentStep', async () => {
    const { job } = await seedJob({ status: 'pending' });
    fake.snap = { status: 'running', progress: 55, currentStep: 'running tests', raw: {} };
    await app.get(ReconciliationService).reconcileOnce();
    const after = await prisma.generationJob.findUnique({ where: { id: job.id } });
    expect(after!.status).toBe('running');
    expect(after!.progress).toBe(55);
    expect(after!.currentStep).toBe('running tests');
  });

  it('succeeded → terminal + Asset + UsageEvent + audits in one tx; idempotent on repeat', async () => {
    const { workspaceId, job } = await seedJob({ status: 'running' });
    fake.snap = { status: 'succeeded', progress: 100, raw: {} };
    fake.artifacts = [{ id: 'art-1', url: 'http://f/1', kind: 'image' }];
    const svc = app.get(ReconciliationService);
    await svc.reconcileOnce();
    await svc.reconcileOnce(); // 第二次必须幂等

    const after = await prisma.generationJob.findUnique({ where: { id: job.id } });
    expect(after!.status).toBe('succeeded');
    expect(after!.finishedAt).not.toBeNull();
    const assets = await prisma.asset.findMany({ where: { workspaceId, jobId: job.id } });
    expect(assets).toHaveLength(1);
    const usage = await prisma.usageEvent.findMany({ where: { workspaceId, jobId: job.id } });
    expect(usage).toHaveLength(1);
    const completeAudits = await prisma.auditLog.findMany({ where: { workspaceId, action: 'generation_job_complete' } });
    expect(completeAudits).toHaveLength(1);
  });

  it('Multica unreachable → job unchanged (no false failure)', async () => {
    const { job } = await seedJob({ status: 'running' });
    app.get(ReconciliationService); // service exists
    (fake as any).getTask = async () => { throw new Error('ECONNREFUSED'); };
    await app.get(ReconciliationService).reconcileOnce();
    const after = await prisma.generationJob.findUnique({ where: { id: job.id } });
    expect(after!.status).toBe('running'); // 未误判失败
  });

  it('orphan pending past timeout → failed', async () => {
    const { workspace } = await seedUserWithMember(prisma);
    const old = new Date(Date.now() - 20 * 60 * 1000);
    const job = await prisma.generationJob.create({
      data: { workspaceId: workspace.id, type: 'image', input: {}, status: 'pending', externalTaskId: null, runtimeMode: 'desktop_multica', createdAt: old },
    });
    await app.get(ReconciliationService).reconcileOnce();
    const after = await prisma.generationJob.findUnique({ where: { id: job.id } });
    expect(after!.status).toBe('failed');
    expect(after!.error).toBe('dispatch not confirmed');
  });

  it('cancel race: intent cancel but Multica reports succeeded → lands succeeded', async () => {
    const { job } = await seedJob({ status: 'running' });
    fake.snap = { status: 'succeeded', progress: 100, raw: {} };
    fake.artifacts = [];
    await app.get(ReconciliationService).reconcileOnce();
    const after = await prisma.generationJob.findUnique({ where: { id: job.id } });
    expect(after!.status).toBe('succeeded'); // 竞态:以 Multica 实际终态为准
  });
});
```

- [ ] **Step 3: tsc 检查**

Run(从仓库根):
```bash
cd apps/api && npx tsc --noEmit -p tsconfig.json
```
Expected: 无类型错误。

- [ ] **Step 4: Commit(e2e 在 Task 6 装配后才跑)**

```bash
git add apps/api/src/orchestration/reconciliation.service.ts apps/api/test/reconciliation.e2e-spec.ts
git commit -m "feat(api): add ReconciliationService with idempotent terminal tx"
```

## Task 6: 模块装配 + ScheduleModule + 跑绿 Task 4/5 的 e2e

把 OrchestrationModule 装到 AppModule,提供 `MULTICA_SERVER_CLIENT` 工厂(从 env 读,缺失则 null),引入 `ScheduleModule.forRoot()`。装配后 Task 4(orchestration)与 Task 5(reconciliation)的 e2e 才能跑。

**Files:**
- Create: `apps/api/src/orchestration/orchestration.module.ts`
- Modify: `apps/api/src/app.module.ts:1-24`
- Modify: `apps/api/package.json`(加 `@nestjs/schedule`)

- [ ] **Step 1: 安装 @nestjs/schedule**

Run(从仓库根):
```bash
cd apps/api && npm install @nestjs/schedule@^4
```
Expected: `@nestjs/schedule` 写入 package.json dependencies。

> 注:`@nestjs/schedule` peer-deps 含 `cron`,npm 会自动装。版本 ^4 对应 NestJS 10。

- [ ] **Step 2: 写 OrchestrationModule**

Create `apps/api/src/orchestration/orchestration.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { OrchestrationController } from './orchestration.controller';
import { OrchestrationService } from './orchestration.service';
import { ReconciliationService } from './reconciliation.service';
import { MULTICA_SERVER_CLIENT, createMulticaServerClient } from './multica-server-client';

@Module({
  controllers: [OrchestrationController],
  providers: [
    OrchestrationService,
    ReconciliationService,
    {
      provide: MULTICA_SERVER_CLIENT,
      useFactory: () => createMulticaServerClient({ apiUrl: process.env.MULTICA_API_URL, token: process.env.MULTICA_API_TOKEN }),
    },
  ],
})
export class OrchestrationModule {}
```

- [ ] **Step 3: 装到 AppModule + ScheduleModule**

把 `apps/api/src/app.module.ts` 整体替换为:

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { ProjectModule } from './project/project.module';
import { MemberModule } from './member/member.module';
import { GenerationJobModule } from './generation-job/generation-job.module';
import { AssetModule } from './asset/asset.module';
import { UsageEventModule } from './usage-event/usage-event.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { OrchestrationModule } from './orchestration/orchestration.module';
import { TenantGuard } from './common/tenant/tenant.guard';
import { AuthGuard } from './common/auth/auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule, AuthModule, WorkspaceModule, ProjectModule, MemberModule,
    GenerationJobModule, AssetModule, UsageEventModule, AuditLogModule, OrchestrationModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
```

- [ ] **Step 4: 跑 orchestration e2e(Task 4)**

Run(从仓库根):
```bash
cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test -- orchestration
```
Expected: Task 4 的 5 个用例全 PASS(dispatch/link/cancel/retry/权限)。

> 注:`ScheduleModule.forRoot()` 会注册 `@Interval` 定时器,但 `scheduled()` 方法体首行检查 `ORCHESTRATION_RECONCILE_ENABLED !== 'true'` 早退,测试环境不设此 env → 定时器空跑无副作用。

- [ ] **Step 5: 跑 reconciliation e2e(Task 5)**

Run(从仓库根):
```bash
cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test -- reconciliation
```
Expected: Task 5 的 6 个用例全 PASS(running 更新/succeeded 终态事务+幂等/不可达不误判/孤儿超时/竞态)。

- [ ] **Step 6: 跑全套后端确认无回归**

Run(从仓库根):
```bash
cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test
```
Expected: ①②③ 全绿(含 generation-job 扩展、multica-server-client、orchestration、reconciliation)。

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/orchestration/orchestration.module.ts apps/api/src/app.module.ts apps/api/package.json apps/api/package-lock.json
git commit -m "feat(api): wire OrchestrationModule + ScheduleModule"
```

## Task 7: 前后端契约对齐(status 枚举统一 queued→pending)

Q4=A:后端 GenerationJob canonical,前端对齐。前端 `AgentTaskStatus` 与 `GenerationJobStatus` 去掉 `queued`,统一用 `pending`;Multica 的 queued/dispatched/waiting 原始态在 mapper 边界一次性映射为 `pending`。

**Files:**
- Modify: `src/runtime/agentRuntimeTypes.ts:12-17`(AgentTaskStatus)
- Modify: `src/runtime/multicaMappers.ts:122-147`(mapMulticaTaskStatus + mapMulticaIssueToAgentTask)
- Modify: `src/runtime/webMockAgentRuntimeProvider.ts:107,143,167`(queued→pending)
- Modify: `src/lib/data/generationJobRepository.ts:7,59`(GenerationJobStatus + 默认)
- Modify: `src/components/GlobalAgentDispatcherModal.tsx:35`(mapRuntimeStatusToWorkspaceTask 的 `case 'queued'`)
- Test: `scripts/multica-mappers.test.ts`、`scripts/web-runtime-provider.test.ts`、`scripts/generation-job-repository-api.test.ts`、`scripts/saas-foundation.test.ts`(fixtures 改 queued→pending)

- [ ] **Step 1: 改测试 fixtures 期望(先让测试反映新契约)**

在以下 4 个测试脚本里,把所有字符串字面量 `'queued'` 替换为 `'pending'`(这些是断言/fixture 里的 task.status 期望值):
- `scripts/multica-mappers.test.ts`
- `scripts/web-runtime-provider.test.ts`
- `scripts/generation-job-repository-api.test.ts`
- `scripts/saas-foundation.test.ts`

逐个文件确认:用 `grep -n "queued" scripts/<file>` 定位,把 `status: 'queued'` 与 `=== 'queued'` 之类全改为 `'pending'`。

- [ ] **Step 2: 跑这些测试确认失败(实现尚未改)**

Run(从仓库根):
```bash
npm run test:multica-mappers
```
Expected: FAIL —— mapper 仍输出 `'queued'`,与新期望 `'pending'` 不符。

- [ ] **Step 3: AgentTaskStatus 去 queued 用 pending**

把 `src/runtime/agentRuntimeTypes.ts` 的 AgentTaskStatus(12-17 行)改为:

```typescript
export type AgentTaskStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled';
```

- [ ] **Step 4: mapper 映射到 pending**

把 `src/runtime/multicaMappers.ts` 的 `mapMulticaTaskStatus`(122-139 行)三处 `return 'queued'` 与 case 改为返回 `'pending'`:

```typescript
export function mapMulticaTaskStatus(status: string): AgentTaskStatus {
  switch (status) {
    case 'queued':
    case 'dispatched':
    case 'waiting_local_directory':
      return 'pending';
    case 'running':
      return 'running';
    case 'completed':
      return 'succeeded';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'failed';
  }
}
```

把 `mapMulticaIssueToAgentTask`(147 行)的 `status: 'queued'` 改为 `status: 'pending'`。

- [ ] **Step 5: webMock provider queued→pending**

在 `src/runtime/webMockAgentRuntimeProvider.ts`:
- 第 107 行 `task.status !== 'queued'` → `task.status !== 'pending'`
- 第 143 行 `status: 'queued'` → `status: 'pending'`
- 第 167 行的 message 文案 `'Mock task queued in Web SaaS mode.'` 保留(用户可见文案,非状态值)。

- [ ] **Step 6: generationJobRepository status 类型对齐**

在 `src/lib/data/generationJobRepository.ts`:
- 第 7 行:`export type GenerationJobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';`
- 第 59 行 `const status = job.status ?? 'queued';` → `const status = job.status ?? 'pending';`

- [ ] **Step 7: 跑契约相关测试 + lint 确认通过**

Run(从仓库根):
```bash
npm run test:multica-mappers && npm run test:web-runtime-provider && npm run test:generation-job-repo-api && npm run test:saas-foundation && npm run test:runtime-contract && npm run lint
```
Expected: 全 PASS,tsc 无错(`queued` 已从联合类型移除,无残留引用)。

> 若 lint 报某处仍用 `'queued'`:grep `src` 全量 `grep -rn "'queued'" src/` 清零(除 webMock 第 167 行文案)。

- [ ] **Step 8: Commit**

```bash
git add src/runtime/agentRuntimeTypes.ts src/runtime/multicaMappers.ts src/runtime/webMockAgentRuntimeProvider.ts src/lib/data/generationJobRepository.ts scripts/multica-mappers.test.ts scripts/web-runtime-provider.test.ts scripts/generation-job-repository-api.test.ts scripts/saas-foundation.test.ts
git commit -m "refactor(web): align task status enum to canonical (queued→pending)"
```

## Task 8: 前端 orchestrationService(派发逻辑下沉)

把现在漂在 `GlobalAgentDispatcherModal.tsx` 的 runtime↔repository 拼接逻辑下沉到非 UI 的 service。编排三步派发([1] POST dispatch 建 job → [2] provider createTask 拿 externalTaskId → [3] POST link-external 回绑),并封装 cancel/retry。注入式依赖(apiClient + provider)以便测试。

**Files:**
- Create: `src/runtime/orchestrationService.ts`
- Test: `scripts/orchestration-service.test.ts`
- Modify: `package.json`(加 `test:orchestration-service` 脚本)

> 本任务只交付 service + 测试。`GlobalAgentDispatcherModal.tsx` 改用此 service 是 UI 接线,属下一批 UI 工作(本批范围聚焦闭环逻辑);service 以可独立测试的纯逻辑单元交付。

- [ ] **Step 1: 写失败测试**

Create `scripts/orchestration-service.test.ts`:

```typescript
import assert from 'node:assert/strict';
import { createOrchestrationService } from '../src/runtime/orchestrationService.ts';
import type { ApiClient } from '../src/lib/data/apiClient.ts';

function fakeApi(): { client: ApiClient; calls: Array<{ method: string; path: string; body?: unknown }> } {
  const calls: Array<{ method: string; path: string; body?: unknown }> = [];
  const client: ApiClient = {
    configured: true,
    get: async () => ({ ok: true, value: null }),
    post: async (_ws, path, body) => {
      calls.push({ method: 'POST', path, body });
      if (path.endsWith('/dispatch')) return { ok: true, value: { job: { id: 'job-1', status: 'pending' } } } as any;
      return { ok: true, value: { job: { id: 'job-1' } } } as any;
    },
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  };
  return { client, calls };
}

async function run() {
  // dispatch 三步顺序:POST dispatch → provider.createTask → POST link-external
  const { client, calls } = fakeApi();
  const providerCalls: string[] = [];
  const provider = {
    createTask: async (input: { title: string; description: string; agentId?: string }) => {
      providerCalls.push('createTask');
      return { id: 'multica-task-mt1', title: input.title, status: 'pending', source: 'multica',
        externalRef: { system: 'multica', taskId: 'mt1' }, createdAt: '', updatedAt: '' };
    },
    cancelTask: async (taskId: string) => { providerCalls.push(`cancelTask:${taskId}`); },
  };
  const svc = createOrchestrationService({ apiClient: client, workspaceId: 'ws1', getProvider: () => provider as any });

  const result = await svc.dispatchTask({ type: 'image', input: { prompt: 'cat' }, runtimeMode: 'desktop_multica', agentId: 'agent-1', providerKind: 'codex', title: 'Make a cat', description: 'desc' });
  assert.equal(result.jobId, 'job-1');
  assert.equal(result.externalTaskId, 'mt1');
  assert.deepEqual(calls.map((c) => c.path), ['orchestration/dispatch', 'orchestration/jobs/job-1/link-external']);
  assert.deepEqual(providerCalls, ['createTask']);
  // dispatch body 带 canonical 字段
  assert.equal((calls[0].body as any).runtimeMode, 'desktop_multica');
  assert.equal((calls[1].body as any).externalTaskId, 'mt1');

  // cancel:先 provider.cancelTask 再 POST cancel
  const { client: c2, calls: calls2 } = fakeApi();
  const provider2 = { createTask: provider.createTask, cancelTask: async (id: string) => { providerCalls.push(`cancelTask:${id}`); } };
  const svc2 = createOrchestrationService({ apiClient: c2, workspaceId: 'ws1', getProvider: () => provider2 as any });
  await svc2.cancelTask('job-9', 'multica-task-mt9');
  assert.ok(providerCalls.includes('cancelTask:multica-task-mt9'));
  assert.deepEqual(calls2.map((c) => c.path), ['orchestration/jobs/job-9/cancel']);

  // retry:仅 POST retry(不调 provider,重新开跑由 UI 触发新 dispatch 流)
  const { client: c3, calls: calls3 } = fakeApi();
  const svc3 = createOrchestrationService({ apiClient: c3, workspaceId: 'ws1', getProvider: () => provider2 as any });
  await svc3.retryTask('job-7');
  assert.deepEqual(calls3.map((c) => c.path), ['orchestration/jobs/job-7/retry']);

  console.log('orchestration service passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: 加 test 脚本 + 跑确认失败**

在 `package.json` scripts 加一行(放 `test:audit-log-repo-api` 后):
```json
    "test:orchestration-service": "tsx scripts/orchestration-service.test.ts"
```

Run(从仓库根):
```bash
npm run test:orchestration-service
```
Expected: FAIL —— Cannot find module '../src/runtime/orchestrationService.ts'。

- [ ] **Step 3: 实现 orchestrationService**

Create `src/runtime/orchestrationService.ts`:

```typescript
import type { ApiClient } from '../lib/data/apiClient.ts';
import type { AgentRuntimeProvider } from './agentRuntimeTypes.ts';

export interface DispatchTaskInput {
  type: string;
  input: Record<string, unknown>;
  runtimeMode: string;
  title: string;
  description: string;
  projectId?: string;
  agentId?: string;
  providerKind?: string;
}

export interface DispatchTaskResult {
  jobId: string;
  externalTaskId?: string;
}

export interface OrchestrationServiceOptions {
  apiClient: ApiClient;
  workspaceId: string;
  getProvider: () => Pick<AgentRuntimeProvider, 'createTask' | 'cancelTask'>;
}

export interface OrchestrationService {
  dispatchTask(input: DispatchTaskInput): Promise<DispatchTaskResult>;
  cancelTask(jobId: string, externalTaskId?: string): Promise<void>;
  retryTask(jobId: string): Promise<void>;
}

function extractExternalTaskId(task: { externalRef?: { taskId?: string; issueId?: string } }): string | undefined {
  return task.externalRef?.taskId ?? task.externalRef?.issueId;
}

export function createOrchestrationService(options: OrchestrationServiceOptions): OrchestrationService {
  const { apiClient, workspaceId, getProvider } = options;

  return {
    async dispatchTask(input) {
      // [1] 后端登记 canonical job(真相源)
      const dispatched = await apiClient.post<{ job: { id: string } }>(workspaceId, 'orchestration/dispatch', {
        type: input.type, input: input.input, runtimeMode: input.runtimeMode,
        projectId: input.projectId, agentId: input.agentId, providerKind: input.providerKind,
      });
      if (!dispatched.ok || !dispatched.value) throw new Error('dispatch failed');
      const jobId = dispatched.value.job.id;

      // [2] 前端 provider 直连开跑,拿 Multica externalTaskId
      const task = await getProvider().createTask({
        title: input.title, description: input.description, agentId: input.agentId,
      });
      const externalTaskId = extractExternalTaskId(task);

      // [3] 回绑后端(对账前提)
      if (externalTaskId) {
        await apiClient.post(workspaceId, `orchestration/jobs/${jobId}/link-external`, { externalTaskId });
      }
      return { jobId, externalTaskId };
    },

    async cancelTask(jobId, externalTaskId) {
      // 先前端直连取消本地执行,再写后端意图
      if (externalTaskId) {
        try { await getProvider().cancelTask(externalTaskId); } catch { /* 直连取消失败不阻塞后端意图 */ }
      }
      await apiClient.post(workspaceId, `orchestration/jobs/${jobId}/cancel`, {});
    },

    async retryTask(jobId) {
      // 后端重置 pending;重新开跑由 UI 触发新一轮 dispatchTask
      await apiClient.post(workspaceId, `orchestration/jobs/${jobId}/retry`, {});
    },
  };
}
```

- [ ] **Step 4: 跑测试 + lint 确认通过**

Run(从仓库根):
```bash
npm run test:orchestration-service && npm run lint
```
Expected: `orchestration service passed`,tsc 无错。

- [ ] **Step 5: Commit**

```bash
git add src/runtime/orchestrationService.ts scripts/orchestration-service.test.ts package.json
git commit -m "feat(web): add orchestrationService for dispatch/cancel/retry"
```

## Task 9: provider 补真实 WS + listTasks 走后端

兑现实时 UX。`multicaAgentRuntimeProvider`:`subscribeToTask` 接真实 WS(`multicaWsUrl`),进度/日志事件回调 UI;`listTasks` 改从后端 GenerationJob 读(后端真相源),不再从 Multica 直接列。即:列任务走后端,看单任务实时进度走直连 WS。

**Files:**
- Modify: `src/runtime/multicaAgentRuntimeProvider.ts:25-30`(options 加 wsFactory + listJobs 注入)、`162-165`(listTasks)、`219-224`(subscribeToTask)
- Test: `scripts/multica-runtime-provider.test.ts`(已有,扩展:WS 契约 + listTasks 走后端)
- Test: `package.json` 已有 `test:multica-runtime-provider`

- [ ] **Step 1: 写失败测试(扩展现有)**

在 `scripts/multica-runtime-provider.test.ts` 末尾(`run()` 调用前)追加两个断言块。先用 `grep -n "async function run\|\.catch" scripts/multica-runtime-provider.test.ts` 定位 run 体与结尾,在 `console.log` 成功打印前插入:

```typescript
  // listTasks 走后端注入的 listJobs(不再返回 [])
  {
    const backendTasks = [{ id: 'job-1', title: 'T1', status: 'running', source: 'multica', createdAt: '', updatedAt: '' }];
    const provider = createMulticaAgentRuntimeProvider({
      mode: 'desktop_multica',
      env: { multicaApiUrl: 'http://m', multicaWsUrl: 'ws://m/ws' },
      apiClient: { listAgents: async () => [], listRuntimes: async () => [], createIssue: async () => ({ id: 'i1' }), cancelTask: async () => {} } as any,
      listJobs: async () => backendTasks as any,
    });
    const tasks = await provider.listTasks();
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].id, 'job-1');
  }

  // subscribeToTask 连真实 WS:收到 message 转 AgentTaskEvent 回调
  {
    const events: any[] = [];
    let onMessage: ((e: { data: string }) => void) | null = null;
    const fakeWs = { addEventListener: (t: string, cb: any) => { if (t === 'message') onMessage = cb; }, close() {} };
    const provider = createMulticaAgentRuntimeProvider({
      mode: 'desktop_multica',
      env: { multicaApiUrl: 'http://m', multicaWsUrl: 'ws://m/ws' },
      apiClient: { listAgents: async () => [], listRuntimes: async () => [], createIssue: async () => ({ id: 'i1' }), cancelTask: async () => {} } as any,
      wsFactory: (url: string) => { assert.ok(url.includes('mt1')); return fakeWs as any; },
    });
    const unsub = provider.subscribeToTask('multica-task-mt1', (e) => events.push(e));
    onMessage!({ data: JSON.stringify({ status: 'running', progress: 30, message: 'step' }) });
    assert.equal(events.length, 1);
    assert.equal(events[0].status, 'running');
    assert.equal(events[0].progress, 30);
    unsub();
  }
```

- [ ] **Step 2: 跑测试确认失败**

Run(从仓库根):
```bash
npm run test:multica-runtime-provider
```
Expected: FAIL —— `listTasks` 当前返回 `[]`(长度 0 ≠ 1);options 无 `wsFactory`/`listJobs` 字段,tsc 报错或断言失败。

- [ ] **Step 3: options 加 wsFactory + listJobs**

把 `src/runtime/multicaAgentRuntimeProvider.ts` 的 `MulticaRuntimeProviderOptions`(25-30 行)改为:

```typescript
export interface MulticaRuntimeProviderOptions {
  mode: Exclude<RuntimeMode, 'web'>;
  env: RuntimeEnvironment;
  bridge?: DesktopAgentBridge | null;
  apiClient?: MulticaApiClient;
  // ③: 列任务走后端真相源(注入,默认空)
  listJobs?: () => Promise<AgentTask[]>;
  // ③: 实时进度走直连 WS(注入工厂便于测试,默认用全局 WebSocket)
  wsFactory?: (url: string) => { addEventListener: (type: string, cb: (e: { data: string }) => void) => void; close: () => void };
}
```

- [ ] **Step 4: listTasks 走后端**

把 `listTasks`(162-165 行)改为:

```typescript
    async listTasks(_params?: TaskQuery): Promise<AgentTask[]> {
      // 列任务从后端 GenerationJob 真相源读(注入);未注入则空
      return options.listJobs ? options.listJobs() : [];
    },
```

- [ ] **Step 5: subscribeToTask 接真实 WS**

把 `subscribeToTask`(219-224 行)改为:

```typescript
    subscribeToTask(taskId: string, cb: (event: AgentTaskEvent) => void): Unsubscribe {
      const listeners = taskListeners.get(taskId) ?? new Set<(event: AgentTaskEvent) => void>();
      listeners.add(cb);
      taskListeners.set(taskId, listeners);

      // 接真实 WS:有 wsUrl 时连直连流,逐行回调
      let socket: { close: () => void } | null = null;
      const wsBase = options.env.multicaWsUrl;
      if (wsBase) {
        const rawId = taskId.replace(/^multica-task-/, '');
        const url = `${wsBase.replace(/\/+$/, '')}/tasks/${encodeURIComponent(rawId)}`;
        const factory = options.wsFactory ?? ((u: string) => new WebSocket(u) as unknown as { addEventListener: (t: string, c: (e: { data: string }) => void) => void; close: () => void });
        try {
          const ws = factory(url);
          ws.addEventListener('message', (e: { data: string }) => {
            try {
              const payload = JSON.parse(e.data) as { status?: string; progress?: number; message?: string };
              cb({
                taskId,
                status: (payload.status as AgentTaskEvent['status']) ?? 'running',
                progress: payload.progress,
                message: payload.message,
                occurredAt: new Date().toISOString(),
              });
            } catch { /* 忽略坏帧 */ }
          });
          socket = ws;
        } catch { /* WS 不可用降级为仅本地回调 */ }
      }

      return () => {
        listeners.delete(cb);
        socket?.close();
      };
    },
```

- [ ] **Step 6: 跑测试 + lint 确认通过**

Run(从仓库根):
```bash
npm run test:multica-runtime-provider && npm run lint
```
Expected: PASS,tsc 无错。

- [ ] **Step 7: Commit**

```bash
git add src/runtime/multicaAgentRuntimeProvider.ts scripts/multica-runtime-provider.test.ts
git commit -m "feat(web): provider real WS streaming + listTasks from backend"
```

## Task 10: Dispatcher Modal 接线 orchestrationService + 本地执行披露(最小版)

把 `GlobalAgentDispatcherModal` 的派发改为经后端编排闭环:用 `orchestrationService.dispatchTask`(后端建 job → provider 开跑 → 回绑 externalTaskId),并在 desktop_multica 模式下加"本地执行披露"勾选(派发前必须确认),scope 显示运行时模式。保留既有的额度校验、workspaceTask 镜像、审计与实时订阅。

> 范围:这是真实接线,使后端 GenerationJob 成为派发真相源。最小披露 = 一个确认勾选 + runtime 模式文案,desktop_multica 下未勾选则禁用"开始调度"。不重写 modal 的额度/审计逻辑。

**Files:**
- Modify: `src/components/GlobalAgentDispatcherModal.tsx`(引入 service、加披露 state、改 createTask 调用点)
- Test: 复用 `npm run lint` + `npm run build`(modal 无独立单测;逻辑层已由 Task 8 service 测试覆盖)

- [ ] **Step 1: 引入 orchestrationService + apiClient**

在 `src/components/GlobalAgentDispatcherModal.tsx` import 区(第 17-22 行附近)加:

```typescript
import { apiClient } from '../lib/data/apiClient';
import { createOrchestrationService } from '../runtime/orchestrationService';
```

- [ ] **Step 2: 加披露 state + 是否需要披露的判断**

在组件 state 区(第 58 行 `runtimeError` 后)加:

```typescript
  const [localExecAcknowledged, setLocalExecAcknowledged] = useState(false);
  const requiresLocalExecDisclosure = runtime.mode === 'desktop_multica';
```

并在关闭重置块(第 62-68 行)里追加重置:把 `setIsDispatching(false);` 后加一行 `setLocalExecAcknowledged(false);`

- [ ] **Step 3: 用 service 替换裸 createTask 调用**

在 `startDispatch` 的 `Promise.all` 回调里,把第 174-180 行的 `const task = await runtime.createTask({...})` 替换为经 service 派发(后端建 job + 回绑),再保留拿到的 `task` 供下游镜像逻辑使用:

```typescript
          const orchestration = createOrchestrationService({
            apiClient,
            workspaceId: session.workspace.id,
            getProvider: () => runtime,
          });
          // 先经后端编排建 canonical job 并开跑(若后端未配置则 service 内部 dispatch 失败,降级走原直连)
          let backendJobId: string | undefined;
          const task = await runtime.createTask({
            title: taskInput.trim().slice(0, 80),
            description: taskInput.trim(),
            agentId: id,
            priority: 'medium',
            metadata: { source: 'global_agent_dispatcher' },
          });
          if (apiClient.configured) {
            try {
              const dispatched = await orchestration.dispatchTask({
                type: 'agent_dispatch',
                input: { prompt: taskInput.trim() },
                runtimeMode: runtime.mode,
                title: task.title,
                description: task.description ?? taskInput.trim(),
                agentId: id,
                providerKind: task.source,
              });
              backendJobId = dispatched.jobId;
            } catch (e) {
              console.error('backend orchestration dispatch failed; continuing with local mirror', e);
            }
          }
```

> 说明:此处 `runtime.createTask` 仍直接调一次以拿到 provider 的 `task`(下游 workspaceTask/审计镜像依赖它)。后端 dispatch 额外建立 canonical job 真相源。两者通过 `backendJobId` 记录在 metadata 关联。**这是有意的过渡接线**:既不推翻 modal 既有本地镜像,又让后端成为真相源。

- [ ] **Step 4: 把 backendJobId 写进 generationJob/workspaceTask metadata**

在第 190-194 行 `createGenerationJob` 的 `metadata` 对象里加一行 `backendJobId,`(放 `externalRef: task.externalRef,` 后)。同样在第 213-217 行 `createWorkspaceTask` 的 `metadata` 里加 `backendJobId,`。

- [ ] **Step 5: 加披露勾选 UI + 禁用逻辑**

在派发按钮前(第 447 行 `<div className="pt-6 border-t...">` 内、`runtimeError` 块之前)插入披露块:

```tsx
          {requiresLocalExecDisclosure && (
            <label className="mb-3 flex items-start gap-2 text-xs font-medium text-[var(--text-muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={localExecAcknowledged}
                onChange={(e) => setLocalExecAcknowledged(e.target.checked)}
                disabled={isDispatching}
                className="mt-0.5"
              />
              <span>
                本地执行模式（{runtime.mode}）：任务将在你的桌面 Multica 运行时执行，产物与日志通过后端对账回传。勾选即确认知悉。
              </span>
            </label>
          )}
```

把派发按钮的 `disabled`(第 455 行)与className条件(第 457 行)里的条件追加 `|| (requiresLocalExecDisclosure && !localExecAcknowledged)`:

```tsx
            disabled={isDispatching || selectedAgents.length === 0 || !taskInput.trim() || !canDispatch || (requiresLocalExecDisclosure && !localExecAcknowledged)}
```
className 三元的判断条件同样加该子句(保持禁用态样式一致)。

- [ ] **Step 6: lint + build 确认通过**

Run(从仓库根):
```bash
npm run lint && npm run build
```
Expected: tsc 无错(import 解析、service 签名匹配、披露 state 类型正确),Vite 构建通过。

> 手动验证(可选):`npm run dev`,desktop_multica 模式下打开调度器 → 未勾选披露时"开始调度"禁用 → 勾选后可派发 → 网络面板可见 `POST /workspaces/:id/orchestration/dispatch` 与 `.../link-external`。

- [ ] **Step 7: Commit**

```bash
git add src/components/GlobalAgentDispatcherModal.tsx
git commit -m "feat(web): dispatcher uses orchestrationService + local-exec disclosure"
```

## 最终验收线(全过即③本批完成)

- [ ] **Step 1: 后端全套**

Run(从仓库根):
```bash
cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test
```
Expected: ①②③ 全绿(orchestration / reconciliation / multica-server-client / generation-job 扩展状态机 + ①②既有)。

- [ ] **Step 2: 前端编排相关脚本**

Run(从仓库根):
```bash
npm run test:orchestration-service && npm run test:multica-runtime-provider && npm run test:multica-mappers && npm run test:runtime-contract && npm run test:generation-job-repo-api && npm run test:web-runtime-provider && npm run test:saas-foundation
```
Expected: 全 PASS。

- [ ] **Step 3: lint + build**

Run(从仓库根):
```bash
npm run lint && npm run build
```
Expected: tsc 无错,Vite 构建通过。

- [ ] **Step 4: P0 套件无回归**

Run(从仓库根):
```bash
npm run test:p0-specialized
```
Expected: 全 PASS(契约对齐未破坏既有运行时套件)。

> 不实跑 Multica 说明:对账/直连的真实 Multica 端到端联调作为发布前手动验证(self-hosted Multica smoke),不进自动化套件——与①②"真实 DB 但外部依赖 fixture"一致。
