import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from 'recharts';
import { Download, Calendar, ArrowUpRight, ArrowDownRight, FileText, Video, ImageIcon, Mic, X } from 'lucide-react';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { AgentInteractionHeatmap } from './AgentInteractionHeatmap';
import { toast } from './Toast';
import { useSaasSession } from '../saas/SaasAuthContext';
import { logAuditEvent } from '../lib/data/auditLogRepository';

const visitData = [
  { name: 'Mon', pv: 2400, uv: 1400 },
  { name: 'Tue', pv: 1398, uv: 900 },
  { name: 'Wed', pv: 9800, uv: 3908 },
  { name: 'Thu', pv: 3908, uv: 2800 },
  { name: 'Fri', pv: 4800, uv: 3908 },
  { name: 'Sat', pv: 3800, uv: 2300 },
  { name: 'Sun', pv: 4300, uv: 3800 },
];

type AnalyticsExportFormat = 'pdf' | 'excel';

const dateRangeLabels: Record<string, string> = {
  '7days': 'Last 7 days',
  '30days': 'Last 30 days',
  thisMonth: 'This month',
  custom: 'Custom range',
};

const tabLabels: Record<string, string> = {
  overview: 'Agent contribution overview',
  nfc: 'Matrix conversion tracking',
  saas: 'SaaS user analytics',
};

function createAnalyticsReportRows(activeTab: string, dateRange: string) {
  const totalApiRequests = visitData.reduce((sum, item) => sum + item.pv, 0);
  const totalActiveUsers = visitData.reduce((sum, item) => sum + item.uv, 0);
  const avgActiveUsers = Math.round(totalActiveUsers / visitData.length);

  return [
    ['Report section', tabLabels[activeTab] ?? activeTab],
    ['Date range', dateRangeLabels[dateRange] ?? dateRange],
    ['Total API requests', totalApiRequests.toString()],
    ['Total active users', totalActiveUsers.toString()],
    ['Average active users per day', avgActiveUsers.toString()],
    ['Generated assets', '45231'],
    ['Estimated hours saved', '1280'],
    ['API error rate', '0.02%'],
    ...visitData.map((item) => [`${item.name} API requests`, item.pv.toString()]),
    ...visitData.map((item) => [`${item.name} active users`, item.uv.toString()]),
  ];
}

function toCsvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function DataAnalyticsView() {
  const session = useSaasSession();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [dateRange, setDateRange] = useState('7days');
  const [exportFormat, setExportFormat] = useState<AnalyticsExportFormat>('pdf');
  const [activeTab, setActiveTab] = useState('overview');

  const handleConfirmExport = () => {
    const exportedAt = Date.now();
    const reportId = `analytics_${session.workspace.slug}_${activeTab}_${exportedAt}`;
    const reportRows = createAnalyticsReportRows(activeTab, dateRange);

    if (exportFormat === 'pdf') {
      const doc = new jsPDF();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('AI Studio Analytics Report', 14, 18);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Workspace: ${session.workspace.name}`, 14, 28);
      doc.text(`Generated: ${new Date(exportedAt).toISOString()}`, 14, 34);

      let y = 46;
      reportRows.forEach(([label, value]) => {
        if (y > 280) {
          doc.addPage();
          y = 18;
        }
        doc.setFont('helvetica', 'bold');
        doc.text(label, 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 92, y);
        y += 8;
      });
      doc.save(`${reportId}.pdf`);
    } else {
      const csv = [
        ['Metric', 'Value'].map(toCsvValue).join(','),
        ...reportRows.map((row) => row.map(toCsvValue).join(',')),
      ].join('\n');
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, `${reportId}.csv`);
    }

    logAuditEvent({
      action: 'data_snapshot_export',
      moduleId: 'data',
      targetType: 'module',
      targetId: activeTab,
      metadata: {
        reportId,
        format: exportFormat,
        dateRange,
        rowCount: reportRows.length,
      },
    }, { session });

    toast(`Analytics report exported as ${exportFormat.toUpperCase()}`, 'success');
    setIsExportOpen(false);
  };

  return (
    <div className="p-[var(--spacing-lg)] md:p-[var(--spacing-xl)] max-w-[1600px] mx-auto space-y-8 bg-[var(--bg-app)] min-h-[calc(100vh-4rem)] relative animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-[var(--spacing-md)] border-b border-[var(--border-color)]">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight flex items-center">
            AI 智能节点与业务数据罗盘
            <span className="ml-3 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded shadow-sm border border-green-200 uppercase tracking-widest flex items-center">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
              Live Sync
            </span>
          </h2>
          <p className="text-[14px] text-[var(--text-muted)] mt-2 font-medium">全局洞察 24H 算力消耗、Agent 贡献度及各模态产出的全链路终端数据。</p>
        </div>
        <div className="flex flex-wrap gap-3 relative justify-end">
          <div className="bg-[var(--bg-panel)] p-1 rounded-[var(--radius-lg)] flex items-center space-x-1 border border-[var(--border-color)] shadow-sm mr-2">
             <button 
               onClick={() => setActiveTab('overview')}
               className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'overview' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-700 hover:bg-gray-50'}`}
             >
               Agent 贡献大盘
             </button>
             <button 
               onClick={() => setActiveTab('nfc')}
               className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'nfc' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-700 hover:bg-gray-50'}`}
             >
               矩阵转化追踪
             </button>
             <button 
               onClick={() => setActiveTab('saas')}
               className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'saas' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-700 hover:bg-gray-50'}`}
             >
               SaaS 用户分析
             </button>
          </div>
          <button className="flex items-center space-x-2 bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm">
            <Calendar className="icon-sm" />
            <span>近 7 天</span>
          </button>
          <button 
            onClick={() => setIsExportOpen(true)}
            className="flex items-center space-x-2 bg-[var(--color-primary)] hover:bg-blue-700 text-white px-4 py-2.5 rounded-[var(--radius-lg)] font-bold transition-colors shadow-sm"
          >
            <Download className="icon-sm" />
            <span>导出报表</span>
          </button>

          {isExportOpen && (
             <div className="absolute top-14 right-0 w-72 bg-[var(--bg-panel)] rounded-[var(--radius-xl)] shadow-xl border border-[var(--border-color)] p-4 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
               <div className="flex justify-between items-center mb-4">
                 <h4 className="font-bold text-[var(--text-main)] text-sm">报表导出设置</h4>
                 <button onClick={() => setIsExportOpen(false)} className="text-gray-400 hover:bg-gray-100 p-1 rounded-lg">
                   <X className="icon-sm" />
                 </button>
               </div>
               
               <div className="space-y-[var(--spacing-md)]">
                 <div>
                   <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">时间范围</label>
                   <select 
                     value={dateRange}
                     onChange={(e) => setDateRange(e.target.value)}
                     className="w-full bg-gray-50 border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                   >
                     <option value="7days">最近 7 天</option>
                     <option value="30days">最近 30 天</option>
                     <option value="thisMonth">本月</option>
                     <option value="custom">自定义范围...</option>
                   </select>
                 </div>
                 
                 {dateRange === 'custom' && (
                    <div className="flex items-center gap-2">
                       <input type="date" className="w-full bg-gray-50 border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                       <span className="text-gray-400 text-xs">-</span>
                       <input type="date" className="w-full bg-gray-50 border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                    </div>
                 )}

                 <div>
                   <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">格式</label>
                   <div className="flex gap-2">
                     <button 
                       onClick={() => setExportFormat('pdf')}
                       className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${exportFormat === 'pdf' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-[var(--bg-panel)] border-[var(--border-color)] text-gray-600 hover:bg-gray-50'}`}
                     >
                       PDF
                     </button>
                     <button 
                       onClick={() => setExportFormat('excel')}
                       className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${exportFormat === 'excel' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-[var(--bg-panel)] border-[var(--border-color)] text-gray-600 hover:bg-gray-50'}`}
                     >
                       Excel
                     </button>
                   </div>
                 </div>

                 <button
                   onClick={handleConfirmExport}
                   className="w-full py-2.5 bg-[var(--color-primary)] text-white rounded-[var(--radius-lg)] text-sm font-bold hover:bg-gray-800 transition-colors"
                 >
                   确认导出
                 </button>
               </div>
             </div>
          )}
        </div>
      </div>

      {activeTab === 'overview' ? (
      <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)]">
        {[
          { label: '总消耗 Token', value: '1.24亿', trend: '+12.5%', isUp: true, color: 'text-[var(--color-primary)]', valColor: 'text-[var(--text-main)]' },
          { label: '生成素材数', value: '45,231', trend: '+5.2%', isUp: true, color: 'text-green-600', valColor: 'text-[var(--text-main)]' },
          { label: '节省工时 (评估)', value: '1,280h', trend: '+18.4%', isUp: true, color: 'text-purple-600', valColor: 'text-[var(--text-main)]' },
          { label: 'API 错误率', value: '0.02%', trend: '-0.1%', isUp: false, color: 'text-red-600', valColor: 'text-red-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-[var(--bg-panel)] rounded-[24px] p-[var(--spacing-lg)] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <p className="text-[15px] font-bold text-[var(--text-muted)] mb-2">{stat.label}</p>
            <div className="flex items-end justify-between">
              <h3 className={`text-[32px] font-extrabold tracking-tight ${stat.valColor}`}>{stat.value}</h3>
              <div className={`flex items-center text-sm font-bold px-2.5 py-1 rounded-md ${stat.isUp ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                {stat.isUp ? <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-1" />}
                {stat.trend}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--spacing-md)]">
        <div className="bg-[var(--bg-panel)] rounded-[24px] p-[var(--spacing-lg)] border border-[var(--border-color)] shadow-sm">
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-[var(--spacing-md)]">访问与使用趋势</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
              <AreaChart data={visitData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4285F4" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4285F4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34A853" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#34A853" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Area type="monotone" dataKey="pv" stroke="#4285F4" strokeWidth={3} fillOpacity={1} fill="url(#colorPv)" name="API 请求" />
                <Area type="monotone" dataKey="uv" stroke="#34A853" strokeWidth={3} fillOpacity={1} fill="url(#colorUv)" name="活跃用户" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[var(--bg-panel)] rounded-[24px] p-[var(--spacing-lg)] border border-[var(--border-color)] shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-[var(--spacing-md)]">创作类型活跃占比</h3>
          <div className="space-y-[var(--spacing-lg)] flex-1">
            {[
              { icon: FileText, label: '文案策划', val: 45, color: 'bg-blue-500', txColor: 'text-blue-500', bg: 'bg-blue-50' },
              { icon: ImageIcon, label: '图像资产', val: 30, color: 'bg-green-500', txColor: 'text-green-500', bg: 'bg-green-50' },
              { icon: Video, label: '视频分发', val: 15, color: 'bg-purple-500', txColor: 'text-purple-500', bg: 'bg-purple-50' },
              { icon: Mic, label: '语音合成', val: 10, color: 'bg-amber-500', txColor: 'text-amber-500', bg: 'bg-amber-50' },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-[var(--radius-lg)] mr-3 ${item.bg} ${item.txColor}`}>
                      <item.icon className="w-[18px] h-[18px]" />
                    </div>
                    <span className="text-[15px] font-bold text-gray-700">{item.label}</span>
                  </div>
                  <span className="text-[15px] font-bold text-[var(--text-main)]">{item.val}%</span>
                </div>
                <div className="w-full bg-[#F1F3F4] rounded-full h-2.5 overflow-hidden">
                  <div className={`${item.color} h-2.5 rounded-full`} style={{ width: `${item.val}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--spacing-md)]">
        <div className="bg-[var(--bg-panel)] rounded-[24px] p-[var(--spacing-lg)] border border-[var(--border-color)] shadow-sm">
           <h3 className="text-lg font-bold text-[var(--text-main)] mb-[var(--spacing-md)]">资源成本消耗 (Est)</h3>
           <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
                <BarChart data={visitData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} />
                   <Tooltip cursor={{fill: '#F8F9FA'}} contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                   <Bar dataKey="pv" fill="#F59E0B" radius={[6, 6, 0, 0]} name="Token 与 GPU 成本" />
                </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
        
        <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden">
           <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--text-main)]">核心模型健康度</h3>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">状态监控</span>
           </div>
           <div className="divide-y divide-gray-100">
             {[
               { model: 'Gemini 3.1 Pro', status: 'Healthy', lat: '120ms', rate: '99.99%', cost: '$420.50' },
               { model: 'Imagen 3', status: 'Healthy', lat: '2.5s', rate: '99.85%', cost: '$85.00' },
               { model: 'Sora v1 (Preview)', status: 'Rate Limited', lat: '12.4s', rate: '92.10%', cost: '$1,240' },
               { model: 'HeyGen API', status: 'Healthy', lat: '800ms', rate: '99.90%', cost: '$320.00' },
             ].map((m, i) => (
                <div key={i} className="flex justify-between items-center p-5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-bold text-[var(--text-main)] text-[15px]">{m.model}</p>
                    <div className="mt-1 flex items-center space-x-3 text-xs">
                      <span className={`font-bold ${m.status === 'Healthy' ? 'text-green-500' : 'text-amber-500'}`}>● {m.status}</span>
                      <span className="text-gray-400">延迟: {m.lat}</span>
                      <span className="text-gray-400">可用性: {m.rate}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[var(--text-main)] text-[15px]">{m.cost}</p>
                    <p className="text-xs text-gray-400 mt-1">当月预估</p>
                  </div>
                </div>
             ))}
           </div>
        </div>
      </div>
      
      <AgentInteractionHeatmap />
      </>
      ) : activeTab === 'nfc' ? (
      <div className="space-y-[var(--spacing-lg)] animate-in fade-in duration-300">
         <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)]">
            {[
              { label: '总感应次数 (PV)', value: '84,230', trend: '+24.5%', isUp: true, color: 'text-[var(--color-primary)]' },
              { label: '独立交互人数 (UV)', value: '62,110', trend: '+18.2%', isUp: true, color: 'text-[var(--color-primary)]' },
              { label: '发券/发布转化率', value: '42.8%', trend: '+5.4%', isUp: true, color: 'text-green-600' },
              { label: '平均页面停留', value: '1m 24s', trend: '-2.1%', isUp: false, color: 'text-[var(--text-main)]' },
            ].map((stat, i) => (
              <div key={i} className="bg-[var(--bg-panel)] rounded-[24px] p-[var(--spacing-lg)] border border-[var(--border-color)] shadow-sm relative overflow-hidden">
                <p className="text-[15px] font-bold text-[var(--text-muted)] mb-2">{stat.label}</p>
                <div className="flex items-end justify-between">
                  <h3 className={`text-[32px] font-extrabold tracking-tight ${stat.color}`}>{stat.value}</h3>
                  <div className={`flex items-center text-sm font-bold px-2.5 py-1 rounded-md ${stat.isUp ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                    {stat.isUp ? <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-1" />}
                    {stat.trend}
                  </div>
                </div>
              </div>
            ))}
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-md)]">
            <div className="lg:col-span-2 bg-[var(--bg-panel)] rounded-[24px] p-[var(--spacing-lg)] border border-[var(--border-color)] shadow-sm">
               <h3 className="text-lg font-bold text-[var(--text-main)] mb-[var(--spacing-md)] font-sans tracking-tight">各点位设备互动漏斗转化</h3>
               <div className="h-72 w-full">
                 <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
                    <BarChart data={[
                       { name: '桌面点餐贴', pv: 4200, cv: 2400 },
                       { name: '收银台展牌', pv: 3300, cv: 1800 },
                       { name: '橱窗玻璃贴', pv: 1800, cv: 500 },
                       { name: '等位区海报', pv: 2100, cv: 1200 },
                    ]} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                       <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                       <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#4B5563', fontSize: 12, fontWeight: 700}} width={80} />
                       <Tooltip cursor={{fill: '#F8F9FA'}} contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                       <Bar dataKey="cv" fill="#4F46E5" radius={[0, 4, 4, 0]} name="转化次数 (发文/领券)" />
                       <Bar dataKey="pv" fill="#E0E7FF" radius={[0, 4, 4, 0]} name="感应次数 (扫码/碰一碰)" />
                    </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
            
            <div className="bg-[var(--bg-panel)] rounded-[24px] p-[var(--spacing-lg)] border border-[var(--border-color)] shadow-sm flex flex-col">
               <h3 className="text-lg font-bold text-[var(--text-main)] mb-[var(--spacing-md)] font-sans tracking-tight">扫描设备类型分布</h3>
               <div className="flex-1 flex flex-col justify-center space-y-[var(--spacing-lg)]">
                 {[
                   { label: 'Apple iPhone (iOS)', val: 54, color: 'bg-gray-900' },
                   { label: 'Huawei / HarmonyOS', val: 28, color: 'bg-red-600' },
                   { label: 'Xiaomi / HyperOS', val: 12, color: 'bg-orange-500' },
                   { label: 'Other Android', val: 6, color: 'bg-green-500' },
                 ].map((item, i) => (
                   <div key={i}>
                     <div className="flex items-center justify-between mb-2">
                       <span className="text-[14px] font-bold text-gray-700">{item.label}</span>
                       <span className="text-[14px] font-black text-[var(--text-main)]">{item.val}%</span>
                     </div>
                     <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                       <div className={`${item.color} h-3 rounded-full`} style={{ width: `${item.val}%` }}></div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
         </div>
      </div>
      ) : (
      <div className="space-y-[var(--spacing-lg)] animate-in fade-in duration-300">
         {/* Top Line Metrics */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-[var(--spacing-md)] md:gap-[var(--spacing-md)]">
            <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] p-5 shadow-sm">
               <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">活跃子账号数</p>
               <div className="flex items-end justify-between">
                  <span className="text-[var(--text-main)]xl font-black text-[var(--text-main)]">142</span>
                  <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">+12% 上月</span>
               </div>
            </div>
            <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] p-5 shadow-sm">
               <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">Token 消耗总量</p>
               <div className="flex items-end justify-between">
                  <span className="text-[var(--text-main)]xl font-black text-[var(--text-main)]">8.4<span className="text-lg">M</span></span>
                  <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">+4.2%</span>
               </div>
            </div>
            <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] p-5 shadow-sm">
               <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">活跃订阅转化率</p>
               <div className="flex items-end justify-between">
                  <span className="text-[var(--text-main)]xl font-black text-[var(--text-main)]">68.5%</span>
                  <span className="text-sm font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">-1.1%</span>
               </div>
            </div>
            <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] p-5 shadow-sm bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
               <p className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-1">系统建议</p>
               <div className="mt-1">
                  <p className="text-[13px] font-medium leading-tight">过去一周内有 <span className="font-bold">12 个分发矩阵账号</span>的消耗达到 80% 阈值，建议扩容它们的基础套餐或增购资源包。</p>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
            <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] col-span-2">
               <h3 className="text-lg font-bold text-[var(--text-main)] mb-[var(--spacing-md)] tracking-tight">各子账户 AI 模型调用分布 (Token/积分占比)</h3>
               <div className="h-80 w-full">
                 <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
                    <BarChart data={[
                       { name: '电商一部', 'Gemini 3.1 Pro': 45, 'Imagen 3': 30, 'Sora v1': 15, 'HeyGen': 10 },
                       { name: '内容矩阵', 'Gemini 3.1 Pro': 20, 'Imagen 3': 15, 'Sora v1': 45, 'HeyGen': 20 },
                       { name: '外包设计', 'Gemini 3.1 Pro': 10, 'Imagen 3': 80, 'Sora v1': 5, 'HeyGen': 5 },
                       { name: '市场部', 'Gemini 3.1 Pro': 60, 'Imagen 3': 20, 'Sora v1': 10, 'HeyGen': 10 },
                    ]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 700}} dy={10} />
                       <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                       <Tooltip cursor={{fill: '#F8F9FA'}} contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                       <Bar dataKey="Gemini 3.1 Pro" stackId="a" fill="#3B82F6" />
                       <Bar dataKey="Imagen 3" stackId="a" fill="#10B981" />
                       <Bar dataKey="Sora v1" stackId="a" fill="#8B5CF6" />
                       <Bar dataKey="HeyGen" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
            
            <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] flex flex-col">
               <h3 className="text-lg font-bold text-[var(--text-main)] mb-[var(--spacing-md)] tracking-tight">SaaS 功能模块依赖度</h3>
               <div className="flex-1 flex flex-col justify-center space-y-[var(--spacing-lg)]">
                 {[
                   { label: '电商视觉批量渲染', val: 38, color: 'bg-blue-500' },
                   { label: '品牌运营营销文案', val: 26, color: 'bg-green-500' },
                   { label: '数字人短视频', val: 22, color: 'bg-purple-500' },
                   { label: '智能报表生成', val: 14, color: 'bg-orange-500' },
                 ].map((item, i) => (
                   <div key={i}>
                     <div className="flex items-center justify-between mb-2">
                       <span className="text-[14px] font-bold text-gray-700">{item.label}</span>
                       <span className="text-[14px] font-black text-[var(--text-main)]">{item.val}%</span>
                     </div>
                     <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                       <div className={`${item.color} h-3 rounded-full`} style={{ width: `${item.val}%` }}></div>
                     </div>
                   </div>
                 ))}
               </div>
               <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
                  <div className="bg-blue-50 text-blue-700 p-4 rounded-[var(--radius-lg)] border border-blue-100">
                     <p className="text-xs font-bold mb-1">💡 优化建议</p>
                     <p className="text-[11px] font-medium leading-relaxed">
                        “视频生成”模块资源占用极高，但转化率与依赖度低于“电商视觉渲染”。建议在下一季度对专业版及 旗舰个人AI 版上调视频生成的基础计费单价，或降低套餐内包含的频次额度。
                     </p>
                  </div>
               </div>
            </div>
         </div>
      </div>
      )}
    </div>
  );
}
