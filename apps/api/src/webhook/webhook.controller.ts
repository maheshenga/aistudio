import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateWebhookDto, UpdateWebhookDto, ListWebhookQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/webhooks',
  createDto: CreateWebhookDto, updateDto: UpdateWebhookDto, listQuery: ListWebhookQuery,
  writePermission: 'api_keys.manage',
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/webhooks')
export class WebhookController extends Base {}
