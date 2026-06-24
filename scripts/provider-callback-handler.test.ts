/**
 * P1-R03: Provider Callback Handler 测试
 */

import assert from 'node:assert/strict';
import { createDemoAuthSession, type StorageLike } from '../src/saas/localAuthSession.ts';
import { createGenerationJob, getGenerationJob, type GenerationJobRepositoryContext } from '../src/lib/data/generationJobRepository';
import { loadWorkspaceAssets } from '../src/lib/data/assetRepository';
import { listAuditLogs } from '../src/lib/data/auditLogRepository';
import {
  createCallbackFixture,
  handleProviderCallback,
  providerCallbackFixtures,
  type ProviderCallbackPayload,
} from '../src/runtime/providerCallbackHandler';

function createMemoryStorage(): StorageLike {
  const records = new Map<string, string>();
  return {
    getItem: (key) => records.get(key) ?? null,
    setItem: (key, value) => { records.set(key, value); },
    removeItem: (key) => { records.delete(key); },
  };
}

async function run() {
  const session = createDemoAuthSession({ now: 1_780_000_000_000 });
  const workspaceId = session.workspace.id;
  const userId = session.user.id;
  const storage = createMemoryStorage();

  const jobRepoContext: GenerationJobRepositoryContext = { workspaceId, userId, storage };
  const auditContext = { session, storage };

  async function createRunningJob(moduleId: 'video' | 'remix_smart' | 'director_desk' = 'video'): Promise<string> {
    const job = await createGenerationJob({
      title: `Test ${moduleId} job`,
      prompt: 'test prompt',
      status: 'running',
      providerKind: 'mock',
      runtimeMode: 'web',
      moduleId,
      progress: 50,
      metadata: {},
    }, jobRepoContext);
    return job.id;
  }

  {
    const localJobId = await createRunningJob('video');
    const payload: ProviderCallbackPayload = createCallbackFixture('success', { providerJobId: 'ext_success_1', localJobId });
    const result = await handleProviderCallback(payload, jobRepoContext, auditContext, 'video');
    assert.equal(result.handled, true, 'success callback should be handled');
    assert.equal(result.idempotent, false);
    assert.equal(result.jobStatus, 'succeeded');
    assert.ok(result.assetIds.length > 0, 'should create output assets');
    const job = getGenerationJob(localJobId, jobRepoContext);
    assert.ok(job);
    assert.equal(job!.status, 'succeeded');
    assert.equal(job!.metadata.providerJobId, 'ext_success_1', 'provider job id should be mapped');
    assert.notEqual(job!.id, 'ext_success_1', 'local job id should NOT be replaced by provider id');
    const assets = loadWorkspaceAssets({ workspaceId, storage });
    const videoAssets = assets.filter(a => a.generationJobId === localJobId);
    assert.ok(videoAssets.length > 0, 'output asset saved with generationJobId link');
    assert.equal(videoAssets[0].type, 'video');
    const logs = listAuditLogs({ workspaceId, storage });
    const completeLog = logs.find(l => l.action === 'generation_job_complete' && l.targetId === localJobId);
    assert.ok(completeLog, 'should emit generation_job_complete audit');
    console.log('✓ P1-R03: success callback');
  }

  {
    const localJobId = await createRunningJob('remix_smart');
    const payload = createCallbackFixture('partial_success', { providerJobId: 'ext_partial_1', localJobId });
    const result = await handleProviderCallback(payload, jobRepoContext, auditContext, 'remix_smart');
    assert.equal(result.handled, true);
    assert.equal(result.jobStatus, 'succeeded');
    const job = getGenerationJob(localJobId, jobRepoContext);
    assert.equal(job!.metadata.partialSuccess, true);
    assert.ok(result.assetIds.length > 0);
    console.log('✓ P1-R03: partial_success callback');
  }

  {
    const localJobId = await createRunningJob('director_desk');
    const payload = createCallbackFixture('provider_error', { providerJobId: 'ext_error_1', localJobId });
    const result = await handleProviderCallback(payload, jobRepoContext, auditContext, 'director_desk');
    assert.equal(result.handled, true);
    assert.equal(result.jobStatus, 'failed');
    assert.ok(result.error);
    const job = getGenerationJob(localJobId, jobRepoContext);
    assert.equal(job!.status, 'failed');
    assert.equal(job!.metadata.retryable, true);
    const logs = listAuditLogs({ workspaceId, storage });
    const failLog = logs.find(l => l.action === 'generation_job_failed' && l.targetId === localJobId);
    assert.ok(failLog);
    console.log('✓ P1-R03: provider_error callback');
  }

  {
    const localJobId = await createRunningJob('video');
    const payload = createCallbackFixture('timeout', { providerJobId: 'ext_timeout_1', localJobId });
    const result = await handleProviderCallback(payload, jobRepoContext, auditContext, 'video');
    assert.equal(result.jobStatus, 'failed');
    const job = getGenerationJob(localJobId, jobRepoContext);
    assert.equal(job!.metadata.retryable, true);
    console.log('✓ P1-R03: timeout callback');
  }

  {
    const localJobId = await createRunningJob('video');
    const firstPayload = createCallbackFixture('success', { providerJobId: 'ext_dup_1', localJobId });
    await handleProviderCallback(firstPayload, jobRepoContext, auditContext, 'video');
    const dupPayload = createCallbackFixture('duplicate', { providerJobId: 'ext_dup_1', localJobId });
    const result = await handleProviderCallback(dupPayload, jobRepoContext, auditContext, 'video');
    assert.equal(result.handled, false, 'duplicate on terminal job should not be re-handled');
    assert.equal(result.idempotent, true);
    assert.equal(result.jobStatus, 'succeeded');
    console.log('✓ P1-R03: duplicate callback (idempotent)');
  }

  {
    const payload = createCallbackFixture('success', { providerJobId: 'ext_ghost', localJobId: 'gen_nonexistent' });
    const result = await handleProviderCallback(payload, jobRepoContext, auditContext, 'video');
    assert.equal(result.handled, false);
    assert.equal(result.error, 'Local job not found');
    console.log('✓ P1-R03: nonexistent job safely returns');
  }

  {
    assert.ok(providerCallbackFixtures.success.outputs);
    assert.ok(providerCallbackFixtures.provider_error.errorMessage);
    assert.ok(providerCallbackFixtures.timeout.errorMessage);
    assert.equal(providerCallbackFixtures.duplicate.scenario, 'duplicate');
    console.log('✓ P1-R03: fixtures integrity');
  }

  console.log('All P1-R03 provider callback handler tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
