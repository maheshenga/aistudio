import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('TaxEvent resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'tx1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tax-events`)
      .send({ date: '2026-09-30', title: 'VAT filing', type: 'tax_deadline', status: 'pending', amount: 'CNY 8,500.00' })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.title).toBe('VAT filing');
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/tax-events/${id}`)).expect(200);
    expect(got.body.value.amount).toBe('CNY 8,500.00');
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/tax-events/${id}`)
      .send({ status: 'completed' })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/tax-events`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].status).toBe('completed');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/tax-events/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/tax-events`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('rejects unknown daysUntil field (whitelist)', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'txwl@test.dev');
    await auth(accessToken)(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tax-events`)
      .send({ date: '2026-09-30', title: 'X', type: 'tax_deadline', status: 'pending', daysUntil: 5 })).expect(400);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'txiso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/tax-events`).send({ date: '2026-09-30', title: 'Secret', type: 'tax_deadline', status: 'pending' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'txiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/tax-events/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/tax-events/${id}`).send({ status: 'completed' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/tax-events/${id}`)).expect(404);
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'txpg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tax-events`)
        .send({ date: '2026-09-30', title: `e${i}`, type: 'tax_deadline', status: 'pending' })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tax-events?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tax-events?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tax-events?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'txm1@test.dev');
    const a2 = await registerUser(app, 'txm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/tax-events`)).expect(403);
  });

  it('status filter', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'txflt@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tax-events`)
      .send({ date: '2026-09-30', title: 'A', type: 'tax_deadline', status: 'pending' })).expect(201);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tax-events`)
      .send({ date: '2026-09-30', title: 'B', type: 'tax_deadline', status: 'completed' })).expect(201);
    const q = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tax-events?status=pending`)).expect(200);
    expect(q.body.value.items).toHaveLength(1);
    expect(q.body.value.items[0].title).toBe('A');
  });
});
