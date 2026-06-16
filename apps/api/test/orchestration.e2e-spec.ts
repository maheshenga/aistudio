import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Orchestration (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  const auth = (r: request.Test, token: string) => r.set('Authorization', `Bearer ${token}`);

  it('dispatch creates pending job + task_dispatched audit', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'orc1@test.dev');
    const res = await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/orchestration/dispatch`)
      .send({ type: 'image', input: { prompt: 'cat' }, runtimeMode: 'desktop_multica', agentId: 'agent-1', providerKind: 'codex' }), accessToken).expect(201);
    expect(res.body.value.job.status).toBe('pending');
    expect(res.body.value.job.runtimeMode).toBe('desktop_multica');
    const audits = await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/audit-logs?action=task_dispatched`), accessToken).expect(200);
    expect(audits.body.value).toHaveLength(1);
    expect(audits.body.value[0].targetId).toBe(res.body.value.job.id);
  });

  it('link-external binds externalTaskId; terminal job rejected', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'orc2@test.dev');
    const job = (await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/orchestration/dispatch`)
      .send({ type: 'image', input: {}, runtimeMode: 'desktop_multica' }), accessToken).expect(201)).body.value.job;
    const linked = await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/orchestration/jobs/${job.id}/link-external`)
      .send({ externalTaskId: 'mt-1', externalRef: { issue: 'i1' } }), accessToken).expect(201);
    expect(linked.body.value.job.externalTaskId).toBe('mt-1');
  });

  it('cancel writes intent for non-terminal; rejects terminal', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'orc3@test.dev');
    const job = (await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/orchestration/dispatch`)
      .send({ type: 'image', input: {}, runtimeMode: 'desktop_multica' }), accessToken).expect(201)).body.value.job;
    const cancelled = await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/orchestration/jobs/${job.id}/cancel`), accessToken).expect(201);
    expect(cancelled.body.value.job.status).toBe('cancelled');
    expect(cancelled.body.value.job.finishedAt).not.toBeNull();
    const persisted = await prisma.generationJob.findUnique({ where: { id: job.id } });
    expect(persisted!.status).toBe('cancelled');
    const audits = await auth(request(app.getHttpServer()).get(`/workspaces/${workspaceId}/audit-logs?action=task_cancelled`), accessToken).expect(200);
    expect(audits.body.value).toHaveLength(1);
    const bad = await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/orchestration/jobs/${job.id}/cancel`), accessToken).expect(400);
    expect(bad.body.error.code).toBe('validation_error');
  });

  it('retry resets terminal job to pending and clears external*/progress/error', async () => {
    const { workspaceId, accessToken } = await registerUser(app, 'orc4@test.dev');
    const job = (await auth(request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/orchestration/dispatch`)
      .send({ type: 'image', input: {}, runtimeMode: 'desktop_multica' }), accessToken).expect(201)).body.value.job;
    await prisma.generationJob.update({ where: { id: job.id }, data: { status: 'failed', externalTaskId: 'mt-9', progress: 80, error: 'boom', finishedAt: new Date() } });
    const retried = await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/orchestration/jobs/${job.id}/retry`), accessToken).expect(201);
    expect(retried.body.value.job.status).toBe('pending');
    expect(retried.body.value.job.externalTaskId).toBeNull();
    expect(retried.body.value.job.progress).toBeNull();
    expect(retried.body.value.job.error).toBeNull();
    const bad = await auth(request(app.getHttpServer()).post(`/workspaces/${workspaceId}/orchestration/jobs/${job.id}/retry`), accessToken).expect(400);
    expect(bad.body.error.code).toBe('validation_error');
  });

  it('non-member → 403, no token → 401', async () => {
    const a = await registerUser(app, 'orc5a@test.dev');
    const b = await registerUser(app, 'orc5b@test.dev');
    await auth(request(app.getHttpServer())
      .post(`/workspaces/${a.workspaceId}/orchestration/dispatch`)
      .send({ type: 'image', input: {}, runtimeMode: 'web' }), b.accessToken).expect(403);
    await request(app.getHttpServer())
      .post(`/workspaces/${a.workspaceId}/orchestration/dispatch`)
      .send({ type: 'image', input: {}, runtimeMode: 'web' }).expect(401);
  });
});
