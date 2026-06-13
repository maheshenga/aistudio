import React, { useMemo, useState } from 'react';
import { Film, Play, Download, Wand2, Box, Sparkles, Video, Clapperboard, MonitorPlay, History, Activity, Share2, Scissors, Music, Layers, HardDrive, Maximize2 } from 'lucide-react';
import { useSaasSession } from '../saas/SaasAuthContext';
import { createGenerationJob, failGenerationJob, updateGenerationJob } from '../lib/data/generationJobRepository';
import { createWorkspaceAsset, recordWorkspaceAssetExport, type WorkspaceAsset } from '../lib/data/assetRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { createPricedWorkspaceUsageEvent } from '../lib/data/usageRepository';
import { FullscreenViewer } from './FullscreenViewer';
import { GenerationFailureRecoveryPanel } from './GenerationFailureRecoveryPanel';

const GENERATED_VIDEO_URL = 'https://videos.pexels.com/video-files/3121459/3121459-uhd_2560_1440_24fps.mp4';

export function VideoCreationView() {
  const session = useSaasSession();
  const jobContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultAsset, setResultAsset] = useState<WorkspaceAsset | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [activeModel, setActiveModel] = useState('Sora (Preview)');
  const [motionStrength, setMotionStrength] = useState(5);
  const [cameraMovement, setCameraMovement] = useState('平移推移');
  const [duration, setDuration] = useState('4s');

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setResult(null);
    setResultAsset(null);

    const job = createGenerationJob({
      title: `Video - ${activeModel}`,
      prompt: prompt.trim(),
      status: 'running',
      providerKind: 'mock',
      runtimeMode: 'web',
      moduleId: 'video',
      progress: 0,
      metadata: {
        activeModel,
        motionStrength,
        cameraMovement,
        duration,
      },
    }, jobContext);
    logAuditEvent({
      action: 'generation_job_start',
      moduleId: 'video',
      targetType: 'generation_job',
      targetId: job.id,
      metadata: {
        activeModel,
        motionStrength,
        cameraMovement,
        duration,
      },
    }, { session });

    try {
      updateGenerationJob(job.id, { status: 'succeeded', progress: 100 }, jobContext);
      const asset = createWorkspaceAsset({
        name: `video-${Date.now()}.mp4`,
        type: 'video',
        size: duration,
        source: 'generated',
        moduleId: 'video',
        generationJobId: job.id,
        url: GENERATED_VIDEO_URL,
        previewUrl: GENERATED_VIDEO_URL,
        tags: [activeModel, cameraMovement, duration],
        metadata: {
          prompt: prompt.trim(),
          activeModel,
          motionStrength,
          cameraMovement,
          duration,
        },
      }, jobContext);
      setResultAsset(asset);
      createPricedWorkspaceUsageEvent({
        moduleId: 'video',
        pricingAction: 'generation',
        kind: 'generation',
        targetType: 'generation_job',
        targetId: job.id,
        providerKind: 'mock',
        runtimeMode: 'web',
        metadata: {
          assetId: asset.id,
          assetType: asset.type,
          activeModel,
          duration,
          motionStrength,
        },
      }, jobContext);
      logAuditEvent({
        action: 'generation_job_complete',
        moduleId: 'video',
        targetType: 'generation_job',
        targetId: job.id,
        metadata: {
          generatedAsset: true,
          assetType: 'video',
          activeModel,
          duration,
        },
      }, { session });
      setResult(GENERATED_VIDEO_URL);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Video provider failed before returning an output.';
      failGenerationJob(job.id, {
        error: message,
        metadata: {
          activeModel,
          motionStrength,
          cameraMovement,
          duration,
        },
      }, jobContext);
      logAuditEvent({
        action: 'generation_job_failed',
        moduleId: 'video',
        targetType: 'generation_job',
        targetId: job.id,
        metadata: {
          activeModel,
          duration,
          error: message,
        },
      }, { session });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadResult = () => {
    if (!resultAsset) return;
    recordWorkspaceAssetExport({
      asset: resultAsset,
      moduleId: 'video',
      format: 'mp4',
      fileName: resultAsset.name,
      sourceAction: 'download_original',
      metered: true,
      unitCount: 1,
      metadata: {
        pricingAction: 'export',
        kind: 'export',
        activeModel,
        duration,
        motionStrength,
        cameraMovement,
      },
    }, {
      ...jobContext,
      session,
    });
    window.dispatchEvent(new Event('activity_logged'));
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#FDFDFE] animate-in fade-in duration-300">
      {/* Sidebar Tool panel */}
      <div className="w-[360px] bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 shrink-0">
        <div className="p-5 border-b border-[var(--border-color)] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-sm">
            <Film className="text-white icon-md" />
          </div>
          <div>
            <h2 className="text-[16px] font-black text-[var(--text-main)] tracking-tight">视频创作引擎</h2>
            <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest mt-0.5">Video Generation</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
          {/* Model Selection */}
          <div className="space-y-3">
            <label className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider flex items-center">
              <Box className="icon-sm mr-1.5 text-rose-500" /> 底层大模型
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['Sora (Preview)', 'Runway Gen-3', 'Pika 1.0', 'Kling AI'].map(m => (
                <button
                  key={m}
                  onClick={() => setActiveModel(m)}
                  className={`py-2 px-3 text-xs font-bold rounded-[var(--radius-lg)] border transition-all text-left ${
                    activeModel === m
                      ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm ring-1 ring-rose-500/10'
                      : 'bg-[var(--bg-panel)] border-[var(--border-color)] text-gray-600 hover:border-rose-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider flex items-center">
               <Video className="icon-sm mr-1.5 text-rose-500" /> 运镜模式
            </label>
            <div className="grid grid-cols-2 gap-2">
               {['固定机位', '平移推移', '环绕运镜', 'FPV 穿越机', '变焦拉伸', '智能随机'].map(s => (
                  <button
                    key={s}
                    onClick={() => setCameraMovement(s)}
                    className={`py-2 px-2 text-xs font-bold rounded-[var(--radius-lg)] border transition-all text-center ${
                      cameraMovement === s
                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                        : 'bg-[var(--bg-panel)] border-[var(--border-color)] text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {s}
                  </button>
               ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
               <label className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider flex items-center">
                 <Activity className="icon-sm mr-1.5 text-rose-500" /> 动作幅度强度
               </label>
               <span className="text-xs font-bold text-[var(--text-muted)]">{motionStrength}/10</span>
            </div>
            <input 
              type="range" 
              min="1" max="10" 
              value={motionStrength}
              onChange={(e) => setMotionStrength(parseInt(e.target.value))}
              className="w-full accent-rose-500"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-bold">
               <span>极其微小</span>
               <span>狂野剧烈</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center"><Clapperboard className="icon-sm mr-1.5 text-rose-500" /> 生成时长</span>
            </label>
            <div className="flex bg-[var(--bg-app)] rounded-[var(--radius-lg)] p-1 border border-[var(--border-color)] shadow-inner">
               {['4s', '8s', '12s (Pro)'].map(r => (
                  <button
                    key={r}
                    onClick={() => setDuration(r)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      duration === r
                        ? 'bg-[var(--bg-panel)] text-[var(--text-main)] shadow shadow-black/5'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {r}
                  </button>
               ))}
            </div>
          </div>
          
          <div className="space-y-3">
             <label className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center"><Sparkles className="icon-sm mr-1.5 text-rose-500" /> 电影级光影 (Lighting)</span>
             </label>
             <select className="w-full bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-sm transition-all cursor-pointer">
               <option>自动推理</option>
               <option>自然光 (Golden Hour) - 温暖柔和</option>
               <option>赛博朋克霓虹 (Neon) - 高反差色</option>
               <option>好莱坞冷色调 (Cinematic Blue)</option>
               <option>舞台聚光 (Spotlight) - 强化主体</option>
             </select>
          </div>

          {/* Cache Manager UI */}
          <div className="space-y-3 pt-6 border-t border-[var(--border-color)]">
            <label className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center"><HardDrive className="icon-sm mr-1.5 text-rose-500" /> 分段缓存管理 (大文件优化)</span>
              <span className="text-[10px] text-green-500 bg-green-50 px-2 py-0.5 rounded font-bold">已启用</span>
            </label>
            <div className="bg-gray-50 border border-[var(--border-color)] rounded-[var(--radius-lg)] p-3 space-y-2">
              <div className="flex justify-between items-center text-[11px] font-bold">
                <span className="text-[var(--text-muted)] flex items-center"><Layers className="w-3.5 h-3.5 mr-1" /> 实时切片缓存</span>
                <span className="text-[var(--text-main)]">3 / 8 chunks</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden flex">
                <div className="bg-rose-500 h-full w-[37.5%]"></div>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">在长视频生成中，系统将自动对视频进行分段切片缓存，若生成中断可实时从上一断点继续。</p>
            </div>
            
            <label className="flex items-center justify-between p-3 border border-[var(--border-color)] rounded-[var(--radius-lg)] mt-3 cursor-pointer group hover:bg-[var(--bg-panel)]">
               <span className="text-xs font-bold text-[var(--text-main)] group-hover:text-rose-600 transition-colors">开启 4K ProRes 增强</span>
               <input type="checkbox" className="w-4 h-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500" />
            </label>
          </div>

        </div>

        <div className="p-5 border-t border-[var(--border-color)] bg-[var(--bg-panel)]">
           <div className="mb-4">
             <GenerationFailureRecoveryPanel moduleId="video" session={session} context={jobContext} />
           </div>
           <textarea
             value={prompt}
             onChange={e => setPrompt(e.target.value)}
             placeholder="描述想要生成的视频画面，例如：一只戴着墨镜的金色猎犬正在霓虹闪烁的赛博朋克城市街道上散步..."
             className="w-full resize-none h-32 p-4 bg-gray-50/50 border-[1.5px] border-[var(--border-color)] rounded-[var(--radius-xl)] text-[14px] leading-relaxed focus:bg-[var(--bg-panel)] focus:ring-[4px] focus:ring-rose-500/10 focus:border-rose-500 outline-none placeholder-gray-400 transition-all font-medium mb-4"
           />
           <button
             onClick={handleGenerate}
             disabled={!prompt.trim() || isGenerating}
             className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:hover:bg-rose-600 text-white font-black text-[15px] tracking-wide py-4 rounded-[var(--radius-xl)] transition-all shadow-lg hover:shadow-rose-500/25 flex items-center justify-center transform hover:-translate-y-0.5 active:translate-y-0"
           >
             {isGenerating ? (
               <>
                 <div className="icon-sm border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                 视频渲染中...
               </>
             ) : (
               <>
                 <Wand2 className="icon-sm mr-2" />
                 生成动态视频 (约耗时 1 分钟)
               </>
             )}
           </button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col bg-[#F3F4F6] relative overflow-hidden">
        {/* Top Navbar in Canvas */}
        <div className="absolute top-4 right-4 z-20 flex space-x-2">
           <button className="bg-[var(--bg-panel)]/80 backdrop-blur border border-[var(--border-color)]/50 text-gray-700 px-4 py-2 rounded-[var(--radius-lg)] text-sm font-bold shadow-sm hover:bg-[var(--bg-panel)] transition-colors flex items-center">
             <History className="icon-sm mr-1.5" />
             创作历史
           </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-12">
           {result ? (
             <div className="relative group max-w-5xl max-h-full flex items-center justify-center w-full">
               <video src={result} autoPlay loop muted controls className="rounded-[32px] shadow-2xl max-h-[80vh] object-contain border-4 border-white/40 ring-1 ring-black/5" />
               <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => setIsFullscreen(true)} className="bg-[var(--bg-panel)] text-[var(--text-main)] p-2.5 rounded-[var(--radius-lg)] shadow hover:scale-105 transition-transform" title="全屏查看">
                   <Maximize2 className="icon-md" />
                 </button>
                 <button onClick={handleDownloadResult} className="bg-[var(--bg-panel)] text-[var(--text-main)] p-2.5 rounded-[var(--radius-lg)] shadow hover:scale-105 transition-transform" title="下载无水印原画">
                   <Download className="icon-md" />
                 </button>
                 <button className="bg-[var(--bg-panel)] text-[var(--text-main)] p-2.5 rounded-[var(--radius-lg)] shadow hover:scale-105 transition-transform" title="进入剪辑台">
                   <Scissors className="icon-md" />
                 </button>
               </div>
               
               <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  <button className="flex items-center bg-[var(--bg-panel)]/90 backdrop-blur shadow-lg px-4 py-2 rounded-[var(--radius-lg)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-panel)] border border-[var(--border-color)]">
                    <Music className="w-3.5 h-3.5 mr-1" />
                    配乐推荐
                  </button>
                  <button className="flex items-center bg-[var(--bg-panel)]/90 backdrop-blur shadow-lg px-4 py-2 rounded-[var(--radius-lg)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-panel)] border border-[var(--border-color)]">
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    一键延长 4s
                  </button>
               </div>
             </div>
           ) : isGenerating ? (
             <div className="flex flex-col items-center">
               <div className="w-16 h-16 relative mb-[var(--spacing-md)]">
                 <div className="w-16 h-16 rounded-[var(--radius-xl)] bg-rose-500/20 absolute inset-0 animate-ping"></div>
                 <div className="w-16 h-16 rounded-[var(--radius-xl)] bg-[var(--bg-panel)] shadow-xl flex items-center justify-center relative z-10">
                   <Film className="icon-xl text-rose-500 animate-pulse" />
                 </div>
               </div>
               <p className="text-[var(--text-main)] font-black text-xl mb-2">正在分配视频生成算力节点...</p>
               <p className="text-[var(--text-muted)] font-bold text-sm">模型: {activeModel} · 运镜: {cameraMovement} · 时长: {duration}</p>
             </div>
           ) : (
             <div className="text-center">
               <div className="w-20 h-20 bg-[var(--bg-panel)] shadow-sm border border-[var(--border-color)] rounded-[24px] flex items-center justify-center mx-auto mb-[var(--spacing-md)] transform -rotate-3 hover:rotate-0 transition-transform">
                 <MonitorPlay className="icon-xl text-gray-300" />
               </div>
               <h3 className="text-xl font-black text-[var(--text-main)] mb-2">好莱坞级的动态呈现</h3>
               <p className="text-[var(--text-muted)] font-medium max-w-sm mx-auto">配置左侧物理参数并提供分镜描述，突破物理界限生成高保真创意短片。</p>
             </div>
           )}
        </div>
      </div>
      {result && (
        <FullscreenViewer
          isOpen={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          mediaUrl={result}
          mediaType="video"
        />
      )}
    </div>
  );
}
