import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Campaign resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'cmp1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/campaigns`)
      .send({ name: 'Launch', channel: 'viral_qr', linkedAssetIds: ['a1'], metrics: { scans: 3 } })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.name).toBe('Launch');
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/campaigns/${id}`)).expect(200);
    expect(got.body.value.channel).toBe('viral_qr');
    expect(got.body.value.linkedAssetIds).toEqual(['a1']);
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/campaigns/${id}`)
      .send({ status: 'active' })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/campaigns`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].status).toBe('active');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/campaigns/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/campaigns`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'cmpiso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/campaigns`).send({ name: 'Secret' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'cmpiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/campaigns/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/campaigns/${id}`).send({ status: 'active' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/campaigns/${id}`)).expect(404);
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'cmppg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/campaigns`)
        .send({ name: `c${i}` })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/campaigns?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    expect(p1.body.value.nextCursor).not.toBeNull();
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/campaigns?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/campaigns?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'cmpm1@test.dev');
    const a2 = await registerUser(app, 'cmpm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/campaigns`)).expect(403);
  });

  it('status filter', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'cmpflt@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/campaigns`)
      .send({ name: 'A', status: 'active' })).expect(201);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/campaigns`)
      .send({ name: 'B', status: 'draft' })).expect(201);
    const q = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/campaigns?status=active`)).expect(200);
    expect(q.body.value.items).toHaveLength(1);
    expect(q.body.value.items[0].name).toBe('A');
  });
});
