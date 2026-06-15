import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { notFound, validationError } from '../common/errors';
import { DispatchDto, LinkExternalDto } from './dto';

const TERMINAL = new Set(['succeeded', 'failed', 'cancelled']);

interface Actor { userId: string; role?: string }

@Injectable()
export class OrchestrationService {
  constructor(private prisma: PrismaService) {}

  private async getJob(workspaceId: string, id: string) {
    const job = await this.prisma.generationJob.findFirst({ where: { id, workspaceId } });
    if (!job) throw notFound('Generation job not found');
    return job;
  }

  private audit(workspaceId: string, action: string, job: { id: string }, actor: Actor, metadata?: Record<string, unknown>) {
    return this.prisma.auditLog.create({
      data: {
        workspaceId, action, userId: actor.userId, actorRole: actor.role,
        targetType: 'generation_job', targetId: job.id,
        metadata: (metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async dispatch(workspaceId: string, dto: DispatchDto, actor: Actor) {
    const job = await this.prisma.generationJob.create({
      data: {
        workspaceId, type: dto.type, input: dto.input as Prisma.InputJsonValue,
        status: 'pending', runtimeMode: dto.runtimeMode,
        projectId: dto.projectId ?? null, agentId: dto.agentId ?? null,
        providerKind: dto.providerKind ?? null,
      },
    });
    await this.audit(workspaceId, 'task_dispatched', job, actor, { runtimeMode: dto.runtimeMode });
    return job;
  }

  async linkExternal(workspaceId: string, id: string, dto: LinkExternalDto, actor: Actor) {
    const job = await this.getJob(workspaceId, id);
    if (TERMINAL.has(job.status)) throw validationError('Cannot link external task to a terminal job');
    const updated = await this.prisma.generationJob.update({
      where: { id },
      data: { externalTaskId: dto.externalTaskId, externalRef: (dto.externalRef ?? undefined) as Prisma.InputJsonValue | undefined },
    });
    await this.audit(workspaceId, 'task_linked', updated, actor, { externalTaskId: dto.externalTaskId });
    return updated;
  }

  async cancel(workspaceId: string, id: string, actor: Actor) {
    const job = await this.getJob(workspaceId, id);
    if (TERMINAL.has(job.status)) throw validationError('Job already in a terminal state');
    await this.audit(workspaceId, 'task_cancelled', job, actor, {});
    return job;
  }

  async retry(workspaceId: string, id: string, actor: Actor) {
    const job = await this.getJob(workspaceId, id);
    if (!TERMINAL.has(job.status)) throw validationError('Only terminal jobs can be retried');
    const updated = await this.prisma.generationJob.update({
      where: { id },
      data: {
        status: 'pending', externalTaskId: null, externalRef: Prisma.DbNull,
        progress: null, currentStep: null, error: null, startedAt: null, finishedAt: null,
      },
    });
    await this.audit(workspaceId, 'generation_job_retry', updated, actor, {});
    return updated;
  }
}
