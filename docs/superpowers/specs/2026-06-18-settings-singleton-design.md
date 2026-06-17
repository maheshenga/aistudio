# ⑤b-3 Settings 单例资源设计规格

状态:已批准(2026-06-18)
所属:SaaS 产品化 ⑤ 业务模块补全 / ⑤b 数据层迁移 / ⑤b-3(单例 settings)

## 背景

`src/lib/data/settingsRepository.ts` 是按 `(workspaceId, ownerId)` 存一份动态 KV blob 的仓库,导出 loadSettings / getSetting / saveSetting / saveSettings / deleteSetting。存储键 `aistudio_settings:{workspaceId}:{userId|'workspace'}`(settingsRepository.ts:16-17)。

与已迁移的列表资源不同:**无 list/分页/游标,是 singleton get/put 语义**,不能套 `WorkspaceResourceService` / `createResourceController` 基类(基类硬编码 list+:id CRUD)。

调查确认(见对话记录):
- **两个维度并存**:大量 per-user 设置(主题/钉选/会话/canvas/宏/便签等,context 带 userId);少量 per-workspace 设置(AdminView 的 SMTP/Stripe ref/signup policy、成员批量历史,不带 userId)。
- 前端用法:主要整份 KV blob 读写(loadSettings/saveSettings),偶尔单 key(getSetting/saveSetting/deleteSetting)。
- 后端无 Setting 表;单例端点照 `BillingController`(GET balance + WorkspaceId/CurrentUser)写。
- 前端改造模板 = `creditRepository`(单例 hydrate+cache+离线降级)。

## 决策(已与用户对齐)

1. **表形状 = KV 行表**:`Setting(workspaceId, ownerId, key, value Json)` + `@@unique([workspaceId, ownerId, key])`。与现有 storageKey 一一对应,deleteSetting 精确删一行,saveSetting 单 key upsert。
2. **ownerId 维度**:`ownerId = userId ?? 'workspace'`(沿用前端 storageKey 约定)。per-user 与 per-workspace 落同一张表不同 ownerId。前端调用方零改动。
3. **端点形状**:
   - `GET /workspaces/:id/settings?ownerId=<userId|workspace>` → 返回整份 KV 对象 `{ [key]: value }`
   - `PUT /workspaces/:id/settings?ownerId=` → body `{ patch: { [key]: value } }`,逐 key upsert
   - `DELETE /workspaces/:id/settings/:key?ownerId=` → 删单 key
4. **越权校验**(安全点):ownerId 必须等于 `currentUser.userId` 或字面量 `'workspace'`,否则 403。防止读/写他人 user settings。
5. **per-workspace 写权限**(安全点):当 `ownerId === 'workspace'` 时,写操作(PUT/DELETE)仅 owner/admin(沿用 ④ `GRANT_ROLES = {owner, admin}`);所有成员可读。per-user(ownerId=自己 userId)读写不受此限。

## null 语义(关键)

- `saveSetting(key, null)` = 写入 null 值,key 仍存在。
- `deleteSetting(key)` = 删 key。
- 后端 PUT patch 里 `value === null` 必须**存 null 值**(不当删除);删 key 只走 DELETE 端点。Setting.value 是 `Json?`,存 JSON null 与 SQL NULL 需区分——用 Prisma `Prisma.JsonNull` 存 JSON null。

## 数据模型

新增 Prisma model `Setting`:
```prisma
model Setting {
  id          String   @id @default(cuid())
  workspaceId String
  ownerId     String                 // userId 或字面量 "workspace"
  key         String
  value       Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@unique([workspaceId, ownerId, key])
  @@index([workspaceId, ownerId])
}
```
- Workspace 加反向关系 `settings Setting[]`。
- resetDb 加 `setting.deleteMany()`(workspace 删除前)。

## 后端实现(不套资源基类)

新建 `apps/api/src/settings/`:
- `dto.ts`:
  - `OwnerQuery { @IsOptional @IsString ownerId?: string }`(GET/PUT/DELETE 共用 query)
  - `PutSettingsDto { @IsObject patch!: Record<string, unknown> }`(value 可为任意 JSON 含 null)
- `settings.service.ts`(普通 @Injectable,注入 PrismaService):
  - `resolveOwnerId(currentUserId, role, ownerIdParam, isWrite)`:
    - ownerIdParam 缺省 → `currentUserId`(默认 per-user 自己)。
    - 若 ownerIdParam 提供:必须 === currentUserId 或 === 'workspace',否则 `permissionDenied`。
    - 若解析出的 ownerId === 'workspace' 且 isWrite 为 true 且 role∉{owner,admin} → `permissionDenied`。
    - 返回 ownerId。
  - `getAll(workspaceId, ownerId)`:findMany → reduce 成 `{ [key]: value }`(value 为 Prisma JsonNull 时还原为 null)。
  - `putPatch(workspaceId, ownerId, patch)`:对 patch 每个 [k,v] 做 upsert(value=null → Prisma.JsonNull);返回 getAll。
  - `deleteKey(workspaceId, ownerId, key)`:deleteMany({workspaceId, ownerId, key});返回 getAll。
- `settings.controller.ts`(`@Controller('workspaces/:workspaceId/settings')`):
  - `@Get()` getAll(WorkspaceId, OwnerQuery, CurrentUser)→ resolveOwnerId(isWrite=false)→ `{ value: getAll }`
  - `@Put()` put(WorkspaceId, OwnerQuery, Body PutSettingsDto, CurrentUser)→ resolveOwnerId(isWrite=true)→ `{ value: putPatch }`
  - `@Delete(':key')` remove(WorkspaceId, Param key, OwnerQuery, CurrentUser)→ resolveOwnerId(isWrite=true)→ `{ value: deleteKey }`
- `settings.module.ts`:providers [SettingsService],controllers [SettingsController]。
- 注册进 app.module.ts。

注意:ownerId 经 query 传,JSON null 用 `Prisma.JsonNull`,`@@unique` upsert 用 `workspaceId_ownerId_key` 复合键。

## 前端改造 `src/lib/data/settingsRepository.ts`(照 creditRepository)

- import apiClient。
- 模块级缓存 `settingsCache = new Map<string, SettingsRecord>()`,key = `${workspaceId}:${ownerId}`(用 storageKey 同款 ownerId 解析)。
- `hydrateSettings(context)`:configured 时 GET `settings?ownerId=<owner>` 写缓存。
- 改写 loadSettings/getSetting:configured 时读缓存(缺省回退现有 localStorage 行为以防未 hydrate)。
- 改写 saveSetting/saveSettings:configured 时更新缓存 + PUT `settings?ownerId=` body `{ patch }` 写穿透(fire-and-forget,!ok→console.error)。
- 改写 deleteSetting:configured 时更新缓存 + DELETE `settings/<key>?ownerId=`。
- 文件末尾加 `__setSettingsApiClientForTest`。
- 未配置后端时所有函数保持现有 localStorage 全量逻辑不变。
- ownerId 解析:复用 `context.userId ?? 'workspace'`(与现有 storageKey 同)。

## 验收

- 后端 `settings.e2e-spec.ts`:
  1. per-user round-trip:PUT patch → GET 整份 → DELETE 单 key → GET 确认删除
  2. null 值语义:PUT `{patch:{k:null}}` → GET 返回 k=null(key 存在)
  3. ownerId 越权:用户 A 带 `ownerId=<userB.userId>` GET → 403
  4. workspace 级写权限:member 角色 PUT `ownerId=workspace` → 403;owner 角色 → 200
  5. workspace 级读:member 角色 GET `ownerId=workspace` → 200(可读)
  6. workspace isolation:跨租户 GET → 403(TenantGuard 非成员)
  7. 默认 ownerId:不传 ownerId 的 PUT/GET 落在调用者 userId 命名空间(与显式传自己 userId 等价)
- 前端 `scripts/settings-repository.test.ts`:hydrate 读缓存、saveSetting 写穿透 PUT、deleteSetting 走 DELETE、saveSetting(null) 缓存里 key=null、未配置 localStorage 兜底、per-workspace(无 userId)与 per-user(有 userId)缓存键隔离。
- package.json 加 `test:settings-repo`,挂 test:p0-specialized 链尾。
- 全量验收:后端 28 suites e2e、lint、test:p0-specialized、test:saas-foundation、build 全绿。

## 不做(超出本批)

- 不改任何 settings 调用方组件(App/AdminView/ThemeProvider 等)——它们继续用同样的 context,行为不变。
- 不迁移 C 类 localStorage(searchHistory/offlineQueue/plugin)。
- settings 不做加密(敏感项如 Stripe key ref 走 ⑤b-4 加密批,本批只存普通 KV)。
