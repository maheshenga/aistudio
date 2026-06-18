import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Webhook resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('create encrypts signingSecret, never returns ciphertext', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'wh1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/webhooks`)
      .send({ name: 'Order hook', url: 'https://ex.com/h', signingSecret: 'whsec-abcd9876', events: ['order.created'] })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.signingSecretLast4).toBe('9876');
    expect(created.body.value.signingSecretCiphertext).toBeUndefined();
    expect(created.body.value.signingSecret).toBeUndefined();
    expect(created.body.value.events).toEqual(['order.created']);
    const dbRow = await prisma.webhookEndpoint.findUnique({ where: { id } });
    expect(dbRow?.signingSecretCiphertext).toBeTruthy();
    expect(dbRow?.signingSecretCiphertext).not.toContain('whsec-abcd9876');
    expect(dbRow?.signingSecretCiphertext?.split(':')).toHaveLength(3);
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/webhooks/${id}`)).expect(200);
    expect(got.body.value.signingSecretCiphertext).toBeUndefined();
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/webhooks`)).expect(200);
    expect(listed.body.value.items[0].signingSecretCiphertext).toBeUndefined();
    expect(listed.body.value.items[0].signingSecretLast4).toBe('9876');
  });

  it('rejects unknown field (whitelist)', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'whwl@test.dev');
    await auth(accessToken)(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/webhooks`)
      .send({ name: 'X', url: 'https://ex.com', signingSecret: 'whsec-x', rawSecret: 'leak' })).expect(400);
  });

  it('workspace isolation: cross-tenant get → 404', async () => {
    const a1 = await registerUser(app, 'whiso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/webhooks`).send({ name: 'S', url: 'https://ex.com', signingSecret: 'whsec-secret' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'whiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/webhooks/${id}`)).expect(404);
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'whm1@test.dev');
    const a2 = await registerUser(app, 'whm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/webhooks`)).expect(403);
  });
});
