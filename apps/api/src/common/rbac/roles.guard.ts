import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC } from '../tenant/public.decorator';
import { REQUIRED_PERMISSION_KEY } from './require-permission.decorator';
import { hasPermission } from './permissions';
import { permissionDenied } from '../errors';

/**
 * 第三层 Guard：成员身份已由 TenantGuard 确认并注入 `req.member = { id, role }`。
 *
 * - 未标注 `@RequirePermission` 的接口直接放行（读接口默认任意成员可访问）。
 * - 标注的接口取 `req.member.role` 调 `hasPermission` 判断，失败抛 `permissionDenied()`(403)。
 *
 * 全局注册顺序必须在 TenantGuard 之后（见 app.module.ts 的 APP_GUARD 序列）。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<string>(REQUIRED_PERMISSION_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required) return true;

    const req = ctx.switchToHttp().getRequest();
    const role: string | undefined = req.member?.role;
    if (!role) throw permissionDenied('Member context missing');

    if (!hasPermission(role, required)) {
      throw permissionDenied(`Requires permission: ${required}`);
    }
    return true;
  }
}
