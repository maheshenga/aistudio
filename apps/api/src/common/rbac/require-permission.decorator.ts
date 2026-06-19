import { SetMetadata } from '@nestjs/common';
import type { WorkspacePermission } from './permissions';

export const REQUIRED_PERMISSION_KEY = 'requiredPermission';

/**
 * 标注某个接口所需的最小权限。
 *
 * 未标注 `@RequirePermission` 的接口不被 RolesGuard 拦截
 * （读接口默认放行给任意成员，等同要求 `workspace.view`）。
 *
 * 执行顺序：AuthGuard(401) → TenantGuard(403 非成员, 注入 req.member) → RolesGuard(403 权限不足)。
 */
export const RequirePermission = (permission: WorkspacePermission) => SetMetadata(REQUIRED_PERMISSION_KEY, permission);
