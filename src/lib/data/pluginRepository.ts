import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export type WorkspacePluginProviderKind = 'official' | 'community' | 'workspace';
export type WorkspacePluginStatus = 'active' | 'disabled' | 'needs_config' | 'deprecated';

export interface WorkspacePluginConfigField {
  key: string;
  label: string;
  required: boolean;
}

export interface WorkspacePlugin {
  id: string;
  workspaceId: string;
  name: string;
  provider: string;
  providerKind: WorkspacePluginProviderKind;
  status: WorkspacePluginStatus;
  enabled: boolean;
  category: string;
  configSchema: WorkspacePluginConfigField[];
  installedAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface PluginRepositoryContext {
  workspaceId: string;
  storage?: StorageLike | null;
  now?: number;
}

export const PLUGIN_CONFIG_STORAGE_PREFIX = 'aistudio_workspace_plugin_configs';

const PLUGIN_PROVIDER_KINDS: readonly WorkspacePluginProviderKind[] = ['official', 'community', 'workspace'];
const PLUGIN_STATUSES: readonly WorkspacePluginStatus[] = ['active', 'disabled', 'needs_config', 'deprecated'];

const DEFAULT_WORKSPACE_PLUGINS: Array<Omit<WorkspacePlugin, 'workspaceId' | 'installedAt' | 'updatedAt'>> = [
  {
    id: 'plugin_google_workspace_search',
    name: 'Google Workspace 内部文档搜索',
    provider: 'Official',
    providerKind: 'official',
    status: 'active',
    enabled: true,
    category: 'Knowledge',
    configSchema: [
      { key: 'googleWorkspaceDomain', label: 'Workspace Domain', required: true },
      { key: 'serviceAccountRef', label: 'Service Account Ref', required: true },
    ],
    metadata: { seeded: true, icon: 'folder' },
  },
  {
    id: 'plugin_x_scheduled_publish',
    name: 'X (Twitter) 自动定时发布',
    provider: 'Community',
    providerKind: 'community',
    status: 'disabled',
    enabled: false,
    category: 'Social',
    configSchema: [
      { key: 'accountHandle', label: 'Account Handle', required: true },
      { key: 'credentialRef', label: 'Credential Ref', required: true },
    ],
    metadata: { seeded: true, icon: 'share' },
  },
  {
    id: 'plugin_shopify_product_sync',
    name: 'Shopify 商品一键同步',
    provider: 'Official',
    providerKind: 'official',
    status: 'active',
    enabled: true,
    category: 'Commerce',
    configSchema: [
      { key: 'shopDomain', label: 'Shop Domain', required: true },
      { key: 'adminApiCredentialRef', label: 'Admin API Credential Ref', required: true },
    ],
    metadata: { seeded: true, icon: 'briefcase' },
  },
];

function pluginStorageKey(context: PluginRepositoryContext): string {
  return `${PLUGIN_CONFIG_STORAGE_PREFIX}:${context.workspaceId}`;
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeProviderKind(value: unknown): WorkspacePluginProviderKind {
  return typeof value === 'string' && PLUGIN_PROVIDER_KINDS.includes(value as WorkspacePluginProviderKind)
    ? value as WorkspacePluginProviderKind
    : 'workspace';
}

function normalizeStatus(value: unknown, enabled: boolean): WorkspacePluginStatus {
  if (typeof value === 'string' && PLUGIN_STATUSES.includes(value as WorkspacePluginStatus)) {
    return value as WorkspacePluginStatus;
  }
  return enabled ? 'active' : 'disabled';
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}

function normalizeConfigSchema(value: unknown): WorkspacePluginConfigField[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((field): field is Partial<WorkspacePluginConfigField> => Boolean(field) && typeof field === 'object')
    .map((field) => ({
      key: normalizeText(field.key, 'config'),
      label: normalizeText(field.label, normalizeText(field.key, 'Config')),
      required: field.required === true,
    }));
}

function normalizePlugin(
  plugin: Partial<WorkspacePlugin>,
  context: PluginRepositoryContext,
): WorkspacePlugin {
  const now = context.now ?? Date.now();
  const enabled = plugin.enabled !== false;
  return {
    id: normalizeText(plugin.id, `plugin_${now}_${Math.random().toString(36).slice(2, 8)}`),
    workspaceId: context.workspaceId,
    name: normalizeText(plugin.name, 'Untitled plugin'),
    provider: normalizeText(plugin.provider, 'Workspace'),
    providerKind: normalizeProviderKind(plugin.providerKind),
    status: normalizeStatus(plugin.status, enabled),
    enabled,
    category: normalizeText(plugin.category, 'Custom'),
    configSchema: normalizeConfigSchema(plugin.configSchema),
    installedAt: normalizeTimestamp(plugin.installedAt, now),
    updatedAt: normalizeTimestamp(plugin.updatedAt, now),
    metadata: plugin.metadata && typeof plugin.metadata === 'object' && !Array.isArray(plugin.metadata)
      ? plugin.metadata
      : {},
  };
}

function sortPlugins(plugins: WorkspacePlugin[]): WorkspacePlugin[] {
  return plugins.slice().sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name));
}

function readPlugins(context: PluginRepositoryContext): WorkspacePlugin[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(pluginStorageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortPlugins(parsed.map((plugin) => normalizePlugin(plugin as Partial<WorkspacePlugin>, context)));
  } catch {
    return [];
  }
}

function writePlugins(
  plugins: WorkspacePlugin[],
  context: PluginRepositoryContext,
): WorkspacePlugin[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = sortPlugins(plugins.map((plugin) => normalizePlugin(plugin, context)));
  storage?.setItem(pluginStorageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('workspace_plugins_updated', { detail: { workspaceId: context.workspaceId } }));
  }
  return normalized;
}

export function getDefaultWorkspacePlugins(context: PluginRepositoryContext): WorkspacePlugin[] {
  const now = context.now ?? Date.now();
  return DEFAULT_WORKSPACE_PLUGINS.map((plugin) => normalizePlugin(
    {
      ...plugin,
      workspaceId: context.workspaceId,
      installedAt: now,
      updatedAt: now,
    },
    context,
  ));
}

export function loadWorkspacePlugins(context: PluginRepositoryContext): WorkspacePlugin[] {
  return readPlugins(context);
}

export function saveWorkspacePlugins(
  plugins: WorkspacePlugin[],
  context: PluginRepositoryContext,
): WorkspacePlugin[] {
  return writePlugins(plugins, context);
}

export function ensureDefaultWorkspacePlugins(context: PluginRepositoryContext): WorkspacePlugin[] {
  const existingPlugins = readPlugins(context);
  if (existingPlugins.length > 0) return existingPlugins;
  return writePlugins(getDefaultWorkspacePlugins(context), context);
}

export function updateWorkspacePlugin(
  pluginId: string,
  patch: Partial<Omit<WorkspacePlugin, 'id' | 'workspaceId' | 'installedAt' | 'updatedAt'>>,
  context: PluginRepositoryContext,
): WorkspacePlugin | null {
  const now = context.now ?? Date.now();
  let updatedPlugin: WorkspacePlugin | null = null;
  const updatedPlugins = ensureDefaultWorkspacePlugins(context).map((plugin) => {
    if (plugin.id !== pluginId) return plugin;
    const enabled = patch.enabled ?? plugin.enabled;
    updatedPlugin = normalizePlugin(
      {
        ...plugin,
        ...patch,
        id: plugin.id,
        installedAt: plugin.installedAt,
        enabled,
        status: patch.status ?? (enabled ? 'active' : 'disabled'),
        updatedAt: now,
      },
      context,
    );
    return updatedPlugin;
  });

  writePlugins(updatedPlugins, context);
  return updatedPlugin;
}
