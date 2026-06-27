import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { PenTool, Wrench, BookType, Sparkles, Plus, Search, Tag, Copy, Share, Database, Layout, Loader2, Wand2, RefreshCw, Languages, FileText, CheckCircle2, ChevronRight, Hash, ArrowUpRight, Archive, Edit3, Trash2, X } from 'lucide-react';
import { useSessionAutoSave } from '../hooks/useSessionAutoSave';
import { useSaasSession } from '../saas/SaasAuthContext';
import { updateGenerationJob } from '../lib/data/generationJobRepository';
import { startBillableGenerationJob, resolveGenerationProviderKind } from '../lib/billing/billableGeneration';
import { generateText } from '../lib/billing/generationContent';
import { createWorkspaceAsset, recordWorkspaceAssetExport, type WorkspaceAsset } from '../lib/data/assetRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { createPricedWorkspaceUsageEvent } from '../lib/data/usageRepository';
import {
  loadWorkspaceKeywordLibraries,
  createWorkspaceKeywordLibrary,
  updateWorkspaceKeywordLibrary,
  archiveWorkspaceKeywordLibrary,
  searchWorkspaceKeywordLibraries,
  type WorkspaceKeywordLibrary,
  type WorkspaceKeywordLibraryStatus,
} from '../lib/data/keywordRepository';
import { toast } from './Toast';

interface CopywritingViewProps {
  moduleId: string;
}

export function CopywritingView({ moduleId }: CopywritingViewProps) {
  switch (moduleId) {
    case 'copywriting_create':
      return <CopywritingCreate />;
    case 'copywriting_tools':
      return <CopywritingTools />;
    case 'copywriting_keywords':
      return <CopywritingKeywords />;
    default:
      return <CopywritingCreate />;
  }
}

function CopywritingCreate() {
  const session = useSaasSession();
  const jobContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const { value: prompt, setValue: setPrompt, isSaving } = useSessionAutoSave('copywriting_prompt_draft', '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [resultAsset, setResultAsset] = useState<WorkspaceAsset | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeType, setActiveType] = useState('小红书种草');
  const [activeLength, setActiveLength] = useState('中篇');
  const [activeTone, setActiveTone] = useState('专业严谨');
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (activeType !== '电商产品详情' && !prompt.trim()) return;
    setIsGenerating(true);
    setResult('');
    setResultAsset(null);
    setGenerationError(null);

    const started = await startBillableGenerationJob({
      title: `Copywriting - ${activeType}`,
      prompt: prompt.trim() || activeType,
      status: 'running',
      providerKind: resolveGenerationProviderKind(),
      runtimeMode: 'web',
      moduleId: 'copywriting_create',
      progress: 0,
      metadata: {
        activeType,
        activeLength,
        activeTone,
      },
    }, jobContext, {
      workspaceId: session.workspace.id,
      plan: session.workspace.plan,
      pricing: { moduleId: 'copywriting_create', pricingAction: 'generation', providerKind: resolveGenerationProviderKind(), runtimeMode: 'web' },
    });
    if (started.ok === false) {
      setGenerationError(started.message);
      setIsGenerating(false);
      return;
    }
    const job = started.job;
    logAuditEvent({
      action: 'generation_job_start',
      moduleId: 'copywriting_create',
      targetType: 'generation_job',
      targetId: job.id,
      metadata: {
        activeType,
        activeLength,
        activeTone,
      },
    }, { session });

    const mockCopy = activeType === '电商产品详情'
      ? `🔥 爆款电商详情页策划案\n\n【模块一：首屏吸睛 (头图区)】\n视觉建议：大特写展示产品质感，配以加粗标题“定义全新体验”。\n文案：不只是[商品名]，更是生活方式的升级。一键开启，享受真正的静谧空间。\n\n【模块二：直击痛点 (痛点区)】\n文案：你还在忍受这些困扰吗？（配以嘈杂环境、电量焦虑、佩戴不适的图文比对）。是时候对妥协说不了！\n\n【模块三：硬核卖点 (参数区)】\n文案：四大核心科技，重塑行业标杆。\n1. 行业领先技术：实力摆在这里，不惧对比。\n2. 极致续航表现：告别电量焦虑，随时在线。\n3. 人体工学设计：久戴不痛，宛若无物。\n\n【模块四：权威背书与买家秀】\n文案：口碑见证，超过 100,000+ 用户的共同选择...`
      : `🔥 熬夜狂欢后的护肤救星来啦！✨\n\n经常加班熬夜的打工人，是不是总觉得脸部暗沉、细纹悄悄爬上眼角？😱 今天给大家按头安利这款【夜间修护视黄醇精华】！\n\n✅ 核心卖点划重点：\n1️⃣ **温和不刺激**：专为敏感肌研发的微囊包裹技术，不用建立耐受也能轻松上脸！\n2️⃣ **抗老淡纹**：高浓度纯净视黄醇，直击干纹细纹，让肌肤重回弹润嘭嘭肌。💦\n3️⃣ **水润修护**：复配神经酰胺与玻尿酸，抗老同时不忘修护肌肤屏障。\n\n💡 使用感受：\n质地像牛奶一样丝滑，上脸嗖的一下就吸收了，一点也不油腻！隔天起床皮肤真的亮了一个度，透出那种健康的光泽感，绝绝子！😭\n\n🛒 还在等什么？趁着活动赶紧囤起来，做办公室里最亮的崽！💃\n\n#抗初老 #视黄醇精华 #熬夜党必备 #温和抗老 #好物分享 #平价精华`;

    // AIGEN-1/AIGEN-3: real generation when a provider is configured; the mock
    // template is the safe fallback (and what 'mock' mode always returns).
    const generated = await generateText({
      workspaceId: session.workspace.id,
      moduleId: 'copywriting_create',
      prompt: prompt.trim() || activeType,
      mockFallback: mockCopy,
      metadata: { activeType, activeLength, activeTone },
    });
    const generatedCopy = generated.text;

    await updateGenerationJob(job.id, { status: 'succeeded', progress: 100 }, jobContext);
    const asset = createWorkspaceAsset({
      name: `${activeType}-${Date.now()}.txt`,
      type: 'text',
      size: `${generatedCopy.length} chars`,
      source: 'generated',
      moduleId: 'copywriting_create',
      generationJobId: job.id,
      tags: [activeType, activeLength, activeTone],
      metadata: {
        prompt: prompt.trim(),
        activeType,
        activeLength,
        activeTone,
        contentPreview: generatedCopy.slice(0, 120),
      },
    }, jobContext);
    setResultAsset(asset);
    createPricedWorkspaceUsageEvent({
      moduleId: 'copywriting_create',
      pricingAction: 'generation',
      kind: 'generation',
      targetType: 'generation_job',
      targetId: job.id,
      providerKind: resolveGenerationProviderKind(),
      runtimeMode: 'web',
      metadata: {
        assetId: asset.id,
        assetType: asset.type,
        activeType,
        activeLength,
        activeTone,
        characterCount: generatedCopy.length,
      },
    }, jobContext);
    logAuditEvent({
      action: 'generation_job_complete',
      moduleId: 'copywriting_create',
      targetType: 'generation_job',
      targetId: job.id,
      metadata: {
        assetType: 'text',
        activeType,
        length: generatedCopy.length,
      },
    }, { session });
    setResult(generatedCopy);
    setIsGenerating(false);
    toast('Copy generated and saved to workspace assets', 'success');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    if (resultAsset) {
      recordWorkspaceAssetExport({
        asset: resultAsset,
        moduleId: 'copywriting_create',
        format: 'clipboard',
        fileName: `${activeType}.txt`,
        sourceAction: 'copy_to_clipboard',
        metered: false,
        metadata: {
          pricingAction: 'export',
          kind: 'export',
          activeType,
          activeLength,
          activeTone,
          characterCount: result.length,
        },
      }, {
        ...jobContext,
        session,
      });
      window.dispatchEvent(new Event('activity_logged'));
    }
    setCopySuccess(true);
    toast('Text copied to clipboard', 'success');
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleShare = () => {
    if (!resultAsset) return;
    recordWorkspaceAssetExport({
      asset: resultAsset,
      moduleId: 'copywriting_create',
      format: 'txt',
      fileName: resultAsset.name,
      sourceAction: 'share_copy_asset',
      metered: true,
      unitCount: 1,
      metadata: {
        pricingAction: 'export',
        kind: 'export',
        activeType,
        activeLength,
        activeTone,
        characterCount: result.length,
      },
    }, {
      ...jobContext,
      session,
    });
    window.dispatchEvent(new Event('activity_logged'));
    toast('Copy export recorded for sharing', 'success');
  };

  const enhancePrompt = () => {
    setPrompt(prompt + " 请包含至少3个使用场景，并给出具体的受众痛点分析。");
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] animate-in fade-in duration-300">
      {/* Left Sidebar Config */}
      <div className="w-[380px] bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col flex-shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)] bg-[var(--bg-panel)] sticky top-0 z-20 shadow-sm">
           <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
                 <PenTool className="icon-md" />
              </div>
              <div>
                <h3 className="text-[16px] font-black text-[var(--text-main)] tracking-tight flex items-center">
                  智能文案写作 Agent
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-2"></span>
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em] mt-0.5">
                  Copywriting Swarm {isSaving && <span className="text-blue-500 ml-2 animate-pulse">(Saving draft...)</span>}
                </p>
              </div>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-[var(--spacing-lg)] space-y-8 custom-scrollbar bg-[#FDFDFE]">
           {/* Section 1 */}
           <div className="space-y-3">
             <label className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-wider flex items-center">
               <Hash className="icon-sm mr-1.5 text-blue-500" /> 创作场景模板
             </label>
             <div className="grid grid-cols-2 gap-2 text-sm">
               {['小红书种草', '短视频口播脚本', '朋友圈营销', '微信公众号推文', '电商产品详情', '新闻公关稿件'].map(type => (
                 <button 
                    key={type}
                    onClick={() => setActiveType(type)}
                    className={`py-2.5 px-3 rounded-[var(--radius-lg)] border text-xs font-bold transition-all text-left ${
                      activeType === type 
                        ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm ring-1 ring-blue-500/10' 
                        : 'bg-[var(--bg-panel)] border-[var(--border-color)] text-gray-600 hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                   {type}
                 </button>
               ))}
             </div>
           </div>

           <div className="space-y-3">
             <label className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-wider flex items-center">
               <Languages className="icon-sm mr-1.5 text-blue-500" /> 目标语种设置
             </label>
             <select className="w-full bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] px-4 py-2.5 text-[13px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
               <option>默认 (跟随系统 - 简体中文)</option>
               <option>英文 (English - US)</option>
               <option>日文 (Japanese)</option>
               <option>繁体中文 (繁體中文)</option>
               <option>韩文 (Korean)</option>
             </select>
           </div>

           {/* Section 1.5 - LLM Configuration */}
           <div className="space-y-3">
             <label className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-wider flex items-center justify-between">
               <span className="flex items-center"><Database className="icon-sm mr-1.5 text-blue-500" /> 选择驱动模型</span>
               <span className="text-[10px] bg-blue-50 text-[var(--color-primary)] px-2 py-0.5 rounded font-bold border border-blue-100">PRO</span>
             </label>
             <select className="w-full text-sm py-2.5 px-3 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none focus:border-blue-500 font-bold text-gray-700 bg-[var(--bg-panel)] hover:bg-gray-50 transition-colors shadow-sm appearance-none cursor-pointer">
                <option>Gemini 1.5 Pro (推荐/深度逻辑)</option>
                <option>Gemini 1.5 Flash (极速产出)</option>
                <option>Claude 3 Opus (泛化文学)</option>
                <option>GPT-4o (通用均衡)</option>
             </select>
           </div>

           {/* Section 2 */}
           <div className="space-y-3">
             <div className="flex justify-between items-end">
               <label className="text-[13px] font-black text-[var(--text-main)] uppercase tracking-wider flex items-center">
                 <FileText className="icon-sm mr-1.5 text-blue-500" /> 核心信息投喂
               </label>
               <button onClick={enhancePrompt} className="text-xs text-[var(--color-primary)] font-bold hover:bg-blue-50 px-2 py-1 rounded-md transition-colors flex items-center">
                 <Wand2 className="w-3 h-3 mr-1" /> 魔法润色
               </button>
             </div>
             
             {activeType === '电商产品详情' ? (
               <div className="space-y-3 bg-gray-50 p-4 rounded-[var(--radius-xl)] border border-[var(--border-color)]">
                 <div>
                   <label className="text-[11px] font-bold text-gray-600 mb-1 block">商品名称</label>
                   <input type="text" className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-sm outline-none focus:border-blue-500 shadow-sm" placeholder="例如: 智能降噪蓝牙耳机" />
                 </div>
                 <div>
                   <label className="text-[11px] font-bold text-gray-600 mb-1 block">适用人群与痛点</label>
                   <input type="text" className="w-full px-4 py-3 border-[1.5px] border-[var(--border-color)] rounded-[var(--radius-xl)] text-[14px] font-medium outline-none focus:ring-[4px] focus:ring-blue-500/10 focus:border-blue-500 shadow-sm transition-all bg-gray-50/50" placeholder="例如: 学生党/通勤族，解决环境嘈杂听不清的问题" />
                 </div>
                 <div>
                   <label className="text-[11px] font-bold text-gray-600 mb-1 block">核心参数/卖点</label>
                   <textarea rows={3} className="w-full px-4 py-3 border-[1.5px] border-[var(--border-color)] rounded-[var(--radius-xl)] text-[14px] font-medium outline-none focus:ring-[4px] focus:ring-blue-500/10 focus:border-blue-500 custom-scrollbar resize-none shadow-sm transition-all bg-gray-50/50" placeholder="例如: 40dB深度降噪, 50小时续航, 空间音频" />
                 </div>
               </div>
             ) : (
               <div className="relative">
                 <textarea 
                   className="w-full h-36 px-4 py-3 border-[1.5px] border-[var(--border-color)] rounded-[var(--radius-xl)] text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 resize-none transition-all custom-scrollbar bg-[var(--bg-panel)] shadow-sm"
                   placeholder="输入产品的核心卖点、受众特征或想要表达的主题。&#10;列如：一款主打抗老的视黄醇精华，适合熬夜加班族，核心卖点是温和不刺激..."
                   value={prompt}
                   onChange={(e) => setPrompt(e.target.value)}
                 />
               </div>
             )}
           </div>

           {/* Section 3 & 4 Grid */}
           <div className="grid grid-cols-2 gap-[var(--spacing-md)]">
             <div className="space-y-3">
               <label className="text-xs font-black text-[var(--text-main)] uppercase">语气风格</label>
               <select 
                  value={activeTone} 
                  onChange={(e) => setActiveTone(e.target.value)}
                  className="w-full h-10 px-3 border border-[var(--border-color)] bg-[var(--bg-panel)] rounded-[var(--radius-lg)] text-sm font-bold text-gray-700 outline-none focus:border-blue-500 shadow-sm cursor-pointer"
                >
                 <option>专业严谨</option>
                 <option>热情种草</option>
                 <option>幽默风趣</option>
                 <option>高端奢华</option>
                 <option>客观痛点</option>
               </select>
             </div>
             <div className="space-y-3">
               <label className="text-xs font-black text-[var(--text-main)] uppercase">偏好篇幅</label>
               <div className="flex bg-gray-100 rounded-[var(--radius-lg)] p-1 border border-[var(--border-color)] shadow-inner">
                 {['短句', '中篇', '长文'].map(len => (
                   <button 
                     key={len} 
                     onClick={() => setActiveLength(len)}
                     className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all ${activeLength === len ? 'bg-[var(--bg-panel)] shadow-[0_1px_2px_rgba(0,0,0,0.1)] text-blue-700' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                   >
                     {len}
                   </button>
                 ))}
               </div>
             </div>
           </div>
        </div>

        <div className="p-5 border-t border-[var(--border-color)] bg-[var(--bg-panel)] shrink-0 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || (activeType !== '电商产品详情' && !prompt.trim())}
            className={`w-full py-3.5 rounded-[var(--radius-lg)] transition-all flex items-center justify-center font-bold text-sm shadow-md ${
              isGenerating || (activeType !== '电商产品详情' && !prompt.trim())
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-[var(--border-color)]' 
                : 'bg-[var(--color-primary)] hover:bg-blue-700 hover:-translate-y-0.5 text-white shadow-blue-200'
            }`}
          >
             {isGenerating ? (
               <><Loader2 className="icon-md mr-2 animate-spin" /> 推演渲染中...</>
             ) : (
               <><Sparkles className="icon-md mr-2" /> 生成多源文案方案</>
             )}
          </button>
        </div>
      </div>

      {/* Right Canvas */}
      <div className="flex-1 bg-[#F4F6F8] p-4 md:p-[var(--spacing-xl)] flex flex-col items-center justify-center relative overflow-hidden">
         {/* Background Decoration */}
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-100/40 to-purple-100/40 rounded-full blur-[100px] pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>

         <div className="w-full max-w-3xl bg-[var(--bg-panel)] rounded-[24px] shadow-xl shadow-gray-200/50 border border-[var(--border-color)] h-full flex flex-col relative z-10 overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-panel)]">
               <div className="flex items-center space-x-2">
                 <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                 <h3 className="font-bold text-[var(--text-main)] text-sm tracking-wide">创作画板预览 (Draft)</h3>
               </div>
               {result && (
                 <div className="flex space-x-2">
                   <button onClick={handleCopy} className="flex items-center px-3 py-1.5 bg-gray-50 hover:bg-blue-50 hover:text-[var(--color-primary)] text-gray-600 text-xs font-bold rounded-lg transition-colors border border-[var(--border-color)]">
                     {copySuccess ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                     {copySuccess ? '已复制' : '复制文案'}
                   </button>
                   <button onClick={handleShare} className="flex items-center px-3 py-1.5 bg-gray-50 hover:bg-blue-50 hover:text-[var(--color-primary)] text-gray-600 text-xs font-bold rounded-lg transition-colors border border-[var(--border-color)]">
                     <Share className="w-3.5 h-3.5 mr-1" /> 分享
                   </button>
                 </div>
               )}
            </div>
            
            <div className="flex-1 overflow-y-auto bg-gray-50/30 p-[var(--spacing-xl)] custom-scrollbar">
               {isGenerating ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <div className="relative w-20 h-20 mb-[var(--spacing-md)]">
                      <div className="absolute inset-0 border-4 border-[var(--border-color)] rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                      <Wand2 className="absolute inset-0 m-auto icon-lg text-blue-500 animate-pulse" />
                    </div>
                    <p className="text-sm font-bold text-gray-600 animate-pulse">正在利用大模型结构化生成...</p>
                  </div>
               ) : result ? (
                  <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-[var(--bg-panel)] p-[var(--spacing-lg)] rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm">
                      <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-50">
                        <span className="text-xs font-bold text-[var(--color-primary)] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">方案 A (优选推荐)</span>
                        <div className="flex space-x-1">
                          <button className="text-gray-400 hover:text-[var(--color-primary)] p-1.5 rounded-md hover:bg-blue-50 transition-colors" title="改写"><RefreshCw className="icon-sm" /></button>
                        </div>
                      </div>
                      <div className="text-[var(--text-main)] leading-loose text-[15px] whitespace-pre-wrap font-medium">
                        {result}
                      </div>
                    </div>
                  </div>
               ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                    <div className="w-20 h-20 bg-gray-50 rounded-[20px] flex items-center justify-center mb-[var(--spacing-md)] shadow-inner border border-[var(--border-color)]">
                      <Layout className="icon-xl text-gray-300" />
                    </div>
                    <h4 className="text-[18px] font-black text-[var(--text-main)] mb-2">等待指令输入</h4>
                    <p className="text-[14px] text-[var(--text-muted)] font-medium leading-relaxed">在左侧面板配置您的需求偏好信息，AI 将在此区域为您呈现多个高质量的候选文案。</p>
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}

function CopywritingTools() {
  return (
    <div className="p-[var(--spacing-lg)] md:p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-300 bg-[var(--bg-app)] min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-[var(--spacing-md)]">
        <div>
          <h2 className="text-[var(--text-main)]xl font-black text-[var(--text-main)] mb-2 tracking-tight">创作扩展工具 <span className="text-[var(--color-primary)]">Pro</span></h2>
          <p className="text-[var(--text-muted)] text-sm font-medium">10+ 垂直领域创作助手，解决降本增效痛点。</p>
        </div>
        <div className="relative">
          <Search className="icon-sm text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="搜索工具..." className="pl-9 pr-4 py-2 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-64 shadow-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[var(--spacing-md)]">
        {[
          { title: '多平台智能适配', desc: '一键将文案智能调整为小红书/抖音/公众号等平台的原生爆款风格', icon: Sparkles, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'hover:border-indigo-300' },
          { title: '沉浸式故事剧本', desc: '以人物视角刻画，提供具备高留存率与情感共鸣的深度内容脚本', icon: PenTool, color: 'text-rose-600', bg: 'bg-rose-50', border: 'hover:border-rose-300' },
          { title: '病毒式裂变钩子', desc: '构建引发评论、收藏与分享的“评论区预埋钩子”诱导话术', icon: Search, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'hover:border-cyan-300' },
          { title: '文章智能扩写', desc: '将短句或段落扩写为长文，丰富生动细节', icon: Layout, color: 'text-blue-600', bg: 'bg-blue-50', border: 'hover:border-blue-300' },
          { title: '多维文案润色', desc: '修正语法，提升表达流畅度与商业质感', icon: Sparkles, color: 'text-blue-600', bg: 'bg-blue-50', border: 'hover:border-blue-300' },
          { title: '爆款标题生成', desc: '根据正对内容生成吸引眼球点击的爆款标题', icon: PenTool, color: 'text-orange-600', bg: 'bg-orange-50', border: 'hover:border-orange-300' },
          { title: '专业级语境翻译', desc: '支持带行业语境的精准商业翻译处理', icon: Languages, color: 'text-green-600', bg: 'bg-green-50', border: 'hover:border-green-300' },
          { title: '口吻风格转换', desc: '从专业严谨到幽默口语的一键转换', icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50', border: 'hover:border-amber-300' }
        ].map((tool, i) => (
          <div key={i} className={`bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] p-[var(--spacing-lg)] shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1 relative overflow-hidden ${tool.border}`}>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowUpRight className="icon-md text-gray-300 group-hover:text-[var(--text-main)] transition-colors" />
            </div>
            <div className={`w-12 h-12 ${tool.bg} ${tool.color} rounded-[var(--radius-xl)] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-inner`}>
               <tool.icon className="icon-lg stroke-[2.5]" />
            </div>
            <h3 className="text-base font-black text-[var(--text-main)] mb-2 tracking-tight group-hover:text-[var(--color-primary)] transition-colors">{tool.title}</h3>
            <p className="text-[13px] text-[var(--text-muted)] font-medium leading-relaxed">{tool.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CopywritingKeywords() {
  const session = useSaasSession();
  const repoContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.workspace.id, session.user.id],
  );
  const [libraries, setLibraries] = useState<WorkspaceKeywordLibrary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState<WorkspaceKeywordLibrary | null>(null);

  const refresh = useCallback(() => {
    const loaded = searchQuery.trim()
      ? searchWorkspaceKeywordLibraries(searchQuery, repoContext)
      : loadWorkspaceKeywordLibraries(repoContext);
    setLibraries(loaded);
  }, [repoContext, searchQuery]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => refresh();
    if (typeof window !== 'undefined') {
      window.addEventListener('workspace_keyword_libraries_updated', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('workspace_keyword_libraries_updated', handler);
      }
    };
  }, [refresh]);

  const handleCreate = (input: { name: string; description: string; channel: string; keywords: string[]; tags: string[]; blockedTerms: string[]; sourceText: string }) => {
    const library = createWorkspaceKeywordLibrary(input, repoContext);
    logAuditEvent({
      action: 'copywriting_keyword_create',
      moduleId: 'copywriting_keywords',
      targetType: 'settings',
      targetId: library.id,
      metadata: { name: library.name, channel: library.channel, keywordCount: library.keywords.length },
    }, { session });
    toast('词库已创建', 'success');
    setShowCreateModal(false);
    refresh();
  };

  const handleUpdate = (libraryId: string, patch: Partial<WorkspaceKeywordLibrary>) => {
    const updated = updateWorkspaceKeywordLibrary(libraryId, patch, repoContext);
    if (updated) {
      logAuditEvent({
        action: 'copywriting_keyword_update',
        moduleId: 'copywriting_keywords',
        targetType: 'settings',
        targetId: libraryId,
        metadata: { name: updated.name, keywordCount: updated.keywords.length },
      }, { session });
      toast('词库已更新', 'success');
    }
    setEditingLibrary(null);
    refresh();
  };

  const handleArchive = (libraryId: string) => {
    const archived = archiveWorkspaceKeywordLibrary(libraryId, repoContext);
    if (archived) {
      logAuditEvent({
        action: 'copywriting_keyword_archive',
        moduleId: 'copywriting_keywords',
        targetType: 'settings',
        targetId: libraryId,
        metadata: { name: archived.name },
      }, { session });
      toast('词库已归档', 'success');
    }
    refresh();
  };

  const statusLabel = (status: WorkspaceKeywordLibraryStatus) => {
    switch (status) {
      case 'active': return '活跃挂载中';
      case 'paused': return '已暂停应用';
      case 'archived': return '已归档';
    }
  };

  const statusColor = (status: WorkspaceKeywordLibraryStatus) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'paused': return 'text-[var(--text-muted)]';
      case 'archived': return 'text-gray-400';
    }
  };

  return (
    <div className="p-[var(--spacing-lg)] md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 bg-[var(--bg-app)] min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-[var(--spacing-md)] bg-[var(--bg-panel)] p-[var(--spacing-lg)] md:p-[var(--spacing-xl)] rounded-[24px] border border-[var(--border-color)] shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-50/50 rounded-bl-full pointer-events-none"></div>
        <div className="relative z-10">
          <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest mb-3 inline-block">Data Center</span>
          <h2 className="text-[var(--text-main)]xl font-black text-[var(--text-main)] mb-3 tracking-tight">专属语料与知识库</h2>
          <p className="text-[var(--text-muted)] text-[15px] font-medium max-w-2xl leading-relaxed">沉淀主理人专属黑话、防违规高压线词库，以及行业爆款高频词。通过挂载外部词库强化 AI 输出的垂直精准度。</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-6 py-3 rounded-[var(--radius-lg)] font-black text-sm transition-all shadow-md shadow-gray-300 hover:-translate-y-0.5 flex items-center relative z-10"
        >
           <Plus className="icon-sm mr-2" /> 建立新词库
        </button>
      </div>

      <div className="relative">
        <Search className="icon-sm text-gray-400 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="搜索词库名称、关键词、标签..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] pl-9 pr-4 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm"
        />
      </div>

      {libraries.length === 0 ? (
        <div className="bg-[var(--bg-panel)] border border-dashed border-[var(--border-color)] rounded-[24px] p-12 text-center">
          <Database className="icon-xl text-gray-300 mx-auto mb-4" />
          <p className="text-[var(--text-muted)] font-medium">还没有词库。点击「建立新词库」开始沉淀你的专属语料。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--spacing-md)]">
          {libraries.map((lib) => (
            <div key={lib.id} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] p-[var(--spacing-lg)] md:p-[var(--spacing-xl)] shadow-sm hover:shadow-xl transition-all duration-300 relative group">
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-[20px] flex items-center justify-center shrink-0 border shadow-inner group-hover:scale-105 transition-transform bg-blue-50 text-[var(--color-primary)] border-blue-100">
                    <Database className="w-7 h-7 stroke-[2]" />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-black text-[var(--text-main)] tracking-tight group-hover:text-[var(--color-primary)] transition-colors">{lib.name}</h3>
                    <p className="text-[var(--text-muted)] text-sm font-medium mt-1">{lib.description || '无描述'}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--spacing-md)] mt-6 p-4 bg-gray-50 rounded-[var(--radius-xl)] border border-[var(--border-color)]">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-black text-gray-400 mb-1">关键词数量</span>
                    <span className="text-lg font-black text-[var(--text-main)]">{lib.keywords.length}</span>
                  </div>
                  <div className="w-px h-8 bg-gray-200"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-black text-gray-400 mb-1">渠道</span>
                    <span className="text-[12px] font-bold text-[var(--text-main)] mt-1">{lib.channel}</span>
                  </div>
                  <div className="w-px h-8 bg-gray-200"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-black text-gray-400 mb-1">状态</span>
                    <span className={`text-[12px] font-bold ${statusColor(lib.status)} flex items-center mt-1`}>
                      {lib.status === 'active' && <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                      {statusLabel(lib.status)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lib.tags.map(t => (
                    <span key={t} className="bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-600 text-[11px] font-bold px-2.5 py-1 rounded-md shadow-sm">{t}</span>
                  ))}
                </div>
              </div>

              {lib.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {lib.keywords.slice(0, 8).map(kw => (
                    <span key={kw} className="bg-blue-50 text-blue-700 text-[11px] font-medium px-2 py-0.5 rounded">{kw}</span>
                  ))}
                  {lib.keywords.length > 8 && <span className="text-[11px] text-[var(--text-muted)] py-0.5">+{lib.keywords.length - 8}</span>}
                </div>
              )}

              <div className="flex space-x-3 mt-6 pt-6 border-t border-[var(--border-color)]">
                <button
                  onClick={() => setEditingLibrary(lib)}
                  className="flex-1 bg-[var(--bg-panel)] border-2 border-[var(--border-color)] hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2.5 rounded-[var(--radius-lg)] text-sm transition-all flex items-center justify-center"
                >
                  <Edit3 className="icon-sm mr-2 text-gray-400" /> 编辑词库
                </button>
                {lib.status !== 'archived' && (
                  <button
                    onClick={() => handleArchive(lib.id)}
                    className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-2.5 rounded-[var(--radius-lg)] text-sm transition-all border border-[var(--border-color)] flex items-center justify-center"
                  >
                    <Archive className="icon-sm mr-2" /> 归档
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(showCreateModal || editingLibrary) && (
        <KeywordLibraryModal
          library={editingLibrary}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onClose={() => { setShowCreateModal(false); setEditingLibrary(null); }}
        />
      )}
    </div>
  );
}

function KeywordLibraryModal({
  library,
  onCreate,
  onUpdate,
  onClose,
}: {
  library: WorkspaceKeywordLibrary | null;
  onCreate: (input: { name: string; description: string; channel: string; keywords: string[]; tags: string[]; blockedTerms: string[]; sourceText: string }) => void;
  onUpdate: (libraryId: string, patch: Partial<WorkspaceKeywordLibrary>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(library?.name ?? '');
  const [description, setDescription] = useState(library?.description ?? '');
  const [channel, setChannel] = useState(library?.channel ?? 'general');
  const [keywordsText, setKeywordsText] = useState(library?.keywords.join('\n') ?? '');
  const [tagsText, setTagsText] = useState(library?.tags.join(', ') ?? '');
  const [blockedTermsText, setBlockedTermsText] = useState(library?.blockedTerms.join('\n') ?? '');
  const [sourceText, setSourceText] = useState(library?.sourceText ?? '');

  const handleSubmit = () => {
    if (!name.trim()) return;
    const keywords = keywordsText.split('\n').map(k => k.trim()).filter(Boolean);
    const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean);
    const blockedTerms = blockedTermsText.split('\n').map(t => t.trim()).filter(Boolean);
    if (library) {
      onUpdate(library.id, { name, description, channel, keywords, tags, blockedTerms, sourceText });
    } else {
      onCreate({ name, description, channel, keywords, tags, blockedTerms, sourceText });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[var(--bg-panel)] rounded-[24px] shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <h3 className="text-lg font-black text-[var(--text-main)]">{library ? '编辑词库' : '建立新词库'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="icon-md" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">词库名称 *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="例如：美妆护肤高频词" className="w-full border border-[var(--border-color)] rounded-[var(--radius-lg)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">描述</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="词库用途说明" className="w-full border border-[var(--border-color)] rounded-[var(--radius-lg)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">渠道</label>
            <input value={channel} onChange={e => setChannel(e.target.value)} placeholder="general / xiaohongshu / douyin..." className="w-full border border-[var(--border-color)] rounded-[var(--radius-lg)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">关键词（每行一个）</label>
            <textarea value={keywordsText} onChange={e => setKeywordsText(e.target.value)} rows={5} placeholder="视黄醇&#10;抗初老&#10;敏感肌" className="w-full border border-[var(--border-color)] rounded-[var(--radius-lg)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">标签（逗号分隔）</label>
            <input value={tagsText} onChange={e => setTagsText(e.target.value)} placeholder="种草, 成分党" className="w-full border border-[var(--border-color)] rounded-[var(--radius-lg)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">屏蔽词（每行一个）</label>
            <textarea value={blockedTermsText} onChange={e => setBlockedTermsText(e.target.value)} rows={3} placeholder="广告法禁用词..." className="w-full border border-[var(--border-color)] rounded-[var(--radius-lg)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">原始素材文本（可选）</label>
            <textarea value={sourceText} onChange={e => setSourceText(e.target.value)} rows={3} placeholder="粘贴原始文案，系统将自动提取关键词..." className="w-full border border-[var(--border-color)] rounded-[var(--radius-lg)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-[var(--border-color)]">
          <button onClick={onClose} className="flex-1 border border-[var(--border-color)] text-gray-700 font-bold py-2.5 rounded-[var(--radius-lg)] text-sm hover:bg-gray-50">取消</button>
          <button onClick={handleSubmit} disabled={!name.trim()} className="flex-1 bg-[var(--color-primary)] hover:bg-blue-700 text-white font-bold py-2.5 rounded-[var(--radius-lg)] text-sm disabled:opacity-50 disabled:cursor-not-allowed">{library ? '保存' : '创建'}</button>
        </div>
      </div>
    </div>
  );
}
