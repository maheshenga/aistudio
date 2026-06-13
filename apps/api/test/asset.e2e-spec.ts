import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, seedWorkspace } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Asset (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('create with kind filter; delete', async () => {
    const ws = await seedWorkspace(prisma);
    await request(app.getHttpServer()).post(`/workspaces/${ws.id}/assets`).send({ kind: 'image', url: 'http://x/1.png' }).expect(201);
    await request(app.getHttpServer()).post(`/workspaces/${ws.id}/assets`).send({ kind: 'text' }).expect(201);
    const imgs = await request(app.getHttpServer()).get(`/workspaces/${ws.id}/assets?kind=image`).expect(200);
    expect(imgs.body.value).toHaveLength(1);
  });

  it('rejects asset referencing a job from another workspace → 404', async () => {
    const a = await seedWorkspace(prisma, 'A'); const b = await seedWorkspace(prisma, 'B');
    const job = await prisma.generationJob.create({ data: { workspaceId: b.id, type: 'image', input: {} } });
    const res = await request(app.getHttpServer()).post(`/workspaces/${a.id}/assets`).send({ kind: 'image', jobId: job.id }).expect(404);
    expect(res.body.error.code).toBe('not_found');
  });
});
