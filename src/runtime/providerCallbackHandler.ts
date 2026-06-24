/**
 * P1-R03: Provider Callback Handler
 *
 * 处理 video / remix / director 等异步渲染 provider 的回调。
 * 职责：
 * - 将 provider job id 映射到本地 generation job id（不替换本地 id）
 * - 成功回调：标记 job succeeded + 保存输出资产 + emit 审计
 * - 部分成功回调：标记 job succeeded（带 partial metadata）+ 保存可用输出
 * - 失败回调：标记 job failed（保留 retryable）+ emit 审计
 * - 超时回调：标记 job failed（retryable=true）+ emit 审计
 * - 重复回调：幂等处理（已完成/已失败的 job 不重复更新）
 *
 * Web standalone 模式下，回调由 webMockAgentRuntimeProvider 模拟本地触发；
 * Desktop/Self-hosted Multica 模式下，回调来自外部 WS/HTTP 端点。
 */

import {
  getGenerationJob,
  updateGenerationJob,
  failGenerationJob,
  type GenerationJob,
  type GenerationJobRepositoryContext,
} from '../lib/data/generationJobRepository';
import { createWorkspaceAsset } from '../lib/data/assetRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import type { AuditRepositoryContext } from '../lib/data/auditLogRepository';
import type { ModuleId } from '../types';

/** 回调 fixture 类型，用于测试和 Web mock 模式模拟 */
export type ProviderCallbackScenario =
  | 'success'
  | 'partial_success'
  | 'provider_error'
  | 'timeout'
  | 'duplicate';

export interface ProviderCallbackPayload {
  /** 外部 provider 的 job id（不替换本地 id） */
  providerJobId: string;
  /** 本地 generation job id（映射目标） */
  localJobId: string;
  scenario: ProviderCallbackScenario;
  /** provider 返回的输出 URL 或 metadata */
  outputs?: Array<{
    url?: string;
    type: 'video' | 'image' | 'audio' | 'text';
    name: string;
    metadata?: Record<string, unknown>;
  }>;
  /** 失败时的错误信息 */
  errorMessage?: string;
  /** provider 标识 */
  provider: string;
  /** 回调到达时间戳 */
  receivedAt: number;
}

export interface ProviderCallbackResult {
  handled: boolean;
  idempotent: boolean;
  jobStatus: GenerationJob['status'];
  assetIds: string[];
  error?: string;
}

/**
 * 回调 fixture 工厂：生成各场景的测试/模拟回调 payload。
 * 用于 webMockAgentRuntimeProvider 和 runtime-contract 测试。
 */
export function createCallbackFixture(
  scenario: ProviderCallbackScenario,
  opts: { providerJobId?: string; localJobId?: string; provider?: string } = {},
): ProviderCallbackPayload {
  const providerJobId = opts.providerJobId ?? `ext_job_${Date.now()}`;
  const localJobId = opts.localJobId ?? `gen_${Date.now()}_fixture`;
  const provider = opts.provider ?? 'mock-render';
  const receivedAt = Date.now();

  switch (scenario) {
    case 'success':
      return {
        providerJobId, localJobId, scenario, provider, receivedAt,
        outputs: [{
          type: 'video',
          name: `render-${providerJobId}.mp4`,
          url: `aistudio://provider-output/${providerJobId}.mp4`,
          metadata: { duration: 30, resolution: '1080p' },
        }],
      };
    case 'partial_success':
      return {
        providerJobId, localJobId, scenario, provider, receivedAt,
        outputs: [{
          type: 'video',
          name: `render-partial-${providerJobId}.mp4`,
          url: `aistudio://provider-output/${providerJobId}-partial.mp4`,
          metadata: { duration: 20, resolution: '720p', note: 'partial_render' },
        }],
      };
    case 'provider_error':
      return {
        providerJobId, localJobId, scenario, provider, receivedAt,
        errorMessage: 'Provider rendering failed: GPU out of memory',
      };
    case 'timeout':
      return {
        providerJobId, localJobId, scenario, provider, receivedAt,
        errorMessage: 'Provider job timed out after 300s',
      };
    case 'duplicate':
      return {
        providerJobId, localJobId, scenario, provider, receivedAt,
        outputs: [{
          type: 'video',
          name: `render-${providerJobId}.mp4`,
          url: `aistudio://provider-output/${providerJobId}.mp4`,
        }],
      };
  }
}

/**
 * 处理 provider 回调。幂等：已完成/已失败/已取消的 job 不重复更新。
 *
 * @param payload 回调 payload
 * @param jobRepoContext generation job repository context
 * @param auditContext audit log context（含 session）
 * @param moduleId 关联的模块 id（video / remix_smart / director_desk 等）
 */
export async function handleProviderCallback(
  payload: ProviderCallbackPayload,
  jobRepoContext: GenerationJobRepositoryContext,
  auditContext: AuditRepositoryContext,
  moduleId: ModuleId,
): Promise<ProviderCallbackResult> {
  const existingJob = getGenerationJob(payload.localJobId, jobRepoContext);
  if (!existingJob) {
    return { handled: false, idempotent: false, jobStatus: 'pending', assetIds: [], error: 'Local job not found' };
  }

  // 幂等：已完成/已失败/已取消的 job 不重复处理
  const isAlreadyTerminal = existingJob.status === 'succeeded' || existingJob.status === 'failed' || existingJob.status === 'cancelled';
  if (isAlreadyTerminal) {
    return { handled: false, idempotent: true, jobStatus: existingJob.status, assetIds: [] };
  }

  const assetIds: string[] = [];

  // 存储 provider job id 映射（不替换本地 id）
  const providerMapping = {
    ...(existingJob.metadata.providerJobId ? { previousProviderJobId: existingJob.metadata.providerJobId } : {}),
    providerJobId: payload.providerJobId,
    provider: payload.provider,
    callbackReceivedAt: payload.receivedAt,
    callbackScenario: payload.scenario,
  };

  switch (payload.scenario) {
    case 'success':
    case 'partial_success': {
      await updateGenerationJob(payload.localJobId, {
        status: 'succeeded',
        progress: 100,
        metadata: {
          ...existingJob.metadata,
          ...providerMapping,
          ...(payload.scenario === 'partial_success' ? { partialSuccess: true } : {}),
        },
      }, jobRepoContext);

      // 保存输出资产
      if (payload.outputs) {
        for (const output of payload.outputs) {
          const asset = createWorkspaceAsset({
            name: output.name,
            type: output.type,
            size: output.metadata?.duration ? `${output.metadata.duration}s` : 'unknown',
            source: 'generated',
            moduleId,
            generationJobId: payload.localJobId,
            url: output.url,
            tags: [payload.provider, payload.scenario],
            metadata: {
              ...output.metadata,
              providerJobId: payload.providerJobId,
              provider: payload.provider,
              callbackScenario: payload.scenario,
            },
          }, jobRepoContext);
          assetIds.push(asset.id);
        }
      }

      logAuditEvent({
        action: 'generation_job_complete',
        moduleId,
        targetType: 'generation_job',
        targetId: payload.localJobId,
        metadata: {
          providerJobId: payload.providerJobId,
          provider: payload.provider,
          callbackScenario: payload.scenario,
          assetIds,
          generatedAsset: assetIds.length > 0,
        },
      }, auditContext);

      return { handled: true, idempotent: false, jobStatus: 'succeeded', assetIds };
    }

    case 'provider_error':
    case 'timeout': {
      await failGenerationJob(payload.localJobId, {
        error: payload.errorMessage ?? `Provider callback: ${payload.scenario}`,
        retryable: true,
        metadata: {
          ...providerMapping,
          callbackError: payload.errorMessage,
        },
      }, jobRepoContext);

      logAuditEvent({
        action: 'generation_job_failed',
        moduleId,
        targetType: 'generation_job',
        targetId: payload.localJobId,
        metadata: {
          providerJobId: payload.providerJobId,
          provider: payload.provider,
          callbackScenario: payload.scenario,
          error: payload.errorMessage,
        },
      }, auditContext);

      return { handled: true, idempotent: false, jobStatus: 'failed', assetIds: [], error: payload.errorMessage };
    }

    case 'duplicate': {
      // 重复回调：job 仍在 running，但 fixtures 标记 duplicate——幂等返回
      // 不更新状态，仅记录收到过重复回调
      await updateGenerationJob(payload.localJobId, {
        metadata: {
          ...existingJob.metadata,
          ...providerMapping,
          duplicateCallbackReceivedAt: payload.receivedAt,
        },
      }, jobRepoContext);
      return { handled: false, idempotent: true, jobStatus: existingJob.status, assetIds: [] };
    }
  }
}

/**
 * 回调 fixture 全集，供 runtime-contract 测试和 web mock 使用。
 */
export const providerCallbackFixtures: Record<ProviderCallbackScenario, ProviderCallbackPayload> = {
  success: createCallbackFixture('success', { providerJobId: 'fixture_success', localJobId: 'gen_fixture_success' }),
  partial_success: createCallbackFixture('partial_success', { providerJobId: 'fixture_partial', localJobId: 'gen_fixture_partial' }),
  provider_error: createCallbackFixture('provider_error', { providerJobId: 'fixture_error', localJobId: 'gen_fixture_error' }),
  timeout: createCallbackFixture('timeout', { providerJobId: 'fixture_timeout', localJobId: 'gen_fixture_timeout' }),
  duplicate: createCallbackFixture('duplicate', { providerJobId: 'fixture_dup', localJobId: 'gen_fixture_dup' }),
};
