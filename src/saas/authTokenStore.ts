import type { StorageLike } from './localAuthSession';

const REFRESH_KEY = 'aistudio_auth_refresh_token';

export interface AuthTokens { accessToken: string; refreshToken: string; }

export interface AuthTokenStore {
  getAccess(): string | null;
  getRefresh(): string | null;
  set(tokens: AuthTokens): void;
  clear(): void;
}

export function authTokenStore(storage?: StorageLike | null): AuthTokenStore {
  let accessToken: string | null = null;
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null);
  return {
    getAccess: () => accessToken,
    getRefresh: () => store?.getItem(REFRESH_KEY) ?? null,
    set: ({ accessToken: a, refreshToken: r }) => { accessToken = a; store?.setItem(REFRESH_KEY, r); },
    clear: () => { accessToken = null; store?.removeItem(REFRESH_KEY); },
  };
}

export const appAuthTokens = authTokenStore();
