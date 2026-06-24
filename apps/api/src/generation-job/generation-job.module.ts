import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { GenerationJobController } from './generation-job.controller';
import { GenerationJobService } from './generation-job.service';

@Module({
  imports: [BillingModule],
  controllers: [GenerationJobController],
  providers: [GenerationJobService],
})
export class GenerationJobModule {}
