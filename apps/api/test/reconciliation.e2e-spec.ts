import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ValidationPipe } from '@nestjs/common';
import { resetDb, seedUserWithMember } from './helpers';
import { ReconciliationService } from '../src/orchestration/reconciliation.service';
import { MULTICA_SERVER_CLIENT, type MulticaServerClient, type MulticaTaskSnapshot, type MulticaArtifact } from '../src/orchestration/multica-server-client';

class FakeClient implements MulticaServerClient {
  constructor(public snap: MulticaTaskSnapshot, public artifacts: MulticaArtifact[] = []) {}
  async getTask(): Promise<MulticaTaskSnapshot> { return this.snap; }
  async getArtifacts(): Promise<MulticaArtifact[]> { return this.artifacts; }
}

describe('Reconciliation (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; let fake: FakeClient;

  beforeEach(async () => {
    fake = new FakeClient({ status: 'running', progress: 10, raw: {} });
    process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MULTICA_SERVER_CLIENT).useValue(fake).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await resetDb(prisma);
  });
  afterEach(async () => { await app.close(); });

  const seedJob = async (data: Partial<{ status: string; externalTaskId: string | null; providerKind: string; startedAt: Date }>) => {
    const { workspace } = await seedUserWithMember(prisma);
    const job = await prisma.generationJob.create({
      data: {
        workspaceId: workspace.id, type: 'image', input: {}, status: data.status ?? 'running',
        externalTaskId: data.externalTaskId ?? 'mt-1', providerKind: data.providerKind ?? 'codex',
        runtimeMode: 'desktop_multica', startedAt: data.startedAt ?? new Date(),
      },
    });
    return { workspaceId: workspace.id, job };
  };

  it('running snapshot updates progress/currentStep', async () => {
    const { job } = await seedJob({ status: 'pending' });
    fake.snap = { status: 'running', progress: 55, currentStep: 'running tests', raw: {} };
    await app.get(ReconciliationService).reconcileOnce();
    const after = await prisma.generationJob.findUnique({ where: { id: job.id } });
    expect(after!.status).toBe('running');
    expect(after!.progress).toBe(55);
    expect(after!.currentStep).toBe('running tests');
  });

  it('succeeded → terminal + Asset + UsageEvent + audits in one tx; idempotent on repeat', async () => {
    const { workspaceId, job } = await seedJob({ status: 'running' });
    fake.snap = { status: 'succeeded', progress: 100, raw: {} };
    fake.artifacts = [{ id: 'art-1', url: 'http://f/1', kind: 'image' }];
    const svc = app.get(ReconciliationService);
    await svc.reconcileOnce();
    await svc.reconcileOnce();

    const after = await prisma.generationJob.findUnique({ where: { id: job.id } });
    expect(after!.status).toBe('succeeded');
    expect(after!.finishedAt).not.toBeNull();
    const assets = await prisma.asset.findMany({ where: { workspaceId, jobId: job.id } });
    expect(assets).toHaveLength(1);
    const usage = await prisma.usageEvent.findMany({ where: { workspaceId, jobId: job.id } });
    expect(usage).toHaveLength(1);
    const completeAudits = await prisma.auditLog.findMany({ where: { workspaceId, action: 'generation_job_complete' } });
    expect(completeAudits).toHaveLength(1);
  });

  it('Multica unreachable → job unchanged (no false failure)', async () => {
    const { job } = await seedJob({ status: 'running' });
    (fake as any).getTask = async () => { throw new Error('ECONNREFUSED'); };
    await app.get(ReconciliationService).reconcileOnce();
    const after = await prisma.generationJob.findUnique({ where: { id: job.id } });
    expect(after!.status).toBe('running');
  });

  it('orphan pending past timeout → failed', async () => {
    const { workspace } = await seedUserWithMember(prisma);
    const old = new Date(Date.now() - 20 * 60 * 1000);
    const job = await prisma.generationJob.create({
      data: { workspaceId: workspace.id, type: 'image', input: {}, status: 'pending', externalTaskId: null, runtimeMode: 'desktop_multica', createdAt: old },
    });
    await app.get(ReconciliationService).reconcileOnce();
    const after = await prisma.generationJob.findUnique({ where: { id: job.id } });
    expect(after!.status).toBe('failed');
    expect(after!.error).toBe('dispatch not confirmed');
  });

  it('cancel intent protected: cancelled job is terminal and not overwritten even if Multica reports succeeded', async () => {
    const { job } = await seedJob({ status: 'cancelled' });
    fake.snap = { status: 'succeeded', progress: 100, raw: {} };
    fake.artifacts = [];
    await app.get(ReconciliationService).reconcileOnce();
    const after = await prisma.generationJob.findUnique({ where: { id: job.id } });
    expect(after!.status).toBe('cancelled');
  });
});
