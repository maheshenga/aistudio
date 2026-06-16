import { Module } from '@nestjs/common';
import { AnnouncementController } from './announcement.controller';
import { AnnouncementService } from './announcement.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [AnnouncementController],
  providers: [AnnouncementService, { provide: RESOURCE_SERVICE, useExisting: AnnouncementService }],
})
export class AnnouncementModule {}
