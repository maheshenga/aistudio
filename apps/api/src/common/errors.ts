export type ErrorCode =
  | 'backend_unconfigured' | 'network_error' | 'permission_denied'
  | 'parse_error' | 'validation_error' | 'not_found' | 'conflict'
  | 'unauthenticated' | 'unknown_error';

export class DomainError extends Error {
  constructor(public code: ErrorCode, message: string, public status: number) { super(message); }
}
export const notFound = (m = 'Resource not found') => new DomainError('not_found', m, 404);
export const validationError = (m: string) => new DomainError('validation_error', m, 400);
export const conflict = (m: string) => new DomainError('conflict', m, 409);
export const unauthenticated = (m = 'Authentication required') => new DomainError('unauthenticated', m, 401);
export const permissionDenied = (m = 'Permission denied') => new DomainError('permission_denied', m, 403);
