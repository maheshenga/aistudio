import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { notFound } from '../common/errors';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto';

@Injectable()
export class WorkspaceService {
  constructor(private prisma: PrismaService) {}
  async create(dto: CreateWorkspaceDto, userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({ data: dto });
      await tx.member.create({
        data: { workspaceId: workspace.id, userId, role: 'owner', name: user.name, email: user.email },
      });
      return workspace;
    });
  }
  async get(id: string) {
    const ws = await this.prisma.workspace.findUnique({ where: { id } });
    if (!ws) throw notFound('Workspace not found');
    return ws;
  }
  update(id: string, dto: UpdateWorkspaceDto) { return this.prisma.workspace.update({ where: { id }, data: dto }); }
}
