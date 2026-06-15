import { Body, Controller, Param, Post } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { OrchestrationService } from './orchestration.service';
import { DispatchDto, LinkExternalDto } from './dto';

@Controller('workspaces/:workspaceId/orchestration')
export class OrchestrationController {
  constructor(private svc: OrchestrationService) {}

  @Post('dispatch')
  async dispatch(@WorkspaceId() ws: string, @Body() dto: DispatchDto, @CurrentUser() user: { userId: string; role?: string }) {
    return { value: { job: await this.svc.dispatch(ws, dto, user) } };
  }

  @Post('jobs/:jobId/link-external')
  async link(@WorkspaceId() ws: string, @Param('jobId') jobId: string, @Body() dto: LinkExternalDto, @CurrentUser() user: { userId: string; role?: string }) {
    return { value: { job: await this.svc.linkExternal(ws, jobId, dto, user) } };
  }

  @Post('jobs/:jobId/cancel')
  async cancel(@WorkspaceId() ws: string, @Param('jobId') jobId: string, @CurrentUser() user: { userId: string; role?: string }) {
    return { value: { job: await this.svc.cancel(ws, jobId, user) } };
  }

  @Post('jobs/:jobId/retry')
  async retry(@WorkspaceId() ws: string, @Param('jobId') jobId: string, @CurrentUser() user: { userId: string; role?: string }) {
    return { value: { job: await this.svc.retry(ws, jobId, user) } };
  }
}
