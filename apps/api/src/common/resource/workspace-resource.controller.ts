import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Type } from '@nestjs/common';
import { WorkspaceId } from '../tenant/workspace-id.decorator';
import { CursorQuery } from './resource-query.dto';
import { WorkspaceResourceService } from './workspace-resource.service';
import { RequirePermission } from '../rbac/require-permission.decorator';
import type { WorkspacePermission } from '../rbac/permissions';

export const RESOURCE_SERVICE = 'RESOURCE_SERVICE';

export interface ResourceControllerOptions {
  path: string; // 'workspaces/:workspaceId/customers'
  createDto: Type<unknown>;
  updateDto: Type<unknown>;
  listQuery?: Type<CursorQuery>;
  /**
   * 写接口（create/update/remove）所需的最小权限。
   * 未传时不挂 @RequirePermission（读接口默认任意成员可访问）。
   * 运营类资源传 'resources.write'；财务类传 'billing.manage'；
   * api-key/webhook 传 'api_keys.manage'；asset 传 'assets.manage'。
   */
  writePermission?: WorkspacePermission;
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
    @Post() @RequirePermissionIf(opts.writePermission)
    async create(@WorkspaceId() ws: string, @Body() dto: Record<string, unknown>) {
      return { value: await this.svc.create(ws, dto) };
    }
    @Patch(':id') @RequirePermissionIf(opts.writePermission)
    async update(@WorkspaceId() ws: string, @Param('id') id: string, @Body() dto: Record<string, unknown>) {
      return { value: await this.svc.update(ws, id, dto) };
    }
    @Delete(':id') @RequirePermissionIf(opts.writePermission)
    async remove(@WorkspaceId() ws: string, @Param('id') id: string) {
      return { value: await this.svc.remove(ws, id) };
    }
  }

  const proto = ResourceController.prototype;
  Reflect.defineMetadata('design:paramtypes', [String, ListQ], proto, 'list');
  Reflect.defineMetadata('design:paramtypes', [String, opts.createDto], proto, 'create');
  Reflect.defineMetadata('design:paramtypes', [String, String, opts.updateDto], proto, 'update');
  return ResourceController;
}

/**
 * 条件挂载 @RequirePermission 装饰器。
 * opts.writePermission 为空时为空操作（返回 no-op 装饰器）。
 */
function RequirePermissionIf(permission: WorkspacePermission | undefined): MethodDecorator {
  if (!permission) {
    return () => undefined;
  }
  return RequirePermission(permission);
}
