import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export type AvatarConsentType = 'voice_clone' | 'face_clone' | 'commercial_use' | 'minor_protection';

export interface WorkspaceAvatarConsent {
  id: string;
  workspaceId: string;
  subjectName: string;
  consentType: AvatarConsentType;
  status: 'granted' | 'revoked' | 'expired';
  source: string;
  ownerId?: string;
  expiresAt?: number;
  grantedAt: number;
  revokedAt?: number;
  metadata: Record<string, unknown>;
}

export interface WorkspaceAvatarSource {
  id: string;
  workspaceId: string;
  consentId: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  assetId?: string;
  ownerId?: string;
  createdAt: number;
  metadata: Record<string, unknown>;
}

export interface AvatarRepositoryContext {
  workspaceId: string;
  userId?: string;
  storage?: StorageLike | null;
  now?: number;
}

export const AVATAR_CONSENT_PREFIX = 'aistudio_workspace_avatar_consents';
export const AVATAR_SOURCE_PREFIX = 'aistudio_workspace_avatar_sources';

function key(prefix: string, ctx: AvatarRepositoryContext): string { return `${prefix}:${ctx.workspaceId}`; }
function readT<T>(prefix: string, ctx: AvatarRepositoryContext): T[] {
  const s = getRepositoryStorage(ctx.storage); const raw = s?.getItem(key(prefix, ctx));
  if (!raw) return []; try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}
function writeT<T>(prefix: string, items: T[], ctx: AvatarRepositoryContext): T[] {
  const s = getRepositoryStorage(ctx.storage); s?.setItem(key(prefix, ctx), JSON.stringify(items));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('workspace_avatar_updated', { detail: { workspaceId: ctx.workspaceId } }));
  return items;
}
const nowFn = (ctx: AvatarRepositoryContext) => ctx.now ?? Date.now();
const rid = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function loadWorkspaceAvatarConsents(ctx: AvatarRepositoryContext): WorkspaceAvatarConsent[] { return readT<WorkspaceAvatarConsent>(AVATAR_CONSENT_PREFIX, ctx); }
export function createWorkspaceAvatarConsent(input: Omit<WorkspaceAvatarConsent, 'id' | 'workspaceId' | 'grantedAt'>, ctx: AvatarRepositoryContext): WorkspaceAvatarConsent {
  const c = { ...input, id: rid('consent'), workspaceId: ctx.workspaceId, grantedAt: nowFn(ctx) };
  writeT(AVATAR_CONSENT_PREFIX, [c, ...loadWorkspaceAvatarConsents(ctx)], ctx); return c;
}
export function revokeWorkspaceAvatarConsent(id: string, ctx: AvatarRepositoryContext): WorkspaceAvatarConsent | null {
  let u: WorkspaceAvatarConsent | null = null;
  const items = loadWorkspaceAvatarConsents(ctx).map(c => c.id === id ? (u = { ...c, status: 'revoked' as const, revokedAt: nowFn(ctx) }) : c);
  writeT(AVATAR_CONSENT_PREFIX, items, ctx); return u;
}
export function hasValidAvatarConsent(subjectName: string, consentType: AvatarConsentType, ctx: AvatarRepositoryContext): boolean {
  const now = nowFn(ctx);
  return loadWorkspaceAvatarConsents(ctx).some(c =>
    c.subjectName === subjectName && c.consentType === consentType && c.status === 'granted' &&
    (!c.expiresAt || c.expiresAt > now)
  );
}

export function loadWorkspaceAvatarSources(ctx: AvatarRepositoryContext): WorkspaceAvatarSource[] { return readT<WorkspaceAvatarSource>(AVATAR_SOURCE_PREFIX, ctx); }
export function createWorkspaceAvatarSource(input: Omit<WorkspaceAvatarSource, 'id' | 'workspaceId' | 'createdAt'>, ctx: AvatarRepositoryContext): WorkspaceAvatarSource {
  const s = { ...input, id: rid('avsrc'), workspaceId: ctx.workspaceId, createdAt: nowFn(ctx) };
  writeT(AVATAR_SOURCE_PREFIX, [s, ...loadWorkspaceAvatarSources(ctx)], ctx); return s;
}
