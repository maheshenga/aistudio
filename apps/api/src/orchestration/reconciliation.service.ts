import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { MULTICA_SERVER_CLIENT, type MulticaServerClient } from './multica-server-client';
import { WebhookDeliveryService } from '../webhook/webhook-delivery.service';
import { JobFinalizationService } from './job-finalization.service';

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
    private webhooks: WebhookDeliveryService,
    private finalizer: JobFinalizationService,
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

  /** Fail a still-non-terminal job and refund exactly its persisted hold (via shared finalizer). */
  private async failAndRefund(jobId: string, error: string, now: Date): Promise<void> {
    await this.finalizer.finalize({ jobId, terminal: 'failed', error, source: 'reconcile', now });
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

    const artifacts = snap.status === 'succeeded' ? await this.client!.getArtifacts(job.externalTaskId!) : [];
    // R03-2/R03-6: terminal finalize goes through the shared finalizer so the
    // reconcile safety net and the inbound callback controller never diverge.
    await this.finalizer.finalize({
      jobId: job.id,
      terminal: snap.status,
      artifacts,
      source: 'multica',
      now,
    });
  }
}
