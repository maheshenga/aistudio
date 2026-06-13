import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { ProjectModule } from './project/project.module';
import { MemberModule } from './member/member.module';
import { GenerationJobModule } from './generation-job/generation-job.module';
import { AssetModule } from './asset/asset.module';
import { UsageEventModule } from './usage-event/usage-event.module';
import { TenantGuard } from './common/tenant/tenant.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [PrismaModule, WorkspaceModule, ProjectModule, MemberModule, GenerationJobModule, AssetModule, UsageEventModule],
  providers: [
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
