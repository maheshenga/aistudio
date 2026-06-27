import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { WebhookModule } from '../webhook/webhook.module';
import { ProviderRegistry } from './provider-registry';
import { ProviderCallbackController } from './provider-callback.controller';
import { JobFinalizationService } from '../orchestration/job-finalization.service';

/**
 * R03-3: provider seam module. Exposes the config-driven ProviderRegistry and
 * the JobFinalizationService (shared by reconcile + callbacks), plus the public
 * inbound callback controller.
 */
@Module({
  imports: [PrismaModule, BillingModule, WebhookModule],
  controllers: [ProviderCallbackController],
  providers: [ProviderRegistry, JobFinalizationService],
  exports: [ProviderRegistry, JobFinalizationService],
})
export class ProviderModule {}
