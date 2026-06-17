# ⑤b-3 Settings 单例资源实现计划

依据 spec:`docs/superpowers/specs/2026-06-18-settings-singleton-design.md`
关键:settings 不套资源基类,是 singleton get/put;KV 行表 Setting;两个 ownerId 维度;越权 + workspace 写权限两个安全点;null 值用 Prisma.JsonNull。

**动词已定:ApiClient 只有 get/post/patch/del(无 put),所以写端点统一用 PATCH** —— 后端 controller `@Patch()`、e2e 用 `.patch(`、前端用 `settingsApiClient.patch`。计划下文凡出现 PUT/`.put(`/`@Put()` 一律按 PATCH 实现。

执行方式:Subagent-Driven Development。Task 0(Prisma,我亲自做 migration)+ Task 1(后端 singleton + e2e)+ Task 2(前端 + 单测)+ Task 3(全量验收)。

---

## Task 0: Prisma Setting 模型 + migration + resetDb

**Files:** `apps/api/prisma/schema.prisma`、`apps/api/test/helpers.ts`

- [ ] **Step 1:** Workspace model 反向关系区(`financialRecords FinancialRecord[]` 之后)加:
```prisma
  settings         Setting[]
```
- [ ] **Step 2:** schema.prisma 末尾加 model:
```prisma
model Setting {
  id          String   @id @default(cuid())
  workspaceId String
  ownerId     String
  key         String
  value       Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@unique([workspaceId, ownerId, key])
  @@index([workspaceId, ownerId])
}
```
- [ ] **Step 3:** test/helpers.ts `resetDb`,在 `await prisma.financialRecord.deleteMany();` 之后加:
```typescript
  await prisma.setting.deleteMany();
```
- [ ] **Step 4:** 主库迁移:
```bash
cd apps/api && DATABASE_URL="postgresql://postgres:postgres@localhost:5433/aistudio?schema=public" npx prisma migrate dev --name add_setting
```
- [ ] **Step 5:** 测试库:
```bash
cd apps/api && DATABASE_URL="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" npx prisma migrate deploy
```
- [ ] **Step 6:** Commit:
```bash
git add apps/api/prisma apps/api/test/helpers.ts
git commit -m "feat(api): add Setting model + migration + resetDb"
```

---

## Task 1: 后端 settings singleton 端点 + e2e

**Files:** Create `apps/api/src/settings/{dto.ts,settings.service.ts,settings.controller.ts,settings.module.ts}`、Modify `apps/api/src/app.module.ts`、Create `apps/api/test/settings.e2e-spec.ts`

- [ ] **Step 1: 写 e2e(先失败)** — Create `apps/api/test/settings.e2e-spec.ts`:
```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Settings singleton (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('per-user round-trip: put / get / delete', async () => {
    const { accessToken, workspaceId, userId } = await registerUser(app, 'set1@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/settings?ownerId=${userId}`)
      .send({ patch: { theme: 'dark', pinned: ['a', 'b'] } })).expect(200);
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/settings?ownerId=${userId}`)).expect(200);
    expect(got.body.value.theme).toBe('dark');
    expect(got.body.value.pinned).toEqual(['a', 'b']);
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/settings/theme?ownerId=${userId}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/settings?ownerId=${userId}`)).expect(200);
    expect(after.body.value.theme).toBeUndefined();
    expect(after.body.value.pinned).toEqual(['a', 'b']);
  });

  it('null value stored as null (not deletion)', async () => {
    const { accessToken, workspaceId, userId } = await registerUser(app, 'setnull@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/settings?ownerId=${userId}`)
      .send({ patch: { maybe: null } })).expect(200);
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/settings?ownerId=${userId}`)).expect(200);
    expect(Object.prototype.hasOwnProperty.call(got.body.value, 'maybe')).toBe(true);
    expect(got.body.value.maybe).toBeNull();
  });

  it('ownerId privilege: reading another user settings → 403', async () => {
    const a1 = await registerUser(app, 'setowna@test.dev');
    const a2 = await registerUser(app, 'setownb@test.dev');
    // a2 是 a1.workspace 的非成员,这里先让 a2 自己有 workspace;
    // 用 a1 token 去读 a2.userId 命名空间(同 a1.workspace 内但 ownerId != 自己 != workspace)→ 403
    await auth(a1.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/settings?ownerId=${a2.userId}`)).expect(403);
  });

  it('workspace-level write requires owner/admin', async () => {
    // 注册者默认 role owner。降级一个 member 来测 403。
    const ownerUser = await registerUser(app, 'setwsowner@test.dev');
    // 造一个 member 用户加入同 workspace,role=member
    const memberToken = await (async () => {
      const r = await request(app.getHttpServer()).post('/auth/register')
        .send({ email: 'setwsmember@test.dev', password: 'password123', name: 'M' }).expect(201);
      const uid = r.body.value.user.id;
      await prisma.member.create({ data: { workspaceId: ownerUser.workspaceId, userId: uid, role: 'member' } });
      return r.body.value.accessToken as string;
    })();
    // member 写 workspace 级 → 403
    await auth(memberToken)(request(app.getHttpServer())
      .patch(`/workspaces/${ownerUser.workspaceId}/settings?ownerId=workspace`).send({ patch: { smtp: 'x' } })).expect(403);
    // owner 写 workspace 级 → 200
    await auth(ownerUser.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${ownerUser.workspaceId}/settings?ownerId=workspace`).send({ patch: { smtp: 'x' } })).expect(200);
    // member 读 workspace 级 → 200
    await auth(memberToken)(request(app.getHttpServer())
      .get(`/workspaces/${ownerUser.workspaceId}/settings?ownerId=workspace`)).expect(200);
  });

  it('workspace isolation: non-member → 403', async () => {
    const a1 = await registerUser(app, 'setiso1@test.dev');
    const a2 = await registerUser(app, 'setiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/settings?ownerId=workspace`)).expect(403);
  });

  it('default ownerId = caller userId', async () => {
    const { accessToken, workspaceId, userId } = await registerUser(app, 'setdef@test.dev');
    const a = auth(accessToken);
    // 不传 ownerId 写
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/settings`)
      .send({ patch: { foo: 'bar' } })).expect(200);
    // 显式传自己 userId 读应拿到同一份
    const got = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/settings?ownerId=${userId}`)).expect(200);
    expect(got.body.value.foo).toBe('bar');
  });
});
```
注意:`registerUser`(test/helpers.ts)返回 `{ accessToken, userId, workspaceId }`,已含 userId。若 helper 实际未返回 userId,先 Read 确认并按实际字段调整(必要时从 /auth/me 取)。

- [ ] **Step 2:** 跑确认失败:
```bash
cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json settings.e2e-spec.ts
```

- [ ] **Step 3: dto.ts** — Create `apps/api/src/settings/dto.ts`:
```typescript
import { IsObject, IsOptional, IsString } from 'class-validator';

export class OwnerQuery {
  @IsOptional() @IsString() ownerId?: string;
}

export class PutSettingsDto {
  @IsObject() patch!: Record<string, unknown>;
}
```

- [ ] **Step 4: service** — Create `apps/api/src/settings/settings.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { permissionDenied } from '../common/errors';

const WRITE_ROLES = new Set(['owner', 'admin']);
const WORKSPACE_OWNER = 'workspace';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  resolveOwnerId(
    currentUserId: string,
    role: string | undefined,
    ownerIdParam: string | undefined,
    isWrite: boolean,
  ): string {
    const ownerId = ownerIdParam ?? currentUserId;
    if (ownerId !== currentUserId && ownerId !== WORKSPACE_OWNER) {
      throw permissionDenied('Cannot access settings of another user');
    }
    if (isWrite && ownerId === WORKSPACE_OWNER && (!role || !WRITE_ROLES.has(role))) {
      throw permissionDenied('Only owner/admin can write workspace-level settings');
    }
    return ownerId;
  }

  async getAll(workspaceId: string, ownerId: string): Promise<Record<string, unknown>> {
    const rows = await this.prisma.setting.findMany({ where: { workspaceId, ownerId } });
    return rows.reduce<Record<string, unknown>>((acc, row) => {
      acc[row.key] = row.value === null ? null : row.value;
      return acc;
    }, {});
  }

  async putPatch(workspaceId: string, ownerId: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
    const entries = Object.entries(patch);
    await this.prisma.$transaction(
      entries.map(([key, value]) => {
        const jsonValue = (value === null ? Prisma.JsonNull : value) as Prisma.InputJsonValue | typeof Prisma.JsonNull;
        return this.prisma.setting.upsert({
          where: { workspaceId_ownerId_key: { workspaceId, ownerId, key } },
          create: { workspaceId, ownerId, key, value: jsonValue },
          update: { value: jsonValue },
        });
      }),
    );
    return this.getAll(workspaceId, ownerId);
  }

  async deleteKey(workspaceId: string, ownerId: string, key: string): Promise<Record<string, unknown>> {
    await this.prisma.setting.deleteMany({ where: { workspaceId, ownerId, key } });
    return this.getAll(workspaceId, ownerId);
  }
}
```
注意:Prisma 复合唯一键访问器名是 `workspaceId_ownerId_key`(按 @@unique 字段顺序)。JSON null 用 `Prisma.JsonNull`;读回时 Prisma 把 JsonNull 列读成 JS `null`,故 getAll 里 `row.value === null ? null : row.value` 即可(两分支等价,保留以示意)。

- [ ] **Step 5: controller** — Create `apps/api/src/settings/settings.controller.ts`:
```typescript
import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { SettingsService } from './settings.service';
import { OwnerQuery, PutSettingsDto } from './dto';

@Controller('workspaces/:workspaceId/settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get()
  async getAll(@WorkspaceId() ws: string, @Query() q: OwnerQuery, @CurrentUser() user: { userId: string; role?: string }) {
    const ownerId = this.settings.resolveOwnerId(user.userId, user.role, q.ownerId, false);
    return { value: await this.settings.getAll(ws, ownerId) };
  }

  @Patch()
  async put(@WorkspaceId() ws: string, @Query() q: OwnerQuery, @Body() dto: PutSettingsDto, @CurrentUser() user: { userId: string; role?: string }) {
    const ownerId = this.settings.resolveOwnerId(user.userId, user.role, q.ownerId, true);
    return { value: await this.settings.putPatch(ws, ownerId, dto.patch) };
  }

  @Delete(':key')
  async remove(@WorkspaceId() ws: string, @Param('key') key: string, @Query() q: OwnerQuery, @CurrentUser() user: { userId: string; role?: string }) {
    const ownerId = this.settings.resolveOwnerId(user.userId, user.role, q.ownerId, true);
    return { value: await this.settings.deleteKey(ws, ownerId, key) };
  }
}
```

- [ ] **Step 6: module** — Create `apps/api/src/settings/settings.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({ controllers: [SettingsController], providers: [SettingsService] })
export class SettingsModule {}
```

- [ ] **Step 7:** app.module.ts:import 区加 `import { SettingsModule } from './settings/settings.module';`;imports 数组末尾加 `, SettingsModule`。

- [ ] **Step 8:** 跑 e2e 确认 6 tests PASS:
```bash
cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json settings.e2e-spec.ts
```

- [ ] **Step 9: Commit 后端:**
```bash
git add apps/api/src/settings apps/api/src/app.module.ts apps/api/test/settings.e2e-spec.ts
git commit -m "feat(api): add settings singleton endpoints (per-user/workspace KV)"
```

---

## Task 2: 前端 settingsRepository 写穿透(照 creditRepository)

**Files:** Modify `src/lib/data/settingsRepository.ts`、Create `scripts/settings-repository.test.ts`、Modify `package.json`

- [ ] **Step 1:** 先 Read `src/lib/data/settingsRepository.ts` 整文件 + `src/lib/data/creditRepository.ts`(模板)+ `src/lib/data/apiClient.ts`(接口)。

- [ ] **Step 2:** 改 `src/lib/data/settingsRepository.ts`:

(a) 顶部 import 区(`import { getRepositoryStorage } from './dataBackend';` 之后)加:
```typescript
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';
```

(b) 在现有 `storageKey` 函数之后加 ownerId 解析 + 缓存基础设施:
```typescript
let settingsApiClient: ApiClient = defaultApiClient;
export function __setSettingsApiClientForTest(client: ApiClient): void { settingsApiClient = client; }

const settingsCache = new Map<string, SettingsRecord>(); // key = `${workspaceId}:${ownerId}`

function ownerIdOf(context: SettingsRepositoryContext): string {
  return context.userId ?? 'workspace';
}
function cacheKeyOf(context: SettingsRepositoryContext): string {
  return `${context.workspaceId}:${ownerIdOf(context)}`;
}

export async function hydrateSettings(context: SettingsRepositoryContext): Promise<void> {
  if (!settingsApiClient.configured) return;
  const res = await settingsApiClient.get<SettingsRecord>(
    context.workspaceId, `settings?ownerId=${encodeURIComponent(ownerIdOf(context))}`);
  if (res.ok && res.value && typeof res.value === 'object' && !Array.isArray(res.value)) {
    settingsCache.set(cacheKeyOf(context), res.value as SettingsRecord);
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('settings_updated', {
        detail: { workspaceId: context.workspaceId, userId: context.userId },
      }));
    }
  }
}
```

(c) 改 `readSettings` 让 configured 时优先读缓存(保留 localStorage 作未 hydrate 回退)。把现有 `readSettings` 改为:
```typescript
function readSettings(context: SettingsRepositoryContext): SettingsRecord {
  if (settingsApiClient.configured) {
    const cached = settingsCache.get(cacheKeyOf(context));
    if (cached) return cached;
  }
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(storageKey(context));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as SettingsRecord;
  } catch {
    return {};
  }
}
```

(d) 改 `writeSettings`:configured 时更新缓存 + PUT 写穿透(整份 patch);未配置时保持现有 localStorage。注意 writeSettings 现在拿到的是合并后的整份 settings,写穿透发整份作为 patch(后端逐 key upsert,等价)。改为:
```typescript
function writeSettings(settings: SettingsRecord, context: SettingsRepositoryContext): SettingsRecord {
  if (settingsApiClient.configured) {
    settingsCache.set(cacheKeyOf(context), settings);
    void settingsApiClient.patch(context.workspaceId, `settings?ownerId=${encodeURIComponent(ownerIdOf(context))}`, { patch: settings })
      .then((r) => { if (!r.ok) console.error('writeSettings write-through failed', r); })
      .catch((e) => console.error('writeSettings write-through failed', e));
  } else {
    const storage = getRepositoryStorage(context.storage);
    storage?.setItem(storageKey(context), JSON.stringify(settings));
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('settings_updated', {
      detail: { workspaceId: context.workspaceId, userId: context.userId },
    }));
  }
  return settings;
}
```
注意:apiClient 接口若无 `put`,确认其方法名(spec 调查显示有 get/post/patch/del——**若没有 put**,改用 `post`,并在后端 controller 把 `@Put()` 同时也接受 POST?不行)。**先 Read apiClient.ts 确认是否有 put 方法**;若 ApiClient 只有 get/post/patch/del,则:前端用 `patch` 方法,后端 controller 的写端点同时支持——把后端从 `@Put()` 改为 `@Patch()`(语义同样合适,patch 整份)。e2e 测试里的 `.put(` 也要相应改为 `.patch(`。**保持前后端动词一致**。在报告里说明最终用的是 PUT 还是 PATCH。

(e) `deleteSetting`:现有实现 read→delete key→writeSettings。configured 时除了 writeSettings(会 PUT 整份)外,还应发 DELETE 单 key 以真正删后端行(否则 PUT 整份不含该 key 但后端 upsert 不会删旧行)。改 `deleteSetting`:
```typescript
export function deleteSetting(key: string, context: SettingsRepositoryContext): SettingsRecord {
  const nextSettings = { ...readSettings(context) };
  delete nextSettings[key];
  if (settingsApiClient.configured) {
    settingsCache.set(cacheKeyOf(context), nextSettings);
    void settingsApiClient.del(context.workspaceId, `settings/${encodeURIComponent(key)}?ownerId=${encodeURIComponent(ownerIdOf(context))}`)
      .then((r) => { if (!r.ok) console.error('deleteSetting write-through failed', r); })
      .catch((e) => console.error('deleteSetting write-through failed', e));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('settings_updated', { detail: { workspaceId: context.workspaceId, userId: context.userId } }));
    }
    return nextSettings;
  }
  return writeSettings(nextSettings, context);
}
```
注意:loadSettings/getSetting/saveSetting/saveSettings 的对外签名保持不变(它们内部走 read/writeSettings,已自动获得后端能力)。

- [ ] **Step 3: 前端单测** — Create `scripts/settings-repository.test.ts`:
```typescript
import assert from 'node:assert/strict';
import type { ApiClient } from '../src/lib/data/apiClient.ts';
import {
  __setSettingsApiClientForTest,
  hydrateSettings,
  loadSettings,
  getSetting,
  saveSetting,
  deleteSetting,
} from '../src/lib/data/settingsRepository.ts';

function makeApi(configured: boolean) {
  const calls: string[] = [];
  const api = {
    configured,
    get: async (_ws: string, path: string) => {
      calls.push(`GET ${path}`);
      if (path.startsWith('settings?ownerId=')) {
        if (path.includes('user_a')) return { ok: true, value: { theme: 'dark' } } as any;
        return { ok: true, value: {} } as any;
      }
      return { ok: true, value: null } as any;
    },
    post: async () => ({ ok: true, value: {} }) as any,
    patch: async (_ws: string, path: string) => { calls.push(`PATCH ${path}`); return { ok: true, value: {} } as any; },
    put: async (_ws: string, path: string) => { calls.push(`PUT ${path}`); return { ok: true, value: {} } as any; },
    del: async (_ws: string, path: string) => { calls.push(`DEL ${path}`); return { ok: true, value: {} } as any; },
  } as any;
  return { api, calls };
}

async function run() {
  // per-user hydrate + read cache
  const { api, calls } = makeApi(true);
  __setSettingsApiClientForTest(api);
  const ctxUser = { workspaceId: 'wsA', userId: 'user_a' };
  await hydrateSettings(ctxUser);
  assert.equal(getSetting('theme', 'light', ctxUser), 'dark');

  // saveSetting 写穿透(PUT 或 PATCH,取决于实现)
  calls.length = 0;
  saveSetting('pinned', ['x'], ctxUser);
  assert.equal(getSetting('pinned', null, ctxUser as any) as any, undefined === undefined ? getSetting('pinned', null, ctxUser as any) : null); // 见下:用 deepEqual 更稳
  assert.deepEqual(getSetting('pinned', [], ctxUser), ['x']);
  assert.ok(calls.some((c) => c.startsWith('PUT settings?ownerId=user_a') || c.startsWith('PATCH settings?ownerId=user_a')));

  // saveSetting(null) 缓存里 key=null(存在)
  saveSetting('maybe', null, ctxUser);
  const all = loadSettings(ctxUser);
  assert.equal(Object.prototype.hasOwnProperty.call(all, 'maybe'), true);
  assert.equal(all.maybe, null);

  // deleteSetting 走 DELETE
  calls.length = 0;
  deleteSetting('theme', ctxUser);
  assert.equal(getSetting('theme', 'fallback', ctxUser), 'fallback');
  assert.ok(calls.some((c) => c.startsWith('DEL settings/theme?ownerId=user_a')));

  // per-workspace(无 userId)与 per-user 缓存隔离
  const ctxWs = { workspaceId: 'wsA' };
  saveSetting('smtp', 'host', ctxWs);
  assert.equal(getSetting('smtp', null, ctxWs), 'host');
  assert.equal(getSetting('smtp', 'none', ctxUser), 'none'); // user 命名空间看不到 workspace 的

  // 未配置后端:localStorage 兜底
  const mem = new Map<string, string>();
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as any;
  __setSettingsApiClientForTest(makeApi(false).api);
  saveSetting('local_only', 'yes', { workspaceId: 'wsB', storage });
  assert.equal(getSetting('local_only', 'no', { workspaceId: 'wsB', storage }), 'yes');

  console.log('settings repository passed');
}
run().catch((e) => { console.error(e); process.exit(1); });
```
注意:上面那行用 `undefined === undefined` 的断言是占位错误,**实现时删掉它**,只保留 `assert.deepEqual(getSetting('pinned', [], ctxUser), ['x']);`。测试若因 ApiClient 无 `put` 而最终用 PATCH,把对应断言的动词调整一致。先确认 read/getSetting 在 configured 且已 hydrate 时确实读缓存。

- [ ] **Step 4:** package.json:`scripts` 加 `"test:settings-repo": "tsx scripts/settings-repository.test.ts"`;`test:p0-specialized` 末尾追加 ` && npm run test:settings-repo`。

- [ ] **Step 5:** 验证:
```bash
npx tsx scripts/settings-repository.test.ts && npm run lint
```
期望:`settings repository passed`;lint 0 error。

- [ ] **Step 6: Commit 前端:**
```bash
git add src/lib/data/settingsRepository.ts scripts/settings-repository.test.ts package.json
git commit -m "feat(web): wire settingsRepository to backend with localStorage fallback"
```

---

## Task 3: 全量验收

- [ ] **Step 1:** 后端全 e2e(期望 28 suites):
```bash
cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npx jest --runInBand --config test/jest-e2e.json
```
- [ ] **Step 2:** `cd /e/code/aistudio && npm run lint` → 0 error。
- [ ] **Step 3:** `npm run test:p0-specialized` → 链尾 `settings repository passed`。
- [ ] **Step 4:** `npm run test:saas-foundation` → passed。
- [ ] **Step 5:** `npm run build` → ✓ built。
- [ ] **Step 6:** 更新 memory `project_saas_productization.md`:⑤b-3 settings 标记已交付(KV 行表 Setting、singleton 端点、ownerId 维度、越权+workspace 写权限两个安全点、null 用 JsonNull、前端照 creditRepository hydrate+cache)。
- [ ] **Step 7:** 汇报 + 询问 push。
