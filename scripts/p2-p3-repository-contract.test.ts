/**
 * P2/P3 Repository 契约测试
 *
 * 验证所有新建 repository 的 CRUD + workspace 作用域隔离。
 */

import assert from 'node:assert/strict';
import { createDemoAuthSession, type StorageLike } from '../src/saas/localAuthSession.ts';
import {
  loadWorkspaceTeamMembers, createWorkspaceTeamMember, updateWorkspaceTeamMember, deleteWorkspaceTeamMember,
  loadWorkspaceSubAccounts, createWorkspaceSubAccount, updateWorkspaceSubAccount, deleteWorkspaceSubAccount,
  type TeamRepositoryContext,
} from '../src/lib/data/teamRepository';
import {
  loadWorkspaceStores, createWorkspaceStore, updateWorkspaceStore, deleteWorkspaceStore,
  loadWorkspaceStoreOrders, createWorkspaceStoreOrder,
  loadWorkspaceStoreInventory, createWorkspaceStoreInventory, adjustWorkspaceStoreInventory,
  loadWorkspaceStoreStaff, createWorkspaceStoreStaff,
  type StoreRepositoryContext,
} from '../src/lib/data/storeRepository';
import {
  loadWorkspaceAvatarConsents, createWorkspaceAvatarConsent, revokeWorkspaceAvatarConsent, hasValidAvatarConsent,
  loadWorkspaceAvatarSources, createWorkspaceAvatarSource,
  type AvatarRepositoryContext,
} from '../src/lib/data/avatarRepository';
import {
  loadWorkspaceDesignBriefs, createWorkspaceDesignBrief, updateWorkspaceDesignBrief, deleteWorkspaceDesignBrief,
  type DesignRepositoryContext,
} from '../src/lib/data/designRepository';
import {
  loadWorkspaceCustomerServiceResponses, createWorkspaceCustomerServiceResponse, updateCustomerServiceResponseStatus,
  type CustomerServiceRepositoryContext,
} from '../src/lib/data/customerServiceRepository';
import {
  loadWorkspaceTaxRecords, createWorkspaceTaxRecord, updateTaxRecordStatus, summarizeWorkspaceTaxRecords,
  type TaxRepositoryContext,
} from '../src/lib/data/taxRepository';
import {
  loadWorkspaceEmployeeAccounts, createWorkspaceEmployeeAccount, updateEmployeeAccountStatus,
  type EmployeeAccountRepositoryContext,
} from '../src/lib/data/employeeAccountRepository';
import {
  loadWorkspaceAgentLibrary, createWorkspaceAgentLibraryEntry, updateWorkspaceAgentLibraryEntry,
  type AgentLibraryRepositoryContext,
} from '../src/lib/data/agentLibraryRepository';
import {
  listWorkspaceCampaigns, createWorkspaceCampaign, updateWorkspaceCampaign, deleteWorkspaceCampaigns,
  type CampaignRepositoryContext,
} from '../src/lib/data/campaignRepository';

function createMemoryStorage(): StorageLike {
  const records = new Map<string, string>();
  return {
    getItem: (k) => records.get(k) ?? null,
    setItem: (k, v) => { records.set(k, v); },
    removeItem: (k) => { records.delete(k); },
  };
}

const session = createDemoAuthSession({ now: 1_780_000_000_000 });
const wsId = session.workspace.id;
const userId = session.user.id;
const storage = createMemoryStorage();
const otherStorage = createMemoryStorage();

// === Team Repository ===
{
  const ctx: TeamRepositoryContext = { workspaceId: wsId, userId, storage };
  const member = createWorkspaceTeamMember({ name: 'Alice', email: 'alice@test.dev', role: 'admin' }, ctx);
  assert.equal(member.workspaceId, wsId);
  assert.equal(member.name, 'Alice');
  assert.equal(loadWorkspaceTeamMembers(ctx).length, 1);

  const updated = updateWorkspaceTeamMember(member.id, { role: 'owner' }, ctx);
  assert.equal(updated?.role, 'owner');

  // Sub-accounts
  const sub = createWorkspaceSubAccount({ platform: 'douyin', accountName: 'Shop A', accountId: 'dy_001', status: 'active', credentialsMeta: {} }, ctx);
  assert.equal(sub.platform, 'douyin');
  assert.equal(loadWorkspaceSubAccounts(ctx).length, 1);
  updateWorkspaceSubAccount(sub.id, { status: 'expired' }, ctx);
  assert.equal(loadWorkspaceSubAccounts(ctx)[0].status, 'expired');

  // Workspace isolation
  const otherCtx: TeamRepositoryContext = { workspaceId: 'ws_other', userId, storage: otherStorage };
  assert.equal(loadWorkspaceTeamMembers(otherCtx).length, 0, 'team members should be workspace-scoped');

  deleteWorkspaceTeamMember(member.id, ctx);
  assert.equal(loadWorkspaceTeamMembers(ctx).length, 0);
  deleteWorkspaceSubAccount(sub.id, ctx);
  assert.equal(loadWorkspaceSubAccounts(ctx).length, 0);
  console.log('✓ P2-B07: teamRepository (members + sub-accounts)');
}

// === Store Repository ===
{
  const ctx: StoreRepositoryContext = { workspaceId: wsId, userId, storage };
  const store = createWorkspaceStore({ name: 'Flagship Store', channel: 'online', status: 'active', metadata: {} }, ctx);
  assert.equal(store.name, 'Flagship Store');

  const order = createWorkspaceStoreOrder({ storeId: store.id, orderNumber: 'ORD-001', amountCents: 5000, currency: 'CNY', status: 'pending', metadata: {} }, ctx);
  assert.equal(order.orderNumber, 'ORD-001');

  const inv = createWorkspaceStoreInventory({ storeId: store.id, sku: 'SKU-001', name: 'Product A', stock: 100, threshold: 10 }, ctx);
  assert.equal(inv.stock, 100);
  const adjusted = adjustWorkspaceStoreInventory(inv.id, { sku: 'SKU-001', storeId: store.id, beforeCount: 100, afterCount: 80, reason: 'sale', actorId: userId }, ctx);
  assert.equal(adjusted?.stock, 80);
  assert.equal(adjusted?.adjustments.length, 1);

  const staff = createWorkspaceStoreStaff({ storeId: store.id, name: 'Bob', role: 'manager', status: 'active' }, ctx);
  assert.equal(staff.name, 'Bob');

  // Delete store cascades
  deleteWorkspaceStore(store.id, ctx);
  assert.equal(loadWorkspaceStores(ctx).length, 0);
  assert.equal(loadWorkspaceStoreOrders(ctx).filter(o => o.storeId === store.id).length, 0, 'orders should cascade delete');
  assert.equal(loadWorkspaceStoreInventory(ctx).filter(i => i.storeId === store.id).length, 0, 'inventory should cascade delete');
  assert.equal(loadWorkspaceStoreStaff(ctx).filter(s => s.storeId === store.id).length, 0, 'staff should cascade delete');
  console.log('✓ P2-B09: storeRepository (stores + orders + inventory + staff + cascade)');
}

// === Avatar Repository ===
{
  const ctx: AvatarRepositoryContext = { workspaceId: wsId, userId, storage };
  const consent = createWorkspaceAvatarConsent({ subjectName: 'John', consentType: 'voice_clone', status: 'granted', source: 'signed_form', ownerId: userId, expiresAt: Date.now() + 86400000, metadata: {} }, ctx);
  assert.equal(consent.status, 'granted');
  assert.equal(hasValidAvatarConsent('John', 'voice_clone', ctx), true);
  assert.equal(hasValidAvatarConsent('John', 'face_clone', ctx), false);

  const source = createWorkspaceAvatarSource({ consentId: consent.id, name: 'John voice sample', type: 'audio', metadata: {} }, ctx);
  assert.equal(source.consentId, consent.id);

  revokeWorkspaceAvatarConsent(consent.id, ctx);
  assert.equal(hasValidAvatarConsent('John', 'voice_clone', ctx), false, 'revoked consent should not be valid');
  console.log('✓ P2-B01: avatarRepository (consent + source + validity check)');
}

// === Design Repository ===
{
  const ctx: DesignRepositoryContext = { workspaceId: wsId, userId, storage };
  const brief = createWorkspaceDesignBrief({ module: 'logo', businessGoal: 'Brand identity', audience: 'Young professionals', style: 'minimalist', constraints: 'must scale', references: [] as string[], status: 'draft', metadata: {} }, ctx);
  assert.equal(brief.module, 'logo');
  assert.equal(brief.businessGoal, 'Brand identity');

  const updated = updateWorkspaceDesignBrief(brief.id, { status: 'in_progress' }, ctx);
  assert.equal(updated?.status, 'in_progress');

  assert.equal(loadWorkspaceDesignBriefs(ctx).length, 1);
  deleteWorkspaceDesignBrief(brief.id, ctx);
  assert.equal(loadWorkspaceDesignBriefs(ctx).length, 0);
  console.log('✓ P2-B03: designRepository (briefs CRUD)');
}

// === Customer Service Repository ===
{
  const ctx: CustomerServiceRepositoryContext = { workspaceId: wsId, userId, storage };
  const resp = createWorkspaceCustomerServiceResponse({ channel: 'wechat', draft: 'Hello, how can I help?', status: 'suggested', metadata: {} }, ctx);
  assert.equal(resp.status, 'suggested');

  const escalated = updateCustomerServiceResponseStatus(resp.id, 'escalated', { escalationTaskId: 'task_123' }, ctx);
  assert.equal(escalated?.status, 'escalated');
  assert.equal(escalated?.escalationTaskId, 'task_123');

  const accepted = updateCustomerServiceResponseStatus(resp.id, 'accepted', { editorId: userId }, ctx);
  assert.equal(accepted?.status, 'accepted');
  console.log('✓ P2-B05: customerServiceRepository (response lifecycle)');
}

// === Tax Repository ===
{
  const ctx: TaxRepositoryContext = { workspaceId: wsId, userId, storage };
  const calc = createWorkspaceTaxRecord({
    kind: 'calculation', category: 'vat', title: '企业增值税测算',
    inputs: { activeTab: 'vat', currency: 'CNY' }, result: { payable: 500 },
    status: 'draft', metadata: {},
  }, ctx);
  assert.equal(calc.workspaceId, wsId);
  assert.equal(calc.kind, 'calculation');
  assert.equal(calc.actorId, userId, 'actorId should default to ctx.userId');

  const sim = createWorkspaceTaxRecord({
    kind: 'simulation', category: 'simulation', title: '年度税务压力预测模拟',
    inputs: { incomeGrowth: 15 }, result: { bestImpact: 90000 },
    status: 'draft', metadata: {},
  }, ctx);
  assert.equal(loadWorkspaceTaxRecords(ctx).length, 2);
  assert.equal(loadWorkspaceTaxRecords(ctx)[0].id, sim.id, 'records should be newest-first');

  const submitted = updateTaxRecordStatus(calc.id, 'submitted', ctx, { metadata: { filedAt: 'now' } });
  assert.equal(submitted?.status, 'submitted');

  const summary = summarizeWorkspaceTaxRecords(ctx);
  assert.equal(summary.total, 2);
  assert.equal(summary.byKind.calculation, 1);
  assert.equal(summary.byKind.simulation, 1);
  assert.equal(summary.byStatus.submitted, 1);
  assert.equal(summary.byStatus.draft, 1);

  // Workspace isolation
  const otherCtx: TaxRepositoryContext = { workspaceId: 'ws_other', userId, storage: otherStorage };
  assert.equal(loadWorkspaceTaxRecords(otherCtx).length, 0, 'tax records should be workspace-scoped');
  console.log('✓ P2-B06: taxRepository (calculation + simulation + filing lifecycle)');
}

// === Employee Account Repository ===
{
  const ctx: EmployeeAccountRepositoryContext = { workspaceId: wsId, userId, storage };
  const emp = createWorkspaceEmployeeAccount({ name: 'Carol', email: 'carol@test.dev', role: 'operator', status: 'available', allowedModules: ['dashboard', 'tasks'], metadata: {} }, ctx);
  assert.equal(emp.status, 'available');
  assert.equal(emp.auditHistory.length, 1);
  assert.equal(emp.auditHistory[0].action, 'create');

  const suspended = updateEmployeeAccountStatus(emp.id, 'suspend', 'suspended', ctx, 'policy violation');
  assert.equal(suspended?.status, 'suspended');
  assert.equal(suspended?.auditHistory.length, 2);
  assert.equal(suspended?.auditHistory[0].action, 'suspend');

  const reactivated = updateEmployeeAccountStatus(emp.id, 'reactivate', 'available', ctx);
  assert.equal(reactivated?.status, 'available');
  assert.equal(reactivated?.auditHistory.length, 3);
  console.log('✓ P3-E02: employeeAccountRepository (accounts + audit history)');
}

// === Agent Library Repository ===
{
  const ctx: AgentLibraryRepositoryContext = { workspaceId: wsId, userId, storage };
  const entry = createWorkspaceAgentLibraryEntry({ name: 'Content Agent', description: 'Blog writing agent', assetId: 'asset_001', roleVisibility: ['admin', 'operator'], tags: ['content'], status: 'active', metadata: {} }, ctx);
  assert.equal(entry.name, 'Content Agent');
  assert.equal(entry.roleVisibility.length, 2);

  const updated = updateWorkspaceAgentLibraryEntry(entry.id, { status: 'archived' }, ctx);
  assert.equal(updated?.status, 'archived');
  console.log('✓ P2-B08: agentLibraryRepository (entries CRUD)');
}

// === Campaign Repository (门店营销 B10) ===
{
  const ctx: CampaignRepositoryContext = { workspaceId: wsId, userId, storage };
  const campaign = createWorkspaceCampaign(
    { name: '门店周年庆', channel: 'store_event', status: 'active', moduleId: 'store_marketing', linkedAssetIds: ['asset_poster_1'], metadata: {} },
    ctx,
  );
  assert.equal(campaign.channel, 'store_event');
  assert.equal(campaign.status, 'active');
  assert.equal(campaign.linkedAssetIds.length, 1);

  const list = listWorkspaceCampaigns(ctx).filter((c) => c.channel === 'store_event');
  assert.equal(list.length, 1);

  const paused = updateWorkspaceCampaign(campaign.id, { status: 'paused' }, ctx);
  assert.equal(paused?.status, 'paused');

  // workspace 隔离：另一 workspace 看不到本活动
  const otherCtx: CampaignRepositoryContext = { workspaceId: `${wsId}_other`, userId, storage };
  assert.equal(listWorkspaceCampaigns(otherCtx).length, 0);

  deleteWorkspaceCampaigns([campaign.id], ctx);
  assert.equal(listWorkspaceCampaigns(ctx).length, 0);
  console.log('✓ P2-B10: campaignRepository (store_event lifecycle + isolation)');
}

console.log('\nAll P2/P3 repository contract tests passed.');
