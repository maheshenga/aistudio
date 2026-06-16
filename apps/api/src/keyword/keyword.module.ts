import { Module } from '@nestjs/common';
import { KeywordController } from './keyword.controller';
import { KeywordService } from './keyword.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [KeywordController],
  providers: [KeywordService, { provide: RESOURCE_SERVICE, useExisting: KeywordService }],
})
export class KeywordModule {}
