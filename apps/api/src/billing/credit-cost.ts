// 确定性生成成本(与前端 src/lib/data/billingRepository.ts estimateGenerationJobCredits 对齐)。
// 仅依赖 runtimeMode/providerKind,dispatch 时已知 → 预估=实际,无补差。
export function generationCredits(job: { runtimeMode: string | null; providerKind: string | null }): number {
  if (job.runtimeMode === 'desktop_multica') return 1;
  if (job.providerKind === 'multica') return 3;
  return 5;
}
