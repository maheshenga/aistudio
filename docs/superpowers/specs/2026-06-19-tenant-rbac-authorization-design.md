# 租户 RBAC 授权拦截设计

- 日期:2026-06-19
- 子项目:B1(后端生产加固系列之一,源自 ④/⑤ 后的后端成熟度评估)
- 状态:已实施(2026-06-19),后端 RBAC e2e 全绿,现有 e2e 无回归

## 背景与问题根因

后端多租户隔离目前只有两层:`AuthGuard`(认 user)+ `TenantGuard`(认成员身份,注入 `req.member`)。`TenantGuard` 只判"请求者是不是该 workspace 的成员",**不判角色**。

后果(越权洞,已核实):除 `billing.controller.ts` 的 grant 接口手写了一处角色检查外,**所有写接口都没有角色级拦截**。即任意成员——包括 `viewer`——都能:

- 改其他成员的角色、删成员、加成员(MemberService)
- 修改 workspace 信息(WorkspaceService.update)
- 写各业务资源、settings、apiKey/webhook

这在多租户 SaaS 里是实打实的越权风险。B1 的目标是**给后端写接口加角色级授权拦截,口径与前端 `src/saas/permissions.ts` 单一对齐**。

## 目标与范围

**范围内:**
- 后端建立权限模型(权限枚举 + 角色→权限映射),与前端对齐 + 新增 `members.manage`、`resources.write`。
- 新增 `RolesGuard` + `@RequirePermission(...)` 装饰器,串入现有全局 guard 链。
- 给所有受保护写接口挂权限要求;billing grant 改用装饰器(移除手写检查)。
- owner 保护:不可降级/删除 owner,保证工作区至少一个 owner。
- 前端 `permissions.ts` 同步新增两个权限,保持前后端单一事实来源。
- 后端权限矩阵 e2e + `hasPermission` 单元测试。

**不在范围内:**
- 邀请流程(无邮件邀请/邀请 token)——属 B2 或独立任务。
- 业务资源的逐域细粒度授权(本期用粗粒度 `resources.write` / `billing.manage` 两层覆盖,不为 16 域各设权限)。
- 前端 UI 改动(仅扩充权限枚举/映射,不改组件)。

## 权限模型

**权限枚举**(后端新建,与前端 10 个对齐 + 新增 2 个):

```
workspace.view / workspace.manage
billing.view / billing.manage
tasks.manage / generation.dispatch
settings.manage / assets.manage
audit.view / api_keys.manage
members.manage     ← 新增:成员管理独立授权维度
resources.write    ← 新增:运营类业务资源写权限(粗粒度)
```

**角色 → 权限映射**(后端 `ROLE_PERMISSIONS`,与前端一致 + 新权限分配):

| 角色 | 权限 |
|---|---|
| owner / admin | 全部 12 个(含 members.manage、resources.write) |
| operator | workspace.view, tasks.manage, generation.dispatch, settings.manage, assets.manage, **resources.write** |
| finance | workspace.view, billing.view, billing.manage, audit.view |
| viewer | workspace.view, billing.view |

设计意图(角色语义自洽,面向长期运营/UX):
- viewer 全程只读(运营、财务数据都不能写)
- finance 能管财务数据,不能改运营资源、不能管成员
- operator 能管运营数据,碰不到财务、不能管成员
- 只有 owner/admin 能管成员(`members.manage`)

## 拦截机制

执行顺序:`AuthGuard`(401 未登录)→ `TenantGuard`(403 非成员,注入 `req.member`)→ `RolesGuard`(403 成员但权限不足)。三层语义清晰:先认人、再认租户、最后认权限。

`RolesGuard`:
- 通过 `Reflector` 读取方法/控制器上的 `@RequirePermission(permission)` 元数据。
- 未标注 `@RequirePermission` 的接口不拦截(读接口默认放行给任意成员,等同要求 `workspace.view`)。
- 取 `req.member.role`(TenantGuard 已注入,不重复查库),调 `hasPermission(role, permission)` 判断,失败抛 `forbidden()`(现有 DomainError 工厂,HTTP 403)。

后端权限判断 `hasPermission(role, permission)` 与前端 `hasWorkspacePermission` 同语义,集中在 `src/common/rbac/`(新建),作为后端单一事实来源。

## 组件单元

### 1. 后端权限定义(新建)
- 路径:`src/common/rbac/permissions.ts`
- 导出:`WorkspacePermission` 联合类型(12 个)、`ROLE_PERMISSIONS` 映射、`hasPermission(role, permission): boolean`。
- 职责:纯数据 + 纯函数,无依赖,可独立单测。

### 2. `@RequirePermission` 装饰器 + `RolesGuard`(新建)
- 路径:`src/common/rbac/require-permission.decorator.ts`、`src/common/rbac/roles.guard.ts`
- 装饰器:`SetMetadata('requiredPermission', permission)`。
- Guard:读元数据 + 查 `req.member.role` + `hasPermission`,失败 `forbidden()`。全局注册(在 TenantGuard 之后)。

### 3. 接口权限映射(给现有 controller 挂装饰器)

| 接口 | 要求权限 |
|---|---|
| Member create/update(改角色)/remove | `members.manage` |
| Workspace.update | `workspace.manage` |
| Settings 写 | `settings.manage` |
| ApiKey / Webhook 写 | `api_keys.manage` |
| Billing grant(移除手写检查) | `billing.manage` |
| 运营类资源写(campaign/announcement/asset/customer/keyword/media/risk/ticket/task/project/generationJob/agency) | `resources.write` |
| 财务类资源写(financial/payment/taxEvent) | `billing.manage` |
| 所有读接口(GET) | 不挂装饰器(任意成员可读) |

注:运营/财务资源经 `WorkspaceResource` 泛型基类,装饰器加在基类派生的 controller 写方法上;若基类统一暴露 create/update/remove,需支持按 controller 指定所需权限(例如基类工厂接收 `writePermission` 参数,各资源 module 注册时传入)。

### 4. owner 保护(MemberService 内 service 层校验)
- 改角色:目标成员为 owner 时,不允许降级(除非由 owner 本人操作且仍保留至少一个 owner)。
- 删成员:不允许删除最后一个 owner。
- 这些是业务不变量,放在 service 层(即便授权通过也要校验),抛 `forbidden()` 或 `validation` 类 DomainError。

### 5. 前端同步
- `src/saas/permissions.ts`:`WorkspacePermission` 枚举加 `members.manage`、`resources.write`;`ROLE_PERMISSIONS` 按上表分配(owner/admin 两者都加,operator 加 resources.write)。
- 无 UI 改动。

## 错误处理
- 未登录 → AuthGuard 401。
- 非成员 → TenantGuard 403。
- 成员但权限不足 → RolesGuard `forbidden()` 403,code `forbidden`,经现有 `AllExceptionsFilter` 统一返回。
- owner 保护违规 → service 层抛 DomainError(403/422),由 filter 统一返回。

## 测试
后端 e2e(`test/*.e2e-spec.ts` + jest,沿用现有 `DATABASE_URL_TEST`+`JWT_SECRET`+`FIELD_ENCRYPTION_KEY` 运行约定):

- 新增 `test/rbac.e2e-spec.ts`:权限矩阵——对 owner/admin/operator/finance/viewer 五角色 × 关键受保护接口断言:
  - owner/admin:全部通过。
  - operator:运营资源写通过;members.manage、billing、财务资源写、workspace.update → 403。
  - finance:财务资源写、billing 通过;运营资源写、members、workspace.update → 403。
  - viewer:所有写操作 403;读操作 200。
- owner 保护用例:admin 不能降级/删除 owner;不能删最后一个 owner。
- 复用现有各资源 e2e:确认加 guard 后,用足权限的角色跑原有正向用例不回归(必要时把测试用的角色提升为 owner/admin)。
- 单元测试 `hasPermission(role, permission)`:后端 jest,与权限定义同处(`src/common/rbac/`),覆盖五角色对各权限的判断,语义对齐前端 `hasWorkspacePermission`。

## 验收标准
- 所有写接口经 RolesGuard 拦截;viewer/finance/operator 越权写返回 403。
- billing grant 手写角色检查已移除,改用 `@RequirePermission('billing.manage')`。
- owner 不可被降级/删除,工作区始终至少一个 owner。
- `test/rbac.e2e-spec.ts` 权限矩阵全绿;现有 e2e 不回归。
- 前后端 `ROLE_PERMISSIONS` 口径一致(均含 members.manage、resources.write 且分配相同)。
