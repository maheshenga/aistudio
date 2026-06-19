import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { RequirePermission } from '../common/rbac/require-permission.decorator';
import { GenerationJobService } from './generation-job.service';
import { CreateJobDto, UpdateStatusDto, ListJobQuery } from './dto';

@Controller('workspaces/:workspaceId/generation-jobs')
export class GenerationJobController {
  constructor(private svc: GenerationJobService) {}
  @Get() async list(@WorkspaceId() ws: string, @Query() q: ListJobQuery) { return { value: await this.svc.list(ws, q) }; }
  @Get(':id') async get(@WorkspaceId() ws: string, @Param('id') id: string) { return { value: await this.svc.get(ws, id) }; }
  @Post() @RequirePermission('generation.dispatch')
  async create(@WorkspaceId() ws: string, @Body() dto: CreateJobDto) { return { value: await this.svc.create(ws, dto) }; }
  @Patch(':id/status') @RequirePermission('generation.dispatch')
  async updateStatus(@WorkspaceId() ws: string, @Param('id') id: string, @Body() dto: UpdateStatusDto) { return { value: await this.svc.updateStatus(ws, id, dto) }; }
}
