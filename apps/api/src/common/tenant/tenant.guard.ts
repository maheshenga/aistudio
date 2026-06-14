import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC } from './public.decorator';
import { notFound, permissionDenied } from '../errors';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    const req = ctx.switchToHttp().getRequest();
    const workspaceId = req.params?.workspaceId;
    if (!workspaceId) return true;
    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws) throw notFound('Workspace not found');
    const member = await this.prisma.member.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.userId } },
    });
    if (!member) throw permissionDenied('Not a member of this workspace');
    req.workspaceId = workspaceId;
    req.member = { id: member.id, role: member.role };
    return true;
  }
}
