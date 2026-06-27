import { Module } from '@nestjs/common';
import { OrchestrationController } from './orchestration.controller';
import { OrchestrationService } from './orchestration.service';
import { ReconciliationService } from './reconciliation.service';
import { MULTICA_SERVER_CLIENT, createMulticaServerClient } from './multica-server-client';
import { BillingModule } from '../billing/billing.module';
import { WebhookModule } from '../webhook/webhook.module';
import { ProviderModule } from '../provider/provider.module';

@Module({
  imports: [BillingModule, WebhookModule, ProviderModule],
  controllers: [OrchestrationController],
  providers: [
    OrchestrationService,
    ReconciliationService,
    {
      provide: MULTICA_SERVER_CLIENT,
      useFactory: () => createMulticaServerClient({ apiUrl: process.env.MULTICA_API_URL, token: process.env.MULTICA_API_TOKEN }),
    },
  ],
})
export class OrchestrationModule {}
