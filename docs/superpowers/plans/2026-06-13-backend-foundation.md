# 后端地基 + 数据契约 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 monorepo 的 `apps/api/` 建立 NestJS + Postgres + Prisma 后端,规范化第一批 6 个核心域并暴露 RESTful 资源端点,服务端强制多租户隔离,并把前端对应 6 个仓储迁移到真实 API(保留 localStorage 回退)。

**Architecture:** 经典 NestJS 分层(每域 module/controller/service/dto)+ 全局 TenantGuard 单点强制租户隔离;Prisma 关系模型沿证据链外键串联;前端新增 apiClient 作唯一 HTTP 出口,6 个仓储改写为资源 API 客户端,函数签名不变。

**Tech Stack:** NestJS 10、Prisma 5、PostgreSQL、Jest + supertest(后端);tsx + node:assert(前端,沿用现有风格)。

**Spec:** `docs/superpowers/specs/2026-06-13-backend-foundation-design.md`

**Schema 调和说明:** 本计划的 Prisma 列在 spec 基础上**扩充为前端仓储实际读写的字段**(如 Project 的 `type/linkedAssetIds/coverImageUrl/favorite`、AuditLog 的 `actor/action/moduleId/targetType/timestamp`),其余自由字段进 `metadata` jsonb。目的:迁移不丢数据、前端函数签名不变。

---

## 阶段与文件结构

**Phase 0** — monorepo 脚手架与 Prisma schema
**Phase 1** — 后端 6 个域(TDD,逐域)
**Phase 2** — 前端 apiClient + 6 仓储迁移

```
apps/api/
├── package.json  tsconfig.json  nest-cli.json  .env.example
├── prisma/schema.prisma
├── test/                         # supertest e2e + 租户隔离
└── src/
    ├── main.ts  app.module.ts
    ├── common/prisma/{prisma.module.ts,prisma.service.ts}
    ├── common/tenant/{tenant.guard.ts,workspace-id.decorator.ts,public.decorator.ts}
    ├── common/filters/all-exceptions.filter.ts
    ├── common/errors.ts           # ErrorCode 词表(前后端共享语义)
    ├── workspace/  member/  project/  generation-job/  asset/
    │   usage-event/  audit-log/    # 每域: *.module/*.controller/*.service/dto/*
src/lib/data/
├── apiClient.ts                   # 新增
└── {project,asset,generationJob,usage,auditLog,workspaceMember}Repository.ts  # 改写
```

## Phase 0 — Monorepo 脚手架与 Prisma schema

### Task 0.1: 初始化 apps/api NestJS 工程

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/nest-cli.json`, `apps/api/.gitignore`
- Create: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`

- [ ] **Step 1: 创建 apps/api 目录与基础工程文件**

`apps/api/package.json`:
```json
{
  "name": "@aistudio/api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "test": "jest --config ./test/jest-e2e.json --runInBand"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/platform-express": "^10.4.0",
    "@prisma/client": "^5.22.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.0",
    "@nestjs/testing": "^10.4.0",
    "@types/jest": "^29.5.12",
    "@types/node": "^22.14.0",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "prisma": "^5.22.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "ts-loader": "^9.5.1",
    "typescript": "~5.8.2"
  }
}
```

`apps/api/tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

`apps/api/nest-cli.json`:
```json
{ "$schema": "https://json.schemastore.org/nest-cli", "collection": "@nestjs/schematics", "sourceRoot": "src" }
```

`apps/api/.gitignore`:
```
node_modules
dist
.env
```

- [ ] **Step 2: 创建 app.module.ts 与 main.ts**

`apps/api/src/app.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module';
import { TenantGuard } from './common/tenant/tenant.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
```

`apps/api/src/main.ts`:
```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors();
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
```

> 注:此时引用了尚未创建的 PrismaModule/TenantGuard/AllExceptionsFilter,它们在 Task 0.3、1.0 创建。本 task 不要求能编译通过,只落地工程结构。

- [ ] **Step 3: 安装依赖**

Run: `cd apps/api && npm install`
Expected: 依赖安装成功,生成 `apps/api/node_modules`。

- [ ] **Step 4: Commit**

```bash
git add apps/api/package.json apps/api/tsconfig.json apps/api/nest-cli.json apps/api/.gitignore apps/api/src/main.ts apps/api/src/app.module.ts
git commit -m "chore(api): scaffold NestJS app under apps/api"
```

### Task 0.2: Prisma schema 与首次迁移

**Files:**
- Create: `apps/api/prisma/schema.prisma`, `apps/api/.env.example`

- [ ] **Step 1: 写 schema.prisma(扩充列对齐前端字段)**

`apps/api/prisma/schema.prisma`:
```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model Workspace {
  id        String   @id @default(cuid())
  name      String
  slug      String?
  plan      String   @default("free")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  members        Member[]
  projects       Project[]
  assets         Asset[]
  generationJobs GenerationJob[]
  usageEvents    UsageEvent[]
  auditLogs      AuditLog[]
}

model Member {
  id          String   @id @default(cuid())
  workspaceId String
  userId      String
  role        String
  name        String?
  email       String?
  createdAt   DateTime @default(now())
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@unique([workspaceId, userId])
  @@index([workspaceId])
}

model Project {
  id             String   @id @default(cuid())
  workspaceId    String
  userId         String?
  name           String
  type           String   @default("general")
  status         String   @default("active")
  linkedAssetIds String[] @default([])
  coverImageUrl  String?
  favorite       Boolean  @default(false)
  metadata       Json?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  workspace      Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  assets         Asset[]
  @@index([workspaceId, status])
}

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
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  assets      Asset[]
  usageEvents UsageEvent[]
  @@index([workspaceId, status])
}

model Asset {
  id          String   @id @default(cuid())
  workspaceId String
  projectId   String?
  jobId       String?
  kind        String
  url         String?
  metadata    Json?
  createdAt   DateTime @default(now())
  workspace   Workspace      @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  project     Project?       @relation(fields: [projectId], references: [id], onDelete: SetNull)
  job         GenerationJob? @relation(fields: [jobId], references: [id], onDelete: SetNull)
  @@index([workspaceId, kind])
}

model UsageEvent {
  id          String   @id @default(cuid())
  workspaceId String
  jobId       String?
  userId      String?
  category    String
  credits     Int      @default(0)
  metadata    Json?
  createdAt   DateTime @default(now())
  workspace   Workspace      @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  job         GenerationJob? @relation(fields: [jobId], references: [id], onDelete: SetNull)
  @@index([workspaceId, createdAt])
}

model AuditLog {
  id          String   @id @default(cuid())
  workspaceId String
  userId      String?
  actorName   String?
  actorRole   String?
  action      String
  moduleId    String?
  targetType  String?
  targetId    String?
  metadata    Json?
  createdAt   DateTime @default(now())
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, createdAt])
}
```

`apps/api/.env.example`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aistudio?schema=public"
DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5432/aistudio_test?schema=public"
PORT=4000
```

- [ ] **Step 2: 生成 client 并跑首次迁移**

Run: `cd apps/api && cp .env.example .env && npx prisma migrate dev --name init`
Expected: 创建 `prisma/migrations/*_init/`,7 张表建好,`@prisma/client` 生成成功。

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma apps/api/.env.example
git commit -m "feat(api): add Prisma schema and initial migration for 6 core domains"
```

### Task 0.3: PrismaService + 错误词表 + 异常过滤器

**Files:**
- Create: `apps/api/src/common/prisma/prisma.service.ts`, `apps/api/src/common/prisma/prisma.module.ts`
- Create: `apps/api/src/common/errors.ts`
- Create: `apps/api/src/common/filters/all-exceptions.filter.ts`

- [ ] **Step 1: PrismaService 与 Module**

`apps/api/src/common/prisma/prisma.service.ts`:
```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() { await this.$connect(); }
}
```

`apps/api/src/common/prisma/prisma.module.ts`:
```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
```

- [ ] **Step 2: 错误词表**

`apps/api/src/common/errors.ts`:
```ts
export type ErrorCode =
  | 'backend_unconfigured' | 'network_error' | 'permission_denied'
  | 'parse_error' | 'validation_error' | 'not_found' | 'conflict' | 'unknown_error';

export class DomainError extends Error {
  constructor(public code: ErrorCode, message: string, public status: number) { super(message); }
}
export const notFound = (m = 'Resource not found') => new DomainError('not_found', m, 404);
export const validationError = (m: string) => new DomainError('validation_error', m, 400);
export const conflict = (m: string) => new DomainError('conflict', m, 409);
```

- [ ] **Step 3: 全局异常过滤器**

`apps/api/src/common/filters/all-exceptions.filter.ts`:
```ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DomainError, ErrorCode } from '../errors';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private logger = new Logger('Exception');
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    let status = 500; let code: ErrorCode = 'unknown_error'; let message = 'Internal server error';

    if (exception instanceof DomainError) {
      status = exception.status; code = exception.code; message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse() as any;
      message = Array.isArray(r?.message) ? r.message.join('; ') : (r?.message ?? exception.message);
      code = status === 400 ? 'validation_error' : status === 401 || status === 403 ? 'permission_denied'
           : status === 404 ? 'not_found' : status === 409 ? 'conflict' : 'unknown_error';
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') { status = 404; code = 'not_found'; message = 'Resource not found'; }
      else if (exception.code === 'P2002') { status = 409; code = 'conflict'; message = 'Resource already exists'; }
    }

    if (status >= 500) this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(status).json({ error: { code, message } });
  }
}
```

- [ ] **Step 4: 编译验证**

Run: `cd apps/api && npx tsc --noEmit`
Expected: 仅剩"找不到 TenantGuard"类错误(下一 task 创建);本 task 新建文件本身无类型错误。

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/prisma apps/api/src/common/errors.ts apps/api/src/common/filters
git commit -m "feat(api): add PrismaService, error vocabulary, global exception filter"
```

## Phase 1 — 租户基础设施 + 6 个域

### Task 1.0: TenantGuard + 装饰器 + 测试基座

**Files:**
- Create: `apps/api/src/common/tenant/public.decorator.ts`, `workspace-id.decorator.ts`, `tenant.guard.ts`
- Create: `apps/api/test/jest-e2e.json`, `apps/api/test/helpers.ts`

- [ ] **Step 1: 装饰器**

`apps/api/src/common/tenant/public.decorator.ts`:
```ts
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);
```

`apps/api/src/common/tenant/workspace-id.decorator.ts`:
```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const WorkspaceId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  return ctx.switchToHttp().getRequest().workspaceId;
});
```

- [ ] **Step 2: TenantGuard**

`apps/api/src/common/tenant/tenant.guard.ts`:
```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC } from './public.decorator';
import { notFound } from '../errors';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    const req = ctx.switchToHttp().getRequest();
    const workspaceId = req.params?.workspaceId;
    if (!workspaceId) return true; // 非 workspace 范围路由（如 POST /workspaces 已标 @Public）
    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws) throw notFound('Workspace not found');
    req.workspaceId = workspaceId; // 注入已校验值
    // ②认证落地后：在此校验 Member(workspaceId, req.userId) 是否存在，否则抛 permission_denied
    return true;
  }
}
```

- [ ] **Step 3: 测试配置与 helper**

`apps/api/test/jest-e2e.json`:
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "..",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "testEnvironment": "node"
}
```

`apps/api/test/helpers.ts`:
```ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

export async function bootstrapTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma };
}

export async function resetDb(prisma: PrismaService) {
  // 子表先删，再删 Workspace（外键顺序）
  await prisma.auditLog.deleteMany();
  await prisma.usageEvent.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.generationJob.deleteMany();
  await prisma.project.deleteMany();
  await prisma.member.deleteMany();
  await prisma.workspace.deleteMany();
}

export async function seedWorkspace(prisma: PrismaService, name = 'WS') {
  return prisma.workspace.create({ data: { name } });
}
```

> 测试库隔离机制(开放问题 3)定为:每个 e2e 文件 `beforeEach(resetDb)` + 共用 `DATABASE_URL_TEST`,`--runInBand` 串行避免库竞争。

- [ ] **Step 4: 编译验证**

Run: `cd apps/api && npx tsc --noEmit`
Expected: PASS(app.module 引用的三者现已齐全)。

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/tenant apps/api/test/jest-e2e.json apps/api/test/helpers.ts
git commit -m "feat(api): add TenantGuard, workspace decorators, e2e test harness"
```

### Task 1.1: Workspace 域(含租户隔离基础端点)

**Files:**
- Create: `apps/api/src/workspace/{workspace.module.ts,workspace.controller.ts,workspace.service.ts,dto.ts}`
- Test: `apps/api/test/workspace.e2e-spec.ts`

- [ ] **Step 1: 写失败测试**

`apps/api/test/workspace.e2e-spec.ts`:
```ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Workspace (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('POST /workspaces creates a workspace (public)', async () => {
    const res = await request(app.getHttpServer()).post('/workspaces').send({ name: 'Acme' }).expect(201);
    expect(res.body.value.id).toBeDefined();
    expect(res.body.value.name).toBe('Acme');
    expect(res.body.value.plan).toBe('free');
  });

  it('GET /workspaces/:id returns it; unknown id → 404 not_found', async () => {
    const ws = await prisma.workspace.create({ data: { name: 'Acme' } });
    const ok = await request(app.getHttpServer()).get(`/workspaces/${ws.id}`).expect(200);
    expect(ok.body.value.id).toBe(ws.id);
    const miss = await request(app.getHttpServer()).get('/workspaces/nope').expect(404);
    expect(miss.body.error.code).toBe('not_found');
  });

  it('rejects unknown fields (forbidNonWhitelisted) → 400 validation_error', async () => {
    const res = await request(app.getHttpServer()).post('/workspaces').send({ name: 'A', hacker: 1 }).expect(400);
    expect(res.body.error.code).toBe('validation_error');
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `cd apps/api && npm test -- workspace`
Expected: FAIL(WorkspaceModule 未注册,404/路由不存在)。

- [ ] **Step 3: 实现 dto / service / controller / module**

`apps/api/src/workspace/dto.ts`:
```ts
import { IsOptional, IsString, MinLength } from 'class-validator';
export class CreateWorkspaceDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() plan?: string;
  @IsOptional() @IsString() slug?: string;
}
export class UpdateWorkspaceDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() plan?: string;
}
```

`apps/api/src/workspace/workspace.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { notFound } from '../common/errors';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto';

@Injectable()
export class WorkspaceService {
  constructor(private prisma: PrismaService) {}
  create(dto: CreateWorkspaceDto) { return this.prisma.workspace.create({ data: dto }); }
  async get(id: string) {
    const ws = await this.prisma.workspace.findUnique({ where: { id } });
    if (!ws) throw notFound('Workspace not found');
    return ws;
  }
  update(id: string, dto: UpdateWorkspaceDto) { return this.prisma.workspace.update({ where: { id }, data: dto }); }
}
```

`apps/api/src/workspace/workspace.controller.ts`:
```ts
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Public } from '../common/tenant/public.decorator';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto';

@Controller('workspaces')
export class WorkspaceController {
  constructor(private svc: WorkspaceService) {}
  @Public() @Post()
  async create(@Body() dto: CreateWorkspaceDto) { return { value: await this.svc.create(dto) }; }
  @Get(':workspaceId')
  async get(@WorkspaceId() id: string) { return { value: await this.svc.get(id) }; }
  @Patch(':workspaceId')
  async update(@WorkspaceId() id: string, @Body() dto: UpdateWorkspaceDto) { return { value: await this.svc.update(id, dto) }; }
}
```

`apps/api/src/workspace/workspace.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
@Module({ controllers: [WorkspaceController], providers: [WorkspaceService] })
export class WorkspaceModule {}
```

- [ ] **Step 4: 注册到 AppModule**

修改 `apps/api/src/app.module.ts` 的 `imports`,加入 `WorkspaceModule`(import 语句加在顶部):
```ts
import { WorkspaceModule } from './workspace/workspace.module';
// imports: [PrismaModule, WorkspaceModule]
```

- [ ] **Step 5: 运行验证通过**

Run: `cd apps/api && npm test -- workspace`
Expected: PASS(3 个用例)。

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/workspace apps/api/src/app.module.ts apps/api/test/workspace.e2e-spec.ts
git commit -m "feat(api): add workspace domain (create/get/update)"
```

### Task 1.2: Project 域(完整 CRUD 模板 + 租户隔离测试)

**Files:**
- Create: `apps/api/src/project/{project.module.ts,project.controller.ts,project.service.ts,dto.ts}`
- Test: `apps/api/test/project.e2e-spec.ts`

- [ ] **Step 1: 写失败测试(含跨租户隔离)**

`apps/api/test/project.e2e-spec.ts`:
```ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, seedWorkspace } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Project (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('create → list → get → patch → delete', async () => {
    const ws = await seedWorkspace(prisma);
    const created = await request(app.getHttpServer())
      .post(`/workspaces/${ws.id}/projects`).send({ name: 'P1', type: 'image' }).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.status).toBe('active');

    const list = await request(app.getHttpServer()).get(`/workspaces/${ws.id}/projects`).expect(200);
    expect(list.body.value).toHaveLength(1);

    const filtered = await request(app.getHttpServer()).get(`/workspaces/${ws.id}/projects?status=archived`).expect(200);
    expect(filtered.body.value).toHaveLength(0);

    await request(app.getHttpServer()).patch(`/workspaces/${ws.id}/projects/${id}`).send({ favorite: true }).expect(200);
    const got = await request(app.getHttpServer()).get(`/workspaces/${ws.id}/projects/${id}`).expect(200);
    expect(got.body.value.favorite).toBe(true);

    await request(app.getHttpServer()).delete(`/workspaces/${ws.id}/projects/${id}`).expect(200);
    await request(app.getHttpServer()).get(`/workspaces/${ws.id}/projects/${id}`).expect(404);
  });

  it('TENANT ISOLATION: workspace A cannot read B project', async () => {
    const a = await seedWorkspace(prisma, 'A'); const b = await seedWorkspace(prisma, 'B');
    const made = await request(app.getHttpServer()).post(`/workspaces/${b.id}/projects`).send({ name: 'secret' }).expect(201);
    // A 列表里看不到 B 的项目
    const listA = await request(app.getHttpServer()).get(`/workspaces/${a.id}/projects`).expect(200);
    expect(listA.body.value).toHaveLength(0);
    // A 直接按 id 取 B 的项目 → 404
    await request(app.getHttpServer()).get(`/workspaces/${a.id}/projects/${made.body.value.id}`).expect(404);
  });

  it('TENANT ISOLATION: body-injected workspaceId is ignored (path wins)', async () => {
    const a = await seedWorkspace(prisma, 'A'); const b = await seedWorkspace(prisma, 'B');
    // 偷传 workspaceId=b 应被白名单拒绝（未知字段 → 400），即便允许也不应落到 B
    const res = await request(app.getHttpServer())
      .post(`/workspaces/${a.id}/projects`).send({ name: 'x', workspaceId: b.id });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `cd apps/api && npm test -- project`
Expected: FAIL(ProjectModule 未注册)。

- [ ] **Step 3: 实现 dto / service / controller / module**

`apps/api/src/project/dto.ts`:
```ts
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
const STATUSES = ['active', 'draft', 'archived'] as const;
export class CreateProjectDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) linkedAssetIds?: string[];
  @IsOptional() @IsString() coverImageUrl?: string;
  @IsOptional() @IsBoolean() favorite?: boolean;
  @IsOptional() metadata?: Record<string, unknown>;
}
export class UpdateProjectDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) linkedAssetIds?: string[];
  @IsOptional() @IsString() coverImageUrl?: string;
  @IsOptional() @IsBoolean() favorite?: boolean;
  @IsOptional() metadata?: Record<string, unknown>;
}
export class ListProjectQuery {
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
```

`apps/api/src/project/project.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { notFound } from '../common/errors';
import { CreateProjectDto, UpdateProjectDto, ListProjectQuery } from './dto';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}
  list(workspaceId: string, q: ListProjectQuery) {
    return this.prisma.project.findMany({
      where: { workspaceId, ...(q.status ? { status: q.status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
  async get(workspaceId: string, id: string) {
    const row = await this.prisma.project.findFirst({ where: { id, workspaceId } });
    if (!row) throw notFound('Project not found');
    return row;
  }
  create(workspaceId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({ data: { ...dto, workspaceId } });
  }
  async update(workspaceId: string, id: string, dto: UpdateProjectDto) {
    await this.get(workspaceId, id); // 确保属于本租户
    return this.prisma.project.update({ where: { id }, data: dto });
  }
  async remove(workspaceId: string, id: string) {
    await this.get(workspaceId, id);
    await this.prisma.project.delete({ where: { id } });
    return { id };
  }
}
```

`apps/api/src/project/project.controller.ts`:
```ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { ProjectService } from './project.service';
import { CreateProjectDto, UpdateProjectDto, ListProjectQuery } from './dto';

@Controller('workspaces/:workspaceId/projects')
export class ProjectController {
  constructor(private svc: ProjectService) {}
  @Get() async list(@WorkspaceId() ws: string, @Query() q: ListProjectQuery) { return { value: await this.svc.list(ws, q) }; }
  @Get(':id') async get(@WorkspaceId() ws: string, @Param('id') id: string) { return { value: await this.svc.get(ws, id) }; }
  @Post() async create(@WorkspaceId() ws: string, @Body() dto: CreateProjectDto) { return { value: await this.svc.create(ws, dto) }; }
  @Patch(':id') async update(@WorkspaceId() ws: string, @Param('id') id: string, @Body() dto: UpdateProjectDto) { return { value: await this.svc.update(ws, id, dto) }; }
  @Delete(':id') async remove(@WorkspaceId() ws: string, @Param('id') id: string) { return { value: await this.svc.remove(ws, id) }; }
}
```

`apps/api/src/project/project.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
@Module({ controllers: [ProjectController], providers: [ProjectService] })
export class ProjectModule {}
```

- [ ] **Step 4: 注册到 AppModule imports(加 `ProjectModule`)。**

- [ ] **Step 5: 运行验证通过**

Run: `cd apps/api && npm test -- project`
Expected: PASS(含 2 个租户隔离用例)。

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/project apps/api/src/app.module.ts apps/api/test/project.e2e-spec.ts
git commit -m "feat(api): add project domain with tenant isolation tests"
```

> **后续域模板说明:** Task 1.3–1.7 沿用 Project 的 module/controller/service/dto 四件套与 `@WorkspaceId()` + `findFirst({where:{id,workspaceId}})` 租户隔离写法。下面每个 task 只给出该域**独有的逻辑**的完整代码(状态机、累加、只追加、唯一约束、过滤器),CRUD 骨架照 Project 写。

### Task 1.3: Member 域(唯一约束 → conflict)

**Files:** `apps/api/src/member/*` ; Test: `apps/api/test/member.e2e-spec.ts`

独有逻辑:`(workspaceId, userId)` 唯一;重复加入返回 409 conflict。

- [ ] **Step 1: 失败测试**

`apps/api/test/member.e2e-spec.ts`:
```ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, seedWorkspace } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Member (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('adds member; duplicate (workspaceId,userId) → 409 conflict', async () => {
    const ws = await seedWorkspace(prisma);
    await request(app.getHttpServer()).post(`/workspaces/${ws.id}/members`).send({ userId: 'u1', role: 'owner' }).expect(201);
    const dup = await request(app.getHttpServer()).post(`/workspaces/${ws.id}/members`).send({ userId: 'u1', role: 'admin' }).expect(409);
    expect(dup.body.error.code).toBe('conflict');
  });
});
```

- [ ] **Step 2: 运行验证失败** — Run: `cd apps/api && npm test -- member` → FAIL。

- [ ] **Step 3: 实现**

`apps/api/src/member/dto.ts`:
```ts
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
const ROLES = ['owner', 'admin', 'operator', 'finance', 'viewer'] as const;
export class CreateMemberDto {
  @IsString() @MinLength(1) userId!: string;
  @IsIn(ROLES as unknown as string[]) role!: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() email?: string;
}
export class UpdateMemberDto {
  @IsOptional() @IsIn(ROLES as unknown as string[]) role?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() email?: string;
}
```

`apps/api/src/member/member.service.ts`(独有:create 捕获 P2002 → conflict):
```ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { conflict, notFound } from '../common/errors';
import { CreateMemberDto, UpdateMemberDto } from './dto';

@Injectable()
export class MemberService {
  constructor(private prisma: PrismaService) {}
  list(workspaceId: string) { return this.prisma.member.findMany({ where: { workspaceId } }); }
  async create(workspaceId: string, dto: CreateMemberDto) {
    try { return await this.prisma.member.create({ data: { ...dto, workspaceId } }); }
    catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
        throw conflict('Member already exists in workspace');
      throw e;
    }
  }
  async update(workspaceId: string, id: string, dto: UpdateMemberDto) {
    const row = await this.prisma.member.findFirst({ where: { id, workspaceId } });
    if (!row) throw notFound('Member not found');
    return this.prisma.member.update({ where: { id }, data: dto });
  }
  async remove(workspaceId: string, id: string) {
    const row = await this.prisma.member.findFirst({ where: { id, workspaceId } });
    if (!row) throw notFound('Member not found');
    await this.prisma.member.delete({ where: { id } });
    return { id };
  }
}
```

Controller(`@Controller('workspaces/:workspaceId/members')`)与 module 照 Project 四件套:`GET /`(list)、`POST /`(create)、`PATCH /:id`、`DELETE /:id`,各方法用 `@WorkspaceId()` 取租户 id。

- [ ] **Step 4: 注册 MemberModule 到 AppModule。**
- [ ] **Step 5: 运行验证通过** — Run: `cd apps/api && npm test -- member` → PASS。
- [ ] **Step 6: Commit**
```bash
git add apps/api/src/member apps/api/src/app.module.ts apps/api/test/member.e2e-spec.ts
git commit -m "feat(api): add member domain with unique-constraint conflict handling"
```

### Task 1.4: GenerationJob 域(状态机)

**Files:** `apps/api/src/generation-job/*` ; Test: `apps/api/test/generation-job.e2e-spec.ts`

独有逻辑:状态流转受控 `pending→running→succeeded|failed`,非法迁移 400;独立 `PATCH /:id/status` 端点。

- [ ] **Step 1: 失败测试**

`apps/api/test/generation-job.e2e-spec.ts`:
```ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, seedWorkspace } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('GenerationJob (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('create → running → succeeded; illegal transition → 400', async () => {
    const ws = await seedWorkspace(prisma);
    const made = await request(app.getHttpServer())
      .post(`/workspaces/${ws.id}/generation-jobs`).send({ type: 'image', input: { prompt: 'cat' } }).expect(201);
    const id = made.body.value.id;
    expect(made.body.value.status).toBe('pending');

    await request(app.getHttpServer()).patch(`/workspaces/${ws.id}/generation-jobs/${id}/status`).send({ status: 'running' }).expect(200);
    await request(app.getHttpServer()).patch(`/workspaces/${ws.id}/generation-jobs/${id}/status`).send({ status: 'succeeded' }).expect(200);

    const bad = await request(app.getHttpServer()).patch(`/workspaces/${ws.id}/generation-jobs/${id}/status`).send({ status: 'running' }).expect(400);
    expect(bad.body.error.code).toBe('validation_error');
  });

  it('filters by status', async () => {
    const ws = await seedWorkspace(prisma);
    await request(app.getHttpServer()).post(`/workspaces/${ws.id}/generation-jobs`).send({ type: 'image', input: {} }).expect(201);
    const pending = await request(app.getHttpServer()).get(`/workspaces/${ws.id}/generation-jobs?status=pending`).expect(200);
    expect(pending.body.value).toHaveLength(1);
    const running = await request(app.getHttpServer()).get(`/workspaces/${ws.id}/generation-jobs?status=running`).expect(200);
    expect(running.body.value).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 运行验证失败** — Run: `cd apps/api && npm test -- generation-job` → FAIL。

- [ ] **Step 3: 实现**

`apps/api/src/generation-job/dto.ts`:
```ts
import { IsIn, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
const STATUSES = ['pending', 'running', 'succeeded', 'failed'] as const;
export class CreateJobDto {
  @IsString() @MinLength(1) type!: string;
  @IsOptional() @IsString() projectId?: string;
  @IsObject() input!: Record<string, unknown>;
}
export class UpdateStatusDto {
  @IsIn(STATUSES as unknown as string[]) status!: string;
  @IsOptional() @IsString() error?: string;
}
export class ListJobQuery {
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsString() projectId?: string;
}
```

`apps/api/src/generation-job/generation-job.service.ts`(独有:`ALLOWED` 迁移表):
```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { notFound, validationError } from '../common/errors';
import { CreateJobDto, UpdateStatusDto, ListJobQuery } from './dto';

const ALLOWED: Record<string, string[]> = {
  pending: ['running', 'failed'],
  running: ['succeeded', 'failed'],
  succeeded: [],
  failed: [],
};

@Injectable()
export class GenerationJobService {
  constructor(private prisma: PrismaService) {}
  list(workspaceId: string, q: ListJobQuery) {
    return this.prisma.generationJob.findMany({
      where: { workspaceId, ...(q.status ? { status: q.status } : {}), ...(q.projectId ? { projectId: q.projectId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
  async get(workspaceId: string, id: string) {
    const row = await this.prisma.generationJob.findFirst({ where: { id, workspaceId } });
    if (!row) throw notFound('Generation job not found');
    return row;
  }
  create(workspaceId: string, dto: CreateJobDto) {
    return this.prisma.generationJob.create({ data: { ...dto, workspaceId } });
  }
  async updateStatus(workspaceId: string, id: string, dto: UpdateStatusDto) {
    const job = await this.get(workspaceId, id);
    if (!ALLOWED[job.status]?.includes(dto.status))
      throw validationError(`Cannot transition from ${job.status} to ${dto.status}`);
    return this.prisma.generationJob.update({ where: { id }, data: { status: dto.status, error: dto.error ?? null } });
  }
}
```

Controller 端点:`GET /`、`GET /:id`、`POST /`、`PATCH /:id/status`(调 `updateStatus`)。Module 照四件套,注册到 AppModule。

- [ ] **Step 4: 注册 GenerationJobModule。**
- [ ] **Step 5: 运行验证通过** — Run: `cd apps/api && npm test -- generation-job` → PASS。
- [ ] **Step 6: Commit**
```bash
git add apps/api/src/generation-job apps/api/src/app.module.ts apps/api/test/generation-job.e2e-spec.ts
git commit -m "feat(api): add generation-job domain with state machine"
```

### Task 1.5: Asset 域(多过滤器 + 证据链事务)

**Files:** `apps/api/src/asset/*` ; Test: `apps/api/test/asset.e2e-spec.ts`

独有逻辑:按 `kind/projectId/jobId` 过滤;创建 asset 时如带 `jobId`,在事务中校验 job 同租户存在。

- [ ] **Step 1: 失败测试**

`apps/api/test/asset.e2e-spec.ts`:
```ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, seedWorkspace } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Asset (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('create with kind filter; delete', async () => {
    const ws = await seedWorkspace(prisma);
    await request(app.getHttpServer()).post(`/workspaces/${ws.id}/assets`).send({ kind: 'image', url: 'http://x/1.png' }).expect(201);
    await request(app.getHttpServer()).post(`/workspaces/${ws.id}/assets`).send({ kind: 'text' }).expect(201);
    const imgs = await request(app.getHttpServer()).get(`/workspaces/${ws.id}/assets?kind=image`).expect(200);
    expect(imgs.body.value).toHaveLength(1);
  });

  it('rejects asset referencing a job from another workspace → 404', async () => {
    const a = await seedWorkspace(prisma, 'A'); const b = await seedWorkspace(prisma, 'B');
    const job = await prisma.generationJob.create({ data: { workspaceId: b.id, type: 'image', input: {} } });
    const res = await request(app.getHttpServer()).post(`/workspaces/${a.id}/assets`).send({ kind: 'image', jobId: job.id }).expect(404);
    expect(res.body.error.code).toBe('not_found');
  });
});
```

- [ ] **Step 2: 运行验证失败** — Run: `cd apps/api && npm test -- asset` → FAIL。

- [ ] **Step 3: 实现**

`apps/api/src/asset/dto.ts`:
```ts
import { IsOptional, IsString, MinLength } from 'class-validator';
export class CreateAssetDto {
  @IsString() @MinLength(1) kind!: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() jobId?: string;
  @IsOptional() metadata?: Record<string, unknown>;
}
export class ListAssetQuery {
  @IsOptional() @IsString() kind?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() jobId?: string;
}
```

`apps/api/src/asset/asset.service.ts`(独有:create 校验 jobId 同租户):
```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { notFound } from '../common/errors';
import { CreateAssetDto, ListAssetQuery } from './dto';

@Injectable()
export class AssetService {
  constructor(private prisma: PrismaService) {}
  list(workspaceId: string, q: ListAssetQuery) {
    return this.prisma.asset.findMany({
      where: { workspaceId, ...(q.kind ? { kind: q.kind } : {}), ...(q.projectId ? { projectId: q.projectId } : {}), ...(q.jobId ? { jobId: q.jobId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
  async get(workspaceId: string, id: string) {
    const row = await this.prisma.asset.findFirst({ where: { id, workspaceId } });
    if (!row) throw notFound('Asset not found');
    return row;
  }
  async create(workspaceId: string, dto: CreateAssetDto) {
    if (dto.jobId) {
      const job = await this.prisma.generationJob.findFirst({ where: { id: dto.jobId, workspaceId } });
      if (!job) throw notFound('Referenced generation job not found in workspace');
    }
    return this.prisma.asset.create({ data: { ...dto, workspaceId } });
  }
  async remove(workspaceId: string, id: string) {
    await this.get(workspaceId, id);
    await this.prisma.asset.delete({ where: { id } });
    return { id };
  }
}
```

Controller 端点:`GET /`、`GET /:id`、`POST /`、`DELETE /:id`。Module 注册。

- [ ] **Step 4: 注册 AssetModule。**
- [ ] **Step 5: 运行验证通过** — Run: `cd apps/api && npm test -- asset` → PASS。
- [ ] **Step 6: Commit**
```bash
git add apps/api/src/asset apps/api/src/app.module.ts apps/api/test/asset.e2e-spec.ts
git commit -m "feat(api): add asset domain with cross-workspace job guard"
```

### Task 1.6: UsageEvent 域(只增 + summary 聚合)

**Files:** `apps/api/src/usage-event/*` ; Test: `apps/api/test/usage-event.e2e-spec.ts`

独有逻辑:只有 GET+POST(无 PATCH/DELETE);`/summary` 服务端累加 credits;支持 `from/to` 时间过滤。

- [ ] **Step 1: 失败测试**

`apps/api/test/usage-event.e2e-spec.ts`:
```ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, seedWorkspace } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('UsageEvent (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('appends events and summary sums credits', async () => {
    const ws = await seedWorkspace(prisma);
    await request(app.getHttpServer()).post(`/workspaces/${ws.id}/usage-events`).send({ category: 'generation', credits: 3 }).expect(201);
    await request(app.getHttpServer()).post(`/workspaces/${ws.id}/usage-events`).send({ category: 'generation', credits: 7 }).expect(201);
    const sum = await request(app.getHttpServer()).get(`/workspaces/${ws.id}/usage-events/summary`).expect(200);
    expect(sum.body.value.totalCredits).toBe(10);
  });

  it('does not expose PATCH/DELETE', async () => {
    const ws = await seedWorkspace(prisma);
    const made = await request(app.getHttpServer()).post(`/workspaces/${ws.id}/usage-events`).send({ category: 'generation', credits: 1 }).expect(201);
    await request(app.getHttpServer()).delete(`/workspaces/${ws.id}/usage-events/${made.body.value.id}`).expect(404);
  });
});
```

- [ ] **Step 2: 运行验证失败** — Run: `cd apps/api && npm test -- usage-event` → FAIL。

- [ ] **Step 3: 实现**

`apps/api/src/usage-event/dto.ts`:
```ts
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
export class CreateUsageDto {
  @IsString() @MinLength(1) category!: string;
  @IsInt() @Min(0) credits!: number;
  @IsOptional() @IsString() jobId?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() metadata?: Record<string, unknown>;
}
export class UsageRangeQuery {
  @IsOptional() @Type(() => Date) from?: Date;
  @IsOptional() @Type(() => Date) to?: Date;
}
```

`apps/api/src/usage-event/usage-event.service.ts`(独有:`aggregate` 求和):
```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateUsageDto, UsageRangeQuery } from './dto';

function range(q: UsageRangeQuery) {
  const createdAt: { gte?: Date; lte?: Date } = {};
  if (q.from) createdAt.gte = q.from;
  if (q.to) createdAt.lte = q.to;
  return Object.keys(createdAt).length ? { createdAt } : {};
}

@Injectable()
export class UsageEventService {
  constructor(private prisma: PrismaService) {}
  list(workspaceId: string, q: UsageRangeQuery) {
    return this.prisma.usageEvent.findMany({ where: { workspaceId, ...range(q) }, orderBy: { createdAt: 'desc' } });
  }
  create(workspaceId: string, dto: CreateUsageDto) {
    return this.prisma.usageEvent.create({ data: { ...dto, workspaceId } });
  }
  async summary(workspaceId: string, q: UsageRangeQuery) {
    const agg = await this.prisma.usageEvent.aggregate({ where: { workspaceId, ...range(q) }, _sum: { credits: true } });
    return { totalCredits: agg._sum.credits ?? 0 };
  }
}
```

Controller(`@Controller('workspaces/:workspaceId/usage-events')`):`GET /`、`GET /summary`、`POST /`。**不写** PATCH/DELETE。Module 注册。

- [ ] **Step 4: 注册 UsageEventModule。**
- [ ] **Step 5: 运行验证通过** — Run: `cd apps/api && npm test -- usage-event` → PASS。
- [ ] **Step 6: Commit**
```bash
git add apps/api/src/usage-event apps/api/src/app.module.ts apps/api/test/usage-event.e2e-spec.ts
git commit -m "feat(api): add usage-event domain (append-only + summary)"
```

### Task 1.7: AuditLog 域(只追加)

**Files:** `apps/api/src/audit-log/*` ; Test: `apps/api/test/audit-log.e2e-spec.ts`

独有逻辑:只有 GET+POST;支持 `from/to/action` 过滤。

- [ ] **Step 1: 失败测试**

`apps/api/test/audit-log.e2e-spec.ts`:
```ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, seedWorkspace } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('AuditLog (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('appends and filters by action', async () => {
    const ws = await seedWorkspace(prisma);
    await request(app.getHttpServer()).post(`/workspaces/${ws.id}/audit-logs`).send({ action: 'asset_create', targetType: 'asset', targetId: 'a1' }).expect(201);
    await request(app.getHttpServer()).post(`/workspaces/${ws.id}/audit-logs`).send({ action: 'asset_delete' }).expect(201);
    const created = await request(app.getHttpServer()).get(`/workspaces/${ws.id}/audit-logs?action=asset_create`).expect(200);
    expect(created.body.value).toHaveLength(1);
    expect(created.body.value[0].action).toBe('asset_create');
  });
});
```

- [ ] **Step 2: 运行验证失败** — Run: `cd apps/api && npm test -- audit-log` → FAIL。

- [ ] **Step 3: 实现**

`apps/api/src/audit-log/dto.ts`:
```ts
import { IsOptional, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
export class CreateAuditDto {
  @IsString() @MinLength(1) action!: string;
  @IsOptional() @IsString() targetType?: string;
  @IsOptional() @IsString() targetId?: string;
  @IsOptional() @IsString() moduleId?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() actorName?: string;
  @IsOptional() @IsString() actorRole?: string;
  @IsOptional() metadata?: Record<string, unknown>;
}
export class AuditQuery {
  @IsOptional() @IsString() action?: string;
  @IsOptional() @Type(() => Date) from?: Date;
  @IsOptional() @Type(() => Date) to?: Date;
}
```

`apps/api/src/audit-log/audit-log.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateAuditDto, AuditQuery } from './dto';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}
  list(workspaceId: string, q: AuditQuery) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (q.from) createdAt.gte = q.from;
    if (q.to) createdAt.lte = q.to;
    return this.prisma.auditLog.findMany({
      where: { workspaceId, ...(q.action ? { action: q.action } : {}), ...(Object.keys(createdAt).length ? { createdAt } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
  create(workspaceId: string, dto: CreateAuditDto) {
    return this.prisma.auditLog.create({ data: { ...dto, workspaceId } });
  }
}
```

Controller(`@Controller('workspaces/:workspaceId/audit-logs')`):`GET /`、`POST /`。**不写** PATCH/DELETE。Module 注册。

- [ ] **Step 4: 注册 AuditLogModule。**
- [ ] **Step 5: 运行验证通过** — Run: `cd apps/api && npm test -- audit-log` → PASS。
- [ ] **Step 6: 全套后端测试** — Run: `cd apps/api && npm test` → 全绿(含所有租户隔离用例)。
- [ ] **Step 7: Commit**
```bash
git add apps/api/src/audit-log apps/api/src/app.module.ts apps/api/test/audit-log.e2e-spec.ts
git commit -m "feat(api): add audit-log domain (append-only)"
```

## Phase 2 — 前端 apiClient + 仓储迁移

> **重要实现发现(需用户确认):** 经核查,6 个目标仓储导出的全部是**同步函数**(如 `loadWorkspaceProjects(ctx): WorkspaceProject[]`),被 ~98 个组件同步调用并立即渲染。同步函数无法 `await` HTTP。因此 spec 的"函数签名不变"只能用**写穿缓存(write-through cache)**实现:仓储保留模块级内存缓存(初值来自 localStorage),同步读返回缓存;应用启动/切换 workspace 时异步从 API 拉取 hydrate 进缓存;写操作同步更新缓存 + 异步 write-through 到 API。代价:读在 hydrate 完成前可能短暂陈旧(最终一致),这与现有纯客户端 localStorage 行为相近,MVP(单用户/workspace)可接受。
>
> **替代方案**:把 6 个仓储改为 async + 改造所有调用点(useEffect/useState)。更正确但 blast radius 大(跨 98 组件),应单列为后续子项目。
>
> 本计划 Phase 2 采用**写穿缓存**以兑现"签名不变、影响关在仓储层"。执行前请确认此取舍。

### Task 2.1: apiClient(唯一 HTTP 出口)

**Files:**
- Create: `src/lib/data/apiClient.ts`
- Test: `scripts/api-client.test.ts`
- Modify: `package.json`(加 `test:api-client` 脚本)
- Modify: `src/lib/data/dataBackend.ts`(复用 `DataBackendResult`/错误码,无需改;仅 import)

- [ ] **Step 1: 写失败测试(tsx + node:assert,注入式 mock fetcher)**

`scripts/api-client.test.ts`:
```ts
import assert from 'node:assert/strict';
import { createApiClient } from '../src/lib/data/apiClient.ts';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function run() {
  // 1. 2xx + {value} → ok:true
  {
    const client = createApiClient('http://api', async () => jsonResponse(200, { value: { id: 'p1' } }));
    const r = await client.get('ws1', 'projects');
    assert.equal(r.ok, true);
    assert.deepEqual((r as any).value, { id: 'p1' });
  }
  // 2. 404 → ok:true, value:null
  {
    const client = createApiClient('http://api', async () => jsonResponse(404, { error: { code: 'not_found', message: 'x' } }));
    const r = await client.get('ws1', 'projects/zzz');
    assert.equal(r.ok, true);
    assert.equal((r as any).value, null);
  }
  // 3. 4xx → ok:false 带 code
  {
    const client = createApiClient('http://api', async () => jsonResponse(400, { error: { code: 'validation_error', message: 'bad' } }));
    const r = await client.post('ws1', 'projects', { name: '' });
    assert.equal(r.ok, false);
    assert.equal((r as any).error.code, 'validation_error');
  }
  // 4. 网络异常 → network_error
  {
    const client = createApiClient('http://api', async () => { throw new Error('boom'); });
    const r = await client.get('ws1', 'projects');
    assert.equal(r.ok, false);
    assert.equal((r as any).error.code, 'network_error');
  }
  // 5. 未配 baseUrl → configured=false
  {
    const client = createApiClient(undefined, async () => jsonResponse(200, { value: 1 }));
    assert.equal(client.configured, false);
  }
  console.log('api client contract passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: 运行验证失败** — Run: `npx tsx scripts/api-client.test.ts` → FAIL(模块不存在)。

- [ ] **Step 3: 实现 apiClient**

`src/lib/data/apiClient.ts`:
```ts
import type { DataBackendResult, DataBackendError, DataBackendErrorCode } from './dataBackend';

export interface ApiClient {
  configured: boolean;
  get<T = unknown>(workspaceId: string, path: string): Promise<DataBackendResult<T | null>>;
  post<T = unknown>(workspaceId: string, path: string, body: unknown): Promise<DataBackendResult<T>>;
  patch<T = unknown>(workspaceId: string, path: string, body: unknown): Promise<DataBackendResult<T>>;
  del<T = unknown>(workspaceId: string, path: string): Promise<DataBackendResult<T>>;
}

function readApiUrl(): string | undefined {
  try { return (import.meta as any).env?.VITE_DATA_API_URL || undefined; } catch { return undefined; }
}
function fail(code: DataBackendErrorCode, message: string): DataBackendResult<never> {
  return { ok: false, error: { code, message } as DataBackendError };
}

export function createApiClient(baseUrl: string | undefined = readApiUrl(), fetcher: typeof fetch = fetch): ApiClient {
  const configured = Boolean(baseUrl);
  const url = (workspaceId: string, path: string) =>
    `${baseUrl!.replace(/\/+$/, '')}/workspaces/${encodeURIComponent(workspaceId)}/${path}`;

  async function send<T>(method: string, workspaceId: string, path: string, body?: unknown): Promise<DataBackendResult<T | null>> {
    if (!configured) return fail('backend_unconfigured', 'VITE_DATA_API_URL is not configured.');
    try {
      const res = await fetcher(url(workspaceId, path), {
        method,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (res.status === 404) return { ok: true, value: null };
      let payload: any = null;
      try { payload = await res.json(); } catch { /* tolerate empty */ }
      if (!res.ok) {
        const code: DataBackendErrorCode = payload?.error?.code ?? (res.status === 401 || res.status === 403 ? 'permission_denied' : 'network_error');
        return fail(code, payload?.error?.message ?? `Request failed with status ${res.status}.`);
      }
      return { ok: true, value: (payload && 'value' in payload ? payload.value : payload) as T };
    } catch (e) {
      return fail('network_error', e instanceof Error ? e.message : String(e));
    }
  }

  return {
    configured,
    get: (ws, path) => send('GET', ws, path),
    post: (ws, path, body) => send('POST', ws, path, body) as any,
    patch: (ws, path, body) => send('PATCH', ws, path, body) as any,
    del: (ws, path) => send('DELETE', ws, path) as any,
  };
}

export const apiClient = createApiClient();
```

- [ ] **Step 4: 前端错误码补 `not_found`/`conflict`**

修改 `src/lib/data/dataBackend.ts` 的 `DataBackendErrorCode`(当前为 6 个),加入两个成员:
```ts
export type DataBackendErrorCode =
  | 'backend_unconfigured'
  | 'network_error'
  | 'permission_denied'
  | 'parse_error'
  | 'validation_error'
  | 'not_found'
  | 'conflict'
  | 'unknown_error';
```
> 注:`validation_error` 若原本不在枚举中一并补上(与后端词表对齐)。

- [ ] **Step 5: 加 npm 脚本**

修改根 `package.json` 的 `scripts`,加:
```json
"test:api-client": "tsx scripts/api-client.test.ts"
```

- [ ] **Step 6: 运行验证通过** — Run: `npm run test:api-client` → "api client contract passed"。

- [ ] **Step 7: lint** — Run: `npm run lint` → PASS。

- [ ] **Step 8: Commit**
```bash
git add src/lib/data/apiClient.ts src/lib/data/dataBackend.ts scripts/api-client.test.ts package.json
git commit -m "feat(web): add apiClient and align DataBackendErrorCode with backend"
```

### Task 2.2: Project 仓储写穿缓存迁移(模板)

**Files:**
- Modify: `src/lib/data/projectRepository.ts`
- Test: `scripts/project-repository-api.test.ts`

目标:`loadWorkspaceProjects` 等保持同步签名;配置了 `VITE_DATA_API_URL` 时,缓存经 `hydrateWorkspaceProjects(ctx)` 异步从 API 填充,写操作 write-through;未配置时退回现有 localStorage 逻辑。

- [ ] **Step 1: 失败测试**

`scripts/project-repository-api.test.ts`:
```ts
import assert from 'node:assert/strict';
import { createApiClient } from '../src/lib/data/apiClient.ts';
import { hydrateWorkspaceProjects, loadWorkspaceProjects, __setProjectApiClientForTest } from '../src/lib/data/projectRepository.ts';
import { createMemoryStorage } from '../src/lib/data/dataBackend.ts';

async function run() {
  const ctx = { workspaceId: 'ws1', storage: createMemoryStorage() };
  const client = createApiClient('http://api', async () =>
    new Response(JSON.stringify({ value: [{ id: 'p1', workspaceId: 'ws1', name: 'P', type: 'general', status: 'active', linkedAssetIds: [], favorite: false, createdAt: 1, updatedAt: 1, metadata: {} }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }));
  __setProjectApiClientForTest(client);

  // hydrate 前缓存空
  assert.deepEqual(loadWorkspaceProjects(ctx), []);
  // hydrate 后同步读返回 API 数据
  await hydrateWorkspaceProjects(ctx);
  const rows = loadWorkspaceProjects(ctx);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'p1');
  console.log('project repository api migration passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: 运行验证失败** — Run: `npx tsx scripts/project-repository-api.test.ts` → FAIL(`hydrateWorkspaceProjects`/`__setProjectApiClientForTest` 未导出)。

- [ ] **Step 3: 实现写穿缓存**

在 `src/lib/data/projectRepository.ts` 顶部加入(import apiClient 与类型),并增加缓存与 hydrate;改 `loadWorkspaceProjects`/`saveWorkspaceProjects` 优先读写缓存:
```ts
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';

let projectApiClient: ApiClient = defaultApiClient;
export function __setProjectApiClientForTest(c: ApiClient) { projectApiClient = c; }

const projectCache = new Map<string, WorkspaceProject[]>(); // key=workspaceId

export async function hydrateWorkspaceProjects(context: ProjectRepositoryContext): Promise<void> {
  if (!projectApiClient.configured) return;
  const res = await projectApiClient.get<WorkspaceProject[]>(context.workspaceId, 'projects');
  if (res.ok && Array.isArray(res.value)) projectCache.set(context.workspaceId, res.value);
}
```
修改 `loadWorkspaceProjects`:配置了 API 时优先返回缓存(`projectCache.get(workspaceId) ?? []`),否则走原 localStorage 读取逻辑:
```ts
export function loadWorkspaceProjects(context: ProjectRepositoryContext): WorkspaceProject[] {
  if (projectApiClient.configured) return projectCache.get(context.workspaceId) ?? [];
  // —— 原有 localStorage 读取逻辑保持不变 ——
  // ...(existing implementation)
}
```
修改写函数(`createWorkspaceProject`/`updateWorkspaceProject`/`deleteWorkspaceProjects`):同步更新 `projectCache` + 调原 localStorage 写;并在配置 API 时 fire-and-forget write-through:
```ts
// 在 create 内，构造出 newProject 后：
if (projectApiClient.configured) {
  const next = [...(projectCache.get(context.workspaceId) ?? []), newProject];
  projectCache.set(context.workspaceId, next);
  void projectApiClient.post(context.workspaceId, 'projects', {
    name: newProject.name, type: newProject.type, status: newProject.status,
    linkedAssetIds: newProject.linkedAssetIds, coverImageUrl: newProject.coverImageUrl,
    favorite: newProject.favorite, metadata: newProject.metadata,
  });
}
```
> write-through 失败处理:本阶段记录 console.error,不回滚缓存(最终一致;严格一致留后续子项目)。update/delete 同理(`patch`/`del`)。

- [ ] **Step 4: 运行验证通过** — Run: `npx tsx scripts/project-repository-api.test.ts` → PASS。

- [ ] **Step 5: 加脚本 + 在 App 启动 hydrate**

`package.json` 加 `"test:project-repo-api": "tsx scripts/project-repository-api.test.ts"`。
在 `src/App.tsx` 现有读取 projects 的 effect 旁,调用 `void hydrateWorkspaceProjects({ workspaceId: session.workspace.id })`(workspace 变化时触发),hydrate 完成后触发一次现有的列表刷新。

- [ ] **Step 6: lint + 构建** — Run: `npm run lint && npm run build` → PASS。

- [ ] **Step 7: Commit**
```bash
git add src/lib/data/projectRepository.ts scripts/project-repository-api.test.ts package.json src/App.tsx
git commit -m "feat(web): migrate project repository to API via write-through cache"
```

### Task 2.3: 其余 5 仓储写穿缓存迁移

对 `assetRepository`、`generationJobRepository`、`usageRepository`、`auditLogRepository`、`workspaceMemberRepository` **逐个**套用 Task 2.2 的模式:加 `__set*ApiClientForTest`、模块级缓存、`hydrate*` 函数、读优先缓存、写 write-through。各域映射端点:

| 仓储 | 资源端点 | 注意点 |
| --- | --- | --- |
| assetRepository | `assets` | write-through 用 `post`;`recordWorkspaceAssetExport` 走 audit 端点(在 auditLog 仓储)而非 asset |
| generationJobRepository | `generation-jobs` | `createGenerationJob`→POST;`updateGenerationJob`/`failGenerationJob`/`retryGenerationJob` 的状态变更→`patch('generation-jobs/{id}/status', {status,error})` |
| usageRepository | `usage-events` | 只 `create*` 走 POST;`listWorkspaceUsageEvents` 读缓存;`loadModuleUsage`(本地聚合 UI 态)**不迁移**,留 localStorage |
| auditLogRepository | `audit-logs` | `logAuditEvent`→POST(映射 actor.name→actorName、actor.role→actorRole、timestamp 由后端 createdAt 提供);`listAuditLogs` 读缓存;`clearAuditLogs` 仅清本地缓存(后端 append-only 无 delete) |
| workspaceMemberRepository | `members` | `createWorkspaceMember` 重复→apiClient 返回 conflict,记录 console.error 不抛(保持签名);`ensureDemoWorkspaceMembers` 在 API 模式下跳过(demo 专用) |

- [ ] **Step 1–5(每个仓储重复):** 写 `scripts/<name>-repository-api.test.ts`(仿 Task 2.2 测试,断言 hydrate 后同步读返回 API 数据)→ 验证失败 → 实现写穿缓存 → 验证通过 → 加 `test:*-repo-api` 脚本。

- [ ] **Step 6: 在 App.tsx 对应 effect 调用各 `hydrate*`**(workspace 变化时),hydrate 后刷新对应列表。

- [ ] **Step 7: 全前端验证** — Run: `npm run lint && npm run build && npm run test:api-client && npm run test:project-repo-api`(及其余 `test:*-repo-api`)→ 全 PASS。

- [ ] **Step 8: Commit**
```bash
git add src/lib/data scripts package.json src/App.tsx
git commit -m "feat(web): migrate asset/job/usage/audit/member repositories to API via write-through cache"
```

### Task 2.4: 端到端联调验证

- [ ] **Step 1: 起后端** — Run: `cd apps/api && cp .env.example .env && npx prisma migrate dev && npm run start:dev`(:4000)。
- [ ] **Step 2: 配前端** — 在根 `.env.local` 设 `VITE_DATA_API_URL=http://localhost:4000`。
- [ ] **Step 3: 起前端** — Run: `npm run dev`;手动建一个 project,刷新页面确认数据从后端 hydrate(不再仅 localStorage)。
- [ ] **Step 4: 回退验证** — 移除 `VITE_DATA_API_URL`,重启前端,确认退回 localStorage 正常工作。
- [ ] **Step 5: Commit(若有联调修正)** — `git commit -m "fix(web): backend integration adjustments"`。

## 验收线(全部通过即 ① 完成)

```
cd apps/api && npm test        # 后端 Jest 全绿（含所有租户隔离用例）
npm run test:api-client        # 前端 apiClient
npm run test:project-repo-api  # 及其余 test:*-repo-api
npm run lint                   # tsc 全绿
npm run build                  # 构建通过
```

## 自审备注(spec 覆盖)

- 数据模型(spec §1)→ Task 0.2(列扩充已在 header 说明)。
- API 契约(spec §2)→ Task 1.1–1.7 各端点;状态机独立 `/status` → 1.4;summary → 1.6。
- 租户隔离(spec §3)→ Task 1.0 Guard + 1.2/1.5 隔离用例;path-only workspaceId → 1.2 Step 1 用例。
- 前端迁移(spec §4)→ Phase 2;签名不变经写穿缓存兑现(见 Phase 2 抬头发现说明)。
- 错误处理(spec §5)→ Task 0.3 过滤器 + 2.1 apiClient 映射 + 2.1 Step4 错误码对齐。
- 测试策略(spec §6)→ 后端 Jest e2e(含隔离套件)+ 前端 tsx 脚本;测试库隔离 = resetDb + runInBand(开放问题 3 已定)。
- 开放问题 2(同步/异步调用点)→ Phase 2 抬头已核查并定为写穿缓存,**待用户确认取舍**。





