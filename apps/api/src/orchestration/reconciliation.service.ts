import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { MULTICA_SERVER_CLIENT, type MulticaServerClient } from './multica-server-client';
import { CreditService } from '../billing/credit.service';
import { WebhookDeliveryService } from '../webhook/webhook-delivery.service';

const ORPHAN_PENDING_TIMEOUT_MS = Number(process.env.ORCHESTRATION_ORPHAN_TIMEOUT_MS ?? 15 * 60 * 1000);
// BILL-07: absolute ceiling after which ANY non-terminal job is failed + refunded,
// independent of externalTaskId or provider availability, so no hold is stranded
// when a linked provider goes silent or the reconcile client is absent.
const MAX_JOB_AGE_MS = Number(process.env.ORCHESTRATION_MAX_JOB_AGE_MS ?? 60 * 60 * 1000);

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private prisma: PrismaService,
    private credit: CreditService,
    private webhooks: WebhookDeliveryService,
    @Optional() @Inject(MULTICA_SERVER_CLIENT) private client: MulticaServerClient | null,
  ) {}

  @Interval(Number(process.env.ORCHESTRATION_RECONCILE_INTERVAL_MS ?? 10000))
  async scheduled(): Promise<void> {
    if (process.env.ORCHESTRATION_RECONCILE_ENABLED !== 'true') return;
    try { await this.reconcileOnce(); }
    catch (e) { this.logger.warn(`reconcile tick failed: ${e instanceof Error ? e.message : e}`); }
  }

  async reconcileOnce(now: Date = new Date()): Promise<void> {
    const orphans = await this.prisma.generationJob.findMany({
      where: { status: 'pending', externalTaskId: null, createdAt: { lt: new Date(now.getTime() - ORPHAN_PENDING_TIMEOUT_MS) } },
    });
    for (const orphan of orphans) {
      await this.failAndRefund(orphan.id, 'dispatch not confirmed', now);
    }

    // BILL-07: time out any non-terminal job past the absolute max age, regardless
    // of externalTaskId or whether a reconcile client is configured. Without this,
    // an externally-linked job whose provider never reports back keeps its credit
    // hold debited forever (the orphan sweep above only targets externalTaskId=null).
    const stale = await this.prisma.generationJob.findMany({
      where: { status: { in: ['pending', 'running'] }, createdAt: { lt: new Date(now.getTime() - MAX_JOB_AGE_MS) } },
    });
    for (const job of stale) {
      await this.failAndRefund(job.id, 'job timed out (max age exceeded)', now);
    }

    if (!this.client) return;

    const jobs = await this.prisma.generationJob.findMany({
      where: { status: { in: ['pending', 'running'] }, externalTaskId: { not: null } },
    });

    for (const job of jobs) {
      try { await this.reconcileJob(job, now); }
      catch (e) { this.logger.warn(`reconcile job ${job.id} failed: ${e instanceof Error ? e.message : e}`); }
    }
  }

  /** Atomically fail a still-non-terminal job and refund exactly its persisted hold. */
  private async failAndRefund(jobId: string, error: string, now: Date): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.generationJob.findUnique({ where: { id: jobId } });
      if (!fresh || !['pending', 'running'].includes(fresh.status)) return;
      await tx.generationJob.update({
        where: { id: jobId },
        data: { status: 'failed', error, finishedAt: now },
      });
      if (fresh.heldCredits > 0) {
        await this.credit.refund(tx, fresh.workspaceId, jobId, fresh.heldCredits, fresh.attempt);
      }
      const failed = await tx.generationJob.findUnique({ where: { id: jobId } });
      if (failed) await this.webhooks.enqueueForTerminalJob(tx, failed);
    });
  }

  private async reconcileJob(job: { id: string; workspaceId: string; status: string; externalTaskId: string | null; runtimeMode: string | null; providerKind: string | null; startedAt: Date | null; attempt: number; heldCredits: number }, now: Date): Promise<void> {
    const snap = await this.client!.getTask(job.externalTaskId!);

    if (snap.status === 'running') {
      await this.prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: 'running',
          progress: snap.progress ?? undefined,
          currentStep: snap.currentStep ?? undefined,
          startedAt: job.startedAt ?? now,
        },
      });
      return;
    }
    if (snap.status === 'pending') return;

    await this.finalize(job, snap.status, now);
  }

  private async finalize(
    job: { id: string; workspaceId: string; externalTaskId: string | null; runtimeMode: string | null; providerKind: string | null; startedAt: Date | null; attempt: number; heldCredits: number },
    terminal: 'succeeded' | 'failed' | 'cancelled',
    now: Date,
  ): Promise<void> {
    const artifacts = terminal === 'succeeded' ? await this.client!.getArtifacts(job.externalTaskId!) : [];

    await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.generationJob.findUnique({ where: { id: job.id } });
      if (!fresh || ['succeeded', 'failed', 'cancelled'].includes(fresh.status)) return;

      await tx.generationJob.update({
        where: { id: job.id },
        data: { status: terminal, progress: terminal === 'succeeded' ? 100 : undefined, finishedAt: now, startedAt: fresh.startedAt ?? now },
      });

      // BILL-03/BILL-06: thread job.attempt so a retried job's refund uses the
      // correct idempotency key (job:{id}:{attempt}:refund) instead of colliding
      // with attempt 1 and silently skipping. Refund the persisted held amount.
      if (fresh.heldCredits > 0) {
        if (terminal === 'succeeded') {
          await this.credit.capture(tx, job.workspaceId, job.id, fresh.attempt);
        } else {
          await this.credit.refund(tx, job.workspaceId, job.id, fresh.heldCredits, fresh.attempt);
        }
      }

      if (terminal === 'succeeded') {
        for (const [idx, art] of artifacts.entries()) {
          const externalArtifactId = String(art.id ?? `${job.externalTaskId}#${idx}`);
          const exists = await tx.asset.findFirst({
            where: { workspaceId: job.workspaceId, jobId: job.id, metadata: { path: ['externalArtifactId'], equals: externalArtifactId } },
          });
          if (exists) continue;
          const asset = await tx.asset.create({
            data: {
              workspaceId: job.workspaceId, jobId: job.id,
              kind: String(art.kind ?? 'output'), url: art.url ?? null,
              metadata: { externalArtifactId, source: 'multica' } as Prisma.InputJsonValue,
            },
          });
          await this.webhooks.enqueueForAssetCreated(tx, asset);
        }
        const usageExists = await tx.usageEvent.findFirst({ where: { workspaceId: job.workspaceId, jobId: job.id, category: 'generation' } });
        if (!usageExists) {
          const durationMs = job.startedAt ? Math.max(0, now.getTime() - job.startedAt.getTime()) : 0;
          await tx.usageEvent.create({
            data: {
              workspaceId: job.workspaceId, jobId: job.id, category: 'generation', credits: job.heldCredits,
              metadata: { providerKind: job.providerKind ?? null, runtimeMode: job.runtimeMode ?? null, durationMs } as Prisma.InputJsonValue,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          workspaceId: job.workspaceId,
          action: terminal === 'succeeded' ? 'generation_job_complete' : terminal === 'failed' ? 'generation_job_failed' : 'task_cancelled',
          targetType: 'generation_job', targetId: job.id,
          metadata: { terminal, artifactCount: artifacts.length } as Prisma.InputJsonValue,
        },
      });

      if (terminal === 'succeeded' && artifacts.length > 0) {
        await tx.auditLog.create({
          data: {
            workspaceId: job.workspaceId, action: 'output_asset_imported',
            targetType: 'generation_job', targetId: job.id,
            metadata: { count: artifacts.length } as Prisma.InputJsonValue,
          },
        });
      }

      const finalized = await tx.generationJob.findUnique({ where: { id: job.id } });
      if (finalized) await this.webhooks.enqueueForTerminalJob(tx, finalized);
    });
  }
}
