import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateUsageDto, UsageRangeQuery } from './dto';

function range(q: UsageRangeQuery) {
  const createdAt: { gte?: Date; lte?: Date } = {};
  if (q.from) createdAt.gte = q.from;
  if (q.to) createdAt.lte = q.to;
  return Object.keys(createdAt).length ? { createdAt } : {};
}

@Injectable()
export class UsageEventService {
  constructor(private prisma: PrismaService) {}
  list(workspaceId: string, q: UsageRangeQuery) {
    return this.prisma.usageEvent.findMany({ where: { workspaceId, ...range(q) }, orderBy: { createdAt: 'desc' } });
  }
  create(workspaceId: string, dto: CreateUsageDto) {
    return this.prisma.usageEvent.create({ data: { ...dto, workspaceId } as Prisma.UsageEventUncheckedCreateInput });
  }
  async summary(workspaceId: string, q: UsageRangeQuery) {
    const agg = await this.prisma.usageEvent.aggregate({ where: { workspaceId, ...range(q) }, _sum: { credits: true } });
    return { totalCredits: agg._sum.credits ?? 0 };
  }
}
