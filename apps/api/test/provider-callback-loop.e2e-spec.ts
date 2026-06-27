import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { createHmac } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { resetDb, seedUserWithMember } from './helpers';
import { OrchestrationService } from '../src/orchestration/orchestration.service';
import { CreditService } from '../src/billing/credit.service';
import { ProviderRegistry } from '../src/provider/provider-registry';
import { createRenderAdapter } from '../src/provider/render-adapter';

// R03-7: full async loop — dispatch submits to a fake render adapter, a signed
// callback finalizes through the shared JobFinalizationService (asset + usage +
// capture), and a duplicate callback is deduped (idempotent).
describe('Provider dispatch → signed callback → finalize (R03-7)', () => {
  let app: INestApplication; let prisma: PrismaService;
  let orch: OrchestrationService; let credit: CreditService;
  const secret = 'callback-secret';
  let submittedTaskId = '';

  beforeEach(async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    orch = app.get(OrchestrationService);
    credit = app.get(CreditService);

    // Register an async render adapter whose submit returns a fixed task id.
    const registry = app.get(ProviderRegistry);
    const base = createRenderAdapter({ kind: 'render', apiUrl: 'https://render.test', secret });
    registry.registerForTest({
      ...base,
      synchronous: false,
      submit: async (job) => { submittedTaskId = `ext-${job.id}`; return { externalTaskId: submittedTaskId }; },
    });
    await resetDb(prisma);
  });
  afterEach(async () => { await app.close(); });

  const balanceOf = async (ws: string) => (await credit.getBalance(ws)).balance;

  function signed(body: object) {
    const raw = JSON.stringify(body);
    const ts = Math.floor(Date.now() / 1000);
    const sig = createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex');
    return { raw, header: `t=${ts},v1=${sig}` };
  }

  it('submits on dispatch, finalizes on signed callback, dedups duplicates', async () => {
    const { user, workspace } = await seedUserWithMember(prisma);
    await credit.getBalance(workspace.id); // grant 100
    const actor = { userId: user.id, role: 'owner' };

    // dispatch a render job (web runtime = 5 credits held)
    const job = await orch.dispatch(workspace.id, { type: 'video', input: {}, runtimeMode: 'web', providerKind: 'render' }, actor);
    expect(await balanceOf(workspace.id)).toBe(95);
    const linked = await prisma.generationJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(linked.externalTaskId).toBe(submittedTaskId);
    expect(linked.status).toBe('pending');

    // signed completion callback → finalize (capture + asset)
    const body = { taskId: submittedTaskId, status: 'completed', eventId: 'evt-1', artifacts: [{ id: 'a1', url: 'https://cdn/x.mp4', kind: 'video' }] };
    const { raw, header } = signed(body);
    await request(app.getHttpServer())
      .post('/providers/render/callbacks')
      .set('Content-Type', 'application/json')
      .set('x-provider-signature', header)
      .send(raw)
      .expect(201);

    const finalized = await prisma.generationJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(finalized.status).toBe('succeeded');
    const assets = await prisma.asset.findMany({ where: { jobId: job.id } });
    expect(assets).toHaveLength(1);
    expect(await balanceOf(workspace.id)).toBe(95); // captured, not refunded

    // duplicate callback (same eventId) → deduped, no double asset
    const dup = await request(app.getHttpServer())
      .post('/providers/render/callbacks')
      .set('Content-Type', 'application/json')
      .set('x-provider-signature', header)
      .send(raw)
      .expect(201);
    expect(dup.body.value.deduped).toBe(true);
    expect(await prisma.asset.count({ where: { jobId: job.id } })).toBe(1);
  });

  it('rejects an unsigned callback with 403', async () => {
    await request(app.getHttpServer())
      .post('/providers/render/callbacks')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ taskId: 'x', status: 'completed' }))
      .expect(403);
  });
});
