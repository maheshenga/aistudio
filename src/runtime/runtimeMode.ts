import type { RuntimeMode } from './agentRuntimeTypes.ts';
import { detectDesktopAgentBridge } from './desktopAgentBridge.ts';
import { getSetting, type SettingsRepositoryContext } from '../lib/data/settingsRepository.ts';

export interface RuntimeEnvironment {
  multicaApiUrl?: string;
  multicaWsUrl?: string;
  multicaAppUrl?: string;
  multicaToken?: string;
  multicaWorkspaceId?: string;
}

export type RuntimeModeStrategy = 'auto' | RuntimeMode;

export interface WorkspacePreferences {
  defaultLanguage?: string;
  compactMode?: boolean;
  [key: string]: unknown;
}

export interface WorkspaceRuntimeSettings {
  runtimeModeStrategy: RuntimeModeStrategy;
  multicaApiUrl?: string;
  multicaWsUrl?: string;
  multicaWorkspaceId?: string;
  workspacePreferences: WorkspacePreferences;
}

export const RUNTIME_MODE_STRATEGY_SETTING_KEY = 'runtimeModeStrategy';
export const RUNTIME_MULTICA_API_URL_SETTING_KEY = 'multicaApiUrl';
export const RUNTIME_MULTICA_WS_URL_SETTING_KEY = 'multicaWsUrl';
export const RUNTIME_MULTICA_WORKSPACE_ID_SETTING_KEY = 'multicaWorkspaceId';
export const WORKSPACE_PREFERENCES_SETTING_KEY = 'workspacePreferences';

const runtimeModes = new Set<RuntimeMode>(['web', 'desktop_multica', 'self_hosted_multica']);
const runtimeStrategies = new Set<RuntimeModeStrategy>(['auto', 'web', 'desktop_multica', 'self_hosted_multica']);

function trimOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeRuntimeModeStrategy(value: unknown): RuntimeModeStrategy {
  return typeof value === 'string' && runtimeStrategies.has(value as RuntimeModeStrategy)
    ? value as RuntimeModeStrategy
    : 'auto';
}

function normalizeWorkspacePreferences(value: unknown): WorkspacePreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as WorkspacePreferences;
}

function readImportMetaEnv(): Record<string, unknown> {
  return (import.meta as ImportMeta & { env?: Record<string, unknown> }).env ?? {};
}

export function readWorkspaceRuntimeSettings(context: SettingsRepositoryContext): WorkspaceRuntimeSettings {
  const runtimeModeStrategy = getSetting(
    RUNTIME_MODE_STRATEGY_SETTING_KEY,
    'auto',
    context,
  );
  const workspacePreferences = getSetting(
    WORKSPACE_PREFERENCES_SETTING_KEY,
    {},
    context,
  );

  return {
    runtimeModeStrategy: normalizeRuntimeModeStrategy(runtimeModeStrategy),
    multicaApiUrl: trimOptionalString(getSetting(RUNTIME_MULTICA_API_URL_SETTING_KEY, '', context)),
    multicaWsUrl: trimOptionalString(getSetting(RUNTIME_MULTICA_WS_URL_SETTING_KEY, '', context)),
    multicaWorkspaceId: trimOptionalString(getSetting(RUNTIME_MULTICA_WORKSPACE_ID_SETTING_KEY, '', context)),
    workspacePreferences: normalizeWorkspacePreferences(workspacePreferences),
  };
}

export function readRuntimeEnvironment(
  envOverride: Partial<RuntimeEnvironment> = {},
  settings?: Partial<WorkspaceRuntimeSettings>,
): RuntimeEnvironment {
  const env = readImportMetaEnv();
  const merged: RuntimeEnvironment = {
    multicaApiUrl: trimOptionalString(env.VITE_MULTICA_API_URL),
    multicaWsUrl: trimOptionalString(env.VITE_MULTICA_WS_URL),
    multicaAppUrl: trimOptionalString(env.VITE_MULTICA_APP_URL),
    multicaToken: trimOptionalString(env.VITE_MULTICA_TOKEN),
    multicaWorkspaceId: trimOptionalString(env.VITE_MULTICA_WORKSPACE_ID),
  };

  if (settings) {
    merged.multicaApiUrl = trimOptionalString(settings.multicaApiUrl) ?? merged.multicaApiUrl;
    merged.multicaWsUrl = trimOptionalString(settings.multicaWsUrl) ?? merged.multicaWsUrl;
    merged.multicaWorkspaceId = trimOptionalString(settings.multicaWorkspaceId) ?? merged.multicaWorkspaceId;
  }

  return {
    ...merged,
    ...envOverride,
    multicaApiUrl: trimOptionalString(envOverride.multicaApiUrl) ?? merged.multicaApiUrl,
    multicaWsUrl: trimOptionalString(envOverride.multicaWsUrl) ?? merged.multicaWsUrl,
    multicaAppUrl: trimOptionalString(envOverride.multicaAppUrl) ?? merged.multicaAppUrl,
    multicaToken: trimOptionalString(envOverride.multicaToken) ?? merged.multicaToken,
    multicaWorkspaceId: trimOptionalString(envOverride.multicaWorkspaceId) ?? merged.multicaWorkspaceId,
  };
}

export function resolveRuntimeMode(
  env: RuntimeEnvironment = readRuntimeEnvironment(),
  settings?: Partial<Pick<WorkspaceRuntimeSettings, 'runtimeModeStrategy'>>,
  bridge = detectDesktopAgentBridge(),
): RuntimeMode {
  const strategy = normalizeRuntimeModeStrategy(settings?.runtimeModeStrategy);
  const hasSelfHostedEndpoint = Boolean(env.multicaApiUrl && env.multicaWsUrl);

  if (strategy === 'web') return 'web';
  if (strategy === 'desktop_multica') return bridge ? 'desktop_multica' : 'web';
  if (strategy === 'self_hosted_multica') return hasSelfHostedEndpoint ? 'self_hosted_multica' : 'web';

  if (bridge) return 'desktop_multica';
  if (hasSelfHostedEndpoint) return 'self_hosted_multica';
  return 'web';
}

export function isRuntimeMode(value: unknown): value is RuntimeMode {
  return typeof value === 'string' && runtimeModes.has(value as RuntimeMode);
}
