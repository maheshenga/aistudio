import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { ListAgencyPartnerQuery } from './dto';

@Injectable()
export class AgencyService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.agencyPartner as unknown as PrismaResourceDelegate; }
  protected entityName = 'AgencyPartner';
  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListAgencyPartnerQuery;
    return { workspaceId, ...(q.payoutStatus ? { payoutStatus: q.payoutStatus } : {}) };
  }
}
