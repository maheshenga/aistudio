import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const UserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  return ctx.switchToHttp().getRequest().userId;
});
