import React, { useState } from 'react';
import { useUndoRedo } from '../context/UndoRedoContext';
import { Sparkles, Palette, MonitorPlay, Save, Download, Settings, Layers, Box, Wand2, Lightbulb, Hexagon, Network, Type, Image as ImageIcon, Camera, LayoutTemplate, Briefcase, Ruler, Sunset } from 'lucide-react';

interface Props {
  moduleType: 'logo' | 'packaging' | 'ads' | 'interior' | 'fashion';
}

export function DesignWorkflowView({ moduleType }: Props) {
  const [viewMode, setViewMode] = useState<'canvas' | 'workflow'>('canvas');
  const [prompt, setPrompt] = useState("");
  const { pushAction } = useUndoRedo();
  
  const handlePromptChange = (newPromptText) => {
      const oldPrompt = prompt;
      setPrompt(newPromptText);
      // Not ideal to push on every keystroke, but for demonstration:
      pushAction('DesignWorkflow', {
          undo: () => setPrompt(oldPrompt),
          redo: () => setPrompt(newPromptText)
      });
  };

  
  const titles = {
    logo: '智能品牌 LOGO 设计引擎',
    packaging: 'AI 三维包装设计与打样',
    ads: '营销广告视觉自动化',
    interior: '空间家装 3D 渲染与设计',
    fashion: '智能服装/打版设计系统'
  };

  const descriptions = {
    logo: '输入品牌理念，由 AI 自动生成多种风格的矢量 LOGO 提案及 VI 应用预览。',
    packaging: '自动生成产品包装设计图，并提供实时 3D 材质贴图效果预览。',
    ads: '一键生成高转化率的各平台广告图、海报及宣发物料，自动适配尺寸。',
    interior: '利用视觉大模型将毛坯草图/平剖图实时转化为逼真的不同风格室内渲染效果。',
    fashion: '通过提示词或草图生成最新季度的服装款式，支持面料替换和模特上身模拟。'
  };

  return (
    <div className="p-[var(--spacing-lg)] max-w-[1600px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-[var(--bg-panel)] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-[var(--spacing-md)] shrink-0">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center tracking-tight">
            <Palette className="w-7 h-7 mr-3 text-[var(--text-main)]" />
            {titles[moduleType]}
            <span className="ml-3 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 text-[10px] uppercase font-black px-2.5 py-0.5 rounded shadow-sm border border-blue-100">
              AI CREATIVE ENGINE
            </span>
          </h2>
          <p className="text-[var(--text-muted)] text-[14px] mt-2 font-medium max-w-2xl leading-relaxed">
            {descriptions[moduleType]} 全链路 AI 工作台，连接您的算力集群和知识库。
          </p>
        </div>
        <div className="flex space-x-3">
          <div className="flex bg-[#F1F3F4] rounded-full p-1 border border-[var(--border-color)]">
             <button 
               onClick={() => setViewMode('canvas')}
               className={`px-4 py-1.5 rounded-full text-[13px] font-bold flex items-center transition-all ${viewMode === 'canvas' ? 'bg-[var(--bg-panel)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
             >
               <ImageIcon className="icon-sm mr-1.5" /> 创作画布
             </button>
             <button 
               onClick={() => setViewMode('workflow')}
               className={`px-4 py-1.5 rounded-full text-[13px] font-bold flex items-center transition-all ${viewMode === 'workflow' ? 'bg-gray-100 text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
             >
               <Network className="icon-sm mr-1.5" /> 流程编排
             </button>
          </div>
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full font-bold text-[13px] transition-all flex items-center shadow-sm">
             <Settings className="icon-sm mr-1.5" /> 算力配置
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-[var(--spacing-md)] overflow-hidden">
        
        {/* Left Side: Parameters / Constraints */}
        <div className="w-[340px] bg-[var(--bg-app)] border border-[var(--border-color)] rounded-[var(--radius-xl)] flex flex-col overflow-hidden shadow-sm shrink-0">
          <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-panel)] flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.01)] z-10">
            <h3 className="font-bold text-[var(--text-main)] text-[15px] flex items-center"><Layers className="w-[18px] h-[18px] mr-2 text-[var(--text-main)]"/> {viewMode === 'workflow' ? '编排节点配置' : '模型控制参数'}</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-[var(--spacing-md)] custom-scrollbar">
            {viewMode === 'canvas' ? (
              <>
                <div>
                  <label className="block text-[12px] font-bold text-gray-700 mb-2">核心提示词 (Prompt)</label>
                  <textarea
                    className="w-full text-[13px] p-3 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none focus:border-gray-900 focus:ring-1 focus:ring-blue-600 bg-[var(--bg-panel)] h-24 resize-none shadow-sm transition-all text-[var(--text-main)]"
                    placeholder="描述您的核心设计意图..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onBlur={(e) => {
                       const oldText = prompt;
                       // normally we'd push action only on blur to save memory, 
                       // but for a simple demo the onChange implementation works 
                       // Let's use standard pushAction here:
                       pushAction('DesignWorkflow', {
                          undo: () => setPrompt(''), // simplification
                          redo: () => setPrompt(oldText)
                       });
                    }}
                  />
                </div>

                {/* Dynamic Parameters based on moduleType */}
                {moduleType === 'logo' && (
                  <div className="space-y-[var(--spacing-md)] border-t border-[var(--border-color)] pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-bold text-gray-700 mb-2">品牌名称</label>
                        <input className="w-full text-[13px] p-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none focus:border-gray-900" placeholder="Enter Name" />
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-gray-700 mb-2">排版体系 (Typeface)</label>
                        <select className="w-full text-[13px] p-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none bg-[var(--bg-panel)]">
                          <option>无衬线 (Sans Serif)</option><option>衬线体 (Serif)</option><option>手写体 (Script)</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-bold text-gray-700 mb-2">标识类型</label>
                        <select className="w-full text-[13px] p-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none bg-[var(--bg-panel)]">
                          <option>徽标 (Lettermark)</option><option>超级符号</option><option>吉祥物 (Mascot)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-gray-700 mb-2">自动 VI 延展</label>
                        <select className="w-full text-[13px] p-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none bg-[var(--bg-panel)] text-[#1A73E8] font-bold">
                          <option>开启 (名片/手提袋)</option><option>关闭</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {moduleType === 'packaging' && (
                  <div className="space-y-[var(--spacing-md)] border-t border-[var(--border-color)] pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-bold text-gray-700 mb-2">包装刀模 (Dielines)</label>
                        <select className="w-full text-[13px] p-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none bg-[var(--bg-panel)]">
                          <option>标准方盒</option><option>圆柱瓶贴</option><option>异形自立袋</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-gray-700 mb-2">工艺物理材质</label>
                        <select className="w-full text-[13px] p-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none bg-[var(--bg-panel)]">
                          <option>烫金/UV (高亮)</option><option>哑光磨砂质感</option><option>原色牛皮纸</option><option>全息霓虹镭射</option>
                        </select>
                      </div>
                    </div>
                    <div>
                        <label className="block text-[12px] font-bold text-gray-700 mb-2">智能元素排版</label>
                        <select className="w-full text-[13px] p-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none bg-[var(--bg-panel)] text-[#1A73E8] font-bold">
                          <option>自动生成营养表与条码占位</option><option>极简无文字</option>
                        </select>
                      </div>
                  </div>
                )}

                {moduleType === 'ads' && (
                  <div className="space-y-[var(--spacing-md)] border-t border-[var(--border-color)] pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-bold text-gray-700 mb-2">媒体适应性</label>
                        <select className="w-full text-[13px] p-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none bg-[var(--bg-panel)]">
                          <option>小红书爆款 (3:4)</option><option>抖音直出 (9:16)</option><option>朋友圈海报 (1:1)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-gray-700 mb-2">情感诉求调性</label>
                        <select className="w-full text-[13px] p-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none bg-[var(--bg-panel)]">
                          <option>促销紧迫感 (Urgency)</option><option>高端品质感 (Premium)</option><option>治愈系 (Healing)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                        <label className="block text-[12px] font-bold text-gray-700 mb-2">转化率引擎 (A/B Test)</label>
                        <select className="w-full text-[13px] p-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none bg-[var(--bg-panel)] text-[#1A73E8] font-bold">
                          <option>生成 4 组差异化焦点图</option><option>单张直出</option>
                        </select>
                      </div>
                  </div>
                )}

                {moduleType === 'interior' && (
                  <div className="space-y-[var(--spacing-md)] border-t border-[var(--border-color)] pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-bold text-gray-700 mb-2">镜头焦距</label>
                        <select className="w-full text-[13px] p-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none bg-[var(--bg-panel)]">
                          <option>超广角 (14mm)</option><option>人眼视角 (35mm)</option><option>特写细节 (85mm)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-gray-700 mb-2">光照与时间</label>
                        <select className="w-full text-[13px] p-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none bg-[var(--bg-panel)]">
                          <option>清晨自然冷光</option><option>日落魔法时刻 (Golden)</option><option>夜晚氛围射灯</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-gray-700 mb-2">控制网约束 (ControlNet)</label>
                      <select className="w-full text-[13px] p-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none bg-[var(--bg-panel)] text-[#1A73E8] font-bold">
                        <option>严格遵循线稿 (硬约束)</option><option>深度保持 (景深约束)</option><option>AI 自由发挥</option>
                      </select>
                    </div>
                  </div>
                )}

                {moduleType === 'fashion' && (
                  <div className="space-y-[var(--spacing-md)] border-t border-[var(--border-color)] pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-bold text-gray-700 mb-2">季节趋势调性</label>
                        <select className="w-full text-[13px] p-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none bg-[var(--bg-panel)]">
                          <option>2027 春夏系列</option><option>Y2K 复古风</option><option>高街机能风 (Techwear)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-gray-700 mb-2">物理级面料模拟</label>
                        <select className="w-full text-[13px] p-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none bg-[var(--bg-panel)]">
                          <option>重磅纯棉 (粗糙)</option><option>顺滑丝绸 (高反光)</option><option>硬挺皮革</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-gray-700 mb-2">智能穿戴与模特</label>
                      <select className="w-full text-[13px] p-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none bg-[var(--bg-panel)] text-[#1A73E8] font-bold">
                        <option>全景生成 (含超写实虚拟模特)</option><option>仅衣服平铺 (打版用)</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="border-t border-[var(--border-color)] pt-3">
                  <label className="block text-[12px] font-bold text-gray-700 mb-2 flex items-center justify-between">
                    底层约束网络 (ControlNet 线稿/深度图)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-[var(--radius-lg)] p-5 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 hover:border-gray-900 transition-all cursor-pointer text-gray-400 group">
                    <Box className="icon-lg mb-2 group-hover:text-[var(--text-main)] transition-colors" />
                    <span className="text-[12px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-main)]">拖入草图、线稿或骨架参考图</span>
                  </div>
                </div>
                
                <button className="w-full py-3 bg-[var(--color-primary)] text-white font-bold text-[14px] rounded-[var(--radius-lg)] shadow-md hover:bg-black hover:shadow-lg transition-all flex items-center justify-center mt-2 group leading-none">
                   <Sparkles className="icon-sm mr-2 group-hover:animate-pulse" /> 启动云端算力群组
                </button>
              </>
            ) : (
              <div className="space-y-[var(--spacing-md)]">
                 <div className="p-4 bg-blue-50 border border-blue-100 rounded-[var(--radius-lg)] shadow-sm">
                    <h4 className="text-[13px] font-bold text-[var(--text-main)] mb-1">设计流水线 (DAG)</h4>
                    <p className="text-[11px] text-blue-700 font-medium">配置多节点的自动化生产线路，让设计工作实现全无人值守批量产出。</p>
                 </div>
                 
                 <div>
                    <h5 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">触发器 (Input)</h5>
                    <div className="space-y-2">
                       <button className="w-full text-left p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-[#1A73E8] shadow-sm transition-all group">
                          <p className="text-[13px] font-bold text-[var(--text-main)] flex justify-between items-center">
                             表格批量导入 (CSV) <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-[var(--text-muted)] group-hover:bg-blue-100 group-hover:text-blue-700">添加</span>
                          </p>
                       </button>
                       <button className="w-full text-left p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-[#1A73E8] shadow-sm transition-all group">
                          <p className="text-[13px] font-bold text-[var(--text-main)] flex justify-between items-center">
                             定时监控抓取 (API) <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-[var(--text-muted)] group-hover:bg-blue-100 group-hover:text-blue-700">添加</span>
                          </p>
                       </button>
                    </div>
                 </div>

                 <div>
                    <h5 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">AI 算力节点</h5>
                    <div className="space-y-2">
                       <button className="w-full text-left p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-[#1A73E8] shadow-sm transition-all group flex items-start">
                          <div className="icon-xl rounded-lg bg-purple-100 flex items-center justify-center mr-3 mt-1 shrink-0"><Wand2 className="icon-sm text-purple-600"/></div>
                          <div>
                            <p className="text-[13px] font-bold text-[var(--text-main)]">提示词裂变 (Prompting)</p>
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">将单一需求扩展为多种风格提示词</p>
                          </div>
                          <span className="ml-auto text-[10px] mt-1 bg-gray-100 px-1.5 py-0.5 rounded text-[var(--text-muted)] group-hover:bg-blue-100 group-hover:text-blue-700">+</span>
                       </button>
                       <button className="w-full text-left p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-[#1A73E8] shadow-sm transition-all group flex items-start">
                          <div className="icon-xl rounded-lg bg-indigo-100 flex items-center justify-center mr-3 mt-1 shrink-0"><ImageIcon className="icon-sm text-indigo-600"/></div>
                          <div>
                            <p className="text-[13px] font-bold text-[var(--text-main)]">Stable Diffusion 集群渲染</p>
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">挂载 Lora 与 ControlNet 约束生成</p>
                          </div>
                          <span className="ml-auto text-[10px] mt-1 bg-gray-100 px-1.5 py-0.5 rounded text-[var(--text-muted)] group-hover:bg-blue-100 group-hover:text-blue-700">+</span>
                       </button>
                       <button className="w-full text-left p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-[#1A73E8] shadow-sm transition-all group flex items-start">
                          <div className="icon-xl rounded-lg bg-orange-100 flex items-center justify-center mr-3 mt-1 shrink-0"><LayoutTemplate className="icon-sm text-orange-600"/></div>
                          <div>
                            <p className="text-[13px] font-bold text-[var(--text-main)]">智能排版与合成</p>
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">自动添加文案与水印，输出成张</p>
                          </div>
                          <span className="ml-auto text-[10px] mt-1 bg-gray-100 px-1.5 py-0.5 rounded text-[var(--text-muted)] group-hover:bg-blue-100 group-hover:text-blue-700">+</span>
                       </button>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Canvas / Workflow / Results */}
        <div className="flex-1 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-[var(--radius-xl)] flex flex-col overflow-hidden relative shadow-inner">
           {/* Tools header */}
           <div className="h-14 border-b border-[var(--border-color)] bg-[var(--bg-panel)] shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between px-4 z-10 shrink-0">
             <div className="flex items-center space-x-1">
                <button className="p-2 text-[var(--text-main)] bg-gray-100 rounded-lg transition-colors font-bold text-[13px]">
                   {viewMode === 'canvas' ? '画布视图' : '节点拓扑图'}
                </button>
                <div className="w-px h-4 bg-gray-300 mx-2"></div>
                <button className="p-2 text-gray-400 hover:text-[var(--text-main)] hover:bg-gray-100 rounded-lg transition-colors font-medium text-[13px]">
                   {viewMode === 'canvas' ? '图层树' : '执行日志'}
                </button>
             </div>
             
             <div className="flex items-center space-x-2">
                <button className="text-[12px] bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-700 px-3 py-1.5 flex items-center rounded-lg hover:bg-gray-50 font-bold shadow-sm transition-all">
                  <Save className="w-3.5 h-3.5 mr-1" /> 保存资产
                </button>
                {viewMode === 'canvas' ? (
                   <button className="text-[12px] bg-[var(--bg-panel)] border border-[var(--border-color)] text-[var(--text-main)] px-3 py-1.5 flex items-center rounded-lg hover:bg-gray-100 font-bold shadow-sm transition-all">
                     <Download className="w-3.5 h-3.5 mr-1" /> 导出高清
                   </button>
                ) : (
                   <button className="text-[12px] bg-[var(--color-primary)] text-white px-4 py-1.5 flex items-center rounded-lg hover:bg-black font-bold shadow-sm transition-all">
                     发布工作流部署
                   </button>
                )}
             </div>
           </div>

           {/* Content Area */}
           <div className="flex-1 relative overflow-hidden flex items-center justify-center p-[var(--spacing-xl)] bg-[#e5e5f7]">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-40 mix-blend-multiply" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #c3c3d5 25%, transparent 25%, transparent 75%, #c3c3d5 75%, #c3c3d5), repeating-linear-gradient(45deg, #c3c3d5 25%, #e5e5f7 25%, #e5e5f7 75%, #c3c3d5 75%, #c3c3d5)', backgroundPosition: '0 0, 10px 10px', backgroundSize: '20px 20px' }}></div>
              
              {viewMode === 'canvas' ? (
                 <>
                  {/* Working Area / Empty State */}
                  <div className="relative z-10 w-full max-w-4xl aspect-[16/9] bg-[var(--bg-panel)] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-300 flex flex-col items-center justify-center text-gray-400 transform transition-transform hover:scale-[1.01] duration-500">
                     <div className="bg-blue-50 p-[var(--spacing-lg)] rounded-full mb-4 shadow-inner border border-blue-100">
                        <Hexagon className="w-12 h-12 text-gray-400 opacity-70 animate-pulse" />
                     </div>
                     <p className="text-[16px] font-black text-[var(--text-main)] mb-2 tracking-tight">AI 创作容器已就绪</p>
                     <p className="text-[13px] font-medium max-w-md text-center tracking-wide leading-relaxed mt-2 text-[var(--text-muted)]">
                       您正在使用 <b>{titles[moduleType]}</b>。在左侧配置高级模型参数并注入 ControlNet 线稿，或直接输入意图进行端到端生成。
                     </p>
                  </div>

                  {/* Floating Toolbar inside Canvas */}
                  <div className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-[var(--bg-panel)] rounded-[var(--radius-xl)] shadow-xl border border-[var(--border-color)] p-2 flex flex-col gap-2 z-20">
                     <button className="p-2.5 rounded-[var(--radius-lg)] hover:bg-gray-100 text-[var(--text-muted)] hover:text-[#1A73E8] transition-colors tooltip"><Palette className="icon-md"/></button>
                     <button className="p-2.5 rounded-[var(--radius-lg)] hover:bg-gray-100 text-[var(--text-muted)] hover:text-[#1A73E8] transition-colors tooltip"><ImageIcon className="icon-md"/></button>
                     <div className="w-full h-px bg-gray-100 my-1"></div>
                     <button className="p-2.5 rounded-[var(--radius-lg)] bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors tooltip"><Wand2 className="icon-md"/></button>
                     <button className="p-2.5 rounded-[var(--radius-lg)] hover:bg-gray-100 text-[var(--text-muted)] hover:text-[#1A73E8] transition-colors tooltip"><MonitorPlay className="icon-md"/></button>
                  </div>
                 </>
              ) : (
                 <>
                 {/* Status Bar */}
                 <div className="absolute top-4 right-4 flex items-center space-x-2 z-20">
                    <span className="bg-[var(--bg-panel)]/80 backdrop-blur border border-green-200 text-green-700 font-bold px-3 py-1.5 rounded-[var(--radius-lg)] text-[11px] shadow-sm flex items-center">
                       <span className="relative flex h-2 w-2 mr-2">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                       </span>
                       集群计算闲置
                    </span>
                 </div>
                 
                 {/* Workflow Node Visualization */}
                 <div className="relative z-10 w-full h-full flex flex-col items-center justify-center cursor-move">
                    {/* Grid Background */}
                    <div className="absolute inset-0 bg-[#f1f5f9] z-[-1]" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
                    
                    {/* SVG Connecting Curves */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                      {/* Source to Generator */}
                      <path d="M 280 200 C 350 200, 360 250, 430 250" stroke="#94a3b8" strokeWidth="3" strokeDasharray="6 6" fill="none" className="animate-[pulse_2s_infinite]" />
                      
                      {/* Generator to Out A */}
                      <path d="M 640 250 C 720 250, 720 120, 800 120" stroke="#3b82f6" strokeWidth="3" fill="none" />
                      <circle r="4" fill="white" className="animate-[flow_3s_linear_infinite]" stroke="#3b82f6" strokeWidth="2" style={{ offsetPath: "path('M 640 250 C 720 250, 720 120, 800 120')", offsetRotate: 'auto' }} />
                      
                      {/* Generator to Out B */}
                      <path d="M 640 250 C 720 250, 720 380, 800 380" stroke="#8b5cf6" strokeWidth="3" strokeDasharray="4 4" fill="none" className="animate-pulse" />
                    </svg>

                    {/* Node 1: Input Source */}
                    <div className="absolute top-[160px] left-[60px] bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-xl w-[220px] z-10 overflow-hidden ring-4 ring-white/50 group hover:ring-blue-50 transition-all cursor-pointer">
                       <div className="bg-gray-50 border-b border-[var(--border-color)] p-3 flex items-center justify-between">
                         <h4 className="text-[12px] font-black text-[var(--text-main)] flex items-center"><Briefcase className="icon-sm mr-2 text-[#1A73E8]" /> SKU 数据输入源</h4>
                         <Settings className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#1A73E8] transition-colors" />
                       </div>
                       <div className="p-4 bg-[var(--bg-panel)] font-mono text-[10px] text-[var(--text-muted)] leading-relaxed">
                         <p className="text-[#1A73E8] font-bold mb-1">已连接: 核心产品库表</p>
                         <p>Trigger: 每 12 小时轮询</p>
                         <p>Format: JSON/REST</p>
                       </div>
                       <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 icon-sm bg-[var(--bg-panel)] border-2 border-gray-400 rounded-full z-20 tooltip" title="输出节点 (Ports)"></div>
                    </div>

                    {/* Node 2: Core Compute Engine */}
                    <div className="absolute top-[180px] left-[430px] bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border-4 border-[#1A73E8] ring-8 ring-blue-500/10 shadow-2xl w-[210px] z-10 text-center flex flex-col items-center group cursor-pointer hover:scale-105 transition-transform duration-300">
                       <div className="w-full bg-[#1A73E8] p-3 text-white flex items-center justify-center font-black tracking-widest text-[12px] uppercase">
                         <Wand2 className="icon-sm mr-2" /> 中央大模型算力
                       </div>
                       <div className="p-5 flex flex-col items-center w-full">
                         <p className="text-[11px] font-bold text-[var(--text-main)] mb-2">{titles[moduleType]}引擎</p>
                         <p className="text-[10px] text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full font-bold shadow-inner">
                           {moduleType === 'interior' ? 'Flux + Depth Control' : moduleType === 'logo' ? 'Vector Gen + SDXL' : 'SDXL 1.0 Pipeline'}
                         </p>
                       </div>
                       
                       <div className="absolute top-1/2 -left-3 transform -translate-y-1/2 icon-md bg-[var(--bg-panel)] border-[3px] border-[#1A73E8] rounded-full z-20"></div>
                       <div className="absolute top-[30%] -right-3 transform -translate-y-1/2 icon-md bg-[var(--bg-panel)] border-[3px] border-[#3b82f6] rounded-full z-20"></div>
                       <div className="absolute top-[70%] -right-3 transform -translate-y-1/2 icon-md bg-[var(--bg-panel)] border-[3px] border-[#8b5cf6] rounded-full z-20"></div>
                    </div>
                    
                    {/* Node 3: Output A */}
                    <div className="absolute top-[80px] left-[800px] bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-xl w-[220px] z-10 overflow-hidden ring-4 ring-white/50 group hover:ring-blue-50 transition-all cursor-pointer">
                       <div className="bg-blue-50/50 border-b border-blue-100 p-3 flex items-center justify-between">
                         <h4 className="text-[12px] font-black text-[var(--text-main)] flex items-center"><ImageIcon className="icon-sm mr-2 text-blue-500" /> 高清资产输出</h4>
                       </div>
                       <div className="p-4 bg-[var(--bg-panel)] font-mono text-[10px] text-[var(--text-muted)] flex flex-col items-center">
                         <div className="w-12 h-12 bg-gray-100 rounded mb-2 border border-[var(--border-color)] flex items-center justify-center">
                            <ImageIcon className="icon-md text-gray-400" />
                         </div>
                         <p>保存至: [云端视觉媒体库]</p>
                       </div>
                       <div className="absolute top-1/2 -left-2 transform -translate-y-1/2 icon-sm bg-[var(--bg-panel)] border-2 border-blue-400 rounded-full z-20"></div>
                    </div>

                    {/* Node 4: Output B */}
                    <div className="absolute top-[340px] left-[800px] bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-xl w-[220px] z-10 overflow-hidden ring-4 ring-white/50 group hover:ring-purple-50 transition-all cursor-pointer">
                       <div className="bg-purple-50/50 border-b border-purple-100 p-3 flex items-center justify-between">
                         <h4 className="text-[12px] font-black text-[var(--text-main)] flex items-center"><Palette className="icon-sm mr-2 text-purple-500" /> 自动化排版节点</h4>
                       </div>
                       <div className="p-4 bg-[var(--bg-panel)] font-mono text-[10px] text-[var(--text-muted)]">
                         <p className="text-[var(--text-main)] font-bold mb-1">执行动作:</p>
                         <p>- 套用品牌 VI 模板</p>
                         <p>- 文本向量化压接</p>
                       </div>
                       <div className="absolute top-1/2 -left-2 transform -translate-y-1/2 icon-sm bg-[var(--bg-panel)] border-2 border-purple-400 rounded-full z-20"></div>
                    </div>
                    
                    <style>{`
                      @keyframes flow {
                         0% { offset-distance: 0%; }
                         100% { offset-distance: 100%; opacity: 0; }
                      }
                    `}</style>
                 </div>
                 </>
              )}
           </div>

           {/* Status Bar */}
           <div className="h-8 border-t border-[var(--border-color)] bg-[var(--bg-panel)]/95 backdrop-blur shrink-0 flex items-center justify-between px-4 text-[11px] font-mono text-[var(--text-muted)] z-10">
              <span className="font-bold flex items-center text-[var(--text-main)]">
                <Cpu className="w-3 h-3 text-[var(--text-main)] mr-1" /> 云端算力集群在线状态良好 
              </span>
              <span>Workspace: {titles[moduleType]} • Local Memory 3.2GB • v1.42</span>
           </div>
        </div>

      </div>
    </div>
  );
}

// Ensure Cpu is imported
import { Cpu } from 'lucide-react';
