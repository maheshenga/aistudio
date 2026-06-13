import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import ts from 'typescript';

import { allModuleIds, type ModuleId } from '../src/types.ts';
import {
  commercialMvpP0Batch1ModuleIds,
  canViewProductModule,
  getFirstAccessibleProductModule,
  getProductFeature,
  getProductNavGroupsForRole,
  productFeatureRegistry,
  productNavGroups,
  visibleProductFeatures,
} from '../src/product/registry.ts';

const EXPECTED_VISIBLE_FEATURE_COUNT = 67;
const EXPECTED_VISIBLE_DOMAIN_COUNT = 14;
const EXPECTED_COMMERCIAL_MVP_P0_BATCH_1_IDS: readonly ModuleId[] = [
  'dashboard',
  'workflow',
  'tasks',
  'agent_status',
  'data',
  'assets',
  'projects',
  'billing',
  'saas_api_keys',
  'settings',
  'admin',
  'activity_logs',
];

function uniqueValues<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function assertNoDuplicates<T>(label: string, values: readonly T[]) {
  const seen = new Set<T>();
  const duplicates = new Set<T>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  assert.deepEqual([...duplicates], [], `${label} contains duplicate values`);
}

function extractRenderedModuleIdsFromApp(): Set<ModuleId> {
  const appSource = readFileSync('src/App.tsx', 'utf8');
  const sourceFile = ts.createSourceFile(
    'src/App.tsx',
    appSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const renderedIds = new Set<ModuleId>();

  function visit(node: ts.Node) {
    if (ts.isSwitchStatement(node) && ts.isIdentifier(node.expression) && node.expression.text === 'moduleId') {
      for (const clause of node.caseBlock.clauses) {
        if (ts.isCaseClause(clause) && ts.isStringLiteral(clause.expression)) {
          renderedIds.add(clause.expression.text as ModuleId);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return renderedIds;
}

const moduleIdSet = new Set<ModuleId>(allModuleIds);
const registryIds = productFeatureRegistry.map((feature) => feature.id);
const visibleIds = visibleProductFeatures.map((feature) => feature.id);
const renderedIds = extractRenderedModuleIdsFromApp();
const secondaryRegistryConsumerFiles = [
  'src/components/CommandPalette.tsx',
  'src/components/GlobalSearchOverlay.tsx',
  'src/components/RecommendedModulesWidget.tsx',
  'src/components/FrequentWorkflowsWidget.tsx',
  'src/components/UsageHeatmap.tsx',
];

assertNoDuplicates('allModuleIds', allModuleIds);
assertNoDuplicates('productFeatureRegistry ids', registryIds);
assertNoDuplicates('commercialMvpP0Batch1ModuleIds', commercialMvpP0Batch1ModuleIds);

assert.equal(
  productFeatureRegistry.length,
  allModuleIds.length,
  'registry should contain one record for every ModuleId',
);
assert.equal(
  visibleProductFeatures.length,
  EXPECTED_VISIBLE_FEATURE_COUNT,
  'visible feature count should match the current product panel',
);
assert.equal(
  productNavGroups.length,
  EXPECTED_VISIBLE_DOMAIN_COUNT,
  'visible navigation domain count should stay stable',
);
assert.deepEqual(
  [...commercialMvpP0Batch1ModuleIds],
  EXPECTED_COMMERCIAL_MVP_P0_BATCH_1_IDS,
  'commercial MVP P0 batch 1 should stay locked to the control-plane issue scope',
);
assert.equal(
  ([...commercialMvpP0Batch1ModuleIds] as readonly string[]).includes('ai_canvas'),
  false,
  'ai_canvas should stay outside the commercial MVP P0 batch 1 scope',
);

for (const id of commercialMvpP0Batch1ModuleIds) {
  const feature = getProductFeature(id);
  assert.ok(feature, `${id} should have a product registry record`);
  assert.equal(feature.visible, true, `${id} should be visible for P0 batch 1`);
  assert.equal(feature.routeStatus, 'rendered', `${id} should be rendered for P0 batch 1`);
  assert.ok(renderedIds.has(id), `${id} should have an App render target for P0 batch 1`);
  assert.ok(feature.permission.trim(), `${id} should declare a permission for P0 batch 1`);
  assert.ok(feature.dataDependencies.length > 0, `${id} should declare data dependencies for P0 batch 1`);
}

for (const feature of productFeatureRegistry) {
  assert.ok(moduleIdSet.has(feature.id), `${feature.id} must be assignable to ModuleId`);
  assert.ok(feature.label.trim(), `${feature.id} must have a label`);
  assert.ok(feature.domain.trim(), `${feature.id} must have a domain`);
  assert.ok(feature.icon.trim(), `${feature.id} must have an icon`);
  assert.ok(feature.phase, `${feature.id} must have a phase`);
  assert.ok(feature.readiness, `${feature.id} must have readiness metadata`);
  assert.ok(feature.componentKey.trim(), `${feature.id} must have a componentKey`);
  assert.ok(feature.permission.trim(), `${feature.id} must have a permission key`);
  assert.ok(feature.description.trim(), `${feature.id} must have a description`);
  assert.ok(feature.dataDependencies.length > 0, `${feature.id} must declare data dependencies`);
}

for (const feature of visibleProductFeatures) {
  assert.equal(feature.routeStatus, 'rendered', `${feature.id} is visible but not marked rendered`);
  assert.ok(renderedIds.has(feature.id), `${feature.id} is visible but missing from App.renderContent`);
}

for (const id of allModuleIds) {
  const feature = productFeatureRegistry.find((candidate) => candidate.id === id);
  assert.ok(feature, `${id} must have a registry record`);

  if (!renderedIds.has(id)) {
    assert.equal(feature.visible, false, `${id} has no render target and must be hidden`);
    assert.equal(feature.routeStatus, 'hidden', `${id} has no render target and must be marked hidden`);
  }
}

for (const renderedId of renderedIds) {
  const feature = productFeatureRegistry.find((candidate) => candidate.id === renderedId);
  assert.ok(feature, `${renderedId} is rendered by App.renderContent but missing from registry`);
  assert.notEqual(feature.routeStatus, 'hidden', `${renderedId} is rendered but marked hidden`);
}

assert.deepEqual(
  uniqueValues(productNavGroups.flatMap((group) => group.items.map((item) => item.id))),
  visibleIds,
  'productNavGroups should expose exactly the visible registry ids in order',
);

assert.deepEqual(
  uniqueValues(getProductNavGroupsForRole('owner').flatMap((group) => group.items.map((item) => item.id))),
  visibleIds,
  'owners should see every visible product module',
);
assert.equal(canViewProductModule('tasks', 'operator'), true);
assert.equal(canViewProductModule('assets', 'operator'), true);
assert.equal(canViewProductModule('billing', 'operator'), false);
assert.equal(canViewProductModule('admin', 'operator'), false);
assert.equal(canViewProductModule('billing', 'finance'), true);
assert.equal(canViewProductModule('finance', 'finance'), true);
assert.equal(canViewProductModule('tasks', 'finance'), false);
assert.equal(canViewProductModule('dashboard', 'viewer'), true);
assert.equal(canViewProductModule('assets', 'viewer'), false);
assert.equal(getFirstAccessibleProductModule('viewer'), 'dashboard');

{
  const sidebarSource = readFileSync('src/components/Sidebar.tsx', 'utf8');
  assert.ok(
    sidebarSource.includes('getProductNavGroupsForRole') && sidebarSource.includes('useSaasSession'),
    'Sidebar should filter navigation groups by SaaS role',
  );
}

{
  const appSource = readFileSync('src/App.tsx', 'utf8');
  assert.ok(
    appSource.includes('canViewProductModule') && appSource.includes('getFirstAccessibleProductModule'),
    'App should guard direct module navigation by SaaS role',
  );
}

const whiteBg = productFeatureRegistry.find((feature) => feature.id === 'e_white_bg');
assert.ok(whiteBg, 'e_white_bg should remain in the registry for compatibility');
assert.equal(whiteBg.visible, false);
assert.equal(whiteBg.routeStatus, 'hidden');
assert.equal(renderedIds.has('e_white_bg'), false);

const marketingDiy = productFeatureRegistry.find((feature) => feature.id === 'marketing_diy');
assert.ok(marketingDiy, 'marketing_diy should remain in the registry for marketing flows');
assert.equal(marketingDiy.visible, false);
assert.equal(marketingDiy.routeStatus, 'internal');
assert.equal(renderedIds.has('marketing_diy'), true);

for (const filePath of secondaryRegistryConsumerFiles) {
  const fileSource = readFileSync(filePath, 'utf8');
  assert.equal(
    fileSource.includes("from './Sidebar'"),
    false,
    `${filePath} should read product data from src/product/* instead of Sidebar`,
  );
}

for (const filePath of [
  'src/components/GlobalSearchOverlay.tsx',
  'src/components/RecommendedModulesWidget.tsx',
  'src/components/UsageHeatmap.tsx',
]) {
  const fileSource = readFileSync(filePath, 'utf8');
  assert.equal(
    fileSource.includes('visibleProductNavItems'),
    false,
    `${filePath} should not expose inaccessible modules through full visibleProductNavItems`,
  );
  assert.ok(
    fileSource.includes('getProductNavGroupsForRole') && fileSource.includes('useSaasSession'),
    `${filePath} should derive module lists from the current SaaS role`,
  );
}

{
  const fileSource = readFileSync('src/components/CommandPalette.tsx', 'utf8');
  assert.equal(
    fileSource.includes('visibleProductFeatures'),
    false,
    'CommandPalette should not expose inaccessible modules through full visibleProductFeatures',
  );
  assert.ok(
    fileSource.includes('getProductNavGroupsForRole') && fileSource.includes('useSaasSession'),
    'CommandPalette should derive navigation actions from the current SaaS role',
  );
  assert.ok(
    fileSource.includes('navigationShortcutModules') && fileSource.includes('accessibleModuleIds.has(moduleId)'),
    'CommandPalette navigation shortcuts should be filtered by current SaaS role',
  );
  assert.equal(
    fileSource.includes("moduleId: 'store_dashboard' as ModuleId") ||
      fileSource.includes("moduleId: 'settings' as ModuleId") ||
      fileSource.includes("moduleId: 'dashboard' as ModuleId"),
    false,
    'CommandPalette should not expose hard-coded unfiltered navigation shortcut module ids',
  );
}

{
  const fileSource = readFileSync('src/components/FrequentWorkflowsWidget.tsx', 'utf8');
  assert.ok(
    fileSource.includes('canViewProductModule'),
    'FrequentWorkflowsWidget should avoid pinning modules the current role cannot view',
  );
}

{
  const fileSource = readFileSync('src/App.tsx', 'utf8');
  assert.ok(
    fileSource.includes('filter(canAccessModule)'),
    'App should filter pinned modules through the current SaaS role before persisting or rendering them',
  );
}

console.log('product registry validation passed');
