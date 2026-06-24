import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { CreditService } from '../src/billing/credit.service';

describe('GenerationJob (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  it('create → running → succeeded; illegal transition → 400', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'gj1@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    const made = await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/generation-jobs`).send({ type: 'image', input: { prompt: 'cat' } })).expect(201);
    const id = made.body.value.id;
    expect(made.body.value.status).toBe('pending');

    await auth(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/generation-jobs/${id}/status`).send({ status: 'running' })).expect(200);
    await auth(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/generation-jobs/${id}/status`).send({ status: 'succeeded' })).expect(200);

    const bad = await auth(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/generation-jobs/${id}/status`).send({ status: 'running' })).expect(400);
    expect(bad.body.error.code).toBe('validation_error');
  });

  it('filters by status', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'gj2@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/generation-jobs`).send({ type: 'image', input: {} })).expect(201);
    const pending = await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/generation-jobs?status=pending`)).expect(200);
    expect(pending.body.value).toHaveLength(1);
    const running = await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/generation-jobs?status=running`)).expect(200);
    expect(running.body.value).toHaveLength(0);
  });

  it('pending → cancelled and running → cancelled are legal', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'gj3@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    const post = () => auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/generation-jobs`).send({ type: 'image', input: {} }));
    const patch = (id: string, status: string) => auth(request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/generation-jobs/${id}/status`).send({ status }));

    const a = (await post().expect(201)).body.value.id;
    await patch(a, 'cancelled').expect(200); // pending → cancelled

    const b = (await post().expect(201)).body.value.id;
    await patch(b, 'running').expect(200);
    await patch(b, 'cancelled').expect(200); // running → cancelled
  });

  it('cancelled is terminal — further transition → 400', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'gj4@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    const made = await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/generation-jobs`).send({ type: 'image', input: {} })).expect(201);
    const id = made.body.value.id;
    await auth(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/generation-jobs/${id}/status`).send({ status: 'cancelled' })).expect(200);
    const bad = await auth(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/generation-jobs/${id}/status`).send({ status: 'running' })).expect(400);
    expect(bad.body.error.code).toBe('validation_error');
  });

  it('create holds credits; succeed captures; fail refunds', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'gjb1@test.dev');
    const auth = (r: request.Test) => r.set('Authorization', `Bearer ${accessToken}`);
    const credit = app.get(CreditService);
    const before = (await credit.getBalance(workspaceId)).balance;

    const created = await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/generation-jobs`)
      .send({ type: 'image', providerKind: 'gemini', runtimeMode: 'web', status: 'pending' })).expect(201);
    const id = created.body.value.id;
    expect((await credit.getBalance(workspaceId)).balance).toBe(before - 5);

    await auth(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/generation-jobs/${id}/status`).send({ status: 'running' })).expect(200);
    await auth(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/generation-jobs/${id}/status`).send({ status: 'succeeded' })).expect(200);
    expect((await credit.getBalance(workspaceId)).balance).toBe(before - 5);

    const failed = await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/generation-jobs`)
      .send({ type: 'image', providerKind: 'gemini', runtimeMode: 'web', status: 'pending' })).expect(201);
    const failedId = failed.body.value.id;
    expect((await credit.getBalance(workspaceId)).balance).toBe(before - 10);
    await auth(request(app.getHttpServer()).patch(`/workspaces/${workspaceId}/generation-jobs/${failedId}/status`).send({ status: 'failed', error: 'boom' })).expect(200);
    expect((await credit.getBalance(workspaceId)).balance).toBe(before - 5);
  });
});
