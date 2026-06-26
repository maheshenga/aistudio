import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { WebhookModule } from './webhook/webhook.module';
import { HealthModule } from './health/health.module';
import { TenantGuard } from './common/tenant/tenant.guard';
import { AuthGuard } from './common/auth/auth.guard';
import { RolesGuard } from './common/rbac/roles.guard';
import { RbacModule } from './common/rbac/rbac.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import {
  AppThrottlerGuard,
  DEFAULT_THROTTLE_LIMIT,
  DEFAULT_THROTTLE_TTL_MS,
} from './common/throttle/app-throttler.guard';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      name: 'default',
      ttl: DEFAULT_THROTTLE_TTL_MS,
      limit: DEFAULT_THROTTLE_LIMIT,
    }]),
    PrismaModule, EncryptionModule, RbacModule, HealthModule, AuthModule, WorkspaceModule, ProjectModule, MemberModule, GenerationJobModule, AssetModule, UsageEventModule, AuditLogModule, OrchestrationModule, BillingModule, CustomerModule, CampaignModule, AnnouncementModule, AgencyModule, RiskModule, MediaModule, KeywordModule, TicketModule, PaymentModule, TaxEventModule, TaskModule, FinancialModule, SettingsModule, ApiKeyModule, WebhookModule],
  providers: [
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    // 执行顺序：ThrottlerGuard(429) → AuthGuard(401) → TenantGuard(403) → RolesGuard(403)
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
