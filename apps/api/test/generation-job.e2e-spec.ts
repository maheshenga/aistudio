import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, seedWorkspace } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('GenerationJob (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('create → running → succeeded; illegal transition → 400', async () => {
    const ws = await seedWorkspace(prisma);
    const made = await request(app.getHttpServer())
      .post(`/workspaces/${ws.id}/generation-jobs`).send({ type: 'image', input: { prompt: 'cat' } }).expect(201);
    const id = made.body.value.id;
    expect(made.body.value.status).toBe('pending');

    await request(app.getHttpServer()).patch(`/workspaces/${ws.id}/generation-jobs/${id}/status`).send({ status: 'running' }).expect(200);
    await request(app.getHttpServer()).patch(`/workspaces/${ws.id}/generation-jobs/${id}/status`).send({ status: 'succeeded' }).expect(200);

    const bad = await request(app.getHttpServer()).patch(`/workspaces/${ws.id}/generation-jobs/${id}/status`).send({ status: 'running' }).expect(400);
    expect(bad.body.error.code).toBe('validation_error');
  });

  it('filters by status', async () => {
    const ws = await seedWorkspace(prisma);
    await request(app.getHttpServer()).post(`/workspaces/${ws.id}/generation-jobs`).send({ type: 'image', input: {} }).expect(201);
    const pending = await request(app.getHttpServer()).get(`/workspaces/${ws.id}/generation-jobs?status=pending`).expect(200);
    expect(pending.body.value).toHaveLength(1);
    const running = await request(app.getHttpServer()).get(`/workspaces/${ws.id}/generation-jobs?status=running`).expect(200);
    expect(running.body.value).toHaveLength(0);
  });
});
