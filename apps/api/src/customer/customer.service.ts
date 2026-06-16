import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceResourceService, PrismaResourceDelegate } from '../common/resource/workspace-resource.service';
import { CursorQuery } from '../common/resource/resource-query.dto';
import { ListCustomerQuery, CreateCustomerDto } from './dto';

@Injectable()
export class CustomerService extends WorkspaceResourceService<{ id: string }> {
  constructor(private prisma: PrismaService) { super(); }
  protected get delegate(): PrismaResourceDelegate { return this.prisma.customer as unknown as PrismaResourceDelegate; }
  protected entityName = 'Customer';

  protected buildWhere(workspaceId: string, query: CursorQuery): Record<string, unknown> {
    const q = query as ListCustomerQuery;
    return {
      workspaceId,
      ...(q.lifecycleStage ? { lifecycleStage: q.lifecycleStage } : {}),
      ...(q.channel ? { channel: q.channel } : {}),
    };
  }

  async createOrUpdateLead(workspaceId: string, dto: CreateCustomerDto): Promise<{ id: string }> {
    const existing = (await this.prisma.customer.findFirst({
      where: { workspaceId, name: dto.name, company: dto.company ?? null },
    })) as { id: string; tags: string[]; metadata: Record<string, unknown> | null } | null;

    const incomingTags = [...new Set([...(dto.tags ?? []), 'marketing_lead'])];

    if (!existing) {
      return this.create(workspaceId, {
        ...dto,
        lifecycleStage: dto.lifecycleStage ?? 'new_lead',
        tags: incomingTags,
      });
    }
    const mergedTags = [...new Set([...(existing.tags ?? []), ...incomingTags])];
    return this.update(workspaceId, existing.id, {
      ...dto,
      tags: mergedTags,
      metadata: { ...(existing.metadata ?? {}), ...(dto.metadata ?? {}) },
    });
  }
}
