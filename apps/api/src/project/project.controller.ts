import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { ProjectService } from './project.service';
import { CreateProjectDto, UpdateProjectDto, ListProjectQuery } from './dto';

@Controller('workspaces/:workspaceId/projects')
export class ProjectController {
  constructor(private svc: ProjectService) {}
  @Get() async list(@WorkspaceId() ws: string, @Query() q: ListProjectQuery) { return { value: await this.svc.list(ws, q) }; }
  @Get(':id') async get(@WorkspaceId() ws: string, @Param('id') id: string) { return { value: await this.svc.get(ws, id) }; }
  @Post() async create(@WorkspaceId() ws: string, @Body() dto: CreateProjectDto) { return { value: await this.svc.create(ws, dto) }; }
  @Patch(':id') async update(@WorkspaceId() ws: string, @Param('id') id: string, @Body() dto: UpdateProjectDto) { return { value: await this.svc.update(ws, id, dto) }; }
  @Delete(':id') async remove(@WorkspaceId() ws: string, @Param('id') id: string) { return { value: await this.svc.remove(ws, id) }; }
}
