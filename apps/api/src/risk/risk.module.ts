import { Module } from '@nestjs/common';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [RiskController],
  providers: [RiskService, { provide: RESOURCE_SERVICE, useExisting: RiskService }],
})
export class RiskModule {}
