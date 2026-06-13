import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';

export type WorkspaceProjectStatus = 'active' | 'draft' | 'archived';

export interface WorkspaceProject {
  id: string;
  workspaceId: string;
  userId?: string;
  name: string;
  type: string;
  status: WorkspaceProjectStatus;
  linkedAssetIds: string[];
  coverImageUrl?: string;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface WorkspaceProjectInput {
  name: string;
  type?: string;
  status?: WorkspaceProjectStatus;
  linkedAssetIds?: string[];
  coverImageUrl?: string;
  favorite?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ProjectRepositoryContext {
  workspaceId: string;
  userId?: string;
  storage?: StorageLike | null;
  now?: number;
}

export const PROJECT_STORAGE_PREFIX = 'aistudio_workspace_projects';

const PROJECT_STATUSES: readonly WorkspaceProjectStatus[] = ['active', 'draft', 'archived'];

function storageKey(context: ProjectRepositoryContext): string {
  return `${PROJECT_STORAGE_PREFIX}:${context.workspaceId}`;
}

function normalizeStatus(value: unknown): WorkspaceProjectStatus {
  return PROJECT_STATUSES.includes(value as WorkspaceProjectStatus) ? value as WorkspaceProjectStatus : 'active';
}

function normalizeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : fallback;
}

function normalizeLinkedAssetIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).filter(Boolean))];
}

function normalizeProject(
  project: Partial<WorkspaceProject>,
  context: ProjectRepositoryContext,
): WorkspaceProject {
  const now = context.now ?? Date.now();
  return {
    id: normalizeText(project.id, `project_${now}_${Math.random().toString(36).slice(2, 8)}`),
    workspaceId: context.workspaceId,
    userId: project.userId ?? context.userId,
    name: normalizeText(project.name, 'Untitled project'),
    type: normalizeText(project.type, 'Workspace'),
    status: normalizeStatus(project.status),
    linkedAssetIds: normalizeLinkedAssetIds(project.linkedAssetIds),
    coverImageUrl: typeof project.coverImageUrl === 'string' && project.coverImageUrl.trim()
      ? project.coverImageUrl.trim()
      : undefined,
    favorite: Boolean(project.favorite),
    createdAt: normalizeTimestamp(project.createdAt, now),
    updatedAt: normalizeTimestamp(project.updatedAt, now),
    metadata: project.metadata && typeof project.metadata === 'object' && !Array.isArray(project.metadata)
      ? project.metadata
      : {},
  };
}

function sortProjects(projects: WorkspaceProject[]): WorkspaceProject[] {
  return projects.slice().sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt);
}

function readProjects(context: ProjectRepositoryContext): WorkspaceProject[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(storageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortProjects(parsed.map((project) => normalizeProject(project as Partial<WorkspaceProject>, context)));
  } catch {
    return [];
  }
}

function writeProjects(projects: WorkspaceProject[], context: ProjectRepositoryContext): WorkspaceProject[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = sortProjects(projects.map((project) => normalizeProject(project, context)));
  storage?.setItem(storageKey(context), JSON.stringify(normalized));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('workspace_projects_updated', { detail: { workspaceId: context.workspaceId } }));
  }
  return normalized;
}

export function loadWorkspaceProjects(context: ProjectRepositoryContext): WorkspaceProject[] {
  return readProjects(context);
}

export function saveWorkspaceProjects(
  projects: WorkspaceProject[],
  context: ProjectRepositoryContext,
): WorkspaceProject[] {
  return writeProjects(projects, context);
}

export function createWorkspaceProject(
  input: WorkspaceProjectInput,
  context: ProjectRepositoryContext,
): WorkspaceProject {
  const now = context.now ?? Date.now();
  const project = normalizeProject(
    {
      id: `project_${now}_${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: context.workspaceId,
      userId: context.userId,
      name: input.name,
      type: input.type,
      status: input.status ?? 'active',
      linkedAssetIds: input.linkedAssetIds ?? [],
      coverImageUrl: input.coverImageUrl,
      favorite: input.favorite ?? false,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    },
    context,
  );

  writeProjects([project, ...readProjects(context)], context);
  return project;
}

export function updateWorkspaceProject(
  projectId: string,
  patch: Partial<Omit<WorkspaceProject, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>,
  context: ProjectRepositoryContext,
): WorkspaceProject | null {
  const now = context.now ?? Date.now();
  let updatedProject: WorkspaceProject | null = null;
  const updatedProjects = readProjects(context).map((project) => {
    if (project.id !== projectId) return project;
    updatedProject = normalizeProject(
      {
        ...project,
        ...patch,
        id: project.id,
        workspaceId: project.workspaceId,
        createdAt: project.createdAt,
        updatedAt: now,
      },
      context,
    );
    return updatedProject;
  });

  writeProjects(updatedProjects, context);
  return updatedProject;
}

export function deleteWorkspaceProjects(projectIds: string[], context: ProjectRepositoryContext): WorkspaceProject[] {
  const projectIdSet = new Set(projectIds);
  return writeProjects(readProjects(context).filter((project) => !projectIdSet.has(project.id)), context);
}
