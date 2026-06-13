import React, { useState, useEffect, useMemo } from 'react';
import { ImagePlus, Eraser, Scissors, Replace, Maximize, Sparkles, Maximize2, Download, Undo, Redo, ZoomIn, ZoomOut, UploadCloud, Move, Palette, MousePointer2, Settings2, Hand, Wand2, Lightbulb, Image as ImageIcon, Brush, Type, Layers, Sticker, History } from 'lucide-react';
import { useSaasSession } from '../saas/SaasAuthContext';
import { createGenerationJob, updateGenerationJob } from '../lib/data/generationJobRepository';
import { createWorkspaceAsset } from '../lib/data/assetRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { createPricedWorkspaceUsageEvent } from '../lib/data/usageRepository';
import { FullscreenViewer } from './FullscreenViewer';

type Tool = 'select' | 'erase' | 'remove_bg' | 'expand' | 'style' | 'relight' | 'enhance' | 'inpaint' | 'text_fx' | 'blend' | 'replace_text' | 'mockup';

const TOOL_CATEGORIES = [
  {
    name: '基础',
    tools: ['select', 'remove_bg']
  },
  {
    name: '修图替换',
    tools: ['erase', 'inpaint', 'replace_text', 'mockup']
  },
  {
    name: 'AI 创意',
    tools: ['expand', 'style', 'text_fx']
  },
  {
    name: '光影画质',
    tools: ['relight', 'blend', 'enhance']
  }
];

const TOOLS: { id: Tool; name: string; icon: any; desc: string }[] = [
  { id: 'select', name: '选择移动', icon: MousePointer2, desc: '基础选择工具与图层移动' },
  { id: 'remove_bg', name: '智能换底', icon: Scissors, desc: '一键去除背景，生成白底图或AI场景' },
  { id: 'erase', name: '魔法消除', icon: Eraser, desc: '涂抹消除多余对象并自动填补背景' },
  { id: 'inpaint', name: '局部重绘', icon: Brush, desc: '圈选图像局部区域，提供提示词生成新物体或替换原物' },
  { id: 'replace_text', name: 'AI 改字', icon: Replace, desc: '自动识别图中文字，一键擦除或替换为新文字' },
  { id: 'mockup', name: '智能贴图', icon: Sticker, desc: '自动识别商品表面纹理并将Logo自适应贴合' },
  { id: 'expand', name: '创意扩图', icon: Maximize, desc: '智能分析原图尺寸并向外延伸补全画面' },
  { id: 'style', name: '风格重绘', icon: Palette, desc: '将商品图转为各种艺术或摄影风格' },
  { id: 'relight', name: '光影重塑', icon: Lightbulb, desc: '虚拟多光源调节，修复暗光和改变氛围' },
  { id: 'blend', name: '智能融合', icon: Layers, desc: '将多个图层或光影自然融合匹配' },
  { id: 'text_fx', name: 'AI艺术字', icon: Type, desc: '生成与商品完美融合的3D空间艺术字排版' },
  { id: 'enhance', name: '画质超分', icon: Sparkles, desc: '低分辨率商品图无损高清放大与细节增强' },
];

const SOURCE_IMAGE_URL = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1000';
const EDITED_IMAGE_URL = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1600';

export function ImageEditorView() {
  const session = useSaasSession();
  const repositoryContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [activeTool, setActiveTool] = useState<Tool>('remove_bg');
  const [hasImage, setHasImage] = useState(false);
  const [sourceImageAssetId, setSourceImageAssetId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  const handleUndo = () => showToast("已撤销步骤 (Undo)");
  const handleRedo = () => showToast("已重做步骤 (Redo)");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid if typing in inputs
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Tool specific states
  const [prompt, setPrompt] = useState('');
  const [brushSize, setBrushSize] = useState(20);
  const [bgMode, setBgMode] = useState<'transparent' | 'white' | 'scene' | 'color'>('transparent');
  const [bgColor, setBgColor] = useState('#F0F0F0');

  const dispatchActivityLogged = () => {
    window.dispatchEvent(new Event('activity_logged'));
  };

  const handleUpload = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const asset = createWorkspaceAsset({
        name: `image-edit-source-${Date.now()}.jpg`,
        type: 'image',
        size: 'uploaded image',
        source: 'uploaded',
        moduleId: 'ai_image_edit',
        url: SOURCE_IMAGE_URL,
        previewUrl: SOURCE_IMAGE_URL,
        tags: ['image-edit', 'source-image', activeTool],
        metadata: {
          operation: 'upload_source_image',
          activeTool,
        },
      }, repositoryContext);
      logAuditEvent({
        action: 'asset_create',
        moduleId: 'ai_image_edit',
        targetType: 'asset',
        targetId: asset.id,
        metadata: {
          assetType: 'image',
          source: 'uploaded',
          operation: 'upload_source_image',
          activeTool,
        },
      }, { session });
      setSourceImageAssetId(asset.id);
      setHasImage(true);
      dispatchActivityLogged();
      showToast('源图已保存到工作区资产库');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '上传素材保存失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyTool = () => {
    if (!hasImage || isProcessing) return;
    const tool = TOOLS.find(t => t.id === activeTool);
    if (!tool) return;
    const resolvedPrompt = prompt.trim() || tool.desc;
    let jobId: string | null = null;
    setIsProcessing(true);
    try {
      const job = createGenerationJob({
        title: `Image edit - ${tool.name}`,
        prompt: resolvedPrompt,
        status: 'running',
        providerKind: 'mock',
        runtimeMode: 'web',
        moduleId: 'ai_image_edit',
        agentId: 'image-editor-agent',
        progress: 30,
        metadata: {
          activeTool,
          toolName: tool.name,
          sourceImageAssetId,
          brushSize,
          bgMode,
          bgColor,
        },
      }, repositoryContext);
      jobId = job.id;
      logAuditEvent({
        action: 'generation_job_start',
        moduleId: 'ai_image_edit',
        targetType: 'generation_job',
        targetId: job.id,
        metadata: {
          activeTool,
          toolName: tool.name,
          sourceImageAssetId,
          brushSize,
          bgMode,
          bgColor,
        },
      }, { session });

      updateGenerationJob(job.id, {
        status: 'succeeded',
        progress: 100,
        metadata: {
          ...job.metadata,
          result: 'edited_image_asset',
        },
      }, repositoryContext);
      const asset = createWorkspaceAsset({
        name: `image-edit-${activeTool}-${Date.now()}.jpg`,
        type: 'image',
        size: 'edited image',
        source: 'generated',
        moduleId: 'ai_image_edit',
        generationJobId: job.id,
        url: EDITED_IMAGE_URL,
        previewUrl: EDITED_IMAGE_URL,
        tags: ['image-edit', activeTool, tool.name],
        metadata: {
          prompt: resolvedPrompt,
          activeTool,
          toolName: tool.name,
          sourceImageAssetId,
          brushSize,
          bgMode,
          bgColor,
        },
      }, repositoryContext);
      createPricedWorkspaceUsageEvent({
        moduleId: 'ai_image_edit',
        pricingAction: 'generation',
        kind: 'generation',
        targetType: 'generation_job',
        targetId: job.id,
        providerKind: 'mock',
        runtimeMode: 'web',
        metadata: {
          assetId: asset.id,
          assetType: asset.type,
          activeTool,
          toolName: tool.name,
          sourceImageAssetId,
        },
      }, repositoryContext);
      logAuditEvent({
        action: 'generation_job_complete',
        moduleId: 'ai_image_edit',
        targetType: 'generation_job',
        targetId: job.id,
        metadata: {
          assetId: asset.id,
          assetType: 'image',
          activeTool,
          toolName: tool.name,
        },
      }, { session });
      logAuditEvent({
        action: 'asset_create',
        moduleId: 'ai_image_edit',
        targetType: 'asset',
        targetId: asset.id,
        metadata: {
          generationJobId: job.id,
          assetType: 'image',
          source: 'generated',
          activeTool,
          toolName: tool.name,
        },
      }, { session });
      dispatchActivityLogged();
      showToast(`${tool.name}已应用，结果已保存到资产库`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '图像编辑任务失败';
      if (jobId) {
        updateGenerationJob(jobId, { status: 'failed', progress: 100, error: message }, repositoryContext);
        logAuditEvent({
          action: 'generation_job_failed',
          moduleId: 'ai_image_edit',
          targetType: 'generation_job',
          targetId: jobId,
          metadata: {
            activeTool,
            error: message,
          },
        }, { session });
        dispatchActivityLogged();
      }
      showToast(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] bg-[#FDFDFE] flex overflow-hidden">
      {/* Left Sidebar - Tool Menu */}
      <div className="w-[100px] border-r border-[var(--border-color)] bg-[var(--bg-panel)] flex flex-col items-center py-6 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] shrink-0 overflow-y-auto custom-scrollbar space-y-[var(--spacing-lg)]">
        
        {TOOL_CATEGORIES.map((cat, i) => (
          <div key={i} className="w-full px-2 flex flex-col items-center space-y-2">
            <div className="text-[10px] font-black text-gray-400/80 uppercase tracking-widest mb-1">{cat.name}</div>
            {cat.tools.map(toolId => {
              const tool = TOOLS.find(t => t.id === toolId)!;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`w-full py-2.5 px-1 rounded-[var(--radius-lg)] flex flex-col items-center justify-center transition-all group relative ${
                    activeTool === tool.id
                      ? 'bg-[var(--color-primary)] text-white shadow-md shadow-blue-600/20 -translate-y-0.5'
                      : 'text-[var(--text-muted)] hover:bg-gray-100/80 hover:text-[var(--text-main)] border border-transparent'
                  }`}
                  title={tool.name}
                >
                  <tool.icon className={`icon-md mb-1.5 transition-transform ${activeTool === tool.id ? 'stroke-[2px] scale-110' : 'group-hover:scale-110'}`} />
                  <span className={`text-[10px] font-bold text-center leading-tight whitespace-pre-wrap ${activeTool === tool.id ? 'text-white' : ''}`}>{tool.name.replace('AI ', 'AI\n')}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col relative bg-gray-50/50" style={{ backgroundImage: 'radial-gradient(circle, #e2e8f0 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}>
        {/* Canvas Toolbar */}
        <div className="h-14 bg-[var(--bg-panel)]/80 backdrop-blur-md border-b border-[var(--border-color)] flex items-center justify-between px-6 z-10 absolute top-0 left-0 right-0">
          <div className="flex items-center space-x-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button onClick={handleUndo} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-panel)] rounded-md transition-all shadow-sm">
                <Undo className="icon-sm" />
              </button>
              <button onClick={handleRedo} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-panel)] rounded-md transition-all">
                <Redo className="icon-sm" />
              </button>
            </div>
            <div className="w-px h-5 bg-gray-200 mx-2"></div>
            <div className="flex bg-gray-100 rounded-lg p-1 items-center">
              <button className="p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-panel)] rounded-md transition-all">
                <ZoomOut className="icon-sm" />
              </button>
              <span className="text-[12px] font-bold text-gray-600 px-3 min-w-[50px] text-center">100%</span>
              <button className="p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-panel)] rounded-md transition-all">
                <ZoomIn className="icon-sm" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
             <button onClick={() => setIsFullscreen(true)} className="flex items-center space-x-2 px-3 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg text-[13px] font-bold text-gray-600 hover:bg-blue-50 hover:text-[var(--color-primary)] hover:border-blue-200 transition-all shadow-sm">
               <Maximize2 className="icon-sm" />
               <span>全屏检视</span>
             </button>
             <button className="flex items-center space-x-2 px-4 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg text-[13px] font-bold text-gray-600 hover:border-gray-300 transition-all shadow-sm">
               <span>原图对比</span>
             </button>
             <button className="flex items-center space-x-2 px-4 py-1.5 bg-[var(--color-primary)] hover:bg-blue-700 text-white rounded-lg text-[13px] font-bold transition-all shadow-sm">
               <Download className="icon-sm" />
               <span>导出高清图</span>
             </button>
          </div>
        </div>

        {/* Canvas Workspace */}
        <div className="flex-1 flex flex-col relative pt-14 overflow-hidden">
          
          <div className="flex-1 flex items-center justify-center p-[var(--spacing-xl)] overflow-hidden relative">
            {!hasImage ? (
              <div 
                className="w-full max-w-2xl h-[400px] border-2 border-dashed border-gray-300 rounded-[var(--radius-xl)] flex flex-col items-center justify-center bg-[var(--bg-panel)] cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
                onClick={handleUpload}
              >
              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-[13px] font-bold text-gray-600">正在分析图像层级...</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <UploadCloud className="icon-xl" />
                  </div>
                  <h3 className="text-[16px] font-black text-[var(--text-main)] mb-2">拖拽商品图片至此 或 点击上传</h3>
                  <p className="text-[13px] text-[var(--text-muted)] font-medium">支持 JPG, PNG, WEBP格式，最高 20MB</p>
                  
                  <div className="mt-8 flex gap-3">
                    <div className="bg-gray-50 px-4 py-2 rounded-lg text-[12px] font-bold text-[var(--text-muted)] border border-[var(--border-color)] flex items-center">
                      <ImagePlus className="icon-sm mr-2" /> 尝试示例图1
                    </div>
                    <div className="bg-gray-50 px-4 py-2 rounded-lg text-[12px] font-bold text-[var(--text-muted)] border border-[var(--border-color)] flex items-center">
                      <ImagePlus className="icon-sm mr-2" /> 尝试示例图2
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="relative w-full max-w-[65vh] aspect-square bg-[var(--bg-panel)] rounded-[var(--radius-lg)] shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[var(--border-color)] overflow-hidden flex items-center justify-center group touch-none cursor-crosshair transform-gpu transition-shadow hover:shadow-[0_12px_45px_rgba(0,0,0,0.1)]">
              {/* Checkerboard pattern for transparency */}
              <div className="absolute inset-0 z-0 opacity-50" style={{ backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)', backgroundSize: '16px 16px', backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px' }}></div>
              
              {/* Mock Image Content */}
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                {isProcessing ? (
                   <div className="absolute inset-0 bg-[var(--bg-panel)]/70 backdrop-blur-sm z-20 flex flex-col items-center justify-center transition-all animate-in fade-in duration-300 rounded-lg">
                     <div className="relative">
                       <Wand2 className="w-12 h-12 text-[var(--color-primary)] animate-[bounce_2s_infinite]" />
                       <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                     </div>
                     <p className="mt-6 text-[14px] font-black text-blue-900 bg-[var(--bg-panel)] px-4 py-2 rounded-lg shadow-sm border border-blue-100">正在通过大模型进行智能编辑...</p>
                     <div className="w-48 h-1.5 bg-gray-200 rounded-full mt-4 overflow-hidden shadow-inner">
                       <div className="h-full bg-blue-500 rounded-full w-2/3 animate-pulse"></div>
                     </div>
                   </div>
                ) : (
                  <div className="relative w-4/5 h-4/5 group/canvas">
                     {/* Mock product image */}
                     <div className={`w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg shadow-sm flex items-center justify-center relative overflow-hidden transition-all duration-700 ${activeTool === 'remove_bg' && bgMode === 'transparent' ? 'bg-transparent shadow-none drop-shadow-2xl' : ''}`} style={{ backgroundColor: activeTool === 'remove_bg' ? (bgMode === 'color' ? bgColor : (bgMode === 'white' ? '#FFFFFF' : undefined)) : undefined }}>
                       {activeTool === 'remove_bg' && bgMode === 'scene' && (
                         <img src="https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&q=80&w=1000" alt="Scene" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                       )}
                       {activeTool !== 'remove_bg' && <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1000" alt="Product" className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-50" />}
                       
                       <ImageIcon className="w-32 h-32 text-gray-300 absolute" />
                       <h2 className={`text-[var(--text-main)]xl font-black text-gray-700 z-10 drop-shadow-md tracking-tight ${activeTool === 'remove_bg' && bgMode === 'scene' ? 'text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]' : ''}`}>Product</h2>
                     
                       {/* AI Text FX Overlay */}
                       {activeTool === 'text_fx' && prompt && (
                         <div className="absolute inset-x-0 bottom-1/4 flex justify-center z-20 pointer-events-none">
                            <span className="text-6xl font-black text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] tracking-tighter" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.2)' }}>{prompt}</span>
                         </div>
                       )}
                       
                       {/* Replace Text Overlay mock */}
                       {activeTool === 'replace_text' && (
                         <div className="absolute inset-x-0 bottom-1/4 flex justify-center z-20 group/text-box">
                            <div className="border border-emerald-500/50 bg-emerald-500/10 rounded p-4 transition-all relative cursor-pointer hover:bg-emerald-500/20 hover:border-emerald-400">
                              <span className="text-6xl font-black text-white/50 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] tracking-tighter mix-blend-overlay">SUMMER SALE</span>
                              <div className="absolute -top-3 -right-3 icon-lg bg-emerald-500 rounded-full shadow-sm flex items-center justify-center text-white opacity-0 group-hover/text-box:opacity-100 transition-opacity">
                                <Replace className="w-3 h-3" />
                              </div>
                            </div>
                         </div>
                       )}
                       
                       {/* Mockup Overlay */}
                       {activeTool === 'mockup' && (
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-2 border-dashed border-orange-500/70 bg-orange-500/10 rounded-[var(--radius-lg)] flex items-center justify-center cursor-move shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                            <div className="text-orange-500/80 font-bold text-[14px] flex flex-col items-center">
                               <Sticker className="icon-xl mb-2 opacity-80" />
                               <span>放置贴图区域</span>
                            </div>
                            {/* deform mesh grid decoration */}
                            <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-20">
                              {Array.from({length: 16}).map((_, i) => (
                                <div key={i} className="border border-orange-500/50"></div>
                              ))}
                            </div>
                          </div>
                       )}
                       
                       {/* Inpaint Overlay mock */}
                       {activeTool === 'inpaint' && (
                         <div className="absolute right-1/4 top-1/4 w-32 h-32 border-2 border-purple-500/50 border-dashed rounded-full bg-purple-500/10 flex items-center justify-center pointer-events-none">
                            <Brush className="icon-xl text-purple-500/50" />
                         </div>
                       )}
                     </div>
                     
                     {/* Selection Box overlay */}
                     {activeTool === 'select' && (
                       <div className="absolute inset-10 border-2 border-blue-500 border-dashed bg-blue-500/5 cursor-move opacity-0 group-hover/canvas:opacity-100 transition-opacity">
                         <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[var(--bg-panel)] border border-blue-500 rounded-sm shadow-sm hover:scale-125 cursor-nwse-resize"></div>
                         <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[var(--bg-panel)] border border-blue-500 rounded-sm shadow-sm hover:scale-125 cursor-nesw-resize"></div>
                         <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[var(--bg-panel)] border border-blue-500 rounded-sm shadow-sm hover:scale-125 cursor-nesw-resize"></div>
                         <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[var(--bg-panel)] border border-blue-500 rounded-sm shadow-sm hover:scale-125 cursor-nwse-resize"></div>
                       </div>
                     )}
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
          
          {/* History / Filmstrip */}
          {hasImage && (
            <div className="h-28 bg-[var(--bg-panel)]/80 backdrop-blur-md border-t border-[var(--border-color)] flex items-center px-6 overflow-x-auto shrink-0 z-10 space-x-3 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] custom-scrollbar">
               <div className="flex flex-col items-center justify-center h-20 px-3 bg-gray-50 border border-[var(--border-color)] border-dashed rounded-lg text-gray-400 mr-2 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer shrink-0">
                 <History className="icon-md mb-1" />
                 <span className="text-[10px] font-bold">历史版本</span>
               </div>
               
               <div className="h-20 w-20 rounded-lg border-[3px] border-blue-500 overflow-hidden shrink-0 relative cursor-pointer shadow-md shadow-blue-500/20">
                 <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=200" alt="H" className="w-full h-full object-cover" />
                 <div className="absolute top-1 right-1 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">当前</div>
               </div>
               <div className="h-20 w-20 rounded-lg border border-[var(--border-color)] overflow-hidden shrink-0 opacity-60 hover:opacity-100 cursor-pointer transition-all hover:border-blue-300 relative group text-left">
                 <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=200" alt="H" className="w-full h-full object-cover grayscale" />
                 <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/80 to-transparent"></div>
                 <div className="absolute bottom-1.5 left-2 text-white text-[10px] font-bold">创意扩图</div>
               </div>
               <div className="h-20 w-20 rounded-lg border border-[var(--border-color)] overflow-hidden shrink-0 opacity-60 hover:opacity-100 cursor-pointer transition-all hover:border-blue-300 relative group text-left">
                 <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=200" alt="H" className="w-full h-full object-cover grayscale" />
                 <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/80 to-transparent"></div>
                 <div className="absolute bottom-1.5 left-2 text-white text-[10px] font-bold flex items-center"><ImagePlus className="w-3 h-3 mr-1" />原图</div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Tool Properties */}
      {hasImage && (
        <div className="w-[340px] border-l border-[var(--border-color)] bg-[var(--bg-panel)] flex flex-col z-10 shadow-[-4px_0_24px_rgba(0,0,0,0.01)] shrink-0 animate-in slide-in-from-right-8 duration-500">
          <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-panel)]">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 text-[var(--color-primary)] rounded-lg">
                {TOOLS.find(t => t.id === activeTool)?.icon && React.createElement(TOOLS.find(t => t.id === activeTool)!.icon, { className: "icon-md" })}
              </div>
              <h2 className="text-[16px] font-black text-[var(--text-main)]">{TOOLS.find(t => t.id === activeTool)?.name}</h2>
            </div>
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <Settings2 className="icon-md" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-[var(--spacing-lg)] pb-24 relative">
            <p className="text-[12px] text-[var(--text-muted)] font-medium mb-[var(--spacing-md)] leading-relaxed bg-gray-50 p-3 rounded-lg border border-[var(--border-color)]">
              {TOOLS.find(t => t.id === activeTool)?.desc}
            </p>

            {activeTool === 'remove_bg' && (
              <div className="space-y-[var(--spacing-lg)] animate-in fade-in duration-300">
                <div className="space-y-3">
                  <span className="text-[13px] font-bold text-[var(--text-main)] block">生成背景效果</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setBgMode('transparent')} className={`py-2.5 rounded-lg text-[12px] font-bold transition-all ${bgMode === 'transparent' ? 'border-2 border-blue-600 bg-blue-50 text-blue-700' : 'border border-[var(--border-color)] bg-[var(--bg-panel)] text-gray-600 hover:border-gray-300'}`}>透明背景</button>
                    <button onClick={() => setBgMode('white')} className={`py-2.5 rounded-lg text-[12px] font-bold transition-all ${bgMode === 'white' ? 'border-2 border-blue-600 bg-blue-50 text-blue-700' : 'border border-[var(--border-color)] bg-[var(--bg-panel)] text-gray-600 hover:border-gray-300'}`}>纯白底图</button>
                    <button onClick={() => setBgMode('scene')} className={`py-2.5 rounded-lg text-[12px] font-bold transition-all ${bgMode === 'scene' ? 'border-2 border-blue-600 bg-blue-50 text-blue-700' : 'border border-[var(--border-color)] bg-[var(--bg-panel)] text-gray-600 hover:border-gray-300'}`}>AI 场景生成</button>
                    <button onClick={() => setBgMode('color')} className={`py-2.5 rounded-lg text-[12px] font-bold transition-all ${bgMode === 'color' ? 'border-2 border-blue-600 bg-blue-50 text-blue-700' : 'border border-[var(--border-color)] bg-[var(--bg-panel)] text-gray-600 hover:border-gray-300'}`}>摄影棚纯色</button>
                  </div>
                  
                  {bgMode === 'color' && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-[var(--radius-lg)] border border-[var(--border-color)] flex items-center space-x-3 animate-in fade-in zoom-in-95 duration-200">
                      <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="icon-xl rounded shrink-0 cursor-pointer border-none p-0 bg-transparent" />
                      <div className="flex-1">
                        <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-full text-[12px] font-bold text-gray-700 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded px-2 py-1 outline-none uppercase" />
                      </div>
                    </div>
                  )}
                  {bgMode === 'scene' && (
                    <div className="mt-3 animate-in fade-in zoom-in-95 duration-200">
                      <textarea 
                        placeholder="描述想要生成的场景，如：大理石质感桌面，阳光，绿植背景..."
                        className="w-full h-20 p-2 text-[12px] bg-gray-50 border border-[var(--border-color)] rounded-lg focus:bg-[var(--bg-panel)] focus:border-blue-500 outline-none resize-none transition-all leading-relaxed"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <span className="text-[13px] font-bold text-[var(--text-main)] block">边缘处理</span>
                  <div className="space-y-[var(--spacing-md)] px-1">
                     <div>
                       <div className="flex justify-between text-[11px] font-bold text-[var(--text-muted)] mb-1.5">
                         <span>羽化 (Feather)</span>
                         <span>2px</span>
                       </div>
                       <input type="range" className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg appearance-none" />
                     </div>
                     <div>
                       <div className="flex justify-between text-[11px] font-bold text-[var(--text-muted)] mb-1.5">
                         <span>阴影保留 (Shadows)</span>
                         <span>高</span>
                       </div>
                       <input type="range" defaultValue={80} className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg appearance-none" />
                     </div>
                  </div>
                </div>
              </div>
            )}

            {activeTool === 'erase' && (
              <div className="space-y-[var(--spacing-lg)] animate-in fade-in duration-300">
                <div className="bg-blue-50/50 p-4 rounded-[var(--radius-lg)] border border-blue-100 flex items-start space-x-3">
                  <Settings2 className="icon-md text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[13px] font-bold text-[var(--text-main)]">涂抹以消除</h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">使用画笔涂抹图像中不需要的人、物或瑕疵，AI 将自动智能生成背景填补。</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between text-[13px] font-bold text-[var(--text-main)] mb-2">
                    <span>画笔大小</span>
                    <span className="text-[var(--color-primary)]">{brushSize}px</span>
                  </div>
                  <input 
                    type="range" 
                    min={1} max={100} 
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full accent-blue-600 h-2 bg-gray-200 rounded-lg appearance-none mb-[var(--spacing-md)] cursor-ew-resize hover:bg-gray-300 transition-colors" 
                  />
                  <div className="flex justify-center">
                    <div className="bg-checkered p-4 rounded-lg bg-gray-100 border border-[var(--border-color)] relative w-full h-24 flex items-center justify-center overflow-hidden">
                       <div 
                         className="bg-blue-500/40 border border-blue-500 rounded-full" 
                         style={{ width: `${brushSize}px`, height: `${brushSize}px` }}
                       ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTool === 'expand' && (
              <div className="space-y-[var(--spacing-lg)] animate-in fade-in duration-300">
                <div className="space-y-3">
                  <span className="text-[13px] font-bold text-[var(--text-main)] block flex justify-between items-center">
                    提示词描述
                    <button 
                      onClick={() => setPrompt("右侧有一个复古咖啡桌，放着两杯拿铁，阳光从百叶窗投下斑驳的光影， cinematic lighting, 8k resolution, raw photo")}
                      className="text-[11px] text-[var(--color-primary)] hover:text-blue-700 font-bold flex items-center"
                    >
                      <Wand2 className="w-3 h-3 mr-1" />自动优化
                    </button>
                  </span>
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="描述延伸部分的画面，例如：右侧有一个木制复古咖啡桌，放着两杯拿铁，阳光从百叶窗透进来..."
                    className="w-full h-32 p-3 text-[13px] bg-gray-50 border border-[var(--border-color)] rounded-[var(--radius-lg)] focus:bg-[var(--bg-panel)] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none resize-none transition-all leading-relaxed"
                  />
                </div>
                
                <div className="space-y-3">
                  <span className="text-[13px] font-bold text-[var(--text-main)] block">扩展比例 (长宽比)</span>
                  <div className="grid grid-cols-4 gap-2">
                    {['1:1', '4:3', '16:9', '9:16'].map(ratio => (
                      <button key={ratio} className="py-2 border border-[var(--border-color)] rounded-lg text-[12px] font-bold text-gray-600 hover:bg-gray-50">{ratio}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTool === 'style' && (
              <div className="space-y-[var(--spacing-lg)] animate-in fade-in duration-300">
                <div className="space-y-3">
                  <span className="text-[13px] font-bold text-[var(--text-main)] block flex justify-between items-center">
                    艺术风格预设
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {['赛博朋克', '黏土动画', '水彩绘本', '极简线稿', '复古胶片', '3D 渲染'].map((styleName, idx) => (
                      <button 
                        key={styleName} 
                        onClick={() => setPrompt(`转换为${styleName}风格，高质量细节，8k分辨率`)}
                        className="py-3 px-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] text-[12px] font-bold text-gray-700 hover:border-blue-400 hover:bg-blue-50 transition-all text-center"
                      >
                         {styleName}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-2 my-4">
                  <div className="h-px bg-gray-200 flex-1"></div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">OR</span>
                  <div className="h-px bg-gray-200 flex-1"></div>
                </div>
                <div className="space-y-3">
                  <span className="text-[13px] font-bold text-[var(--text-main)] block flex justify-between items-center">
                    自定义提示词
                    <button 
                      onClick={() => setPrompt("赛博朋克风格体验，霓虹灯光效，夜晚街道，潮湿地面反射，高对比度，超现实虚幻引擎5渲染，8k高质量")}
                      className="text-[11px] text-[var(--color-primary)] hover:text-blue-700 font-bold flex items-center"
                    >
                      <Wand2 className="w-3 h-3 mr-1" />自动优化
                    </button>
                  </span>
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="例如：梵高星空风格，色彩丰富，厚涂质感..."
                    className="w-full h-24 p-3 text-[13px] bg-gray-50 border border-[var(--border-color)] rounded-[var(--radius-lg)] focus:bg-[var(--bg-panel)] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none resize-none transition-all leading-relaxed"
                  />
                </div>
                <div className="space-y-3">
                   <div className="flex justify-between text-[11px] font-bold text-[var(--text-muted)] mb-1.5">
                     <span>风格化强度</span>
                     <span>65%</span>
                   </div>
                   <input type="range" defaultValue={65} className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg appearance-none" />
                </div>
              </div>
            )}
            
            {activeTool === 'relight' && (
              <div className="space-y-[var(--spacing-lg)] animate-in fade-in duration-300">
                 <div className="relative h-40 bg-gray-900 rounded-[var(--radius-lg)] overflow-hidden cursor-crosshair">
                   <div className="absolute inset-0 flex relative border-2 border-transparent">
                      {/* Interactive light source dot */}
                      <div className="absolute top-[20%] left-[20%] icon-sm bg-[var(--bg-panel)] rounded-full shadow-[0_0_20px_10px_rgba(255,255,255,0.8)] border border-gray-300 z-10 cursor-pointer hover:scale-110 active:scale-95 transition-transform"></div>
                      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-black/80 mix-blend-overlay"></div>
                      <p className="text-gray-400 text-[10px] absolute bottom-2 right-2 font-medium">拖动调整主光源位置</p>
                   </div>
                 </div>
                 
                 <div className="space-y-[var(--spacing-md)]">
                   <div>
                     <div className="flex justify-between text-[11px] font-bold text-[var(--text-muted)] mb-1.5">
                       <span>光源强度</span><span>80%</span>
                     </div>
                     <input type="range" defaultValue="80" className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg appearance-none" />
                   </div>
                   <div>
                     <div className="flex justify-between text-[11px] font-bold text-[var(--text-muted)] mb-1.5">
                       <span>环境光平衡</span><span>50%</span>
                     </div>
                     <input type="range" defaultValue="50" className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg appearance-none" />
                   </div>
                 </div>
              </div>
            )}
            
            {activeTool === 'inpaint' && (
              <div className="space-y-[var(--spacing-lg)] animate-in fade-in duration-300">
                <div className="bg-blue-50/50 p-4 rounded-[var(--radius-lg)] border border-blue-100 flex items-start space-x-3">
                  <Brush className="icon-md text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[13px] font-bold text-[var(--text-main)]">选中区域并重绘</h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">使用画笔涂抹需要修改的区域，然后输入提示词描述你要添加或替换成什么物体。</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between text-[13px] font-bold text-[var(--text-main)] mb-2">
                    <span>画笔大小</span>
                    <span className="text-[var(--color-primary)]">{brushSize}px</span>
                  </div>
                  <input 
                    type="range" 
                    min={1} max={100} 
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full accent-blue-600 h-2 bg-gray-200 rounded-lg appearance-none mb-[var(--spacing-md)] cursor-ew-resize hover:bg-gray-300 transition-colors" 
                  />
                  <div className="flex justify-center">
                    <div className="bg-checkered p-4 rounded-lg bg-gray-100 border border-[var(--border-color)] relative w-full h-24 flex items-center justify-center overflow-hidden">
                       <div 
                         className="bg-purple-500/40 border border-purple-500 rounded-full" 
                         style={{ width: `${brushSize}px`, height: `${brushSize}px` }}
                       ></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[13px] font-bold text-[var(--text-main)] block flex justify-between items-center">
                    重绘提示词
                  </span>
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="例如：在这个位置放一盆绿植..."
                    className="w-full h-24 p-3 text-[13px] bg-gray-50 border border-[var(--border-color)] rounded-[var(--radius-lg)] focus:bg-[var(--bg-panel)] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none resize-none transition-all leading-relaxed"
                  />
                </div>
              </div>
            )}

            {activeTool === 'replace_text' && (
              <div className="space-y-[var(--spacing-lg)] animate-in fade-in duration-300">
                <div className="bg-emerald-50/50 p-4 rounded-[var(--radius-lg)] border border-emerald-100 flex items-start space-x-3">
                  <Replace className="icon-md text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[13px] font-bold text-[var(--text-main)]">自动文字识别与修改</h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">AI已自动识别图像中的文字，你可以选择擦除或替换为新文字，AI将保持原本的光影透视。</p>
                  </div>
                </div>

                <div className="space-y-[var(--spacing-md)] pt-2">
                  <span className="text-[13px] font-bold text-[var(--text-main)] block">
                    文字修改选项
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button className="py-2.5 rounded-lg border-2 border-emerald-600 bg-emerald-50 text-emerald-700 text-[12px] font-bold">替换文字</button>
                    <button className="py-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-gray-300 text-gray-600 text-[12px] font-bold">无痕擦除文字</button>
                  </div>
                  
                  <div className="space-y-3 pt-3">
                     <span className="text-[12px] font-bold text-gray-700 block">要替换的文字框 1:</span>
                     <div className="bg-gray-50 border border-[var(--border-color)] rounded-lg p-3 relative space-y-3">
                        <div className="flex gap-2 items-center">
                           <span className="text-[11px] text-gray-400 font-bold shrink-0 w-8 text-right">原字:</span>
                           <input type="text" readOnly value="SUMMER SALE" className="w-full bg-[var(--bg-panel)] text-[12px] font-bold text-gray-400 border border-[var(--border-color)] rounded px-2 py-1.5 outline-none" />
                        </div>
                        <div className="flex gap-2 items-center">
                           <span className="text-[11px] text-gray-400 font-bold shrink-0 w-8 text-right">新字:</span>
                           <input type="text" 
                             value={prompt}
                             onChange={e => setPrompt(e.target.value)}
                             placeholder="输入新文字 (例如: 秋季上新)" 
                             className="w-full bg-[var(--bg-panel)] text-[12px] font-bold text-[var(--text-main)] border border-emerald-400 ring-4 ring-emerald-500/10 rounded px-2 py-1.5 outline-none transition-all" 
                           />
                        </div>
                     </div>
                  </div>
                  
                  <div className="space-y-3 pt-3 border-t border-[var(--border-color)]">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input type="checkbox" defaultChecked className="icon-sm rounded text-emerald-600 border-gray-300 focus:ring-emerald-500" />
                      <span className="text-[12px] font-bold text-gray-700">严格保留原字体排版与材质</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input type="checkbox" defaultChecked className="icon-sm rounded text-emerald-600 border-gray-300 focus:ring-emerald-500" />
                      <span className="text-[12px] font-bold text-gray-700">自动排版与中英双语优化</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTool === 'mockup' && (
              <div className="space-y-[var(--spacing-lg)] animate-in fade-in duration-300">
                <div className="bg-orange-50/50 p-4 rounded-[var(--radius-lg)] border border-orange-100 flex items-start space-x-3">
                  <Sticker className="icon-md text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[13px] font-bold text-[var(--text-main)]">智能形变贴图</h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">上传Logo或图案，AI会自动解析表面物理结构(如衣服褶皱、瓶身弧度)并自然贴合。</p>
                  </div>
                </div>

                <div className="space-y-3 border-2 border-dashed border-gray-300 rounded-[var(--radius-lg)] p-[var(--spacing-lg)] flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 bg-[var(--bg-panel)] shadow-sm border border-[var(--border-color)] rounded-full flex items-center justify-center text-gray-400 group-hover:text-orange-500 group-hover:border-orange-200 transition-colors mb-3">
                    <UploadCloud className="icon-md" />
                  </div>
                  <span className="text-[13px] font-bold text-gray-700">上传贴图/Logo素材</span>
                  <span className="text-[11px] text-gray-400 mt-1">支持 PNG 透明背景图片</span>
                </div>

                <div className="space-y-[var(--spacing-md)] pt-4 border-t border-[var(--border-color)]">
                  <span className="text-[13px] font-bold text-[var(--text-main)] block">贴图材质匹配</span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button className="py-2 rounded-lg border-2 border-orange-500 bg-orange-50 text-orange-700 text-[11px] font-bold">自动推断</button>
                    <button className="py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-gray-300 text-gray-600 text-[11px] font-bold">棉麻织物</button>
                    <button className="py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-gray-300 text-gray-600 text-[11px] font-bold">亮面包装</button>
                    <button className="py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-gray-300 text-gray-600 text-[11px] font-bold">玻璃/透明光泽</button>
                    <button className="py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-gray-300 text-gray-600 text-[11px] font-bold">刺绣立体</button>
                    <button className="py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-gray-300 text-gray-600 text-[11px] font-bold">凹凸压印</button>
                  </div>
                </div>
                
                <div className="space-y-3 pt-3">
                  <div className="flex justify-between text-[11px] font-bold text-[var(--text-muted)] mb-1.5">
                    <span>贴图融合强度</span>
                    <span>90%</span>
                  </div>
                  <input type="range" defaultValue={90} className="w-full accent-orange-500 h-1.5 bg-gray-200 rounded-lg appearance-none" />
                </div>
              </div>
            )}

            {activeTool === 'text_fx' && (
              <div className="space-y-[var(--spacing-lg)] animate-in fade-in duration-300">
                <div className="space-y-3">
                  <span className="text-[13px] font-bold text-[var(--text-main)] block flex justify-between items-center">
                    文字内容
                  </span>
                  <input 
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="输入要生成的艺术字，例如：SUMMER"
                    className="w-full p-3 text-[13px] font-black tracking-widest bg-gray-50 border border-[var(--border-color)] rounded-[var(--radius-lg)] focus:bg-[var(--bg-panel)] focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-3">
                  <span className="text-[13px] font-bold text-[var(--text-main)] block flex justify-between items-center">
                    字体风格预设
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {['充气气球', '赛博霓虹', '3D液态金属', '毛绒材质', '水晶玻璃', '岩石雕刻'].map((styleName) => (
                      <button key={styleName} className="py-3 px-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] text-[12px] font-bold text-gray-700 hover:border-blue-400 hover:bg-blue-50 transition-all text-center">
                         {styleName}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                   <div className="flex justify-between text-[11px] font-bold text-[var(--text-muted)] mb-1.5">
                     <span>空间深度 (3D效果)</span>
                   </div>
                   <input type="range" defaultValue={80} className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg appearance-none" />
                </div>
              </div>
            )}
            
            {activeTool === 'blend' && (
              <div className="space-y-[var(--spacing-lg)] animate-in fade-in duration-300">
                <div className="space-y-[var(--spacing-md)]">
                  <span className="text-[13px] font-bold text-[var(--text-main)] block flex justify-between items-center">
                    图层融合参数
                  </span>
                  
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-[var(--text-muted)] mb-1.5">
                      <span>光照与阴影匹配度</span>
                    </div>
                    <input type="range" defaultValue={90} className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg appearance-none" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-[var(--text-muted)] mb-1.5">
                      <span>环境色透射</span>
                    </div>
                    <input type="range" defaultValue={75} className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg appearance-none" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-[var(--text-muted)] mb-1.5">
                      <span>边缘细节融合 (Feathering)</span>
                    </div>
                    <input type="range" defaultValue={60} className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg appearance-none" />
                  </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
                  <span className="text-[13px] font-bold text-[var(--text-main)] block">智能调整</span>
                  <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <input type="checkbox" defaultChecked className="icon-sm rounded text-[var(--color-primary)] border-gray-300 focus:ring-blue-500" />
                    <span className="text-[12px] font-bold text-gray-700">自动调整主图透视关系</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <input type="checkbox" defaultChecked className="icon-sm rounded text-[var(--color-primary)] border-gray-300 focus:ring-blue-500" />
                    <span className="text-[12px] font-bold text-gray-700">自动生成底部接触阴影</span>
                  </label>
                </div>
              </div>
            )}

            {activeTool === 'enhance' && (
              <div className="space-y-[var(--spacing-lg)] animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-3">
                   <button className="py-4 border-2 border-blue-600 bg-blue-50 rounded-[var(--radius-lg)] flex flex-col items-center justify-center text-blue-700">
                     <span className="text-xl font-black mb-1">2x</span>
                     <span className="text-[11px] font-bold opacity-80">超清放大</span>
                   </button>
                   <button className="py-4 border shadow-sm border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-gray-300 rounded-[var(--radius-lg)] flex flex-col items-center justify-center text-gray-600">
                     <span className="text-xl font-black mb-1">4x</span>
                     <span className="text-[11px] font-bold opacity-80">极致无损</span>
                   </button>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-[var(--radius-lg)] border border-[var(--border-color)] space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="icon-sm rounded text-[var(--color-primary)] border-gray-300 focus:ring-blue-500" />
                    <span className="text-[13px] font-bold text-gray-700">修复面部瑕疵</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="icon-sm rounded text-[var(--color-primary)] border-gray-300 focus:ring-blue-500" />
                    <span className="text-[13px] font-bold text-gray-700">色彩引擎增强</span>
                  </label>
                </div>
              </div>
            )}

          </div>

          <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-panel)] z-20">
            <button 
              onClick={handleApplyTool}
              disabled={isProcessing}
              className="w-full h-12 bg-gray-900 hover:bg-black disabled:opacity-70 disabled:cursor-not-allowed text-white text-[14px] font-bold rounded-[var(--radius-lg)] transition-all shadow-sm shadow-gray-900/20 flex items-center justify-center hover:scale-[1.02] active:scale-95"
            >
              {isProcessing ? (
                <>
                  <div className="icon-sm border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  AI 正在运算...
                </>
              ) : (
                <>
                  <Wand2 className="icon-sm mr-2" />
                  应用 {TOOLS.find(t => t.id === activeTool)?.name}
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      <div className={`fixed top-[var(--spacing-lg)] left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none ${toastMsg ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center">
           <Wand2 className="icon-sm mr-2" />
           {toastMsg}
        </div>
      </div>

      {/* Fullscreen Preview */}
      <FullscreenViewer
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        mediaUrl="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=2000"
        mediaType="image"
      />
    </div>
  );
}
