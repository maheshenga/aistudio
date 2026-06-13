import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { UsageEventService } from './usage-event.service';
import { CreateUsageDto, UsageRangeQuery } from './dto';

@Controller('workspaces/:workspaceId/usage-events')
export class UsageEventController {
  constructor(private svc: UsageEventService) {}
  @Get() async list(@WorkspaceId() ws: string, @Query() q: UsageRangeQuery) { return { value: await this.svc.list(ws, q) }; }
  @Get('summary') async summary(@WorkspaceId() ws: string, @Query() q: UsageRangeQuery) { return { value: await this.svc.summary(ws, q) }; }
  @Post() async create(@WorkspaceId() ws: string, @Body() dto: CreateUsageDto) { return { value: await this.svc.create(ws, dto) }; }
}
