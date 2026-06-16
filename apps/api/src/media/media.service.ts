import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { ListMediaAccountQuery } from './dto';

@Injectable()
export class MediaService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.mediaAccount as unknown as PrismaResourceDelegate; }
  protected entityName = 'MediaAccount';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListMediaAccountQuery;
    return { workspaceId, ...(q.status ? { status: q.status } : {}) };
  }
}
