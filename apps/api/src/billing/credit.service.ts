import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { insufficientCredits } from '../common/errors';
import { planMonthlyAllowance } from './plan-allowance';

type Tx = Prisma.TransactionClient;

interface LedgerInput {
  workspaceId: string;
  delta: number;
  reason: string;
  refType?: string;
  refId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class CreditService {
  constructor(private prisma: PrismaService) {}

  private async applyLedgerEntry(tx: Tx, input: LedgerInput) {
    if (input.idempotencyKey) {
      const existing = await tx.creditLedger.findUnique({
        where: { workspaceId_idempotencyKey: { workspaceId: input.workspaceId, idempotencyKey: input.idempotencyKey } },
      });
      if (existing) return existing;
    }

    let balanceAfter: number;
    if (input.delta < 0) {
      const amount = -input.delta;
      const res = await tx.workspace.updateMany({
        where: { id: input.workspaceId, creditBalance: { gte: amount } },
        data: { creditBalance: { decrement: amount } },
      });
      if (res.count === 0) {
        const ws = await tx.workspace.findUnique({ where: { id: input.workspaceId } });
        throw insufficientCredits('Insufficient credits', { required: amount, balance: ws?.creditBalance ?? 0 });
      }
      const ws = await tx.workspace.findUnique({ where: { id: input.workspaceId } });
      balanceAfter = ws!.creditBalance;
    } else {
      const ws = await tx.workspace.update({
        where: { id: input.workspaceId },
        data: { creditBalance: { increment: input.delta } },
      });
      balanceAfter = ws.creditBalance;
    }

    return tx.creditLedger.create({
      data: {
        workspaceId: input.workspaceId, delta: input.delta, reason: input.reason,
        refType: input.refType ?? null, refId: input.refId ?? null,
        idempotencyKey: input.idempotencyKey ?? null, balanceAfter,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  hold(tx: Tx, workspaceId: string, jobId: string, amount: number) {
    return this.applyLedgerEntry(tx, {
      workspaceId, delta: -amount, reason: 'hold',
      refType: 'generation_job', refId: jobId, idempotencyKey: `job:${jobId}:hold`,
    });
  }

  capture(tx: Tx, workspaceId: string, jobId: string) {
    return this.applyLedgerEntry(tx, {
      workspaceId, delta: 0, reason: 'capture',
      refType: 'generation_job', refId: jobId, idempotencyKey: `job:${jobId}:capture`,
    });
  }

  refund(tx: Tx, workspaceId: string, jobId: string, amount: number) {
    return this.applyLedgerEntry(tx, {
      workspaceId, delta: amount, reason: 'refund',
      refType: 'generation_job', refId: jobId, idempotencyKey: `job:${jobId}:refund`,
    });
  }

  grant(tx: Tx, workspaceId: string, amount: number, reason: string, idempotencyKey?: string, refType?: string, refId?: string) {
    return this.applyLedgerEntry(tx, { workspaceId, delta: amount, reason, idempotencyKey, refType, refId });
  }

  private periodKey(now = new Date()): string {
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  async ensureMonthlyGrant(tx: Tx, workspaceId: string, now = new Date()): Promise<void> {
    const period = this.periodKey(now);
    const key = `grant:${workspaceId}:${period}`;
    const already = await tx.creditLedger.findUnique({
      where: { workspaceId_idempotencyKey: { workspaceId, idempotencyKey: key } },
    });
    if (already) return;

    const ws = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId } });

    const prevGrant = await tx.creditLedger.findFirst({
      where: { workspaceId, reason: 'monthly_grant' },
      orderBy: { createdAt: 'desc' },
    });
    if (prevGrant) {
      const expireAmount = Math.min(ws.creditBalance, prevGrant.delta);
      if (expireAmount > 0) {
        await this.applyLedgerEntry(tx, {
          workspaceId, delta: -expireAmount, reason: 'expire',
          idempotencyKey: `expire:${workspaceId}:${period}`,
          metadata: { expiredFromPeriod: prevGrant.createdAt },
        });
      }
    }

    const allowance = planMonthlyAllowance(ws.plan);
    await this.applyLedgerEntry(tx, {
      workspaceId, delta: allowance, reason: 'monthly_grant', idempotencyKey: key,
      metadata: { period, plan: ws.plan },
    });
  }

  async getBalance(workspaceId: string, now = new Date()) {
    await this.prisma.$transaction((tx) => this.ensureMonthlyGrant(tx, workspaceId, now));
    const ws = await this.prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    return {
      balance: ws.creditBalance,
      plan: ws.plan,
      monthlyAllowance: planMonthlyAllowance(ws.plan),
      periodKey: this.periodKey(now),
    };
  }

  listLedger(workspaceId: string, range?: { from?: Date; to?: Date }) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (range?.from) createdAt.gte = range.from;
    if (range?.to) createdAt.lte = range.to;
    return this.prisma.creditLedger.findMany({
      where: { workspaceId, ...(Object.keys(createdAt).length ? { createdAt } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
}
