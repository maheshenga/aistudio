# ③ AI 编排服务(含 Multica 桌面运行时对接)— 设计文档

Date: 2026-06-15
Status: Approved (design sections), pending spec review
Sub-project: ③ of the "AI Studio → 可商用 SaaS" 产品化工程
Stack: NestJS + PostgreSQL + Prisma + @nestjs/schedule(后端编排/对账) + 前端 React runtime 层
Depends on: ① 后端地基 + 数据契约,② 认证与租户(均已交付,分支 `codex/p0-commercial-control-plane`)
Supersedes(部分): `docs/superpowers/specs/2026-06-09-multica-dual-mode-integration-design.md` 的 Phase 4–6

## 背景与目标

完整产品化拆为 6 子项目:① 后端地基(已交付)→ ② 认证与租户(已交付)→ **③ AI 编排服务(本设计)** → ④ 计费+用量+审计 → ⑤ 业务模块补全 → ⑥ 部署上线。

### 与 06-09 旧 spec 的关系(差距对照结论)

仓库已存在一份 `2026-06-09-multica-dual-mode-integration-design.md`,它是一份**纯前端集成设计**,且早于①②的真实后端。差距对照:

| 06-09 Phase | 现状 | ③本批 |
|---|---|---|
| P1 运行时 Provider 接口 | ✅ `src/runtime/` 已实现,6 测试 pin 契约 | **保留复用** |
| P2 Multica 适配器(只读) | ✅ `multicaApiClient`+`mappers`+provider 已实现 | **保留复用** |
| P3 桌面桥 | ✅ `desktopAgentBridge.ts` 检测 `window.daemonAPI` | **保留复用** |
| P4 任务派发 | ⚠️ 仅 UI 组件手工拼接;`listTasks` 返回 `[]`,`subscribeToTask` 不连真实 WS | **本批重做(基于真实后端)** |
| P5 产物·审计·用量 | ❌ 无 | **本批落地** |
| P6 生产加固 | ❌ 无 | 部分(权限/披露最小版) |

**关键错位**:06-09 spec 把后端当 "Firebase/API" 泛指,没有"后端作为编排平面"这一层;而①②已建成真实 NestJS 后端(GenerationJob 域 + JWT + 租户校验)。前后端任务契约已分叉(后端 `pending/...`+`type/input`;前端 `queued/...`+`prompt/providerKind/runtimeMode`),目前靠 `GlobalAgentDispatcherModal.tsx` 硬拼。系统未上线,本批一次性改对。

### ③ 的本质

不是从零做运行时(前端 `src/runtime/` 抽象层已建好,保留),而是**补齐 desktop_multica 的派发闭环,并把后端做成编排真相源**。

## 锁定的 5 个决策

| # | 决策 | 选择 | 理由 |
|---|---|---|---|
| Q1 | 编排重心 | **C 按 runtime 模式分流,后端恒为真相源** | desktop 本地 daemon 在 NAT 后,后端无法主动连入;本地直连 WS 零云端往返、最低延迟;web/self_hosted runtime 在服务器侧走后端编排最优。每种模式走物理最短路径。 |
| Q2 | desktop 状态/产物回写 | **B 后端轮询 Multica server 对账** | 回写不依赖前端在线,服务端强制(计费/审计不丢);前端直连只管实时展示。"关页面再回来状态永远对"。 |
| Q3 | Multica server 形态 | **A 只支持 self-hosted Multica** | 让 Q2 的后端对账 100% 成立,数据留可控环境,契合私有部署诉求。Cloud 留后续。 |
| Q4 | 前后端任务契约 | **A 后端 GenerationJob 为 canonical,前端对齐** | 单一真相源,彻底消分叉;顺势补 `cancelled`+进度+外部引用,使"取消显示为取消""换设备看进度"体验成立;④计费直接读后端。 |
| Q5 | 本批闭环范围 | **A 先打通 desktop_multica 全链路** | 所有决策都为"本地实时+后端最终一致"服务,先端到端做深可演示;web/self_hosted 后端直连更简单,留第二批。 |

## 整体架构(desktop_multica,本批焦点)

```
用户(桌面壳/浏览器+本地 daemon)
  │
  ├─① 派发:前端 → 后端 POST 创建 GenerationJob(canonical,status=pending,带 runtimeMode/agentId)
  │         后端记录任务 + 写 AuditLog(task_dispatched),返回 jobId
  │
  ├─② 本地执行:前端 runtime provider 直连本机 Multica daemon(经 self-hosted server 注册任务)
  │         daemon 跑 CLI agent(Codex/Claude/…),前端直连 WS 看【实时流式进度/日志】← 最低延迟
  │         拿到 Multica task id 后回绑后端(link-external)
  │
  └─③ 对账回写:aistudio 后端【轮询】self-hosted Multica server,拉该任务终态
            → 写回 GenerationJob.status(succeeded/failed/cancelled)+ progress/finishedAt
            → 产物入 Asset 库、写 UsageEvent、写 AuditLog(同一事务)
            → 不依赖前端在线:关页面/换设备,状态最终一致
```

**两条 UX 支柱**:前端直连 = 实时(看本地 agent 跑);后端对账 = 最终一致(关了回来状态永远对)。

**贯穿不变量**:无论哪条派发路径,后端始终是 `GenerationJob`/`Asset`/`UsageEvent`/`AuditLog` 的真相源。

**前后端职责再分配**:现状漂在 `GlobalAgentDispatcherModal.tsx` 的编排逻辑 → 下沉到后端新增 Orchestration 域 + 前端一个非 UI 的 `orchestrationService`。前端 runtime provider 保留"展示 + 桌面桥控制 + 实时 WS 流式";派发真相落库交给后端。

### 本批范围边界

| ✅ 本批交付 | ❌ 留后续 |
|---|---|
| 后端编排域:接收派发 + 轮询对账 + 回写 | web/self_hosted 后端直连派发 |
| GenerationJob 升级 canonical(补 cancelled/进度/externalTaskId/runtimeMode/agentId) | Multica Cloud 支持 |
| desktop 直连本地 daemon 实时进度(补齐 provider WS) | aistudio 自有桌面壳 |
| 取消 / 重试(复用同 job) | 跨设备秒级实时进度(本批靠对账给最终态) |
| 产物入 Asset + UsageEvent + AuditLog 回写 | 细粒度计费规则(④) |
| 后端↔Multica server 对账 fixture 契约测试 | 多 agent/squad 编排 |

## 数据模型(GenerationJob canonical 升级)

①现状:`GenerationJob { id, workspaceId, projectId?, type, status(默认pending), input(Json), error?, createdAt, updatedAt }`,关联 `assets[]`、`usageEvents[]`。

③升级为编排任务的 canonical 模型。

### status 补 cancelled

```
pending ─→ running ─→ succeeded
   │          │    └─→ failed
   │          └──────→ cancelled   (运行中取消)
   └─────────────────→ cancelled   (排队中取消)
终态:succeeded / failed / cancelled(无出边)
```

### 新增字段

```prisma
model GenerationJob {
  // ①已有:id, workspaceId, projectId?, type, status, input(Json), error?, createdAt, updatedAt, assets[], usageEvents[]

  // ③新增:
  runtimeMode    String?    // 'web' | 'desktop_multica' | 'self_hosted_multica'
  agentId        String?    // 派发目标 agent(Multica agent 标识)
  providerKind   String?    // CLI provider:'codex' | 'claude_code' | 'gemini' | ...(展示/用量归类)
  externalTaskId String?    // Multica issue/task id —— 后端对账关联键(desktop 必填)
  externalRef    Json?      // Multica 返回的其他引用(workspace/runtime/issue 元数据,容错存放)
  progress       Int?       // 0-100 实时进度快照(对账时落最近值)
  currentStep    String?    // 当前步骤文字(如 "running tests")
  startedAt      DateTime?  // 进入 running 时刻
  finishedAt     DateTime?  // 进入终态时刻(算时长/用量)

  @@index([workspaceId, status])     // 列任务、对账扫描未终态任务
  @@index([externalTaskId])          // 对账按 Multica task id 反查
}
```

**设计要点:**
- `externalTaskId` 是对账关联键(对应 06-09 兼容性文档"task 引用存为 external metadata")。
- `progress`/`currentStep` 是**快照不是流**:实时流式仍由前端直连 WS(低延迟);后端对账时落最近值,只为"换设备/重进看到大致进度",不追求秒级实时。
- `runtimeMode`/`agentId`/`providerKind` 让 job 自描述派发上下文,④计费按 `providerKind`+时长(`finishedAt-startedAt`)直接读。
- 字段大多可空,模型对三种模式通用。

### 迁移

新增迁移 `extend_generation_job_orchestration`(全是加列+加索引+status 值扩展,**非破坏性**)。系统未上线,`prisma migrate dev` 生成 + 测试库 `migrate deploy`。①遗留 demo job 的旧 status 值仍合法,无需回填。

### 不建独立派发/事件表

一个 job 一次派发,external* 字段足够;审计走①已有的 `AuditLog`。独立 Dispatch/Event 表属过度设计,留到"重试需多次派发历史"再说。

## 后端编排域(Orchestration 服务 + 对账轮询)

新增 NestJS 域 `apps/api/src/orchestration/`,与①②同构(module/controller/service)。不替代 `GenerationJob` 域(任务 CRUD/状态机真相),而是编排层:接收派发意图、登记外部引用、后台对账回写。

### 端点(都在 workspace 范围,经 AuthGuard+TenantGuard)

```
POST /workspaces/:workspaceId/orchestration/dispatch
  body { type, projectId?, input, runtimeMode, agentId?, providerKind? }
  → 创建 GenerationJob(status=pending,落 runtimeMode/agentId/providerKind)
  → 写 AuditLog(task_dispatched, actor=@CurrentUser)
  → 返回 { value: { job } }
  说明:desktop_multica 下后端只"登记";真正让本地 daemon 跑由前端直连发起(后端不向本地 daemon 派发,NAT 不可达)。

POST /workspaces/:workspaceId/orchestration/jobs/:jobId/link-external
  body { externalTaskId, externalRef? }
  → 前端直连 Multica 拿到 task id 后回绑;这是后端对账的前提
  → 返回 { value: { job } }

POST /workspaces/:workspaceId/orchestration/jobs/:jobId/cancel
  → job 未终态:写意图 + 审计(task_cancelled);desktop 实际取消由前端直连 daemon 执行,对账确认终态
  → 已终态:幂等拒绝
  → 返回 { value: { job } }

POST /workspaces/:workspaceId/orchestration/jobs/:jobId/retry
  → 终态 job 重试:复用同 job、重置 pending、清 external*/progress/error/finishedAt
  → 写审计(generation_job_retry)
  → 返回 { value: { job } }
```

`link-external` 是 Q1=C 分流的关键接缝:派发"登记"在后端(真相源),"开跑"由前端直连(最低延迟),拿到 Multica task id 后回绑,后端才能对账。

### 对账轮询(后端独立后台任务,Q2=B 核心)

新增 `ReconciliationService`,用 `@nestjs/schedule` 的 `@Interval`(可配,默认 10s):

```
每个 tick:
  1. 查所有 status ∈ {pending, running} 且 externalTaskId != null 的 job
  2. 调 self-hosted Multica server 查这些 task 当前状态(后端侧 MulticaServerClient)
  3. 映射 Multica 状态 → GenerationJob:running→更新 progress/currentStep;
     succeeded/failed/cancelled → 写终态 + finishedAt
  4. 终态时(同一 prisma.$transaction):
       - 拉产物 → 写入 Asset 库(复用①的 asset 服务)
       - 写 UsageEvent(providerKind + 时长)
       - 写 AuditLog(generation_job_complete / failed,output_asset_imported)
  5. 幂等:已终态 job 跳过;按 externalTaskId + jobId 去重,避免重复写产物/用量
```

**设计要点:**
- 后端 → self-hosted Multica server:Q3=A 保证可访问。新增**后端侧** `MulticaServerClient`(独立于前端的浏览器侧 `multicaApiClient`;后端这个带服务凭据 `MULTICA_API_URL`/`MULTICA_API_TOKEN`,从 env 读,缺失则对账功能降级关闭但不影响其余后端——延续①"配置缺失显式降级")。
- 不依赖前端在线:轮询后端自驱,用户关页面照样回写 → 兑现"最终一致"。
- 幂等是安全底线(详见错误处理节)。

### 模块装配

- `OrchestrationModule` 引入 `PrismaModule` + 复用 `AssetService`/`UsageEventService`/AuditLog(①已有);注册到 `AppModule`。
- `ScheduleModule.forRoot()` 注册到 `AppModule`(`@nestjs/schedule` 新依赖)。
- 对账轮询测试环境**默认关闭**(env 开关),避免 e2e 后台定时器干扰;测试直接调 `ReconciliationService.reconcileOnce()` 断言(可控可重复)。

## 端到端数据流 + 前端集成

### desktop_multica 完整时序

```
[1] 前端 orchestrationService.dispatch()
      → POST /orchestration/dispatch → 后端建 GenerationJob(pending)+审计 → 返回 jobId
[2] 前端 runtime provider 直连本机 daemon/self-hosted server
      → createTask/createIssue → 拿到 Multica externalTaskId
[3] 前端回绑:POST /orchestration/jobs/:jobId/link-external { externalTaskId }
      → 后端写入 externalTaskId(对账从此能找到它)
[4] 本地执行 + 实时流式(纯前端直连,零云端往返)
      → 前端 subscribeToTask 连 daemon WS → 进度/日志逐行刷新 UI
[5] 后端对账(独立于前端在线)
      → ReconciliationService 每 tick 扫未终态+externalTaskId 的 job
      → 查 self-hosted Multica server → 映射状态 → 更新 progress / 落终态 + 产物/用量/审计
[6] 用户视角
      → 页面开着:前端直连实时流(快) + 后端对账最终态(准),收敛一致
      → 关页面/换设备重进:读后端 job(含对账后终态/产物/进度快照)→ 状态永远对
```

**取消时序**:`cancel(jobId)` → ①前端直连 daemon 取消本地执行 → ②POST `/cancel` 写后端意图+审计 → 对账确认 Multica 终态 → 落 `cancelled`(非 failed)。
**重试时序**:POST `/retry` → job 重置 pending、清 external*/progress/error/finishedAt → 回到 [2] 重新直连开跑。复用同 job 保留历史关联(projectId/assets 链)。

### 前端 orchestration service(逻辑下沉)

新建 `src/runtime/orchestrationService.ts`(非 UI):
- 编排 [1][2][3] 三步派发,暴露 `dispatchTask(input): Promise<{ jobId, externalTaskId }>`。
- 封装 cancel/retry 调后端 + 调 provider 的组合。
- `GlobalAgentDispatcherModal.tsx` 里手工拼接的 runtime↔repository 逻辑替换为调用此 service,UI 只管展示和触发。

### 前端 runtime provider 补齐(兑现实时 UX)

`multicaAgentRuntimeProvider` 现状:`subscribeToTask` 不连真实 WS、`listTasks` 返回 `[]`。本批:
- `subscribeToTask`:接入 daemon/self-hosted server 真实 WS(`multicaWsUrl`),进度/日志事件回调 UI。
- `listTasks`:从后端 `GenerationJob` 仓储读(后端是真相源),**不再**从 Multica 直接列。即:列任务走后端,看单任务实时进度走直连 WS。

### 契约对齐落地(Q4=A)

- 前端 runtime 类型(`agentRuntimeTypes.ts` task 形状)对齐后端 canonical:status 用 `pending/running/succeeded/failed/cancelled`;前端独有的 `queued` 在 provider 边界一次性映射为 `pending`。
- `generationJobRepository.ts`(前端)status 类型同步;6 个 runtime 测试 fixtures 随之更新。

### 前端 token 注入

orchestration 端点是 workspace 范围,经②的 apiClient 走(自动带 Bearer + 401 refresh)。link-external/cancel/retry 都通过 apiClient,**无需新认证代码**。

## 错误处理、幂等与安全

### 幂等(对账可信度命脉,防重复计费/产物)

- **终态短路**:job 已 `succeeded/failed/cancelled` → 对账跳过,不再拉产物/写用量。
- **产物去重**:导入 Asset 按 `(workspaceId, externalTaskId, 产物标识)` 判重,已存在则跳过。
- **用量去重**:`UsageEvent` 写入前检查该 job 是否已有对应记录(jobId + 事件类型);一次执行只记一次。
- **落终态 + 写产物/用量同一 `prisma.$transaction`**:要么全成要么全不,避免"终态写了产物没入库"半截状态。

### 错误状态映射(沿用①②信封 + 06-09 状态表)

| 场景 | 后端响应 | 前端表现 |
|---|---|---|
| Multica server 不可达(对账时) | 不改 job 状态,记 warning,下 tick 重试 | job 停 running,显示"运行中(对账暂不可达)",**不误判失败** |
| Multica 返回 task failed | job→failed,error 存原因摘要 | 显示失败原因 + 重试按钮 |
| dispatch 时 Multica 配置缺失 | 后端未配 → 对账降级关闭,dispatch/link 仍可用 | — |
| 前端直连 daemon 失败(步骤2) | job 停 pending,前端报错可重试 | "无法连接本地运行时" |
| link-external 一直没回绑 | job 长期 pending 无 externalTaskId → 超时清理 | 显示"派发未确认" |
| 取消但 Multica 已先完成 | 对账发现已 succeeded → 落 succeeded,审计记竞态 | 显示实际终态 |

- **孤儿 pending 清理**:job `pending` 且 `externalTaskId=null` 超阈值(如 15min)→ 对账标记 `failed`(error="dispatch not confirmed")。
- **401/403 复用②**:orchestration 端点认证错误走②既有 apiClient 自动 refresh / 上抛,无新逻辑。

### 安全(本地执行,06-09 §12 落地)

- **本地执行显式披露**:派发到 `desktop_multica` 前,UI 明确告知"将在你的本机执行",要求确认 workspace/repo scope(本批最小版:确认勾选 + scope 显示)。
- **token 隔离(②原则)**:浏览器 web 模式绝不接收本地 daemon token;后端 `MULTICA_API_TOKEN` 是服务侧凭据,只存后端 env,绝不下发前端。前端直连用前端自己的 Multica 凭据通道(`VITE_MULTICA_TOKEN` 仅 dev)。
- **审计全覆盖**:task_dispatched / cancelled / complete / failed / output_asset_imported / (auth_expired) 全经①的 `logAuditEvent`,actor = ②的 `@CurrentUser` 真实身份——兑现②"审计接真身"。
- **prompt/产物最小化**:派发 input 只含必要产品上下文;敏感客户数据需显式许可才传(本批:不自动注入敏感模块数据)。
- **日志脱敏**:实时日志流 token/密钥字段在 provider 边界脱敏。

### 对账可观测性

对账 tick 异常(不可达/映射失败)记后端日志,不抛出中断定时器;Settings 运行时面板显示"对账健康度"(最小版:最后成功对账时间)。

## 测试策略与验收线

延续①②:后端 Jest e2e(真实 DB,不 mock)+ 前端 tsx 脚本;唯一新增 mock 边界是 **Multica server**(fixture,不要求实跑 daemon)。

### 后端 e2e(`apps/api/test/`)

- **`orchestration.e2e-spec.ts`**:dispatch→建 pending job+审计;link-external 绑定;非成员/无 token→403/401(复用②守卫);cancel(未终态写意图、已终态拒绝);retry(终态→重置 pending+清 external*/progress/error)。
- **`reconciliation.e2e-spec.ts`**(对账核心,手动 `reconcileOnce()`,不开定时器):注入 fake `MulticaServerClient`(fixture 返回 running/succeeded/failed/cancelled);running→更新 progress;succeeded→落终态+产物入 Asset+UsageEvent+审计(一个事务);**幂等断言**:同终态连跑两次→Asset/UsageEvent 只 1 条;Multica 不可达→job 不变不误判;孤儿 pending 超时→failed;取消竞态(意图 cancel 但已 succeeded)→落 succeeded。
- **`generation-job.e2e-spec.ts`**(①已有,扩展):新增 `cancelled` 流转(pending→cancelled、running→cancelled)合法,非法仍 400。

### 前端 tsx 脚本(`scripts/`)

- **`orchestration-service.test.ts`**:注入式 mock(apiClient + runtime provider),断言三步派发顺序,cancel/retry 调用组合。
- **`multica-runtime-provider.test.ts`**(已有,扩展):`subscribeToTask` 接真实 WS 契约(fake WS fixture),`listTasks` 改读后端。
- **契约对齐回归**:6 个 runtime 测试 fixtures 更新到统一 status 枚举(queued→pending);`generation-job-repository-api.test.ts` 同步。
- **`multica-server-client.test.ts`**:后端侧 client 用 fakeFetch pin 查询/产物端点 URL+映射。

### 验收线(全过即③本批完成)

```
cd apps/api && DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/aistudio_test?schema=public" JWT_SECRET="test-secret" npm test
  # ①14 + ②13 + ③orchestration/reconciliation/扩展状态机 全绿
npm run test:orchestration-service
npm run test:multica-runtime-provider   # 扩展后
npm run test:multica-server-client
npm run test:runtime-contract           # 契约对齐回归
npm run test:generation-job-repository-api
npm run lint    # tsc 全绿
npm run build   # 构建通过
```

**不实跑 Multica 说明**:对账/直连的真实 Multica 端到端联调作为发布前手动验证(self-hosted Multica smoke),不进自动化套件——与①②"真实 DB 但外部依赖 fixture"一致。

## 范围边界总结

| ✅ 本批交付 | ❌ 留后续批次 |
|---|---|
| GenerationJob canonical 升级 + 迁移 | web/self_hosted 后端直连派发 |
| 后端 Orchestration 域(dispatch/link/cancel/retry) | Multica Cloud |
| 后端 ReconciliationService 轮询对账 + 幂等 | aistudio 自有桌面壳 |
| 后端 MulticaServerClient(服务侧) | 跨设备秒级实时进度 |
| 前端 orchestrationService 下沉 | 细粒度计费规则(④) |
| 前端 provider 真实 WS + listTasks 走后端 | 多 agent/squad 编排 |
| 契约对齐(status 枚举统一) | Skill/模板映射 |
| 产物/用量/审计回写 | 权限按 plan tier 分级 |
| 本地执行披露 + scope 确认(最小版) | 完整数据脱敏策略 |

## 开放问题 / 实现计划需明确

1. **对账轮询间隔与并发**:默认 10s,多实例部署时的去重锁(本批单实例,分布式锁留⑥)。
2. **Multica server 查询/产物 API 的确切形状**:实现计划据 `multica-compatibility.md` 与现有 `multicaApiClient` 端点(`GET /api/agents`、`POST /api/issues`、`POST /api/tasks/:id/cancel`)推断后端侧查询端点;若上游无批量查询,退化为逐个查。
3. **孤儿 pending 超时阈值**:暂定 15min,实现计划定 env 可配。
4. **产物标识去重键**:依赖 Multica 产物是否有稳定 id;若无,用 `(externalTaskId, 文件名/序号)` 复合键。
