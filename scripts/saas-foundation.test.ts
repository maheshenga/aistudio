import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import {
  AUTH_SESSION_STORAGE_KEY,
  clearAuthSession,
  createDemoAuthSession,
  loadAuthSession,
  saveAuthSession,
  type StorageLike,
} from '../src/saas/localAuthSession.ts';
import {
  AUDIT_LOG_STORAGE_KEY,
  clearAuditLogs,
  exportAuditLogRows,
  filterAuditLogs,
  listAuditLogs,
  logAuditEvent,
} from '../src/lib/data/auditLogRepository.ts';
import {
  loadSearchHistory,
  saveSearchHistory,
  subscribeSearchHistory,
} from '../src/lib/data/searchHistoryRepository.ts';
import {
  deleteSetting,
  getSetting,
  loadSettings,
  saveSetting,
} from '../src/lib/data/settingsRepository.ts';
import {
  createGenerationJob,
  failGenerationJob,
  getGenerationJob,
  listGenerationJobs,
  retryGenerationJob,
  updateGenerationJob,
} from '../src/lib/data/generationJobRepository.ts';
import {
  createWorkspaceAsset,
  deleteWorkspaceAssets,
  listRecentWorkspaceAssets,
  loadWorkspaceAssets,
  recordWorkspaceAssetExport,
  saveWorkspaceAssets,
  updateWorkspaceAsset,
} from '../src/lib/data/assetRepository.ts';
import {
  PROJECT_STORAGE_PREFIX,
  createWorkspaceProject,
  loadWorkspaceProjects,
  updateWorkspaceProject,
} from '../src/lib/data/projectRepository.ts';
import {
  createOfflineQueueItem,
  deleteOfflineQueueItem,
  loadOfflineQueue,
  saveOfflineQueue,
} from '../src/lib/data/offlineQueueRepository.ts';
import {
  COMMERCIAL_USAGE_PRICING,
  USAGE_EVENT_STORAGE_PREFIX,
  calculateCommercialUsageCredits,
  createPricedWorkspaceUsageEvent,
  createWorkspaceUsageEvent,
  getCommercialUsagePricing,
  incrementModuleUsage,
  listWorkspaceUsageEvents,
  loadModuleUsage,
  saveModuleUsage,
} from '../src/lib/data/usageRepository.ts';
import { calculateBillingUsage } from '../src/lib/data/billingRepository.ts';
import {
  calculateTaskCompletion,
  createWorkspaceTask,
  deleteWorkspaceTasks,
  loadWorkspaceTasks,
  saveWorkspaceTasks,
  updateWorkspaceTask,
} from '../src/lib/data/taskRepository.ts';
import {
  CUSTOMER_STORAGE_PREFIX,
  createOrUpdateWorkspaceCustomerLead,
  createWorkspaceCustomer,
  loadWorkspaceCustomers,
  updateWorkspaceCustomer,
} from '../src/lib/data/customerRepository.ts';
import {
  KEYWORD_LIBRARY_STORAGE_PREFIX,
  archiveWorkspaceKeywordLibrary,
  createWorkspaceKeywordLibrary,
  loadWorkspaceKeywordLibraries,
  searchWorkspaceKeywordLibraries,
  updateWorkspaceKeywordLibrary,
} from '../src/lib/data/keywordRepository.ts';
import {
  WORKSPACE_MEMBER_STORAGE_PREFIX,
  createWorkspaceMember,
  deleteWorkspaceMembers,
  ensureDemoWorkspaceMembers,
  loadWorkspaceMembers,
  saveWorkspaceMembers,
  updateWorkspaceMember,
} from '../src/lib/data/workspaceMemberRepository.ts';
import {
  RUNTIME_MODE_STRATEGY_SETTING_KEY,
  RUNTIME_MULTICA_API_URL_SETTING_KEY,
  RUNTIME_MULTICA_WS_URL_SETTING_KEY,
  WORKSPACE_PREFERENCES_SETTING_KEY,
  readRuntimeEnvironment,
  readWorkspaceRuntimeSettings,
  resolveRuntimeMode,
} from '../src/runtime/runtimeMode.ts';

function createMemoryStorage(): StorageLike {
  const records = new Map<string, string>();

  return {
    getItem: (key) => records.get(key) ?? null,
    setItem: (key, value) => records.set(key, value),
    removeItem: (key) => records.delete(key),
  };
}

type BillingQuotaCheckInput = Parameters<typeof calculateBillingUsage>[0] & {
  requestedCredits?: number;
};
type BillingQuotaCheckResult = ReturnType<typeof calculateBillingUsage> & {
  requestedCredits: number;
  projectedConsumedCredits: number;
  projectedRemainingCredits: number;
  allowed: boolean;
  overageCredits: number;
};
type BillingPlanRecord = {
  id: string;
  workspaceId: string;
  name: string;
  priceCents: number;
  billingInterval: string;
  monthlyAllowance: number;
  maxConcurrentJobs: number;
  storageGb: number;
  features: string[];
  status: string;
  activeSubscribers: number;
  sortOrder: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
};
type ProviderRecord = {
  id: string;
  workspaceId: string;
  name: string;
  platform: string;
  status: string;
  latencyMs: number | null;
  modelIds: string[];
  billingLabel: string;
  enabled: boolean;
  isDefault: boolean;
  credentialRef: string | null;
  apiKeyLast4: string | null;
  apiKeyFingerprint: string | null;
  scopes: string[];
  ownerId?: string;
  lastTestedAt: number | null;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
};
type ApiKeyRecord = {
  id: string;
  workspaceId: string;
  name: string;
  prefix: string;
  last4: string;
  keyPreview: string;
  credentialRef: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number | null;
  expiresAt: number | null;
  metadata: Record<string, unknown>;
};
type WebhookEndpointRecord = {
  id: string;
  workspaceId: string;
  name: string;
  url: string;
  status: string;
  events: string[];
  signingSecretRef: string;
  signingSecretLast4: string;
  createdAt: number;
  updatedAt: number;
  lastDeliveredAt: number | null;
  failureCount: number;
  metadata: Record<string, unknown>;
};
type FinancialRecord = {
  id: string;
  workspaceId: string;
  kind: string;
  status: string;
  amountCents: number;
  currency: string;
  planId?: string;
  counterparty: string;
  occurredAt: number;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
};
type TaxEventRecord = {
  id: string;
  workspaceId: string;
  date: string;
  title: string;
  type: string;
  description: string;
  summary: string;
  amount?: string;
  status: string;
  daysUntil: number;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
};
type AnnouncementRecord = {
  id: string;
  workspaceId: string;
  title: string;
  channel: string;
  status: string;
  publishedAt: number;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
};
type PluginRecord = {
  id: string;
  workspaceId: string;
  name: string;
  provider: string;
  providerKind: string;
  status: string;
  enabled: boolean;
  category: string;
  configSchema: Array<{ key: string; label: string; required: boolean }>;
  installedAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
};
type TicketRecord = {
  id: string;
  workspaceId: string;
  requesterName: string;
  requesterEmail: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: number;
  updatedAt: number;
  resolvedAt: number | null;
  firstResponseMinutes: number | null;
  metadata: Record<string, unknown>;
};
type AgencyPartnerRecord = {
  id: string;
  workspaceId: string;
  name: string;
  level: string;
  invitedUsers: number;
  commissionRate: number;
  totalCommissionCents: number;
  payoutStatus: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
};
type RiskEventRecord = {
  id: string;
  workspaceId: string;
  action: string;
  contentSummary: string;
  rule: string;
  decision: string;
  severity: string;
  occurredAt: number;
  reviewedAt: number | null;
  updatedAt: number;
  metadata: Record<string, unknown>;
};
type MediaAccountRecord = {
  id: string;
  workspaceId: string;
  platformName: string;
  status: string;
  connectedAccounts: number;
  credentialRef: string | null;
  clientIdLast4: string | null;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
};
type PaymentMethodRecord = {
  id: string;
  workspaceId: string;
  label: string;
  provider: string;
  brand: string;
  last4: string;
  status: string;
  isDefault: boolean;
  credentialRef: string | null;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
};

const billingRepositoryModule = await import('../src/lib/data/billingRepository.ts') as unknown as {
  canStartBillableGeneration?: (input: BillingQuotaCheckInput) => BillingQuotaCheckResult;
  estimateRequestedGenerationCredits?: (input: {
    providerKind: 'mock' | 'multica';
    runtimeMode: 'web' | 'desktop_multica' | 'self_hosted_multica';
    moduleId?: string;
    pricingAction?: string;
    taskCount?: number;
    unitCount?: number;
  }) => number;
  getPlanMonthlyAllowance?: (plan: string, plans?: BillingPlanRecord[]) => number;
  BILLING_PLAN_STORAGE_PREFIX?: string;
  ensureDefaultWorkspaceBillingPlans?: (context: {
    workspaceId: string;
    storage?: StorageLike | null;
    now?: number;
  }) => BillingPlanRecord[];
  loadWorkspaceBillingPlans?: (context: {
    workspaceId: string;
    storage?: StorageLike | null;
    now?: number;
  }) => BillingPlanRecord[];
  saveWorkspaceBillingPlans?: (
    plans: BillingPlanRecord[],
    context: { workspaceId: string; storage?: StorageLike | null; now?: number },
  ) => BillingPlanRecord[];
  updateWorkspaceBillingPlan?: (
    planId: string,
    patch: Partial<Omit<BillingPlanRecord, 'id' | 'workspaceId' | 'updatedAt'>>,
    context: { workspaceId: string; storage?: StorageLike | null; now?: number },
  ) => BillingPlanRecord | null;
};
const canStartBillableGeneration = billingRepositoryModule.canStartBillableGeneration;
const estimateRequestedGenerationCredits = billingRepositoryModule.estimateRequestedGenerationCredits;
const getPlanMonthlyAllowance = billingRepositoryModule.getPlanMonthlyAllowance;
const BILLING_PLAN_STORAGE_PREFIX = billingRepositoryModule.BILLING_PLAN_STORAGE_PREFIX;
const ensureDefaultWorkspaceBillingPlans = billingRepositoryModule.ensureDefaultWorkspaceBillingPlans;
const loadWorkspaceBillingPlans = billingRepositoryModule.loadWorkspaceBillingPlans;
const saveWorkspaceBillingPlans = billingRepositoryModule.saveWorkspaceBillingPlans;
const updateWorkspaceBillingPlan = billingRepositoryModule.updateWorkspaceBillingPlan;

const providerRepositoryModule = await import('../src/lib/data/providerRepository.ts')
  .catch((error) => ({ __importError: error })) as unknown as {
    __importError?: Error;
    PROVIDER_CONFIG_STORAGE_PREFIX?: string;
    ensureDefaultWorkspaceProviders?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => ProviderRecord[];
    loadWorkspaceProviders?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => ProviderRecord[];
    createWorkspaceProvider?: (
      input: {
        name?: string;
        platform: string;
        apiKey?: string;
        modelIds: string[];
        billingLabel?: string;
        enabled?: boolean;
        scopes?: string[];
        ownerId?: string;
        metadata?: Record<string, unknown>;
      },
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => ProviderRecord;
    updateWorkspaceProvider?: (
      providerId: string,
      patch: Partial<Omit<ProviderRecord, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>,
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => ProviderRecord | null;
    setDefaultWorkspaceProvider?: (
      providerId: string,
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => ProviderRecord | null;
    detectProviderModels?: (platform: string) => string[];
  };
const PROVIDER_CONFIG_STORAGE_PREFIX = providerRepositoryModule.PROVIDER_CONFIG_STORAGE_PREFIX;
const ensureDefaultWorkspaceProviders = providerRepositoryModule.ensureDefaultWorkspaceProviders;
const loadWorkspaceProviders = providerRepositoryModule.loadWorkspaceProviders;
const createWorkspaceProvider = providerRepositoryModule.createWorkspaceProvider;
const updateWorkspaceProvider = providerRepositoryModule.updateWorkspaceProvider;
const setDefaultWorkspaceProvider = providerRepositoryModule.setDefaultWorkspaceProvider;
const detectProviderModels = providerRepositoryModule.detectProviderModels;

const apiKeyRepositoryModule = await import('../src/lib/data/apiKeyRepository.ts')
  .catch((error) => ({ __importError: error })) as unknown as {
    __importError?: Error;
    API_KEY_STORAGE_PREFIX?: string;
    loadWorkspaceApiKeys?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => ApiKeyRecord[];
    saveWorkspaceApiKeys?: (
      records: ApiKeyRecord[],
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => ApiKeyRecord[];
    createWorkspaceApiKey?: (
      input: { name: string; secret?: string; expiresAt?: number | null; metadata?: Record<string, unknown> },
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => { record: ApiKeyRecord; secret: string };
    rotateWorkspaceApiKey?: (
      keyId: string,
      input: { secret?: string; gracePeriodMs?: number },
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => { previous: ApiKeyRecord; replacement: ApiKeyRecord; secret: string } | null;
    revokeWorkspaceApiKey?: (
      keyId: string,
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => ApiKeyRecord | null;
    exportWorkspaceApiKeyRows?: (records: ApiKeyRecord[]) => Array<{
      id: string;
      name: string;
      keyPreview: string;
      status: string;
      lastUsedAt: number | null;
      expiresAt: number | null;
    }>;
  };
const API_KEY_STORAGE_PREFIX = apiKeyRepositoryModule.API_KEY_STORAGE_PREFIX;
const loadWorkspaceApiKeys = apiKeyRepositoryModule.loadWorkspaceApiKeys;
const saveWorkspaceApiKeys = apiKeyRepositoryModule.saveWorkspaceApiKeys;
const createWorkspaceApiKey = apiKeyRepositoryModule.createWorkspaceApiKey;
const rotateWorkspaceApiKey = apiKeyRepositoryModule.rotateWorkspaceApiKey;
const revokeWorkspaceApiKey = apiKeyRepositoryModule.revokeWorkspaceApiKey;
const exportWorkspaceApiKeyRows = apiKeyRepositoryModule.exportWorkspaceApiKeyRows;

const webhookRepositoryModule = await import('../src/lib/data/webhookRepository.ts')
  .catch((error) => ({ __importError: error })) as unknown as {
    __importError?: Error;
    WEBHOOK_ENDPOINT_STORAGE_PREFIX?: string;
    loadWorkspaceWebhookEndpoints?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => WebhookEndpointRecord[];
    saveWorkspaceWebhookEndpoints?: (
      records: WebhookEndpointRecord[],
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => WebhookEndpointRecord[];
    createWorkspaceWebhookEndpoint?: (
      input: {
        name: string;
        url: string;
        events: string[];
        signingSecret?: string;
        metadata?: Record<string, unknown>;
      },
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => { record: WebhookEndpointRecord; signingSecret: string };
    updateWorkspaceWebhookEndpoint?: (
      endpointId: string,
      patch: Partial<Omit<WebhookEndpointRecord, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>> & {
        signingSecret?: string;
      },
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => WebhookEndpointRecord | null;
    deleteWorkspaceWebhookEndpoint?: (
      endpointId: string,
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => boolean;
    exportWorkspaceWebhookEndpointRows?: (records: WebhookEndpointRecord[]) => Array<{
      id: string;
      name: string;
      url: string;
      status: string;
      events: string[];
      signingSecretLast4: string;
      failureCount: number;
    }>;
  };
const WEBHOOK_ENDPOINT_STORAGE_PREFIX = webhookRepositoryModule.WEBHOOK_ENDPOINT_STORAGE_PREFIX;
const loadWorkspaceWebhookEndpoints = webhookRepositoryModule.loadWorkspaceWebhookEndpoints;
const saveWorkspaceWebhookEndpoints = webhookRepositoryModule.saveWorkspaceWebhookEndpoints;
const createWorkspaceWebhookEndpoint = webhookRepositoryModule.createWorkspaceWebhookEndpoint;
const updateWorkspaceWebhookEndpoint = webhookRepositoryModule.updateWorkspaceWebhookEndpoint;
const deleteWorkspaceWebhookEndpoint = webhookRepositoryModule.deleteWorkspaceWebhookEndpoint;
const exportWorkspaceWebhookEndpointRows = webhookRepositoryModule.exportWorkspaceWebhookEndpointRows;

const financialRepositoryModule = await import('../src/lib/data/financialRepository.ts')
  .catch((error) => ({ __importError: error })) as unknown as {
    __importError?: Error;
    FINANCIAL_RECORD_STORAGE_PREFIX?: string;
    loadWorkspaceFinancialRecords?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => FinancialRecord[];
    saveWorkspaceFinancialRecords?: (
      records: FinancialRecord[],
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => FinancialRecord[];
    createWorkspaceFinancialRecord?: (
      input: {
        kind: string;
        status: string;
        amountCents: number;
        currency?: string;
        planId?: string;
        counterparty?: string;
        occurredAt?: number;
        metadata?: Record<string, unknown>;
      },
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => FinancialRecord;
    summarizeWorkspaceFinancials?: (
      records: FinancialRecord[],
      options?: { now?: number },
    ) => {
      monthlyRevenueCents: number;
      paidSubscriptionCount: number;
      refundCount: number;
      pendingWithdrawalCents: number;
      previousMonthlyRevenueCents: number;
      monthlyRevenueChangePercent: number;
    };
    buildDailyRevenueSeries?: (
      records: FinancialRecord[],
      options?: { now?: number; days?: number },
    ) => Array<{ name: string; revenue: number }>;
    buildWorkspaceInvoices?: (
      records: FinancialRecord[],
    ) => Array<{
      id: string;
      date: string;
      amountCents: number;
      currency: string;
      status: string;
      sourceRecordId: string;
    }>;
    sumWorkspaceRechargeCredits?: (records: FinancialRecord[]) => number;
    sumWorkspacePromotionalCredits?: (records: FinancialRecord[]) => number;
    hasWorkspaceCouponRedemption?: (records: FinancialRecord[], couponCode: string) => boolean;
  };
const FINANCIAL_RECORD_STORAGE_PREFIX = financialRepositoryModule.FINANCIAL_RECORD_STORAGE_PREFIX;
const loadWorkspaceFinancialRecords = financialRepositoryModule.loadWorkspaceFinancialRecords;
const saveWorkspaceFinancialRecords = financialRepositoryModule.saveWorkspaceFinancialRecords;
const createWorkspaceFinancialRecord = financialRepositoryModule.createWorkspaceFinancialRecord;
const summarizeWorkspaceFinancials = financialRepositoryModule.summarizeWorkspaceFinancials;
const buildDailyRevenueSeries = financialRepositoryModule.buildDailyRevenueSeries;
const buildWorkspaceInvoices = financialRepositoryModule.buildWorkspaceInvoices;
const sumWorkspaceRechargeCredits = financialRepositoryModule.sumWorkspaceRechargeCredits;
const sumWorkspacePromotionalCredits = financialRepositoryModule.sumWorkspacePromotionalCredits;
const hasWorkspaceCouponRedemption = financialRepositoryModule.hasWorkspaceCouponRedemption;

const taxEventRepositoryModule = await import('../src/lib/data/taxEventRepository.ts')
  .catch((error) => ({ __importError: error })) as unknown as {
    __importError?: Error;
    TAX_EVENT_STORAGE_PREFIX?: string;
    loadWorkspaceTaxEvents?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => TaxEventRecord[];
    saveWorkspaceTaxEvents?: (
      events: TaxEventRecord[],
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => TaxEventRecord[];
    createWorkspaceTaxEvent?: (
      input: {
        date: string;
        title: string;
        type: string;
        description: string;
        summary: string;
        amount?: string;
        status: string;
        metadata?: Record<string, unknown>;
      },
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => TaxEventRecord;
    seedWorkspaceTaxEvents?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => TaxEventRecord[];
  };
const TAX_EVENT_STORAGE_PREFIX = taxEventRepositoryModule.TAX_EVENT_STORAGE_PREFIX;
const loadWorkspaceTaxEvents = taxEventRepositoryModule.loadWorkspaceTaxEvents;
const saveWorkspaceTaxEvents = taxEventRepositoryModule.saveWorkspaceTaxEvents;
const createWorkspaceTaxEvent = taxEventRepositoryModule.createWorkspaceTaxEvent;
const seedWorkspaceTaxEvents = taxEventRepositoryModule.seedWorkspaceTaxEvents;

const announcementRepositoryModule = await import('../src/lib/data/announcementRepository.ts')
  .catch((error) => ({ __importError: error })) as unknown as {
    __importError?: Error;
    ANNOUNCEMENT_STORAGE_PREFIX?: string;
    loadWorkspaceAnnouncements?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => AnnouncementRecord[];
    createWorkspaceAnnouncement?: (
      input: {
        title: string;
        channel: string;
        status?: string;
        publishedAt?: number;
        metadata?: Record<string, unknown>;
      },
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => AnnouncementRecord;
    updateWorkspaceAnnouncement?: (
      announcementId: string,
      patch: Partial<Omit<AnnouncementRecord, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>,
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => AnnouncementRecord | null;
  };
const ANNOUNCEMENT_STORAGE_PREFIX = announcementRepositoryModule.ANNOUNCEMENT_STORAGE_PREFIX;
const loadWorkspaceAnnouncements = announcementRepositoryModule.loadWorkspaceAnnouncements;
const createWorkspaceAnnouncement = announcementRepositoryModule.createWorkspaceAnnouncement;
const updateWorkspaceAnnouncement = announcementRepositoryModule.updateWorkspaceAnnouncement;

const pluginRepositoryModule = await import('../src/lib/data/pluginRepository.ts')
  .catch((error) => ({ __importError: error })) as unknown as {
    __importError?: Error;
    PLUGIN_CONFIG_STORAGE_PREFIX?: string;
    ensureDefaultWorkspacePlugins?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => PluginRecord[];
    loadWorkspacePlugins?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => PluginRecord[];
    saveWorkspacePlugins?: (
      plugins: PluginRecord[],
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => PluginRecord[];
    updateWorkspacePlugin?: (
      pluginId: string,
      patch: Partial<Omit<PluginRecord, 'id' | 'workspaceId' | 'installedAt' | 'updatedAt'>>,
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => PluginRecord | null;
  };
const PLUGIN_CONFIG_STORAGE_PREFIX = pluginRepositoryModule.PLUGIN_CONFIG_STORAGE_PREFIX;
const ensureDefaultWorkspacePlugins = pluginRepositoryModule.ensureDefaultWorkspacePlugins;
const loadWorkspacePlugins = pluginRepositoryModule.loadWorkspacePlugins;
const saveWorkspacePlugins = pluginRepositoryModule.saveWorkspacePlugins;
const updateWorkspacePlugin = pluginRepositoryModule.updateWorkspacePlugin;

const ticketRepositoryModule = await import('../src/lib/data/ticketRepository.ts')
  .catch((error) => ({ __importError: error })) as unknown as {
    __importError?: Error;
    TICKET_STORAGE_PREFIX?: string;
    ensureDefaultWorkspaceTickets?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => TicketRecord[];
    loadWorkspaceTickets?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => TicketRecord[];
    saveWorkspaceTickets?: (
      tickets: TicketRecord[],
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => TicketRecord[];
    createWorkspaceTicket?: (
      input: {
        requesterName: string;
        requesterEmail?: string;
        category: string;
        subject: string;
        status?: string;
        priority?: string;
        firstResponseMinutes?: number | null;
        metadata?: Record<string, unknown>;
      },
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => TicketRecord;
    updateWorkspaceTicket?: (
      ticketId: string,
      patch: Partial<Omit<TicketRecord, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>,
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => TicketRecord | null;
    summarizeWorkspaceTickets?: (
      tickets: TicketRecord[],
      options?: { now?: number },
    ) => {
      openCount: number;
      inProgressCount: number;
      resolvedTodayCount: number;
      averageFirstResponseMinutes: number;
    };
  };
const TICKET_STORAGE_PREFIX = ticketRepositoryModule.TICKET_STORAGE_PREFIX;
const ensureDefaultWorkspaceTickets = ticketRepositoryModule.ensureDefaultWorkspaceTickets;
const loadWorkspaceTickets = ticketRepositoryModule.loadWorkspaceTickets;
const saveWorkspaceTickets = ticketRepositoryModule.saveWorkspaceTickets;
const createWorkspaceTicket = ticketRepositoryModule.createWorkspaceTicket;
const updateWorkspaceTicket = ticketRepositoryModule.updateWorkspaceTicket;
const summarizeWorkspaceTickets = ticketRepositoryModule.summarizeWorkspaceTickets;

const agencyRepositoryModule = await import('../src/lib/data/agencyRepository.ts')
  .catch((error) => ({ __importError: error })) as unknown as {
    __importError?: Error;
    AGENCY_PARTNER_STORAGE_PREFIX?: string;
    ensureDefaultWorkspaceAgencyPartners?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => AgencyPartnerRecord[];
    loadWorkspaceAgencyPartners?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => AgencyPartnerRecord[];
    saveWorkspaceAgencyPartners?: (
      partners: AgencyPartnerRecord[],
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => AgencyPartnerRecord[];
    createWorkspaceAgencyPartner?: (
      input: {
        name: string;
        level: string;
        invitedUsers?: number;
        commissionRate?: number;
        totalCommissionCents?: number;
        payoutStatus?: string;
        status?: string;
        metadata?: Record<string, unknown>;
      },
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => AgencyPartnerRecord;
    updateWorkspaceAgencyPartner?: (
      partnerId: string,
      patch: Partial<Omit<AgencyPartnerRecord, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>,
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => AgencyPartnerRecord | null;
    summarizeWorkspaceAgencyPartners?: (
      partners: AgencyPartnerRecord[],
    ) => {
      totalInvitedUsers: number;
      totalCommissionCents: number;
      pendingPayoutCount: number;
      pendingPayoutCents: number;
    };
  };
const AGENCY_PARTNER_STORAGE_PREFIX = agencyRepositoryModule.AGENCY_PARTNER_STORAGE_PREFIX;
const ensureDefaultWorkspaceAgencyPartners = agencyRepositoryModule.ensureDefaultWorkspaceAgencyPartners;
const loadWorkspaceAgencyPartners = agencyRepositoryModule.loadWorkspaceAgencyPartners;
const saveWorkspaceAgencyPartners = agencyRepositoryModule.saveWorkspaceAgencyPartners;
const createWorkspaceAgencyPartner = agencyRepositoryModule.createWorkspaceAgencyPartner;
const updateWorkspaceAgencyPartner = agencyRepositoryModule.updateWorkspaceAgencyPartner;
const summarizeWorkspaceAgencyPartners = agencyRepositoryModule.summarizeWorkspaceAgencyPartners;

const riskRepositoryModule = await import('../src/lib/data/riskRepository.ts')
  .catch((error) => ({ __importError: error })) as unknown as {
    __importError?: Error;
    RISK_EVENT_STORAGE_PREFIX?: string;
    ensureDefaultWorkspaceRiskEvents?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => RiskEventRecord[];
    loadWorkspaceRiskEvents?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => RiskEventRecord[];
    saveWorkspaceRiskEvents?: (
      events: RiskEventRecord[],
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => RiskEventRecord[];
    createWorkspaceRiskEvent?: (
      input: {
        action: string;
        contentSummary: string;
        rule: string;
        decision?: string;
        severity?: string;
        occurredAt?: number;
        metadata?: Record<string, unknown>;
      },
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => RiskEventRecord;
    updateWorkspaceRiskEvent?: (
      eventId: string,
      patch: Partial<Omit<RiskEventRecord, 'id' | 'workspaceId' | 'occurredAt' | 'updatedAt'>>,
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => RiskEventRecord | null;
    summarizeWorkspaceRiskEvents?: (
      events: RiskEventRecord[],
      options?: { now?: number },
    ) => {
      blockedTodayCount: number;
      pendingReviewCount: number;
      highRiskCount: number;
      modelVersion: string;
    };
  };
const RISK_EVENT_STORAGE_PREFIX = riskRepositoryModule.RISK_EVENT_STORAGE_PREFIX;
const ensureDefaultWorkspaceRiskEvents = riskRepositoryModule.ensureDefaultWorkspaceRiskEvents;
const loadWorkspaceRiskEvents = riskRepositoryModule.loadWorkspaceRiskEvents;
const saveWorkspaceRiskEvents = riskRepositoryModule.saveWorkspaceRiskEvents;
const createWorkspaceRiskEvent = riskRepositoryModule.createWorkspaceRiskEvent;
const updateWorkspaceRiskEvent = riskRepositoryModule.updateWorkspaceRiskEvent;
const summarizeWorkspaceRiskEvents = riskRepositoryModule.summarizeWorkspaceRiskEvents;

const mediaRepositoryModule = await import('../src/lib/data/mediaRepository.ts')
  .catch((error) => ({ __importError: error })) as unknown as {
    __importError?: Error;
    MEDIA_ACCOUNT_STORAGE_PREFIX?: string;
    ensureDefaultWorkspaceMediaAccounts?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => MediaAccountRecord[];
    loadWorkspaceMediaAccounts?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => MediaAccountRecord[];
    saveWorkspaceMediaAccounts?: (
      accounts: MediaAccountRecord[],
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => MediaAccountRecord[];
    createWorkspaceMediaAccount?: (
      input: {
        platformName: string;
        status?: string;
        connectedAccounts?: number;
        clientId?: string;
        metadata?: Record<string, unknown>;
      },
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => MediaAccountRecord;
    updateWorkspaceMediaAccount?: (
      accountId: string,
      patch: Partial<Omit<MediaAccountRecord, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>> & { clientId?: string },
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => MediaAccountRecord | null;
    summarizeWorkspaceMediaAccounts?: (
      accounts: MediaAccountRecord[],
    ) => {
      totalConnectedAccounts: number;
      activeProviderCount: number;
      rateLimitedCount: number;
    };
  };
const MEDIA_ACCOUNT_STORAGE_PREFIX = mediaRepositoryModule.MEDIA_ACCOUNT_STORAGE_PREFIX;
const ensureDefaultWorkspaceMediaAccounts = mediaRepositoryModule.ensureDefaultWorkspaceMediaAccounts;
const loadWorkspaceMediaAccounts = mediaRepositoryModule.loadWorkspaceMediaAccounts;
const saveWorkspaceMediaAccounts = mediaRepositoryModule.saveWorkspaceMediaAccounts;
const createWorkspaceMediaAccount = mediaRepositoryModule.createWorkspaceMediaAccount;
const updateWorkspaceMediaAccount = mediaRepositoryModule.updateWorkspaceMediaAccount;
const summarizeWorkspaceMediaAccounts = mediaRepositoryModule.summarizeWorkspaceMediaAccounts;

const paymentRepositoryModule = await import('../src/lib/data/paymentRepository.ts')
  .catch((error) => ({ __importError: error })) as unknown as {
    __importError?: Error;
    PAYMENT_METHOD_STORAGE_PREFIX?: string;
    ensureDefaultWorkspacePaymentMethods?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => PaymentMethodRecord[];
    loadWorkspacePaymentMethods?: (context: {
      workspaceId: string;
      storage?: StorageLike | null;
      now?: number;
    }) => PaymentMethodRecord[];
    saveWorkspacePaymentMethods?: (
      methods: PaymentMethodRecord[],
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => PaymentMethodRecord[];
    createWorkspacePaymentMethod?: (
      input: {
        label?: string;
        provider?: string;
        brand?: string;
        accountNumber?: string;
        status?: string;
        isDefault?: boolean;
        metadata?: Record<string, unknown>;
      },
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => PaymentMethodRecord;
    updateWorkspacePaymentMethod?: (
      methodId: string,
      patch: Partial<Omit<PaymentMethodRecord, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>> & { accountNumber?: string },
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => PaymentMethodRecord | null;
    getDefaultWorkspacePaymentMethod?: (
      context: { workspaceId: string; storage?: StorageLike | null; now?: number },
    ) => PaymentMethodRecord | null;
  };
const PAYMENT_METHOD_STORAGE_PREFIX = paymentRepositoryModule.PAYMENT_METHOD_STORAGE_PREFIX;
const ensureDefaultWorkspacePaymentMethods = paymentRepositoryModule.ensureDefaultWorkspacePaymentMethods;
const loadWorkspacePaymentMethods = paymentRepositoryModule.loadWorkspacePaymentMethods;
const saveWorkspacePaymentMethods = paymentRepositoryModule.saveWorkspacePaymentMethods;
const createWorkspacePaymentMethod = paymentRepositoryModule.createWorkspacePaymentMethod;
const updateWorkspacePaymentMethod = paymentRepositoryModule.updateWorkspacePaymentMethod;
const getDefaultWorkspacePaymentMethod = paymentRepositoryModule.getDefaultWorkspacePaymentMethod;

assert.ok(existsSync('src/saas/permissions.ts'), 'SaaS workspace roles should have a permission matrix');
const permissionsModule = await import('../src/saas/permissions.ts') as unknown as {
  ROLE_PERMISSIONS?: Record<string, readonly string[]>;
  PROTECTED_ACTION_PERMISSIONS?: Record<string, string>;
  buildPermissionDeniedMetadata?: (input: {
    role: string;
    permission: string;
    operation: string;
    moduleId?: string;
  }) => Record<string, unknown>;
  canDispatchAgent?: (role: string) => boolean;
  canManageApiKeys?: (role: string) => boolean;
  canManageAssets?: (role: string) => boolean;
  canManageBilling?: (role: string) => boolean;
  canManageSettings?: (role: string) => boolean;
  canPerformProtectedAction?: (role: string, action: string) => boolean;
  hasWorkspacePermission?: (role: string, permission: string) => boolean;
};
const ROLE_PERMISSIONS = permissionsModule.ROLE_PERMISSIONS;
const PROTECTED_ACTION_PERMISSIONS = permissionsModule.PROTECTED_ACTION_PERMISSIONS;
const buildPermissionDeniedMetadata = permissionsModule.buildPermissionDeniedMetadata;
const canDispatchAgent = permissionsModule.canDispatchAgent;
const canManageApiKeys = permissionsModule.canManageApiKeys;
const canManageAssets = permissionsModule.canManageAssets;
const canManageBilling = permissionsModule.canManageBilling;
const canManageSettings = permissionsModule.canManageSettings;
const canPerformProtectedAction = permissionsModule.canPerformProtectedAction;
const hasWorkspacePermission = permissionsModule.hasWorkspacePermission;

const storage = createMemoryStorage();
const session = createDemoAuthSession({ now: 1_780_000_000_000 });

assert.equal(session.user.id, 'user_demo_maheshenga');
assert.equal(session.workspace.id, 'workspace_demo_maheshenga');
assert.equal(session.membership.role, 'owner');
assert.equal(session.membership.workspaceId, session.workspace.id);

assert.equal(typeof hasWorkspacePermission, 'function', 'permissions should expose a generic role check');
assert.equal(typeof canManageBilling, 'function', 'permissions should expose billing role checks');
assert.equal(typeof canDispatchAgent, 'function', 'permissions should expose agent dispatch role checks');
assert.equal(typeof canManageApiKeys, 'function', 'permissions should expose API key role checks');
assert.equal(typeof canManageAssets, 'function', 'permissions should expose asset role checks');
assert.equal(typeof canManageSettings, 'function', 'permissions should expose settings role checks');
assert.equal(typeof canPerformProtectedAction, 'function', 'permissions should expose protected action checks');
assert.equal(typeof buildPermissionDeniedMetadata, 'function', 'permissions should expose denied-action audit metadata');
assert.deepEqual(
  Object.keys(ROLE_PERMISSIONS ?? {}),
  ['owner', 'admin', 'operator', 'finance', 'viewer'],
  'workspace role matrix should expose the canonical SaaS roles only',
);
assert.deepEqual(
  Object.keys(PROTECTED_ACTION_PERMISSIONS ?? {}).sort(),
  [
    'admin.mutate',
    'agent.dispatch',
    'api_key.mutate',
    'asset.delete',
    'asset.export',
    'billing.mutate',
    'runtime_settings.mutate',
    'task.mutate',
  ].sort(),
  'protected action registry should cover P0 destructive, billing, API key, runtime, admin, and dispatch actions',
);
assert.equal(canManageBilling!('owner'), true);
assert.equal(canManageBilling!('admin'), true);
assert.equal(canManageBilling!('finance'), true);
assert.equal(canManageBilling!('operator'), false);
assert.equal(canManageBilling!('viewer'), false);
assert.equal(canManageApiKeys!('owner'), true);
assert.equal(canManageApiKeys!('admin'), true);
assert.equal(canManageApiKeys!('operator'), false);
assert.equal(canManageApiKeys!('viewer'), false);
assert.equal(canManageAssets!('operator'), true);
assert.equal(canManageAssets!('viewer'), false);
assert.equal(canManageSettings!('operator'), true);
assert.equal(canManageSettings!('viewer'), false);
assert.equal(canDispatchAgent!('owner'), true);
assert.equal(canDispatchAgent!('admin'), true);
assert.equal(canDispatchAgent!('operator'), true);
assert.equal(canDispatchAgent!('finance'), false);
assert.equal(canDispatchAgent!('viewer'), false);
assert.equal(hasWorkspacePermission!('viewer', 'workspace.view'), true);
assert.equal(hasWorkspacePermission!('viewer', 'generation.dispatch'), false);
assert.equal(canPerformProtectedAction!('viewer', 'asset.delete'), false);
assert.equal(canPerformProtectedAction!('operator', 'asset.delete'), true);
assert.equal(canPerformProtectedAction!('operator', 'billing.mutate'), false);
assert.equal(canPerformProtectedAction!('finance', 'billing.mutate'), true);
assert.equal(canPerformProtectedAction!('finance', 'api_key.mutate'), false);
assert.deepEqual(
  buildPermissionDeniedMetadata!({
    role: 'viewer',
    permission: 'assets.manage',
    operation: 'asset_delete',
    moduleId: 'assets',
  }),
  {
    denied: true,
    moduleId: 'assets',
    operation: 'asset_delete',
    requiredPermission: 'assets.manage',
    role: 'viewer',
  },
  'permission denied audit metadata should be deterministic and free of sensitive values',
);

const seededMembers = ensureDemoWorkspaceMembers(session, {
  storage,
  now: 1_780_000_000_000,
});
assert.equal(seededMembers[0]?.workspaceId, session.workspace.id);
assert.equal(seededMembers[0]?.userId, session.user.id);
assert.equal(seededMembers[0]?.role, 'owner');
assert.ok(
  seededMembers.some((member) => member.role === 'finance'),
  'demo workspace members should include a finance role for billing-access validation',
);
assert.equal(
  seededMembers.some((member) => ['manager', 'contributor'].includes(member.role)),
  false,
  'workspace members should not use legacy mock roles',
);
assert.ok(
  storage.getItem(`${WORKSPACE_MEMBER_STORAGE_PREFIX}:${session.workspace.id}`),
  'workspace members should be persisted by workspace',
);
assert.deepEqual(
  loadWorkspaceMembers({ storage, workspaceId: 'workspace_other' }),
  [],
  'workspace members should be workspace-scoped',
);

const createdMember = createWorkspaceMember(
  {
    name: 'Launch Finance',
    email: 'finance@example.com',
    role: 'finance',
    department: 'Finance',
    status: 'active',
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_010 },
);
assert.equal(createdMember.workspaceId, session.workspace.id);
assert.equal(createdMember.role, 'finance');
assert.equal(createdMember.status, 'active');

const updatedMember = updateWorkspaceMember(
  createdMember.id,
  { role: 'operator', department: 'Operations', status: 'inactive' },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_020 },
);
assert.equal(updatedMember?.role, 'operator');
assert.equal(updatedMember?.department, 'Operations');
assert.equal(updatedMember?.status, 'inactive');
assert.equal(updatedMember?.updatedAt, 1_780_000_000_020);

saveWorkspaceMembers([createdMember], { storage, workspaceId: session.workspace.id });
deleteWorkspaceMembers([createdMember.id], { storage, workspaceId: session.workspace.id });
assert.deepEqual(
  loadWorkspaceMembers({ storage, workspaceId: session.workspace.id }).map((member) => member.id),
  [],
  'workspace members should be removable by id',
);

saveAuthSession(session, storage);
assert.ok(storage.getItem(AUTH_SESSION_STORAGE_KEY), 'auth session should be persisted');
assert.deepEqual(loadAuthSession(storage), session, 'auth session should survive reload');
{
  const source = readFileSync('src/saas/SaasAuthContext.tsx', 'utf8');
  assert.ok(
    source.includes('updateWorkspacePlan') && source.includes('saveAuthSession(nextSession)'),
    'SaasAuthContext should persist workspace plan updates through the auth session',
  );
}

const auditEvent = logAuditEvent(
  {
    action: 'pin_module',
    moduleId: 'dashboard',
    targetType: 'module',
    targetId: 'dashboard',
    metadata: {
      description: 'Pinned dashboard',
    },
  },
  { session, storage, now: 1_780_000_000_100 },
);

assert.equal(auditEvent.workspaceId, session.workspace.id);
assert.equal(auditEvent.actor.id, session.user.id);
assert.equal(auditEvent.moduleId, 'dashboard');

const workspaceLogs = listAuditLogs({ storage, workspaceId: session.workspace.id });
assert.equal(workspaceLogs.length, 1);
assert.equal(workspaceLogs[0]?.metadata.description, 'Pinned dashboard');
assert.equal(listAuditLogs({ storage, workspaceId: 'workspace_other' }).length, 0);
assert.ok(storage.getItem(AUDIT_LOG_STORAGE_KEY), 'audit logs should be persisted');

clearAuditLogs(storage);
assert.equal(listAuditLogs({ storage, workspaceId: session.workspace.id }).length, 0);

logAuditEvent(
  {
    action: 'asset_create',
    moduleId: 'assets',
    targetType: 'asset',
    targetId: 'asset_test',
    metadata: { name: 'Test Asset' },
  },
  { session, storage, now: 1_780_000_000_150 },
);
logAuditEvent(
  {
    action: 'asset_export',
    moduleId: 'assets',
    targetType: 'asset',
    targetId: 'asset_test',
    metadata: { format: 'csv' },
  },
  { session, storage, now: 1_780_000_000_160 },
);
logAuditEvent(
  {
    action: 'settings_change',
    moduleId: 'settings',
    targetType: 'settings',
    targetId: 'runtime_config',
    metadata: { operation: 'runtime_config_update' },
  },
  { session, storage, now: 1_780_000_000_170 },
);
assert.deepEqual(
  listAuditLogs({ storage, workspaceId: session.workspace.id }).map((log) => log.action),
  ['settings_change', 'asset_export', 'asset_create'],
  'asset operations should be auditable',
);
const auditableLogs = listAuditLogs({ storage, workspaceId: session.workspace.id });
assert.deepEqual(
  filterAuditLogs(auditableLogs, { moduleId: 'assets' }).map((log) => log.action),
  ['asset_export', 'asset_create'],
  'activity log filters should support module filters',
);
assert.deepEqual(
  filterAuditLogs(auditableLogs, { action: 'settings_change' }).map((log) => log.targetId),
  ['runtime_config'],
  'activity log filters should support action filters',
);
assert.deepEqual(
  filterAuditLogs(auditableLogs, { actorId: session.user.id }).map((log) => log.action),
  ['settings_change', 'asset_export', 'asset_create'],
  'activity log filters should support actor filters',
);
assert.deepEqual(
  filterAuditLogs(auditableLogs, { targetType: 'asset', targetId: 'asset_test' }).map((log) => log.action),
  ['asset_export', 'asset_create'],
  'activity log filters should support target filters',
);
assert.deepEqual(
  filterAuditLogs(auditableLogs, { from: 1_780_000_000_155, to: 1_780_000_000_165 }).map((log) => log.action),
  ['asset_export'],
  'activity log filters should support time period filters',
);
const exportedAuditRows = exportAuditLogRows(auditableLogs);
assert.deepEqual(
  Object.keys(exportedAuditRows[0] ?? {}).sort(),
  ['action', 'actorEmail', 'actorId', 'actorName', 'actorRole', 'id', 'metadataJson', 'moduleId', 'targetId', 'targetType', 'timestamp', 'workspaceId'].sort(),
  'audit export rows should flatten audit metadata for support and compliance workflows',
);

clearAuditLogs(storage);

clearAuthSession(storage);
assert.equal(loadAuthSession(storage), null);

saveSearchHistory(
  ['审计', '财务'],
  { storage, workspaceId: session.workspace.id, userId: session.user.id },
);
assert.deepEqual(
  loadSearchHistory({ storage, workspaceId: session.workspace.id, userId: session.user.id }),
  ['审计', '财务'],
  'search history should survive reload for the current workspace/user',
);
assert.deepEqual(
  loadSearchHistory({ storage, workspaceId: 'workspace_other', userId: session.user.id }),
  [],
  'search history should be workspace-scoped',
);

let subscribedSearchHistory: string[] | null = null;
const unsubscribeSearch = subscribeSearchHistory(
  { storage, workspaceId: session.workspace.id, userId: session.user.id },
  (items) => {
    subscribedSearchHistory = items;
  },
);
assert.deepEqual(subscribedSearchHistory, ['审计', '财务']);
unsubscribeSearch();

saveSetting('daily_focus_goal', 'Ship SaaS foundation', {
  storage,
  workspaceId: session.workspace.id,
  userId: session.user.id,
});
assert.equal(
  getSetting('daily_focus_goal', '', { storage, workspaceId: session.workspace.id, userId: session.user.id }),
  'Ship SaaS foundation',
  'settings should survive reload for the current workspace/user',
);
assert.equal(
  getSetting('daily_focus_goal', '', { storage, workspaceId: 'workspace_other', userId: session.user.id }),
  '',
  'settings should be workspace-scoped',
);
assert.equal(
  getSetting('daily_focus_goal', '', { storage, workspaceId: session.workspace.id, userId: 'user_other' }),
  '',
  'user settings should be user-scoped within a workspace',
);
assert.deepEqual(
  loadSettings({ storage, workspaceId: session.workspace.id, userId: session.user.id }),
  { daily_focus_goal: 'Ship SaaS foundation' },
);
deleteSetting('daily_focus_goal', { storage, workspaceId: session.workspace.id, userId: session.user.id });
assert.equal(
  getSetting('daily_focus_goal', '', { storage, workspaceId: session.workspace.id, userId: session.user.id }),
  '',
);

saveSetting('pinned_modules', ['dashboard', 'tasks'], {
  storage,
  workspaceId: session.workspace.id,
  userId: session.user.id,
});
assert.deepEqual(
  getSetting('pinned_modules', [], { storage, workspaceId: session.workspace.id, userId: session.user.id }),
  ['dashboard', 'tasks'],
  'pinned modules should be stored as workspace/user settings',
);
saveSetting('workspace_autosave', { activeModule: 'tasks', pinnedModules: ['dashboard', 'tasks'] }, {
  storage,
  workspaceId: session.workspace.id,
  userId: session.user.id,
});
assert.deepEqual(
  getSetting('workspace_autosave', {}, { storage, workspaceId: session.workspace.id, userId: session.user.id }),
  { activeModule: 'tasks', pinnedModules: ['dashboard', 'tasks'] },
  'workspace autosave layout should be stored as workspace/user settings',
);
saveSetting('layout_presets', [{ name: 'Ops', data: { activeModule: 'tasks' } }], {
  storage,
  workspaceId: session.workspace.id,
  userId: session.user.id,
});
assert.deepEqual(
  getSetting('layout_presets', [], { storage, workspaceId: session.workspace.id, userId: session.user.id }),
  [{ name: 'Ops', data: { activeModule: 'tasks' } }],
  'layout presets should be stored as workspace/user settings',
);
saveSetting('workspace_presets', [{ id: 'preset_1', name: 'Daily Ops', timestamp: 1, layout: {}, pinned: [] }], {
  storage,
  workspaceId: session.workspace.id,
  userId: session.user.id,
});
assert.deepEqual(
  getSetting('workspace_presets', [], { storage, workspaceId: session.workspace.id, userId: session.user.id }),
  [{ id: 'preset_1', name: 'Daily Ops', timestamp: 1, layout: {}, pinned: [] }],
  'workspace presets should be stored as workspace/user settings',
);
assert.deepEqual(
  getSetting('workspace_presets', [], { storage, workspaceId: 'workspace_other', userId: session.user.id }),
  [],
  'workspace presets should be workspace-scoped',
);
saveSetting('user_macros', [{ name: 'Morning Ops', sequence: ['action-dashboard'], keyMap: 'Alt+M' }], {
  storage,
  workspaceId: session.workspace.id,
  userId: session.user.id,
});
assert.deepEqual(
  getSetting('user_macros', [], { storage, workspaceId: session.workspace.id, userId: session.user.id }),
  [{ name: 'Morning Ops', sequence: ['action-dashboard'], keyMap: 'Alt+M' }],
  'user macros should be stored as workspace/user settings',
);
assert.deepEqual(
  getSetting('user_macros', [], { storage, workspaceId: session.workspace.id, userId: 'user_other' }),
  [],
  'user macros should be user-scoped inside a workspace',
);
saveSetting('quick_notes', [{ id: 'note_1', text: 'Call supplier' }], {
  storage,
  workspaceId: session.workspace.id,
  userId: session.user.id,
});
assert.deepEqual(
  getSetting('quick_notes', [], { storage, workspaceId: session.workspace.id, userId: session.user.id }),
  [{ id: 'note_1', text: 'Call supplier' }],
  'quick notes should be stored as workspace/user settings',
);
assert.deepEqual(
  getSetting('quick_notes', [], { storage, workspaceId: session.workspace.id, userId: 'user_other' }),
  [],
  'quick notes should be user-scoped inside a workspace',
);
saveSetting('aistudio_autosave', { nodes: [{ id: 'node_1' }], edges: [] }, {
  storage,
  workspaceId: session.workspace.id,
  userId: session.user.id,
});
assert.deepEqual(
  getSetting('aistudio_autosave', {}, { storage, workspaceId: session.workspace.id, userId: session.user.id }),
  { nodes: [{ id: 'node_1' }], edges: [] },
  'AI canvas autosave should be stored as workspace/user settings',
);
assert.deepEqual(
  getSetting('aistudio_autosave', {}, { storage, workspaceId: 'workspace_other', userId: session.user.id }),
  {},
  'AI canvas autosave should be workspace-scoped',
);
saveSetting('session_last_state', { activeModule: 'assets', isSplitScreen: false }, {
  storage,
  workspaceId: session.workspace.id,
  userId: session.user.id,
});
saveSetting('clean_exit', false, {
  storage,
  workspaceId: session.workspace.id,
  userId: session.user.id,
});
assert.deepEqual(
  getSetting('session_last_state', {}, { storage, workspaceId: session.workspace.id, userId: session.user.id }),
  { activeModule: 'assets', isSplitScreen: false },
  'session recovery layout should be stored as workspace/user settings',
);
assert.equal(
  getSetting('clean_exit', true, { storage, workspaceId: session.workspace.id, userId: session.user.id }),
  false,
  'clean exit flag should be stored as workspace/user settings',
);
assert.deepEqual(
  getSetting('session_last_state', {}, { storage, workspaceId: 'workspace_other', userId: session.user.id }),
  {},
  'session recovery layout should be workspace-scoped',
);
saveSetting('has_seen_tour', true, {
  storage,
  workspaceId: session.workspace.id,
  userId: session.user.id,
});
assert.equal(
  getSetting('has_seen_tour', false, { storage, workspaceId: session.workspace.id, userId: session.user.id }),
  true,
  'onboarding tour state should be stored as workspace/user settings',
);
assert.equal(
  getSetting('has_seen_tour', false, { storage, workspaceId: session.workspace.id, userId: 'user_other' }),
  false,
  'onboarding tour state should be user-scoped inside a workspace',
);
saveSetting('aistudio_ui_theme', 'midnight', {
  storage,
  workspaceId: session.workspace.id,
  userId: session.user.id,
});
assert.equal(
  getSetting('aistudio_ui_theme', 'light', { storage, workspaceId: session.workspace.id, userId: session.user.id }),
  'midnight',
  'theme should be stored as workspace/user settings',
);
assert.equal(
  getSetting('aistudio_ui_theme', 'light', { storage, workspaceId: session.workspace.id, userId: 'user_other' }),
  'light',
  'theme should be user-scoped inside a workspace',
);

const runtimeSettingsContext = {
  storage,
  workspaceId: session.workspace.id,
  userId: session.user.id,
};
saveSetting(RUNTIME_MODE_STRATEGY_SETTING_KEY, 'self_hosted_multica', runtimeSettingsContext);
saveSetting(RUNTIME_MULTICA_API_URL_SETTING_KEY, 'https://multica.example.test', runtimeSettingsContext);
saveSetting(RUNTIME_MULTICA_WS_URL_SETTING_KEY, 'wss://multica.example.test/ws', runtimeSettingsContext);
saveSetting(WORKSPACE_PREFERENCES_SETTING_KEY, { defaultLanguage: 'zh-CN', compactMode: true }, runtimeSettingsContext);
const runtimeSettings = readWorkspaceRuntimeSettings(runtimeSettingsContext);
assert.equal(
  runtimeSettings.runtimeModeStrategy,
  'self_hosted_multica',
  'runtime mode strategy should survive reload through settingsRepository',
);
assert.equal(
  runtimeSettings.multicaApiUrl,
  'https://multica.example.test',
  'Multica API URL should survive reload through settingsRepository',
);
assert.equal(
  runtimeSettings.multicaWsUrl,
  'wss://multica.example.test/ws',
  'Multica WS URL should survive reload through settingsRepository',
);
assert.deepEqual(
  runtimeSettings.workspacePreferences,
  { defaultLanguage: 'zh-CN', compactMode: true },
  'workspace preferences should survive reload through settingsRepository',
);
const runtimeEnvFromSettings = readRuntimeEnvironment({}, runtimeSettings);
assert.equal(runtimeEnvFromSettings.multicaApiUrl, 'https://multica.example.test');
assert.equal(runtimeEnvFromSettings.multicaWsUrl, 'wss://multica.example.test/ws');
assert.equal(
  runtimeEnvFromSettings.multicaToken,
  undefined,
  'settings-backed runtime environment should not expose a local daemon token',
);
assert.equal(
  readRuntimeEnvironment({ multicaToken: 'env-token' }, runtimeSettings).multicaToken,
  'env-token',
  'runtime token should remain env-only rather than being stored in settings',
);
assert.equal(
  resolveRuntimeMode(runtimeEnvFromSettings, runtimeSettings, null),
  'self_hosted_multica',
  'self-hosted runtime setting should choose the Multica provider',
);
assert.equal(
  resolveRuntimeMode({}, { runtimeModeStrategy: 'auto' }, null),
  'web',
  'auto mode should keep Web standalone behavior when no bridge or Multica endpoint exists',
);
assert.equal(
  resolveRuntimeMode({}, { runtimeModeStrategy: 'desktop_multica' }, null),
  'web',
  'desktop runtime setting should fall back to Web when the desktop bridge is unavailable',
);

const generationJob = createGenerationJob(
  {
    title: 'Generate hero image',
    prompt: 'Create a clean product hero image',
    status: 'queued',
    providerKind: 'mock',
    runtimeMode: 'web',
    moduleId: 'image',
    agentId: 'mock-image-agent',
    runtimeTaskId: 'runtime-task-1',
    progress: 0,
    metadata: { source: 'saas_foundation_test' },
  },
  { storage, workspaceId: session.workspace.id, userId: session.user.id, now: 1_780_000_000_300 },
);
assert.equal(generationJob.workspaceId, session.workspace.id);
assert.equal(generationJob.userId, session.user.id);
assert.equal(listGenerationJobs({ storage, workspaceId: session.workspace.id }).length, 1);
assert.equal(listGenerationJobs({ storage, workspaceId: 'workspace_other' }).length, 0);

const completedGenerationJob = updateGenerationJob(
  generationJob.id,
  { status: 'succeeded', progress: 100 },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_400 },
);
assert.equal(completedGenerationJob?.status, 'succeeded');
assert.equal(completedGenerationJob?.completedAt, 1_780_000_000_400);
assert.equal(getGenerationJob(generationJob.id, { storage, workspaceId: session.workspace.id })?.progress, 100);

const failedGenerationJob = failGenerationJob(
  generationJob.id,
  {
    error: 'Provider timed out before returning an image.',
    metadata: {
      providerStatus: 504,
      failureKind: 'timeout',
    },
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_450 },
);
assert.equal(failedGenerationJob?.status, 'failed');
assert.equal(failedGenerationJob?.progress, 100);
assert.equal(failedGenerationJob?.completedAt, 1_780_000_000_450);
assert.equal(failedGenerationJob?.error, 'Provider timed out before returning an image.');
assert.equal(failedGenerationJob?.metadata.retryable, true);
assert.equal(failedGenerationJob?.metadata.retryCount, 0);
assert.equal(failedGenerationJob?.metadata.failureKind, 'timeout');

const retriedGenerationJob = retryGenerationJob(
  failedGenerationJob!.id,
  { storage, workspaceId: session.workspace.id, userId: session.user.id, now: 1_780_000_000_460 },
);
assert.ok(retriedGenerationJob, 'retryGenerationJob should create a new retry attempt for a failed job');
assert.notEqual(retriedGenerationJob?.id, failedGenerationJob?.id);
assert.equal(retriedGenerationJob?.status, 'queued');
assert.equal(retriedGenerationJob?.progress, 0);
assert.equal(retriedGenerationJob?.metadata.retryOfJobId, failedGenerationJob?.id);
assert.equal(retriedGenerationJob?.metadata.attempt, 2);
assert.equal(
  getGenerationJob(failedGenerationJob!.id, { storage, workspaceId: session.workspace.id })?.metadata.retryCount,
  1,
  'retry should retain and increment metadata on the original failed job',
);
assert.equal(listGenerationJobs({ storage, workspaceId: session.workspace.id }).length, 2);

const savedAsset = createWorkspaceAsset(
  {
    name: 'Summer Campaign Hero',
    type: 'image',
    size: '3.8 MB',
    source: 'generated',
    moduleId: 'e_main_image',
    tags: ['campaign', 'hero'],
  },
  { storage, workspaceId: session.workspace.id, userId: session.user.id, now: 1_780_000_000_500 },
);
assert.equal(savedAsset.workspaceId, session.workspace.id);
assert.equal(savedAsset.userId, session.user.id);
assert.equal(loadWorkspaceAssets({ storage, workspaceId: session.workspace.id }).length, 1);
assert.equal(loadWorkspaceAssets({ storage, workspaceId: 'workspace_other' }).length, 0);

const uploadedAsset = createWorkspaceAsset(
  {
    name: 'Launch Script',
    type: 'document',
    size: '1.1 MB',
    source: 'uploaded',
    moduleId: 'copywriting_create',
    tags: ['copy'],
  },
  { storage, workspaceId: session.workspace.id, userId: session.user.id, now: 1_780_000_000_600 },
);
const updatedAsset = updateWorkspaceAsset(
  savedAsset.id,
  { tags: ['campaign', 'hero', 'approved'], lastAccessedAt: 1_780_000_000_700 },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_700 },
);
assert.deepEqual(updatedAsset?.tags, ['campaign', 'hero', 'approved']);
assert.deepEqual(
  listRecentWorkspaceAssets({ storage, workspaceId: session.workspace.id }).map((asset) => asset.id),
  [savedAsset.id, uploadedAsset.id],
  'recent assets should sort by last access and update time',
);

const exportRecord = recordWorkspaceAssetExport(
  {
    asset: updatedAsset!,
    moduleId: 'e_main_image',
    format: 'png',
    fileName: 'summer-campaign-hero.png',
    sourceAction: 'download_original',
    metered: true,
    unitCount: 1,
    metadata: {
      exportSurface: 'p1_generation_result',
      productName: 'Summer Campaign',
    },
  },
  {
    session,
    storage,
    workspaceId: session.workspace.id,
    userId: session.user.id,
    now: 1_780_000_000_720,
  },
);
assert.equal(exportRecord.auditLog.action, 'asset_export');
assert.equal(exportRecord.auditLog.moduleId, 'e_main_image');
assert.equal(exportRecord.auditLog.targetId, savedAsset.id);
assert.equal(exportRecord.auditLog.metadata.assetId, savedAsset.id);
assert.equal(exportRecord.auditLog.metadata.format, 'png');
assert.equal(exportRecord.auditLog.metadata.fileName, 'summer-campaign-hero.png');
assert.equal(exportRecord.auditLog.metadata.actorId, session.user.id);
assert.equal(exportRecord.auditLog.metadata.exportedAt, 1_780_000_000_720);
assert.equal(exportRecord.usageEvent?.kind, 'export');
assert.equal(exportRecord.usageEvent?.targetType, 'asset');
assert.equal(exportRecord.usageEvent?.targetId, savedAsset.id);
assert.equal(exportRecord.usageEvent?.metadata.pricingKey, 'e_main_image.export');
assert.equal(exportRecord.usageEvent?.metadata.billingStatus, 'estimated');
assert.equal(exportRecord.usageEvent?.metadata.format, 'png');
assert.equal(
  loadWorkspaceAssets({ storage, workspaceId: session.workspace.id }).find((asset) => asset.id === savedAsset.id)?.lastAccessedAt,
  1_780_000_000_720,
  'asset exports should update last access time for recent-asset ranking',
);

const project = createWorkspaceProject(
  {
    name: 'Summer Launch Project',
    type: 'Campaign',
    status: 'active',
    linkedAssetIds: [savedAsset.id],
    metadata: { source: 'saas_foundation_test' },
  },
  { storage, workspaceId: session.workspace.id, userId: session.user.id, now: 1_780_000_000_750 },
);
assert.equal(project.workspaceId, session.workspace.id);
assert.equal(project.userId, session.user.id);
assert.deepEqual(project.linkedAssetIds, [savedAsset.id]);
assert.equal(loadWorkspaceProjects({ storage, workspaceId: session.workspace.id }).length, 1);
assert.equal(loadWorkspaceProjects({ storage, workspaceId: 'workspace_other' }).length, 0);
const linkedProject = updateWorkspaceProject(
  project.id,
  { linkedAssetIds: [savedAsset.id, uploadedAsset.id, savedAsset.id] },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_760 },
);
assert.deepEqual(
  linkedProject?.linkedAssetIds,
  [savedAsset.id, uploadedAsset.id],
  'project asset links should be durable and deduplicated without duplicating asset records',
);

const campaignRepositoryPath = 'src/lib/data/campaignRepository.ts';
assert.ok(existsSync(campaignRepositoryPath), 'campaignRepository should exist for marketing campaign records');
const campaignRepositorySource = readFileSync(campaignRepositoryPath, 'utf8');
assert.ok(
  campaignRepositorySource.includes('CAMPAIGN_STORAGE_PREFIX') &&
    campaignRepositorySource.includes('createWorkspaceCampaign') &&
    campaignRepositorySource.includes('updateWorkspaceCampaign') &&
    campaignRepositorySource.includes('listWorkspaceCampaigns'),
  'campaignRepository should expose durable workspace campaign CRUD helpers',
);
const {
  CAMPAIGN_STORAGE_PREFIX,
  createWorkspaceCampaign,
  updateWorkspaceCampaign,
  listWorkspaceCampaigns,
} = await import('../src/lib/data/campaignRepository.ts');
assert.equal(typeof CAMPAIGN_STORAGE_PREFIX, 'string', 'campaignRepository should expose storage scope');
assert.equal(typeof createWorkspaceCampaign, 'function', 'campaignRepository should expose create helper');
assert.equal(typeof updateWorkspaceCampaign, 'function', 'campaignRepository should expose update helper');
assert.equal(typeof listWorkspaceCampaigns, 'function', 'campaignRepository should expose list helper');
const campaign = createWorkspaceCampaign(
  {
    name: 'Spring Viral Campaign',
    channel: 'viral_qr',
    status: 'draft',
    moduleId: 'marketing_viral',
    linkedAssetIds: [savedAsset.id],
    metrics: { scans: 0, shares: 0, exposures: 0, conversions: 0 },
    metadata: { source: 'saas_foundation_test' },
  },
  { storage, workspaceId: session.workspace.id, userId: session.user.id, now: 1_780_000_000_770 },
);
assert.equal(campaign.workspaceId, session.workspace.id);
assert.equal(campaign.userId, session.user.id);
assert.equal(campaign.channel, 'viral_qr');
assert.deepEqual(campaign.linkedAssetIds, [savedAsset.id]);
assert.equal(listWorkspaceCampaigns({ storage, workspaceId: session.workspace.id }).length, 1);
assert.equal(listWorkspaceCampaigns({ storage, workspaceId: 'workspace_other' }).length, 0);
const publishedCampaign = updateWorkspaceCampaign(
  campaign.id,
  {
    status: 'active',
    linkedAssetIds: [savedAsset.id, uploadedAsset.id, savedAsset.id],
    metrics: { scans: 125, shares: 48, exposures: 3200, conversions: 16 },
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_780 },
);
assert.equal(publishedCampaign?.status, 'active');
assert.deepEqual(
  publishedCampaign?.linkedAssetIds,
  [savedAsset.id, uploadedAsset.id],
  'campaign asset links should deduplicate generated marketing assets',
);
assert.equal(publishedCampaign?.metrics.conversions, 16);

saveWorkspaceAssets([savedAsset, uploadedAsset], { storage, workspaceId: session.workspace.id });
deleteWorkspaceAssets([savedAsset.id], { storage, workspaceId: session.workspace.id });
assert.deepEqual(
  loadWorkspaceAssets({ storage, workspaceId: session.workspace.id }).map((asset) => asset.id),
  [uploadedAsset.id],
);

const queuedOfflineItem = createOfflineQueueItem(
  { key: 'draft:copywriting', value: { title: 'Draft copy' } },
  { storage, workspaceId: session.workspace.id, userId: session.user.id, now: 1_780_000_000_800 },
);
assert.equal(queuedOfflineItem.workspaceId, session.workspace.id);
assert.equal(queuedOfflineItem.userId, session.user.id);
assert.deepEqual(
  loadOfflineQueue({ storage, workspaceId: session.workspace.id, userId: session.user.id }).map((item) => item.key),
  ['draft:copywriting'],
  'offline queue should persist by workspace/user',
);
assert.deepEqual(
  loadOfflineQueue({ storage, workspaceId: 'workspace_other', userId: session.user.id }),
  [],
  'offline queue should be workspace-scoped',
);
saveOfflineQueue([queuedOfflineItem], { storage, workspaceId: session.workspace.id, userId: session.user.id });
deleteOfflineQueueItem(queuedOfflineItem.id, { storage, workspaceId: session.workspace.id, userId: session.user.id });
assert.deepEqual(
  loadOfflineQueue({ storage, workspaceId: session.workspace.id, userId: session.user.id }),
  [],
  'offline queue items should be removable after retry/discard',
);

saveModuleUsage({ dashboard: 30 }, { storage, workspaceId: session.workspace.id, userId: session.user.id });
incrementModuleUsage('tasks', 45, { storage, workspaceId: session.workspace.id, userId: session.user.id });
incrementModuleUsage('tasks', 15, { storage, workspaceId: session.workspace.id, userId: session.user.id });
assert.deepEqual(
  loadModuleUsage({ storage, workspaceId: session.workspace.id, userId: session.user.id }),
  { dashboard: 30, tasks: 60 },
  'module usage should accumulate by workspace/user',
);
assert.deepEqual(
  loadModuleUsage({ storage, workspaceId: 'workspace_other', userId: session.user.id }),
  {},
  'module usage should be workspace-scoped',
);
const exportUsageEvent = createWorkspaceUsageEvent(
  {
    moduleId: 'assets',
    kind: 'export',
    targetType: 'asset',
    targetId: uploadedAsset.id,
    credits: 2,
    metadata: { source: 'asset_zip_export', assetCount: 1 },
  },
  { storage, workspaceId: session.workspace.id, userId: session.user.id, now: 1_780_000_000_900 },
);
const runtimeDispatchUsageEvent = createWorkspaceUsageEvent(
  {
    moduleId: 'tasks',
    kind: 'runtime_dispatch',
    targetType: 'runtime',
    targetId: 'runtime-task-1',
    providerKind: 'mock',
    runtimeMode: 'web',
    credits: 0,
    metadata: { requestedCredits: 5, generationJobId: generationJob.id },
  },
  { storage, workspaceId: session.workspace.id, userId: session.user.id, now: 1_780_000_000_910 },
);
assert.equal(exportUsageEvent.workspaceId, session.workspace.id);
assert.equal(runtimeDispatchUsageEvent.kind, 'runtime_dispatch');
assert.ok(
  storage.getItem(`${USAGE_EVENT_STORAGE_PREFIX}:${session.workspace.id}`),
  'usage events should be persisted by workspace',
);
assert.deepEqual(
  listWorkspaceUsageEvents({ storage, workspaceId: session.workspace.id, userId: session.user.id }).map((event) => event.kind),
  ['runtime_dispatch', 'export', 'export'],
  'usage events should preserve quota-sensitive P0 action evidence by workspace/user',
);
assert.deepEqual(
  listWorkspaceUsageEvents({ storage, workspaceId: 'workspace_other', userId: session.user.id }),
  [],
  'usage events should be workspace-scoped',
);
assert.deepEqual(
  getCommercialUsagePricing('image', 'generation'),
  COMMERCIAL_USAGE_PRICING.image.generation,
  'commercial usage pricing should expose module/action pricing records from one matrix',
);
assert.equal(
  calculateCommercialUsageCredits('e_main_image', 'generation', { unitCount: 3 }),
  12,
  'commercial usage pricing should multiply unit counts by module pricing',
);
assert.equal(
  calculateCommercialUsageCredits('chat', 'generation', { unitCount: 2 }),
  4,
  'commercial usage pricing should support variable text/chat unit counts',
);
assert.equal(
  calculateCommercialUsageCredits('tasks', 'runtime_dispatch', { unitCount: 2 }),
  10,
  'commercial usage pricing should drive runtime dispatch quota preflight estimates',
);
const pricedUsageEvent = createPricedWorkspaceUsageEvent(
  {
    moduleId: 'e_main_image',
    pricingAction: 'generation',
    kind: 'generation',
    targetType: 'generation_job',
    targetId: generationJob.id,
    providerKind: 'mock',
    runtimeMode: 'web',
    unitCount: 3,
    metadata: { source: 'commercial_pricing_test' },
  },
  { storage, workspaceId: session.workspace.id, userId: session.user.id, now: 1_780_000_000_920 },
);
assert.equal(pricedUsageEvent.credits, 12);
assert.equal(pricedUsageEvent.metadata.providerKind, 'mock');
assert.equal(pricedUsageEvent.metadata.runtimeMode, 'web');
assert.equal(pricedUsageEvent.metadata.pricingKey, 'e_main_image.generation');
assert.equal(pricedUsageEvent.metadata.unitCredits, 4);
assert.equal(pricedUsageEvent.metadata.unitCount, 3);
assert.equal(pricedUsageEvent.metadata.creditEstimate, 12);
assert.equal(pricedUsageEvent.metadata.billingStatus, 'estimated');
for (const filePath of [
  'src/components/ECommerceView.tsx',
  'src/components/ImageCreationView.tsx',
  'src/components/VideoCreationView.tsx',
  'src/components/RemixView.tsx',
  'src/components/MarketingView.tsx',
  'src/components/DirectorDeskView.tsx',
  'src/components/CopywritingView.tsx',
  'src/components/ChatView.tsx',
  'src/components/SpeechView.tsx',
  'src/components/ImageEditorView.tsx',
]) {
  const source = readFileSync(filePath, 'utf8');
  assert.ok(
    source.includes('createPricedWorkspaceUsageEvent'),
    `${filePath} should create P1 paid-beta usage through commercial pricing`,
  );
  assert.equal(
    /credits:\s*(?:Math\.|[0-9])/.test(source),
    false,
    `${filePath} should not hard-code paid-beta credit estimates`,
  );
}

for (const filePath of [
  'src/components/ECommerceView.tsx',
  'src/components/ImageCreationView.tsx',
  'src/components/VideoCreationView.tsx',
  'src/components/CopywritingView.tsx',
  'src/components/RemixView.tsx',
]) {
  const source = readFileSync(filePath, 'utf8');
  assert.ok(
    source.includes('recordWorkspaceAssetExport') &&
      source.includes("pricingAction: 'export'") &&
      source.includes("kind: 'export'") &&
      source.includes('format') &&
      source.includes('fileName') &&
      source.includes('sourceAction'),
    `${filePath} should audit and meter P1 output exports with standardized asset export metadata`,
  );
}
{
  const source = readFileSync('src/lib/data/assetRepository.ts', 'utf8');
  assert.ok(
    source.includes('recordWorkspaceAssetExport') &&
      source.includes("action: 'asset_export'") &&
      source.includes("pricingAction: 'export'") &&
      source.includes("kind: 'export'") &&
      source.includes('format: input.format') &&
      source.includes('fileName: input.fileName') &&
      source.includes('sourceAction: input.sourceAction'),
    'assetRepository should centralize standardized asset export audit and usage metadata',
  );
}
assert.deepEqual(
  calculateBillingUsage({
    monthlyAllowance: 100,
    generationJobs: [
      {
        ...completedGenerationJob!,
        metadata: { computeCost: 25 },
      },
      {
        ...completedGenerationJob!,
        id: 'failed_job',
        status: 'failed',
        metadata: { computeCost: 50 },
      },
    ],
    moduleUsage: { dashboard: 120, tasks: 180 },
    usageEvents: [exportUsageEvent, runtimeDispatchUsageEvent],
  }),
  {
    monthlyAllowance: 100,
    rechargeCredits: 0,
    generationCredits: 25,
    activityCredits: 5,
    consumedCredits: 32,
    remainingCredits: 68,
    remainingPercent: 68,
  },
  'billing usage should combine successful generation jobs, module activity, and direct usage events',
);
assert.deepEqual(
  calculateBillingUsage({
    monthlyAllowance: 100,
    rechargeCredits: 50,
    generationJobs: [
      {
        ...completedGenerationJob!,
        metadata: { computeCost: 25 },
      },
    ],
    moduleUsage: { dashboard: 120, tasks: 180 },
  }),
  {
    monthlyAllowance: 100,
    rechargeCredits: 50,
    generationCredits: 25,
    activityCredits: 5,
    consumedCredits: 30,
    remainingCredits: 120,
    remainingPercent: 80,
  },
  'billing usage should add persisted recharge credits to available compute balance',
);
assert.equal(typeof getPlanMonthlyAllowance, 'function', 'billingRepository should expose plan allowance lookup');
assert.equal(getPlanMonthlyAllowance!('free'), 100);
assert.equal(getPlanMonthlyAllowance!('pro'), 5000);
assert.equal(getPlanMonthlyAllowance!('business'), 20000);
assert.equal(getPlanMonthlyAllowance!('enterprise'), 100000);
assert.equal(typeof BILLING_PLAN_STORAGE_PREFIX, 'string', 'billingRepository should expose plan storage scope');
assert.equal(
  typeof ensureDefaultWorkspaceBillingPlans,
  'function',
  'billingRepository should seed persisted workspace billing plans',
);
assert.equal(
  typeof loadWorkspaceBillingPlans,
  'function',
  'billingRepository should load persisted workspace billing plans',
);
assert.equal(
  typeof saveWorkspaceBillingPlans,
  'function',
  'billingRepository should save persisted workspace billing plans',
);
assert.equal(
  typeof updateWorkspaceBillingPlan,
  'function',
  'billingRepository should update persisted workspace billing plans',
);
const seededBillingPlans = ensureDefaultWorkspaceBillingPlans!({
  storage,
  workspaceId: session.workspace.id,
  now: 1_780_000_000_300,
});
assert.deepEqual(
  seededBillingPlans.map((plan) => plan.id),
  ['free', 'pro', 'business', 'enterprise'],
  'workspace billing plans should seed the canonical SaaS plan ids',
);
assert.ok(
  storage.getItem(`${BILLING_PLAN_STORAGE_PREFIX}:${session.workspace.id}`),
  'workspace billing plans should be persisted by workspace',
);
assert.deepEqual(
  loadWorkspaceBillingPlans!({ storage, workspaceId: 'workspace_other' }),
  [],
  'workspace billing plans should be workspace-scoped',
);
const updatedBillingPlan = updateWorkspaceBillingPlan!(
  'pro',
  { monthlyAllowance: 8_000, maxConcurrentJobs: 24, storageGb: 80, status: 'active' },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_310 },
);
assert.equal(updatedBillingPlan?.monthlyAllowance, 8_000);
assert.equal(updatedBillingPlan?.maxConcurrentJobs, 24);
assert.equal(updatedBillingPlan?.storageGb, 80);
assert.equal(updatedBillingPlan?.updatedAt, 1_780_000_000_310);
assert.equal(
  getPlanMonthlyAllowance!('pro', loadWorkspaceBillingPlans!({ storage, workspaceId: session.workspace.id })),
  8_000,
  'plan allowance lookup should honor persisted workspace plan settings',
);
saveWorkspaceBillingPlans!(
  seededBillingPlans.map((plan) => (
    plan.id === 'business'
      ? { ...plan, monthlyAllowance: 30_000, updatedAt: 1_780_000_000_320 }
      : plan
  )),
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_320 },
);
assert.equal(
  getPlanMonthlyAllowance!('business', loadWorkspaceBillingPlans!({ storage, workspaceId: session.workspace.id })),
  30_000,
  'saving workspace billing plans should update persisted allowances',
);
assert.equal(
  providerRepositoryModule.__importError,
  undefined,
  'providerRepository should exist for admin provider configuration',
);
assert.equal(typeof PROVIDER_CONFIG_STORAGE_PREFIX, 'string', 'providerRepository should expose provider storage scope');
assert.equal(
  typeof ensureDefaultWorkspaceProviders,
  'function',
  'providerRepository should seed persisted workspace providers',
);
assert.equal(
  typeof loadWorkspaceProviders,
  'function',
  'providerRepository should load persisted workspace providers',
);
assert.equal(
  typeof createWorkspaceProvider,
  'function',
  'providerRepository should create persisted workspace providers',
);
assert.equal(
  typeof updateWorkspaceProvider,
  'function',
  'providerRepository should update persisted workspace providers',
);
assert.equal(
  typeof setDefaultWorkspaceProvider,
  'function',
  'providerRepository should maintain a single default provider',
);
assert.equal(
  typeof detectProviderModels,
  'function',
  'providerRepository should expose deterministic model detection presets',
);
const seededProviders = ensureDefaultWorkspaceProviders!({
  storage,
  workspaceId: session.workspace.id,
  now: 1_780_000_000_350,
});
assert.ok(seededProviders.length >= 3, 'default workspace providers should cover core model routes');
assert.equal(
  seededProviders.filter((provider) => provider.isDefault).length,
  1,
  'workspace providers should keep exactly one default provider',
);
assert.ok(
  storage.getItem(`${PROVIDER_CONFIG_STORAGE_PREFIX}:${session.workspace.id}`),
  'workspace providers should be persisted by workspace',
);
assert.deepEqual(
  loadWorkspaceProviders!({ storage, workspaceId: 'workspace_other' }),
  [],
  'workspace providers should be workspace-scoped',
);
assert.deepEqual(
  detectProviderModels!('Anthropic'),
  ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'],
  'provider model detection should use deterministic platform presets',
);
const createdProvider = createWorkspaceProvider!(
  {
    platform: 'OpenAI',
    apiKey: 'sk-secret-provider-key-123456',
    modelIds: ['gpt-4o', 'dall-e-3'],
    scopes: ['image.generate', 'text.generate', 'image.generate'],
    ownerId: session.user.id,
    metadata: {
      environment: 'production',
      apiKey: 'sk-secret-provider-key-123456',
      rawKey: 'raw-provider-secret',
      token: 'provider-token-secret',
    },
    billingLabel: '按量计费',
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_360 },
);
assert.equal(createdProvider.workspaceId, session.workspace.id);
assert.equal(createdProvider.platform, 'OpenAI');
assert.equal(createdProvider.enabled, true);
assert.equal(createdProvider.apiKeyLast4, '3456');
assert.ok(createdProvider.apiKeyFingerprint, 'provider records should include a non-secret API key fingerprint');
assert.equal(
  createdProvider.apiKeyFingerprint?.includes('sk-secret-provider-key-123456'),
  false,
  'provider API key fingerprint should not contain the raw API key',
);
assert.deepEqual(
  createdProvider.scopes,
  ['image.generate', 'text.generate'],
  'provider scopes should be normalized and de-duplicated',
);
assert.equal(createdProvider.ownerId, session.user.id, 'provider owner should be persisted for security review');
assert.equal(createdProvider.lastTestedAt, null, 'new provider should start with no provider test timestamp');
assert.deepEqual(
  createdProvider.metadata,
  { environment: 'production' },
  'provider metadata should remove raw API key and token fields',
);
const providerStorageValue = storage.getItem(`${PROVIDER_CONFIG_STORAGE_PREFIX}:${session.workspace.id}`);
assert.equal(
  providerStorageValue?.includes('sk-secret-provider-key-123456') ||
    providerStorageValue?.includes('raw-provider-secret') ||
    providerStorageValue?.includes('provider-token-secret'),
  false,
  'provider repository should not persist raw API keys or sensitive metadata values',
);
const disabledProvider = updateWorkspaceProvider!(
  createdProvider.id,
  { enabled: false, status: 'sleeping', lastTestedAt: 1_780_000_000_365 },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_370 },
);
assert.equal(disabledProvider?.enabled, false);
assert.equal(disabledProvider?.status, 'sleeping');
assert.equal(disabledProvider?.lastTestedAt, 1_780_000_000_365);
assert.equal(disabledProvider?.updatedAt, 1_780_000_000_370);
const defaultProvider = setDefaultWorkspaceProvider!(
  createdProvider.id,
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_380 },
);
assert.equal(defaultProvider?.isDefault, true);
assert.deepEqual(
  loadWorkspaceProviders!({ storage, workspaceId: session.workspace.id })
    .filter((provider) => provider.isDefault)
    .map((provider) => provider.id),
  [createdProvider.id],
  'setting a default provider should clear previous defaults',
);
assert.equal(apiKeyRepositoryModule.__importError, undefined, 'apiKeyRepository should exist for SaaS API keys');
assert.equal(typeof API_KEY_STORAGE_PREFIX, 'string', 'apiKeyRepository should expose workspace API key storage scope');
assert.equal(typeof loadWorkspaceApiKeys, 'function', 'apiKeyRepository should load persisted workspace API keys');
assert.equal(typeof saveWorkspaceApiKeys, 'function', 'apiKeyRepository should save persisted workspace API keys');
assert.equal(typeof createWorkspaceApiKey, 'function', 'apiKeyRepository should create workspace API keys');
assert.equal(typeof rotateWorkspaceApiKey, 'function', 'apiKeyRepository should rotate workspace API keys');
assert.equal(typeof revokeWorkspaceApiKey, 'function', 'apiKeyRepository should revoke workspace API keys');
assert.equal(typeof exportWorkspaceApiKeyRows, 'function', 'apiKeyRepository should export non-secret API key rows');
const createdApiKey = createWorkspaceApiKey!(
  {
    name: 'Production Backend',
    secret: 'sk-prod-secret-1234567890',
    expiresAt: 1_783_000_000_000,
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_390 },
);
assert.equal(createdApiKey.record.workspaceId, session.workspace.id);
assert.equal(createdApiKey.record.last4, '7890');
assert.equal(createdApiKey.record.keyPreview.includes('1234567890'), false);
assert.equal(createdApiKey.record.status, 'active');
assert.equal(createdApiKey.secret, 'sk-prod-secret-1234567890', 'created API key should return the one-time secret to the caller');
const apiKeyStorageValue = storage.getItem(`${API_KEY_STORAGE_PREFIX}:${session.workspace.id}`);
assert.ok(apiKeyStorageValue, 'workspace API keys should be persisted by workspace');
assert.equal(
  apiKeyStorageValue?.includes('sk-prod-secret-1234567890'),
  false,
  'apiKeyRepository should never persist raw API key secrets',
);
assert.deepEqual(
  loadWorkspaceApiKeys!({ storage, workspaceId: 'workspace_other' }),
  [],
  'workspace API keys should be workspace-scoped',
);
const rotatedApiKey = rotateWorkspaceApiKey!(
  createdApiKey.record.id,
  { secret: 'sk-rotated-secret-abcdef', gracePeriodMs: 86_400_000 },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_410 },
);
assert.equal(rotatedApiKey?.previous.status, 'rotating');
assert.equal(rotatedApiKey?.previous.expiresAt, 1_780_086_400_410);
assert.equal(rotatedApiKey?.replacement.last4, 'cdef');
assert.equal(
  storage.getItem(`${API_KEY_STORAGE_PREFIX}:${session.workspace.id}`)?.includes('sk-rotated-secret-abcdef'),
  false,
  'rotated API key secret should not be persisted',
);
const revokedApiKey = revokeWorkspaceApiKey!(
  rotatedApiKey!.replacement.id,
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_420 },
);
assert.equal(revokedApiKey?.status, 'revoked');
assert.deepEqual(
  exportWorkspaceApiKeyRows!(loadWorkspaceApiKeys!({ storage, workspaceId: session.workspace.id }))
    .map((row) => ({ name: row.name, keyPreview: row.keyPreview, status: row.status })),
  [
    { name: 'Production Backend', keyPreview: 'sk-...cdef', status: 'revoked' },
    { name: 'Production Backend', keyPreview: 'sk-...7890', status: 'rotating' },
  ],
  'API key exports should include only metadata and masked key previews',
);
assert.equal(webhookRepositoryModule.__importError, undefined, 'webhookRepository should exist for SaaS webhooks');
assert.equal(typeof WEBHOOK_ENDPOINT_STORAGE_PREFIX, 'string', 'webhookRepository should expose webhook storage scope');
assert.equal(typeof loadWorkspaceWebhookEndpoints, 'function', 'webhookRepository should load persisted webhook endpoints');
assert.equal(typeof saveWorkspaceWebhookEndpoints, 'function', 'webhookRepository should save persisted webhook endpoints');
assert.equal(typeof createWorkspaceWebhookEndpoint, 'function', 'webhookRepository should create webhook endpoints');
assert.equal(typeof updateWorkspaceWebhookEndpoint, 'function', 'webhookRepository should update webhook endpoints');
assert.equal(typeof deleteWorkspaceWebhookEndpoint, 'function', 'webhookRepository should delete webhook endpoints');
assert.equal(typeof exportWorkspaceWebhookEndpointRows, 'function', 'webhookRepository should export non-secret webhook rows');
const createdWebhook = createWorkspaceWebhookEndpoint!(
  {
    name: 'Production Events',
    url: ' https://hooks.example.com/aistudio ',
    events: ['generation.completed', 'billing.invoice_issued'],
    signingSecret: 'whsec-secret-123456789',
    metadata: { signingSecret: 'should-not-persist', source: 'foundation-test' },
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_430 },
);
assert.equal(createdWebhook.record.workspaceId, session.workspace.id);
assert.equal(createdWebhook.record.url, 'https://hooks.example.com/aistudio');
assert.equal(createdWebhook.record.status, 'active');
assert.equal(createdWebhook.record.signingSecretLast4, '6789');
assert.equal(createdWebhook.signingSecret, 'whsec-secret-123456789');
const webhookStorageValue = storage.getItem(`${WEBHOOK_ENDPOINT_STORAGE_PREFIX}:${session.workspace.id}`);
assert.ok(webhookStorageValue, 'workspace webhook endpoints should be persisted by workspace');
assert.equal(
  webhookStorageValue?.includes('whsec-secret-123456789') || webhookStorageValue?.includes('should-not-persist'),
  false,
  'webhookRepository should never persist raw signing secrets',
);
assert.deepEqual(
  loadWorkspaceWebhookEndpoints!({ storage, workspaceId: 'workspace_other' }),
  [],
  'workspace webhook endpoints should be workspace-scoped',
);
const disabledWebhook = updateWorkspaceWebhookEndpoint!(
  createdWebhook.record.id,
  { status: 'disabled', events: ['generation.failed'], failureCount: 2 },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_440 },
);
assert.equal(disabledWebhook?.status, 'disabled');
assert.deepEqual(disabledWebhook?.events, ['generation.failed']);
assert.equal(disabledWebhook?.failureCount, 2);
const rotatedWebhook = updateWorkspaceWebhookEndpoint!(
  createdWebhook.record.id,
  { signingSecret: 'whsec-rotated-abcdef', status: 'active' },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_450 },
);
assert.equal(rotatedWebhook?.status, 'active');
assert.equal(rotatedWebhook?.signingSecretLast4, 'cdef');
assert.equal(
  storage.getItem(`${WEBHOOK_ENDPOINT_STORAGE_PREFIX}:${session.workspace.id}`)?.includes('whsec-rotated-abcdef'),
  false,
  'rotated webhook signing secret should not be persisted',
);
assert.deepEqual(
  exportWorkspaceWebhookEndpointRows!(loadWorkspaceWebhookEndpoints!({ storage, workspaceId: session.workspace.id }))
    .map((row) => ({
      name: row.name,
      url: row.url,
      status: row.status,
      events: row.events,
      signingSecretLast4: row.signingSecretLast4,
    })),
  [
    {
      name: 'Production Events',
      url: 'https://hooks.example.com/aistudio',
      status: 'active',
      events: ['generation.failed'],
      signingSecretLast4: 'cdef',
    },
  ],
  'webhook exports should include only endpoint metadata and signing secret suffixes',
);
assert.equal(
  deleteWorkspaceWebhookEndpoint!(
    createdWebhook.record.id,
    { storage, workspaceId: session.workspace.id, now: 1_780_000_000_460 },
  ),
  true,
  'webhook endpoints should be removable by id',
);
assert.deepEqual(
  loadWorkspaceWebhookEndpoints!({ storage, workspaceId: session.workspace.id }),
  [],
  'deleted webhook endpoints should not remain in the workspace store',
);
assert.equal(
  financialRepositoryModule.__importError,
  undefined,
  'financialRepository should exist for admin sales and finance reporting',
);
assert.equal(typeof FINANCIAL_RECORD_STORAGE_PREFIX, 'string', 'financialRepository should expose financial storage scope');
assert.equal(
  typeof loadWorkspaceFinancialRecords,
  'function',
  'financialRepository should load persisted workspace financial records',
);
assert.equal(
  typeof saveWorkspaceFinancialRecords,
  'function',
  'financialRepository should save persisted workspace financial records',
);
assert.equal(
  typeof createWorkspaceFinancialRecord,
  'function',
  'financialRepository should create persisted workspace financial records',
);
assert.equal(
  typeof summarizeWorkspaceFinancials,
  'function',
  'financialRepository should summarize workspace financial records',
);
assert.equal(
  typeof buildDailyRevenueSeries,
  'function',
  'financialRepository should build revenue charts from persisted records',
);
assert.equal(
  typeof buildWorkspaceInvoices,
  'function',
  'financialRepository should build invoice rows from persisted financial records',
);
assert.equal(
  typeof sumWorkspaceRechargeCredits,
  'function',
  'financialRepository should summarize paid compute recharge credits',
);
assert.equal(
  typeof sumWorkspacePromotionalCredits,
  'function',
  'financialRepository should summarize approved coupon promotional credits',
);
assert.equal(
  typeof hasWorkspaceCouponRedemption,
  'function',
  'financialRepository should detect duplicate coupon redemptions',
);
const subscriptionRecord = createWorkspaceFinancialRecord!(
  {
    kind: 'subscription',
    status: 'paid',
    amountCents: 9_900,
    planId: 'pro',
    counterparty: 'Acme Launch Team',
    occurredAt: 1_780_000_000_400,
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_400 },
);
createWorkspaceFinancialRecord!(
  {
    kind: 'refund',
    status: 'refunded',
    amountCents: 1_900,
    planId: 'pro',
    counterparty: 'Acme Launch Team',
    occurredAt: 1_780_000_000_500,
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_500 },
);
createWorkspaceFinancialRecord!(
  {
    kind: 'withdrawal',
    status: 'pending',
    amountCents: 3_000,
    counterparty: 'Partner One',
    occurredAt: 1_780_000_000_600,
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_600 },
);
createWorkspaceFinancialRecord!(
  {
    kind: 'payment',
    status: 'paid',
    amountCents: 4_800,
    counterparty: 'Acme Launch Team',
    occurredAt: 1_780_000_000_650,
    metadata: { operation: 'compute_points_recharge', points: 3_000 },
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_650 },
);
createWorkspaceFinancialRecord!(
  {
    kind: 'payment',
    status: 'refunded',
    amountCents: 1_000,
    counterparty: 'Acme Launch Team',
    occurredAt: 1_780_000_000_660,
    metadata: { operation: 'compute_points_recharge', points: 500 },
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_660 },
);
createWorkspaceFinancialRecord!(
  {
    kind: 'credit',
    status: 'approved',
    amountCents: 0,
    counterparty: 'Launch Promotion',
    occurredAt: 1_780_000_000_670,
    metadata: { operation: 'compute_points_coupon_redemption', couponCode: 'LAUNCH-1000', points: 1_000 },
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_670 },
);
createWorkspaceFinancialRecord!(
  {
    kind: 'credit',
    status: 'cancelled',
    amountCents: 0,
    counterparty: 'Expired Promotion',
    occurredAt: 1_780_000_000_680,
    metadata: { operation: 'compute_points_coupon_redemption', couponCode: 'EXPIRED-500', points: 500 },
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_680 },
);
assert.equal(subscriptionRecord.workspaceId, session.workspace.id);
assert.ok(
  storage.getItem(`${FINANCIAL_RECORD_STORAGE_PREFIX}:${session.workspace.id}`),
  'workspace financial records should be persisted by workspace',
);
assert.deepEqual(
  loadWorkspaceFinancialRecords!({ storage, workspaceId: 'workspace_other' }),
  [],
  'workspace financial records should be workspace-scoped',
);
assert.deepEqual(
  summarizeWorkspaceFinancials!(
    loadWorkspaceFinancialRecords!({ storage, workspaceId: session.workspace.id }),
    { now: 1_780_000_000_700 },
  ),
  {
    monthlyRevenueCents: 12_800,
    paidSubscriptionCount: 1,
    refundCount: 1,
    pendingWithdrawalCents: 3_000,
    previousMonthlyRevenueCents: 0,
    monthlyRevenueChangePercent: 100,
  },
  'financial summary should combine paid subscriptions, recharges, refunds, and pending withdrawals',
);
assert.deepEqual(
  buildDailyRevenueSeries!(
    loadWorkspaceFinancialRecords!({ storage, workspaceId: session.workspace.id }),
    { now: 1_780_000_000_700, days: 2 },
  ).map((point) => point.revenue),
  [0, 128],
  'daily revenue series should aggregate net paid revenue by day in major currency units',
);
assert.equal(
  sumWorkspaceRechargeCredits!(loadWorkspaceFinancialRecords!({ storage, workspaceId: session.workspace.id })),
  3_000,
  'financial recharge summary should include only paid compute point recharge records',
);
assert.equal(
  sumWorkspacePromotionalCredits!(loadWorkspaceFinancialRecords!({ storage, workspaceId: session.workspace.id })),
  1_000,
  'financial promotional credit summary should include only approved coupon redemption records',
);
assert.equal(
  hasWorkspaceCouponRedemption!(loadWorkspaceFinancialRecords!({ storage, workspaceId: session.workspace.id }), ' launch-1000 '),
  true,
  'coupon redemption detection should normalize user-entered coupon codes',
);
assert.equal(
  hasWorkspaceCouponRedemption!(loadWorkspaceFinancialRecords!({ storage, workspaceId: session.workspace.id }), 'EXPIRED-500'),
  false,
  'coupon redemption detection should ignore cancelled coupon records',
);
const invoiceRecord = createWorkspaceFinancialRecord!(
  {
    kind: 'invoice',
    status: 'issued',
    amountCents: 12_900,
    currency: 'CNY',
    planId: 'pro',
    counterparty: 'Acme Launch Team',
    occurredAt: 1_780_000_000_800,
    metadata: { invoiceNumber: 'INV-LAUNCH-001' },
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_800 },
);
assert.deepEqual(
  buildWorkspaceInvoices!([invoiceRecord]),
  [
    {
      id: 'INV-LAUNCH-001',
      date: new Date(1_780_000_000_800).toLocaleDateString(),
      amountCents: 12_900,
      currency: 'CNY',
      status: 'issued',
      sourceRecordId: invoiceRecord.id,
    },
  ],
  'invoice rows should derive from persisted invoice financial records',
);
saveWorkspaceFinancialRecords!([], { storage, workspaceId: session.workspace.id });
assert.deepEqual(
  loadWorkspaceFinancialRecords!({ storage, workspaceId: session.workspace.id }),
  [],
  'workspace financial records should be replaceable for imports and reconciliations',
);
assert.equal(
  taxEventRepositoryModule.__importError,
  undefined,
  'taxEventRepository should exist for fiscal calendar workspace events',
);
assert.equal(typeof TAX_EVENT_STORAGE_PREFIX, 'string', 'taxEventRepository should expose tax event storage scope');
assert.equal(
  typeof loadWorkspaceTaxEvents,
  'function',
  'taxEventRepository should load persisted workspace tax events',
);
assert.equal(
  typeof saveWorkspaceTaxEvents,
  'function',
  'taxEventRepository should save persisted workspace tax events',
);
assert.equal(
  typeof createWorkspaceTaxEvent,
  'function',
  'taxEventRepository should create persisted workspace tax events',
);
assert.equal(
  typeof seedWorkspaceTaxEvents,
  'function',
  'taxEventRepository should seed default workspace tax events when none exist',
);
const seededTaxEvents = seedWorkspaceTaxEvents!({
  storage,
  workspaceId: session.workspace.id,
  now: Date.parse('2026-06-09T00:00:00.000Z'),
});
assert.ok(
  seededTaxEvents.length >= 4,
  'tax event seeding should provide useful fiscal calendar defaults',
);
assert.ok(
  storage.getItem(`${TAX_EVENT_STORAGE_PREFIX}:${session.workspace.id}`),
  'workspace tax events should be persisted by workspace',
);
assert.deepEqual(
  loadWorkspaceTaxEvents!({ storage, workspaceId: 'workspace_other' }),
  [],
  'workspace tax events should be workspace-scoped',
);
const createdTaxEvent = createWorkspaceTaxEvent!(
  {
    date: '2026-06-12',
    title: 'Quarterly VAT filing',
    type: 'tax_deadline',
    description: 'Submit quarterly VAT filing package',
    summary: 'Review all VAT invoices before filing',
    amount: 'CNY 8,500.00',
    status: 'urgent',
    metadata: { source: 'contract-test' },
  },
  { storage, workspaceId: session.workspace.id, now: Date.parse('2026-06-09T00:00:00.000Z') },
);
assert.equal(createdTaxEvent.daysUntil, 3, 'tax event repository should calculate daysUntil from event date');
assert.equal(
  seedWorkspaceTaxEvents!({
    storage,
    workspaceId: session.workspace.id,
    now: Date.parse('2026-06-09T00:00:00.000Z'),
  }).some((event) => event.id === createdTaxEvent.id),
  true,
  'tax event seeding should preserve existing workspace events',
);
saveWorkspaceTaxEvents!([], { storage, workspaceId: session.workspace.id });
assert.deepEqual(
  loadWorkspaceTaxEvents!({ storage, workspaceId: session.workspace.id }),
  [],
  'workspace tax events should be replaceable for imports and calendar resets',
);
assert.equal(
  announcementRepositoryModule.__importError,
  undefined,
  'announcementRepository should exist for admin announcements',
);
assert.equal(typeof ANNOUNCEMENT_STORAGE_PREFIX, 'string', 'announcementRepository should expose announcement storage scope');
assert.equal(
  typeof loadWorkspaceAnnouncements,
  'function',
  'announcementRepository should load persisted workspace announcements',
);
assert.equal(
  typeof createWorkspaceAnnouncement,
  'function',
  'announcementRepository should create persisted workspace announcements',
);
assert.equal(
  typeof updateWorkspaceAnnouncement,
  'function',
  'announcementRepository should update persisted workspace announcements',
);
const announcement = createWorkspaceAnnouncement!(
  {
    title: 'Launch maintenance window',
    channel: 'in-app + email',
    status: 'active',
    publishedAt: 1_780_000_001_000,
    metadata: { audience: 'all' },
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_001_000 },
);
assert.equal(announcement.workspaceId, session.workspace.id);
assert.equal(announcement.status, 'active');
assert.ok(
  storage.getItem(`${ANNOUNCEMENT_STORAGE_PREFIX}:${session.workspace.id}`),
  'workspace announcements should be persisted by workspace',
);
assert.deepEqual(
  loadWorkspaceAnnouncements!({ storage, workspaceId: 'workspace_other' }),
  [],
  'workspace announcements should be workspace-scoped',
);
const archivedAnnouncement = updateWorkspaceAnnouncement!(
  announcement.id,
  { status: 'archived' },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_001_100 },
);
assert.equal(archivedAnnouncement?.status, 'archived');
assert.equal(archivedAnnouncement?.updatedAt, 1_780_000_001_100);
assert.equal(
  pluginRepositoryModule.__importError,
  undefined,
  'pluginRepository should exist for admin plugin configuration',
);
assert.equal(typeof PLUGIN_CONFIG_STORAGE_PREFIX, 'string', 'pluginRepository should expose plugin storage scope');
assert.equal(
  typeof ensureDefaultWorkspacePlugins,
  'function',
  'pluginRepository should seed persisted workspace plugins',
);
assert.equal(
  typeof loadWorkspacePlugins,
  'function',
  'pluginRepository should load persisted workspace plugins',
);
assert.equal(
  typeof saveWorkspacePlugins,
  'function',
  'pluginRepository should replace persisted workspace plugins',
);
assert.equal(
  typeof updateWorkspacePlugin,
  'function',
  'pluginRepository should update persisted workspace plugin config',
);
const seededPlugins = ensureDefaultWorkspacePlugins!({
  storage,
  workspaceId: session.workspace.id,
  now: 1_780_000_001_200,
});
assert.ok(seededPlugins.length >= 3, 'default workspace plugins should cover core extension routes');
assert.ok(
  seededPlugins.every((plugin) => plugin.workspaceId === session.workspace.id),
  'default workspace plugins should be scoped to the current workspace',
);
assert.ok(
  storage.getItem(`${PLUGIN_CONFIG_STORAGE_PREFIX}:${session.workspace.id}`),
  'workspace plugins should be persisted by workspace',
);
assert.deepEqual(
  loadWorkspacePlugins!({ storage, workspaceId: 'workspace_other' }),
  [],
  'workspace plugins should be workspace-scoped',
);
const disabledPlugin = updateWorkspacePlugin!(
  seededPlugins[0]!.id,
  { enabled: false, status: 'disabled' },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_001_300 },
);
assert.equal(disabledPlugin?.enabled, false);
assert.equal(disabledPlugin?.status, 'disabled');
assert.equal(disabledPlugin?.updatedAt, 1_780_000_001_300);
saveWorkspacePlugins!([], { storage, workspaceId: session.workspace.id });
assert.deepEqual(
  loadWorkspacePlugins!({ storage, workspaceId: session.workspace.id }),
  [],
  'workspace plugins should be replaceable for imports and marketplace sync',
);
assert.equal(
  ticketRepositoryModule.__importError,
  undefined,
  'ticketRepository should exist for admin ticket management',
);
assert.equal(typeof TICKET_STORAGE_PREFIX, 'string', 'ticketRepository should expose ticket storage scope');
assert.equal(
  typeof ensureDefaultWorkspaceTickets,
  'function',
  'ticketRepository should seed persisted workspace tickets',
);
assert.equal(
  typeof loadWorkspaceTickets,
  'function',
  'ticketRepository should load persisted workspace tickets',
);
assert.equal(
  typeof saveWorkspaceTickets,
  'function',
  'ticketRepository should replace persisted workspace tickets',
);
assert.equal(
  typeof createWorkspaceTicket,
  'function',
  'ticketRepository should create persisted workspace tickets',
);
assert.equal(
  typeof updateWorkspaceTicket,
  'function',
  'ticketRepository should update persisted workspace tickets',
);
assert.equal(
  typeof summarizeWorkspaceTickets,
  'function',
  'ticketRepository should summarize workspace support operations',
);
const seededTickets = ensureDefaultWorkspaceTickets!({
  storage,
  workspaceId: session.workspace.id,
  now: 1_780_000_001_400,
});
assert.ok(seededTickets.length >= 3, 'default workspace tickets should seed support queue context');
assert.ok(
  storage.getItem(`${TICKET_STORAGE_PREFIX}:${session.workspace.id}`),
  'workspace tickets should be persisted by workspace',
);
assert.deepEqual(
  loadWorkspaceTickets!({ storage, workspaceId: 'workspace_other' }),
  [],
  'workspace tickets should be workspace-scoped',
);
const createdTicket = createWorkspaceTicket!(
  {
    requesterName: 'Launch Ops',
    requesterEmail: 'ops@example.com',
    category: '账单及退款',
    subject: '订阅发票需要重开',
    priority: 'high',
    firstResponseMinutes: 30,
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_001_500 },
);
assert.equal(createdTicket.workspaceId, session.workspace.id);
assert.equal(createdTicket.status, 'open');
const resolvedTicket = updateWorkspaceTicket!(
  createdTicket.id,
  { status: 'resolved', resolvedAt: 1_780_000_001_600 },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_001_600 },
);
assert.equal(resolvedTicket?.status, 'resolved');
assert.equal(resolvedTicket?.updatedAt, 1_780_000_001_600);
assert.deepEqual(
  summarizeWorkspaceTickets!(
    [
      {
        ...createdTicket,
        id: 'ticket_open',
        status: 'open',
        firstResponseMinutes: 30,
        resolvedAt: null,
      },
      {
        ...createdTicket,
        id: 'ticket_progress',
        status: 'in_progress',
        firstResponseMinutes: 90,
        resolvedAt: null,
      },
      {
        ...createdTicket,
        id: 'ticket_resolved',
        status: 'resolved',
        firstResponseMinutes: 60,
        resolvedAt: 1_780_000_001_600,
      },
    ],
    { now: 1_780_000_001_700 },
  ),
  {
    openCount: 1,
    inProgressCount: 1,
    resolvedTodayCount: 1,
    averageFirstResponseMinutes: 60,
  },
  'ticket summary should derive queue metrics from persisted records',
);
saveWorkspaceTickets!([], { storage, workspaceId: session.workspace.id });
assert.deepEqual(
  loadWorkspaceTickets!({ storage, workspaceId: session.workspace.id }),
  [],
  'workspace tickets should be replaceable for imports and support exports',
);
assert.equal(
  agencyRepositoryModule.__importError,
  undefined,
  'agencyRepository should exist for admin agency and affiliate management',
);
assert.equal(
  typeof AGENCY_PARTNER_STORAGE_PREFIX,
  'string',
  'agencyRepository should expose agency partner storage scope',
);
assert.equal(
  typeof ensureDefaultWorkspaceAgencyPartners,
  'function',
  'agencyRepository should seed persisted workspace agency partners',
);
assert.equal(
  typeof loadWorkspaceAgencyPartners,
  'function',
  'agencyRepository should load persisted workspace agency partners',
);
assert.equal(
  typeof saveWorkspaceAgencyPartners,
  'function',
  'agencyRepository should replace persisted workspace agency partners',
);
assert.equal(
  typeof createWorkspaceAgencyPartner,
  'function',
  'agencyRepository should create persisted workspace agency partners',
);
assert.equal(
  typeof updateWorkspaceAgencyPartner,
  'function',
  'agencyRepository should update persisted workspace agency partners',
);
assert.equal(
  typeof summarizeWorkspaceAgencyPartners,
  'function',
  'agencyRepository should summarize affiliate performance and payouts',
);
const seededAgencyPartners = ensureDefaultWorkspaceAgencyPartners!({
  storage,
  workspaceId: session.workspace.id,
  now: 1_780_000_001_800,
});
assert.ok(seededAgencyPartners.length >= 3, 'default workspace agency partners should seed affiliate operations context');
assert.ok(
  storage.getItem(`${AGENCY_PARTNER_STORAGE_PREFIX}:${session.workspace.id}`),
  'workspace agency partners should be persisted by workspace',
);
assert.deepEqual(
  loadWorkspaceAgencyPartners!({ storage, workspaceId: 'workspace_other' }),
  [],
  'workspace agency partners should be workspace-scoped',
);
const createdAgencyPartner = createWorkspaceAgencyPartner!(
  {
    name: 'Launch Partner',
    level: 'V2 渠道代理',
    invitedUsers: 20,
    commissionRate: 0.25,
    totalCommissionCents: 12_000,
    payoutStatus: 'pending',
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_001_900 },
);
assert.equal(createdAgencyPartner.workspaceId, session.workspace.id);
assert.equal(createdAgencyPartner.payoutStatus, 'pending');
const paidAgencyPartner = updateWorkspaceAgencyPartner!(
  createdAgencyPartner.id,
  { payoutStatus: 'paid' },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_002_000 },
);
assert.equal(paidAgencyPartner?.payoutStatus, 'paid');
assert.equal(paidAgencyPartner?.updatedAt, 1_780_000_002_000);
assert.deepEqual(
  summarizeWorkspaceAgencyPartners!([
    {
      ...createdAgencyPartner,
      id: 'agency_a',
      invitedUsers: 10,
      totalCommissionCents: 5_000,
      payoutStatus: 'pending',
    },
    {
      ...createdAgencyPartner,
      id: 'agency_b',
      invitedUsers: 30,
      totalCommissionCents: 7_000,
      payoutStatus: 'none',
    },
  ]),
  {
    totalInvitedUsers: 40,
    totalCommissionCents: 12_000,
    pendingPayoutCount: 1,
    pendingPayoutCents: 5_000,
  },
  'agency summary should derive invited users, commissions, and pending payouts from persisted partners',
);
saveWorkspaceAgencyPartners!([], { storage, workspaceId: session.workspace.id });
assert.deepEqual(
  loadWorkspaceAgencyPartners!({ storage, workspaceId: session.workspace.id }),
  [],
  'workspace agency partners should be replaceable for imports and commission reconciliation',
);
assert.equal(
  riskRepositoryModule.__importError,
  undefined,
  'riskRepository should exist for admin content risk review',
);
assert.equal(typeof RISK_EVENT_STORAGE_PREFIX, 'string', 'riskRepository should expose risk event storage scope');
assert.equal(
  typeof ensureDefaultWorkspaceRiskEvents,
  'function',
  'riskRepository should seed persisted workspace risk events',
);
assert.equal(
  typeof loadWorkspaceRiskEvents,
  'function',
  'riskRepository should load persisted workspace risk events',
);
assert.equal(
  typeof saveWorkspaceRiskEvents,
  'function',
  'riskRepository should replace persisted workspace risk events',
);
assert.equal(
  typeof createWorkspaceRiskEvent,
  'function',
  'riskRepository should create persisted workspace risk events',
);
assert.equal(
  typeof updateWorkspaceRiskEvent,
  'function',
  'riskRepository should update persisted workspace risk events',
);
assert.equal(
  typeof summarizeWorkspaceRiskEvents,
  'function',
  'riskRepository should summarize workspace risk queue metrics',
);
const seededRiskEvents = ensureDefaultWorkspaceRiskEvents!({
  storage,
  workspaceId: session.workspace.id,
  now: 1_780_000_002_100,
});
assert.ok(seededRiskEvents.length >= 3, 'default workspace risk events should seed moderation queue context');
assert.ok(
  storage.getItem(`${RISK_EVENT_STORAGE_PREFIX}:${session.workspace.id}`),
  'workspace risk events should be persisted by workspace',
);
assert.deepEqual(
  loadWorkspaceRiskEvents!({ storage, workspaceId: 'workspace_other' }),
  [],
  'workspace risk events should be workspace-scoped',
);
const createdRiskEvent = createWorkspaceRiskEvent!(
  {
    action: '公开作品发布',
    contentSummary: '用户举报疑似违规营销内容',
    rule: 'manual_report',
    decision: 'pending_review',
    severity: 'high',
    occurredAt: 1_780_000_002_200,
    metadata: { modelVersion: 'v2.5' },
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_002_200 },
);
assert.equal(createdRiskEvent.workspaceId, session.workspace.id);
assert.equal(createdRiskEvent.decision, 'pending_review');
const reviewedRiskEvent = updateWorkspaceRiskEvent!(
  createdRiskEvent.id,
  { decision: 'allowed', reviewedAt: 1_780_000_002_300 },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_002_300 },
);
assert.equal(reviewedRiskEvent?.decision, 'allowed');
assert.equal(reviewedRiskEvent?.reviewedAt, 1_780_000_002_300);
assert.deepEqual(
  summarizeWorkspaceRiskEvents!(
    [
      {
        ...createdRiskEvent,
        id: 'risk_blocked',
        decision: 'blocked',
        severity: 'critical',
        occurredAt: 1_780_000_002_100,
        reviewedAt: null,
        metadata: { modelVersion: 'v2.5' },
      },
      {
        ...createdRiskEvent,
        id: 'risk_pending',
        decision: 'pending_review',
        severity: 'high',
        occurredAt: 1_780_000_002_200,
        reviewedAt: null,
        metadata: { modelVersion: 'v2.5' },
      },
      {
        ...createdRiskEvent,
        id: 'risk_allowed',
        decision: 'allowed',
        severity: 'low',
        occurredAt: 1_780_000_002_250,
        reviewedAt: 1_780_000_002_260,
        metadata: { modelVersion: 'v2.4' },
      },
    ],
    { now: 1_780_000_002_400 },
  ),
  {
    blockedTodayCount: 1,
    pendingReviewCount: 1,
    highRiskCount: 2,
    modelVersion: 'v2.5',
  },
  'risk summary should derive blocked, pending, high-risk, and model version metrics from persisted events',
);
saveWorkspaceRiskEvents!([], { storage, workspaceId: session.workspace.id });
assert.deepEqual(
  loadWorkspaceRiskEvents!({ storage, workspaceId: session.workspace.id }),
  [],
  'workspace risk events should be replaceable for imports and moderation exports',
);
assert.equal(
  mediaRepositoryModule.__importError,
  undefined,
  'mediaRepository should exist for admin media OAuth account management',
);
assert.equal(typeof MEDIA_ACCOUNT_STORAGE_PREFIX, 'string', 'mediaRepository should expose media account storage scope');
assert.equal(
  typeof ensureDefaultWorkspaceMediaAccounts,
  'function',
  'mediaRepository should seed persisted workspace media accounts',
);
assert.equal(
  typeof loadWorkspaceMediaAccounts,
  'function',
  'mediaRepository should load persisted workspace media accounts',
);
assert.equal(
  typeof saveWorkspaceMediaAccounts,
  'function',
  'mediaRepository should replace persisted workspace media accounts',
);
assert.equal(
  typeof createWorkspaceMediaAccount,
  'function',
  'mediaRepository should create persisted workspace media accounts',
);
assert.equal(
  typeof updateWorkspaceMediaAccount,
  'function',
  'mediaRepository should update persisted workspace media account config',
);
assert.equal(
  typeof summarizeWorkspaceMediaAccounts,
  'function',
  'mediaRepository should summarize media OAuth provider health',
);
const seededMediaAccounts = ensureDefaultWorkspaceMediaAccounts!({
  storage,
  workspaceId: session.workspace.id,
  now: 1_780_000_002_500,
});
assert.ok(seededMediaAccounts.length >= 4, 'default workspace media accounts should seed OAuth provider context');
assert.ok(
  storage.getItem(`${MEDIA_ACCOUNT_STORAGE_PREFIX}:${session.workspace.id}`),
  'workspace media accounts should be persisted by workspace',
);
assert.deepEqual(
  loadWorkspaceMediaAccounts!({ storage, workspaceId: 'workspace_other' }),
  [],
  'workspace media accounts should be workspace-scoped',
);
const createdMediaAccount = createWorkspaceMediaAccount!(
  {
    platformName: 'Threads API',
    status: 'active',
    connectedAccounts: 10,
    clientId: 'threads-client-secret-1234',
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_002_600 },
);
assert.equal(createdMediaAccount.workspaceId, session.workspace.id);
assert.equal(createdMediaAccount.clientIdLast4, '1234');
assert.equal(
  storage.getItem(`${MEDIA_ACCOUNT_STORAGE_PREFIX}:${session.workspace.id}`)?.includes('threads-client-secret-1234'),
  false,
  'mediaRepository should not persist raw OAuth client ids',
);
const updatedMediaAccount = updateWorkspaceMediaAccount!(
  createdMediaAccount.id,
  { status: 'rate_limited', connectedAccounts: 12, clientId: 'rotated-client-9876' },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_002_700 },
);
assert.equal(updatedMediaAccount?.status, 'rate_limited');
assert.equal(updatedMediaAccount?.connectedAccounts, 12);
assert.equal(updatedMediaAccount?.clientIdLast4, '9876');
assert.equal(updatedMediaAccount?.updatedAt, 1_780_000_002_700);
assert.deepEqual(
  summarizeWorkspaceMediaAccounts!([
    {
      ...createdMediaAccount,
      id: 'media_active',
      status: 'active',
      connectedAccounts: 10,
    },
    {
      ...createdMediaAccount,
      id: 'media_limited',
      status: 'rate_limited',
      connectedAccounts: 20,
    },
  ]),
  {
    totalConnectedAccounts: 30,
    activeProviderCount: 1,
    rateLimitedCount: 1,
  },
  'media summary should derive connected accounts and provider health from persisted accounts',
);
saveWorkspaceMediaAccounts!([], { storage, workspaceId: session.workspace.id });
assert.deepEqual(
  loadWorkspaceMediaAccounts!({ storage, workspaceId: session.workspace.id }),
  [],
  'workspace media accounts should be replaceable for imports and OAuth catalog sync',
);
assert.equal(
  paymentRepositoryModule.__importError,
  undefined,
  'paymentRepository should exist for workspace billing payment methods',
);
assert.equal(typeof PAYMENT_METHOD_STORAGE_PREFIX, 'string', 'paymentRepository should expose payment method storage scope');
assert.equal(
  typeof ensureDefaultWorkspacePaymentMethods,
  'function',
  'paymentRepository should seed persisted workspace payment methods',
);
assert.equal(
  typeof loadWorkspacePaymentMethods,
  'function',
  'paymentRepository should load persisted workspace payment methods',
);
assert.equal(
  typeof saveWorkspacePaymentMethods,
  'function',
  'paymentRepository should replace persisted workspace payment methods',
);
assert.equal(
  typeof createWorkspacePaymentMethod,
  'function',
  'paymentRepository should create persisted workspace payment methods',
);
assert.equal(
  typeof updateWorkspacePaymentMethod,
  'function',
  'paymentRepository should update persisted workspace payment methods',
);
assert.equal(
  typeof getDefaultWorkspacePaymentMethod,
  'function',
  'paymentRepository should expose the default workspace payment method',
);
const seededPaymentMethods = ensureDefaultWorkspacePaymentMethods!({
  storage,
  workspaceId: session.workspace.id,
  now: 1_780_000_002_800,
});
assert.ok(seededPaymentMethods.length >= 1, 'default workspace payment methods should seed billing context');
assert.ok(
  storage.getItem(`${PAYMENT_METHOD_STORAGE_PREFIX}:${session.workspace.id}`),
  'workspace payment methods should be persisted by workspace',
);
assert.deepEqual(
  loadWorkspacePaymentMethods!({ storage, workspaceId: 'workspace_other' }),
  [],
  'workspace payment methods should be workspace-scoped',
);
const createdPaymentMethod = createWorkspacePaymentMethod!(
  {
    label: 'Finance Card',
    provider: 'Stripe',
    brand: 'Visa',
    accountNumber: '4111111111112222',
    isDefault: true,
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_002_900 },
);
assert.equal(createdPaymentMethod.last4, '2222');
assert.equal(createdPaymentMethod.isDefault, true);
assert.equal(
  storage.getItem(`${PAYMENT_METHOD_STORAGE_PREFIX}:${session.workspace.id}`)?.includes('4111111111112222'),
  false,
  'paymentRepository should not persist raw payment account numbers',
);
assert.equal(
  getDefaultWorkspacePaymentMethod!({ storage, workspaceId: session.workspace.id })?.id,
  createdPaymentMethod.id,
  'paymentRepository should maintain a single default payment method',
);
const rotatedPaymentMethod = updateWorkspacePaymentMethod!(
  createdPaymentMethod.id,
  { accountNumber: '5555555555559876', status: 'active' },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_003_000 },
);
assert.equal(rotatedPaymentMethod?.last4, '9876');
assert.equal(rotatedPaymentMethod?.updatedAt, 1_780_000_003_000);
saveWorkspacePaymentMethods!([], { storage, workspaceId: session.workspace.id });
assert.deepEqual(
  loadWorkspacePaymentMethods!({ storage, workspaceId: session.workspace.id }),
  [],
  'workspace payment methods should be replaceable for imports and billing migration',
);
assert.equal(
  typeof estimateRequestedGenerationCredits,
  'function',
  'billingRepository should estimate requested generation credits before dispatch',
);
assert.equal(
  estimateRequestedGenerationCredits!({
    providerKind: 'mock',
    runtimeMode: 'web',
    moduleId: 'tasks',
    pricingAction: 'runtime_dispatch',
    taskCount: 2,
  }),
  10,
  'billing preflight should reserve runtime dispatch credits from the commercial pricing matrix',
);
assert.equal(
  estimateRequestedGenerationCredits!({ providerKind: 'multica', runtimeMode: 'self_hosted_multica', taskCount: 2 }),
  6,
  'self-hosted Multica generation requests should reserve Multica credits per task',
);
assert.equal(
  estimateRequestedGenerationCredits!({ providerKind: 'multica', runtimeMode: 'desktop_multica', taskCount: 2 }),
  2,
  'desktop Multica generation requests should reserve local-runtime credits per task',
);
assert.equal(typeof canStartBillableGeneration, 'function', 'billingRepository should expose an over-quota guard');
assert.deepEqual(
  canStartBillableGeneration!({
    monthlyAllowance: 100,
    generationJobs: [
      {
        ...completedGenerationJob!,
        metadata: { computeCost: 25 },
      },
    ],
    moduleUsage: { dashboard: 120, tasks: 180 },
    requestedCredits: 5,
  }),
  {
    monthlyAllowance: 100,
    rechargeCredits: 0,
    generationCredits: 25,
    activityCredits: 5,
    consumedCredits: 30,
    remainingCredits: 70,
    remainingPercent: 70,
    requestedCredits: 5,
    projectedConsumedCredits: 35,
    projectedRemainingCredits: 65,
    allowed: true,
    overageCredits: 0,
  },
  'billing guard should allow generation when the projected usage fits the allowance',
);
assert.deepEqual(
  canStartBillableGeneration!({
    monthlyAllowance: 30,
    generationJobs: [
      {
        ...completedGenerationJob!,
        metadata: { computeCost: 25 },
      },
    ],
    moduleUsage: { dashboard: 120, tasks: 180 },
    requestedCredits: 1,
  }),
  {
    monthlyAllowance: 30,
    rechargeCredits: 0,
    generationCredits: 25,
    activityCredits: 5,
    consumedCredits: 30,
    remainingCredits: 0,
    remainingPercent: 0,
    requestedCredits: 1,
    projectedConsumedCredits: 31,
    projectedRemainingCredits: 0,
    allowed: false,
    overageCredits: 1,
  },
  'billing guard should block generation when the projected usage exceeds the allowance',
);

const createdTask = createWorkspaceTask(
  {
    title: 'Prepare launch checklist',
    column: 'todo',
    priority: 'Medium',
    type: 'Operations',
    date: 'Today',
    isAuto: false,
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_200 },
);
assert.equal(createdTask.workspaceId, session.workspace.id);
assert.equal(loadWorkspaceTasks({ storage, workspaceId: session.workspace.id }).length, 1);
assert.equal(loadWorkspaceTasks({ storage, workspaceId: 'workspace_other' }).length, 0);

const movedTask = updateWorkspaceTask(
  createdTask.id,
  { column: 'done' },
  { storage, workspaceId: session.workspace.id },
);
assert.equal(movedTask?.column, 'done');
assert.deepEqual(
  calculateTaskCompletion(loadWorkspaceTasks({ storage, workspaceId: session.workspace.id })),
  { total: 1, completed: 1, percent: 100 },
);

saveWorkspaceTasks(
  [
    createdTask,
    {
      ...createdTask,
      id: 'task_second',
      column: 'todo',
      title: 'Second task',
      createdAt: 1_780_000_000_250,
      updatedAt: 1_780_000_000_250,
    },
  ],
  { storage, workspaceId: session.workspace.id },
);
deleteWorkspaceTasks([createdTask.id], { storage, workspaceId: session.workspace.id });
assert.deepEqual(
  loadWorkspaceTasks({ storage, workspaceId: session.workspace.id }).map((task) => task.id),
  ['task_second'],
);

const createdCustomer = createWorkspaceCustomer(
  {
    name: 'Spring Campaign Lead',
    company: 'Viral Retail Lab',
    role: 'Growth Owner',
    channel: 'viral_qr',
    lifecycleStage: 'new_lead',
    ownerId: session.user.id,
    tags: ['campaign', 'viral_qr'],
    source: {
      moduleId: 'marketing_viral',
      campaignId: 'campaign_spring',
      campaignName: 'Spring QR Campaign',
      sourceChannel: 'viral_qr',
      landingPage: 'https://landing.example/spring',
      touchpoint: 'qr_print',
      assetId: 'asset_qr',
    },
    notes: 'Captured from viral QR campaign.',
    lastInteractionAt: 1_780_000_000_300,
    metadata: { conversionIntent: 'coupon_claim' },
  },
  { storage, workspaceId: session.workspace.id, userId: session.user.id, now: 1_780_000_000_300 },
);
assert.equal(createdCustomer.workspaceId, session.workspace.id);
assert.equal(createdCustomer.source?.campaignId, 'campaign_spring');
assert.equal(createdCustomer.source?.sourceChannel, 'viral_qr');
assert.equal(createdCustomer.lifecycleStage, 'new_lead');
assert.ok(
  storage.getItem(`${CUSTOMER_STORAGE_PREFIX}:${session.workspace.id}`)?.includes('campaign_spring'),
  'customerRepository should persist campaign source metadata with workspace customers',
);
const updatedCustomer = updateWorkspaceCustomer(
  createdCustomer.id,
  { lifecycleStage: 'qualified', tags: [...createdCustomer.tags, 'qualified'] },
  { storage, workspaceId: session.workspace.id, userId: session.user.id, now: 1_780_000_000_350 },
);
assert.equal(updatedCustomer?.lifecycleStage, 'qualified');
const handedOffLead = createOrUpdateWorkspaceCustomerLead(
  {
    name: 'Spring Campaign Lead',
    company: 'Viral Retail Lab',
    role: 'Growth Owner',
    channel: 'website',
    ownerId: session.user.id,
    source: {
      moduleId: 'marketing_website',
      campaignId: 'campaign_site',
      campaignName: 'Nexus Landing Page',
      sourceChannel: 'website',
      landingPage: 'https://landing.example/site',
      assetId: 'asset_site',
    },
    metadata: { formIntent: 'demo_request' },
  },
  { storage, workspaceId: session.workspace.id, userId: session.user.id, now: 1_780_000_000_400 },
);
assert.equal(handedOffLead.id, createdCustomer.id, 'campaign handoff should update matching customer leads instead of duplicating them');
assert.equal(handedOffLead.source?.campaignId, 'campaign_site');
assert.equal(
  loadWorkspaceCustomers({ storage, workspaceId: session.workspace.id }).length,
  1,
  'customerRepository should be workspace-scoped and dedupe campaign leads by name/company',
);
assert.deepEqual(
  loadWorkspaceCustomers({ storage, workspaceId: 'workspace_other' }),
  [],
  'customerRepository should not leak customer records across workspaces',
);

const createdKeywordLibrary = createWorkspaceKeywordLibrary(
  {
    name: 'Beauty Product High Frequency Keywords',
    description: 'Reusable commercial phrases for anti-aging and skincare copy.',
    channel: 'xiaohongshu',
    ownerId: session.user.id,
    status: 'active',
    tags: ['beauty', 'compliance'],
    keywords: ['retinol', 'anti-aging', 'sensitive skin'],
    blockedTerms: ['guaranteed cure'],
    sourceText: 'Original product claims and approved tone notes.',
    metadata: { vertical: 'beauty' },
  },
  { storage, workspaceId: session.workspace.id, userId: session.user.id, now: 1_780_000_000_500 },
);
assert.equal(createdKeywordLibrary.workspaceId, session.workspace.id);
assert.equal(createdKeywordLibrary.ownerId, session.user.id);
assert.deepEqual(createdKeywordLibrary.keywords, ['retinol', 'anti-aging', 'sensitive skin']);
assert.ok(
  storage.getItem(`${KEYWORD_LIBRARY_STORAGE_PREFIX}:${session.workspace.id}`)?.includes('Beauty Product High Frequency Keywords'),
  'keywordRepository should persist keyword libraries by workspace',
);
const updatedKeywordLibrary = updateWorkspaceKeywordLibrary(
  createdKeywordLibrary.id,
  {
    description: 'Updated approved phrase set for skincare launches.',
    keywords: [...createdKeywordLibrary.keywords, 'night repair'],
    tags: [...createdKeywordLibrary.tags, 'launch'],
  },
  { storage, workspaceId: session.workspace.id, userId: session.user.id, now: 1_780_000_000_510 },
);
assert.equal(updatedKeywordLibrary?.description, 'Updated approved phrase set for skincare launches.');
assert.deepEqual(updatedKeywordLibrary?.keywords, ['retinol', 'anti-aging', 'sensitive skin', 'night repair']);
assert.deepEqual(
  searchWorkspaceKeywordLibraries('night repair', { storage, workspaceId: session.workspace.id }).map((library) => library.id),
  [createdKeywordLibrary.id],
  'keywordRepository should search saved names, tags, channels, source text, keywords, and blocked terms',
);
const archivedKeywordLibrary = archiveWorkspaceKeywordLibrary(
  createdKeywordLibrary.id,
  { storage, workspaceId: session.workspace.id, userId: session.user.id, now: 1_780_000_000_520 },
);
assert.equal(archivedKeywordLibrary?.status, 'archived');
assert.equal(loadWorkspaceKeywordLibraries({ storage, workspaceId: session.workspace.id }).length, 1);
assert.deepEqual(
  loadWorkspaceKeywordLibraries({ storage, workspaceId: 'workspace_other' }),
  [],
  'keywordRepository should not leak keyword libraries across workspaces',
);

const runtimeBackedTask = createWorkspaceTask(
  {
    title: 'Dispatch launch agent',
    column: 'auto_exec',
    priority: 'High',
    type: 'Runtime',
    date: 'Queued',
    isAuto: true,
    runtimeMode: 'web',
    runtimeProviderKind: 'mock',
    runtimeTaskId: 'runtime-task-1',
    runtimeStatus: 'queued',
    agentId: 'mock-global-agent',
    runtimeId: 'mock-web-runtime',
    externalRef: {
      system: 'multica',
      taskId: 'runtime-task-1',
      issueIdentifier: 'WEB-1',
    },
    lastRuntimeEventAt: '2026-06-10T00:00:00.000Z',
    metadata: { source: 'saas_foundation_test' },
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_300 },
);
assert.equal(runtimeBackedTask.runtimeMode, 'web');
assert.equal(runtimeBackedTask.runtimeProviderKind, 'mock');
assert.equal(runtimeBackedTask.runtimeTaskId, 'runtime-task-1');
assert.equal(runtimeBackedTask.runtimeStatus, 'queued');
const runtimeUpdatedTask = updateWorkspaceTask(
  runtimeBackedTask.id,
  {
    column: 'done',
    runtimeStatus: 'succeeded',
    lastRuntimeEventAt: '2026-06-10T00:00:01.000Z',
  },
  { storage, workspaceId: session.workspace.id, now: 1_780_000_000_400 },
);
assert.equal(runtimeUpdatedTask?.runtimeStatus, 'succeeded');
assert.equal(runtimeUpdatedTask?.lastRuntimeEventAt, '2026-06-10T00:00:01.000Z');

for (const filePath of [
  'src/components/ActivityHeatmap.tsx',
  'src/components/ActivityLogsView.tsx',
  'src/components/CommandPalette.tsx',
  'src/components/GlobalSearchOverlay.tsx',
  'src/components/DailyFocusGoal.tsx',
  'src/components/TaskCenter.tsx',
]) {
  const source = readFileSync(filePath, 'utf8');
  assert.equal(
    source.includes("localStorage.getItem('aistudio_activity_logs')"),
    false,
    `${filePath} should read audit logs through auditLogRepository`,
  );
  assert.equal(
    source.includes("localStorage.getItem('activity_logs')"),
    false,
    `${filePath} should not read legacy activity_logs storage`,
  );
  assert.equal(
    source.includes('firebase/database') || source.includes('../lib/firebaseConfig'),
    false,
    `${filePath} should access Firebase only through src/lib/data repositories`,
  );
  assert.equal(
    source.includes("localStorage.getItem('tasks')") || source.includes('localStorage.setItem(\'tasks\''),
    false,
    `${filePath} should use taskRepository instead of the legacy tasks storage key`,
  );
}

const taskCenterSource = readFileSync('src/components/TaskCenter.tsx', 'utf8');
assert.ok(
  taskCenterSource.includes('../lib/data/taskRepository'),
  'TaskCenter should share workspace tasks through taskRepository',
);
assert.equal(
  taskCenterSource.includes('initialKanbanTasks'),
  false,
  'TaskCenter should not maintain a separate mock kanban task list',
);
assert.ok(
  taskCenterSource.includes('tasks_updated') &&
    taskCenterSource.includes('loadWorkspaceTasks'),
  'TaskCenter should refresh from taskRepository update events',
);
assert.equal(
  taskCenterSource.includes('initialScheduledTasks'),
  false,
  'TaskCenter list mode should not keep static scheduled task fixtures',
);
assert.ok(
  taskCenterSource.includes('logAuditEvent') &&
    taskCenterSource.includes('task_status_change') &&
    taskCenterSource.includes('task_delete'),
  'TaskCenter should audit repository-backed task status changes and deletions',
);
assert.ok(
  taskCenterSource.includes('runtimeTaskId') &&
    taskCenterSource.includes('runtimeProviderKind') &&
    taskCenterSource.includes('lastRuntimeEventAt'),
  'TaskCenter should surface runtime metadata for runtime-backed tasks',
);
assert.equal(
  taskCenterSource.includes('SYNC_CRM_TASKS'),
  false,
  'TaskCenter should not listen for legacy CRM sync events',
);

const tasksViewSource = readFileSync('src/components/TasksView.tsx', 'utf8');
assert.ok(
  tasksViewSource.includes('../lib/data/taskRepository') &&
    tasksViewSource.includes('tasks_updated') &&
    tasksViewSource.includes('loadWorkspaceTasks'),
  'TasksView should share repository-backed task state with TaskCenter',
);
assert.equal(
  tasksViewSource.includes('initialTaskTemplates') || tasksViewSource.includes('buildInitialTasks'),
  false,
  'TasksView should not seed static task templates into empty workspaces',
);
assert.ok(
  tasksViewSource.includes('logAuditEvent') &&
    tasksViewSource.includes('task_create') &&
    tasksViewSource.includes('task_status_change') &&
    tasksViewSource.includes('task_delete'),
  'TasksView should audit task creation, status changes, and deletion',
);
assert.ok(
  tasksViewSource.includes('runtimeTaskId') &&
    tasksViewSource.includes('runtimeProviderKind') &&
    tasksViewSource.includes('runtimeStatus'),
  'TasksView should show runtime metadata on runtime-backed tasks',
);

const dailyFocusSource = readFileSync('src/components/DailyFocusGoal.tsx', 'utf8');
assert.ok(
  dailyFocusSource.includes('../lib/data/settingsRepository'),
  'DailyFocusGoal should use settingsRepository for workspace-scoped settings',
);
assert.equal(
  dailyFocusSource.includes("localStorage.getItem('daily_focus_goal')") ||
    dailyFocusSource.includes("localStorage.setItem('daily_focus_goal'"),
  false,
  'DailyFocusGoal should not read or write the legacy daily_focus_goal storage key directly',
);

for (const filePath of [
  'src/App.tsx',
  'src/components/FrequentWorkflowsWidget.tsx',
  'src/hooks/usePreloadPinnedModules.ts',
  'src/components/SessionArchiver.tsx',
]) {
  const source = readFileSync(filePath, 'utf8');
  assert.equal(
    source.includes("localStorage.getItem('pinned_modules')") ||
      source.includes("localStorage.setItem('pinned_modules'"),
    false,
    `${filePath} should store pinned_modules through settingsRepository`,
  );
}

const preloadPinnedModulesSource = readFileSync('src/hooks/usePreloadPinnedModules.ts', 'utf8');
assert.ok(
  preloadPinnedModulesSource.includes('../product/registry') &&
    preloadPinnedModulesSource.includes('getProductFeature') &&
    preloadPinnedModulesSource.includes('dataDependencies') &&
    preloadPinnedModulesSource.includes('module_preload_requested'),
  'usePreloadPinnedModules should derive preload work from product registry metadata',
);
assert.equal(
  preloadPinnedModulesSource.includes('setTimeout(') ||
    preloadPinnedModulesSource.includes('Simulate') ||
    preloadPinnedModulesSource.includes('Math.random'),
  false,
  'usePreloadPinnedModules should not simulate preloading with timers',
);

const agentLatencyMonitorSource = readFileSync('src/hooks/useAgentLatencyMonitor.ts', 'utf8');
assert.ok(
  agentLatencyMonitorSource.includes('../runtime/useAgentRuntimeStatus') &&
    agentLatencyMonitorSource.includes('useAgentRuntimeStatus') &&
    agentLatencyMonitorSource.includes('activity_logged'),
  'useAgentLatencyMonitor should report real runtime health changes',
);
assert.equal(
  agentLatencyMonitorSource.includes('setInterval(') ||
    agentLatencyMonitorSource.includes('Math.random') ||
    agentLatencyMonitorSource.includes('Simulation') ||
    agentLatencyMonitorSource.includes('Simulate'),
  false,
  'useAgentLatencyMonitor should not simulate latency spikes with intervals',
);

for (const filePath of [
  'src/App.tsx',
  'src/components/SessionArchiver.tsx',
]) {
  const source = readFileSync(filePath, 'utf8');
  assert.equal(
    source.includes("localStorage.getItem('workspace_autosave')") ||
      source.includes("localStorage.setItem('workspace_autosave'"),
    false,
    `${filePath} should store workspace_autosave through settingsRepository`,
  );
}

for (const filePath of [
  'src/components/LayoutPresets.tsx',
  'src/components/SessionArchiver.tsx',
]) {
  const source = readFileSync(filePath, 'utf8');
  assert.equal(
    source.includes("localStorage.getItem('layout_presets')") ||
      source.includes("localStorage.setItem('layout_presets'") ||
      source.includes("localStorage.getItem('workspace_presets')") ||
      source.includes("localStorage.setItem('workspace_presets'"),
    false,
    `${filePath} should store layout/workspace presets through settingsRepository`,
  );
  assert.ok(
    source.includes('../lib/data/settingsRepository'),
    `${filePath} should load presets through settingsRepository`,
  );
}

for (const filePath of [
  'src/hooks/useAutoSave.ts',
  'src/components/OfflineQueueModal.tsx',
]) {
  const source = readFileSync(filePath, 'utf8');
  assert.equal(
    source.includes("localStorage.getItem('offline_queue')") ||
      source.includes("localStorage.setItem('offline_queue'"),
    false,
    `${filePath} should use offlineQueueRepository instead of offline_queue`,
  );
  assert.ok(
    source.includes('offlineQueueRepository'),
    `${filePath} should load offline actions through offlineQueueRepository`,
  );
}

{
  const source = readFileSync('src/components/CommandPalette.tsx', 'utf8');
  assert.equal(
    source.includes("localStorage.getItem('user_macros')") ||
      source.includes("localStorage.setItem('user_macros'"),
    false,
    'CommandPalette should store user macros through settingsRepository',
  );
  assert.ok(
    source.includes('../lib/data/settingsRepository'),
    'CommandPalette should load user macros through settingsRepository',
  );
}

{
  const source = readFileSync('src/components/QuickNotesPanel.tsx', 'utf8');
  assert.equal(
    source.includes("localStorage.getItem('quick_notes')") ||
      source.includes("localStorage.setItem('quick_notes'"),
    false,
    'QuickNotesPanel should store notes through settingsRepository',
  );
  assert.ok(
    source.includes('../lib/data/settingsRepository'),
    'QuickNotesPanel should load notes through settingsRepository',
  );
}

{
  const source = readFileSync('src/components/AICanvasView.tsx', 'utf8');
  assert.equal(
    source.includes("localStorage.getItem('aistudio_autosave')") ||
      source.includes("localStorage.setItem('aistudio_autosave'"),
    false,
    'AICanvasView should store canvas autosave through settingsRepository',
  );
  assert.ok(
    source.includes('../lib/data/settingsRepository'),
    'AICanvasView should load canvas autosave through settingsRepository',
  );
  assert.ok(
    source.includes('../lib/data/auditLogRepository') &&
      source.includes('./Toast') &&
      source.includes('canvas_state_save') &&
      source.includes('canvas_workflow_run') &&
      source.includes('canvas_snapshot_create') &&
      source.includes('AISTUDIO_CANVAS_SNAPSHOTS_SETTING_KEY'),
    'AICanvasView should persist manual saves, snapshots, and workflow runs through SaaS repositories',
  );
  assert.equal(
    source.includes('alert('),
    false,
    'AICanvasView should not use alert-only save, snapshot, template, or share actions',
  );
  assert.equal(
    source.includes('setTimeout(') ||
      source.includes('setInterval(') ||
      source.includes('Mock incoming remote drawing') ||
      source.includes('mockPoints'),
    false,
    'AICanvasView should not use timer-based or mock collaboration/workflow placeholders',
  );
}

for (const filePath of [
  'src/App.tsx',
  'src/components/AutoResumeModal.tsx',
]) {
  const source = readFileSync(filePath, 'utf8');
  assert.equal(
    source.includes("localStorage.getItem('session_last_state')") ||
      source.includes("localStorage.setItem('session_last_state'") ||
      source.includes("localStorage.getItem('clean_exit')") ||
      source.includes("localStorage.setItem('clean_exit'"),
    false,
    `${filePath} should store session recovery state through settingsRepository`,
  );
  assert.ok(
    source.includes('../lib/data/settingsRepository') || source.includes('./lib/data/settingsRepository'),
    `${filePath} should load session recovery state through settingsRepository`,
  );
}

{
  const source = readFileSync('src/components/OnboardingTour.tsx', 'utf8');
  assert.equal(
    source.includes("localStorage.getItem('has_seen_tour')") ||
      source.includes("localStorage.setItem('has_seen_tour'"),
    false,
    'OnboardingTour should store tour state through settingsRepository',
  );
  assert.ok(
    source.includes('../lib/data/settingsRepository'),
    'OnboardingTour should load tour state through settingsRepository',
  );
}

{
  const source = readFileSync('src/components/ThemeProvider.tsx', 'utf8');
  assert.equal(
    source.includes('localStorage.getItem(THEME_STORAGE_KEY)') ||
      source.includes('localStorage.setItem(THEME_STORAGE_KEY'),
    false,
    'ThemeProvider should store theme through settingsRepository',
  );
  assert.ok(
    source.includes('../lib/data/settingsRepository'),
    'ThemeProvider should load theme through settingsRepository',
  );
}

for (const filePath of [
  'src/App.tsx',
  'src/hooks/useModuleTimeTracker.ts',
  'src/components/Sidebar.tsx',
  'src/components/DailyInsightsWidget.tsx',
  'src/components/FrequentWorkflowsWidget.tsx',
  'src/components/PerformanceMonitor.tsx',
  'src/components/RecommendedModulesWidget.tsx',
  'src/components/TimeSpentChart.tsx',
  'src/components/UsageHeatmap.tsx',
  'src/components/WorkflowEfficiencyWidget.tsx',
]) {
  const source = readFileSync(filePath, 'utf8');
  assert.equal(
    source.includes("localStorage.getItem('module_time_tracker')") ||
      source.includes("localStorage.setItem('module_time_tracker'"),
    false,
    `${filePath} should use usageRepository instead of module_time_tracker`,
  );
}

const dispatcherSource = readFileSync('src/components/GlobalAgentDispatcherModal.tsx', 'utf8');
assert.ok(
  dispatcherSource.includes('../lib/data/generationJobRepository'),
  'GlobalAgentDispatcherModal should persist dispatched agent work as generation jobs',
);
assert.ok(
  dispatcherSource.includes('createGenerationJob'),
  'GlobalAgentDispatcherModal should create generation job records after dispatch',
);
assert.ok(
  dispatcherSource.includes('canStartBillableGeneration'),
  'GlobalAgentDispatcherModal should guard dispatches with billing quota checks',
);
assert.ok(
  dispatcherSource.includes('estimateRequestedGenerationCredits'),
  'GlobalAgentDispatcherModal should reserve credits using billingRepository estimates before dispatch',
);
assert.ok(
  dispatcherSource.includes("moduleId: 'tasks'") &&
    dispatcherSource.includes("pricingAction: 'runtime_dispatch'"),
  'GlobalAgentDispatcherModal should reserve quota with the commercial runtime dispatch pricing record',
);
assert.ok(
  dispatcherSource.includes('loadModuleUsage') && dispatcherSource.includes('listGenerationJobs'),
  'GlobalAgentDispatcherModal should evaluate quota from persisted generation jobs and module usage',
);
assert.ok(
  dispatcherSource.includes('loadWorkspaceBillingPlans'),
  'GlobalAgentDispatcherModal should evaluate quotas from persisted workspace billing plans',
);
assert.ok(
  dispatcherSource.includes('updateGenerationJob') && dispatcherSource.includes('subscribeToTask'),
  'GlobalAgentDispatcherModal should keep generation jobs synchronized with runtime task events',
);
assert.ok(
  dispatcherSource.includes('generation_job_complete') && dispatcherSource.includes('generation_job_failed'),
  'GlobalAgentDispatcherModal should audit generation completion and failure events',
);
assert.ok(
  dispatcherSource.includes('canDispatchAgent'),
  'GlobalAgentDispatcherModal should gate dispatch actions by workspace role',
);
assert.ok(
  dispatcherSource.includes('../lib/data/financialRepository') &&
    dispatcherSource.includes('sumWorkspaceRechargeCredits') &&
    dispatcherSource.includes('sumWorkspacePromotionalCredits') &&
    dispatcherSource.includes('rechargeCredits'),
  'GlobalAgentDispatcherModal should include persisted recharge and promotional credits in quota checks',
);
assert.ok(
  dispatcherSource.includes('createWorkspaceUsageEvent') &&
    dispatcherSource.includes('runtime_dispatch') &&
    dispatcherSource.includes('quota_block'),
  'GlobalAgentDispatcherModal should write usage events for runtime dispatch attempts and quota blocks',
);

{
  const source = readFileSync('src/components/BillingView.tsx', 'utf8');
  assert.ok(
    source.includes('../lib/data/generationJobRepository'),
    'BillingView should read generation jobs for recent usage',
  );
  assert.ok(
    source.includes('../hooks/useWorkspaceUsage'),
    'BillingView should read workspace usage for billing totals',
  );
  assert.ok(
    source.includes('listWorkspaceUsageEvents') &&
      source.includes('usage_events_updated') &&
      source.includes('usageEvents'),
    'BillingView should read persisted usage events for quota-sensitive P0 actions',
  );
  assert.ok(
    source.includes('readUsageMetadataText') &&
      source.includes('pricingKey') &&
      source.includes('unitCredits') &&
      source.includes('unitCount') &&
      source.includes('creditEstimate') &&
      source.includes('billingStatus') &&
      source.includes('pricingDescription'),
    'BillingView usage history should explain commercial usage events from pricing metadata',
  );
  assert.ok(
    source.includes('../lib/data/billingRepository'),
    'BillingView should calculate billing usage through billingRepository',
  );
  assert.ok(
    source.includes('loadWorkspaceBillingPlans') && source.includes('billing_plans_updated'),
    'BillingView should calculate allowances from persisted workspace billing plans',
  );
  assert.ok(
    source.includes('canManageBilling'),
    'BillingView should gate billing management actions by workspace role',
  );
  assert.ok(
    source.includes('../lib/data/financialRepository') &&
      source.includes('loadWorkspaceFinancialRecords') &&
      source.includes('buildWorkspaceInvoices') &&
      source.includes('createWorkspaceFinancialRecord') &&
      source.includes('sumWorkspaceRechargeCredits') &&
      source.includes('sumWorkspacePromotionalCredits') &&
      source.includes('hasWorkspaceCouponRedemption'),
    'BillingView should derive invoices and recharge/coupon balance from persisted financial records',
  );
  assert.ok(
    source.includes('billing_recharge_create'),
    'BillingView should audit recharge payments after creating financial records',
  );
  assert.ok(
    source.includes('handleRedeemCoupon') &&
      source.includes('billing_coupon_redeem') &&
      source.includes('compute_points_coupon_redemption'),
    'BillingView should persist and audit coupon redemptions instead of rendering a UI-only coupon button',
  );
  assert.ok(
    source.includes('updateWorkspacePlan') &&
      source.includes('billing_subscription_change') &&
      source.includes("kind: 'subscription'"),
    'BillingView plan changes should update the workspace plan, create subscription records, and audit the change',
  );
  assert.ok(
    source.includes('../lib/data/paymentRepository') &&
      source.includes('getDefaultWorkspacePaymentMethod') &&
      source.includes('updateWorkspacePaymentMethod'),
    'BillingView should manage payment methods through paymentRepository',
  );
  assert.equal(
    source.includes('INV-2026-05A') ||
      source.includes('INV-2026-04A') ||
      source.includes('末尾 4242'),
    false,
    'BillingView should not render static invoice ids or payment card suffixes',
  );
}

{
  const source = readFileSync('src/components/ApiKeysView.tsx', 'utf8');
  assert.ok(
    source.includes('../lib/data/apiKeyRepository') &&
      source.includes('loadWorkspaceApiKeys') &&
      source.includes('createWorkspaceApiKey') &&
      source.includes('rotateWorkspaceApiKey') &&
      source.includes('revokeWorkspaceApiKey') &&
      source.includes('exportWorkspaceApiKeyRows'),
    'ApiKeysView should manage API keys through apiKeyRepository',
  );
  assert.ok(
    source.includes('../lib/data/webhookRepository') &&
      source.includes('loadWorkspaceWebhookEndpoints') &&
      source.includes('createWorkspaceWebhookEndpoint') &&
      source.includes('updateWorkspaceWebhookEndpoint') &&
      source.includes('deleteWorkspaceWebhookEndpoint') &&
      source.includes('exportWorkspaceWebhookEndpointRows'),
    'ApiKeysView should manage Webhooks through webhookRepository',
  );
  assert.ok(
    source.includes('../lib/data/auditLogRepository') &&
      source.includes('api_key_create') &&
      source.includes('api_key_rotate') &&
      source.includes('api_key_revoke') &&
      source.includes('api_key_export'),
    'ApiKeysView should audit API key create, rotate, revoke, and export actions',
  );
  assert.ok(
    source.includes('webhook_create') &&
      source.includes('webhook_update') &&
      source.includes('webhook_delete') &&
      source.includes('webhook_secret_rotate') &&
      source.includes('webhook_export'),
    'ApiKeysView should audit Webhook create, update, delete, secret rotation, and export actions',
  );
  assert.ok(
    source.includes('canManageApiKeys'),
    'ApiKeysView should gate API key management by workspace role',
  );
  assert.equal(
    source.includes('sk-prod-') ||
      source.includes('Testing Env') ||
      source.includes('Jenkins CI/CD') ||
      source.includes('alert('),
    false,
    'ApiKeysView should not render static API key rows or alert-only actions',
  );
}

{
  const source = readFileSync('src/components/AssetsView.tsx', 'utf8');
  assert.ok(
    source.includes('../lib/data/auditLogRepository'),
    'AssetsView should log asset operations through auditLogRepository',
  );
  assert.ok(
    source.includes('asset_create') && source.includes('asset_delete') && source.includes('asset_export'),
    'AssetsView should audit create, delete, and export operations',
  );
  assert.ok(
    source.includes('createWorkspaceUsageEvent') &&
      source.includes('canStartBillableGeneration') &&
      source.includes('asset_export') &&
      source.includes('quota_block'),
    'AssetsView should preflight quota and record usage events for asset exports',
  );
  assert.ok(
    source.includes('hasWorkspacePermission') &&
      source.includes("'assets.manage'") &&
      source.includes('canManageAssets') &&
      source.includes('requireAssetManagement'),
    'AssetsView should permission-gate asset create, delete, export, download, and cleanup actions',
  );
  assert.ok(
    source.includes('asset_manifest.json') &&
      source.includes('downloadUrl') &&
      source.includes('metadata.json'),
    'AssetsView bulk download should package a real asset manifest and per-asset metadata',
  );
  assert.equal(
    source.includes('Mock file content'),
    false,
    'AssetsView bulk download should not write mock file content into exported ZIPs',
  );
  assert.equal(
    source.includes('seedAssets') || source.includes("source: 'mock'"),
    false,
    'AssetsView should not seed mock assets into empty commercial workspaces',
  );
  assert.ok(
    source.includes('draggable') && source.includes('dataTransfer.setData'),
    'AssetsView should expose persisted assets as draggable records for project linking',
  );
}

{
  const source = readFileSync('src/components/DataAnalyticsView.tsx', 'utf8');
  assert.ok(
    source.includes('../lib/data/auditLogRepository') &&
      source.includes('../saas/SaasAuthContext') &&
      source.includes('./Toast'),
    'DataAnalyticsView should export reports through the SaaS session, audit repository, and toast feedback',
  );
  assert.ok(
    source.includes('data_snapshot_export') &&
      source.includes('logAuditEvent') &&
      source.includes("moduleId: 'data'"),
    'DataAnalyticsView report exports should write data_snapshot_export audit events for the data module',
  );
  assert.ok(
    source.includes('new Blob') &&
      source.includes('saveAs') &&
      source.includes('jsPDF'),
    'DataAnalyticsView should create downloadable report files instead of submitting a UI-only task',
  );
  assert.equal(
    source.includes('alert('),
    false,
    'DataAnalyticsView should not use alert-only export actions',
  );
}

{
  const source = readFileSync('src/components/Dashboard.tsx', 'utf8');
  assert.ok(
    source.includes('../lib/data/auditLogRepository') &&
      source.includes('../lib/data/taskRepository') &&
      source.includes('../hooks/useWorkspaceAssets') &&
      source.includes('../hooks/useWorkspaceUsage') &&
      source.includes('../runtime/useAgentRuntimeStatus') &&
      source.includes('../saas/SaasAuthContext') &&
      source.includes('./Toast'),
    'Dashboard should use SaaS session, tasks, assets, usage, audit, runtime status, and toast feedback',
  );
  assert.ok(
    source.includes('loadWorkspaceTasks') &&
      source.includes('calculateTaskCompletion') &&
      source.includes('createWorkspaceTask') &&
      source.includes('listAuditLogs') &&
      source.includes('buildWeeklyActivityData'),
    'Dashboard KPIs should derive from repository-backed tasks, audit logs, assets, and usage data',
  );
  assert.ok(
    source.includes('ai_command') &&
      source.includes('logAuditEvent') &&
      source.includes("moduleId: 'dashboard'") &&
      source.includes("new CustomEvent('dashboard_ai_command'"),
    'Dashboard command execution should audit ai_command events and emit a dashboard_ai_command event',
  );
  assert.equal(
    source.includes('alert('),
    false,
    'Dashboard command execution should not use alert-only actions',
  );
  assert.ok(
    source.includes('onNavigate?.(') &&
      source.includes("'workflow'") &&
      source.includes("'tasks'") &&
      source.includes("'assets'") &&
      source.includes("'billing'") &&
      source.includes("'activity_logs'"),
    'Dashboard quick actions should navigate to real P0 modules or create repository-backed tasks',
  );
  assert.equal(
    source.includes("value: '1,345'") ||
      source.includes("value: '432'") ||
      source.includes("value: '286 h'") ||
      source.includes("value: '8.4M'") ||
      source.includes('昨晚 AI 并行处理了') ||
      source.includes('完成 12 支批量混剪下发') ||
      source.includes('渲染服务器出现排队拥堵'),
    false,
    'Dashboard should not render static KPI, banner, event, or runtime-alert demo data',
  );
}

{
  const source = readFileSync('src/components/AICopilot.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/generationJobRepository') &&
      source.includes('../lib/data/assetRepository') &&
      source.includes('../lib/data/auditLogRepository'),
    'AICopilot should persist assistant work through SaaS repositories',
  );
  assert.ok(
    source.includes('createGenerationJob') &&
      source.includes('updateGenerationJob') &&
      source.includes('createWorkspaceAsset') &&
      source.includes('logAuditEvent') &&
      source.includes('ai_command') &&
      source.includes('generation_job_start') &&
      source.includes('generation_job_complete') &&
      source.includes('asset_create') &&
      source.includes("moduleId: 'dashboard'") &&
      source.includes("type: 'text'"),
    'AICopilot assistant replies should create jobs, update job status, create text assets, and audit lifecycle events',
  );
  assert.equal(
    source.includes('./ActivityLogsView') || source.includes('useActivityLogger'),
    false,
    'AICopilot should write directly to SaaS audit repositories instead of legacy activity logger hooks',
  );
  const sendHandler = source.slice(source.indexOf('const sendMsg'), source.indexOf('return (', source.indexOf('const sendMsg')));
  assert.equal(
    sendHandler.includes('setTimeout(') || sendHandler.includes('Simulate AI thinking'),
    false,
    'AICopilot send flow should not use a timer-based assistant reply placeholder',
  );
}

{
  const source = readFileSync('src/components/QuickPromptFAB.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/generationJobRepository') &&
      source.includes('../lib/data/assetRepository') &&
      source.includes('../lib/data/auditLogRepository'),
    'QuickPromptFAB should persist quick prompt work through SaaS repositories',
  );
  assert.ok(
    source.includes('createGenerationJob') &&
      source.includes('updateGenerationJob') &&
      source.includes('createWorkspaceAsset') &&
      source.includes('logAuditEvent') &&
      source.includes('ai_command') &&
      source.includes('generation_job_start') &&
      source.includes('generation_job_complete') &&
      source.includes('asset_create') &&
      source.includes("moduleId: 'dashboard'") &&
      source.includes("type: 'text'"),
    'QuickPromptFAB quick replies should create jobs, update job status, create text assets, and audit lifecycle events',
  );
  const submitHandler = source.slice(source.indexOf('const handleSubmit'), source.indexOf('return (', source.indexOf('const handleSubmit')));
  assert.equal(
    submitHandler.includes('setTimeout(') || submitHandler.includes('Simulate Gemini API call'),
    false,
    'QuickPromptFAB submit flow should not use a timer-based Gemini placeholder',
  );
}

{
  const source = readFileSync('src/components/FeatureView.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/generationJobRepository') &&
      source.includes('../lib/data/assetRepository') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('../lib/data/usageRepository'),
    'FeatureView should persist generated work and usage through SaaS repositories',
  );
  assert.ok(
    source.includes('createGenerationJob') &&
      source.includes('updateGenerationJob') &&
      source.includes('createWorkspaceAsset') &&
      source.includes('createWorkspaceUsageEvent') &&
      source.includes('logAuditEvent') &&
      source.includes('resolveFeatureModuleId') &&
      source.includes('resolveFeatureAssetType') &&
      source.includes('generation_job_start') &&
      source.includes('generation_job_complete') &&
      source.includes('asset_create'),
    'FeatureView generation should create jobs, update job status, create assets, record usage, and audit lifecycle events',
  );
  const generateHandler = source.slice(source.indexOf('const handleGenerate'), source.indexOf('const handleKeyDown'));
  assert.ok(
    generateHandler.includes('createGenerationJob') &&
      generateHandler.includes('updateGenerationJob') &&
      generateHandler.includes('createWorkspaceAsset') &&
      generateHandler.includes('createWorkspaceUsageEvent') &&
      generateHandler.includes("kind: 'generation'") &&
      generateHandler.includes('generation_job_start') &&
      generateHandler.includes('generation_job_complete') &&
      generateHandler.includes('asset_create'),
    'FeatureView generate flow should create jobs, persist generated assets, record usage, and audit lifecycle events',
  );
  assert.equal(
    generateHandler.includes('setInterval(') ||
      generateHandler.includes('Mock progress') ||
      generateHandler.includes('模拟的'),
    false,
    'FeatureView generate flow should not use timer-based progress or mock assistant reply placeholders',
  );
}

{
  const source = readFileSync('src/components/ProjectsView.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/projectRepository') &&
      source.includes('../hooks/useWorkspaceAssets') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('./Toast'),
    'ProjectsView should persist projects and project asset links through SaaS repositories and toast feedback',
  );
  assert.ok(
    source.includes('loadWorkspaceProjects') &&
      source.includes('createWorkspaceProject') &&
      source.includes('updateWorkspaceProject') &&
      source.includes('linkedAssetIds') &&
      source.includes('project_asset_link') &&
      source.includes("moduleId: 'projects'"),
    'ProjectsView asset drops should update workspace project records and audit project_asset_link events',
  );
  assert.equal(
    source.includes('initialProjects'),
    false,
    'ProjectsView should not render a static project fixture list',
  );
  assert.equal(
    source.includes('alert('),
    false,
    'ProjectsView should not use alert-only project asset linking',
  );
}

{
  const source = readFileSync('src/components/RemixView.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/generationJobRepository') &&
      source.includes('../lib/data/assetRepository') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('../lib/data/usageRepository'),
    'RemixView should persist smart remix generation and usage through SaaS repositories',
  );
  assert.ok(
    source.includes('createGenerationJob') &&
      source.includes('updateGenerationJob') &&
      source.includes('createWorkspaceAsset') &&
      source.includes('createPricedWorkspaceUsageEvent') &&
      source.includes('logAuditEvent') &&
      source.includes("moduleId: 'remix_smart'") &&
      source.includes('generation_job_start') &&
      source.includes('generation_job_complete') &&
      source.includes('asset_create'),
    'RemixView smart remix should create jobs, update job status, create video assets, record usage, and audit lifecycle events',
  );
  const previewHandler = source.slice(
    source.indexOf('const handlePreviewRemix'),
    source.indexOf('return (', source.indexOf('function RemixSmart')),
  );
  assert.ok(
    previewHandler.includes('createGenerationJob') &&
      previewHandler.includes('updateGenerationJob') &&
      previewHandler.includes('createWorkspaceAsset') &&
      previewHandler.includes('createPricedWorkspaceUsageEvent') &&
      previewHandler.includes("kind: 'generation'") &&
      previewHandler.includes('generation_job_start') &&
      previewHandler.includes('generation_job_complete') &&
      previewHandler.includes('asset_create'),
    'RemixView preview flow should create smart-remix jobs, persist video assets, record usage, and audit lifecycle events',
  );
  const materialsHandler = source.slice(
    source.indexOf('const handleUploadMaterial'),
    source.indexOf('return (', source.indexOf('function RemixMaterials')),
  );
  assert.ok(
    source.includes('../lib/data/taskRepository') &&
      materialsHandler.includes('createWorkspaceAsset') &&
      materialsHandler.includes('createPricedWorkspaceUsageEvent') &&
      materialsHandler.includes("kind: 'automation'") &&
      materialsHandler.includes("moduleId: 'remix_materials'") &&
      materialsHandler.includes('asset_create'),
    'RemixView materials upload should persist material assets, record usage, and audit asset creation',
  );
  const titlesHandler = source.slice(
    source.indexOf('const handleSaveTitleTemplate'),
    source.indexOf('return (', source.indexOf('function RemixTitles')),
  );
  assert.ok(
    titlesHandler.includes('createWorkspaceAsset') &&
      titlesHandler.includes('createPricedWorkspaceUsageEvent') &&
      titlesHandler.includes("kind: 'automation'") &&
      titlesHandler.includes("moduleId: 'remix_titles'") &&
      titlesHandler.includes('asset_create'),
    'RemixView title templates should persist reusable template assets, record usage, and audit saves',
  );
  const templatesHandler = source.slice(
    source.indexOf('const handleSaveVideoTemplate'),
    source.indexOf('return (', source.indexOf('function RemixTemplates')),
  );
  assert.ok(
    templatesHandler.includes('createWorkspaceAsset') &&
      templatesHandler.includes('createPricedWorkspaceUsageEvent') &&
      templatesHandler.includes("kind: 'automation'") &&
      templatesHandler.includes("moduleId: 'remix_templates'") &&
      templatesHandler.includes('asset_create'),
    'RemixView video templates should persist reusable project assets, record usage, and audit saves',
  );
  const viralHandler = source.slice(
    source.indexOf('const handleAnalyzeViralClone'),
    source.indexOf('return (', source.indexOf('function RemixViral')),
  );
  assert.ok(
    viralHandler.includes('createGenerationJob') &&
      viralHandler.includes('updateGenerationJob') &&
      viralHandler.includes('createWorkspaceAsset') &&
      viralHandler.includes('createPricedWorkspaceUsageEvent') &&
      viralHandler.includes('createWorkspaceTask') &&
      viralHandler.includes("kind: 'generation'") &&
      viralHandler.includes("moduleId: 'remix_viral'") &&
      viralHandler.includes('generation_job_start') &&
      viralHandler.includes('generation_job_complete') &&
      viralHandler.includes('asset_create') &&
      viralHandler.includes('task_create'),
    'RemixView viral clone should persist analysis jobs, structure assets, usage, follow-up tasks, and audit lifecycle events',
  );
}

{
  const source = readFileSync('src/components/MarketingView.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
    source.includes('../lib/data/campaignRepository') &&
      source.includes('../lib/data/customerRepository') &&
      source.includes('../lib/data/taskRepository') &&
      source.includes('../lib/data/generationJobRepository') &&
      source.includes('../lib/data/assetRepository') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('../lib/data/usageRepository'),
    'MarketingView should persist campaign work and usage through SaaS repositories',
  );
  assert.ok(
    source.includes('createWorkspaceCampaign') &&
      source.includes('updateWorkspaceCampaign') &&
      source.includes('createOrUpdateWorkspaceCustomerLead') &&
      source.includes('createWorkspaceTask') &&
      source.includes('createGenerationJob') &&
      source.includes('updateGenerationJob') &&
      source.includes('createWorkspaceAsset') &&
      source.includes('createPricedWorkspaceUsageEvent') &&
      source.includes('logAuditEvent') &&
      source.includes('generation_job_start') &&
      source.includes('generation_job_complete') &&
      source.includes('asset_create'),
    'MarketingView should create campaign records, jobs, assets, usage, and audit lifecycle events',
  );
  const leadHandoffHelper = source.slice(
    source.indexOf('function createMarketingLeadHandoff'),
    source.indexOf('export function MarketingView'),
  );
  assert.ok(
    leadHandoffHelper.includes('createOrUpdateWorkspaceCustomerLead') &&
      leadHandoffHelper.includes('createWorkspaceTask') &&
      leadHandoffHelper.includes('marketing_lead_create') &&
      leadHandoffHelper.includes('marketing_followup_task_create') &&
      leadHandoffHelper.includes('campaignName') &&
      leadHandoffHelper.includes('sourceChannel') &&
      leadHandoffHelper.includes('landingPage'),
    'MarketingView lead handoff helper should create CRM leads, follow-up tasks, source metadata, and audit events',
  );
  const viralHandler = source.slice(
    source.indexOf('const handlePublishCampaign'),
    source.indexOf('if (activeView ===', source.indexOf('function MarketingViral')),
  );
  assert.ok(
    viralHandler.includes('createWorkspaceCampaign') &&
    viralHandler.includes('updateWorkspaceCampaign') &&
      viralHandler.includes('createMarketingLeadHandoff') &&
      viralHandler.includes('createGenerationJob') &&
      viralHandler.includes('updateGenerationJob') &&
      viralHandler.includes('createWorkspaceAsset') &&
      viralHandler.includes('createPricedWorkspaceUsageEvent') &&
      viralHandler.includes("kind: 'generation'") &&
      viralHandler.includes("moduleId: 'marketing_viral'") &&
      viralHandler.includes('generation_job_start') &&
      viralHandler.includes('generation_job_complete') &&
      viralHandler.includes('asset_create'),
    'MarketingView viral publish flow should create campaign records, CRM leads, follow-up tasks, jobs, print assets, usage, and audit events',
  );
  const nfcHandler = source.slice(
    source.indexOf('const handleSaveNfcCampaign'),
    source.indexOf('return (', source.indexOf('function MarketingNFC')),
  );
  assert.ok(
    nfcHandler.includes('createWorkspaceCampaign') &&
      nfcHandler.includes('createMarketingLeadHandoff') &&
      nfcHandler.includes('createWorkspaceAsset') &&
      nfcHandler.includes('createPricedWorkspaceUsageEvent') &&
      nfcHandler.includes("kind: 'automation'") &&
      nfcHandler.includes("moduleId: 'marketing_nfc'") &&
      nfcHandler.includes('asset_create'),
    'MarketingView NFC flow should save campaign touchpoint records, CRM leads, follow-up tasks, assets, usage, and audit events',
  );
  const websiteHandler = source.slice(
    source.indexOf('const handleGenerateWebsite'),
    source.indexOf('return (', source.indexOf('function MarketingWebsite')),
  );
  assert.ok(
    websiteHandler.includes('createWorkspaceCampaign') &&
      websiteHandler.includes('createMarketingLeadHandoff') &&
      websiteHandler.includes('createGenerationJob') &&
      websiteHandler.includes('updateGenerationJob') &&
      websiteHandler.includes('createWorkspaceAsset') &&
      websiteHandler.includes('createPricedWorkspaceUsageEvent') &&
      websiteHandler.includes("kind: 'generation'") &&
      websiteHandler.includes("moduleId: 'marketing_website'") &&
      websiteHandler.includes('generation_job_start') &&
      websiteHandler.includes('generation_job_complete') &&
      websiteHandler.includes('asset_create'),
    'MarketingView website generation flow should persist campaign page jobs, CRM leads, follow-up tasks, assets, usage, and audit events',
  );
}

{
  const source = readFileSync('src/components/DirectorDeskView.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/assetRepository') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('../lib/data/usageRepository') &&
      source.includes('../lib/data/taskRepository') &&
      source.includes('./Toast') &&
      source.includes('createWorkspaceAsset') &&
      source.includes('createPricedWorkspaceUsageEvent') &&
      source.includes('createWorkspaceTask') &&
      source.includes('asset_create') &&
      source.includes('task_create') &&
      source.includes('director_shot_parameter_reset') &&
      source.includes('director_asset_version_update') &&
      source.includes('director_consistency_check') &&
      source.includes('director_storyboard_fix_apply') &&
      source.includes('director_script_split') &&
      source.includes("moduleId: 'director_desk'"),
    'DirectorDeskView should persist director assets, usage, and audit shot, storyboard, and script workflows',
  );
  const assetVersionHandler = source.slice(
    source.indexOf('const updateLibraryAssetVersion'),
    source.indexOf('const updateBoundAssetVersion'),
  );
  assert.ok(
    assetVersionHandler.includes('createWorkspaceAsset') &&
      assetVersionHandler.includes('createPricedWorkspaceUsageEvent') &&
      assetVersionHandler.includes("kind: 'automation'") &&
      assetVersionHandler.includes("moduleId: 'director_desk'") &&
      assetVersionHandler.includes('director_asset_version_update'),
    'DirectorDeskView asset version updates should save assets, record usage, and audit the update',
  );
  const consistencyHandler = source.slice(
    source.indexOf('const runConsistencyCheck'),
    source.indexOf('const applyFix'),
  );
  assert.ok(
    consistencyHandler.includes('createPricedWorkspaceUsageEvent') &&
      consistencyHandler.includes('createWorkspaceTask') &&
      consistencyHandler.includes("kind: 'automation'") &&
      consistencyHandler.includes("moduleId: 'director_desk'") &&
      consistencyHandler.includes('task_create') &&
      consistencyHandler.includes('director_consistency_check'),
    'DirectorDeskView consistency checks should record billable automation usage, create follow-up tasks, and audit results',
  );
  const storyboardFixHandler = source.slice(
    source.indexOf('const applyFix'),
    source.indexOf('return (', source.indexOf('function StoryboardView')),
  );
  assert.ok(
    storyboardFixHandler.includes('createWorkspaceAsset') &&
      storyboardFixHandler.includes('createPricedWorkspaceUsageEvent') &&
      storyboardFixHandler.includes('createWorkspaceTask') &&
      storyboardFixHandler.includes("kind: 'generation'") &&
      storyboardFixHandler.includes("moduleId: 'director_desk'") &&
      storyboardFixHandler.includes('task_create') &&
      storyboardFixHandler.includes('director_storyboard_fix_apply'),
    'DirectorDeskView storyboard fixes should create generated assets, record usage, create review tasks, and audit the fix',
  );
  const scriptSplitHandler = source.slice(
    source.indexOf('const handleAutoSplit'),
    source.indexOf('return (', source.indexOf('function ScriptView')),
  );
  assert.ok(
    scriptSplitHandler.includes('createWorkspaceAsset') &&
      scriptSplitHandler.includes('createPricedWorkspaceUsageEvent') &&
      scriptSplitHandler.includes('createWorkspaceTask') &&
      scriptSplitHandler.includes("kind: 'generation'") &&
      scriptSplitHandler.includes("moduleId: 'director_desk'") &&
      scriptSplitHandler.includes('task_create') &&
      scriptSplitHandler.includes('director_script_split'),
    'DirectorDeskView script split should create text assets, record usage, create production tasks, and audit segmentation',
  );
  assert.equal(
    source.includes('alert('),
    false,
    'DirectorDeskView should not use alert-only shot parameter actions',
  );
  assert.equal(
    source.includes('setTimeout(') || source.includes('Simulate'),
    false,
    'DirectorDeskView should not use timer-based or simulated director workflow placeholders',
  );
}

{
  const source = readFileSync('src/components/ECommerceView.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/generationJobRepository') &&
      source.includes('../lib/data/assetRepository') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('../lib/data/usageRepository'),
    'ECommerceView should persist generation work and usage through SaaS repositories',
  );
  assert.ok(
    source.includes('listGenerationJobs') &&
      source.includes('createGenerationJob') &&
      source.includes('updateGenerationJob') &&
      source.includes('createWorkspaceAsset') &&
      source.includes('createPricedWorkspaceUsageEvent') &&
      source.includes('generation_job_start') &&
      source.includes('generation_job_complete'),
    'ECommerceView generation should create jobs, update job status, create generated assets, record usage, and audit lifecycle events',
  );
  assert.equal(
    source.includes('mockHistory') ||
      source.includes('Mock Gemini') ||
      source.includes('Mock generated social copy'),
    false,
    'ECommerceView should not use mock history or mock Gemini generation placeholders',
  );
  const generateHandler = source.slice(source.indexOf('const handleGenerate'), source.indexOf('const handleGenerateSeo'));
  assert.ok(
    generateHandler.includes('createGenerationJob') &&
      generateHandler.includes('updateGenerationJob') &&
      generateHandler.includes('createWorkspaceAsset') &&
      generateHandler.includes('createPricedWorkspaceUsageEvent') &&
      generateHandler.includes("kind: 'generation'") &&
      generateHandler.includes('generation_job_start') &&
      generateHandler.includes('generation_job_complete') &&
      generateHandler.includes('asset_create'),
    'ECommerceView main generation should create jobs, persist generated assets, record usage, and audit lifecycle events',
  );
  assert.equal(
    generateHandler.includes('setInterval('),
    false,
    'ECommerceView main generation should not use interval-based progress placeholders',
  );
  const seoHandler = source.slice(source.indexOf('const handleGenerateSeo'), source.indexOf('const isImgMethod'));
  assert.ok(
    seoHandler.includes('createGenerationJob') &&
      seoHandler.includes('updateGenerationJob') &&
      seoHandler.includes('createWorkspaceAsset') &&
      seoHandler.includes('createPricedWorkspaceUsageEvent') &&
      seoHandler.includes("kind: 'generation'") &&
      seoHandler.includes('generation_job_start') &&
      seoHandler.includes('generation_job_complete') &&
      seoHandler.includes('seo_metadata') &&
      seoHandler.includes("type: 'text'"),
    'ECommerceView SEO generation should create a job, persist SEO metadata as a text asset, record usage, and audit lifecycle events',
  );
  assert.equal(
    seoHandler.includes('setTimeout('),
    false,
    'ECommerceView SEO generation should not use a timer-based placeholder',
  );
}

{
  const source = readFileSync('src/components/CopywritingView.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/generationJobRepository') &&
      source.includes('../lib/data/assetRepository') &&
      source.includes('../lib/data/keywordRepository') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('../lib/data/usageRepository'),
    'CopywritingView should persist generated copy and usage through SaaS repositories',
  );
  assert.ok(
    source.includes('createGenerationJob') &&
      source.includes('updateGenerationJob') &&
      source.includes('createWorkspaceAsset') &&
      source.includes('createPricedWorkspaceUsageEvent') &&
      source.includes("kind: 'generation'") &&
      source.includes('generation_job_start') &&
      source.includes('generation_job_complete') &&
      source.includes("moduleId: 'copywriting_create'"),
    'CopywritingView generation should create jobs, update job status, create text assets, record usage, and audit lifecycle events',
  );
  assert.ok(
    source.includes('loadWorkspaceKeywordLibraries') &&
      source.includes('createWorkspaceKeywordLibrary') &&
      source.includes('updateWorkspaceKeywordLibrary') &&
      source.includes('archiveWorkspaceKeywordLibrary') &&
      source.includes('searchWorkspaceKeywordLibraries') &&
      source.includes('workspace_keyword_libraries_updated') &&
      source.includes('copywriting_keyword_create') &&
      source.includes('copywriting_keyword_update') &&
      source.includes('copywriting_keyword_archive'),
    'Copywriting keyword library should persist workspace CRUD/search actions and audit keyword lifecycle events',
  );
  assert.equal(
    source.includes('// Simulate generation') ||
      source.includes('}, 1500);'),
    false,
    'CopywritingView should not use timer-based copy generation placeholders',
  );
}

{
  const source = readFileSync('src/components/ImageCreationView.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/generationJobRepository') &&
      source.includes('../lib/data/assetRepository') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('../lib/data/usageRepository'),
    'ImageCreationView should persist generated images and usage through SaaS repositories',
  );
  assert.ok(
    source.includes('createGenerationJob') &&
      source.includes('updateGenerationJob') &&
      source.includes('createWorkspaceAsset') &&
      source.includes('createPricedWorkspaceUsageEvent') &&
      source.includes("kind: 'generation'") &&
      source.includes('generation_job_start') &&
      source.includes('generation_job_complete') &&
      source.includes("moduleId: 'image'"),
    'ImageCreationView generation should create jobs, update job status, create image assets, record usage, and audit lifecycle events',
  );
  assert.equal(
    source.includes('setTimeout('),
    false,
    'ImageCreationView should not use timer-based image generation placeholders',
  );
}

{
  const source = readFileSync('src/components/ImageEditorView.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/generationJobRepository') &&
      source.includes('../lib/data/assetRepository') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('../lib/data/usageRepository'),
    'ImageEditorView should persist image editing work and usage through SaaS repositories',
  );
  assert.ok(
    source.includes('createGenerationJob') &&
      source.includes('updateGenerationJob') &&
      source.includes('createWorkspaceAsset') &&
      source.includes('createPricedWorkspaceUsageEvent') &&
      source.includes('logAuditEvent') &&
      source.includes('generation_job_start') &&
      source.includes('generation_job_complete') &&
      source.includes('asset_create') &&
      source.includes("moduleId: 'ai_image_edit'"),
    'ImageEditorView editing should create jobs, update job status, create image assets, record usage, and audit lifecycle events',
  );
  const uploadHandler = source.slice(source.indexOf('const handleUpload'), source.indexOf('const handleApplyTool'));
  assert.ok(
    uploadHandler.includes('createWorkspaceAsset') &&
      uploadHandler.includes('asset_create') &&
      uploadHandler.includes("moduleId: 'ai_image_edit'"),
    'ImageEditorView uploads should create workspace image assets and audit asset creation',
  );
  assert.equal(
    uploadHandler.includes('setTimeout('),
    false,
    'ImageEditorView upload should not use a timer-based placeholder',
  );
  const applyHandler = source.slice(
    source.indexOf('const handleApplyTool'),
    source.indexOf('return (', source.indexOf('const handleApplyTool')),
  );
  assert.ok(
    applyHandler.includes('createGenerationJob') &&
      applyHandler.includes('updateGenerationJob') &&
      applyHandler.includes('createWorkspaceAsset') &&
      applyHandler.includes('createPricedWorkspaceUsageEvent') &&
      applyHandler.includes("kind: 'generation'") &&
      applyHandler.includes('generation_job_start') &&
      applyHandler.includes('generation_job_complete') &&
      applyHandler.includes('asset_create') &&
      applyHandler.includes("moduleId: 'ai_image_edit'"),
    'ImageEditorView tool application should create jobs, persist edited image assets, record usage, and audit lifecycle events',
  );
  assert.equal(
    applyHandler.includes('setTimeout('),
    false,
    'ImageEditorView tool application should not use a timer-based placeholder',
  );
}

{
  const source = readFileSync('src/components/VideoCreationView.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/generationJobRepository') &&
      source.includes('../lib/data/assetRepository') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('../lib/data/usageRepository'),
    'VideoCreationView should persist generated videos and usage through SaaS repositories',
  );
  assert.ok(
    source.includes('createGenerationJob') &&
      source.includes('updateGenerationJob') &&
      source.includes('createWorkspaceAsset') &&
      source.includes('createPricedWorkspaceUsageEvent') &&
      source.includes("kind: 'generation'") &&
      source.includes('generation_job_start') &&
      source.includes('generation_job_complete') &&
      source.includes("moduleId: 'video'"),
    'VideoCreationView generation should create jobs, update job status, create video assets, record usage, and audit lifecycle events',
  );
  assert.equal(
    source.includes('setTimeout('),
    false,
    'VideoCreationView should not use timer-based video generation placeholders',
  );
}

{
  const source = readFileSync('src/components/SpeechView.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/generationJobRepository') &&
      source.includes('../lib/data/assetRepository') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('../lib/data/usageRepository'),
    'SpeechView should persist generated speech and usage through SaaS repositories',
  );
  assert.ok(
    source.includes('createGenerationJob') &&
      source.includes('updateGenerationJob') &&
      source.includes('createWorkspaceAsset') &&
      source.includes('createPricedWorkspaceUsageEvent') &&
      source.includes("kind: 'generation'") &&
      source.includes('generation_job_start') &&
      source.includes('generation_job_complete') &&
      source.includes("moduleId: 'speech'") &&
      source.includes("type: 'audio'"),
    'SpeechView generation should create jobs, update job status, create audio assets, record usage, and audit lifecycle events',
  );
  assert.equal(
    source.includes('setTimeout('),
    false,
    'SpeechView should not use timer-based speech synthesis placeholders',
  );
}

{
  const source = readFileSync('src/components/ChatView.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/generationJobRepository') &&
      source.includes('../lib/data/assetRepository') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('../lib/data/usageRepository'),
    'ChatView should persist assistant replies and usage through SaaS repositories',
  );
  assert.ok(
    source.includes('createGenerationJob') &&
      source.includes('updateGenerationJob') &&
      source.includes('createWorkspaceAsset') &&
      source.includes('createPricedWorkspaceUsageEvent') &&
      source.includes("kind: 'generation'") &&
      source.includes('generation_job_start') &&
      source.includes('generation_job_complete') &&
      source.includes("moduleId: 'chat'") &&
      source.includes("type: 'text'"),
    'ChatView assistant replies should create jobs, update job status, create text assets, record usage, and audit lifecycle events',
  );
  const sendHandler = source.slice(source.indexOf('const handleSend'), source.indexOf('const handleMockUpload'));
  assert.equal(
    source.includes('generateTimeoutRef') ||
      source.includes('Simulate network delay') ||
      source.includes('setTimeout(') ||
      sendHandler.includes('setInterval(') ||
      sendHandler.includes('streamIntervalRef'),
    false,
    'ChatView should not use timer-based assistant response placeholders',
  );
}

{
  const source = readFileSync('src/components/FinanceView.tsx', 'utf8');
  assert.ok(
      source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/financialRepository') &&
      source.includes('../lib/data/taskRepository') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('loadWorkspaceFinancialRecords') &&
      source.includes('summarizeWorkspaceFinancials') &&
      source.includes('buildDailyRevenueSeries') &&
      source.includes('buildWorkspaceInvoices') &&
      source.includes('createWorkspaceTask') &&
      source.includes('loadWorkspaceTasks'),
    'FinanceView should derive reports, charts, and invoices from persisted financial records',
  );
  assert.ok(
    source.includes('financial_report_export') &&
      source.includes('financial_risk_audit') &&
      source.includes('finance_compliance_task_sync') &&
      source.includes('logAuditEvent') &&
      source.includes("moduleId: 'finance'"),
    'FinanceView report and audit actions should be written to the audit log',
  );
  assert.equal(
    source.includes('SYNC_CRM_TASKS'),
    false,
    'FinanceView should create compliance tasks through taskRepository instead of dispatching legacy CRM sync events',
  );
  assert.equal(
    source.includes('setTimeout('),
    false,
    'FinanceView should not use timer-based report or risk audit placeholders',
  );
}

{
  const source = readFileSync('src/components/TaxSimulator.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('tax_simulation_run') &&
      source.includes('logAuditEvent') &&
      source.includes("moduleId: 'tax'"),
    'TaxSimulator should audit tax scenario simulations through SaaS repositories',
  );
  assert.equal(
    source.includes('setTimeout('),
    false,
    'TaxSimulator should not use timer-based tax simulation placeholders',
  );
}

{
  const source = readFileSync('src/components/TaxReconciliationTool.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/financialRepository') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('loadWorkspaceFinancialRecords') &&
      source.includes('saveWorkspaceFinancialRecords') &&
      source.includes('listAuditLogs') &&
      source.includes('logAuditEvent'),
    'TaxReconciliationTool should reconcile persisted workspace financial records and audit actions',
  );
  assert.ok(
    source.includes('tax_reconciliation_scan') &&
      source.includes('tax_reconciliation_resolve'),
    'TaxReconciliationTool should audit reconciliation scans and resolutions',
  );
  assert.equal(
    source.includes('mockLedgerItems') || source.includes('setTimeout('),
    false,
    'TaxReconciliationTool should not use mock ledger rows or timer-based reconciliation placeholders',
  );
}

{
  assert.ok(
    existsSync('src/lib/data/taxEventRepository.ts'),
    'taxEventRepository should persist workspace tax calendar events',
  );
  const repositorySource = readFileSync('src/lib/data/taxEventRepository.ts', 'utf8');
  assert.ok(
    repositorySource.includes('TAX_EVENT_STORAGE_PREFIX') &&
      repositorySource.includes('loadWorkspaceTaxEvents') &&
      repositorySource.includes('saveWorkspaceTaxEvents') &&
      repositorySource.includes('seedWorkspaceTaxEvents'),
    'taxEventRepository should expose workspace-scoped tax event storage helpers',
  );
}

{
  const source = readFileSync('src/components/FiscalCalendarView.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/taxEventRepository') &&
      source.includes('loadWorkspaceTaxEvents') &&
      source.includes('seedWorkspaceTaxEvents') &&
      source.includes('../lib/data/taskRepository') &&
      source.includes('createWorkspaceTask'),
    'FiscalCalendarView should load persisted workspace tax events and sync selected events through taskRepository',
  );
  assert.equal(
    source.includes('generateMockEvents') || source.includes('MOCK_EVENTS'),
    false,
    'FiscalCalendarView should not generate or export mock tax events',
  );
}

{
  const source = readFileSync('src/components/TaxView.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('../lib/data/taxEventRepository') &&
      source.includes('seedWorkspaceTaxEvents') &&
      source.includes('logAuditEvent') &&
      source.includes("moduleId: 'tax'"),
    'TaxView should write tax workspace actions to the SaaS audit log from persisted tax events',
  );
  for (const action of [
    'tax_deadline_reminder',
    'tax_audit_export',
    'tax_calculation_run',
    'tax_document_parse',
    'tax_compliance_doc_generate',
  ]) {
    assert.ok(source.includes(action), `TaxView should audit ${action}`);
  }
  assert.equal(
    source.includes('setTimeout(') ||
      source.includes('MOCK_EVENTS') ||
      source.includes('generateMockEvents'),
    false,
    'TaxView should not use timer-based or mock tax workflow placeholders',
  );
}

{
  const source = readFileSync('src/components/CrmView.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/taskRepository') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('createWorkspaceTask') &&
      source.includes('loadWorkspaceTasks'),
    'CrmView should persist follow-up work through SaaS task repositories',
  );
  assert.ok(
    source.includes('crm_followup_task_sync') &&
      source.includes('crm_email_draft_generate') &&
      source.includes('crm_summary_generate') &&
      source.includes('crm_customer_export') &&
      source.includes('logAuditEvent') &&
      source.includes("moduleId: 'crm'"),
    'CrmView customer exports, AI drafts, summaries, and follow-up sync should be audited',
  );
  assert.equal(
    source.includes('setTimeout('),
    false,
    'CrmView should not use timer-based CRM generation or follow-up placeholders',
  );
}

{
  const source = readFileSync('src/components/CustomerInsights.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('crm_survey_send') &&
      source.includes('logAuditEvent') &&
      source.includes("moduleId: 'crm'"),
    'CustomerInsights CSAT surveys should be written to the SaaS audit log',
  );
  assert.equal(
    source.includes('setTimeout('),
    false,
    'CustomerInsights CSAT survey send should not use a timer-based placeholder',
  );
}

for (const [filePath, expectedActions] of [
  ['src/components/MeetingAssistant.tsx', ['crm_meeting_summary_generate', 'crm_followup_task_sync']],
  ['src/components/CustomerComments.tsx', ['crm_comment_mention_task_sync', 'crm_roleplay_coach_generate']],
] as const) {
  const source = readFileSync(filePath, 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/taskRepository') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('createWorkspaceTask') &&
      source.includes('logAuditEvent'),
    `${filePath} should persist CRM assistant tasks and audit events through SaaS repositories`,
  );
  for (const action of expectedActions) {
    assert.ok(source.includes(action), `${filePath} should audit ${action}`);
  }
  assert.equal(
    source.includes('SYNC_CRM_TASKS') || source.includes('setTimeout('),
    false,
    `${filePath} should not use legacy CRM sync events or timer-based AI placeholders`,
  );
}

{
  const source = readFileSync('src/components/FinanceMeetingAssistant.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/taskRepository') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('createWorkspaceTask') &&
      source.includes('logAuditEvent'),
    'FinanceMeetingAssistant should persist meeting action items through SaaS task and audit repositories',
  );
  assert.ok(
    source.includes('finance_meeting_summary_generate') &&
      source.includes('finance_compliance_task_sync'),
    'FinanceMeetingAssistant should audit meeting summaries and compliance task syncs',
  );
  assert.equal(
    source.includes('SYNC_CRM_TASKS') ||
      source.includes('setTimeout(') ||
      source.includes('setInterval(') ||
      source.includes('mockPhrases'),
    false,
    'FinanceMeetingAssistant should not use legacy CRM sync events or timer-based/mock transcript placeholders',
  );
}

{
  const source = readFileSync('src/components/Topbar.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('../lib/data/auditLogRepository') &&
      source.includes('../lib/data/generationJobRepository') &&
      source.includes('../lib/data/offlineQueueRepository'),
    'Topbar inbox should derive notifications from SaaS session repositories',
  );
  assert.ok(
    source.includes('listAuditLogs') &&
      source.includes('listGenerationJobs') &&
      source.includes('loadOfflineQueue') &&
      source.includes('generation_jobs_updated') &&
      source.includes('offlineQueueUpdated'),
    'Topbar inbox should refresh from audit logs, generation jobs, and offline queue updates',
  );
  assert.equal(
    source.includes('mockNotifications') ||
      source.includes('Payment Failed') ||
      source.includes('Build Successfully') ||
      source.includes('Team Sync'),
    false,
    'Topbar inbox should not render static mock notifications',
  );
}

{
  const source = readFileSync('src/components/GlobalSearchOverlay.tsx', 'utf8');
  assert.ok(
    source.includes('../hooks/useWorkspaceAssets') &&
      source.includes('assets.filter') &&
      source.includes('asset.name') &&
      source.includes('asset.tags'),
    'GlobalSearchOverlay should search persisted workspace assets instead of hard-coded asset rows',
  );
  assert.equal(
    source.includes('mock-asset-') ||
      source.includes('Brand Kit Logo (Q3)') ||
      source.includes('Spring Marketing Video'),
    false,
    'GlobalSearchOverlay should not render static mock asset results',
  );
}

for (const filePath of [
  'src/components/AssetsView.tsx',
  'src/components/RecentFilesWidget.tsx',
]) {
  const source = readFileSync(filePath, 'utf8');
  assert.equal(
    source.includes("localStorage.getItem('recent_ai_assets')") ||
      source.includes("localStorage.setItem('recent_ai_assets'"),
    false,
    `${filePath} should use assetRepository instead of recent_ai_assets`,
  );
  assert.ok(
    source.includes('assetRepository') || source.includes('useWorkspaceAssets'),
    `${filePath} should load workspace assets through the shared asset repository`,
  );
}

{
  const source = readFileSync('src/components/AdminView.tsx', 'utf8');
  assert.ok(
    source.includes('createWorkspaceUsageEvent') &&
      source.includes('provider_test') &&
      source.includes('lastTestedAt') &&
      source.includes('provider_config_update'),
    'AdminView provider management should test providers, record usage events, update last tested timestamps, and audit provider tests',
  );
  assert.equal(
    source.includes('setTimeout('),
    false,
    'AdminView should not use timer-based admin operation placeholders',
  );
}

{
  const source = readFileSync('src/components/ActivityLogsView.tsx', 'utf8');
  assert.ok(
    source.includes('filterAuditLogs') &&
      source.includes('exportAuditLogRows') &&
      source.includes('moduleFilter') &&
      source.includes('actionFilter') &&
      source.includes('actorFilter') &&
      source.includes('targetTypeFilter') &&
      source.includes('timePeriodFilter') &&
      source.includes('metadataJson') &&
      source.includes('export_workspace'),
    'ActivityLogsView should filter audit logs by module/action/actor/target/time and export flattened audit rows',
  );
}

{
  const source = readFileSync('src/components/AdminView.tsx', 'utf8');
  assert.ok(
    source.includes('createWorkspaceAsset') &&
      source.includes('exportAuditLogRows') &&
      source.includes('audit_report') &&
      source.includes('auditExportAsset') &&
      source.includes("targetType: 'asset'") &&
      source.includes('exportedLogCount'),
    'AdminView audit export should create an asset-backed audit report and record export metadata',
  );
}

{
  const auditTypesSource = readFileSync('src/saas/types.ts', 'utf8');
  assert.ok(
    auditTypesSource.includes('permission_denied'),
    'AuditAction should include permission_denied for explicit blocked mutation attempts',
  );
  const permissionsSource = readFileSync('src/saas/permissions.ts', 'utf8');
  assert.ok(
    permissionsSource.includes('PROTECTED_ACTION_PERMISSIONS') &&
      permissionsSource.includes('buildPermissionDeniedMetadata') &&
      permissionsSource.includes('canPerformProtectedAction'),
    'permissions should define protected P0 action checks and denied-action metadata',
  );
  for (const filePath of [
    'src/components/AssetsView.tsx',
    'src/components/ApiKeysView.tsx',
    'src/components/BillingView.tsx',
    'src/components/SettingsView.tsx',
    'src/components/AdminView.tsx',
    'src/components/TaskCenter.tsx',
    'src/components/TasksView.tsx',
  ]) {
    const source = readFileSync(filePath, 'utf8');
    assert.ok(
      source.includes('permission_denied') &&
        source.includes('buildPermissionDeniedMetadata') &&
        source.includes('logAuditEvent'),
      `${filePath} should audit explicit denied high-risk mutation attempts`,
    );
  }
}

{
  const source = readFileSync('src/runtime/AgentRuntimeContext.tsx', 'utf8');
  assert.ok(
    source.includes('../saas/SaasAuthContext') &&
      source.includes('useSaasSession') &&
      source.includes('readWorkspaceRuntimeSettings') &&
      source.includes('settings_updated') &&
      source.includes('readRuntimeEnvironment(undefined, runtimeSettings)') &&
      source.includes('resolveRuntimeMode(env, runtimeSettings'),
    'AgentRuntimeContext should rebuild the runtime provider from workspace runtime settings',
  );
}

{
  const source = readFileSync('src/components/SettingsView.tsx', 'utf8');
  assert.ok(
    source.includes('../lib/data/settingsRepository') &&
      source.includes('saveSettings') &&
      source.includes('logAuditEvent') &&
      source.includes('settings_change') &&
      source.includes('runtimeModeStrategy') &&
      source.includes('multicaApiUrl') &&
      source.includes('multicaWsUrl') &&
      source.includes('WORKSPACE_PREFERENCES_SETTING_KEY'),
    'SettingsView should persist runtime mode, Multica endpoints, workspace preferences, and audit setting changes',
  );
}

console.log('saas foundation contract passed');
