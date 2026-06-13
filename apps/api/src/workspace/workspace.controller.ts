import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Public } from '../common/tenant/public.decorator';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto';

@Controller('workspaces')
export class WorkspaceController {
  constructor(private svc: WorkspaceService) {}
  @Public() @Post()
  async create(@Body() dto: CreateWorkspaceDto) { return { value: await this.svc.create(dto) }; }
  @Get(':workspaceId')
  async get(@WorkspaceId() id: string) { return { value: await this.svc.get(id) }; }
  @Patch(':workspaceId')
  async update(@WorkspaceId() id: string, @Body() dto: UpdateWorkspaceDto) { return { value: await this.svc.update(id, dto) }; }
}
