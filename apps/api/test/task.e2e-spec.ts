import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Task resource (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });
  const auth = (token: string) => (r: any) => r.set('Authorization', `Bearer ${token}`);

  it('CRUD round-trip with runtime fields', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'ta1@test.dev');
    const a = auth(accessToken);
    const created = await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tasks`)
      .send({ title: 'Render video', column: 'auto_exec', priority: 'High', type: 'video', date: '2026-09-30', isAuto: true,
        status: 'running', runtimeMode: 'self_hosted_multica', agentId: 'agent_1', externalRef: '{"jobId":"j1"}' })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.title).toBe('Render video');
    expect(created.body.value.agentId).toBe('agent_1');
    const got = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/tasks/${id}`)).expect(200);
    expect(got.body.value.column).toBe('auto_exec');
    expect(got.body.value.externalRef).toBe('{"jobId":"j1"}');
    await a(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/tasks/${id}`)
      .send({ column: 'done', status: 'completed' })).expect(200);
    const listed = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/tasks`)).expect(200);
    expect(listed.body.value.items).toHaveLength(1);
    expect(listed.body.value.items[0].column).toBe('done');
    await a(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/tasks/${id}`)).expect(200);
    const after = await a(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/tasks`)).expect(200);
    expect(after.body.value.items).toHaveLength(0);
  });

  it('workspace isolation: cross-tenant get/update/remove → 404', async () => {
    const a1 = await registerUser(app, 'taiso1@test.dev');
    const created = await auth(a1.accessToken)(request(app.getHttpServer())
      .post(`/workspaces/${a1.workspaceId}/tasks`).send({ title: 'Secret', column: 'todo', priority: 'Low', type: 't', date: '', isAuto: false })).expect(201);
    const id = created.body.value.id;
    const a2 = await registerUser(app, 'taiso2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a2.workspaceId}/tasks/${id}`)).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .patch(`/workspaces/${a2.workspaceId}/tasks/${id}`).send({ column: 'done' })).expect(404);
    await auth(a2.accessToken)(request(app.getHttpServer())
      .delete(`/workspaces/${a2.workspaceId}/tasks/${id}`)).expect(404);
  });

  it('cursor pagination', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'tapg@test.dev');
    const a = auth(accessToken);
    for (let i = 0; i < 5; i++) {
      await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tasks`)
        .send({ title: `t${i}`, column: 'todo', priority: 'Medium', type: 't', date: '', isAuto: false })).expect(201);
    }
    const p1 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tasks?limit=2&order=asc`)).expect(200);
    expect(p1.body.value.items).toHaveLength(2);
    const p2 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tasks?limit=2&order=asc&cursor=${p1.body.value.nextCursor}`)).expect(200);
    const seen = new Set([...p1.body.value.items, ...p2.body.value.items].map((c: any) => c.id));
    expect(seen.size).toBe(4);
    const p3 = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tasks?limit=2&order=asc&cursor=${p2.body.value.nextCursor}`)).expect(200);
    expect(p3.body.value.items).toHaveLength(1);
    expect(p3.body.value.nextCursor).toBeNull();
  });

  it('non-member → 403', async () => {
    const a1 = await registerUser(app, 'tam1@test.dev');
    const a2 = await registerUser(app, 'tam2@test.dev');
    await auth(a2.accessToken)(request(app.getHttpServer())
      .get(`/workspaces/${a1.workspaceId}/tasks`)).expect(403);
  });

  it('column filter', async () => {
    const { accessToken, workspaceId } = await registerUser(app, 'taflt@test.dev');
    const a = auth(accessToken);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tasks`)
      .send({ title: 'A', column: 'todo', priority: 'Medium', type: 't', date: '', isAuto: false })).expect(201);
    await a(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/tasks`)
      .send({ title: 'B', column: 'done', priority: 'Medium', type: 't', date: '', isAuto: false })).expect(201);
    const q = await a(request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tasks?column=todo`)).expect(200);
    expect(q.body.value.items).toHaveLength(1);
    expect(q.body.value.items[0].title).toBe('A');
  });
});
