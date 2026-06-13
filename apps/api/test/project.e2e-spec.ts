import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, seedWorkspace } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Project (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('create → list → get → patch → delete', async () => {
    const ws = await seedWorkspace(prisma);
    const created = await request(app.getHttpServer())
      .post(`/workspaces/${ws.id}/projects`).send({ name: 'P1', type: 'image' }).expect(201);
    const id = created.body.value.id;
    expect(created.body.value.status).toBe('active');

    const list = await request(app.getHttpServer()).get(`/workspaces/${ws.id}/projects`).expect(200);
    expect(list.body.value).toHaveLength(1);

    const filtered = await request(app.getHttpServer()).get(`/workspaces/${ws.id}/projects?status=archived`).expect(200);
    expect(filtered.body.value).toHaveLength(0);

    await request(app.getHttpServer()).patch(`/workspaces/${ws.id}/projects/${id}`).send({ favorite: true }).expect(200);
    const got = await request(app.getHttpServer()).get(`/workspaces/${ws.id}/projects/${id}`).expect(200);
    expect(got.body.value.favorite).toBe(true);

    await request(app.getHttpServer()).delete(`/workspaces/${ws.id}/projects/${id}`).expect(200);
    await request(app.getHttpServer()).get(`/workspaces/${ws.id}/projects/${id}`).expect(404);
  });

  it('TENANT ISOLATION: workspace A cannot read B project', async () => {
    const a = await seedWorkspace(prisma, 'A'); const b = await seedWorkspace(prisma, 'B');
    const made = await request(app.getHttpServer()).post(`/workspaces/${b.id}/projects`).send({ name: 'secret' }).expect(201);
    const listA = await request(app.getHttpServer()).get(`/workspaces/${a.id}/projects`).expect(200);
    expect(listA.body.value).toHaveLength(0);
    await request(app.getHttpServer()).get(`/workspaces/${a.id}/projects/${made.body.value.id}`).expect(404);
  });

  it('TENANT ISOLATION: body-injected workspaceId is ignored (path wins)', async () => {
    const a = await seedWorkspace(prisma, 'A'); const b = await seedWorkspace(prisma, 'B');
    const res = await request(app.getHttpServer())
      .post(`/workspaces/${a.id}/projects`).send({ name: 'x', workspaceId: b.id });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
  });
});
