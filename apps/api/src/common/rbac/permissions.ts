/**
 * 后端 RBAC 权限定义 —— 单一事实来源。
 *
 * 与前端 `src/saas/permissions.ts` 的 `WorkspacePermission` / `ROLE_PERMISSIONS`
 * 口径严格对齐（含 members.manage、resources.write 两个新增权限）。
 *
 * 纯数据 + 纯函数，无 NestJS 依赖，可独立单测。
 */

export type WorkspacePermission =
  | 'workspace.view'
  | 'workspace.manage'
  | 'billing.view'
  | 'billing.manage'
  | 'tasks.manage'
  | 'generation.dispatch'
  | 'settings.manage'
  | 'assets.manage'
  | 'audit.view'
  | 'api_keys.manage'
  | 'members.manage'
  | 'resources.write';

export type WorkspaceRole = 'owner' | 'admin' | 'operator' | 'finance' | 'viewer';

const ALL_PERMISSIONS: readonly WorkspacePermission[] = [
  'workspace.view',
  'workspace.manage',
  'billing.view',
  'billing.manage',
  'tasks.manage',
  'generation.dispatch',
  'settings.manage',
  'assets.manage',
  'audit.view',
  'api_keys.manage',
  'members.manage',
  'resources.write',
];

export const ROLE_PERMISSIONS: Record<WorkspaceRole, readonly WorkspacePermission[]> = {
  owner: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  operator: [
    'workspace.view',
    'tasks.manage',
    'generation.dispatch',
    'settings.manage',
    'assets.manage',
    'resources.write',
  ],
  finance: [
    'workspace.view',
    'billing.view',
    'billing.manage',
    'audit.view',
  ],
  viewer: [
    'workspace.view',
    'billing.view',
  ],
};

export function isWorkspaceRole(role: string): role is WorkspaceRole {
  return role in ROLE_PERMISSIONS;
}

/**
 * 判断角色是否拥有某权限。语义与前端 `hasWorkspacePermission` 一致。
 * 未知角色一律返回 false。
 */
export function hasPermission(role: WorkspaceRole | string, permission: WorkspacePermission | string): boolean {
  if (!isWorkspaceRole(role)) return false;
  return ROLE_PERMISSIONS[role].includes(permission as WorkspacePermission);
}
