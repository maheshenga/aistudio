import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Customer resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'cu1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/customers`)
      .send({ name: 'Acme', company: 'Acme Inc' })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.name).toBe('Acme');
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/customers/${id}`)).expect(200);
    expect(got.body.value.company).toBe('Acme Inc');
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/customers/${id}`)
      .send({ notes: 'vip' })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/customers`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].notes).toBe('vip');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/customers/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/customers`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'iso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/customers`).send({ name: 'Secret' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'iso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/customers/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/customers/${id}`).send({ notes: 'x' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/customers/${id}`)).expect(404);
  });

  it('cursor pagination: page through, nextCursor correct, end is null', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'pg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/customers`)
        .send({ name: `c${i}` })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/customers?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    expect(p1.body.value.nextCursor).not.toBeNull();
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/customers?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    expect(p2.body.value.items).toHaveLength(2);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/customers?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'm1@test.dev');
    const a2 = await registerUser(app, 'm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/customers`)).expect(403);
  });

  it('buildWhere filter: lifecycleStage and channel', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'flt@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/customers`)
      .send({ name: 'A', lifecycleStage: 'qualified', channel: 'web' })).expect(201);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/customers`)
      .send({ name: 'B', lifecycleStage: 'new_lead', channel: 'manual' })).expect(201);
    const q = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/customers?lifecycleStage=qualified`)).expect(200);
    expect(q.body.value.items).toHaveLength(1);
    expect(q.body.value.items[0].name).toBe('A');
  });

  it('lead merge: same (name, company) updates not duplicates', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'lead@test.dev');
    const a = auth(accessToken);
    const first = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/customers/lead`)
      .send({ name: 'Lead', company: 'Co', tags: ['src_a'] })).expect(201);
    const second = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/customers/lead`)
      .send({ name: 'Lead', company: 'Co', tags: ['src_b'] })).expect(201);
    expect(second.body.value.id).toBe(first.body.value.id);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/customers`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].tags.sort()).toEqual(['marketing_lead', 'src_a', 'src_b']);
  });
});
