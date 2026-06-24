/**
 * Staging API smoke — hits a live NestJS stack (default http://localhost:4000).
 * Verifies auth, credit hold/capture/refund, and generation-job lifecycle.
 *
 * Usage:
 *   npm run test:staging-api-smoke
 *   STAGING_API_URL=http://127.0.0.1:4000 npm run test:staging-api-smoke
 */

import assert from 'node:assert/strict';

const API = (process.env.STAGING_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const email = process.env.STAGING_SMOKE_EMAIL ?? `staging-smoke-${Date.now()}@test.dev`;
const password = process.env.STAGING_SMOKE_PASSWORD ?? 'StagingSmoke1!';

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

const IMAGE_GENERATION_CREDITS = 8;

async function run() {
  console.log(`Staging API smoke → ${API}`);

  const reg = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name: 'Staging Smoke' }),
  });
  assert.equal(reg.status, 201, `register failed: ${JSON.stringify(reg.body)}`);
  const accessToken = (reg.body as { value: { accessToken: string } }).value.accessToken;

  const me = await api('/auth/me', {}, accessToken);
  assert.equal(me.status, 200);
  const workspaceId = (me.body as { value: { memberships: { workspaceId: string }[] } }).value.memberships[0].workspaceId;

  const balanceBefore = await api(`/workspaces/${workspaceId}/credits/balance`, {}, accessToken);
  assert.equal(balanceBefore.status, 200);
  const before = (balanceBefore.body as { value: { balance: number } }).value.balance;
  assert.ok(before >= 5, `expected starter balance >= 5, got ${before}`);

  const created = await api(`/workspaces/${workspaceId}/generation-jobs`, {
    method: 'POST',
    body: JSON.stringify({
      type: 'image',
      moduleId: 'image',
      title: 'Staging smoke image',
      prompt: 'product photo on white background',
      providerKind: 'mock',
      runtimeMode: 'web',
      status: 'pending',
    }),
  }, accessToken);
  assert.equal(created.status, 201, `create job failed: ${JSON.stringify(created.body)}`);
  const jobId = (created.body as { value: { id: string; status: string } }).value.id;
  assert.equal((created.body as { value: { status: string } }).value.status, 'pending');

  const afterHold = await api(`/workspaces/${workspaceId}/credits/balance`, {}, accessToken);
  const held = (afterHold.body as { value: { balance: number } }).value.balance;
  assert.equal(held, before - IMAGE_GENERATION_CREDITS, `hold: expected ${before - IMAGE_GENERATION_CREDITS}, got ${held}`);

  await api(`/workspaces/${workspaceId}/generation-jobs/${jobId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'running' }),
  }, accessToken).then((r) => assert.equal(r.status, 200));

  await api(`/workspaces/${workspaceId}/generation-jobs/${jobId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'succeeded' }),
  }, accessToken).then((r) => assert.equal(r.status, 200));

  const afterCapture = await api(`/workspaces/${workspaceId}/credits/balance`, {}, accessToken);
  const captured = (afterCapture.body as { value: { balance: number } }).value.balance;
  assert.equal(captured, before - IMAGE_GENERATION_CREDITS, `capture: expected ${before - IMAGE_GENERATION_CREDITS}, got ${captured}`);

  const failedJob = await api(`/workspaces/${workspaceId}/generation-jobs`, {
    method: 'POST',
    body: JSON.stringify({
      type: 'image',
      moduleId: 'image',
      providerKind: 'mock',
      runtimeMode: 'web',
      status: 'pending',
    }),
  }, accessToken);
  assert.equal(failedJob.status, 201);
  const failedId = (failedJob.body as { value: { id: string } }).value.id;
  const midBalance = (await api(`/workspaces/${workspaceId}/credits/balance`, {}, accessToken)).body as { value: { balance: number } };
  assert.equal(midBalance.value.balance, before - IMAGE_GENERATION_CREDITS * 2);

  await api(`/workspaces/${workspaceId}/generation-jobs/${failedId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'failed', error: 'staging smoke refund' }),
  }, accessToken).then((r) => assert.equal(r.status, 200));

  const afterRefund = await api(`/workspaces/${workspaceId}/credits/balance`, {}, accessToken);
  const refunded = (afterRefund.body as { value: { balance: number } }).value.balance;
  assert.equal(refunded, before - IMAGE_GENERATION_CREDITS, `refund: expected ${before - IMAGE_GENERATION_CREDITS}, got ${refunded}`);

  const refresh = await api('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: (reg.body as { value: { refreshToken: string } }).value.refreshToken }),
  });
  assert.equal(refresh.status, 201);
  assert.ok((refresh.body as { value: { accessToken: string } }).value.accessToken);

  console.log('✓ register + workspace');
  console.log(`✓ credit hold (-${IMAGE_GENERATION_CREDITS}) on image job create`);
  console.log('✓ credit capture on succeed (no double charge)');
  console.log('✓ credit refund on failed job');
  console.log('✓ refresh token rotation');
  console.log(`All staging API smoke checks passed (${email}).`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
