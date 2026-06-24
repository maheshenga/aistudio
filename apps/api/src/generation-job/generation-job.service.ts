import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { notFound, validationError } from '../common/errors';
import { CreditService } from '../billing/credit.service';
import { generationCredits } from '../billing/credit-cost';
import { WebhookDeliveryService } from '../webhook/webhook-delivery.service';
import { CreateJobDto, UpdateStatusDto, ListJobQuery } from './dto';

const ALLOWED: Record<string, string[]> = {
  pending: ['running', 'failed', 'cancelled'],
  running: ['succeeded', 'failed', 'cancelled'],
  succeeded: [],
  failed: [],
  cancelled: [],
};

const TERMINAL = new Set(['succeeded', 'failed', 'cancelled']);

@Injectable()
export class GenerationJobService {
  constructor(
    private prisma: PrismaService,
    private credit: CreditService,
    private webhooks: WebhookDeliveryService,
  ) {}

  list(workspaceId: string, q: ListJobQuery) {
    return this.prisma.generationJob.findMany({
      where: {
        workspaceId,
        ...(q.status ? { status: q.status } : {}),
        ...(q.projectId ? { projectId: q.projectId } : {}),
        ...(q.moduleId ? { moduleId: q.moduleId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(workspaceId: string, id: string) {
    const row = await this.prisma.generationJob.findFirst({ where: { id, workspaceId } });
    if (!row) throw notFound('Generation job not found');
    return row;
  }

  create(workspaceId: string, dto: CreateJobDto) {
    const { runtimeTaskId, input, metadata, status, ...rest } = dto;
    const amount = generationCredits({
      moduleId: dto.moduleId ?? null,
      type: dto.type ?? null,
      runtimeMode: dto.runtimeMode ?? null,
      providerKind: dto.providerKind ?? null,
    });

    return this.prisma.$transaction(async (tx) => {
      await this.credit.ensureMonthlyGrant(tx, workspaceId);
      const data: Prisma.GenerationJobUncheckedCreateInput = {
        ...rest,
        workspaceId,
        status: status ?? 'pending',
        ...(input ? { input: input as Prisma.InputJsonValue } : {}),
        ...(metadata ? { externalRef: metadata as Prisma.InputJsonValue } : {}),
        ...(runtimeTaskId ? { externalTaskId: runtimeTaskId } : {}),
      };
      const job = await tx.generationJob.create({ data });
      await this.credit.hold(tx, workspaceId, job.id, amount, job.attempt);
      return job;
    });
  }

  async updateStatus(workspaceId: string, id: string, dto: UpdateStatusDto) {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.generationJob.findFirst({ where: { id, workspaceId } });
      if (!job) throw notFound('Generation job not found');
      if (!ALLOWED[job.status]?.includes(dto.status)) {
        throw validationError(`Cannot transition from ${job.status} to ${dto.status}`);
      }

      const finishedAt = TERMINAL.has(dto.status) ? new Date() : undefined;
      const updated = await tx.generationJob.update({
        where: { id },
        data: {
          status: dto.status,
          error: dto.error ?? null,
          ...(dto.progress !== undefined ? { progress: dto.progress } : {}),
          ...(finishedAt ? { finishedAt } : {}),
        },
      });

      if (TERMINAL.has(dto.status)) {
        const amount = generationCredits(job);
        if (dto.status === 'succeeded') {
          await this.credit.capture(tx, workspaceId, id, job.attempt);
        } else {
          await this.credit.refund(tx, workspaceId, id, amount, job.attempt);
        }
        await this.webhooks.enqueueForTerminalJob(tx, updated);
      }

      return updated;
    });
  }
}
