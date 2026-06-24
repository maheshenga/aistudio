import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { Prisma, type GenerationJob } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { notFound, validationError } from '../common/errors';

const RETRY_DELAYS_MS = [30_000, 120_000, 600_000, 3_600_000, 21_600_000];
const DELIVERY_TIMEOUT_MS = Number(process.env.WEBHOOK_DELIVERY_TIMEOUT_MS ?? 10_000);
const ENDPOINT_FAILING_THRESHOLD = Number(process.env.WEBHOOK_ENDPOINT_FAILING_THRESHOLD ?? 5);

type Tx = Prisma.TransactionClient;

export function terminalGenerationEventType(status: string): string | null {
  if (status === 'succeeded') return 'generation.completed';
  if (status === 'failed' || status === 'cancelled') return 'generation.failed';
  return null;
}

export function buildGenerationWebhookPayload(job: GenerationJob, eventType: string) {
  return {
    id: `${eventType}:${job.id}`,
    type: eventType,
    createdAt: new Date().toISOString(),
    data: {
      jobId: job.id,
      workspaceId: job.workspaceId,
      status: job.status,
      moduleId: job.moduleId,
      type: job.type,
      error: job.error,
      progress: job.progress,
      attempt: job.attempt,
      finishedAt: job.finishedAt?.toISOString() ?? null,
    },
  };
}

export function buildTestWebhookPayload(endpointId: string, eventType: string) {
  const eventId = `test:${endpointId}:${Date.now()}`;
  return {
    id: eventId,
    type: eventType,
    createdAt: new Date().toISOString(),
    data: {
      test: true,
      endpointId,
      message: 'AI Studio webhook test ping',
      sampleJobId: 'job_test_preview',
      status: 'succeeded',
    },
  };
}

export function signWebhookPayload(secret: string, timestamp: number, rawBody: string): string {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return `t=${timestamp},v1=${digest}`;
}

@Injectable()
export class WebhookDeliveryService {
  private readonly logger = new Logger(WebhookDeliveryService.name);

  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  async enqueueForTerminalJob(tx: Tx, job: GenerationJob): Promise<void> {
    const eventType = terminalGenerationEventType(job.status);
    if (!eventType) return;

    const endpoints = await tx.webhookEndpoint.findMany({
      where: {
        workspaceId: job.workspaceId,
        status: 'active',
        OR: [{ events: { has: eventType } }, { events: { has: '*' } }],
      },
    });
    if (endpoints.length === 0) return;

    const payload = buildGenerationWebhookPayload(job, eventType);
    const eventId = String(payload.id);

    await tx.webhookDelivery.createMany({
      data: endpoints.map((endpoint) => ({
        workspaceId: job.workspaceId,
        endpointId: endpoint.id,
        eventType,
        eventId,
        payload: payload as Prisma.InputJsonValue,
        status: 'pending',
        nextRetryAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }

  async processPendingBatch(limit = 20): Promise<number> {
    const now = new Date();
    const due = await this.prisma.webhookDelivery.findMany({
      where: {
        status: { in: ['pending', 'retrying'] },
        nextRetryAt: { lte: now },
      },
      orderBy: { nextRetryAt: 'asc' },
      take: limit,
    });

    let processed = 0;
    for (const delivery of due) {
      try {
        await this.deliverOne(delivery.id);
        processed += 1;
      } catch (error) {
        this.logger.warn(
          `delivery ${delivery.id} failed unexpectedly: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
    return processed;
  }

  async listForEndpoint(workspaceId: string, endpointId: string, limit = 20) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({ where: { id: endpointId, workspaceId } });
    if (!endpoint) throw notFound('Webhook endpoint not found');

    const rows = await this.prisma.webhookDelivery.findMany({
      where: { workspaceId, endpointId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    return rows.map((row) => ({
      id: row.id,
      endpointId: row.endpointId,
      eventType: row.eventType,
      eventId: row.eventId,
      status: row.status,
      attempt: row.attempt,
      maxAttempts: row.maxAttempts,
      httpStatus: row.httpStatus,
      error: row.error,
      nextRetryAt: row.nextRetryAt.getTime(),
      deliveredAt: row.deliveredAt?.getTime() ?? null,
      createdAt: row.createdAt.getTime(),
    }));
  }

  async sendTestDelivery(workspaceId: string, endpointId: string) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({ where: { id: endpointId, workspaceId } });
    if (!endpoint) throw notFound('Webhook endpoint not found');
    if (endpoint.status !== 'active') {
      throw validationError('Webhook endpoint must be active to send a test delivery');
    }

    const eventType = endpoint.events[0] ?? 'generation.completed';
    const payload = buildTestWebhookPayload(endpointId, eventType);
    const eventId = String(payload.id);

    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        workspaceId,
        endpointId,
        eventType,
        eventId,
        payload: payload as Prisma.InputJsonValue,
        status: 'pending',
        nextRetryAt: new Date(),
      },
    });

    await this.deliverOne(delivery.id);

    const updated = await this.prisma.webhookDelivery.findUnique({ where: { id: delivery.id } });
    if (!updated) throw notFound('Webhook delivery not found');

    return {
      id: updated.id,
      endpointId: updated.endpointId,
      eventType: updated.eventType,
      eventId: updated.eventId,
      status: updated.status,
      attempt: updated.attempt,
      maxAttempts: updated.maxAttempts,
      httpStatus: updated.httpStatus,
      error: updated.error,
      nextRetryAt: updated.nextRetryAt.getTime(),
      deliveredAt: updated.deliveredAt?.getTime() ?? null,
      createdAt: updated.createdAt.getTime(),
    };
  }

  async deliverOne(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { endpoint: true },
    });
    if (!delivery || !['pending', 'retrying'].includes(delivery.status)) return;
    if (delivery.endpoint.status !== 'active') {
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { status: 'failed', error: 'endpoint not active' },
      });
      return;
    }

    const secretCiphertext = delivery.endpoint.signingSecretCiphertext;
    if (!secretCiphertext) {
      await this.markFailure(delivery, null, 'missing signing secret');
      return;
    }

    const attempt = delivery.attempt + 1;
    const rawBody = JSON.stringify(delivery.payload);
    let secret: string;
    try {
      secret = this.encryption.decrypt(secretCiphertext);
    } catch {
      await this.markFailure(delivery, null, 'unable to decrypt signing secret');
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signWebhookPayload(secret, timestamp, rawBody);

    try {
      const response = await fetch(delivery.endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AIStudio-Webhooks/1.0',
          'X-Webhook-Id': delivery.eventId,
          'X-Webhook-Event': delivery.eventType,
          'X-Webhook-Signature': signature,
        },
        body: rawBody,
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });

      if (response.ok) {
        await this.markSuccess(delivery.id, delivery.endpointId, response.status);
        return;
      }

      const body = await response.text().catch(() => '');
      await this.markFailure(
        delivery,
        response.status,
        `HTTP ${response.status}${body ? `: ${body.slice(0, 240)}` : ''}`,
        attempt,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'delivery request failed';
      await this.markFailure(delivery, null, message, attempt);
    }
  }

  private async markSuccess(deliveryId: string, endpointId: string, httpStatus: number): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'delivered',
          attempt: { increment: 1 },
          httpStatus,
          error: null,
          deliveredAt: now,
        },
      }),
      this.prisma.webhookEndpoint.update({
        where: { id: endpointId },
        data: { lastDeliveredAt: now, failureCount: 0 },
      }),
    ]);
  }

  private async markFailure(
    delivery: { id: string; endpointId: string; attempt: number; maxAttempts: number },
    httpStatus: number | null,
    error: string,
    attempt = delivery.attempt + 1,
  ): Promise<void> {
    const exhausted = attempt >= delivery.maxAttempts;
    const nextRetryAt = exhausted
      ? new Date()
      : new Date(Date.now() + (RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)] ?? RETRY_DELAYS_MS.at(-1)!));

    await this.prisma.$transaction(async (tx) => {
      await tx.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: exhausted ? 'failed' : 'retrying',
          attempt,
          httpStatus,
          error,
          nextRetryAt,
        },
      });

      if (exhausted) {
        const endpoint = await tx.webhookEndpoint.update({
          where: { id: delivery.endpointId },
          data: { failureCount: { increment: 1 } },
        });
        if (endpoint.failureCount >= ENDPOINT_FAILING_THRESHOLD && endpoint.status === 'active') {
          await tx.webhookEndpoint.update({
            where: { id: delivery.endpointId },
            data: { status: 'failing' },
          });
        }
      }
    });
  }
}
