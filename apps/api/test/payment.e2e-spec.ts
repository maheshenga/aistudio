import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('PaymentMethod resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'pm1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/payment-methods`)
      .send({ label: 'Primary', provider: 'Stripe', brand: 'Visa', last4: '4242', isDefault: true })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.last4).toBe('4242');
    expect(created.body.value.isDefault).toBe(true);
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/payment-methods/${id}`)).expect(200);
    expect(got.body.value.provider).toBe('Stripe');
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/payment-methods/${id}`)
      .send({ status: 'disabled' })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/payment-methods`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].status).toBe('disabled');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/payment-methods/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/payment-methods`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('rejects unknown accountNumber field (whitelist)', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'pmwl@test.dev');
    await auth(accessToken)(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/payment-methods`)
      .send({ label: 'X', provider: 'Stripe', brand: 'Visa', last4: '1111', accountNumber: '4242424242424242' })).expect(400);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'pmiso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/payment-methods`).send({ label: 'Secret', provider: 'Stripe', brand: 'Visa', last4: '9999' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'pmiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/payment-methods/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/payment-methods/${id}`).send({ status: 'disabled' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/payment-methods/${id}`)).expect(404);
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'pmpg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/payment-methods`)
        .send({ label: `m${i}`, provider: 'Stripe', brand: 'Visa', last4: `000${i}` })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/payment-methods?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/payment-methods?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/payment-methods?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'pmm1@test.dev');
    const a2 = await registerUser(app, 'pmm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/payment-methods`)).expect(403);
  });
});
