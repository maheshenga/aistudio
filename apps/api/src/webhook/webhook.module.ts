import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [WebhookController],
  providers: [WebhookService, { provide: RESOURCE_SERVICE, useExisting: WebhookService }],
})
export class WebhookModule {}
