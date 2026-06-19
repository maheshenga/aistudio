import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreateCampaignDto, UpdateCampaignDto, ListCampaignQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/campaigns',
  createDto: CreateCampaignDto, updateDto: UpdateCampaignDto, listQuery: ListCampaignQuery,
  writePermission: 'resources.write',
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/campaigns')
export class CampaignController extends Base {}
