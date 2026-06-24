import { Controller, Get, Param, Query } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { ListWebhookDeliveryQuery } from './dto';

@Controller('workspaces/:workspaceId/webhooks/:endpointId/deliveries')
export class WebhookDeliveryController {
  constructor(private delivery: WebhookDeliveryService) {}

  @Get()
  async list(
    @WorkspaceId() workspaceId: string,
    @Param('endpointId') endpointId: string,
    @Query() query: ListWebhookDeliveryQuery,
  ) {
    return {
      value: await this.delivery.listForEndpoint(workspaceId, endpointId, query.limit ?? 20),
    };
  }
}
