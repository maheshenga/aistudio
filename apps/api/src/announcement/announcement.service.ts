import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { ListAnnouncementQuery } from './dto';

@Injectable()
export class AnnouncementService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.announcement as unknown as PrismaResourceDelegate; }
  protected entityName = 'Announcement';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListAnnouncementQuery;
    return { workspaceId, ...(q.status ? { status: q.status } : {}) };
  }
}
