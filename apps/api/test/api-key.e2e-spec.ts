import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('ApiKey resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('create encrypts secret, never returns ciphertext', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'apikey1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/api-keys`)
      .send({ name: 'CI key', secret: 'sk-live-abcd1234' })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.last4).toBe('1234');
    expect(created.body.value.secretCiphertext).toBeUndefined();
    expect(created.body.value.secret).toBeUndefined();
    const dbRow = await prisma.apiKey.findUnique({ where: { id } });
    expect(dbRow?.secretCiphertext).toBeTruthy();
    expect(dbRow?.secretCiphertext).not.toContain('sk-live-abcd1234');
    expect(dbRow?.secretCiphertext?.split(':')).toHaveLength(3);
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/api-keys/${id}`)).expect(200);
    expect(got.body.value.secretCiphertext).toBeUndefined();
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/api-keys`)).expect(200);
    expect(listed.body.value.items[0].secretCiphertext).toBeUndefined();
    expect(listed.body.value.items[0].last4).toBe('1234');
  });

  it('rejects unknown field (whitelist)', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'apikeywl@test.dev');
    await auth(accessToken)(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/api-keys`)
      .send({ name: 'X', secret: 'sk-x', rawKey: 'leak' })).expect(400);
  });

  it('workspace isolation: cross-tenant get → 404', async () => {
    const a1 = await registerUser(app, 'apikeyiso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/api-keys`).send({ name: 'S', secret: 'sk-secret' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'apikeyiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/api-keys/${id}`)).expect(404);
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'apikeym1@test.dev');
    const a2 = await registerUser(app, 'apikeym2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/api-keys`)).expect(403);
  });
});
