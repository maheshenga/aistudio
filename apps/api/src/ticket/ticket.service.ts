import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { ListTicketQuery } from './dto';

@Injectable()
export class TicketService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.ticket as unknown as PrismaResourceDelegate; }
  protected entityName = 'Ticket';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListTicketQuery;
    return { workspaceId, ...(q.status ? { status: q.status } : {}) };
  }
}
