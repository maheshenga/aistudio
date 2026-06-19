import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { WorkspaceId } from '../common/tenant/workspace-id.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequirePermission } from '../common/rbac/require-permission.decorator';
import { SettingsService } from './settings.service';
import { OwnerQuery, PutSettingsDto } from './dto';

@Controller('workspaces/:workspaceId/settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get()
  async getAll(
    @WorkspaceId() ws: string,
    @Query() q: OwnerQuery,
    @CurrentUser() user: { userId: string; role?: string },
  ) {
    const ownerId = this.settings.resolveOwnerId(user.userId, user.role, q.ownerId, false);
    return { value: await this.settings.getAll(ws, ownerId) };
  }

  @Patch() @RequirePermission('settings.manage')
  async put(
    @WorkspaceId() ws: string,
    @Query() q: OwnerQuery,
    @Body() dto: PutSettingsDto,
    @CurrentUser() user: { userId: string; role?: string },
  ) {
    const ownerId = this.settings.resolveOwnerId(user.userId, user.role, q.ownerId, true);
    return { value: await this.settings.putPatch(ws, ownerId, dto.patch) };
  }

  @Delete(':key') @RequirePermission('settings.manage')
  async remove(
    @WorkspaceId() ws: string,
    @Param('key') key: string,
    @Query() q: OwnerQuery,
    @CurrentUser() user: { userId: string; role?: string },
  ) {
    const ownerId = this.settings.resolveOwnerId(user.userId, user.role, q.ownerId, true);
    return { value: await this.settings.deleteKey(ws, ownerId, key) };
  }
}
