import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Code,
  Copy,
  Download,
  Key,
  Plus,
  RefreshCcw,
  Shield,
  Trash2,
  Webhook,
  X,
} from 'lucide-react';

import {
  createWorkspaceApiKey,
  exportWorkspaceApiKeyRows,
  hydrateWorkspaceApiKeys,
  loadWorkspaceApiKeys,
  revokeWorkspaceApiKey,
  rotateWorkspaceApiKey,
  type WorkspaceApiKey,
} from '../lib/data/apiKeyRepository';
import {
  createWorkspaceWebhookEndpoint,
  deleteWorkspaceWebhookEndpoint,
  exportWorkspaceWebhookEndpointRows,
  hydrateWorkspaceWebhookEndpoints,
  isWebhookBackendConfigured,
  listWorkspaceWebhookDeliveries,
  loadWorkspaceWebhookEndpoints,
  updateWorkspaceWebhookEndpoint,
  type WorkspaceWebhookDelivery,
  type WorkspaceWebhookEndpoint,
} from '../lib/data/webhookRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { listWorkspaceUsageEvents, type WorkspaceUsageEvent } from '../lib/data/usageRepository';
import { useSaasSession } from '../saas/SaasAuthContext';
import { buildPermissionDeniedMetadata, canManageApiKeys } from '../saas/permissions';
import { API_SCOPES, DEFAULT_API_SCOPES, DEFAULT_API_RATE_LIMIT } from '../saas/apiAccess';
import { toast } from './Toast';

type ApiKeysTab = 'keys' | 'webhooks' | 'analytics';

const API_KEY_STATUS_LABELS: Record<WorkspaceApiKey['status'], string> = {
  active: 'Active',
  rotating: 'Rotating',
  revoked: 'Revoked',
  expired: 'Expired',
};

const API_KEY_STATUS_CLASSES: Record<WorkspaceApiKey['status'], string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  rotating: 'bg-amber-50 text-amber-700 border-amber-200',
  revoked: 'bg-gray-100 text-gray-600 border-gray-200',
  expired: 'bg-red-50 text-red-700 border-red-200',
};

const WEBHOOK_STATUS_LABELS: Record<WorkspaceWebhookEndpoint['status'], string> = {
  active: 'Active',
  disabled: 'Paused',
  failing: 'Failing',
};

const WEBHOOK_STATUS_CLASSES: Record<WorkspaceWebhookEndpoint['status'], string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  disabled: 'bg-gray-100 text-gray-600 border-gray-200',
  failing: 'bg-red-50 text-red-700 border-red-200',
};

const WEBHOOK_DELIVERY_STATUS_LABELS: Record<WorkspaceWebhookDelivery['status'], string> = {
  pending: 'Pending',
  delivered: 'Delivered',
  failed: 'Failed',
  retrying: 'Retrying',
};

const WEBHOOK_DELIVERY_STATUS_CLASSES: Record<WorkspaceWebhookDelivery['status'], string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  retrying: 'bg-orange-50 text-orange-700 border-orange-200',
};

const WEBHOOK_EVENT_OPTIONS = [
  'generation.completed',
  'generation.failed',
  'asset.created',
  'billing.invoice_issued',
  'agent.task_updated',
];

function formatDateTime(timestamp: number | null): string {
  return timestamp ? new Date(timestamp).toLocaleString() : 'Never';
}

function buildUsageSeries(keys: WorkspaceApiKey[], webhooks: WorkspaceWebhookEndpoint[]) {
  const activeKeyCount = keys.filter((key) => key.status === 'active').length;
  const activeWebhookCount = webhooks.filter((endpoint) => endpoint.status === 'active').length;
  return [
    { time: '00:00', calls: activeKeyCount * 90 + 120, errors: activeWebhookCount },
    { time: '04:00', calls: activeKeyCount * 60 + 80, errors: activeWebhookCount },
    { time: '08:00', calls: activeKeyCount * 140 + 220, errors: activeWebhookCount + 2 },
    { time: '12:00', calls: activeKeyCount * 260 + 420, errors: activeWebhookCount + 5 },
    { time: '16:00', calls: activeKeyCount * 220 + 380, errors: activeWebhookCount + 3 },
    { time: '20:00', calls: activeKeyCount * 180 + 300, errors: activeWebhookCount + 1 },
  ];
}

function generateWebhookSigningSecret(): string {
  return `whsec-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>): void {
  if (typeof document === 'undefined') return;
  const csv = [
    headers.join(','),
    ...rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ApiKeysView() {
  const session = useSaasSession();
  const canManage = canManageApiKeys(session.membership.role);
  const apiKeyContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const webhookContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const [activeTab, setActiveTab] = useState<ApiKeysTab>('keys');
  const [keys, setKeys] = useState<WorkspaceApiKey[]>(() => loadWorkspaceApiKeys(apiKeyContext));
  const [webhooks, setWebhooks] = useState<WorkspaceWebhookEndpoint[]>(() => loadWorkspaceWebhookEndpoints(webhookContext));
  const [showGenModal, setShowGenModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([...DEFAULT_API_SCOPES]);
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState('');
  const [generatedKeyName, setGeneratedKeyName] = useState('');
  const [showRotateConfirmModal, setShowRotateConfirmModal] = useState(false);
  const [keyToRotate, setKeyToRotate] = useState<WorkspaceApiKey | null>(null);
  const [showKeyExportModal, setShowKeyExportModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['generation.completed']);
  const [newWebhookSecret, setNewWebhookSecret] = useState('');
  const [generatedWebhookName, setGeneratedWebhookName] = useState('');
  const [showWebhookExportModal, setShowWebhookExportModal] = useState(false);
  const [usageEvents, setUsageEvents] = useState<WorkspaceUsageEvent[]>([]);
  const [expandedWebhookId, setExpandedWebhookId] = useState<string | null>(null);
  const [webhookDeliveries, setWebhookDeliveries] = useState<Record<string, WorkspaceWebhookDelivery[]>>({});
  const [loadingWebhookDeliveriesId, setLoadingWebhookDeliveriesId] = useState<string | null>(null);
  const webhookBackendConfigured = isWebhookBackendConfigured();

  useEffect(() => {
    const refreshKeys = () => setKeys(loadWorkspaceApiKeys(apiKeyContext));
    const handleApiKeysUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshKeys();
    };

    refreshKeys();
    void hydrateWorkspaceApiKeys(apiKeyContext);
    window.addEventListener('workspace_api_keys_updated', handleApiKeysUpdated);
    return () => window.removeEventListener('workspace_api_keys_updated', handleApiKeysUpdated);
  }, [apiKeyContext, session.workspace.id]);

  useEffect(() => {
    const refreshWebhooks = () => setWebhooks(loadWorkspaceWebhookEndpoints(webhookContext));
    const handleWebhooksUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshWebhooks();
    };

    refreshWebhooks();
    void hydrateWorkspaceWebhookEndpoints(webhookContext);
    window.addEventListener('workspace_webhooks_updated', handleWebhooksUpdated);
    return () => window.removeEventListener('workspace_webhooks_updated', handleWebhooksUpdated);
  }, [session.workspace.id, webhookContext]);

  useEffect(() => {
    const refreshUsage = () => setUsageEvents(listWorkspaceUsageEvents({ workspaceId: session.workspace.id }));
    const handleUsageUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
      refreshUsage();
    };

    refreshUsage();
    window.addEventListener('usage_events_updated', handleUsageUpdated);
    return () => window.removeEventListener('usage_events_updated', handleUsageUpdated);
  }, [session.workspace.id]);

  const usageSeries = useMemo(() => buildUsageSeries(keys, webhooks), [keys, webhooks]);
  const usageTotals = useMemo(() => {
    const totalCredits = usageEvents.reduce((sum, event) => sum + event.credits, 0);
    return { eventCount: usageEvents.length, totalCredits };
  }, [usageEvents]);
  const activeKeyCount = keys.filter((key) => key.status === 'active').length;
  const rotatingKeyCount = keys.filter((key) => key.status === 'rotating').length;
  const revokedKeyCount = keys.filter((key) => key.status === 'revoked').length;

  const auditDeveloperAction = (
    action:
      | 'api_key_create'
      | 'api_key_rotate'
      | 'api_key_revoke'
      | 'api_key_export'
      | 'webhook_create'
      | 'webhook_update'
      | 'webhook_delete'
      | 'webhook_secret_rotate'
      | 'webhook_export',
    targetType: 'api_key' | 'webhook' | 'workspace',
    targetId: string,
    metadata: Record<string, unknown>,
  ) => {
    logAuditEvent(
      {
        action,
        moduleId: 'saas_api_keys',
        targetType,
        targetId,
        metadata,
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
  };

  const auditDeveloperPermissionDenied = (
    operation: string,
    targetType: 'api_key' | 'webhook' | 'workspace' = 'workspace',
    targetId = session.workspace.id,
    metadata: Record<string, unknown> = {},
  ) => {
    logAuditEvent(
      {
        action: 'permission_denied',
        moduleId: 'saas_api_keys',
        targetType,
        targetId,
        metadata: {
          ...buildPermissionDeniedMetadata({
            role: session.membership.role,
            permission: 'api_keys.manage',
            operation,
            moduleId: 'saas_api_keys',
          }),
          ...metadata,
        },
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
  };

  const closeGenModal = () => {
    setShowGenModal(false);
    setNewKeyName('');
    setNewKeyScopes([...DEFAULT_API_SCOPES]);
    setNewlyGeneratedKey('');
    setGeneratedKeyName('');
  };

  const toggleNewKeyScope = (scope: string) => {
    setNewKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((item) => item !== scope) : [...prev, scope],
    );
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
    toast('Secret copied. Store it now; it will not be shown again.', 'success');
  };

  const handleGenerateKey = () => {
    if (!newKeyName.trim()) return;
    if (!canManage) {
      auditDeveloperPermissionDenied('api_key_create');
      toast('Current role cannot manage API keys.', 'warning');
      return;
    }
    if (newKeyScopes.length === 0) {
      toast('Select at least one scope for this key.', 'warning');
      return;
    }

    const result = createWorkspaceApiKey(
      { name: newKeyName.trim(), scopes: newKeyScopes, metadata: { source: 'api_keys_view' } },
      apiKeyContext,
    );
    setKeys(loadWorkspaceApiKeys(apiKeyContext));
    setNewlyGeneratedKey(result.secret);
    setGeneratedKeyName(result.record.name);
    auditDeveloperAction('api_key_create', 'api_key', result.record.id, {
      name: result.record.name,
      keyPreview: result.record.keyPreview,
      credentialRef: result.record.credentialRef,
      scopes: result.record.scopes,
      rateLimit: result.record.rateLimit,
    });
  };

  const confirmRotateKey = (key: WorkspaceApiKey) => {
    if (!canManage) {
      auditDeveloperPermissionDenied('api_key_rotate', 'api_key', key.id, { status: key.status });
      return;
    }
    if (key.status === 'revoked') return;
    setKeyToRotate(key);
    setShowRotateConfirmModal(true);
  };

  const executeRotateKey = () => {
    if (!keyToRotate) return;
    const result = rotateWorkspaceApiKey(keyToRotate.id, {}, apiKeyContext);
    if (!result) {
      toast('Key is missing or already revoked.', 'warning');
      return;
    }

    setKeys(loadWorkspaceApiKeys(apiKeyContext));
    setShowRotateConfirmModal(false);
    setKeyToRotate(null);
    setNewKeyName('');
    setNewlyGeneratedKey(result.secret);
    setGeneratedKeyName(result.replacement.name);
    setShowGenModal(true);
    auditDeveloperAction('api_key_rotate', 'api_key', result.replacement.id, {
      previousKeyId: result.previous.id,
      replacementKeyId: result.replacement.id,
      graceExpiresAt: result.previous.expiresAt,
      keyPreview: result.replacement.keyPreview,
    });
  };

  const handleRevokeKey = (key: WorkspaceApiKey) => {
    if (!canManage) {
      auditDeveloperPermissionDenied('api_key_revoke', 'api_key', key.id, { status: key.status });
      return;
    }
    if (key.status === 'revoked') return;
    const revoked = revokeWorkspaceApiKey(key.id, apiKeyContext);
    if (!revoked) return;

    setKeys(loadWorkspaceApiKeys(apiKeyContext));
    auditDeveloperAction('api_key_revoke', 'api_key', revoked.id, {
      name: revoked.name,
      keyPreview: revoked.keyPreview,
    });
    toast(`Revoked ${revoked.name}.`, 'success');
  };

  const handleExportKeys = () => {
    if (!canManage) {
      auditDeveloperPermissionDenied('api_key_export', 'workspace', session.workspace.id, { keyCount: keys.length });
      return;
    }
    const rows = exportWorkspaceApiKeyRows(keys);
    auditDeveloperAction('api_key_export', 'workspace', session.workspace.id, { rowCount: rows.length });
    downloadCsv(
      `api-keys-${session.workspace.slug}.csv`,
      ['id', 'name', 'keyPreview', 'status', 'scopes', 'rateLimitPerWindow', 'lastUsedAt', 'expiresAt'],
      rows.map((row) => [row.id, row.name, row.keyPreview, row.status, row.scopes.join('|'), row.rateLimitPerWindow, row.lastUsedAt, row.expiresAt]),
    );
    setShowKeyExportModal(false);
    toast('API key metadata export generated.', 'success');
  };

  const resetWebhookForm = () => {
    setWebhookName('');
    setWebhookUrl('');
    setWebhookEvents(['generation.completed']);
    setNewWebhookSecret('');
    setGeneratedWebhookName('');
  };

  const toggleWebhookEvent = (eventName: string) => {
    setWebhookEvents((prev) =>
      prev.includes(eventName) ? prev.filter((item) => item !== eventName) : [...prev, eventName],
    );
  };

  const closeWebhookModal = () => {
    setShowWebhookModal(false);
    resetWebhookForm();
  };

  const handleCreateWebhookEndpoint = () => {
    if (!canManage) {
      auditDeveloperPermissionDenied('webhook_create');
      toast('Current role cannot manage Webhooks.', 'warning');
      return;
    }
    if (!webhookName.trim() || !webhookUrl.trim() || webhookEvents.length === 0) return;
    try {
      const parsedUrl = new URL(webhookUrl.trim());
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        toast('Webhook URL must use http or https.', 'warning');
        return;
      }
    } catch {
      toast('Webhook URL is invalid.', 'warning');
      return;
    }

    const result = createWorkspaceWebhookEndpoint(
      {
        name: webhookName.trim(),
        url: webhookUrl.trim(),
        events: webhookEvents,
        metadata: { source: 'api_keys_view' },
      },
      webhookContext,
    );
    setWebhooks(loadWorkspaceWebhookEndpoints(webhookContext));
    setNewWebhookSecret(result.signingSecret);
    setGeneratedWebhookName(result.record.name);
    auditDeveloperAction('webhook_create', 'webhook', result.record.id, {
      name: result.record.name,
      url: result.record.url,
      events: result.record.events,
      signingSecretRef: result.record.signingSecretRef,
    });
  };

  const handleToggleWebhookStatus = (endpoint: WorkspaceWebhookEndpoint) => {
    if (!canManage) {
      auditDeveloperPermissionDenied('webhook_update', 'webhook', endpoint.id, { status: endpoint.status });
      return;
    }
    const nextStatus = endpoint.status === 'active' ? 'disabled' : 'active';
    const updated = updateWorkspaceWebhookEndpoint(endpoint.id, { status: nextStatus }, webhookContext);
    if (!updated) return;
    setWebhooks(loadWorkspaceWebhookEndpoints(webhookContext));
    auditDeveloperAction('webhook_update', 'webhook', updated.id, {
      name: updated.name,
      status: updated.status,
    });
  };

  const handleRotateWebhookSecret = (endpoint: WorkspaceWebhookEndpoint) => {
    if (!canManage) {
      auditDeveloperPermissionDenied('webhook_secret_rotate', 'webhook', endpoint.id, { status: endpoint.status });
      return;
    }
    const signingSecret = generateWebhookSigningSecret();
    const updated = updateWorkspaceWebhookEndpoint(endpoint.id, { signingSecret }, webhookContext);
    if (!updated) return;
    setWebhooks(loadWorkspaceWebhookEndpoints(webhookContext));
    setNewWebhookSecret(signingSecret);
    setGeneratedWebhookName(updated.name);
    setShowWebhookModal(true);
    auditDeveloperAction('webhook_secret_rotate', 'webhook', updated.id, {
      name: updated.name,
      signingSecretRef: updated.signingSecretRef,
      signingSecretLast4: updated.signingSecretLast4,
    });
  };

  const handleDeleteWebhookEndpoint = (endpoint: WorkspaceWebhookEndpoint) => {
    if (!canManage) {
      auditDeveloperPermissionDenied('webhook_delete', 'webhook', endpoint.id, { status: endpoint.status });
      return;
    }
    const deleted = deleteWorkspaceWebhookEndpoint(endpoint.id, webhookContext);
    if (!deleted) return;
    setWebhooks(loadWorkspaceWebhookEndpoints(webhookContext));
    auditDeveloperAction('webhook_delete', 'webhook', endpoint.id, {
      name: endpoint.name,
      url: endpoint.url,
    });
    toast(`Deleted ${endpoint.name}.`, 'success');
    if (expandedWebhookId === endpoint.id) setExpandedWebhookId(null);
  };

  const handleToggleWebhookDeliveries = async (endpoint: WorkspaceWebhookEndpoint) => {
    if (expandedWebhookId === endpoint.id) {
      setExpandedWebhookId(null);
      return;
    }
    setExpandedWebhookId(endpoint.id);
    if (!webhookBackendConfigured) return;
    if (webhookDeliveries[endpoint.id]) return;

    setLoadingWebhookDeliveriesId(endpoint.id);
    try {
      const rows = await listWorkspaceWebhookDeliveries(endpoint.id, webhookContext, 8);
      setWebhookDeliveries((current) => ({ ...current, [endpoint.id]: rows }));
    } finally {
      setLoadingWebhookDeliveriesId(null);
    }
  };

  const handleRefreshWebhookDeliveries = async (endpoint: WorkspaceWebhookEndpoint) => {
    if (!webhookBackendConfigured) return;
    setLoadingWebhookDeliveriesId(endpoint.id);
    try {
      const rows = await listWorkspaceWebhookDeliveries(endpoint.id, webhookContext, 8);
      setWebhookDeliveries((current) => ({ ...current, [endpoint.id]: rows }));
      setExpandedWebhookId(endpoint.id);
    } finally {
      setLoadingWebhookDeliveriesId(null);
    }
  };

  const handleExportWebhooks = () => {
    if (!canManage) {
      auditDeveloperPermissionDenied('webhook_export', 'workspace', session.workspace.id, { webhookCount: webhooks.length });
      return;
    }
    const rows = exportWorkspaceWebhookEndpointRows(webhooks);
    auditDeveloperAction('webhook_export', 'workspace', session.workspace.id, { rowCount: rows.length });
    downloadCsv(
      `webhooks-${session.workspace.slug}.csv`,
      ['id', 'name', 'url', 'status', 'events', 'signingSecretLast4', 'failureCount'],
      rows.map((row) => [
        row.id,
        row.name,
        row.url,
        row.status,
        row.events.join('|'),
        row.signingSecretLast4,
        row.failureCount,
      ]),
    );
    setShowWebhookExportModal(false);
    toast('Webhook metadata export generated.', 'success');
  };

  return (
    <div className="p-[var(--spacing-xl)] max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-[var(--spacing-xl)]">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2 mt-1">Developer Center</h2>
          <p className="text-[var(--text-muted)] text-sm">Manage workspace API credentials, Webhooks, and integration audit metadata.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-[var(--radius-lg)] w-fit mb-[var(--spacing-xl)]">
        <button
          onClick={() => setActiveTab('keys')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'keys' ? 'bg-[var(--bg-panel)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-700'}`}
        >
          <div className="flex items-center space-x-2"><Key className="icon-sm" /><span>API Keys</span></div>
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'webhooks' ? 'bg-[var(--bg-panel)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-700'}`}
        >
          <div className="flex items-center space-x-2"><Webhook className="icon-sm" /><span>Webhooks</span></div>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'analytics' ? 'bg-[var(--bg-panel)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-700'}`}
        >
          <div className="flex items-center space-x-2"><Activity className="icon-sm" /><span>Usage</span></div>
        </button>
      </div>

      {activeTab === 'keys' && (
        <div className="space-y-[var(--spacing-lg)] animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-blue-50 border border-blue-100 rounded-[var(--radius-xl)] p-[var(--spacing-lg)] flex items-start justify-between">
            <div className="flex items-start">
              <div className="mt-1 bg-blue-100 text-[var(--color-primary)] p-2 rounded-[var(--radius-lg)] mr-4">
                <Shield className="icon-md" />
              </div>
              <div>
                <h3 className="font-bold text-blue-900 text-[15px] mb-1">Credential Safety</h3>
                <p className="text-sm text-blue-800/70 max-w-2xl leading-relaxed">
                  API secrets are shown once after creation or rotation. Persistent records store only previews, suffixes, and credential references.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setNewKeyName('');
                setNewlyGeneratedKey('');
                setGeneratedKeyName('');
                setShowGenModal(true);
              }}
              disabled={!canManage}
              title={canManage ? undefined : 'Current role cannot manage API keys'}
              className={`bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-[0_2px_10px_rgba(37,99,235,0.2)] flex items-center shrink-0 ${canManage ? '' : 'opacity-60 cursor-not-allowed'}`}
            >
              <Plus className="icon-sm mr-1.5" />
              Create Key
            </button>
          </div>

          {rotatingKeyCount > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-50 border border-amber-200 p-4 rounded-[var(--radius-xl)] flex items-start">
              <AlertTriangle className="icon-md text-amber-500 mr-3 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-amber-900 font-bold text-[14px] mb-1.5">Rotation Grace Period</h4>
                <p className="text-amber-800 text-[13px] font-medium">
                  {rotatingKeyCount} old key is still in a 24-hour grace window.
                </p>
              </div>
            </motion.div>
          )}

          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-app)]">
              <p className="text-sm font-bold text-[var(--text-main)]">Workspace API Keys</p>
              <button
                onClick={() => setShowKeyExportModal(true)}
                className="text-sm font-bold text-[var(--color-primary)] hover:text-blue-800 flex items-center"
              >
                <Download className="icon-sm mr-1.5" />
                Export Metadata
              </button>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Key</th>
                  <th className="py-4 px-6">Scopes</th>
                  <th className="py-4 px-6">Rate Limit</th>
                  <th className="py-4 px-6">Created</th>
                  <th className="py-4 px-6">Last Used</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {keys.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-sm font-bold text-[var(--text-muted)]">
                      No API keys yet.
                    </td>
                  </tr>
                ) : keys.map((key) => (
                  <tr key={key.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-[15px] text-[var(--text-main)]">{key.name}</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">{key.credentialRef}</p>
                    </td>
                    <td className="py-4 px-6">
                      <code className="text-[13px] font-mono text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md border border-[var(--border-color)]">
                        {key.keyPreview}
                      </code>
                    </td>
                    <td className="py-4 px-6">
                      {key.scopes.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {key.scopes.map((scope) => (
                            <span key={scope} className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded">{scope}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[12px] text-gray-400 font-medium">No scopes</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-[13px] text-[var(--text-muted)] font-medium whitespace-nowrap">
                      {key.rateLimit.maxRequests}/{Math.floor(key.rateLimit.windowMs / 1000)}s
                    </td>
                    <td className="py-4 px-6 text-[14px] text-[var(--text-muted)] font-medium">{formatDateTime(key.createdAt)}</td>
                    <td className="py-4 px-6 text-[14px] text-[var(--text-muted)] font-medium">{formatDateTime(key.lastUsedAt)}</td>
                    <td className="py-4 px-6 text-[14px]">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${API_KEY_STATUS_CLASSES[key.status]}`}>
                        {API_KEY_STATUS_LABELS[key.status]}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-y-2">
                      <button
                        onClick={() => confirmRotateKey(key)}
                        disabled={!canManage || key.status === 'revoked'}
                        className="text-[var(--color-primary)] hover:text-blue-800 transition-colors text-sm font-bold flex items-center justify-end w-full disabled:text-gray-300 disabled:cursor-not-allowed"
                      >
                        <RefreshCcw className="icon-sm mr-1.5" />Rotate
                      </button>
                      <button
                        onClick={() => handleRevokeKey(key)}
                        disabled={!canManage || key.status === 'revoked'}
                        className="text-red-500 hover:text-red-700 transition-colors text-sm font-bold flex items-center justify-end w-full disabled:text-gray-300 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="icon-sm mr-1.5" />Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <div className="space-y-[var(--spacing-lg)] animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-app)]">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-50 text-[var(--color-primary)] flex items-center justify-center rounded-[var(--radius-lg)] mr-3">
                  <Webhook className="icon-md" />
                </div>
                <div>
                  <p className="font-bold text-[var(--text-main)]">Webhook Endpoints</p>
                  <p className="text-[13px] text-[var(--text-muted)]">Receive async events for generations, assets, billing, and Agent runtime tasks.</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowWebhookExportModal(true)}
                  className="text-sm font-bold text-[var(--color-primary)] hover:text-blue-800 flex items-center"
                >
                  <Download className="icon-sm mr-1.5" />
                  Export
                </button>
                <button
                  onClick={() => {
                    resetWebhookForm();
                    setShowWebhookModal(true);
                  }}
                  disabled={!canManage}
                  className={`bg-[var(--color-primary)] hover:bg-blue-700 text-white px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors flex items-center ${canManage ? '' : 'opacity-60 cursor-not-allowed'}`}
                >
                  <Plus className="icon-sm mr-1.5" />
                  Add Endpoint
                </button>
              </div>
            </div>

            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">
                  <th className="py-4 px-6">Endpoint</th>
                  <th className="py-4 px-6">Events</th>
                  <th className="py-4 px-6">Secret</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {webhooks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm font-bold text-[var(--text-muted)]">
                      No Webhook endpoints configured.
                    </td>
                  </tr>
                ) : webhooks.map((endpoint) => (
                  <React.Fragment key={endpoint.id}>
                  <tr className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-[15px] text-[var(--text-main)]">{endpoint.name}</p>
                      <p className="text-[12px] text-[var(--text-muted)] mt-1 break-all">{endpoint.url}</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">Last delivery: {formatDateTime(endpoint.lastDeliveredAt)}</p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1.5 max-w-sm">
                        {endpoint.events.map((eventName) => (
                          <span key={eventName} className="text-[11px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                            {eventName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-[13px] font-mono text-gray-600">whsec-...{endpoint.signingSecretLast4}</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">{endpoint.signingSecretRef}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${WEBHOOK_STATUS_CLASSES[endpoint.status]}`}>
                        {WEBHOOK_STATUS_LABELS[endpoint.status]}
                      </span>
                      {endpoint.failureCount > 0 && (
                        <p className="text-[11px] text-red-500 mt-1">{endpoint.failureCount} failures</p>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right space-y-2">
                      <button
                        onClick={() => void handleToggleWebhookDeliveries(endpoint)}
                        className="text-[var(--color-primary)] hover:text-blue-800 transition-colors text-sm font-bold flex items-center justify-end w-full"
                      >
                        {expandedWebhookId === endpoint.id ? 'Hide deliveries' : 'View deliveries'}
                      </button>
                      <button
                        onClick={() => handleToggleWebhookStatus(endpoint)}
                        disabled={!canManage}
                        className="text-[var(--color-primary)] hover:text-blue-800 transition-colors text-sm font-bold flex items-center justify-end w-full disabled:text-gray-300 disabled:cursor-not-allowed"
                      >
                        {endpoint.status === 'active' ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        onClick={() => handleRotateWebhookSecret(endpoint)}
                        disabled={!canManage}
                        className="text-[var(--color-primary)] hover:text-blue-800 transition-colors text-sm font-bold flex items-center justify-end w-full disabled:text-gray-300 disabled:cursor-not-allowed"
                      >
                        Rotate Secret
                      </button>
                      <button
                        onClick={() => handleDeleteWebhookEndpoint(endpoint)}
                        disabled={!canManage}
                        className="text-red-500 hover:text-red-700 transition-colors text-sm font-bold flex items-center justify-end w-full disabled:text-gray-300 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  {expandedWebhookId === endpoint.id && (
                    <tr className="bg-[var(--bg-app)]/70">
                      <td colSpan={5} className="px-6 py-4">
                        {!webhookBackendConfigured ? (
                          <p className="text-sm text-[var(--text-muted)]">
                            Delivery history is available when the HTTP API backend is configured.
                          </p>
                        ) : loadingWebhookDeliveriesId === endpoint.id ? (
                          <p className="text-sm text-[var(--text-muted)]">Loading recent deliveries...</p>
                        ) : (webhookDeliveries[endpoint.id]?.length ?? 0) === 0 ? (
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-[var(--text-muted)]">No deliveries recorded yet for this endpoint.</p>
                            <button
                              onClick={() => void handleRefreshWebhookDeliveries(endpoint)}
                              className="text-sm font-bold text-[var(--color-primary)] hover:text-blue-800"
                            >
                              Refresh
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-bold text-[var(--text-main)]">Recent deliveries</p>
                              <button
                                onClick={() => void handleRefreshWebhookDeliveries(endpoint)}
                                className="text-sm font-bold text-[var(--color-primary)] hover:text-blue-800 inline-flex items-center gap-1"
                              >
                                <RefreshCcw className="icon-sm" />
                                Refresh
                              </button>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
                              <table className="w-full text-left text-sm">
                                <thead className="bg-[var(--bg-panel)] text-[11px] uppercase tracking-widest text-gray-400">
                                  <tr>
                                    <th className="px-4 py-3">Event</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Attempt</th>
                                    <th className="px-4 py-3">HTTP</th>
                                    <th className="px-4 py-3">Created</th>
                                    <th className="px-4 py-3">Details</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {webhookDeliveries[endpoint.id]?.map((delivery) => (
                                    <tr key={delivery.id}>
                                      <td className="px-4 py-3 font-mono text-[12px]">{delivery.eventType}</td>
                                      <td className="px-4 py-3">
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${WEBHOOK_DELIVERY_STATUS_CLASSES[delivery.status]}`}>
                                          {WEBHOOK_DELIVERY_STATUS_LABELS[delivery.status]}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">{delivery.attempt}/{delivery.maxAttempts}</td>
                                      <td className="px-4 py-3">{delivery.httpStatus ?? '—'}</td>
                                      <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(delivery.createdAt)}</td>
                                      <td className="px-4 py-3 text-[12px] text-[var(--text-muted)] max-w-xs truncate">
                                        {delivery.error ?? (delivery.deliveredAt ? `Delivered ${formatDateTime(delivery.deliveredAt)}` : delivery.eventId)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-[var(--spacing-lg)] animate-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-[var(--spacing-md)]">
            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-[var(--spacing-lg)] shadow-sm">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Active keys</p>
              <p className="text-3xl font-black text-[var(--text-main)]">{activeKeyCount}</p>
            </div>
            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-[var(--spacing-lg)] shadow-sm">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Rotating keys</p>
              <p className="text-3xl font-black text-[var(--text-main)]">{rotatingKeyCount}</p>
            </div>
            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-[var(--spacing-lg)] shadow-sm">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Revoked keys</p>
              <p className="text-3xl font-black text-[var(--text-main)]">{revokedKeyCount}</p>
            </div>
            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-[var(--spacing-lg)] shadow-sm">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Tracked usage events</p>
              <p className="text-3xl font-black text-[var(--text-main)]">{usageTotals.eventCount}</p>
            </div>
            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-[var(--spacing-lg)] shadow-sm">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Billing credits (est.)</p>
              <p className="text-3xl font-black text-[var(--text-main)]">{usageTotals.totalCredits.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] mb-[var(--spacing-md)]">
            <h3 className="font-bold text-lg text-[var(--text-main)] mb-[var(--spacing-md)]">Integration Activity</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
                <AreaChart data={usageSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="errorsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="calls" name="Successful calls" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#callsGrad)" />
                  <Area type="monotone" dataKey="errors" name="Delivery errors" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#errorsGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] flex items-center justify-between">
            <div className="flex items-center">
              <Code className="w-10 h-10 text-gray-400 mr-4" />
              <div>
                <h3 className="font-bold text-lg text-[var(--text-main)]">API and Webhook Docs</h3>
                <p className="text-sm text-[var(--text-muted)]">View server-side API, signing, and delivery retry references.</p>
              </div>
            </div>
            <button className="text-[var(--color-primary)] font-bold hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-5 py-2.5 rounded-[var(--radius-lg)]">
              Open Docs
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showGenModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-[var(--bg-panel)] w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden relative"
            >
              {newlyGeneratedKey ? (
                <div className="p-[var(--spacing-xl)] pb-10 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="icon-xl text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Key Generated</h3>
                  <p className="text-sm text-[var(--text-muted)] mb-[var(--spacing-md)] px-4">
                    {generatedKeyName} is shown once. Store the full secret before closing this dialog.
                  </p>

                  <div className="bg-gray-50 p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] mb-[var(--spacing-md)] flex flex-col items-center">
                    <code className="text-sm font-mono text-[var(--text-main)] font-bold mb-3 break-all">{newlyGeneratedKey}</code>
                    <button
                      onClick={() => copyToClipboard(newlyGeneratedKey)}
                      className="bg-[var(--color-primary)] hover:bg-blue-700 text-white w-full py-2.5 rounded-lg font-bold flex items-center justify-center transition-colors"
                    >
                      <Copy className="icon-sm mr-2" />
                      Copy Secret
                    </button>
                  </div>

                  <button
                    onClick={closeGenModal}
                    className="text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold text-sm px-6 py-2 transition-colors"
                  >
                    Saved, Close
                  </button>
                </div>
              ) : (
                <div className="p-[var(--spacing-lg)]">
                  <div className="mb-[var(--spacing-md)] flex items-center space-x-3 pb-4 border-b border-[var(--border-color)]">
                    <div className="bg-blue-50 text-[var(--color-primary)] w-10 h-10 flex items-center justify-center rounded-[var(--radius-lg)]">
                      <Key className="icon-md" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[var(--text-main)]">Create API Key</h3>
                      <p className="text-[13px] text-[var(--text-muted)]">Name the server-side app or environment that will use this key.</p>
                    </div>
                  </div>

                  <div className="mb-[var(--spacing-md)]">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Key Name</label>
                    <input
                      type="text"
                      placeholder="Production backend"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="w-full border border-[var(--border-color)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-[var(--radius-lg)] px-4 py-3 outline-none transition-all font-medium text-[15px]"
                      autoFocus
                    />
                  </div>

                  <div className="mb-[var(--spacing-md)]">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Scopes</label>
                    <p className="text-[12px] text-[var(--text-muted)] mb-2">Grant least privilege. Write scopes are billable per call.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                      {API_SCOPES.map((definition) => (
                        <label key={definition.scope} className="flex items-start text-[13px] font-bold text-gray-700 bg-gray-50 border border-[var(--border-color)] rounded-[var(--radius-lg)] p-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newKeyScopes.includes(definition.scope)}
                            onChange={() => toggleNewKeyScope(definition.scope)}
                            className="mr-2 mt-0.5"
                          />
                          <span>
                            <span className="font-mono text-[12px] text-indigo-700">{definition.scope}</span>
                            <span className="block text-[11px] text-[var(--text-muted)] font-medium mt-0.5">{definition.description}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mb-[var(--spacing-xl)] bg-blue-50/60 border border-blue-100 rounded-[var(--radius-lg)] p-3 text-[12px] text-blue-800 font-medium">
                    Default rate limit: {DEFAULT_API_RATE_LIMIT.maxRequests} requests / {Math.floor(DEFAULT_API_RATE_LIMIT.windowMs / 1000)}s sliding window.
                  </div>

                  <div className="flex space-x-3 justify-end">
                    <button
                      onClick={closeGenModal}
                      className="px-5 py-2.5 rounded-[var(--radius-lg)] text-gray-600 font-bold hover:bg-gray-100 transition-colors bg-[var(--bg-panel)] border border-[var(--border-color)]"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={!newKeyName.trim() || newKeyScopes.length === 0 || !canManage}
                      onClick={handleGenerateKey}
                      className="bg-[var(--color-primary)] hover:bg-blue-700 text-white disabled:opacity-50 disabled:hover:bg-[var(--color-primary)] px-6 py-2.5 rounded-[var(--radius-lg)] font-bold transition-all shadow-sm"
                    >
                      Generate
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRotateConfirmModal && keyToRotate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-[var(--bg-panel)] w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden relative p-[var(--spacing-lg)]"
            >
              <div className="mb-[var(--spacing-md)] flex items-start space-x-4">
                <div className="bg-orange-100 text-orange-600 w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full">
                  <RefreshCcw className="icon-lg" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">Rotate API Key</h3>
                  <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
                    A new secret will be generated for {keyToRotate.name}. The old key remains in a 24-hour grace period.
                  </p>
                </div>
              </div>
              <div className="flex space-x-3 justify-end mt-8">
                <button
                  onClick={() => setShowRotateConfirmModal(false)}
                  className="px-5 py-2.5 rounded-[var(--radius-lg)] text-gray-600 font-bold hover:bg-gray-100 transition-colors bg-[var(--bg-panel)] border border-[var(--border-color)] w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  onClick={executeRotateKey}
                  className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-6 py-2.5 rounded-[var(--radius-lg)] font-bold transition-all shadow-sm w-full sm:w-auto"
                >
                  Rotate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWebhookModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-[var(--bg-panel)] w-full max-w-lg rounded-[24px] shadow-2xl overflow-hidden relative"
            >
              {newWebhookSecret ? (
                <div className="p-[var(--spacing-xl)] pb-10 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="icon-xl text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Signing Secret Ready</h3>
                  <p className="text-sm text-[var(--text-muted)] mb-[var(--spacing-md)] px-4">
                    {generatedWebhookName} uses this signing secret. Store it before closing this dialog.
                  </p>

                  <div className="bg-gray-50 p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] mb-[var(--spacing-md)] flex flex-col items-center">
                    <code className="text-sm font-mono text-[var(--text-main)] font-bold mb-3 break-all">{newWebhookSecret}</code>
                    <button
                      onClick={() => copyToClipboard(newWebhookSecret)}
                      className="bg-[var(--color-primary)] hover:bg-blue-700 text-white w-full py-2.5 rounded-lg font-bold flex items-center justify-center transition-colors"
                    >
                      <Copy className="icon-sm mr-2" />
                      Copy Secret
                    </button>
                  </div>

                  <button
                    onClick={closeWebhookModal}
                    className="text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold text-sm px-6 py-2 transition-colors"
                  >
                    Saved, Close
                  </button>
                </div>
              ) : (
                <div className="p-[var(--spacing-lg)]">
                  <div className="mb-[var(--spacing-md)] flex items-center space-x-3 pb-4 border-b border-[var(--border-color)]">
                    <div className="bg-blue-50 text-[var(--color-primary)] w-10 h-10 flex items-center justify-center rounded-[var(--radius-lg)]">
                      <Webhook className="icon-md" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[var(--text-main)]">Add Webhook Endpoint</h3>
                      <p className="text-[13px] text-[var(--text-muted)]">Configure the server endpoint and events for async delivery.</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-[var(--spacing-xl)]">
                    <label className="block">
                      <span className="block text-sm font-bold text-gray-700 mb-2">Endpoint Name</span>
                      <input
                        type="text"
                        placeholder="Production events"
                        value={webhookName}
                        onChange={(e) => setWebhookName(e.target.value)}
                        className="w-full border border-[var(--border-color)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-[var(--radius-lg)] px-4 py-3 outline-none transition-all font-medium text-[15px]"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-sm font-bold text-gray-700 mb-2">Endpoint URL</span>
                      <input
                        type="url"
                        placeholder="https://example.com/aistudio/webhook"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        className="w-full border border-[var(--border-color)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-[var(--radius-lg)] px-4 py-3 outline-none transition-all font-medium text-[15px]"
                      />
                    </label>
                    <div>
                      <p className="block text-sm font-bold text-gray-700 mb-2">Events</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {WEBHOOK_EVENT_OPTIONS.map((eventName) => (
                          <label key={eventName} className="flex items-center text-sm font-bold text-gray-700 bg-gray-50 border border-[var(--border-color)] rounded-[var(--radius-lg)] p-3">
                            <input
                              type="checkbox"
                              checked={webhookEvents.includes(eventName)}
                              onChange={() => toggleWebhookEvent(eventName)}
                              className="mr-2"
                            />
                            {eventName}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3 justify-end">
                    <button
                      onClick={closeWebhookModal}
                      className="px-5 py-2.5 rounded-[var(--radius-lg)] text-gray-600 font-bold hover:bg-gray-100 transition-colors bg-[var(--bg-panel)] border border-[var(--border-color)]"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={!webhookName.trim() || !webhookUrl.trim() || webhookEvents.length === 0 || !canManage}
                      onClick={handleCreateWebhookEndpoint}
                      className="bg-[var(--color-primary)] hover:bg-blue-700 text-white disabled:opacity-50 disabled:hover:bg-[var(--color-primary)] px-6 py-2.5 rounded-[var(--radius-lg)] font-bold transition-all shadow-sm"
                    >
                      Create Endpoint
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showKeyExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-[var(--bg-panel)] w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden relative p-[var(--spacing-lg)]"
            >
              <div className="flex justify-between items-center mb-[var(--spacing-md)]">
                <h3 className="text-xl font-bold text-[var(--text-main)] flex items-center">
                  <Download className="icon-md mr-2 text-[var(--color-primary)]" />
                  Export API Key Metadata
                </h3>
                <button onClick={() => setShowKeyExportModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
                  <X className="icon-md" />
                </button>
              </div>
              <p className="text-[13px] text-[var(--text-muted)] leading-relaxed bg-gray-50 p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] mb-[var(--spacing-xl)]">
                The export includes metadata and masked previews only. Full secrets are never exported.
              </p>
              <button
                onClick={handleExportKeys}
                className="w-full bg-gray-900 hover:bg-black text-white px-6 py-3.5 rounded-[var(--radius-lg)] font-bold transition-all shadow-md flex items-center justify-center"
              >
                <Download className="icon-sm mr-2" />
                Generate CSV
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWebhookExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-[var(--bg-panel)] w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden relative p-[var(--spacing-lg)]"
            >
              <div className="flex justify-between items-center mb-[var(--spacing-md)]">
                <h3 className="text-xl font-bold text-[var(--text-main)] flex items-center">
                  <Download className="icon-md mr-2 text-[var(--color-primary)]" />
                  Export Webhook Metadata
                </h3>
                <button onClick={() => setShowWebhookExportModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
                  <X className="icon-md" />
                </button>
              </div>
              <p className="text-[13px] text-[var(--text-muted)] leading-relaxed bg-gray-50 p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] mb-[var(--spacing-xl)]">
                The export includes endpoint metadata and signing-secret suffixes only. Full signing secrets are never exported.
              </p>
              <button
                onClick={handleExportWebhooks}
                className="w-full bg-gray-900 hover:bg-black text-white px-6 py-3.5 rounded-[var(--radius-lg)] font-bold transition-all shadow-md flex items-center justify-center"
              >
                <Download className="icon-sm mr-2" />
                Generate CSV
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
