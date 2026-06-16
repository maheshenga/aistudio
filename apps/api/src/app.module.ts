import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
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
import { TenantGuard } from './common/tenant/tenant.guard';
import { AuthGuard } from './common/auth/auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, AuthModule, WorkspaceModule, ProjectModule, MemberModule, GenerationJobModule, AssetModule, UsageEventModule, AuditLogModule, OrchestrationModule, BillingModule, CustomerModule, CampaignModule, AnnouncementModule, AgencyModule],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
