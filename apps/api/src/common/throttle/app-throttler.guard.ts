import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

export const DEFAULT_THROTTLE_TTL_MS = Number(process.env.THROTTLE_TTL_MS ?? 60_000);
export const DEFAULT_THROTTLE_LIMIT = Number(process.env.THROTTLE_LIMIT ?? 120);

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected errorMessage = 'Rate limit exceeded';

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ url?: string }>();
    const path = req.url?.split('?')[0] ?? '';
    if (path.startsWith('/auth/')) return true;
    return super.shouldSkip(context);
  }
}
