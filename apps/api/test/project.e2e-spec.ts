import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Project (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('create → list → get → patch → delete', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'p1@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    const created = await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects`).send({ name: 'P1', type: 'image' })).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.status).toBe('active');

    const list = await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/projects`)).expect(200);
    expect(list.body.value).toHaveLength(1);

    const filtered = await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/projects?status=archived`)).expect(200);
    expect(filtered.body.value).toHaveLength(0);

    await auth(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/projects/${id}`).send({ favorite: true })).expect(200);
    const got = await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/projects/${id}`)).expect(200);
    expect(got.body.value.favorite).toBe(true);

    await auth(request(app.getHttpServer()).delete(`/workspaces/${workspaceId}/projects/${id}`)).expect(200);
    await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/projects/${id}`)).expect(404);
  });

  it('TENANT ISOLATION: cross-tenant access denied (403) and own list excludes other workspace', async () => {
    const a = await registerUser(app, 'p2a@test.dev');
    const b = await registerUser(app, 'p2b@test.dev');
    // B creates data in B's own workspace
    await request(app.getHttpServer()).post(`/workspaces/${b.workspaceId}/projects`)
      .set('Authorization', `Bearer ${b.accessToken}`).send({ name: 'secret' }).expect(201);
    // A's own list does not contain B's data
    const listA = await request(app.getHttpServer()).get(`/workspaces/${a.workspaceId}/projects`)
      .set('Authorization', `Bearer ${a.accessToken}`).expect(200);
    expect(listA.body.value).toHaveLength(0);
    // A (non-member of B) accessing B's workspace → 403 permission_denied
    const denied = await request(app.getHttpServer()).get(`/workspaces/${b.workspaceId}/projects`)
      .set('Authorization', `Bearer ${a.accessToken}`).expect(403);
    expect(denied.body.error.code).toBe('permission_denied');
  });

  it('TENANT ISOLATION: body-injected workspaceId is ignored (path wins)', async () => {
    const a = await registerUser(app, 'p3a@test.dev');
    const b = await registerUser(app, 'p3b@test.dev');
    const res = await request(app.getHttpServer())
      .post(`/workspaces/${a.workspaceId}/projects`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ name: 'x', workspaceId: b.workspaceId });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
  });
});
