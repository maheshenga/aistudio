# ②认证与租户 — 设计文档

Date: 2026-06-14
Status: Approved (design sections), pending spec review
Sub-project: ② of the "AI Studio → 可商用 SaaS" 产品化工程
Stack: NestJS + PostgreSQL + Prisma + JWT (全 TypeScript)
Depends on: ① 后端地基 + 数据契约(已交付,PR `codex/p0-commercial-control-plane`)

## 背景与目标

完整产品化(目标 D)拆为 6 个子项目:

```
① 后端地基 + 数据契约   ← 已交付
② 认证与租户           ← 本设计
③ AI 编排服务（含 Multica 桌面运行时对接）
④ 计费 + 用量 + 审计
⑤ 业务模块补全
⑥ 部署上线
```

①交付了 NestJS + Postgres + Prisma 后端骨架、6 个核心域、服务端强制的多租户隔离(`TenantGuard` 校验 workspace 存在 + 注入 workspaceId),并把前端 6 个仓储迁移到真实 API。但①**刻意不做真实认证**——`TenantGuard` 只校验 workspace 存在,不知道"请求者是谁"。

本子项目(②)的目标:**用自建 JWT 认证补上"你是谁",并把 `TenantGuard` 接上真实 userId 做成员校验**,实现端到端可用的认证闭环——用户能注册、登录、带真实身份访问受保护资源、被正确隔离在自己所属的 workspace 内。

### ①留下的认证接缝(代码事实)

1. **后端无 User 模型** — `Member.userId` 是裸 `String`,不指向任何表。这是②的核心缺口。
2. **Member 已支持多对多** — `@@unique([workspaceId, userId])` + `@@index([workspaceId])` 就位,只缺 User 实体。
3. **TenantGuard 第19行明确接缝** — 注释写明「②认证落地后:在此校验 Member(workspaceId, req.userId) 是否存在,否则抛 permission_denied」。`req.userId` 当前从不赋值。
4. **前端契约已完整定义** — `src/saas/types.ts` 已有 `SaasUser`、`Workspace`、`Membership`、`AuthSession` + 5 个 `WorkspaceRole`(owner/admin/operator/finance/viewer)。②用真实后端兑现这些既有契约。
5. **前端 auth 是本地 demo** — `SaasAuthContext` 用 `createDemoAuthSession()` + localStorage,`AuthGate` 一键 demo 登录,UI 已写明"后续替换为正式 OAuth/Firebase Auth"。
6. **apiClient 无 Authorization header** — ①的 `apiClient`(唯一 HTTP 出口)当前不带任何认证头,②需在此层注入 token。
7. **审计已依赖 actor** — `logAuditEvent` 已带 actor.name/role,但当前是 demo 值;②真实身份接上后这些字段就有真值。

## 锁定的 5 个决策

| # | 决策 | 选择 | 理由 |
|---|---|---|---|
| 1 | 认证方案 | 自建 JWT(Passport + @nestjs/jwt + bcrypt) | 与①架构同构(全自控、无外部托管依赖),身份数据留在自己的 Postgres,双端统一 |
| 2 | 会话机制 | 无状态 access token(短期)+ 可撤销 refresh token(存 DB) | SaaS 标准做法,平衡性能(access 纯签名校验)、安全(refresh 可吊销)、双端长时会话 |
| 3 | 双端 token | 网页/桌面共用同一套端点,`RefreshToken.client` 字段区分来源 | 兑现"两端共用真实后端",桌面端只是另一个客户端,零额外成本 |
| 4 | 范围边界 | 核心认证闭环 | 端到端可用且可被后续批次扩展;邮箱验证/密码重置/邀请独立推进 |
| 5 | 权限深度 | 仅成员校验 + 身份注入 | 精确兑现①接缝;跨租户隔离已保证,细粒度 RBAC 留后续(很可能并入④) |

## 整体架构

**双守卫职责分离**(②的核心架构决策):

```
请求进入
  → AuthGuard(全局, 最先)        验 access JWT 签名 → 注入 req.userId
                                  @Public 端点跳过;无/坏/过期 token → 401 unauthenticated
  → TenantGuard(全局, 其次)       ①已有,增补:查 Member(workspaceId, req.userId)
                                  非 workspace 路由跳过;非成员 → 403 permission_denied
                                  成员 → 注入 req.member = {role, ...}
  → Controller                    经 @WorkspaceId()(①已有) / @CurrentUser()(②新增) 拿身份
```

- 用 `APP_GUARD` 注册两个全局守卫,NestJS 按 provider 注册顺序执行,AuthGuard 在前。
- `AuthGuard` 管"你是谁"(验 JWT → 注入 userId);`TenantGuard` 管"你是不是这个租户的成员"(查 Member → 注入 role)。职责清晰分离。
- `@Public()`(①已有)对两个守卫都生效——`/auth/register|login|refresh` 公开。

**端到端数据流:**

```
注册/登录 → 后端发 {accessToken, refreshToken}
  → 前端存储,apiClient 每请求带 Authorization: Bearer <access>
  → AuthGuard 验签 → 取 userId 注入 req
  → TenantGuard 校验 Member(workspaceId, userId) 存在 → 注入 role → 放行/403
access 过期(401) → 前端用 refresh 换新 token 对 → 重试原请求一次
登出 → 撤销该 refresh token 记录
```

## 数据模型

②在①的 Postgres 里**新增 2 张表**,并把①已有的 `Member.userId` 裸 String 接上真实外键。

### 新增 `User`(全局用户,不属于任何 workspace)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique          // 登录标识,全局唯一
  passwordHash String                    // bcrypt(cost >= 10)
  name         String
  avatarLabel  String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  members       Member[]                 // 该用户的所有 workspace 成员资格
  refreshTokens RefreshToken[]
}
```

### 新增 `RefreshToken`(可撤销会话)

```prisma
model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique             // 存哈希,不存明文
  client    String   @default("web")     // web | desktop(决策3)
  expiresAt DateTime
  revokedAt DateTime?                     // 登出/吊销时置位
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}
```

### 改造①的 `Member`(接上真实外键)

```prisma
model Member {
  // ...①已有字段不变(id/workspaceId/userId/role/name/email/createdAt)...
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  // @@unique([workspaceId, userId]) 已存在 → user⇄workspace 多对多
}
```

**关键设计点:**
- **`User` 与 workspace 解耦** — User 是全局账号,通过 Member 关联到多个 workspace,兑现 user⇄workspace 多对多。
- **`Member.name/email` 保留**(①已有)——作为该用户在特定 workspace 的展示快照(审计用),与 User 的全局 name/email 可不同。
- **token 只存哈希** — `RefreshToken.tokenHash`,明文只在发放瞬间返回客户端,DB 泄露也无法冒用。

**迁移风险标注:** 给 `Member.userId` 加外键前,①遗留的 demo 数据裸 userId 无对应 User 行。MVP 阶段用 `prisma migrate reset` 清库重建最简净;数据回填留生产部署(⑥)再议。实现计划需明确此点。

## 认证端点与 API 契约

新增 `auth` 域(不属于 workspace 范围)。统一沿用①的响应信封:成功 `{value:...}`,错误 `{error:{code,message}}`。

### 公开端点(无需 token,标 @Public)

```
POST /auth/register   {email, password, name}
  → 创建 User(bcrypt 哈希)→ 自动建一个默认 Workspace + owner Member
  → 返回 {accessToken, refreshToken, user}
  ⚠️ email 已存在 → 409 conflict

POST /auth/login      {email, password, client?}
  → 校验密码 → 发 token 对,写 RefreshToken 记录
  → 返回 {accessToken, refreshToken, user}
  ⚠️ 凭证错误 → 401 unauthenticated(统一信息,不区分"用户不存在"vs"密码错",防枚举)

POST /auth/refresh    {refreshToken}
  → 校验未撤销/未过期 → 旋转(撤销旧的、发新的,refresh token rotation)
  → 返回 {accessToken, refreshToken}
  ⚠️ 无效/已撤销/过期 → 401 unauthenticated
```

### 受保护端点(需 access token)

```
POST /auth/logout     (Bearer access + body {refreshToken})
  → 撤销该 RefreshToken(置 revokedAt)→ 204

GET  /auth/me         (Bearer access)
  → 返回 {user, memberships:[{workspaceId, role, workspaceName}]}
  → 前端据此构建 AuthSession,知道用户属于哪些 workspace
```

**关键设计点:**
- **`/auth/me` 返回 memberships 列表** — 兑现 user⇄workspace 多对多。前端登录后调用,得到该用户所有 workspace + 角色,默认进第一个(或上次活跃的)。
- **refresh token rotation** — 每次 refresh 都撤销旧 token、发新 token,降低 refresh token 被盗后的长期风险。
- **注册自动建 workspace + owner** — 兑现决策4"创建者自动成 owner",新用户注册即有可用工作区。

## 守卫链与前端集成

### 后端守卫链(执行顺序关键)

```
请求 → AuthGuard(全局,先) → TenantGuard(全局,后) → Controller
```

- `AuthGuard`:验 access JWT 签名 → 注入 `req.userId`。`@Public` 端点跳过;无/坏/过期 token → 401 `unauthenticated`。
- `TenantGuard`(①已有,增补):查 `Member(workspaceId, req.userId)`。非 workspace 路由跳过;非成员 → 403 `permission_denied`;成员 → 注入 `req.member = {role, ...}`。
- 两者经 `APP_GUARD` 注册为全局守卫,按 provider 注册顺序执行,AuthGuard 在前。
- 新增 `@CurrentUser()` 参数装饰器,从 `req.userId`/`req.member` 取已验证身份,供 controller/service 使用(如审计写真实 actor)。

### 前端集成(替换 demo session 为真实认证)

- `SaasAuthContext` 改造:`signInDemo` → 真实 `signIn(email,password)` / `register` / `signOut`;调 `/auth/*`,持有 token。
- **token 存储**:access 放内存(模块变量),refresh 放 `localStorage`(桌面端后续可换更安全存储)。
- **apiClient 注入**:每请求加 `Authorization: Bearer <access>`;收到 401 时自动调 `/auth/refresh` 换新 token 并重试一次,refresh 也失败则登出跳登录页。
- **`AuthGate`**:demo 一键登录 → 真实登录/注册表单;登录后调 `/auth/me` 构建 `AuthSession`(含 memberships)。
- **多 workspace**:`/auth/me` 返回的 memberships 决定可进入的 workspace;本批默认进第一个,切换 UI 留后续。
- **hydrate 触发**:②已迁移的 6 仓储的 `hydrate*` 系列在登录后、拿到真实 workspace 时触发。

**关键设计点:** ①的 `apiClient` 是"唯一 HTTP 出口",token 注入和 401 自动 refresh 全部收敛在这一层,组件和仓储无感知——延续①"影响关在仓储/客户端层"的原则。

## 错误处理与安全

### 错误码(沿用①信封 + 必要新增)

- **未认证**(无/坏/过期 access token)→ HTTP **401**,code `unauthenticated`(②新增)
- **已认证但非该租户成员/越权**→ HTTP **403**,code `permission_denied`(①已有)
- 前端 `DataBackendErrorCode`(①已对齐 8 个)需补 `unauthenticated`,与后端一致。
- **401 是 apiClient 自动 refresh 的触发信号**;403 不触发 refresh(身份没问题,是权限问题),直接上抛。

**关键设计点:** 401/403 语义分离是前端自动 refresh 逻辑的基石——只有 401(token 问题)才尝试续期,403(权限问题)立即失败。避免"权限不足却反复 refresh"的死循环。

### 安全要点

- **密码**:bcrypt(cost≥10),绝不存明文/可逆。注册做基本强度校验(长度等)。
- **登录防枚举**:用户不存在 vs 密码错误,统一返回 401 同一消息。
- **refresh token**:存哈希(`tokenHash`)、可撤销(`revokedAt`)、会旋转;明文仅发放瞬间返回。
- **access token**:短期(15min),JWT secret 从 env 读(`JWT_SECRET`),签发含 `userId`/`exp`,不含敏感数据。
- **JWT secret 缺失**:启动时校验 env,缺失则拒绝启动(防止用默认弱 secret 上线)——延续①"配置缺失显式失败"风格。
- **body 注入防护**:沿用①的 ValidationPipe whitelist;`/auth/*` DTO 同样 whitelist。
- **审计接真身**:①的 `logAuditEvent` 此前用 demo actor,②后用 `@CurrentUser()` 注入的真实 userId/role 作 actor,`workspace_sign_in/out` 等事件落真实身份。

## 测试策略

延续①:后端 Jest e2e + 前端 tsx 脚本,真实 DB 不 mock。

### 后端 e2e(`apps/api/test/auth.e2e-spec.ts` + 守卫相关)

- 注册 → 返回 token + 自动建 owner workspace;重复 email → 409
- 登录正确 → 发 token;错误密码/不存在用户 → 统一 401
- refresh 有效 → 旋转出新 token 且旧的失效;已撤销/过期 → 401
- 登出 → refresh 被撤销,再用即 401
- **守卫链 e2e(核心)**:无 token 访问受保护资源 → 401;有 token 但非该 workspace 成员 → 403;成员 → 200 且 `@CurrentUser` 拿到正确 userId/role
- `/auth/me` → 返回该用户全部 memberships

### 前端 tsx 脚本(`scripts/auth-*.test.ts`)

- token 存储/读取/清除
- apiClient 注入 Authorization header(注入式 mock fetcher,仿①`api-client.test.ts`)
- 401 → 自动 refresh 重试一次;refresh 失败 → 登出
- 403 → 不 refresh,直接上抛

## 范围边界

| ✅ 本批交付 | ❌ 留后续批次 |
|---|---|
| User/RefreshToken 表 + Member 接外键 | 邮箱验证 |
| 注册/登录/refresh/登出/me | 密码重置/忘记密码 |
| AuthGuard + TenantGuard 接真身 | 成员邀请(邀请链接/邮件) |
| 前端真实登录/注册页 + apiClient token | 第三方/社交登录 |
| 创建者自动 owner + 多 workspace 列表 | 多 workspace 切换 UI |
| 审计接真实 actor | 后端细粒度 RBAC(很可能并入④) |
|  | 桌面端 token 安全存储细节 |

## 开放问题 / 实现计划需明确

1. **迁移机制**:`Member.userId` 加外键前的 demo 数据处理——MVP 用 `prisma migrate reset` 清库重建;数据回填留⑥。
2. **JWT 过期时长**:access 15min / refresh 7-30 天的具体值,实现计划定。
3. **前端 token 存储**:access 内存 + refresh localStorage 的具体封装(独立 `authTokenStore` 模块?),实现计划定。
4. **`/auth/me` 默认 workspace 选择**:第一个 vs 上次活跃(需记录 lastActiveWorkspaceId?),本批默认第一个,可留后续。
