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

// BILL-03 / BILL-07 资损回归：
// BILL-03 — reconcile.finalize() 过去用固定 attempt=1 退款，重试任务（attempt 2）
//   的退款 idempotency key 与尝试 1 撞键 → 静默跳过，用户被扣款却永不退还。
// BILL-07 — 外链任务若 provider 永不回报，旧逻辑（仅扫 externalTaskId=null 的 orphan，
//   且 client 为 null 时直接 return）会让该 hold 永久占用。max-age 兜底必须无论
//   externalTaskId / client 是否存在都失败+退款。
class FakeClient implements MulticaServerClient {
  constructor(public snap: MulticaTaskSnapshot, public artifacts: MulticaArtifact[] = []) {}
  async getTask(): Promise<MulticaTaskSnapshot> { return this.snap; }
  async getArtifacts(): Promise<MulticaArtifact[]> { return this.artifacts; }
}

describe('Reconcile refund integrity (BILL-03 attempt key, BILL-07 max-age)', () => {
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

  async function setup() {
    const { user, workspace } = await seedUserWithMember(prisma);
    const actor = { userId: user.id, role: 'owner' };
    await credit.getBalance(workspace.id); // monthly grant → 100
    return { workspaceId: workspace.id, actor };
  }
  const balanceOf = async (ws: string) => (await credit.getBalance(ws)).balance;

  it('BILL-03: 重试任务(attempt 2)经 reconcile 失败，退款必须真正落账(不撞 attempt 1 的键)', async () => {
    const { workspaceId, actor } = await setup();

    // 尝试 1：dispatch 冻结 5 → 95，reconcile 失败 → 退款 → 100
    const job = await orch.dispatch(workspaceId, { type: 'image', input: {}, runtimeMode: 'web' }, actor);
    await orch.linkExternal(workspaceId, job.id, { externalTaskId: 'mt-1' }, actor);
    fake.snap = { status: 'failed', progress: 0, raw: {} };
    await recon.reconcileOnce();
    expect(await balanceOf(workspaceId)).toBe(100);

    // retry → 尝试 2：重新冻结 5 → 95
    await orch.retry(workspaceId, job.id, actor);
    await orch.linkExternal(workspaceId, job.id, { externalTaskId: 'mt-2' }, actor);
    expect(await balanceOf(workspaceId)).toBe(95);

    // 尝试 2 也经 reconcile 失败：退款 key 必须用 attempt 2 → 退还 → 100。
    // bug 下 finalize 用 attempt 1，键 job:{id}:1:refund 已存在 → 静默跳过 → 停在 95。
    fake.snap = { status: 'failed', progress: 0, raw: {} };
    await recon.reconcileOnce();
    expect(await balanceOf(workspaceId)).toBe(100);
  });

  it('BILL-07: provider 永不回报的外链任务，超过 max-age 必须失败并退款(无论 client 是否在)', async () => {
    const { workspaceId, actor } = await setup();

    // dispatch 冻结 5 → 95，外链但 provider 永远 running（不终结）。
    const job = await orch.dispatch(workspaceId, { type: 'image', input: {}, runtimeMode: 'web' }, actor);
    await orch.linkExternal(workspaceId, job.id, { externalTaskId: 'stuck-1' }, actor);
    fake.snap = { status: 'running', progress: 10, raw: {} };
    expect(await balanceOf(workspaceId)).toBe(95);

    // 在 max-age 之前对账：仍 running，hold 仍占用。
    await recon.reconcileOnce();
    expect(await balanceOf(workspaceId)).toBe(95);

    // 把创建时间推到 max-age 之外，再对账：max-age 兜底应失败+退款 → 100。
    const now = new Date(Date.now() + 2 * 60 * 60 * 1000); // +2h，超过默认 1h
    await recon.reconcileOnce(now);
    expect(await balanceOf(workspaceId)).toBe(100);

    const finalJob = await prisma.generationJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(finalJob.status).toBe('failed');
  });
});
