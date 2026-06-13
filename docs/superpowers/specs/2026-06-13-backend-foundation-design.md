# ①后端地基 + 数据契约 — 设计文档

Date: 2026-06-13
Status: Approved (design sections), pending spec review
Sub-project: ① of the "AI Studio → 可商用 SaaS" 产品化工程
Stack: NestJS + PostgreSQL + Prisma (全 TypeScript)

## 背景与目标

AI Studio 工作台目前是 AI Studio 生成的原型:数据在浏览器 localStorage(`VITE_DATA_BACKEND=local`),AI 调用为 mock。完整产品化(目标 D)已拆为 6 个子项目:

```
① 后端地基 + 数据契约   ← 本设计
② 认证与租户
③ AI 编排服务（含 Multica 桌面运行时对接）
④ 计费 + 用量 + 审计
⑤ 业务模块补全
⑥ 部署上线
```

架构事实:这是一个 **SaaS 系统,同时有网页端 + 桌面端**。**Multica 是桌面端运行时**(agent 在桌面本地跑,经 `desktop_multica` 桥接),**不充当后台**。两端共用本设计建立的真实后端。

本子项目(①)的目标:用 NestJS + Postgres + Prisma 建立真实后端骨架,**规范化第一批 6 个核心域**并暴露真正的 RESTful 资源端点,实现服务端强制的多租户隔离,并把前端对应的 6 个领域仓储从 localStorage 迁移到真实 API。

全部 27 个域最终都将规范化(用户决定 B);①只交付第一批,后续批次以相同标准独立推进。这是纯工程上的分批,不改变"全部规范化"的最终目标。

### 第一批 6 个域(沿商业证据链)

`workspace/member` · `project` · `generation_job` · `asset` · `usage_event` · `audit_log`

覆盖文档反复强调的证据链:`用户动作 → generation job → asset → usage event → audit event → billing`。billing/customer/financial/tax 等依赖第一批,放后续批次。

## 架构决定

采用**方案 A:经典 NestJS 分层 + 全局租户守卫**。

排除的方案:
- 方案 B(Prisma 中间件做租户隔离):AsyncLocalStorage 魔法过重,跨域事务与中间件交互易出坑,对还要接 ②③ 的地基过早增加隐晦性。
- 方案 C(通用 CRUD 基类):各域逻辑差异真实存在(状态机/累加/只追加),强行抽象会漏。

```
apps/api/
├── prisma/schema.prisma
├── src/
│   ├── common/
│   │   ├── tenant/        # TenantGuard + @WorkspaceId() 装饰器 + @Public()
│   │   ├── prisma/        # PrismaService
│   │   └── filters/       # 全局 ExceptionFilter
│   ├── workspace/         # 每域: module + controller + service + dto
│   ├── member/
│   ├── project/
│   ├── generation-job/
│   ├── asset/
│   ├── usage-event/
│   └── audit-log/
```

前端侧:
```
src/lib/data/
├── apiClient.ts                 # 新增：唯一 HTTP 出口
├── projectRepository.ts         # 改写为资源 API 客户端
├── assetRepository.ts           # 改写
├── generationJobRepository.ts   # 改写
├── usageRepository.ts           # 改写
├── auditLogRepository.ts        # 改写
├── workspaceMemberRepository.ts # 改写
└── (其余 21 个域仓储)           # ①阶段不动，仍走 localStorage
```

## 1. 数据模型 (Prisma schema)

原则:所有业务表带 `workspaceId`(租户根);证据链表用外键软引用;不强约束字段统一用 `Json?` (metadata)。

```prisma
model Workspace {
  id        String   @id @default(cuid())
  name      String
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
  userId      String                 // ②认证前先存外部/demo user id
  role        String                 // 对齐 permissions.ts 的 WorkspaceRole
  createdAt   DateTime @default(now())

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@unique([workspaceId, userId])
  @@index([workspaceId])
}

model Project {
  id          String   @id @default(cuid())
  workspaceId String
  name        String
  status      String   @default("active")
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  assets      Asset[]
  @@index([workspaceId])
}

model GenerationJob {
  id          String   @id @default(cuid())
  workspaceId String
  projectId   String?
  type        String                 // image/video/copywriting/...
  status      String   @default("pending") // pending→running→succeeded/failed
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
  kind        String                 // image/video/text/audio/...
  url         String?                // 文件本体后续子项目接 Storage
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
  category    String                 // generation/automation/...
  credits     Int      @default(0)   // 整数 credit
  metadata    Json?
  createdAt   DateTime @default(now())

  workspace   Workspace      @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  job         GenerationJob? @relation(fields: [jobId], references: [id], onDelete: SetNull)
  @@index([workspaceId, createdAt])
}

model AuditLog {                      // 只追加，不可改/删
  id          String   @id @default(cuid())
  workspaceId String
  userId      String?
  action      String
  targetType  String?
  targetId    String?
  metadata    Json?
  createdAt   DateTime @default(now())

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId, createdAt])
}
```

设计决定:
1. 不强约束字段用 `Json?` (metadata),既规范化核心字段又保留前端灵活附加数据。
2. 证据链外键用 `SetNull`(删 job 不连带删 asset/usage,审计可追溯)。
3. AuditLog 只追加,service 不提供 update/delete。
4. userId 先存字符串,②认证落地前用 demo/外部 id。
5. 状态机/累加/只追加三种差异化逻辑分落 GenerationJob/UsageEvent/AuditLog。

## 2. REST API 契约

通用约定:
```
Base URL:  VITE_DATA_API_URL
路径前缀:   /workspaces/:workspaceId/...
成功:      200/201  { "value": <资源或数组> }
未找到:    404      { "error": { "code": "not_found", ... } }
校验失败:  400      { "error": { "code": "validation_error", ... } }
无权限:    401/403  { "error": { "code": "permission_denied", ... } }
冲突:      409      { "error": { "code": "conflict", ... } }
错误码:    backend_unconfigured | network_error | permission_denied |
           parse_error | validation_error | not_found | conflict | unknown_error
```
响应包络 `{value}` 与前端现有 http adapter 兼容(已会解 `{value}`、把 404 当 null、401/403 映射 permission_denied)。

端点:
```
# Workspace
GET    /workspaces/:workspaceId
POST   /workspaces                         body: {name, plan?}        # @Public
PATCH  /workspaces/:workspaceId            body: {name?, plan?}

# Member
GET    /workspaces/:workspaceId/members
POST   /workspaces/:workspaceId/members    body: {userId, role}
PATCH  /workspaces/:workspaceId/members/:id
DELETE /workspaces/:workspaceId/members/:id

# Project
GET    /workspaces/:workspaceId/projects?status=
GET    /workspaces/:workspaceId/projects/:id
POST   /workspaces/:workspaceId/projects
PATCH  /workspaces/:workspaceId/projects/:id
DELETE /workspaces/:workspaceId/projects/:id

# GenerationJob
GET    /workspaces/:workspaceId/generation-jobs?status=&projectId=
GET    /workspaces/:workspaceId/generation-jobs/:id
POST   /workspaces/:workspaceId/generation-jobs            body: {type, projectId?, input}
PATCH  /workspaces/:workspaceId/generation-jobs/:id/status body: {status, error?}

# Asset
GET    /workspaces/:workspaceId/assets?kind=&projectId=&jobId=
GET    /workspaces/:workspaceId/assets/:id
POST   /workspaces/:workspaceId/assets
DELETE /workspaces/:workspaceId/assets/:id

# UsageEvent (只增 + 聚合)
GET    /workspaces/:workspaceId/usage-events?from=&to=
GET    /workspaces/:workspaceId/usage-events/summary?from=&to=
POST   /workspaces/:workspaceId/usage-events    body: {category, credits, jobId?, metadata?}

# AuditLog (只增)
GET    /workspaces/:workspaceId/audit-logs?from=&to=&action=
POST   /workspaces/:workspaceId/audit-logs      body: {action, targetType?, targetId?, metadata?}
```

设计决定:
1. 查询参数把筛选下推到数据库(规范化的回报)。
2. GenerationJob 状态流转用独立 `PATCH .../:id/status`,service 校验合法迁移(pending→running→succeeded/failed),非法返回 400。
3. UsageEvent/AuditLog 只有 GET+POST,从 API 层保证只追加。
4. `/usage-events/summary` 服务端聚合 credits,给 ④计费/前端图表用。

## 3. 租户隔离与请求流

```
请求 → [1] TenantGuard (全局 APP_GUARD)
            · path 提取 :workspaceId；校验 workspace 存在 → 否则 404
            · ②认证后：在此校验当前用户属于该 workspace → 否则 403
            · workspaceId 注入 request 上下文
        [2] @WorkspaceId() 参数装饰器 → controller 拿已校验值
        [3] Service：所有查询/写入强制 where { workspaceId }
        [4] PrismaService (单例：连接池/事务/日志)
```

设计决定:
1. TenantGuard 注册为全局 `APP_GUARD`;公开路由(`POST /workspaces`、健康检查)用 `@Public()` 跳过。
2. `workspaceId` 只从 path 取,**不接受 body/query**;create 一律用 Guard 校验过的 path 值覆盖。
3. ②认证接缝:同一个 Guard 增加 `Member` 表 (workspaceId, userId) 校验,改动集中单文件,不动 service。
4. 跨域事务用 `prisma.$transaction`,逻辑放发起方 service(如 GenerationJobService),不散落。
5. ①阶段 Guard 只校验 workspace 存在,不校验用户身份(留给②)。故①的 API 在②完成前是"知 workspaceId 即可访问"的开发态,**不对公网开放**。

## 4. 前端迁移

策略:只改第一批 6 个域仓储为资源 API 客户端,保持函数签名,其余 21 个不动。

设计决定:
1. 新增 `apiClient.ts` 作为唯一 HTTP 出口:`baseUrl=VITE_DATA_API_URL`、解 `{value}` 包络、错误码映射到 `DataBackendResult`、注入 workspaceId 到 path(②后注入 auth header)。复用现有 `DataBackendResult/DataBackendError` 类型。
2. 仓储函数签名尽量不变,内部从 localStorage 换成 apiClient,使 98 个组件基本不改。
   - **实现前置核查**:迁移前逐个核查这 6 个仓储现有调用点是否已 async;若有同步调用点需改异步,在实现计划中逐个标出处理方式。
3. 特性开关:`VITE_DATA_API_URL` 未配时,改写的仓储回退 localStorage(复用现有逻辑)。配了则走真实 API。可随时回退。
4. ①阶段前端处于"混合"中间态(6 域真库 + 21 域本地),属分批迁移正常状态。
5. workspaceId 来自现有 `useSaasSession()` 的 `session.workspace.id`;②后 session 来源换真实登录,apiClient 调用点不变。

## 5. 错误处理

后端:
1. 全局 ExceptionFilter 统一包络 `{error:{code,message}}`,绝不泄漏 Prisma 堆栈。
2. 映射:NotFound→404 not_found;ValidationPipe→400 validation_error;TenantGuard→403 permission_denied;非法状态流转→400 validation_error(message 说明合法迁移);Prisma P2025→404;P2002→409 conflict;未捕获→500 unknown_error(堆栈仅入日志)。
3. 写端点用 DTO + class-validator + 全局 ValidationPipe(`whitelist` + `forbidNonWhitelisted`),拒绝未知字段。

前端 apiClient 映射:
```
2xx + {value}    → { ok:true, value }
404              → { ok:true, value:null }   # 未找到=null，沿用现有语义
4xx/5xx + {error}→ { ok:false, error:{code,message} }
网络/解析失败     → { ok:false, error:{code:'network_error'|'parse_error', ...} }
```

设计决定:
1. 错误码前后端共享词表;前端 `DataBackendErrorCode` 补 `not_found` 和 `conflict`。
2. 404=null 不报错,组件照常处理空态。
3. 500 等内部错误响应只给通用文案,堆栈仅入服务端日志。
4. DTO 白名单 + path-only workspaceId 双重堵越权写。
5. 状态机非法迁移返回 400 + 明确 message。

## 6. 测试策略

后端(apps/api,Jest + supertest,NestJS 默认):
1. 单元(各域 Service):状态机合法/非法迁移;只追加无 update/delete;summary credits 累加正确。用真实 Postgres 测试库,不 mock Prisma。
2. 集成(HTTP E2E):各域 CRUD/查询;`{value}`/`{error}` 包络;证据链事务(job 完成→asset+usage+audit 原子写,失败全回滚)。
3. **租户隔离套件(安全门禁)**:A 不能读 B 的数据;body 偷传 workspaceId 被忽略;跨租户 404/403 正确。

前端(对齐现有 tsx + node:assert 风格):
4. 新增 `scripts/api-client.test.ts`:包络解析、错误码映射、404→null、未配 URL 回退 localStorage;用注入式 mock fetcher。

验收线:
```
cd apps/api && npm test       # Jest 全绿，含租户隔离套件
npm run test:api-client       # 新增前端脚本
npm run lint                  # tsc 全绿
npm run build                 # 构建通过
```

测试数据库用独立 `DATABASE_URL_TEST`,套件前 `prisma migrate reset` 或事务回滚隔离(实现计划定具体方式)。后端用 Jest 是相对前端 tsx 风格的唯一例外,因其为独立新工程,沿用生态标准。

## 范围边界(本子项目不做)

- ②真实认证/登录(①的 Guard 只校验 workspace 存在,预留接缝)。
- ③AI 真实调用 / Multica 对接(generation_job 仅建模型 + 状态机,不实际跑模型)。
- 文件存储本体(asset.url 字段就位,Storage 接入留后续)。
- 其余 21 个域的规范化与前端迁移(后续批次)。
- 部署/CI(⑥)。

## 开放问题 / 实现计划需明确

1. ~~后端工程放仓库何处~~ **已定:`apps/api/`,当前仓库转 monorepo**。前后端共享契约类型(错误码、DTO),避免漂移。实现计划需确定前端是否移入 `apps/web/` 或暂留根。
2. 6 个待改写前端仓储的同步/异步调用点清单(实现前核查)。
3. 测试库隔离的具体机制(migrate reset vs 事务回滚)。


