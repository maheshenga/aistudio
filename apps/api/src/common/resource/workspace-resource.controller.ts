import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Type } from '@nestjs/common';
import { WorkspaceId } from '../tenant/workspace-id.decorator';
import { CursorQuery } from './resource-query.dto';
import { WorkspaceResourceService } from './workspace-resource.service';

export const RESOURCE_SERVICE = 'RESOURCE_SERVICE';

export interface ResourceControllerOptions {
  path: string; // 'workspaces/:workspaceId/customers'
  createDto: Type<unknown>;
  updateDto: Type<unknown>;
  listQuery?: Type<CursorQuery>;
}

export function createResourceController(opts: ResourceControllerOptions): Type<unknown> {
  const ListQ = opts.listQuery ?? CursorQuery;

  @Controller(opts.path)
  class ResourceController {
    constructor(@Inject(RESOURCE_SERVICE) public svc: WorkspaceResourceService<{ id: string }>) {}

    @Get() async list(@WorkspaceId() ws: string, @Query() q: CursorQuery) {
      return { value: await this.svc.list(ws, q) };
    }
    @Get(':id') async get(@WorkspaceId() ws: string, @Param('id') id: string) {
      return { value: await this.svc.get(ws, id) };
    }
    @Post() async create(@WorkspaceId() ws: string, @Body() dto: Record<string, unknown>) {
      return { value: await this.svc.create(ws, dto) };
    }
    @Patch(':id') async update(@WorkspaceId() ws: string, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
      return { value: await this.svc.update(ws, id, dto) };
    }
    @Delete(':id') async remove(@WorkspaceId() ws: string, @Param('id') id: string) {
      return { value: await this.svc.remove(ws, id) };
    }
  }

  const proto = ResourceController.prototype;
  Reflect.defineMetadata('design:paramtypes', [String, ListQ], proto, 'list');
  Reflect.defineMetadata('design:paramtypes', [String, opts.createDto], proto, 'create');
  Reflect.defineMetadata('design:paramtypes', [String, String, opts.updateDto], proto, 'update');
  return ResourceController;
}
