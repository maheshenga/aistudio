import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { rateLimited } from '../common/errors';

const buckets = new Map<string, number[]>();

function clientKey(req: { ip?: string; ips?: string[] }): string {
  return req.ip ?? req.ips?.[0] ?? 'unknown';
}

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ url?: string; ip?: string; ips?: string[] }>();
    const path = req.url?.split('?')[0] ?? '';
    if (!['/auth/login', '/auth/register', '/auth/refresh'].includes(path)) return true;

    const limit = Number(process.env.THROTTLE_AUTH_LIMIT ?? 10);
    const windowMs = Number(process.env.THROTTLE_AUTH_TTL_MS ?? 60_000);
    const now = Date.now();
    const key = clientKey(req);
    const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

    if (timestamps.length >= limit) {
      const retryAfterMs = Math.max(1_000, windowMs - (now - timestamps[0]!));
      throw rateLimited(retryAfterMs);
    }

    timestamps.push(now);
    buckets.set(key, timestamps);
    return true;
  }
}

export function resetAuthRateLimitBucketsForTest(): void {
  buckets.clear();
}
