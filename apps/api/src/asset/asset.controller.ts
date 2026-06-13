import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { AssetService } from './asset.service';
import { CreateAssetDto, ListAssetQuery } from './dto';

@Controller('workspaces/:workspaceId/assets')
export class AssetController {
  constructor(private svc: AssetService) {}
  @Get() async list(@WorkspaceId() ws: string, @Query() q: ListAssetQuery) { return { value: await this.svc.list(ws, q) }; }
  @Get(':id') async get(@WorkspaceId() ws: string, @Param('id') id: string) { return { value: await this.svc.get(ws, id) }; }
  @Post() async create(@WorkspaceId() ws: string, @Body() dto: CreateAssetDto) { return { value: await this.svc.create(ws, dto) }; }
  @Delete(':id') async remove(@WorkspaceId() ws: string, @Param('id') id: string) { return { value: await this.svc.remove(ws, id) }; }
}
