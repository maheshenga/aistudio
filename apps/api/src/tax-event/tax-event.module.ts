import { Module } from '@nestjs/common';
import { TaxEventController } from './tax-event.controller';
import { TaxEventService } from './tax-event.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [TaxEventController],
  providers: [TaxEventService, { provide: RESOURCE_SERVICE, useExisting: TaxEventService }],
})
export class TaxEventModule {}
