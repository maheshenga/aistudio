# ⑤b-4 加密敏感资源 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 apiKey、webhook 两个 local-only repository 迁后端,引入后端首个 AES-256-GCM 对称加密能力,敏感字段密文落库、明文永不出后端。

**Architecture:** 新建全局 `EncryptionService`(照 PrismaModule 的 `@Global()` 模式)。apiKey/webhook 各建一套四件套,套 `WorkspaceResourceService` + `createResourceController`(list 资源),但 service **覆写** `create`(落库前 encrypt secret→ciphertext)和 `list`/`get`(返回前 omit ciphertext)。前端照 mediaRepository 写穿透模板。

**Tech Stack:** NestJS 10 + Prisma 5 + PostgreSQL;node:crypto(aes-256-gcm);React 19 + tsx 测试。

**关键约束(贯穿全程):**
- list 资源写动词用 POST/PATCH/DELETE(ApiClient 无 put)。
- **EncryptionModule 进 AppModule 后,所有 e2e bootstrap 都需 `FIELD_ENCRYPTION_KEY`**。Task 1 起所有后端 e2e 命令必须带该 env(64-hex 测试 key)。
- 明文 secret 绝不落库、绝不出现在任何 GET 响应。
- 前端未配置后端时 localStorage 全量逻辑零改动(只把 `Math.random` 换成 `crypto.getRandomValues`)。
- e2e 命令模板:
  ```
  cd /e/code/aistudio/apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" FIELD_ENCRYPTION_KEY="0000000000000000000000000000000000000000000000000000000000000000" npx jest --runInBand --config test/jest-e2e.json <spec>
  ```
- lint/build 从仓库根 `/e/code/aistudio` 跑。

---

### Task 0: Prisma ApiKey + WebhookEndpoint 模型 + 迁移 + resetDb

> 由 controller 本人执行(Docker/迁移环境),不派 subagent。

**Files:** Modify `apps/api/prisma/schema.prisma`、`apps/api/test/helpers.ts`

- [ ] Step 1: Workspace 关系列表末尾(`settings Setting[]` 后)加 `apiKeys ApiKey[]` 和 `webhookEndpoints WebhookEndpoint[]`。
- [ ] Step 2: schema.prisma 末尾追加 ApiKey + WebhookEndpoint 两个模型(字段见 spec 组件2/3)。
- [ ] Step 3: helpers.ts resetDb 在 `setting.deleteMany()` 后加 `apiKey.deleteMany()` 和 `webhookEndpoint.deleteMany()`。
- [ ] Step 4: 主库 `migrate dev --name add_encrypted_secrets`。
- [ ] Step 5: 测试库 `migrate deploy`。
- [ ] Step 6: commit `feat(api): add ApiKey + WebhookEndpoint models + migration + resetDb`。

---

### Task 1: EncryptionService(本批核心新增)

**Files:**
- Create: `apps/api/src/common/encryption/encryption.service.ts`
- Create: `apps/api/src/common/encryption/encryption.module.ts`
- Create: `apps/api/test/encryption.e2e-spec.ts`(单测,跑在 e2e jest 配置下)
- Modify: `apps/api/src/app.module.ts`(imports 加 EncryptionModule)
- Modify: `apps/api/src/main.ts`(fail-fast)
- Modify: `apps/api/.env.example`

- [ ] **Step 1: 写 EncryptionService**

Create `apps/api/src/common/encryption/encryption.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor() {
    const raw = process.env.FIELD_ENCRYPTION_KEY ?? '';
    if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
      throw new Error('FIELD_ENCRYPTION_KEY must be 64 hex chars (32 bytes).');
    }
    this.key = Buffer.from(raw, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
  }

  decrypt(payload: string): string {
    const parts = payload.split(':');
    if (parts.length !== 3) throw new Error('Invalid ciphertext format.');
    const [ivHex, tagHex, dataHex] = parts;
    const decipher = createDecipheriv(ALGO, this.key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
  }
}
```

- [ ] **Step 2: 写 EncryptionModule**

Create `apps/api/src/common/encryption/encryption.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';

@Global()
@Module({ providers: [EncryptionService], exports: [EncryptionService] })
export class EncryptionModule {}
```

- [ ] **Step 3: 写失败测试**

Create `apps/api/test/encryption.e2e-spec.ts`:

```ts
import { EncryptionService } from '../src/common/encryption/encryption.service';

describe('EncryptionService', () => {
  const KEY = '0000000000000000000000000000000000000000000000000000000000000000';
  let svc: EncryptionService;
  beforeAll(() => { process.env.FIELD_ENCRYPTION_KEY = KEY; svc = new EncryptionService(); });

  it('round-trips plaintext', () => {
    const plain = 'sk-live-super-secret-123';
    const enc = svc.encrypt(plain);
    expect(enc).not.toContain(plain);
    expect(enc.split(':')).toHaveLength(3);
    expect(svc.decrypt(enc)).toBe(plain);
  });

  it('detects tampering (authTag)', () => {
    const enc = svc.encrypt('hello');
    const [iv, tag, data] = enc.split(':');
    const flipped = data.slice(0, -1) + (data.slice(-1) === '0' ? '1' : '0');
    expect(() => svc.decrypt(`${iv}:${tag}:${flipped}`)).toThrow();
  });

  it('rejects bad key length in constructor', () => {
    const prev = process.env.FIELD_ENCRYPTION_KEY;
    process.env.FIELD_ENCRYPTION_KEY = 'tooshort';
    expect(() => new EncryptionService()).toThrow(/64 hex/);
    process.env.FIELD_ENCRYPTION_KEY = prev;
  });
});
```

- [ ] **Step 4: 跑测试(应失败 —— 文件未实现前 / 实现后通过)**

Run:
```
cd /e/code/aistudio/apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" FIELD_ENCRYPTION_KEY="0000000000000000000000000000000000000000000000000000000000000000" npx jest --runInBand --config test/jest-e2e.json encryption.e2e-spec.ts
```
Expected: 3 passed(Step 1-2 已实现 service,故此处直接 PASS)。

- [ ] **Step 5: app.module.ts 注册 EncryptionModule**

在 `apps/api/src/app.module.ts` import PrismaModule 那行下加:
```ts
import { EncryptionModule } from './common/encryption/encryption.module';
```
imports 数组里 PrismaModule 之后加入 `EncryptionModule`。

- [ ] **Step 6: main.ts fail-fast**

在 `apps/api/src/main.ts` 的 JWT_SECRET 检查块之后加:
```ts
  if (!process.env.FIELD_ENCRYPTION_KEY) {
    throw new Error('FIELD_ENCRYPTION_KEY is required but not set. Refusing to start.');
  }
```

- [ ] **Step 7: .env.example 加一行**

在 `apps/api/.env.example` 末尾加:
```
# 32-byte AES-256-GCM key for field encryption. Generate: openssl rand -hex 32
FIELD_ENCRYPTION_KEY="0000000000000000000000000000000000000000000000000000000000000000"
```

- [ ] **Step 8: 跑一个已有 e2e 确认 AppModule 仍能 bootstrap(带新 env)**

Run:
```
cd /e/code/aistudio/apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" FIELD_ENCRYPTION_KEY="0000000000000000000000000000000000000000000000000000000000000000" npx jest --runInBand --config test/jest-e2e.json media.e2e-spec.ts
```
Expected: media 全 PASS(证明 EncryptionModule 注册后 app 正常启动)。

- [ ] **Step 9: lint**

Run: `cd /e/code/aistudio && npm run lint`
Expected: 0 error。

- [ ] **Step 10: Commit**

```bash
cd /e/code/aistudio && git add apps/api/src/common/encryption apps/api/test/encryption.e2e-spec.ts apps/api/src/app.module.ts apps/api/src/main.ts apps/api/.env.example && git commit -m "feat(api): add EncryptionService (AES-256-GCM, global module)"
```

---

### Task 2: apiKey 后端资源(加密 secret)

**Files:**
- Create: `apps/api/src/api-key/dto.ts`
- Create: `apps/api/src/api-key/api-key.service.ts`
- Create: `apps/api/src/api-key/api-key.controller.ts`
- Create: `apps/api/src/api-key/api-key.module.ts`
- Create: `apps/api/test/api-key.e2e-spec.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: dto.ts**

```ts
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const STATUSES = ['active', 'rotating', 'revoked', 'expired'] as const;

export class CreateApiKeyDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) name!: string;
  @IsString() @MinLength(1) secret!: string;
  @IsOptional() @IsString() prefix?: string;
  @IsOptional() @IsString() last4?: string;
  @IsOptional() @IsString() keyPreview?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsInt() expiresAt?: number;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateApiKeyDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() secret?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsInt() expiresAt?: number;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListApiKeyQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
```

注:`secret` 在 Create 必填、Update 可选;`expiresAt` 是毫秒时间戳(前端 number),service 落库前转 Date。

- [ ] **Step 2: api-key.service.ts(覆写 create/update/list/get 处理加密与剥离)**

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery, CursorPage } from '../common/resource/resource-query.dto';
import { ListApiKeyQuery } from './dto';

type Row = { id: string; secretCiphertext?: string | null; expiresAt?: Date | null; lastUsedAt?: Date | null; [k: string]: unknown };

function deriveLast4(secret: string): string {
  return secret.trim().replace(/\s+/g, '').slice(-4) || '0000';
}
function derivePrefix(secret: string): string {
  return secret.trim().split('-')[0] || 'sk';
}
function toMs(value: unknown): number | null {
  if (!value) return null;
  const t = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(t) ? t : null;
}

@Injectable()
export class ApiKeyService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService, private encryption: EncryptionService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.apiKey as unknown as PrismaResourceDelegate; }
  protected entityName = 'ApiKey';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListApiKeyQuery;
    return { workspaceId, ...(q.status ? { status: q.status } : {}) };
  }

  // 剥离 secretCiphertext,expiresAt/lastUsedAt 转毫秒
  private sanitize(row: Row): Record<string, unknown> {
    const { secretCiphertext, ...rest } = row;
    void secretCiphertext;
    return { ...rest, expiresAt: toMs(row.expiresAt), lastUsedAt: toMs(row.lastUsedAt) };
  }

  async list(workspaceId: string, query: CursorQuery): Promise<CursorPage<{ id: string }>> {
    const page = await super.list(workspaceId, query);
    return { items: page.items.map((r) => this.sanitize(r as Row) as { id: string }), nextCursor: page.nextCursor };
  }

  async get(workspaceId: string, id: string): Promise<{ id: string }> {
    const row = await super.get(workspaceId, id);
    return this.sanitize(row as Row) as { id: string };
  }

  async create(workspaceId: string, data: Record<string, unknown>): Promise<{ id: string }> {
    const secret = String(data.secret ?? '');
    const last4 = deriveLast4(secret);
    const prefix = String(data.prefix ?? derivePrefix(secret));
    const persisted = {
      ...data,
      prefix,
      last4,
      keyPreview: String(data.keyPreview ?? `${prefix}-...${last4}`),
      secretCiphertext: this.encryption.encrypt(secret),
      expiresAt: data.expiresAt ? new Date(Number(data.expiresAt)) : null,
    };
    delete (persisted as Record<string, unknown>).secret;
    const row = await super.create(workspaceId, persisted);
    return this.sanitize(row as Row) as { id: string };
  }

  async update(workspaceId: string, id: string, data: Record<string, unknown>): Promise<{ id: string }> {
    const patch: Record<string, unknown> = { ...data };
    if (typeof data.secret === 'string' && data.secret.trim()) {
      const secret = data.secret.trim();
      patch.secretCiphertext = this.encryption.encrypt(secret);
      patch.last4 = deriveLast4(secret);
      patch.prefix = derivePrefix(secret);
      patch.keyPreview = `${patch.prefix}-...${patch.last4}`;
    }
    delete patch.secret;
    if ('expiresAt' in patch) patch.expiresAt = patch.expiresAt ? new Date(Number(patch.expiresAt)) : null;
    const row = await super.update(workspaceId, id, patch);
    return this.sanitize(row as Row) as { id: string };
  }
}
```

- [ ] **Step 3: api-key.controller.ts**

```ts
import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateApiKeyDto, UpdateApiKeyDto, ListApiKeyQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/api-keys',
  createDto: CreateApiKeyDto, updateDto: UpdateApiKeyDto, listQuery: ListApiKeyQuery,
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/api-keys')
export class ApiKeyController extends Base {}
```

- [ ] **Step 4: api-key.module.ts**

```ts
import { Module } from '@nestjs/common';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [ApiKeyController],
  providers: [ApiKeyService, { provide: RESOURCE_SERVICE, useExisting: ApiKeyService }],
})
export class ApiKeyModule {}
```

- [ ] **Step 5: app.module.ts 注册**

import 加 `import { ApiKeyModule } from './api-key/api-key.module';`,imports 数组(SettingsModule 后)加 `ApiKeyModule`。

- [ ] **Step 6: 写 e2e** — Create `apps/api/test/api-key.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('ApiKey resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('create encrypts secret, never returns ciphertext', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'apikey1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/api-keys`)
      .send({ name: 'CI key', secret: 'sk-live-abcd1234' })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.last4).toBe('1234');
    expect(created.body.value.secretCiphertext).toBeUndefined();
    expect(created.body.value.secret).toBeUndefined();
    const dbRow = await prisma.apiKey.findUnique({ where: { id } });
    expect(dbRow?.secretCiphertext).toBeTruthy();
    expect(dbRow?.secretCiphertext).not.toContain('sk-live-abcd1234');
    expect(dbRow?.secretCiphertext?.split(':')).toHaveLength(3);
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/api-keys/${id}`)).expect(200);
    expect(got.body.value.secretCiphertext).toBeUndefined();
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/api-keys`)).expect(200);
    expect(listed.body.value.items[0].secretCiphertext).toBeUndefined();
    expect(listed.body.value.items[0].last4).toBe('1234');
  });

  it('rejects unknown field (whitelist)', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'apikeywl@test.dev');
    await auth(accessToken)(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/api-keys`)
      .send({ name: 'X', secret: 'sk-x', rawKey: 'leak' })).expect(400);
  });

  it('workspace isolation: cross-tenant get → 404', async () => {
    const a1 = await registerUser(app, 'apikeyiso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/api-keys`).send({ name: 'S', secret: 'sk-secret' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'apikeyiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/api-keys/${id}`)).expect(404);
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'apikeym1@test.dev');
    const a2 = await registerUser(app, 'apikeym2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/api-keys`)).expect(403);
  });
});
```

- [ ] **Step 7: 跑 e2e**

Run:
```
cd /e/code/aistudio/apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" FIELD_ENCRYPTION_KEY="0000000000000000000000000000000000000000000000000000000000000000" npx jest --runInBand --config test/jest-e2e.json api-key.e2e-spec.ts
```
Expected: 4 passed。

- [ ] **Step 8: lint** — `cd /e/code/aistudio && npm run lint` → 0 error。

- [ ] **Step 9: Commit**

```bash
cd /e/code/aistudio && git add apps/api/src/api-key apps/api/test/api-key.e2e-spec.ts apps/api/src/app.module.ts && git commit -m "feat(api): add api-key resource with encrypted secret"
```

---

### Task 3: webhook 后端资源(加密 signingSecret)

**Files:**
- Create: `apps/api/src/webhook/dto.ts`
- Create: `apps/api/src/webhook/webhook.service.ts`
- Create: `apps/api/src/webhook/webhook.controller.ts`
- Create: `apps/api/src/webhook/webhook.module.ts`
- Create: `apps/api/test/webhook.e2e-spec.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: dto.ts**

```ts
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const STATUSES = ['active', 'disabled', 'failing'] as const;

export class CreateWebhookDto {
  @IsOptional() @IsString() id?: string;
  @IsString() @MinLength(1) name!: string;
  @IsString() @MinLength(1) url!: string;
  @IsString() @MinLength(1) signingSecret!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) events?: string[];
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsString() signingSecretLast4?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateWebhookDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() @MinLength(1) url?: string;
  @IsOptional() @IsString() signingSecret?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) events?: string[];
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsInt() @Min(0) failureCount?: number;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class ListWebhookQuery {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
}
```

- [ ] **Step 2: webhook.service.ts(覆写 create/update/list/get)**

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery, CursorPage } from '../common/resource/resource-query.dto';
import { ListWebhookQuery } from './dto';

type Row = { id: string; signingSecretCiphertext?: string | null; lastDeliveredAt?: Date | null; [k: string]: unknown };

function deriveLast4(secret: string): string {
  return secret.trim().replace(/\s+/g, '').slice(-4) || '0000';
}
function toMs(value: unknown): number | null {
  if (!value) return null;
  const t = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(t) ? t : null;
}

@Injectable()
export class WebhookService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService, private encryption: EncryptionService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.webhookEndpoint as unknown as PrismaResourceDelegate; }
  protected entityName = 'WebhookEndpoint';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListWebhookQuery;
    return { workspaceId, ...(q.status ? { status: q.status } : {}) };
  }

  private sanitize(row: Row): Record<string, unknown> {
    const { signingSecretCiphertext, ...rest } = row;
    void signingSecretCiphertext;
    return { ...rest, lastDeliveredAt: toMs(row.lastDeliveredAt) };
  }

  async list(workspaceId: string, query: CursorQuery): Promise<CursorPage<{ id: string }>> {
    const page = await super.list(workspaceId, query);
    return { items: page.items.map((r) => this.sanitize(r as Row) as { id: string }), nextCursor: page.nextCursor };
  }

  async get(workspaceId: string, id: string): Promise<{ id: string }> {
    const row = await super.get(workspaceId, id);
    return this.sanitize(row as Row) as { id: string };
  }

  async create(workspaceId: string, data: Record<string, unknown>): Promise<{ id: string }> {
    const secret = String(data.signingSecret ?? '');
    const persisted = {
      ...data,
      events: Array.isArray(data.events) ? data.events : [],
      signingSecretLast4: String(data.signingSecretLast4 ?? deriveLast4(secret)),
      signingSecretCiphertext: this.encryption.encrypt(secret),
    };
    delete (persisted as Record<string, unknown>).signingSecret;
    const row = await super.create(workspaceId, persisted);
    return this.sanitize(row as Row) as { id: string };
  }

  async update(workspaceId: string, id: string, data: Record<string, unknown>): Promise<{ id: string }> {
    const patch: Record<string, unknown> = { ...data };
    if (typeof data.signingSecret === 'string' && data.signingSecret.trim()) {
      const secret = data.signingSecret.trim();
      patch.signingSecretCiphertext = this.encryption.encrypt(secret);
      patch.signingSecretLast4 = deriveLast4(secret);
    }
    delete patch.signingSecret;
    const row = await super.update(workspaceId, id, patch);
    return this.sanitize(row as Row) as { id: string };
  }
}
```

- [ ] **Step 3: webhook.controller.ts**

```ts
import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateWebhookDto, UpdateWebhookDto, ListWebhookQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/webhooks',
  createDto: CreateWebhookDto, updateDto: UpdateWebhookDto, listQuery: ListWebhookQuery,
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/webhooks')
export class WebhookController extends Base {}
```

- [ ] **Step 4: webhook.module.ts**

```ts
import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [WebhookController],
  providers: [WebhookService, { provide: RESOURCE_SERVICE, useExisting: WebhookService }],
})
export class WebhookModule {}
```

- [ ] **Step 5: app.module.ts 注册**

import 加 `import { WebhookModule } from './webhook/webhook.module';`,imports 数组(ApiKeyModule 后)加 `WebhookModule`。

- [ ] **Step 6: 写 e2e** — Create `apps/api/test/webhook.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Webhook resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('create encrypts signingSecret, never returns ciphertext', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'wh1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/webhooks`)
      .send({ name: 'Order hook', url: 'https://ex.com/h', signingSecret: 'whsec-abcd9876', events: ['order.created'] })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.signingSecretLast4).toBe('9876');
    expect(created.body.value.signingSecretCiphertext).toBeUndefined();
    expect(created.body.value.signingSecret).toBeUndefined();
    expect(created.body.value.events).toEqual(['order.created']);
    const dbRow = await prisma.webhookEndpoint.findUnique({ where: { id } });
    expect(dbRow?.signingSecretCiphertext).toBeTruthy();
    expect(dbRow?.signingSecretCiphertext).not.toContain('whsec-abcd9876');
    expect(dbRow?.signingSecretCiphertext?.split(':')).toHaveLength(3);
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/webhooks/${id}`)).expect(200);
    expect(got.body.value.signingSecretCiphertext).toBeUndefined();
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/webhooks`)).expect(200);
    expect(listed.body.value.items[0].signingSecretCiphertext).toBeUndefined();
    expect(listed.body.value.items[0].signingSecretLast4).toBe('9876');
  });

  it('rejects unknown field (whitelist)', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'whwl@test.dev');
    await auth(accessToken)(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/webhooks`)
      .send({ name: 'X', url: 'https://ex.com', signingSecret: 'whsec-x', rawSecret: 'leak' })).expect(400);
  });

  it('workspace isolation: cross-tenant get → 404', async () => {
    const a1 = await registerUser(app, 'whiso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/webhooks`).send({ name: 'S', url: 'https://ex.com', signingSecret: 'whsec-secret' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'whiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/webhooks/${id}`)).expect(404);
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'whm1@test.dev');
    const a2 = await registerUser(app, 'whm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/webhooks`)).expect(403);
  });
});
```

- [ ] **Step 7: 跑 e2e**

Run:
```
cd /e/code/aistudio/apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" FIELD_ENCRYPTION_KEY="0000000000000000000000000000000000000000000000000000000000000000" npx jest --runInBand --config test/jest-e2e.json webhook.e2e-spec.ts
```
Expected: 4 passed。

- [ ] **Step 8: lint** — `cd /e/code/aistudio && npm run lint` → 0 error。

- [ ] **Step 9: Commit**

```bash
cd /e/code/aistudio && git add apps/api/src/webhook apps/api/test/webhook.e2e-spec.ts apps/api/src/app.module.ts && git commit -m "feat(api): add webhook resource with encrypted signing secret"
```

---

### Task 4: 前端 apiKeyRepository 写穿透

**Files:**
- Modify: `src/lib/data/apiKeyRepository.ts`
- Create: `scripts/api-key-repository.test.ts`
- Modify: `package.json`

照 mediaRepository 模板。要点:
- 顶部 import:`import { apiClient as defaultApiClient, type ApiClient } from './apiClient';`
- 文件末尾加:
  ```ts
  let apiKeyApiClient: ApiClient = defaultApiClient;
  export function __setApiKeyApiClientForTest(client: ApiClient): void { apiKeyApiClient = client; }
  const apiKeyCache = new Map<string, WorkspaceApiKey[]>(); // key = workspaceId
  ```
- `randomToken()`(第89-93行)改用密码学安全随机:
  ```ts
  function randomToken(): string {
    const bytes = new Uint8Array(16);
    (globalThis.crypto ?? require('node:crypto').webcrypto).getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  ```
  注:浏览器有 `globalThis.crypto`;node tsx 测试环境用 `node:crypto` 的 `webcrypto`。用 `globalThis.crypto ?? ...` 兜底。

- [ ] **Step 1: 改写 loadWorkspaceApiKeys(configured 读缓存)**

```ts
export function loadWorkspaceApiKeys(context: ApiKeyRepositoryContext): WorkspaceApiKey[] {
  if (apiKeyApiClient.configured) return apiKeyCache.get(context.workspaceId) ?? [];
  return readApiKeys(context);
}
```

- [ ] **Step 2: createWorkspaceApiKey 加写穿透**

在现有 `writeApiKeys([record, ...], context);` 之后、`return { record, secret };` 之前插入:
```ts
  if (apiKeyApiClient.configured) {
    apiKeyCache.set(context.workspaceId, sortApiKeys([record, ...(apiKeyCache.get(context.workspaceId) ?? [])]));
    void apiKeyApiClient.post(context.workspaceId, 'api-keys', {
      id: record.id, name: record.name, secret,
      status: record.status, expiresAt: record.expiresAt ?? undefined, metadata: record.metadata,
    }).then((r) => { if (!r.ok) console.error('createWorkspaceApiKey write-through failed', r); })
      .catch((e) => console.error('createWorkspaceApiKey write-through failed', e));
  }
```
注:明文 `secret` 通过 POST 给后端加密;`prefix`/`last4`/`keyPreview` 后端自派生,不发。

- [ ] **Step 3: 加 hydrateWorkspaceApiKeys(文件末尾)**

```ts
export async function hydrateWorkspaceApiKeys(context: ApiKeyRepositoryContext): Promise<void> {
  if (!apiKeyApiClient.configured) return;
  const res = await apiKeyApiClient.get<{ items: WorkspaceApiKey[]; nextCursor: string | null }>(
    context.workspaceId, 'api-keys');
  if (res.ok && res.value && Array.isArray(res.value.items)) {
    apiKeyCache.set(context.workspaceId, sortApiKeys(res.value.items.map((k) => normalizeApiKey(k, context))));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('workspace_api_keys_updated', { detail: { workspaceId: context.workspaceId } }));
    }
  }
}
```

- [ ] **Step 4: revoke/rotate 加缓存+写穿透(PATCH)**

`revokeWorkspaceApiKey` 在 `writeApiKeys(records, context);` 后、return 前加:
```ts
  if (apiKeyApiClient.configured && revoked) {
    const rev: WorkspaceApiKey = revoked;
    apiKeyCache.set(context.workspaceId, sortApiKeys((apiKeyCache.get(context.workspaceId) ?? []).map((k) => (k.id === rev.id ? rev : k))));
    void apiKeyApiClient.patch(context.workspaceId, `api-keys/${rev.id}`, { status: rev.status, expiresAt: rev.expiresAt ?? undefined })
      .then((r) => { if (!r.ok) console.error('revokeWorkspaceApiKey write-through failed', r); })
      .catch((e) => console.error('revokeWorkspaceApiKey write-through failed', e));
  }
```
注:rotate 的双 key(previous 改 status + replacement 新建)逻辑保留前端;configured 时 replacement 走 create 写穿透(同 Step 2 模式:`apiKeyApiClient.post(...secret...)`)、previous 走 PATCH status。在 rotate 的 `writeApiKeys([replacement, previous, ...])` 后加:
```ts
  if (apiKeyApiClient.configured) {
    apiKeyCache.set(context.workspaceId, sortApiKeys([replacement, previous, ...(apiKeyCache.get(context.workspaceId) ?? []).filter((k) => k.id !== keyId)]));
    void apiKeyApiClient.post(context.workspaceId, 'api-keys', {
      id: replacement.id, name: replacement.name, secret,
      status: replacement.status, expiresAt: replacement.expiresAt ?? undefined, metadata: replacement.metadata,
    }).then((r) => { if (!r.ok) console.error('rotateWorkspaceApiKey create write-through failed', r); }).catch((e) => console.error(e));
    void apiKeyApiClient.patch(context.workspaceId, `api-keys/${previous.id}`, { status: previous.status, expiresAt: previous.expiresAt ?? undefined })
      .then((r) => { if (!r.ok) console.error('rotateWorkspaceApiKey patch write-through failed', r); }).catch((e) => console.error(e));
  }
```

- [ ] **Step 5: 写测试 scripts/api-key-repository.test.ts**

```ts
import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setApiKeyApiClientForTest,
  hydrateWorkspaceApiKeys,
  loadWorkspaceApiKeys,
  createWorkspaceApiKey,
} from '../src/lib/data/apiKeyRepository.ts';

let lastPost: { path: string; body: any } | null = null;
function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'api-keys') return { ok: true, value: { items: [{ id: 'srv1', name: 'Server Key', last4: '0001', status: 'active' }], nextCursor: null } } as any;
      return { ok: true, value: null } as any;
    },
    post: async (_ws: string, path: string, body: any) => { lastPost = { path, body }; return { ok: true, value: {} } as any; },
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async () => ({ ok: true, value: {} }) as any,
  } as any;
}

async function run() {
  const memA = new Map<string, string>();
  const storageA = { getItem: (k: string) => memA.get(k) ?? null, setItem: (k: string, v: string) => void memA.set(k, v), removeItem: (k: string) => void memA.delete(k) } as any;

  __setApiKeyApiClientForTest(fakeApi(true));
  await hydrateWorkspaceApiKeys({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceApiKeys({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].name, 'Server Key');

  lastPost = null;
  const { secret } = createWorkspaceApiKey({ name: 'New Key', secret: 'sk-live-zzzz4321' }, { workspaceId: 'wsA', storage: storageA });
  assert.equal(secret, 'sk-live-zzzz4321');
  assert.ok(lastPost, 'POST write-through fired');
  assert.equal(lastPost!.path, 'api-keys');
  assert.equal(lastPost!.body.secret, 'sk-live-zzzz4321'); // 明文 secret 发后端加密
  const afterCreate = loadWorkspaceApiKeys({ workspaceId: 'wsA', storage: storageA });
  assert.equal(afterCreate.some((k) => k.name === 'New Key'), true);

  // 未配置:localStorage 兜底
  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setApiKeyApiClientForTest(fakeApi(false));
  createWorkspaceApiKey({ name: 'Local Key', secret: 'sk-local-1111' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceApiKeys({ workspaceId: 'wsB', storage });
  assert.equal(local.some((k) => k.name === 'Local Key'), true);

  console.log('api-key repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 6: package.json 加脚本**

加 `"test:api-key-repo": "tsx scripts/api-key-repository.test.ts"`,并把 `&& npm run test:api-key-repo` 挂到 `test:p0-specialized` 链尾(紧跟 `test:settings-repo`)。

- [ ] **Step 7: 跑测试 + lint**

Run: `cd /e/code/aistudio && npx tsx scripts/api-key-repository.test.ts` → `api-key repository passed`
Run: `cd /e/code/aistudio && npm run lint` → 0 error。

- [ ] **Step 8: Commit**

```bash
cd /e/code/aistudio && git add src/lib/data/apiKeyRepository.ts scripts/api-key-repository.test.ts package.json && git commit -m "feat(web): wire apiKeyRepository to backend (plaintext POST, encrypted server-side)"
```

---

### Task 5: 前端 webhookRepository 写穿透

**Files:**
- Modify: `src/lib/data/webhookRepository.ts`
- Create: `scripts/webhook-repository.test.ts`
- Modify: `package.json`

照 mediaRepository / apiKeyRepository 模板。要点:
- 顶部 import:`import { apiClient as defaultApiClient, type ApiClient } from './apiClient';`
- 文件末尾加:
  ```ts
  let webhookApiClient: ApiClient = defaultApiClient;
  export function __setWebhookApiClientForTest(client: ApiClient): void { webhookApiClient = client; }
  const webhookCache = new Map<string, WorkspaceWebhookEndpoint[]>(); // key = workspaceId
  ```
- `randomToken()`(第106-108行)改用密码学安全随机:
  ```ts
  function randomToken(): string {
    const bytes = new Uint8Array(16);
    (globalThis.crypto ?? require('node:crypto').webcrypto).getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  ```

- [ ] **Step 1: 改写 loadWorkspaceWebhookEndpoints**

```ts
export function loadWorkspaceWebhookEndpoints(context: WebhookRepositoryContext): WorkspaceWebhookEndpoint[] {
  if (webhookApiClient.configured) return webhookCache.get(context.workspaceId) ?? [];
  return readWebhookEndpoints(context);
}
```

- [ ] **Step 2: createWorkspaceWebhookEndpoint 加写穿透**

在 `writeWebhookEndpoints([record, ...], context);` 之后、`return { record, signingSecret };` 之前插入:
```ts
  if (webhookApiClient.configured) {
    webhookCache.set(context.workspaceId, sortWebhookEndpoints([record, ...(webhookCache.get(context.workspaceId) ?? [])]));
    void webhookApiClient.post(context.workspaceId, 'webhooks', {
      id: record.id, name: record.name, url: record.url, signingSecret,
      events: record.events, status: record.status, metadata: record.metadata,
    }).then((r) => { if (!r.ok) console.error('createWorkspaceWebhookEndpoint write-through failed', r); })
      .catch((e) => console.error('createWorkspaceWebhookEndpoint write-through failed', e));
  }
```

- [ ] **Step 3: updateWorkspaceWebhookEndpoint 加缓存+PATCH 写穿透**

在 `writeWebhookEndpoints(endpoints, context);` 之后、return 前插入:
```ts
  if (webhookApiClient.configured && updatedEndpoint) {
    const u: WorkspaceWebhookEndpoint = updatedEndpoint;
    webhookCache.set(context.workspaceId, sortWebhookEndpoints((webhookCache.get(context.workspaceId) ?? []).map((w) => (w.id === u.id ? u : w))));
    const body: Record<string, unknown> = {
      name: u.name, url: u.url, events: u.events, status: u.status,
      failureCount: u.failureCount, metadata: u.metadata,
    };
    if (patch.signingSecret?.trim()) body.signingSecret = patch.signingSecret.trim();
    void webhookApiClient.patch(context.workspaceId, `webhooks/${u.id}`, body)
      .then((r) => { if (!r.ok) console.error('updateWorkspaceWebhookEndpoint write-through failed', r); })
      .catch((e) => console.error('updateWorkspaceWebhookEndpoint write-through failed', e));
  }
```

- [ ] **Step 4: deleteWorkspaceWebhookEndpoint 加缓存+DELETE 写穿透**

在 `writeWebhookEndpoints(remaining, context);` 之后、`return true;` 之前插入:
```ts
  if (webhookApiClient.configured) {
    webhookCache.set(context.workspaceId, (webhookCache.get(context.workspaceId) ?? []).filter((w) => w.id !== endpointId));
    void webhookApiClient.del(context.workspaceId, `webhooks/${endpointId}`)
      .then((r) => { if (!r.ok) console.error('deleteWorkspaceWebhookEndpoint write-through failed', r); })
      .catch((e) => console.error('deleteWorkspaceWebhookEndpoint write-through failed', e));
  }
```

- [ ] **Step 5: 加 hydrateWorkspaceWebhookEndpoints(文件末尾)**

```ts
export async function hydrateWorkspaceWebhookEndpoints(context: WebhookRepositoryContext): Promise<void> {
  if (!webhookApiClient.configured) return;
  const res = await webhookApiClient.get<{ items: WorkspaceWebhookEndpoint[]; nextCursor: string | null }>(
    context.workspaceId, 'webhooks');
  if (res.ok && res.value && Array.isArray(res.value.items)) {
    webhookCache.set(context.workspaceId, sortWebhookEndpoints(res.value.items.map((w) => normalizeWebhookEndpoint(w, context))));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('workspace_webhooks_updated', { detail: { workspaceId: context.workspaceId } }));
    }
  }
}
```

- [ ] **Step 6: 写测试 scripts/webhook-repository.test.ts**

```ts
import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setWebhookApiClientForTest,
  hydrateWorkspaceWebhookEndpoints,
  loadWorkspaceWebhookEndpoints,
  createWorkspaceWebhookEndpoint,
  deleteWorkspaceWebhookEndpoint,
} from '../src/lib/data/webhookRepository.ts';

let lastPost: { path: string; body: any } | null = null;
let lastDel: string | null = null;
function fakeApi(configured: boolean): ApiClient {
  return {
    configured,
    get: async (_ws: string, path: string) => {
      if (path === 'webhooks') return { ok: true, value: { items: [{ id: 'srv1', name: 'Server Hook', url: 'https://ex.com', status: 'active', events: ['a'], signingSecretLast4: '0001' }], nextCursor: null } } as any;
      return { ok: true, value: null } as any;
    },
    post: async (_ws: string, path: string, body: any) => { lastPost = { path, body }; return { ok: true, value: {} } as any; },
    patch: async () => ({ ok: true, value: {} }) as any,
    del: async (_ws: string, path: string) => { lastDel = path; return { ok: true, value: {} } as any; },
  } as any;
}

async function run() {
  const memA = new Map<string, string>();
  const storageA = { getItem: (k: string) => memA.get(k) ?? null, setItem: (k: string, v: string) => void memA.set(k, v), removeItem: (k: string) => void memA.delete(k) } as any;

  __setWebhookApiClientForTest(fakeApi(true));
  await hydrateWorkspaceWebhookEndpoints({ workspaceId: 'wsA', storage: storageA });
  const fromBackend = loadWorkspaceWebhookEndpoints({ workspaceId: 'wsA', storage: storageA });
  assert.equal(fromBackend.length, 1);
  assert.equal(fromBackend[0].name, 'Server Hook');

  lastPost = null;
  const { signingSecret } = createWorkspaceWebhookEndpoint({ name: 'New Hook', url: 'https://ex.com/n', events: ['order.created'], signingSecret: 'whsec-zzzz4321' }, { workspaceId: 'wsA', storage: storageA });
  assert.equal(signingSecret, 'whsec-zzzz4321');
  assert.ok(lastPost, 'POST write-through fired');
  assert.equal(lastPost!.path, 'webhooks');
  assert.equal(lastPost!.body.signingSecret, 'whsec-zzzz4321'); // 明文 secret 发后端加密
  const afterCreate = loadWorkspaceWebhookEndpoints({ workspaceId: 'wsA', storage: storageA });
  const newHook = afterCreate.find((w) => w.name === 'New Hook');
  assert.ok(newHook, 'new hook in cache');

  lastDel = null;
  deleteWorkspaceWebhookEndpoint(newHook!.id, { workspaceId: 'wsA', storage: storageA });
  assert.equal(lastDel, `webhooks/${newHook!.id}`); // DELETE write-through

  // 未配置:localStorage 兜底
  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setWebhookApiClientForTest(fakeApi(false));
  createWorkspaceWebhookEndpoint({ name: 'Local Hook', url: 'https://ex.com/l', events: [], signingSecret: 'whsec-local1111' }, { workspaceId: 'wsB', storage });
  const local = loadWorkspaceWebhookEndpoints({ workspaceId: 'wsB', storage });
  assert.equal(local.some((w) => w.name === 'Local Hook'), true);

  console.log('webhook repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 7: package.json 加脚本**

加 `"test:webhook-repo": "tsx scripts/webhook-repository.test.ts"`,并把 `&& npm run test:webhook-repo` 挂到 `test:p0-specialized` 链尾(紧跟 `test:api-key-repo`)。

- [ ] **Step 8: 跑测试 + lint**

Run: `cd /e/code/aistudio && npx tsx scripts/webhook-repository.test.ts` → `webhook repository passed`
Run: `cd /e/code/aistudio && npm run lint` → 0 error。

- [ ] **Step 9: Commit**

```bash
cd /e/code/aistudio && git add src/lib/data/webhookRepository.ts scripts/webhook-repository.test.ts package.json && git commit -m "feat(web): wire webhookRepository to backend (plaintext POST, encrypted server-side)"
```

---

### Task 6: 全量验收

**Files:** 无新增,仅运行验证 + 更新 memory。

- [ ] **Step 1: 后端全量 e2e(预期 31 suites:28 已有 + encryption + api-key + webhook)**

Run:
```
cd /e/code/aistudio/apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" FIELD_ENCRYPTION_KEY="0000000000000000000000000000000000000000000000000000000000000000" npx jest --runInBand --config test/jest-e2e.json
```
Expected: 31 suites passed, all tests green。

- [ ] **Step 2: lint** — `cd /e/code/aistudio && npm run lint` → 0 error。

- [ ] **Step 3: build** — `cd /e/code/aistudio && npm run build` → built 成功。

- [ ] **Step 4: test:p0-specialized(含新挂的 test:api-key-repo + test:webhook-repo)**

Run: `cd /e/code/aistudio && npm run test:p0-specialized`
Expected: 全绿,末尾打印 `api-key repository passed` 和 `webhook repository passed`。

- [ ] **Step 5: test:saas-foundation** — `cd /e/code/aistudio && npm run test:saas-foundation` → `saas foundation contract passed`。

- [ ] **Step 6: 更新 memory**

更新 `C:\Users\Administrator\.claude\projects\E--code-aistudio\memory\project_saas_productization.md` 的 ⑤b-4 行,标记已交付,记录:EncryptionService(AES-256-GCM `iv:authTag:ciphertext` hex 三段、全局模块、FIELD_ENCRYPTION_KEY 64-hex)、apiKey/webhook 套基类但覆写 create(加密)/list/get/update(剥离密文)、明文不出后端、前端 POST 明文写穿透、webhook secret 改 crypto 安全随机、e2e suites 数。

- [ ] **Step 7: 汇报 + 询问 push**

汇报全量验收结果、commit 列表,询问用户是否 push origin/main(走 Clash 代理 7897)。**不要自行 push。**

---

## 自审清单(写计划后)

- **Spec 覆盖**:EncryptionService(组件1)→Task 1;apiKey 后端(组件2)→Task 2;webhook 后端(组件3)→Task 3;前端改造(组件4)→Task 4+5;错误处理与测试→各 Task 的 e2e/单测 + Task 6 全量。全覆盖。
- **不做项**:无消费方、无密钥轮换、无取回明文端点、不改调用方组件——计划中均未引入,符合。
- **类型一致性**:`secretCiphertext`/`signingSecretCiphertext` 字段名后端 schema(Task 0)、service sanitize(Task 2/3)、e2e 断言(Task 2/3)一致;前端 `__set{ApiKey,Webhook}ApiClientForTest`、`hydrateWorkspace{ApiKeys,WebhookEndpoints}`、cache 命名一致。
- **关键风险点**:EncryptionModule 进 AppModule 后所有 e2e 需 FIELD_ENCRYPTION_KEY——已在头部约束 + 每个 e2e 命令显式带 env。

