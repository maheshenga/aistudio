import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useUndoRedo } from '../context/UndoRedoContext';
import { Send, Bot, Sparkles, Plus, Image as ImageIcon, FileText, Code, Settings2, MoreVertical, Search, Paperclip, MessageSquare, Briefcase, Hash, History, PenTool, Database, Megaphone, Check, Compass, Users, Video, Music, Layout, BookOpen, Star, TrendingUp, Brain, ToggleLeft, ToggleRight, Copy, ThumbsUp, ThumbsDown, RefreshCcw, Command, Square, X, Trash2 } from 'lucide-react';
import { useSaasSession } from '../saas/SaasAuthContext';
import { createGenerationJob, updateGenerationJob } from '../lib/data/generationJobRepository';
import { createWorkspaceAsset } from '../lib/data/assetRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { createPricedWorkspaceUsageEvent } from '../lib/data/usageRepository';

const AGENTS = [
  { id: 'general', name: '全能顾问', icon: Bot, color: 'text-blue-500', bg: 'bg-blue-50', desc: '通用的强大 AI 助手，解答各种问题' },
  { id: 'copywriter', name: '爆款文案专家', icon: PenTool, color: 'text-rose-500', bg: 'bg-rose-50', desc: '小红书、抖音、公众号爆款文案生成' },
  { id: 'analyst', name: '数据分析师', icon: Database, color: 'text-indigo-500', bg: 'bg-indigo-50', desc: '分析报表数据，提供商业洞察' },
  { id: 'planner', name: '品牌营销策划', icon: Megaphone, color: 'text-orange-500', bg: 'bg-orange-50', desc: '从0到1构建品牌营销全案' },
  { id: 'programmer', name: '全栈工程师', icon: Code, color: 'text-emerald-500', bg: 'bg-emerald-50', desc: '快速生成与调试多语言代码' }
];

const ALL_AGENTS = [
  {
    category: '热门推荐',
    icon: TrendingUp,
    items: [
      { id: 'general', name: '全能顾问', icon: Bot, color: 'text-blue-500', bg: 'bg-blue-50', desc: '通用的强大 AI 助手，解答各种问题，提供全方位支持。' },
      { id: 'copywriter', name: '爆款文案专家', icon: PenTool, color: 'text-rose-500', bg: 'bg-rose-50', desc: '深谙各大社交平台流量密码，专治各种文案卡壳。' },
      { id: 'video_dir', name: '短视频导演', icon: Video, color: 'text-purple-500', bg: 'bg-purple-50', desc: '分镜策划、脚本撰写、镜头语言指导一步到位。' },
    ]
  },
  {
    category: '内容创作',
    icon: PenTool,
    items: [
      { id: 'designer', name: 'UI/UX 设计师', icon: Layout, color: 'text-pink-500', bg: 'bg-pink-50', desc: '提供界面设计灵感，审查交互逻辑与视觉规范。' },
      { id: 'article', name: '深度长文主笔', icon: BookOpen, color: 'text-amber-500', bg: 'bg-amber-50', desc: '擅长撰写行业深度分析、人物专访与公关稿件。' },
      { id: 'music', name: '配乐音效指导', icon: Music, color: 'text-cyan-500', bg: 'bg-cyan-50', desc: '提供视频背景乐搭配建议与音效处理方案。' },
    ]
  },
  {
    category: '专业顾问',
    icon: Briefcase,
    items: [
      { id: 'analyst', name: '数据分析师', icon: Database, color: 'text-indigo-500', bg: 'bg-indigo-50', desc: '多维度剖析数据走向，生成可视化建议与核心结论。' },
      { id: 'planner', name: '品牌营销策划', icon: Megaphone, color: 'text-orange-500', bg: 'bg-orange-50', desc: '定位受众群体，规划营销节点与增长裂变活动。' },
      { id: 'programmer', name: '全栈工程师', icon: Code, color: 'text-emerald-500', bg: 'bg-emerald-50', desc: '精通多语言并发架构，辅助代码审查与系统搭建。' },
      { id: 'hr', name: '资深 HR', icon: Users, color: 'text-teal-500', bg: 'bg-teal-50', desc: '简历优化、面试辅导、团队绩效考核方案设计。' },
    ]
  }
];

const MOCK_HISTORY = [
  { id: 1, title: '帮我写一个短视频脚本...', time: '10分钟前' },
  { id: 2, title: '深入分析 Q3 财报数据', time: '2小时前' },
  { id: 3, title: '设计一套新的品牌视觉规范', time: '昨天' },
  { id: 4, title: 'React 性能优化最佳实践', time: '前天' },
];

export function ChatView() {
  const session = useSaasSession();
  const jobContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const { pushAction } = useUndoRedo();
  const [activeAgent, setActiveAgent] = useState(AGENTS[0]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSquare, setShowSquare] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  
  const [messages, setMessages] = useState<{id: string, role: 'user' | 'assistant', content: string}[]>([
    { id: '1', role: 'assistant', content: `你好！我是${activeAgent.name}。你可以向我输入任何诉求或上传相关文件，我将结合领域专业知识为你提供强有力的支持。` }
  ]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const activeJobRef = useRef<string | null>(null);
  const [attachments, setAttachments] = useState<{name: string, size: string}[]>([]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, isGenerating]);

  useEffect(() => {
    // Reset welcome message on agent change
    setShowSquare(false);
    setStreamingContent('');
    setIsStreaming(false);
    setAttachments([]);
    activeJobRef.current = null;
    setMessages([
      { id: Date.now().toString(), role: 'assistant', content: `你好！我是${activeAgent.name}。你可以向我输入任何诉求或上传相关文件，我将结合领域专业知识为你提供强有力的支持。` }
    ]);
  }, [activeAgent]);

  const handleStop = () => {
    if (activeJobRef.current) {
      updateGenerationJob(activeJobRef.current, { status: 'cancelled', progress: 100, error: 'Stopped by user' }, jobContext);
      logAuditEvent({
        action: 'generation_job_failed',
        moduleId: 'chat',
        targetType: 'generation_job',
        targetId: activeJobRef.current,
        metadata: {
          reason: 'user_stopped',
          agent: activeAgent.id,
        },
      }, { session });
      activeJobRef.current = null;
    }
    setStreamingContent('');
    setIsStreaming(false);
    setIsGenerating(false);
  };

  const handleClearChat = () => {
    const oldMessages = [...messages];
    pushAction('ChatView', {
      undo: () => setMessages(oldMessages),
      redo: () => {
        handleStop();
        setMessages([{ id: Date.now().toString(), role: 'assistant', content: `你好！我是${activeAgent.name}。你可以向我输入任何诉求或上传相关文件，我将结合领域专业知识为你提供强有力的支持。` }]);
      }
    });
    handleStop();
    setMessages([
      { id: Date.now().toString(), role: 'assistant', content: `你好！我是${activeAgent.name}。你可以向我输入任何诉求或上传相关文件，我将结合领域专业知识为你提供强有力的支持。` }
    ]);
  };

  const handleSend = (textOrEvent?: string | React.MouseEvent) => {
    let text = typeof textOrEvent === 'string' ? textOrEvent : prompt;
    if ((!text.trim() && attachments.length === 0) || isGenerating || isStreaming) return;
    setIsGenerating(true);
    setStreamingContent('');
    
    // Process attachments into message content
    let userMsg = text;
    if (attachments.length > 0) {
      const attachText = attachments.map(a => `[附件: ${a.name}]`).join(' ');
      userMsg = userMsg ? `${userMsg}\n\n${attachText}` : attachText;
    }
    
    
    const newMsgObj = { id: Date.now().toString(), role: 'user' as const, content: userMsg };
    setMessages(p => {
      const newMessages = [...p, newMsgObj];
      pushAction('ChatView', {
        undo: () => setMessages(p),
        redo: () => setMessages(newMessages)
      });
      return newMessages;
    });
    setPrompt('');
    setAttachments([]);

    const job = createGenerationJob({
      title: `Chat - ${activeAgent.name}`,
      prompt: userMsg,
      status: 'running',
      providerKind: 'mock',
      runtimeMode: 'web',
      moduleId: 'chat',
      progress: 0,
      metadata: {
        agent: activeAgent.id,
        agentName: activeAgent.name,
        memoryEnabled,
        attachments: attachments.map(attachment => attachment.name),
      },
    }, jobContext);
    activeJobRef.current = job.id;
    logAuditEvent({
      action: 'generation_job_start',
      moduleId: 'chat',
      targetType: 'generation_job',
      targetId: job.id,
      metadata: {
        agent: activeAgent.id,
        attachmentCount: attachments.length,
      },
    }, { session });

    const memoryText = memoryEnabled && messages.length >= 2
      ? `\n\n*(已自动关联刚才 ${messages.length} 轮历史对话的上下文记忆片段)*`
      : '';

    const fullResponse = `基于 ${activeAgent.name} 的专业知识模型，针对您的问题：“${text || '针对附件内容的分析'}”，以下是我的分析建议：\n\n1. **核心观点阐述**\n问题本质在于信息流的分发与整合，建议通过结构化数据重塑链路。\n\n2. **可执行方案拆解**\n- 第一阶段：梳理现有存量资源。\n- 第二阶段：引入自动化工作流脚本。\n- 第三阶段：持续监控与A/B测试。\n\n3. **预测与复盘指标**\n预计能降低 30% 的沟通成本，同时提高产出一致性。\n\n需要我进一步将其细化或生成可视化报告吗？${memoryText}`;

    updateGenerationJob(job.id, { status: 'succeeded', progress: 100 }, jobContext);
    const asset = createWorkspaceAsset({
      name: `chat-response-${Date.now()}.md`,
      type: 'text',
      size: `${fullResponse.length} chars`,
      source: 'generated',
      moduleId: 'chat',
      generationJobId: job.id,
      tags: [activeAgent.name, activeAgent.id],
      metadata: {
        prompt: userMsg,
        agent: activeAgent.id,
        agentName: activeAgent.name,
        memoryEnabled,
        responsePreview: fullResponse.slice(0, 160),
      },
    }, jobContext);
    createPricedWorkspaceUsageEvent({
      moduleId: 'chat',
      pricingAction: 'generation',
      kind: 'generation',
      targetType: 'generation_job',
      targetId: job.id,
      providerKind: 'mock',
      runtimeMode: 'web',
      unitCount: Math.max(1, Math.ceil((userMsg.length + fullResponse.length) / 800)),
      metadata: {
        assetId: asset.id,
        assetType: asset.type,
        agent: activeAgent.id,
        agentName: activeAgent.name,
        promptLength: userMsg.length,
        responseLength: fullResponse.length,
        attachmentCount: attachments.length,
      },
    }, jobContext);
    logAuditEvent({
      action: 'asset_create',
      moduleId: 'chat',
      targetType: 'asset',
      targetId: asset.id,
      metadata: {
        assetType: asset.type,
        generationJobId: job.id,
        agent: activeAgent.id,
      },
    }, { session });
    logAuditEvent({
      action: 'generation_job_complete',
      moduleId: 'chat',
      targetType: 'generation_job',
      targetId: job.id,
      metadata: {
        generatedAsset: true,
        assetId: asset.id,
        assetType: asset.type,
        agent: activeAgent.id,
      },
    }, { session });
    activeJobRef.current = null;
    setStreamingContent('');
    setIsStreaming(false);
    setIsGenerating(false);
    setMessages(p => [...p, { id: Date.now().toString(), role: 'assistant', content: fullResponse }]);
  };

  const handleMockUpload = () => {
    setAttachments(p => [...p, { name: `data_export_${Math.random().toString(36).substring(7)}.csv`, size: '2.4MB' }]);
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(prompt);
      const target = e.target as HTMLTextAreaElement;
      target.style.height = 'auto';
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-[var(--bg-panel)]">
      {/* Sidebar Panel for Agents & History */}
      <div className="w-[300px] border-r border-[var(--border-color)] flex flex-col bg-gray-50/50 flex-shrink-0 animate-in slide-in-from-left-4 duration-300">
        <div className="p-4 space-y-3">
          <button 
            onClick={() => {
              setActiveAgent(AGENTS[0]);
              setShowSquare(false);
            }}
            className="w-full flex items-center justify-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 text-white font-bold py-3 rounded-[var(--radius-lg)] transition-all shadow-sm"
          >
            <Plus className="icon-sm" />
            <span>新建对话</span>
          </button>
          
          <button 
            onClick={() => setShowSquare(true)}
            className={`w-full flex items-center justify-center space-x-2 font-bold py-3 rounded-[var(--radius-lg)] transition-all border ${showSquare ? 'bg-blue-50 text-[var(--color-primary)] border-blue-100 shadow-sm' : 'bg-[var(--bg-panel)] border-[var(--border-color)] text-gray-700 hover:bg-gray-50 shadow-sm'}`}
          >
            <Compass className="icon-sm" />
            <span>智能体广场</span>
          </button>
        </div>
        
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="icon-sm text-gray-400 absolute left-3 top-3" />
            <input 
              type="text" 
              placeholder="搜索所有智能体 / 历史对话" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] pl-9 pr-4 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm cursor-text"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Agent Selection Section */}
          <div className="px-4 py-3">
             <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 px-1">专业工作流智能体</h3>
             <div className="space-y-1.5">
               {AGENTS.map(agent => (
                 <button 
                   key={agent.id}
                   onClick={() => setActiveAgent(agent)}
                   className={`w-full flex items-start space-x-3 p-3 rounded-[var(--radius-lg)] transition-all border ${activeAgent.id === agent.id ? 'bg-[var(--bg-panel)] shadow-[0_4px_12px_rgba(0,0,0,0.03)] border-blue-100 ring-1 ring-blue-500/10' : 'bg-transparent border-transparent hover:bg-black/5'}`}
                 >
                   <div className={`icon-xl rounded-lg ${agent.bg} flex items-center justify-center shrink-0`}>
                     <agent.icon className={`icon-sm ${agent.color}`} />
                   </div>
                   <div className="flex-1 text-left">
                     <h4 className={`text-[13px] font-black leading-tight ${activeAgent.id === agent.id ? 'text-[var(--text-main)]' : 'text-gray-700'}`}>{agent.name}</h4>
                     <p className={`text-[11px] mt-1 line-clamp-1 ${activeAgent.id === agent.id ? 'text-[var(--text-muted)]' : 'text-gray-400'}`}>{agent.desc}</p>
                   </div>
                   {activeAgent.id === agent.id && <Check className="icon-sm text-[var(--color-primary)] shrink-0 self-center" />}
                 </button>
               ))}
             </div>
          </div>
          
          <hr className="border-[var(--border-color)]/60 mx-4" />

          {/* History Section */}
          <div className="px-4 py-4">
             <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 px-1">历史对话集</h3>
             <div className="space-y-1">
               {MOCK_HISTORY.map(item => (
                 <button key={item.id} className="w-full flex items-center space-x-3 p-2.5 rounded-lg hover:bg-black/5 transition-colors group text-left">
                   <MessageSquare className="icon-sm text-gray-400 group-hover:text-gray-600 shrink-0" />
                   <div className="flex-1 overflow-hidden">
                     <p className="text-[13px] text-gray-700 font-medium truncate">{item.title}</p>
                   </div>
                 </button>
               ))}
             </div>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col bg-[#FDFDFE] relative">
        {showSquare ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="h-48 bg-gradient-to-br from-blue-600 to-indigo-800 flex flex-col items-center justify-center text-center px-6 relative overflow-hidden shrink-0">
               <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=1600')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
               <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <h1 className="text-[var(--text-main)]xl font-black text-white flex items-center justify-center">
                    <Compass className="icon-xl mr-3 text-blue-200" />
                    AI 智能体广场
                 </h1>
                 <p className="mt-3 text-blue-100 font-medium max-w-lg mx-auto">
                   探索各类专业角色的 AI 智能体，将它们加入左侧工作台，开启专属的高效工作流。
                 </p>
               </div>
            </div>
            
            <div className="p-[var(--spacing-xl)] max-w-6xl mx-auto space-y-12">
              {ALL_AGENTS.map((category, catIdx) => (
                <div key={catIdx} className="animate-in fade-in slide-in-from-bottom-8 duration-700 mt-2">
                  <div className="flex items-center space-x-2 mb-[var(--spacing-md)]">
                    <div className="icon-xl rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center">
                       <category.icon className="icon-sm" />
                    </div>
                    <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight">{category.category}</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--spacing-md)]">
                     {category.items.map((agent) => {
                       const isAdded = AGENTS.some(a => a.id === agent.id);
                       return (
                         <div key={agent.id} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 hover:border-blue-300 hover:shadow-lg transition-all group relative overflow-hidden flex flex-col h-full cursor-pointer" onClick={() => { setActiveAgent(agent as any); setShowSquare(false); }}>
                           <div className="flex items-start justify-between mb-4">
                              <div className={`w-12 h-12 rounded-[var(--radius-lg)] ${agent.bg} flex items-center justify-center`}>
                                 <agent.icon className={`icon-lg ${agent.color}`} />
                              </div>
                              {isAdded ? (
                                <span className="bg-gray-100 text-[var(--text-muted)] text-[11px] font-bold px-2 py-1 rounded">已在工作台</span>
                              ) : (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Normally this would add to the AGENTS list, but for now we'll just activate it
                                    setActiveAgent(agent as any); 
                                    setShowSquare(false);
                                  }}
                                  className="text-[var(--color-primary)] bg-blue-50 hover:bg-[var(--color-primary)] hover:text-white px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors flex items-center space-x-1"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>添加</span>
                                </button>
                              )}
                           </div>
                           <h3 className="text-[16px] font-black text-[var(--text-main)] mb-2 group-hover:text-[var(--color-primary)] transition-colors">{agent.name}</h3>
                           <p className="text-[13px] text-[var(--text-muted)] font-medium leading-relaxed mb-4 flex-1">
                             {agent.desc}
                           </p>
                           <div className="flex items-center space-x-2 text-[11px] font-bold text-gray-400 mt-auto">
                              <span className="flex items-center"><Star className="w-3.5 h-3.5 mr-1" /> {(Math.random() * 1 + 4).toFixed(1)}</span>
                              <span>•</span>
                              <span className="flex items-center"><Users className="w-3.5 h-3.5 mr-1" /> {Math.floor(Math.random() * 90 + 10)}w+ 使用</span>
                           </div>
                         </div>
                       );
                     })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-[var(--border-color)] bg-[var(--bg-panel)] flex items-center justify-between px-6 z-10 shrink-0 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="flex items-center space-x-3">
             <div className={`w-9 h-9 rounded-[var(--radius-lg)] ${activeAgent.bg} flex items-center justify-center`}>
               <activeAgent.icon className={`icon-md ${activeAgent.color}`} />
             </div>
             <div>
               <h2 className="text-[15px] font-black text-[var(--text-main)] flex items-center space-x-2">
                 <span>{activeAgent.name}</span>
                 <span className="bg-blue-50 text-[var(--color-primary)] px-1.5 py-0.5 rounded text-[10px] uppercase font-black tracking-wider border border-blue-100">Pro</span>
               </h2>
               <p className="text-[11px] text-[var(--text-muted)] font-medium mt-0.5">{activeAgent.desc}</p>
             </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-gray-50/80 px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-sm transition-all text-gray-700">
               <Brain className={`icon-sm ${memoryEnabled ? 'text-blue-500' : 'text-gray-400'}`} />
               <span className="text-[13px] font-black tracking-wide">对话上下文记忆</span>
               <button onClick={() => setMemoryEnabled(!memoryEnabled)} className="ml-2 transition-transform hover:scale-105 active:scale-95 focus:outline-none">
                 {memoryEnabled ? <ToggleRight className="icon-lg text-blue-500" strokeWidth={1.5} /> : <ToggleLeft className="icon-lg text-gray-400" strokeWidth={1.5} />}
               </button>
            </div>
            <div className="flex items-center space-x-2 bg-gray-50/80 px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--border-color)] shadow-sm transition-all text-gray-700">
               <span className="text-[13px] font-black tracking-wide">回复语言</span>
               <select className="bg-transparent border-none text-[13px] font-medium focus:ring-0 cursor-pointer outline-none">
                 <option>自动检测</option>
                 <option>简体中文</option>
                 <option>English</option>
                 <option>日本語</option>
                 <option>Français</option>
                 <option>Español</option>
               </select>
            </div>
            <div className="flex items-center space-x-1 border-l border-[var(--border-color)] pl-4">
              <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-2 rounded-lg hover:bg-gray-100 transition-colors">
                 <Settings2 className="icon-md" />
              </button>
              <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-2 rounded-lg hover:bg-gray-100 transition-colors">
                 <MoreVertical className="icon-md" />
              </button>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-[var(--spacing-lg)] md:p-10 space-y-8 custom-scrollbar bg-[#FDFDFE]">
          <div className="max-w-4xl mx-auto space-y-8 pb-10">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 group`}>
                {msg.role === 'assistant' && (
                   <div className={`icon-xl rounded-full ${activeAgent.bg} flex items-center justify-center mr-4 shrink-0 border border-black/5 mt-1`}>
                     <activeAgent.icon className={`icon-sm ${activeAgent.color}`} />
                   </div>
                )}
                
                <div className={`max-w-[80%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-[var(--radius-xl)] p-5 ${
                    msg.role === 'user' 
                    ? 'bg-[var(--color-primary)] text-white shadow-md rounded-tr-sm' 
                    : 'bg-[var(--bg-panel)] border border-[var(--border-color)] text-[var(--text-main)] shadow-sm rounded-tl-sm'
                  }`}>
                    <div 
                      className="text-[14px] leading-relaxed whitespace-pre-wrap font-medium markdown-body"
                      dangerouslySetInnerHTML={{ 
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-[var(--text-main)]">$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em class="text-[var(--text-muted)]">$1</em>')
                      }}
                    />
                  </div>
                  
                  {/* Action Bar for Assistant Messages */}
                  {msg.role === 'assistant' && (
                    <div className="flex items-center space-x-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors tooltip tooltip-top" title="复制文本">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-[var(--color-primary)] hover:bg-blue-50 rounded-md transition-colors tooltip tooltip-top" title="点赞">
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors tooltip tooltip-top" title="踩">
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors tooltip tooltip-top" title="重新生成">
                        <RefreshCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="icon-xl rounded-full bg-gray-900 flex items-center justify-center ml-4 shrink-0 text-white text-xs font-bold border border-black/10 mt-1">
                    Me
                  </div>
                )}
              </div>
            ))}
            
            {isGenerating && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className={`icon-xl rounded-full ${activeAgent.bg} flex items-center justify-center mr-4 shrink-0 border border-black/5`}>
                  <activeAgent.icon className={`icon-sm ${activeAgent.color}`} />
                </div>
                <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 flex space-x-2 items-center shadow-sm">
                  <div className="flex space-x-1.5 items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" ></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" ></div>
                  </div>
                  <span className="text-[13px] font-bold text-[var(--text-muted)] ml-2">深度思考中...</span>
                </div>
              </div>
            )}

            {isStreaming && streamingContent && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className={`icon-xl rounded-full ${activeAgent.bg} flex items-center justify-center mr-4 shrink-0 border border-black/5 mt-1`}>
                  <activeAgent.icon className={`icon-sm ${activeAgent.color}`} />
                </div>
                
                <div className="max-w-[80%] flex flex-col items-start shadow-xl shadow-blue-900/5 rounded-[var(--radius-xl)] rounded-tl-sm border border-blue-100/50">
                  <div className="bg-gradient-to-b from-white to-gray-50/50 p-5 rounded-[var(--radius-xl)] rounded-tl-sm w-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 animate-pulse"></div>
                    <div 
                      className="text-[14px] leading-relaxed whitespace-pre-wrap font-medium text-[var(--text-main)]"
                      dangerouslySetInnerHTML={{ 
                        __html: streamingContent
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-[var(--text-main)]">$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em class="text-[var(--text-muted)]">$1</em>') 
                        + '<span class="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse align-middle"></span>'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Chat Input Area */}
        <div className="p-[var(--spacing-lg)] bg-[var(--bg-panel)] border-t border-[var(--border-color)] z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
          <div className="max-w-4xl mx-auto relative">
            {/* Context Notice */}
            {memoryEnabled && messages.length > 2 && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full shadow-sm flex items-center space-x-2 text-[11px] font-bold text-[var(--color-primary)] animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <Brain className="w-3.5 h-3.5" />
                 <span>系统已自动跨越 {messages.length} 轮历史对话捕获上下文</span>
              </div>
            )}
            
            {/* Quick Suggestions */}
            {messages.length <= 1 && !isGenerating && !isStreaming && (
              <div className="flex flex-wrap justify-center gap-2 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {['帮我写一份年度总结', '如何优化产品转化率？', '为我设计一个简易的落地页', '用通俗的语言解释大语言模型'].map((sug, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleSend(sug)}
                    className="flex items-center space-x-2 px-4 py-2 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-700 rounded-[var(--radius-lg)] text-[12px] font-bold transition-all shadow-sm transform hover:-translate-y-0.5"
                  >
                    <Command className="w-3.5 h-3.5 opacity-50" />
                    <span>{sug}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="relative border-[1.5px] border-[var(--border-color)] rounded-[var(--radius-xl)] bg-[var(--bg-panel)] transition-all focus-within:border-blue-500 focus-within:ring-[4px] focus-within:ring-blue-500/10 shadow-sm overflow-hidden flex flex-col">
              {attachments.length > 0 && (
                <div className="px-5 pt-4 pb-2 flex flex-wrap gap-2">
                  {attachments.map((file, i) => (
                    <div key={i} className="flex items-center space-x-2 bg-blue-50 border border-blue-100 rounded-lg p-2 pr-3 shrink-0 mb-1 max-w-full">
                       <div className="icon-xl rounded shrink-0 bg-blue-100 text-[var(--color-primary)] flex items-center justify-center">
                         <FileText className="icon-sm" />
                       </div>
                       <div className="flex-1 overflow-hidden">
                         <p className="text-[12px] font-bold text-[var(--text-main)] truncate">{file.name}</p>
                         <p className="text-[10px] text-[var(--text-muted)]">{file.size}</p>
                       </div>
                       <button onClick={() => setAttachments(p => p.filter((_, idx) => idx !== i))} className="p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-[var(--bg-panel)] transition-colors shrink-0">
                         <X className="w-3.5 h-3.5" />
                       </button>
                    </div>
                  ))}
                </div>
              )}
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`给${activeAgent.name}发送消息，按 Shift + Enter 换行...`}
                className={`w-full ${attachments.length > 0 ? 'pt-2' : 'pt-5'} px-5 pb-5 text-[14px] bg-transparent outline-none resize-none font-medium text-[var(--text-main)] placeholder-gray-400 custom-scrollbar max-h-[200px] min-h-[56px] leading-relaxed`}
                rows={1}
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              <div className="flex items-center justify-between px-4 pb-4 pt-1 border-t border-transparent">
                <div className="flex items-center space-x-1.5">
                  <button onClick={handleMockUpload} disabled={isGenerating || isStreaming} className="p-2.5 text-gray-400 hover:text-[var(--color-primary)] hover:bg-blue-50 rounded-[var(--radius-lg)] transition-colors tooltip tooltip-top disabled:opacity-50" title="上传附件">
                     <Paperclip className="icon-sm" />
                  </button>
                  <button className="p-2.5 text-gray-400 hover:text-[var(--color-primary)] hover:bg-blue-50 rounded-[var(--radius-lg)] transition-colors tooltip tooltip-top" title="网络搜索分析">
                     <Search className="icon-sm" />
                  </button>
                  <button className="p-2.5 text-gray-400 hover:text-[var(--color-primary)] hover:bg-blue-50 rounded-[var(--radius-lg)] transition-colors tooltip tooltip-top" title="深度思考模式">
                     <Sparkles className="icon-sm" />
                  </button>
                  {messages.length > 1 && (
                     <button onClick={handleClearChat} className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-[var(--radius-lg)] transition-colors tooltip tooltip-top ml-2" title="清空对话">
                        <Trash2 className="icon-sm" />
                     </button>
                  )}
                  <div className="w-px h-5 bg-gray-200 mx-3"></div>
                  <span className="text-[11px] font-bold text-gray-400 tracking-wide hidden sm:inline-block">Gemini Pro 1.5</span>
                </div>
                {isGenerating || isStreaming ? (
                  <button
                    onClick={handleStop}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-3 rounded-[var(--radius-lg)] transition-all shadow-sm transform hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 border border-[var(--border-color)]"
                  >
                    <Square className="icon-sm fill-current mt-[1px]" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSend(prompt)}
                    disabled={(!prompt.trim() && attachments.length === 0)}
                    className="bg-[var(--color-primary)] hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-[var(--color-primary)] text-white p-3 rounded-[var(--radius-lg)] transition-all shadow-md transform hover:scale-105 active:scale-95 disabled:scale-100 flex items-center justify-center shrink-0 group"
                  >
                    <Send className="icon-sm  mt-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>
            <div className="text-center mt-4">
              <span className="text-[11px] text-gray-400 font-medium">内容由 AI 自动生成，请注意甄别并独立验证重要数据。</span>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
