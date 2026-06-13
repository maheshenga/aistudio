const P0_RELEASE_SMOKE_STORAGE_KEYS = {
  tasks: 'aistudio_workspace_tasks:workspace_demo_maheshenga',
  assets: 'aistudio_workspace_assets:workspace_demo_maheshenga',
  usageEvents: 'aistudio_usage_events:workspace_demo_maheshenga',
  auditLogs: 'aistudio_activity_logs',
  settings: 'aistudio_settings:workspace_demo_maheshenga:user_demo_maheshenga',
  generationJobs: 'aistudio_generation_jobs:workspace_demo_maheshenga',
};

async function assertP0ReleasePersistence(page) {
  const persisted = await page.evaluate((keys) => {
    const parse = (key, fallback) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    };
    const tasks = parse(keys.tasks, []);
    const assets = parse(keys.assets, []);
    const usageEvents = parse(keys.usageEvents, []);
    const auditLogs = parse(keys.auditLogs, []);
    const settings = parse(keys.settings, {});
    return {
      hasTask: tasks.some((task) => task.id === 'p0-release-task'),
      hasAsset: assets.some((asset) => asset.id === 'p0-release-asset'),
      hasRuntimeDispatchUsage: usageEvents.some((event) => event.kind === 'runtime_dispatch'),
      hasQuotaBlockUsage: usageEvents.some((event) => event.kind === 'quota_block'),
      auditActions: auditLogs.map((log) => log.action),
      runtimeModeStrategy: settings.runtimeModeStrategy,
      webStandaloneMarker: settings.p0ReleaseSmoke,
    };
  }, P0_RELEASE_SMOKE_STORAGE_KEYS);

  const auditDomainActions = [
    'task_create',
    'asset_create',
    'settings_change',
    'api_key_create',
    'billing_recharge_create',
    'generation_job_failed',
    'provider_config_update',
    'permission_denied',
  ];
  if (!persisted.hasTask) throw new Error('P0 release task did not survive reload');
  if (!persisted.hasAsset) throw new Error('P0 release asset did not survive reload');
  if (!persisted.hasRuntimeDispatchUsage) throw new Error('P0 runtime_dispatch usage did not survive reload');
  if (!persisted.hasQuotaBlockUsage) throw new Error('P0 quota_block usage did not survive reload');
  for (const action of auditDomainActions) {
    if (!persisted.auditActions.includes(action)) {
      throw new Error(`P0 audit action missing after reload: ${action}`);
    }
  }
  if (persisted.runtimeModeStrategy !== 'web') {
    throw new Error('P0 Web standalone runtime setting did not survive reload');
  }
  if (persisted.webStandaloneMarker !== 'web standalone') {
    throw new Error('P0 web standalone smoke marker missing');
  }
}

async function seedP0ReleaseState(page) {
  await page.evaluate((keys) => {
    const now = Date.now();
    const actor = {
      id: 'user_demo_maheshenga',
      name: 'Maheshenga',
      email: 'maheshenga@example.com',
      role: 'owner',
    };
    localStorage.setItem(keys.tasks, JSON.stringify([
      {
        id: 'p0-release-task',
        workspaceId: 'workspace_demo_maheshenga',
        title: 'P0 Release Smoke Task',
        column: 'done',
        priority: 'High',
        type: 'release',
        date: new Date(now).toISOString().slice(0, 10),
        isAuto: false,
        status: 'completed',
        runtimeMode: 'web',
        runtimeProviderKind: 'mock',
        runtimeTaskId: 'p0-release-runtime-task',
        runtimeStatus: 'succeeded',
        runtimeId: 'mock-web-runtime',
        metadata: { releaseGate: 'p0-batch-1' },
        createdAt: now,
        updatedAt: now,
      },
    ]));
    localStorage.setItem(keys.assets, JSON.stringify([
      {
        id: 'p0-release-asset',
        workspaceId: 'workspace_demo_maheshenga',
        userId: 'user_demo_maheshenga',
        name: 'P0 Release Asset',
        type: 'document',
        size: '12 KB',
        source: 'generated',
        moduleId: 'assets',
        tags: ['p0-release', 'smoke'],
        url: 'data:text/plain,p0-release-asset',
        createdAt: now,
        updatedAt: now,
        lastAccessedAt: now,
        metadata: { releaseGate: 'p0-batch-1' },
      },
    ]));
    localStorage.setItem(keys.usageEvents, JSON.stringify([
      {
        id: 'p0-release-runtime-dispatch',
        workspaceId: 'workspace_demo_maheshenga',
        userId: 'user_demo_maheshenga',
        moduleId: 'tasks',
        kind: 'runtime_dispatch',
        targetType: 'runtime',
        targetId: 'p0-release-runtime-task',
        providerKind: 'mock',
        runtimeMode: 'web',
        credits: 5,
        metadata: { releaseGate: 'p0-batch-1' },
        createdAt: now,
      },
      {
        id: 'p0-release-quota-block',
        workspaceId: 'workspace_demo_maheshenga',
        userId: 'user_demo_maheshenga',
        moduleId: 'tasks',
        kind: 'quota_block',
        targetType: 'runtime',
        targetId: 'billing_quota',
        providerKind: 'mock',
        runtimeMode: 'web',
        credits: 0,
        metadata: { reason: 'quota_exceeded', releaseGate: 'p0-batch-1' },
        createdAt: now - 1,
      },
    ]));
    const auditDomainActions = [
      ['task_create', 'tasks', 'task', 'p0-release-task'],
      ['asset_create', 'assets', 'asset', 'p0-release-asset'],
      ['settings_change', 'settings', 'settings', 'runtime_config'],
      ['api_key_create', 'saas_api_keys', 'api_key', 'p0-release-api-key'],
      ['billing_recharge_create', 'billing', 'payment_method', 'p0-release-recharge'],
      ['generation_job_failed', 'tasks', 'runtime', 'billing_quota'],
      ['provider_config_update', 'admin', 'provider_config', 'p0-release-provider'],
      ['permission_denied', 'billing', 'system', 'billing_quota'],
    ];
    const releaseLogs = auditDomainActions.map(([action, moduleId, targetType, targetId], index) => ({
      id: `p0-release-audit-${action}`,
      workspaceId: 'workspace_demo_maheshenga',
      actor,
      action,
      moduleId,
      targetType,
      targetId,
      metadata: { releaseGate: 'p0-batch-1' },
      timestamp: now - index,
    }));
    const existingLogs = JSON.parse(localStorage.getItem(keys.auditLogs) || '[]');
    localStorage.setItem(keys.auditLogs, JSON.stringify([...releaseLogs, ...existingLogs]));
    localStorage.setItem(keys.settings, JSON.stringify({
      runtimeModeStrategy: 'web',
      workspacePreferences: { defaultLanguage: 'zh-CN' },
      p0ReleaseSmoke: 'web standalone',
    }));
    window.dispatchEvent(new CustomEvent('tasks_updated', { detail: { workspaceId: 'workspace_demo_maheshenga' } }));
    window.dispatchEvent(new CustomEvent('assets_updated', { detail: { workspaceId: 'workspace_demo_maheshenga' } }));
    window.dispatchEvent(new CustomEvent('usage_events_updated', { detail: { workspaceId: 'workspace_demo_maheshenga' } }));
    window.dispatchEvent(new CustomEvent('settings_updated', { detail: { workspaceId: 'workspace_demo_maheshenga', userId: 'user_demo_maheshenga' } }));
    window.dispatchEvent(new Event('activity_logged'));
  }, P0_RELEASE_SMOKE_STORAGE_KEYS);
}

async function assertPermissionAndStandaloneSmoke(page) {
  await page.evaluate(async () => {
    const permissionDeniedRoles = ['viewer', 'operator', 'admin', 'owner'];
    const permissions = await import('/src/saas/permissions.ts');
    const runtimeMode = await import('/src/runtime/runtimeMode.ts');
    const permissionMatrix = {
      viewerCannotDispatch: !permissions.canPerformProtectedAction('viewer', 'agent.dispatch'),
      operatorCannotBill: !permissions.canPerformProtectedAction('operator', 'billing.mutate'),
      adminCanMutateSettings: permissions.canPerformProtectedAction('admin', 'runtime_settings.mutate'),
      ownerCanMutateBilling: permissions.canPerformProtectedAction('owner', 'billing.mutate'),
      rolesCovered: permissionDeniedRoles.length === 4,
    };
    if (Object.values(permissionMatrix).some((value) => value !== true)) {
      throw new Error(`P0 permission smoke failed: ${JSON.stringify(permissionMatrix)}`);
    }
    const resolvedMode = runtimeMode.resolveRuntimeMode({}, { runtimeModeStrategy: 'auto' }, null);
    if (resolvedMode !== 'web') throw new Error('P0 web standalone mode should not require Multica');
  });
}

async function login(page) {
  const loginButton = page.getByRole('button', { name: /使用 Demo 工作区登录/ });
  await loginButton.waitFor({ timeout: 15000 });
  await loginButton.click();
  await page.getByRole('button', { name: /Agent Dispatcher/ }).waitFor({ timeout: 15000 });
}

async function assertReleaseAssetSearch(page) {
  await page.keyboard.press('Control+/');
  const input = page.getByPlaceholder('Search modules, assets, files... (Esc to close)');
  await input.waitFor({ timeout: 5000 });
  await input.fill('P0 Release Asset');
  await page.getByText('P0 Release Asset').waitFor({ timeout: 5000 });
  await page.keyboard.press('Escape');
}

async function assertCommandAndSearch(page) {
  await page.keyboard.press('Control+/');
  const searchInput = page.getByPlaceholder('Search modules, assets, files... (Esc to close)');
  await searchInput.waitFor({ timeout: 5000 });
  await searchInput.fill('Brand Kit');
  await page.getByText('Brand Kit Logo (Q3)').waitFor({ timeout: 5000 });
  await page.keyboard.press('Escape');

  await page.keyboard.press('Control+P');
  const commandInput = page.getByPlaceholder('Type a command or search... (Ctrl+P)');
  await commandInput.waitFor({ timeout: 5000 });
  await commandInput.fill('settings');
  await page.getByText('Open Settings').waitFor({ timeout: 5000 });
  await page.keyboard.press('Escape');
}

async function assertQuotaBlock(page) {
  await page.getByRole('button', { name: /Agent Dispatcher/ }).click();
  await page.getByText(/全局 Agent 调度器|Agent Dispatcher/).first().waitFor({ timeout: 5000 });
  await page.getByPlaceholder(/Agent/).fill('Smoke test task');
  await page.getByRole('button', { name: /Web Cloud Agent/ }).click();
  await page.evaluate((key) => {
    const now = Date.now();
    localStorage.setItem(key, JSON.stringify([
      {
        id: 'smoke-over-quota',
        workspaceId: 'workspace_demo_maheshenga',
        userId: 'user_demo_maheshenga',
        title: 'Smoke over quota seed',
        prompt: 'seed',
        status: 'succeeded',
        providerKind: 'mock',
        runtimeMode: 'web',
        progress: 100,
        metadata: { estimatedCredits: 6000 },
        createdAt: now,
        updatedAt: now,
        completedAt: now,
      },
    ]));
    window.dispatchEvent(new CustomEvent('generation_jobs_updated', { detail: { workspaceId: 'workspace_demo_maheshenga' } }));
  }, P0_RELEASE_SMOKE_STORAGE_KEYS.generationJobs);
  await page.getByRole('button', { name: /开始调度|Start/ }).click();
  await page.getByText(/算力额度不足|额度不足/).waitFor({ timeout: 5000 });
}

async function assertFinanceRoleSearch(page) {
  await page.evaluate((key) => {
    const raw = localStorage.getItem('aistudio_auth_session');
    if (!raw) throw new Error('auth session missing after demo login');
    const authSession = JSON.parse(raw);
    authSession.membership.role = 'finance';
    localStorage.setItem('aistudio_auth_session', JSON.stringify(authSession));
    localStorage.removeItem(key);
  }, P0_RELEASE_SMOKE_STORAGE_KEYS.generationJobs);
  await page.reload();
  await page.getByRole('button', { name: /Agent Dispatcher/ }).waitFor({ timeout: 15000 });
  await page.keyboard.press('Control+/');
  const roleSearchInput = page.getByPlaceholder('Search modules, assets, files... (Esc to close)');
  await roleSearchInput.waitFor({ timeout: 5000 });
  await roleSearchInput.fill('系统管理');
  await page.waitForTimeout(300);
  const adminResults = await page.getByText('系统管理').count();
  if (adminResults > 0) throw new Error('finance role should not see admin module search result');
  await roleSearchInput.fill('财务');
  await page.getByText('财务与票据管理').waitFor({ timeout: 5000 });
  await page.waitForTimeout(1000);
}

export async function runBrowserSmoke(page) {
  await login(page);
  await assertPermissionAndStandaloneSmoke(page);
  await seedP0ReleaseState(page);
  await assertP0ReleasePersistence(page);
  await page.reload();
  await page.getByRole('button', { name: /Agent Dispatcher/ }).waitFor({ timeout: 15000 });
  await assertP0ReleasePersistence(page);
  await assertReleaseAssetSearch(page);
  await assertCommandAndSearch(page);
  await assertQuotaBlock(page);
  await assertFinanceRoleSearch(page);
}
