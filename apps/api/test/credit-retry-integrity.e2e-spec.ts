import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { resetDb, seedUserWithMember } from './helpers';
import { OrchestrationService } from '../src/orchestration/orchestration.service';
import { ReconciliationService } from '../src/orchestration/reconciliation.service';
import { CreditService } from '../src/billing/credit.service';
import { MULTICA_SERVER_CLIENT, type MulticaServerClient, type MulticaTaskSnapshot, type MulticaArtifact } from '../src/orchestration/multica-server-client';

// C1 资损回归：信用必须按"每次尝试"独立结算。
// 不变量：一个 job 在其完整生命周期（含所有 retry）里，workspace 余额的净扣减
// 必须等于"成功结算（capture）的尝试次数 × 单次成本"——失败/取消的尝试全额退还，
// 成功的尝试确认扣款；retry 既不能凭空退款已消费的额度，也不能免费重跑。
class FakeClient implements MulticaServerClient {
  constructor(public snap: MulticaTaskSnapshot, public artifacts: MulticaArtifact[] = []) {}
  async getTask(): Promise<MulticaTaskSnapshot> { return this.snap; }
  async getArtifacts(): Promise<MulticaArtifact[]> { return this.artifacts; }
}

describe('Credit integrity across retry (regression: C1 fund-loss)', () => {
  let app: INestApplication; let prisma: PrismaService; let fake: FakeClient;
  let orch: OrchestrationService; let recon: ReconciliationService; let credit: CreditService;

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
    orch = app.get(OrchestrationService);
    recon = app.get(ReconciliationService);
    credit = app.get(CreditService);
    await resetDb(prisma);
  });
  afterEach(async () => { await app.close(); });

  // web runtime → 5 credits/次；free plan 月度额度 100。
  async function setup() {
    const { user, workspace } = await seedUserWithMember(prisma);
    const actor = { userId: user.id, role: 'owner' };
    await credit.getBalance(workspace.id); // 触发 monthly grant → 100
    return { workspaceId: workspace.id, actor };
  }
  const balanceOf = async (ws: string) => (await credit.getBalance(ws)).balance;

  it('零余额白嫖：失败的任务被退款后 retry 并成功，必须重新扣款（不能免费跑成功生成）', async () => {
    const { workspaceId, actor } = await setup();

    // 尝试 1：dispatch 冻结 5 → 95
    const job = await orch.dispatch(workspaceId, { type: 'image', input: {}, runtimeMode: 'web' }, actor);
    expect(await balanceOf(workspaceId)).toBe(95);

    // 尝试 1 失败 → 对账退款 → 100
    await orch.linkExternal(workspaceId, job.id, { externalTaskId: 'mt-1' }, actor);
    fake.snap = { status: 'failed', progress: 0, raw: {} };
    await recon.reconcileOnce();
    expect(await balanceOf(workspaceId)).toBe(100);

    // retry → 尝试 2（应重新冻结 5）→ 成功对账 → capture 确认扣款
    await orch.retry(workspaceId, job.id, actor);
    await orch.linkExternal(workspaceId, job.id, { externalTaskId: 'mt-2' }, actor);
    fake.snap = { status: 'succeeded', progress: 100, raw: {} };
    fake.artifacts = [];
    await recon.reconcileOnce();

    // 不变量：恰好成功消费 1 次 → 余额 95。bug 下保持 100（免费）。
    expect(await balanceOf(workspaceId)).toBe(95);
  });

  it('付费后退款：已成功扣款的任务被 retry 后取消，不能退还已消费的额度', async () => {
    const { workspaceId, actor } = await setup();

    // 尝试 1：dispatch 冻结 5 → 95，成功对账 → capture 确认扣款 → 95（已消费）
    const job = await orch.dispatch(workspaceId, { type: 'image', input: {}, runtimeMode: 'web' }, actor);
    await orch.linkExternal(workspaceId, job.id, { externalTaskId: 'mt-1' }, actor);
    fake.snap = { status: 'succeeded', progress: 100, raw: {} };
    fake.artifacts = [];
    await recon.reconcileOnce();
    expect(await balanceOf(workspaceId)).toBe(95);

    // retry（succeeded 是终态，允许）→ 尝试 2 → 随即 cancel
    await orch.retry(workspaceId, job.id, actor);
    await orch.cancel(workspaceId, job.id, actor);

    // 不变量：尝试 1 已成功消费 5，取消尝试 2 只能退尝试 2 自己冻结的额度，
    // 净消费仍为 5 → 余额 95。bug 下 cancel 错误退还 5 → 100（白嫖已消费的生成）。
    expect(await balanceOf(workspaceId)).toBe(95);
  });
});
