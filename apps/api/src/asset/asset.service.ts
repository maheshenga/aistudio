import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { notFound } from '../common/errors';
import { WebhookDeliveryService } from '../webhook/webhook-delivery.service';
import { CreateAssetDto, UpdateAssetDto, ListAssetQuery } from './dto';

@Injectable()
export class AssetService {
  constructor(
    private prisma: PrismaService,
    private webhooks: WebhookDeliveryService,
  ) {}
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
    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({ data: { ...dto, workspaceId } as Prisma.AssetUncheckedCreateInput });
      await this.webhooks.enqueueForAssetCreated(tx, asset);
      return asset;
    });
  }
  async update(workspaceId: string, id: string, dto: UpdateAssetDto) {
    await this.get(workspaceId, id);
    return this.prisma.asset.update({ where: { id }, data: dto as Prisma.AssetUncheckedUpdateInput });
  }
  async remove(workspaceId: string, id: string) {
    await this.get(workspaceId, id);
    await this.prisma.asset.delete({ where: { id } });
    return { id };
  }
}
