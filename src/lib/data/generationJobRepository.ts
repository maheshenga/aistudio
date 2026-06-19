import type { ModuleId } from '../../types';
import type { RuntimeMode, RuntimeProviderKind } from '../../runtime/agentRuntimeTypes';
import type { StorageLike } from '../../saas/localAuthSession';
import { getRepositoryStorage } from './dataBackend';
import { apiClient as defaultApiClient, type ApiClient } from './apiClient';

export type GenerationJobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface GenerationJob {
  id: string;
  workspaceId: string;
  userId?: string;
  title: string;
  prompt: string;
  status: GenerationJobStatus;
  providerKind: RuntimeProviderKind;
  runtimeMode: RuntimeMode;
  moduleId?: ModuleId;
  agentId?: string;
  runtimeTaskId?: string;
  progress: number;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  error?: string;
}

export type GenerationJobInput = Pick<
  GenerationJob,
  'title' | 'prompt' | 'status' | 'providerKind' | 'runtimeMode' | 'progress'
> & Partial<Pick<GenerationJob, 'moduleId' | 'agentId' | 'runtimeTaskId' | 'metadata' | 'error'>>;

export interface GenerationJobFailureInput {
  error: string;
  retryable?: boolean;
  metadata?: Record<string, unknown>;
}

export interface GenerationJobRepositoryContext {
  workspaceId: string;
  userId?: string;
  storage?: StorageLike | null;
  now?: number;
}

export const GENERATION_JOB_STORAGE_PREFIX = 'aistudio_generation_jobs';

function storageKey(context: GenerationJobRepositoryContext): string {
  return `${GENERATION_JOB_STORAGE_PREFIX}:${context.workspaceId}`;
}

function isCompletedStatus(status: GenerationJobStatus): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'cancelled';
}

function toOptionalTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}
function toTimestamp(value: unknown, fallback: number): number {
  return toOptionalTimestamp(value) ?? fallback;
}

function normalizeJob(raw: GenerationJob & { externalTaskId?: string; finishedAt?: number | string }, context: GenerationJobRepositoryContext): GenerationJob {
  const now = context.now ?? Date.now();
  const status = (raw.status ?? 'pending') as GenerationJobStatus;
  const runtimeTaskId = raw.runtimeTaskId ?? raw.externalTaskId;
  const completedAt = toOptionalTimestamp(raw.completedAt) ?? toOptionalTimestamp(raw.finishedAt) ?? (isCompletedStatus(status) ? now : undefined);
  return {
    id: String(raw.id),
    workspaceId: context.workspaceId,
    userId: raw.userId ?? context.userId,
    title: raw.title ?? '',
    prompt: raw.prompt ?? '',
    status,
    providerKind: (raw.providerKind ?? 'gemini') as RuntimeProviderKind,
    runtimeMode: (raw.runtimeMode ?? 'single') as RuntimeMode,
    moduleId: raw.moduleId,
    agentId: raw.agentId,
    runtimeTaskId,
    progress: Math.max(0, Math.min(100, Number(raw.progress ?? 0))),
    metadata: (raw.metadata ?? {}) as Record<string, unknown>,
    createdAt: toTimestamp(raw.createdAt, now),
    updatedAt: toTimestamp(raw.updatedAt, now),
    completedAt,
    error: raw.error,
  };
}

function readJobs(context: GenerationJobRepositoryContext): GenerationJob[] {
  const storage = getRepositoryStorage(context.storage);
  const raw = storage?.getItem(storageKey(context));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((job) => normalizeJob(job as GenerationJob, context));
  } catch {
    return [];
  }
}

function dispatchJobsUpdated(workspaceId: string): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('generation_jobs_updated', { detail: { workspaceId } }));
  }
}

function writeJobs(jobs: GenerationJob[], context: GenerationJobRepositoryContext): GenerationJob[] {
  const storage = getRepositoryStorage(context.storage);
  const normalized = jobs.map((job) => normalizeJob(job, context));
  storage?.setItem(storageKey(context), JSON.stringify(normalized));
  dispatchJobsUpdated(context.workspaceId);
  return normalized;
}

let generationJobApiClient: ApiClient = defaultApiClient;
export function __setGenerationJobApiClientForTest(client: ApiClient): void { generationJobApiClient = client; }

const generationJobCache = new Map<string, GenerationJob[]>(); // key=workspaceId

export async function hydrateGenerationJobs(context: GenerationJobRepositoryContext): Promise<void> {
  if (!generationJobApiClient.configured) return;
  const res = await generationJobApiClient.get<GenerationJob[]>(context.workspaceId, 'generation-jobs');
  if (res.ok && Array.isArray(res.value)) {
    generationJobCache.set(
      context.workspaceId,
      res.value.map((j) => normalizeJob(j as GenerationJob, context)),
    );
    dispatchJobsUpdated(context.workspaceId);
  }
}

export function listGenerationJobs(context: GenerationJobRepositoryContext): GenerationJob[] {
  if (generationJobApiClient.configured) return generationJobCache.get(context.workspaceId) ?? [];
  return readJobs(context);
}

export function getGenerationJob(id: string, context: GenerationJobRepositoryContext): GenerationJob | null {
  if (generationJobApiClient.configured) {
    return (generationJobCache.get(context.workspaceId) ?? []).find((job) => job.id === id) ?? null;
  }
  return readJobs(context).find((job) => job.id === id) ?? null;
}

export function createGenerationJob(input: GenerationJobInput, context: GenerationJobRepositoryContext): GenerationJob {
  const now = context.now ?? Date.now();
  const job: GenerationJob = {
    id: `gen_${now}_${Math.random().toString(36).slice(2, 8)}`,
    workspaceId: context.workspaceId,
    userId: context.userId,
    title: input.title,
    prompt: input.prompt,
    status: input.status,
    providerKind: input.providerKind,
    runtimeMode: input.runtimeMode,
    moduleId: input.moduleId,
    agentId: input.agentId,
    runtimeTaskId: input.runtimeTaskId,
    progress: input.progress,
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
    completedAt: isCompletedStatus(input.status) ? now : undefined,
    error: input.error,
  };

  if (generationJobApiClient.configured) {
    const normalized = normalizeJob(job, context);
    generationJobCache.set(context.workspaceId, [normalized, ...(generationJobCache.get(context.workspaceId) ?? [])]);
    dispatchJobsUpdated(context.workspaceId);
    void generationJobApiClient
      .post(context.workspaceId, 'generation-jobs', {
        title: job.title,
        prompt: job.prompt,
        status: job.status,
        providerKind: job.providerKind,
        runtimeMode: job.runtimeMode,
        moduleId: job.moduleId,
        agentId: job.agentId,
        runtimeTaskId: job.runtimeTaskId,
        progress: job.progress,
        metadata: job.metadata,
        error: job.error,
      })
      .then((res) => { if (!res.ok) console.error('createGenerationJob write-through failed', res); })
      .catch((err) => console.error('createGenerationJob write-through failed', err));
    return normalized;
  }

  writeJobs([job, ...readJobs(context)], context);
  return job;
}

// Status transitions go to the dedicated `generation-jobs/{id}/status` endpoint (state machine),
// NOT a plain PATCH. fire-and-forget; preserves local state-machine computation.
function writeThroughJobStatus(
  id: string,
  status: GenerationJobStatus,
  error: string | undefined,
  context: GenerationJobRepositoryContext,
): void {
  void generationJobApiClient
    .patch(context.workspaceId, `generation-jobs/${id}/status`, { status, error })
    .then((res) => { if (!res.ok) console.error('generationJob status write-through failed', res); })
    .catch((err) => console.error('generationJob status write-through failed', err));
}

export function updateGenerationJob(
  id: string,
  patch: Partial<Omit<GenerationJob, 'id' | 'workspaceId' | 'createdAt'>>,
  context: GenerationJobRepositoryContext,
): GenerationJob | null {
  const now = context.now ?? Date.now();
  let updatedJob: GenerationJob | null = null;
  const applyPatch = (job: GenerationJob): GenerationJob => {
    if (job.id !== id) return job;
    const status = patch.status ?? job.status;
    updatedJob = normalizeJob({
      ...job,
      ...patch,
      updatedAt: now,
      completedAt: patch.completedAt ?? (isCompletedStatus(status) ? now : undefined),
    }, context);
    return updatedJob;
  };

  if (generationJobApiClient.configured) {
    const current = generationJobCache.get(context.workspaceId) ?? [];
    generationJobCache.set(context.workspaceId, current.map(applyPatch));
    dispatchJobsUpdated(context.workspaceId);
    if (updatedJob && patch.status !== undefined) {
      writeThroughJobStatus(id, updatedJob.status, updatedJob.error, context);
    }
    return updatedJob;
  }

  const updatedJobs = readJobs(context).map(applyPatch);

  writeJobs(updatedJobs, context);
  return updatedJob;
}

function readRetryCount(metadata: Record<string, unknown>): number {
  const retryCount = Number(metadata.retryCount ?? 0);
  return Number.isFinite(retryCount) && retryCount > 0 ? retryCount : 0;
}

function readAttempt(metadata: Record<string, unknown>): number {
  const attempt = Number(metadata.attempt ?? 1);
  return Number.isFinite(attempt) && attempt > 0 ? attempt : 1;
}

export function failGenerationJob(
  id: string,
  input: GenerationJobFailureInput,
  context: GenerationJobRepositoryContext,
): GenerationJob | null {
  const existingJob = getGenerationJob(id, context);
  if (!existingJob) return null;

  const now = context.now ?? Date.now();
  return updateGenerationJob(
    id,
    {
      status: 'failed',
      progress: 100,
      error: input.error,
      completedAt: now,
      metadata: {
        ...existingJob.metadata,
        ...input.metadata,
        failedAt: now,
        retryable: input.retryable ?? true,
        retryCount: readRetryCount(existingJob.metadata),
      },
    },
    context,
  );
}

export function retryGenerationJob(id: string, context: GenerationJobRepositoryContext): GenerationJob | null {
  const failedJob = getGenerationJob(id, context);
  if (!failedJob || failedJob.status !== 'failed') return null;

  const now = context.now ?? Date.now();
  const retryCount = readRetryCount(failedJob.metadata) + 1;
  const attempt = readAttempt(failedJob.metadata) + 1;

  const retryJob = createGenerationJob(
    {
      title: failedJob.title,
      prompt: failedJob.prompt,
      status: 'pending',
      providerKind: failedJob.providerKind,
      runtimeMode: failedJob.runtimeMode,
      moduleId: failedJob.moduleId,
      agentId: failedJob.agentId,
      progress: 0,
      metadata: {
        ...failedJob.metadata,
        retryable: true,
        retryCount: 0,
        retryOfJobId: failedJob.id,
        retrySourceError: failedJob.error,
        retryRequestedAt: now,
        attempt,
      },
    },
    context,
  );

  updateGenerationJob(
    failedJob.id,
    {
      metadata: {
        ...failedJob.metadata,
        retryable: true,
        retryCount,
        lastRetryJobId: retryJob.id,
        lastRetryRequestedAt: now,
      },
    },
    context,
  );

  return retryJob;
}
