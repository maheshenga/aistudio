import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { notFound } from '../common/errors';
import { CreateProjectDto, UpdateProjectDto, ListProjectQuery } from './dto';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}
  list(workspaceId: string, q: ListProjectQuery) {
    return this.prisma.project.findMany({
      where: { workspaceId, ...(q.status ? { status: q.status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
  async get(workspaceId: string, id: string) {
    const row = await this.prisma.project.findFirst({ where: { id, workspaceId } });
    if (!row) throw notFound('Project not found');
    return row;
  }
  create(workspaceId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({ data: { ...dto, workspaceId } as Prisma.ProjectUncheckedCreateInput });
  }
  async update(workspaceId: string, id: string, dto: UpdateProjectDto) {
    await this.get(workspaceId, id);
    return this.prisma.project.update({ where: { id }, data: dto as Prisma.ProjectUncheckedUpdateInput });
  }
  async remove(workspaceId: string, id: string) {
    await this.get(workspaceId, id);
    await this.prisma.project.delete({ where: { id } });
    return { id };
  }
}
