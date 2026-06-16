import { INestApplication } from '@nestjs/common';
import { bootstrapTestApp, resetDb, registerUser } from './helpers';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { CreditService } from '../src/billing/credit.service';

describe('CreditService (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; let credit: CreditService;
  beforeAll(async () => { ({ app, prisma } = await bootstrapTestApp()); credit = app.get(CreditService); });
  beforeEach(async () => { await resetDb(prisma); });
  afterAll(async () => { await app.close(); });

  async function freshWs(email: string) {
    const { workspaceId } = await registerUser(app, email);
    return workspaceId;
  }

  it('ensureMonthlyGrant: first call grants plan allowance (free=100), idempotent within period', async () => {
    const ws = await freshWs('c1@test.dev');
    const b1 = await credit.getBalance(ws);
    expect(b1.balance).toBe(100);
    expect(b1.monthlyAllowance).toBe(100);
    const b2 = await credit.getBalance(ws);
    expect(b2.balance).toBe(100);
    const grants = await prisma.creditLedger.findMany({ where: { workspaceId: ws, reason: 'monthly_grant' } });
    expect(grants).toHaveLength(1);
  });

  it('hold deducts, refund restores; idempotent by key', async () => {
    const ws = await freshWs('c2@test.dev');
    await credit.getBalance(ws);
    await prisma.$transaction((tx) => credit.hold(tx, ws, 'job-A', 30));
    expect((await credit.getBalance(ws)).balance).toBe(70);
    await prisma.$transaction((tx) => credit.hold(tx, ws, 'job-A', 30));
    expect((await credit.getBalance(ws)).balance).toBe(70);
    await prisma.$transaction((tx) => credit.refund(tx, ws, 'job-A', 30));
    expect((await credit.getBalance(ws)).balance).toBe(100);
    await prisma.$transaction((tx) => credit.refund(tx, ws, 'job-A', 30));
    expect((await credit.getBalance(ws)).balance).toBe(100);
  });

  it('hold throws insufficient_credits (402) when balance too low', async () => {
    const ws = await freshWs('c3@test.dev');
    await credit.getBalance(ws);
    await expect(prisma.$transaction((tx) => credit.hold(tx, ws, 'job-B', 150)))
      .rejects.toMatchObject({ code: 'insufficient_credits', status: 402 });
    expect((await credit.getBalance(ws)).balance).toBe(100);
  });

  it('grant adds credits; ledger balanceAfter === snapshot', async () => {
    const ws = await freshWs('c4@test.dev');
    await credit.getBalance(ws);
    await prisma.$transaction((tx) => credit.grant(tx, ws, 500, 'recharge', 'pay:1'));
    const b = await credit.getBalance(ws);
    expect(b.balance).toBe(600);
    const last = await prisma.creditLedger.findFirst({ where: { workspaceId: ws }, orderBy: { createdAt: 'desc' } });
    expect(last!.balanceAfter).toBe(600);
  });

  it('reconciliation: balance snapshot always equals sum of ledger deltas', async () => {
    const ws = await freshWs('c5@test.dev');
    await credit.getBalance(ws);
    await prisma.$transaction((tx) => credit.hold(tx, ws, 'j1', 10));
    await prisma.$transaction((tx) => credit.grant(tx, ws, 50, 'coupon', 'cp:1'));
    await prisma.$transaction((tx) => credit.refund(tx, ws, 'j1', 10));
    const agg = await prisma.creditLedger.aggregate({ where: { workspaceId: ws }, _sum: { delta: true } });
    const ws2 = await prisma.workspace.findUnique({ where: { id: ws } });
    expect(ws2!.creditBalance).toBe(agg._sum.delta ?? 0);
  });
});
