import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data, ctx: ExecutionContext): { userId: string; role?: string } => {
    const req = ctx.switchToHttp().getRequest();
    return { userId: req.userId, role: req.member?.role };
  },
);
