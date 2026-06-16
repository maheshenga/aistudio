import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Announcement resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'ann1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/announcements`)
      .send({ title: 'Maintenance', channel: 'in-app', status: 'active', publishedAt: new Date().toISOString() })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.title).toBe('Maintenance');
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/announcements/${id}`)).expect(200);
    expect(got.body.value.channel).toBe('in-app');
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/announcements/${id}`)
      .send({ status: 'archived' })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/announcements`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].status).toBe('archived');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/announcements/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/announcements`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'anniso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/announcements`).send({ title: 'Secret', channel: 'in-app' })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'anniso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/announcements/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/announcements/${id}`).send({ status: 'archived' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/announcements/${id}`)).expect(404);
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'annpg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/announcements`)
        .send({ title: `t${i}`, channel: 'in-app' })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/announcements?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    expect(p1.body.value.nextCursor).not.toBeNull();
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/announcements?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/announcements?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'annm1@test.dev');
    const a2 = await registerUser(app, 'annm2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/announcements`)).expect(403);
  });
});
