import { Module } from '@nestjs/common';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [CampaignController],
  providers: [CampaignService, { provide: RESOURCE_SERVICE, useExisting: CampaignService }],
})
export class CampaignModule {}
