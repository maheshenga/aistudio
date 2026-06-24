import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { WebhookDeliveryService } from './webhook-delivery.service';

@Injectable()
export class WebhookDeliveryWorker {
  private readonly logger = new Logger(WebhookDeliveryWorker.name);

  constructor(private delivery: WebhookDeliveryService) {}

  @Interval(Number(process.env.WEBHOOK_DELIVERY_INTERVAL_MS ?? 15_000))
  async tick(): Promise<void> {
    if (process.env.WEBHOOK_DELIVERY_ENABLED === 'false') return;
    try {
      const processed = await this.delivery.processPendingBatch();
      if (processed > 0) {
        this.logger.debug(`processed ${processed} webhook deliveries`);
      }
    } catch (error) {
      this.logger.warn(`webhook delivery tick failed: ${error instanceof Error ? error.message : error}`);
    }
  }
}
