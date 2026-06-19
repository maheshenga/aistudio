import React, { useState, useEffect, useMemo } from 'react';
import { UserCircle2, Video, Mic, Plus, Play, MoreHorizontal, Check, Search, Filter, MonitorPlay, Clock, Wand2, ShieldCheck } from 'lucide-react';
import { useSaasSession } from '../saas/SaasAuthContext';
import { loadWorkspaceAvatarConsents, createWorkspaceAvatarConsent, revokeWorkspaceAvatarConsent, createWorkspaceAvatarSource, type AvatarRepositoryContext, type WorkspaceAvatarConsent } from '../lib/data/avatarRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { toast } from './Toast';

interface AvatarViewProps {
  moduleId: string;
}

export function AvatarView({ moduleId }: AvatarViewProps) {
  // Render content based on the active tab/sub-module
  switch (moduleId) {
    case 'avatar_home':
      return <AvatarHome />;
    case 'avatar_create':
      return <AvatarCreate />;
    case 'avatar_voice':
      return <AvatarVoice />;
    case 'avatar_space':
      return <AvatarSpace />;
    default:
      return <AvatarHome />;
  }
}

function AvatarHome() {
  return (
    <div className="p-[var(--spacing-xl)] space-y-[var(--spacing-lg)] max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[var(--bg-panel)] p-[var(--spacing-xl)] rounded-[24px] shadow-sm border border-[var(--border-color)]">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-main)] mb-2 mt-1 flex items-center">
            数字人直播与口播助理
            <span className="ml-3 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded shadow-sm border border-green-200 uppercase tracking-widest flex items-center">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
              Live Node
            </span>
          </h2>
          <p className="text-[var(--text-muted)] text-[14px] font-medium max-w-2xl leading-relaxed">
            24 小时待命的虚拟人节点。在此克隆形象与声纹，一键下发推流指令或自动生成口播短视频素材。
          </p>
        </div>
        <button className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-6 py-3 rounded-[var(--radius-lg)] font-bold text-sm transition-colors shadow-sm flex items-center mt-4 sm:mt-0">
          <Wand2 className="icon-md mr-2" />
          唤醒数字人节点
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
         {/* Stats Card */}
         <div className="bg-[var(--bg-panel)] p-[var(--spacing-lg)] rounded-[var(--radius-xl)] shadow-sm border border-[var(--border-color)]">
            <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">视频额度</h3>
            <div className="flex items-end space-x-2">
               <span className="text-[var(--text-main)]xl font-extrabold text-[var(--text-main)]">45</span>
               <span className="text-[var(--text-muted)] font-medium pb-1.5">/ 100 分钟</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-4">
               <div className="bg-gray-900 h-2 rounded-full" style={{ width: '45%' }}></div>
            </div>
         </div>

         {/* Voices Card */}
         <div className="bg-[var(--bg-panel)] p-[var(--spacing-lg)] rounded-[var(--radius-xl)] shadow-sm border border-[var(--border-color)]">
            <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">声音克隆</h3>
            <div className="flex items-end space-x-2">
               <span className="text-[var(--text-main)]xl font-extrabold text-[var(--text-main)]">3</span>
               <span className="text-[var(--text-muted)] font-medium pb-1.5">个专属声音</span>
            </div>
            <div className="mt-4 flex -space-x-2">
               {[1,2,3].map(i => (
                 <div key={i} className="icon-xl rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-gray-700 font-bold text-xs ring-1 ring-gray-100">
                    S{i}
                 </div>
               ))}
               <div className="icon-xl rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-gray-400 border-dashed cursor-pointer hover:bg-gray-100">
                  <Plus className="icon-sm" />
               </div>
            </div>
         </div>

         {/* Avatars Card */}
         <div className="bg-[var(--bg-panel)] p-[var(--spacing-lg)] rounded-[var(--radius-xl)] shadow-sm border border-[var(--border-color)]">
            <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">定制数字人</h3>
            <div className="flex items-end space-x-2">
               <span className="text-[var(--text-main)]xl font-extrabold text-[var(--text-main)]">2</span>
               <span className="text-[var(--text-muted)] font-medium pb-1.5">个数字分身</span>
            </div>
            <div className="mt-4 flex -space-x-2">
               {[1,2].map(i => (
                 <div key={i} className="icon-xl rounded-full bg-green-100 border-2 border-white flex items-center justify-center text-green-600 font-bold text-xs">
                    V{i}
                 </div>
               ))}
               <div className="icon-xl rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-gray-400 border-dashed cursor-pointer hover:bg-gray-100">
                  <Plus className="icon-sm" />
               </div>
            </div>
         </div>
      </div>

      <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] shadow-sm border border-[var(--border-color)] p-[var(--spacing-lg)]">
         <div className="flex items-center justify-between mb-[var(--spacing-md)]">
            <h3 className="text-lg font-bold text-[var(--text-main)]">最近作品</h3>
            <button className="text-sm font-medium text-gray-700 hover:underline">查看全部</button>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)]">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-50 rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border-color)] group cursor-pointer hover:shadow-md transition-shadow">
                 <div className="aspect-video bg-gray-200 relative">
                    <img src={`https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=300&h=200&crop=faces`} className="w-full h-full object-cover" alt="Video" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                       <div className="w-10 h-10 bg-[var(--bg-panel)]/90 rounded-full flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
                          <Play className="icon-md text-[var(--text-main)] ml-1" fill="currentColor" />
                       </div>
                    </div>
                    <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">00:15</span>
                 </div>
                 <div className="p-3">
                    <p className="text-sm font-bold text-[var(--text-main)] line-clamp-1 group-hover:text-[var(--text-main)] transition-colors">产品介绍视频_v{i}.mp4</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center">今天 14:30 · 渲染完成</p>
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}

function AvatarCreate() {
  const [text, setText] = useState('大家好，欢迎来到我们的频道！今天给大家介绍一款最新上线的产品。');
  const [creationMode, setCreationMode] = useState<'video' | 'interactive' | 'mixed'>('video');
  
  return (
    <div className="flex h-[calc(100vh-4rem)]">
       {/* Left Input Area */}
       <div className="w-[420px] bg-[var(--bg-panel)] border-r border-[var(--border-color)] flex flex-col flex-shrink-0 z-10 shadow-[2px_0_15px_rgba(0,0,0,0.03)] z-10">
          <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between bg-gray-50/50">
             <h3 className="font-bold text-[var(--text-main)] text-[16px]">创作数字人分身</h3>
             <div className="flex bg-gray-200/70 p-1 rounded-lg">
                <button onClick={() => setCreationMode('video')} className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors ${creationMode === 'video' ? 'bg-[var(--bg-panel)] shadow-sm text-blue-700' : 'text-[var(--text-muted)]'}`}>口播视频</button>
                <button onClick={() => setCreationMode('mixed')} className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors ${creationMode === 'mixed' ? 'bg-[var(--bg-panel)] shadow-sm text-blue-700' : 'text-[var(--text-muted)]'}`}>交错混剪</button>
                <button onClick={() => setCreationMode('interactive')} className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors ${creationMode === 'interactive' ? 'bg-[var(--bg-panel)] shadow-sm text-blue-700' : 'text-[var(--text-muted)]'}`}>互动直播</button>
             </div>
          </div>
          <div className="flex-1 p-5 overflow-y-auto space-y-7 custom-scrollbar">
             <div className="space-y-3">
               <h4 className="text-[13px] font-bold text-gray-700 flex items-center">
                  <span className="icon-md rounded-full bg-blue-100 text-[var(--color-primary)] flex items-center justify-center text-[10px] mr-2">1</span>
                  选择数字人形象模型
               </h4>
               <div className="grid grid-cols-3 gap-3">
                  {['职业女性_v2', '休闲男性_v1', '虚拟偶像_3D'].map((name, i) => (
                    <div key={i} className={`cursor-pointer group flex flex-col items-center p-2 rounded-[var(--radius-lg)] border-2 transition-all ${i === 0 ? 'border-blue-600 bg-blue-50/30 shadow-sm' : 'border-transparent hover:bg-gray-50'} relative`}>
                       {i === 2 && <span className="absolute -top-2 -right-2 bg-gradient-to-r from-fuchsia-500 to-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm font-bold">NEW</span>}
                       <div className="aspect-square w-full rounded-lg overflow-hidden mb-2">
                          <img src={`https://images.unsplash.com/photo-${i === 0 ? '1573496359142-b8d87734a5a2' : i === 1 ? '1556157382-97eda2d62296' : '1618331835717-801e976710b2'}?auto=format&fit=crop&q=80&w=150`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={name} />
                       </div>
                       <p className={`text-[11px] font-bold text-center w-full truncate ${i === 0 ? 'text-blue-700' : 'text-gray-600'}`}>{name}</p>
                    </div>
                  ))}
               </div>
             </div>

             {creationMode === 'video' || creationMode === 'mixed' ? (
               <div className="space-y-[var(--spacing-md)]">
                 {creationMode === 'mixed' && (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-[var(--radius-lg)] mb-2">
                       <h5 className="text-[12px] font-bold text-amber-800 mb-1 flex items-center">
                          交错混剪引擎模式
                       </h5>
                       <p className="text-[11px] text-amber-700 leading-relaxed">
                          在此模式下，系统会根据下方文案自动匹配素材库中的 B Roll 资产，并与数字人相互穿插混剪，生成具有高完成度的短视频作品。
                       </p>
                    </div>
                 )}
                 <div className="space-y-2">
                   <h4 className="text-[13px] font-bold text-gray-700 flex items-center justify-between">
                      <div className="flex items-center">
                         <span className="icon-md rounded-full bg-blue-100 text-[var(--color-primary)] flex items-center justify-center text-[10px] mr-2">2</span>
                         驱动脚本内容 (文案)
                      </div>
                      <button className="text-[11px] text-[var(--color-primary)] bg-blue-50 px-2.5 py-1 rounded-md font-bold hover:bg-blue-100 transition-colors flex items-center">
                        <Wand2 className="w-3 h-3 mr-1" />
                        AI 智能续写
                      </button>
                   </h4>
                   <div className="relative border border-[var(--border-color)] rounded-[var(--radius-lg)] focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all bg-gray-50/50">
                      <textarea 
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full h-36 p-3 bg-transparent outline-none text-[14px] leading-relaxed resize-none custom-scrollbar"
                        placeholder="在这里输入你想让数字人说的文案..."
                      />
                      <div className="absolute bottom-2 left-3 right-3 flex justify-between items-center bg-[var(--bg-panel)]/80 backdrop-blur-sm p-1.5 rounded-lg border border-[var(--border-color)] shadow-sm">
                         <div className="flex space-x-1">
                            <button className="p-1 hover:bg-gray-100 rounded text-[var(--text-muted)]" title="插入停顿"><Clock className="icon-sm" /></button>
                            <button className="p-1 hover:bg-gray-100 rounded text-[var(--text-muted)]" title="动作预设"><UserCircle2 className="icon-sm" /></button>
                         </div>
                         <span className="text-[11px] font-bold text-[var(--color-primary)] px-2">预计时长: 15秒 ({text.length}字)</span>
                      </div>
                   </div>
                 </div>
               </div>
             ) : (
               <div className="space-y-[var(--spacing-md)]">
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-[var(--radius-lg)]">
                     <div className="flex items-center text-blue-800 font-bold mb-2">
                        <MonitorPlay className="icon-sm mr-2" />
                        互动直播流设置
                     </div>
                     <p className="text-xs text-[var(--color-primary)] mb-4 leading-relaxed">开启此模式后，将生成实时可交互的视频流。您可以通过 API 接口或下方测试台，实时发送文本或音频来驱动模型说话，延迟低于 300ms。</p>
                     
                     <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">推流协议</label>
                          <select className="w-full text-sm border-[var(--border-color)] rounded-lg py-2 px-3 focus:ring-blue-500 focus:border-blue-500">
                             <option>WebRTC (超低延迟)</option>
                             <option>RTMP (高画质)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">画质分辨率</label>
                          <select className="w-full text-sm border-[var(--border-color)] rounded-lg py-2 px-3 focus:ring-blue-500 focus:border-blue-500">
                             <option>1080P 极光画质 (消耗 2.0 额度/分钟)</option>
                             <option>720P 高清画质 (消耗 1.0 额度/分钟)</option>
                          </select>
                        </div>
                     </div>
                  </div>
               </div>
             )}

             <div className="space-y-3">
               <h4 className="text-[13px] font-bold text-gray-700 flex items-center">
                  <span className="icon-md rounded-full bg-blue-100 text-[var(--color-primary)] flex items-center justify-center text-[10px] mr-2">3</span>
                  配音音色与声音引擎
               </h4>
               <div className="grid grid-cols-2 gap-2">
                  <button className="p-3 border-2 border-blue-600 bg-blue-50 text-blue-800 font-bold text-[13px] rounded-[var(--radius-lg)] relative shadow-sm text-left">
                     <span className="block">知性女声 (默认)</span>
                     <span className="block mt-1 text-[10px] font-medium text-blue-500">中文/英文 - 清晰沉稳</span>
                     <Check className="icon-sm absolute top-2 right-2 text-[var(--color-primary)]" />
                  </button>
                  <button className="p-3 border-2 border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-[var(--border-color)] font-bold text-gray-700 text-[13px] rounded-[var(--radius-lg)] text-left transition-colors">
                     <span className="block">专业男解说</span>
                     <span className="block mt-1 text-[10px] font-medium text-[var(--text-muted)]">中文 - 浑厚磁性</span>
                  </button>
                  <button className="p-3 border-2 border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-[var(--border-color)] font-bold text-gray-700 text-[13px] rounded-[var(--radius-lg)] text-left transition-colors col-span-2 flex justify-between items-center shadow-sm">
                     <div className="flex items-center">
                        <Mic className="icon-sm mr-2 text-green-500" />
                        <span className="block">使用自定义克隆音色</span>
                     </div>
                     <span className="px-2 py-1 bg-green-50 text-green-600 text-[10px] rounded font-bold">前往管理</span>
                  </button>
               </div>
             </div>
             
             {(creationMode === 'video' || creationMode === 'mixed') && (
                <div className="space-y-3 border-t border-[var(--border-color)] pt-4">
                  <h4 className="text-[13px] font-bold text-gray-700 flex items-center justify-between">
                     <span>精细动作与微调</span>
                     <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Pro</span>
                  </h4>
                  <div className="space-y-2">
                     <div className="space-y-[var(--spacing-md)]">
                     <label className="flex items-center justify-between p-3 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors">
                       <div>
                         <span className="text-sm font-bold text-gray-700 block">多模态情感自动解析</span>
                         <span className="text-[11px] text-[var(--text-muted)]">根据文案自动生成喜怒哀乐与停顿</span>
                       </div>
                       <input type="checkbox" className="rounded text-[var(--color-primary)] border-gray-300 focus:ring-blue-500 icon-sm cursor-pointer" defaultChecked />
                     </label>
                     <label className="flex items-center justify-between p-3 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors">
                       <div>
                         <span className="text-sm font-bold text-gray-700 block">实时手势与姿态生成</span>
                         <span className="text-[11px] text-[var(--text-muted)]">匹配说话节奏自动生成肢体语言</span>
                       </div>
                       <input type="checkbox" className="rounded text-[var(--color-primary)] border-gray-300 focus:ring-blue-500 icon-sm cursor-pointer" defaultChecked />
                     </label>
                     <label className="flex items-center justify-between p-3 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors">
                       <div>
                         <span className="text-sm font-bold text-gray-700 block">多语言跨界音色穿透</span>
                         <span className="text-[11px] text-[var(--text-muted)]">即使音色是中文，也能保持原音说外语</span>
                       </div>
                       <input type="checkbox" className="rounded text-[var(--color-primary)] border-gray-300 focus:ring-blue-500 icon-sm cursor-pointer" />
                     </label>
                  </div>
                  </div>
                </div>
             )}
          </div>
          <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-panel)]">
             {creationMode === 'video' || creationMode === 'mixed' ? (
                <div className="space-y-3">
                   <div className="flex justify-between items-center px-1">
                      <span className="text-[11px] font-bold text-[var(--text-muted)]">预计消耗: <span className="text-[var(--text-main)]">0.5 分钟</span></span>
                      <span className="text-[11px] font-bold text-green-600">当前余额: 45 分钟</span>
                   </div>
                   <button className="w-full bg-[var(--color-primary)] hover:bg-blue-700 text-white py-3 rounded-[var(--radius-lg)] font-bold shadow-md transition-all flex items-center justify-center">
                      <Video className="icon-sm mr-2" /> 生成{creationMode === 'mixed' ? '交错混剪' : '数字人'}视频
                   </button>
                </div>
             ) : (
                <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-[var(--radius-lg)] font-bold shadow-md transition-all flex items-center justify-center space-x-2">
                   <Play className="icon-md" /> <span>启动交互直播引擎</span>
                </button>
             )}
          </div>
       </div>

       {/* Right Canvas */}
       <div className="flex-1 bg-[#F3F6F8] flex flex-col items-center justify-center p-[var(--spacing-xl)] relative overflow-hidden">
          {/* Top Panel Actions */}
          <div className="absolute top-[var(--spacing-lg)] right-6 flex items-center space-x-2 z-20">
             <button className="px-3 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-700 transition-colors shadow-sm">9:16 竖屏手机</button>
             <button className="px-3 py-1.5 bg-gray-100 text-[var(--text-main)] border border-black shadow-sm rounded-lg text-xs font-bold transition-colors">16:9 横屏显示器</button>
          </div>

          <div className="absolute top-[var(--spacing-lg)] left-6 z-20">
             <div className="bg-[var(--bg-panel)]/90 backdrop-blur-md border border-[var(--border-color)]/50 shadow-sm rounded-[var(--radius-lg)] p-3 flex items-center space-x-4">
                <div>
                   <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">视频预览背景</p>
                   <div className="flex space-x-2">
                      <div className="icon-lg rounded-md bg-green-500 cursor-pointer border-2 border-white shadow-sm ring-1 ring-gray-200 tooltip" title="默认绿屏抠像"></div>
                      <div className="icon-lg rounded-md bg-[url('https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=100')] bg-cover cursor-pointer border-2 border-transparent"></div>
                      <div className="icon-lg rounded-md bg-gray-50 border-2 border-dashed border-gray-300 cursor-pointer flex items-center justify-center hover:bg-gray-100"><Plus className="w-3 h-3 text-gray-400" /></div>
                   </div>
                </div>
                <div className="border-l border-[var(--border-color)] pl-4">
                   <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">位置</p>
                   <div className="flex items-center space-x-1.5">
                      <button className="w-7 h-6 bg-gray-100 rounded text-gray-600 flex items-center justify-center text-[10px] font-bold hover:bg-gray-200 transition-colors">全</button>
                      <button className="w-7 h-6 bg-gray-100 rounded text-gray-600 flex items-center justify-center text-[10px] font-bold hover:bg-gray-200 transition-colors">半</button>
                      <button className="w-7 h-6 bg-gray-100 text-[var(--text-main)] border border-gray-900 shadow-sm rounded flex items-center justify-center text-[10px] font-bold">中</button>
                   </div>
                </div>
             </div>
          </div>

          {/* Main Visual Render Area */}
          <div className={`w-full max-w-3xl aspect-video ${creationMode === 'interactive' ? 'bg-green-500' : 'bg-[var(--bg-panel)]'} rounded-[var(--radius-lg)] shadow-xl border border-[var(--border-color)] overflow-hidden relative group transition-colors duration-500`}>
             <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=1200" className={`w-full h-full object-cover object-top ${creationMode === 'interactive' ? 'opacity-90 scale-105' : 'opacity-90'}`} alt="Preview" />
             
             {creationMode === 'interactive' ? (
                <div className="absolute top-4 left-4 flex items-center space-x-2 bg-green-900/60 backdrop-blur pl-2 pr-4 py-1.5 rounded-full border border-white/20">
                   <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                   <span className="text-white text-[11px] font-bold tracking-widest uppercase">Live RTMP Engine Ready</span>
                </div>
             ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                   <div className="bg-[var(--bg-panel)]/90 backdrop-blur px-6 py-4 rounded-[var(--radius-lg)] shadow-lg flex flex-col items-center text-center max-w-md">
                      <Play className="w-10 h-10 text-[var(--text-main)] mb-3 opacity-50" />
                      <p className="text-[var(--text-main)] font-bold text-sm">画面实时预览区</p>
                      <p className="text-[12px] text-[var(--text-muted)] mt-1">口型和动作将在合成后生效</p>
                   </div>
                </div>
             )}

             <div className={`absolute inset-x-0 bottom-0 ${creationMode === 'interactive' ? 'bg-gradient-to-t from-black/60 to-transparent p-[var(--spacing-lg)]' : 'p-[var(--spacing-lg)] flex justify-center'}`}>
                {creationMode === 'video' ? (
                   <p className="bg-black/70 text-white px-5 py-2 rounded-[var(--radius-lg)] text-[15px] font-medium text-center shadow-lg">
                      {text.substring(0, 50)}{text.length > 50 && '...'}
                   </p>
                ) : (
                   <div className="bg-[var(--bg-panel)]/10 backdrop-blur-md rounded-[var(--radius-lg)] border border-white/20 p-4 max-w-xl mx-auto w-full opacity-0 group-hover:opacity-100 transition-opacity mt-4 translate-y-2 group-hover:translate-y-0">
                      <p className="text-white/80 text-[11px] font-bold mb-2">交互测试控制台</p>
                      <div className="flex space-x-2">
                         <input type="text" placeholder="给数字人发送测试指令..." className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400" />
                         <button className="bg-[var(--color-primary)] hover:bg-blue-500 text-white rounded-lg px-4 py-2 font-bold text-sm shadow-sm transition-colors">发送</button>
                      </div>
                   </div>
                )}
             </div>
             
             {creationMode === 'interactive' && (
               <div className="absolute inset-x-0 bottom-0 h-[3px] bg-[var(--bg-panel)]/20">
                  <div className="h-full bg-green-400 w-1/3"></div>
               </div>
             )}
          </div>
       </div>
    </div>
  );
}

function AvatarVoice() {
  const session = useSaasSession();
  const repoContext = useMemo<AvatarRepositoryContext>(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.workspace.id, session.user.id],
  );
  const [consents, setConsents] = useState<WorkspaceAvatarConsent[]>([]);

  useEffect(() => {
    setConsents(loadWorkspaceAvatarConsents(repoContext).filter(c => c.consentType === 'voice_clone'));
  }, [repoContext]);

  useEffect(() => {
    const handler = () => setConsents(loadWorkspaceAvatarConsents(repoContext).filter(c => c.consentType === 'voice_clone'));
    if (typeof window !== 'undefined') window.addEventListener('workspace_avatar_updated', handler);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('workspace_avatar_updated', handler); };
  }, [repoContext]);

  const handleCloneVoice = () => {
    const subjectName = (typeof window !== 'undefined' ? window.prompt('请输入被克隆人姓名（用于授权登记）') : '')?.trim();
    if (!subjectName) {
      toast('已取消：声音克隆必须登记授权主体', 'warning');
      return;
    }
    const consent = createWorkspaceAvatarConsent({
      subjectName,
      consentType: 'voice_clone',
      status: 'granted',
      source: 'avatar_voice_manager',
      ownerId: session.user.id,
      metadata: { confirmedBy: session.user.id },
    }, repoContext);
    createWorkspaceAvatarSource({
      consentId: consent.id,
      name: `${subjectName} 声纹样本`,
      type: 'audio',
      ownerId: session.user.id,
      metadata: {},
    }, repoContext);
    logAuditEvent({
      action: 'asset_create',
      moduleId: 'avatar_voice',
      targetType: 'workspace',
      targetId: consent.id,
      metadata: { subjectName, consentType: 'voice_clone' },
    }, { session });
    setConsents(loadWorkspaceAvatarConsents(repoContext).filter(c => c.consentType === 'voice_clone'));
    toast('声音克隆授权已登记，可用于创作', 'success');
  };

  const handleRevoke = (id: string, subjectName: string) => {
    revokeWorkspaceAvatarConsent(id, repoContext);
    logAuditEvent({
      action: 'asset_delete',
      moduleId: 'avatar_voice',
      targetType: 'workspace',
      targetId: id,
      metadata: { subjectName, action: 'revoke_consent' },
    }, { session });
    setConsents(loadWorkspaceAvatarConsents(repoContext).filter(c => c.consentType === 'voice_clone'));
    toast('已撤销该声音的克隆授权', 'success');
  };

  const grantedCount = consents.filter(c => c.status === 'granted').length;

  return (
    <div className="p-[var(--spacing-xl)] space-y-[var(--spacing-lg)] max-w-5xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2 mt-1">声音管理</h2>
          <p className="text-[var(--text-muted)] text-sm">在这里克隆、管理并优化为数字人配音的音色。每个克隆音色均需登记授权。</p>
        </div>
        <button onClick={handleCloneVoice} className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center">
          <Mic className="icon-sm mr-2" />
          克隆新声音
        </button>
      </div>

      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] shadow-sm overflow-hidden">
         <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-gray-50/50">
            <div className="flex space-x-2">
               <button className="px-4 py-1.5 bg-gray-200 text-[var(--text-main)] text-sm font-bold rounded-lg border border-gray-300">已授权克隆 ({grantedCount})</button>
               <button className="px-4 py-1.5 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded-lg">公共音色库</button>
            </div>
            <div className="relative">
               <Search className="icon-sm absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input type="text" placeholder="搜索音色..." className="pl-9 pr-4 py-1.5 border border-[var(--border-color)] rounded-lg text-sm bg-[var(--bg-panel)] focus:outline-none focus:border-gray-900" />
            </div>
         </div>
         <div className="divide-y divide-gray-100">
            {consents.length === 0 ? (
              <div className="p-10 flex flex-col items-center justify-center text-center text-[var(--text-muted)]">
                 <ShieldCheck className="w-10 h-10 text-gray-300 mb-3" />
                 <p className="text-sm font-bold text-gray-600">尚无已授权的克隆音色</p>
                 <p className="text-xs mt-1">点击右上角“克隆新声音”，登记授权主体后即可开始克隆。</p>
              </div>
            ) : (
              consents.map((voice) => (
                <div key={voice.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                   <div className="flex items-center space-x-4">
                      <button className="w-10 h-10 rounded-full bg-gray-100 text-[var(--text-main)] flex items-center justify-center hover:bg-gray-200 transition-colors">
                         <Play className="icon-sm ml-0.5" fill="currentColor" />
                      </button>
                      <div>
                         <h4 className="font-bold text-[var(--text-main)] flex items-center">
                           {voice.subjectName}
                           {voice.status === 'granted' ? (
                             <span className="ml-2 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded flex items-center"><ShieldCheck className="w-3 h-3 mr-0.5" /> 已授权</span>
                           ) : (
                             <span className="ml-2 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">已撤销</span>
                           )}
                         </h4>
                         <div className="flex items-center mt-1 space-x-2">
                            <span className="text-[11px] text-[var(--text-muted)] bg-gray-100 px-1.5 py-0.5 rounded">声音克隆</span>
                            <span className="text-[11px] text-gray-400 font-mono ml-2">登记于 {new Date(voice.grantedAt).toLocaleDateString()}</span>
                         </div>
                      </div>
                   </div>
                   <div className="flex space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      {voice.status === 'granted' && (
                        <>
                          <button className="text-sm font-medium text-[var(--text-main)] hover:underline">去创作</button>
                          <button onClick={() => handleRevoke(voice.id, voice.subjectName)} className="text-sm font-medium text-red-500 hover:underline">撤销授权</button>
                        </>
                      )}
                      <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal className="icon-md" /></button>
                   </div>
                </div>
              ))
            )}
         </div>
      </div>
    </div>
  );
}

function AvatarSpace() {
  return (
    <div className="p-[var(--spacing-xl)] space-y-[var(--spacing-lg)] max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2 mt-1">数字人空间</h2>
          <p className="text-[var(--text-muted)] text-sm">管理你的数字分身形象模型，训练个性化的动作和表情库。</p>
        </div>
        <button className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center">
          <Video className="icon-sm mr-2" />
          定制新形象
        </button>
      </div>

      <div className="flex items-center space-x-3 mb-[var(--spacing-md)]">
         <div className="px-4 py-1.5 bg-[var(--color-primary)] text-white font-bold text-sm rounded-full cursor-pointer shadow-sm">所有形象</div>
         <div className="px-4 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-600 font-medium text-sm rounded-full cursor-pointer hover:bg-gray-50">2D 真人克隆</div>
         <div className="px-4 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-600 font-medium text-sm rounded-full cursor-pointer hover:bg-gray-50">3D 虚拟人</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)]">
         {/* Add New */}
         <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border-2 border-dashed border-gray-300 hover:border-gray-900/40 hover:bg-gray-50 transition-all cursor-pointer flex flex-col items-center justify-center p-[var(--spacing-xl)] aspect-[3/4] group shadow-sm">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
               <Plus className="icon-lg text-gray-400 group-hover:text-[var(--text-main)]" />
            </div>
            <p className="font-bold text-gray-700">定制数字分身</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">仅需 3 分钟视频</p>
         </div>

         {/* Items */}
         {[
           { name: '西装播报-基础', type: '2D 真人', img: '1438761681033-6461ffad8d80' },
           { name: '休闲服-走动', type: '2D 真人', img: '1472099645785-5658abf4ff4e' },
           { name: '元宇宙-3D', type: '3D 模型', img: '1534528741775-53994a69daeb' },
         ].map((avatar, i) => (
           <div key={i} className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer relative">
              <div className="absolute top-3 left-3 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full z-10 backdrop-blur-sm">
                 {avatar.type}
              </div>
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                 <button className="bg-[var(--bg-panel)]/90 text-gray-700 p-1.5 rounded-md hover:text-[var(--text-main)] shadow-sm"><MoreHorizontal className="icon-sm" /></button>
              </div>
              <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
                 <img src={`https://images.unsplash.com/photo-${avatar.img}?auto=format&fit=crop&q=80&w=400`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 object-top" alt={avatar.name} />
              </div>
              <div className="p-4 bg-[var(--bg-panel)] relative z-20">
                 <h4 className="font-bold text-[var(--text-main)]">{avatar.name}</h4>
                 <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-700 bg-gray-100 border border-[var(--border-color)] px-2 py-1 rounded">可商用</span>
                    <button className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]">创作口播 &rarr;</button>
                 </div>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
}
