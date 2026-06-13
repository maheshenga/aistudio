import type { ModuleId } from '../../types';
import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export type WorkspaceKeywordLibraryStatus = 'active' | 'paused' | 'archived';

export interface WorkspaceKeywordLibrary {
  id: string;
  workspaceId: string;
  userId?: string;
  name: string;
  description: string;
  channel: string;
  ownerId?: string;
  status: WorkspaceKeywordLibraryStatus;
  moduleId: ModuleId;
  tags: string[];
  keywords: string[];
  blockedTerms: string[];
  sourceText: string;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
  metadata: Record<string, unknown>;
}

export interface WorkspaceKeywordLibraryInput {
  name: string;
  description?: string;
  channel?: string;
  ownerId?: string;
  status?: WorkspaceKeywordLibraryStatus;
  moduleId?: ModuleId;
  tags?: string[];
  keywords?: string[];
  blockedTerms?: string[];
  sourceText?: string;
  metadata?: Record<string, unknown>;
}

export interface KeywordRepositoryContext {
  workspaceId: string;
  userId?: string;
  storage?: StorageLike | null;
  now?: number;
}

export const KEYWORD_LIBRARY_STORAGE_PREFIX = 'aistudio_workspace_keyword_libraries';

const KEYWORD_LIBRARY_STATUSES: readonly WorkspaceKeywordLibraryStatus[] = ['active', 'paused', 'archived'];

function storageKey(context: KeywordRepositoryContext): string {
  return `${KEYWORD_LIBRARY_STORAGE_PREFIX}:${context.workspaceId}`;
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeOptionalText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).map((item) => item.trim()).filter(Boolean))];
}

function normalizeStatus(value: unknown): WorkspaceKeywordLibraryStatus {
  return KEYWORD_LIBRARY_STATUSES.includes(value as WorkspaceKeywordLibraryStatus)
    ? value as WorkspaceKeywordLibraryStatus
    : 'active';
}

function normalizeKeywordLibrary(
  library: Partial<WorkspaceKeywordLibrary>,
  context: KeywordRepositoryContext,
): WorkspaceKeywordLibrary {
  const now = context.now ?? Date.now();
  const createdAt = normalizeTimestamp(library.createdAt, now);
  const status = normalizeStatus(library.status);

  return {
    id: normalizeText(library.id, `keyword_library_${now}_${Math.random().toString(36).slice(2, 8)}`),
    workspaceId: context.workspaceId,
    userId: library.userId ?? context.userId,
    name: normalizeText(library.name, 'Untitled keyword library'),
    description: normalizeOptionalText(library.description),
    channel: normalizeText(library.channel, 'general'),
    ownerId: normalizeText(library.ownerId ?? context.userId, context.userId ?? 'workspace'),
    status,
    moduleId: library.moduleId ?? 'copywriting_keywords',
    tags: normalizeList(library.tags),
    keywords: normalizeList(library.keywords),
    blockedTerms: normalizeList(library.blockedTerms),
    sourceText: normalizeOptionalText(library.sourceText),
    createdAt,
    updatedAt: normalizeTimestamp(library.updatedAt, now),
    archivedAt: status === 'archived' ? normalizeTimestamp(library.archivedAt, now) : undefined,
    metadata: library.metadata && typeof library.metadata === 'object' && !Array.isArray(library.metadata)
      ? library.metadata
      : {},
  };
}

function sortLibraries(libraries: WorkspaceKeywordLibrary[]): WorkspaceKeywordLibrary[] {
  return libraries.slice().sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
}

function readLibraries(context: KeywordRepositoryContext): WorkspaceKeywordLibrary[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(storageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortLibraries(parsed.map((library) => normalizeKeywordLibrary(library as Partial<WorkspaceKeywordLibrary>, context)));
  } catch {
    return [];
  }
}

function writeLibraries(
  libraries: WorkspaceKeywordLibrary[],
  context: KeywordRepositoryContext,
): WorkspaceKeywordLibrary[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = sortLibraries(libraries.map((library) => normalizeKeywordLibrary(library, context)));
  storage?.setItem(storageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('workspace_keyword_libraries_updated', { detail: { workspaceId: context.workspaceId } }));
  }
  return normalized;
}

export function loadWorkspaceKeywordLibraries(context: KeywordRepositoryContext): WorkspaceKeywordLibrary[] {
  return readLibraries(context);
}

export function saveWorkspaceKeywordLibraries(
  libraries: WorkspaceKeywordLibrary[],
  context: KeywordRepositoryContext,
): WorkspaceKeywordLibrary[] {
  return writeLibraries(libraries, context);
}

export function createWorkspaceKeywordLibrary(
  input: WorkspaceKeywordLibraryInput,
  context: KeywordRepositoryContext,
): WorkspaceKeywordLibrary {
  const now = context.now ?? Date.now();
  const library = normalizeKeywordLibrary(
    {
      id: `keyword_library_${now}_${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: context.workspaceId,
      userId: context.userId,
      name: input.name,
      description: input.description,
      channel: input.channel,
      ownerId: input.ownerId ?? context.userId,
      status: input.status ?? 'active',
      moduleId: input.moduleId ?? 'copywriting_keywords',
      tags: input.tags ?? [],
      keywords: input.keywords ?? [],
      blockedTerms: input.blockedTerms ?? [],
      sourceText: input.sourceText,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    },
    context,
  );

  writeLibraries([library, ...readLibraries(context)], context);
  return library;
}

export function updateWorkspaceKeywordLibrary(
  libraryId: string,
  patch: Partial<Omit<WorkspaceKeywordLibrary, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>,
  context: KeywordRepositoryContext,
): WorkspaceKeywordLibrary | null {
  const now = context.now ?? Date.now();
  let updatedLibrary: WorkspaceKeywordLibrary | null = null;
  const libraries = readLibraries(context).map((library) => {
    if (library.id !== libraryId) return library;
    updatedLibrary = normalizeKeywordLibrary(
      {
        ...library,
        ...patch,
        id: library.id,
        workspaceId: library.workspaceId,
        createdAt: library.createdAt,
        updatedAt: now,
      },
      context,
    );
    return updatedLibrary;
  });

  writeLibraries(libraries, context);
  return updatedLibrary;
}

export function archiveWorkspaceKeywordLibrary(
  libraryId: string,
  context: KeywordRepositoryContext,
): WorkspaceKeywordLibrary | null {
  const now = context.now ?? Date.now();
  return updateWorkspaceKeywordLibrary(libraryId, { status: 'archived', archivedAt: now }, { ...context, now });
}

export function searchWorkspaceKeywordLibraries(
  query: string,
  context: KeywordRepositoryContext,
): WorkspaceKeywordLibrary[] {
  const normalizedQuery = query.trim().toLowerCase();
  const libraries = readLibraries(context);
  if (!normalizedQuery) return libraries;

  return libraries.filter((library) => [
    library.name,
    library.description,
    library.channel,
    library.sourceText,
    ...library.tags,
    ...library.keywords,
    ...library.blockedTerms,
    JSON.stringify(library.metadata),
  ].join(' ').toLowerCase().includes(normalizedQuery));
}
