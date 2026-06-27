import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { notFound, validationError } from '../common/errors';
import { DispatchDto, LinkExternalDto } from './dto';
import { CreditService } from '../billing/credit.service';
import { generationCredits } from '../billing/credit-cost';
import { ProviderRegistry } from '../provider/provider-registry';
import { JobFinalizationService } from './job-finalization.service';

const TERMINAL = new Set(['succeeded', 'failed', 'cancelled']);

interface Actor { userId: string; role?: string }

@Injectable()
export class OrchestrationService {
  constructor(
    private prisma: PrismaService,
    private credit: CreditService,
    private registry: ProviderRegistry,
    private finalizer: JobFinalizationService,
  ) {}

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
    const amount = generationCredits({
      type: dto.type,
      runtimeMode: dto.runtimeMode,
      providerKind: dto.providerKind ?? null,
      unitCount: dto.unitCount ?? null,
    });
    const job = await this.prisma.$transaction(async (tx) => {
      await this.credit.ensureMonthlyGrant(tx, workspaceId);
      const created = await tx.generationJob.create({
        data: {
          workspaceId, type: dto.type, input: dto.input as Prisma.InputJsonValue,
          status: 'pending', runtimeMode: dto.runtimeMode,
          projectId: dto.projectId ?? null, agentId: dto.agentId ?? null,
          providerKind: dto.providerKind ?? null,
          heldCredits: amount,
        },
      });
      if (amount > 0) {
        await this.credit.hold(tx, workspaceId, created.id, amount, created.attempt);
      }
      await tx.auditLog.create({
        data: {
          workspaceId, action: 'task_dispatched', userId: actor.userId, actorRole: actor.role,
          targetType: 'generation_job', targetId: created.id,
          metadata: { runtimeMode: dto.runtimeMode, heldCredits: amount } as Prisma.InputJsonValue,
        },
      });
      return created;
    });

    // R03-1: after the hold transaction commits, actually start work at the
    // resolved provider. mock/unconfigured kinds resolve to null and keep the
    // legacy no-op behavior (the job waits for an external link / mock flow).
    await this.submitToProvider(workspaceId, job, dto);
    return this.prisma.generationJob.findUnique({ where: { id: job.id } }) as Promise<typeof job>;
  }

  /** Kick off the resolved provider; compensate the credit hold on failure. */
  private async submitToProvider(
    workspaceId: string,
    job: { id: string; type: string | null; moduleId: string | null; prompt: string | null; input: Prisma.JsonValue; providerKind: string | null },
    dto: DispatchDto,
  ): Promise<void> {
    const adapter = this.registry.resolve(job.providerKind);
    if (!adapter) return;
    // DispatchDto carries the prompt/moduleId inside `input` (the job row only
    // persists `type`), so derive them for the provider context.
    const input = (dto.input ?? {}) as Record<string, unknown>;
    const derivedPrompt = job.prompt
      ?? (typeof input.prompt === 'string' ? input.prompt : null)
      ?? (typeof input.text === 'string' ? input.text : null);
    const derivedModuleId = job.moduleId
      ?? (typeof input.moduleId === 'string' ? input.moduleId : null)
      ?? job.type;
    try {
      const result = await adapter.submit({
        id: job.id,
        workspaceId,
        type: job.type,
        moduleId: derivedModuleId,
        prompt: derivedPrompt,
        input: dto.input,
        providerKind: job.providerKind,
      });
      if (result.externalTaskId) {
        await this.prisma.generationJob.update({
          where: { id: job.id },
          data: { externalTaskId: result.externalTaskId, startedAt: new Date() },
        });
      }
      // Synchronous adapters (e.g. Gemini text/image) return terminal output now.
      if (result.immediate) {
        await this.finalizer.finalize({
          jobId: job.id,
          terminal: result.immediate.status,
          artifacts: result.immediate.artifacts,
          error: result.immediate.error,
          source: adapter.kind,
        });
      }
    } catch (e) {
      // Submission failed → fail+refund through the shared finalize so the hold
      // is never stranded (compensates the credit hold taken above).
      await this.finalizer.finalize({
        jobId: job.id,
        terminal: 'failed',
        error: e instanceof Error ? e.message : String(e),
        source: adapter.kind,
      });
    }
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
    // BILL-06: refund exactly what was held for this attempt, not a recomputed value.
    const amount = job.heldCredits;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.generationJob.update({
        where: { id },
        data: { status: 'cancelled', finishedAt: new Date() },
      });
      if (amount > 0) {
        await this.credit.refund(tx, workspaceId, id, amount, job.attempt);
      }
      await tx.auditLog.create({
        data: {
          workspaceId, action: 'task_cancelled', userId: actor.userId, actorRole: actor.role,
          targetType: 'generation_job', targetId: updated.id,
          metadata: { refundedCredits: amount } as Prisma.InputJsonValue,
        },
      });
      return updated;
    });
  }

  async retry(workspaceId: string, id: string, actor: Actor) {
    const job = await this.getJob(workspaceId, id);
    if (!TERMINAL.has(job.status)) throw validationError('Only terminal jobs can be retried');
    // Re-price the new attempt from the job's own attributes (heldCredits records the
    // prior attempt's hold; a fresh hold is computed for the new attempt).
    const amount = generationCredits(job);
    const nextAttempt = job.attempt + 1;
    // 必须在同一事务里为新一轮重新冻结额度:余额不足则整体回滚,job 状态不被破坏。
    // 这同时堵死了"零余额白嫖"——retry 不再能免费开启新一轮生成。
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.generationJob.update({
        where: { id },
        data: {
          status: 'pending', attempt: nextAttempt, heldCredits: amount,
          externalTaskId: null, externalRef: Prisma.DbNull,
          progress: null, currentStep: null, error: null, startedAt: null, finishedAt: null,
        },
      });
      if (amount > 0) {
        await this.credit.hold(tx, workspaceId, id, amount, nextAttempt);
      }
      await tx.auditLog.create({
        data: {
          workspaceId, action: 'generation_job_retry', userId: actor.userId, actorRole: actor.role,
          targetType: 'generation_job', targetId: updated.id,
          metadata: { attempt: nextAttempt, heldCredits: amount } as Prisma.InputJsonValue,
        },
      });
      return updated;
    });
  }
}
