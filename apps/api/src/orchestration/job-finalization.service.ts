import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreditService } from '../billing/credit.service';
import { WebhookDeliveryService } from '../webhook/webhook-delivery.service';
import type { ProviderArtifact } from '../provider/provider-adapter';

type Terminal = 'succeeded' | 'failed' | 'cancelled';

/**
 * R03-2/R03-6: the single terminal-finalize transaction for a generation job,
 * shared by the inbound provider callback controller AND the reconcile safety
 * net. Centralizing it guarantees both paths produce identical side effects
 * (capture/refund, asset import, usage event, audit, webhook enqueue) and the
 * same idempotency guards — so the two never diverge.
 *
 * Money handling matches BILL-03/06: capture/refund use job.attempt and the
 * persisted heldCredits, and skip the ledger entirely for free (mock) jobs.
 */
@Injectable()
export class JobFinalizationService {
  constructor(
    private prisma: PrismaService,
    private credit: CreditService,
    private webhooks: WebhookDeliveryService,
  ) {}

  async finalize(params: {
    jobId: string;
    terminal: Terminal;
    artifacts?: ProviderArtifact[];
    error?: string;
    source: string;
    now?: Date;
  }): Promise<void> {
    const { jobId, terminal, source } = params;
    const artifacts = params.artifacts ?? [];
    const now = params.now ?? new Date();

    await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.generationJob.findUnique({ where: { id: jobId } });
      // Terminal idempotency: a job finalized by either path is never re-finalized.
      if (!fresh || ['succeeded', 'failed', 'cancelled'].includes(fresh.status)) return;

      await tx.generationJob.update({
        where: { id: jobId },
        data: {
          status: terminal,
          progress: terminal === 'succeeded' ? 100 : undefined,
          error: params.error ?? null,
          finishedAt: now,
          startedAt: fresh.startedAt ?? now,
        },
      });

      // BILL-03/06: thread attempt + refund exactly the persisted hold; skip for free jobs.
      if (fresh.heldCredits > 0) {
        if (terminal === 'succeeded') {
          await this.credit.capture(tx, fresh.workspaceId, jobId, fresh.attempt);
        } else {
          await this.credit.refund(tx, fresh.workspaceId, jobId, fresh.heldCredits, fresh.attempt);
        }
      }

      if (terminal === 'succeeded') {
        for (const [idx, art] of artifacts.entries()) {
          const externalArtifactId = String(art.id ?? `${fresh.externalTaskId ?? jobId}#${idx}`);
          const exists = await tx.asset.findFirst({
            where: { workspaceId: fresh.workspaceId, jobId, metadata: { path: ['externalArtifactId'], equals: externalArtifactId } },
          });
          if (exists) continue;
          const asset = await tx.asset.create({
            data: {
              workspaceId: fresh.workspaceId,
              jobId,
              kind: String(art.kind ?? 'output'),
              url: art.url ?? null,
              metadata: {
                externalArtifactId,
                source,
                ...(typeof art.text === 'string' ? { text: art.text } : {}),
              } as Prisma.InputJsonValue,
            },
          });
          await this.webhooks.enqueueForAssetCreated(tx, asset);
        }

        const usageExists = await tx.usageEvent.findFirst({ where: { workspaceId: fresh.workspaceId, jobId, category: 'generation' } });
        if (!usageExists) {
          const durationMs = fresh.startedAt ? Math.max(0, now.getTime() - fresh.startedAt.getTime()) : 0;
          await tx.usageEvent.create({
            data: {
              workspaceId: fresh.workspaceId, jobId, category: 'generation', credits: fresh.heldCredits,
              metadata: { providerKind: fresh.providerKind ?? null, runtimeMode: fresh.runtimeMode ?? null, durationMs, source } as Prisma.InputJsonValue,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          workspaceId: fresh.workspaceId,
          action: terminal === 'succeeded' ? 'generation_job_complete' : terminal === 'failed' ? 'generation_job_failed' : 'task_cancelled',
          targetType: 'generation_job', targetId: jobId,
          metadata: { terminal, artifactCount: artifacts.length, source } as Prisma.InputJsonValue,
        },
      });

      if (terminal === 'succeeded' && artifacts.length > 0) {
        await tx.auditLog.create({
          data: {
            workspaceId: fresh.workspaceId, action: 'output_asset_imported',
            targetType: 'generation_job', targetId: jobId,
            metadata: { count: artifacts.length, source } as Prisma.InputJsonValue,
          },
        });
      }

      const finalized = await tx.generationJob.findUnique({ where: { id: jobId } });
      if (finalized) await this.webhooks.enqueueForTerminalJob(tx, finalized);
    });
  }
}
