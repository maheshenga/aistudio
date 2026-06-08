import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Video, Clapperboard, LayoutTemplate, Layers, MessageSquare, PlayCircle, Settings, Plus, Camera, Image as ImageIcon, Wand2, ArrowRight, X, Sparkles, SlidersHorizontal, RefreshCcw, CheckCircle2, Activity, AlertCircle, RotateCcw, Trash2, Undo2, SplitSquareHorizontal, GripVertical } from 'lucide-react';

export function DirectorDeskView() {
  const [activeTab, setActiveTab] = useState<'script' | 'pipeline' | 'storyboard' | 'shots'>('pipeline');
  
  const tabs = [
    { id: 'script', label: '剧本文档管理', icon: MessageSquare },
    { id: 'pipeline', label: '分镜提示词编排', icon: Layers },
    { id: 'storyboard', label: '视觉故事板', icon: LayoutTemplate },
    { id: 'shots', label: '视频合成台', icon: Video },
  ];

  return (
    <div className="h-full flex flex-col bg-[var(--bg-app)] relative overflow-hidden">
      {/* Background Decorative */}
      <div className="absolute top-0 right-0 p-32 opacity-5 pointer-events-none">
         <Clapperboard className="w-96 h-96 transform rotate-12" />
      </div>

      <div className="flex-shrink-0 p-[var(--spacing-lg)] border-b border-[var(--border-color)] bg-[var(--bg-panel)] shadow-sm z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--spacing-md)]">
        <div>
           <motion.div 
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             className="flex items-center space-x-3 mb-2"
           >
              <div className="bg-[var(--color-primary)] p-2.5 rounded-[var(--radius-lg)] shadow-[0_4px_12px_rgba(26,115,232,0.3)]">
                 <Clapperboard className="icon-lg text-white" />
              </div>
              <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">AI漫剧导演工作台 <span className="text-[var(--text-muted)] font-medium text-lg ml-2">AGENT Orchestrator</span></h2>
           </motion.div>
           <p className="text-[var(--text-muted)] text-sm font-medium">全自动化漫剧生成引擎：剧本导入修改 ➔ 风格及提示词编排 ➔ 故事板分镜生成 ➔ 图文配音合成视频。</p>
        </div>
        
        <div className="flex bg-gray-100 p-1.5 rounded-[var(--radius-xl)] shadow-inner overflow-x-auto hide-scrollbar">
           {tabs.map((tab) => {
             const isActive = activeTab === tab.id;
             const Icon = tab.icon;
             return (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)}
                 className={`relative flex items-center px-5 py-2.5 rounded-[var(--radius-lg)] text-sm font-bold transition-all duration-300 ${
                   isActive ? 'text-white' : 'text-gray-600 hover:text-[var(--text-main)] hover:bg-gray-200'
                 }`}
               >
                 {isActive && (
                   <motion.div 
                     layoutId="director-tab" 
                     className="absolute inset-0 bg-[var(--color-primary)] rounded-[var(--radius-lg)] shadow-[0_2px_8px_rgba(26,115,232,0.4)]"
                     transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                   />
                 )}
                 <span className="relative z-10 flex items-center">
                    <Icon className="icon-sm mr-2" />
                    {tab.label}
                 </span>
               </button>
             );
           })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-[var(--spacing-lg)] z-10 relative custom-scrollbar">
         <AnimatePresence mode="wait">
            {activeTab === 'pipeline' && (
              <PipelineView key="pipeline" />
            )}
            {activeTab === 'storyboard' && (
              <StoryboardView key="storyboard" />
            )}
            {activeTab === 'script' && (
              <ScriptView key="script" />
            )}
            {activeTab === 'shots' && (
              <ShotsView key="shots" />
            )}
         </AnimatePresence>
      </div>
    </div>
  );
}

function PipelineView() {
  const [activeConfigId, setActiveConfigId] = useState<number | null>(null);
  const [boundAssets, setBoundAssets] = useState<Record<number, any>>({});
  const [showMonitor, setShowMonitor] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState([
     { id: 'ref-1', img: '1500462918059-b1a0cb512f1d', title: '主IP角色 - 设计师', version: 1 },
     { id: 'ref-2', img: '1511216335778-4cb8f49fa7a3', title: '环境参考 - 夜间工作室', version: 1 },
     { id: 'ref-3', img: '1520038419904-469bfd6b2c2f', title: '光影风格 - 霓虹', version: 1 },
  ]);

  const handleDropAsset = (stepId: number, assetData: string) => {
     try {
         const asset = JSON.parse(assetData);
         setBoundAssets(prev => {
            const currentAssets = prev[stepId] || [];
            if (currentAssets.find(a => a.id === asset.id)) return prev;
            return { ...prev, [stepId]: [...currentAssets, asset] };
         });
     } catch(e) {}
  };

  const updateLibraryAssetVersion = (id: string, e: React.MouseEvent) => {
     e.stopPropagation();
     setLibraryAssets(prev => prev.map(a => a.id === id ? { ...a, version: a.version + 1, img: '1526304640581-d334cdbbf45e' } : a)); // also change img slightly to simulate edit
  };

  const updateBoundAssetVersion = (stepId: number, asset: any) => {
     const libAsset = libraryAssets.find(a => a.id === asset.id);
     if (libAsset) {
        setBoundAssets(prev => ({
           ...prev,
           [stepId]: prev[stepId].map((a: any) => a.id === asset.id ? { ...libAsset } : a)
        }));
     }
  };

  const [pipelineSteps, setPipelineSteps] = useState([
     { id: 1, role: '黄金三秒', content: '还在用传统方式做设计？这 3 个隐藏功能让你效率翻倍！', prompt: 'Studio ghibli style, a tired designer sitting at a cluttered desk at midnight, piles of paper, glowing laptop screen Illuminating the face, cinematic lighting, 8k resolution --ar 16:9 --v 6.0', duration: 3, temperature: 0.7 },
     { id: 2, role: '痛点引入', content: '每天加班画图，老板催进度，甲方改需求，素材找不到...', prompt: 'Studio ghibli style, close up of a frustrated face, sweat on forehead, dramatic shadow, holding an empty cup of coffee, dark messy room background, masterpiece --ar 16:9 --v 6.0', duration: 4, temperature: 0.8 },
     { id: 3, role: '核心展示', content: '看看这个全自动 AI 工作流，只需输入一句提示词...', prompt: 'Studio ghibli style, magical glowing ai robot assisting designer, bright sunny room, vibrant colors, highly detailed, whimsical atmosphere --ar 16:9 --v 6.0', duration: 5, temperature: 0.75 }
  ]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="flex gap-[var(--spacing-md)] max-w-[1600px] mx-auto h-full"
    >
       {/* Asset Library (Drag Source) */}
       <div className="w-[260px] shrink-0 hidden xl:flex flex-col space-y-[var(--spacing-md)] h-full pb-10">
           <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] p-5 shadow-sm flex-1 flex flex-col overflow-hidden">
              <h3 className="text-sm font-black text-[var(--text-main)] flex items-center mb-4 shrink-0">
                 <ImageIcon className="icon-sm mr-2" /> 资产参考库
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 pb-10">
                 {libraryAssets.map(asset => (
                    <div 
                       key={asset.id}
                       draggable
                       onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', JSON.stringify(asset));
                       }}
                       className="bg-gray-50 border border-[var(--border-color)] rounded-[var(--radius-lg)] p-2 cursor-grab hover:border-blue-400 hover:shadow-md transition-all active:cursor-grabbing group relative"
                    >
                       <img src={`https://images.unsplash.com/photo-${asset.img}?auto=format&fit=crop&q=80&w=200`} className="w-full h-24 object-cover rounded-lg mb-2 pointer-events-none" />
                       <span className="text-xs font-bold text-gray-700 px-1 pointer-events-none block truncate">{asset.title}</span>
                       <div className="flex items-center justify-between mt-1 px-1">
                          <span className="text-[9px] text-gray-400 font-mono pointer-events-none block">ID: {asset.id} (v{asset.version})</span>
                          <button 
                             onClick={(e) => updateLibraryAssetVersion(asset.id, e)}
                             className="text-[9px] text-[var(--color-primary)] bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                             title="模拟修改资产"
                          >
                             模拟修改
                          </button>
                       </div>
                    </div>
                 ))}
                 
                 <button className="w-full h-20 rounded-[var(--radius-lg)] border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-[var(--text-main)] hover:border-gray-900 hover:bg-[var(--bg-panel)] transition-all">
                    <Plus className="icon-md" />
                 </button>
              </div>
           </div>
       </div>

       <div className="flex-1 space-y-[var(--spacing-lg)] flex flex-col overflow-y-auto custom-scrollbar pb-10 px-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-[var(--spacing-md)] shrink-0 mt-1">
             <h3 className="text-xl font-black text-[var(--text-main)] flex items-center shrink-0">
               <Layers className="icon-lg mr-3 text-[var(--text-main)]" />
               AI 提示词引擎与风格编排
             </h3>
             <div className="flex items-center space-x-3 overflow-x-auto hide-scrollbar pb-1">
                <button 
                  onClick={() => setShowMonitor(!showMonitor)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center transition-colors shadow-sm shrink-0 ${showMonitor ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-700 hover:bg-gray-50'}`}
                >
                   <Activity className="icon-sm mr-2" /> 运行状态监控
                </button>
                <div className="flex items-center space-x-2 border-l border-[var(--border-color)] pl-4 ml-2 shrink-0">
                   <select className="bg-gray-50 border border-[var(--border-color)] text-gray-700 text-sm font-bold rounded-lg px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>AI工具宣传片大纲.txt</option>
                      <option>产品发布会预告短片_V2.docx</option>
                      <option>科技风混剪测试1.txt</option>
                   </select>
                </div>
                <button 
                  onClick={() => {
                     setPipelineSteps(prev => prev.map(step => ({
                        ...step,
                        temperature: Number((Math.random() * (0.4) + 0.5).toFixed(2)),
                        duration: Math.max(2, Math.round(step.content.length / 4))
                     })));
                  }}
                  className="bg-blue-50 text-blue-700 border border-blue-200 px-5 py-2 rounded-lg font-bold text-sm flex items-center hover:bg-blue-100 transition-colors shadow-sm tracking-wide shrink-0"
                >
                   <SlidersHorizontal className="icon-sm mr-2" /> 智能 Pacing 优化
                </button>
                <button className="bg-[var(--color-primary)] text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center hover:bg-blue-700 transition-colors shadow-[0_2px_8px_rgba(26,115,232,0.3)] tracking-wide shrink-0">
                   <Wand2 className="icon-sm mr-2" /> 批量生成提示词
                </button>
             </div>
          </div>

          {/* Visual Style Template Book (视觉风格样板间) */}
          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] p-[var(--spacing-lg)] shadow-sm mb-[var(--spacing-xl)] relative overflow-hidden group">
             <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
                <Layers className="w-32 h-32 transform translate-x-4 -translate-y-4" />
             </div>
             <div className="flex items-center justify-between mb-4 relative z-10">
                 <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center">
                    <Wand2 className="icon-sm mr-2 text-blue-500" /> 视觉风格样板间 (Style Template Book)
                 </h4>
                 <button className="text-[11px] font-bold text-[var(--color-primary)] bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full border border-blue-200 shadow-sm transition-colors flex items-center">
                    <Plus className="w-3 h-3 mr-1" /> 存为新模板
                 </button>
             </div>
             
             <div className="flex gap-[var(--spacing-md)] overflow-x-auto hide-scrollbar pb-2 relative z-10 snap-x">
                 {[
                   { id: 't1', name: '赛博霓虹 (Cyberpunk)', prompt: 'Cyberpunk style, neon lights, dark alley, 8k resolution, cinematic...', lighting: 'High Contrast Neon', angle: 'Dutch Angle', active: false },
                   { id: 't2', name: '吉卜力夏日 (Studio Ghibli)', prompt: 'Studio ghibli style, magical atmosphere, lush nature, vibrant colors...', lighting: 'Soft Sunlight', angle: 'Wide Angle', active: true },
                   { id: 't3', name: '暗黑史诗 (Dark Epic)', prompt: 'Dark fantasy, epic scale, moody atmosphere, volumetric fog...', lighting: 'Rembrandt Lighting', angle: 'Low Angle', active: false },
                   { id: 't4', name: '3D 潮玩 (Pop Mart)', prompt: '3D rendering, cute stylized character, octane render, clay texture...', lighting: 'Studio Softbox', angle: 'Isometric', active: false },
                 ].map((style, idx) => (
                    <div key={idx} className={`flex-shrink-0 w-[240px] rounded-[var(--radius-lg)] border-2 p-3 flex flex-col gap-2 transition-all cursor-pointer snap-start group/tpl hover:shadow-md ${style.active ? 'border-blue-600 bg-blue-50 shadow-[0_4px_12px_rgba(26,115,232,0.15)] ring-1 ring-blue-600 scale-[1.02]' : 'border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-blue-300'}`}>
                       <div className="flex justify-between items-center mb-1">
                          <span className={`text-[13px] font-black ${style.active ? 'text-blue-800' : 'text-[var(--text-main)]'}`}>{style.name}</span>
                          {style.active && <CheckCircle2 className="icon-sm text-[var(--color-primary)]" />}
                       </div>
                       
                       <p className="text-[10px] text-[var(--text-muted)] font-mono line-clamp-2 leading-relaxed bg-[var(--bg-panel)]/60 p-1.5 rounded">{style.prompt}</p>
                       
                       <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
                          <span className="text-[9px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100/50">灯光: {style.lighting}</span>
                          <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100/50">镜头: {style.angle}</span>
                       </div>
                       
                       {/* 一键应用按钮 (Hover 时显示或高亮时显示) */}
                       <div className="mt-2 pt-2 border-t border-[var(--border-color)]/60 transition-opacity">
                         <button 
                            onClick={(e) => {
                               e.stopPropagation();
                               // Simulate applying template to all pipeline steps
                               setPipelineSteps(prev => prev.map(p => ({
                                  ...p, 
                                  prompt: `${style.prompt} --ar 16:9 --v 6.0`
                               })));
                            }}
                            className={`w-full py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center transition-colors shadow-sm ${style.active ? 'bg-[var(--color-primary)] text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                         >
                            <Wand2 className="w-3 h-3 mr-1.5" /> 
                            {style.active ? '已应用到全片' : '一键应用到全片'}
                         </button>
                       </div>
                    </div>
                 ))}
             </div>
          </div>
          
          {/* Prompt Generation List */}
          <div className="space-y-[var(--spacing-md)]">
             {pipelineSteps.map((item) => (
                <motion.div 
                   key={item.id} 
                   initial={{ opacity: 0, y: 15 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: item.id * 0.1 }}
                   onDragOver={(e) => {
                       e.preventDefault();
                       e.currentTarget.classList.add('border-blue-400', 'ring-2', 'ring-blue-200', 'bg-blue-50/10');
                   }}
                   onDragLeave={(e) => {
                       e.currentTarget.classList.remove('border-blue-400', 'ring-2', 'ring-blue-200', 'bg-blue-50/10');
                   }}
                   onDrop={(e) => {
                       e.preventDefault();
                       e.currentTarget.classList.remove('border-blue-400', 'ring-2', 'ring-blue-200', 'bg-blue-50/10');
                       const data = e.dataTransfer.getData('text/plain');
                       if (data) handleDropAsset(item.id, data);
                   }}
                   className={`bg-[var(--bg-panel)] border text-left rounded-[24px] p-[var(--spacing-lg)] shadow-sm flex flex-col lg:flex-row gap-[var(--spacing-md)] transition-all group cursor-pointer ${
                     activeConfigId === item.id ? 'border-blue-400 ring-4 ring-blue-50 shadow-md transform scale-[1.01]' : 'border-[var(--border-color)] hover:border-gray-300 hover:shadow-md'
                   }`}
                   onClick={() => setActiveConfigId(item.id)}
                >
                   <div className="lg:w-[35%] space-y-3 flex flex-col">
                      <div className="flex justify-between items-center shrink-0">
                        <div className="flex items-center space-x-2">
                            <span className="text-[12px] font-black tracking-widest text-gray-400 uppercase">SHOT {String(item.id).padStart(2, '0')}</span>
                            {item.duration && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono shadow-sm border border-blue-100">{item.duration.toFixed(1)}s</span>}
                            {item.temperature && <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-mono shadow-sm border border-purple-100">T:{item.temperature.toFixed(2)}</span>}
                        </div>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md font-bold">{item.role}</span>
                      </div>
                      <div className="text-[14px] font-medium text-[var(--text-main)] leading-relaxed bg-gray-50/80 p-4 rounded-[var(--radius-lg)] border border-[var(--border-color)] flex-1 overflow-y-auto custom-scrollbar">
                        {item.content}
                      </div>

                      {boundAssets[item.id] && boundAssets[item.id].length > 0 && (
                         <div className="flex gap-2 pt-2 overflow-x-auto hide-scrollbar shrink-0 items-center">
                            <span className="text-[10px] font-bold text-gray-400 flex items-center shrink-0 bg-gray-50 px-2 rounded-lg border border-[var(--border-color)] h-6">源</span>
                            {boundAssets[item.id].map((asset: any, idx: number) => {
                               const libAsset = libraryAssets.find(a => a.id === asset.id);
                               const isOutdated = libAsset && asset.version < libAsset.version;
                               
                               return (
                                  <motion.div 
                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    key={idx} 
                                    className="relative group shrink-0"
                                  >
                                     <img src={`https://images.unsplash.com/photo-${asset.img}?auto=format&fit=crop&q=80&w=100`} className={`w-10 h-10 rounded border object-cover shadow-sm ${isOutdated ? 'border-red-400 opacity-80' : 'border-[var(--border-color)]'}`} title={asset.title} />
                                     {isOutdated && (
                                        <button 
                                           onClick={(e) => {
                                               e.stopPropagation();
                                               updateBoundAssetVersion(item.id, asset);
                                           }}
                                           className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full shadow-[0_0_0_2px_white] z-10 hover:bg-red-600 transition-colors tooltip animate-pulse cursor-pointer" 
                                           title="资产有更新，点击一键刷新"
                                        />
                                     )}
                                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center rounded transition-opacity backdrop-blur-[1.5px] gap-1">
                                        <button 
                                          onClick={(e) => {
                                             e.stopPropagation();
                                             setBoundAssets(prev => ({
                                                ...prev,
                                                [item.id]: prev[item.id].filter((a: any) => a.id !== asset.id)
                                             }));
                                          }} 
                                          className="icon-md bg-[var(--bg-panel)]/20 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors tooltip"
                                          title="解绑资产"
                                        >
                                           <X className="w-3 h-3 text-white" />
                                        </button>
                                     </div>
                                     {!isOutdated && (
                                        <div className="absolute -top-1 -right-1">
                                           <span className="flex h-3 w-3 relative">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border border-white"></span>
                                           </span>
                                        </div>
                                     )}
                                  </motion.div>
                               );
                            })}
                         </div>
                      )}
                   </div>
                   <div className="lg:w-[65%] flex flex-col justify-center relative">
                      <div className="absolute -left-6 top-1/2 -translate-y-1/2 icon-xl rounded-full bg-[var(--bg-panel)] border border-[var(--border-color)] shadow-sm hidden lg:flex items-center justify-center z-10">
                         <ArrowRight className="icon-sm text-gray-400" />
                      </div>
                      <div className="bg-blue-50/60 border border-blue-100/80 rounded-[var(--radius-lg)] p-4 text-[13px] font-mono text-[var(--text-main)] leading-relaxed cursor-text focus-within:ring-2 focus-within:ring-blue-300 focus-within:bg-[var(--bg-panel)] transition-all ml-2 h-24 overflow-y-auto custom-scrollbar shadow-inner" contentEditable suppressContentEditableWarning>
                        {item.prompt}
                      </div>
                      <div className="flex justify-end mt-4 ml-2 space-x-3">
                         <button 
                           className="text-[12px] font-bold text-gray-600 hover:text-[var(--text-main)] border border-[var(--border-color)] px-4 py-2 rounded-lg bg-[var(--bg-panel)] shadow-sm flex items-center hover:bg-gray-50 transition-colors"
                           onClick={(e) => { e.stopPropagation(); setActiveConfigId(item.id); }}
                         >
                            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" /> 局部参数配置
                         </button>
                         <button className="text-[12px] font-bold text-white hover:bg-blue-700 bg-[var(--color-primary)] px-4 py-2 rounded-lg shadow-sm flex items-center transition-colors">
                            <LayoutTemplate className="w-3.5 h-3.5 mr-1.5" /> 生成本镜图像
                         </button>
                      </div>
                   </div>
                </motion.div>
             ))}
             
             <div className="flex justify-center mt-6">
                <button className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-[var(--text-main)] hover:border-gray-900 hover:bg-[var(--bg-panel)] transition-all">
                   <Plus className="icon-md" />
                </button>
             </div>
          </div>

          {/* Real-time Status Monitor Inline Panel */}
          <AnimatePresence>
            {showMonitor && (
               <motion.div 
                  initial={{ opacity: 0, y: 50, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: 50, height: 0 }}
                  className="mt-6 border border-[var(--border-color)] rounded-[24px] bg-[#1a73e8] text-white shadow-xl overflow-hidden flex flex-col shrink-0 relative z-20"
               >
                  <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-950">
                     <div className="flex items-center text-xs font-bold text-white px-2">
                        <Activity className="icon-sm mr-2 text-green-400 animate-pulse" /> AI 节点执行监控
                     </div>
                     <div className="flex space-x-3 px-2 items-center">
                        <button 
                           onClick={() => alert('已选中分镜组，正将 Temperature 恢复为 0.7，Seed 恢复为随机...')}
                           className="bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-[10px] font-bold px-2.5 py-1 rounded transition-colors flex items-center shadow-sm tooltip"
                           title="强制重置并刷新选定分镜的稳定性数值"
                        >
                           <RotateCcw className="w-3 h-3 mr-1" /> 批量重置分镜参数
                        </button>
                        <div className="h-4 w-px bg-gray-800 mx-1"></div>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">Node: us-central-gpu-1</span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">Jobs Active: 3</span>
                     </div>
                  </div>
                  <div className="h-[200px] overflow-y-auto p-4 custom-scrollbar font-mono text-[11px] leading-relaxed space-y-1.5 bg-[#0a0a0a]">
                     <div className="text-[var(--text-muted)]">[10:15:22.043] <span className="text-blue-400">INFO</span> Pipeline execution started...</div>
                     <div className="text-[var(--text-muted)]">[10:15:22.105] <span className="text-blue-400">INFO</span> [Shot 01] Generating base text prompt... <span className="text-green-400">OK</span></div>
                     <div className="text-[var(--text-muted)]">[10:15:23.400] <span className="text-blue-400">INFO</span> [Shot 01] Forwarding prompt to Midjourney V6 via API...</div>
                     <div className="text-[var(--text-muted)]">[10:15:25.882] <span className="text-yellow-400">WARN</span> [Shot 02] Processing bound visual assets (Input Source) weighting [ref-1: 0.7]</div>
                     <div className="flex text-gray-300 items-center mt-2 mb-2">
                        <span className="text-[var(--text-muted)] mr-2">[10:15:28.110]</span> 
                        <span className="text-blue-400 mr-2">RUNNING</span> 
                        <span>[Shot 01] Image synthesis progress:</span> 
                        <span className="ml-2 text-white font-bold">45%</span>
                        <span className="ml-2 w-32 bg-gray-800 rounded-full h-2 overflow-hidden flex"><span className="bg-green-500 h-full w-[45%] block"></span></span>
                     </div>
                     <div className="flex text-gray-300">
                        <span className="text-[var(--text-muted)] mr-2">[10:15:28.510]</span> 
                        <span className="text-blue-400 mr-2">RUNNING</span> 
                        <span>[Audio Node] TTS Generation for Shot 02 Voiceover...</span> 
                     </div>
                  </div>
               </motion.div>
            )}
          </AnimatePresence>
       </div>

       {/* Sub-config Drawer / Sidebar */}
       <AnimatePresence>
         {activeConfigId && (
            <motion.div 
               initial={{ opacity: 0, x: 50, width: 0 }}
               animate={{ opacity: 1, x: 0, width: 340 }}
               exit={{ opacity: 0, x: 50, width: 0 }}
               className="shrink-0 relative overflow-hidden"
            >
               <div className="w-[340px] h-full bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm flex flex-col">
                  <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-gray-50/50 rounded-t-[24px]">
                     <h3 className="text-sm font-black flex items-center text-[var(--text-main)]">
                        <SlidersHorizontal className="icon-sm mr-2 text-[var(--color-primary)]" />
                        SHOT {String(activeConfigId).padStart(2, '0')} 渲染参数
                     </h3>
                     <button onClick={() => setActiveConfigId(null)} className="p-1 hover:bg-gray-200 rounded-lg text-[var(--text-muted)] transition-colors">
                        <X className="icon-sm" />
                     </button>
                  </div>
                  <div className="p-5 flex-1 overflow-y-auto space-y-[var(--spacing-lg)]">
                     <div className="space-y-[var(--spacing-md)]">
                        <div>
                           <div className="flex justify-between items-center mb-1.5">
                              <label className="text-xs font-bold text-gray-700">模型选择 (Model)</label>
                           </div>
                           <select className="w-full bg-gray-50 border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none">
                              <option>Midjourney V6</option>
                              <option>Stable Diffusion XL</option>
                              <option>Niji 6</option>
                           </select>
                        </div>

                        <div>
                           <div className="flex justify-between items-center mb-1.5">
                              <label className="text-xs font-bold text-gray-700">风格化程度 (Style)</label>
                              <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">--s 250</span>
                           </div>
                           <input type="range" min="0" max="1000" defaultValue="250" className="w-full accent-blue-600" />
                        </div>
                        
                        <div>
                           <div className="flex justify-between items-center mb-1.5">
                              <label className="text-xs font-bold text-gray-700">创意发散度 (Chaos)</label>
                              <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">--c 15</span>
                           </div>
                           <input type="range" min="0" max="100" defaultValue="15" className="w-full accent-blue-600" />
                        </div>

                        <div>
                           <div className="flex justify-between items-center mb-1.5">
                              <label className="text-xs font-bold text-gray-700">随机种子 (Seed)</label>
                           </div>
                           <div className="flex space-x-2">
                              <input type="text" placeholder="留空使用随机" defaultValue="982371" className="flex-1 bg-gray-50 border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                              <button className="p-2 border border-[var(--border-color)] rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600" title="生成新种子">
                                 <RefreshCcw className="icon-sm" />
                              </button>
                           </div>
                        </div>
                     </div>
                     
                     <div className="pt-4 border-t border-[var(--border-color)]">
                        <button className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm py-2.5 rounded-[var(--radius-lg)] transition-colors flex items-center justify-center">
                           <CheckCircle2 className="icon-sm mr-2" /> 应用并重新生成
                        </button>
                     </div>
                  </div>
               </div>
            </motion.div>
         )}
       </AnimatePresence>
    </motion.div>
  )
}

function StoryboardView() {
  const [activeVariantId, setActiveVariantId] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [consistencyResult, setConsistencyResult] = useState<any>(null);
  const [fixingShotId, setFixingShotId] = useState<string | null>(null);
  const [fixedImages, setFixedImages] = useState<Record<string, string>>({});
  
  // State for Split Screen Compare
  const [comparingShotId, setComparingShotId] = useState<number | null>(null);
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  
  // State for Shots configuration and Undo History
  const [shots, setShots] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8]);
  const [pastStates, setPastStates] = useState<number[][]>([]);
  const [deletedShot, setDeletedShot] = useState<number | null>(null);

  const handleDeleteShot = (id: number) => {
     setPastStates(prev => [...prev, shots]);
     setShots(prev => prev.filter(shot => shot !== id));
     setDeletedShot(id);
  };

  const handleUndo = () => {
     if (pastStates.length > 0) {
        setShots(pastStates[pastStates.length - 1]);
        setPastStates(prev => prev.slice(0, -1));
        setDeletedShot(null);
     }
  };

  const runConsistencyCheck = () => {
     setIsChecking(true);
     setConsistencyResult(null);
     setFixingShotId(null);
     setTimeout(() => {
        setIsChecking(false);
        setConsistencyResult({
           score: 92,
           issues: [
             { shot: '03', message: '光影高对比度与其他镜头不一致，偏向硬光 (Hard Light)。', param: '--c 15 -> --c 5' },
             { shot: '05', message: '人物面部特征稍有偏移 (结构差异)。', param: '--cref ID_329a' }
           ],
           suggestion: '建议在全局 Prompt 附加 --cref 参数并降低 Shot 03 的 chaos 值。'
        });
     }, 1500);
  };

  const applyFix = (shot: string) => {
     setFixingShotId(shot);
     // Simulate realtime fix preview
     setTimeout(() => {
        setFixedImages(prev => ({
           ...prev,
           [shot]: `1600880292-2d6ebc-329a${shot}` // use a random different ID to show difference
        }));
        setFixingShotId(null);
        setConsistencyResult((prev: any) => ({
           ...prev,
           issues: prev.issues.filter((i: any) => i.shot !== shot)
        }));
     }, 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-6xl mx-auto space-y-[var(--spacing-lg)]"
    >
       <div className="flex justify-between items-end mb-[var(--spacing-md)]">
          <div>
            <h3 className="text-xl font-black text-[var(--text-main)] flex items-center">
              <LayoutTemplate className="icon-lg mr-3 text-[var(--text-main)]" />
              故事板分镜可视化
            </h3>
            <p className="text-sm font-medium text-[var(--text-muted)] mt-2">基于生成的提示词，通过 AI 画图引擎渲染出视觉故事板图像集。</p>
          </div>
          <div className="flex space-x-3">
             <button 
               onClick={runConsistencyCheck}
               disabled={isChecking}
               className="bg-purple-50 border border-purple-200 text-purple-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center hover:bg-purple-100 transition-colors shadow-sm disabled:opacity-50"
             >
                {isChecking ? <RefreshCcw className="icon-sm mr-2 animate-spin text-purple-600" /> : <Activity className="icon-sm mr-2 text-purple-600" />}
                一致性检查
             </button>
             <button className="bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center hover:bg-gray-50 transition-colors shadow-sm">
                <Settings className="icon-sm mr-2" /> 渲染通道设置
             </button>
             <button className="bg-[var(--color-primary)] text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center hover:bg-black transition-colors shadow-sm tracking-wide">
                <Wand2 className="icon-sm mr-2" /> 一键生成全画面
             </button>
          </div>
       </div>

       <AnimatePresence>
          {consistencyResult && (
             <motion.div 
               initial={{ opacity: 0, height: 0, y: -10 }}
               animate={{ opacity: 1, height: 'auto', y: 0 }}
               exit={{ opacity: 0, height: 0, scale: 0.98 }}
               className="mb-[var(--spacing-xl)]"
             >
                <div className="p-5 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm flex items-start space-x-6 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                      <Activity className="w-24 h-24" />
                   </div>
                   <div className="flex flex-col items-center justify-center shrink-0">
                      <div className="w-16 h-16 rounded-full bg-green-50 border-4 border-green-100 flex items-center justify-center mb-2">
                         <span className="text-xl font-black text-green-600">{consistencyResult.score}</span>
                      </div>
                      <span className="text-[10px] font-bold tracking-wider text-gray-400">总体一致性</span>
                   </div>
                   <div className="flex-1 space-y-3 relative z-10">
                      <h4 className="text-sm font-black text-[var(--text-main)] flex items-center">
                         <CheckCircle2 className="icon-sm mr-2 text-green-500" /> 分析完成，视觉连续性良好。
                      </h4>
                      <p className="text-sm text-gray-600 leading-relaxed font-medium">
                        {consistencyResult.suggestion}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-3 mt-3">
                         {consistencyResult.issues.map((issue: any, i: number) => (
                            <div key={i} className="flex flex-col bg-orange-50/50 border border-orange-100 rounded-[var(--radius-lg)] p-3 relative group transition-all hover:bg-orange-50">
                               <div className="flex items-start">
                                  <AlertCircle className="icon-sm text-orange-500 mr-2 shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                     <span className="text-[11px] font-bold text-orange-800 bg-orange-100 px-1.5 py-0.5 rounded shadow-sm mr-2 mb-1 inline-block shrink-0">SHOT {issue.shot}</span>
                                     <span className="text-[11px] text-orange-700 leading-tight block">{issue.message}</span>
                                  </div>
                               </div>
                               <div className="flex justify-between items-center mt-3 pt-2 border-t border-orange-100/50">
                                  <span className="text-[10px] font-mono text-orange-600 bg-[var(--bg-panel)] px-1.5 py-0.5 rounded shadow-sm">修正: {issue.param}</span>
                                  <button 
                                     onClick={() => applyFix(issue.shot)}
                                     disabled={fixingShotId === issue.shot}
                                     className="bg-[var(--bg-panel)] hover:bg-orange-100 text-orange-700 border border-orange-200 text-[10px] font-bold px-3 py-1 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-wait flex items-center"
                                  >
                                     {fixingShotId === issue.shot ? (
                                        <><RefreshCcw className="w-3 h-3 mr-1 animate-spin" /> 渲染中...</>
                                     ) : (
                                        <><Wand2 className="w-3 h-3 mr-1" /> 应用修正</>
                                     )}
                                  </button>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                   <button onClick={() => setConsistencyResult(null)} className="absolute top-3 right-3 p-1.5 text-gray-400 hover:bg-gray-100 rounded-full transition-colors z-20">
                      <X className="icon-sm" />
                   </button>
                </div>
             </motion.div>
          )}
       </AnimatePresence>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[var(--spacing-md)] px-2 pb-10 grid-flow-dense auto-rows-max">
          <AnimatePresence mode="popLayout">
          {shots.map(i => {
             const isFixing = fixingShotId === String(i).padStart(2, '0');
             const isHighlight = i === 2 || i === 5; // Narratively important shots
             
             return (
             <motion.div 
               layout
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.8, filter: 'blur(5px)' }}
               key={i} 
               className={`relative w-full rounded-[20px] transition-all duration-500 ${isHighlight ? 'md:col-span-2 md:row-span-2' : ''} ${isFixing ? 'p-[3px] shadow-[0_0_25px_rgba(26,115,232,0.6)] scale-[1.02] z-30' : ''}`}
             >
                 {isFixing && (
                    <div className="absolute inset-0 rounded-[20px] overflow-hidden z-0 pointer-events-none">
                       <div className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%] bg-[conic-gradient(from_0deg,transparent_0_340deg,#1a73e8_360deg)] animate-[spin_2s_linear_infinite]"></div>
                    </div>
                 )}
              <div 
                 className={`bg-[var(--bg-panel)] rounded-[18px] overflow-hidden flex flex-col h-full ${isFixing ? 'border-0 relative z-10' : 'border border-[var(--border-color)] shadow-sm hover:shadow-xl'} transition-all duration-300 group`}
              >
                 <div className="aspect-[16/9] bg-gray-100 relative overflow-hidden shrink-0">
                       {isFixing && (
                          <div className="absolute inset-0 bg-[var(--bg-panel)] z-20 flex flex-col items-center justify-center overflow-hidden">
                             {/* Google Style Glowing Loader */}
                             <div className="absolute w-[150%] h-[150%] bg-[conic-gradient(from_90deg,transparent_0%,#4285F4_25%,#EA4335_50%,#FBBC05_75%,#34A853_100%)] animate-[spin_3s_linear_infinite] opacity-30 blur-2xl"></div>
                             <div className="absolute inset-2 bg-[var(--bg-panel)] rounded-lg shadow-inner z-10"></div>
                             <div className="relative z-30 flex flex-col items-center">
                                <div className="flex space-x-2 mb-3">
                                   <div className="w-2.5 h-2.5 rounded-full bg-[#4285F4] animate-bounce" ></div>
                                   <div className="w-2.5 h-2.5 rounded-full bg-[#EA4335] animate-bounce" ></div>
                                   <div className="w-2.5 h-2.5 rounded-full bg-[#FBBC05] animate-bounce" ></div>
                                   <div className="w-2.5 h-2.5 rounded-full bg-[#34A853] animate-bounce" ></div>
                                </div>
                                <span className="text-xs font-black text-[var(--text-muted)] tracking-wider">AI 正在注入灵魂...</span>
                             </div>
                          </div>
                       )}
                       {comparingShotId === i ? (
                          <div className="absolute inset-0 z-40 bg-gray-900 overflow-hidden">
                              <img src={`https://images.unsplash.com/photo-${['1518770660439-4636190af475','1526304640581-d334cdbbf45e','1550684376-ef3b244d25ce','1563089145559-05d10b1001f2'][i % 4]}?auto=format&fit=crop&q=80&w=400`} className="absolute inset-0 w-full h-full object-cover grayscale opacity-60" />
                              <img src={`https://images.unsplash.com/photo-${['1500462918059-b1a0cb512f1d', '1511216335778-4cb8f49fa7a3', '1520038419904-469bfd6b2c2f'][i % 3]}?auto=format&fit=crop&q=80&w=400`} className="absolute inset-0 w-full h-full object-cover" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }} />
                              
                              <div className="absolute top-0 bottom-0 w-1 bg-[var(--bg-panel)] cursor-ew-resize flex items-center justify-center transform -translate-x-1/2 shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20 pointer-events-none" style={{ left: `${sliderPosition}%` }}>
                                  <div className="icon-xl rounded-full bg-[var(--bg-panel)] shadow-lg flex items-center justify-center pointer-events-none border border-[var(--border-color)] text-[var(--color-primary)]">
                                      <SplitSquareHorizontal className="icon-sm text-[var(--color-primary)]" />
                                  </div>
                              </div>
                              
                              <input 
                                  type="range" min="0" max="100" value={sliderPosition}
                                  onChange={(e) => setSliderPosition(Number(e.target.value))}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                              />
                              <div className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-black tracking-widest px-2.5 py-1 rounded backdrop-blur border border-white/20 pointer-events-none z-20 shadow-sm">原版本 V1</div>
                              <div className="absolute top-3 right-3 bg-[var(--color-primary)] text-white text-[10px] font-black tracking-widest px-2.5 py-1 rounded backdrop-blur shadow-sm pointer-events-none z-20">变体优化 V2</div>
                              <button 
                                  onClick={(e) => { e.stopPropagation(); setComparingShotId(null); }}
                                  className="absolute bottom-3 right-3 bg-gray-900/80 text-white p-2 rounded-full hover:bg-black backdrop-blur z-50 transition-colors shadow-lg border border-gray-600"
                              >
                                  <X className="icon-sm" />
                              </button>
                          </div>
                       ) : (
                          <>
                             {fixedImages[String(i).padStart(2, '0')] ? (
                                <img src={`https://images.unsplash.com/photo-${[
                                    '1518770660439-4636190af475',
                                    '1526304640581-d334cdbbf45e',
                                ][i % 2]}?auto=format&fit=crop&q=80&w=400&sat=-50`} alt="Fixed Scene" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                             ) : (
                                <img src={`https://images.unsplash.com/photo-${[
                                  '1518770660439-4636190af475',
                                  '1526304640581-d334cdbbf45e',
                                  '1550684376-ef3b244d25ce',
                                  '1563089145559-05d10b1001f2',
                                ][i % 4]}?auto=format&fit=crop&q=80&w=400`} alt="Scene" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                             )}
                             
                             {fixedImages[String(i).padStart(2, '0')] && (
                                <div className="absolute top-3 left-20 bg-green-500 text-white text-[11px] font-black px-2.5 py-1 rounded-md shadow flex items-center">
                                   <CheckCircle2 className="w-3 h-3 mr-1" /> 已修印
                                </div>
                             )}
                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-3 backdrop-blur-sm z-10">
                                <button className="w-12 h-12 bg-[var(--bg-panel)] rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform"><Camera className="icon-md text-[var(--text-main)]" /></button>
                                <button className="w-12 h-12 bg-[var(--color-primary)] rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform"><Settings className="icon-md text-white" /></button>
                             </div>
                          </>
                       )}
                    <div className="absolute top-3 left-3 bg-[var(--bg-panel)]/90 text-[var(--text-main)] text-[11px] font-black px-2.5 py-1 rounded-md backdrop-blur shadow-sm flex items-center">
                       SHOT {String(i).padStart(2, '0')}
                       {isHighlight && <span className="ml-2 pl-2 border-l border-gray-300 text-[var(--color-primary)] flex items-center"><Sparkles className="w-3 h-3 mr-1" /> 重点高光</span>}
                    </div>

                    <button 
                       onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteShot(i);
                       }}
                       className="absolute top-3 right-3 icon-xl bg-[var(--bg-panel)]/90 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm z-20"
                       title="删除镜头"
                    >
                       <Trash2 className="icon-sm" />
                    </button>
                    
                    {/* Visual Camera Movement Indicator */}
                    <div className="absolute bottom-3 right-3 text-white flex gap-2">
                       <div className="bg-purple-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm backdrop-blur">
                          Dolly Gen-3
                       </div>
                       <ArrowRight className="icon-sm opacity-70" />
                    </div>
                 </div>
                 <div className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">远景 / Dolly In</p>
                      <span className="text-[10px] bg-gray-100 text-blue-700 px-2.5 py-1 rounded-md font-black shadow-inner">3.5s</span>
                    </div>
                    <p className="text-[13px] font-bold text-[var(--text-main)] leading-relaxed mb-3">
                      展示整体产品外观与环境的交织，画面缓慢推进，配合重低音音效。{i % 2 === 0 ? '此外，还需要特别关注细节，特写变化自然。' : ''}
                    </p>
                    <div className="bg-blue-50/40 border border-blue-100/50 rounded-lg p-2.5 text-[10px] text-[var(--text-muted)] font-mono leading-relaxed line-clamp-2 hover:line-clamp-none transition-all cursor-text mb-3 mt-auto shadow-inner" title="Prompt">
                       /imagine prompt: cinematic photography of a sleek smart device...
                    </div>
                    
                    <div className="flex space-x-2 mt-auto shrink-0">
                       <button 
                          onClick={() => {
                             if (comparingShotId === i) setComparingShotId(null);
                             else {
                                setComparingShotId(i);
                                setSliderPosition(50);
                             }
                          }}
                          className={`flex-1 text-xs font-bold py-2 rounded-lg flex items-center justify-center transition-colors border ${comparingShotId === i ? 'bg-[var(--color-primary)] text-white border-blue-600' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-[var(--border-color)]'}`}
                       >
                          <SplitSquareHorizontal className="w-3.5 h-3.5 mr-1" /> {comparingShotId === i ? '退出对比' : '分屏对比'}
                       </button>
                       <button 
                          onClick={() => setActiveVariantId(activeVariantId === i ? null : i)}
                          className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold py-2 rounded-lg flex items-center justify-center transition-colors border border-amber-200/50"
                       >
                          <Sparkles className="w-3.5 h-3.5 mr-1" /> 变体建议
                       </button>
                       <button className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-2 rounded-lg flex items-center justify-center transition-colors">
                          <Video className="w-3.5 h-3.5 mr-1" /> 预渲染
                       </button>
                    </div>
                 </div>
 
                 {/* AI Variants Overlay */}
                 <AnimatePresence>
                    {activeVariantId === i && (
                       <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute inset-x-2 bottom-2 bg-[var(--bg-panel)] rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.15)] border border-[var(--border-color)] z-30 p-4"
                       >
                          <div className="flex justify-between items-center mb-3">
                             <span className="text-xs font-black text-[var(--text-main)] flex items-center">
                                <Wand2 className="w-3.5 h-3.5 mr-1 text-purple-600" /> AI 变体风格
                             </span>
                             <button onClick={() => setActiveVariantId(null)} className="text-gray-400 hover:text-[var(--text-main)]">
                                <X className="icon-sm" />
                             </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                             {[1,2,3].map(v => (
                                <div key={v} className="group/variant relative rounded-lg overflow-hidden border border-[var(--border-color)] cursor-pointer">
                                   <img 
                                      src={`https://images.unsplash.com/photo-${['1500462918059-b1a0cb512f1d', '1511216335778-4cb8f49fa7a3', '1520038419904-469bfd6b2c2f'][v%3]}?auto=format&fit=crop&q=80&w=200`}
                                      className="w-full aspect-[4/3] object-cover group-hover/variant:scale-110 transition-transform duration-300" 
                                   />
                                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/variant:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                      <button className="bg-[var(--color-primary)] hover:bg-blue-700 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">替换</button>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </motion.div>
                    )}
                 </AnimatePresence>
              </div>
             </motion.div>
             );
          })}
          </AnimatePresence>
       </div>

       {/* Undo Toast mechanism */}
       <AnimatePresence>
          {deletedShot && pastStates.length > 0 && (
             <motion.div 
               initial={{ opacity: 0, y: 50, scale: 0.9 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: 20, scale: 0.8 }}
               className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3.5 rounded-full shadow-2xl flex items-center space-x-5 z-50 border border-gray-700 font-medium text-[13px] backdrop-blur-md"
             >
                <div className="flex items-center">
                   <div className="icon-xl rounded-full bg-gray-800 flex items-center justify-center mr-3">
                      <Trash2 className="icon-sm text-gray-400" />
                   </div>
                   <span>已删除 SHOT {String(deletedShot).padStart(2, '0')}</span>
                </div>
                <div className="w-px h-5 bg-gray-600 hidden sm:block"></div>
                <button 
                  onClick={handleUndo} 
                  className="flex items-center text-[#4285F4] hover:text-[#8AB4F8] transition-colors font-bold whitespace-nowrap pl-2 sm:pl-0"
                >
                   <Undo2 className="icon-sm mr-1.5" /> 撤销操作
                </button>
                <button 
                  onClick={() => setDeletedShot(null)}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                >
                   <X className="icon-sm" />
                </button>
             </motion.div>
          )}
       </AnimatePresence>
    </motion.div>
  )
}

function ScriptView() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [minShotDuration, setMinShotDuration] = useState<number>(3);

  const [scriptLines, setScriptLines] = useState([
    { role: '黄金三秒', content: '还在用传统方式做设计？这 3 个隐藏功能让你效率翻倍！', type: '悬念钩子', duration: '3s' },
    { role: '痛点引入', content: '每天加班画图，老板催进度，甲方改需求，素材找不到...', type: '受众共鸣', duration: '5s' },
    { role: '核心展示', content: '看看这个全自动 AI 工作流，只需输入一句提示词...', type: 'Demo演示', duration: '12s' },
    { role: '行动号召', content: '点击左下角链接，现在体验即赠送 100 张算力券！', type: '强转化营销', duration: '4s' },
  ]);

  const handleAutoSplit = () => {
    setIsAnalyzing(true);
    // Simulate AI parsing delay
    setTimeout(() => {
      const parts = importText.split('\n').filter(p => p.trim() !== '');
      const newLines = parts.map((part, index) => {
        let role = '剧情过渡';
        let type = '场景叙事';
        if (index === 0) { role = '开场钩子'; type = '吸引注意'; }
        else if (index === parts.length - 1) { role = '结尾动作'; type = '行动引导'; }
        
        return {
          role,
          content: part,
          type,
          duration: `${Math.max(minShotDuration, Math.floor(part.length / 5))}s`
        };
      });
      if (newLines.length > 0) {
        setScriptLines([...scriptLines, ...newLines]);
      }
      setIsAnalyzing(false);
      setIsImporting(false);
      setImportText("");
    }, 1500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto space-y-[var(--spacing-md)]"
    >
       <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-3xl p-[var(--spacing-xl)] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-[var(--spacing-xl)] opacity-5 pointer-events-none">
             <MessageSquare className="w-32 h-32" />
          </div>
          
          <div className="flex justify-between items-center mb-[var(--spacing-xl)] border-b border-[var(--border-color)] pb-4 relative z-10">
             <h3 className="text-xl font-black text-[var(--text-main)] flex items-center">
                <MessageSquare className="icon-lg mr-3 text-[var(--text-main)]" />
                剧本大纲与智能分词
             </h3>
             <div className="flex space-x-3">
                <button 
                  onClick={() => setIsImporting(!isImporting)}
                  className={`px-4 py-2 ${isImporting ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-[var(--bg-panel)] text-gray-700 border-[var(--border-color)]'} border hover:bg-gray-50 flex items-center text-xs font-bold rounded-lg transition-colors shadow-sm`}
                >
                   <Plus className="w-3.5 h-3.5 mr-1" /> 导入长剧本 (AI切分)
                </button>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors">AI 智能润色</button>
                <button className="px-5 py-2 bg-[var(--color-primary)] text-white text-xs font-bold rounded-lg hover:bg-black transition-colors shadow-sm focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 flex items-center">
                   生成分镜提示词 <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
             </div>
          </div>

          <AnimatePresence>
            {isImporting && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-[var(--spacing-xl)] relative z-10"
              >
                <div className="bg-gray-50 border border-[var(--border-color)] rounded-[var(--radius-xl)] p-4 shadow-inner">
                  <div className="flex justify-between items-center mb-3">
                     <span className="text-sm font-bold text-gray-700 flex items-center">
                        <Sparkles className="icon-sm mr-2 text-indigo-500" />
                        粘贴文本，AI将自动识别对话与场景进行分镜切分
                     </span>
                     <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-[var(--text-muted)]">最小分镜时长 (秒):</span>
                        <input 
                           type="number" 
                           min="1" 
                           max="30" 
                           value={minShotDuration} 
                           onChange={(e) => setMinShotDuration(Number(e.target.value))}
                           className="w-16 px-2 py-1 text-center bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                     </div>
                  </div>
                  <textarea 
                    className="w-full h-32 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] p-4 text-sm font-medium text-[var(--text-main)] focus:ring-2 focus:ring-blue-400 focus:outline-none resize-none transition-shadow custom-scrollbar"
                    placeholder="输入需要处理的剧本大纲或连续对话文本..."
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    disabled={isAnalyzing}
                  ></textarea>
                  <div className="flex justify-end mt-3">
                     <button 
                       onClick={handleAutoSplit}
                       disabled={importText.trim().length === 0 || isAnalyzing}
                       className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-[var(--radius-lg)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
                     >
                       {isAnalyzing ? (
                         <>
                           <RefreshCcw className="icon-sm mr-2 animate-spin" />
                           脑图神经切分中...
                         </>
                       ) : (
                         <>
                           <Wand2 className="icon-sm mr-2" />
                           AI 自动分析并归片
                         </>
                       )}
                     </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="space-y-[var(--spacing-lg)] relative z-10">
             {scriptLines.map((line, idx) => (
                <motion.div 
                   key={idx} 
                   className={`flex gap-[var(--spacing-md)] group items-start p-4 -space-x-2 -mx-4 rounded-[var(--radius-xl)] transition-colors duration-300 ${
                     activeIndex === idx ? 'bg-blue-50/40 ring-1 ring-blue-100' : 'hover:bg-gray-50/50'
                   }`}
                   onFocus={() => setActiveIndex(idx)}
                   onBlur={() => setActiveIndex(null)}
                   tabIndex={-1}
                >
                   <div className="w-28 shrink-0 text-right pt-2 border-r-2 border-[var(--border-color)] pr-5 group-hover:border-blue-400 transition-colors duration-300 relative">
                      {activeIndex === idx && (
                         <motion.div layoutId="active-indicator" className="absolute -right-0.5 top-2 w-1 h-8 bg-blue-500 rounded-l translate-x-full"></motion.div>
                      )}
                      <span className={`text-[13px] font-black block transition-colors ${activeIndex === idx ? 'text-blue-700' : 'text-[var(--text-muted)] group-hover:text-[var(--text-main)]'}`}>{line.role}</span>
                      <span className={`text-[10px] px-2 py-1 rounded inline-block mt-2 font-bold ${activeIndex === idx ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-[var(--text-muted)]'}`}>{line.type}</span>
                      <span className="text-[10px] text-gray-400 block mt-1 font-mono">{line.duration}</span>
                   </div>
                   <div className="flex-1 pl-4">
                      <div 
                         className={`bg-[var(--bg-panel)] border rounded-[var(--radius-xl)] p-5 text-[var(--text-main)] text-[15px] font-medium leading-relaxed transition-all cursor-text shadow-sm relative group-hover:shadow-md focus:outline-none focus:ring-2 ${
                           activeIndex === idx ? 'border-blue-300 ring-blue-100 ring-4 z-10 scale-[1.01]' : 'border-[var(--border-color)] hover:border-gray-300'
                         }`} 
                         contentEditable 
                         suppressContentEditableWarning
                      >
                        {line.content}
                      </div>
                      
                      {/* AI Suggestions Block */}
                      {idx === 0 && (
                        <div className={`mt-4 flex gap-3 overflow-x-auto hide-scrollbar transition-opacity duration-300 ${activeIndex === idx ? 'opacity-100 ' : 'opacity-60 grayscale'}`}>
                           <span className="shrink-0 text-[11px] font-black text-gray-400 py-1.5 flex items-center"><Wand2 className="w-3.5 h-3.5 mr-1" /> 推荐变体:</span>
                           <button className="shrink-0 text-[12px] bg-blue-50 text-blue-700 border border-blue-100 px-4 py-1.5 rounded-full font-bold hover:bg-blue-100 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-300">别再熬夜做图了！这个 AI 神器帮你...</button>
                           <button className="shrink-0 text-[12px] bg-purple-50 text-purple-700 border border-purple-100 px-4 py-1.5 rounded-full font-bold hover:bg-purple-100 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-300">99%的设计师都不知道的偷懒秘籍...</button>
                           <button className="shrink-0 icon-xl rounded-full border border-[var(--border-color)] flex items-center justify-center text-gray-400 hover:text-[var(--text-main)] hover:bg-gray-100 shadow-sm transition-colors tooltip tooltip-top" data-tip="换一批"><ArrowRight className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                   </div>
                </motion.div>
             ))}
             
             {/* New Block prompt */}
             <div className="flex gap-[var(--spacing-md)] items-center mt-10 opacity-60 hover:opacity-100 transition-opacity cursor-pointer group">
                <div className="w-24 shrink-0 text-right pr-5">
                   <div className="icon-xl rounded-full bg-gray-100 flex items-center justify-center ml-auto group-hover:bg-gray-200 transition-colors">
                      <Plus className="icon-sm text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />
                   </div>
                </div>
                <div className="flex-1 border-2 border-dashed border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 text-center font-bold text-[var(--text-muted)] group-hover:text-[var(--text-main)] group-hover:border-gray-400 group-hover:bg-gray-50 transition-all shadow-sm">
                   添加新剧本段落或分支镜头
                </div>
             </div>
          </div>
       </div>
    </motion.div>
  )
}

function ShotsView() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="max-w-6xl mx-auto h-full flex flex-col"
    >
       <div className="flex justify-between items-end mb-[var(--spacing-md)]">
          <div>
            <h3 className="text-xl font-black text-[var(--text-main)] flex items-center">
              <Video className="icon-lg mr-3 text-[var(--text-main)]" />
              动态视频合成与配音渲染
            </h3>
            <p className="text-sm font-medium text-[var(--text-muted)] mt-2">核心工作流：<span className="bg-gray-100 px-1.5 py-0.5 rounded text-[var(--text-main)] mx-1">分镜静帧</span> + <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[var(--text-main)] mx-1">运镜提示词 (Runway/SVD)</span> + <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[var(--text-main)] mx-1">语音合成 (TTS)</span> = 输出大片级成片。</p>
          </div>
       </div>
       <div className="bg-[#0A0A0A] rounded-[32px] overflow-hidden flex-1 relative flex flex-col items-center justify-center shadow-2xl border border-gray-800 group">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 pointer-events-none"></div>
          
          <img src="https://images.unsplash.com/photo-1550684376-ef3b244d25ce?auto=format&fit=crop&q=80&w=1200" className="absolute inset-0 w-full h-full object-cover opacity-60" />
          
          <div className="z-20 relative transform group-hover:scale-110 transition-transform duration-500">
             <PlayCircle className="w-24 h-24 text-white/50 hover:text-white transition-colors cursor-pointer drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
          </div>
          
          {/* Professional playback controls UI */}
          <div className="absolute bottom-0 inset-x-0 p-[var(--spacing-lg)] z-20">
             <div className="flex items-center space-x-4 text-white/80 font-mono text-sm font-bold mb-4">
                <span>00:00:14:02</span>
                <div className="flex-1 h-1.5 bg-[var(--bg-panel)]/20 rounded-full overflow-hidden">
                   <div className="h-full w-1/3 bg-[var(--bg-panel)] rounded-full relative">
                      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-[var(--bg-panel)] rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                   </div>
                </div>
                <span>00:00:45:00</span>
             </div>
             
             <div className="flex justify-between items-center backdrop-blur-md bg-[var(--bg-panel)]/10 p-4 rounded-[var(--radius-xl)] border border-white/10">
                <div className="flex space-x-2">
                   <button className="text-white bg-[var(--bg-panel)]/10 hover:bg-[var(--bg-panel)]/20 px-4 py-2 rounded-[var(--radius-lg)] text-xs font-bold transition-colors shadow-sm">4K Export</button>
                   <button className="text-white bg-[var(--bg-panel)]/10 hover:bg-[var(--bg-panel)]/20 px-4 py-2 rounded-[var(--radius-lg)] text-xs font-bold transition-colors shadow-sm">LUTs / Color</button>
                </div>
                <div className="px-4 py-2 bg-[#1A73E8] text-white rounded-[var(--radius-lg)] text-xs font-bold cursor-pointer hover:bg-[#1557B0] transition-colors flex items-center shadow-lg">
                   <Wand2 className="w-3.5 h-3.5 mr-2" /> AI 一键出片
                </div>
             </div>
          </div>
       </div>
       
       {/* Real Timeline UI */}
       <div className="h-60 mt-6 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] p-5 shadow-sm flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-3">
             <h4 className="text-xs font-black tracking-widest text-gray-400">TIMELINE EDITOR</h4>
             <div className="flex space-x-2">
                <div className="px-3 py-1 bg-gray-100 rounded text-[10px] font-bold text-[var(--text-muted)] cursor-pointer hover:bg-gray-200 transition-colors">吸附模式</div>
                <div className="icon-lg rounded bg-gray-100 flex items-center justify-center text-[var(--text-muted)] hover:bg-gray-200 cursor-pointer transition-colors"><Plus className="w-3 h-3" /></div>
             </div>
          </div>
          
          <div className="flex-1 relative border-t border-[var(--border-color)] pt-3 flex flex-col gap-2 overflow-x-auto overflow-y-hidden hide-scrollbar">
             {/* Playhead */}
             <motion.div 
                animate={{ x: [0, 400] }}
                transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                className="absolute top-0 bottom-0 left-[30%] w-px bg-red-500 z-30 pointer-events-none"
             >
                <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 transform rotate-45 shadow-sm"></div>
             </motion.div>
             
             {/* Track V2 (AI Motion Prompts) */}
             <div className="flex gap-1 h-10 relative w-max pl-20">
                <div className="absolute left-0 top-0 bottom-0 w-16 bg-gray-50 border-r border-[var(--border-color)] flex flex-col items-center justify-center z-10 p-1">
                   <span className="text-[10px] font-black text-gray-700">MOTION</span>
                   <span className="text-[8px] font-bold text-gray-400">Gen-3</span>
                </div>
                {[2,6,9].map(i => (
                   <div key={`motion-${i}`} className="h-full rounded border border-purple-200 bg-purple-50 flex items-center justify-center cursor-pointer hover:border-purple-400 transition-colors group relative overflow-hidden ml-16" style={{ width: i*40 + 'px' }}>
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-purple-400"></div>
                      <span className="text-[9px] font-bold text-purple-700 truncate px-2">{i===2 ? 'Camera Pan Right' : i===6 ? 'Zoom In Slowly' : 'Dolly Shot'}</span>
                   </div>
                ))}
             </div>

             {/* Track V1 (Main Storyboard Image) */}
             <div className="flex gap-1 h-14 relative w-max pl-20 mt-1">
                <div className="absolute left-0 top-0 bottom-0 w-16 bg-gray-50 border-r border-[var(--border-color)] flex flex-col items-center justify-center z-10">
                   <span className="text-[10px] font-black text-gray-700">VISUAL</span>
                   <span className="text-[8px] font-bold text-gray-400">MJ V6</span>
                </div>
                {[1,2,3,4,5,6,7,8,9,10].map(i => (
                   <div key={`v1-${i}`} className={`w-32 h-full rounded border flex-shrink-0 cursor-pointer transition-all relative overflow-hidden group ${
                      i === 3 ? 'border-blue-400 z-20 shadow-sm ring-1 ring-blue-200 brightness-110' : 'border-[var(--border-color)] hover:border-gray-900'
                   }`}>
                      <img src={`https://images.unsplash.com/photo-${[
                           '1518770660439-4636190af475',
                           '1526304640581-d334cdbbf45e',
                           '1550684376-ef3b244d25ce',
                           '1563089145559-05d10b1001f2',
                         ][i % 4]}?auto=format&fit=crop&q=80&w=200`} className={`w-full h-full object-cover ${i===3 ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`} />
                      
                      <div className="absolute bottom-1 inset-x-1 flex justify-between">
                         <span className="bg-black/70 px-1.5 py-0.5 rounded shadow text-[9px] text-white font-mono">IMG_{(i).toString().padStart(2, '0')}</span>
                         <span className="bg-black/70 px-1.5 py-0.5 rounded shadow text-[9px] text-white font-mono">{(i * 2).toFixed(1)}s</span>
                      </div>
                   </div>
                ))}
             </div>

             {/* Track A1 (Voice Over / TTS) */}
             <div className="flex gap-1 h-8 relative w-max pl-20 mt-1">
                <div className="absolute left-0 top-0 bottom-0 w-16 bg-gray-50 border-r border-[var(--border-color)] flex flex-col items-center justify-center z-10">
                   <span className="text-[10px] font-black text-gray-700">VOICE</span>
                   <span className="text-[8px] font-bold text-gray-400">TTS Eleven</span>
                </div>
                {[1,3,4].map(i => (
                   <div key={`a1-${i}`} className="h-full rounded border border-orange-200 bg-orange-50 flex items-center justify-center cursor-pointer hover:border-orange-400 transition-colors group relative overflow-hidden ml-8" style={{ width: i*120 + 'px' }}>
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-orange-400"></div>
                      {/* Simple waveform representation */}
                      <div className="absolute inset-0 opacity-40 flex items-center justify-around px-2">
                         {[...Array(Math.floor(i*10))].map((_, j) => <div key={j} className="w-0.5 bg-orange-500 rounded-full" style={{ height: Math.random() * 60 + 20 + '%' }}></div>)}
                      </div>
                      <span className="text-[9px] font-bold text-orange-800 z-10 truncate px-2">{i===1 ? '男声 - 热情' : '女声 - 专业'} 配音</span>
                   </div>
                ))}
             </div>

             {/* Track A2 (BGM) */}
             <div className="flex gap-1 h-8 relative w-max pl-20 mt-1">
                <div className="absolute left-0 top-0 bottom-0 w-16 bg-gray-50 border-r border-[var(--border-color)] flex flex-col items-center justify-center z-10">
                   <span className="text-[10px] font-black text-gray-700">AUDIO</span>
                   <span className="text-[8px] font-bold text-gray-400">Suno AI</span>
                </div>
                {[1].map(i => (
                   <div key={`a2-${i}`} className="h-full rounded border border-emerald-200 bg-emerald-50/50 flex items-center justify-center cursor-pointer hover:border-emerald-400 transition-colors group relative overflow-hidden" style={{ width: '800px' }}>
                      <div className="absolute inset-0 opacity-30 flex items-center justify-around px-1">
                         {[...Array(60)].map((_, j) => <div key={j} className="w-0.5 bg-emerald-500 rounded-full" style={{ height: Math.random() * 40 + 10 + '%' }}></div>)}
                      </div>
                      <span className="text-[9px] font-bold text-emerald-700 z-10">BGM_Ambient_Cinematic_01.wav</span>
                   </div>
                ))}
             </div>
             
          </div>
       </div>
    </motion.div>
  )
}
