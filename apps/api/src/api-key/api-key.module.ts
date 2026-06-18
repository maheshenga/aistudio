import { Module } from '@nestjs/common';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [ApiKeyController],
  providers: [ApiKeyService, { provide: RESOURCE_SERVICE, useExisting: ApiKeyService }],
})
export class ApiKeyModule {}
