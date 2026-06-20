# P3 Platform Expansion 进度状态报告

## Context

P0（SaaS 控制面）、P1（收入工作流）、P2 Business Edition（9 个非数字人 issue）已全部完成并本地验证通过。P3 Platform Expansion 包含 7 个 issue（E01–E07），目标是将平台扩展能力（社媒挂载、员工账号池、公共 API、风控、插件中心、自托管 Multica、发布门禁）升级为 repository-backed + 审计 + 权限/计费门控的完整闭环，并确保任何对外副作用都不可在缺少审计、权限、计费契约时执行。本报告基于对每个 P3 issue 的源码审计与契约测试结果。

日期：2026-06-21

---

## 总览

| 指标 | 数值 |
|------|------|
| P3 Issue 总数 | 7 |
| 实现完成（100%） | 7（E01、E02、E03、E04、E05、E06、E07） |
| 完成度 | **100%（7/7）** |

> 范围说明：E01–E07 全部按用户批准的执行顺序（E02→E01→E06→E03→E04→E05→E07）完成，repository-backed 闭环 + 审计日志 + 权限/计费门控，并通过相关契约测试与发布门禁。

---

## Issue 详情

### P3-E01: 社媒账号安全元数据挂载

| 项目 | 状态 |
|------|------|
| 完成度 | **100%** |
| Repository | `src/lib/data/mediaRepository.ts` ✅ |
| Component | `src/components/MediaAccountsView.tsx` ✅ |
| 关键依赖 | `src/lib/data/auditLogRepository.ts`, `src/saas/permissions.ts` |

**已完成：**
- 媒体账号元数据持久化（provider/owner/status/scopes/workspaceId），凭证仅存 last4/credentialRef，保存后不回显原始凭证
- connect/disconnect/refresh/publish 动作经 `hasWorkspacePermission` 门控；无权限记 `permission_denied`
- 账号生命周期动作（`media_account_update` 等）发出审计事件
- 注册表 readiness 升级为 `implemented`

**剩余工作：** 无（已闭环）

---

### P3-E02: 员工账号池

| 项目 | 状态 |
|------|------|
| 完成度 | **100%** |
| Repository | `src/lib/data/employeeAccountRepository.ts` ✅ |
| Component | `src/components/EmployeeAccountsView.tsx` ✅ |

**已完成：**
- 账号池条目持久化（owner/role/status/allowedModules/workspaceId），reload 后存活
- create/assign/suspend/reactivate/remove 全套审计历史（`member_update` 等）
- 可见字段不存储原始外部密码/密钥
- 与团队/子账号权限联动
- 注册表 readiness 升级为 `implemented`

**剩余工作：** 无（已闭环）

---

### P3-E03: 公共 API 密钥加固（scopes/限流/吊销/审计）

| 项目 | 状态 |
|------|------|
| 完成度 | **100%** |
| Policy | `src/saas/apiAccess.ts` ✅（纯策略：scopes + rate-limit + billing estimate） |
| Component | `src/components/ApiKeysView.tsx` ✅ |
| Repository | `src/lib/data/apiKeyRepository.ts` + `src/lib/data/usageRepository.ts` ✅ |

**已完成：**
- API key 按 module/action 划分 scopes；限流元数据与执行契约
- 吊销/轮换元数据；create/reveal-once/rotate/revoke/失败访问全部审计
- 外部 API 用量关联计费估算（apiAccess billing estimate）
- 原始密钥仅 reveal-once 一次性展示，保存后不回显
- 保护动作 `api_key.mutate` 映射到权限（saas-foundation 契约固定）
- 注册表 readiness 升级为 `implemented`

**剩余工作：** 无（已闭环）

---

### P3-E04: 风控中心真实信号聚合

| 项目 | 状态 |
|------|------|
| 完成度 | **100%** |
| Policy | `src/saas/riskPolicy.ts` ✅（纯聚合策略，零副作用） |
| Component | `src/components/RiskCenterView.tsx` ✅ |
| 集成 | `src/components/AdminView.tsx`（risk tab + 深链导航） ✅ |

**已完成：**
- `assessWorkspaceRisk` 聚合 6 类信号：quota / provider / permission / api_key / runtime / audit anomaly
- 风险分级（low/medium/high/critical）+ 推荐补救，按等级与类别排序
- 每条风险携带 `source`（moduleId/adminTab/recordId）支持深链跳转到来源模块或审计事件
- **风控中心保持只读**：回归断言验证视图内无 provider/api_key/member 等 mutation 调用，补救动作需另行审批
- 内容审核队列复用既有 riskRepository（与运营风险聚合区分）

**剩余工作：** 无（已闭环）

> 备注：运营风险聚合（riskPolicy）与既有内容审核 riskRepository 是两个维度——前者只读聚合既有 billing/provider/member/apiKey/runtime/audit repo，不引入新持久化。

---

### P3-E05: 插件中心安全门控（权限/计费/安全/审计）

| 项目 | 状态 |
|------|------|
| 完成度 | **100%** |
| Policy | `src/saas/pluginPolicy.ts` ✅（5 态审核 + 执行门控 + 计费） |
| Component | `src/components/PluginCenterView.tsx` ✅ |
| 集成 | `src/components/AdminView.tsx`（plugins tab） ✅ |

**已完成：**
- 门控目录状态机：hidden / internal / reviewed / enabled / disabled（`PLUGIN_REVIEW_STATES` 5 态）
- install/enable/disable/configure/execute 全部要求 `plugins.manage` 权限
- 插件执行计费元数据（explicit credits→estimated、billable→review_required、none→unpriced）
- 生命周期与执行审计（plugin_install/enable/disable/config_update/execute/execute_blocked）
- **未审核插件不可执行**：`canExecutePlugin` 先校验权限→审核态→启用→需配置，未审核返回 `not_reviewed`
- 保护动作 `plugin.mutate` 映射到 `plugins.manage`（saas-foundation 契约固定）

**剩余工作：** 无（已闭环）

---

### P3-E06: 自托管 Multica 运营与部署认证

| 项目 | 状态 |
|------|------|
| 完成度 | **100%** |
| Runtime | `src/runtime/multicaAgentRuntimeProvider.ts` + `multicaApiClient.ts` + `useAgentRuntimeStatus.ts` ✅ |
| Component | `src/components/SettingsView.tsx` + `AgentStatusDashboardView.tsx` ✅ |

**已完成：**
- 认证已配置的 API / WS 端点
- 不可达端点将 runtime 标记为 degraded，不破坏 Web 模式
- 端点恢复后正常恢复，不丢失本地任务/资产
- 桌面守护进程 token 在浏览器 Web 模式下绝不暴露
- 部署相关端点与鉴权策略文档化；派发任务携带 runtime 元数据

**剩余工作：** 无（已闭环）

---

### P3-E07: P3 发布门禁（防未审计外部副作用）

| 项目 | 状态 |
|------|------|
| 完成度 | **100%** |
| Test | `scripts/launch-readiness.test.ts`（P3 release gate 块） ✅ |
| Test | `scripts/saas-foundation.test.ts`（保护动作固定） ✅ |
| Registry | `src/product/registry.ts`（readiness/route status） ✅ |
| Permissions | `src/saas/permissions.ts`（mutation 动作权限元数据） ✅ |

**已完成：**
- 数据驱动门禁 `p3GateTargets`（media / employee_accounts / saas_api_keys / plugins），每项断言：
  - 对外副作用必须有审计覆盖（required audits 出现在源码）
  - 必须存在 `logAuditEvent` 调用
  - mutation 动作必须有权限门控（`hasWorkspacePermission`）
  - `RAW_CREDENTIAL_PERSIST_PATTERNS`（2 个正则）必须**不**命中——禁止持久化原始凭证
  - 注册表 route status 为 rendered/internal，readiness ≠ placeholder，dataDependencies 含 audit
- P3 mutation 动作（`api_key.mutate` / `plugin.mutate`）必须在保护动作注册表声明权限
- **门禁失败时报告精确的违规模块名**（满足验收标准）

**剩余工作：** 无（已闭环）

---

## 关键发现

1. **已交付（7 个 issue 全部 100%）**：E01–E07 均实现 repository-backed/policy-backed + 审计日志 + 权限/计费门控闭环，并通过 launch-readiness、saas-foundation、risk-policy、plugin-policy 契约与发布门禁
2. **纯策略模块模式延续**：apiAccess.ts（E03）→ riskPolicy.ts（E04）→ pluginPolicy.ts（E05），均为零副作用纯策略，UI 读取决策
3. **凭证安全一致性**：媒体账号、API key、员工池统一只存 last4/credentialRef，原始凭证不回显（API key 仅 reveal-once）；发布门禁正则保证此约束不被回退
4. **风控只读约束**：风控中心仅聚合既有信号、不引入未审批补救副作用，由回归断言强制

---

## 执行记录（已完成）

| 顺序 | Issue | 起始 → 终态 | 关键动作 |
|------|-------|-------------|----------|
| 1 | E02 员工账号池 | 80% → 100% | owner/role/status/allowedModules 持久化 + 生命周期审计 |
| 2 | E01 社媒账号 | 85% → 100% | 安全元数据存储（last4/credentialRef）+ 动作权限门控 + 审计 |
| 3 | E06 自托管 Multica | 75% → 100% | 端点认证/降级/恢复 + token 不泄漏 + 运行时元数据 |
| 4 | E03 公共 API 密钥 | 65% → 100% | apiAccess 策略（scopes/限流/计费估算）+ reveal-once + 审计 |
| 5 | E04 风控中心 | 40% → 100% | riskPolicy 6 类信号聚合 + 深链来源 + 只读约束 |
| 6 | E05 插件中心 | 25% → 100% | pluginPolicy 5 态审核门控 + 执行计费 + 未审核不可执行 |
| 7 | E07 发布门禁 | 15% → 100% | 数据驱动门禁块（审计/权限/原始凭证/路由态）+ 精确违规模块名 |

---

## 验证方式

全部 P3 issue 完成后已运行并通过：

```bash
npm run lint                              # tsc --noEmit
npx tsx scripts/launch-readiness.test.ts  # 含 P3-E07 release gate
npx tsx scripts/saas-foundation.test.ts   # 含 api_key.mutate / plugin.mutate 保护动作
npx tsx scripts/product-registry.test.ts  # 注册表 readiness 升级后校验
npx tsx scripts/risk-policy.test.ts       # P3-E04
npx tsx scripts/plugin-policy.test.ts     # P3-E05
npm run build                             # 生产构建
npm run test:p0-specialized               # 全量专项契约套件
```

单独 issue 验证可运行各模块对应的 `scripts/*.test.ts` 脚本。
