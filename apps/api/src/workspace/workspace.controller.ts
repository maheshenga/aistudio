import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { UserId } from '../common/tenant/user-id.decorator';
import { RequirePermission } from '../common/rbac/require-permission.decorator';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto';

@Controller('workspaces')
export class WorkspaceController {
  constructor(private svc: WorkspaceService) {}
  @Post()
  async create(@Body() dto: CreateWorkspaceDto, @UserId() userId: string) { return { value: await this.svc.create(dto, userId) }; }
  @Get(':workspaceId')
  async get(@WorkspaceId() id: string) { return { value: await this.svc.get(id) }; }
  @Patch(':workspaceId') @RequirePermission('workspace.manage')
  async update(@WorkspaceId() id: string, @Body() dto: UpdateWorkspaceDto) { return { value: await this.svc.update(id, dto) }; }
}
