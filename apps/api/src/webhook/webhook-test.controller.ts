import { Controller, Param, Post } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { RequirePermission } from '../common/rbac/require-permission.decorator';
import { WebhookDeliveryService } from './webhook-delivery.service';

@Controller('workspaces/:workspaceId/webhooks/:endpointId')
export class WebhookTestController {
  constructor(private delivery: WebhookDeliveryService) {}

  @Post('test')
  @RequirePermission('api_keys.manage')
  async sendTest(
    @WorkspaceId() workspaceId: string,
    @Param('endpointId') endpointId: string,
  ) {
    return { value: await this.delivery.sendTestDelivery(workspaceId, endpointId) };
  }
}
