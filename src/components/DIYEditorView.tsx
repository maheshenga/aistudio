import React, { useState } from 'react';
import { 
  LayoutTemplate, Image as ImageIcon, Video, Wand2, Share2, Globe, ScanLine, SmartphoneNfc, 
  Settings2, Smartphone, MonitorPlay, Save, Check, Type, Phone, MapPin, MousePointer2,
  ChevronDown, ArrowLeft, Layers, Sparkles
} from 'lucide-react';

export function DIYEditorView() {
  const [activeDevice, setActiveDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [selectedEditor, setSelectedEditor] = useState<'nfc' | 'viral' | 'website' | 'miniapp'>('nfc');
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>('comp-2');
  
  // Mock canvas state
  const [canvasItems, setCanvasItems] = useState([
    { id: 'comp-1', type: 'hero', title: '星屿海景餐厅', subtitle: '纵享海风与美食的交响' },
    { id: 'comp-2', type: 'coupon', title: '招牌双人套餐半价券', couponId: 'COUPON_9879A2B' },
    { id: 'comp-3', type: 'wifi', title: '店内免费高速 WIFI' },
    { id: 'comp-4', type: 'viral', title: '短视频裂变打卡' }
  ]);
  
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[var(--bg-panel)] overflow-hidden animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="h-16 bg-[var(--bg-panel)] border-b border-[var(--border-color)] flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center space-x-4">
           {/* Return button if needed by parent, but here we just have a static one or mock */}
           <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                 <span className="text-gray-400 font-medium">应用装修</span>
                 <span className="text-gray-300">/</span>
                 <div className="relative group cursor-pointer">
                    <div className="flex items-center space-x-1 font-bold text-[var(--text-main)] bg-gray-50 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                       <span>
                          {selectedEditor === 'nfc' && 'NFC 碰一碰落地页'}
                          {selectedEditor === 'viral' && '爆店码扫码落地页'}
                          {selectedEditor === 'website' && 'AI 智能官网装修'}
                          {selectedEditor === 'miniapp' && '智能私域小程序'}
                       </span>
                       <ChevronDown className="icon-sm text-[var(--text-muted)]" />
                    </div>
                    {/* Dropdown menu */}
                    <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--bg-panel)] border border-[var(--border-color)] shadow-xl rounded-[var(--radius-lg)] p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                       <div onClick={() => setSelectedEditor('nfc')} className={`px-3 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors ${selectedEditor === 'nfc' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>NFC 碰一碰落地页</div>
                       <div onClick={() => setSelectedEditor('viral')} className={`px-3 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors ${selectedEditor === 'viral' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>爆店码扫码落地页</div>
                       <div onClick={() => setSelectedEditor('website')} className={`px-3 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors ${selectedEditor === 'website' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>AI 智能官网装修</div>
                       <div onClick={() => setSelectedEditor('miniapp')} className={`px-3 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors ${selectedEditor === 'miniapp' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>智能私域小程序</div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
        
        <div className="flex items-center space-x-4">
           <div className="flex bg-gray-100 p-1 rounded-[var(--radius-lg)]">
              <button 
                onClick={() => setActiveDevice('mobile')}
                className={`p-2 rounded-lg transition-all flex items-center space-x-1 ${activeDevice === 'mobile' ? 'bg-[var(--bg-panel)] shadow-sm text-[var(--color-primary)]' : 'text-[var(--text-muted)] hover:text-gray-700'}`}
              >
                 <Smartphone className="icon-sm" />
                 <span className="text-xs font-bold px-1">移动端</span>
              </button>
              <button 
                onClick={() => setActiveDevice('desktop')}
                className={`p-2 rounded-lg transition-all flex items-center gap-1 ${activeDevice === 'desktop' ? 'bg-[var(--bg-panel)] shadow-sm text-[var(--color-primary)]' : 'text-[var(--text-muted)] hover:text-gray-700'}`}
              >
                 <MonitorPlay className="icon-sm" />
                 <span className="text-xs font-bold px-1">桌面端 (Pro)</span>
              </button>
           </div>
           
           <div className="h-6 w-px bg-gray-200 mx-2"></div>
           
           <button className="text-gray-600 hover:text-[var(--text-main)] px-4 py-2 text-sm font-bold transition-colors">预览</button>
           <button className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-6 py-2.5 rounded-[var(--radius-lg)] text-sm font-bold shadow-sm flex items-center transition-colors">
              <Save className="icon-sm mr-2" /> 保存并发布
           </button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Component Library Sidebar */}
        <div className="w-64 bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col hide-scrollbar overflow-y-auto z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="p-5">
            <h3 className="font-black text-[var(--text-main)] mb-[var(--spacing-md)] flex items-center"><Layers className="icon-sm mr-2 text-[var(--color-primary)]" /> 组件库 (拖拽)</h3>
            
            <div className="space-y-8">
              {/* Marketing specific components based on editor type */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center"><Sparkles className="w-3 h-3 mr-1 text-orange-400" /> 核心营销组件</p>
                <div className="space-y-2">
                  <div className="bg-gray-50 hover:bg-[var(--bg-panel)] border-2 border-transparent hover:border-blue-400 hover:shadow-md rounded-[var(--radius-lg)] p-3 cursor-grab transition-all flex items-center space-x-3 group">
                    <div className="p-2 bg-[var(--bg-panel)] rounded-lg text-blue-500 shadow-sm"><Wand2 className="icon-sm" /></div>
                    <span className="text-xs font-bold text-[var(--text-main)]">引流发券模块</span>
                  </div>
                  <div className="bg-gray-50 hover:bg-[var(--bg-panel)] border-2 border-transparent hover:border-orange-400 hover:shadow-md rounded-[var(--radius-lg)] p-3 cursor-grab transition-all flex items-center space-x-3 group">
                    <div className="p-2 bg-[var(--bg-panel)] rounded-lg text-orange-500 shadow-sm"><Share2 className="icon-sm" /></div>
                    <span className="text-xs font-bold text-[var(--text-main)]">短视频一键发布</span>
                  </div>
                  {(selectedEditor === 'nfc' || selectedEditor === 'viral') && (
                    <div className="bg-gray-50 hover:bg-[var(--bg-panel)] border-2 border-transparent hover:border-green-400 hover:shadow-md rounded-[var(--radius-lg)] p-3 cursor-grab transition-all flex items-center space-x-3 group">
                      <div className="p-2 bg-[var(--bg-panel)] rounded-lg text-green-500 shadow-sm"><Globe className="icon-sm" /></div>
                      <span className="text-xs font-bold text-[var(--text-main)]">无感连接 WIFI</span>
                    </div>
                  )}
                  {selectedEditor === 'website' && (
                    <div className="bg-gray-50 hover:bg-[var(--bg-panel)] border-2 border-transparent hover:border-blue-400 hover:shadow-md rounded-[var(--radius-lg)] p-3 cursor-grab transition-all flex items-center space-x-3 group">
                      <div className="p-2 bg-[var(--bg-panel)] rounded-lg text-blue-500 shadow-sm"><LayoutTemplate className="icon-sm" /></div>
                      <span className="text-xs font-bold text-[var(--text-main)]">全屏 Hero Banner</span>
                    </div>
                  )}
                  {selectedEditor === 'miniapp' && (
                    <>
                      <div className="bg-gray-50 hover:bg-[var(--bg-panel)] border-2 border-transparent hover:border-blue-400 hover:shadow-md rounded-[var(--radius-lg)] p-3 cursor-grab transition-all flex items-center space-x-3 group">
                        <div className="p-2 bg-[var(--bg-panel)] rounded-lg text-blue-500 shadow-sm"><SmartphoneNfc className="icon-sm" /></div>
                        <span className="text-xs font-bold text-[var(--text-main)]">微信会员卡包</span>
                      </div>
                      <div className="bg-gray-50 hover:bg-[var(--bg-panel)] border-2 border-transparent hover:border-pink-400 hover:shadow-md rounded-[var(--radius-lg)] p-3 cursor-grab transition-all flex items-center space-x-3 group">
                        <div className="p-2 bg-[var(--bg-panel)] rounded-lg text-pink-500 shadow-sm"><Check className="icon-sm" /></div>
                        <span className="text-xs font-bold text-[var(--text-main)]">在线预约服务</span>
                      </div>
                    </>
                  )}
                  <div className="bg-gray-50 hover:bg-[var(--bg-panel)] border-2 border-transparent hover:border-rose-400 hover:shadow-md rounded-[var(--radius-lg)] p-3 cursor-grab transition-all flex items-center space-x-3 group">
                    <div className="p-2 bg-[var(--bg-panel)] rounded-lg text-rose-500 shadow-sm"><MapPin className="icon-sm" /></div>
                    <span className="text-xs font-bold text-[var(--text-main)]">地图导航至门店</span>
                  </div>
                </div>
              </div>

              {/* Basic Components */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">基础布局</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 hover:bg-[var(--bg-panel)] hover:border-gray-300 hover:shadow-sm border-2 border-transparent rounded-[var(--radius-lg)] p-4 cursor-grab flex flex-col items-center justify-center gap-2 transition-all">
                    <LayoutTemplate className="icon-md text-gray-400" />
                    <span className="text-[11px] font-bold text-gray-600">双列分栏</span>
                  </div>
                  <div className="bg-gray-50 hover:bg-[var(--bg-panel)] hover:border-gray-300 hover:shadow-sm border-2 border-transparent rounded-[var(--radius-lg)] p-4 cursor-grab flex flex-col items-center justify-center gap-2 transition-all">
                    <Type className="icon-md text-gray-400" />
                    <span className="text-[11px] font-bold text-gray-600">图文介绍</span>
                  </div>
                  <div className="bg-gray-50 hover:bg-[var(--bg-panel)] hover:border-gray-300 hover:shadow-sm border-2 border-transparent rounded-[var(--radius-lg)] p-4 cursor-grab flex flex-col items-center justify-center gap-2 transition-all">
                    <ImageIcon className="icon-md text-gray-400" />
                    <span className="text-[11px] font-bold text-gray-600">轮播海报</span>
                  </div>
                  <div className="bg-gray-50 hover:bg-[var(--bg-panel)] hover:border-gray-300 hover:shadow-sm border-2 border-transparent rounded-[var(--radius-lg)] p-4 cursor-grab flex flex-col items-center justify-center gap-2 transition-all">
                    <Video className="icon-md text-gray-400" />
                    <span className="text-[11px] font-bold text-gray-600">视频介绍</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Canvas Area */}
        <div className="flex-1 bg-[#F0F2F5] relative overflow-hidden flex flex-col items-center pt-0 pb-8 px-12">
           <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
           
            {/* Toolbar Top - AI Assistant */}
            <div className="w-full bg-blue-50 border-b border-blue-100 flex items-center px-4 py-3 justify-between z-10 shadow-sm relative shrink-0">
               <div className="flex items-center space-x-2">
                  <Wand2 className="icon-md text-[var(--color-primary)] animate-pulse" />
                  <span className="text-sm font-black text-blue-900 tracking-tight flex items-center">AI 智能建站引擎 <span className="bg-[var(--color-primary)] text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm ml-2">Beta</span></span>
               </div>
               <div className="flex-1 max-w-xl mx-6 flex relative">
                  <input type="text" placeholder="描述您想要的网页，例如：一家现代风的海鲜主题餐厅..." className="w-full text-sm font-bold py-2.5 pl-4 pr-12 rounded-[var(--radius-lg)] border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner bg-[var(--bg-panel)]" />
                  <button className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-[var(--color-primary)] hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm cursor-pointer">
                     <Sparkles className="icon-sm" />
                  </button>
               </div>
               <div className="flex space-x-2">
                  <button className="text-xs font-bold text-blue-700 bg-[var(--bg-panel)] border border-blue-200 hover:bg-blue-100 px-3 py-2 rounded-[var(--radius-lg)] transition-colors shadow-sm">随机排版</button>
                  <button className="text-xs font-bold text-blue-700 bg-[var(--bg-panel)] border border-blue-200 hover:bg-blue-100 px-3 py-2 rounded-[var(--radius-lg)] transition-colors shadow-sm">AI 润色文案</button>
               </div>
            </div>
            
            <div className={`transition-all duration-500 ease-in-out relative z-10 font-sans shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] ${activeDevice === 'mobile' ? 'w-[375px] h-[812px] rounded-[48px] mt-6 shrink-0' : 'w-full h-full max-w-5xl rounded-3xl mt-6'} bg-[var(--bg-panel)] overflow-hidden flex flex-col border-[12px] border-gray-900 ring-4 ring-white`}>
              
              {/* Mobile Notch (only on mobile) */}
              {activeDevice === 'mobile' && (
                <div className="absolute top-0 inset-x-0 h-7 bg-gray-900 flex justify-center z-50 rounded-b-3xl w-36 mx-auto"></div>
              )}
              
              <div className="flex-1 overflow-y-auto no-scrollbar bg-gray-50 items-center">
                 
                 {/* Simulated Canvas Components based on state */}
                 {canvasItems.map((item) => (
                   <div 
                     key={item.id} 
                     onClick={() => setSelectedComponentId(item.id)}
                     className={`relative group/comp cursor-pointer ${selectedComponentId === item.id ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                   >
                     {/* Overlay for selection */}
                     <div className={`absolute inset-0 z-20 pointer-events-none transition-all ${selectedComponentId === item.id ? 'bg-blue-500/5' : 'bg-transparent group-hover/comp:bg-blue-500/5 group-hover/comp:ring-2 group-hover/comp:ring-blue-500/50 ring-inset'}`}>
                        {selectedComponentId === item.id && (
                          <div className="absolute -top-3 -right-3 bg-[var(--color-primary)] text-white p-1.5 rounded-lg shadow-lg pointer-events-auto">
                            <Settings2 className="icon-sm" />
                          </div>
                        )}
                     </div>

                     {/* Render Component Content */}
                     {item.type === 'hero' && (
                       <div className="relative">
                          <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80" alt="hero" className="w-full h-64 object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-black/40 to-transparent flex items-center justify-end flex-col text-white p-[var(--spacing-xl)] text-center pb-12">
                             <h1 className="text-[var(--text-main)]xl font-black mb-2 drop-shadow-md tracking-tight leading-tight">{item.title}</h1>
                             <p className="text-sm font-medium drop-shadow-md text-gray-200">{item.subtitle}</p>
                          </div>
                       </div>
                     )}

                     {item.type === 'coupon' && (
                       <div className={`p-4 ${activeDevice === 'desktop' ? 'max-w-xl mx-auto mt-6' : 'mt-4'}`}>
                         <div className="bg-[var(--bg-panel)] p-5 rounded-[var(--radius-xl)] shadow-sm border border-orange-100 flex flex-col pt-6">
                            <div className="flex justify-between items-start mb-2">
                               <div>
                                  <p className="text-[11px] text-orange-500 font-black mb-1.5 uppercase tracking-widest bg-orange-50 inline-block px-2 py-0.5 rounded-md">特惠福利</p>
                                  <h4 className="font-black text-[var(--text-main)] text-xl">{item.title}</h4>
                               </div>
                               <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center shrink-0">
                                  <ScanLine className="icon-lg text-orange-500" />
                               </div>
                            </div>
                            <button className="w-full mt-4 bg-[var(--color-primary)] hover:bg-blue-700 text-white rounded-[var(--radius-lg)] py-3.5 text-sm font-bold shadow-md transition-all active:scale-[0.98]">
                               一键领券至卡包
                            </button>
                         </div>
                       </div>
                     )}

                     {item.type === 'wifi' && (
                       <div className={`px-4 pt-2 ${activeDevice === 'desktop' ? 'max-w-xl mx-auto' : ''}`}>
                         <div className="bg-[var(--bg-panel)] p-5 rounded-[var(--radius-xl)] shadow-sm border border-green-100 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                               <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                                  <Globe className="icon-lg text-green-500" />
                               </div>
                               <div>
                                  <h4 className="font-bold text-[var(--text-main)] text-[15px]">{item.title}</h4>
                                  <p className="text-[11px] text-[var(--text-muted)] mt-1 font-medium">免密连接，畅享高速网络</p>
                               </div>
                            </div>
                            <button className="bg-green-50 hover:bg-green-100 text-green-700 rounded-lg px-4 py-2 text-xs font-bold transition-all">
                               连接
                            </button>
                         </div>
                       </div>
                     )}

                     {item.type === 'viral' && (
                       <div className={`p-4 pb-12 ${activeDevice === 'desktop' ? 'max-w-xl mx-auto' : ''}`}>
                         <div className="bg-gradient-to-br from-blue-900 via-gray-900 to-black text-white rounded-3xl p-[var(--spacing-lg)] relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-rose-500/20 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
                            
                            <div className="relative z-10">
                              <div className="flex items-center space-x-3 mb-5">
                                 <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--bg-panel)]/10 backdrop-blur-md flex items-center justify-center border border-white/10"><Share2 className="icon-md text-white" /></div>
                                 <div>
                                    <h4 className="font-bold text-[17px] tracking-tight">{item.title}</h4>
                                    <p className="text-xs text-gray-400 mt-0.5">授权分发门店视频，赢取免单</p>
                                 </div>
                              </div>
                              <div className="bg-[var(--bg-panel)]/5 rounded-[var(--radius-xl)] p-3 mb-5 flex items-center space-x-3 backdrop-blur-xl border border-white/10">
                                  <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&q=80" className="w-12 h-12 rounded-[var(--radius-lg)] object-cover border border-white/20" alt="food" />
                                  <div>
                                     <p className="text-xs font-bold leading-tight">"这家星屿海景餐厅也太出片了，推荐大家来尝鲜..."</p>
                                     <p className="text-[10px] text-gray-400 mt-1.5 flex items-center"><Check className="w-3 h-3 mr-1 text-green-400" /> 已智能挂载团购链接</p>
                                  </div>
                              </div>
                              <button className="w-full bg-[var(--bg-panel)] hover:bg-gray-50 text-[var(--text-main)] rounded-[var(--radius-lg)] py-3.5 text-sm font-black shadow-lg transition-all flex justify-center items-center">
                                 一键发布视频
                              </button>
                            </div>
                         </div>
                       </div>
                     )}
                   </div>
                 ))}
                 
                 <div className={`mx-4 mb-20 mt-4 border-2 border-dashed border-gray-300 rounded-[var(--radius-xl)] h-32 flex flex-col items-center justify-center bg-gray-50/80 hover:bg-gray-100 hover:border-blue-400 transition-colors group cursor-grab ${activeDevice === 'desktop' ? 'max-w-xl mx-auto' : ''}`}>
                    <MousePointer2 className="icon-lg text-gray-400 mb-2 group-hover:text-blue-500 transition-colors group-hover:animate-bounce" />
                    <p className="text-sm text-[var(--text-muted)] font-bold group-hover:text-[var(--color-primary)]">拖拽新组件至此区域补充</p>
                 </div>

              </div>
           </div>
        </div>
        
        {/* Property Editor Panel */}
        <div className="w-80 bg-[var(--bg-panel)] border-l border-[var(--border-color)] flex flex-col overflow-y-auto hide-scrollbar z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
           <div className="p-5 border-b border-[var(--border-color)] bg-[var(--bg-panel)] sticky top-0 z-10 block">
              <h3 className="font-black text-[var(--text-main)] flex items-center"><Settings2 className="icon-sm mr-2 text-[var(--color-primary)]" /> 属性配置区</h3>
           </div>
           
           <div className="p-[var(--spacing-lg)] space-y-8">
              {selectedComponentId ? (
                <>
                  <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-[var(--radius-lg)] text-xs font-bold border border-blue-100">
                    当前正在编辑：{canvasItems.find(i => i.id === selectedComponentId)?.type === 'hero' ? '全屏 Hero Banner' : canvasItems.find(i => i.id === selectedComponentId)?.type === 'coupon' ? '引流发券模块' : canvasItems.find(i => i.id === selectedComponentId)?.type === 'wifi' ? '无感连接 WIFI' : '短视频一键发布'}
                  </div>

                  {canvasItems.find(i => i.id === selectedComponentId)?.type === 'coupon' && (
                    <>
                      <div>
                         <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">主标题文案</label>
                         <input type="text" defaultValue={canvasItems.find(i => i.id === selectedComponentId)?.title} className="w-full px-4 py-2.5 rounded-[var(--radius-lg)] border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-bold bg-[var(--bg-panel)]" />
                      </div>
                      
                      <div>
                         <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">发券触发动作</label>
                         <select className="w-full px-4 py-2.5 rounded-[var(--radius-lg)] border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-bold bg-[var(--bg-panel)] appearance-none">
                            <option>发至微信卡包 (通过微信开放平台)</option>
                            <option>发至抖音券包 (通过抖音开放平台)</option>
                            <option>跳转小程序内商品详情页</option>
                         </select>
                      </div>
                      
                      <div>
                         <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">优惠券/活动 ID</label>
                         <input type="text" defaultValue="COUPON_9879A2B" className="w-full px-4 py-2.5 rounded-[var(--radius-lg)] border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium bg-gray-50 font-mono" />
                         <p className="text-[10px] text-gray-400 mt-2">请填入支付平台或本地系统生成的券标识</p>
                      </div>
                      
                      <div className="pt-4 border-t border-[var(--border-color)]">
                         <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">主题背景色</label>
                         <div className="grid grid-cols-5 gap-3">
                            <div className="icon-xl rounded-full bg-orange-500 ring-2 ring-offset-2 ring-gray-900 cursor-pointer"></div>
                            <div className="icon-xl rounded-full bg-rose-500 hover:scale-110 shadow-sm transition-transform cursor-pointer"></div>
                            <div className="icon-xl rounded-full bg-gray-900 hover:scale-110 shadow-sm transition-transform cursor-pointer"></div>
                            <div className="icon-xl rounded-full bg-green-500 hover:scale-110 shadow-sm transition-transform cursor-pointer"></div>
                            <div className="icon-xl rounded-full bg-gray-900 hover:scale-110 shadow-sm transition-transform cursor-pointer"></div>
                         </div>
                      </div>
                    </>
                  )}

                  {canvasItems.find(i => i.id === selectedComponentId)?.type === 'hero' && (
                    <>
                      <div>
                         <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">主标题文案</label>
                         <input type="text" defaultValue={canvasItems.find(i => i.id === selectedComponentId)?.title} className="w-full px-4 py-2.5 rounded-[var(--radius-lg)] border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-bold bg-[var(--bg-panel)]" />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">副标题文案</label>
                         <input type="text" defaultValue={canvasItems.find(i => i.id === selectedComponentId)?.subtitle} className="w-full px-4 py-2.5 rounded-[var(--radius-lg)] border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-bold bg-[var(--bg-panel)]" />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">背景图素材</label>
                         <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-[var(--radius-lg)] flex items-center justify-center bg-gray-50 cursor-pointer hover:border-blue-400 group overflow-hidden relative">
                            <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:blur-sm transition-all" alt="bg" />
                            <div className="relative z-10 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <ImageIcon className="icon-md text-[var(--color-primary)] mb-1" />
                              <span className="text-xs font-bold text-blue-700">替换图片</span>
                            </div>
                         </div>
                      </div>
                    </>
                  )}

                  {canvasItems.find(i => i.id === selectedComponentId)?.type === 'viral' && (
                    <>
                      <div>
                         <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">模块标题</label>
                         <input type="text" defaultValue={canvasItems.find(i => i.id === selectedComponentId)?.title} className="w-full px-4 py-2.5 rounded-[var(--radius-lg)] border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-bold bg-[var(--bg-panel)]" />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">挂载团购商品</label>
                         <select className="w-full px-4 py-2.5 rounded-[var(--radius-lg)] border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-bold bg-[var(--bg-panel)] appearance-none">
                            <option>招牌双人餐团购链接</option>
                            <option>海景下午茶团购链接</option>
                            <option>暂不挂载链接</option>
                         </select>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">智能混剪视频库 (AI)</label>
                         <div className="bg-blue-50 border border-blue-100 rounded-[var(--radius-lg)] p-4 cursor-pointer hover:bg-blue-100 transition-colors">
                            <div className="flex justify-between items-center mb-2">
                               <span className="text-sm font-bold text-blue-900">店内素材库 (42 个片段)</span>
                               <Settings2 className="icon-sm text-[var(--color-primary)]" />
                            </div>
                            <p className="text-[11px] text-blue-700 leading-relaxed">系统将从此素材库中运用 AI 随机抽取短片素材，为每个扫码分发的用户合成专属的原创短片，避免被平台判定搬运。</p>
                         </div>
                      </div>
                    </>
                  )}

                  <div className="pt-6">
                     <button 
                       onClick={() => setSelectedComponentId(null)}
                       className="w-full py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-[var(--radius-lg)] text-sm font-bold transition-colors"
                     >
                        从画板移除此组件
                     </button>
                  </div>
                </>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center px-4">
                  <MousePointer2 className="icon-xl text-gray-300 mb-3" />
                  <p className="text-[var(--text-muted)] text-sm font-medium">请在左侧画板中点击选中一个组件，以在此处编辑其详细属性。</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

