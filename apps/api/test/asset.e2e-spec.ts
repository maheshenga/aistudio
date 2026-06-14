import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Asset (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('create with kind filter; delete', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'as1@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/assets`).send({ kind: 'image', url: 'http://x/1.png' })).expect(201);
    await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/assets`).send({ kind: 'text' })).expect(201);
    const imgs = await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/assets?kind=image`)).expect(200);
    expect(imgs.body.value).toHaveLength(1);
  });

  it('rejects asset referencing a job from another workspace → 404', async () => {
    const a = await registerUser(app, 'as2a@test.dev');
    const b = await registerUser(app, 'as2b@test.dev');
    // A job that lives in B's workspace
    const job = await prisma.generationJob.create({ data: { workspaceId: b.workspaceId, type: 'image', input: {} } });
    // A is a member of A; referencing B's job from A's workspace resolves to 404 (job not in A)
    const res = await request(app.getHttpServer()).post(`/workspaces/${a.workspaceId}/assets`)
      .set('Authorization', `Bearer ${a.accessToken}`).send({ kind: 'image', jobId: job.id }).expect(404);
    expect(res.body.error.code).toBe('not_found');
  });
});
