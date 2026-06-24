import { createServer, type Server } from 'node:http';
import { AddressInfo } from 'node:net';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { WebhookDeliveryService, signWebhookPayload } from '../src/webhook/webhook-delivery.service';

describe('Webhook delivery (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let delivery: WebhookDeliveryService;
  let server: Server;
  let received: { headers: Record<string, string | string[] | undefined>; body: string } | null;

  beforeAll(async () => {
    ({ app, prisma } = await bootstrapTestApp());
    delivery = app.get(WebhookDeliveryService);
  });

  beforeEach(async () => {
    await resetDb(prisma);
    received = null;
    await new Promise<void>((resolve, reject) => {
      server = createServer((req, res) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        req.on('end', () => {
          received = {
            headers: req.headers as Record<string, string | string[] | undefined>,
            body: Buffer.concat(chunks).toString('utf8'),
          };
          res.statusCode = 200;
          res.end('ok');
        });
      });
      server.listen(0, '127.0.0.1', () => resolve());
      server.on('error', reject);
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  afterAll(async () => {
    await app.close();
  });

  it('delivers generation.completed with HMAC signature when job succeeds', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'whdel1@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    const port = (server.address() as AddressInfo).port;
    const signingSecret = 'whsec-test-signing-secret';

    await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/webhooks`).send({
      name: 'Generation hook',
      url: `http://127.0.0.1:${port}/hook`,
      signingSecret,
      events: ['generation.completed'],
    })).expect(201);

    const created = await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/generation-jobs`)
      .send({ type: 'image', input: { prompt: 'cat' } })).expect(201);
    const jobId = created.body.value.id;

    await auth(request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/generation-jobs/${jobId}/status`)
      .send({ status: 'running' })).expect(200);
    await auth(request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/generation-jobs/${jobId}/status`)
      .send({ status: 'succeeded' })).expect(200);

    const pending = await prisma.webhookDelivery.findMany({ where: { workspaceId } });
    expect(pending).toHaveLength(1);
    expect(pending[0].eventType).toBe('generation.completed');

    await delivery.processPendingBatch();

    expect(received).toBeTruthy();
    const signature = String(received!.headers['x-webhook-signature'] ?? '');
    expect(signature).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);
    const timestamp = Number(signature.match(/^t=(\d+),/)?.[1]);
    expect(signWebhookPayload(signingSecret, timestamp, received!.body)).toBe(signature);
    expect(JSON.parse(received!.body)).toMatchObject({
      type: 'generation.completed',
      data: { jobId, status: 'succeeded' },
    });

    const endpoint = await prisma.webhookEndpoint.findFirst({ where: { workspaceId } });
    expect(endpoint?.lastDeliveredAt).toBeTruthy();
    expect(endpoint?.failureCount).toBe(0);

    const delivered = await prisma.webhookDelivery.findUnique({ where: { id: pending[0].id } });
    expect(delivered?.status).toBe('delivered');
    expect(delivered?.httpStatus).toBe(200);

    const listed = await auth(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/webhooks/${endpoint!.id}/deliveries`)).expect(200);
    expect(listed.body.value).toHaveLength(1);
    expect(listed.body.value[0].eventType).toBe('generation.completed');
    expect(listed.body.value[0].status).toBe('delivered');
  });

  it('enqueues generation.failed and delivers payload with error', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'whdel2@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    const port = (server.address() as AddressInfo).port;

    await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/webhooks`).send({
      name: 'Failure hook',
      url: `http://127.0.0.1:${port}/hook`,
      signingSecret: 'whsec-failure-secret',
      events: ['generation.failed'],
    })).expect(201);

    const created = await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/generation-jobs`)
      .send({ type: 'image', input: {} })).expect(201);
    const jobId = created.body.value.id;

    await auth(request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/generation-jobs/${jobId}/status`)
      .send({ status: 'failed', error: 'provider timeout' })).expect(200);

    const row = await prisma.webhookDelivery.findFirst({ where: { workspaceId } });
    expect(row?.eventType).toBe('generation.failed');

    await delivery.processPendingBatch();
    expect(received?.body).toContain('provider timeout');
  });

  it('POST test sends immediate signed test delivery', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'whdel3@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    const port = (server.address() as AddressInfo).port;
    const signingSecret = 'whsec-test-endpoint-secret';

    const created = await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/webhooks`).send({
      name: 'Test ping hook',
      url: `http://127.0.0.1:${port}/hook`,
      signingSecret,
      events: ['generation.completed'],
    })).expect(201);
    const endpointId = created.body.value.id;

    received = null;
    const testResult = await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/webhooks/${endpointId}/test`)).expect(201);
    expect(testResult.body.value.status).toBe('delivered');
    expect(testResult.body.value.httpStatus).toBe(200);
    expect(received).toBeTruthy();
    expect(JSON.parse(received!.body)).toMatchObject({ type: 'generation.completed', data: { test: true } });
  });

  it('enqueues asset.created when an asset is created', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'whdel4@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    const port = (server.address() as AddressInfo).port;

    await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/webhooks`).send({
      name: 'Asset hook',
      url: `http://127.0.0.1:${port}/hook`,
      signingSecret: 'whsec-asset-secret',
      events: ['asset.created'],
    })).expect(201);

    const created = await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/assets`)
      .send({ kind: 'image', url: 'http://x/photo.png', name: 'Hero' })).expect(201);
    const assetId = created.body.value.id;

    const row = await prisma.webhookDelivery.findFirst({ where: { workspaceId } });
    expect(row?.eventType).toBe('asset.created');

    await delivery.processPendingBatch();
    expect(JSON.parse(received!.body)).toMatchObject({
      type: 'asset.created',
      data: { assetId, kind: 'image', url: 'http://x/photo.png' },
    });
  });

  it('enqueues billing.invoice_issued for issued invoices', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'whdel5@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    const port = (server.address() as AddressInfo).port;

    await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/webhooks`).send({
      name: 'Invoice hook',
      url: `http://127.0.0.1:${port}/hook`,
      signingSecret: 'whsec-invoice-secret',
      events: ['billing.invoice_issued'],
    })).expect(201);

    const created = await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/financial-records`)
      .send({ kind: 'invoice', status: 'issued', amountCents: 12000, counterparty: 'Acme' })).expect(201);
    const invoiceId = created.body.value.id;

    const row = await prisma.webhookDelivery.findFirst({ where: { workspaceId } });
    expect(row?.eventType).toBe('billing.invoice_issued');

    await delivery.processPendingBatch();
    expect(JSON.parse(received!.body)).toMatchObject({
      type: 'billing.invoice_issued',
      data: { invoiceId, amountCents: 12000, counterparty: 'Acme' },
    });
  });

  it('enqueues agent.task_updated on task create and update', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'whdel6@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    const port = (server.address() as AddressInfo).port;

    await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/webhooks`).send({
      name: 'Task hook',
      url: `http://127.0.0.1:${port}/hook`,
      signingSecret: 'whsec-task-secret',
      events: ['agent.task_updated'],
    })).expect(201);

    const created = await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/tasks`)
      .send({ title: 'Draft copy', column: 'todo', priority: 'Medium', type: 'content', date: '', isAuto: false })).expect(201);
    const taskId = created.body.value.id;

    const rows = await prisma.webhookDelivery.findMany({ where: { workspaceId }, orderBy: { createdAt: 'asc' } });
    expect(rows).toHaveLength(1);
    expect(rows[0].eventType).toBe('agent.task_updated');

    await auth(request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/tasks/${taskId}`)
      .send({ column: 'done' })).expect(200);

    const afterUpdate = await prisma.webhookDelivery.findMany({ where: { workspaceId }, orderBy: { createdAt: 'asc' } });
    expect(afterUpdate).toHaveLength(2);

    await delivery.processPendingBatch();
    expect(JSON.parse(received!.body)).toMatchObject({
      type: 'agent.task_updated',
      data: { taskId, column: 'done', change: 'updated' },
    });
  });
});
