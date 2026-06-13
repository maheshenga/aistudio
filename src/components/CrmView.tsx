import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  UsersRound, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Star, 
  Clock, 
  Activity, 
  Tag,
  MessageCircle,
  Plus,
  Mail,
  Phone,
  BarChart2,
  Download,
  AlertCircle,
  CalendarDays,
  Sparkles,
  Bot,
  X,
  RefreshCw,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  FileText
} from 'lucide-react';
import { toast } from './Toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { CustomerGraph } from './CustomerGraph';
import { CrmAutomation } from './CrmAutomation';
import { CustomerComments } from './CustomerComments';
import { CustomerInsights } from './CustomerInsights';
import { MeetingAssistant } from './MeetingAssistant';
import { TeamLoadView } from './TeamLoadView';
import { CrmWorkflowBuilder } from './CrmWorkflowBuilder';
import { useSaasSession } from '../saas/SaasAuthContext';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { loadWorkspaceCustomers, type WorkspaceCustomer } from '../lib/data/customerRepository';
import { createWorkspaceTask, loadWorkspaceTasks } from '../lib/data/taskRepository';

const CUSTOMER_STATUSES = ['潜在', '活跃', '流失'] as const;
type CustomerStatus = typeof CUSTOMER_STATUSES[number];

type CrmCustomer = {
  id: string;
  name: string;
  company: string;
  role: string;
  tags: string[];
  ltv: string;
  active: string;
  aiStatus: string;
  level: string;
  stage: string;
  status: CustomerStatus;
  taskDue: boolean;
  aiScore: number;
  nextFollowUp: string;
  source?: WorkspaceCustomer['source'];
};

const CRM_DEMO_CUSTOMERS: CrmCustomer[] = [
  { id: 'C-8092', name: '王梦璇 (Sarah)', company: '泛星跃动传媒', role: '营销总监', tags: ['高净值', '多次复购', 'AIGC依赖'], ltv: '¥ 124,500', active: '今天 10:15', aiStatus: '需跟进: 续约周期临近', level: 'VIP', stage: '沟通中', status: '活跃', taskDue: true, aiScore: 98, nextFollowUp: '2026-06-09' },
  { id: 'C-8093', name: '李智 (Leo)', company: '云创未来科技', role: '电商操盘手', tags: ['决策人', '近期流失风险'], ltv: '¥ 32,800', active: '昨天', aiStatus: 'AI 预警: 近 14 天活跃度下降', level: 'A', stage: '潜在线索', status: '流失', taskDue: false, aiScore: 56, nextFollowUp: '2026-06-11' },
  { id: 'C-8094', name: '赵静茹', company: '静茹个人工作室', role: '主理人', tags: ['单飞IP', '品牌设计'], ltv: '¥ 8,600', active: '3天前', aiStatus: '日常维系', level: 'B', stage: '已成交', status: '活跃', taskDue: false, aiScore: 82, nextFollowUp: '2026-06-12' },
  { id: 'C-8095', name: 'Alex Peterson', company: 'Global Reach Inc.', role: 'VP of Growth', tags: ['海外大客', '英语跟进'], ltv: '$ 24,000', active: '周一', aiStatus: '已发送财报分析', level: 'VIP', stage: '沟通中', status: '活跃', taskDue: false, aiScore: 91, nextFollowUp: '2026-06-08' },
  { id: 'C-8096', name: '陈建国', company: '传统制造转型', role: '总经理', tags: ['待激活', '预算高'], ltv: '¥ 0', active: '1个月前', aiStatus: '建议推送同行业研报', level: 'C', stage: '潜在线索', status: '潜在', taskDue: false, aiScore: 64, nextFollowUp: '2026-06-14' },
];

function mapWorkspaceCustomerToCrmCustomer(customer: WorkspaceCustomer): CrmCustomer {
  const sourceChannel = customer.source?.sourceChannel;
  const tags = [...new Set([...customer.tags, sourceChannel, 'marketing_lead'].filter(Boolean))] as string[];
  const lifecycleStageMap: Record<WorkspaceCustomer['lifecycleStage'], { stage: string; status: CustomerStatus; level: string; score: number }> = {
    new_lead: { stage: '潜在线索', status: '潜在', level: 'Lead', score: 72 },
    qualified: { stage: '潜在线索', status: '活跃', level: 'A', score: 86 },
    contacted: { stage: '沟通中', status: '活跃', level: 'A', score: 82 },
    converted: { stage: '已成交', status: '活跃', level: 'VIP', score: 94 },
    inactive: { stage: '潜在线索', status: '流失', level: 'C', score: 48 },
  };
  const lifecycle = lifecycleStageMap[customer.lifecycleStage];
  const nextFollowUp = new Date((customer.lastInteractionAt || customer.updatedAt) + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return {
    id: customer.id,
    name: customer.name,
    company: customer.company ?? 'Unknown company',
    role: customer.role ?? 'Lead owner',
    tags,
    ltv: '¥ 0',
    active: new Date(customer.lastInteractionAt).toLocaleDateString('zh-CN'),
    aiStatus: customer.source?.campaignName
      ? `Campaign lead: ${customer.source.campaignName}`
      : 'Marketing lead ready for follow-up',
    level: lifecycle.level,
    stage: lifecycle.stage,
    status: lifecycle.status,
    taskDue: customer.lifecycleStage === 'new_lead' || customer.lifecycleStage === 'qualified',
    aiScore: lifecycle.score,
    nextFollowUp,
    source: customer.source,
  };
}

function escapeCsvValue(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const MOCK_SALES_DATA = [
  { name: '周一', sales: 4000, leads: 24 },
  { name: '周二', sales: 3000, leads: 13 },
  { name: '周三', sales: 2000, leads: 58 },
  { name: '周四', sales: 2780, leads: 39 },
  { name: '周五', sales: 1890, leads: 48 },
  { name: '周六', sales: 2390, leads: 38 },
  { name: '周日', sales: 3490, leads: 43 },
];

const PIE_DATA = [
  { name: '电商行业', value: 400 },
  { name: '游戏出海', value: 300 },
  { name: '自媒体', value: 300 },
  { name: '本地生活', value: 200 },
];
const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

const CSAT_DATA = [
  { name: '非常满意', value: 65, fill: '#10b981' },
  { name: '满意', value: 25, fill: '#3b82f6' },
  { name: '一般', value: 8, fill: '#f59e0b' },
  { name: '不满意', value: 2, fill: '#ef4444' },
];

export function CrmView() {
  const session = useSaasSession();
  const taskContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const customerContext = useMemo(
    () => ({ workspaceId: session.workspace.id, userId: session.user.id }),
    [session.user.id, session.workspace.id],
  );
  const [activeTab, setActiveTab] = useState('all');
  const [filterStatus, setFilterStatus] = useState<CustomerStatus | '全部'>('全部');
  const [customers, setCustomers] = useState<CrmCustomer[]>(() => {
    const workspaceCustomers = loadWorkspaceCustomers(customerContext);
    return workspaceCustomers.length > 0
      ? workspaceCustomers.map(mapWorkspaceCustomerToCrmCustomer)
      : CRM_DEMO_CUSTOMERS;
  });
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [undoHistory, setUndoHistory] = useState<{ customers: typeof customers, action: string } | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date('2026-06-08'));

  useEffect(() => {
    const syncCustomers = () => {
      const workspaceCustomers = loadWorkspaceCustomers(customerContext);
      setCustomers(workspaceCustomers.length > 0
        ? workspaceCustomers.map(mapWorkspaceCustomerToCrmCustomer)
        : CRM_DEMO_CUSTOMERS);
    };

    syncCustomers();
    const handleCustomerUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
      if (!detail?.workspaceId || detail.workspaceId === session.workspace.id) {
        syncCustomers();
      }
    };
    window.addEventListener('workspace_customers_updated', handleCustomerUpdate);
    return () => window.removeEventListener('workspace_customers_updated', handleCustomerUpdate);
  }, [customerContext, session.workspace.id]);

  const auditCrm = useCallback((
    action: 'crm_customer_export' | 'crm_followup_task_sync' | 'crm_email_draft_generate' | 'crm_summary_generate',
    targetId: string,
    metadata: Record<string, unknown>,
  ) => {
    logAuditEvent(
      {
        action,
        moduleId: 'crm',
        targetType: action === 'crm_followup_task_sync' ? 'task' : 'workspace',
        targetId,
        metadata,
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
  }, [session]);

  useEffect(() => {
    const dueCustomers = customers.filter(c => c.taskDue);
    if (dueCustomers.length === 0) return;

    const existingTitles = new Set(loadWorkspaceTasks(taskContext).map((task) => task.title));
    const createdTasks = dueCustomers.flatMap((customer) => {
      const title = `[客户跟进] ${customer.name} - ${customer.company}`;
      if (existingTitles.has(title)) return [];
      const task = createWorkspaceTask(
        {
          title,
          column: 'todo',
          priority: 'High',
          type: '客户维系',
          date: customer.nextFollowUp,
          isAuto: false,
        },
        taskContext,
      );
      existingTitles.add(title);
      return [task];
    });

    if (createdTasks.length > 0) {
      auditCrm('crm_followup_task_sync', 'crm_followups_due', {
        customerIds: dueCustomers.map((customer) => customer.id),
        createdTaskIds: createdTasks.map((task) => task.id),
      });
      toast(`有 ${createdTasks.length} 个客户跟进任务已同步至任务中心。`, 'info', true);
    }
  }, [auditCrm, customers, taskContext]);

  const STAGES = ['潜在线索', '沟通中', '已成交'];

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('customerId', id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('customerId');
    if (id) {
        setCustomers(prev => prev.map(c => c.id === id ? { ...c, stage } : c));
    }
    setDraggedId(null);
  };

  const handleExport = () => {
    const csvHeader = 'ID,姓名,公司,职位,LTV,阶段,状态,Campaign ID,Campaign Name,Source Channel,Landing Page,Touchpoint\n';
    const csvContent = customers.map(c => [
      c.id,
      c.name,
      c.company,
      c.role,
      c.ltv,
      c.stage,
      c.status,
      c.source?.campaignId,
      c.source?.campaignName,
      c.source?.sourceChannel,
      c.source?.landingPage,
      c.source?.touchpoint,
    ].map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `customers_export_${new Date().getTime()}.csv`;
    link.click();
    auditCrm('crm_customer_export', session.workspace.id, {
      customerCount: customers.length,
      selectedCount: selectedIds.length,
      filterStatus,
      sourceCampaignCount: customers.filter((customer) => customer.source?.campaignId).length,
    });
    toast('客户列表已成功导出为 CSV 文件', 'success');
  };

  const handleGenerateEmail = () => {
    if (!selectedCustomer) return;
    setIsGeneratingEmail(true);
    try {
      const draft = `尊敬的${selectedCustomer.name}（${selectedCustomer.role}），\n\n您好！我是您的专属顾问。\n\n注意到贵司【${selectedCustomer.company}】在${selectedCustomer.tags[0] || '业务'}方面有进一步提升空间，结合您此前关注的方向，我为您整理了一套最新的行业AI应用方案。\n\n期待与您进一步交流！\n祝好`;
      setEmailDraft(draft);
      auditCrm('crm_email_draft_generate', selectedCustomer.id, {
        customerId: selectedCustomer.id,
        company: selectedCustomer.company,
        tags: selectedCustomer.tags,
        draftLength: draft.length,
      });
      toast('邮件草稿已生成并写入审计日志', 'success');
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleGenerateSummary = () => {
    if (!selectedCustomer) return;
    setIsGeneratingSummary(true);
    try {
      const generatedSummary = `【AI 智能沟通总结】\n- 客户状态：当前处于"${selectedCustomer.stage}"阶段，总体评级 ${selectedCustomer.level} (AI得分: ${selectedCustomer.aiScore})。\n- 核心诉求：对定制化需求较高，标签包含 [${selectedCustomer.tags.join(', ')}]，历史 LTV 约 ${selectedCustomer.ltv}。\n- AI风险与机会洞察：${selectedCustomer.aiStatus}。\n- 建议行动：建议本周内安排优先跟进。`;
      setSummary(generatedSummary);
      auditCrm('crm_summary_generate', selectedCustomer.id, {
        customerId: selectedCustomer.id,
        stage: selectedCustomer.stage,
        level: selectedCustomer.level,
        aiScore: selectedCustomer.aiScore,
        summaryLength: generatedSummary.length,
      });
      toast('沟通总结已生成并写入审计日志', 'success');
    } finally {
      setIsGeneratingSummary(false);
    }
  };
  
  const generateWeekDays = () => {
    const result = [];
    const baseDate = new Date(calendarDate);
    // get monday
    const day = baseDate.getDay();
    const diff = baseDate.getDate() - day + (day == 0 ? -6 : 1);
    baseDate.setDate(diff);
    for(let i=0; i<7; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i);
        result.push(d);
    }
    return result;
  };

  const weekDays = generateWeekDays();

  const handleCalendarDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('customerId');
    if (id) {
       setCustomers(prev => prev.map(c => c.id === id ? { ...c, nextFollowUp: dateStr } : c));
       toast('任务跟进时间已更新', 'success');
    }
    setDraggedId(null);
  };

  const handleUndo = () => {
    if (undoHistory) {
      setCustomers(undoHistory.customers);
      setUndoHistory(null);
      setSelectedIds([]);
      toast(`已撤销批量${undoHistory.action}`, 'success');
    }
  };

  const handleBatchDelete = () => {
    setUndoHistory({ customers, action: '删除' });
    setCustomers(prev => prev.filter(c => !selectedIds.includes(c.id)));
    setSelectedIds([]);
    toast('已批量删除选中的客户', 'success');
  };

  const handleBatchAssign = () => {
    toast('批量指派跟进负责人功能已准备', 'info');
  };

  const handleBatchTag = () => {
    toast('批量修改标签功能已准备', 'info');
  };

  const filteredCustomers = customers.filter(c => filterStatus === '全部' || c.status === filterStatus);

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F5] pb-20 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-[var(--bg-panel)] border-b border-[var(--border-color)] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-6 lg:py-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-[var(--spacing-md)]">
            <div>
               <div className="flex items-center space-x-3 mb-2">
                 <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-blue-100 text-[var(--color-primary)] flex items-center justify-center">
                    <UsersRound className="icon-md" />
                 </div>
                 <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">智能客户管家 (CRM)</h2>
               </div>
               <p className="text-[var(--text-muted)] text-[14px] font-medium max-w-xl leading-relaxed">
                  管理您的私域流量、高净值客户与企业合作伙伴。AI 将根据客户行为数据自动为您生成跟进策略与关怀话术。
               </p>
            </div>
            <div className="flex items-center space-x-3 shrink-0">
               <button onClick={handleExport} className="bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold text-sm shadow-sm transition-colors flex items-center">
                 <Download className="icon-sm mr-2" />
                 导出 CSV
               </button>
               <button className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-sm shadow-md transition-all flex items-center group">
                  <Plus className="icon-sm mr-2" />
                  新建客户档案
               </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-6 mt-8 overflow-x-auto custom-scrollbar pb-1">
             <button onClick={() => setActiveTab('all')} className={`font-bold pb-3 border-b-2 whitespace-nowrap px-1 text-[14px] transition-colors ${activeTab === 'all' ? 'border-blue-600 text-blue-700' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>全部客户档案</button>
             <button onClick={() => setActiveTab('kanban')} className={`font-bold pb-3 border-b-2 whitespace-nowrap px-1 text-[14px] transition-colors ${activeTab === 'kanban' ? 'border-blue-600 text-blue-700' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>客户跟踪漏斗</button>
             <button onClick={() => setActiveTab('team_load')} className={`font-bold pb-3 border-b-2 whitespace-nowrap px-1 text-[14px] transition-colors ${activeTab === 'team_load' ? 'border-blue-600 text-blue-700' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>团队任务负载</button>
             <button onClick={() => setActiveTab('calendar')} className={`font-bold pb-3 border-b-2 whitespace-nowrap px-1 text-[14px] transition-colors ${activeTab === 'calendar' ? 'border-blue-600 text-blue-700' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>任务日历</button>
             <button onClick={() => setActiveTab('dashboard')} className={`font-bold pb-3 border-b-2 whitespace-nowrap px-1 text-[14px] transition-colors ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-700' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>数据看板</button>
             <button onClick={() => setActiveTab('graph')} className={`font-bold pb-3 border-b-2 whitespace-nowrap px-1 text-[14px] transition-colors ${activeTab === 'graph' ? 'border-blue-600 text-blue-700' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>关系图谱</button>
             <button onClick={() => setActiveTab('automation')} className={`font-bold pb-3 border-b-2 whitespace-nowrap px-1 text-[14px] transition-colors ${activeTab === 'automation' ? 'border-blue-600 text-blue-700' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>自动化规则</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 w-full pt-8 grid grid-cols-1 lg:grid-cols-4 gap-[var(--spacing-md)]">
        
        {/* Left Col: Main List or Kanban */}
        <div className={`lg:col-span-3 space-y-[var(--spacing-md)] ${(activeTab !== 'all') ? 'col-span-1 lg:col-span-4' : ''}`}>
          
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <div className="bg-white p-6 rounded-[20px] shadow-sm border border-[var(--border-color)]">
                    <h4 className="text-[14px] font-bold text-gray-500 mb-1">近期转化线索</h4>
                    <p className="text-3xl font-black text-[var(--text-main)]">384 <span className="text-sm font-bold text-green-500 ml-2">↑ 14%</span></p>
                 </div>
                 <div className="bg-white p-6 rounded-[20px] shadow-sm border border-[var(--border-color)]">
                    <h4 className="text-[14px] font-bold text-gray-500 mb-1">跟进行动次数</h4>
                    <p className="text-3xl font-black text-[var(--text-main)]">1,029 <span className="text-sm font-bold text-blue-500 ml-2">↑ 5%</span></p>
                 </div>
                 <div className="bg-white p-6 rounded-[20px] shadow-sm border border-[var(--border-color)]">
                    <h4 className="text-[14px] font-bold text-gray-500 mb-1">本月合同与开票回款</h4>
                    <p className="text-3xl font-black text-[var(--text-main)]">¥ 1.2M <span className="text-sm font-bold text-emerald-500 ml-2">达标</span></p>
                 </div>
                 <div className="bg-white p-6 rounded-[20px] shadow-sm border border-[var(--border-color)]">
                    <h4 className="text-[14px] font-bold text-gray-500 mb-1">最新客户满意度 (CSAT)</h4>
                    <p className="text-3xl font-black text-indigo-600">4.8 <span className="text-sm font-bold text-indigo-400 ml-1">/ 5.0</span></p>
                 </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                 <div className="lg:col-span-2 bg-white p-6 rounded-[20px] shadow-sm border border-[var(--border-color)]">
                    <div className="flex items-center justify-between mb-6">
                       <h3 className="font-bold text-[16px] text-[var(--text-main)]">近期销售与线索趋势</h3>
                    </div>
                    <div className="h-[300px] w-full">
                       <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
                         <AreaChart data={MOCK_SALES_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                           <defs>
                             <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                               <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                             </linearGradient>
                           </defs>
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                           <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                           <Area type="monotone" dataKey="sales" name="销售额" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                         </AreaChart>
                       </ResponsiveContainer>
                    </div>
                 </div>

                 <div className="bg-white p-6 rounded-[20px] shadow-sm border border-[var(--border-color)]">
                    <h3 className="font-bold text-[16px] text-[var(--text-main)] mb-6">满意度分布</h3>
                    <div className="h-[250px] w-full flex items-center justify-center relative">
                       <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
                         <BarChart layout="vertical" data={CSAT_DATA} margin={{ top: 5, right: 20, left: 20, bottom: 5 }} barSize={16}>
                           <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={false} />
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 'bold' }} width={60} />
                           <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 4px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                           <Bar dataKey="value" radius={[0, 8, 8, 0]} />
                         </BarChart>
                       </ResponsiveContainer>
                    </div>
                    <div className="mt-1 text-center">
                        <button className="text-[12px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full transition-colors">
                           查看完整 CSAT 报表
                        </button>
                    </div>
                 </div>

                 <div className="bg-white p-6 rounded-[20px] shadow-sm border border-[var(--border-color)]">
                    <h3 className="font-bold text-[16px] text-[var(--text-main)] mb-6">客户行业分布</h3>
                    <div className="h-[250px] w-full flex items-center justify-center relative">
                       <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
                         <PieChart>
                           <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                             {PIE_DATA.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                           </Pie>
                           <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 4px rgb(0 0 0 / 0.1)' }} />
                         </PieChart>
                       </ResponsiveContainer>
                       <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-black text-[var(--text-main)]">1.2K</span>
                          <span className="text-xs text-gray-400 font-medium">总客户</span>
                       </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                       {PIE_DATA.map((entry, idx) => (
                         <div key={idx} className="flex items-center text-[12px] font-medium text-gray-600">
                            <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                            {entry.name}
                         </div>
                       ))}
                    </div>
                 </div>
               </div>
               
               <CrmWorkflowBuilder />
            </div>
          )}

          {activeTab === 'all' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div className="flex flex-col mb-4 gap-4">
                  {/* Status Filter Bar */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                     <button 
                       onClick={() => setFilterStatus('全部')}
                       className={`px-3 py-1.5 rounded-full text-[13px] font-bold border transition-colors whitespace-nowrap ${filterStatus === '全部' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                     >
                       全部客户
                     </button>
                     {CUSTOMER_STATUSES.map(status => (
                        <button 
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 rounded-full text-[13px] font-bold border transition-colors whitespace-nowrap ${filterStatus === status ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                        >
                        {status}
                        </button>
                     ))}
                  </div>

                 <div className="flex items-center justify-between">
                   <div className="relative group flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 icon-sm text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input 
                        type="text"
                        placeholder="搜索姓名、公司、标签或 AI 记录..."
                        className="w-full pl-9 pr-4 py-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-[var(--bg-panel)] text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-sm"
                      />
                   </div>
                   <div className="text-[13px] text-[var(--text-muted)] font-medium">
                      筛选出 <span className="font-bold text-[var(--text-main)]">{filteredCustomers.length}</span> 位客户
                   </div>
                 </div>
               </div>

               <div className="bg-[var(--bg-panel)] rounded-[20px] shadow-sm border border-[var(--border-color)] overflow-hidden">
                  <div className="transition-all duration-300">
                    {filteredCustomers.map((cust, idx) => (
                      <div key={idx} onClick={() => { setSelectedCustomer(cust); setEmailDraft(''); setSummary(''); }} className="p-5 border-b border-[var(--border-color)] hover:bg-blue-50/30 transition-colors cursor-pointer group flex items-start gap-[var(--spacing-md)] animate-in fade-in slide-in-from-left-4">
                        <div className="flex items-center self-center mr-2 relative" onClick={(e) => e.stopPropagation()}>
                           <input 
                              type="checkbox" 
                              checked={selectedIds.includes(cust.id)} 
                              onChange={(e) => {
                                if (e.target.checked) setSelectedIds(prev => [...prev, cust.id]);
                                else setSelectedIds(prev => prev.filter(id => id !== cust.id));
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                           />
                        </div>
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden">
                           {cust.level === 'VIP' && <div className="absolute top-0 right-0 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"></div>}
                           <span className="font-black text-blue-700 text-lg">{cust.name[0]}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                 <h3 className="font-bold text-[var(--text-main)] text-[15px] truncate">{cust.name}</h3>
                                 <span className="text-gray-400 text-[13px] font-medium hidden sm:inline-block">/ {cust.company} · {cust.role}</span>
                                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ml-2 ${
                                   cust.status === '活跃' ? 'bg-green-50 text-green-700 border border-green-200' :
                                   cust.status === '流失' ? 'bg-gray-100 text-gray-600 border border-gray-200' :
                                   'bg-blue-50 text-blue-700 border border-blue-200'
                                 }`}>
                                   {cust.status}
                                 </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                 <div className="mr-3 px-2 py-1 rounded bg-blue-50/50 flex items-center border border-blue-100/50" title={`AI评分: ${cust.aiScore}`}>
                                     <Sparkles className="w-3 h-3 text-blue-500 mr-1" />
                                     <span className="font-bold text-blue-700 text-xs">{cust.aiScore}分</span>
                                 </div>
                                 <button className="icon-xl rounded-full hover:bg-blue-100 flex items-center justify-center text-[var(--color-primary)] transition-colors tooltip" title="发起 AI 话术对话">
                                    <MessageCircle className="icon-sm" />
                                 </button>
                                 <button className="icon-xl rounded-full hover:bg-gray-100 flex items-center justify-center text-[var(--text-muted)] transition-colors">
                                    <MoreHorizontal className="icon-sm" />
                                 </button>
                              </div>
                           </div>
                           
                           <div className="mt-2 flex flex-wrap items-center gap-2">
                              {cust.tags.map((tag, t) => (
                                 <span key={t} className="px-2 py-0.5 bg-gray-100 border border-[var(--border-color)] text-gray-600 rounded text-[11px] font-bold">{tag}</span>
                              ))}
                           </div>

                           {cust.source && (
                             <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-blue-700">
                               {cust.source.campaignName && (
                                 <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                                   Campaign: {cust.source.campaignName}
                                 </span>
                               )}
                               {cust.source.sourceChannel && (
                                 <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                                   Source: {cust.source.sourceChannel}
                                 </span>
                               )}
                               {cust.source.landingPage && (
                                 <span className="px-2 py-0.5 rounded bg-gray-50 text-gray-600 border border-gray-100 max-w-[260px] truncate">
                                   Landing: {cust.source.landingPage}
                                 </span>
                               )}
                             </div>
                           )}
                           
                           <div className="mt-3 flex flex-wrap items-center gap-6 text-[12px] font-medium">
                              <div className="flex items-center text-[var(--text-muted)]">
                                 <Activity className="w-3.5 h-3.5 mr-1.5" />
                                 LTV 预估: <span className="text-[var(--text-main)] ml-1 font-bold">{cust.ltv}</span>
                              </div>
                              <div className="flex items-center text-[var(--text-muted)]">
                                 <Clock className="w-3.5 h-3.5 mr-1.5" />
                                 上次触达: {cust.active}
                              </div>
                              {cust.taskDue && (
                                <div className="flex items-center text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded animate-pulse">
                                  <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                                  有跟进任务临期
                                </div>
                              )}
                           </div>
                           
                           <div className={`mt-3 px-3 py-2 rounded-lg text-[12px] font-bold border inline-flex items-center max-w-full ${cust.aiStatus.includes('预警') || cust.aiStatus.includes('需跟进') ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                              <Star className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                              <span className="truncate">{cust.aiStatus}</span>
                           </div>
                        </div>
                      </div>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <div className="py-12 text-center text-gray-400">
                         没有匹配状态的客户档案。
                      </div>
                    )}
                  </div>
                 
                 <div className="p-4 bg-gray-50 border-t border-[var(--border-color)] flex justify-center">
                    <button className="text-[13px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">加载更多客户...</button>
                 </div>
               </div>

               {/* Batch Actions Bar */}
               {selectedIds.length > 0 && (
                 <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-6 animate-in slide-in-from-bottom-5 z-40">
                    <span className="text-sm font-bold">已选择 {selectedIds.length} 项</span>
                    <div className="h-4 w-px bg-gray-700"></div>
                    <button onClick={handleBatchTag} className="text-sm font-bold hover:text-blue-400 transition-colors flex items-center">
                       <Tag className="w-4 h-4 mr-1.5" /> 批量标签
                    </button>
                    <button onClick={handleBatchAssign} className="text-sm font-bold hover:text-blue-400 transition-colors flex items-center">
                       <UsersRound className="w-4 h-4 mr-1.5" /> 批量指派
                    </button>
                    <button onClick={handleBatchDelete} className="text-sm font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center">
                       <AlertCircle className="w-4 h-4 mr-1.5" /> 删除
                    </button>
                 </div>
               )}
               
               {undoHistory && selectedIds.length === 0 && (
                  <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-4 animate-in slide-in-from-bottom-5 z-40">
                     <span className="text-sm font-bold">{undoHistory.action}操作已完成</span>
                     <button onClick={handleUndo} className="text-sm font-bold text-blue-400 hover:text-blue-300 flex items-center">
                        撤销
                     </button>
                  </div>
               )}
             </div>
          )}

          {activeTab === 'kanban' && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-200">
               {STAGES.map(stage => (
                 <div 
                   key={stage}
                   className="bg-gray-50/50 rounded-2xl p-4 border border-[var(--border-color)] min-h-[500px] flex flex-col transition-colors"
                   onDragOver={handleDragOver}
                   onDrop={(e) => handleDrop(e, stage)}
                 >
                    <div className="flex justify-between items-center mb-4 px-2">
                       <h3 className="font-bold text-[14px] text-gray-700">{stage}</h3>
                       <span className="text-[12px] font-bold bg-white text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full shadow-sm">
                          {customers.filter(c => c.stage === stage).length}
                       </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar px-1 pb-2">
                       {customers.filter(c => c.stage === stage).map(cust => (
                          <div 
                            key={cust.id} 
                            draggable 
                            onDragStart={(e) => handleDragStart(e, cust.id)}
                            className={`bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-color)] shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all ${draggedId === cust.id ? 'opacity-50 scale-95' : 'hover:-translate-y-1'}`}
                          >
                             <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                   {cust.level === 'VIP' && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                                   <span className="font-bold text-[13px] text-[var(--text-main)]">{cust.name}</span>
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium">{cust.id}</span>
                             </div>
                             
                             <div className="text-[11px] text-[var(--text-muted)] mb-3">
                                <p className="truncate font-medium">{cust.company} · {cust.role}</p>
                                {cust.source?.campaignName && (
                                  <p className="truncate font-bold text-blue-600 mt-1">
                                    Campaign: {cust.source.campaignName}
                                  </p>
                                )}
                             </div>

                             <div className="flex flex-wrap gap-1.5 mb-3">
                                {cust.tags.slice(0, 2).map((tag, t) => (
                                   <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold truncate max-w-[80px]">{tag}</span>
                                ))}
                                {cust.tags.length > 2 && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">+{cust.tags.length - 2}</span>}
                             </div>

                             <div className="pt-2 border-t border-[var(--border-color)] flex justify-between items-center">
                                <div className="text-[11px] font-bold text-[var(--text-main)]">{cust.ltv}</div>
                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold border truncate max-w-[100px] ${cust.aiStatus.includes('预警') || cust.aiStatus.includes('需跟进') ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                   {cust.aiStatus}
                                </div>
                             </div>
                          </div>
                       ))}
                       {customers.filter(c => c.stage === stage).length === 0 && (
                          <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                             <p className="text-[12px] font-medium">拖拽卡片至此</p>
                          </div>
                       )}
                    </div>
                 </div>
               ))}
             </div>
          )}

          {activeTab === 'team_load' && (
             <TeamLoadView />
          )}

          {activeTab === 'calendar' && (
             <div className="bg-white rounded-[20px] shadow-sm border border-[var(--border-color)] p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="font-bold text-[16px] text-gray-800 flex items-center">
                     <CalendarDays className="w-5 h-5 mr-2 text-blue-500" />
                     {calendarDate.getFullYear()}年{calendarDate.getMonth() + 1}月
                   </h3>
                   <div className="flex items-center gap-2">
                      <button onClick={() => setCalendarDate(new Date(calendarDate.getTime() - 7 * 24 * 3600 * 1000))} className="p-1 px-2 border rounded hover:bg-gray-50 flex items-center">
                         <ChevronLeft className="w-4 h-4 mr-1 text-gray-500" />
                         <span className="text-xs font-bold text-gray-500">上周</span>
                      </button>
                      <button onClick={() => setCalendarDate(new Date())} className="p-1 px-3 border rounded hover:bg-gray-50 text-xs font-bold text-gray-700">今天</button>
                      <button onClick={() => setCalendarDate(new Date(calendarDate.getTime() + 7 * 24 * 3600 * 1000))} className="p-1 px-2 border rounded hover:bg-gray-50 flex items-center">
                         <span className="text-xs font-bold text-gray-500">下周</span>
                         <ChevronRight className="w-4 h-4 ml-1 text-gray-500" />
                      </button>
                   </div>
                </div>

                <div className="grid grid-cols-7 gap-3 mb-2">
                   {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map(d => (
                     <div key={d} className="text-center text-[12px] font-bold text-gray-400">{d}</div>
                   ))}
                </div>
                
                <div className="grid grid-cols-7 gap-3 h-[600px]">
                   {weekDays.map((d, idx) => {
                     const dateStr = d.toISOString().split('T')[0];
                     const dueCasts = customers.filter(c => c.nextFollowUp === dateStr);
                     const isToday = new Date().toISOString().split('T')[0] === dateStr;
                     
                     return (
                       <div 
                         key={idx} 
                         className={`border rounded-xl p-2 flex flex-col h-full bg-gray-50/50 transition-colors ${isToday ? 'border-blue-400 ring-1 ring-blue-400/50 bg-blue-50/20' : 'border-[var(--border-color)]'}`}
                         onDragOver={handleDragOver}
                         onDrop={(e) => handleCalendarDrop(e, dateStr)}
                       >
                          <div className={`text-right text-[12px] font-black mb-2 ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                             {d.getDate()}
                          </div>
                          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                             {dueCasts.map(c => (
                               <div 
                                 key={c.id}
                                 draggable
                                 onDragStart={(e) => handleDragStart(e, c.id)}
                                 className="bg-white p-2 rounded-lg border border-[var(--border-color)] shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300"
                               >
                                  <div className="flex justify-between items-center mb-1">
                                     <span className="font-bold text-[11px] text-[var(--text-main)] truncate">{c.name}</span>
                                     <span className={`w-2 h-2 rounded-full ${c.aiScore > 90 ? 'bg-rose-500' : 'bg-blue-500'}`}></span>
                                  </div>
                                  <p className="text-[10px] text-[var(--text-muted)] truncate">{c.company}</p>
                               </div>
                             ))}
                          </div>
                       </div>
                     )
                   })}
                </div>
                
                <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex space-x-2 overflow-x-auto pb-2 custom-scrollbar">
                   {customers.filter(c => !c.nextFollowUp || new Date(c.nextFollowUp) < new Date(weekDays[0].getTime())).map(c => (
                     <div 
                       key={c.id}
                       draggable
                       onDragStart={(e) => handleDragStart(e, c.id)}
                       className="shrink-0 bg-white px-3 py-2 border border-gray-200 border-dashed rounded-lg flex items-center space-x-2 cursor-grab shadow-sm"
                     >
                        <UserPlus className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-[11px] font-bold text-gray-700">{c.name}</p>
                          <p className="text-[9px] text-gray-400">{c.nextFollowUp ? '已超期' : '待安排'}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          )}

          {activeTab === 'graph' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <CustomerGraph />
             </div>
          )}

          {activeTab === 'automation' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <CrmAutomation />
             </div>
          )}
        </div>

        {/* Right Col: AI Insights */}
        {activeTab === 'all' && (
          <div className="space-y-[var(--spacing-lg)]">
           <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-[20px] p-[var(--spacing-lg)] text-white shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--bg-panel)]/5 rounded-full blur-2xl  "></div>
             <h3 className="font-bold text-[15px] flex items-center mb-4 text-white/90">
                <BarChart2 className="icon-sm mr-2 text-blue-300" />
                AI 经营洞察 (过去 30 天)
             </h3>
             <div className="space-y-[var(--spacing-md)] relative z-10">
                <div>
                  <p className="text-xs text-white/60 mb-1">私域总拉新</p>
                  <div className="flex items-end">
                     <span className="text-2xl font-black">+148</span>
                     <span className="text-xs ml-2 text-green-400 font-bold mb-1 flex items-center">
                        <Activity className="w-3 h-3 mr-0.5" /> 12%
                     </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/60 mb-1">预计流失流失金额</p>
                  <p className="text-lg font-bold text-red-300">¥ 45,200 <span className="text-xs font-normal text-white/50 ml-1">(建议立即跟进)</span></p>
                </div>
             </div>
           </div>

           <div className="bg-[var(--bg-panel)] rounded-[20px] shadow-sm border border-[var(--border-color)] p-5">
              <h3 className="font-bold text-[var(--text-main)] text-[14px] flex items-center mb-4">
                 <Search className="icon-sm mr-2 text-blue-500" />
                 智能跟进建议任务
              </h3>
              <div className="space-y-3">
                 {[
                    { title: '向 12 位沉睡客户发送上新案例', type: '批量邮件', time: '建议今天完成' },
                    { title: '联系 VIP 客户 "王梦璇" 沟通续约续费', type: '微信跟进', time: '明天' },
                    { title: '发送端午节定制贺卡 (由 AI 自动生成)', type: '节假日关怀', time: '本周自动执行' }
                 ].map((task, i) => (
                    <div key={i} className="group p-3 border border-[var(--border-color)] rounded-[var(--radius-lg)] hover:border-blue-300 transition-colors cursor-pointer bg-gray-50/50 hover:bg-blue-50/30">
                       <p className="text-[12px] font-bold text-[var(--text-main)] group-hover:text-blue-700 transition-colors leading-tight">{task.title}</p>
                       <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] bg-gray-200/50 px-2 py-0.5 rounded">{task.type}</span>
                          <span className="text-[10px] text-gray-400 font-medium">{task.time}</span>
                       </div>
                    </div>
                 ))}
                 <button className="w-full py-2.5 mt-2 bg-blue-50 text-[var(--color-primary)] rounded-[var(--radius-lg)] text-xs font-bold hover:bg-blue-100 transition-colors">
                    交由 Agent 全自动执行执行方案
                 </button>
              </div>
           </div>
          </div>
        )}

      </div>

      {/* Customer Detail Overlay */}
      {selectedCustomer && (
         <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)}></div>
            <div className="w-full max-w-[600px] bg-white h-full relative z-10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
               <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-gray-50/50">
                  <div className="flex items-center space-x-3">
                     <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow flex items-center justify-center shrink-0">
                        <span className="font-black text-white text-xl">{selectedCustomer.name[0]}</span>
                     </div>
                     <div>
                        <h2 className="text-xl font-black text-gray-800 flex items-center">
                          {selectedCustomer.name} 
                          <span className="ml-2 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider">{selectedCustomer.level}</span>
                        </h2>
                        <p className="text-[13px] font-medium text-gray-500 mt-0.5">{selectedCustomer.company} · {selectedCustomer.role}</p>
                     </div>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                     <X className="w-5 h-5 text-gray-500" />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                  
                  {/* Basic Insights */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="border border-gray-100 rounded-xl bg-gray-50 p-4">
                        <p className="text-xs text-gray-500 font-bold mb-1 flex items-center"><Activity className="w-3.5 h-3.5 mr-1 text-blue-400" /> AI客户评级</p>
                        <div className="flex items-baseline">
                           <span className="text-3xl font-black text-blue-600">{selectedCustomer.aiScore}</span><span className="text-xs text-gray-400 font-medium ml-1">/100</span>
                        </div>
                     </div>
                     <div className="border border-gray-100 rounded-xl bg-gray-50 p-4">
                        <p className="text-xs text-gray-500 font-bold mb-1 flex items-center"><Star className="w-3.5 h-3.5 mr-1 text-yellow-500" /> 历史 LTV</p>
                        <div className="flex items-baseline">
                           <span className="text-2xl font-black text-gray-800">{selectedCustomer.ltv}</span>
                        </div>
                     </div>
                  </div>

                  {/* AI Toolkit */}
                  <div>
                     <h3 className="text-sm font-black text-gray-800 flex items-center mb-4">
                       <Bot className="w-4 h-4 mr-2 text-indigo-500" />
                       AI 智能增强工具
                     </h3>
                     
                     <MeetingAssistant customerId={selectedCustomer.id} customerName={selectedCustomer.name} />
                     
                     <div className="grid grid-cols-2 gap-3 mb-4">
                        <button 
                          onClick={handleGenerateSummary}
                          disabled={isGeneratingSummary}
                          className="flex flex-col items-start p-4 border border-indigo-100 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-left bg-white group disabled:opacity-50"
                        >
                           <FileText className="w-5 h-5 text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
                           <span className="text-[13px] font-bold text-gray-800">一键沉淀总结</span>
                           <span className="text-[11px] text-gray-500 mt-1">分析近期沟通记录</span>
                        </button>
                        <button 
                          onClick={handleGenerateEmail}
                          disabled={isGeneratingEmail}
                          className="flex flex-col items-start p-4 border border-blue-100 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left bg-white group disabled:opacity-50"
                        >
                           <Mail className="w-5 h-5 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                           <span className="text-[13px] font-bold text-gray-800">草拟定制邮件</span>
                           <span className="text-[11px] text-gray-500 mt-1">根据标签与画像生成</span>
                        </button>
                     </div>

                     {/* Summary Output */}
                     {isGeneratingSummary || summary ? (
                        <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl text-[13px] text-gray-700 leading-relaxed min-h-[100px] mb-4 shadow-inner">
                           {isGeneratingSummary ? (
                             <div className="flex items-center justify-center h-full text-indigo-400 my-4 space-x-2">
                               <Loader2 className="w-4 h-4 animate-spin" />
                               <span className="font-medium animate-pulse">AI 正在深度分析客户互动数据...</span>
                             </div>
                           ) : (
                             <div className="whitespace-pre-wrap font-medium">{summary}</div>
                           )}
                        </div>
                     ) : null}

                     {/* Email Draft Output */}
                     {isGeneratingEmail || emailDraft ? (
                        <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl text-[13px] text-gray-700 leading-relaxed min-h-[140px] shadow-inner">
                           {isGeneratingEmail ? (
                             <div className="flex items-center justify-center h-full text-blue-400 my-6 space-x-2">
                               <RefreshCw className="w-4 h-4 animate-spin" />
                               <span className="font-medium animate-pulse">正在生成专属跟进话术...</span>
                             </div>
                           ) : (
                             <div className="relative group">
                               <div className="whitespace-pre-wrap font-medium">{emailDraft}</div>
                               <button className="absolute top-0 right-0 p-1.5 bg-white border border-gray-200 rounded shadow-sm text-gray-500 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100">
                                  <span className="text-[11px] font-bold mx-1">复制</span>
                               </button>
                             </div>
                           )}
                        </div>
                     ) : null}
                  </div>

                  {/* Customer Tags */}
                  <div>
                    <h3 className="text-sm font-black text-gray-800 mb-3">客户标签库</h3>
                    <div className="flex flex-wrap gap-2">
                       {selectedCustomer.tags.map((tag, t) => (
                         <span key={t} className="px-2.5 py-1 bg-gray-100 border border-[var(--border-color)] text-gray-600 rounded text-[12px] font-bold">{tag}</span>
                       ))}
                       <button className="px-2.5 py-1 border border-dashed border-gray-300 text-gray-400 hover:text-blue-500 hover:border-blue-300 rounded text-[12px] font-bold transition-colors">
                          + 添加标签
                       </button>
                    </div>
                  </div>

                  {selectedCustomer.source && (
                    <div className="border border-blue-100 rounded-xl bg-blue-50/40 p-4">
                      <h3 className="text-sm font-black text-gray-800 mb-3">Campaign Source</h3>
                      <div className="grid grid-cols-1 gap-2 text-[12px]">
                        <div className="flex justify-between gap-3">
                          <span className="font-bold text-gray-500">Campaign ID</span>
                          <span className="font-bold text-gray-800 text-right">{selectedCustomer.source.campaignId ?? '-'}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="font-bold text-gray-500">Campaign Name</span>
                          <span className="font-bold text-gray-800 text-right">{selectedCustomer.source.campaignName ?? '-'}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="font-bold text-gray-500">Source Channel</span>
                          <span className="font-bold text-blue-700 text-right">{selectedCustomer.source.sourceChannel ?? '-'}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="font-bold text-gray-500">Landing Page</span>
                          <span className="font-bold text-gray-800 text-right break-all">{selectedCustomer.source.landingPage ?? '-'}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="font-bold text-gray-500">Touchpoint</span>
                          <span className="font-bold text-gray-800 text-right">{selectedCustomer.source.touchpoint ?? selectedCustomer.source.assetId ?? '-'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Customer Insights and Actions */}
                  <CustomerInsights customerId={selectedCustomer.id} customerName={selectedCustomer.name} />

                  {/* Customer Comments */}
                  <CustomerComments customerId={selectedCustomer.id} />
               </div>
               
               <div className="p-4 border-t border-[var(--border-color)] bg-gray-50 flex justify-end space-x-3">
                 <button className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">记录线下沟通</button>
                 <button className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold shadow hover:bg-blue-700 transition-colors flex items-center">
                    <MessageCircle className="w-4 h-4 mr-2" /> 发起 Agent 对接
                 </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
