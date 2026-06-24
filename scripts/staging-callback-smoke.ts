/**
 * P1-R03 staging callback smoke — async job lifecycle on live HTTP API.
 * Simulates provider callback completion for video / remix / director modules:
 * create (hold) → running → succeeded (capture) + asset link; failed path refunds.
 *
 * Usage:
 *   npm run test:staging-callback-smoke
 */

import assert from 'node:assert/strict';

const API = (process.env.STAGING_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const email = process.env.STAGING_SMOKE_EMAIL ?? `staging-callback-${Date.now()}@test.dev`;
const password = process.env.STAGING_SMOKE_PASSWORD ?? 'StagingSmoke1!';

type ModuleCase = { moduleId: string; assetKind: string; title: string };

const MODULES: ModuleCase[] = [
  { moduleId: 'video', assetKind: 'video', title: 'Staging callback video' },
  { moduleId: 'remix_smart', assetKind: 'video', title: 'Staging callback remix' },
  { moduleId: 'director_desk', assetKind: 'video', title: 'Staging callback director' },
];

async function api(path: string, init: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body };
}

async function register(): Promise<{ token: string; workspaceId: string }> {
  const reg = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name: 'Callback Smoke' }),
  });
  assert.equal(reg.status, 201, `register failed: ${JSON.stringify(reg.body)}`);
  const token = (reg.body as { value: { accessToken: string } }).value.accessToken;
  const me = await api('/auth/me', {}, token);
  const workspaceId = (me.body as { value: { memberships: { workspaceId: string }[] } }).value.memberships[0].workspaceId;
  return { token, workspaceId };
}

async function balance(token: string, workspaceId: string): Promise<number> {
  const res = await api(`/workspaces/${workspaceId}/credits/balance`, {}, token);
  assert.equal(res.status, 200);
  return (res.body as { value: { balance: number } }).value.balance;
}

async function runModule(
  mod: ModuleCase,
  token: string,
  workspaceId: string,
  providerJobId: string,
): Promise<void> {
  const before = await balance(token, workspaceId);

  const created = await api(`/workspaces/${workspaceId}/generation-jobs`, {
    method: 'POST',
    body: JSON.stringify({
      type: 'generation',
      moduleId: mod.moduleId,
      title: mod.title,
      prompt: 'staging callback smoke',
      providerKind: 'mock-render',
      runtimeMode: 'web',
      status: 'pending',
      runtimeTaskId: providerJobId,
      metadata: { providerJobId, provider: 'mock-render', callbackScenario: 'success' },
    }),
  }, token);
  assert.equal(created.status, 201, `${mod.moduleId} create: ${JSON.stringify(created.body)}`);
  const jobId = (created.body as { value: { id: string; externalTaskId?: string } }).value.id;
  const externalTaskId = (created.body as { value: { externalTaskId?: string } }).value.externalTaskId;
  assert.equal(externalTaskId, providerJobId, `${mod.moduleId}: externalTaskId should map provider id`);
  assert.notEqual(jobId, providerJobId, `${mod.moduleId}: local job id must not be replaced`);

  const startBalance = await balance(token, workspaceId);
  assert.equal(startBalance, before - 5, `${mod.moduleId}: hold on create`);

  await api(`/workspaces/${workspaceId}/generation-jobs/${jobId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'running', progress: 50 }),
  }, token).then((r) => assert.equal(r.status, 200));
  assert.equal(await balance(token, workspaceId), startBalance, `${mod.moduleId}: balance unchanged while running`);

  await api(`/workspaces/${workspaceId}/generation-jobs/${jobId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'succeeded', progress: 100 }),
  }, token).then((r) => assert.equal(r.status, 200));
  assert.equal(await balance(token, workspaceId), startBalance, `${mod.moduleId}: capture on succeed`);

  const asset = await api(`/workspaces/${workspaceId}/assets`, {
    method: 'POST',
    body: JSON.stringify({
      kind: mod.assetKind,
      name: `${mod.moduleId}-${providerJobId}.mp4`,
      moduleId: mod.moduleId,
      jobId,
      url: `aistudio://provider-output/${providerJobId}.mp4`,
      source: 'generated',
      metadata: { providerJobId, callbackScenario: 'success' },
    }),
  }, token);
  assert.equal(asset.status, 201, `${mod.moduleId} asset: ${JSON.stringify(asset.body)}`);

  const dup = await api(`/workspaces/${workspaceId}/generation-jobs/${jobId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'running' }),
  }, token);
  assert.equal(dup.status, 400, `${mod.moduleId}: terminal job should reject re-transition`);
  assert.equal(await balance(token, workspaceId), startBalance, `${mod.moduleId}: idempotent balance`);

  const failed = await api(`/workspaces/${workspaceId}/generation-jobs`, {
    method: 'POST',
    body: JSON.stringify({
      moduleId: mod.moduleId,
      providerKind: 'mock-render',
      runtimeMode: 'web',
      status: 'pending',
      runtimeTaskId: `${providerJobId}-fail`,
    }),
  }, token);
  assert.equal(failed.status, 201);
  const failedId = (failed.body as { value: { id: string } }).value.id;
  assert.equal(await balance(token, workspaceId), startBalance - 5);
  await api(`/workspaces/${workspaceId}/generation-jobs/${failedId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'failed', error: 'Provider timeout' }),
  }, token).then((r) => assert.equal(r.status, 200));
  assert.equal(await balance(token, workspaceId), startBalance, `${mod.moduleId}: refund after failed callback`);

  console.log(`✓ P1-R03 staging: ${mod.moduleId} (hold/capture/asset/refund/idempotent)`);
}

async function run() {
  console.log(`Staging callback smoke → ${API}`);
  const { token, workspaceId } = await register();
  const ts = Date.now();

  for (const mod of MODULES) {
    await runModule(mod, token, workspaceId, `ext_${mod.moduleId}_${ts}`);
  }

  console.log(`All P1-R03 staging callback checks passed (${email}).`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
