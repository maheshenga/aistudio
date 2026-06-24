import assert from 'node:assert/strict';
import { signWebhookPayload, terminalGenerationEventType, buildGenerationWebhookPayload, buildTestWebhookPayload } from '../apps/api/src/webhook/webhook-delivery.service.ts';

{
  assert.equal(terminalGenerationEventType('succeeded'), 'generation.completed');
  assert.equal(terminalGenerationEventType('failed'), 'generation.failed');
  assert.equal(terminalGenerationEventType('cancelled'), 'generation.failed');
  assert.equal(terminalGenerationEventType('running'), null);

  const payload = buildGenerationWebhookPayload({
    id: 'job_1',
    workspaceId: 'ws_1',
    status: 'succeeded',
    moduleId: 'image',
    type: 'image',
    error: null,
    progress: 100,
    attempt: 1,
    finishedAt: new Date('2026-06-24T00:00:00.000Z'),
  } as any, 'generation.completed');
  assert.equal(payload.id, 'generation.completed:job_1');
  assert.equal(payload.data.jobId, 'job_1');

  const body = JSON.stringify(payload);
  const signature = signWebhookPayload('whsec-demo', 1_718_000_000, body);
  assert.match(signature, /^t=1718000000,v1=[0-9a-f]{64}$/);
  assert.equal(signWebhookPayload('whsec-demo', 1_718_000_000, body), signature);
  assert.notEqual(signWebhookPayload('whsec-other', 1_718_000_000, body), signature);

  const testPayload = buildTestWebhookPayload('wh_ep1', 'generation.completed');
  assert.equal(testPayload.data.test, true);
  assert.match(String(testPayload.id), /^test:wh_ep1:/);
}

console.log('webhook delivery contract passed');
