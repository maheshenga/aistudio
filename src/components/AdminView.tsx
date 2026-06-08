import React, { useState } from 'react';
import { 
  Settings, 
  Users, 
  Cpu, 
  Folder, 
  Briefcase, 
  ListTodo, 
  Share2, 
  Search,
  MoreVertical,
  Plus,
  ShieldAlert,
  Server,
  Activity,
  Key,
  BarChart3,
  Clock,
  AlertCircle,
  CheckCircle2,
  Zap,
  ToggleRight,
  ToggleLeft,
  Settings2,
  X,
  Bot,
  RefreshCw,
  CreditCard,
  LineChart,
  Megaphone,
  Box,
  TrendingUp,
  Download,
  Terminal,
  Upload,
  Lock,
  Mail,
  Database,
  Eye,
  History
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from './Toast';

export function AdminView() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', icon: BarChart3, label: '数据总览' },
    { id: 'settings', icon: Settings, label: '系统设置' },
    { id: 'saas_plans', icon: CreditCard, label: 'SaaS套餐管理' },
    { id: 'members', icon: Users, label: '会员管理' },
    { id: 'roles', icon: Key, label: '权限与角色控制' },
    { id: 'providers', icon: Cpu, label: 'AI服务商管理' },
    { id: 'sales', icon: LineChart, label: '财务与销售' },
    { id: 'database', icon: Database, label: '数据库与云存储' },
    { id: 'announcements', icon: Megaphone, label: '公告通知管理' },
    { id: 'plugins', icon: Box, label: '插件与扩展' },
    { id: 'logs', icon: Terminal, label: '系统日志审计' },
    { id: 'tickets', icon: Activity, label: '工单与反馈管理' },
    { id: 'agency', icon: Briefcase, label: '分销与代理商' },
    { id: 'risk', icon: ShieldAlert, label: '内容风控与审计' },
    { id: 'assets', icon: Folder, label: '素材管理' },
    { id: 'projects', icon: Briefcase, label: '作品管理' },
    { id: 'tasks', icon: ListTodo, label: '任务管理' },
    { id: 'media', icon: Share2, label: '媒体账号管理' },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[var(--bg-app)]">
      <div className="w-64 bg-[var(--bg-panel)] border-r border-[var(--border-color)] shadow-sm flex flex-col flex-shrink-0 relative z-10">
        <div className="p-5 border-b border-[var(--border-color)] bg-gray-50/50">
          <div className="flex items-center space-x-2 text-blue-700 font-bold">
            <ShieldAlert className="icon-md" />
            <span>后台管理中心</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">全局系统及业务数据配置</p>
        </div>
        <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <ul className="space-y-1 px-3">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-[var(--radius-lg)] text-[15px] transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-gray-600 font-medium hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className={`w-[18px] h-[18px] mr-3 ${activeTab === tab.id ? 'text-[var(--color-primary)]' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-panel)]">
          <div className="bg-green-50 rounded-lg p-3 flex items-start space-x-3">
            <Server className="icon-md text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-green-800">集群状态正常</p>
              <p className="text-[10px] text-green-600 mt-0.5">节点 12/12 正常运行</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-[var(--spacing-xl)] max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <AdminDashboard setActiveTab={setActiveTab} />}
          {activeTab === 'settings' && <AdminSettings />}
          {activeTab === 'saas_plans' && <AdminSaasPlans />}
          {activeTab === 'members' && <AdminMembers />}
          {activeTab === 'roles' && <AdminRoles />}
          {activeTab === 'providers' && <AdminProviders />}
          {activeTab === 'sales' && <AdminSales />}
          {activeTab === 'database' && <AdminDatabase />}
          {activeTab === 'announcements' && <AdminAnnouncements />}
          {activeTab === 'plugins' && <AdminPlugins />}
          {activeTab === 'logs' && <AdminLogs />}
          {activeTab === 'tickets' && <AdminTickets />}
          {activeTab === 'agency' && <AdminAgency />}
          {activeTab === 'risk' && <AdminRisk />}
          {activeTab === 'assets' && <AdminAssets />}
          {activeTab === 'projects' && <AdminProjects />}
          {activeTab === 'tasks' && <AdminTasks />}
          {activeTab === 'media' && <AdminMedia />}
        </div>
      </div>
    </div>
  );
}

function AdminDatabase() {
  const [isBackuping, setIsBackuping] = useState(false);

  const handleBackup = () => {
    setIsBackuping(true);
    setTimeout(() => {
      setIsBackuping(false);
      toast('系统冷备快照 (SQL Dump) 已成功生成并推送到 S3', 'success');
    }, 2000);
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">数据库与云存储 (Database & CDN)</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">云端 Postgres 实例状态、S3 对象存储与自动快照</p>
         </div>
         <div className="flex space-x-2">
           <button onClick={handleBackup} disabled={isBackuping} className="flex items-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm disabled:opacity-50">
             {isBackuping ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div> : <Database className="icon-sm" />}
             <span>{isBackuping ? '正在生成快照...' : '一键生成冷备快照'}</span>
           </button>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
         <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-6">
            <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-[var(--spacing-md)] flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span> PostgreSQL DB (Primary)</h3>
            <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-sm mb-1 font-bold">
                     <span className="text-gray-600">总存储 (Allocated Storage)</span>
                     <span className="text-[var(--text-main)]">42% (104GB / 250GB)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                     <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '42%' }}></div>
                  </div>
               </div>
               <div>
                  <div className="flex justify-between text-sm mb-1 font-bold">
                     <span className="text-gray-600">写入 IOPS (Write IOPS)</span>
                     <span className="text-[var(--text-main)]">8% (234 / 3000)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                     <div className="bg-blue-500 h-2 rounded-full" style={{ width: '8%' }}></div>
                  </div>
               </div>
            </div>
            <div className="mt-6 flex justify-between items-center text-[12px] text-[var(--text-muted)] font-mono border-t border-gray-100 pt-4">
               <span>实例 ID: db-eu-central-1-prod</span>
               <span>最后备份: 2 小时前</span>
            </div>
         </div>

         <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-6">
            <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-[var(--spacing-md)] flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span> AWS S3 Bucket (Assets CDN)</h3>
            <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-sm mb-1 font-bold">
                     <span className="text-gray-600">已使用容量 (Object Storage)</span>
                     <span className="text-[var(--text-main)]">1.2 TB</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                     <div className="bg-purple-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                  </div>
               </div>
               <div>
                  <div className="flex justify-between text-sm mb-1 font-bold">
                     <span className="text-gray-600">当月流出流量 (Transfer Out)</span>
                     <span className="text-[var(--text-main)]">4.5 TB / 10 TB</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                     <div className="bg-orange-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                  </div>
               </div>
            </div>
            <div className="mt-6 flex justify-between items-center text-[12px] text-[var(--text-muted)] font-mono border-t border-gray-100 pt-4">
               <span>Bucket: prod-user-assets-global</span>
               <span>地区: eu-central-1</span>
            </div>
         </div>
       </div>
    </div>
  );
}

function AdminDashboard({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">系统控制台大盘</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">全局核心业务数据概览与快速入口</p>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)] mb-[var(--spacing-md)]">
         {[
           { label: '系统健康度 (System Health)', value: '99.98%', sub: '所有服务正常运作', color: 'text-emerald-600' },
           { label: '实时活跃会话 (Active Sessions)', value: '2,482', sub: '当前在线', color: 'text-blue-600' },
           { label: '今日 Tokens量', value: '1.28M', sub: '全模型汇总', color: 'text-purple-600' },
           { label: '当前在线节点', value: '12 / 12', sub: '健康运行中', color: 'text-emerald-600' },
         ].map((s, i) => (
           <div key={i} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">{s.label}</p>
              <div className="flex items-end mb-1">
                 <p className="text-2xl font-bold text-[var(--text-main)]">{s.value}</p>
              </div>
              <p className={`text-[11px] font-bold ${s.color}`}>{s.sub}</p>
           </div>
         ))}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
         <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] md:col-span-2">
            <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-[var(--spacing-md)]">日常用户活跃趋势 (Daily User Activity)</h3>
            <div className="h-64 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={[
                   { time: '08:00', activeUsers: 300 },
                   { time: '10:00', activeUsers: 1200 },
                   { time: '12:00', activeUsers: 1400 },
                   { time: '14:00', activeUsers: 1800 },
                   { time: '16:00', activeUsers: 2400 },
                   { time: '18:00', activeUsers: 2100 },
                   { time: '20:00', activeUsers: 1500 },
                 ]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                   <defs>
                     <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                   <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                   <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                   <Area type="monotone" dataKey="activeUsers" name="活跃用户数" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                 </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)]">
            <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-[var(--spacing-md)] flex justify-between items-center">
              <span>近期风险及工单预警</span>
              <button className="text-xs text-[var(--color-primary)] hover:underline" onClick={() => setActiveTab('tickets')}>全部发现</button>
            </h3>
            <div className="space-y-3">
              {[
                  { id: 'TKT-001', type: '账单及退款', stat: '待处理', time: '10 分钟前', priority: 'High' },
                  { id: 'RSK-992', type: '涉黄违规拦截', stat: '待人工确认', time: '1 小时前', priority: 'High' },
                  { id: 'HTR-112', type: '异常高频调用', stat: '已冻结', time: '2 小时前', priority: 'Medium' },
              ].map((t, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                     <div className="flex items-center space-x-3">
                       <span className="text-[12px] font-bold text-[var(--color-primary)] w-24 truncate">{t.type}</span>
                       <span className="text-[11px] text-[var(--text-muted)] font-mono">{t.id}</span>
                     </div>
                     <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${t.stat.includes('待') ? 'text-red-500 bg-red-50 border-red-100 animate-pulse' : 'text-gray-500 bg-gray-100 border-gray-200'}`}>
                       {t.stat}
                     </span>
                  </div>
              ))}
            </div>
         </div>
         <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)]">
            <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-[var(--spacing-md)]">快捷管理操作</h3>
            <div className="grid grid-cols-2 gap-3">
               <button onClick={() => setActiveTab('announcements')} className="p-4 flex flex-col items-center justify-center border border-[var(--border-color)] rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-gray-700 hover:text-blue-700">
                  <Megaphone className="icon-md mb-2" />
                  <span className="text-[13px] font-bold">发布新公告</span>
               </button>
               <button onClick={() => setActiveTab('members')} className="p-4 flex flex-col items-center justify-center border border-[var(--border-color)] rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-gray-700 hover:text-blue-700">
                  <Users className="icon-md mb-2" />
                  <span className="text-[13px] font-bold">邀请新租户</span>
               </button>
               <button onClick={() => setActiveTab('saas_plans')} className="p-4 flex flex-col items-center justify-center border border-[var(--border-color)] rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-gray-700 hover:text-blue-700">
                  <CreditCard className="icon-md mb-2" />
                  <span className="text-[13px] font-bold">配置定价表</span>
               </button>
               <button onClick={() => setActiveTab('logs')} className="p-4 flex flex-col items-center justify-center border border-[var(--border-color)] rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-gray-700 hover:text-blue-700">
                  <Terminal className="icon-md mb-2" />
                  <span className="text-[13px] font-bold">查询审计日志</span>
               </button>
            </div>
         </div>
       </div>
    </div>
  );
}

function AdminSettings() {
  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">全局系统设置</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">管理系统核心参数和安全策略</p>
        </div>
        <button className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm">
          保存所有配置
        </button>
      </div>

      <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-xl)] space-y-8">
        <div>
          <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-4">基本信息配置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">系统名称</label>
              <input type="text" defaultValue="AI 创作工作台" className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50 text-[15px]" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">系统备案号</label>
              <input type="text" defaultValue="京ICP备2023xxxxxx号" className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50 text-[15px]" />
            </div>
          </div>
        </div>
        
        <hr className="border-[var(--border-color)]" />
        
        <div>
          <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-4">用户与配额策略</h3>
          <div className="space-y-[var(--spacing-md)]">
            <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50/50">
               <div>
                 <p className="font-bold text-[var(--text-main)] text-[15px]">新用户默认赠送算力</p>
                 <p className="text-xs text-[var(--text-muted)] mt-1">注册成功后免费赠送的体验额度</p>
               </div>
               <div className="flex items-center">
                 <input type="number" defaultValue="5000" className="w-32 px-3 py-2 border border-[var(--border-color)] rounded-lg text-center font-bold bg-white" />
                 <span className="hidden lg:inline-block text-sm text-[var(--text-muted)] ml-2">Tokens</span>
               </div>
            </div>
            <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50/50">
               <div>
                 <p className="font-bold text-[var(--text-main)] text-[15px]">允许公共注册 (Open Signup)</p>
                 <p className="text-xs text-[var(--text-muted)] mt-1">关闭后仅能通过邀请码或管理员后台添加用户</p>
               </div>
               <label className="relative inline-flex items-center cursor-pointer">
                 <input type="checkbox" className="sr-only peer" defaultChecked />
                 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--bg-panel)] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
               </label>
            </div>
          </div>
        </div>

        <hr className="border-[var(--border-color)]" />

        <div>
          <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-4">安全与合规策略 (Security Policies)</h3>
          <div className="space-y-[var(--spacing-md)]">
            <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50/50">
               <div>
                 <p className="font-bold text-[var(--text-main)] text-[15px] flex items-center">强制全员开启二次验证 (2FA Enforcement)</p>
                 <p className="text-xs text-[var(--text-muted)] mt-1">要求所有拥有后台访问权限的用户绑定 Authenticator App</p>
               </div>
               <label className="relative inline-flex items-center cursor-pointer">
                 <input type="checkbox" className="sr-only peer" />
                 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--bg-panel)] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
               </label>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50/50">
               <div>
                 <p className="font-bold text-[var(--text-main)] text-[15px]">后台会话超时自动注销 (Session Timeout)</p>
                 <p className="text-xs text-[var(--text-muted)] mt-1">设定管理后台在无操作时自动登出的时长</p>
               </div>
               <div className="flex flex-wrap gap-2">
                 <select className="px-3 py-1.5 border border-gray-200 rounded lg text-[13px] font-bold text-gray-700 bg-white outline-none" defaultValue="30">
                    <option value="15">15 分钟</option>
                    <option value="30">30 分钟</option>
                    <option value="60">1 小时</option>
                    <option value="1440">永不超时 (不安全)</option>
                 </select>
               </div>
            </div>
            <div className="mt-4 flex justify-end">
                <button className="text-[13px] text-red-600 font-bold hover:text-red-700 underline decoration-red-200 underline-offset-4 decoration-2">
                   紧急注销所有当前在线会话 (Kill all sessions)
                </button>
            </div>
          </div>
        </div>

        <hr className="border-[var(--border-color)]" />

        <div>
          <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-4">SMTP 邮件服务配置 (Email Service)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">SMTP 服务器地址</label>
              <input type="text" defaultValue="smtp.sendgrid.net" className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-[15px]" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">SMTP 端口</label>
              <input type="number" defaultValue="587" className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-[15px]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">发送者邮箱 (From Address)</label>
              <input type="email" defaultValue="noreply@ai-studio.auth" className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-[15px]" />
            </div>
          </div>
          <button className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 rounded-lg text-sm font-bold transition-colors">
             一键测试发送连接
          </button>
        </div>

        <hr className="border-[var(--border-color)]" />

        <div>
          <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-4">聚合支付网关 (Payment Gateways)</h3>
          <div className="space-y-[var(--spacing-md)]">
            <div className="p-4 border border-[var(--border-color)] rounded-[var(--radius-lg)] bg-gray-50/50">
               <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                 <div>
                   <p className="font-bold text-[var(--text-main)] text-[15px] flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span> Stripe (全球信用卡与外币结算)</p>
                   <p className="text-xs text-[var(--text-muted)] mt-1">支持 USD, EUR, GBP等货币扣款与循环订阅</p>
                 </div>
                 <button className="px-4 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 rounded text-sm font-bold transition-colors">验证密钥</button>
               </div>
               <div className="space-y-3">
                  <div>
                    <label className="block text-[12px] font-bold text-gray-500 mb-1">Publishable Key</label>
                    <input type="text" defaultValue="pk_live_************************" className="w-full px-3 py-2 border border-[var(--border-color)] rounded bg-white text-sm font-mono text-gray-600 outline-none focus:border-blue-500 max-w-lg" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-gray-500 mb-1">Secret Key / Webhook Signing Secret</label>
                    <input type="password" defaultValue="sk_live_************************" className="w-full px-3 py-2 border border-[var(--border-color)] rounded bg-white text-sm font-mono text-gray-600 outline-none focus:border-blue-500 max-w-lg" />
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminMembers() {
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [bulkHistory, setBulkHistory] = useState([
    { id: '1', action: 'Imported users via CSV (批量导入)', count: 12, time: '10 分钟前', status: 'Success' },
    { id: '2', action: 'Suspended inactive accounts (停用闲置)', count: 3, time: '2 小时前', status: 'Success' }
  ]);

  const mockUsers = [
    { id: 1, name: 'Maheshenga', email: 'maheshenga@gmail.com', role: 'Admin', dept: 'Engineering', status: 'Active', date: '2023-01-10' },
    { id: 2, name: '云端创客', email: 'creator@yun.com', role: 'Contributor', dept: 'Marketing', status: 'Active', date: '2024-02-15' },
    { id: 3, name: 'Design Studio', email: 'hello@ds.studio', role: 'Manager', dept: 'Design', status: 'Inactive', date: '2024-03-20' },
    { id: 4, name: '个人开发者', email: 'dev@outlook.com', role: 'Contributor', dept: 'Sales', status: 'Active', date: '2024-05-11' },
  ];

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedUsers(mockUsers.map(u => u.id));
    else setSelectedUsers([]);
  };

  const handleSelectUser = (id: number) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]);
  };

  const handleBulkAction = (action: string) => {
     if (selectedUsers.length === 0) return toast('请先选择用户', 'info');
     toast(`已对 ${selectedUsers.length} 名用户执行 [${action}] 操作`, 'success');
     setBulkHistory([{ id: Date.now().toString(), action, count: selectedUsers.length, time: '刚刚', status: 'Success' }, ...bulkHistory]);
     setSelectedUsers([]);
  };

  const handleImportCSV = () => {
     setIsImporting(true);
     setTimeout(() => {
        setIsImporting(false);
        toast('成功导入 12 名新成员并发送邀请邮件', 'success');
        setBulkHistory([{ id: Date.now().toString(), action: 'Imported users via CSV', count: 12, time: '刚刚', status: 'Success' }, ...bulkHistory]);
     }, 1500);
  };

  const handleRevert = (id: string) => {
     setBulkHistory(prev => prev.map(h => h.id === id ? { ...h, status: 'Reverted' } : h));
     toast('已成功撤销该批量操作 (Bulk action reverted)', 'success');
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">团队成员批量管理</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">全局用户数据、部门分配与状态管理</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={handleImportCSV} disabled={isImporting} className="flex items-center space-x-2 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm disabled:opacity-50">
            {isImporting ? <div className="w-4 h-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin"></div> : <Upload className="icon-sm" />}
            <span>{isImporting ? '导入中...' : 'CSV 批量导入'}</span>
          </button>
          <button onClick={() => toast('激活邮件(Email Invite)批量发送成功', 'success')} className="flex items-center space-x-2 bg-[#F3F4F6] text-gray-700 border border-gray-200 hover:bg-gray-200 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm">
            <Mail className="icon-sm" />
            <span>发送 Email 邀请</span>
          </button>
          <button className="flex items-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm">
            <Plus className="icon-sm" />
            <span>添加成员</span>
          </button>
        </div>
      </div>

      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between flex-wrap gap-4">
           <div className="relative">
             <Search className="icon-sm absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="搜索手机号、邮箱或姓名..." className="pl-9 pr-4 py-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] w-72 bg-gray-50 focus:bg-[var(--bg-panel)] focus:ring-2 focus:ring-blue-500 outline-none text-[15px]" />
           </div>
           
           {selectedUsers.length > 0 && (
             <div className="flex items-center space-x-2 bg-blue-50 border border-blue-100 rounded-[var(--radius-md)] px-3 py-2">
                <span className="text-[13px] font-bold text-blue-700 mx-2">已选择 {selectedUsers.length} 项</span>
                <button onClick={() => handleBulkAction('批量启用')} className="px-3 py-1 bg-white border border-gray-200 rounded text-[13px] font-bold text-gray-700 hover:bg-gray-50">批量启用</button>
                <button onClick={() => handleBulkAction('批量停用')} className="px-3 py-1 bg-white border border-gray-200 rounded text-[13px] font-bold text-red-600 hover:bg-gray-50">批量停用</button>
                <select onChange={(e) => handleBulkAction(`分配部门至 ${e.target.value}`)} className="px-3 py-1 bg-white border border-gray-200 rounded text-[13px] font-bold text-gray-700 hover:bg-gray-50 outline-none" defaultValue="">
                    <option value="" disabled>分配部门...</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Design">Design</option>
                </select>
             </div>
           )}
           
           {!selectedUsers.length && (
               <select className="border border-[var(--border-color)] rounded-[var(--radius-lg)] px-4 py-2 text-[15px] bg-[var(--bg-panel)] font-medium outline-none">
                  <option>全部部门</option>
                  <option>Engineering</option>
                  <option>Marketing</option>
                  <option>Sales</option>
               </select>
           )}
        </div>
        <table className="w-full text-left flex-1">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">
              <th className="py-4 px-6 w-12">
                 <input type="checkbox" checked={selectedUsers.length === mockUsers.length} onChange={handleSelectAll} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
              </th>
              <th className="py-4 px-6">用户信息</th>
              <th className="py-4 px-6">部门 (分配)</th>
              <th className="py-4 px-6">状态</th>
              <th className="py-4 px-6">系统角色</th>
              <th className="py-4 px-6 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mockUsers.map((usr, i) => (
              <tr key={i} className={`hover:bg-gray-50/50 ${selectedUsers.includes(usr.id) ? 'bg-blue-50/30' : ''}`}>
                <td className="py-4 px-6">
                   <input type="checkbox" checked={selectedUsers.includes(usr.id)} onChange={() => handleSelectUser(usr.id)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">{usr.name.charAt(0)}</div>
                    <div>
                      <p className="font-bold text-[var(--text-main)] text-[15px]">{usr.name}</p>
                      <p className="text-xs text-[var(--text-muted)] font-medium">{usr.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 font-medium text-gray-600 text-[14px]">
                  {usr.dept}
                </td>
                <td className="py-4 px-6">
                  <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${
                    usr.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                  }`}>{usr.status === 'Active' ? '可用 (Active)' : '停用 (Inactive)'}</span>
                </td>
                <td className="py-4 px-6 text-[13px] text-indigo-700 font-bold bg-indigo-50/30">
                  <span className="flex items-center"><Key className="w-3 h-3 mr-1" />{usr.role}</span>
                </td>
                <td className="py-4 px-6 text-right space-x-3">
                  <button className="text-[var(--color-primary)] font-bold hover:text-blue-800 text-[14px]">编辑配置</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden p-6">
        <h3 className="text-[16px] flex items-center font-bold text-[var(--text-main)] mb-4"><History className="w-5 h-5 mr-2 text-blue-500" /> 批量操作历史与回滚 (Bulk Operation History)</h3>
        <div className="space-y-3">
          {bulkHistory.map(history => (
            <div key={history.id} className="flex flex-wrap items-center justify-between p-4 rounded-[16px] bg-gray-50 border border-gray-100/50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col">
                <span className="font-bold text-[14px] text-gray-800 flex items-center">
                  {history.action}
                  {history.status === 'Reverted' && <span className="ml-2 px-2.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-bold">已撤销 (Reverted)</span>}
                  {history.status === 'Success' && <span className="ml-2 px-2.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-bold">成功执行</span>}
                </span>
                <span className="text-xs text-gray-500 mt-1">影响人数：<strong className="text-blue-600">{history.count}</strong> 人 • 时间：{history.time}</span>
              </div>
              <div>
                <button
                  disabled={history.status === 'Reverted'}
                  onClick={() => handleRevert(history.id)}
                  className="px-4 py-1.5 bg-white border border-gray-200 text-gray-700 text-[13px] font-bold rounded-[10px] hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-700 disabled:hover:border-gray-200 transition-all shadow-sm"
                >
                  {history.status === 'Reverted' ? '无法再次操作' : '一键撤销 (Revert Batch)'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminRoles() {
    const roles = [
      { id: 'admin', name: 'Admin (超级管理员)', desc: '完全系统访问权限，可调整账单与人员管理。', permissions: ['All Modules', 'Settings', 'Billing', 'User Management'] },
      { id: 'manager', name: 'Manager (部门主管)', desc: '管理所属部门员工与作品审核，无法访问财务配置。', permissions: ['Projects', 'Team Content', 'Approvals', 'Task Center'] },
      { id: 'contributor', name: 'Contributor (执行成员)', desc: '仅限访问个人工作空间、素材和 AI 编辑器。', permissions: ['Personal Projects', 'Assets', 'AI Assistants'] }
    ];

    const modules = [
      { key: 'dashboard', label: 'Dashboard & Reports (数据报表)' },
      { key: 'billing', label: 'Billing & Settings (系统设置与财务)' },
      { key: 'users', label: 'User Management (人员与权限管理)' },
      { key: 'finance', label: 'Finance Engine (财务核心结算)' },
      { key: 'tax', label: 'Tax Compliances (全球税务验证)' },
      { key: 'crm', label: 'CRM Hub (客户关系与通讯)' },
      { key: 'projects_all', label: 'All Projects (所有项目浏览与修改)' },
      { key: 'projects_own', label: 'Personal Projects (个人创作空间)' },
      { key: 'assets', label: 'Global Assets (全局素材库)' }
    ];

    const [roleMapping, setRoleMapping] = useState<Record<string, string[]>>({
        'admin': ['dashboard', 'billing', 'users', 'finance', 'tax', 'crm', 'projects_all', 'projects_own', 'assets'],
        'manager': ['dashboard', 'crm', 'projects_all', 'projects_own', 'assets'],
        'contributor': ['projects_own', 'assets']
    });

    const [simulatedRole, setSimulatedRole] = useState<string | null>(null);

    const togglePermission = (roleId: string, moduleKey: string) => {
        setRoleMapping(prev => {
            const currentPerms = prev[roleId];
            if (currentPerms.includes(moduleKey)) {
                return { ...prev, [roleId]: currentPerms.filter(k => k !== moduleKey) };
            } else {
                return { ...prev, [roleId]: [...currentPerms, moduleKey] };
            }
        });
    };

    const handleSaveMatrix = () => {
        toast('权限控制矩阵 (Access Control Matrix) 已更新', 'success');
    };

    const renderSimulation = () => {
        if (!simulatedRole) return null;
        const role = roles.find(r => r.id === simulatedRole);
        if (!role) return null;
        const perms = roleMapping[simulatedRole] || [];

        return (
            <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl animate-in fade-in">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h4 className="flex items-center text-blue-900 font-bold text-lg"><Eye className="w-5 h-5 mr-2" /> 角色权限模拟 (Simulate Role)</h4>
                        <p className="text-sm text-blue-700 mt-1">当前模拟身份: {role.name}。以下是该角色在当前策略下的实际应用界面可见性。</p>
                    </div>
                    <button onClick={() => setSimulatedRole(null)} className="text-blue-500 hover:text-blue-700"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                    {modules.map(mod => {
                        const hasAccess = perms.includes(mod.key);
                        return (
                            <div key={mod.key} className={`px-4 py-2 rounded-xl flex items-center shadow-sm ${hasAccess ? 'bg-white border text-blue-800 border-blue-200' : 'bg-gray-100 border text-gray-400 border-gray-200 opacity-60'}`}>
                                {hasAccess ? <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> : <Lock className="w-4 h-4 mr-2 text-gray-400" />}
                                <span className={hasAccess ? 'font-bold' : ''}>{mod.label}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    };

    return (
        <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="flex justify-between items-center">
             <div>
               <h2 className="text-xl font-bold text-[var(--text-main)]">系统角色与权限控制 (Access Control)</h2>
               <p className="text-sm text-[var(--text-muted)] mt-1">管理各阶层的系统模块访问与数据可见性</p>
             </div>
             <button className="flex items-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm">
               <Plus className="icon-sm" />
               <span>新建自定义角色</span>
             </button>
           </div>
           
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-4">
                 <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest px-2">系统级防篡改角色</h3>
                 {roles.map(r => (
                     <div key={r.id} className="p-5 rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-panel)] shadow-sm hover:border-blue-300 cursor-pointer transition-all">
                        <div className="flex items-center space-x-2 mb-3">
                            <Lock className="w-5 h-5 text-blue-500" />
                            <h4 className="font-bold text-[var(--text-main)] text-[16px]">{r.name}</h4>
                        </div>
                        <p className="text-[13px] text-gray-500 mb-4 leading-relaxed">{r.desc}</p>
                        <div className="flex flex-wrap gap-2">
                            {r.permissions.map(p => (
                                <span key={p} className="text-[11px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md font-bold">{p}</span>
                            ))}
                        </div>
                     </div>
                 ))}
              </div>
              <div className="lg:col-span-2 bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-6 overflow-hidden">
                 <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-6 border-b border-gray-100 pb-4">系统模块视图授权矩阵</h3>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="py-3 px-2 text-[12px] font-bold text-gray-400 uppercase tracking-widest">App Module</th>
                                {roles.map(r => (
                                    <th key={r.id} className="py-3 px-2 text-center text-[12px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50/50 rounded-t-lg">{r.name.split(' ')[0]}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {modules.map(mod => (
                                <tr key={mod.key} className="hover:bg-gray-50/50">
                                    <td className="py-4 px-2 text-[14px] font-bold text-[var(--text-main)]">{mod.label}</td>
                                    {roles.map(r => {
                                        const hasAccess = roleMapping[r.id].includes(mod.key);
                                        return (
                                            <td key={r.id} onClick={() => togglePermission(r.id, mod.key)} className={`py-4 px-2 text-center cursor-pointer transition-colors ${hasAccess ? 'bg-emerald-50/30 hover:bg-emerald-100/50' : 'hover:bg-gray-100/80'}`}>
                                                {hasAccess ? (
                                                    <CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" />
                                                ) : (
                                                    <X className="w-4 h-4 mx-auto text-gray-300" />
                                                )}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
                 {renderSimulation()}
                 <div className="mt-8 flex justify-between items-center">
                     <select onChange={(e) => setSimulatedRole(e.target.value)} value={simulatedRole || ''} className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-[13px] font-bold text-gray-700 outline-none hover:bg-gray-50 focus:ring-2 focus:ring-blue-100">
                         <option value="">+ 模拟测试 (Simulate Role)...</option>
                         {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                     </select>
                     <button onClick={handleSaveMatrix} className="px-6 py-2.5 bg-blue-50 text-blue-700 font-bold text-[14px] rounded-xl hover:bg-blue-100 transition-colors border border-blue-200">
                         保存策略矩阵
                     </button>
                 </div>
              </div>
           </div>
        </div>
    );
}

function AdminProviders() {
  const [providerTab, setProviderTab] = useState<'list' | 'models'>('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProviderPlatform, setNewProviderPlatform] = useState('OpenAI');
  const [newProviderKey, setNewProviderKey] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedModels, setDetectedModels] = useState<string[]>([]);
  const [providers, setProviders] = useState([
    { name: 'Google Cloud Vertex AI', status: '健康', latency: '120ms', models: ['Gemini 3.1 Pro', 'Gemini 1.5 Flash', 'Imagen 3'], balance: '预付费 / 平台包年协议', enabled: true, isDefault: true },
    { name: 'OpenAI API', status: '限流中', latency: '850ms', models: ['GPT-4o', 'DALL-E 3', 'TTS-1'], balance: '$120.45', enabled: true, isDefault: false },
    { name: 'Anthropic', status: '健康', latency: '350ms', models: ['Claude 3.5 Sonnet', 'Claude 3 Opus'], balance: '$45.00', enabled: true, isDefault: false },
    { name: 'HeyGen Video API', status: '健康', latency: '1200ms', models: ['Avatar Gen', 'Sync Audio'], balance: '专业版无限', enabled: true, isDefault: false },
    { name: 'Azure OpenAI', status: '休眠', latency: '--', models: ['GPT-4o', 'GPT-4o-mini'], balance: '按量计费', enabled: false, isDefault: false },
  ]);

  const handleDetectModels = () => {
    if (!newProviderKey) return;
    setIsDetecting(true);
    // Simulate API call for auto-detection
    setTimeout(() => {
      if (newProviderPlatform === 'OpenAI') {
        setDetectedModels(['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo', 'dall-e-3', 'tts-1']);
      } else if (newProviderPlatform === 'Anthropic') {
        setDetectedModels(['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku']);
      } else {
        setDetectedModels(['model-a', 'model-b', 'model-c']);
      }
      setIsDetecting(false);
    }, 1200);
  };

  const handleAddProvider = () => {
    if (detectedModels.length === 0) return;
    setProviders([
      {
        name: newProviderPlatform + ' (Custom)',
        status: '健康',
        latency: '--',
        models: detectedModels.slice(0, 3).concat(detectedModels.length > 3 ? '...' : []),
        balance: '按量计费',
        enabled: true,
        isDefault: false
      },
      ...providers
    ]);
    setShowAddModal(false);
    setNewProviderKey('');
    setDetectedModels([]);
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">AI 服务商管理</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">配置上游 LLM 和生图生视频 API 密钥池与路由策略</p>
        </div>
        <div className="flex space-x-3">
           <button className="flex items-center space-x-2 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm">
             <Settings2 className="icon-sm" />
             <span>路由策略</span>
           </button>
           <button onClick={() => setShowAddModal(true)} className="flex items-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm">
             <Plus className="icon-sm" />
             <span>添加模型服务</span>
           </button>
        </div>
      </div>

      <div className="flex bg-gray-100 p-1 rounded-[var(--radius-lg)] w-fit mb-4">
        <button 
          onClick={() => setProviderTab('list')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${providerTab === 'list' ? 'bg-[var(--bg-panel)] text-blue-700 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
        >
          服务商列表
        </button>
        <button 
          onClick={() => setProviderTab('models')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${providerTab === 'models' ? 'bg-[var(--bg-panel)] text-blue-700 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
        >
          已启用模型管理
        </button>
      </div>

      {providerTab === 'list' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)] mb-[var(--spacing-md)]">
             <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm">
                <div className="flex items-center text-[var(--text-muted)] mb-2">
                   <Activity className="icon-sm mr-2" />
                   <span className="text-xs font-bold uppercase tracking-widest">今日调用总数</span>
                </div>
                <p className="text-2xl font-bold text-[var(--text-main)]">1.28M</p>
                <p className="text-[11px] font-medium text-green-600 mt-1 flex items-center">↑ 12% 较昨日同时段</p>
             </div>
             <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm">
                <div className="flex items-center text-[var(--text-muted)] mb-2">
                   <Clock className="icon-sm mr-2" />
                   <span className="text-xs font-bold uppercase tracking-widest">平均响应延迟</span>
                </div>
                <p className="text-2xl font-bold text-[var(--text-main)]">420<span className="text-sm text-[var(--text-muted)] ml-1">ms</span></p>
                <p className="text-[11px] font-medium text-[var(--text-muted)] mt-1">全局动态负载均衡中</p>
             </div>
             <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm">
                <div className="flex items-center text-[var(--text-muted)] mb-2">
                   <AlertCircle className="icon-sm mr-2" />
                   <span className="text-xs font-bold uppercase tracking-widest">API 错误率</span>
                </div>
                <p className="text-2xl font-bold text-[var(--text-main)]">0.15%</p>
                <p className="text-[11px] font-medium text-red-500 mt-1 flex items-center">OpenAI 偶发限流</p>
             </div>
             <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm">
                <div className="flex items-center text-[var(--text-muted)] mb-2">
                   <Zap className="icon-sm mr-2" />
                   <span className="text-xs font-bold uppercase tracking-widest">活跃服务商</span>
                </div>
                <p className="text-2xl font-bold text-[var(--text-main)]">5<span className="text-sm text-[var(--text-muted)] ml-1">/ 8</span></p>
                <p className="text-[11px] font-medium text-[var(--text-muted)] mt-1">3 个备用提供商已休眠</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
            {providers.map((prov, i) => (
              <div key={i} className={`bg-[var(--bg-panel)] rounded-[24px] border ${prov.enabled ? 'border-[var(--border-color)] hover:border-blue-300' : 'border-[var(--border-color)] opacity-75'} shadow-sm p-[var(--spacing-lg)] relative group transition-colors`}>
                {prov.isDefault && (
                   <div className="absolute -top-3 -right-3 bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border-2 border-white shadow-sm flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      全局首选
                   </div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div>
                     <h3 className={`font-bold text-lg flex items-center ${prov.enabled ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                        {prov.name}
                     </h3>
                     <div className="flex items-center space-x-3 mt-1.5">
                        <span className={`flex items-center bg-gray-50 px-2 py-0.5 rounded text-[11px] font-bold ${
                          prov.status === '健康' ? 'text-green-600' : 
                          prov.status === '限流中' ? 'text-amber-600' : 'text-gray-400'
                        }`}>
                           <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              prov.status === '健康' ? 'bg-green-500' : 
                              prov.status === '限流中' ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'
                           }`}></span>
                           {prov.status}
                        </span>
                        <span className="text-[11px] font-medium text-gray-400 flex items-center">
                           <Clock className="w-3 h-3 mr-1" />
                           {prov.latency}
                        </span>
                     </div>
                  </div>
                  <button className={`${prov.enabled ? 'text-[var(--color-primary)]' : 'text-gray-300'}`}>
                     {prov.enabled ? <ToggleRight className="icon-xl" /> : <ToggleLeft className="icon-xl" />}
                  </button>
                </div>
                <div className="space-y-[var(--spacing-md)] mb-[var(--spacing-md)]">
                  <div>
                    <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">可用模型 ({prov.models.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {prov.models.map((m, j) => (
                        <span key={j} className={`text-xs font-medium px-2 py-1.5 rounded-md border ${prov.enabled ? 'bg-gray-50 border-[var(--border-color)] text-gray-700' : 'bg-gray-50/50 border-[var(--border-color)] text-gray-400'}`}>{m}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm py-2 px-3 bg-gray-50 rounded-[var(--radius-lg)] border border-[var(--border-color)]">
                    <span className="text-[var(--text-muted)] font-medium">账户余额 / 计费</span>
                    <span className={`font-bold ${prov.enabled ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>{prov.balance}</span>
                  </div>
                </div>
                <div className="border-t border-[var(--border-color)] pt-4 flex space-x-3">
                  <button className="flex-1 flex items-center justify-center space-x-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 font-bold py-2 rounded-[var(--radius-lg)] text-sm transition-colors">
                     <Key className="icon-sm" />
                     <span>密钥管理</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center space-x-1.5 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 font-bold py-2 rounded-[var(--radius-lg)] text-sm transition-colors">
                     <BarChart3 className="icon-sm" />
                     <span>用量详情</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {providerTab === 'models' && (
        <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden">
          {providers.map((prov, i) => (
            <div key={i} className="border-b border-[var(--border-color)] last:border-b-0">
               <div className="bg-gray-50/80 px-6 py-4 flex items-center justify-between border-b border-[var(--border-color)]">
                 <div className="flex items-center">
                    <div className="icon-xl rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold mr-3">{prov.name.charAt(0)}</div>
                    <h3 className="font-bold text-[var(--text-main)]">{prov.name}</h3>
                    <span className={`ml-3 px-2 py-0.5 rounded text-[11px] font-bold ${prov.enabled ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-[var(--text-muted)]'}`}>
                      {prov.enabled ? '已连接' : '已停用'}
                    </span>
                 </div>
               </div>
               <div className="p-[var(--spacing-lg)]">
                 {prov.models.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--spacing-md)]">
                      {prov.models.map((model, j) => (
                        <div key={j} className="flex items-center justify-between p-3 border border-[var(--border-color)] rounded-[var(--radius-lg)] hover:border-blue-300 transition-colors bg-[var(--bg-panel)]">
                          <div className="flex items-center">
                            <Bot className="icon-sm text-gray-400 mr-2" />
                            <span className="font-bold text-[var(--text-main)] text-[14px]">{model}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                             <select className="text-[11px] font-medium text-[var(--text-muted)] bg-gray-50 border border-[var(--border-color)] rounded px-2 py-1 outline-none">
                               <option>全部用户可用</option>
                               <option>仅专业版</option>
                               <option>仅尊享版</option>
                             </select>
                             <ToggleRight className={`icon-lg ${prov.enabled ? 'text-green-500' : 'text-gray-300'}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                 ) : (
                    <p className="text-sm text-[var(--text-muted)] py-2">暂无已启用的模型</p>
                 )}
               </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-panel)] rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-[var(--border-color)] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center space-x-2">
                <Bot className="icon-md text-[var(--color-primary)]" />
                <h3 className="text-[17px] font-bold text-[var(--text-main)]">接入新服务商</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
                title="关闭"
              >
                <X className="icon-md" />
              </button>
            </div>
            
            <div className="p-[var(--spacing-lg)] space-y-[var(--spacing-md)] overflow-y-auto max-h-[65vh]">
              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">选择预设平台</label>
                 <select 
                   value={newProviderPlatform}
                   onChange={(e) => {
                     setNewProviderPlatform(e.target.value);
                     setDetectedModels([]);
                   }}
                   className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-[var(--radius-lg)] font-medium text-gray-700 bg-[var(--bg-panel)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                 >
                   <option value="OpenAI">OpenAI 系列</option>
                   <option value="Anthropic">Anthropic (Claude)</option>
                   <option value="Google Vertex AI">Google Vertex AI</option>
                   <option value="Midjourney API (Unofficial)">Midjourney API</option>
                   <option value="Custom">自定义 OpenAI 兼容接口</option>
                 </select>
              </div>

              {newProviderPlatform === 'Custom' && (
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">自定义网关地址 (Base URL)</label>
                   <input 
                     type="text" 
                     placeholder="https://api.example.com/v1"
                     className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-[var(--radius-lg)] text-[15px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                   />
                </div>
              )}

              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">API 密钥 (API Key)</label>
                 <input 
                   type="password" 
                   value={newProviderKey}
                   onChange={(e) => setNewProviderKey(e.target.value)}
                   placeholder="sk-..."
                   className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-[var(--radius-lg)] text-[15px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                 />
              </div>

              {detectedModels.length === 0 ? (
                <div className="pt-2">
                  <button 
                    onClick={handleDetectModels}
                    disabled={!newProviderKey || isDetecting}
                    className="w-full bg-blue-50 text-blue-700 font-bold py-3 text-[15px] rounded-[var(--radius-lg)] hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isDetecting ? (
                      <RefreshCw className="icon-sm animate-spin" />
                    ) : (
                      <Activity className="icon-sm" />
                    )}
                    <span>{isDetecting ? '正在与网关通信探测模型...' : '自动连接并获取模型列表'}</span>
                  </button>
                </div>
              ) : (
                <div className="bg-green-50 rounded-[var(--radius-lg)] p-4 border border-green-100">
                   <p className="font-bold text-green-800 text-[14px] flex items-center mb-3">
                     <CheckCircle2 className="icon-sm mr-2" />
                     探测成功，共发现 {detectedModels.length} 个可用模型:
                   </p>
                   <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                     {detectedModels.map(name => (
                       <span key={name} className="px-2 py-1 bg-[var(--bg-panel)] border border-green-200 text-green-700 text-xs font-bold rounded-lg shadow-sm">
                         {name}
                       </span>
                     ))}
                   </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[var(--border-color)] bg-gray-50 flex justify-end space-x-3">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-gray-600 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-100 transition-colors shadow-sm text-sm"
              >
                取消
              </button>
              <button 
                onClick={handleAddProvider}
                disabled={detectedModels.length === 0}
                className="px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-white bg-[var(--color-primary)] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm text-sm"
              >
                保存并接入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminAssets() {
  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">全局素材管理</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">系统范围内多媒体内容的监控与清理</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)] mb-[var(--spacing-md)]">
        {[
          { label: '总素材数量', value: '45,231', sub: '近30天 +2.1k' },
          { label: '总存储占用', value: '1,284 GB', sub: '含云端和本地' },
          { label: '本周违规拦截', value: '14 次', sub: '自动合规引擎' },
          { label: '可回收垃圾', value: '45 GB', sub: '过时缓存' },
        ].map((s, i) => (
          <div key={i} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm">
             <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">{s.label}</p>
             <p className="text-2xl font-bold text-[var(--text-main)] mb-1">{s.value}</p>
             <p className="text-[11px] font-bold text-[var(--text-muted)]">{s.sub}</p>
          </div>
        ))}
      </div>

       <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-xl)] text-center mt-6">
         <div className="w-16 h-16 bg-red-50 text-red-600 flex items-center justify-center rounded-full mx-auto mb-4 relative">
           <Folder className="icon-xl" />
           <span className="absolute top-0 right-0 icon-sm bg-red-500 border-2 border-white rounded-full"></span>
         </div>
         <h2 className="text-lg font-bold text-[var(--text-main)] mb-2">安全引擎扫描分析</h2>
         <p className="text-sm text-[var(--text-muted)] max-w-lg mx-auto">系统定期进行 NSFW 涉黄涉暴扫描拦截，确保全站内容合规。最近一次安全扫描未发现重大隐患。您可以手动触发违规扫描，分析时长将取决于资源堆积量。</p>
         <button className="mt-6 bg-red-50 text-red-600 hover:bg-red-100 font-bold px-6 py-2.5 rounded-[var(--radius-lg)] transition-colors">执行深度合规扫描</button>
       </div>
    </div>
  );
}

function AdminProjects() {
  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">全站作品监控</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">查看与管理生成分享的项目内容</p>
         </div>
       </div>

       <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">
              <th className="py-4 px-6">作品 / 链接</th>
              <th className="py-4 px-6">创作者</th>
              <th className="py-4 px-6">查看数</th>
              <th className="py-4 px-6">状态</th>
              <th className="py-4 px-6 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              { id: '1', title: '春季品牌发布会影片', author: 'Maheshenga', views: '2,045', stat: '公开分享' },
              { id: '2', title: '内部培训数字人录屏', author: 'HR Dept', views: '142', stat: '私密' },
              { id: '3', title: '游戏场景概念生图包', author: 'Art Director', views: '8,410', stat: '被举报 (处理中)' },
            ].map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/50">
                <td className="py-4 px-6">
                   <p className="font-bold text-[15px] text-[var(--text-main)]">{p.title}</p>
                   <p className="text-xs text-[var(--color-primary)] font-medium hover:underline cursor-pointer">ais-app.io/share/{p.id}xxxx</p>
                </td>
                <td className="py-4 px-6 text-[14px] text-gray-700 font-bold">{p.author}</td>
                <td className="py-4 px-6 text-[14px] text-[var(--text-muted)] font-medium">{p.views}</td>
                <td className="py-4 px-6">
                   <span className={`px-2.5 py-1 text-[13px] font-bold rounded-lg ${
                     p.stat.includes('举报') ? 'bg-red-100 text-red-700' :
                     p.stat === '公开分享' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                   }`}>{p.stat}</span>
                </td>
                <td className="py-4 px-6 text-right space-x-3">
                  <button className="text-[var(--color-primary)] font-bold hover:text-blue-800 text-[14px]">详情</button>
                  {p.stat.includes('举报') && <button className="text-red-600 font-bold hover:text-red-800 text-[14px]">封禁下架</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
       </div>
    </div>
  );
}

function AdminTasks() {
  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">异步任务队列</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">监控正在执行的云端生成与渲染任务</p>
         </div>
         <button className="text-sm text-[var(--color-primary)] font-bold bg-blue-50 px-4 py-2 rounded-[var(--radius-lg)]">清空死信队列</button>
       </div>

       <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] max-h-[600px] overflow-y-auto custom-scrollbar">
          <div className="space-y-[var(--spacing-md)]">
            {[
              { type: '视频渲染', model: 'Sora v1', user: 'Maheshenga', prog: 78, stat: 'running' },
              { type: '模型微调', model: 'LoRA SDXL', user: 'Design Studio', prog: 40, stat: 'running' },
              { type: '音频混音', model: 'MusicGen', user: 'Audio Team', prog: 100, stat: 'done' },
              { type: '数字人', model: 'HeyGen API', user: 'Sales', prog: 0, stat: 'failed' },
            ].map((t, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-[var(--radius-xl)]">
                 <div className="flex items-center space-x-4 w-1/3">
                   <div className="p-2.5 bg-gray-50 rounded-[var(--radius-lg)]">
                     <Activity className={`icon-md ${t.stat === 'running' ? 'text-blue-500 animate-pulse' : t.stat === 'failed' ? 'text-red-500' : 'text-green-500'}`} />
                   </div>
                   <div>
                     <p className="font-bold text-[15px] text-[var(--text-main)]">{t.type} <span className="text-xs text-gray-400 ml-1 font-medium bg-gray-100 px-1 rounded">{t.model}</span></p>
                     <p className="text-[12px] text-[var(--text-muted)]">发起人: {t.user}</p>
                   </div>
                 </div>
                 
                 <div className="flex-1 px-8">
                    {t.stat === 'running' ? (
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-[var(--color-primary)] h-2 rounded-full" style={{ width: `${t.prog}%` }}></div>
                      </div>
                    ) : t.stat === 'done' ? (
                      <p className="text-sm font-bold text-green-600">处理完成</p>
                    ) : (
                      <p className="text-sm font-bold text-red-600">超时失败，等待重试 (TTL: 2m)</p>
                    )}
                 </div>

                 <div className="w-24 text-right">
                   {t.stat === 'running' ? (
                     <button className="text-red-500 text-[13px] font-bold hover:underline">终止任务</button>
                   ) : t.stat === 'failed' ? (
                     <button className="text-[var(--color-primary)] text-[13px] font-bold hover:underline">重试</button>
                   ) : (
                     <span className="text-gray-400 text-[13px]">已归档</span>
                   )}
                 </div>
              </div>
            ))}
          </div>
       </div>
    </div>
  );
}

function AdminMedia() {
  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">媒体全局授权池</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">配置系统的 OAuth 应用参数信息</p>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
         {[
           { name: 'YouTube API v3', connected: 423, status: 'Active' },
           { name: 'X (Twitter) v2', connected: 102, status: 'Rate Limited' },
           { name: 'TikTok Creator', connected: 340, status: 'Active' },
           { name: '微信公众号', connected: 89, status: 'Active' },
         ].map((m, i) => (
           <div key={i} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] p-[var(--spacing-lg)] flex flex-col justify-between shadow-sm">
             <div className="flex justify-between items-start mb-4">
               <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-50 text-[var(--color-primary)] flex items-center justify-center rounded-[var(--radius-lg)] mr-3 font-bold">{m.name.charAt(0)}</div>
                  <h3 className="font-bold text-lg text-[var(--text-main)]">{m.name}</h3>
               </div>
               <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${m.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                 {m.status}
               </span>
             </div>
             <div>
               <p className="text-sm text-[var(--text-muted)]">累计用户授权数: <span className="font-bold text-[var(--text-main)]">{m.connected}</span></p>
             </div>
             <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex space-x-3">
               <button className="flex-1 text-sm font-bold bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-700 py-2 rounded-[var(--radius-lg)] hover:bg-gray-50 transition-colors shadow-sm">更新 Client ID</button>
             </div>
           </div>
         ))}
       </div>
    </div>
  );
}

function AdminSaasPlans() {
  const plans = [
    { id: 1, name: '基础版 (Free)', price: 0, interval: '月', features: ['普通排队优先级', '基础模型', '社区支持'], activeUsers: 1420 },
    { id: 2, name: '专业版 (Pro)', price: 99, interval: '月', features: ['高优先级生成', '全量顶级模型', '无限次智能修图'], activeUsers: 345 },
    { id: 3, name: '多AGENT 旗舰版 (Pro)', price: 399, interval: '月', features: ['50个Agent分身', '无限制API并发', '专属大客户算力池'], activeUsers: 82 },
  ];

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-main)]">SaaS 套餐与业务配置</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">创建和维护订阅套餐、阶梯定价以及权限隔离规则。</p>
        </div>
        <button className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm flex items-center">
          <Plus className="icon-sm mr-2" />
          创建新套餐
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
         {plans.map((p) => (
           <div key={p.id} className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] p-[var(--spacing-lg)] shadow-sm flex flex-col relative group hover:border-blue-500 hover:shadow-md transition-all">
             <div className="absolute top-4 right-4 bg-green-50 text-green-600 text-[11px] font-bold px-2 py-0.5 rounded border border-green-100">
               上架中
             </div>
             <h3 className="text-lg font-black text-[var(--text-main)] mb-2">{p.name}</h3>
             <div className="flex items-baseline mb-4">
               <span className="text-2xl font-black text-[var(--text-main)]">¥{p.price}</span>
               <span className="text-sm font-medium text-[var(--text-muted)] ml-1">/{p.interval}</span>
             </div>
             
             <p className="text-sm font-bold text-gray-700 mb-2">包含核心权益:</p>
             <ul className="space-y-2 mb-[var(--spacing-md)] flex-1">
               {p.features.map((f, i) => (
                 <li key={i} className="text-[13px] text-gray-600 flex items-center">
                   <CheckCircle2 className="icon-sm text-blue-500 mr-2 flex-shrink-0" />
                   {f}
                 </li>
               ))}
             </ul>

             <div className="bg-gray-50 p-3 rounded-[var(--radius-lg)] border border-[var(--border-color)] flex justify-between items-center mb-4">
               <span className="text-xs font-bold text-[var(--text-muted)]">活跃订阅数</span>
               <span className="text-sm font-black text-[var(--text-main)]">{p.activeUsers} <span className="text-[10px] text-gray-400 font-normal">租户</span></span>
             </div>

             <div className="grid grid-cols-2 gap-2 mt-auto">
               <button className="py-2 text-sm font-bold text-gray-600 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-lg)] hover:bg-gray-50 transition-colors">编辑参数</button>
               <button className="py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-[var(--radius-lg)] transition-colors">下架</button>
             </div>
           </div>
         ))}
      </div>

      <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden mt-8">
        <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)]">
          <h3 className="font-bold text-[var(--text-main)] text-lg">全局资源配额限制</h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">设定不同租户级别的通用阈值</p>
        </div>
        <div className="p-[var(--spacing-lg)] grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
           <div className="border border-[var(--border-color)] rounded-[var(--radius-lg)] p-5 bg-gray-50">
              <label className="block text-sm font-bold text-[var(--text-main)] mb-1">单租户最大并发任务数</label>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">超出部分将进入等待队列</p>
              <input type="number" defaultValue={20} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg outline-none focus:border-blue-500 text-sm font-medium bg-[var(--bg-panel)]" />
           </div>
           <div className="border border-[var(--border-color)] rounded-[var(--radius-lg)] p-5 bg-gray-50">
              <label className="block text-sm font-bold text-[var(--text-main)] mb-1">图片/素材存储配额 (GB)</label>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">当月新用户的默认初始空间</p>
              <input type="number" defaultValue={5} className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg outline-none focus:border-blue-500 text-sm font-medium bg-[var(--bg-panel)]" />
           </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 border-t border-[var(--border-color)] flex justify-end">
          <button className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2 rounded-[var(--radius-lg)] font-bold shadow-sm transition-colors text-sm">保存配额规则</button>
        </div>
      </div>
    </div>
  );
}

function AdminSales() {
  const data = [
    { name: 'Mon', revenue: 4000 },
    { name: 'Tue', revenue: 3000 },
    { name: 'Wed', revenue: 2000 },
    { name: 'Thu', revenue: 2780 },
    { name: 'Fri', revenue: 1890 },
    { name: 'Sat', revenue: 2390 },
    { name: 'Sun', revenue: 3490 },
  ];

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">财务与销售管理</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">查看系统营收、套餐销售情况以及发票</p>
         </div>
         <button className="flex items-center space-x-2 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm">
           <Download className="icon-sm" />
           <span>导出财报</span>
         </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)] mb-[var(--spacing-md)]">
         {[
           { label: '本月总营收', value: '¥248,500', sub: '+12.5% 较上月', color: 'text-green-600' },
           { label: '新增付费订阅', value: '342', sub: '本周新增', color: 'text-[var(--color-primary)]' },
           { label: '退款/取消单数', value: '12', sub: '占总订阅 0.5%', color: 'text-orange-500' },
           { label: '提现待审批', value: '¥12,400', sub: '代理商提现', color: 'text-purple-600' },
         ].map((s, i) => (
           <div key={i} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">{s.label}</p>
              <div className="flex items-end mb-1">
                 <p className="text-2xl font-bold text-[var(--text-main)]">{s.value}</p>
              </div>
              <p className={`text-[11px] font-bold ${s.color}`}>{s.sub}</p>
           </div>
         ))}
       </div>

       <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] mb-[var(--spacing-md)]">
          <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-[var(--spacing-md)]">最近7天销售趋势</h3>
          <div className="h-72 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                 <defs>
                   <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} tickFormatter={(val) => `¥${val}`} />
                 <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                 <Area type="monotone" dataKey="revenue" name="营收" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
               </AreaChart>
             </ResponsiveContainer>
          </div>
       </div>
    </div>
  );
}

function AdminAnnouncements() {
  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">公告与通知管理</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">发布全站公告、系统更新或营销活动推送</p>
         </div>
         <button className="flex items-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm">
           <Plus className="icon-sm" />
           <span>发布新公告</span>
         </button>
       </div>

       <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">
              <th className="py-4 px-6">公告内容</th>
              <th className="py-4 px-6">推送渠道</th>
              <th className="py-4 px-6">发布时间</th>
              <th className="py-4 px-6">状态</th>
              <th className="py-4 px-6 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              { title: 'v2.4.0 系统升级维护通知', channel: '主站弹窗', date: '2026-05-28', stat: '展示中' },
              { title: '五一特惠活动：尊享版年付买一送一', channel: '邮件 + 弹窗', date: '2026-04-30', stat: '已结束' },
              { title: '关于新增 Claude 3.5 Sonnet 模型的公告', channel: '通知中心小红点', date: '2026-04-15', stat: '历史记录' },
            ].map((p, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="py-4 px-6">
                   <p className="font-bold text-[15px] text-[var(--text-main)]">{p.title}</p>
                </td>
                <td className="py-4 px-6 text-[14px] text-[var(--text-muted)] font-medium">{p.channel}</td>
                <td className="py-4 px-6 text-[14px] text-[var(--text-muted)] font-medium">{p.date}</td>
                <td className="py-4 px-6">
                   <span className={`px-2.5 py-1 text-[13px] font-bold rounded-lg ${
                     p.stat === '展示中' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                   }`}>{p.stat}</span>
                </td>
                <td className="py-4 px-6 text-right space-x-3">
                  <button className="text-[var(--color-primary)] font-bold hover:text-blue-800 text-[14px]">编辑</button>
                  <button className="text-red-500 font-bold hover:text-red-700 text-[14px]">撤下</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
       </div>
    </div>
  );
}

function AdminPlugins() {
  const plugins = [
    { name: 'Google Workspace 内部文档搜索', provider: 'Official', enabled: true, icon: Folder },
    { name: 'X (Twitter) 自动定时发布', provider: 'Community', enabled: false, icon: Share2 },
    { name: 'Shopify 商品一键同步', provider: 'Official', enabled: true, icon: Briefcase },
  ];

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">插件与扩展能力中心</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">管理系统中集成的高级插件开关和第三方应用集</p>
         </div>
         <button className="flex items-center space-x-2 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm">
           <Box className="icon-sm" />
           <span>安装自定义插件</span>
         </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--spacing-md)]">
          {plugins.map((p, i) => (
            <div key={i} className="bg-[var(--bg-panel)] border text-left border-[var(--border-color)] rounded-[24px] p-[var(--spacing-lg)] shadow-sm flex flex-col hover:border-blue-300 transition-all">
               <div className="flex justify-between items-start mb-4">
                 <div className="bg-gray-50 p-3 rounded-[var(--radius-xl)]">
                    <p.icon className="icon-lg text-gray-700" />
                 </div>
                 <ToggleRight className={`icon-xl ${p.enabled ? 'text-green-500' : 'text-gray-300'}`} />
               </div>
               <h3 className="font-bold text-[var(--text-main)] text-[16px] mb-2">{p.name}</h3>
               <p className="text-xs text-[var(--text-muted)] mb-[var(--spacing-md)] flex-1">
                 {p.provider === 'Official' ? '官方维护的插件功能合集' : '由社区开发者提供的扩展应用'}
               </p>
               <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-4">
                 <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${p.provider === 'Official' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                   {p.provider}
                 </span>
                 <button className="text-sm font-bold text-[var(--color-primary)] hover:text-blue-800">配置参数</button>
               </div>
            </div>
          ))}
       </div>
    </div>
  );
}

function AdminLogs() {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateAudit = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      // Mock PDF Generation & Download
      const content = "Admin Audit Log - Security Compliance Report\n\nGenerated on: " + new Date().toISOString() + "\n\nLog Entries:\n- User role changed (Admin)\n- New SaaS plan created\n- Bulk members imported";
      const blob = new Blob([content], { type: 'text/plain' }); // Faking PDF content as text for simplicity
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Admin_Audit_Report_${new Date().getTime()}.pdf`;
      a.click();
      toast('审计报告(PDF)已生成并下载', 'success');
    }, 2000);
  };

  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">系统安全与审计日志</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">全局系统操作、账号登录及风控记录</p>
         </div>
         <button 
           onClick={handleGenerateAudit}
           disabled={isGenerating}
           className="flex items-center space-x-2 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm disabled:opacity-50"
         >
           {isGenerating ? <div className="w-4 h-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin"></div> : <Download className="icon-sm" />}
           <span>{isGenerating ? '生成中...' : 'Generate Admin Audit (PDF)'}</span>
         </button>
       </div>

       <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
           <div className="relative">
             <Search className="icon-sm absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="搜索操作人员、IP 地址或事件 ID..." className="pl-9 pr-4 py-2 border border-[var(--border-color)] rounded-[var(--radius-lg)] w-80 bg-gray-50 focus:bg-[var(--bg-panel)] focus:ring-2 focus:ring-blue-500 outline-none text-[15px]" />
           </div>
           <div className="flex space-x-3">
             <select className="border border-[var(--border-color)] rounded-[var(--radius-lg)] px-4 py-2 text-[14px] bg-[var(--bg-panel)] font-medium outline-none">
                <option>全部日志类型</option>
                <option>系统设置变更</option>
                <option>账号异地登录</option>
                <option>敏感数据导出</option>
             </select>
           </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">
              <th className="py-4 px-6">时间戳</th>
              <th className="py-4 px-6">操作人员</th>
              <th className="py-4 px-6">事件内容</th>
              <th className="py-4 px-6">IP / 来源</th>
              <th className="py-4 px-6 text-right">风险级别</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              { time: '2026-06-01 13:42:05', user: 'Maheshenga (Admin)', action: '更新了全局 SaaS 定价套餐策略', ip: '114.249.xx.xx (北京)', risk: 'Low' },
              { time: '2026-06-01 09:15:33', user: 'System Bot', action: '执行了每日数据库全量备份 (成功)', ip: '内部集群 (10.0.1.2)', risk: 'Low' },
              { time: '2026-05-31 22:50:11', user: 'creator@yun.com (Pro)', action: '连续 5 次密码输入错误，触发账号锁定', ip: '45.132.xx.xx (新加坡)', risk: 'High' },
              { time: '2026-05-31 16:30:00', user: 'Admin 02', action: '导出了 5,420 条用户订阅记录 (CSV)', ip: '221.192.xx.xx (上海)', risk: 'Medium' },
            ].map((p, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="py-4 px-6 text-[13px] text-[var(--text-muted)] font-mono">{p.time}</td>
                <td className="py-4 px-6">
                   <p className="font-bold text-[14px] text-[var(--text-main)]">{p.user}</p>
                </td>
                <td className="py-4 px-6 text-[14px] text-gray-700 font-medium">{p.action}</td>
                <td className="py-4 px-6 text-[13px] text-[var(--text-muted)]">{p.ip}</td>
                <td className="py-4 px-6 text-right">
                   <span className={`px-2.5 py-1 text-[11px] font-bold rounded border ${
                     p.risk === 'High' ? 'bg-red-50 text-red-600 border-red-100' :
                     p.risk === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-gray-50 text-[var(--text-muted)] border-[var(--border-color)]'
                   }`}>{p.risk.toUpperCase()}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
       </div>
    </div>
  );
}

function AdminTickets() {
  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">客服工单与用户反馈</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">处理用户的求助、投诉建议及退款请求</p>
         </div>
         <div className="flex space-x-2">
           <button className="bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm">
             导出工单报表
           </button>
           <button className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm">
             添加自动回复规则
           </button>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)] mb-[var(--spacing-md)]">
         {[
           { label: '待处理工单', value: '42', color: 'text-red-500' },
           { label: '处理中', value: '18', color: 'text-orange-500' },
           { label: '已解决 (今日)', value: '156', color: 'text-green-500' },
           { label: '平均响应时间', value: '1.2h', color: 'text-blue-500' },
         ].map((s, i) => (
           <div key={i} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm text-center">
              <p className="text-xs text-[var(--text-muted)] font-bold mb-2">{s.label}</p>
              <p className={`text-[var(--text-main)]xl font-extrabold ${s.color}`}>{s.value}</p>
           </div>
         ))}
       </div>

       <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">
              <th className="py-4 px-6">工单编号</th>
              <th className="py-4 px-6">用户</th>
              <th className="py-4 px-6">分类 / 问题摘要</th>
              <th className="py-4 px-6">状态</th>
              <th className="py-4 px-6">时间</th>
              <th className="py-4 px-6 text-right">管理</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              { id: 'TKT-20260601-001', user: 'chenxx@example.com', type: '账单及退款', title: '重复扣费争议', stat: '待处理', time: '10 分钟前', priority: 'High' },
              { id: 'TKT-20260601-002', user: 'agent_lee (Pro)', type: '功能异常', title: '数字人生成视频黑屏', stat: '处理中', time: '1 小时前', priority: 'Medium' },
              { id: 'TKT-20260531-098', user: 'wang_studio', type: '扩展额度申请', title: '矩阵账号算力扩容请求', stat: '已解决', time: '1 天前', priority: 'Low' },
            ].map((p, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="py-4 px-6 text-[13px] text-[var(--text-muted)] font-mono">{p.id}</td>
                <td className="py-4 px-6 text-[14px] font-bold text-[var(--text-main)]">{p.user}</td>
                <td className="py-4 px-6">
                   <div className="flex flex-col">
                     <span className="text-[12px] font-bold text-[var(--color-primary)] mb-1">{p.type}</span>
                     <span className="text-[14px] text-[var(--text-main)] font-medium">{p.title}</span>
                   </div>
                </td>
                <td className="py-4 px-6">
                   <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${
                     p.stat === '待处理' ? 'bg-red-50 text-red-600 border-red-100' :
                     p.stat === '处理中' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-green-50 text-green-600 border-green-100'
                   }`}>{p.stat}</span>
                </td>
                <td className="py-4 px-6 text-[13px] text-[var(--text-muted)]">{p.time}</td>
                <td className="py-4 px-6 text-right">
                  <button className="text-[var(--color-primary)] font-bold hover:text-blue-800 text-[14px]">回复工单</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
       </div>
    </div>
  );
}

function AdminAgency() {
  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">分销、返水与代理商管理</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">管理渠道分销网络以及代理商提现请求</p>
         </div>
         <button className="flex items-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm">
           <Plus className="icon-sm" />
           <span>新增代理商</span>
         </button>
       </div>

       <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">
              <th className="py-4 px-6">代理商名称/层级</th>
              <th className="py-4 px-6">邀请注册数</th>
              <th className="py-4 px-6">分佣比例</th>
              <th className="py-4 px-6">累计佣金 (¥)</th>
              <th className="py-4 px-6">提现状态</th>
              <th className="py-4 px-6 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              { name: '北京星云MCN节点', level: 'V3 核心服务商', users: '1,204', rate: '35%', total: '142,500', stat: '无待办' },
              { name: '个人推客_Zhangwei', level: 'V1 个人', users: '42', rate: '15%', total: '3,240', stat: '待提现审批' },
              { name: '深圳市智创网络', level: 'V2 渠道代理', users: '512', rate: '25%', total: '45,800', stat: '无待办' },
            ].map((p, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="py-4 px-6">
                   <p className="font-bold text-[15px] text-[var(--text-main)]">{p.name}</p>
                   <p className="text-[12px] font-bold text-[var(--color-primary)] mt-1">{p.level}</p>
                </td>
                <td className="py-4 px-6 text-[14px] text-gray-700 font-medium">{p.users}</td>
                <td className="py-4 px-6">
                   <span className="bg-gray-100 text-[var(--text-main)] text-[12px] font-bold px-2 py-1 rounded">{p.rate}</span>
                </td>
                <td className="py-4 px-6 text-[15px] font-bold text-[var(--text-main)]">¥ {p.total}</td>
                <td className="py-4 px-6">
                   {p.stat === '待提现审批' ? (
                     <span className="flex items-center text-[13px] font-bold text-orange-600">
                        <span className="w-2 h-2 rounded-full bg-orange-500 mr-2 animate-pulse"></span>
                        {p.stat}
                     </span>
                   ) : (
                     <span className="text-[13px] text-[var(--text-muted)]">{p.stat}</span>
                   )}
                </td>
                <td className="py-4 px-6 text-right space-x-3">
                  <button className="text-[var(--color-primary)] font-bold hover:text-blue-800 text-[14px]">详情</button>
                  {p.stat === '待提现审批' && (
                     <button className="text-green-600 font-bold hover:text-green-800 text-[14px]">打款</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
       </div>
    </div>
  );
}

function AdminRisk() {
  return (
    <div className="space-y-[var(--spacing-lg)] animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-[var(--text-main)]">系统内容风控与审计审核</h2>
           <p className="text-sm text-[var(--text-muted)] mt-1">处理违规敏感词汇拦截记录，审核用户被举报生成内容</p>
         </div>
         <div className="flex space-x-2">
           <button className="bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm">
             敏感词库管理
           </button>
           <button className="bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm">
             封停记录查询
           </button>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)] mb-[var(--spacing-md)]">
         {[
           { label: '今日拦截违规', value: '142 次', color: 'text-red-500' },
           { label: '人工审核积压', value: '28 单', color: 'text-orange-500' },
           { label: '风险模型版本', value: 'v2.4 (实时)', color: 'text-green-500' },
         ].map((s, i) => (
           <div key={i} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm text-center">
              <p className="text-xs text-[var(--text-muted)] font-bold mb-2">{s.label}</p>
              <p className={`text-[var(--text-main)] text-2xl font-extrabold ${s.color}`}>{s.value}</p>
           </div>
         ))}
       </div>

       <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-[24px] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)] text-[12px] font-extrabold text-gray-400 uppercase tracking-widest">
              <th className="py-4 px-6">事件追踪 ID</th>
              <th className="py-4 px-6">触发动作</th>
              <th className="py-4 px-6">涉及内容/命中规则</th>
              <th className="py-4 px-6">处理决策</th>
              <th className="py-4 px-6 text-right">人工介入</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              { id: 'RSK-084-219', action: 'Prompt 生成请求', desc: '命中涉政/色情敏感词，系统拦截并返回占位图', decision: '系统自动拦截' },
              { id: 'RSK-992-011', action: '公开作品发布', desc: '用户举报: 图片血腥暴力', decision: '待人工确认' },
              { id: 'HTR-112-992', action: '异常高频调用', desc: '单IP一小时内爆刷图片API 800次', decision: '已触发限流并冻结账号' },
            ].map((p, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="py-4 px-6 text-[13px] text-[var(--text-muted)] font-mono">{p.id}</td>
                <td className="py-4 px-6">
                   <p className="font-bold text-[14px] text-[var(--text-main)]">{p.action}</p>
                </td>
                <td className="py-4 px-6 text-[13px] text-gray-700 max-w-sm truncate">{p.desc}</td>
                <td className="py-4 px-6">
                   <span className={`px-2.5 py-1 text-[11px] font-bold rounded border ${
                     p.decision === '系统自动拦截' ? 'bg-green-50 text-green-600 border-green-100' :
                     p.decision === '待人工确认' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-red-50 text-red-600 border-red-100'
                   }`}>{p.decision}</span>
                </td>
                <td className="py-4 px-6 text-right space-x-3">
                  {p.decision === '待人工确认' ? (
                     <>
                        <button className="text-green-600 font-bold hover:text-green-800 text-[14px]">放行</button>
                        <button className="text-red-500 font-bold hover:text-red-700 text-[14px]">封禁</button>
                     </>
                  ) : (
                     <button className="text-[var(--color-primary)] font-bold hover:text-blue-800 text-[14px]">查看详情</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
       </div>
    </div>
  );
}
