import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Ticket resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'tk1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tickets`)
      .send({ requesterName: 'Chen', category: 'billing', subject: 'Refund', priority: 'high' })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.requesterName).toBe('Chen');
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/tickets/${id}`)).expect(200);
    expect(got.body.value.subject).toBe('Refund');
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/tickets/${id}`)
      .send({ status: 'resolved', resolvedAt: new Date().toISOString(), firstResponseMinutes: 30 })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/tickets`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].status).toBe('resolved');
    expect(listed.body.value.items[0].firstResponseMinutes).toBe(30);
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/tickets/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/tickets`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'tkiso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/tickets`).send({ requesterName: 'X', category: 'c', subject: 'Secret' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'tkiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/tickets/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/tickets/${id}`).send({ status: 'closed' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/tickets/${id}`)).expect(404);
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'tkpg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tickets`)
        .send({ requesterName: `r${i}`, category: 'c', subject: `s${i}` })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tickets?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tickets?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tickets?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'tkm1@test.dev');
    const a2 = await registerUser(app, 'tkm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/tickets`)).expect(403);
  });

  it('status filter', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'tkflt@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tickets`)
      .send({ requesterName: 'A', category: 'c', subject: 's', status: 'open' })).expect(201);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tickets`)
      .send({ requesterName: 'B', category: 'c', subject: 's', status: 'closed' })).expect(201);
    const q = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tickets?status=open`)).expect(200);
    expect(q.body.value.items).toHaveLength(1);
    expect(q.body.value.items[0].requesterName).toBe('A');
  });
});
