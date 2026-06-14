import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC } from '../tenant/public.decorator';
import { TokenService } from '../../auth/token.service';
import { unauthenticated } from '../errors';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector, private tokens: TokenService) {}
  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    if (!header?.startsWith('Bearer ')) throw unauthenticated('Missing bearer token');
    try {
      req.userId = this.tokens.verifyAccess(header.slice(7));
    } catch {
      throw unauthenticated('Invalid or expired token');
    }
    return true;
  }
}
