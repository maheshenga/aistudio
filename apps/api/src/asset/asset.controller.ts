import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { RequirePermission } from '../common/rbac/require-permission.decorator';
import { AssetService } from './asset.service';
import { CreateAssetDto, UpdateAssetDto, ListAssetQuery } from './dto';

@Controller('workspaces/:workspaceId/assets')
export class AssetController {
  constructor(private svc: AssetService) {}
  @Get() async list(@WorkspaceId() ws: string, @Query() q: ListAssetQuery) { return { value: await this.svc.list(ws, q) }; }
  @Get(':id') async get(@WorkspaceId() ws: string, @Param('id') id: string) { return { value: await this.svc.get(ws, id) }; }
  @Post() @RequirePermission('assets.manage')
  async create(@WorkspaceId() ws: string, @Body() dto: CreateAssetDto) { return { value: await this.svc.create(ws, dto) }; }
  @Patch(':id') @RequirePermission('assets.manage')
  async update(@WorkspaceId() ws: string, @Param('id') id: string, @Body() dto: UpdateAssetDto) { return { value: await this.svc.update(ws, id, dto) }; }
  @Delete(':id') @RequirePermission('assets.manage')
  async remove(@WorkspaceId() ws: string, @Param('id') id: string) { return { value: await this.svc.remove(ws, id) }; }
}
