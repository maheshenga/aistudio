import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { ArrowUpRight, Film, ImageIcon, MessageSquare, Zap, Sparkles, Bot, Clock, Palette, Package, Megaphone, Home, Shirt, PenTool, Network, MonitorPlay, UserCircle2, Folder, RotateCcw, AlertTriangle, Search, Command, X, Activity } from 'lucide-react';
import { ActivityHeatmap } from './ActivityHeatmap';
import { RecentFilesWidget } from './RecentFilesWidget';
import { TimeSpentChart } from './TimeSpentChart';
import { DailyFocusGoal } from './DailyFocusGoal';
import { FocusTimer } from './FocusTimer';
import { DailyInsightsWidget } from './DailyInsightsWidget';
import { ModuleFlowMap } from './ModuleFlowMap';
import { FrequentWorkflowsWidget } from './FrequentWorkflowsWidget';
import { SessionArchiver } from './SessionArchiver';
import { SystemResources } from './SystemResources';
import { WorkflowEfficiencyWidget } from './WorkflowEfficiencyWidget';
import { RecommendedModulesWidget } from './RecommendedModulesWidget';

const data = [
  { name: '周一', uses: 4000, active: 2400 },
  { name: '周二', uses: 3000, active: 1398 },
  { name: '周三', uses: 2000, active: 9800 },
  { name: '周四', uses: 2780, active: 3908 },
  { name: '周五', uses: 1890, active: 4800 },
  { name: '周六', uses: 2390, active: 3800 },
  { name: '周日', uses: 3490, active: 4300 },
];

export function DashboardView() {
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [isInsightOpen, setIsInsightOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<any>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen(true);
      }
      if (e.key === 'Escape' && isCommandOpen) {
        setIsCommandOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandOpen]);

  const stats = [
    { label: '多模态流转任务数', value: '1,345', increase: '+12.5%', icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50', upClass: 'text-[#1E8E3E] bg-[#E6F4EA]' },
    { label: '24H 生成数字资产', value: '432', increase: '+15.2%', icon: Folder, color: 'text-purple-500', bg: 'bg-purple-50', upClass: 'text-[#1E8E3E] bg-[#E6F4EA]' },
    { label: '自动化节省工时', value: '286 h', increase: '+3.1%', icon: Clock, color: 'text-green-500', bg: 'bg-green-50', upClass: 'text-[#1E8E3E] bg-[#E6F4EA]' },
    { label: '集群 Token 与算力', value: '8.4M', increase: '-1.2%', icon: CartesianGrid, color: 'text-orange-500', bg: 'bg-orange-50', upClass: 'text-gray-600 bg-gray-100' },
  ];

  return (
    <div className="layout-section layout-container space-y-[var(--spacing-lg)] min-h-[calc(100vh-4rem)] animate-in fade-in slide-in-from-bottom-2 duration-300 relative">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
        <DailyFocusGoal />
        <FocusTimer />
        <DailyInsightsWidget />
      </div>
      
      {/* 24/7 System Core Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-md)]">
         <div className="lg:col-span-2 bg-[#0F172A] rounded-[24px] p-[var(--spacing-xl)] shadow-xl relative overflow-hidden flex flex-col justify-between text-white border border-gray-800">
            <div className="absolute top-0 right-0 p-[var(--spacing-xl)] opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
               <div className="relative">
                 <div className="w-64 h-64 border-4 border-white/20 rounded-full animate-[spin_10s_linear_infinite]" style={{ borderStyle: 'dashed' }}></div>
                 <div className="w-48 h-48 border-2 border-white/40 rounded-full absolute top-[var(--spacing-xl)] left-8 animate-[spin_8s_linear_infinite_reverse]"></div>
               </div>
            </div>
            
            <div className="absolute top-4 right-4 flex items-center space-x-2">
               <span className="bg-green-500/10 border border-green-500/30 text-green-400 font-bold px-3 py-1.5 rounded-full text-[11px] shadow-sm flex items-center">
                  <span className="relative flex h-2 w-2 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  多AGENT · 智能数字团队 24H 巡航中
               </span>
            </div>

            <div className="relative z-10 max-w-2xl mb-[var(--spacing-xl)] mt-2">
               <h2 className="text-[var(--text-main)]xl font-black mb-3 tracking-tight text-white flex items-center drop-shadow-sm">
                  上午好，主理人 (Solo Founder)
               </h2>
               <p className="text-gray-300 text-[15px] leading-relaxed font-medium">
                  您的「一人公司」自动驾驶系统运行良好。昨晚 AI 并行处理了 <span className="text-blue-400 font-bold">42</span> 项设计与营销任务，约等于 <span className="text-blue-400 font-bold">5.5</span> 名全职员工的产出。<br/>当前拥有 <span className="text-green-400 font-bold">8</span> 个活跃中的专属数字人助理。今天我们需要启动哪条业务流？
               </p>
            </div>
            <div className="relative z-10 flex space-x-3">
               <button className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-6 py-3 rounded-[var(--radius-lg)] font-bold text-[13px] transition-all shadow-lg flex items-center group">
                  <Sparkles className="icon-sm mr-1.5 group-hover:scale-110 transition-transform" />
                  唤醒全栖调度台
               </button>
               <button 
                  onClick={() => setIsRestoring(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-[var(--radius-lg)] font-bold text-[13px] transition-all shadow-lg flex items-center group"
               >
                  <RotateCcw className={`icon-sm mr-1.5 ${isRestoring ? 'animate-spin' : ''}`} />
                  {isRestoring ? '正在恢复...' : '恢复昨日未完工作堆栈'}
               </button>
               <button className="bg-[var(--bg-panel)]/10 hover:bg-[var(--bg-panel)]/20 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-[var(--radius-lg)] font-bold text-[13px] transition-all flex items-center">
                  <Clock className="icon-sm mr-1.5" />
                  一键导出团队 (AI) 绩效报告
               </button>
            </div>
         </div>

         {/* Active Agents Status Widget */}
         <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
               <h3 className="text-[15px] font-black text-[var(--text-main)] flex items-center">
                  <Network className="w-[18px] h-[18px] mr-2 text-[var(--text-main)]" /> 重点 Agent 状态
               </h3>
               <button className="text-[11px] font-bold text-[var(--text-main)] bg-gray-100 px-3 py-1 rounded-full cursor-pointer hover:bg-gray-200">查看集群</button>
            </div>
            
            {/* Alert Bar */}
            <div className="mb-4 bg-red-50 border border-red-200 rounded-[var(--radius-lg)] p-3 flex items-start animate-in fade-in duration-300">
               <AlertTriangle className="icon-sm text-red-500 mt-0.5 mr-2 shrink-0" />
               <div className="flex-1">
                  <p className="text-[12px] font-bold text-red-800">渲染服务器出现排队拥堵</p>
                  <p className="text-[11px] font-medium text-red-600 mt-0.5 leading-relaxed">[3D 户型渲染节点] 超时 300s 仍未返图。</p>
               </div>
               <button className="text-[11px] font-bold bg-[var(--bg-panel)] text-red-600 px-2 py-1 border border-red-200 rounded shadow-sm hover:bg-red-50 ml-2 whitespace-nowrap shrink-0 transition-colors">一键重试</button>
            </div>

            <div className="space-y-[var(--spacing-md)] flex-1 overflow-y-auto custom-scrollbar pr-1">
               <div className="flex items-center justify-between">
                 <div className="flex items-center">
                   <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                     <PenTool className="icon-md text-[var(--color-primary)]" />
                   </div>
                   <div className="ml-3">
                     <p className="text-[13px] font-bold text-[var(--text-main)]">社媒文案写手</p>
                     <p className="text-[11px] text-gray-400 font-medium mt-0.5">正在分析竞品帖子...</p>
                   </div>
                 </div>
                 <div className="flex items-center justify-center icon-xl rounded-full bg-blue-50">
                   <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping absolute"></span>
                   <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                 </div>
               </div>
               
               <div className="flex items-center justify-between">
                 <div className="flex items-center">
                   <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center border border-green-100">
                     <MonitorPlay className="icon-md text-green-600" />
                   </div>
                   <div className="ml-3">
                     <p className="text-[13px] font-bold text-[var(--text-main)]">短视频编导</p>
                     <p className="text-[11px] text-gray-400 font-medium mt-0.5">执行批量混剪 (45%)</p>
                   </div>
                 </div>
                 <div className="flex flex-col items-end">
                   <span className="text-[11px] font-bold text-green-600">Active</span>
                 </div>
               </div>

               <div className="flex items-center justify-between opacity-50 grayscale">
                 <div className="flex items-center">
                   <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-[var(--border-color)]">
                     <UserCircle2 className="icon-md text-[var(--text-muted)]" />
                   </div>
                   <div className="ml-3">
                     <p className="text-[13px] font-bold text-[var(--text-main)]">数字人直播助理</p>
                     <p className="text-[11px] text-gray-400 font-medium mt-0.5">待唤醒 (休眠中)</p>
                   </div>
                 </div>
                 <span className="text-[11px] font-bold text-gray-400">Sleep</span>
               </div>
            </div>
         </div>
      </div>

      {/* Global Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)]">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            onClick={() => {
              setSelectedInsight(stat);
              setIsInsightOpen(true);
            }}
            className="bg-[var(--bg-panel)] rounded-[24px] p-[var(--spacing-lg)] border border-[var(--border-color)] shadow-sm flex flex-col hover:shadow-md hover:border-blue-300 transition-all cursor-pointer relative overflow-hidden group"
            title="点击查看趋势详情"
          >
            <div className="flex justify-between items-start mb-[var(--spacing-md)]">
              <div className={`p-3.5 rounded-[var(--radius-xl)] ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className={`w-[22px] h-[22px] ${stat.color}`} />
              </div>
              <span className={`flex items-center text-xs font-bold px-3 py-1 rounded-full ${stat.upClass}`}>
                {stat.increase} {stat.increase.startsWith('+') && <ArrowUpRight className="w-3 h-3 ml-0.5" />}
              </span>
            </div>
            <div>
              <p className="text-[32px] font-extrabold text-[#111827] tracking-tight group-hover:text-[var(--color-primary)] transition-colors">{stat.value}</p>
              <p className="text-[14px] text-[var(--text-muted)] font-bold mt-1 flex items-center justify-between">
                 {stat.label}
                 <span className="opacity-0 group-hover:opacity-100 text-[11px] text-blue-500 transition-opacity flex items-center">详情 <ArrowUpRight className="w-3 h-3 ml-0.5" /></span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-md)]">
        <div className="lg:col-span-2 bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)]">
          <div className="flex items-center justify-between mb-[var(--spacing-md)]">
            <h2 className="text-lg font-black text-[var(--text-main)] tracking-tight">AI 模型请求每周趋势</h2>
            <select className="text-sm font-bold border-[var(--border-color)] rounded-full shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2 bg-[var(--bg-app)] text-gray-700 outline-none border hover:bg-gray-50 transition-colors">
              <option>本周</option>
              <option>上周</option>
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#111827" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#111827" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="uses" stroke="#111827" strokeWidth={4} fillOpacity={1} fill="url(#colorUses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] flex flex-col">
          <h2 className="text-lg font-black text-[var(--text-main)] mb-[var(--spacing-md)] tracking-tight">活跃能力分布</h2>
          <div className="flex-1 min-h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} />
                   <Tooltip cursor={{fill: '#F8F9FA'}} contentStyle={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontWeight: 600 }} />
                   <Bar dataKey="active" fill="#111827" radius={[8, 8, 8, 8]} barSize={24} />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Agent Ecosystem & Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--spacing-md)]">
        <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden">
          <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)] flex items-center justify-between">
             <h2 className="text-lg font-bold text-[var(--text-main)] border-l-4 border-blue-500 pl-3">24H Agent 事件流</h2>
             <button className="text-[12px] font-bold text-[var(--text-main)]">查看全部</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-gray-100">
                {[
                  { task: '[短视频编导] 完成 12 支批量混剪下发', mod: 'video', model: 'Auto-Remix', status: '已完成', time: '10 分钟前' },
                  { task: '[社媒文案写手] 小红书种草文案自动迭代', mod: 'copy', model: 'Gemini 3.1 Pro', status: '进行中', time: '刚刚' },
                  { task: '[数字人直播助理] 主播 #22 预热推流准备', mod: 'human', model: 'Live Engine', status: '失败', time: '1 小时前' },
                  { task: '[电商视觉操盘手] 替换白底图并分发', mod: 'image', model: 'Imagen 3', status: '已完成', time: '2 小时前' },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/80 transition-colors group cursor-pointer">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-[var(--radius-lg)] flex items-center justify-center mr-4 ${
                          row.mod === 'video' ? 'bg-blue-50 text-blue-500 border border-blue-100' :
                          row.mod === 'copy' ? 'bg-blue-50 text-blue-500 border border-blue-100' :
                          row.mod === 'image' ? 'bg-green-50 text-green-500 border border-green-100' : 'bg-purple-50 text-purple-500 border border-purple-100'
                        }`}>
                           {row.mod === 'video' && <Film className="w-[18px] h-[18px]" />}
                           {row.mod === 'copy' && <MessageSquare className="w-[18px] h-[18px]" />}
                           {row.mod === 'image' && <ImageIcon className="w-[18px] h-[18px]" />}
                           {row.mod === 'human' && <Zap className="w-[18px] h-[18px]" />}
                        </div>
                        <span className="text-[13px] font-bold text-[var(--text-main)]">{row.task}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold ${
                        row.status === '已完成' ? 'bg-green-50 text-green-700 border border-green-100' :
                        row.status === '进行中' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-[12px] text-gray-400 font-medium text-right whitespace-nowrap">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Agent Abilities */}
        <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] overflow-hidden">
          <div className="flex items-center justify-between mb-[var(--spacing-md)]">
             <h2 className="text-lg font-black text-[var(--text-main)] flex items-center border-l-4 border-indigo-500 pl-3">
               自动化专区 (零等待直出)
             </h2>
          </div>
          <div className="grid grid-cols-2 gap-[var(--spacing-md)]">
             {[
               { name: 'LOGO 与 VI 延展', icon: Palette, color: 'text-pink-600', bg: 'bg-pink-50' },
               { name: '商品视觉包装', icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
               { name: '大促营销矩阵分发', icon: Megaphone, color: 'text-[var(--text-main)]', bg: 'bg-gray-100' },
               { name: '家装 3D 户型渲染', icon: Home, color: 'text-teal-600', bg: 'bg-teal-50' },
             ].map((wf, i) => (
               <button key={i} className="flex items-center justify-start p-4 rounded-[16px] border border-[var(--border-color)] bg-[var(--bg-app)] hover:bg-[var(--bg-panel)] hover:shadow-md hover:border-[var(--border-color)] transition-all group">
                 <div className={`p-3 rounded-[12px] ${wf.bg} mr-4 group-hover:scale-110 transition-transform duration-300`}>
                   <wf.icon className={`icon-md ${wf.color}`} />
                 </div>
                 <div className="text-left flex-1">
                    <span className="text-[13px] font-bold text-[var(--text-main)] block truncate">{wf.name}</span>
                    <span className="text-[11px] font-medium text-gray-400 mt-0.5 flex items-center"><Zap className="w-3 h-3 mr-0.5 text-blue-400" /> API 流式联通</span>
                 </div>
               </button>
             ))}
          </div>
          
          <div className="mt-8 border-t border-[var(--border-color)] pt-6">
             <h2 className="text-[15px] font-black text-[var(--text-main)] flex items-center mb-4">
               <Activity className="w-[18px] h-[18px] mr-2 text-indigo-500" /> 近期交互分布图 (Heatmap)
             </h2>
             <div className="bg-gray-50 border border-[var(--border-color)] rounded-[16px] p-4 flex flex-col items-center">
                 <p className="text-[11px] font-bold text-[var(--text-muted)] w-full mb-2">周维权 AI 模块唤醒热力情况</p>
                 <ActivityHeatmap />
             </div>
          </div>
        </div>
      </div>
      
      <RecentFilesWidget />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-[var(--spacing-md)] items-start">
        <TimeSpentChart />
        <WorkflowEfficiencyWidget />
        <RecommendedModulesWidget onNavigate={() => {}} />
        <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
          <FrequentWorkflowsWidget />
          <ModuleFlowMap />
          <SessionArchiver />
        </div>
        <div className="xl:col-span-3">
           <SystemResources />
        </div>
      </div>

      {isCommandOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCommandOpen(false)}></div>
          <div className="bg-[var(--bg-panel)] w-full max-w-xl rounded-[var(--radius-xl)] shadow-2xl relative z-10 overflow-hidden border border-[var(--border-color)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center px-4 py-3 border-b border-[var(--border-color)]">
              <Search className="icon-md text-gray-400 mr-3" />
              <input
                type="text"
                autoFocus
                placeholder="搜索模块或输入指令 (如：开始电商视频创作)..."
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                className="flex-1 text-sm font-medium text-[var(--text-main)] outline-none bg-transparent placeholder-gray-400"
              />
              <span className="text-[10px] font-bold text-gray-400 border border-[var(--border-color)] rounded px-1.5 py-0.5 whitespace-nowrap">ESC 退出</span>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
               {['开始电商视频创作', '生成数字人分身', '调出社媒自动化流', '查看今日消耗明细'].filter(c => c.includes(commandQuery)).map((cmd, i) => (
                 <button key={i} onClick={() => { alert(`执行指令：${cmd}`); setIsCommandOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-[var(--radius-lg)] transition-colors flex items-center group">
                   <Command className="icon-sm mr-3 text-gray-400 group-hover:text-blue-500" />
                   {cmd}
                 </button>
               ))}
            </div>
          </div>
        </div>
      )}

      {isInsightOpen && selectedInsight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsInsightOpen(false)}></div>
          <div className="bg-[var(--bg-panel)] w-full max-w-3xl rounded-[24px] shadow-2xl relative z-10 p-[var(--spacing-lg)] border border-[var(--border-color)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-[var(--spacing-md)]">
              <div>
                 <h2 className="text-xl font-black text-[var(--text-main)]">{selectedInsight.label} - 30天趋势详情</h2>
                 <p className="text-sm font-bold text-[var(--text-muted)] mt-1">当前总数据量: {selectedInsight.value}</p>
              </div>
              <button onClick={() => setIsInsightOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="icon-md text-[var(--text-muted)]" />
              </button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #E5E7EB' }} />
                  <Area type="monotone" dataKey="active" stroke="#2563EB" strokeWidth={3} fillOpacity={0.2} fill="#3B82F6" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
