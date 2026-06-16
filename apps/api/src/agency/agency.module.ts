import { Module } from '@nestjs/common';
import { AgencyController } from './agency.controller';
import { AgencyService } from './agency.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [AgencyController],
  providers: [AgencyService, { provide: RESOURCE_SERVICE, useExisting: AgencyService }],
})
export class AgencyModule {}
