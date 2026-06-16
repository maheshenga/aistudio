import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('MediaAccount resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'med1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/media-accounts`)
      .send({ platformName: 'YouTube', status: 'active', connectedAccounts: 5, credentialRef: 'env:YT', clientIdLast4: '1234' })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.platformName).toBe('YouTube');
    expect(created.body.value.clientIdLast4).toBe('1234');
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/media-accounts/${id}`)).expect(200);
    expect(got.body.value.credentialRef).toBe('env:YT');
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/media-accounts/${id}`)
      .send({ status: 'rate_limited' })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/media-accounts`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].status).toBe('rate_limited');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/media-accounts/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/media-accounts`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('rejects unknown clientId field (whitelist)', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'medwl@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/media-accounts`)
      .send({ platformName: 'X', clientId: 'rawsecret9999' })).expect(400);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'mediso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/media-accounts`).send({ platformName: 'Secret' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'mediso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/media-accounts/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/media-accounts/${id}`).send({ status: 'offline' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/media-accounts/${id}`)).expect(404);
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'medpg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/media-accounts`)
        .send({ platformName: `p${i}` })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/media-accounts?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/media-accounts?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/media-accounts?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'medm1@test.dev');
    const a2 = await registerUser(app, 'medm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/media-accounts`)).expect(403);
  });
});
