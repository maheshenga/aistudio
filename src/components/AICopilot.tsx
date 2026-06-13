import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Send, Bot, MessageSquare, Zap, Cpu, Search, ImageIcon, Video, Layers, ChevronDown, CheckCircle2, LineChart, Play, Palette, Mic } from 'lucide-react';
import { useSaasSession } from '../saas/SaasAuthContext';
import { createGenerationJob, updateGenerationJob } from '../lib/data/generationJobRepository';
import { createWorkspaceAsset } from '../lib/data/assetRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';

interface AICopilotProps {
  isOpen: boolean;
  onClose: () => void;
}

type CopilotWidget = 'chart' | 'video' | 'task';

interface CopilotMessage {
  role: 'ai' | 'user';
  text: string;
  isVoice?: boolean;
  actions?: string[];
  widget?: CopilotWidget;
}

function buildCopilotReply(userText: string): { text: string; widget: CopilotWidget } {
  if (userText.includes('数据') || userText.includes('分析')) {
    return {
      text: '已为您拉取近七天跨平台核心指标。您的「小红书」渠道转化率表现最佳。',
      widget: 'chart',
    };
  }
  if (userText.includes('视频') || userText.includes('生成')) {
    return {
      text: '已自动为您生成有关“双十一大促”的预热短视频草稿，并匹配了最新的流行 BGM。',
      widget: 'video',
    };
  }
  return {
    text: '指令已收到。正在规划执行任务链路，如果需要进一步调整请随时告知。',
    widget: 'task',
  };
}

export function AICopilot({ isOpen, onClose }: AICopilotProps) {
  const session = useSaasSession();
  const repositoryContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [messages, setMessages] = useState<CopilotMessage[]>([
    { 
       role: 'ai', 
       text: '你好，我是你的全域 AI 业务助理。今天需要梳理商品数据、制定营销策略、还是生成视频素材？',
       actions: [
          '生成今日电商爆款图文',
          '分析各渠道广告投放数据',
          '创建微信自动化拓客流'
       ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isOpen]);

  const dispatchActivityLogged = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('activity_logged'));
    }
  };

  const sendMsg = (textOverride?: string, isVoice: boolean = false) => {
    const userText = (textOverride ?? input).trim();
    if (!userText || isTyping) return;

    setMessages(prev => [...prev, { role: 'user', text: userText, isVoice }]);
    setInput('');
    setIsTyping(true);

    let jobId: string | null = null;
    try {
      const reply = buildCopilotReply(userText);
      const job = createGenerationJob({
        title: `Copilot Command ${isVoice ? '(Voice)' : '(Text)'}`,
        prompt: userText,
        status: 'running',
        providerKind: 'mock',
        runtimeMode: 'web',
        moduleId: 'dashboard',
        agentId: 'global-copilot-agent',
        progress: 30,
        metadata: {
          isVoice,
          widget: reply.widget,
          source: 'global_copilot',
        },
      }, repositoryContext);
      jobId = job.id;
      logAuditEvent({
        action: 'ai_command',
        moduleId: 'dashboard',
        targetType: 'generation_job',
        targetId: job.id,
        metadata: {
          description: `Copilot Command ${isVoice ? '(Voice)' : '(Text)'}: ${userText}`,
          details: isVoice ? 'Voice-triggered' : 'Text-triggered',
          isVoice,
        },
      }, { session });
      logAuditEvent({
        action: 'generation_job_start',
        moduleId: 'dashboard',
        targetType: 'generation_job',
        targetId: job.id,
        metadata: {
          agentId: 'global-copilot-agent',
          isVoice,
          widget: reply.widget,
        },
      }, { session });
      updateGenerationJob(job.id, {
        status: 'succeeded',
        progress: 100,
        metadata: {
          ...job.metadata,
          responseWidget: reply.widget,
          result: 'copilot_text_asset',
        },
      }, repositoryContext);
      const asset = createWorkspaceAsset({
        name: `copilot-response-${Date.now()}.md`,
        type: 'text',
        size: `${reply.text.length} chars`,
        source: 'generated',
        moduleId: 'dashboard',
        generationJobId: job.id,
        tags: ['copilot', reply.widget, isVoice ? 'voice' : 'text'],
        metadata: {
          prompt: userText,
          responsePreview: reply.text.slice(0, 160),
          widget: reply.widget,
          isVoice,
        },
      }, repositoryContext);
      logAuditEvent({
        action: 'generation_job_complete',
        moduleId: 'dashboard',
        targetType: 'generation_job',
        targetId: job.id,
        metadata: {
          assetId: asset.id,
          assetType: 'text',
          widget: reply.widget,
        },
      }, { session });
      logAuditEvent({
        action: 'asset_create',
        moduleId: 'dashboard',
        targetType: 'asset',
        targetId: asset.id,
        metadata: {
          generationJobId: job.id,
          assetType: 'text',
          source: 'generated',
          widget: reply.widget,
        },
      }, { session });
      setMessages(prev => [...prev, { role: 'ai', text: reply.text, widget: reply.widget }]);
      dispatchActivityLogged();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Copilot command failed';
      if (jobId) {
        updateGenerationJob(jobId, { status: 'failed', progress: 100, error: message }, repositoryContext);
        logAuditEvent({
          action: 'generation_job_failed',
          moduleId: 'dashboard',
          targetType: 'generation_job',
          targetId: jobId,
          metadata: {
            agentId: 'global-copilot-agent',
            error: message,
          },
        }, { session });
        dispatchActivityLogged();
      }
      setMessages(prev => [...prev, { role: 'ai', text: 'Copilot 执行失败，已记录到任务审计中。', widget: 'task' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-[80]"
            onClick={onClose}
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-[450px] bg-[var(--bg-app)] shadow-[0_0_40px_rgba(0,0,0,0.1)] z-[90] flex flex-col border-l border-[var(--border-color)]"
          >
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)] bg-[var(--bg-panel)] z-10 shadow-sm relative">
              <div className="flex flex-col">
                 <div className="flex items-center space-x-3 mb-1">
                    <div className="w-[42px] h-[42px] rounded-[var(--radius-lg)] bg-[var(--color-primary)] border border-blue-700 flex items-center justify-center shadow-[0_2px_8px_rgba(26,115,232,0.3)] relative overflow-hidden group">
                       <div className="absolute inset-0 bg-gradient-to-t from-blue-700 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       <Sparkles className="icon-md text-white fill-white relative z-10 animate-pulse" />
                    </div>
                    <div>
                       <h2 className="text-[17px] font-black text-[var(--text-main)] tracking-tight flex items-center">
                          全局代理工作节点 (Copilot)
                       </h2>
                       <div className="flex items-center mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#1E8E3E] mr-1.5 animate-pulse shadow-[0_0_8px_#1E8E3E]"></div>
                          <p className="text-[11px] text-[#1E8E3E] font-bold tracking-widest uppercase">在线巡航中 (Gemini 3.1 Pro)</p>
                       </div>
                    </div>
                 </div>
              </div>
              
              <button 
                onClick={onClose}
                className="icon-xl flex items-center justify-center text-gray-400 hover:text-[var(--text-main)] hover:bg-gray-100 rounded-full transition-colors self-start"
              >
                <X className="icon-md" />
              </button>
            </div>

            {/* Global Context Indicator */}
            <div className="px-5 py-2.5 bg-gray-50 border-b border-[var(--border-color)] flex items-center justify-between z-10">
               <div className="flex items-center text-[11px] font-bold text-gray-700">
                  <Cpu className="w-[14px] h-[14px] mr-1.5" /> 已注入当前工作区上下文
               </div>
               <button className="text-[10px] bg-[var(--bg-panel)] border border-[var(--border-color)] px-2 py-0.5 rounded shadow-sm text-gray-700 font-bold hover:bg-gray-100">切换知识库源</button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-[var(--spacing-lg)] custom-scrollbar relative">
               <div className="flex justify-center mb-[var(--spacing-md)]">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400 bg-gray-200/50 px-3 py-1 rounded-full">Today, 09:42 AM</span>
               </div>
               {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[90%] rounded-[var(--radius-xl)] p-4 shadow-sm text-[14px] leading-relaxed relative ${
                        msg.role === 'user' ? 'bg-[var(--color-primary)] text-white rounded-tr-sm' : 'bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-main)] rounded-tl-sm'
                     }`}>
                        {msg.role === 'ai' && i === 0 && (
                           <Sparkles className="absolute top-[-8px] left-[-8px] icon-sm text-blue-500 fill-blue-500" />
                        )}
                        <span className="font-medium">{msg.text}</span>
                        
                        {/* Action buttons */}
                        {msg.actions && (
                           <div className="mt-4 space-y-2">
                              {msg.actions.map((act: string, actionIdx: number) => (
                                 <button onClick={() => sendMsg(act)} key={actionIdx} className="block w-full text-left px-4 py-2.5 bg-[var(--bg-panel)] hover:bg-blue-50 text-blue-700 text-xs font-bold rounded-[var(--radius-lg)] transition-colors border border-[var(--border-color)] hover:border-blue-200 shadow-sm">
                                    <Sparkles className="inline-block w-3 h-3 mr-1.5 text-blue-500" />
                                    {act}
                                 </button>
                              ))}
                           </div>
                        )}

                        {/* Rich Widgets */}
                        {msg.widget === 'chart' && (
                           <div className="mt-4 border border-[var(--border-color)] rounded-[var(--radius-lg)] overflow-hidden bg-[var(--bg-panel)] shadow-sm">
                              <div className="px-3 py-2 border-b border-[var(--border-color)] flex items-center justify-between">
                                 <span className="text-xs font-bold text-gray-600 flex items-center"><LineChart className="w-3.5 h-3.5 mr-1 text-blue-500" /> 转化率分析</span>
                                 <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">+12%</span>
                              </div>
                              <div className="h-24 bg-[var(--bg-panel)] flex items-center justify-center">
                                 <div className="w-full px-4 flex items-end justify-between h-12">
                                    <div className="w-4 bg-blue-100 rounded-t-sm h-[40%]"></div>
                                    <div className="w-4 bg-blue-200 rounded-t-sm h-[60%]"></div>
                                    <div className="w-4 bg-blue-300 rounded-t-sm h-[75%]"></div>
                                    <div className="w-4 bg-blue-400 rounded-t-sm h-[90%]"></div>
                                    <div className="w-4 bg-[var(--color-primary)] rounded-t-sm h-[100%] ring-2 ring-blue-100"></div>
                                 </div>
                              </div>
                           </div>
                        )}

                        {msg.widget === 'video' && (
                           <div className="mt-4 border border-[var(--border-color)] rounded-[var(--radius-lg)] overflow-hidden group cursor-pointer relative bg-gray-900">
                              <div className="aspect-video bg-gray-800 opacity-60 flex items-center justify-center">
                                 <Bot className="w-12 h-12 text-gray-600" />
                              </div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                 <div className="w-10 h-10 rounded-full bg-[var(--bg-panel)]/20 backdrop-blur border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Play className="icon-sm text-white fill-white ml-0.5" />
                                 </div>
                              </div>
                              <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                 <p className="text-xs text-white font-bold">已生成：双11预热_v2.mp4</p>
                              </div>
                           </div>
                        )}

                        {msg.widget === 'task' && (
                           <div className="mt-4 border border-green-200 bg-green-50 rounded-[var(--radius-lg)] p-3 flex items-start">
                              <CheckCircle2 className="icon-sm text-green-500 mt-0.5 mr-2 shrink-0" />
                              <div>
                                 <p className="text-xs font-bold text-green-800">1 个任务流已入队</p>
                                 <p className="text-[10px] text-green-600 mt-0.5">可以在全局任务中心监控进度。</p>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
               ))}
               {isTyping && (
                  <div className="flex justify-start">
                     <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] rounded-tl-sm p-4 shadow-sm flex space-x-1.5 items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" ></div>
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" ></div>
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" ></div>
                     </div>
                  </div>
               )}
               <div ref={endOfMessagesRef} />
            </div>

            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-panel)] z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
               <div className="flex space-x-2 mb-3 overflow-x-auto hide-scrollbar pb-1">
                  <button 
                    onClick={() => sendMsg('帮我生成爆款短视频')}
                    className="shrink-0 text-[11px] font-bold text-gray-600 hover:text-[var(--text-main)] px-3 py-1.5 rounded-full bg-[#F1F3F4] hover:bg-gray-200 border border-transparent transition-colors flex items-center">
                     <Video className="w-3.5 h-3.5 mr-1" /> 视频生成
                  </button>
                  <button 
                    onClick={() => sendMsg('提取本页核心分析数据')}
                    className="shrink-0 text-[11px] font-bold text-gray-600 hover:text-[var(--text-main)] px-3 py-1.5 rounded-full bg-[#F1F3F4] hover:bg-gray-200 border border-transparent transition-colors flex items-center">
                     <Search className="w-3.5 h-3.5 mr-1" /> 智能审查
                  </button>
                  <button 
                    onClick={() => sendMsg('生成品牌 LOGO 与包装提案')}
                    className="shrink-0 text-[11px] font-bold text-gray-600 hover:text-[var(--text-main)] px-3 py-1.5 rounded-full bg-[#F1F3F4] hover:bg-gray-200 border border-transparent transition-colors flex items-center">
                     <Palette className="w-3.5 h-3.5 mr-1" /> 综合设计
                  </button>
                  <button 
                    onClick={() => sendMsg('新建自动化分析流')}
                    className="shrink-0 text-[11px] font-bold text-gray-600 hover:text-[var(--text-main)] px-3 py-1.5 rounded-full bg-[#F1F3F4] hover:bg-gray-200 border border-transparent transition-colors flex items-center">
                     <Zap className="w-3.5 h-3.5 mr-1" /> 快速执行
                  </button>
               </div>
               <div className="relative">
                  <div className="absolute top-3 left-3">
                     <button className="icon-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-[var(--text-muted)] tooltip" title="附加本页截图或文档">
                        <Layers className="w-3 h-3" />
                     </button>
                  </div>
                  <textarea 
                     value={input}
                     onChange={(e) => setInput(e.target.value)}
                     onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                           e.preventDefault();
                           sendMsg();
                        }
                     }}
                     placeholder="唤醒你的专属 AI，输入指令或任务..."
                     className="w-full h-28 pl-11 pr-24 pt-3.5 pb-3 bg-[var(--bg-app)] border border-[var(--border-color)] focus:border-blue-600 focus:bg-[var(--bg-panel)] focus:ring-1 focus:ring-blue-600 rounded-[var(--radius-xl)] text-[14px] font-medium outline-none resize-none transition-all placeholder:text-gray-400 shadow-inner"
                  />
                  <div className="absolute right-3 bottom-3 flex items-center space-x-2">
                     <button 
                       onClick={() => sendMsg('Hi Copilot', true)}
                       className="icon-xl flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors tooltip" title="Voice Input"
                     >
                        <Mic className="w-4 h-4" />
                     </button>
                     <button 
                       onClick={() => sendMsg()}
                       disabled={!input.trim()}
                       className="icon-xl bg-[var(--color-primary)] hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 text-white rounded-full transition-all shadow-md flex items-center justify-center group"
                     >
                        <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                     </button>
                  </div>
               </div>
               <div className="flex items-center justify-between mt-3 px-1">
                  <div className="flex items-center">
                     <Sparkles className="w-3 h-3 text-gray-300 mr-1.5" />
                     <p className="text-[9px] text-gray-400 font-bold tracking-[0.2em]">
                        GEMINI INTELLIGENCE
                     </p>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium">使用 ⌘ + J 聚焦</p>
               </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
