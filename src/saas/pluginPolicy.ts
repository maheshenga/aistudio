/**
 * Plugin Center gating policy (P3-E05).
 *
 * Pure, side-effect-free contract that layers a SECURITY REVIEW state and a
 * capability-permission/billing model on top of the operational plugin records in
 * `pluginRepository`. The repository tracks operational status (active/disabled/…);
 * this module decides what an operator is *allowed* to do with a plugin and whether
 * a plugin is even permitted to execute. The Plugin Center reads these decisions so
 * an unreviewed plugin can never run, and every lifecycle action maps to a required
 * permission and an audit action.
 */

import type { WorkspacePlugin } from '../lib/data/pluginRepository';
import type { WorkspacePermission, ProtectedWorkspaceAction } from './permissions';

/** Security review lifecycle, independent of operational enable/disable. */
export type PluginReviewState = 'hidden' | 'internal' | 'reviewed' | 'enabled' | 'disabled';

export type PluginLifecycleAction = 'install' | 'enable' | 'disable' | 'configure' | 'execute';

export const PLUGIN_REVIEW_STATES: readonly PluginReviewState[] = [
  'hidden',
  'internal',
  'reviewed',
  'enabled',
  'disabled',
];

/** Every lifecycle action requires the plugin-management permission. */
export const PLUGIN_ACTION_PERMISSION: Record<PluginLifecycleAction, WorkspacePermission> = {
  install: 'plugins.manage',
  enable: 'plugins.manage',
  disable: 'plugins.manage',
  configure: 'plugins.manage',
  execute: 'plugins.manage',
};

export const PLUGIN_PROTECTED_ACTION: ProtectedWorkspaceAction = 'plugin.mutate';

/** Audit action vocabulary for each lifecycle transition. */
export const PLUGIN_ACTION_AUDIT: Record<PluginLifecycleAction, string> = {
  install: 'plugin_install',
  enable: 'plugin_enable',
  disable: 'plugin_disable',
  configure: 'plugin_config_update',
  execute: 'plugin_execute',
};

export interface PluginBillingMetadata {
  /** Estimated billing credits charged per execution; 0 means non-billable. */
  estimatedCreditsPerRun: number;
  billingStatus: 'estimated' | 'review_required' | 'unpriced';
}

const DEFAULT_BILLING: PluginBillingMetadata = { estimatedCreditsPerRun: 0, billingStatus: 'unpriced' };

/**
 * Derive the security review state for a stored plugin.
 * - Community/workspace plugins start unreviewed (`internal`) until explicitly reviewed via metadata.
 * - Official plugins are considered reviewed by provenance.
 * - Operational disable/deprecate maps to the `disabled` review-visible state.
 */
export function resolvePluginReviewState(plugin: WorkspacePlugin): PluginReviewState {
  const explicit = plugin.metadata?.reviewState;
  if (typeof explicit === 'string' && PLUGIN_REVIEW_STATES.includes(explicit as PluginReviewState)) {
    return explicit as PluginReviewState;
  }
  if (plugin.status === 'deprecated') return 'hidden';
  if (!plugin.enabled || plugin.status === 'disabled') return 'disabled';
  if (plugin.status === 'needs_config') return 'reviewed';
  if (plugin.providerKind === 'official') return plugin.enabled ? 'enabled' : 'reviewed';
  // Community / workspace plugins require an explicit review before they count as reviewed.
  return 'internal';
}

/** Has the plugin cleared security review (reviewed/enabled)? Unreviewed plugins cannot execute. */
export function isPluginReviewed(state: PluginReviewState): boolean {
  return state === 'reviewed' || state === 'enabled';
}

export interface PluginExecutionDecision {
  allowed: boolean;
  reason: 'ok' | 'not_reviewed' | 'not_enabled' | 'permission_denied' | 'needs_config';
  billing: PluginBillingMetadata;
}

export function resolvePluginBilling(plugin: WorkspacePlugin): PluginBillingMetadata {
  const meta = plugin.metadata ?? {};
  const credits = Number(meta.estimatedCreditsPerRun);
  if (Number.isFinite(credits) && credits > 0) {
    return { estimatedCreditsPerRun: Math.ceil(credits), billingStatus: 'estimated' };
  }
  if (meta.billable === true) {
    return { estimatedCreditsPerRun: 0, billingStatus: 'review_required' };
  }
  return { ...DEFAULT_BILLING };
}

/**
 * Decide whether a plugin may execute right now. Execution requires:
 * permission, a cleared review, operational enablement, and satisfied required config.
 */
export function canExecutePlugin(
  plugin: WorkspacePlugin,
  options: { hasPermission: boolean },
): PluginExecutionDecision {
  const billing = resolvePluginBilling(plugin);
  if (!options.hasPermission) return { allowed: false, reason: 'permission_denied', billing };

  const reviewState = resolvePluginReviewState(plugin);
  if (!isPluginReviewed(reviewState)) return { allowed: false, reason: 'not_reviewed', billing };
  if (!plugin.enabled || reviewState === 'disabled') return { allowed: false, reason: 'not_enabled', billing };
  if (plugin.status === 'needs_config') return { allowed: false, reason: 'needs_config', billing };

  return { allowed: true, reason: 'ok', billing };
}

/** Can the current role perform a lifecycle action (permission-only gate)? */
export function canPerformPluginAction(
  action: PluginLifecycleAction,
  options: { hasPermission: boolean },
): boolean {
  return options.hasPermission;
}

const REVIEW_STATE_LABELS: Record<PluginReviewState, string> = {
  hidden: '已隐藏',
  internal: '待审核',
  reviewed: '已审核',
  enabled: '已启用',
  disabled: '已停用',
};

export function getPluginReviewStateLabel(state: PluginReviewState): string {
  return REVIEW_STATE_LABELS[state];
}
