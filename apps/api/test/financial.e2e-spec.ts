import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('FinancialRecord resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip with occurredAt', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'fin1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/financial-records`)
      .send({ kind: 'subscription', status: 'paid', amountCents: 9900, currency: 'CNY', counterparty: 'Acme', occurredAt: '2026-06-01T00:00:00.000Z' })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.amountCents).toBe(9900);
    expect(created.body.value.kind).toBe('subscription');
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/financial-records/${id}`)).expect(200);
    expect(got.body.value.counterparty).toBe('Acme');
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/financial-records/${id}`)
      .send({ status: 'refunded' })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/financial-records`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].status).toBe('refunded');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/financial-records/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/financial-records`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('kind filter', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'finkind@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/financial-records`)
      .send({ kind: 'subscription', status: 'paid', amountCents: 100 })).expect(201);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/financial-records`)
      .send({ kind: 'refund', status: 'refunded', amountCents: 50 })).expect(201);
    const q = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/financial-records?kind=refund`)).expect(200);
    expect(q.body.value.items).toHaveLength(1);
    expect(q.body.value.items[0].kind).toBe('refund');
  });

  it('status filter', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'finstat@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/financial-records`)
      .send({ kind: 'invoice', status: 'issued', amountCents: 100 })).expect(201);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/financial-records`)
      .send({ kind: 'invoice', status: 'paid', amountCents: 200 })).expect(201);
    const q = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/financial-records?status=issued`)).expect(200);
    expect(q.body.value.items).toHaveLength(1);
    expect(q.body.value.items[0].status).toBe('issued');
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'finpg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/financial-records`)
        .send({ kind: 'payment', status: 'paid', amountCents: 100 + i })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/financial-records?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/financial-records?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/financial-records?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'finiso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/financial-records`).send({ kind: 'payment', status: 'paid', amountCents: 100 })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'finiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/financial-records/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/financial-records/${id}`).send({ status: 'cancelled' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/financial-records/${id}`)).expect(404);
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'finm1@test.dev');
    const a2 = await registerUser(app, 'finm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/financial-records`)).expect(403);
  });
});
