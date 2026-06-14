import type { AuthTokens } from '../../saas/authTokenStore';

function baseUrl(): string | undefined {
  try { return (import.meta as any).env?.VITE_DATA_API_URL || undefined; } catch { return undefined; }
}
async function post(path: string, body: unknown, accessToken?: string) {
  const url = `${baseUrl()!.replace(/\/+$/, '')}/auth/${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  return res;
}

export interface AuthUser { id: string; email: string; name: string; avatarLabel?: string | null; }
export interface ApiMembership { workspaceId: string; role: string; workspaceName: string; }

export async function apiRegister(email: string, password: string, name: string): Promise<AuthTokens & { user: AuthUser }> {
  const res = await post('register', { email, password, name });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message ?? 'register failed');
  return (await res.json()).value;
}
export async function apiLogin(email: string, password: string): Promise<AuthTokens & { user: AuthUser }> {
  const res = await post('login', { email, password, client: 'web' });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message ?? 'login failed');
  return (await res.json()).value;
}
export async function apiRefresh(refreshToken: string): Promise<AuthTokens | null> {
  const res = await post('refresh', { refreshToken });
  if (!res.ok) return null;
  return (await res.json()).value;
}
export async function apiLogout(accessToken: string, refreshToken: string): Promise<void> {
  await post('logout', { refreshToken }, accessToken).catch(() => undefined);
}
export async function apiMe(accessToken: string): Promise<{ user: AuthUser; memberships: ApiMembership[] }> {
  const url = `${baseUrl()!.replace(/\/+$/, '')}/auth/me`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error('me failed');
  return (await res.json()).value;
}
