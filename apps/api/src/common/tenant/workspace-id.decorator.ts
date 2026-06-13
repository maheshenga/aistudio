import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const WorkspaceId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  return ctx.switchToHttp().getRequest().workspaceId;
});
