import { Body, Controller, Headers, Param, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/tenant/public.decorator';
import { notFound, permissionDenied, validationError } from '../common/errors';
import { PrismaService } from '../common/prisma/prisma.service';
import { ProviderRegistry } from './provider-registry';
import { JobFinalizationService } from '../orchestration/job-finalization.service';

/**
 * R03-2/R03-4: inbound signed provider callback ingress.
 *
 * Public (no workspace JWT) — authenticity comes from the adapter's HMAC
 * signature over the raw body. Flow: resolve adapter by providerKind → verify
 * signature/timestamp → dedup via ProviderCallbackEvent (at-least-once) → map to
 * a canonical terminal state → finalize through the SAME JobFinalizationService
 * the reconcile safety net uses, so the two paths never diverge.
 */
@Controller('providers/:providerKind/callbacks')
export class ProviderCallbackController {
  constructor(
    private prisma: PrismaService,
    private registry: ProviderRegistry,
    private finalizer: JobFinalizationService,
  ) {}

  @Public()
  @Post()
  async handle(
    @Param('providerKind') providerKind: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: Record<string, unknown>,
  ): Promise<{ value: { ok: true; deduped?: boolean } }> {
    const adapter = this.registry.resolve(providerKind);
    if (!adapter || !adapter.verifyCallback || !adapter.mapCallback) {
      throw notFound('Unknown or non-callback provider');
    }

    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(body);
    const verification = adapter.verifyCallback(rawBody, headers);
    if (!verification.ok) {
      throw permissionDenied(`Callback verification failed: ${verification.reason ?? 'invalid signature'}`);
    }

    const externalTaskId = String(body.taskId ?? body.externalTaskId ?? '');
    if (!externalTaskId) throw validationError('Callback missing taskId');
    const externalEventId = verification.externalEventId ?? `${externalTaskId}:${body.status ?? 'unknown'}`;

    const mapped = adapter.mapCallback(body);

    if (mapped.status === 'pending' || mapped.status === 'running') {
      // Non-terminal progress callback: idempotent status update, no finalize/dedup.
      const job = await this.prisma.generationJob.findFirst({ where: { externalTaskId } });
      if (job && !['succeeded', 'failed', 'cancelled'].includes(job.status)) {
        await this.prisma.generationJob.update({
          where: { id: job.id },
          data: { status: 'running', startedAt: job.startedAt ?? new Date() },
        });
      }
      return { value: { ok: true } };
    }

    const job = await this.prisma.generationJob.findFirst({ where: { externalTaskId } });
    if (!job) throw notFound('No generation job for that external task');

    // R03-4: dedup is claimed INSIDE the finalize transaction, so a finalize
    // failure rolls back the dedup row and a vendor retry can re-process.
    const result = await this.finalizer.finalize({
      jobId: job.id,
      terminal: mapped.status,
      artifacts: mapped.artifacts,
      error: mapped.error,
      source: providerKind,
      dedup: { providerKind, externalTaskId, externalEventId },
    });

    return { value: { ok: true, deduped: result.deduped } };
  }
}
