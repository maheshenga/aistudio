import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { notFound } from '../common/errors';
import { CreateAssetDto, ListAssetQuery } from './dto';

@Injectable()
export class AssetService {
  constructor(private prisma: PrismaService) {}
  list(workspaceId: string, q: ListAssetQuery) {
    return this.prisma.asset.findMany({
      where: { workspaceId, ...(q.kind ? { kind: q.kind } : {}), ...(q.projectId ? { projectId: q.projectId } : {}), ...(q.jobId ? { jobId: q.jobId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
  async get(workspaceId: string, id: string) {
    const row = await this.prisma.asset.findFirst({ where: { id, workspaceId } });
    if (!row) throw notFound('Asset not found');
    return row;
  }
  async create(workspaceId: string, dto: CreateAssetDto) {
    if (dto.jobId) {
      const job = await this.prisma.generationJob.findFirst({ where: { id: dto.jobId, workspaceId } });
      if (!job) throw notFound('Referenced generation job not found in workspace');
    }
    return this.prisma.asset.create({ data: { ...dto, workspaceId } as Prisma.AssetUncheckedCreateInput });
  }
  async remove(workspaceId: string, id: string) {
    await this.get(workspaceId, id);
    await this.prisma.asset.delete({ where: { id } });
    return { id };
  }
}
