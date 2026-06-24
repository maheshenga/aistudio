import React, { useMemo, useState } from 'react';
import { 
  Wand2, Layers, Type, LayoutTemplate, Plus, Search, Filter, Play, Check, Copy, 
  Download, Film, MoreHorizontal, FileVideo, Music, Image as ImageIcon,
  ArrowLeft, Save, PlayCircle, Mic2, FileText, Smartphone, Monitor, Eye, Trash2, 
  Sliders, Clock, Calendar, Shield, CreditCard, Camera, Sparkles, AlertCircle, Zap, 
  Scissors, Heart, MessageCircle, Star, Forward, X, ScanLine
} from 'lucide-react';
import { useSaasSession } from '../saas/SaasAuthContext';
import { failGenerationJob, updateGenerationJob } from '../lib/data/generationJobRepository';
import { buildBillableGenerationPricing, startBillableGenerationJob } from '../lib/billing/billableGeneration';
import { createWorkspaceAsset, recordWorkspaceAssetExport } from '../lib/data/assetRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { createPricedWorkspaceUsageEvent } from '../lib/data/usageRepository';
import { createWorkspaceTask } from '../lib/data/taskRepository';
import { GenerationFailureRecoveryPanel } from './GenerationFailureRecoveryPanel';

interface RemixViewProps {
  moduleId: string;
}

const REMIX_PREVIEW_VIDEO_URL = 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-neon-light-tunnel-34686-large.mp4';

export function RemixView({ moduleId }: RemixViewProps) {
  switch (moduleId) {
    case 'remix_home':
      return <RemixHome />;
    case 'remix_smart':
      return <RemixSmart />;
    case 'remix_materials':
      return <RemixMaterials />;
    case 'remix_titles':
      return <RemixTitles />;
    case 'remix_templates':
      return <RemixTemplates />;
    case 'remix_viral':
      return <RemixViral />;
    default:
      return <RemixHome />;
  }
}

function RemixHome() {
  return (
    <div className="p-[var(--spacing-xl)] max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="bg-[#0F172A] rounded-[32px] p-10 text-white shadow-xl relative overflow-hidden border border-gray-800">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <div className="w-64 h-64 border-4 border-blue-500/20 rounded-full animate-[spin_10s_linear_infinite]" style={{ borderStyle: 'dashed' }}></div>
        </div>
        <div className="relative z-10 max-w-2xl">
           <h2 className="text-[var(--text-main)]xl font-black mb-4 tracking-tight flex items-center">
             短视频编导 Agent
             <span className="ml-4 px-3 py-1 bg-blue-500/20 text-blue-400 text-sm font-bold rounded-full border border-blue-500/30 uppercase tracking-widest flex items-center">
               <span className="w-2 h-2 rounded-full bg-blue-400 mr-2 animate-pulse"></span>
               Video Swarm
             </span>
           </h2>
           <p className="text-gray-400 text-lg leading-relaxed mb-[var(--spacing-xl)] font-medium">
             自动裂变分发系统。基于数字资产库与对标链路，7x24 小时为您产出矩阵号短视频素材，解放繁重的剪辑流水线工作。
           </p>
           <button className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-8 py-3.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-lg flex items-center">
              <Wand2 className="icon-md mr-2" />
              下发批量编导指令
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[var(--spacing-md)]">
        {[
          { title: '智能混剪', desc: '根据文案与指令一键组合视频资产', icon: Wand2, type: 'remix_smart' },
          { title: '爆款复刻', desc: '上传对标视频，一键仿写文案并替换素材', icon: Sparkles, type: 'remix_viral' },
          { title: '混剪素材库', desc: '统一管理图片、视频与背景音乐', icon: Layers, type: 'remix_materials' },
          { title: '动态标题模板', desc: '综艺花字、科技字幕与大字报模板', icon: Type, type: 'remix_titles' },
          { title: '预设视频模板', desc: '高燃卡点、旅拍记录等成型工程', icon: LayoutTemplate, type: 'remix_templates' },
        ].map((item, i) => (
          <div key={i} className="bg-[var(--bg-panel)] rounded-[24px] p-[var(--spacing-lg)] border border-[var(--border-color)] hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group">
             <div className="w-14 h-14 bg-blue-50 text-[var(--color-primary)] rounded-[var(--radius-xl)] flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all">
                <item.icon className="w-7 h-7" />
             </div>
             <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">{item.title}</h3>
             <p className="text-sm text-[var(--text-muted)] leading-relaxed bg-gray-50 p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)]/50">{item.desc}</p>
          </div>
        ))}
      </div>
      
      <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)]">
         <div className="flex items-center justify-between mb-[var(--spacing-md)]">
            <h3 className="text-lg font-bold text-[var(--text-main)]">混合灵感库</h3>
            <button className="text-sm font-medium text-[var(--color-primary)] hover:underline">查看全部模版</button>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)]">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-50 rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border-color)] group cursor-pointer relative">
                 <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10"></div>
                 <img src={`https://images.unsplash.com/photo-${i % 2 === 0 ? '1492633423735-8c08ef1caa8a' : '1469854523086-cc02fe5d8800'}?auto=format&fit=crop&q=80&w=400`} className="w-full aspect-[4/5] object-cover group-hover:scale-105 transition-transform duration-500" />
                 <div className="absolute bottom-3 left-3 right-3 z-20">
                    <p className="text-white font-bold text-sm drop-shadow-md">灵感卡点模板 #0{i}</p>
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}

function RemixSmart() {
  const session = useSaasSession();
  const repositoryContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [showSubtitleDrawer, setShowSubtitleDrawer] = useState(false);
  const [activeShotTitle, setActiveShotTitle] = useState('黄金三秒');
  const [subtitleText, setSubtitleText] = useState('');
  const [previewStatus, setPreviewStatus] = useState<string | null>(null);

  const handlePreviewRemix = async () => {
    const started = await startBillableGenerationJob({
      title: 'Smart remix preview - short video',
      prompt: `Smart remix preview for ${activeShotTitle}`,
      status: 'running',
      providerKind: 'mock',
      runtimeMode: 'web',
      moduleId: 'remix_smart',
      progress: 0,
      metadata: {
        activeShotTitle,
        strategy: 'manual_sampling',
        estimatedDurationSeconds: 9,
      },
    }, repositoryContext, {
      workspaceId: session.workspace.id,
      plan: session.workspace.plan,
      pricing: buildBillableGenerationPricing('remix_smart'),
    });
    if (started.ok === false) {
      setPreviewStatus(started.message);
      return;
    }
    const job = started.job;
    logAuditEvent({
      action: 'generation_job_start',
      moduleId: 'remix_smart',
      targetType: 'generation_job',
      targetId: job.id,
      metadata: {
        activeShotTitle,
        strategy: 'manual_sampling',
      },
    }, { session });

    try {
      await updateGenerationJob(job.id, { status: 'succeeded', progress: 100 }, repositoryContext);
      const asset = createWorkspaceAsset({
      name: `smart-remix-preview-${Date.now()}.mp4`,
      type: 'video',
      size: '9s preview',
      source: 'generated',
      moduleId: 'remix_smart',
      generationJobId: job.id,
      url: REMIX_PREVIEW_VIDEO_URL,
      previewUrl: REMIX_PREVIEW_VIDEO_URL,
      tags: ['smart-remix', activeShotTitle, 'preview'],
      metadata: {
        activeShotTitle,
        strategy: 'manual_sampling',
        estimatedDurationSeconds: 9,
      },
    }, repositoryContext);
    createPricedWorkspaceUsageEvent({
      moduleId: 'remix_smart',
      pricingAction: 'generation',
      kind: 'generation',
      targetType: 'generation_job',
      targetId: job.id,
      providerKind: 'mock',
      runtimeMode: 'web',
      metadata: {
        assetId: asset.id,
        assetType: asset.type,
        activeShotTitle,
        estimatedDurationSeconds: 9,
      },
    }, repositoryContext);
    recordWorkspaceAssetExport({
      asset,
      moduleId: 'remix_smart',
      format: 'mp4',
      fileName: asset.name,
      sourceAction: 'export_preview_video',
      metered: true,
      unitCount: 1,
      metadata: {
        pricingAction: 'export',
        kind: 'export',
        activeShotTitle,
        estimatedDurationSeconds: 9,
      },
    }, {
      ...repositoryContext,
      session,
    });
    logAuditEvent({
      action: 'generation_job_complete',
      moduleId: 'remix_smart',
      targetType: 'generation_job',
      targetId: job.id,
      metadata: {
        assetId: asset.id,
        assetType: asset.type,
        activeShotTitle,
      },
    }, { session });
    logAuditEvent({
      action: 'asset_create',
      moduleId: 'remix_smart',
      targetType: 'asset',
      targetId: asset.id,
      metadata: {
        generationJobId: job.id,
        assetType: asset.type,
        activeShotTitle,
      },
    }, { session });
    window.dispatchEvent(new Event('activity_logged'));
      setPreviewStatus('Smart remix preview saved to workspace assets');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Remix provider failed before returning a preview.';
      await failGenerationJob(job.id, {
        error: message,
        metadata: {
          activeShotTitle,
          strategy: 'manual_sampling',
          estimatedDurationSeconds: 9,
        },
      }, repositoryContext);
      logAuditEvent({
        action: 'generation_job_failed',
        moduleId: 'remix_smart',
        targetType: 'generation_job',
        targetId: job.id,
        metadata: {
          activeShotTitle,
          strategy: 'manual_sampling',
          error: message,
        },
      }, { session });
      window.dispatchEvent(new Event('activity_logged'));
      setPreviewStatus('Remix preview failed. The job is saved for retry.');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#F5F6F8] font-sans">
      <div className="bg-[#F5F6F8] px-6 pt-4">
        <GenerationFailureRecoveryPanel moduleId="remix_smart" session={session} context={repositoryContext} />
      </div>
      {/* Top Navbar */}
      <div className="h-14 bg-[var(--bg-panel)] flex items-center justify-between px-6 flex-shrink-0 shadow-sm z-20">
        <div className="w-1/3">
          <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center">
             <ArrowLeft className="icon-md mr-1" />
          </button>
        </div>
        <div className="w-1/3 flex justify-center">
          <h2 className="font-bold text-[var(--text-main)] text-lg">未命名项目</h2>
        </div>
        <div className="w-1/3 flex justify-end space-x-3">
          <button className="flex items-center text-[13px] font-medium text-gray-700 hover:text-[var(--text-main)] bg-[var(--bg-panel)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg shadow-sm">
            <Sparkles className="icon-sm mr-1.5 text-blue-500" /> 智能去重
          </button>
          <button className="flex items-center text-[13px] font-medium text-gray-700 hover:text-[var(--text-main)] bg-[var(--bg-panel)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg shadow-sm">
            <Save className="icon-sm mr-1.5" /> 保存混剪项目
          </button>
          <button
            onClick={handlePreviewRemix}
            className="flex items-center text-[13px] font-bold text-white bg-[var(--color-primary)] hover:bg-blue-700 px-4 py-1.5 rounded-lg shadow-sm transition-colors"
          >
            <PlayCircle className="icon-sm mr-1.5" /> 视频混剪预览
          </button>
        </div>
      </div>
      {previewStatus && (
        <div className="mx-6 mt-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 shadow-sm">
          {previewStatus}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Column - 镜头内容 */}
        <div className="flex-1 p-4 overflow-y-auto">
           <div className="bg-[var(--bg-panel)] rounded-[var(--radius-lg)] border border-[var(--border-color)] min-h-full">
              {/* Header */}
              <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-start">
                 <div>
                    <h3 className="text-lg font-bold text-[var(--text-main)]">镜头内容</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1">为各个镜头配置素材、文案和时长。</p>
                 </div>
                 <div className="flex space-x-2">
                    <button className="px-3 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">镜头音频</button>
                    <button className="px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-xs font-bold text-[var(--color-primary)] flex items-center hover:bg-blue-100 transition-colors">
                       <Sparkles className="w-3.5 h-3.5 mr-1" /> AI 写作
                    </button>
                    <button className="px-3 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">导入脚本</button>
                    <button className="px-3 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors flex items-center">
                       <Layers className="w-3.5 h-3.5 mr-1" /> 模板库
                    </button>
                 </div>
              </div>

              {/* Shot Groups */}
              <div className="p-4 space-y-[var(--spacing-lg)]">
                 {[
                   { title: '黄金三秒', color: 'bg-gray-900' },
                   { title: '优势呈现', color: 'bg-gray-700' },
                   { title: '结尾行动号召', color: 'bg-gray-500' },
                 ].map((shot, i) => (
                   <div key={i} className="border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-[var(--bg-panel)] shadow-sm overflow-hidden transition-shadow hover:shadow-md">
                     <div className="bg-gray-50 border-b border-[var(--border-color)] px-4 py-3 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                           <div className="flex space-x-1">
                              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                           </div>
                           <div className={`w-8 h-4 rounded-full ${shot.color} relative cursor-pointer flex items-center justify-end px-1`}>
                              <div className="w-3 h-3 bg-[var(--bg-panel)] rounded-full shadow-sm"></div>
                           </div>
                           <h4 className="font-bold text-sm text-[var(--text-main)]">{shot.title}</h4>
                           <span className="text-xs text-[var(--text-muted)] font-medium">素材数量 0</span>
                           <span className="text-xs text-gray-400 font-mono">素材总时长 00:00:00</span>
                        </div>
                        <div className="flex items-center space-x-3">
                           <button className="px-2 py-1 bg-gray-100 text-[var(--text-main)] border border-[var(--border-color)] text-xs font-medium rounded flex items-center transition-colors hover:bg-gray-200">
                              <Mic2 className="w-3 h-3 mr-1" /> 素材原声
                           </button>
                           <span className="text-xs text-[var(--text-muted)] font-medium">🔊 100%</span>
                           <div className="w-px h-4 bg-gray-300"></div>
                           <button className="text-gray-400 hover:text-gray-600 transition-colors"><Copy className="icon-sm" /></button>
                           <button className="text-gray-400 hover:text-rose-500 transition-colors"><Trash2 className="icon-sm" /></button>
                        </div>
                     </div>
                     <div className="p-5 bg-[var(--bg-panel)]">
                        <div className="flex space-x-3 mb-4">
                           <button className="px-3 py-1.5 bg-gray-50 border border-[var(--border-color)] text-gray-700 text-xs rounded-md shadow-sm hover:bg-gray-100 transition-colors flex items-center">
                              <Plus className="w-3.5 h-3.5 mr-1 text-[var(--text-muted)]" /> 添素材
                           </button>
                           <button className="px-3 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-600 text-xs rounded-md hover:bg-gray-50 transition-colors">素材库</button>
                           <button className="px-3 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-600 text-xs rounded-md hover:bg-gray-50 transition-colors">素材库导入</button>
                        </div>
                        <div className="w-32 h-32 bg-gray-50 border border-dashed border-gray-300 rounded-[var(--radius-lg)] flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-100 transition-colors group">
                           <div className="icon-xl rounded-full bg-[var(--bg-panel)] shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                             <Plus className="icon-sm text-[var(--text-muted)]" />
                           </div>
                           <span className="text-xs font-medium text-[var(--text-muted)]">添加素材</span>
                        </div>
                     </div>
                     <div className="border-t border-[var(--border-color)] bg-gray-50 px-4 py-2.5 flex items-center space-x-2 overflow-x-auto select-none gap-2">
                        <span 
                          onClick={() => { setActiveShotTitle(shot.title); setShowSubtitleDrawer(true); }}
                          className="border border-[var(--border-color)] bg-[var(--bg-panel)] px-3 py-1.5 rounded text-xs text-gray-600 flex items-center whitespace-nowrap cursor-pointer hover:border-gray-300 transition-colors shadow-sm">
                          <Type className="w-3.5 h-3.5 mr-1 text-gray-400" /> 字幕配音&标题
                        </span>
                        <span className="border border-[var(--border-color)] bg-[var(--bg-panel)] px-3 py-1.5 rounded text-xs text-gray-600 flex items-center whitespace-nowrap cursor-pointer hover:border-gray-300 transition-colors shadow-sm">
                          <Scissors className="w-3.5 h-3.5 mr-1 text-gray-400" /> 视频原始时长 <span className="ml-1 text-gray-400">默认5s ▾</span>
                        </span>
                        <span className="border border-[var(--border-color)] bg-[var(--bg-panel)] px-3 py-1.5 rounded text-xs text-gray-600 flex items-center whitespace-nowrap cursor-pointer hover:border-gray-300 transition-colors shadow-sm">
                          <Sparkles className="w-3.5 h-3.5 mr-1 text-[var(--text-main)]" /> 智能裁剪 <span className="ml-1 text-gray-400">平台默认 ▾</span>
                        </span>
                        <span className="border border-[var(--border-color)] bg-[var(--bg-panel)] px-3 py-1.5 rounded text-xs text-gray-600 flex items-center whitespace-nowrap cursor-pointer hover:border-gray-300 transition-colors shadow-sm">
                          <Wand2 className="w-3.5 h-3.5 mr-1 text-orange-400" /> 场景特效 ▾
                        </span>
                        <span className="border border-[var(--border-color)] bg-[var(--bg-panel)] px-3 py-1.5 rounded text-xs text-gray-600 flex items-center whitespace-nowrap cursor-pointer hover:border-gray-300 transition-colors shadow-sm">
                          <ImageIcon className="w-3.5 h-3.5 mr-1 text-rose-400" /> 贴纸 ▾
                        </span>
                     </div>
                   </div>
                 ))}
                 
                 <button className="w-full py-5 border border-dashed border-gray-300 rounded-[var(--radius-lg)] text-sm font-medium text-gray-600 hover:bg-[var(--bg-panel)] hover:border-blue-300 hover:text-[var(--color-primary)] transition-all flex justify-center items-center shadow-sm">
                   <Plus className="icon-sm mr-2" /> 新增镜头组
                 </button>
              </div>
           </div>
        </div>

        {/* Middle Column - 视频配置 */}
        <div className="w-[340px] bg-[var(--bg-panel)] border-l border-[var(--border-color)] flex flex-col pt-4 overflow-y-auto shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10 relative custom-scrollbar">
           <div className="px-5 pb-3">
              <h3 className="text-sm font-bold text-[var(--text-main)]">视频配置</h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">为整体效果进行统一配置</p>
           </div>
           
           <div className="px-5 space-y-2.5 pb-8">
              {[
                { label: '字幕与...', icon: Type, extra: <div className="flex space-x-1"><span className="text-[10px] bg-gray-100 text-[var(--text-main)] px-1.5 py-0.5 border border-gray-300 rounded">AI</span><span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 border border-[var(--border-color)] rounded">分组合眉</span></div>, action: '编辑' },
                { label: '配音声音', icon: Mic2, action: '添加' },
                { label: '音频设置', icon: Music, preview: '素材 1.00x', action: '编辑' },
                { label: '背景音乐', icon: Music, preview: '智能匹配音乐', action: '编辑' },
                { label: '转场设置', icon: Layers, action: '添加' },
                { label: '水印设置', icon: Shield, action: '添加' },
                { label: '滤镜设置', icon: ImageIcon, action: '添加' },
                { label: '特效设置', icon: Wand2, action: '添加' },
                { label: '视频质量', icon: Monitor, preview: '默认质量', action: '编辑' },
                { label: '背景设置', icon: FileText, action: '添加' },
                { label: '视频封面', icon: Camera, preview: '自动截取封面', action: '编辑' },
                { label: '二创去重', icon: Scissors, action: '添加' },
                { label: '画幅...', icon: Smartphone, preview: '9:16 / 1080x1920', action: '编辑' },
              ].map((cfg, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-[var(--border-color)] rounded-[var(--radius-lg)] hover:border-blue-300 hover:shadow-md cursor-pointer bg-[var(--bg-panel)] transition-all group">
                   <div className="flex items-center space-x-3">
                      <div className="icon-lg rounded-md bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                        <cfg.icon className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
                      </div>
                      <span className="text-[13px] font-bold text-gray-700">{cfg.label}</span>
                   </div>
                   <div className="flex items-center space-x-1.5">
                      {cfg.extra}
                      {cfg.preview && (
                        <span className="text-[11px] text-[var(--text-muted)] bg-gray-50 border border-[var(--border-color)] px-2 py-0.5 rounded inline-block truncate max-w-[85px]">{cfg.preview}</span>
                      )}
                      {cfg.action === '编辑' ? (
                         <button className="flex items-center text-[10px] font-medium text-gray-600 border border-[var(--border-color)] rounded px-2 py-1 bg-[var(--bg-panel)] hover:bg-gray-50 space-x-1 transition-colors">
                           <span className="mr-0.5">✏️</span>
                           <span>编辑 ▾</span>
                         </button>
                      ) : (
                         <button className="flex items-center text-[10px] font-medium text-gray-600 border border-[var(--border-color)] rounded px-2 py-1 bg-[var(--bg-panel)] hover:bg-gray-50 space-x-1 transition-colors">
                           <span>＋</span>
                           <span>添加 ▾</span>
                         </button>
                      )}
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Right Column - 配置预览 & 策略 */}
        <div className="w-[360px] bg-[var(--bg-panel)] border-l border-[var(--border-color)] flex flex-col p-5 overflow-y-auto space-y-[var(--spacing-lg)] shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-20 custom-scrollbar">
           {/* Preview */}
           <div className="bg-[var(--bg-panel)] rounded-[var(--radius-lg)] border border-[var(--border-color)] p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-3 flex items-center justify-between">
                 <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center">
                    <Eye className="icon-sm mr-1.5 text-[var(--text-muted)]" /> 配置预览
                 </h3>
                 <span className="text-[11px] text-[var(--text-muted)]">查看配置效果</span>
              </div>
              <div className="aspect-[9/16] bg-black rounded-lg relative flex items-center justify-center overflow-hidden shadow-inner group py-4">
                 <div className="flex flex-col items-center justify-center w-full h-full relative z-10">
                    <PlayCircle className="w-12 h-12 text-white/30 mb-2 group-hover:text-white/60 transition-colors duration-300" />
                    <span className="text-white/50 text-xs font-semibold tracking-wider">请添加素材</span>
                 </div>
                 <div className="absolute bottom-2 right-2 text-white/50 text-[10px] font-mono tracking-wider z-10">
                    00:00
                 </div>
              </div>
              
              <div className="mt-4 bg-gray-50 rounded-lg p-3 border border-[var(--border-color)] flex items-start space-x-2 text-[11px] text-[var(--text-muted)] leading-relaxed shadow-inner">
                 <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
                 <p>预览播放低像素视频，正式生成会产出高像素视频。模拟效果不展示转场、滤镜、背景和封面，这些效果会在最终成片中应用。</p>
              </div>
           </div>

           {/* AI Gen Strategy */}
           <div className="bg-[var(--bg-panel)] rounded-[var(--radius-lg)] border border-[var(--border-color)] p-4 shadow-sm relative transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center">
                    <Zap className="icon-sm mr-1.5 text-amber-500" /> 输出策略
                 </h3>
                 <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">重复风险 中</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mb-4 leading-relaxed">
                 手动指定提交条数，不主动优化组合差异。
              </p>

              <div className="flex space-x-1.5 bg-gray-50 p-1.5 rounded-lg mb-4 text-[12px] font-medium text-[var(--text-muted)] border border-[var(--border-color)]">
                 <button className="flex-1 py-1.5 bg-[var(--color-primary)] shadow border-blue-600 rounded-md text-white flex items-center justify-center font-bold transition-all">
                    <Sliders className="w-3 h-3 mr-1" /> 手动采样
                 </button>
                 <button className="flex-1 py-1.5 hover:bg-gray-200 rounded-md flex items-center justify-center transition-all">
                    <Sparkles className="w-3 h-3 mr-1" /> 智能采样
                 </button>
                 <button className="flex-1 py-1.5 hover:bg-gray-200 rounded-md flex items-center justify-center transition-all">
                    <Layers className="w-3 h-3 mr-1" /> 全部组合
                 </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                 <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100/50 flex flex-col items-center justify-center text-center">
                    <p className="text-[11px] text-[var(--text-muted)] mb-1">可用组合数</p>
                    <p className="text-xl font-black text-[var(--text-main)]">0 <span className="text-sm font-bold">个</span></p>
                 </div>
                 <div className="bg-[var(--bg-panel)] rounded-lg p-3 border border-[var(--border-color)] shadow-sm relative text-center">
                    <p className="text-[11px] text-[var(--text-muted)] mb-1">提交条数</p>
                    <input type="number" defaultValue="1" className="w-full text-xl font-black text-[var(--text-main)] bg-transparent outline-none text-center" />
                 </div>
                 <div className="bg-gray-50/80 rounded-lg p-3 border border-[var(--border-color)] flex flex-col justify-center text-center shadow-inner">
                    <p className="text-[11px] text-[var(--text-muted)] mb-1 flex items-center justify-center">
                       <Clock className="w-3 h-3 mr-1" /> 预计单视频时长
                    </p>
                    <p className="text-lg font-bold text-[var(--text-main)]">9 秒</p>
                 </div>
                 <div className="bg-gray-50/80 rounded-lg p-3 border border-[var(--border-color)] flex flex-col justify-center text-center shadow-inner">
                    <p className="text-[11px] text-[var(--text-muted)] mb-1">采样上限</p>
                    <p className="text-lg font-bold text-[var(--text-main)]">100 条</p>
                 </div>
              </div>

              <div className="bg-gray-50 p-2.5 rounded-lg border border-[var(--border-color)] mt-2 text-[11px] text-[var(--text-muted)] text-center flex items-center justify-center">
                 当前按手动数量提交，单次最大 100 条。
              </div>
           </div>

           {/* Cost */}
           <div className="bg-[#E8F0FE] rounded-[var(--radius-lg)] border border-blue-200 p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center">
                 <div className="icon-xl rounded-full bg-[var(--bg-panel)] flex items-center justify-center mr-3 shadow-sm border border-blue-100">
                    <CreditCard className="icon-sm text-[var(--text-main)]" />
                 </div>
                 <div>
                    <h3 className="text-[13px] font-bold text-[var(--text-main)]">预计费用</h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">20 积分/条 × 1 条</p>
                 </div>
              </div>
              <div className="text-xl font-black text-[var(--text-main)]">
                 20 积分
              </div>
           </div>

           {/* Schedule Publish */}
           <div className="bg-[var(--bg-panel)] rounded-[var(--radius-lg)] border border-[var(--border-color)] p-4 shadow-sm mb-[var(--spacing-xl)]">
              <div className="flex items-center justify-between mb-3">
                 <h3 className="text-[13px] font-bold text-[var(--text-main)] flex items-center">
                    <Calendar className="icon-sm mr-1.5 text-[var(--text-muted)]" /> 定时发布
                 </h3>
                 <div className="w-8 h-4 rounded-full bg-gray-200 relative cursor-pointer shadow-inner">
                    <div className="w-3 h-3 bg-[var(--bg-panel)] rounded-full absolute left-0.5 top-0.5 shadow-sm"></div>
                 </div>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] bg-gray-50 p-2 rounded-lg border border-[var(--border-color)]">
                 当前环境未接通定时发布链路，提交时会自动忽略排期时间。
              </p>
           </div>
        </div>

      </div>

      {showSubtitleDrawer && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay and Mobile Preview */}
          <div className="flex-1 bg-black/60 flex items-center justify-center flex-col relative z-0" onClick={() => setShowSubtitleDrawer(false)}>
            {/* Mobile Frame */}
            <div className="w-[320px] h-[640px] bg-black rounded-[40px] border-[10px] border-gray-900 shadow-2xl relative overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
               {/* UI Overlay for Douyin/TikTok */}
               <div className="absolute top-2 right-4 flex items-center space-x-1.5 text-white z-20">
                 <div className="w-4 h-2 bg-[var(--bg-panel)]/80 rounded-sm"></div>
                 <div className="w-4 h-2 bg-[var(--bg-panel)]/80 rounded-sm"></div>
                 <div className="w-5 h-2 bg-[var(--bg-panel)] rounded-sm"></div>
               </div>
               <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white/90 text-[10px] font-bold z-20">01:51</div>
               
               {/* Right vertical action bar */}
               <div className="absolute right-3 bottom-24 flex flex-col items-center space-y-[var(--spacing-md)] text-white z-20 drop-shadow-md">
                  <div className="relative">
                    <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="avatar" className="w-10 h-10 rounded-full border-2 border-white pointer-events-auto object-cover" />
                    <div className="absolute -bottom-2 right-1/2 translate-x-1/2 bg-rose-500 text-white rounded-full p-0.5 pointer-events-auto shadow-sm">
                      <Plus className="w-3 h-3" strokeWidth={3} />
                    </div>
                  </div>
                  <div className="flex flex-col items-center pointer-events-auto">
                    <Heart className="icon-xl text-white fill-white" />
                    <span className="text-[11px] font-bold mt-1">163</span>
                  </div>
                  <div className="flex flex-col items-center pointer-events-auto">
                    <MessageCircle className="icon-xl text-white fill-white" />
                    <span className="text-[11px] font-bold mt-1">129</span>
                  </div>
                  <div className="flex flex-col items-center pointer-events-auto">
                    <Star className="icon-xl text-white fill-white" />
                    <span className="text-[11px] font-bold mt-1">31</span>
                  </div>
                  <div className="flex flex-col items-center pointer-events-auto">
                    <Forward className="icon-xl text-white fill-white" />
                    <span className="text-[11px] font-bold mt-1">1586</span>
                  </div>
                  <div className="w-10 h-10 bg-gray-800 rounded-full border-4 border-gray-700 flex items-center justify-center mt-6 pointer-events-auto">
                    <Music className="icon-sm text-white" />
                  </div>
               </div>
               
               {/* Bottom Info text */}
               <div className="absolute bottom-4 left-4 right-16 z-20 drop-shadow-md">
                 <h4 className="text-white font-bold text-[15px] mb-1">@未名创作者</h4>
                 <p className="text-white/90 text-[14px] mt-1 leading-snug font-medium">这里展示你的视频描述 <span className="font-bold">#热门标签</span></p>
                 <div className="flex items-center mt-2 text-[12px] opacity-90">
                    <Music className="w-3.5 h-3.5 mr-1" /> 原声 - @未名创作者
                 </div>
               </div>
               
               <div className="flex-1 bg-gradient-to-b from-gray-800 to-gray-900 flex flex-col items-center justify-center relative">
                  {/* Fake video content */}
                  <img src="https://images.unsplash.com/photo-1555848962-6e79363ec58f?auto=format&fit=crop&q=80&w=800" className="absolute inset-0 w-full h-full object-cover opacity-60" alt="Video Background" />
                  
                  {/* Embedded Subtitle overlay */}
                  <div className="absolute bottom-32 left-0 right-0 px-4 text-center z-10 drop-shadow-lg">
                    {subtitleText ? (
                      <p className="text-white text-[16px] font-bold leading-normal whitespace-pre-wrap px-2 inline-block bg-black/40 backdrop-blur-sm rounded py-1" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>{subtitleText}</p>
                    ) : (
                       <p className="text-white text-[16px] font-bold leading-normal whitespace-pre-wrap px-2 inline-block bg-black/40 backdrop-blur-sm rounded py-1 opacity-50" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>预览字幕会显示在这里</p>
                    )}
                  </div>
               </div>
            </div>
            
            <button className="mt-8 bg-[var(--color-primary)] hover:bg-blue-700 transition-colors text-white px-6 py-2.5 rounded-full font-bold shadow-lg" onClick={(e) => { e.stopPropagation(); setShowSubtitleDrawer(false); }}>
               关闭抖音视图
            </button>
            
            <div className="text-center mt-6 text-white/70 text-[13px] leading-relaxed">
               <p>字幕、标题、花字与气泡在左侧独立预览，最终以阿里云混剪</p>
               <p>渲染结果为准。</p>
               <p className="mt-2 text-white font-medium">当前镜头组：{activeShotTitle}</p>
            </div>
          </div>

          {/* Right Drawer */}
          <div className="w-[640px] bg-[var(--bg-panel)] h-full shadow-[0_0_40px_rgba(0,0,0,0.1)] flex flex-col z-10 animate-in slide-in-from-right duration-300">
             <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-6 flex-shrink-0">
                <h3 className="font-bold text-[15px] text-[var(--text-main)]">添加字幕配音&标题 - {activeShotTitle}</h3>
                <button onClick={() => setShowSubtitleDrawer(false)} className="hover:bg-gray-100 p-1 rounded-full transition-colors"><X className="icon-md text-[var(--text-muted)]" /></button>
             </div>
             
             <div className="flex-1 overflow-y-auto bg-[#F5F6F8] p-[var(--spacing-lg)] space-y-[var(--spacing-lg)] flex flex-col relative">
                
                {/* Header controls (Prev/Next) */}
                <div className="flex items-center space-x-2">
                  <button className="px-3 py-1.5 border border-[var(--border-color)] rounded-md text-gray-400 bg-gray-50 cursor-not-allowed text-[12px] font-medium shadow-sm transition-colors"> &lt; 上一个镜头组</button>
                  <button className="px-3 py-1.5 border border-[var(--border-color)] rounded-md text-gray-700 bg-[var(--bg-panel)] hover:bg-gray-50 text-[12px] font-medium shadow-sm transition-colors">下一个镜头组 &gt; </button>
                </div>
                
                {/* 文案设置 Section */}
                <div>
                  <h4 className="font-bold text-[16px] text-[var(--text-main)] mb-4">文案设置</h4>
                  <div className="bg-[var(--bg-panel)] border text-sm border-[var(--border-color)] rounded-[var(--radius-lg)] shadow-sm mb-[var(--spacing-xl)] overflow-hidden">
                    <div className="flex border-b border-[var(--border-color)] px-2 pt-2 bg-gray-50/50">
                      <button className="px-5 py-2.5 border-b-2 border-blue-600 text-[var(--color-primary)] font-bold text-[13px] flex items-center bg-[var(--bg-panel)] rounded-t-lg">
                        <span className="text-xl text-blue-500 mr-1.5 uppercase font-serif pb-0.5" style={{fontFamily: 'serif'}}>A</span> 字幕设置
                      </button>
                      <button className="px-5 py-2.5 text-[var(--text-muted)] font-medium text-[13px] flex items-center hover:text-gray-700 transition-colors">
                        <span className="font-serif text-lg mr-1.5 pb-0.5" style={{fontFamily: 'serif'}}>Tt</span> 标题设置
                      </button>
                    </div>
                    
                    <div className="p-5 space-y-[var(--spacing-md)]">
                       <div className="bg-amber-50/50 border border-amber-100/50 p-3 rounded-lg flex items-start text-[11px] text-gray-600">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 mr-2 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-rose-600 font-bold mb-0.5">字幕转语音会消耗算力，按 100 字计费。</p>
                            <p>支持直接输入 SSML，客语音色支持 break、s、sub、w、phoneme、say-as 标签。</p>
                          </div>
                       </div>

                       <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                         <div className="bg-gray-50 px-4 py-3 border-b border-[var(--border-color)] flex justify-between items-center text-[12px]">
                           <span className="font-bold text-gray-700">添加字幕内容</span>
                           <span className="text-gray-400">如果添加了多组字幕和配音，将被平均分配给镜头组合</span>
                         </div>
                         <div className="p-4">
                           <div className="flex justify-between items-center mb-4">
                             <div className="flex space-x-2 text-[12px]">
                               <button className="px-3 py-1.5 bg-gray-100 text-[var(--text-main)] border border-gray-300 rounded-md font-bold transition-colors">手动设置字幕</button>
                               <button className="px-3 py-1.5 bg-[var(--bg-panel)] text-gray-600 border border-[var(--border-color)] rounded-md hover:bg-gray-50 transition-colors">音频生成字幕</button>
                             </div>
                             <div className="flex space-x-2 text-[12px]">
                               <button className="px-2.5 py-1 bg-[var(--bg-panel)] text-gray-600 border border-[var(--border-color)] rounded hover:bg-gray-50 shadow-sm transition-colors">重点词管理</button>
                               <button className="px-2.5 py-1 bg-[var(--bg-panel)] text-gray-600 border border-[var(--border-color)] rounded hover:bg-gray-50 shadow-sm transition-colors border-dashed">文案库选择</button>
                               <button className="px-2.5 py-1 bg-[var(--bg-panel)] text-gray-600 border border-[var(--border-color)] rounded hover:bg-gray-50 shadow-sm transition-colors flex items-center"><Sparkles className="w-3 h-3 mr-1 text-blue-500" /> 文案仿写</button>
                             </div>
                           </div>

                           <div className="border border-[var(--border-color)] rounded-lg bg-gray-50/50 p-4">
                              <div className="flex justify-between items-center mb-2 text-[11px]">
                                 <div className="flex items-center">
                                   <span className="font-bold text-[13px] text-[var(--text-main)]">字幕1</span>
                                   <span className="text-gray-400 ml-2">shift + enter 换行</span>
                                 </div>
                                 <div className="flex space-x-2">
                                   <button className="px-2 py-1 text-gray-600 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded hover:bg-gray-50 shadow-sm transition-colors">字幕特效设置</button>
                                   <button className="px-2 py-1 text-gray-600 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded hover:bg-gray-50 shadow-sm transition-colors">文案库导入</button>
                                   <button className="px-2 py-1 text-[var(--color-primary)] bg-blue-50 border border-blue-200 rounded shadow-sm transition-colors font-medium">风险检测</button>
                                   <button className="px-2 py-1 text-gray-400 bg-gray-50 border border-[var(--border-color)] rounded cursor-not-allowed">删除</button>
                                 </div>
                              </div>
                              <textarea 
                                value={subtitleText}
                                onChange={(e) => setSubtitleText(e.target.value)}
                                className="w-full h-32 p-3 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg outline-none focus:border-blue-400 text-[13px] resize-none shadow-sm transition-colors placeholder-gray-400" 
                                placeholder="请输入字幕文案..."
                              ></textarea>
                              <div className="flex justify-between items-center mt-3">
                                 <div className="text-[11px] text-gray-400">
                                    预计时长: {Math.max(0, subtitleText.length / 4).toFixed(1)} 秒 <br/>
                                    <span className="text-blue-500 mt-0.5 inline-block">{subtitleText.length}</span> / 2000
                                 </div>
                                 <div className="flex space-x-2 text-[12px]">
                                   <button className="px-3 py-1.5 bg-[var(--bg-panel)] text-gray-600 border border-[var(--border-color)] rounded-md hover:bg-gray-50 shadow-sm transition-colors">字幕库选择</button>
                                   <button className="px-3 py-1.5 bg-[var(--bg-panel)] text-gray-600 border border-[var(--border-color)] rounded-md hover:bg-gray-50 shadow-sm transition-colors flex items-center"><Sparkles className="w-3 h-3 mr-1 text-blue-500" /> 文案仿写</button>
                                 </div>
                              </div>
                           </div>
                         </div>

                         <div className="p-3 border-t border-[var(--border-color)] border-dashed bg-gray-50/50">
                           <button className="w-full py-2.5 bg-gray-50 text-[var(--text-main)] border border-dashed border-gray-300 rounded-lg text-[13px] font-bold flex justify-center items-center hover:bg-gray-100 transition-colors">
                              <Plus className="icon-sm mr-1" /> 添加字幕
                           </button>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>

                {/* 样式设置 Section */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-[16px] text-[var(--text-main)]">样式设置</h4>
                    <button className="text-[12px] px-3 py-1.5 border border-[var(--border-color)] bg-[var(--bg-panel)] rounded-md font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">视频字幕设置应用到全部镜头组</button>
                  </div>
                  <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] shadow-sm p-5 space-y-[var(--spacing-md)]">
                    <div className="flex justify-between items-center text-[12px]">
                      <span className="text-[var(--text-muted)] font-medium">我的字幕预设</span>
                      <button className="flex items-center text-gray-600 border border-[var(--border-color)] px-2 py-1 rounded bg-[var(--bg-panel)] hover:bg-gray-50 shadow-sm transition-colors"><Save className="w-3 h-3 mr-1 text-gray-400" /> 保存当前样式</button>
                    </div>
                    <p className="text-[12px] text-gray-400">暂无自定义预设，点击上方保存当前字幕样式</p>
                    
                    <div className="border-t border-[var(--border-color)] pt-5">
                      <div className="flex justify-between items-center mb-4 text-[12px]">
                        <span className="font-bold text-gray-700">创作中心字幕模板</span>
                        <span className="text-gray-400">7 个模板</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-[var(--spacing-md)] pb-12">
                         {/* 模板卡片 1 */}
                         <div className="border border-[var(--border-color)] rounded-lg overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group">
                           <div className="h-20 bg-slate-800 p-2 relative flex items-center justify-center">
                              <div className="absolute top-0 right-0 bg-black/40 text-white text-[10px] px-1.5 py-0.5 rounded-bl group-hover:bg-blue-500 transition-colors">预览</div>
                              <span className="absolute left-2 top-2 text-[8px] text-white/50 font-mono tracking-wider">SUBTITLE / SAFE</span>
                              <span className="text-white font-bold text-lg" style={{WebkitTextStroke: "1px black"}}>白字黑描边</span>
                           </div>
                           <div className="p-3 bg-[var(--bg-panel)]">
                             <h5 className="font-bold text-[12px] text-[var(--text-main)]">白字黑描边字幕</h5>
                             <p className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">最稳定的通用字幕样式，适配口播、讲解和资讯视频。</p>
                           </div>
                         </div>

                         {/* 模板卡片 2 */}
                         <div className="border border-[var(--border-color)] rounded-lg overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group">
                           <div className="h-20 bg-slate-900 p-2 relative flex flex-col items-center justify-center">
                              <div className="absolute top-0 right-0 bg-black/40 text-white text-[10px] px-1.5 py-0.5 rounded-bl group-hover:bg-blue-500 transition-colors">预览</div>
                              <span className="absolute left-2 top-2 text-[8px] text-white/50 font-mono tracking-wider">SUBTITLE / BOLD</span>
                              <span className="bg-gradient-to-b from-yellow-300 to-amber-500 text-black font-black text-[15px] px-1.5 py-0.5 shadow-sm rounded-sm">黄字强调</span>
                           </div>
                           <div className="p-3 bg-[var(--bg-panel)]">
                             <h5 className="font-bold text-[12px] text-[var(--text-main)]">黄字黑描边字幕</h5>
                             <p className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">适合电商带货、重点信息强调和情绪更强的讲解视频。</p>
                           </div>
                         </div>

                         {/* 模板卡片 3 */}
                         <div className="border border-[var(--border-color)] rounded-lg overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group">
                           <div className="h-20 bg-[#0F172A] p-2 relative flex items-center justify-center border-b border-blue-900/50">
                              <div className="absolute top-0 right-0 bg-black/40 text-white text-[10px] px-1.5 py-0.5 rounded-bl group-hover:bg-blue-500 transition-colors">预览</div>
                              <span className="absolute left-2 top-2 text-[8px] text-white/50 font-mono tracking-wider">SUBTITLE / TECH</span>
                              <span className="text-cyan-300 font-bold text-[16px] tracking-wide" style={{ textShadow: "0 0 8px rgba(34,211,238,0.6)" }}>蓝宇科技</span>
                           </div>
                           <div className="p-3 bg-[var(--bg-panel)]">
                             <h5 className="font-bold text-[12px] text-[var(--text-main)]">蓝宇科技字幕</h5>
                             <p className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">适合科技、工具和教程类内容的清爽字幕样式。</p>
                           </div>
                         </div>

                         {/* 模板卡片 4 */}
                         <div className="border border-[var(--border-color)] rounded-lg overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group">
                           <div className="h-20 bg-[#1E293B] p-2 relative flex items-center justify-center">
                              <div className="absolute top-0 right-0 bg-black/40 text-white text-[10px] px-1.5 py-0.5 rounded-bl group-hover:bg-blue-500 transition-colors">预览</div>
                              <span className="absolute left-2 top-2 text-[8px] text-white/50 font-mono tracking-wider">SUBTITLE / INFO</span>
                              <div className="bg-black/40 px-3 py-1.5 border-l-4 border-green-500 backdrop-blur-sm rounded-r-md">
                                 <span className="text-white font-medium text-[12px]">底部横幅</span>
                              </div>
                           </div>
                           <div className="p-3 bg-[var(--bg-panel)]">
                             <h5 className="font-bold text-[12px] text-[var(--text-main)]">底部横幅多行字幕</h5>
                             <p className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">适合横版访谈和教程，多行文本更稳定，信息承载量更高。</p>
                           </div>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

             </div>
          </div>
        </div>
      )}
    </div>
  );
}


function RemixMaterials() {
  const session = useSaasSession();
  const repositoryContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [materialStatus, setMaterialStatus] = useState<string | null>(null);

  const handleUploadMaterial = () => {
    const asset = createWorkspaceAsset({
      name: `remix-material-upload-${Date.now()}.mp4`,
      type: 'video',
      size: '12s source clip',
      source: 'uploaded',
      moduleId: 'remix_materials',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-city-traffic-at-night-11-large.mp4',
      previewUrl: 'https://assets.mixkit.co/videos/preview/mixkit-city-traffic-at-night-11-large.mp4',
      tags: ['remix', 'material', 'source-video'],
      metadata: {
        workflow: 'remix_material_upload',
        catalog: 'all_materials',
        durationSeconds: 12,
      },
    }, repositoryContext);
    createPricedWorkspaceUsageEvent({
      moduleId: 'remix_materials',
      pricingAction: 'automation',
      kind: 'automation',
      targetType: 'asset',
      targetId: asset.id,
      providerKind: 'mock',
      runtimeMode: 'web',
      metadata: {
        workflow: 'remix_material_upload',
        assetId: asset.id,
        assetType: asset.type,
      },
    }, repositoryContext);
    recordWorkspaceAssetExport({
      asset,
      moduleId: 'remix_materials',
      format: 'mp4',
      fileName: asset.name,
      sourceAction: 'export_material_record',
      metered: true,
      unitCount: 1,
      metadata: {
        pricingAction: 'export',
        kind: 'export',
        workflow: 'remix_material_upload',
      },
    }, {
      ...repositoryContext,
      session,
    });
    logAuditEvent({
      action: 'asset_create',
      moduleId: 'remix_materials',
      targetType: 'asset',
      targetId: asset.id,
      metadata: {
        workflow: 'remix_material_upload',
        assetType: asset.type,
      },
    }, { session });
    window.dispatchEvent(new Event('activity_logged'));
    setMaterialStatus('Material saved to workspace assets and usage recorded.');
  };

  return (
    <div className="p-[var(--spacing-xl)] space-y-[var(--spacing-lg)] max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2 mt-1">混剪素材库</h2>
          <p className="text-[var(--text-muted)] text-sm">统一管理视频、图片和音频素材，支持批量打标签与预处理。</p>
        </div>
        <div className="flex space-x-3">
          <button className="bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center">
            <Plus className="icon-sm mr-2" />
            新建目录
          </button>
          <button onClick={handleUploadMaterial} className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center">
            <Plus className="icon-sm mr-2" />
            上传素材
          </button>
        </div>
      </div>

      {materialStatus && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 shadow-sm">
          {materialStatus}
        </div>
      )}

      <div className="flex space-x-6 h-[600px] bg-[var(--bg-panel)] rounded-[var(--radius-xl)] shadow-sm border border-[var(--border-color)] overflow-hidden">
         {/* Left Sidebar catalogs */}
         <div className="w-64 border-r border-[var(--border-color)] bg-gray-50/50 flex flex-col">
            <div className="p-4 border-b border-[var(--border-color)]">
               <div className="relative">
                 <Search className="icon-sm absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                 <input type="text" placeholder="搜索目录..." className="w-full pl-9 pr-4 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:border-gray-900" />
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
               <div className="px-3 py-2 bg-gray-100 text-[var(--text-main)] font-bold text-sm rounded-lg flex items-center justify-between cursor-pointer">
                  <div className="flex items-center"><FolderIcon className="icon-sm mr-2" /> 全部素材</div>
                  <span className="text-xs bg-[var(--bg-panel)] text-[var(--text-main)] px-1.5 py-0.5 rounded shadow-sm">128</span>
               </div>
               <div className="px-3 py-2 text-gray-600 font-medium text-sm rounded-lg flex items-center justify-between hover:bg-gray-100 cursor-pointer">
                  <div className="flex items-center"><FolderIcon className="icon-sm mr-2" /> 城市风光</div>
                  <span className="text-xs text-gray-400">42</span>
               </div>
               <div className="px-3 py-2 text-gray-600 font-medium text-sm rounded-lg flex items-center justify-between hover:bg-gray-100 cursor-pointer">
                  <div className="flex items-center"><FolderIcon className="icon-sm mr-2" /> 科技产品特写</div>
                  <span className="text-xs text-gray-400">35</span>
               </div>
               <div className="px-3 py-2 text-gray-600 font-medium text-sm rounded-lg flex items-center justify-between hover:bg-gray-100 cursor-pointer">
                  <div className="flex items-center"><FolderIcon className="icon-sm mr-2" /> 人物情绪混剪</div>
                  <span className="text-xs text-gray-400">51</span>
               </div>
            </div>
         </div>
         
         {/* Right Main Area */}
         <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
               <div className="flex items-center space-x-2">
                  <button className="px-3 py-1.5 bg-gray-100 text-[var(--text-main)] text-sm font-medium rounded-md">全部 (128)</button>
                  <button className="px-3 py-1.5 hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-md flex items-center"><FileVideo className="icon-sm mr-1.5" />视频</button>
                  <button className="px-3 py-1.5 hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-md flex items-center"><ImageIcon className="icon-sm mr-1.5" />图片</button>
                  <button className="px-3 py-1.5 hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-md flex items-center"><Music className="icon-sm mr-1.5" />音频</button>
               </div>
               <button className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center">
                  <Filter className="icon-sm mr-1" /> 筛选与排序
               </button>
            </div>
            <div className="flex-1 p-5 overflow-y-auto w-full grid grid-cols-4 gap-[var(--spacing-md)] content-start custom-scrollbar">
               {[
                 { type: 'video', name: '夜景延时.mp4', time: '12s', img: '1555848962-6e79363ec58f' },
                 { type: 'video', name: '车流特写.mp4', time: '08s', img: '1513681434316-ccebc202861c' },
                 { type: 'image', name: '霓虹灯牌.jpg', time: '', img: '1563298723-dcfebaa392e3' },
                 { type: 'video', name: '无人机航拍.mp4', time: '20s', img: '1477959858617-67f8fb1777b5' },
                 { type: 'video', name: '人物剪影.mp4', time: '05s', img: '1515238152791-381dd00714eb' },
                 { type: 'audio', name: '动感节奏.mp3', time: '2:30', img: '' },
               ].map((item, i) => (
                 <div key={i} className="group relative rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border-color)] bg-gray-50 hover:shadow-md transition-all cursor-pointer">
                    <div className="aspect-video bg-gray-200 relative overflow-hidden flex items-center justify-center">
                       {item.type === 'audio' ? (
                         <Music className="w-10 h-10 text-gray-400" />
                       ) : (
                         <img src={`https://images.unsplash.com/photo-${item.img}?auto=format&fit=crop&q=80&w=300`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                       )}
                       {item.type === 'video' && (
                         <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 rounded font-medium">{item.time}</div>
                       )}
                       {item.type === 'audio' && (
                         <div className="absolute bottom-1 right-1 bg-gray-800 text-white text-[10px] px-1.5 rounded font-medium">{item.time}</div>
                       )}
                    </div>
                    <div className="p-3 bg-[var(--bg-panel)]">
                       <p className="text-sm font-bold text-[var(--text-main)] truncate">{item.name}</p>
                       <div className="flex space-x-1 mt-1.5">
                          <span className="text-[10px] bg-gray-100 text-[var(--text-muted)] px-1.5 py-0.5 rounded">未打标</span>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}

function RemixTitles() {
  const session = useSaasSession();
  const repositoryContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [titleStatus, setTitleStatus] = useState<string | null>(null);

  const handleSaveTitleTemplate = (template: { name: string; tag: string; preview: string }) => {
    const asset = createWorkspaceAsset({
      name: `remix-title-template-${Date.now()}.json`,
      type: 'text',
      size: `${template.preview.length} chars`,
      source: 'generated',
      moduleId: 'remix_titles',
      tags: ['remix', 'title-template', template.tag],
      metadata: {
        workflow: 'remix_title_template_save',
        templateName: template.name,
        tag: template.tag,
        preview: template.preview,
      },
    }, repositoryContext);
    createPricedWorkspaceUsageEvent({
      moduleId: 'remix_titles',
      pricingAction: 'automation',
      kind: 'automation',
      targetType: 'asset',
      targetId: asset.id,
      providerKind: 'mock',
      runtimeMode: 'web',
      metadata: {
        workflow: 'remix_title_template_save',
        assetId: asset.id,
        templateName: template.name,
      },
    }, repositoryContext);
    recordWorkspaceAssetExport({
      asset,
      moduleId: 'remix_titles',
      format: 'json',
      fileName: asset.name,
      sourceAction: 'export_title_template',
      metered: true,
      unitCount: 1,
      metadata: {
        pricingAction: 'export',
        kind: 'export',
        workflow: 'remix_title_template_save',
        templateName: template.name,
      },
    }, {
      ...repositoryContext,
      session,
    });
    logAuditEvent({
      action: 'asset_create',
      moduleId: 'remix_titles',
      targetType: 'asset',
      targetId: asset.id,
      metadata: {
        workflow: 'remix_title_template_save',
        templateName: template.name,
      },
    }, { session });
    window.dispatchEvent(new Event('activity_logged'));
    setTitleStatus('Title template saved to workspace assets.');
  };

  return (
    <div className="p-[var(--spacing-xl)] space-y-[var(--spacing-lg)] max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2 mt-1">标题模板 (花字)</h2>
          <p className="text-[var(--text-muted)] text-sm">丰富的动态特效花字、字幕板式供混剪视频使用。</p>
        </div>
      </div>

      <div className="flex items-center space-x-3 mb-[var(--spacing-md)]">
         <div className="px-4 py-1.5 bg-gray-100 text-[var(--text-main)] font-bold text-sm rounded-full cursor-pointer border border-gray-300 shadow-sm">全部风格</div>
         <div className="px-4 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-600 font-medium text-sm rounded-full cursor-pointer hover:bg-gray-50">综艺感</div>
         <div className="px-4 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-600 font-medium text-sm rounded-full cursor-pointer hover:bg-gray-50">高端大气</div>
         <div className="px-4 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-600 font-medium text-sm rounded-full cursor-pointer hover:bg-gray-50">赛博朋克</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)]">
         {[
           { name: '燃向·赛博冲击波', tag: '赛博朋克', preview: '⚡️ 震撼登场 / 突破极限' },
           { name: '综艺·气泡弹窗', tag: '综艺感', preview: '💭 真的假的？太夸张了吧！' },
           { name: '质感·电影片头', tag: '高端大气', preview: 'CHAPTER ONE // THE BEGINNING' },
           { name: '清新·手写字', tag: '治愈', preview: '📝 今天天气真好呀~' },
           { name: '新闻·跑马灯', tag: '纪实', preview: '▶ 突发新闻：全球最新动态追踪' },
           { name: '快闪·动感切割', tag: '卡点', preview: '1️⃣ 2️⃣ 3️⃣ GO!!' },
         ].map((tpl, i) => (
           <div key={i} onClick={() => handleSaveTitleTemplate(tpl)} className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between overflow-hidden cursor-pointer">
              <div className="aspect-[4/3] bg-gray-900 flex items-center justify-center p-[var(--spacing-lg)] relative">
                 <div className="text-center">
                    <p className="text-white font-black text-xl tracking-tight leading-tight transform -skew-x-6">{tpl.preview.split('/')[0]}</p>
                    {tpl.preview.includes('/') && <p className="text-cyan-400 font-bold text-sm mt-1">{tpl.preview.split('/')[1]}</p>}
                 </div>
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="bg-[var(--bg-panel)]/90 text-[var(--text-main)] font-bold text-xs px-4 py-2 rounded-lg shadow-lg">应用模板</button>
                 </div>
              </div>
              <div className="p-4 bg-[var(--bg-panel)] border-t border-[var(--border-color)]">
                 <h4 className="font-bold text-[var(--text-main)]">{tpl.name}</h4>
                 <div className="mt-2 text-xs bg-gray-100 text-gray-600 inline-block px-2 py-1 rounded font-medium">{tpl.tag}</div>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
}

function RemixTemplates() {
  const session = useSaasSession();
  const repositoryContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [templateStatus, setTemplateStatus] = useState<string | null>(null);

  const handleSaveVideoTemplate = (template: { name: string; style: string; shots: string; img: string }) => {
    const asset = createWorkspaceAsset({
      name: `remix-video-template-${Date.now()}.json`,
      type: 'document',
      size: 'template preset',
      source: 'generated',
      moduleId: 'remix_templates',
      previewUrl: `https://images.unsplash.com/photo-${template.img}?auto=format&fit=crop&q=80&w=600`,
      tags: ['remix', 'video-template', template.style],
      metadata: {
        workflow: 'remix_video_template_save',
        templateName: template.name,
        style: template.style,
        requiredShots: template.shots,
      },
    }, repositoryContext);
    createPricedWorkspaceUsageEvent({
      moduleId: 'remix_templates',
      pricingAction: 'automation',
      kind: 'automation',
      targetType: 'asset',
      targetId: asset.id,
      providerKind: 'mock',
      runtimeMode: 'web',
      metadata: {
        workflow: 'remix_video_template_save',
        assetId: asset.id,
        templateName: template.name,
      },
    }, repositoryContext);
    recordWorkspaceAssetExport({
      asset,
      moduleId: 'remix_templates',
      format: 'json',
      fileName: asset.name,
      sourceAction: 'export_video_template',
      metered: true,
      unitCount: 1,
      metadata: {
        pricingAction: 'export',
        kind: 'export',
        workflow: 'remix_video_template_save',
        templateName: template.name,
      },
    }, {
      ...repositoryContext,
      session,
    });
    logAuditEvent({
      action: 'asset_create',
      moduleId: 'remix_templates',
      targetType: 'asset',
      targetId: asset.id,
      metadata: {
        workflow: 'remix_video_template_save',
        templateName: template.name,
      },
    }, { session });
    window.dispatchEvent(new Event('activity_logged'));
    setTemplateStatus('Video template saved to workspace assets.');
  };

  return (
    <div className="p-[var(--spacing-xl)] space-y-[var(--spacing-lg)] max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2 mt-1">视频模板</h2>
          <p className="text-[var(--text-muted)] text-sm">一键套用的成熟混剪工程，包括转场、特效、调色、滤镜及预设音乐的完整时间线。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[var(--spacing-md)] md:grid-cols-3">
         {[
           { name: '史诗级风景旅拍', style: '16:9 / 恢弘卡点', shots: '需 8-12 段素材', img: '1469854523086-cc02fe5d8800' },
           { name: '活力运动燃向Vlog', style: '9:16 / 快节奏特效', shots: '需 15+ 段短素材', img: '1515238152791-381dd00714eb' },
           { name: '氛围感情绪人像系列', style: '9:16 / 慢放抒情', shots: '需 3-5 段长镜头', img: '1492633423735-8c08ef1caa8a' },
           { name: '高燃产品开箱展示', style: '16:9 / 科技感', shots: '需 6-8 段特写', img: '1505740420928-5e560c06d30e' },
         ].map((tpl, i) => (
           <div key={i} onClick={() => handleSaveVideoTemplate(tpl)} className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
              <div className="aspect-video bg-gray-200 relative">
                 <img src={`https://images.unsplash.com/photo-${tpl.img}?auto=format&fit=crop&q=80&w=600`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                 <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 bg-[var(--bg-panel)]/90 rounded-full flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
                       <Play className="icon-lg text-[var(--text-main)] ml-1" fill="currentColor" />
                    </div>
                 </div>
              </div>
              <div className="p-5 bg-[var(--bg-panel)]">
                 <h4 className="font-bold text-[var(--text-main)] text-lg">{tpl.name}</h4>
                 <div className="mt-3 flex space-x-2">
                    <span className="text-[11px] font-medium text-[var(--text-main)] bg-gray-100 px-2 py-1 rounded border border-[var(--border-color)]">{tpl.style}</span>
                    <span className="text-[11px] font-medium text-[var(--text-muted)] bg-gray-100 px-2 py-1 rounded">{tpl.shots}</span>
                 </div>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
}

function RemixViral() {
  const session = useSaasSession();
  const repositoryContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [sourceUrl, setSourceUrl] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);

  const handleAnalyzeViralClone = async () => {
    const targetUrl = sourceUrl.trim() || 'https://example.com/viral-short-video';
    const started = await startBillableGenerationJob({
      title: 'Viral clone structure analysis',
      prompt: `Analyze viral short video structure from ${targetUrl}`,
      status: 'running',
      providerKind: 'mock',
      runtimeMode: 'web',
      moduleId: 'remix_viral',
      progress: 0,
      metadata: {
        sourceUrl: targetUrl,
        workflow: 'remix_viral_clone_analysis',
      },
    }, repositoryContext, {
      workspaceId: session.workspace.id,
      plan: session.workspace.plan,
      pricing: buildBillableGenerationPricing('remix_viral'),
    });
    if (started.ok === false) {
      setAnalysisStatus(started.message);
      return;
    }
    const job = started.job;
    logAuditEvent({
      action: 'generation_job_start',
      moduleId: 'remix_viral',
      targetType: 'generation_job',
      targetId: job.id,
      metadata: {
        sourceUrl: targetUrl,
        workflow: 'remix_viral_clone_analysis',
      },
    }, { session });

    try {
      await updateGenerationJob(job.id, { status: 'succeeded', progress: 100 }, repositoryContext);
      const asset = createWorkspaceAsset({
      name: `viral-clone-structure-${Date.now()}.md`,
      type: 'text',
      size: 'viral analysis',
      source: 'generated',
      moduleId: 'remix_viral',
      generationJobId: job.id,
      tags: ['remix', 'viral-clone', 'analysis'],
      metadata: {
        sourceUrl: targetUrl,
        hook: 'first-three-second-contrast',
        shotCount: 8,
        bgmPattern: 'fast-cut-peak-drop',
        workflow: 'remix_viral_clone_analysis',
      },
    }, repositoryContext);
    createPricedWorkspaceUsageEvent({
      moduleId: 'remix_viral',
      pricingAction: 'generation',
      kind: 'generation',
      targetType: 'generation_job',
      targetId: job.id,
      providerKind: 'mock',
      runtimeMode: 'web',
      metadata: {
        sourceUrl: targetUrl,
        assetId: asset.id,
        workflow: 'remix_viral_clone_analysis',
      },
    }, repositoryContext);
    recordWorkspaceAssetExport({
      asset,
      moduleId: 'remix_viral',
      format: 'md',
      fileName: asset.name,
      sourceAction: 'export_viral_analysis',
      metered: true,
      unitCount: 1,
      metadata: {
        pricingAction: 'export',
        kind: 'export',
        workflow: 'remix_viral_clone_analysis',
        sourceUrl: targetUrl,
      },
    }, {
      ...repositoryContext,
      session,
    });
    const task = createWorkspaceTask({
      title: 'Produce remix from viral clone analysis',
      column: 'todo',
      priority: 'High',
      type: 'Remix',
      date: new Date().toISOString().slice(0, 10),
      isAuto: true,
      status: 'queued',
      metadata: {
        workflow: 'remix_viral_clone_analysis',
        generationJobId: job.id,
        analysisAssetId: asset.id,
        sourceUrl: targetUrl,
      },
    }, repositoryContext);
    logAuditEvent({
      action: 'generation_job_complete',
      moduleId: 'remix_viral',
      targetType: 'generation_job',
      targetId: job.id,
      metadata: {
        assetId: asset.id,
        sourceUrl: targetUrl,
      },
    }, { session });
    logAuditEvent({
      action: 'asset_create',
      moduleId: 'remix_viral',
      targetType: 'asset',
      targetId: asset.id,
      metadata: {
        generationJobId: job.id,
        sourceUrl: targetUrl,
      },
    }, { session });
    logAuditEvent({
      action: 'task_create',
      moduleId: 'remix_viral',
      targetType: 'task',
      targetId: task.id,
      metadata: {
        generationJobId: job.id,
        analysisAssetId: asset.id,
        sourceUrl: targetUrl,
      },
    }, { session });
    window.dispatchEvent(new Event('activity_logged'));
      setAnalysisStatus('Viral clone analysis saved and production task created.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Viral clone provider failed before returning analysis.';
      await failGenerationJob(job.id, {
        error: message,
        metadata: {
          sourceUrl: targetUrl,
          workflow: 'remix_viral_clone_analysis',
        },
      }, repositoryContext);
      logAuditEvent({
        action: 'generation_job_failed',
        moduleId: 'remix_viral',
        targetType: 'generation_job',
        targetId: job.id,
        metadata: {
          sourceUrl: targetUrl,
          workflow: 'remix_viral_clone_analysis',
          error: message,
        },
      }, { session });
      window.dispatchEvent(new Event('activity_logged'));
      setAnalysisStatus('Viral clone analysis failed. The job is saved for retry.');
    }
  };

  return (
    <div className="p-[var(--spacing-xl)] max-w-5xl mx-auto space-y-[var(--spacing-lg)]">
      <GenerationFailureRecoveryPanel moduleId="remix_viral" session={session} context={repositoryContext} />
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-[24px] p-[var(--spacing-xl)] text-white shadow-lg relative overflow-hidden">
        <Sparkles className="absolute -right-4 -top-4 w-32 h-32 opacity-20 transform rotate-12" />
        <h2 className="text-[var(--text-main)]xl font-black mb-2 relative z-10 tracking-tight">爆款视频一键复刻</h2>
        <p className="text-amber-100 text-sm max-w-xl relative z-10">输入对标的爆款视频链接，AI将自动提取文案、拆解镜头结构、分析情绪卡点，并使用您的素材库进行等效替换，快速生成具有二次爆款潜力的复刻视频。</p>
      </div>

      <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm p-[var(--spacing-xl)]">
         <div className="mb-[var(--spacing-md)]">
            <h3 className="font-bold text-[var(--text-main)] mb-2">第 1 步：导入对标对象</h3>
            <div className="flex space-x-3">
               <input type="text" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="粘贴抖音 / 小红书 / 视频号的视频链接..." className="flex-1 bg-gray-50 border border-[var(--border-color)] rounded-[var(--radius-lg)] px-4 py-3 text-sm focus:bg-[var(--bg-panel)] focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-all font-medium" />
               <button onClick={handleAnalyzeViralClone} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-[var(--radius-lg)] shadow-sm transition-colors">解析视频</button>
            </div>
            <div className="flex items-center space-x-4 mt-4 text-sm">
               <div className="text-[var(--text-muted)]">或手动上传参考视频：</div>
               <button className="flex items-center text-gray-700 bg-gray-50 hover:bg-gray-100 border border-[var(--border-color)] px-4 py-2 rounded-lg font-medium transition-colors">
                  <Film className="icon-sm mr-2 text-gray-400" /> 选择本地视频
               </button>
            </div>
         </div>
         
         <div className="border border-[var(--border-color)] bg-gray-50/50 rounded-[var(--radius-lg)] p-[var(--spacing-xl)] text-center mt-8">
            <ScanLine className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h4 className="font-bold text-[var(--text-muted)] text-sm">等待解析爆款视频...</h4>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">AI 将提取原视频的话术脚本、BGM 节奏和画面分镜，稍后您可以在编排面板中一键将其替换为您的私域资产。</p>
         </div>
      </div>
    </div>
  );
}

// Simple FolderIcon utility for this file
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
    </svg>
  );
}
