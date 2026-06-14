# 子项目② 认证与租户 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用自建 JWT 认证补上"你是谁",把①的 TenantGuard 接上真实 userId 做成员校验,实现端到端可用的认证闭环(注册/登录/refresh/登出/me + 守卫接身份 + 前端真实登录)。

**Architecture:** 双全局守卫职责分离——AuthGuard(验 JWT → 注入 userId)先于 TenantGuard(查 Member → 注入 role)执行。无状态 access token + 可撤销 refresh token(存 Postgres,会旋转)。前端 token 注入与 401 自动 refresh 收敛在①的 apiClient(唯一 HTTP 出口)。

**Tech Stack:** NestJS 10 + @nestjs/jwt + @nestjs/passport + passport-jwt + bcrypt + Prisma 5 + PostgreSQL;前端 React + tsx 测试脚本。

**Design doc:** `docs/superpowers/specs/2026-06-14-auth-and-tenancy-design.md`

**测试基建沿用①:** 后端 Jest e2e(真实 DB,`DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public"`,`--runInBand`);前端 tsx 脚本(`node:assert/strict`)。后端跑单测:`cd apps/api && DATABASE_URL_TEST="..." npm test -- <name>`。

---

## 文件结构

**后端新建:**
- `apps/api/src/auth/auth.module.ts` — AuthModule,注册 JwtModule、控制器、服务
- `apps/api/src/auth/auth.controller.ts` — 5 个端点(register/login/refresh/logout/me)
- `apps/api/src/auth/auth.service.ts` — 注册/登录/refresh/登出/me 业务逻辑
- `apps/api/src/auth/password.service.ts` — bcrypt 哈希/校验封装
- `apps/api/src/auth/token.service.ts` — access JWT 签发 + refresh token 生成/哈希/旋转
- `apps/api/src/auth/dto.ts` — RegisterDto / LoginDto / RefreshDto / LogoutDto
- `apps/api/src/common/auth/auth.guard.ts` — 全局 AuthGuard(验 access JWT → 注入 req.userId)
- `apps/api/src/common/auth/current-user.decorator.ts` — @CurrentUser() 参数装饰器

**后端修改:**
- `apps/api/prisma/schema.prisma` — 加 User、RefreshToken,Member 接外键
- `apps/api/src/common/errors.ts` — ErrorCode 加 `unauthenticated` + helper
- `apps/api/src/common/filters/all-exceptions.filter.ts` — 401→unauthenticated、403→permission_denied
- `apps/api/src/common/tenant/tenant.guard.ts` — 增补 Member 校验 → 注入 req.member
- `apps/api/src/app.module.ts` — 注册 AuthModule + AuthGuard(在 TenantGuard 前)
- `apps/api/src/main.ts` — JWT_SECRET 启动校验
- `apps/api/.env.example` — 加 JWT_SECRET / JWT_ACCESS_TTL / JWT_REFRESH_TTL
- `apps/api/test/helpers.ts` — resetDb 补 user/refreshToken;新增 seedUserWithMember
- `apps/api/package.json` — 加认证依赖

**前端新建:**
- `src/saas/authTokenStore.ts` — access(内存)+ refresh(localStorage)存储
- `src/lib/data/authApi.ts` — register/login/refresh/logout/me 的 HTTP 封装
- `scripts/auth-token-store.test.ts` / `scripts/auth-api-client.test.ts` — tsx 测试

**前端修改:**
- `src/lib/data/apiClient.ts` — 注入 Authorization header + 401 自动 refresh 重试一次
- `src/lib/data/dataBackend.ts` — DataBackendErrorCode 加 `unauthenticated`
- `src/saas/SaasAuthContext.tsx` — demo session → 真实 signIn/register/signOut
- `src/saas/types.ts` — (如需)对齐后端返回的 user/membership 形状

---

## Phase 0 — 后端地基增补

### Task 0.1: 安装认证依赖

**Files:** Modify `apps/api/package.json`

- [ ] **Step 1: 安装运行时与类型依赖**

Run(在 `apps/api/` 下):
```bash
cd apps/api && npm install @nestjs/jwt@^10.2.0 @nestjs/passport@^10.0.3 passport@^0.7.0 passport-jwt@^4.0.1 bcrypt@^5.1.1 && npm install -D @types/passport-jwt@^4.0.1 @types/bcrypt@^5.0.2
```
Expected: 依赖写入 package.json,`package-lock.json` 更新,无报错。

- [ ] **Step 2: 验证编译仍通过**

Run: `cd apps/api && npx tsc --noEmit -p tsconfig.json`
Expected: 无错误(新依赖未使用,只验证安装未破坏)。

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json apps/api/package-lock.json
git commit -m "chore(api): add JWT/passport/bcrypt auth dependencies"
```

### Task 0.2: Prisma schema 加 User + RefreshToken + Member 外键

**Files:** Modify `apps/api/prisma/schema.prisma`

- [ ] **Step 1: 加 User 模型**

在 schema.prisma 末尾(AuditLog 之后)追加:
```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  avatarLabel  String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  members       Member[]
  refreshTokens RefreshToken[]
}

model RefreshToken {
  id        String    @id @default(cuid())
  userId    String
  tokenHash String    @unique
  client    String    @default("web")
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}
```

- [ ] **Step 2: Member 接外键**

把 Member 模型的 `workspace Workspace @relation(...)` 那行下方补一行(在 `@@unique`/`@@index` 之前):
```prisma
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
```
(Member 已有 `userId String`、`@@unique([workspaceId, userId])`,无需改动它们。)

- [ ] **Step 3: 生成迁移(开发库)**

Run:
```bash
cd apps/api && npx prisma migrate dev --name add_user_and_refresh_token
```
Expected: 新迁移文件生成于 `prisma/migrations/`,Prisma Client 重新生成,无报错。
> 注:开发库 `aistudio` 若已有①遗留 demo 数据,Member.userId 加外键可能因孤儿行失败。若失败,按设计的迁移策略执行 `npx prisma migrate reset`(清库重建,MVP 阶段可接受),再重跑。

- [ ] **Step 4: 应用到测试库**

Run:
```bash
cd apps/api && DATABASE_URL="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" npx prisma migrate deploy
```
Expected: 测试库应用新迁移,无报错。

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(api): add User and RefreshToken models, link Member to User"
```

### Task 0.3: 错误码 + 过滤器 + JWT secret 启动校验 + env

**Files:** Modify `apps/api/src/common/errors.ts`, `apps/api/src/common/filters/all-exceptions.filter.ts`, `apps/api/src/main.ts`, `apps/api/.env.example`

- [ ] **Step 1: errors.ts 加 unauthenticated**

把 `ErrorCode` 联合类型加一个成员,并加 helper:
```ts
export type ErrorCode =
  | 'backend_unconfigured' | 'network_error' | 'permission_denied'
  | 'parse_error' | 'validation_error' | 'not_found' | 'conflict'
  | 'unauthenticated' | 'unknown_error';

export class DomainError extends Error {
  constructor(public code: ErrorCode, message: string, public status: number) { super(message); }
}
export const notFound = (m = 'Resource not found') => new DomainError('not_found', m, 404);
export const validationError = (m: string) => new DomainError('validation_error', m, 400);
export const conflict = (m: string) => new DomainError('conflict', m, 409);
export const unauthenticated = (m = 'Authentication required') => new DomainError('unauthenticated', m, 401);
export const permissionDenied = (m = 'Permission denied') => new DomainError('permission_denied', m, 403);
```

- [ ] **Step 2: 过滤器区分 401/403**

在 `all-exceptions.filter.ts` 的 HttpException 分支,把 code 映射那一行改为:
```ts
      code = status === 400 ? 'validation_error' : status === 401 ? 'unauthenticated'
           : status === 403 ? 'permission_denied' : status === 404 ? 'not_found'
           : status === 409 ? 'conflict' : 'unknown_error';
```
(其余不变。DomainError 分支已用各自 code,无需改。)

- [ ] **Step 3: main.ts 加 JWT_SECRET 启动校验**

在 `bootstrap()` 内 `NestFactory.create` 之前加:
```ts
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required but not set. Refusing to start.');
  }
```

- [ ] **Step 4: .env.example 加变量**

在 `apps/api/.env.example` 末尾追加:
```
JWT_SECRET="dev-only-change-me-in-production"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL_DAYS="30"
```

- [ ] **Step 5: 验证编译**

Run: `cd apps/api && npx tsc --noEmit -p tsconfig.json`
Expected: 无错误。

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/common/errors.ts apps/api/src/common/filters/all-exceptions.filter.ts apps/api/src/main.ts apps/api/.env.example
git commit -m "feat(api): add unauthenticated error code, split 401/403 mapping, require JWT_SECRET"
```

### Task 0.4: 测试基座增补

**Files:** Modify `apps/api/test/helpers.ts`

- [ ] **Step 1: resetDb 补 user/refreshToken 删除**

在 `resetDb` 内,**Workspace 删除之前、member 删除之后**补两行(FK 顺序:refreshToken 依赖 user,member 依赖 user+workspace):
```ts
export async function resetDb(prisma: PrismaService) {
  await prisma.auditLog.deleteMany();
  await prisma.usageEvent.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.generationJob.deleteMany();
  await prisma.project.deleteMany();
  await prisma.member.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
}
```

- [ ] **Step 2: 加 seedUserWithMember helper**

在文件末尾追加(用于守卫链测试:建 user + workspace + member 三件套):
```ts
import * as bcrypt from 'bcrypt';

export async function seedUserWithMember(
  prisma: PrismaService,
  opts: { email?: string; password?: string; role?: string } = {},
) {
  const email = opts.email ?? `user_${Math.random().toString(36).slice(2, 8)}@test.dev`;
  const passwordHash = await bcrypt.hash(opts.password ?? 'password123', 10);
  const user = await prisma.user.create({ data: { email, passwordHash, name: 'Test User' } });
  const workspace = await prisma.workspace.create({ data: { name: 'WS' } });
  const member = await prisma.member.create({
    data: { workspaceId: workspace.id, userId: user.id, role: opts.role ?? 'owner' },
  });
  return { user, workspace, member };
}
```

- [ ] **Step 3: 验证编译**

Run: `cd apps/api && npx tsc --noEmit -p tsconfig.json`
Expected: 无错误。

- [ ] **Step 4: Commit**

```bash
git add apps/api/test/helpers.ts
git commit -m "test(api): extend resetDb for user/refreshToken, add seedUserWithMember helper"
```

---

## Phase 1 — 后端认证服务与端点

> **实现顺序提示**:依赖关系为 1.1/1.3(无依赖)→ 1.2(依赖 Prisma)→ 1.4(依赖 TokenService)→ 1.5(装配,依赖前述全部)→ 回跑 1.2 测试 → 1.6。TokenService 测试需 AuthModule 装配后才能 `app.get`,故其测试在 1.5 Step 5 回跑。**所有后端测试命令此后都带 `JWT_SECRET="test-secret"`**(JwtModule.register 读它)。

### Task 1.1: PasswordService(bcrypt 封装)

**Files:** Create `apps/api/src/auth/password.service.ts`; Test `apps/api/test/password.e2e-spec.ts`

- [ ] **Step 1: 失败测试**

`apps/api/test/password.e2e-spec.ts`:
```ts
import { PasswordService } from '../src/auth/password.service';

describe('PasswordService', () => {
  const svc = new PasswordService();
  it('hashes and verifies', async () => {
    const hash = await svc.hash('secret123');
    expect(hash).not.toBe('secret123');
    expect(await svc.verify('secret123', hash)).toBe(true);
    expect(await svc.verify('wrong', hash)).toBe(false);
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test -- password`
Expected: FAIL(模块不存在)。

- [ ] **Step 3: 实现**

`apps/api/src/auth/password.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  private readonly cost = 10;
  hash(plain: string): Promise<string> { return bcrypt.hash(plain, this.cost); }
  verify(plain: string, hash: string): Promise<boolean> { return bcrypt.compare(plain, hash); }
}
```

- [ ] **Step 4: 运行验证通过**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test -- password`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/password.service.ts apps/api/test/password.e2e-spec.ts
git commit -m "feat(api): add PasswordService (bcrypt hash/verify)"
```

### Task 1.2: TokenService(access JWT + refresh 生成/哈希/旋转)

**Files:** Create `apps/api/src/auth/token.service.ts`; Test `apps/api/test/token.e2e-spec.ts`

TokenService 依赖 JwtService(@nestjs/jwt)+ PrismaService。refresh token = 随机串(明文返回客户端),DB 只存 sha256 哈希。

- [ ] **Step 1: 失败测试**

`apps/api/test/token.e2e-spec.ts`:
```ts
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, seedUserWithMember } from './helpers';
import { TokenService } from '../src/auth/token.service';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('TokenService', () => {
  let app: INestApplication; let prisma: PrismaService; let tokens: TokenService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); tokens = app.get(TokenService); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('issues access token carrying userId', async () => {
    const { user } = await seedUserWithMember(prisma);
    const access = tokens.signAccess(user.id);
    expect(tokens.verifyAccess(access)).toBe(user.id);
  });

  it('creates and rotates refresh token', async () => {
    const { user } = await seedUserWithMember(prisma);
    const issued = await tokens.issueRefresh(user.id, 'web');
    expect(issued.token).toBeTruthy();
    const rotated = await tokens.rotateRefresh(issued.token);
    expect(rotated).not.toBeNull();
    expect(await tokens.rotateRefresh(issued.token)).toBeNull(); // 旧的已撤销
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test -- token`
Expected: FAIL(模块不存在)。此测试在 Task 1.5 装配 AuthModule 后才会真正通过(见 1.5 Step 5)。

- [ ] **Step 3: 实现**

`apps/api/src/auth/token.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TokenService {
  constructor(private jwt: JwtService, private prisma: PrismaService) {}

  private get refreshTtlMs(): number {
    const days = Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30);
    return days * 24 * 60 * 60 * 1000;
  }
  private sha(token: string): string { return createHash('sha256').update(token).digest('hex'); }

  signAccess(userId: string): string {
    return this.jwt.sign({ sub: userId }, { expiresIn: process.env.JWT_ACCESS_TTL ?? '15m' });
  }
  verifyAccess(token: string): string {
    return this.jwt.verify<{ sub: string }>(token).sub; // 无效/过期抛出,由 AuthGuard 转 401
  }

  async issueRefresh(userId: string, client = 'web'): Promise<{ token: string }> {
    const token = randomBytes(32).toString('hex');
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: this.sha(token), client, expiresAt: new Date(Date.now() + this.refreshTtlMs) },
    });
    return { token };
  }

  async rotateRefresh(token: string): Promise<{ token: string; userId: string } | null> {
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: this.sha(token) } });
    if (!row || row.revokedAt || row.expiresAt.getTime() < Date.now()) return null;
    await this.prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
    const next = await this.issueRefresh(row.userId, row.client);
    return { token: next.token, userId: row.userId };
  }

  async revokeRefresh(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.sha(token), revokedAt: null }, data: { revokedAt: new Date() },
    });
  }
}
```

- [ ] **Step 4: 验证编译**

Run: `cd apps/api && npx tsc --noEmit -p tsconfig.json`
Expected: 无错误。

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/token.service.ts apps/api/test/token.e2e-spec.ts
git commit -m "feat(api): add TokenService (access JWT + rotating refresh tokens)"
```

### Task 1.3: Auth DTOs

**Files:** Create `apps/api/src/auth/dto.ts`

- [ ] **Step 1: 实现 DTO(无独立测试,经端点 e2e 覆盖)**

`apps/api/src/auth/dto.ts`:
```ts
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() @MinLength(1) name!: string;
}
export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) password!: string;
  @IsOptional() @IsString() client?: string;
}
export class RefreshDto {
  @IsString() @MinLength(1) refreshToken!: string;
}
export class LogoutDto {
  @IsString() @MinLength(1) refreshToken!: string;
}
```

- [ ] **Step 2: 验证编译**

Run: `cd apps/api && npx tsc --noEmit -p tsconfig.json`
Expected: 无错误。

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/auth/dto.ts
git commit -m "feat(api): add auth DTOs (register/login/refresh/logout)"
```

### Task 1.4: AuthGuard + @CurrentUser 装饰器

**Files:** Create `apps/api/src/common/auth/auth.guard.ts`, `apps/api/src/common/auth/current-user.decorator.ts`

- [ ] **Step 1: 实现 AuthGuard**

`apps/api/src/common/auth/auth.guard.ts`:
```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC } from '../tenant/public.decorator';
import { TokenService } from '../../auth/token.service';
import { unauthenticated } from '../errors';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector, private tokens: TokenService) {}
  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    if (!header?.startsWith('Bearer ')) throw unauthenticated('Missing bearer token');
    try {
      req.userId = this.tokens.verifyAccess(header.slice(7));
    } catch {
      throw unauthenticated('Invalid or expired token');
    }
    return true;
  }
}
```

`apps/api/src/common/auth/current-user.decorator.ts`:
```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data, ctx: ExecutionContext): { userId: string; role?: string } => {
    const req = ctx.switchToHttp().getRequest();
    return { userId: req.userId, role: req.member?.role };
  },
);
```

- [ ] **Step 2: 验证编译**

Run: `cd apps/api && npx tsc --noEmit -p tsconfig.json`
Expected: 无错误(AuthGuard 注册在 Task 1.5)。

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/common/auth
git commit -m "feat(api): add AuthGuard and @CurrentUser decorator"
```

### Task 1.5: AuthService + AuthController + AuthModule(装配)

**Files:** Create `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/auth.module.ts`; Modify `apps/api/src/app.module.ts`

- [ ] **Step 1: 实现 AuthService**

`apps/api/src/auth/auth.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { RegisterDto, LoginDto } from './dto';
import { conflict, unauthenticated } from '../common/errors';

type UserShape = { id: string; email: string; name: string; avatarLabel: string | null };

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private passwords: PasswordService, private tokens: TokenService) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw conflict('Email already registered');
    const passwordHash = await this.passwords.hash(dto.password);
    const user = await this.prisma.user.create({ data: { email: dto.email, passwordHash, name: dto.name } });
    const workspace = await this.prisma.workspace.create({ data: { name: `${dto.name} 的工作区` } });
    await this.prisma.member.create({
      data: { workspaceId: workspace.id, userId: user.id, role: 'owner', name: dto.name, email: dto.email },
    });
    return this.issueFor(user.id, 'web', user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await this.passwords.verify(dto.password, user.passwordHash))) {
      throw unauthenticated('Invalid email or password'); // 统一信息防枚举
    }
    return this.issueFor(user.id, dto.client ?? 'web', user);
  }

  async refresh(refreshToken: string) {
    const rotated = await this.tokens.rotateRefresh(refreshToken);
    if (!rotated) throw unauthenticated('Invalid or expired refresh token');
    return { accessToken: this.tokens.signAccess(rotated.userId), refreshToken: rotated.token };
  }

  async logout(refreshToken: string) {
    await this.tokens.revokeRefresh(refreshToken);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const members = await this.prisma.member.findMany({ where: { userId }, include: { workspace: true } });
    return {
      user: { id: user.id, email: user.email, name: user.name, avatarLabel: user.avatarLabel },
      memberships: members.map((m) => ({ workspaceId: m.workspaceId, role: m.role, workspaceName: m.workspace.name })),
    };
  }

  private async issueFor(userId: string, client: string, user: UserShape) {
    const refresh = await this.tokens.issueRefresh(userId, client);
    return {
      accessToken: this.tokens.signAccess(userId),
      refreshToken: refresh.token,
      user: { id: user.id, email: user.email, name: user.name, avatarLabel: user.avatarLabel },
    };
  }
}
```

- [ ] **Step 2: 实现 AuthController**

`apps/api/src/auth/auth.controller.ts`:
```ts
import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Public } from '../common/tenant/public.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshDto, LogoutDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public() @Post('register') async register(@Body() dto: RegisterDto) { return { value: await this.auth.register(dto) }; }
  @Public() @Post('login') async login(@Body() dto: LoginDto) { return { value: await this.auth.login(dto) }; }
  @Public() @Post('refresh') async refresh(@Body() dto: RefreshDto) { return { value: await this.auth.refresh(dto.refreshToken) }; }

  @Post('logout') @HttpCode(204) async logout(@Body() dto: LogoutDto) { await this.auth.logout(dto.refreshToken); }
  @Get('me') async me(@CurrentUser() u: { userId: string }) { return { value: await this.auth.me(u.userId) }; }
}
```
> 注:`/auth/logout`、`/auth/me` 无 workspaceId 路径参数,TenantGuard 放行(①第15行无 workspaceId 即 return true),但 AuthGuard 仍校验(未标 @Public),保证需登录。

- [ ] **Step 3: 实现 AuthModule**

`apps/api/src/auth/auth.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET })],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService],
  exports: [TokenService],
})
export class AuthModule {}
```

- [ ] **Step 4: app.module.ts 注册 AuthModule + AuthGuard(在 TenantGuard 前)**

修改 `apps/api/src/app.module.ts`:加 import,`imports` 数组在 PrismaModule 后加 `AuthModule`,`providers` 中**在 TenantGuard 之前**插入 AuthGuard:
```ts
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './common/auth/auth.guard';
```
```ts
  imports: [PrismaModule, AuthModule, WorkspaceModule, ProjectModule, MemberModule, GenerationJobModule, AssetModule, UsageEventModule, AuditLogModule],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
```
> NestJS 全局守卫按 providers 出现顺序执行:AuthGuard 先注入 userId,TenantGuard 后用它查 Member。

- [ ] **Step 5: 回跑 TokenService 测试(现可解析依赖)**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test -- token`
Expected: PASS(2 用例)。

- [ ] **Step 6: 验证编译**

Run: `cd apps/api && npx tsc --noEmit -p tsconfig.json`
Expected: 无错误。

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/auth/auth.service.ts apps/api/src/auth/auth.controller.ts apps/api/src/auth/auth.module.ts apps/api/src/app.module.ts
git commit -m "feat(api): add AuthService, AuthController, AuthModule; register AuthGuard"
```

### Task 1.6: 认证端点 e2e

**Files:** Test `apps/api/test/auth.e2e-spec.ts`

- [ ] **Step 1: 失败测试**

`apps/api/test/auth.e2e-spec.ts`:
```ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const http = () => app.getHttpServer();

  it('register issues tokens and creates owner workspace', async () => {
    const r = await request(http()).post('/auth/register').send({ email: 'a@test.dev', password: 'password123', name: 'Alice' }).expect(201);
    expect(r.body.value.accessToken).toBeTruthy();
    expect(r.body.value.refreshToken).toBeTruthy();
    const members = await prisma.member.findMany({ where: { userId: r.body.value.user.id } });
    expect(members).toHaveLength(1);
    expect(members[0].role).toBe('owner');
  });

  it('duplicate email returns 409', async () => {
    await request(http()).post('/auth/register').send({ email: 'd@test.dev', password: 'password123', name: 'D' }).expect(201);
    await request(http()).post('/auth/register').send({ email: 'd@test.dev', password: 'password123', name: 'D2' }).expect(409);
  });

  it('login wrong password / unknown user both 401', async () => {
    await request(http()).post('/auth/register').send({ email: 'b@test.dev', password: 'password123', name: 'B' }).expect(201);
    await request(http()).post('/auth/login').send({ email: 'b@test.dev', password: 'wrongpass' }).expect(401);
    await request(http()).post('/auth/login').send({ email: 'nope@test.dev', password: 'password123' }).expect(401);
  });

  it('refresh rotates and old token becomes invalid', async () => {
    const reg = await request(http()).post('/auth/register').send({ email: 'c@test.dev', password: 'password123', name: 'C' }).expect(201);
    const oldRefresh = reg.body.value.refreshToken;
    const refreshed = await request(http()).post('/auth/refresh').send({ refreshToken: oldRefresh }).expect(201);
    expect(refreshed.body.value.accessToken).toBeTruthy();
    await request(http()).post('/auth/refresh').send({ refreshToken: oldRefresh }).expect(401);
  });

  it('logout revokes refresh token', async () => {
    const reg = await request(http()).post('/auth/register').send({ email: 'e@test.dev', password: 'password123', name: 'E' }).expect(201);
    const { accessToken, refreshToken } = reg.body.value;
    await request(http()).post('/auth/logout').set('Authorization', `Bearer ${accessToken}`).send({ refreshToken }).expect(204);
    await request(http()).post('/auth/refresh').send({ refreshToken }).expect(401);
  });

  it('me returns memberships', async () => {
    const reg = await request(http()).post('/auth/register').send({ email: 'f@test.dev', password: 'password123', name: 'F' }).expect(201);
    const me = await request(http()).get('/auth/me').set('Authorization', `Bearer ${reg.body.value.accessToken}`).expect(200);
    expect(me.body.value.user.email).toBe('f@test.dev');
    expect(me.body.value.memberships).toHaveLength(1);
    expect(me.body.value.memberships[0].role).toBe('owner');
  });

  it('me without token returns 401', async () => {
    await request(http()).get('/auth/me').expect(401);
  });
});
```

- [ ] **Step 2: 运行验证通过**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test -- auth`
Expected: PASS(7 用例)。

- [ ] **Step 3: Commit**

```bash
git add apps/api/test/auth.e2e-spec.ts
git commit -m "test(api): add auth endpoints e2e (register/login/refresh/logout/me)"
```

---

## Phase 2 — TenantGuard 接真实身份

### Task 2.1: TenantGuard 增补 Member 校验 + 守卫链 e2e

**Files:** Modify `apps/api/src/common/tenant/tenant.guard.ts`; Test `apps/api/test/tenant-guard.e2e-spec.ts`

- [ ] **Step 1: 失败测试(守卫链)**

`apps/api/test/tenant-guard.e2e-spec.ts`:
```ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

// 用真实注册流程拿 token + workspace,再验证守卫链
async function registerUser(app: INestApplication, email: string) {
  const r = await request(app.getHttpServer()).post('/auth/register')
    .send({ email, password: 'password123', name: email.split('@')[0] }).expect(201);
  const ws = await request(app.getHttpServer()).get('/auth/me')
    .set('Authorization', `Bearer ${r.body.value.accessToken}`).expect(200);
  return { accessToken: r.body.value.accessToken as string, workspaceId: ws.body.value.memberships[0].workspaceId as string };
}

describe('Guard chain (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const http = () => app.getHttpServer();

  it('no token → 401', async () => {
    const { workspaceId } = await registerUser(app, 'g1@test.dev');
    await request(http()).get(`/workspaces/${workspaceId}/projects`).expect(401);
  });

  it('valid token but non-member of target workspace → 403', async () => {
    const a = await registerUser(app, 'g2@test.dev');
    const b = await registerUser(app, 'g3@test.dev'); // 不同用户,不同 workspace
    // a 的 token 访问 b 的 workspace → 非成员
    await request(http()).get(`/workspaces/${b.workspaceId}/projects`)
      .set('Authorization', `Bearer ${a.accessToken}`).expect(403);
  });

  it('member → 200', async () => {
    const a = await registerUser(app, 'g4@test.dev');
    await request(http()).get(`/workspaces/${a.workspaceId}/projects`)
      .set('Authorization', `Bearer ${a.accessToken}`).expect(200);
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test -- tenant-guard`
Expected: FAIL——"non-member → 403" 用例失败(当前 TenantGuard 只校验 workspace 存在,不校验成员,会返回 200)。

- [ ] **Step 3: 实现 TenantGuard 增补**

修改 `apps/api/src/common/tenant/tenant.guard.ts`,把 workspace 存在校验后追加 Member 校验:
```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC } from './public.decorator';
import { notFound, permissionDenied } from '../errors';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    const req = ctx.switchToHttp().getRequest();
    const workspaceId = req.params?.workspaceId;
    if (!workspaceId) return true; // 非 workspace 范围路由
    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws) throw notFound('Workspace not found');
    // ②认证落地:校验请求者是该 workspace 的成员(req.userId 由 AuthGuard 注入)
    const member = await this.prisma.member.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.userId } },
    });
    if (!member) throw permissionDenied('Not a member of this workspace');
    req.workspaceId = workspaceId;
    req.member = { id: member.id, role: member.role };
    return true;
  }
}
```
> 注:`workspaceId_userId` 是 Prisma 对 `@@unique([workspaceId, userId])` 自动生成的复合唯一键名。`req.userId` 已由先执行的 AuthGuard 注入。

- [ ] **Step 4: 运行验证通过**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test -- tenant-guard`
Expected: PASS(3 用例)。

- [ ] **Step 5: 修复①遗留 e2e(它们无真实 token)**

①的域 e2e(project/asset/member/...)此前用裸 `seedWorkspace` + 无 token 请求,现会被 AuthGuard 挡成 401。需把它们改为经真实注册拿 token + workspace。
> **关键提示给实现者**:这是本计划 blast radius 最大的一步。①有 7 个域 e2e 文件(workspace/project/member/generation-job/asset/usage-event/audit-log)。逐个改造模式:在 `beforeEach`/各用例里,用上面 `registerUser` 同款流程(POST /auth/register → GET /auth/me 拿 workspaceId)替换 `seedWorkspace`,并给所有受保护请求 `.set('Authorization', Bearer ...)`。建议把 `registerUser` 提到 `helpers.ts` 复用。workspace 域的 POST /workspaces 仍 @Public,但其 GET/PATCH :id 若是 workspace 范围则需 token——核查每个端点。逐个文件改、逐个 `npm test -- <name>` 验证通过再下一个。

具体子步骤(实现者按此逐文件执行):
- 在 `helpers.ts` 导出 `registerUser(app, email)`(从上面测试提取)。
- 逐个改 `test/{workspace,project,member,generation-job,asset,usage-event,audit-log}.e2e-spec.ts`:用 registerUser 拿 {accessToken, workspaceId},替换 seedWorkspace;所有 workspace 范围请求加 Authorization 头。
- 每改一个,运行 `npm test -- <name>` 确认绿。

- [ ] **Step 6: 全套后端测试**

Run: `cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test`
Expected: 全绿(①的 14 + ②新增的 password/token/auth/tenant-guard 用例)。

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/common/tenant/tenant.guard.ts apps/api/test
git commit -m "feat(api): enforce Member check in TenantGuard, inject real userId; update domain e2e with auth"
```

---

## Phase 3 — 前端集成

### Task 3.1: DataBackendErrorCode 加 unauthenticated + authTokenStore

**Files:** Modify `src/lib/data/dataBackend.ts`; Create `src/saas/authTokenStore.ts`, `scripts/auth-token-store.test.ts`; Modify root `package.json`

- [ ] **Step 1: dataBackend 加错误码**

`src/lib/data/dataBackend.ts` 的 `DataBackendErrorCode` 联合加 `unauthenticated`(①已有 8 个,现 9 个):
```ts
export type DataBackendErrorCode =
  | 'backend_unconfigured'
  | 'network_error'
  | 'permission_denied'
  | 'parse_error'
  | 'validation_error'
  | 'not_found'
  | 'conflict'
  | 'unauthenticated'
  | 'unknown_error';
```

- [ ] **Step 2: authTokenStore 失败测试**

`scripts/auth-token-store.test.ts`:
```ts
import assert from 'node:assert/strict';
import { authTokenStore } from '../src/saas/authTokenStore.ts';
import { createMemoryStorage } from '../src/lib/data/dataBackend.ts';

async function run() {
  const store = authTokenStore(createMemoryStorage());
  assert.equal(store.getAccess(), null);
  assert.equal(store.getRefresh(), null);
  store.set({ accessToken: 'a1', refreshToken: 'r1' });
  assert.equal(store.getAccess(), 'a1');
  assert.equal(store.getRefresh(), 'r1');
  store.set({ accessToken: 'a2', refreshToken: 'r2' });
  assert.equal(store.getAccess(), 'a2');
  store.clear();
  assert.equal(store.getAccess(), null);
  assert.equal(store.getRefresh(), null);
  console.log('auth token store passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: 运行验证失败**

Run: `npx tsx scripts/auth-token-store.test.ts`
Expected: FAIL(模块不存在)。

- [ ] **Step 4: 实现 authTokenStore**

`src/saas/authTokenStore.ts`(access 内存、refresh localStorage;接受可注入 storage 便于测试):
```ts
import type { StorageLike } from './localAuthSession';

const REFRESH_KEY = 'aistudio_auth_refresh_token';

export interface AuthTokens { accessToken: string; refreshToken: string; }

export interface AuthTokenStore {
  getAccess(): string | null;
  getRefresh(): string | null;
  set(tokens: AuthTokens): void;
  clear(): void;
}

export function authTokenStore(storage?: StorageLike | null): AuthTokenStore {
  let accessToken: string | null = null; // 内存,刷新页面即失,靠 refresh 重建
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
  return {
    getAccess: () => accessToken,
    getRefresh: () => store?.getItem(REFRESH_KEY) ?? null,
    set: ({ accessToken: a, refreshToken: r }) => { accessToken = a; store?.setItem(REFRESH_KEY, r); },
    clear: () => { accessToken = null; store?.removeItem(REFRESH_KEY); },
  };
}

// 应用级单例(生产用 localStorage)
export const appAuthTokens = authTokenStore();
```
> 注:`StorageLike` 已由①的 `src/saas/localAuthSession` 导出(repositories 也用它),`createMemoryStorage` 由 dataBackend 导出。

- [ ] **Step 5: 运行验证通过**

Run: `npx tsx scripts/auth-token-store.test.ts`
Expected: `auth token store passed`。

- [ ] **Step 6: 加 npm 脚本**

root `package.json` scripts 加:`"test:auth-token-store": "tsx scripts/auth-token-store.test.ts"`。

- [ ] **Step 7: lint**

Run: `npm run lint`
Expected: PASS(仅①已知的 apps/api 已被 exclude,无新错误)。

- [ ] **Step 8: Commit**

```bash
git add src/lib/data/dataBackend.ts src/saas/authTokenStore.ts scripts/auth-token-store.test.ts package.json
git commit -m "feat(web): add authTokenStore and unauthenticated error code"
```

### Task 3.2: apiClient 注入 token + 401 自动 refresh

**Files:** Modify `src/lib/data/apiClient.ts`; Create `scripts/auth-api-client.test.ts`; Modify root `package.json`

apiClient(①的唯一 HTTP 出口)需:(1)每请求带 `Authorization: Bearer <access>`;(2)收到 401 时调一次 refresh 换 token 重试;(3)refresh 失败则清 token 并上抛 unauthenticated。为可测试,把 token 读取/刷新作为可注入依赖。

- [ ] **Step 1: 失败测试**

`scripts/auth-api-client.test.ts`:
```ts
import assert from 'node:assert/strict';
import { createApiClient } from '../src/lib/data/apiClient.ts';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function run() {
  // 1. 注入 access token 到 Authorization 头
  {
    let seenAuth: string | null = null;
    const client = createApiClient('http://api', async (_url, init) => {
      seenAuth = (init?.headers as Record<string, string>)?.['Authorization'] ?? null;
      return json(200, { value: { ok: true } });
    }, { getAccess: () => 'acc1', onRefresh: async () => null, onAuthFailure: () => {} });
    await client.get('ws1', 'projects');
    assert.equal(seenAuth, 'Bearer acc1');
  }
  // 2. 401 → 触发 refresh → 用新 token 重试成功
  {
    let calls = 0; let refreshed = false;
    const client = createApiClient('http://api', async (_url, init) => {
      calls += 1;
      const auth = (init?.headers as Record<string, string>)?.['Authorization'];
      if (auth === 'Bearer old') return json(401, { error: { code: 'unauthenticated', message: 'x' } });
      return json(200, { value: { ok: true } });
    }, {
      getAccess: () => (refreshed ? 'new' : 'old'),
      onRefresh: async () => { refreshed = true; return 'new'; },
      onAuthFailure: () => {},
    });
    const r = await client.get('ws1', 'projects');
    assert.equal(r.ok, true);
    assert.equal(calls, 2); // 第一次 401,refresh 后重试第二次
  }
  // 3. refresh 失败 → onAuthFailure 调用 + 返回 unauthenticated
  {
    let failed = false;
    const client = createApiClient('http://api', async () => json(401, { error: { code: 'unauthenticated', message: 'x' } }),
      { getAccess: () => 'old', onRefresh: async () => null, onAuthFailure: () => { failed = true; } });
    const r = await client.get('ws1', 'projects');
    assert.equal(r.ok, false);
    assert.equal((r as any).error.code, 'unauthenticated');
    assert.equal(failed, true);
  }
  console.log('auth api client passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: 运行验证失败**

Run: `npx tsx scripts/auth-api-client.test.ts`
Expected: FAIL(createApiClient 第三参数 authHooks 尚不存在)。

- [ ] **Step 3: 实现 apiClient 增补**

修改 `src/lib/data/apiClient.ts`:给 `createApiClient` 加第三个可选参数 `authHooks`,在 `send` 内注入 Authorization、处理 401 重试。保留①现有行为(404→value:null、错误信封、未配置 baseUrl)。新增形态:
```ts
export interface AuthHooks {
  getAccess: () => string | null;
  onRefresh: () => Promise<string | null>; // 返回新 access,或 null 表示失败
  onAuthFailure: () => void;                // 清 session、跳登录
}

export function createApiClient(
  baseUrl: string | undefined = readApiUrl(),
  fetcher: typeof fetch = fetch,
  authHooks?: AuthHooks,
): ApiClient {
  const configured = Boolean(baseUrl);
  const url = (workspaceId: string, path: string) =>
    `${baseUrl!.replace(/\/+$/, '')}/workspaces/${encodeURIComponent(workspaceId)}/${path}`;

  async function doFetch(method: string, fullUrl: string, body: unknown, accessToken: string | null) {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    return fetcher(fullUrl, {
      method,
      headers: Object.keys(headers).length ? headers : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async function send<T>(method: string, workspaceId: string, path: string, body?: unknown): Promise<DataBackendResult<T | null>> {
    if (!configured) return fail('backend_unconfigured', 'VITE_DATA_API_URL is not configured.');
    const fullUrl = url(workspaceId, path);
    try {
      let res = await doFetch(method, fullUrl, body, authHooks?.getAccess() ?? null);
      if (res.status === 401 && authHooks) {
        const newAccess = await authHooks.onRefresh();
        if (!newAccess) { authHooks.onAuthFailure(); return fail('unauthenticated', 'Session expired'); }
        res = await doFetch(method, fullUrl, body, newAccess); // 重试一次
        if (res.status === 401) { authHooks.onAuthFailure(); return fail('unauthenticated', 'Session expired'); }
      }
      if (res.status === 404) return { ok: true, value: null };
      let payload: any = null;
      try { payload = await res.json(); } catch { /* tolerate empty */ }
      if (!res.ok) {
        const code: DataBackendErrorCode = payload?.error?.code ?? (res.status === 403 ? 'permission_denied' : 'network_error');
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
```
> 注:①原 `send` 内联了 header 构造;此处抽出 `doFetch` 以复用于重试。`fail` / `readApiUrl` / `ApiClient` 接口沿用①已有定义,不改。403 不触发 refresh(只有 401 触发),兑现设计的 401/403 语义分离。

- [ ] **Step 4: 运行验证通过**

Run: `npx tsx scripts/auth-api-client.test.ts`
Expected: `auth api client passed`。

- [ ] **Step 5: 确认①的 api-client 测试仍绿**

Run: `npm run test:api-client`
Expected: `api client contract passed`(authHooks 可选,①测试不传它,行为不变)。

- [ ] **Step 6: 加 npm 脚本 + lint**

root `package.json` scripts 加:`"test:auth-api-client": "tsx scripts/auth-api-client.test.ts"`。
Run: `npm run lint`
Expected: PASS。

- [ ] **Step 7: Commit**

```bash
git add src/lib/data/apiClient.ts scripts/auth-api-client.test.ts package.json
git commit -m "feat(web): apiClient injects bearer token and auto-refreshes on 401"
```

### Task 3.3: authApi + SaasAuthContext 真实登录 + apiClient 接线

**Files:** Create `src/lib/data/authApi.ts`; Modify `src/saas/SaasAuthContext.tsx`, `src/main.tsx`(或 apiClient 单例接线点)

这一步把后端真实认证接到前端 UI。把 demo session 替换为真实 register/login/logout,并将 `appAuthTokens` + refresh 流程接到 apiClient 单例。

- [ ] **Step 1: 实现 authApi(HTTP 封装,不经 apiClient 因 auth 端点非 workspace 范围)**

`src/lib/data/authApi.ts`:
```ts
import type { AuthTokens } from '../../saas/authTokenStore';

function baseUrl(): string | undefined {
  try { return (import.meta as any).env?.VITE_DATA_API_URL || undefined; } catch { return undefined; }
}
async function post(path: string, body: unknown, accessToken?: string) {
  const url = `${baseUrl()!.replace(/\/+$/, '')}/auth/${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  return res;
}

export interface AuthUser { id: string; email: string; name: string; avatarLabel?: string | null; }
export interface Membership { workspaceId: string; role: string; workspaceName: string; }

export async function apiRegister(email: string, password: string, name: string): Promise<AuthTokens & { user: AuthUser }> {
  const res = await post('register', { email, password, name });
  if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'register failed');
  return (await res.json()).value;
}
export async function apiLogin(email: string, password: string): Promise<AuthTokens & { user: AuthUser }> {
  const res = await post('login', { email, password, client: 'web' });
  if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'login failed');
  return (await res.json()).value;
}
export async function apiRefresh(refreshToken: string): Promise<AuthTokens | null> {
  const res = await post('refresh', { refreshToken });
  if (!res.ok) return null;
  return (await res.json()).value;
}
export async function apiLogout(accessToken: string, refreshToken: string): Promise<void> {
  await post('logout', { refreshToken }, accessToken);
}
export async function apiMe(accessToken: string): Promise<{ user: AuthUser; memberships: Membership[] }> {
  const url = `${baseUrl()!.replace(/\/+$/, '')}/auth/me`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error('me failed');
  return (await res.json()).value;
}
```

- [ ] **Step 2: 接线 apiClient 单例的 authHooks**

apiClient 单例(①的 `export const apiClient = createApiClient()`)需带上 authHooks。改 `src/lib/data/apiClient.ts` 末尾的单例导出,注入 `appAuthTokens` + refresh 流程:
```ts
import { appAuthTokens } from '../../saas/authTokenStore';
import { apiRefresh } from './authApi';

let onAuthFailureHandler: () => void = () => {};
export function setAuthFailureHandler(fn: () => void) { onAuthFailureHandler = fn; }

export const apiClient = createApiClient(undefined, fetch, {
  getAccess: () => appAuthTokens.getAccess(),
  onRefresh: async () => {
    const refresh = appAuthTokens.getRefresh();
    if (!refresh) return null;
    const next = await apiRefresh(refresh);
    if (!next) return null;
    appAuthTokens.set(next);
    return next.accessToken;
  },
  onAuthFailure: () => { appAuthTokens.clear(); onAuthFailureHandler(); },
});
```
> 注:`setAuthFailureHandler` 让 SaasAuthContext 注册"清 session + 跳登录"回调,避免 apiClient 直接依赖 React。

- [ ] **Step 3: 改造 SaasAuthContext**

修改 `src/saas/SaasAuthContext.tsx`:
- `signInDemo` 替换为 `signIn(email, password)` 与 `register(email, password, name)`:调 `apiLogin`/`apiRegister` → `appAuthTokens.set(tokens)` → `apiMe(access)` 构建 `AuthSession`(user + 第一个 membership 作 workspace/membership)。
- `signOut`:调 `apiLogout(access, refresh)` → `appAuthTokens.clear()` → setSession(null)。
- 启动时:若 `appAuthTokens.getRefresh()` 存在,尝试 `apiRefresh` → 成功则 `apiMe` 重建 session(实现"刷新页面保持登录")。
- `useEffect` 注册 `setAuthFailureHandler(() => setSession(null))`。
- `AuthGate`:把"使用 Demo 工作区登录"按钮替换为 email/password 登录表单 + 注册切换。

接口形态(SaasAuthContextValue 改):
```ts
interface SaasAuthContextValue {
  session: AuthSession | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateWorkspacePlan: (plan: AuthSession['workspace']['plan']) => void;
}
```
> `AuthSession` 形状(①已在 `src/saas/types.ts` 定义:user/workspace/membership/issuedAt/lastActiveAt)。从 `apiMe` 的 `{user, memberships[]}` 映射:workspace 取 `memberships[0]` 的 workspaceId/workspaceName + 默认 plan('free' 或后续从后端补);membership 取 `memberships[0]`。plan 字段后端 Workspace 有,可在 me 返回里补 workspace.plan(可选增强,本批默认 'free')。

- [ ] **Step 4: 构建验证**

Run: `npm run lint && npm run build`
Expected: PASS。
> 这一步触及 SaasAuthContext 的消费方(App.tsx 调 signInDemo 处)。实现者需把 `signInDemo` 的调用点改为新接口(登录表单触发 signIn/register)。lint 会暴露所有断点,逐个修。

- [ ] **Step 5: 手动联调(真实后端)**

- 起后端:`cd apps/api && cp .env.example .env`(确保 JWT_SECRET 已设)`&& npx prisma migrate deploy && JWT_SECRET=... npm run start:dev`
- 前端 `.env.local` 设 `VITE_DATA_API_URL=http://localhost:4000`
- `npm run dev` → 注册新账号 → 看到工作区 → 刷新页面仍登录(refresh 重建)→ 登出 → 被挡回登录页
- 回退验证:移除 `VITE_DATA_API_URL` → 前端回退 localStorage(apiClient.configured=false,仓储走本地)

- [ ] **Step 6: Commit**

```bash
git add src/lib/data/authApi.ts src/lib/data/apiClient.ts src/saas/SaasAuthContext.tsx src/App.tsx
git commit -m "feat(web): replace demo session with real JWT auth (login/register/logout + session restore)"
```

---

## 验收线(全部通过即 ② 完成)

```
cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test   # 后端全绿(①14 + ②新增)
npm run test:auth-token-store     # 前端 token 存储
npm run test:auth-api-client      # 前端 token 注入 + 401 refresh
npm run test:api-client           # ①契约未破
npm run lint                      # tsc 全绿
npm run build                     # 构建通过
```

## 自审备注(spec 覆盖)

- 数据模型(spec 数据模型节)→ Task 0.2(User/RefreshToken + Member 外键)。
- 认证端点(spec 端点节)→ Task 1.5 controller + 1.6 e2e(register/login/refresh/logout/me 全覆盖)。
- 双守卫职责分离(spec 守卫链节)→ Task 1.4 AuthGuard + 1.5 注册顺序 + 2.1 TenantGuard 增补;守卫链 e2e(401/403/200)→ 2.1。
- 前端集成(spec 前端节)→ Task 3.1 token 存储 + 3.2 apiClient 注入/refresh + 3.3 SaasAuthContext/AuthGate。
- 错误处理(spec 错误节)→ Task 0.3 errors+filter(401/403 分离)+ 3.1 前端错误码;401 触发 refresh、403 不触发 → 3.2 测试断言。
- 安全(spec 安全节)→ bcrypt(1.1)、防枚举(1.5 login 统一 401)、token 哈希/旋转(1.2)、JWT_SECRET 启动校验(0.3)、ValidationPipe whitelist(①沿用)。
- 测试策略(spec 测试节)→ 后端 Jest e2e(1.1/1.2/1.6/2.1)+ 前端 tsx(3.1/3.2)。
- 范围边界 → 邮箱验证/密码重置/邀请/社交登录/RBAC/多 workspace 切换 UI 均不在任务中(留后续批次)。
- 开放问题 → 迁移机制(0.2 Step3 注 reset)、JWT 时长(0.3 env 值)、token 存储封装(3.1 authTokenStore)、默认 workspace(3.3 取 memberships[0])均已落地。
