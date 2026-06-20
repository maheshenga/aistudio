import type { ModuleId } from '../types';
import type { WorkspaceRole } from './types';

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
  | 'plugins.manage'
  | 'resources.write';

export type ProtectedWorkspaceAction =
  | 'admin.mutate'
  | 'agent.dispatch'
  | 'api_key.mutate'
  | 'asset.delete'
  | 'asset.export'
  | 'billing.mutate'
  | 'plugin.mutate'
  | 'runtime_settings.mutate'
  | 'task.mutate';

export const ROLE_PERMISSIONS: Record<WorkspaceRole, readonly WorkspacePermission[]> = {
  owner: [
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
    'plugins.manage',
    'resources.write',
  ],
  admin: [
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
    'plugins.manage',
    'resources.write',
  ],
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

export const PROTECTED_ACTION_PERMISSIONS: Record<ProtectedWorkspaceAction, WorkspacePermission> = {
  'admin.mutate': 'workspace.manage',
  'agent.dispatch': 'generation.dispatch',
  'api_key.mutate': 'api_keys.manage',
  'asset.delete': 'assets.manage',
  'asset.export': 'assets.manage',
  'billing.mutate': 'billing.manage',
  'plugin.mutate': 'plugins.manage',
  'runtime_settings.mutate': 'settings.manage',
  'task.mutate': 'tasks.manage',
};

const OPERATOR_BLOCKED_MODULES = new Set<ModuleId>([
  'admin',
  'billing',
  'employee_accounts',
  'finance',
  'saas_api_keys',
  'tax',
]);

const FINANCE_MODULES = new Set<ModuleId>([
  'activity_logs',
  'billing',
  'dashboard',
  'data',
  'finance',
  'tax',
]);

const VIEWER_MODULES = new Set<ModuleId>([
  'activity_logs',
  'dashboard',
]);

function isWorkspaceRole(role: string): role is WorkspaceRole {
  return role in ROLE_PERMISSIONS;
}

function parseModuleViewPermission(permission: string): ModuleId | null {
  const match = permission.match(/^module\.(.+)\.view$/);
  if (!match?.[1]) return null;
  return match[1] as ModuleId;
}

function canViewModule(role: WorkspaceRole, moduleId: ModuleId): boolean {
  if (role === 'owner' || role === 'admin') return true;
  if (role === 'operator') return !OPERATOR_BLOCKED_MODULES.has(moduleId);
  if (role === 'finance') return FINANCE_MODULES.has(moduleId);
  return VIEWER_MODULES.has(moduleId);
}

export function hasWorkspacePermission(role: WorkspaceRole | string, permission: WorkspacePermission | string): boolean {
  if (!isWorkspaceRole(role)) return false;
  const moduleId = parseModuleViewPermission(permission);
  if (moduleId) return canViewModule(role, moduleId);
  return ROLE_PERMISSIONS[role].includes(permission as WorkspacePermission);
}

export function canManageBilling(role: WorkspaceRole | string): boolean {
  return hasWorkspacePermission(role, 'billing.manage');
}

export function canManageAssets(role: WorkspaceRole | string): boolean {
  return hasWorkspacePermission(role, 'assets.manage');
}

export function canManageSettings(role: WorkspaceRole | string): boolean {
  return hasWorkspacePermission(role, 'settings.manage');
}

export function canDispatchAgent(role: WorkspaceRole | string): boolean {
  return hasWorkspacePermission(role, 'generation.dispatch');
}

export function canManageTasks(role: WorkspaceRole | string): boolean {
  return hasWorkspacePermission(role, 'tasks.manage');
}

export function canManageApiKeys(role: WorkspaceRole | string): boolean {
  return hasWorkspacePermission(role, 'api_keys.manage');
}

export function canPerformProtectedAction(role: WorkspaceRole | string, action: ProtectedWorkspaceAction | string): boolean {
  const permission = PROTECTED_ACTION_PERMISSIONS[action as ProtectedWorkspaceAction];
  return permission ? hasWorkspacePermission(role, permission) : false;
}

export function buildPermissionDeniedMetadata(input: {
  role: WorkspaceRole | string;
  permission: WorkspacePermission | string;
  operation: string;
  moduleId?: string;
}): Record<string, unknown> {
  return {
    denied: true,
    ...(input.moduleId ? { moduleId: input.moduleId } : {}),
    operation: input.operation,
    requiredPermission: input.permission,
    role: input.role,
  };
}
