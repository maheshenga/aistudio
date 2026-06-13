import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { ModuleId } from '../types';
import type { AuthSession } from '../saas/types';
import {
  listGenerationJobs,
  retryGenerationJob,
  type GenerationJob,
  type GenerationJobRepositoryContext,
} from '../lib/data/generationJobRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';

interface GenerationFailureRecoveryPanelProps {
  moduleId: ModuleId;
  session: AuthSession;
  context: GenerationJobRepositoryContext;
  title?: string;
}

function isRetryableFailure(job: GenerationJob): boolean {
  return job.status === 'failed' && job.metadata.retryable !== false;
}

export function GenerationFailureRecoveryPanel({
  moduleId,
  session,
  context,
  title = 'Failed provider jobs',
}: GenerationFailureRecoveryPanelProps) {
  const [jobs, setJobs] = useState<GenerationJob[]>(() => listGenerationJobs(context));

  useEffect(() => {
    const refreshJobs = () => setJobs(listGenerationJobs(context));
    const handleJobsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (detail?.workspaceId && detail.workspaceId !== context.workspaceId) return;
      refreshJobs();
    };

    refreshJobs();
    window.addEventListener('generation_jobs_updated', handleJobsUpdated);
    return () => window.removeEventListener('generation_jobs_updated', handleJobsUpdated);
  }, [context]);

  const failedJobs = useMemo(
    () => jobs.filter((job) => job.moduleId === moduleId && isRetryableFailure(job)).slice(0, 3),
    [jobs, moduleId],
  );

  const handleRetry = (job: GenerationJob) => {
    const retryJob = retryGenerationJob(job.id, context);
    if (!retryJob) return;

    logAuditEvent(
      {
        action: 'generation_job_retry',
        moduleId,
        targetType: 'generation_job',
        targetId: retryJob.id,
        metadata: {
          retryOfJobId: job.id,
          previousError: job.error,
          attempt: retryJob.metadata.attempt,
        },
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
  };

  if (failedJobs.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-xl)] border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-700">
          <AlertTriangle className="icon-sm" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-amber-900">{title}</p>
          <p className="mt-1 text-xs font-medium text-amber-800">
            Provider errors are saved with their prompt, module, retry count, and audit trail.
          </p>
          <div className="mt-3 space-y-2">
            {failedJobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-amber-200 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-gray-900">{job.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-gray-600">
                    {job.error || 'Provider failed before returning an output.'}
                  </p>
                </div>
                <button
                  onClick={() => handleRetry(job)}
                  className="inline-flex shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-amber-600 px-3 py-2 text-[11px] font-black text-white shadow-sm transition-colors hover:bg-amber-700"
                >
                  <RotateCcw className="mr-1.5 icon-sm" />
                  Retry
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
