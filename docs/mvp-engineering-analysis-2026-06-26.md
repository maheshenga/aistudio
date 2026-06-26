# MVP 工程分析（排除人工与测试）

**范围：** 仅 **实现、架构、数据、运行时、部署、未完成工程**；不含财务签字、cohort、人工验收清单、以及「测试是否 pass」类门禁结论。  
**基线：** `main` @ `08d412f` · 2026-06-26

---

## 1. 工程结论（一句话）

**Paid-Beta 所需的控制面 + P1 创收域在代码结构上已闭环**（registry ↔ App、repository ↔ API、job ↔ credit ↔ asset ↔ audit）；**真实 AI/渲染产能** 与 **若干预览模块** 仍依赖 mock / 本地模拟；**生产形态** 仅 Compose 单路径，**身份与部分 P2 域** 仍为 demo/本地 可替换实现。

---

## 2. 双轨技术栈

| 轨 | 栈 | 职责 |
|----|-----|------|
| **前端** | React 19、Vite 6、TS、Tailwind v4、`src/components` ~98 视图 | SPA、模块 UI、`billableGeneration` 编排 |
| **API** | NestJS 10、Prisma 5、Postgres 16、`apps/api` | JWT、RBAC、generation job、credit、webhook outbox |
| **契约** | `src/lib/data/*Repository`、`src/product/registry.ts`、`src/runtime/*` | 三后端适配；Multica 映射 |

**组合根：** `main.tsx` → `SaasAuthProvider` → `AuthGate` → `ThemeProvider` → `UndoRedoProvider` → `AgentRuntimeContextProvider` → `App.tsx`（~900 行，`moduleId` switch 渲染）。

**刻意未做（计划内）：** `App.tsx` 路由/registry 大重构、独立 canvas 产品线全栈。

---

## 3. 产品注册与 UI 覆盖

| 指标 | 值 |
|------|-----|
| `ModuleId` / registry 记录 | 1:1（测试强制） |
| 可见功能 | 67 |
| 导航域 | 14 |
| `readiness: implemented`（registry 行） | 62 |
| 预览策略（文档） | `ai_canvas` + Avatar×4 → `ModulePreviewBanner` |
| 隐藏兼容 | `e_white_bg`、`marketing_diy` 等（非可见 paid 路径） |

**工程含义：** 凡标 `implemented` 的模块均有 **组件 + switch 分支**；不等于「端到端真模型」，见 §6。

---

## 4. 数据层

### 4.1 三模式 `dataBackend`

- **`local`：** `localStorage` + 可选 Firebase RTDB 驱动（MVP 默认开发）。
- **`firebase`：** 远程 RTDB 路径。
- **`http`：** `apiClient` → Nest API（**Paid-Beta / Compose 唯一合格后端**）。

Repository **统一** `workspaceId`（+ 可选 `userId`）命名空间；30+ 域仓库（project、asset、generationJob、billing、credit、audit、customer、campaign、keyword、webhook、store、team…）。

### 4.2 API 与 schema

- **Prisma schema ~530 行**，**15** 个已提交 migration。
- **Controller 域：** auth、workspace、billing、generation-job、orchestration、asset、audit、member、settings、webhook、keyword、customer、campaign、task、financial、tax、payment、risk、media、api-key…（与 P0/P1 面板对齐）。

### 4.3 计费链（工程实现）

```
UI startBillableGenerationJob
  → createGenerationJob (HTTP: POST + hold)
  → 模块价 generationCredits() / COMMERCIAL_USAGE_PRICING
  → terminal: capture | refund
  → usage + audit + webhook enqueue (API)
```

- 前端 `buildBillableGenerationPricing` **默认** `providerKind: 'mock'`, `runtimeMode: 'web'`（可 per-call 覆盖，多数视图未接真 provider）。
- API `CreditService` + `generationCredits` 与 UI 矩阵 **双份定义**（靠 `pricing-matrix-sync` 脚本对齐，属工程约束而非运行时自动同步）。

---

## 5. Agent 运行时

| 模式 | 实现 | 工程状态 |
|------|------|----------|
| `web` | `webMockAgentRuntimeProvider` | 固定 mock agents/tasks，**无外部推理集群** |
| `desktop_multica` | bridge + `multicaAgentRuntimeProvider` | 适配器 + mapper **已实现**；live bridge **环境依赖** |
| `self_hosted_multica` | API/WS 配置 + 同上 provider | 同上 |

`runtimeMode.ts`：`auto` 解析顺序（desktop 检测 → env `VITE_MULTICA_*` → web）。

**P1-R03 回调：** `providerCallbackHandler.ts`（**前端仓库侧**）处理 success/partial/error/timeout/幂等；注释写明 Web 由 mock 本地触发，Multica 走外部 WS/HTTP。**API 侧** generation-job 状态机 + webhook 与 staging callback smoke 对接的是 **mock-render 约定路径**，非已绑定的商用 render 厂商 SDK。

---

## 6. 创作链路：真持久化 vs 模拟完成

### 6.1 已接「工作区记录 + 扣费 + 审计」的 P1 视图（代表）

电商、Image/Video、Copywriting、Chat、Speech、Remix、Marketing、Director、Design 工作流等 — 普遍模式：

1. `startBillableGenerationJob` / `createGenerationJob`
2. 本地或 mock runtime **推进 status**（或 FeatureView 类 **模板文案/占位 URL**）
3. `createWorkspaceAsset` + `usage` + `audit`

**HTTP 模式下：** job/credit **持久化在 Postgres**；**生成物内容** 常为占位 URL 或 `@google/genai` 仅见于少数路径（如 `AICopilot`），**非全模块统一真推理管线**。

### 6.2 预览 / 弱工程域

| 模块 | 工程现状 |
|------|----------|
| **`ai_canvas`** | `AICanvasView`：节点图 + **settings 自动保存**（画布状态），**无** generation job → 资产 → billing 标准环 |
| **Avatar×4** | `AvatarView` + `avatarRepository`（consent/source **有 CRUD 雏形**）；registry 仍 **preview/mock 策略**；无 P2-B01/B02 全生命周期 |
| **隐藏路由** | DIY/白底等：兼容组件存在，**非** 67 可见 paid 集合 |

### 6.3 与「Commercial MVP 定义」的差距（纯工程）

原始计划要求 loop：**runtime 真执行 → 资产入库**（§2 superpowers plan）。当前工程 **在 http 下完成了 4–6 步的账户与账本**，**第 4 步「真 AI/渲染」在 web 默认路径仍为 mock/模板**，属 **架构上有意分层**（provider 可插），**产品能力上未接满**。

---

## 7. 身份与安全（工程）

| 项 | 实现 | 缺口 |
|----|------|------|
| Staging/API | JWT access/refresh、bcrypt、`FIELD_ENCRYPTION_KEY` 字段加密 | 生产密钥轮换/分离 **未自动化** |
| 前端会话 | `SaasAuthContext` + **local demo session** 可种子 | **OAuth/Firebase Auth 未替换**（`.env.example` 已标注边界） |
| RBAC | `permissions.ts` + API guards | 与 registry `permission` 一致 enforced |
| Speech/Chat 合规 | consent 门控 + 审计 action 已扩展 | Avatar 全量 consent 未升 P2 |

---

## 8. 部署与运维（工程资产）

| 资产 | 状态 |
|------|------|
| `docker-compose.yml` | db + api + web；api **healthcheck**；web `depends_on` api healthy |
| 构建 | `VITE_*` 烘焙；`PUBLIC_API_URL` / `CORS_ORIGINS` 必须匹配浏览器 origin（你处 **8081**） |
| 脚本 | `staging-verify.ps1` / `staging-verify-wsl.sh` / `staging-up.ps1` |
| 已移除 | k3s 清单（刻意 Compose-only） |
| WSL 实践 | Docker Hub 需 **Windows 主机 Clash 网关**（`172.31.x.x:7897`）— **未写入 compose**，属环境文档 |

**无：** K8s/Helm、蓝绿、集中日志、备份 job、Terraform。

---

## 9. 前端工程债（非测试）

| 项 | 影响 |
|----|------|
| **`App.tsx` 巨型 switch** | 新模块成本高；与 registry 靠脚本同步 |
| **vendor chunk** | `app-ops` 等 >500kB（build 警告）；无动态 import 治理 |
| **双轨 dev vs staging** | `npm run dev` → local 后端；与 Compose **行为不一致** |
| **Gemini** | 依赖在包内；**模块级接入不均匀** |

---

## 10. API / 后端工程缺口

| 项 | 说明 |
|----|------|
| **外部 provider 接入** | `providerKind`、orchestration `linkExternal` 有；**无** 统一「厂商 adapter 注册表」与生产 render 配置 |
| **Orchestration reconcile** | `ORCHESTRATION_RECONCILE_ENABLED` 默认 false；reconciliation service 存在但未作 paid-beta 默认开 |
| **Health 端点** | `GET /health`（DB ping + 200）；compose healthcheck 已对齐 |
| **P3 面** | webhook **已实现** outbox；public API 商业化、plugin gate、risk 发布闸门在 **remaining-issues P3** |

---

## 11. P2 / P3 backlog（仅工程视角，未纳入当前 paid-beta 关门）

摘自 [saas-commercial-mvp-remaining-issues.md](./saas-commercial-mvp-remaining-issues.md)：

- **P2：** Avatar B01/B02、CRM 深化、门店数据环、团队/子账号、共享 Agent 库等 — 部分 **已有 repository + 视图**，业务 **闭环深度不足**。
- **P3：** Public API 访问、员工账号池、插件中心、风控闸门 — **API 模块存在**，产品闸门未开。

**对 62 implemented 的含义：** 多为 **CRUD + 权限 + 面板**，非 **行业级深度 ERP/门店/客服**。

---

## 12. 工程完成度矩阵（不含人/测）

| 域 | 结构/代码 | 真 provider / 产能 | 生产部署形态 |
|----|-----------|-------------------|--------------|
| P0 控制面 | **高** | N/A（非生成核心） | Compose 可用 |
| P1 创收 UI+API+账本 | **高** | **低–中**（mock/web 默认） | 同左 |
| P1 回调契约 | **中**（handler+API 状态机） | **低**（无绑定厂商） | — |
| 预览 canvas/avatar | **中**（UI+部分 repo） | **低** | — |
| Multica 双模 | **中**（适配器齐全） | **环境依赖** | — |
| 身份 | **中**（JWT 真；前端可 demo） | — | 密钥手工 |
| P2/P3 扩展 | **低–中**（骨架） | — | — |

---

## 13. 若只做「工程下一步」（仍排除人/测）

1. **统一 provider 抽象：** API 侧 callback ingress + 配置化 `providerKind` → 厂商 adapter（接 R03 真机）。
2. **Web 创作路径：** 按模块将 `startBillableGenerationJob` 后接 **真实 genai/Multica** 或明确「仅 staging mock」配置开关。
3. ~~**`/health` + compose 探活**~~ — 已实现 `GET /health` + compose healthcheck。
4. **Auth：** HTTP 模式下禁用 demo session 种子；接真实 register/login 仅 API（前端已具备 client）。
5. **Avatar P2 或 canvas 剥离：** 二选一产品决策后补 registry + job 环或移出导航。
6. **CI 制品：** 可选 GitHub Actions build compose images（不涉及人工签字）。

---

## 14. 相关文档

- 含人工/测试总览：[mvp-progress-analysis-2026-06-26.md](./mvp-progress-analysis-2026-06-26.md)
- 范围：[paid-beta-scope.md](./paid-beta-scope.md)
- 计划源：[superpowers/plans/2026-06-10-commercial-mvp-custom-development-plan.md](./superpowers/plans/2026-06-10-commercial-mvp-custom-development-plan.md)

---

*本页描述代码与架构现状，不表示商业可售或验收通过。*