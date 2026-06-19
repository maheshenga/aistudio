import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSaasSession } from '../saas/SaasAuthContext';
import { loadWorkspaceCustomerServiceResponses, createWorkspaceCustomerServiceResponse, updateCustomerServiceResponseStatus, type CustomerServiceRepositoryContext, type WorkspaceCustomerServiceResponse } from '../lib/data/customerServiceRepository';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { createWorkspaceTask } from '../lib/data/taskRepository';
import { 
  Headphones, 
  MessageSquare, 
  Settings2, 
  Bot, 
  Zap, 
  Clock, 
  Activity, 
  CheckCircle2,
  AlertCircle,
  Database,
  BarChart3,
  X,
  Send,
  Plus,
  Trash2,
  Search,
  BookOpen,
  Users,
  Timer,
  Smile,
  Meh,
  Frown,
  Forward,
  Hash,
  Download,
  Lightbulb,
  FileText,
  UserCheck,
  Star,
  Globe,
  Clock3,
  AlertTriangle,
  Languages,
  Check,
  Link,
  Mic,
  MicOff,
  Calendar,
  Wand2,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from './Toast';

type CSTab = 'monitor' | 'knowledge' | 'analytics' | 'templates';
type AppLang = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko';

const LANG_CONFIG = [
  { code: 'zh-CN', name: '简体中文', icon: '🇨🇳' },
  { code: 'zh-TW', name: '繁體中文', icon: '🇹🇼' },
  { code: 'en', name: 'English', icon: '🇺🇸' },
  { code: 'ja', name: '日本語', icon: '🇯🇵' },
  { code: 'ko', name: '한국어', icon: '🇰🇷' },
];

const T = {
  'zh-CN': { title: '全天候 AI 客服中心', autoReply: '基于知识库与剧本的自动化接待引擎', monitor: '会话监控', kb: '知识库', templates: '话术模板', staff: '排班与合规', analytics: '数据大屏' },
  'zh-TW': { title: '全天候 AI 客服中心', autoReply: '基於知識庫與劇本的自動化接待引擎', monitor: '會話監控', kb: '知識庫', templates: '話術模板', staff: '排班與合規', analytics: '數據大屏' },
  'en': { title: '24/7 AI Service Center', autoReply: 'Auto-reception engine based on knowledge base', monitor: 'Monitor', kb: 'Knowledge Base', templates: 'Templates', staff: 'Staff & Compliance', analytics: 'Analytics' },
  'ja': { title: '24/7 AI カスタマーセンター', autoReply: 'ナレッジベースとスクリプトによる自動応対エンジン', monitor: '監視', kb: '知識ベース', templates: 'テンプレート', staff: 'シフトとコンプライアンス', analytics: '分析ダッシュボード' },
  'ko': { title: '24/7 AI 고객 센터', autoReply: '지식 기반 및 스크립트 기반 자동 접수 엔진', monitor: '모니터링', kb: '지식 베이스', templates: '템플릿', staff: '일정 및 준수', analytics: '분석 대시보드' },
};

interface ChatMessage {
  role: 'user' | 'agent' | 'bot' | 'system';
  content: string;
  time: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  complianceAlert?: string;
  translatedContent?: string;
  originalLang?: string;
}

interface ChatSession {
  id: string;
  user: string;
  intent: string;
  status: string;
  aiAction: string;
  time: string;
  alert: boolean;
  messages: ChatMessage[];
  aiSummary?: string;
}

export function CustomerServiceView() {
  const session = useSaasSession();
  const repoContext = useMemo<CustomerServiceRepositoryContext>(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.workspace.id, session.user.id],
  );
  const [csResponses, setCsResponses] = useState<WorkspaceCustomerServiceResponse[]>([]);

  useEffect(() => {
    setCsResponses(loadWorkspaceCustomerServiceResponses(repoContext));
  }, [repoContext]);

  useEffect(() => {
    const handler = () => setCsResponses(loadWorkspaceCustomerServiceResponses(repoContext));
    if (typeof window !== 'undefined') window.addEventListener('workspace_cs_responses_updated', handler);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('workspace_cs_responses_updated', handler); };
  }, [repoContext]);

  const [uiLang, setUiLang] = useState<AppLang>('zh-CN');
  const [isBotEnabled, setIsBotEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<CSTab>('monitor');
  const [takeoverSessionId, setTakeoverSessionId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showKbHelper, setShowKbHelper] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingLang, setRecordingLang] = useState<AppLang>('zh-CN');
  
  const [quickReplies, setQuickReplies] = useState([
    { id: 'qr1', shortcut: '/hello', content: '您好，这里是人工客服，很高兴为您服务！**请问有什么可以帮您？**' },
    { id: 'qr2', shortcut: '/wait', content: '好的，我已经记录您的问题，正在为您**紧急核实相关信息**，请稍候片刻。' },
    { id: 'qr3', shortcut: '/bye', content: '感谢您的咨询，如果有其他问题欢迎随时联系我们。祝您生活愉快！' },
  ]);
  const [newShortcut, setNewShortcut] = useState('');
  const [newTemplate, setNewTemplate] = useState('');

  const [queueStats] = useState({ pending: 15, avgWaitTime: 3.2 });
  
  const [kbEntries, setKbEntries] = useState([
    { id: '1', question: '退换货政策是什么？', answer: '支持7天无理由退换，非人为损坏运费由我方承担。', active: true, lang: 'zh-CN', linkedIds: ['1-en', '1-ja'] },
    { id: '1-en', question: 'Return policy?', answer: '7-days return with no questions asked.', active: true, lang: 'en', linkedIds: ['1'] },
    { id: '1-ja', question: '返品ポリシーは？', answer: '7日間の返品をサポートします。', active: true, lang: 'ja', linkedIds: ['1'] },
    { id: '2', question: '发什么快递？', answer: '默认顺丰速运，偏远地区发邮政EMS。', active: true, lang: 'zh-CN', linkedIds: [] },
  ]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  
  const [sessions, setSessions] = useState<ChatSession[]>([
    { 
      id: 's1', user: '游客 8492 (来自官网)', intent: '询问旗舰版价格', status: 'AI 引导中', aiAction: '已推送对比报价单', time: '刚刚', alert: false,
      aiSummary: '用户正在了解旗舰版与专业版的功能区别，AI 已推送报价单，用户情绪平稳，暂未回复。',
      messages: [
        { role: 'user', content: 'What is the difference between Flagship and Pro?', time: '09:41', sentiment: 'neutral', translatedContent: '旗舰版和专业版有什么区别？', originalLang: 'en' },
        { role: 'bot', content: '您好！旗舰版支持更高级的API调用和多子账号管理。这是详细的对比报价单：[链接]', time: '09:41' },
      ]
    },
    { 
      id: 's2', user: 'Jane Doe (微信渠道)', intent: '催发配货单', status: 'AI 拦截安抚', aiAction: '已查询物流单号并回复', time: '2 分钟前', alert: false,
      aiSummary: '用户催促发货，带有轻微负面情绪。系统已自动查询物流状态并安抚用户，目前包裹已在打包阶段。',
      messages: [
        { role: 'user', content: '昨日注文したのに、まだ発送されませんか？', time: '09:38', sentiment: 'negative', translatedContent: '我昨天下的单，怎么还没发货？', originalLang: 'ja' },
        { role: 'bot', content: '抱歉让您久等了，Jane。系统显示您的订单(WX88932)正在仓库打包中，预计今天下午发出，顺丰单号生成后会马上发给您。', time: '09:39' },
      ]
    },
    { 
      id: 's3', user: '大客户-李总', intent: '定制化需求沟通', status: '转交人工', aiAction: '无法满足，已申请主理人介入', time: '15 分钟前', alert: true,
      aiSummary: '大客户提出ERP私有化部署对接的高级定制需求，已超出AI处理范围，请求人工顾问介入跟进，意向明确。',
      messages: [
        { role: 'user', content: '我们需要私有化部署，并且要跟我们的内部ERP打通。', time: '09:20', sentiment: 'positive' },
        { role: 'bot', content: '李总您好，私有化部署和ERP对接属于高级定制服务。为了给您提供更专业的解答，我已经为您呼叫专属客服顾问。', time: '09:20' },
        { role: 'user', content: '好的，尽快反馈。', time: '09:25' }
      ]
    },
  ]);

  const activeSession = sessions.find(s => s.id === takeoverSessionId);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSession?.messages]);

  const handleTakeover = (id: string) => {
    setTakeoverSessionId(id);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, alert: false, status: '人工接管中', aiAction: 'AI已静音' } : s));
    toast('已接管该会话，AI自动回复已暂停', 'info', true);
  };

  const handleTransfer = () => {
    if (!takeoverSessionId) return;
    const current = sessions.find(s => s.id === takeoverSessionId);
    const lastUserMsg = current?.messages.filter(m => m.role === 'user').slice(-1)[0]?.content ?? '';
    const escalationTask = createWorkspaceTask({
      title: `客服升级: ${current?.intent ?? '会话转接'}`,
      column: 'todo',
      priority: 'High',
      type: 'cs_escalation',
      date: new Date().toISOString().slice(0, 10),
      isAuto: false,
      metadata: {
        sessionId: takeoverSessionId,
        customer: current?.user,
        intent: current?.intent,
        lastUserMessage: lastUserMsg,
      },
    }, repoContext);
    const record = createWorkspaceCustomerServiceResponse({
      customerId: takeoverSessionId,
      channel: current?.user.includes('微信') ? 'wechat' : 'web',
      draft: lastUserMsg,
      status: 'escalated',
      editorId: session.user.id,
      escalationTaskId: escalationTask.id,
      metadata: { intent: current?.intent },
    }, repoContext);
    logAuditEvent({
      action: 'crm_followup_task_sync',
      moduleId: 'customer_service',
      targetType: 'task',
      targetId: escalationTask.id,
      metadata: { responseId: record.id, sessionId: takeoverSessionId },
    }, { session });
    setCsResponses(loadWorkspaceCustomerServiceResponses(repoContext));
    setSessions(prev => prev.map(s => {
      if (s.id === takeoverSessionId) {
        return {
          ...s,
          status: '已移交二线客服',
          messages: [
            ...s.messages,
            { 
              role: 'system', 
              content: `【内部转接日志】当前客服已将此会话转接给技术支持节点。原用户意图 [${s.intent}] 的对话快照已生成，升级工单已创建。`, 
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            }
          ]
        };
      }
      return s;
    }));
    toast('会话已转接，升级工单已同步至任务中心', 'success');
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !takeoverSessionId) return;
    const current = sessions.find(s => s.id === takeoverSessionId);
    
    let complianceWarning: string | undefined;
    if (replyText.includes('绝对') || replyText.includes('保证') || replyText.includes('第一')) {
      complianceWarning = '违规词汇警告：检测到绝对化用语或过度承诺，已触发内部审查记录。';
      toast('触发合规告警：内容包含敏感词汇', 'error');
    }

    const record = createWorkspaceCustomerServiceResponse({
      customerId: takeoverSessionId,
      channel: current?.user.includes('微信') ? 'wechat' : 'web',
      draft: replyText,
      status: 'sent',
      editorId: session.user.id,
      editedAt: Date.now(),
      metadata: { compliance: complianceWarning ?? 'ok' },
    }, repoContext);
    logAuditEvent({
      action: 'crm_email_draft_generate',
      moduleId: 'customer_service',
      targetType: 'workspace',
      targetId: record.id,
      metadata: { sessionId: takeoverSessionId, compliance: complianceWarning ? 'flagged' : 'ok' },
    }, { session });
    setCsResponses(loadWorkspaceCustomerServiceResponses(repoContext));

    setSessions(prev => prev.map(s => {
      if (s.id === takeoverSessionId) {
        return {
          ...s,
          messages: [...s.messages, { 
             role: 'agent', 
             content: replyText, 
             time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
             complianceAlert: complianceWarning
          }]
        };
      }
      return s;
    }));
    setReplyText('');
  };

  const handleAddKb = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    setKbEntries([{ id: Date.now().toString(), question: newQuestion, answer: newAnswer, active: true, lang: uiLang, linkedIds: [] }, ...kbEntries]);
    setNewQuestion('');
    setNewAnswer('');
    toast('知识库条目已添加', 'success');
  };

  const handleAddQuickReply = () => {
    if (!newShortcut.trim() || !newTemplate.trim()) return;
    setQuickReplies([{ id: Date.now().toString(), shortcut: newShortcut.startsWith('/') ? newShortcut : `/${newShortcut}`, content: newTemplate }, ...quickReplies]);
    setNewShortcut('');
    setNewTemplate('');
    toast('自定义快捷回复已添加', 'success');
  };

  const handleDeleteQuickReply = (id: string) => {
    setQuickReplies(quickReplies.filter(q => q.id !== id));
    toast('快捷回复已删除', 'success');
  };

  const handleDeleteKb = (id: string) => {
    setKbEntries(kbEntries.filter(k => k.id !== id));
    toast('知识库条目已删除', 'success');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#F0F2F5] overflow-hidden animate-in fade-in duration-300 relative">
      
      {/* Header */}
      <div className="bg-[var(--bg-panel)] border-b border-[var(--border-color)] shrink-0 z-10 shadow-sm relative">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-[var(--spacing-md)]">
            <div className="flex items-center space-x-6">
               <div className="flex items-center space-x-3">
                 <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Headphones className="icon-md" />
                 </div>
                 <div>
                   <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight leading-none mb-1">{T[uiLang].title}</h2>
                   <p className="text-[var(--text-muted)] text-[12px] font-medium leading-none">
                      {T[uiLang].autoReply}
                   </p>
                 </div>
               </div>
               
               <div className="flex items-center bg-gray-50 p-1.5 rounded-lg border border-[var(--border-color)] ml-4">
                 <button onClick={() => setActiveTab('monitor')} className={`px-4 py-1.5 rounded-md text-[13px] font-bold transition-colors ${activeTab === 'monitor' ? 'bg-[var(--bg-panel)] text-indigo-700 shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-gray-700'}`}>{T[uiLang].monitor}</button>
                 <button onClick={() => setActiveTab('knowledge')} className={`px-4 py-1.5 rounded-md text-[13px] font-bold transition-colors ${activeTab === 'knowledge' ? 'bg-[var(--bg-panel)] text-indigo-700 shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-gray-700'}`}>{T[uiLang].kb}</button>
                 <button onClick={() => setActiveTab('templates')} className={`px-4 py-1.5 rounded-md text-[13px] font-bold transition-colors ${activeTab === 'templates' ? 'bg-[var(--bg-panel)] text-indigo-700 shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-gray-700'}`}>{T[uiLang].templates}</button>
                 <button onClick={() => setActiveTab('staff')} className={`px-4 py-1.5 rounded-md text-[13px] font-bold transition-colors ${activeTab === 'staff' ? 'bg-[var(--bg-panel)] text-indigo-700 shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-gray-700'}`}>{T[uiLang].staff}</button>
                 <button onClick={() => setActiveTab('analytics')} className={`px-4 py-1.5 rounded-md text-[13px] font-bold transition-colors ${activeTab === 'analytics' ? 'bg-[var(--bg-panel)] text-indigo-700 shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-gray-700'}`}>{T[uiLang].analytics}</button>
               </div>
            </div>
            
            <div className="flex items-center space-x-4">
               {/* Language Switcher */}
               <div className="relative group flex items-center bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] px-3 py-1.5 shadow-sm hover:border-gray-300 transition-colors cursor-pointer">
                  <Languages className="icon-sm text-[var(--text-muted)] mr-2" />
                  <span className="text-[13px] font-bold text-gray-700">{LANG_CONFIG.find(l => l.code === uiLang)?.name}</span>
                  <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30">
                     <div className="w-40 bg-[var(--bg-panel)] rounded-[var(--radius-lg)] shadow-xl border border-[var(--border-color)] py-2">
                        {LANG_CONFIG.map(lang => (
                           <div 
                             key={lang.code}
                             onClick={() => setUiLang(lang.code as AppLang)}
                             className={`px-4 py-2 text-[13px] font-medium hover:bg-gray-50 cursor-pointer flex items-center justify-between ${uiLang === lang.code ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-gray-700'}`}
                           >
                             <span>{lang.icon} {lang.name}</span>
                             {uiLang === lang.code && <Check className="w-3.5 h-3.5" />}
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="flex items-center space-x-4 bg-gray-50 p-1.5 rounded-[var(--radius-lg)] border border-[var(--border-color)] shrink-0 shadow-inner">
               <div className="flex flex-col px-3 border-r border-[var(--border-color)]">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">AI Host Agent</span>
                  <span className={`text-[12px] font-bold mt-0.5 flex items-center ${isBotEnabled ? 'text-green-600' : 'text-[var(--text-muted)]'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isBotEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                    {isBotEnabled ? '引擎运行中' : '引擎已暂停'}
                  </span>
               </div>
               <div className="flex flex-col px-2 pr-4 relative group">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">多语种接待</span>
                  <button className="flex items-center text-[12px] font-bold text-gray-700 hover:text-indigo-600 transition-colors">
                    <Globe className="w-3.5 h-3.5 mr-1 text-gray-400" />
                    <span>自动识别 (包含中/英/日)</span>
                  </button>
                  <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                    <div className="w-48 bg-[var(--bg-panel)] rounded-[var(--radius-lg)] shadow-lg border border-[var(--border-color)] p-2 text-left">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">主接待语种设置</p>
                       <button className="w-full text-left px-3 py-1.5 text-[12px] font-bold text-indigo-600 bg-indigo-50 rounded-lg flex items-center justify-between">自动识别回复 <CheckCircle2 className="w-3 h-3" /></button>
                       <button className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-gray-700 hover:bg-gray-50 rounded-lg">强制英文 (Global)</button>
                       <button className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-gray-700 hover:bg-gray-50 rounded-lg">强制日语 (Japan)</button>
                    </div>
                  </div>
               </div>
               <button 
                  onClick={() => setIsBotEnabled(!isBotEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors mr-1 ${isBotEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
               >
                  <span className={`inline-block icon-sm transform rounded-full bg-[var(--bg-panel)] transition-transform shadow-sm ${isBotEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
               </button>
            </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto px-6 py-6 w-full">
          
          {activeTab === 'monitor' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-md)] h-full">
              {/* Live Conversations List */}
              <div className="lg:col-span-1 flex flex-col gap-[var(--spacing-md)]">
                {/* Queue Status Monitor */}
                <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] p-4 shadow-sm flex items-center justify-between shrink-0">
                  <div className="flex items-center">
                     <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mr-3">
                        <Users className="icon-md" />
                     </div>
                     <div>
                        <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider">排队等待人数</p>
                        <p className="text-xl font-black text-[var(--text-main)]">{queueStats.pending} <span className="text-[13px] font-medium text-[var(--text-muted)] font-normal">人</span></p>
                     </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider flex items-center justify-end"><Clock3 className="w-3 h-3 mr-1" />预估等待时长</p>
                    <p className="text-lg font-black text-indigo-600">{queueStats.avgWaitTime} <span className="text-[12px] font-medium text-indigo-400 font-normal">分钟</span></p>
                  </div>
                </div>

                <div className="border border-[var(--border-color)] bg-[var(--bg-panel)] rounded-[20px] overflow-hidden flex flex-col shadow-sm h-full">
                 <div className="p-4 border-b border-[var(--border-color)] bg-gray-50 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-[var(--text-main)] text-[14px] flex items-center">
                       <MessageSquare className="icon-sm mr-2 text-indigo-500" />
                       实况会话
                    </h3>
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold rounded">
                       {sessions.length} 个进行中
                    </span>
                    {csResponses.filter(r => r.status === 'escalated').length > 0 && (
                      <span className="px-2 py-0.5 bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold rounded ml-1">
                         {csResponses.filter(r => r.status === 'escalated').length} 已升级
                      </span>
                    )}
                 </div>
                 
                 <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                    {sessions.map(chat => (
                       <div 
                         key={chat.id} 
                         onClick={() => setTakeoverSessionId(chat.id)}
                         className={`p-3 rounded-[var(--radius-lg)] border cursor-pointer transition-all ${takeoverSessionId === chat.id ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200' : chat.alert ? 'border-red-200 bg-red-50/50 hover:bg-red-50' : 'border-[var(--border-color)] bg-[var(--bg-panel)] hover:border-indigo-300 hover:shadow-sm'} relative`}
                       >
                          {chat.alert && <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500   animate-ping"></div>}
                          <div className="flex justify-between items-start mb-2">
                             <div>
                                <h4 className="font-bold text-[var(--text-main)] text-[13px] flex items-center">
                                   {chat.user}
                                   {chat.alert && <AlertCircle className="w-3.5 h-3.5 ml-1.5 text-red-500" />}
                                </h4>
                                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 max-w-[160px] truncate">意图: <span className="font-bold text-gray-700">{chat.intent}</span></p>
                             </div>
                             <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{chat.time}</span>
                          </div>
                          
                          <div className={`mt-2 p-2 rounded-lg text-[11px] font-bold border flex items-center ${chat.alert ? 'bg-red-100/50 text-red-700 border-red-100' : takeoverSessionId === chat.id ? 'bg-[var(--bg-panel)] border-indigo-200 text-indigo-700' : 'bg-gray-50 text-gray-600 border-[var(--border-color)]'}`}>
                             <Bot className={`w-3.5 h-3.5 mr-2 shrink-0 ${chat.alert ? 'text-red-500' : takeoverSessionId === chat.id ? 'text-indigo-500' : 'text-gray-400'}`} />
                             <span className="truncate">{chat.status}: {chat.aiAction}</span>
                          </div>
                       </div>
                    ))}
                 </div>
                </div>
              </div>

               {/* Chat Takeover Interface */}
               <div className="lg:col-span-2 bg-[var(--bg-panel)] rounded-[20px] shadow-sm border border-[var(--border-color)] overflow-hidden flex flex-col relative h-[600px]">
                 {activeSession ? (
                   <>
                     <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-panel)] flex justify-between items-center z-10 shrink-0">
                       <div>
                         <h3 className="font-bold text-[var(--text-main)] text-[15px]">{activeSession.user}</h3>
                         <p className="text-[12px] text-[var(--text-muted)] flex items-center mt-1">
                           <span className={`w-2 h-2 rounded-full mr-1.5 ${activeSession.status.includes('人工') ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                           {activeSession.status}
                         </p>
                       </div>
                       <div className="flex items-center space-x-2">
                         <button 
                           onClick={() => toast('会话记录及分析报告已导出并同步至全局任务中心', 'success', true)}
                           className="bg-[var(--bg-panel)] hover:bg-gray-50 text-gray-700 border border-[var(--border-color)] px-3 py-1.5 rounded-lg text-[12px] font-bold shadow-sm flex items-center transition-colors"
                           title="转录并导出至任务中心"
                         >
                           <Download className="w-3.5 h-3.5 mr-1" />
                           导出
                         </button>
                         {!activeSession.status.includes('人工') && (
                           <button 
                             onClick={() => handleTakeover(activeSession.id)}
                             className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-[12px] font-bold shadow-sm flex items-center transition-colors"
                           >
                             <Headphones className="w-3.5 h-3.5 mr-1.5" />
                             接管会话
                           </button>
                         )}
                         {activeSession.status.includes('人工') && (
                           <button 
                             onClick={handleTransfer}
                             className="bg-[var(--bg-panel)] hover:bg-gray-50 text-gray-700 border border-[var(--border-color)] px-4 py-1.5 rounded-lg text-[12px] font-bold shadow-sm flex items-center transition-colors"
                           >
                             <Forward className="w-3.5 h-3.5 mr-1.5" />
                             转接会话
                           </button>
                         )}
                       </div>
                     </div>

                     {activeSession.aiSummary && (
                       <div className="bg-indigo-50/80 border-b border-indigo-100 px-4 py-2.5 flex items-start z-10 shrink-0">
                         <Bot className="icon-sm text-indigo-500 mr-2 mt-0.5 shrink-0" />
                         <div>
                           <p className="text-[11px] font-bold text-indigo-800 tracking-wider mb-0.5">AI 对话总结</p>
                           <p className="text-[12px] text-indigo-700/80 leading-relaxed">{activeSession.aiSummary}</p>
                         </div>
                       </div>
                     )}

                     <div className="flex-1 overflow-y-auto p-[var(--spacing-lg)] space-y-[var(--spacing-lg)] bg-slate-50 relative flex">
                       <div className="flex-1 space-y-[var(--spacing-lg)] max-w-full">
                         {activeSession.messages.map((msg, i) => (
                           <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
                             <div className="flex items-center space-x-2 text-[11px] text-gray-400 mb-1 font-medium">
                               {msg.role === 'user' ? (
                               <span>客户 • {msg.time}</span>
                             ) : msg.role === 'bot' ? (
                               <span className="flex items-center text-indigo-400"><Bot className="w-3 h-3 mr-1" /> AI 助理 • {msg.time}</span>
                             ) : msg.role === 'system' ? (
                               <span className="flex items-center text-[var(--text-muted)]"><Activity className="w-3 h-3 mr-1" /> 系统日志 • {msg.time}</span>
                             ) : (
                               <span className="flex items-center text-blue-500"><Headphones className="w-3 h-3 mr-1" /> 您 (人工) • {msg.time}</span>
                             )}
                           </div>
                           <div className={`max-w-[85%] p-3 text-[14px] leading-relaxed relative ${
                             msg.role === 'user' 
                               ? 'bg-[var(--bg-panel)] border border-[var(--border-color)] text-[var(--text-main)] rounded-[var(--radius-xl)] rounded-tl-sm shadow-sm' 
                               : msg.role === 'bot'
                                 ? 'bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-[var(--radius-xl)] rounded-tr-sm'
                                 : msg.role === 'system'
                                   ? 'bg-gray-100 border border-dashed border-gray-300 text-gray-600 rounded-lg text-[12px] mx-auto w-full text-center'
                                   : 'bg-[var(--color-primary)] text-white shadow-md rounded-[var(--radius-xl)] rounded-tr-sm'
                           }`}>
                             <div>{msg.content}</div>
                             
                             {msg.translatedContent && (
                                <div className="mt-2 pt-2 border-t border-[var(--border-color)] flex flex-col gap-1">
                                   <div className="flex items-center text-[10px] text-indigo-500 font-bold uppercase tracking-wider">
                                     <Languages className="w-3 h-3 mr-1" />
                                     Auto-translated from {msg.originalLang}
                                   </div>
                                   <div className="text-[13px] text-gray-600">{msg.translatedContent}</div>
                                </div>
                             )}

                             {msg.sentiment && (
                                <span className={`absolute -bottom-2 -right-2 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold shadow-sm border flex items-center ${
                                  msg.sentiment === 'positive' ? 'bg-green-100 text-green-700 border-green-200' :
                                  msg.sentiment === 'negative' ? 'bg-red-100 text-red-700 border-red-200' :
                                  'bg-gray-100 text-gray-600 border-[var(--border-color)]'
                                }`}>
                                  {msg.sentiment === 'positive' && <Smile className="w-2.5 h-2.5 mr-0.5" />}
                                  {msg.sentiment === 'negative' && <Frown className="w-2.5 h-2.5 mr-0.5" />}
                                  {msg.sentiment === 'neutral' && <Meh className="w-2.5 h-2.5 mr-0.5" />}
                                  {msg.sentiment === 'positive' ? '正面情绪' : msg.sentiment === 'negative' ? '负面情绪' : '情绪平稳'}
                                </span>
                             )}
                             {msg.complianceAlert && (
                               <div className="mt-2 text-[11px] text-red-600 bg-red-50/80 border border-red-200 p-2 rounded-lg flex items-start w-full">
                                 <AlertTriangle className="w-3 h-3 mr-1 shrink-0 mt-0.5" />
                                 <span>{msg.complianceAlert}</span>
                               </div>
                             )}
                           </div>
                         </div>
                       ))}
                       <div ref={chatEndRef} />
                     </div>
                     
                     {/* Knowledge Base Helper Panel */}
                     <AnimatePresence>
                       {showKbHelper && activeSession.status.includes('人工') && (
                         <motion.div 
                           initial={{ opacity: 0, width: 0, x: 20 }}
                           animate={{ opacity: 1, width: '260px', x: 0 }}
                           exit={{ opacity: 0, width: 0, x: 20 }}
                           className="ml-4 shrink-0 bg-[var(--bg-panel)] border border-yellow-200 shadow-sm rounded-[var(--radius-lg)] overflow-hidden flex flex-col h-full"
                         >
                           <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-100 p-3 flex items-center justify-between">
                             <h4 className="text-[12px] font-bold text-yellow-800 flex items-center">
                               <Lightbulb className="w-3.5 h-3.5 mr-1.5 text-yellow-600" />
                               实时上下文推荐
                             </h4>
                             <button onClick={() => setShowKbHelper(false)} className="text-yellow-600 hover:text-yellow-800 transition-colors">
                               <X className="w-3.5 h-3.5" />
                             </button>
                           </div>
                           <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                             {kbEntries.filter(kb => kb.lang === uiLang || kb.lang === 'zh-CN').slice(0, 2).map(kb => (
                               <div key={kb.id} className="border border-yellow-100 bg-yellow-50/50 rounded-lg p-2.5 hover:bg-yellow-50 transition-colors cursor-pointer group">
                                 <h5 className="text-[12px] font-bold text-[var(--text-main)] mb-1 flex items-start">
                                   <FileText className="w-3.5 h-3.5 mr-1 mt-0.5 text-blue-500 shrink-0" />
                                   [{LANG_CONFIG.find(l => l.code === kb.lang)?.name}] {kb.question}
                                 </h5>
                                 <p className="text-[11px] text-gray-600 line-clamp-2">{kb.answer}</p>
                                 <div className="mt-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button className="text-[10px] text-[var(--text-muted)] hover:text-indigo-600 font-bold flex items-center" onClick={() => toast('已绑定到此会话关联文档', 'success')}>
                                     <Link className="w-3 h-3 mr-1" /> 关联多语版本
                                   </button>
                                   <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">直接引用</span>
                                 </div>
                               </div>
                             ))}
                           </div>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>

                   <div className="p-4 bg-[var(--bg-panel)] border-t border-[var(--border-color)] shrink-0 relative">
                     {showQuickReplies && (
                         <div className="absolute bottom-full left-4 mb-2 w-64 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] shadow-xl overflow-hidden z-20">
                           <div className="p-2 border-b border-[var(--border-color)] bg-gray-50 text-[11px] font-bold text-[var(--text-muted)]">选择自定义快捷回复组件</div>
                           <div className="max-h-48 overflow-y-auto">
                             {quickReplies.filter(qr => qr.shortcut.startsWith(replyText) || replyText === '/').map(qr => (
                               <button 
                                 key={qr.id}
                                 onClick={() => {
                                   setReplyText(qr.content);
                                   setShowQuickReplies(false);
                                 }}
                                 className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-start border-b border-gray-50 last:border-0"
                               >
                                 <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded mr-2 mt-0.5">{qr.shortcut}</span>
                                 <span className="text-[12px] text-gray-700 line-clamp-2">{qr.content}</span>
                               </button>
                             ))}
                             {quickReplies.filter(qr => qr.shortcut.startsWith(replyText) || replyText === '/').length === 0 && (
                               <div className="p-3 text-[12px] text-gray-400 text-center">暂无匹配的快捷回复</div>
                             )}
                           </div>
                         </div>
                       )}

                       <div className="flex flex-col bg-gray-50 rounded-[var(--radius-lg)] border border-[var(--border-color)] focus-within:bg-[var(--bg-panel)] focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all p-2 relative">
                         {isRecording && (
                           <div className="absolute top-2 left-2 right-2 bg-indigo-50/90 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between border border-indigo-100 z-10">
                              <div className="flex items-center text-indigo-600 font-bold text-[12px]">
                                 <Mic className="icon-sm mr-2 animate-pulse" />
                                 正在识别语音输入 [{LANG_CONFIG.find(l => l.code === recordingLang)?.name}] ...
                              </div>
                              <button 
                                onClick={() => {
                                  setIsRecording(false);
                                  setReplyText((prev) => prev + (recordingLang === 'en' ? " Hello, how can I help you?" : " 您好，请问有什么可以帮您？"));
                                }}
                                className="bg-indigo-600 text-white px-3 py-1 rounded-md text-[11px] font-bold shadow-sm flex-shrink-0 ml-2"
                              >
                                完成
                              </button>
                           </div>
                         )}
                         <textarea
                           value={replyText}
                           onChange={(e) => {
                             setReplyText(e.target.value);
                             if (e.target.value.startsWith('/')) {
                               setShowQuickReplies(true);
                             } else {
                               setShowQuickReplies(false);
                             }
                           }}
                           onKeyDown={(e) => {
                             if (e.key === 'Enter' && !e.shiftKey) {
                               e.preventDefault();
                               handleSendReply();
                             }
                           }}
                           placeholder={activeSession.status.includes('人工') ? "输入回复... (输入 / 触发快捷回复模板，Enter 发送)" : "接管后方可回复..."}
                           disabled={!activeSession.status.includes('人工')}
                           className="w-full bg-transparent resize-none border-none focus:ring-0 text-[14px] text-[var(--text-main)] p-2 min-h-[60px]"
                         />
                         <div className="flex justify-between items-center pt-2 border-t border-[var(--border-color)] mt-1">
                           <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => setIsRecording(true)}
                                disabled={!activeSession.status.includes('人工')}
                                className={`p-1.5 rounded-lg transition-colors flex items-center ${isRecording ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                title="语音转文字输入"
                              >
                                {isRecording ? <Mic className="icon-sm animate-pulse text-indigo-600" /> : <MicOff className="icon-sm" />}
                              </button>
                              <select 
                                value={recordingLang}
                                onChange={(e) => setRecordingLang(e.target.value as AppLang)}
                                disabled={!activeSession.status.includes('人工')}
                                className="text-[11px] font-medium bg-transparent border-none text-[var(--text-muted)] hover:text-gray-700 py-1 pl-1 pr-6 focus:ring-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {LANG_CONFIG.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                              </select>
                           </div>
                           <button 
                             disabled={!replyText.trim() || !activeSession.status.includes('人工')}
                             onClick={handleSendReply}
                             className={`px-4 py-1.5 rounded-lg text-[13px] font-bold flex items-center transition-colors ${replyText.trim() && activeSession.status.includes('人工') ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                           >
                             <Send className="w-3.5 h-3.5 mr-1.5" />
                             发送
                           </button>
                         </div>
                       </div>
                     </div>
                   </>
                 ) : (
                   <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-[var(--spacing-md)]">
                     <MessageSquare className="w-12 h-12 text-gray-200" />
                     <p className="text-[14px] font-bold">在左侧选择一个会话以查看详情或接管</p>
                   </div>
                 )}
               </div>
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-md)] h-full">
              <div className="lg:col-span-2 space-y-[var(--spacing-lg)]">
                <div className="bg-[var(--bg-panel)] rounded-[20px] border border-[var(--border-color)] shadow-sm overflow-hidden min-h-[600px]">
                  <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
                    <h3 className="font-bold text-[16px] flex items-center">
                      <BookOpen className="icon-md mr-2 text-indigo-500" />
                      问答知识库 (Q&A)
                    </h3>
                    <div className="relative">
                      <Search className="icon-sm absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" placeholder="搜索知识点..." className="text-[13px] pl-9 pr-4 py-1.5 border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-64" />
                    </div>
                  </div>
                  
                  <div className="p-[var(--spacing-lg)]">
                     <div className="bg-gray-50 border border-[var(--border-color)] border-dashed rounded-[var(--radius-lg)] p-5 mb-[var(--spacing-md)]">
                       <h4 className="text-[13px] font-bold text-gray-700 mb-3">⚡ 添加新规则 / 话术</h4>
                       <div className="space-y-3">
                         <input 
                           type="text" 
                           placeholder="标准问题 (如: 退换货标准?)" value={newQuestion} onChange={e => setNewQuestion(e.target.value)}
                           className="w-full text-[13px] px-3 py-2 border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                         />
                         <textarea 
                           placeholder="AI 回复话术..." value={newAnswer} onChange={e => setNewAnswer(e.target.value)}
                           className="w-full text-[13px] px-3 py-2 border border-[var(--border-color)] rounded-md min-h-[80px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                         />
                         <div className="flex justify-end">
                           <button onClick={handleAddKb} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-[12px] font-bold shadow-sm flex items-center">
                             <Plus className="w-3.5 h-3.5 mr-1" />添加到知识库
                           </button>
                         </div>
                       </div>
                     </div>

                     <div className="space-y-3">
                       {kbEntries.filter(kb => uiLang === 'zh-CN' || kb.lang === uiLang).map(kb => (
                         <div key={kb.id} className="border border-[var(--border-color)] rounded-[var(--radius-lg)] p-4 bg-[var(--bg-panel)] shadow-sm flex gap-[var(--spacing-md)] group">
                           <div className="flex-1 space-y-2">
                             <div className="flex justify-between items-center">
                                <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded flex items-center w-fit">
                                  <Globe className="w-3 h-3 mr-1" />
                                  {LANG_CONFIG.find(l => l.code === kb.lang)?.name || kb.lang}
                                </span>
                             </div>
                             <div className="flex items-start text-[var(--text-main)]">
                               <span className="font-black text-indigo-500 w-5">Q:</span>
                               <span className="font-bold text-[14px]">{kb.question}</span>
                             </div>
                             <div className="flex items-start text-gray-600">
                               <span className="font-black text-gray-400 w-5">A:</span>
                               <span className="text-[13px]">{kb.answer}</span>
                             </div>
                           </div>
                           <div className="flex flex-col items-end justify-between shrink-0">
                             <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded uppercase">Active</span>
                             <button onClick={() => handleDeleteKb(kb.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                               <Trash2 className="icon-sm" />
                             </button>
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>
                </div>
              </div>
              
              <div className="col-span-1 space-y-[var(--spacing-lg)]">
                <div className="bg-[var(--bg-panel)] rounded-[20px] shadow-sm border border-[var(--border-color)] p-5">
                  <h3 className="font-bold text-[var(--text-main)] text-[14px] flex items-center mb-4 pb-3 border-b border-[var(--border-color)]">
                    <Database className="icon-sm mr-2 text-indigo-500" />
                    文档及网站抓取
                  </h3>
                  <div className="space-y-[var(--spacing-md)]">
                    <div>
                        <div className="flex justify-between items-center text-[12px] font-bold text-gray-700 mb-2">
                          <span>官网首页链接库 (.html)</span>
                          <span className="text-green-500 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> 已向量化</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-green-500 h-1.5 rounded-full w-full"></div></div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center text-[12px] font-bold text-gray-700 mb-2">
                          <span>产品说明书PDF包 (12份)</span>
                          <span className="text-indigo-500 flex items-center"><Activity className="w-3 h-3 mr-1 animate-spin" /> 解析学习中</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full w-[60%] animate-pulse"></div></div>
                    </div>
                    <button className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[13px] font-bold border border-indigo-200 border-dashed mt-4 transition-colors">
                        + 上传新文档或填入URL
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--spacing-md)] h-full">
              <div className="space-y-[var(--spacing-lg)]">
                <div className="bg-[var(--bg-panel)] rounded-[20px] border border-[var(--border-color)] shadow-sm overflow-hidden min-h-[600px]">
                  <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
                    <h3 className="font-bold text-[16px] flex items-center">
                      <Hash className="icon-md mr-2 text-indigo-500" />
                      自定义快捷回复面板 (Markdown 支持)
                    </h3>
                  </div>
                  
                  <div className="p-[var(--spacing-lg)] space-y-[var(--spacing-lg)]">
                    <div className="bg-gray-50 border border-[var(--border-color)] border-dashed rounded-[var(--radius-lg)] p-5">
                      <h4 className="text-[13px] font-bold text-gray-700 mb-3">➕ 创建新的触发命令包</h4>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <span className="text-[var(--text-muted)] font-bold bg-[var(--bg-panel)] border border-[var(--border-color)] border-r-0 px-3 py-1.5 rounded-l-md text-[13px]">/</span>
                          <input 
                            type="text" 
                            placeholder="如: greet, bypass, oops" value={newShortcut} onChange={e => setNewShortcut(e.target.value.replace(/ /, ''))}
                            className="flex-1 text-[13px] px-3 py-1.5 border border-[var(--border-color)] rounded-r-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <textarea 
                          placeholder="编写预设的 Markdown 回复组件文本..." value={newTemplate} onChange={e => setNewTemplate(e.target.value)}
                          className="w-full text-[13px] px-3 py-2 border border-[var(--border-color)] rounded-md min-h-[100px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <div className="flex justify-end">
                          <button onClick={handleAddQuickReply} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-[12px] font-bold shadow-sm flex items-center">
                            <Plus className="w-3.5 h-3.5 mr-1" />保存配置
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {quickReplies.map(qr => (
                        <div key={qr.id} className="border border-[var(--border-color)] rounded-[var(--radius-lg)] p-4 bg-[var(--bg-panel)] shadow-sm flex gap-[var(--spacing-md)] group">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center">
                              <span className="bg-indigo-100 text-indigo-700 text-[11px] font-bold px-2 py-0.5 rounded uppercase">{qr.shortcut}</span>
                            </div>
                            <div className="text-[13px] text-gray-600 mt-2 bg-gray-50 p-3 rounded-lg border border-[var(--border-color)]">
                              {qr.content}
                            </div>
                          </div>
                          <div className="flex flex-col items-end justify-between shrink-0">
                            <button onClick={() => handleDeleteQuickReply(qr.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="icon-sm" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-[var(--spacing-lg)]">
              <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-[#0F172A] rounded-[24px] p-[var(--spacing-xl)] text-white shadow-xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-[var(--spacing-xl)] opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
                    <BarChart3 className="w-48 h-48" />
                 </div>
                 <div className="relative z-10">
                   <h2 className="text-2xl font-black mb-2 flex items-center"><Zap className="icon-lg mr-2 text-yellow-400" /> 客服引擎效能分析</h2>
                   <p className="text-indigo-200 text-sm mb-[var(--spacing-xl)]">数据更新时间: 实时动态监控</p>
                   
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)]">
                      <div className="bg-[var(--bg-panel)]/10 backdrop-blur-md rounded-[var(--radius-lg)] p-5 border border-white/10">
                         <p className="text-[12px] text-indigo-200 mb-1 font-medium">总会话数 (本周)</p>
                         <p className="text-[var(--text-main)]xl font-black text-white">4,892</p>
                         <p className="text-xs text-green-400 mt-2 flex items-center">↑ 12.5% 环比增长</p>
                      </div>
                      <div className="bg-[var(--bg-panel)]/10 backdrop-blur-md rounded-[var(--radius-lg)] p-5 border border-white/10 relative overflow-hidden">
                         <div className="absolute bottom-0 right-0 w-16 h-16 bg-blue-500 rounded-tl-full opacity-20 filter blur-xl"></div>
                         <p className="text-[12px] text-indigo-200 mb-1 font-medium">AI 独立解决率</p>
                         <p className="text-[var(--text-main)]xl font-black text-blue-300">89.4%</p>
                         <p className="text-xs text-gray-300 mt-2 font-medium">绝大部分问题无需人工干预</p>
                      </div>
                      <div className="bg-[var(--bg-panel)]/10 backdrop-blur-md rounded-[var(--radius-lg)] p-5 border border-white/10">
                         <p className="text-[12px] text-indigo-200 mb-1 font-medium">平均首次响应时长</p>
                         <p className="text-[var(--text-main)]xl font-black text-green-400">0.9<span className="text-lg ml-1">s</span></p>
                         <p className="text-xs text-green-400 mt-2 flex items-center">↓ 30% 相比人工</p>
                      </div>
                      <div className="bg-[var(--bg-panel)]/10 backdrop-blur-md rounded-[var(--radius-lg)] p-5 border border-white/10 border-yellow-500/30">
                         <p className="text-[12px] text-yellow-200 mb-1 font-medium">直接促单预估金额</p>
                         <p className="text-[var(--text-main)]xl font-black text-yellow-400"><span className="text-lg mr-1">¥</span>12,800</p>
                         <p className="text-xs text-gray-300 mt-2 font-medium">基于转化漏斗折算</p>
                      </div>
                   </div>
                 </div>
              </div>

              <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] p-[var(--spacing-xl)] shadow-sm">
                <h3 className="font-bold text-[var(--text-main)] text-lg mb-[var(--spacing-md)] flex items-center">
                  <UserCheck className="icon-md mr-2 text-indigo-500" />
                  客服团队绩效看板
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[14px]">
                    <thead>
                      <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase tracking-wider text-[11px] font-bold">
                        <th className="pb-3 font-bold">客服姓名</th>
                        <th className="pb-3 font-bold">平均响应时长</th>
                        <th className="pb-3 font-bold">客户满意度得分 (CSAT)</th>
                        <th className="pb-3 font-bold">擅长领域标签</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      <tr>
                        <td className="py-4 font-bold text-[var(--text-main)] flex items-center"><div className="w-7 h-7 rounded-full bg-blue-100 text-[var(--color-primary)] flex items-center justify-center mr-3 text-[11px]">张</div> 张伟 (组长)</td>
                        <td className="py-4 text-green-600 font-bold">2.4 分钟</td>
                        <td className="py-4">
                          <div className="flex items-center space-x-1">
                            <span className="font-bold text-[var(--text-main)]">4.9</span>
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex gap-2">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-bold rounded">技术支持</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-bold rounded">VIP大客户</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-4 font-bold text-[var(--text-main)] flex items-center"><div className="w-7 h-7 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mr-3 text-[11px]">李</div> 李娜</td>
                        <td className="py-4 text-gray-700 font-bold">3.1 分钟</td>
                        <td className="py-4">
                          <div className="flex items-center space-x-1">
                            <span className="font-bold text-[var(--text-main)]">4.7</span>
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex gap-2">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-bold rounded">售前咨询</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-bold rounded">退款售后</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-4 font-bold text-[var(--text-main)] flex items-center"><div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3 text-[11px]">王</div> 王强</td>
                        <td className="py-4 text-gray-700 font-bold">2.8 分钟</td>
                        <td className="py-4">
                          <div className="flex items-center space-x-1">
                            <span className="font-bold text-[var(--text-main)]">4.8</span>
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex gap-2">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-bold rounded">投诉处理</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-bold rounded">复杂工单</span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-md)] h-full">
              <div className="lg:col-span-2 space-y-[var(--spacing-lg)]">
                <div className="bg-[var(--bg-panel)] rounded-[20px] shadow-sm border border-[var(--border-color)] p-[var(--spacing-lg)] min-h-[600px]">
                  <div className="flex justify-between items-center mb-[var(--spacing-md)]">
                    <h3 className="font-bold text-[16px] flex items-center text-[var(--text-main)]">
                      <Calendar className="icon-md mr-2 text-indigo-500" />
                      AI 智能排班系统
                    </h3>
                    <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm flex items-center transition-colors">
                      <Wand2 className="icon-sm mr-2" />
                      一键生成下周排班
                    </button>
                  </div>
                  <p className="text-[13px] text-[var(--text-muted)] mb-[var(--spacing-md)]">根据历史咨询高峰及客服能力标签（如“VIP处理”、“退款纠纷”）自动规划并发生成时刻表。</p>
                  
                  <div className="overflow-x-auto border border-[var(--border-color)] rounded-[var(--radius-lg)]">
                    <table className="w-full text-left text-[13px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-[var(--border-color)] text-[var(--text-muted)]">
                          <th className="p-3 font-bold border-r border-[var(--border-color)]">班次 / 星期</th>
                          <th className="p-3 font-bold border-r border-[var(--border-color)] text-center">周一</th>
                          <th className="p-3 font-bold border-r border-[var(--border-color)] text-center">周二</th>
                          <th className="p-3 font-bold border-r border-[var(--border-color)] text-center">周三</th>
                          <th className="p-3 font-bold border-r border-[var(--border-color)] text-center">周四</th>
                          <th className="p-3 font-bold border-r border-[var(--border-color)] text-center">周五</th>
                          <th className="p-3 font-bold border-r border-[var(--border-color)] text-center text-indigo-500">周六</th>
                          <th className="p-3 font-bold text-center text-indigo-500">周日</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="p-3 font-bold text-gray-700 border-r border-[var(--border-color)] bg-gray-50 max-w-[120px]">
                            早班 (08:00-16:00)<br/>
                            <span className="text-[11px] text-gray-400 font-normal leading-tight block mt-1">系统预估高峰:<br/>售前咨询激增</span>
                          </td>
                          <td className="p-3 border-r border-[var(--border-color)]"><div className="bg-indigo-50 text-indigo-700 p-2 rounded shadow-sm text-center font-bold">李娜</div><div className="text-[10px] text-gray-400 text-center mt-1">售前主力</div></td>
                          <td className="p-3 border-r border-[var(--border-color)]"><div className="bg-indigo-50 text-indigo-700 p-2 rounded shadow-sm text-center font-bold">李娜</div><div className="text-[10px] text-gray-400 text-center mt-1">售前主力</div></td>
                          <td className="p-3 border-r border-[var(--border-color)]"><div className="bg-gray-100 text-gray-400 p-2 rounded shadow-sm text-center font-bold">休息</div></td>
                          <td className="p-3 border-r border-[var(--border-color)]"><div className="bg-indigo-50 text-indigo-700 p-2 rounded shadow-sm text-center font-bold">王强</div><div className="text-[10px] text-gray-400 text-center mt-1">支持</div></td>
                          <td className="p-3 border-r border-[var(--border-color)]"><div className="bg-indigo-50 text-indigo-700 p-2 rounded shadow-sm text-center font-bold">李娜</div><div className="text-[10px] text-gray-400 text-center mt-1">售前主力</div></td>
                          <td className="p-3 border-r border-[var(--border-color)] bg-indigo-50/30"><div className="bg-indigo-50 text-indigo-700 p-2 rounded shadow-sm text-center font-bold border border-indigo-100">李娜 + 王强</div><div className="text-[10px] text-indigo-400 text-center mt-1">双人值守</div></td>
                          <td className="p-3 bg-indigo-50/30"><div className="bg-indigo-50 text-indigo-700 p-2 rounded shadow-sm text-center font-bold border border-indigo-100">李娜 + 王强</div><div className="text-[10px] text-indigo-400 text-center mt-1">双人值守</div></td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-gray-700 border-r border-[var(--border-color)] bg-gray-50 max-w-[120px]">
                            晚班 (16:00-24:00)<br/>
                            <span className="text-[11px] text-gray-400 font-normal leading-tight block mt-1">系统预估高峰:<br/>售后投诉高发</span>
                          </td>
                          <td className="p-3 border-r border-[var(--border-color)]"><div className="bg-orange-50 text-orange-700 p-2 rounded shadow-sm text-center font-bold">王强</div><div className="text-[10px] text-gray-400 text-center mt-1">投诉处理</div></td>
                          <td className="p-3 border-r border-[var(--border-color)]"><div className="bg-orange-50 text-orange-700 p-2 rounded shadow-sm text-center font-bold">王强</div><div className="text-[10px] text-gray-400 text-center mt-1">投诉处理</div></td>
                          <td className="p-3 border-r border-[var(--border-color)]"><div className="bg-orange-50 text-orange-700 p-2 rounded shadow-sm text-center font-bold">王强</div><div className="text-[10px] text-gray-400 text-center mt-1">投诉处理</div></td>
                          <td className="p-3 border-r border-[var(--border-color)]"><div className="bg-gray-100 text-gray-400 p-2 rounded shadow-sm text-center font-bold">休息</div></td>
                          <td className="p-3 border-r border-[var(--border-color)]"><div className="bg-indigo-50 text-indigo-700 p-2 rounded shadow-sm text-center font-bold">李娜</div><div className="text-[10px] text-gray-400 text-center mt-1">售前</div></td>
                          <td className="p-3 border-r border-[var(--border-color)] bg-indigo-50/30"><div className="bg-orange-50 text-orange-700 p-2 rounded shadow-sm text-center font-bold border border-orange-100">王强</div><div className="text-[10px] text-orange-400 text-center mt-1">投诉处理</div></td>
                          <td className="p-3 bg-indigo-50/30"><div className="bg-orange-50 text-orange-700 p-2 rounded shadow-sm text-center font-bold border border-orange-100">王强</div><div className="text-[10px] text-orange-400 text-center mt-1">投诉处理</div></td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-gray-700 border-r border-[var(--border-color)] bg-gray-50 max-w-[120px]">
                            机动/大客户岗<br/>
                            <span className="text-[11px] text-gray-400 font-normal leading-tight block mt-1">支持全时段<br/>升级转交</span>
                          </td>
                          <td className="p-3 border-r border-[var(--border-color)]"><div className="bg-purple-50 text-purple-700 p-2 rounded shadow-sm text-center font-bold">张伟</div><div className="text-[10px] text-gray-400 text-center mt-1">组长/VIP</div></td>
                          <td className="p-3 border-r border-[var(--border-color)]"><div className="bg-purple-50 text-purple-700 p-2 rounded shadow-sm text-center font-bold">张伟</div><div className="text-[10px] text-gray-400 text-center mt-1">组长/VIP</div></td>
                          <td className="p-3 border-r border-[var(--border-color)]"><div className="bg-purple-50 text-purple-700 p-2 rounded shadow-sm text-center font-bold">张伟</div><div className="text-[10px] text-gray-400 text-center mt-1">组长/VIP</div></td>
                          <td className="p-3 border-r border-[var(--border-color)]"><div className="bg-purple-50 text-purple-700 p-2 rounded shadow-sm text-center font-bold">张伟</div><div className="text-[10px] text-gray-400 text-center mt-1">组长/VIP</div></td>
                          <td className="p-3 border-r border-[var(--border-color)]"><div className="bg-purple-50 text-purple-700 p-2 rounded shadow-sm text-center font-bold">张伟</div><div className="text-[10px] text-gray-400 text-center mt-1">组长/VIP</div></td>
                          <td className="p-3 border-r border-[var(--border-color)] bg-indigo-50/30"><div className="bg-gray-100 text-gray-400 p-2 rounded shadow-sm text-center font-bold">休息</div></td>
                          <td className="p-3 bg-indigo-50/30"><div className="bg-gray-100 text-gray-400 p-2 rounded shadow-sm text-center font-bold">休息</div></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              <div className="col-span-1 space-y-[var(--spacing-lg)]">
                <div className="bg-[var(--bg-panel)] rounded-[20px] shadow-sm border border-red-200 p-[var(--spacing-lg)] min-h-[600px] flex flex-col">
                  <h3 className="font-bold text-[var(--text-main)] text-[16px] flex items-center border-b border-[var(--border-color)] pb-3 mb-4">
                    <ShieldAlert className="icon-md mr-2 text-red-500" />
                    AI 合规审查监控
                  </h3>
                  
                  <div className="flex-1 overflow-y-auto space-y-[var(--spacing-md)]">
                    <div className="border border-red-100 bg-red-50/50 rounded-[var(--radius-lg)] p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">高危预警</span>
                        <span className="text-[11px] text-[var(--text-muted)] font-medium">10:42 AM</span>
                      </div>
                      <p className="text-[12px] text-gray-700 mb-2 mt-1">
                        <strong>触发词：</strong> 绝对、保证、全网第一
                      </p>
                      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded p-2 text-[12px] text-gray-600 line-through decoration-red-400">
                        "我们这款产品是绝对全网第一的，保证你用着没有任何问题。"
                      </div>
                      <div className="text-[11px] text-red-600 mt-2 font-bold flex items-center">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" /> 已自动拦截并替换为安全话术
                      </div>
                    </div>
                    
                    <div className="border border-yellow-100 bg-yellow-50/50 rounded-[var(--radius-lg)] p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">中危预警</span>
                        <span className="text-[11px] text-[var(--text-muted)] font-medium">Yesterday</span>
                      </div>
                      <p className="text-[12px] text-gray-700 mb-2 mt-1">
                        <strong>触发违规情形：</strong> 过度承诺时效
                      </p>
                      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded p-2 text-[12px] text-gray-600">
                        "马上给您退款，一秒钟到账。"
                      </div>
                      <div className="text-[11px] text-yellow-600 mt-2 font-bold flex items-center">
                        <ShieldAlert className="w-3.5 h-3.5 mr-1" /> 已提醒坐席修改表述，未拦截
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

