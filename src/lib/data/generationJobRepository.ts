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

export class GenerationJobApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'GenerationJobApiError';
    this.code = code;
  }
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

export function normalizeGenerationJob(
  raw: GenerationJob & { externalTaskId?: string; finishedAt?: number | string },
  context: GenerationJobRepositoryContext,
): GenerationJob {
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
    moduleId: raw.moduleId as ModuleId | undefined,
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
    return parsed.map((job) => normalizeGenerationJob(job as GenerationJob, context));
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
  const normalized = jobs.map((job) => normalizeGenerationJob(job, context));
  storage?.setItem(storageKey(context), JSON.stringify(normalized));
  dispatchJobsUpdated(context.workspaceId);
  return normalized;
}

let generationJobApiClient: ApiClient = defaultApiClient;
export function __setGenerationJobApiClientForTest(client: ApiClient): void { generationJobApiClient = client; }

export function isGenerationJobBackendConfigured(): boolean {
  return generationJobApiClient.configured;
}

const generationJobCache = new Map<string, GenerationJob[]>();

function upsertJobInCache(job: GenerationJob, context: GenerationJobRepositoryContext): GenerationJob {
  const normalized = normalizeGenerationJob(job, context);
  const current = generationJobCache.get(context.workspaceId) ?? [];
  const next = [normalized, ...current.filter((row) => row.id !== normalized.id)];
  generationJobCache.set(context.workspaceId, next);
  dispatchJobsUpdated(context.workspaceId);
  return normalized;
}

export function mirrorGenerationJobFromBackend(
  raw: GenerationJob & { externalTaskId?: string; finishedAt?: number | string },
  context: GenerationJobRepositoryContext,
): GenerationJob {
  return upsertJobInCache(raw, context);
}

export async function hydrateGenerationJobs(context: GenerationJobRepositoryContext): Promise<void> {
  if (!generationJobApiClient.configured) return;
  const res = await generationJobApiClient.get<GenerationJob[]>(context.workspaceId, 'generation-jobs');
  if (res.ok && Array.isArray(res.value)) {
    generationJobCache.set(
      context.workspaceId,
      res.value.map((j) => normalizeGenerationJob(j as GenerationJob, context)),
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

function buildCreatePayload(input: GenerationJobInput) {
  return {
    title: input.title,
    prompt: input.prompt,
    status: input.status,
    providerKind: input.providerKind,
    runtimeMode: input.runtimeMode,
    moduleId: input.moduleId,
    agentId: input.agentId,
    runtimeTaskId: input.runtimeTaskId,
    progress: input.progress,
    metadata: input.metadata,
    error: input.error,
  };
}

export async function createGenerationJob(
  input: GenerationJobInput,
  context: GenerationJobRepositoryContext,
): Promise<GenerationJob> {
  const now = context.now ?? Date.now();

  if (generationJobApiClient.configured) {
    const res = await generationJobApiClient.post<GenerationJob>(context.workspaceId, 'generation-jobs', buildCreatePayload(input));
    if (!res.ok) {
      const failure = res as { ok: false; error: { code: string; message: string } };
      throw new GenerationJobApiError(failure.error.code, failure.error.message);
    }
    if (!res.value) throw new GenerationJobApiError('unknown_error', 'createGenerationJob failed');
    return upsertJobInCache(res.value as GenerationJob, context);
  }

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
  writeJobs([job, ...readJobs(context)], context);
  return job;
}

async function writeThroughJobStatus(
  id: string,
  status: GenerationJobStatus,
  error: string | undefined,
  context: GenerationJobRepositoryContext,
): Promise<void> {
  const res = await generationJobApiClient.patch(context.workspaceId, `generation-jobs/${id}/status`, { status, error });
  if (!res.ok) {
    const failure = res as { ok: false; error: { code: string; message: string } };
    throw new GenerationJobApiError(failure.error.code, failure.error.message);
  }
}

export async function updateGenerationJob(
  id: string,
  patch: Partial<Omit<GenerationJob, 'id' | 'workspaceId' | 'createdAt'>>,
  context: GenerationJobRepositoryContext,
): Promise<GenerationJob | null> {
  const now = context.now ?? Date.now();
  let updatedJob: GenerationJob | null = null;
  const applyPatch = (job: GenerationJob): GenerationJob => {
    if (job.id !== id) return job;
    const status = patch.status ?? job.status;
    updatedJob = normalizeGenerationJob({
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
      await writeThroughJobStatus(id, updatedJob.status, updatedJob.error, context);
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

export async function failGenerationJob(
  id: string,
  input: GenerationJobFailureInput,
  context: GenerationJobRepositoryContext,
): Promise<GenerationJob | null> {
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

export async function retryGenerationJob(
  id: string,
  context: GenerationJobRepositoryContext,
): Promise<GenerationJob | null> {
  const failedJob = getGenerationJob(id, context);
  if (!failedJob || failedJob.status !== 'failed') return null;

  if (generationJobApiClient.configured) {
    const res = await generationJobApiClient.post<{ job: GenerationJob }>(context.workspaceId, `orchestration/jobs/${id}/retry`, {});
    if (!res.ok || !res.value?.job) return null;
    const retried = upsertJobInCache(res.value.job, context);
    await updateGenerationJob(
      failedJob.id,
      {
        metadata: {
          ...failedJob.metadata,
          retryable: true,
          retryCount: readRetryCount(failedJob.metadata) + 1,
          lastRetryRequestedAt: context.now ?? Date.now(),
        },
      },
      context,
    );
    return retried;
  }

  const now = context.now ?? Date.now();
  const retryCount = readRetryCount(failedJob.metadata) + 1;
  const attempt = readAttempt(failedJob.metadata) + 1;

  const retryJob = await createGenerationJob(
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

  await updateGenerationJob(
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
