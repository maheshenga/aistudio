import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { notFound, validationError } from '../common/errors';
import { CreateJobDto, UpdateStatusDto, ListJobQuery } from './dto';

const ALLOWED: Record<string, string[]> = {
  pending: ['running', 'failed'],
  running: ['succeeded', 'failed'],
  succeeded: [],
  failed: [],
};

@Injectable()
export class GenerationJobService {
  constructor(private prisma: PrismaService) {}
  list(workspaceId: string, q: ListJobQuery) {
    return this.prisma.generationJob.findMany({
      where: { workspaceId, ...(q.status ? { status: q.status } : {}), ...(q.projectId ? { projectId: q.projectId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
  async get(workspaceId: string, id: string) {
    const row = await this.prisma.generationJob.findFirst({ where: { id, workspaceId } });
    if (!row) throw notFound('Generation job not found');
    return row;
  }
  create(workspaceId: string, dto: CreateJobDto) {
    return this.prisma.generationJob.create({ data: { ...dto, workspaceId } as Prisma.GenerationJobUncheckedCreateInput });
  }
  async updateStatus(workspaceId: string, id: string, dto: UpdateStatusDto) {
    const job = await this.get(workspaceId, id);
    if (!ALLOWED[job.status]?.includes(dto.status))
      throw validationError(`Cannot transition from ${job.status} to ${dto.status}`);
    return this.prisma.generationJob.update({ where: { id }, data: { status: dto.status, error: dto.error ?? null } });
  }
}
