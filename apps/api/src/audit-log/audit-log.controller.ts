import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { RequirePermission } from '../common/rbac/require-permission.decorator';
import { AuditLogService } from './audit-log.service';
import { CreateAuditDto, AuditQuery } from './dto';

@Controller('workspaces/:workspaceId/audit-logs')
export class AuditLogController {
  constructor(private svc: AuditLogService) {}
  @Get() async list(@WorkspaceId() ws: string, @Query() q: AuditQuery) { return { value: await this.svc.list(ws, q) }; }
  @Post() @RequirePermission('resources.write')
  async create(@WorkspaceId() ws: string, @Body() dto: CreateAuditDto) { return { value: await this.svc.create(ws, dto) }; }
}
