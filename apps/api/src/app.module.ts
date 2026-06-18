import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { EncryptionModule } from './common/encryption/encryption.module';
import { AuthModule } from './auth/auth.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { ProjectModule } from './project/project.module';
import { MemberModule } from './member/member.module';
import { GenerationJobModule } from './generation-job/generation-job.module';
import { AssetModule } from './asset/asset.module';
import { UsageEventModule } from './usage-event/usage-event.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { OrchestrationModule } from './orchestration/orchestration.module';
import { BillingModule } from './billing/billing.module';
import { CustomerModule } from './customer/customer.module';
import { CampaignModule } from './campaign/campaign.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { AgencyModule } from './agency/agency.module';
import { RiskModule } from './risk/risk.module';
import { MediaModule } from './media/media.module';
import { KeywordModule } from './keyword/keyword.module';
import { TicketModule } from './ticket/ticket.module';
import { PaymentModule } from './payment/payment.module';
import { TaxEventModule } from './tax-event/tax-event.module';
import { TaskModule } from './task/task.module';
import { FinancialModule } from './financial/financial.module';
import { SettingsModule } from './settings/settings.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { TenantGuard } from './common/tenant/tenant.guard';
import { AuthGuard } from './common/auth/auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, EncryptionModule, AuthModule, WorkspaceModule, ProjectModule, MemberModule, GenerationJobModule, AssetModule, UsageEventModule, AuditLogModule, OrchestrationModule, BillingModule, CustomerModule, CampaignModule, AnnouncementModule, AgencyModule, RiskModule, MediaModule, KeywordModule, TicketModule, PaymentModule, TaxEventModule, TaskModule, FinancialModule, SettingsModule, ApiKeyModule],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
