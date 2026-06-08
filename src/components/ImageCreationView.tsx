import React, { useState } from 'react';
import { ImageIcon, Wand2, Plus, Download, Sliders, Maximize2, RotateCcw, Copy, Trash2, Check, LayoutTemplate, Box, Settings2, ImagePlus, Globe } from 'lucide-react';
import { FullscreenViewer } from './FullscreenViewer';

export function ImageCreationView() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [activeModel, setActiveModel] = useState('Midjourney V6');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [styleMode, setStyleMode] = useState('摄影写实');

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setResult(null);

    setTimeout(() => {
      setIsGenerating(false);
      setResult('https://images.unsplash.com/photo-1549298240-0d8e60513026?auto=format&fit=crop&w=1000&q=80');
    }, 2000);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#FDFDFE] animate-in fade-in duration-300">
      {/* Sidebar Tool panel */}
      <div className="w-[360px] bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 shrink-0">
        <div className="p-5 border-b border-[var(--border-color)] flex items-center space-x-3">
          <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <ImageIcon className="text-white icon-md" />
          </div>
          <div>
            <h2 className="text-[16px] font-black text-[var(--text-main)] tracking-tight">图像创作引擎</h2>
            <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-widest mt-0.5">Image Generation</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
          {/* Model Selection */}
          <div className="space-y-3">
            <label className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider flex items-center">
              <Box className="icon-sm mr-1.5 text-indigo-500" /> 渲染模型
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['Midjourney V6', 'DALL·E 3', 'Stable Diffusion XL', 'Niji 6 (二次元)', 'Flux.1 Schnell', 'Ideogram 1.0'].map(m => (
                <button
                  key={m}
                  onClick={() => setActiveModel(m)}
                  className={`py-2 px-3 text-xs font-bold rounded-[var(--radius-lg)] border transition-all text-left truncate ${
                    activeModel === m
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm ring-1 ring-indigo-500/10'
                      : 'bg-[var(--bg-panel)] border-[var(--border-color)] text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
             <label className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center"><Sliders className="icon-sm mr-1.5 text-indigo-500" /> ControlNet (高级控图)</span>
                <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black">PRO</span>
             </label>
             <select className="w-full bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] px-3 py-2.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all cursor-pointer">
               <option>不启用 (默认模式)</option>
               <option>边缘检测 (Canny) - 线稿上色</option>
               <option>深度检测 (Depth) - 空间关系保留</option>
               <option>姿态控制 (OpenPose) - 人物动作</option>
             </select>
          </div>

          <div className="space-y-3">
            <label className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider flex items-center">
               <Settings2 className="icon-sm mr-1.5 text-indigo-500" /> 美学风格
            </label>
            <div className="grid grid-cols-3 gap-2">
               {['摄影写实', '3D极简', '商业插画', '中国风', '赛博朋克', '黏土滤镜'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStyleMode(s)}
                    className={`py-2 px-2 text-xs font-bold rounded-[var(--radius-lg)] border transition-all text-center ${
                      styleMode === s
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-[var(--bg-panel)] border-[var(--border-color)] text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {s}
                  </button>
               ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider flex items-center">
               <Maximize2 className="icon-sm mr-1.5 text-indigo-500" /> 画面比例
            </label>
            <div className="flex bg-[var(--bg-app)] rounded-[var(--radius-lg)] p-1 border border-[var(--border-color)] shadow-inner">
               {['1:1', '3:4', '4:3', '16:9', '9:16'].map(r => (
                  <button
                    key={r}
                    onClick={() => setAspectRatio(r)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      aspectRatio === r
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
              <span className="flex items-center"><ImagePlus className="icon-sm mr-1.5 text-indigo-500" /> 参考图 (垫图)</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-[var(--radius-lg)] p-4 flex flex-col items-center justify-center bg-gray-50 hover:bg-[var(--bg-panel)] hover:border-indigo-400 transition-all cursor-pointer group">
              <Plus className="icon-lg text-gray-400 group-hover:text-indigo-500 mb-2 transition-colors" />
              <p className="text-[12px] font-bold text-[var(--text-muted)] group-hover:text-gray-700">点击上传垫图 (可选)</p>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-[var(--border-color)] bg-[var(--bg-panel)]">
           <div className="flex items-center justify-between mb-3">
             <label className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider flex items-center">
               <Globe className="icon-sm mr-1.5 text-blue-500" /> 提示词语言 / Prompt Language
             </label>
             <select className="bg-gray-50 border border-[var(--border-color)] rounded-lg px-2 py-1 text-[11px] font-bold text-gray-700 outline-none focus:border-indigo-400">
               <option>自动翻译 (推荐)</option>
               <option>English Options</option>
               <option>简体中文直出</option>
               <option>日本語</option>
             </select>
           </div>
           <textarea
             value={prompt}
             onChange={e => setPrompt(e.target.value)}
             placeholder="详细描述您想要生成的画面细节、主体、光影与氛围..."
             className="w-full resize-none h-32 p-4 bg-gray-50/50 border-[1.5px] border-[var(--border-color)] rounded-[var(--radius-xl)] text-[14px] leading-relaxed focus:bg-[var(--bg-panel)] focus:ring-[4px] focus:ring-indigo-500/10 focus:border-indigo-500 outline-none placeholder-gray-400 transition-all font-medium mb-4"
           />
           <button
             onClick={handleGenerate}
             disabled={!prompt.trim() || isGenerating}
             className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-black text-[15px] tracking-wide py-4 rounded-[var(--radius-xl)] transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center transform hover:-translate-y-0.5 active:translate-y-0"
           >
             {isGenerating ? (
               <>
                 <div className="icon-sm border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                 渲染中...
               </>
             ) : (
               <>
                 <Wand2 className="icon-sm mr-2" />
                 生成图像 (消耗 2 算力)
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
             <LayoutTemplate className="icon-sm mr-1.5" />
             画廊记录
           </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-12">
           {result ? (
             <div className="relative group max-w-5xl max-h-full flex items-center justify-center w-full">
               <img src={result} alt="Generated" className="rounded-[32px] shadow-2xl max-h-[80vh] object-contain border-4 border-white/40 ring-1 ring-black/5" />
               <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => setIsFullscreen(true)} className="bg-[var(--bg-panel)] text-[var(--text-main)] p-2.5 rounded-[var(--radius-lg)] shadow hover:scale-105 transition-transform" title="全屏看大图">
                   <Maximize2 className="icon-md" />
                 </button>
                 <button className="bg-[var(--bg-panel)] text-[var(--text-main)] p-2.5 rounded-[var(--radius-lg)] shadow hover:scale-105 transition-transform" title="下载高质量图">
                   <Download className="icon-md" />
                 </button>
                 <button className="bg-[var(--bg-panel)] text-[var(--text-main)] p-2.5 rounded-[var(--radius-lg)] shadow hover:scale-105 transition-transform" title="设为同款Seed垫图">
                   <Copy className="icon-md" />
                 </button>
                 <button className="bg-red-500 text-white p-2.5 rounded-[var(--radius-lg)] shadow hover:scale-105 transition-transform" title="删除">
                   <Trash2 className="icon-md" />
                 </button>
               </div>
               
               {/* Quick variations below */}
               <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  <button className="bg-[var(--bg-panel)]/90 backdrop-blur shadow-lg px-4 py-2 rounded-[var(--radius-lg)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-panel)] border border-[var(--border-color)]">
                    V1 微微重构
                  </button>
                  <button className="bg-[var(--bg-panel)]/90 backdrop-blur shadow-lg px-4 py-2 rounded-[var(--radius-lg)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-panel)] border border-[var(--border-color)]">
                    V2 创意发散
                  </button>
                  <button className="bg-[var(--bg-panel)]/90 backdrop-blur shadow-lg px-4 py-2 rounded-[var(--radius-lg)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-panel)] border border-[var(--border-color)]">
                    U1 高清放大
                  </button>
               </div>
             </div>
           ) : isGenerating ? (
             <div className="flex flex-col items-center">
               <div className="w-16 h-16 relative mb-[var(--spacing-md)]">
                 <div className="w-16 h-16 rounded-[var(--radius-xl)] bg-indigo-500/20 absolute inset-0 animate-ping"></div>
                 <div className="w-16 h-16 rounded-[var(--radius-xl)] bg-[var(--bg-panel)] shadow-xl flex items-center justify-center relative z-10">
                   <ImageIcon className="icon-xl text-indigo-500 animate-pulse" />
                 </div>
               </div>
               <p className="text-[var(--text-main)] font-black text-xl mb-2">正在请求云端 GPU 集群...</p>
               <p className="text-[var(--text-muted)] font-bold text-sm">调度模型: {activeModel} · 比例 {aspectRatio}</p>
             </div>
           ) : (
             <div className="text-center">
               <div className="w-20 h-20 bg-[var(--bg-panel)] shadow-sm border border-[var(--border-color)] rounded-[24px] flex items-center justify-center mx-auto mb-[var(--spacing-md)] transform -rotate-6">
                 <ImageIcon className="icon-xl text-gray-300" />
               </div>
               <h3 className="text-xl font-black text-[var(--text-main)] mb-2">激发无限创意想象</h3>
               <p className="text-[var(--text-muted)] font-medium max-w-sm mx-auto">调整左侧参数设置，输入正向提示词，AI 将极速为您渲染出媲美影棚级质量的高清图像资源。</p>
             </div>
           )}
        </div>
      </div>
      {result && (
        <FullscreenViewer
          isOpen={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          mediaUrl={result}
          mediaType="image"
        />
      )}
    </div>
  );
}
