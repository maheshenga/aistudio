import { Module } from '@nestjs/common';
import { WebhookModule } from '../webhook/webhook.module';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  imports: [WebhookModule],
  controllers: [FinancialController],
  providers: [FinancialService, { provide: RESOURCE_SERVICE, useExisting: FinancialService }],
})
export class FinancialModule {}
