import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Workspace (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('POST /workspaces creates a workspace and binds caller as owner; no token → 401', async () => {
    const { accessToken, userId } = await registerUser(app, 'wsc@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    const res = await auth(request(app.getHttpServer()).post('/workspaces').send({ name: 'Acme' })).expect(201);
    expect(res.body.value.id).toBeDefined();
    expect(res.body.value.name).toBe('Acme');
    expect(res.body.value.plan).toBe('free');
    const member = await prisma.member.findUnique({
      where: { workspaceId_userId: { workspaceId: res.body.value.id, userId } },
    });
    expect(member!.role).toBe('owner');
    await request(app.getHttpServer()).post('/workspaces').send({ name: 'NoAuth' }).expect(401);
  });

  it('GET /workspaces/:id returns it; unknown id → 404 not_found', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'ws1@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    const ok = await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}`)).expect(200);
    expect(ok.body.value.id).toBe(workspaceId);
    const miss = await auth(request(app.getHttpServer()).get('/workspaces/nope')).expect(404);
    expect(miss.body.error.code).toBe('not_found');
  });

  it('rejects unknown fields (forbidNonWhitelisted) → 400 validation_error', async () => {
    const { accessToken } = await registerUser(app, 'wsf@test.dev');
    const res = await request(app.getHttpServer()).post('/workspaces')
      .set('Authorization', `Bearer ${accessToken}`).send({ name: 'A', hacker: 1 }).expect(400);
    expect(res.body.error.code).toBe('validation_error');
  });
});
