import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { commercialMvpP0Batch1ModuleIds, getProductFeature } from '../src/product/registry.ts';

function createsGenerationJob(source: string): boolean {
  return source.includes('startBillableGenerationJob') || source.includes('createGenerationJob');
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts?: Record<string, string>;
};

const requiredScripts = [
  'lint',
  'build',
  'test:data-backend',
  'test:workspace-state',
  'test:launch-readiness',
  'test:browser-smoke',
  'test:p0-specialized',
  'test:p0-release',
  'test:product-registry',
  'test:saas-foundation',
  'test:runtime-contract',
  'test:desktop-bridge',
  'test:multica-mappers',
  'test:multica-runtime-provider',
  'test:web-runtime-provider',
  'test:multica-api-client',
];

for (const scriptName of requiredScripts) {
  assert.ok(packageJson.scripts?.[scriptName], `package.json should expose ${scriptName}`);
}

assert.ok(
  packageJson.scripts?.['test:p0-release']?.includes('test:p0-specialized') &&
    packageJson.scripts?.['test:p0-release']?.includes('test:launch-readiness') &&
    packageJson.scripts?.['test:p0-release']?.includes('test:saas-foundation') &&
    packageJson.scripts?.['test:p0-release']?.includes('lint') &&
    packageJson.scripts?.['test:p0-release']?.includes('build') &&
    packageJson.scripts?.['test:p0-release']?.includes('test:browser-smoke'),
  'package.json should expose one P0 release gate command sequence',
);

for (const marker of [
  'test:product-registry',
  'test:data-backend',
  'test:workspace-state',
  'test:runtime-contract',
  'test:desktop-bridge',
  'test:multica-mappers',
  'test:multica-runtime-provider',
  'test:web-runtime-provider',
  'test:multica-api-client',
]) {
  assert.ok(
    packageJson.scripts?.['test:p0-specialized']?.includes(marker),
    `test:p0-specialized should include ${marker}`,
  );
}

assert.ok(
  existsSync('docs/saas-commercial-mvp-p0-release-evidence.md'),
  'P0 release gate should include a release evidence document',
);
const p0ReleaseEvidenceSource = readFileSync('docs/saas-commercial-mvp-p0-release-evidence.md', 'utf8');
for (const marker of [
  'Commercial MVP P0 Batch 1 Release Evidence',
  'Automated Verification',
  'Manual Smoke',
  'Known Warnings',
  'Release Decision',
  'test:p0-release',
  'test:p0-specialized',
  'Specialized Verification',
  'Web standalone',
  'Desktop Multica',
  'Self-hosted Multica',
  'Permissions and quota',
]) {
  assert.ok(p0ReleaseEvidenceSource.includes(marker), `P0 release evidence should include ${marker}`);
}

const generationFailureRecoveryPanelSource = readFileSync('src/components/GenerationFailureRecoveryPanel.tsx', 'utf8');
assert.ok(
  generationFailureRecoveryPanelSource.includes('../lib/data/generationJobRepository') &&
    generationFailureRecoveryPanelSource.includes('listGenerationJobs') &&
    generationFailureRecoveryPanelSource.includes('retryGenerationJob') &&
    generationFailureRecoveryPanelSource.includes('../lib/data/auditLogRepository') &&
    generationFailureRecoveryPanelSource.includes('generation_job_retry') &&
    generationFailureRecoveryPanelSource.includes("job.status === 'failed'"),
  'GenerationFailureRecoveryPanel should list failed jobs, create retry attempts, and audit retry actions',
);

const browserSmokeSource = [
  readFileSync('scripts/browser-smoke.test.ts', 'utf8'),
  readFileSync('scripts/browser-smoke-flow.js', 'utf8'),
].join('\n');
for (const marker of [
  'P0_RELEASE_SMOKE_STORAGE_KEYS',
  'assertP0ReleasePersistence',
  'p0-release-task',
  'p0-release-asset',
  'runtime_dispatch',
  'quota_block',
  'permissionDeniedRoles',
  'auditDomainActions',
  'web standalone',
]) {
  assert.ok(browserSmokeSource.includes(marker), `browser smoke should cover P0 release marker ${marker}`);
}

const envExample = readFileSync('.env.example', 'utf8');
for (const envKey of [
  'VITE_DATA_BACKEND',
  'VITE_DATA_API_URL',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_DATABASE_URL',
  'VITE_MULTICA_API_URL',
  'VITE_MULTICA_WS_URL',
  'VITE_MULTICA_WORKSPACE_ID',
  'VITE_MULTICA_TOKEN',
]) {
  assert.ok(envExample.includes(envKey), `.env.example should document ${envKey}`);
}

const indexHtml = readFileSync('index.html', 'utf8');
assert.ok(indexHtml.includes('</title>'), 'index.html should have a valid title closing tag');
assert.ok(indexHtml.includes('rel="icon"'), 'index.html should provide a favicon link');

const dataBackendSource = readFileSync('src/lib/data/dataBackend.ts', 'utf8');
for (const marker of [
  'resolveDataBackendMode',
  'getDataBackendDescriptor',
  'createDataBackendAdapter',
  'buildDataBackendPath',
  'normalizeDataBackendError',
  'getRepositoryStorage',
]) {
  assert.ok(dataBackendSource.includes(marker), `data backend adapter should expose ${marker}`);
}

const appSource = readFileSync('src/App.tsx', 'utf8');
assert.ok(appSource.includes('canViewProductModule'), 'App should guard direct module access by role');
assert.ok(appSource.includes('filter(canAccessModule)'), 'App should filter pinned modules by role');
assert.ok(appSource.includes('keepModuleIdListIfEqual'), 'App should avoid pinned module state loops on settings sync');

const p0Batch1Ids = [...commercialMvpP0Batch1ModuleIds] as string[];
assert.equal(p0Batch1Ids.includes('ai_canvas'), false, 'P0 launch gate should not include ai_canvas');
for (const id of commercialMvpP0Batch1ModuleIds) {
  const feature = getProductFeature(id);
  assert.ok(feature, `${id} should have product metadata for P0 launch`);
  assert.equal(feature.visible, true, `${id} should be visible for P0 launch`);
  assert.equal(feature.routeStatus, 'rendered', `${id} should have a rendered route for P0 launch`);
  assert.ok(appSource.includes(`case '${id}':`), `${id} should have an App renderContent case for P0 launch`);
}

const sidebarSource = readFileSync('src/components/Sidebar.tsx', 'utf8');
assert.ok(sidebarSource.includes('getProductNavGroupsForRole'), 'Sidebar should role-filter navigation');

for (const filePath of [
  'src/components/CommandPalette.tsx',
  'src/components/GlobalSearchOverlay.tsx',
  'src/components/RecommendedModulesWidget.tsx',
  'src/components/UsageHeatmap.tsx',
]) {
  const source = readFileSync(filePath, 'utf8');
  assert.ok(source.includes('getProductNavGroupsForRole'), `${filePath} should use role-filtered product navigation`);
}

const dispatcherSource = readFileSync('src/components/GlobalAgentDispatcherModal.tsx', 'utf8');
for (const marker of [
  'canDispatchAgent',
  'canStartBillableGeneration',
  'estimateRequestedGenerationCredits',
  'updateGenerationJob',
  'generation_job_complete',
  'generation_job_failed',
]) {
  assert.ok(dispatcherSource.includes(marker), `GlobalAgentDispatcherModal should include ${marker}`);
}

const assetsSource = readFileSync('src/components/AssetsView.tsx', 'utf8');
for (const marker of ['asset_create', 'asset_delete', 'asset_export']) {
  assert.ok(assetsSource.includes(marker), `AssetsView should audit ${marker}`);
}
const assetRepositorySource = readFileSync('src/lib/data/assetRepository.ts', 'utf8');
assert.ok(
  assetRepositorySource.includes('recordWorkspaceAssetExport') &&
    assetRepositorySource.includes("action: 'asset_export'") &&
    assetRepositorySource.includes("pricingAction: 'export'") &&
    assetRepositorySource.includes("kind: 'export'") &&
    assetRepositorySource.includes('format: input.format') &&
    assetRepositorySource.includes('fileName: input.fileName') &&
    assetRepositorySource.includes('sourceAction: input.sourceAction'),
  'assetRepository should centralize standardized asset export audit and usage records',
);

const billingSource = readFileSync('src/components/BillingView.tsx', 'utf8');
assert.ok(
  billingSource.includes('createWorkspaceFinancialRecord') &&
    billingSource.includes('billing_recharge_create') &&
    billingSource.includes('financial_records_updated'),
  'BillingView recharge payments should create persisted financial records and audit the transaction',
);
assert.ok(
  billingSource.includes('handleRedeemCoupon') &&
    billingSource.includes('billing_coupon_redeem') &&
    billingSource.includes('sumWorkspacePromotionalCredits') &&
    billingSource.includes('hasWorkspaceCouponRedemption') &&
    billingSource.includes('compute_points_coupon_redemption'),
  'BillingView coupon redemption should create persisted promotional credits and audit the transaction',
);
assert.ok(
  billingSource.includes('updateWorkspacePlan') &&
    billingSource.includes('billing_subscription_change') &&
    billingSource.includes("kind: 'subscription'"),
  'BillingView plan changes should update the workspace plan, persist subscription records, and audit the change',
);
assert.equal(
  billingSource.includes('setShowRechargeModal(false);\n                    // Show some success state logic in real app'),
  false,
  'BillingView recharge payment button should not be a UI-only placeholder',
);
assert.equal(
  billingSource.includes('fallbackUsageHistory') ||
    billingSource.includes('TRX-10023') ||
    billingSource.includes('Sora v1') ||
    billingSource.includes('Midjourney v6') ||
    billingSource.includes('Gemini 3.1 Pro') ||
    billingSource.includes('Runway Gen-3'),
  false,
  'BillingView usage history should not render fallback static transaction rows',
);
assert.ok(
  billingSource.includes('pricingKey') &&
    billingSource.includes('unitCredits') &&
    billingSource.includes('unitCount') &&
    billingSource.includes('creditEstimate') &&
    billingSource.includes('billingStatus'),
  'BillingView usage history should explain commercial usage pricing metadata',
);

const apiKeysSource = readFileSync('src/components/ApiKeysView.tsx', 'utf8');
assert.ok(
  apiKeysSource.includes('../lib/data/apiKeyRepository') &&
    apiKeysSource.includes('loadWorkspaceApiKeys') &&
    apiKeysSource.includes('createWorkspaceApiKey') &&
    apiKeysSource.includes('rotateWorkspaceApiKey') &&
    apiKeysSource.includes('revokeWorkspaceApiKey') &&
    apiKeysSource.includes('exportWorkspaceApiKeyRows'),
  'ApiKeysView should manage API keys through persisted workspace records',
);
assert.ok(
  apiKeysSource.includes('../lib/data/webhookRepository') &&
    apiKeysSource.includes('loadWorkspaceWebhookEndpoints') &&
    apiKeysSource.includes('createWorkspaceWebhookEndpoint') &&
    apiKeysSource.includes('updateWorkspaceWebhookEndpoint') &&
    apiKeysSource.includes('deleteWorkspaceWebhookEndpoint') &&
    apiKeysSource.includes('exportWorkspaceWebhookEndpointRows'),
  'ApiKeysView should manage Webhooks through persisted workspace records',
);
assert.ok(
  apiKeysSource.includes('api_key_create') &&
    apiKeysSource.includes('api_key_rotate') &&
    apiKeysSource.includes('api_key_revoke') &&
    apiKeysSource.includes('api_key_export') &&
    apiKeysSource.includes('canManageApiKeys'),
  'ApiKeysView should audit and permission-gate API key management actions',
);
assert.ok(
  apiKeysSource.includes('webhook_create') &&
    apiKeysSource.includes('webhook_update') &&
    apiKeysSource.includes('webhook_delete') &&
    apiKeysSource.includes('webhook_secret_rotate') &&
    apiKeysSource.includes('webhook_export') &&
    apiKeysSource.includes('canManageApiKeys'),
  'ApiKeysView should audit and permission-gate Webhook management actions',
);
assert.equal(
  apiKeysSource.includes('sk-prod-') ||
    apiKeysSource.includes('Testing Env') ||
    apiKeysSource.includes('Jenkins CI/CD') ||
    apiKeysSource.includes('alert('),
  false,
  'ApiKeysView should not render static API keys or alert-only actions',
);

const dataAnalyticsSource = readFileSync('src/components/DataAnalyticsView.tsx', 'utf8');
assert.ok(
  dataAnalyticsSource.includes('../lib/data/auditLogRepository') &&
    dataAnalyticsSource.includes('../saas/SaasAuthContext') &&
    dataAnalyticsSource.includes('./Toast') &&
    dataAnalyticsSource.includes('data_snapshot_export') &&
    dataAnalyticsSource.includes("moduleId: 'data'") &&
    dataAnalyticsSource.includes('saveAs') &&
    dataAnalyticsSource.includes('jsPDF'),
  'DataAnalyticsView should produce downloadable audited analytics reports',
);
assert.equal(
  dataAnalyticsSource.includes('alert('),
  false,
  'DataAnalyticsView report export should not be an alert-only placeholder',
);

const dashboardSource = readFileSync('src/components/Dashboard.tsx', 'utf8');
assert.ok(
  dashboardSource.includes('../lib/data/auditLogRepository') &&
    dashboardSource.includes('../lib/data/taskRepository') &&
    dashboardSource.includes('../hooks/useWorkspaceAssets') &&
    dashboardSource.includes('../hooks/useWorkspaceUsage') &&
    dashboardSource.includes('../runtime/useAgentRuntimeStatus') &&
    dashboardSource.includes('../saas/SaasAuthContext') &&
    dashboardSource.includes('./Toast') &&
    dashboardSource.includes('loadWorkspaceTasks') &&
    dashboardSource.includes('createWorkspaceTask') &&
    dashboardSource.includes('listAuditLogs') &&
    dashboardSource.includes('ai_command') &&
    dashboardSource.includes("moduleId: 'dashboard'") &&
    dashboardSource.includes("new CustomEvent('dashboard_ai_command'"),
  'Dashboard should derive workspace KPIs from tasks, assets, usage, audit logs, runtime status, and audited commands',
);
assert.ok(
  dashboardSource.includes('onNavigate?.(') &&
    dashboardSource.includes("'tasks'") &&
    dashboardSource.includes("'assets'") &&
    dashboardSource.includes("'billing'") &&
    dashboardSource.includes("'activity_logs'"),
  'Dashboard quick actions should route to real P0 modules',
);
assert.equal(
  dashboardSource.includes('alert('),
  false,
  'Dashboard command palette actions should not be alert-only placeholders',
);
assert.equal(
  dashboardSource.includes("value: '1,345'") ||
    dashboardSource.includes("value: '432'") ||
    dashboardSource.includes("value: '286 h'") ||
    dashboardSource.includes("value: '8.4M'") ||
    dashboardSource.includes('昨晚 AI 并行处理了') ||
    dashboardSource.includes('完成 12 支批量混剪下发') ||
    dashboardSource.includes('渲染服务器出现排队拥堵'),
  false,
  'Dashboard should not render static KPI, banner, event, or runtime-alert demo data',
);

const aiCopilotSource = readFileSync('src/components/AICopilot.tsx', 'utf8');
assert.ok(
  aiCopilotSource.includes('../saas/SaasAuthContext') &&
    aiCopilotSource.includes('../lib/data/generationJobRepository') &&
    aiCopilotSource.includes('../lib/data/assetRepository') &&
    aiCopilotSource.includes('../lib/data/auditLogRepository') &&
    createsGenerationJob(aiCopilotSource) &&
    aiCopilotSource.includes('updateGenerationJob') &&
    aiCopilotSource.includes('createWorkspaceAsset') &&
    aiCopilotSource.includes('logAuditEvent') &&
    aiCopilotSource.includes('ai_command') &&
    aiCopilotSource.includes('generation_job_start') &&
    aiCopilotSource.includes('generation_job_complete') &&
    aiCopilotSource.includes('asset_create') &&
    aiCopilotSource.includes("moduleId: 'dashboard'") &&
    aiCopilotSource.includes("type: 'text'"),
  'AICopilot should persist assistant replies as SaaS jobs, text assets, and audit events',
);
assert.equal(
  aiCopilotSource.includes('./ActivityLogsView') || aiCopilotSource.includes('useActivityLogger'),
  false,
  'AICopilot should write directly to SaaS audit repositories instead of legacy activity logger hooks',
);
const aiCopilotSendHandler = aiCopilotSource.slice(
  aiCopilotSource.indexOf('const sendMsg'),
  aiCopilotSource.indexOf('return (', aiCopilotSource.indexOf('const sendMsg')),
);
assert.equal(
  aiCopilotSendHandler.includes('setTimeout(') || aiCopilotSendHandler.includes('Simulate AI thinking'),
  false,
  'AICopilot send flow should not use a timer-based assistant reply placeholder',
);

const quickPromptSource = readFileSync('src/components/QuickPromptFAB.tsx', 'utf8');
assert.ok(
  quickPromptSource.includes('../saas/SaasAuthContext') &&
    quickPromptSource.includes('../lib/data/generationJobRepository') &&
    quickPromptSource.includes('../lib/data/assetRepository') &&
    quickPromptSource.includes('../lib/data/auditLogRepository') &&
    createsGenerationJob(quickPromptSource) &&
    quickPromptSource.includes('updateGenerationJob') &&
    quickPromptSource.includes('createWorkspaceAsset') &&
    quickPromptSource.includes('logAuditEvent') &&
    quickPromptSource.includes('ai_command') &&
    quickPromptSource.includes('generation_job_start') &&
    quickPromptSource.includes('generation_job_complete') &&
    quickPromptSource.includes('asset_create') &&
    quickPromptSource.includes("moduleId: 'dashboard'") &&
    quickPromptSource.includes("type: 'text'"),
  'QuickPromptFAB should persist quick prompt replies as SaaS jobs, text assets, and audit events',
);
const quickPromptSubmitHandler = quickPromptSource.slice(
  quickPromptSource.indexOf('const handleSubmit'),
  quickPromptSource.indexOf('return (', quickPromptSource.indexOf('const handleSubmit')),
);
assert.equal(
  quickPromptSubmitHandler.includes('setTimeout(') || quickPromptSubmitHandler.includes('Simulate Gemini API call'),
  false,
  'QuickPromptFAB submit flow should not use a timer-based Gemini placeholder',
);

const featureViewSource = readFileSync('src/components/FeatureView.tsx', 'utf8');
assert.ok(
  featureViewSource.includes('../saas/SaasAuthContext') &&
    featureViewSource.includes('../lib/data/generationJobRepository') &&
    featureViewSource.includes('../lib/data/assetRepository') &&
    featureViewSource.includes('../lib/data/auditLogRepository') &&
    featureViewSource.includes('../lib/data/usageRepository') &&
    createsGenerationJob(featureViewSource) &&
    featureViewSource.includes('updateGenerationJob') &&
    featureViewSource.includes('createWorkspaceAsset') &&
    featureViewSource.includes('createWorkspaceUsageEvent') &&
    featureViewSource.includes('logAuditEvent') &&
    featureViewSource.includes('resolveFeatureModuleId') &&
    featureViewSource.includes('resolveFeatureAssetType') &&
    featureViewSource.includes('generation_job_start') &&
    featureViewSource.includes('generation_job_complete') &&
    featureViewSource.includes('asset_create'),
  'FeatureView should persist generated replies and media through SaaS jobs, assets, usage, and audit events',
);
const featureViewGenerateHandler = featureViewSource.slice(
  featureViewSource.indexOf('const handleGenerate'),
  featureViewSource.indexOf('const handleKeyDown'),
);
assert.ok(
  createsGenerationJob(featureViewGenerateHandler) &&
    featureViewGenerateHandler.includes('updateGenerationJob') &&
    featureViewGenerateHandler.includes('createWorkspaceAsset') &&
    featureViewGenerateHandler.includes('createWorkspaceUsageEvent') &&
    featureViewGenerateHandler.includes("kind: 'generation'") &&
    featureViewGenerateHandler.includes('generation_job_start') &&
    featureViewGenerateHandler.includes('generation_job_complete') &&
    featureViewGenerateHandler.includes('asset_create'),
  'FeatureView generate flow should create jobs, persist generated assets, record usage, and audit lifecycle events',
);
assert.equal(
  featureViewGenerateHandler.includes('setInterval(') ||
    featureViewGenerateHandler.includes('Mock progress') ||
    featureViewGenerateHandler.includes('模拟的'),
  false,
  'FeatureView generate flow should not use timer-based progress or mock assistant reply placeholders',
);

const projectsSource = readFileSync('src/components/ProjectsView.tsx', 'utf8');
assert.ok(
  projectsSource.includes('../saas/SaasAuthContext') &&
    projectsSource.includes('../lib/data/settingsRepository') &&
    projectsSource.includes('../lib/data/auditLogRepository') &&
    projectsSource.includes('./Toast') &&
    projectsSource.includes('PROJECT_ASSET_LINKS_SETTING_KEY') &&
    projectsSource.includes('getSetting') &&
    projectsSource.includes('saveSetting') &&
    projectsSource.includes('project_asset_link') &&
    projectsSource.includes("moduleId: 'projects'"),
  'ProjectsView should persist and audit project asset links',
);
assert.equal(
  projectsSource.includes('alert('),
  false,
  'ProjectsView asset linking should not be an alert-only placeholder',
);

const aiCanvasSource = readFileSync('src/components/AICanvasView.tsx', 'utf8');
assert.ok(
  aiCanvasSource.includes('../lib/data/settingsRepository') &&
    aiCanvasSource.includes('../lib/data/auditLogRepository') &&
    aiCanvasSource.includes('./Toast') &&
    aiCanvasSource.includes('canvas_state_save') &&
    aiCanvasSource.includes('canvas_workflow_run') &&
    aiCanvasSource.includes('canvas_snapshot_create') &&
    aiCanvasSource.includes('AISTUDIO_CANVAS_SNAPSHOTS_SETTING_KEY'),
  'AICanvasView should persist and audit manual saves, snapshots, and workflow runs',
);
assert.equal(
  aiCanvasSource.includes('alert('),
  false,
  'AICanvasView should not use alert-only save, snapshot, template, or share actions',
);
assert.equal(
  aiCanvasSource.includes('setTimeout(') ||
    aiCanvasSource.includes('setInterval(') ||
    aiCanvasSource.includes('Mock incoming remote drawing') ||
    aiCanvasSource.includes('mockPoints'),
  false,
  'AICanvasView should not use timer-based or mock collaboration/workflow placeholders',
);

const remixSource = readFileSync('src/components/RemixView.tsx', 'utf8');
assert.ok(
  remixSource.includes('../saas/SaasAuthContext') &&
    remixSource.includes('../lib/data/generationJobRepository') &&
    remixSource.includes('../lib/data/assetRepository') &&
    remixSource.includes('../lib/data/auditLogRepository') &&
    remixSource.includes('../lib/data/usageRepository') &&
    remixSource.includes('createPricedWorkspaceUsageEvent') &&
    createsGenerationJob(remixSource) &&
    remixSource.includes('failGenerationJob') &&
    remixSource.includes('GenerationFailureRecoveryPanel') &&
    remixSource.includes('updateGenerationJob') &&
    remixSource.includes('createWorkspaceAsset') &&
    remixSource.includes('createPricedWorkspaceUsageEvent') &&
    remixSource.includes('logAuditEvent') &&
    remixSource.includes("moduleId: 'remix_smart'") &&
    remixSource.includes('generation_job_start') &&
    remixSource.includes('generation_job_complete') &&
    remixSource.includes('generation_job_failed') &&
    remixSource.includes('asset_create'),
  'RemixView smart remix should persist video jobs, assets, usage, audit lifecycle events, and failed-job recovery hooks',
);
assert.ok(
  remixSource.includes('recordWorkspaceAssetExport') &&
    remixSource.includes("pricingAction: 'export'") &&
    remixSource.includes("kind: 'export'") &&
    remixSource.includes('format') &&
    remixSource.includes('fileName') &&
    remixSource.includes('sourceAction'),
  'RemixView should audit and meter exported remix outputs with standardized asset export metadata',
);
const remixPreviewHandler = remixSource.slice(
  remixSource.indexOf('const handlePreviewRemix'),
  remixSource.indexOf('return (', remixSource.indexOf('function RemixSmart')),
);
assert.ok(
  createsGenerationJob(remixPreviewHandler) &&
    remixPreviewHandler.includes('updateGenerationJob') &&
    remixPreviewHandler.includes('createWorkspaceAsset') &&
    remixPreviewHandler.includes('createPricedWorkspaceUsageEvent') &&
    remixPreviewHandler.includes("kind: 'generation'") &&
    remixPreviewHandler.includes('generation_job_start') &&
    remixPreviewHandler.includes('generation_job_complete') &&
    remixPreviewHandler.includes('asset_create'),
  'RemixView preview flow should create smart-remix jobs, persist video assets, record usage, and audit lifecycle events',
);
const remixMaterialsHandler = remixSource.slice(
  remixSource.indexOf('const handleUploadMaterial'),
  remixSource.indexOf('return (', remixSource.indexOf('function RemixMaterials')),
);
assert.ok(
  remixSource.includes('../lib/data/taskRepository') &&
    remixMaterialsHandler.includes('createWorkspaceAsset') &&
    remixMaterialsHandler.includes('createPricedWorkspaceUsageEvent') &&
    remixMaterialsHandler.includes("kind: 'automation'") &&
    remixMaterialsHandler.includes("moduleId: 'remix_materials'") &&
    remixMaterialsHandler.includes('asset_create'),
  'RemixView materials upload should persist material assets, record usage, and audit asset creation',
);
const remixTitlesHandler = remixSource.slice(
  remixSource.indexOf('const handleSaveTitleTemplate'),
  remixSource.indexOf('return (', remixSource.indexOf('function RemixTitles')),
);
assert.ok(
  remixTitlesHandler.includes('createWorkspaceAsset') &&
    remixTitlesHandler.includes('createPricedWorkspaceUsageEvent') &&
    remixTitlesHandler.includes("kind: 'automation'") &&
    remixTitlesHandler.includes("moduleId: 'remix_titles'") &&
    remixTitlesHandler.includes('asset_create'),
  'RemixView title templates should persist reusable template assets, record usage, and audit saves',
);
const remixTemplatesHandler = remixSource.slice(
  remixSource.indexOf('const handleSaveVideoTemplate'),
  remixSource.indexOf('return (', remixSource.indexOf('function RemixTemplates')),
);
assert.ok(
  remixTemplatesHandler.includes('createWorkspaceAsset') &&
    remixTemplatesHandler.includes('createPricedWorkspaceUsageEvent') &&
    remixTemplatesHandler.includes("kind: 'automation'") &&
    remixTemplatesHandler.includes("moduleId: 'remix_templates'") &&
    remixTemplatesHandler.includes('asset_create'),
  'RemixView video templates should persist reusable project assets, record usage, and audit saves',
);
const remixViralHandler = remixSource.slice(
  remixSource.indexOf('const handleAnalyzeViralClone'),
  remixSource.indexOf('return (', remixSource.indexOf('function RemixViral')),
);
assert.ok(
  createsGenerationJob(remixViralHandler) &&
    remixViralHandler.includes('updateGenerationJob') &&
    remixViralHandler.includes('createWorkspaceAsset') &&
    remixViralHandler.includes('createPricedWorkspaceUsageEvent') &&
    remixViralHandler.includes('createWorkspaceTask') &&
    remixViralHandler.includes("kind: 'generation'") &&
    remixViralHandler.includes("moduleId: 'remix_viral'") &&
    remixViralHandler.includes('generation_job_start') &&
    remixViralHandler.includes('generation_job_complete') &&
    remixViralHandler.includes('asset_create') &&
    remixViralHandler.includes('task_create'),
  'RemixView viral clone should persist analysis jobs, structure assets, usage, follow-up tasks, and audit lifecycle events',
);

const marketingSource = readFileSync('src/components/MarketingView.tsx', 'utf8');
assert.ok(
  marketingSource.includes('../saas/SaasAuthContext') &&
    marketingSource.includes('../lib/data/campaignRepository') &&
    marketingSource.includes('../lib/data/customerRepository') &&
    marketingSource.includes('../lib/data/taskRepository') &&
    marketingSource.includes('../lib/data/generationJobRepository') &&
    marketingSource.includes('../lib/data/assetRepository') &&
    marketingSource.includes('../lib/data/auditLogRepository') &&
    marketingSource.includes('../lib/data/usageRepository') &&
    marketingSource.includes('createPricedWorkspaceUsageEvent') &&
    marketingSource.includes('createWorkspaceCampaign') &&
    marketingSource.includes('updateWorkspaceCampaign') &&
    marketingSource.includes('createOrUpdateWorkspaceCustomerLead') &&
    marketingSource.includes('createWorkspaceTask') &&
    createsGenerationJob(marketingSource) &&
    marketingSource.includes('failGenerationJob') &&
    marketingSource.includes('GenerationFailureRecoveryPanel') &&
    marketingSource.includes('updateGenerationJob') &&
    marketingSource.includes('createWorkspaceAsset') &&
    marketingSource.includes('createPricedWorkspaceUsageEvent') &&
    marketingSource.includes('logAuditEvent') &&
    marketingSource.includes('generation_job_start') &&
    marketingSource.includes('generation_job_complete') &&
    marketingSource.includes('generation_job_failed') &&
    marketingSource.includes('marketing_lead_create') &&
    marketingSource.includes('marketing_followup_task_create') &&
    marketingSource.includes('asset_create'),
  'MarketingView should persist campaign actions, CRM lead handoff, generated assets, usage, audit lifecycle events, and failed-job recovery hooks',
);
const marketingLeadHandoffHelper = marketingSource.slice(
  marketingSource.indexOf('function createMarketingLeadHandoff'),
  marketingSource.indexOf('export function MarketingView'),
);
assert.ok(
  marketingLeadHandoffHelper.includes('createOrUpdateWorkspaceCustomerLead') &&
    marketingLeadHandoffHelper.includes('createWorkspaceTask') &&
    marketingLeadHandoffHelper.includes('campaignName') &&
    marketingLeadHandoffHelper.includes('sourceChannel') &&
    marketingLeadHandoffHelper.includes('landingPage') &&
    marketingLeadHandoffHelper.includes('marketing_lead_create') &&
    marketingLeadHandoffHelper.includes('marketing_followup_task_create'),
  'MarketingView lead handoff helper should create CRM leads, follow-up tasks, source metadata, and audit events',
);
const marketingViralHandler = marketingSource.slice(
  marketingSource.indexOf('const handlePublishCampaign'),
  marketingSource.indexOf('if (activeView ===', marketingSource.indexOf('function MarketingViral')),
);
assert.ok(
  marketingViralHandler.includes('createWorkspaceCampaign') &&
    marketingViralHandler.includes('updateWorkspaceCampaign') &&
    marketingViralHandler.includes('createMarketingLeadHandoff') &&
    createsGenerationJob(marketingViralHandler) &&
    marketingViralHandler.includes('updateGenerationJob') &&
    marketingViralHandler.includes('createWorkspaceAsset') &&
    marketingViralHandler.includes('createPricedWorkspaceUsageEvent') &&
    marketingViralHandler.includes("kind: 'generation'") &&
    marketingViralHandler.includes("moduleId: 'marketing_viral'") &&
    marketingViralHandler.includes('generation_job_start') &&
    marketingViralHandler.includes('generation_job_complete') &&
    marketingViralHandler.includes('asset_create'),
  'MarketingView viral publish flow should create campaign records, CRM leads, follow-up tasks, jobs, print assets, usage, and audit events',
);
const marketingNfcHandler = marketingSource.slice(
  marketingSource.indexOf('const handleSaveNfcCampaign'),
  marketingSource.indexOf('return (', marketingSource.indexOf('function MarketingNFC')),
);
assert.ok(
  marketingNfcHandler.includes('createWorkspaceCampaign') &&
    marketingNfcHandler.includes('createMarketingLeadHandoff') &&
    marketingNfcHandler.includes('createWorkspaceAsset') &&
    marketingNfcHandler.includes('createPricedWorkspaceUsageEvent') &&
    marketingNfcHandler.includes("kind: 'automation'") &&
    marketingNfcHandler.includes("moduleId: 'marketing_nfc'") &&
    marketingNfcHandler.includes('asset_create'),
  'MarketingView NFC flow should save campaign touchpoint records, CRM leads, follow-up tasks, assets, usage, and audit events',
);
const marketingWebsiteHandler = marketingSource.slice(
  marketingSource.indexOf('const handleGenerateWebsite'),
  marketingSource.indexOf('return (', marketingSource.indexOf('function MarketingWebsite')),
);
assert.ok(
  marketingWebsiteHandler.includes('createWorkspaceCampaign') &&
    marketingWebsiteHandler.includes('createMarketingLeadHandoff') &&
    createsGenerationJob(marketingWebsiteHandler) &&
    marketingWebsiteHandler.includes('updateGenerationJob') &&
    marketingWebsiteHandler.includes('createWorkspaceAsset') &&
    marketingWebsiteHandler.includes('createPricedWorkspaceUsageEvent') &&
    marketingWebsiteHandler.includes("kind: 'generation'") &&
    marketingWebsiteHandler.includes("moduleId: 'marketing_website'") &&
    marketingWebsiteHandler.includes('generation_job_start') &&
    marketingWebsiteHandler.includes('generation_job_complete') &&
    marketingWebsiteHandler.includes('asset_create'),
  'MarketingView website generation flow should persist campaign page jobs, CRM leads, follow-up tasks, assets, usage, and audit events',
);

const directorDeskSource = readFileSync('src/components/DirectorDeskView.tsx', 'utf8');
assert.ok(
  directorDeskSource.includes('../saas/SaasAuthContext') &&
    directorDeskSource.includes('../lib/data/assetRepository') &&
    directorDeskSource.includes('../lib/data/auditLogRepository') &&
    directorDeskSource.includes('../lib/data/usageRepository') &&
    directorDeskSource.includes('createPricedWorkspaceUsageEvent') &&
    directorDeskSource.includes('../lib/data/taskRepository') &&
    directorDeskSource.includes('./Toast') &&
    directorDeskSource.includes('GenerationFailureRecoveryPanel') &&
    directorDeskSource.includes('createWorkspaceAsset') &&
    directorDeskSource.includes('createPricedWorkspaceUsageEvent') &&
    directorDeskSource.includes('createWorkspaceTask') &&
    directorDeskSource.includes('asset_create') &&
    directorDeskSource.includes('task_create') &&
    directorDeskSource.includes('director_shot_parameter_reset') &&
    directorDeskSource.includes('director_asset_version_update') &&
    directorDeskSource.includes('director_consistency_check') &&
    directorDeskSource.includes('director_storyboard_fix_apply') &&
    directorDeskSource.includes('director_script_split') &&
    directorDeskSource.includes("moduleId: 'director_desk'"),
  'DirectorDeskView should persist director assets, usage, and audit shot, storyboard, and script workflows',
);
const directorAssetVersionHandler = directorDeskSource.slice(
  directorDeskSource.indexOf('const updateLibraryAssetVersion'),
  directorDeskSource.indexOf('const updateBoundAssetVersion'),
);
assert.ok(
  directorAssetVersionHandler.includes('createWorkspaceAsset') &&
    directorAssetVersionHandler.includes('createPricedWorkspaceUsageEvent') &&
    directorAssetVersionHandler.includes("kind: 'automation'") &&
    directorAssetVersionHandler.includes("moduleId: 'director_desk'") &&
    directorAssetVersionHandler.includes('director_asset_version_update'),
  'DirectorDeskView asset version updates should save assets, record usage, and audit the update',
);
const directorConsistencyHandler = directorDeskSource.slice(
  directorDeskSource.indexOf('const runConsistencyCheck'),
  directorDeskSource.indexOf('const applyFix'),
);
assert.ok(
  directorConsistencyHandler.includes('createPricedWorkspaceUsageEvent') &&
    directorConsistencyHandler.includes('createWorkspaceTask') &&
    directorConsistencyHandler.includes("kind: 'automation'") &&
    directorConsistencyHandler.includes("moduleId: 'director_desk'") &&
    directorConsistencyHandler.includes('task_create') &&
    directorConsistencyHandler.includes('director_consistency_check'),
  'DirectorDeskView consistency checks should record billable automation usage, create follow-up tasks, and audit results',
);
const directorStoryboardFixHandler = directorDeskSource.slice(
  directorDeskSource.indexOf('const applyFix'),
  directorDeskSource.indexOf('return (', directorDeskSource.indexOf('function StoryboardView')),
);
assert.ok(
  directorStoryboardFixHandler.includes('createWorkspaceAsset') &&
    directorStoryboardFixHandler.includes('createPricedWorkspaceUsageEvent') &&
    directorStoryboardFixHandler.includes('createWorkspaceTask') &&
    directorStoryboardFixHandler.includes("kind: 'generation'") &&
    directorStoryboardFixHandler.includes("moduleId: 'director_desk'") &&
    directorStoryboardFixHandler.includes('task_create') &&
    directorStoryboardFixHandler.includes('director_storyboard_fix_apply'),
  'DirectorDeskView storyboard fixes should create generated assets, record usage, create review tasks, and audit the fix',
);
const directorScriptSplitHandler = directorDeskSource.slice(
  directorDeskSource.indexOf('const handleAutoSplit'),
  directorDeskSource.indexOf('return (', directorDeskSource.indexOf('function ScriptView')),
);
assert.ok(
  directorScriptSplitHandler.includes('createWorkspaceAsset') &&
    directorScriptSplitHandler.includes('createPricedWorkspaceUsageEvent') &&
    directorScriptSplitHandler.includes('createWorkspaceTask') &&
    directorScriptSplitHandler.includes("kind: 'generation'") &&
    directorScriptSplitHandler.includes("moduleId: 'director_desk'") &&
    directorScriptSplitHandler.includes('task_create') &&
    directorScriptSplitHandler.includes('director_script_split'),
  'DirectorDeskView script split should create text assets, record usage, create production tasks, and audit segmentation',
);
assert.equal(
  directorDeskSource.includes('alert('),
  false,
  'DirectorDeskView should not use alert-only shot parameter actions',
);
assert.equal(
  directorDeskSource.includes('setTimeout(') || directorDeskSource.includes('Simulate'),
  false,
  'DirectorDeskView should not use timer-based or simulated director workflow placeholders',
);

const eCommerceSource = readFileSync('src/components/ECommerceView.tsx', 'utf8');
assert.ok(
    eCommerceSource.includes('../saas/SaasAuthContext') &&
    eCommerceSource.includes('../lib/data/generationJobRepository') &&
    eCommerceSource.includes('../lib/data/assetRepository') &&
    eCommerceSource.includes('../lib/data/auditLogRepository') &&
    eCommerceSource.includes('../lib/data/usageRepository') &&
    eCommerceSource.includes('createPricedWorkspaceUsageEvent') &&
    eCommerceSource.includes('listGenerationJobs') &&
    createsGenerationJob(eCommerceSource) &&
    eCommerceSource.includes('failGenerationJob') &&
    eCommerceSource.includes('GenerationFailureRecoveryPanel') &&
    eCommerceSource.includes('updateGenerationJob') &&
    eCommerceSource.includes('createWorkspaceAsset') &&
    eCommerceSource.includes('createPricedWorkspaceUsageEvent') &&
    eCommerceSource.includes('generation_job_start') &&
    eCommerceSource.includes('generation_job_complete') &&
    eCommerceSource.includes('generation_job_failed'),
  'ECommerceView should persist generation jobs, assets, usage, audit lifecycle events, and failed-job recovery hooks',
);
assert.equal(
  eCommerceSource.includes('mockHistory') ||
    eCommerceSource.includes('Mock Gemini') ||
    eCommerceSource.includes('Mock generated social copy'),
  false,
  'ECommerceView should not use mock history or mock Gemini generation placeholders',
);
assert.ok(
  eCommerceSource.includes('recordWorkspaceAssetExport') &&
    eCommerceSource.includes("pricingAction: 'export'") &&
    eCommerceSource.includes("kind: 'export'") &&
    eCommerceSource.includes('format') &&
    eCommerceSource.includes('fileName') &&
    eCommerceSource.includes('sourceAction'),
  'ECommerceView should audit and meter exported commerce outputs with standardized asset export metadata',
);
const eCommerceSeoHandler = eCommerceSource.slice(
  eCommerceSource.indexOf('const handleGenerateSeo'),
  eCommerceSource.indexOf('const isImgMethod'),
);
const eCommerceGenerateHandler = eCommerceSource.slice(
  eCommerceSource.indexOf('const handleGenerate'),
  eCommerceSource.indexOf('const handleGenerateSeo'),
);
assert.ok(
  createsGenerationJob(eCommerceGenerateHandler) &&
    eCommerceGenerateHandler.includes('updateGenerationJob') &&
    eCommerceGenerateHandler.includes('createWorkspaceAsset') &&
    eCommerceGenerateHandler.includes('createPricedWorkspaceUsageEvent') &&
    eCommerceGenerateHandler.includes("kind: 'generation'") &&
    eCommerceGenerateHandler.includes('generation_job_start') &&
    eCommerceGenerateHandler.includes('generation_job_complete') &&
    eCommerceGenerateHandler.includes('asset_create'),
  'ECommerceView main generation should create jobs, persist generated assets, record usage, and audit lifecycle events',
);
assert.equal(
  eCommerceGenerateHandler.includes('setInterval('),
  false,
  'ECommerceView main generation should not use interval-based progress placeholders',
);
assert.ok(
  createsGenerationJob(eCommerceSeoHandler) &&
    eCommerceSeoHandler.includes('updateGenerationJob') &&
    eCommerceSeoHandler.includes('createWorkspaceAsset') &&
    eCommerceSeoHandler.includes('createPricedWorkspaceUsageEvent') &&
    eCommerceSeoHandler.includes("kind: 'generation'") &&
    eCommerceSeoHandler.includes('generation_job_start') &&
    eCommerceSeoHandler.includes('generation_job_complete') &&
    eCommerceSeoHandler.includes('seo_metadata') &&
    eCommerceSeoHandler.includes("type: 'text'"),
  'ECommerceView SEO generation should persist SEO metadata jobs, text assets, usage, and audit lifecycle events',
);
assert.equal(
  eCommerceSeoHandler.includes('setTimeout('),
  false,
  'ECommerceView SEO generation should not use a timer-based placeholder',
);

const copywritingSource = readFileSync('src/components/CopywritingView.tsx', 'utf8');
assert.ok(
    copywritingSource.includes('../saas/SaasAuthContext') &&
    copywritingSource.includes('../lib/data/generationJobRepository') &&
    copywritingSource.includes('../lib/data/assetRepository') &&
    copywritingSource.includes('../lib/data/keywordRepository') &&
    copywritingSource.includes('../lib/data/auditLogRepository') &&
    copywritingSource.includes('../lib/data/usageRepository') &&
    createsGenerationJob(copywritingSource) &&
    copywritingSource.includes('updateGenerationJob') &&
    copywritingSource.includes('createWorkspaceAsset') &&
    copywritingSource.includes('createPricedWorkspaceUsageEvent') &&
    copywritingSource.includes("kind: 'generation'") &&
    copywritingSource.includes('generation_job_start') &&
    copywritingSource.includes('generation_job_complete') &&
    copywritingSource.includes("moduleId: 'copywriting_create'"),
  'CopywritingView should persist copy generation jobs, text assets, usage, and audit lifecycle events',
);
assert.ok(
  copywritingSource.includes('loadWorkspaceKeywordLibraries') &&
    copywritingSource.includes('createWorkspaceKeywordLibrary') &&
    copywritingSource.includes('updateWorkspaceKeywordLibrary') &&
    copywritingSource.includes('archiveWorkspaceKeywordLibrary') &&
    copywritingSource.includes('searchWorkspaceKeywordLibraries') &&
    copywritingSource.includes('workspace_keyword_libraries_updated') &&
    copywritingSource.includes('copywriting_keyword_create') &&
    copywritingSource.includes('copywriting_keyword_update') &&
    copywritingSource.includes('copywriting_keyword_archive'),
  'CopywritingView keyword library should persist workspace CRUD/search actions and audit lifecycle events',
);
assert.equal(
  copywritingSource.includes('// Simulate generation') ||
    copywritingSource.includes('}, 1500);'),
  false,
  'CopywritingView should not use timer-based copy generation placeholders',
);
assert.ok(
  copywritingSource.includes('recordWorkspaceAssetExport') &&
    copywritingSource.includes("pricingAction: 'export'") &&
    copywritingSource.includes("kind: 'export'") &&
    copywritingSource.includes('format') &&
    copywritingSource.includes('fileName') &&
    copywritingSource.includes('sourceAction'),
  'CopywritingView should audit and meter exported copy outputs with standardized asset export metadata',
);

const imageCreationSource = readFileSync('src/components/ImageCreationView.tsx', 'utf8');
assert.ok(
    imageCreationSource.includes('../saas/SaasAuthContext') &&
    imageCreationSource.includes('../lib/data/generationJobRepository') &&
    imageCreationSource.includes('../lib/data/assetRepository') &&
    imageCreationSource.includes('../lib/data/auditLogRepository') &&
    imageCreationSource.includes('../lib/data/usageRepository') &&
    imageCreationSource.includes('createPricedWorkspaceUsageEvent') &&
    createsGenerationJob(imageCreationSource) &&
    imageCreationSource.includes('failGenerationJob') &&
    imageCreationSource.includes('updateGenerationJob') &&
    imageCreationSource.includes('createWorkspaceAsset') &&
    imageCreationSource.includes('createPricedWorkspaceUsageEvent') &&
    imageCreationSource.includes("kind: 'generation'") &&
    imageCreationSource.includes('generation_job_start') &&
    imageCreationSource.includes('generation_job_complete') &&
    imageCreationSource.includes('generation_job_failed') &&
    imageCreationSource.includes('GenerationFailureRecoveryPanel') &&
    imageCreationSource.includes("moduleId: 'image'"),
  'ImageCreationView should persist image generation jobs, assets, usage, audit lifecycle events, and failed-job recovery hooks',
);
assert.equal(
  imageCreationSource.includes('setTimeout('),
  false,
  'ImageCreationView should not use timer-based image generation placeholders',
);
assert.ok(
  imageCreationSource.includes('recordWorkspaceAssetExport') &&
    imageCreationSource.includes("pricingAction: 'export'") &&
    imageCreationSource.includes("kind: 'export'") &&
    imageCreationSource.includes('format') &&
    imageCreationSource.includes('fileName') &&
    imageCreationSource.includes('sourceAction'),
  'ImageCreationView should audit and meter exported image outputs with standardized asset export metadata',
);

const imageEditorSource = readFileSync('src/components/ImageEditorView.tsx', 'utf8');
assert.ok(
  imageEditorSource.includes('../saas/SaasAuthContext') &&
    imageEditorSource.includes('../lib/data/generationJobRepository') &&
    imageEditorSource.includes('../lib/data/assetRepository') &&
    imageEditorSource.includes('../lib/data/auditLogRepository') &&
    imageEditorSource.includes('../lib/data/usageRepository') &&
    createsGenerationJob(imageEditorSource) &&
    imageEditorSource.includes('updateGenerationJob') &&
    imageEditorSource.includes('createWorkspaceAsset') &&
    imageEditorSource.includes('createPricedWorkspaceUsageEvent') &&
    imageEditorSource.includes('logAuditEvent') &&
    imageEditorSource.includes('generation_job_start') &&
    imageEditorSource.includes('generation_job_complete') &&
    imageEditorSource.includes('asset_create') &&
    imageEditorSource.includes("moduleId: 'ai_image_edit'"),
  'ImageEditorView should persist image editing jobs, assets, usage, and audit lifecycle events',
);
const imageEditorUploadHandler = imageEditorSource.slice(
  imageEditorSource.indexOf('const handleUpload'),
  imageEditorSource.indexOf('const handleApplyTool'),
);
assert.ok(
  imageEditorUploadHandler.includes('createWorkspaceAsset') &&
    imageEditorUploadHandler.includes('asset_create') &&
    imageEditorUploadHandler.includes("moduleId: 'ai_image_edit'"),
  'ImageEditorView uploads should create workspace image assets and audit asset creation',
);
assert.equal(
  imageEditorUploadHandler.includes('setTimeout('),
  false,
  'ImageEditorView upload should not use a timer-based placeholder',
);
const imageEditorApplyHandler = imageEditorSource.slice(
  imageEditorSource.indexOf('const handleApplyTool'),
  imageEditorSource.indexOf('return (', imageEditorSource.indexOf('const handleApplyTool')),
);
assert.ok(
    createsGenerationJob(imageEditorApplyHandler) &&
    imageEditorApplyHandler.includes('updateGenerationJob') &&
    imageEditorApplyHandler.includes('createWorkspaceAsset') &&
    imageEditorApplyHandler.includes('createPricedWorkspaceUsageEvent') &&
    imageEditorApplyHandler.includes("kind: 'generation'") &&
    imageEditorApplyHandler.includes('generation_job_start') &&
    imageEditorApplyHandler.includes('generation_job_complete') &&
    imageEditorApplyHandler.includes('asset_create') &&
    imageEditorApplyHandler.includes("moduleId: 'ai_image_edit'"),
  'ImageEditorView tool application should create jobs, persist edited image assets, record usage, and audit lifecycle events',
);
assert.equal(
  imageEditorApplyHandler.includes('setTimeout('),
  false,
  'ImageEditorView tool application should not use a timer-based placeholder',
);

const videoCreationSource = readFileSync('src/components/VideoCreationView.tsx', 'utf8');
assert.ok(
    videoCreationSource.includes('../saas/SaasAuthContext') &&
    videoCreationSource.includes('../lib/data/generationJobRepository') &&
    videoCreationSource.includes('../lib/data/assetRepository') &&
    videoCreationSource.includes('../lib/data/auditLogRepository') &&
    videoCreationSource.includes('../lib/data/usageRepository') &&
    videoCreationSource.includes('createPricedWorkspaceUsageEvent') &&
    createsGenerationJob(videoCreationSource) &&
    videoCreationSource.includes('failGenerationJob') &&
    videoCreationSource.includes('updateGenerationJob') &&
    videoCreationSource.includes('createWorkspaceAsset') &&
    videoCreationSource.includes('createPricedWorkspaceUsageEvent') &&
    videoCreationSource.includes("kind: 'generation'") &&
    videoCreationSource.includes('generation_job_start') &&
    videoCreationSource.includes('generation_job_complete') &&
    videoCreationSource.includes('generation_job_failed') &&
    videoCreationSource.includes('GenerationFailureRecoveryPanel') &&
    videoCreationSource.includes("moduleId: 'video'"),
  'VideoCreationView should persist video generation jobs, assets, usage, audit lifecycle events, and failed-job recovery hooks',
);
assert.equal(
  videoCreationSource.includes('setTimeout('),
  false,
  'VideoCreationView should not use timer-based video generation placeholders',
);
assert.ok(
  videoCreationSource.includes('recordWorkspaceAssetExport') &&
    videoCreationSource.includes("pricingAction: 'export'") &&
    videoCreationSource.includes("kind: 'export'") &&
    videoCreationSource.includes('format') &&
    videoCreationSource.includes('fileName') &&
    videoCreationSource.includes('sourceAction'),
  'VideoCreationView should audit and meter exported video outputs with standardized asset export metadata',
);

const speechSource = readFileSync('src/components/SpeechView.tsx', 'utf8');
assert.ok(
  speechSource.includes('../saas/SaasAuthContext') &&
    speechSource.includes('../lib/data/generationJobRepository') &&
    speechSource.includes('../lib/data/assetRepository') &&
    speechSource.includes('../lib/data/auditLogRepository') &&
    speechSource.includes('../lib/data/usageRepository') &&
    speechSource.includes('createPricedWorkspaceUsageEvent') &&
    createsGenerationJob(speechSource) &&
    speechSource.includes('failGenerationJob') &&
    speechSource.includes('updateGenerationJob') &&
    speechSource.includes('createWorkspaceAsset') &&
    speechSource.includes('createPricedWorkspaceUsageEvent') &&
    speechSource.includes("kind: 'generation'") &&
    speechSource.includes('generation_job_start') &&
    speechSource.includes('generation_job_complete') &&
    speechSource.includes('generation_job_failed') &&
    speechSource.includes('GenerationFailureRecoveryPanel') &&
    speechSource.includes("moduleId: 'speech'") &&
    speechSource.includes("type: 'audio'"),
  'SpeechView should persist speech generation jobs, audio assets, usage, audit lifecycle events, and failed-job recovery hooks',
);
assert.equal(
  speechSource.includes('setTimeout('),
  false,
  'SpeechView should not use timer-based speech synthesis placeholders',
);

const chatSource = readFileSync('src/components/ChatView.tsx', 'utf8');
assert.ok(
  chatSource.includes('../saas/SaasAuthContext') &&
    chatSource.includes('../lib/data/generationJobRepository') &&
    chatSource.includes('../lib/data/assetRepository') &&
    chatSource.includes('../lib/data/auditLogRepository') &&
    chatSource.includes('../lib/data/usageRepository') &&
    createsGenerationJob(chatSource) &&
    chatSource.includes('updateGenerationJob') &&
    chatSource.includes('createWorkspaceAsset') &&
    chatSource.includes('createPricedWorkspaceUsageEvent') &&
    chatSource.includes("kind: 'generation'") &&
    chatSource.includes('generation_job_start') &&
    chatSource.includes('generation_job_complete') &&
    chatSource.includes("moduleId: 'chat'") &&
    chatSource.includes("type: 'text'"),
  'ChatView should persist assistant reply jobs, text assets, usage, and audit lifecycle events',
);
const chatSendHandler = chatSource.slice(
  chatSource.indexOf('const handleSend'),
  chatSource.indexOf('const handleMockUpload'),
);
assert.equal(
  chatSource.includes('generateTimeoutRef') ||
    chatSource.includes('Simulate network delay') ||
    chatSource.includes('setTimeout(') ||
    chatSendHandler.includes('setInterval(') ||
    chatSendHandler.includes('streamIntervalRef'),
  false,
  'ChatView should not use timer-based assistant response placeholders',
);

const financeSource = readFileSync('src/components/FinanceView.tsx', 'utf8');
assert.ok(
  financeSource.includes('../saas/SaasAuthContext') &&
    financeSource.includes('../lib/data/financialRepository') &&
    financeSource.includes('../lib/data/taskRepository') &&
    financeSource.includes('../lib/data/auditLogRepository') &&
    financeSource.includes('loadWorkspaceFinancialRecords') &&
    financeSource.includes('summarizeWorkspaceFinancials') &&
    financeSource.includes('buildDailyRevenueSeries') &&
    financeSource.includes('buildWorkspaceInvoices') &&
    financeSource.includes('createWorkspaceTask') &&
    financeSource.includes('loadWorkspaceTasks'),
  'FinanceView should derive reports, charts, and invoices from persisted financial records',
);
assert.ok(
  financeSource.includes('financial_report_export') &&
    financeSource.includes('financial_risk_audit') &&
    financeSource.includes('finance_compliance_task_sync') &&
    financeSource.includes('logAuditEvent') &&
    financeSource.includes("moduleId: 'finance'"),
  'FinanceView report and audit actions should be written to the audit log',
);
assert.equal(
  financeSource.includes('SYNC_CRM_TASKS'),
  false,
  'FinanceView should create compliance tasks through taskRepository instead of dispatching legacy CRM sync events',
);
assert.equal(
  financeSource.includes('setTimeout('),
  false,
  'FinanceView should not use timer-based report or risk audit placeholders',
);

const taxSimulatorSource = readFileSync('src/components/TaxSimulator.tsx', 'utf8');
assert.ok(
  taxSimulatorSource.includes('../saas/SaasAuthContext') &&
    taxSimulatorSource.includes('../lib/data/auditLogRepository') &&
    taxSimulatorSource.includes('tax_simulation_run') &&
    taxSimulatorSource.includes('logAuditEvent') &&
    taxSimulatorSource.includes("moduleId: 'tax'"),
  'TaxSimulator should audit tax scenario simulations through SaaS repositories',
);
assert.equal(
  taxSimulatorSource.includes('setTimeout('),
  false,
  'TaxSimulator should not use timer-based tax simulation placeholders',
);

const taxReconciliationSource = readFileSync('src/components/TaxReconciliationTool.tsx', 'utf8');
assert.ok(
  taxReconciliationSource.includes('../saas/SaasAuthContext') &&
    taxReconciliationSource.includes('../lib/data/financialRepository') &&
    taxReconciliationSource.includes('../lib/data/auditLogRepository') &&
    taxReconciliationSource.includes('loadWorkspaceFinancialRecords') &&
    taxReconciliationSource.includes('saveWorkspaceFinancialRecords') &&
    taxReconciliationSource.includes('listAuditLogs') &&
    taxReconciliationSource.includes('logAuditEvent'),
  'TaxReconciliationTool should reconcile persisted workspace financial records and audit actions',
);
assert.ok(
  taxReconciliationSource.includes('tax_reconciliation_scan') &&
    taxReconciliationSource.includes('tax_reconciliation_resolve'),
  'TaxReconciliationTool should audit reconciliation scans and resolutions',
);
assert.equal(
  taxReconciliationSource.includes('mockLedgerItems') ||
    taxReconciliationSource.includes('setTimeout('),
  false,
  'TaxReconciliationTool should not use mock ledger rows or timer-based reconciliation placeholders',
);

assert.ok(
  existsSync('src/lib/data/taxEventRepository.ts'),
  'taxEventRepository should persist workspace tax calendar events',
);
const taxEventRepositorySource = readFileSync('src/lib/data/taxEventRepository.ts', 'utf8');
assert.ok(
  taxEventRepositorySource.includes('TAX_EVENT_STORAGE_PREFIX') &&
    taxEventRepositorySource.includes('loadWorkspaceTaxEvents') &&
    taxEventRepositorySource.includes('saveWorkspaceTaxEvents') &&
    taxEventRepositorySource.includes('seedWorkspaceTaxEvents'),
  'taxEventRepository should expose workspace-scoped tax event storage helpers',
);

const fiscalCalendarSource = readFileSync('src/components/FiscalCalendarView.tsx', 'utf8');
assert.ok(
  fiscalCalendarSource.includes('../saas/SaasAuthContext') &&
    fiscalCalendarSource.includes('../lib/data/taxEventRepository') &&
    fiscalCalendarSource.includes('loadWorkspaceTaxEvents') &&
    fiscalCalendarSource.includes('seedWorkspaceTaxEvents') &&
    fiscalCalendarSource.includes('../lib/data/taskRepository') &&
    fiscalCalendarSource.includes('createWorkspaceTask'),
  'FiscalCalendarView should load persisted workspace tax events and sync selected events through taskRepository',
);
assert.equal(
  fiscalCalendarSource.includes('generateMockEvents') ||
    fiscalCalendarSource.includes('MOCK_EVENTS'),
  false,
  'FiscalCalendarView should not generate or export mock tax events',
);

const taxViewSource = readFileSync('src/components/TaxView.tsx', 'utf8');
assert.ok(
  taxViewSource.includes('../saas/SaasAuthContext') &&
    taxViewSource.includes('../lib/data/auditLogRepository') &&
    taxViewSource.includes('../lib/data/taxEventRepository') &&
    taxViewSource.includes('seedWorkspaceTaxEvents') &&
    taxViewSource.includes('logAuditEvent') &&
    taxViewSource.includes("moduleId: 'tax'"),
  'TaxView should write tax workspace actions to the SaaS audit log from persisted tax events',
);
for (const action of [
  'tax_deadline_reminder',
  'tax_audit_export',
  'tax_calculation_run',
  'tax_document_parse',
  'tax_compliance_doc_generate',
]) {
  assert.ok(taxViewSource.includes(action), `TaxView should audit ${action}`);
}
assert.equal(
  taxViewSource.includes('setTimeout(') ||
    taxViewSource.includes('MOCK_EVENTS') ||
    taxViewSource.includes('generateMockEvents'),
  false,
  'TaxView should not use timer-based or mock tax workflow placeholders',
);

const crmSource = readFileSync('src/components/CrmView.tsx', 'utf8');
assert.ok(
  crmSource.includes('../saas/SaasAuthContext') &&
    crmSource.includes('../lib/data/taskRepository') &&
    crmSource.includes('../lib/data/customerRepository') &&
    crmSource.includes('../lib/data/auditLogRepository') &&
    crmSource.includes('createWorkspaceTask') &&
    crmSource.includes('loadWorkspaceTasks') &&
    crmSource.includes('loadWorkspaceCustomers') &&
    crmSource.includes('workspace_customers_updated'),
  'CrmView should persist follow-up work and load CRM customers through SaaS repositories',
);
assert.ok(
  crmSource.includes('crm_followup_task_sync') &&
    crmSource.includes('crm_email_draft_generate') &&
    crmSource.includes('crm_summary_generate') &&
    crmSource.includes('crm_customer_export') &&
    crmSource.includes('logAuditEvent') &&
    crmSource.includes("moduleId: 'crm'"),
  'CrmView customer exports, AI drafts, summaries, and follow-up sync should be audited',
);
assert.ok(
  crmSource.includes('Campaign Source') &&
    crmSource.includes('campaignId') &&
    crmSource.includes('campaignName') &&
    crmSource.includes('sourceChannel') &&
    crmSource.includes('landingPage') &&
    crmSource.includes('touchpoint'),
  'CrmView should display and export campaign source metadata for marketing-created CRM leads',
);
assert.equal(
  crmSource.includes('setTimeout('),
  false,
  'CrmView should not use timer-based CRM generation or follow-up placeholders',
);

const customerInsightsSource = readFileSync('src/components/CustomerInsights.tsx', 'utf8');
assert.ok(
  customerInsightsSource.includes('../saas/SaasAuthContext') &&
    customerInsightsSource.includes('../lib/data/auditLogRepository') &&
    customerInsightsSource.includes('crm_survey_send') &&
    customerInsightsSource.includes('logAuditEvent') &&
    customerInsightsSource.includes("moduleId: 'crm'"),
  'CustomerInsights CSAT surveys should be written to the SaaS audit log',
);
assert.equal(
  customerInsightsSource.includes('setTimeout('),
  false,
  'CustomerInsights CSAT survey send should not use a timer-based placeholder',
);

const taskCenterSource = readFileSync('src/components/TaskCenter.tsx', 'utf8');
assert.ok(
  taskCenterSource.includes('../lib/data/taskRepository') &&
    taskCenterSource.includes('tasks_updated') &&
    taskCenterSource.includes('loadWorkspaceTasks'),
  'TaskCenter should render workspace tasks through taskRepository updates',
);
assert.equal(
  taskCenterSource.includes('SYNC_CRM_TASKS'),
  false,
  'TaskCenter should not listen for legacy CRM sync events',
);

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

const financeMeetingAssistantSource = readFileSync('src/components/FinanceMeetingAssistant.tsx', 'utf8');
assert.ok(
  financeMeetingAssistantSource.includes('../saas/SaasAuthContext') &&
    financeMeetingAssistantSource.includes('../lib/data/taskRepository') &&
    financeMeetingAssistantSource.includes('../lib/data/auditLogRepository') &&
    financeMeetingAssistantSource.includes('createWorkspaceTask') &&
    financeMeetingAssistantSource.includes('logAuditEvent'),
  'FinanceMeetingAssistant should persist meeting action items through SaaS task and audit repositories',
);
assert.ok(
  financeMeetingAssistantSource.includes('finance_meeting_summary_generate') &&
    financeMeetingAssistantSource.includes('finance_compliance_task_sync'),
  'FinanceMeetingAssistant should audit meeting summaries and compliance task syncs',
);
assert.equal(
  financeMeetingAssistantSource.includes('SYNC_CRM_TASKS') ||
    financeMeetingAssistantSource.includes('setTimeout(') ||
    financeMeetingAssistantSource.includes('setInterval(') ||
    financeMeetingAssistantSource.includes('mockPhrases'),
  false,
  'FinanceMeetingAssistant should not use legacy CRM sync events or timer-based/mock transcript placeholders',
);

const topbarSource = readFileSync('src/components/Topbar.tsx', 'utf8');
assert.ok(
  topbarSource.includes('../saas/SaasAuthContext') &&
    topbarSource.includes('../lib/data/auditLogRepository') &&
    topbarSource.includes('../lib/data/generationJobRepository') &&
    topbarSource.includes('../lib/data/offlineQueueRepository') &&
    topbarSource.includes('listAuditLogs') &&
    topbarSource.includes('listGenerationJobs') &&
    topbarSource.includes('loadOfflineQueue') &&
    topbarSource.includes('generation_jobs_updated') &&
    topbarSource.includes('offlineQueueUpdated'),
  'Topbar inbox should derive notifications from persisted workspace activity instead of static rows',
);
assert.equal(
  topbarSource.includes('mockNotifications') ||
    topbarSource.includes('Payment Failed') ||
    topbarSource.includes('Build Successfully') ||
    topbarSource.includes('Team Sync'),
  false,
  'Topbar inbox should not render static mock notifications',
);

const globalSearchSource = readFileSync('src/components/GlobalSearchOverlay.tsx', 'utf8');
assert.ok(
  globalSearchSource.includes('../hooks/useWorkspaceAssets') &&
    globalSearchSource.includes('assets.filter') &&
    globalSearchSource.includes('asset.name') &&
    globalSearchSource.includes('asset.tags'),
  'GlobalSearchOverlay should search persisted workspace assets',
);
assert.equal(
  globalSearchSource.includes('mock-asset-') ||
    globalSearchSource.includes('Brand Kit Logo (Q3)') ||
    globalSearchSource.includes('Spring Marketing Video'),
  false,
  'GlobalSearchOverlay should not render static mock asset results',
);

assert.ok(
  assetsSource.includes('asset_manifest.json') &&
    assetsSource.includes('downloadUrl') &&
    assetsSource.includes('metadata.json'),
  'AssetsView bulk downloads should export real workspace asset metadata bundles',
);
assert.equal(
  assetsSource.includes('Mock file content'),
  false,
  'AssetsView bulk downloads should not write mock content into ZIP files',
);

const adminSource = readFileSync('src/components/AdminView.tsx', 'utf8');
assert.equal(
  adminSource.includes('setTimeout('),
  false,
  'AdminView should not use timer-based admin operation placeholders',
);
const adminShellStart = adminSource.indexOf('export function AdminView');
const adminShellEnd = adminSource.indexOf('function AdminDatabase');
const adminShellSource = adminShellStart >= 0 && adminShellEnd > adminShellStart
  ? adminSource.slice(adminShellStart, adminShellEnd)
  : adminSource;
const adminDashboardStart = adminSource.indexOf('function AdminDashboard');
const adminDashboardEnd = adminSource.indexOf('function AdminSettings');
const adminDashboardSource = adminDashboardStart >= 0 && adminDashboardEnd > adminDashboardStart
  ? adminSource.slice(adminDashboardStart, adminDashboardEnd)
  : adminSource;
const adminSettingsStart = adminSource.indexOf('function AdminSettings');
const adminSettingsEnd = adminSource.indexOf('const WORKSPACE_ROLE_ORDER');
const adminSettingsSource = adminSettingsStart >= 0 && adminSettingsEnd > adminSettingsStart
  ? adminSource.slice(adminSettingsStart, adminSettingsEnd)
  : adminSource;
const adminMembersStart = adminSource.indexOf('const MEMBER_BULK_HISTORY_SETTING_KEY');
const adminMembersEnd = adminSource.indexOf('function AdminRoles');
const adminMembersSource = adminMembersStart >= 0 && adminMembersEnd > adminMembersStart
  ? adminSource.slice(adminMembersStart, adminMembersEnd)
  : adminSource;
const adminProvidersStart = adminSource.indexOf('function AdminProviders');
const adminProvidersEnd = adminSource.indexOf('function AdminAssets');
const adminProvidersSource = adminProvidersStart >= 0 && adminProvidersEnd > adminProvidersStart
  ? adminSource.slice(adminProvidersStart, adminProvidersEnd)
  : adminSource;
const adminSalesStart = adminSource.indexOf('function AdminSales');
const adminSalesEnd = adminSource.indexOf('function AdminAnnouncements');
const adminSalesSource = adminSalesStart >= 0 && adminSalesEnd > adminSalesStart
  ? adminSource.slice(adminSalesStart, adminSalesEnd)
  : adminSource;
const adminDatabaseStart = adminSource.indexOf('function AdminDatabase');
const adminDatabaseEnd = adminSource.indexOf('function AdminDashboard');
const adminDatabaseSource = adminDatabaseStart >= 0 && adminDatabaseEnd > adminDatabaseStart
  ? adminSource.slice(adminDatabaseStart, adminDatabaseEnd)
  : adminSource;
const adminAnnouncementsStart = adminSource.indexOf('function AdminAnnouncements');
const adminAnnouncementsEnd = adminSource.indexOf('function AdminPlugins');
const adminAnnouncementsSource = adminAnnouncementsStart >= 0 && adminAnnouncementsEnd > adminAnnouncementsStart
  ? adminSource.slice(adminAnnouncementsStart, adminAnnouncementsEnd)
  : adminSource;
const adminPluginsStart = adminSource.indexOf('function AdminPlugins');
const adminPluginsEnd = adminSource.indexOf('function AdminLogs');
const adminPluginsSource = adminPluginsStart >= 0 && adminPluginsEnd > adminPluginsStart
  ? adminSource.slice(adminPluginsStart, adminPluginsEnd)
  : adminSource;
const adminTicketsStart = adminSource.indexOf('function AdminTickets');
const adminTicketsEnd = adminSource.indexOf('function AdminAgency');
const adminTicketsSource = adminTicketsStart >= 0 && adminTicketsEnd > adminTicketsStart
  ? adminSource.slice(adminTicketsStart, adminTicketsEnd)
  : adminSource;
const adminAgencyStart = adminSource.indexOf('function AdminAgency');
const adminAgencyEnd = adminSource.indexOf('function AdminRisk');
const adminAgencySource = adminAgencyStart >= 0 && adminAgencyEnd > adminAgencyStart
  ? adminSource.slice(adminAgencyStart, adminAgencyEnd)
  : adminSource;
const riskCenterSource = readFileSync('src/components/RiskCenterView.tsx', 'utf8');
const pluginCenterSource = readFileSync('src/components/PluginCenterView.tsx', 'utf8');
const permissionsSource = readFileSync('src/saas/permissions.ts', 'utf8');
const adminMediaStart = adminSource.indexOf('function AdminMedia');
const adminMediaEnd = adminSource.indexOf('function AdminSaasPlans');
const adminMediaSource = adminMediaStart >= 0 && adminMediaEnd > adminMediaStart
  ? adminSource.slice(adminMediaStart, adminMediaEnd)
  : adminSource;
assert.ok(
  adminSource.includes('../lib/data/workspaceMemberRepository'),
  'AdminView should manage workspace members through workspaceMemberRepository',
);
assert.ok(adminSource.includes('ROLE_PERMISSIONS'), 'AdminView roles should derive from the canonical role matrix');
assert.ok(adminSource.includes('hasWorkspacePermission'), 'AdminView role simulation should use permission checks');
assert.equal(
  adminSource.includes("id: 'manager'") || adminSource.includes("id: 'contributor'"),
  false,
  'AdminView should not expose legacy manager/contributor mock roles',
);
assert.equal(
  adminSource.includes('mockUsers'),
  false,
  'AdminView members should not render from a static mockUsers array',
);
assert.ok(
  adminMembersSource.includes('loadSettings') &&
    adminMembersSource.includes('saveSettings') &&
    adminMembersSource.includes('settings_updated'),
  'AdminView member bulk-operation history should persist through settingsRepository',
);
assert.equal(
  adminMembersSource.includes('Seeded demo workspace members') ||
    adminMembersSource.includes("time: 'Initial'") ||
    adminMembersSource.includes("time: 'Just now'"),
  false,
  'AdminView member bulk-operation history should not use static seed rows or transient timestamps',
);
assert.ok(
  adminShellSource.includes('loadWorkspaceProviders') &&
    adminShellSource.includes('workspace_providers_updated'),
  'AdminView shell should derive sidebar cluster status from providerRepository',
);
assert.equal(
  adminShellSource.includes('节点 12/12') || adminShellSource.includes('12/12 正常运行'),
  false,
  'AdminView shell should not render a static 12/12 cluster status',
);
assert.ok(adminSource.includes('listAuditLogs'), 'AdminView logs should read audit logs through auditLogRepository');
assert.ok(adminSource.includes('listGenerationJobs'), 'AdminView tasks should read generation jobs through generationJobRepository');
assert.ok(adminSource.includes('loadWorkspaceAssets'), 'AdminView assets should read workspace assets through assetRepository');
assert.ok(
  adminDashboardSource.includes('loadWorkspaceMembers') &&
    adminDashboardSource.includes('listGenerationJobs') &&
    adminDashboardSource.includes('listAuditLogs') &&
    adminDashboardSource.includes('loadWorkspaceTickets') &&
    adminDashboardSource.includes('loadWorkspaceRiskEvents') &&
    adminDashboardSource.includes('loadModuleUsage') &&
    adminDashboardSource.includes('loadWorkspaceProviders'),
  'AdminView dashboard should derive health, activity, usage, and alerts from workspace repositories',
);
assert.ok(
  adminSettingsSource.includes('loadSettings') && adminSettingsSource.includes('saveSettings'),
  'AdminView settings should persist global admin settings through settingsRepository',
);
assert.ok(
  adminSettingsSource.includes('settings_change'),
  'AdminView settings changes should be auditable',
);
assert.ok(
  adminSource.includes('ensureDefaultWorkspaceBillingPlans') && adminSource.includes('updateWorkspaceBillingPlan'),
  'AdminView SaaS plans should persist plan settings through billingRepository',
);
assert.ok(
  adminSource.includes('billing_plan_update'),
  'AdminView SaaS plan changes should be auditable',
);
assert.ok(
  adminSource.includes('../lib/data/providerRepository'),
  'AdminView providers should manage AI providers through providerRepository',
);
assert.ok(
  adminSource.includes('createWorkspaceProvider') &&
    adminSource.includes('updateWorkspaceProvider') &&
    adminSource.includes('setDefaultWorkspaceProvider'),
  'AdminView providers should persist provider create/update/default actions',
);
assert.ok(
  adminSource.includes('provider_config_create') &&
    adminSource.includes('provider_config_update') &&
    adminSource.includes('provider_config_default'),
  'AdminView provider changes should be auditable',
);
assert.ok(
  adminSource.includes('../lib/data/financialRepository'),
  'AdminView sales should read finance records through financialRepository',
);
assert.ok(
  adminSource.includes('loadWorkspaceFinancialRecords') &&
    adminSource.includes('summarizeWorkspaceFinancials') &&
    adminSource.includes('buildDailyRevenueSeries'),
  'AdminView sales should derive metrics and trends from persisted finance records',
);
assert.ok(
  adminSource.includes('financial_report_export'),
  'AdminView sales exports should be auditable',
);
assert.ok(
  adminSource.includes('getDataBackendDescriptor'),
  'AdminView database should read the active data backend descriptor',
);
assert.ok(
  adminDatabaseSource.includes('loadWorkspaceMembers') &&
    adminDatabaseSource.includes('loadWorkspaceAssets') &&
    adminDatabaseSource.includes('listGenerationJobs') &&
    adminDatabaseSource.includes('listAuditLogs'),
  'AdminView database should derive storage health from persisted workspace repositories',
);
assert.ok(
  adminSource.includes('data_snapshot_export'),
  'AdminView database snapshots should be auditable',
);
assert.ok(
  adminSource.includes('../lib/data/announcementRepository'),
  'AdminView announcements should use announcementRepository',
);
assert.ok(
  adminSource.includes('loadWorkspaceAnnouncements') &&
    adminSource.includes('createWorkspaceAnnouncement') &&
    adminSource.includes('updateWorkspaceAnnouncement'),
  'AdminView announcements should persist create and status changes',
);
assert.ok(
  adminSource.includes('announcement_publish') && adminSource.includes('announcement_update'),
  'AdminView announcement changes should be auditable',
);
assert.ok(
  pluginCenterSource.includes('../lib/data/pluginRepository'),
  'PluginCenterView should manage extensions through pluginRepository',
);
assert.ok(
  pluginCenterSource.includes('ensureDefaultWorkspacePlugins') &&
    pluginCenterSource.includes('loadWorkspacePlugins') &&
    pluginCenterSource.includes('updateWorkspacePlugin'),
  'PluginCenterView should persist plugin enablement and configuration',
);
assert.ok(
  pluginCenterSource.includes('plugin_config_update'),
  'PluginCenterView plugin changes should be auditable',
);

// P3-E05: Plugin Center is gated by a pure policy with review states, permission, billing, and audit.
const pluginPolicySource = readFileSync('src/saas/pluginPolicy.ts', 'utf8');
for (const state of ["'hidden'", "'internal'", "'reviewed'", "'enabled'", "'disabled'"]) {
  assert.ok(
    pluginPolicySource.includes(state),
    `pluginPolicy should define the ${state} review state`,
  );
}
assert.ok(
  pluginPolicySource.includes('export function canExecutePlugin') &&
    pluginPolicySource.includes('export function resolvePluginReviewState') &&
    pluginPolicySource.includes('export function isPluginReviewed'),
  'pluginPolicy should expose review-state and execution gating',
);
assert.ok(
  pluginPolicySource.includes("'plugins.manage'"),
  'pluginPolicy should require the plugins.manage permission for lifecycle actions',
);
assert.ok(
  pluginPolicySource.includes('PluginBillingMetadata') && pluginPolicySource.includes('estimatedCreditsPerRun'),
  'pluginPolicy should attach billing metadata for plugin execution',
);
assert.ok(
  adminSource.includes('PluginCenterView'),
  'AdminView plugin tab should render the extracted PluginCenterView',
);
assert.ok(
  pluginCenterSource.includes('canExecutePlugin') &&
    pluginCenterSource.includes('isPluginReviewed') &&
    pluginCenterSource.includes('resolvePluginReviewState'),
  'PluginCenterView should gate execution through pluginPolicy',
);
assert.ok(
  pluginCenterSource.includes('plugin_execute') && pluginCenterSource.includes('plugin_execute_blocked'),
  'PluginCenterView should audit both successful and blocked plugin execution',
);
assert.ok(
  pluginCenterSource.includes("hasWorkspacePermission(role, 'plugins.manage')"),
  'PluginCenterView should gate management actions on plugins.manage',
);
assert.ok(
  permissionsSource.includes("'plugins.manage'") && permissionsSource.includes("'plugin.mutate'"),
  'permissions should define plugins.manage and the plugin.mutate protected action',
);
assert.ok(
  adminSource.includes('../lib/data/ticketRepository'),
  'AdminView tickets should manage support requests through ticketRepository',
);
assert.ok(
  adminSource.includes('ensureDefaultWorkspaceTickets') &&
    adminSource.includes('loadWorkspaceTickets') &&
    adminSource.includes('updateWorkspaceTicket') &&
    adminSource.includes('summarizeWorkspaceTickets'),
  'AdminView tickets should persist ticket status and derive queue metrics',
);
assert.ok(
  adminSource.includes('ticket_update') && adminSource.includes('ticket_export'),
  'AdminView ticket operations should be auditable',
);
assert.ok(
  adminSource.includes('../lib/data/agencyRepository'),
  'AdminView agency should manage affiliate partners through agencyRepository',
);
assert.ok(
  adminSource.includes('ensureDefaultWorkspaceAgencyPartners') &&
    adminSource.includes('loadWorkspaceAgencyPartners') &&
    adminSource.includes('updateWorkspaceAgencyPartner') &&
    adminSource.includes('summarizeWorkspaceAgencyPartners'),
  'AdminView agency should persist affiliate partner payouts and derive performance metrics',
);
assert.ok(
  adminSource.includes('agency_partner_update') && adminSource.includes('agency_payout_export'),
  'AdminView agency operations should be auditable',
);
assert.ok(
  riskCenterSource.includes('../lib/data/riskRepository'),
  'RiskCenterView should manage moderation events through riskRepository',
);
assert.ok(
  riskCenterSource.includes('ensureDefaultWorkspaceRiskEvents') &&
    riskCenterSource.includes('loadWorkspaceRiskEvents') &&
    riskCenterSource.includes('updateWorkspaceRiskEvent') &&
    riskCenterSource.includes('summarizeWorkspaceRiskEvents'),
  'RiskCenterView should persist moderation events and derive queue metrics',
);
assert.ok(
  riskCenterSource.includes('risk_event_review') && riskCenterSource.includes('risk_policy_export'),
  'RiskCenterView operations should be auditable',
);

// P3-E04: Risk Center aggregates real operational signals through a pure policy module.
const riskPolicySource = readFileSync('src/saas/riskPolicy.ts', 'utf8');
assert.ok(
  riskPolicySource.includes('export function assessWorkspaceRisk'),
  'riskPolicy should expose an assessWorkspaceRisk aggregator',
);
for (const category of ["'quota'", "'provider'", "'permission'", "'api_key'", "'runtime'", "'audit'"]) {
  assert.ok(
    riskPolicySource.includes(category),
    `riskPolicy should classify the ${category} signal category`,
  );
}
assert.ok(
  riskCenterSource.includes('assessWorkspaceRisk'),
  'RiskCenterView should derive risk from the riskPolicy aggregator',
);
assert.ok(
  riskCenterSource.includes('calculateBillingUsage') &&
    riskCenterSource.includes('loadWorkspaceProviders') &&
    riskCenterSource.includes('loadWorkspaceApiKeys') &&
    riskCenterSource.includes('loadWorkspaceMembers') &&
    riskCenterSource.includes('useAgentRuntimeStatus') &&
    riskCenterSource.includes('listAuditLogs'),
  'RiskCenterView should read real quota, provider, API key, permission, runtime, and audit signals',
);
assert.ok(
  riskCenterSource.includes('onNavigateSource') && riskCenterSource.includes('signal.source'),
  'RiskCenterView should deep-link each risk signal to its source record',
);
assert.equal(
  /createWorkspaceProvider|updateWorkspaceProvider|revokeWorkspaceApiKey|rotateWorkspaceApiKey|updateWorkspaceMember/.test(riskCenterSource),
  false,
  'RiskCenterView must stay read-only over operational sources (no unaudited remediation side effects)',
);
assert.ok(
  adminSource.includes('RiskCenterView'),
  'AdminView risk tab should render the extracted RiskCenterView',
);
assert.ok(
  adminSource.includes('../lib/data/mediaRepository'),
  'AdminView media should manage OAuth platforms through mediaRepository',
);
assert.ok(
  adminSource.includes('ensureDefaultWorkspaceMediaAccounts') &&
    adminSource.includes('loadWorkspaceMediaAccounts') &&
    adminSource.includes('updateWorkspaceMediaAccount') &&
    adminSource.includes('summarizeWorkspaceMediaAccounts'),
  'AdminView media should persist OAuth provider config and derive connected-account metrics',
);
assert.ok(
  adminSource.includes('media_account_update') && adminSource.includes('media_oauth_export'),
  'AdminView media account operations should be auditable',
);
assert.equal(
  adminSource.includes("Bulk members imported"),
  false,
  'AdminView audit export should not use hard-coded log entries',
);
assert.equal(
  adminDashboardSource.includes("value: '99.98%'") ||
    adminDashboardSource.includes("value: '2,482'") ||
    adminDashboardSource.includes("value: '1.28M'") ||
    adminDashboardSource.includes("value: '12 / 12'") ||
    adminDashboardSource.includes('activeUsers: 300') ||
    adminDashboardSource.includes('activeUsers: 1200') ||
    adminDashboardSource.includes('activeUsers: 2400') ||
    adminDashboardSource.includes("id: 'TKT-001'") ||
    adminDashboardSource.includes("id: 'RSK-992'") ||
    adminDashboardSource.includes("id: 'HTR-112'"),
  false,
  'AdminView dashboard should not render static health cards, activity chart rows, or alert rows',
);
assert.equal(
  adminSettingsSource.includes('AI 创作工作台') ||
    adminSettingsSource.includes('京ICP备2023xxxxxx号') ||
    adminSettingsSource.includes('defaultValue="5000"') ||
    adminSettingsSource.includes('defaultChecked') ||
    adminSettingsSource.includes('smtp.sendgrid.net') ||
    adminSettingsSource.includes('noreply@ai-studio.auth') ||
    adminSettingsSource.includes('pk_live_************************') ||
    adminSettingsSource.includes('sk_live_************************'),
  false,
  'AdminView settings should not render static tenant, quota, SMTP, or payment credential values',
);
assert.equal(
  adminSource.includes("Sora v1") || adminSource.includes("MusicGen") || adminSource.includes("HeyGen API"),
  false,
  'AdminView task queue should not render static model task rows',
);
assert.equal(
  adminSource.includes('activeUsers: 1420') ||
    adminSource.includes('activeUsers: 345') ||
    adminSource.includes('activeUsers: 82'),
  false,
  'AdminView SaaS plan manager should not render static subscription counts',
);
assert.equal(
  adminProvidersSource.includes("status: '限流中'") ||
    adminProvidersSource.includes("balance: '$120.45'") ||
    adminProvidersSource.includes('OpenAI 偶发限流') ||
    adminProvidersSource.includes('1.28M') ||
    adminProvidersSource.includes('0.15%'),
  false,
  'AdminView provider manager should not render static provider health metrics',
);
assert.equal(
  adminSalesSource.includes("value: '¥248,500'") ||
    adminSalesSource.includes("value: '342'") ||
    adminSalesSource.includes("value: '¥12,400'") ||
    adminSalesSource.includes("revenue: 4000") ||
    adminSalesSource.includes("revenue: 3490"),
  false,
  'AdminView sales manager should not render static finance metrics or chart rows',
);
assert.equal(
  adminDatabaseSource.includes('db-eu-central-1-prod') ||
    adminDatabaseSource.includes('prod-user-assets-global') ||
    adminDatabaseSource.includes('104GB / 250GB') ||
    adminDatabaseSource.includes('1.2 TB') ||
    adminDatabaseSource.includes('4.5 TB / 10 TB'),
  false,
  'AdminView database manager should not render static database or object storage metrics',
);
assert.equal(
  adminAnnouncementsSource.includes('v2.4.0 系统升级维护通知') ||
    adminAnnouncementsSource.includes('五一特惠活动') ||
    adminAnnouncementsSource.includes('关于新增 Claude 3.5 Sonnet 模型的公告') ||
    adminAnnouncementsSource.includes("date: '2026-05-28'"),
  false,
  'AdminView announcements should not render static announcement rows',
);
assert.equal(
  adminPluginsSource.includes('Google Workspace 内部文档搜索') ||
    adminPluginsSource.includes('X (Twitter) 自动定时发布') ||
    adminPluginsSource.includes('Shopify 商品一键同步'),
  false,
  'AdminView plugins should not render static extension rows',
);
assert.equal(
  adminTicketsSource.includes('TKT-20260601-001') ||
    adminTicketsSource.includes('chenxx@example.com') ||
    adminTicketsSource.includes("value: '42'") ||
    adminTicketsSource.includes("value: '1.2h'"),
  false,
  'AdminView tickets should not render static support queue rows or metrics',
);
assert.equal(
  adminAgencySource.includes('北京星云MCN节点') ||
    adminAgencySource.includes('个人推客_Zhangwei') ||
    adminAgencySource.includes('深圳市智创网络') ||
    adminAgencySource.includes("'1,204'") ||
    adminAgencySource.includes("'142,500'"),
  false,
  'AdminView agency should not render static affiliate partner rows or commission metrics',
);
assert.equal(
  riskCenterSource.includes('RSK-084-219') ||
    riskCenterSource.includes('HTR-112-992') ||
    riskCenterSource.includes('Prompt 生成请求') ||
    riskCenterSource.includes("value: '142 次'") ||
    riskCenterSource.includes("value: '28 单'") ||
    riskCenterSource.includes("value: 'v2.4 (实时)'"),
  false,
  'RiskCenterView should not render static moderation event rows or metrics',
);
assert.equal(
  adminMediaSource.includes('YouTube API v3') ||
    adminMediaSource.includes('X (Twitter) v2') ||
    adminMediaSource.includes('TikTok Creator') ||
    adminMediaSource.includes('微信公众号') ||
    adminMediaSource.includes('connected: 423') ||
    adminMediaSource.includes('connected: 102'),
  false,
  'AdminView media should not render static OAuth provider rows or connected-account metrics',
);
assert.equal(
  adminSource.includes('defaultValue={20}') || adminSource.includes('defaultValue={5}'),
  false,
  'AdminView SaaS quota rules should not render static default quota inputs',
);
assert.equal(
  adminSource.includes("'45,231'") || adminSource.includes("'1,284 GB'"),
  false,
  'AdminView asset admin should not render static asset totals',
);
assert.equal(
  adminSource.includes('春季品牌发布会影片') || adminSource.includes('内部培训数字人录屏') || adminSource.includes('游戏场景概念生图包'),
  false,
  'AdminView project monitor should not render static project rows',
);
assert.equal(
  adminSource.includes('ais-app.io/share/{p.id}xxxx'),
  false,
  'AdminView project monitor should not render fake share links',
);

const runtimeModeSource = readFileSync('src/runtime/runtimeMode.ts', 'utf8');
assert.ok(runtimeModeSource.includes('desktop_multica'), 'runtime mode should support desktop Multica');
assert.ok(runtimeModeSource.includes('self_hosted_multica'), 'runtime mode should support self-hosted Multica');
assert.ok(runtimeModeSource.includes("return 'web'"), 'runtime mode should support standalone Web fallback');

const webRuntimeSource = readFileSync('src/runtime/webMockAgentRuntimeProvider.ts', 'utf8');
assert.ok(webRuntimeSource.includes('scheduleTaskLifecycle'), 'web runtime should emit task lifecycle events');

const viteConfigSource = readFileSync('vite.config.ts', 'utf8');
assert.ok(viteConfigSource.includes('manualChunks'), 'vite config should split launch bundles');

const systemResourcesSource = readFileSync('src/components/SystemResources.tsx', 'utf8');
assert.ok(
  systemResourcesSource.includes('h-[220px] w-full'),
  'SystemResources chart should have a fixed height in the dashboard grid',
);

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(filePath) : [filePath];
  });
}

for (const filePath of listFiles('src/components').filter((path) => path.endsWith('.tsx'))) {
  const source = readFileSync(filePath, 'utf8');
  assert.equal(
    source.includes('<ResponsiveContainer width="100%" height="100%">'),
    false,
    `${filePath} should give ResponsiveContainer stable minimum dimensions`,
  );
  for (const match of source.matchAll(/<ResponsiveContainer\b[^>]*>/g)) {
    const tag = match[0];
    assert.ok(tag.includes('minWidth={1}'), `${filePath} should give ResponsiveContainer a minWidth`);
    assert.ok(tag.includes('minHeight={1}'), `${filePath} should give ResponsiveContainer a minHeight`);
    assert.ok(
      tag.includes('initialDimension={{ width: 1, height: 1 }}'),
      `${filePath} should give ResponsiveContainer a positive initialDimension`,
    );
  }
}

// ---------------------------------------------------------------------------
// P3-E07: Release gate — P3 modules cannot publish, call external APIs, install
// plugins, or mutate external accounts without permission, billing, and audit
// contracts. Each entry maps a P3 external-side-effect surface to its component
// source; a failure names the exact offending module.
// ---------------------------------------------------------------------------
interface P3GateTarget {
  moduleId: string;
  componentPath: string;
  /** Audit action strings that must appear (proof of audit coverage). */
  requiredAudits: string[];
  /** A permission gate symbol that must appear in the source. */
  permissionGate: string;
  /** Registry feature id used to assert readiness/route status. */
  registryId: Parameters<typeof getProductFeature>[0];
}

const p3GateTargets: P3GateTarget[] = [
  {
    moduleId: 'media (社媒账号挂载)',
    componentPath: 'src/components/MediaAccountsView.tsx',
    requiredAudits: ['media_account_update'],
    permissionGate: 'hasWorkspacePermission',
    registryId: 'media',
  },
  {
    moduleId: 'employee_accounts (员工账号池)',
    componentPath: 'src/components/EmployeeAccountsView.tsx',
    requiredAudits: ['member_update'],
    permissionGate: 'hasWorkspacePermission',
    registryId: 'employee_accounts',
  },
  {
    moduleId: 'saas_api_keys (公共 API 密钥)',
    componentPath: 'src/components/ApiKeysView.tsx',
    requiredAudits: ['api_key_create', 'api_key_rotate', 'api_key_revoke'],
    permissionGate: 'canManageApiKeys',
    registryId: 'saas_api_keys',
  },
  {
    moduleId: 'plugins (插件中心)',
    componentPath: 'src/components/PluginCenterView.tsx',
    requiredAudits: ['plugin_execute', 'plugin_execute_blocked', 'plugin_enable', 'plugin_disable'],
    permissionGate: 'hasWorkspacePermission',
    registryId: 'admin',
  },
];

const RAW_CREDENTIAL_PERSIST_PATTERNS = [
  /setItem\([^)]*\b(apiKey|secret|rawKey|fullKey|accessToken|clientSecret)\b/i,
  /metadata:\s*\{[^}]*\b(secret|rawKey|fullKey)\s*:/i,
];

for (const target of p3GateTargets) {
  assert.ok(
    existsSync(target.componentPath),
    `P3 release gate: ${target.moduleId} component ${target.componentPath} must exist`,
  );
  const source = readFileSync(target.componentPath, 'utf8');

  // 1. External side effects must be audited.
  for (const auditAction of target.requiredAudits) {
    assert.ok(
      source.includes(auditAction),
      `P3 release gate failed for ${target.moduleId}: missing audit coverage for "${auditAction}"`,
    );
  }
  assert.ok(
    source.includes('logAuditEvent'),
    `P3 release gate failed for ${target.moduleId}: must log audit events for external side effects`,
  );

  // 2. Mutation actions must be permission-gated.
  assert.ok(
    source.includes(target.permissionGate),
    `P3 release gate failed for ${target.moduleId}: missing permission gate "${target.permissionGate}"`,
  );

  // 3. No raw credential material may be persisted.
  for (const pattern of RAW_CREDENTIAL_PERSIST_PATTERNS) {
    assert.equal(
      pattern.test(source),
      false,
      `P3 release gate failed for ${target.moduleId}: raw credential material must not be persisted (matched ${pattern})`,
    );
  }

  // 4. Registry route status must be rendered/internal (not an un-gated placeholder) and not a hidden stub.
  const feature = getProductFeature(target.registryId);
  assert.ok(feature, `P3 release gate failed for ${target.moduleId}: registry record missing`);
  assert.ok(
    feature!.routeStatus === 'rendered' || feature!.routeStatus === 'internal',
    `P3 release gate failed for ${target.moduleId}: route status must be rendered or internal, got "${feature!.routeStatus}"`,
  );
  assert.notEqual(
    feature!.readiness,
    'placeholder',
    `P3 release gate failed for ${target.moduleId}: a placeholder module must not expose external side effects`,
  );
  assert.ok(
    feature!.dataDependencies.includes('audit'),
    `P3 release gate failed for ${target.moduleId}: registry must declare an audit data dependency`,
  );
}

// 5. P3 mutation actions must each map to a required permission in the protected-action registry.
for (const mutationAction of ['api_key.mutate', 'plugin.mutate']) {
  assert.ok(
    permissionsSource.includes(`'${mutationAction}'`),
    `P3 release gate: protected action "${mutationAction}" must declare permission metadata`,
  );
}

console.log('✓ P3-E07: release gate (audit coverage + permission gating + no raw credentials for P3 external side effects)');

console.log('launch readiness contract passed');


