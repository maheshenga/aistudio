import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { notFound } from '../common/errors';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto';

@Injectable()
export class WorkspaceService {
  constructor(private prisma: PrismaService) {}
  create(dto: CreateWorkspaceDto) { return this.prisma.workspace.create({ data: dto }); }
  async get(id: string) {
    const ws = await this.prisma.workspace.findUnique({ where: { id } });
    if (!ws) throw notFound('Workspace not found');
    return ws;
  }
  update(id: string, dto: UpdateWorkspaceDto) { return this.prisma.workspace.update({ where: { id }, data: dto }); }
}
