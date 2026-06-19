import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { notFound, validationError } from '../common/errors';
import { CreateJobDto, UpdateStatusDto, ListJobQuery } from './dto';

const ALLOWED: Record<string, string[]> = {
  pending: ['running', 'failed', 'cancelled'],
  running: ['succeeded', 'failed', 'cancelled'],
  succeeded: [],
  failed: [],
  cancelled: [],
};

const TERMINAL = new Set(['succeeded', 'failed', 'cancelled']);

@Injectable()
export class GenerationJobService {
  constructor(private prisma: PrismaService) {}
  list(workspaceId: string, q: ListJobQuery) {
    return this.prisma.generationJob.findMany({
      where: {
        workspaceId,
        ...(q.status ? { status: q.status } : {}),
        ...(q.projectId ? { projectId: q.projectId } : {}),
        ...(q.moduleId ? { moduleId: q.moduleId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async get(workspaceId: string, id: string) {
    const row = await this.prisma.generationJob.findFirst({ where: { id, workspaceId } });
    if (!row) throw notFound('Generation job not found');
    return row;
  }
  create(workspaceId: string, dto: CreateJobDto) {
    // Map frontend runtimeTaskId → backend externalTaskId
    const { runtimeTaskId, input, metadata, ...rest } = dto;
    const data: Prisma.GenerationJobUncheckedCreateInput = {
      ...rest,
      workspaceId,
      ...(input ? { input: input as Prisma.InputJsonValue } : {}),
      ...(metadata ? { externalRef: metadata as Prisma.InputJsonValue } : {}),
      ...(runtimeTaskId ? { externalTaskId: runtimeTaskId } : {}),
    };
    return this.prisma.generationJob.create({ data });
  }
  async updateStatus(workspaceId: string, id: string, dto: UpdateStatusDto) {
    const job = await this.get(workspaceId, id);
    if (!ALLOWED[job.status]?.includes(dto.status))
      throw validationError(`Cannot transition from ${job.status} to ${dto.status}`);
    const finishedAt = TERMINAL.has(dto.status) ? new Date() : undefined;
    return this.prisma.generationJob.update({
      where: { id },
      data: {
        status: dto.status,
        error: dto.error ?? null,
        ...(dto.progress !== undefined ? { progress: dto.progress } : {}),
        ...(finishedAt ? { finishedAt } : {}),
      },
    });
  }
}
