import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { permissionDenied } from '../common/errors';

const WRITE_ROLES = new Set(['owner', 'admin']);
const WORKSPACE_OWNER = 'workspace';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  resolveOwnerId(
    currentUserId: string,
    role: string | undefined,
    ownerIdParam: string | undefined,
    isWrite: boolean,
  ): string {
    const ownerId = ownerIdParam ?? currentUserId;
    if (ownerId !== currentUserId && ownerId !== WORKSPACE_OWNER) {
      throw permissionDenied('Cannot access settings of another user');
    }
    if (isWrite && ownerId === WORKSPACE_OWNER && (!role || !WRITE_ROLES.has(role))) {
      throw permissionDenied('Only owner/admin can write workspace-level settings');
    }
    return ownerId;
  }

  async getAll(workspaceId: string, ownerId: string): Promise<Record<string, unknown>> {
    const rows = await this.prisma.setting.findMany({ where: { workspaceId, ownerId } });
    return rows.reduce<Record<string, unknown>>((acc, row) => {
      acc[row.key] = row.value === null ? null : row.value;
      return acc;
    }, {});
  }

  async putPatch(
    workspaceId: string,
    ownerId: string,
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const entries = Object.entries(patch);
    await this.prisma.$transaction(
      entries.map(([key, value]) => {
        const jsonValue = (value === null ? Prisma.JsonNull : value) as
          | Prisma.InputJsonValue
          | typeof Prisma.JsonNull;
        return this.prisma.setting.upsert({
          where: { workspaceId_ownerId_key: { workspaceId, ownerId, key } },
          create: { workspaceId, ownerId, key, value: jsonValue },
          update: { value: jsonValue },
        });
      }),
    );
    return this.getAll(workspaceId, ownerId);
  }

  async deleteKey(
    workspaceId: string,
    ownerId: string,
    key: string,
  ): Promise<Record<string, unknown>> {
    await this.prisma.setting.deleteMany({ where: { workspaceId, ownerId, key } });
    return this.getAll(workspaceId, ownerId);
  }
}
