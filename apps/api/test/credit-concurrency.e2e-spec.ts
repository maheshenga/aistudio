import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { CreditService } from '../src/billing/credit.service';

// C2 并发幂等回归：同一 idempotencyKey 并发只能生效一次。
// applyLedgerEntry 是 check-then-create + P2002 兜底；先改余额后写账本。
// 若并发同 key 下两笔都执行了余额变更、而第二笔 catch 吞掉 P2002 后仍提交，
// 就会双倍入账（grant/refund 资损）或双扣（hold）。本测试用真实并发证明
// 余额最终只反映一次操作，且 == 账本 delta 之和（核心不变量）。
describe('CreditService concurrency idempotency (regression: C2)', () => {
  let app: INestApplication; let prisma: PrismaService; let credit: CreditService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); credit = app.get(CreditService); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  async function freshWs(email: string) {
    const { workspaceId } = await registerUser(app, email);
    await credit.getBalance(workspaceId); // monthly grant → 100
    return workspaceId;
  }

  const balanceOf = async (ws: string) => (await prisma.workspace.findUniqueOrThrow({ where: { id: ws } })).creditBalance;
  const ledgerSum = async (ws: string) =>
    (await prisma.creditLedger.findMany({ where: { workspaceId: ws } })).reduce((s, l) => s + l.delta, 0);

  it('concurrent grant with same idempotencyKey applies exactly once (no double-credit)', async () => {
    const ws = await freshWs('cc1@test.dev');
    const key = 'promo:welcome-bonus';

    // 8 笔并发 grant，全部同一 idempotencyKey，各 +50。只应有一笔真正入账。
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        prisma.$transaction((tx) => credit.grant(tx, ws, 50, 'promo', key, 'promo', 'welcome')),
      ),
    );
    // 不应有未预期的崩溃（P2002 应被幂等兜底吸收，而非冒泡成 500）
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected).toHaveLength(0);

    // 恰好一条 promo 账本分录
    const grants = await prisma.creditLedger.findMany({ where: { workspaceId: ws, idempotencyKey: key } });
    expect(grants).toHaveLength(1);

    // 余额只 +50 一次 → 150；且余额 == 账本 delta 之和（核心不变量）
    expect(await balanceOf(ws)).toBe(150);
    expect(await ledgerSum(ws)).toBe(150);
  });

  it('concurrent hold with same idempotencyKey deducts exactly once', async () => {
    const ws = await freshWs('cc2@test.dev');
    const jobId = 'job-concurrent';

    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        prisma.$transaction((tx) => credit.hold(tx, ws, jobId, 30, 1)),
      ),
    );
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(0);

    const holds = await prisma.creditLedger.findMany({ where: { workspaceId: ws, reason: 'hold' } });
    expect(holds).toHaveLength(1);
    // 只扣一次 30 → 70；余额 == 账本之和
    expect(await balanceOf(ws)).toBe(70);
    expect(await ledgerSum(ws)).toBe(70);
  });
});
