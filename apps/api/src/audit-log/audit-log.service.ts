import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateAuditDto, AuditQuery } from './dto';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}
  list(workspaceId: string, q: AuditQuery) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (q.from) createdAt.gte = q.from;
    if (q.to) createdAt.lte = q.to;
    return this.prisma.auditLog.findMany({
      where: { workspaceId, ...(q.action ? { action: q.action } : {}), ...(Object.keys(createdAt).length ? { createdAt } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
  create(workspaceId: string, dto: CreateAuditDto) {
    return this.prisma.auditLog.create({ data: { ...dto, workspaceId } as Prisma.AuditLogUncheckedCreateInput });
  }
}
