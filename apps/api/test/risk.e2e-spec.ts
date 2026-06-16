import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('RiskEvent resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'rsk1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/risk-events`)
      .send({ action: 'gen', contentSummary: 'blocked prompt', rule: 'policy', decision: 'blocked', severity: 'critical' })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.decision).toBe('blocked');
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/risk-events/${id}`)).expect(200);
    expect(got.body.value.severity).toBe('critical');
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/risk-events/${id}`)
      .send({ decision: 'allowed', reviewedAt: new Date().toISOString() })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/risk-events`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].decision).toBe('allowed');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/risk-events/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/risk-events`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'rskiso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/risk-events`).send({ action: 'x', contentSummary: 's', rule: 'r', decision: 'blocked', severity: 'high' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'rskiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/risk-events/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/risk-events/${id}`).send({ decision: 'allowed' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/risk-events/${id}`)).expect(404);
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'rskpg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/risk-events`)
        .send({ action: `act${i}`, contentSummary: 's', rule: 'r', decision: 'allowed', severity: 'low' })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/risk-events?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/risk-events?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/risk-events?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'rskm1@test.dev');
    const a2 = await registerUser(app, 'rskm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/risk-events`)).expect(403);
  });

  it('decision filter', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'rskflt@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/risk-events`)
      .send({ action: 'A', contentSummary: 's', rule: 'r', decision: 'blocked', severity: 'high' })).expect(201);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/risk-events`)
      .send({ action: 'B', contentSummary: 's', rule: 'r', decision: 'allowed', severity: 'low' })).expect(201);
    const q = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/risk-events?decision=blocked`)).expect(200);
    expect(q.body.value.items).toHaveLength(1);
    expect(q.body.value.items[0].action).toBe('A');
  });
});
