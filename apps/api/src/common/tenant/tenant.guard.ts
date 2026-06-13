import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC } from './public.decorator';
import { notFound } from '../errors';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    const req = ctx.switchToHttp().getRequest();
    const workspaceId = req.params?.workspaceId;
    if (!workspaceId) return true; // 非 workspace 范围路由（如 POST /workspaces 已标 @Public）
    const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws) throw notFound('Workspace not found');
    req.workspaceId = workspaceId; // 注入已校验值
    // ②认证落地后：在此校验 Member(workspaceId, req.userId) 是否存在，否则抛 permission_denied
    return true;
  }
}
