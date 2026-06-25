import type { ModuleId } from '../types';
import { getProductFeature } from '../product/registry';
import { FlaskConical } from 'lucide-react';

interface ModulePreviewBannerProps {
  moduleId: ModuleId;
}

export function ModulePreviewBanner({ moduleId }: ModulePreviewBannerProps) {
  const feature = getProductFeature(moduleId);
  if (!feature?.visible || feature.readiness !== 'mock') {
    return null;
  }

  return (
    <div
      role="status"
      className="shrink-0 mx-4 mt-3 md:mx-6 md:mt-4 px-4 py-3 rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50/90 text-amber-950 flex items-start gap-3 text-sm"
    >
      <FlaskConical className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" aria-hidden />
      <div>
        <p className="font-bold">预览功能 · 未纳入当前付费内测范围</p>
        <p className="mt-1 text-amber-900/80 font-medium leading-relaxed">
          「{feature.label}」当前为演示或部分能力，数据与生成链路可能未接生产计费。正式能力上线前请勿依赖本模块完成关键业务。
        </p>
      </div>
    </div>
  );
}