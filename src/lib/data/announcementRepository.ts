import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';

export type WorkspaceAnnouncementStatus = 'draft' | 'active' | 'scheduled' | 'archived';

export interface WorkspaceAnnouncement {
  id: string;
  workspaceId: string;
  title: string;
  channel: string;
  status: WorkspaceAnnouncementStatus;
  publishedAt: number;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface WorkspaceAnnouncementInput {
  title: string;
  channel: string;
  status?: string;
  publishedAt?: number;
  metadata?: Record<string, unknown>;
}

export interface AnnouncementRepositoryContext {
  workspaceId: string;
  storage?: StorageLike | null;
  now?: number;
}

export const ANNOUNCEMENT_STORAGE_PREFIX = 'aistudio_workspace_announcements';

const ANNOUNCEMENT_STATUSES: readonly WorkspaceAnnouncementStatus[] = ['draft', 'active', 'scheduled', 'archived'];

function announcementStorageKey(context: AnnouncementRepositoryContext): string {
  return `${ANNOUNCEMENT_STORAGE_PREFIX}:${context.workspaceId}`;
}

function isAnnouncementStatus(value: unknown): value is WorkspaceAnnouncementStatus {
  return typeof value === 'string' && ANNOUNCEMENT_STATUSES.includes(value as WorkspaceAnnouncementStatus);
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = typeof value === 'string' && !/^\d+$/.test(value.trim())
    ? Date.parse(value)
    : Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}

function normalizeAnnouncement(
  announcement: Partial<WorkspaceAnnouncement>,
  context: AnnouncementRepositoryContext,
): WorkspaceAnnouncement {
  const now = context.now ?? Date.now();
  const status = isAnnouncementStatus(announcement.status) ? announcement.status : 'draft';
  return {
    id: normalizeText(announcement.id, `announcement_${now}_${Math.random().toString(36).slice(2, 8)}`),
    workspaceId: context.workspaceId,
    title: normalizeText(announcement.title, 'Untitled announcement'),
    channel: normalizeText(announcement.channel, 'in-app'),
    status,
    publishedAt: normalizeTimestamp(announcement.publishedAt, status === 'draft' ? 0 : now),
    createdAt: normalizeTimestamp(announcement.createdAt, now),
    updatedAt: normalizeTimestamp(announcement.updatedAt, now),
    metadata: announcement.metadata && typeof announcement.metadata === 'object' && !Array.isArray(announcement.metadata)
      ? announcement.metadata
      : {},
  };
}

function sortAnnouncements(announcements: WorkspaceAnnouncement[]): WorkspaceAnnouncement[] {
  return announcements.slice().sort((a, b) => b.publishedAt - a.publishedAt || b.updatedAt - a.updatedAt);
}

function readAnnouncements(context: AnnouncementRepositoryContext): WorkspaceAnnouncement[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(announcementStorageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortAnnouncements(parsed.map((announcement) => normalizeAnnouncement(announcement as Partial<WorkspaceAnnouncement>, context)));
  } catch {
    return [];
  }
}

function writeAnnouncements(
  announcements: WorkspaceAnnouncement[],
  context: AnnouncementRepositoryContext,
): WorkspaceAnnouncement[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = sortAnnouncements(announcements.map((announcement) => normalizeAnnouncement(announcement, context)));
  storage?.setItem(announcementStorageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('workspace_announcements_updated', { detail: { workspaceId: context.workspaceId } }));
  }
  return normalized;
}

export function loadWorkspaceAnnouncements(context: AnnouncementRepositoryContext): WorkspaceAnnouncement[] {
  if (announcementApiClient.configured) return announcementCache.get(context.workspaceId) ?? [];
  return readAnnouncements(context);
}

export function createWorkspaceAnnouncement(
  input: WorkspaceAnnouncementInput,
  context: AnnouncementRepositoryContext,
): WorkspaceAnnouncement {
  const now = context.now ?? Date.now();
  const status = isAnnouncementStatus(input.status) ? input.status : 'active';
  const announcement = normalizeAnnouncement(
    {
      id: `announcement_${now}_${Math.random().toString(36).slice(2, 8)}`,
      title: input.title,
      channel: input.channel,
      status,
      publishedAt: input.publishedAt ?? (status === 'draft' ? 0 : now),
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    },
    context,
  );

  writeAnnouncements([announcement, ...readAnnouncements(context)], context);
  if (announcementApiClient.configured) {
    announcementCache.set(context.workspaceId, sortAnnouncements([announcement, ...(announcementCache.get(context.workspaceId) ?? [])]));
    void announcementApiClient.post(context.workspaceId, 'announcements', {
      id: announcement.id, title: announcement.title, channel: announcement.channel, status: announcement.status,
      publishedAt: announcement.publishedAt > 0 ? new Date(announcement.publishedAt).toISOString() : undefined,
      metadata: announcement.metadata,
    }).then((r) => { if (!r.ok) console.error('createWorkspaceAnnouncement write-through failed', r); })
      .catch((e) => console.error('createWorkspaceAnnouncement write-through failed', e));
  }
  return announcement;
}

export function updateWorkspaceAnnouncement(
  announcementId: string,
  patch: Partial<Omit<WorkspaceAnnouncement, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>,
  context: AnnouncementRepositoryContext,
): WorkspaceAnnouncement | null {
  const now = context.now ?? Date.now();
  let updatedAnnouncement: WorkspaceAnnouncement | null = null;
  const updatedAnnouncements = readAnnouncements(context).map((announcement) => {
    if (announcement.id !== announcementId) return announcement;
    updatedAnnouncement = normalizeAnnouncement(
      {
        ...announcement,
        ...patch,
        id: announcement.id,
        createdAt: announcement.createdAt,
        updatedAt: now,
        publishedAt: patch.publishedAt ?? announcement.publishedAt,
      },
      context,
    );
    return updatedAnnouncement;
  });

  writeAnnouncements(updatedAnnouncements, context);
  if (announcementApiClient.configured && updatedAnnouncement) {
    const u: WorkspaceAnnouncement = updatedAnnouncement;
    announcementCache.set(context.workspaceId, sortAnnouncements((announcementCache.get(context.workspaceId) ?? []).map((a) => (a.id === u.id ? u : a))));
    void announcementApiClient.patch(context.workspaceId, `announcements/${u.id}`, {
      title: u.title, channel: u.channel, status: u.status,
      publishedAt: u.publishedAt > 0 ? new Date(u.publishedAt).toISOString() : undefined,
      metadata: u.metadata,
    }).then((r) => { if (!r.ok) console.error('updateWorkspaceAnnouncement write-through failed', r); })
      .catch((e) => console.error('updateWorkspaceAnnouncement write-through failed', e));
  }
  return updatedAnnouncement;
}

let announcementApiClient: ApiClient = defaultApiClient;
export function __setAnnouncementApiClientForTest(client: ApiClient): void { announcementApiClient = client; }

const announcementCache = new Map<string, WorkspaceAnnouncement[]>(); // key = workspaceId

export async function hydrateWorkspaceAnnouncements(context: AnnouncementRepositoryContext): Promise<void> {
  if (!announcementApiClient.configured) return;
  const res = await announcementApiClient.get<{ items: WorkspaceAnnouncement[]; nextCursor: string | null }>(
    context.workspaceId, 'announcements');
  if (res.ok && res.value && Array.isArray(res.value.items)) {
    announcementCache.set(context.workspaceId, sortAnnouncements(res.value.items.map((a) => normalizeAnnouncement(a, context))));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('workspace_announcements_updated', { detail: { workspaceId: context.workspaceId } }));
    }
  }
}
