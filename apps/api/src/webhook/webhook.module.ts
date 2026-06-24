import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookDeliveryController } from './webhook-delivery.controller';
import { WebhookService } from './webhook.service';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { WebhookDeliveryWorker } from './webhook-delivery.worker';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [WebhookController, WebhookDeliveryController],
  providers: [
    WebhookService,
    WebhookDeliveryService,
    WebhookDeliveryWorker,
    { provide: RESOURCE_SERVICE, useExisting: WebhookService },
  ],
  exports: [WebhookDeliveryService],
})
export class WebhookModule {}
