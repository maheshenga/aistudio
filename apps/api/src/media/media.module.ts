import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [MediaController],
  providers: [MediaService, { provide: RESOURCE_SERVICE, useExisting: MediaService }],
})
export class MediaModule {}
