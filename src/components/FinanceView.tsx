import React, { useState, useEffect } from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight, Receipt, FileSpreadsheet, Plus, Download, Filter, Building2, CreditCard, ExternalLink, Calendar as CalendarIcon, Search, AlertCircle, RefreshCcw, BellRing, ChevronDown, PieChart as PieChartIcon, DollarSign, ListTodo, CalendarDays } from 'lucide-react';
import { toast } from './Toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, AreaChart, Area, ComposedChart, PieChart, Pie, Cell } from 'recharts';
import { FinanceMeetingAssistant } from './FinanceMeetingAssistant';
import { CurrencyConverter, CurrencyCode } from '../utils/currency';

const CASH_FLOW_DATA = [
  { name: '1月', 收入: 120000, 支出: 45000 },
  { name: '2月', 收入: 135000, 支出: 52000 },
  { name: '3月', 收入: 158000, 支出: 48000 },
  { name: '4月', 收入: 142000, 支出: 61000 },
  { name: '5月', 收入: 185000, 支出: 59000 },
  { name: '6月', 收入: 210000, 支出: 65000 },
];

const ASSET_LIB_DATA = [
  { name: '1月', 资产: 500, 负债: 200 },
  { name: '2月', 资产: 520, 负债: 190 },
  { name: '3月', 资产: 580, 负债: 210 },
  { name: '4月', 资产: 610, 负债: 205 },
  { name: '5月', 资产: 750, 负债: 180 },
  { name: '6月', 资产: 864, 负债: 160 },
];

const PROFIT_LOSS_DATA = [
  { name: '1月', 净利润: 75000, 盈亏平衡点: 50000 },
  { name: '2月', 净利润: 83000, 盈亏平衡点: 50000 },
  { name: '3月', 净利润: 110000, 盈亏平衡点: 50000 },
  { name: '4月', 净利润: 81000, 盈亏平衡点: 50000 },
  { name: '5月', 净利润: 126000, 盈亏平衡点: 55000 },
  { name: '6月', 净利润: 145000, 盈亏平衡点: 55000 },
];

const COST_PIE_DATA = [
  { name: '行政开销', value: 25000 },
  { name: '服务器资源', value: 8650 },
  { name: '市场推广', value: 18500 },
  { name: '外部外包', value: 12850 },
];
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

const TRANSACTIONS = [
  { id: 'TRX-1092', date: '2026-06-08 10:23', target: '泛星跃动传媒', type: 'INCOME', amount: '+ ¥ 124,500.00', status: '已入账', category: '项目首款', originAmount: null, currency: 'CNY' },
  { id: 'TRX-1091', date: '2026-06-07 15:45', target: 'DigitalOcean Inc.', type: 'EXPENSE', amount: '- ¥ 3,650.00', status: '已支付', category: '服务器开销', originAmount: '$ 500.00', currency: 'USD' },
  { id: 'TRX-1090', date: '2026-06-05 09:30', target: '办公室租金', type: 'EXPENSE', amount: '- ¥ 25,000.00', status: '已支付', category: '行政支出', originAmount: null, currency: 'CNY' },
  { id: 'TRX-1089', date: '2026-05-22 14:10', target: 'Stripe Payments', type: 'INCOME', amount: '+ ¥ 7,300.00', status: '处理中', category: '海外回款', originAmount: '$ 1,000.00', currency: 'USD' },
];

const INVOICES = [
  { id: 'INV-20260601', client: '泛星跃动传媒', amount: '¥ 124,500.00', date: '2026-06-08', status: '待开票', type: '增值税专用发票' },
  { id: 'INV-20260528', client: '云创未来科技', amount: '¥ 32,800.00', date: '2026-05-28', status: '已开票', type: '增值税普通发票' },
];

export function FinanceView() {
   const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'invoices' | 'calendar'>('overview');
   const [isGenerating, setIsGenerating] = useState(false);
   const [period, setPeriod] = useState('2026上半年');
   const [alertsTriggered, setAlertsTriggered] = useState(false);
   const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
   const [showAuditModal, setShowAuditModal] = useState(false);
   const [isAuditing, setIsAuditing] = useState(false);
   
   const [currency, setCurrency] = useState<CurrencyCode>(CurrencyConverter.getCurrency());

   useEffect(() => {
     const unsubscribe = CurrencyConverter.subscribe((newCurrency) => {
       setCurrency(newCurrency);
     });
     return unsubscribe;
   }, []);

   const formatCurrency = (amountInCNY: number) => {
       return CurrencyConverter.formatAmount(amountInCNY);
   };

   const formatCurrencyStr = (str: string) => {
       return CurrencyConverter.formatString(str);
   };

   useEffect(() => {
      // Logic for automatic financial anomaly warning
      if (activeTab === 'overview' && !alertsTriggered) {
         setAlertsTriggered(true);
         setTimeout(() => {
            toast('财务智能预警：本月公关类支出增长达 28%，超过阈值', 'error');
         }, 2000);
      }
   }, [activeTab, alertsTriggered]);

   const handleGenerateReport = () => {
       setIsGenerating(true);
       setTimeout(() => {
           setIsGenerating(false);
           toast('AI 已自动生成本月财务结账报告并发送至您的邮箱', 'success');
       }, 1500);
   };

   const handleStartAudit = () => {
      setShowAuditModal(true);
      setIsAuditing(true);
      setTimeout(() => {
         setIsAuditing(false);
      }, 2500);
   };

   const filteredTransactions = selectedMonth ? TRANSACTIONS.filter((t) => t.date.includes(selectedMonth.replace('月', ''))) : [];

   return (
       <div className="layout-section layout-container animate-in fade-in slide-in-from-bottom-2 duration-300 h-[calc(100vh-4rem)] flex flex-col pt-8">
           <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 shrink-0">
               <div>
                   <h1 className="text-h1 flex items-center">
                       <Wallet className="w-8 h-8 mr-3 text-emerald-500" />
                       企业财务管理
                   </h1>
                   <p className="text-sub mt-2">资金流水监控、智能财务报表分析及发票管理，全方位掌握企业资金健康状况。</p>
               </div>
               <div className="mt-4 md:mt-0 flex space-x-3">
                   <div className="flex items-center space-x-1 mr-2 px-3 py-1.5 border border-[var(--border-color)] bg-white rounded-xl shadow-sm text-sm font-bold text-gray-600">
                       <DollarSign className="w-4 h-4 text-gray-400" />
                       <select value={currency} onChange={(e) => CurrencyConverter.setCurrency(e.target.value as CurrencyCode)} className="bg-transparent border-none focus:outline-none cursor-pointer">
                           <option value="CNY">CNY (人民币)</option>
                           <option value="USD">USD (美元)</option>
                           <option value="EUR">EUR (欧元)</option>
                           <option value="GBP">GBP (英镑)</option>
                           <option value="JPY">JPY (日元)</option>
                       </select>
                   </div>
                   <button onClick={handleGenerateReport} disabled={isGenerating} className="px-5 py-2 border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-sm font-bold text-[var(--text-main)] rounded-xl shadow-sm transition-colors flex items-center disabled:opacity-50">
                       {isGenerating ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                       生成AI财务报告
                   </button>
                   <button className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm flex items-center transition-colors">
                       <Plus className="w-4 h-4 mr-2" /> 记一笔
                   </button>
               </div>
           </div>

           <div className="mb-8 print:hidden">
              <FinanceMeetingAssistant />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 shrink-0">
               <div className="bg-white p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
                   <h3 className="text-sm font-bold text-gray-500 mb-1">企业总资产</h3>
                   <p className="text-3xl font-black text-gray-900 tracking-tight">{formatCurrency(864250)}</p>
                   <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-xs font-bold text-emerald-500">
                      <ArrowUpRight className="w-3 h-3 mr-1" /> 较上月增长 12.5%
                   </div>
               </div>
               <div className="bg-white p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
                   <h3 className="text-sm font-bold text-gray-500 mb-1">本月总收入</h3>
                   <p className="text-3xl font-black text-emerald-600 tracking-tight">{formatCurrency(210000)}</p>
                   <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold">
                      <span className="text-emerald-500 flex items-center"><ArrowUpRight className="w-3 h-3 mr-1" /> +13.5%</span>
                      <span className="text-gray-400">主要来自: 项目首款</span>
                   </div>
               </div>
               <div className="bg-white p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
                   <h3 className="text-sm font-bold text-gray-500 mb-1">本月总支出</h3>
                   <p className="text-3xl font-black text-rose-500 tracking-tight">{formatCurrency(65000)}</p>
                   <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold">
                      <span className="text-rose-500 flex items-center"><ArrowDownRight className="w-3 h-3 mr-1" /> +10.1%</span>
                      <span className="text-gray-400">主要来自: 行政支出</span>
                   </div>
               </div>
               <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                      <Wallet className="w-24 h-24 text-emerald-600" />
                   </div>
                   <h3 className="text-sm font-bold text-emerald-800 mb-1 relative z-10">AI 财务健康评分</h3>
                   <p className="text-4xl font-black text-emerald-600 tracking-tight flex items-baseline relative z-10">
                      94 <span className="text-sm font-bold text-emerald-800 ml-1">/ 100 极佳</span>
                   </p>
                   <div className="mt-4 pt-4 border-t border-emerald-200/50 flex flex-col space-y-1 text-xs font-bold text-emerald-700 relative z-10">
                      <span className="flex items-center"><AlertCircle className="w-3 h-3 justify-center mr-1" /> 资金链流动性充足</span>
                      <span className="flex items-center"><AlertCircle className="w-3 h-3 justify-center mr-1" /> 成本控制在合理范围</span>
                   </div>
               </div>
           </div>

           <div className="flex justify-between items-end border-b border-[var(--border-color)] mb-6 shrink-0">
               <div className="flex space-x-6">
                   <button onClick={() => setActiveTab('overview')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>财务概览</button>
                   <button onClick={() => setActiveTab('transactions')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'transactions' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>收支明细</button>
                   <button onClick={() => setActiveTab('invoices')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'invoices' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>票税管理</button>
                   <button onClick={() => setActiveTab('calendar')} className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center ${activeTab === 'calendar' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}><CalendarDays className="w-4 h-4 mr-1.5" /> 财税日历</button>
               </div>
               
               {activeTab === 'overview' && (
                  <div className="pb-2">
                     <button className="flex items-center text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm hover:bg-gray-50 transition-colors">
                        <CalendarIcon className="w-4 h-4 mr-2 text-emerald-500" /> {period} <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
                     </button>
                  </div>
               )}
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
              {activeTab === 'overview' && (
                 <div className="space-y-6">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-white p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
                           <div className="flex items-center justify-between mb-6">
                               <h3 className="font-bold text-gray-800">现金流与损益平衡分析</h3>
                               <span className="text-[10px] font-bold text-gray-500 flex items-center"><PieChartIcon className="w-3 h-3 mr-1" /> 多维度拆解</span>
                           </div>
                           <div className="h-[260px] w-full">
                               <ResponsiveContainer width="100%" height="100%">
                                   <ComposedChart data={PROFIT_LOSS_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} onClick={(e) => { if(e && e.activeLabel) setSelectedMonth(e.activeLabel); }}>
                                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 'bold' }} dy={10} />
                                       <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 'bold' }} tickFormatter={(val) => `¥${val/1000}k`} />
                                       <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                                       <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }} />
                                       <Bar dataKey="净利润" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                       <Line type="monotone" dataKey="盈亏平衡点" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" />
                                   </ComposedChart>
                               </ResponsiveContainer>
                           </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
                           <div className="flex items-center justify-between mb-6">
                               <h3 className="font-bold text-gray-800">月度资产负债走势 (千元)</h3>
                           </div>
                           <div className="h-[260px] w-full">
                               <ResponsiveContainer width="100%" height="100%">
                                   <AreaChart data={ASSET_LIB_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} onClick={(e) => { if(e && e.activeLabel) setSelectedMonth(e.activeLabel); }}>
                                      <defs>
                                        <linearGradient id="colorAsset" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 'bold' }} dy={10} />
                                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 'bold' }} />
                                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                                      <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }} />
                                      <Area type="monotone" dataKey="资产" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAsset)" strokeWidth={2} />
                                      <Area type="monotone" dataKey="负债" stroke="#ef4444" fillOpacity={1} fill="url(#colorDebt)" strokeWidth={2} />
                                   </AreaChart>
                               </ResponsiveContainer>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-6 duration-500">
                        <div className="bg-white p-6 rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col items-center">
                           <h3 className="font-bold text-gray-800 mb-2 w-full text-left">当月成本多维结构</h3>
                           <div className="h-[200px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                 <PieChart>
                                    <Pie data={COST_PIE_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                       {COST_PIE_DATA.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
                                       ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                 </PieChart>
                              </ResponsiveContainer>
                           </div>
                        </div>

                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col">
                           <div className="flex items-center justify-between mb-6">
                               <h3 className="font-bold text-gray-800">业务级异常财务预警与洞察</h3>
                               <div className="flex space-x-3">
                                  <span className="bg-red-50 text-red-600 text-[10px] px-2 py-0.5 rounded font-bold border border-red-100 flex items-center"><BellRing className="w-3 h-3 mr-1" /> 实施监控中</span>
                                  <button onClick={handleStartAudit} className="bg-white hover:bg-gray-50 text-emerald-600 text-[11px] px-3 py-1 rounded-lg font-bold border border-gray-200 flex items-center transition-colors shadow-sm"><Search className="w-3 h-3 mr-1" /> AI 财务风险审计</button>
                               </div>
                           </div>
                           <div className="flex-1 space-y-4">
                               <div className="p-4 border border-rose-100 bg-rose-50/50 rounded-xl relative overflow-hidden group hover:border-rose-200 transition-colors">
                                  <div className="flex justify-between items-start relative z-10">
                                     <h4 className="text-[13px] font-bold text-rose-800 mb-1 flex items-center">
                                       <AlertCircle className="w-4 h-4 mr-1.5 text-rose-500" /> 营销成本激增预警
                                     </h4>
                                     <span className="text-[10px] font-bold text-rose-500 bg-white border border-rose-100 px-2 py-0.5 rounded">优先级: 高</span>
                                  </div>
                                  <p className="text-[12px] text-gray-600 font-medium leading-relaxed relative z-10 mt-1">本月营销推广类目支出环比 5 月急剧增长了 <span className="font-bold text-rose-600">28%</span>，当前 ROI（投资回报率）低于历史警戒线。建议审核广告投放台及渠道表现。</p>
                               </div>
                               <div className="p-4 border border-amber-100 bg-amber-50/50 rounded-xl">
                                  <h4 className="text-[13px] font-bold text-amber-800 mb-1 flex items-center">现金流周期提示</h4>
                                  <p className="text-[12px] text-gray-600 font-medium leading-relaxed mt-1">预计下月有 82,000 元税款和房租需缴纳，回款预期能够覆盖，但需跟进【静茹工作室】的尾单支付。</p>
                               </div>
                               <div className="p-4 border border-emerald-100 bg-emerald-50/50 rounded-xl">
                                  <h4 className="text-[13px] font-bold text-emerald-800 mb-1">主营业务营收稳健</h4>
                                  <p className="text-[12px] text-gray-600 font-medium leading-relaxed mt-1">过去3个月营收连续 12% 增长，且核心主营业务占比健康 (78%)。</p>
                               </div>
                           </div>
                        </div>
                     </div>
                 </div>
              )}

              {selectedMonth && (
                 <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-100 shadow-2xl p-6 z-20 animate-in slide-in-from-right-4 duration-300 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                       <h3 className="font-bold text-gray-800">{selectedMonth} 流水明细联动</h3>
                       <button onClick={() => setSelectedMonth(null)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">关闭</button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                       {filteredTransactions.length > 0 ? filteredTransactions.map((trx) => (
                           <div key={trx.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                              <div className="flex justify-between items-start mb-1">
                                 <span className="text-[12px] font-bold text-gray-800">{trx.target}</span>
                                 <span className={`text-[12px] font-black ${trx.type === 'INCOME' ? 'text-emerald-600' : 'text-gray-900'}`}>{trx.amount}</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-gray-500 font-medium">
                                 <span>{trx.category}</span>
                                 <span>{trx.date.substring(5, 10)}</span>
                              </div>
                           </div>
                       )) : <div className="text-center text-sm text-gray-400 py-10">未找到对应月份交易明细</div>}
                    </div>
                 </div>
              )}

              {showAuditModal && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                       <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                          <div>
                             <h3 className="text-lg font-black text-gray-800 flex items-center"><Search className="w-5 h-5 mr-2 text-emerald-500" /> AI 财务风险审计报告</h3>
                             <p className="text-xs text-gray-500 mt-1">自动分析所有历史流水记录，识别潜在税务和合规风险</p>
                          </div>
                          <button onClick={() => setShowAuditModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">关闭确认</button>
                       </div>
                       
                       <div className="p-6">
                           {isAuditing ? (
                              <div className="flex flex-col items-center justify-center py-12">
                                 <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                 <p className="text-sm font-bold text-gray-600">AI 正在抓取并核对账目及发票数据...</p>
                              </div>
                           ) : (
                              <div className="space-y-6">
                                 <div className="flex items-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                                    <AlertCircle className="w-8 h-8 text-amber-500 mr-4" />
                                    <div>
                                       <h4 className="text-sm font-bold text-amber-900 mb-1">发现 2 处潜在合规风险</h4>
                                       <p className="text-xs text-amber-700 font-medium">建议财务负责人复核相关凭证与税务归类</p>
                                    </div>
                                 </div>
                                 
                                 <div className="space-y-3">
                                    <div className="p-4 border border-rose-100 bg-white rounded-xl shadow-sm hover:border-rose-300 transition-colors cursor-pointer group">
                                       <div className="flex justify-between items-start mb-2">
                                          <span className="text-sm font-bold text-gray-800 group-hover:text-rose-600 transition-colors">海外云服务支出异常归类 (非标发票)</span>
                                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">高风险 (税务抵扣)</span>
                                       </div>
                                       <p className="text-xs text-gray-500 font-medium leading-relaxed mb-3">记录 <span className="font-bold text-gray-700">TRX-1091 (DigitalOcean Inc.)</span> 为无发票外汇支付，目前仅归为“服务器开销”。可能会导致企业所得税前扣除凭证不合规。</p>
                                       <div className="bg-rose-50 p-3 rounded-lg border border-rose-100 mb-3">
                                          <p className="text-[11px] font-bold text-rose-800 mb-1">AI 整改建议：</p>
                                          <p className="text-[11px] text-rose-700 font-medium">建议按“代扣代缴税收通用缴款书”补充税务凭证，并重分类为“特许权使用费”。</p>
                                       </div>
                                       <div className="flex justify-end space-x-2">
                                          <button className="text-[11px] font-bold px-3 py-1.5 border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 rounded-lg transition-colors">指派复核</button>
                                          <button className="text-[11px] font-bold px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center shadow-sm">
                                             自动修正记账凭证分类
                                          </button>
                                       </div>
                                    </div>

                                    <div className="p-4 border border-amber-100 bg-white rounded-xl shadow-sm hover:border-amber-300 transition-colors cursor-pointer group">
                                       <div className="flex justify-between items-start mb-2">
                                          <span className="text-sm font-bold text-gray-800 group-hover:text-amber-600 transition-colors">非规律性大额个人户转出</span>
                                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">中风险 (合规说明)</span>
                                       </div>
                                       <p className="text-xs text-gray-500 font-medium leading-relaxed mb-3">在 6月2日 向 <span className="font-bold text-gray-700">静茹个人工作室</span> 转账 <span className="font-bold text-gray-700">¥ 8,600.00</span>。个人账户交易大于5000元，可能存在劳务报酬漏报风险。</p>
                                       <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 mb-3">
                                          <p className="text-[11px] font-bold text-amber-800 mb-1">AI 整改建议：</p>
                                          <p className="text-[11px] text-amber-700 font-medium">补充相关用工合同及服务交付物证明，并登记个税代扣代缴台账信息。</p>
                                       </div>
                                       <div className="flex justify-end space-x-2">
                                          <button className="text-[11px] font-bold px-3 py-1.5 border border-amber-200 text-amber-600 bg-white hover:bg-amber-50 rounded-lg transition-colors">驳回补充说明</button>
                                          <button className="text-[11px] font-bold px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center shadow-sm">
                                             生成代扣代缴申报草稿
                                          </button>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           )}
                       </div>
                    </div>
                 </div>
              )}

              {activeTab === 'transactions' && (
                 <div className="bg-white rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                    <div className="p-4 border-b border-[var(--border-color)] bg-gray-50 flex items-center justify-between">
                       <div className="relative w-64">
                          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input type="text" placeholder="搜索流水号、对象或类目..." className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                       </div>
                       <div className="flex space-x-2">
                          <button className="px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-sm font-bold text-gray-600 rounded-lg flex items-center transition-colors">
                             <Filter className="w-4 h-4 mr-1.5" /> 筛选
                          </button>
                          <button className="px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-sm font-bold text-gray-600 rounded-lg flex items-center transition-colors">
                             <Download className="w-4 h-4 mr-1.5" /> 导出Excel
                          </button>
                       </div>
                    </div>
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="bg-white border-b border-gray-200 text-xs text-gray-500 font-bold uppercase tracking-wider">
                             <th className="py-4 px-6 font-medium">流水号 / 时间</th>
                             <th className="py-4 px-6 font-medium">交易对象</th>
                             <th className="py-4 px-6 font-medium">类目</th>
                             <th className="py-4 px-6 font-medium text-right">金额 (元)</th>
                             <th className="py-4 px-6 font-medium text-center">状态</th>
                             <th className="py-4 px-6 font-medium text-right">操作</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100 text-sm">
                          {TRANSACTIONS.map((trx) => (
                             <tr key={trx.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="py-4 px-6">
                                   <div className="font-bold text-gray-800">{trx.id}</div>
                                   <div className="text-[11px] text-gray-400 font-medium">{trx.date}</div>
                                </td>
                                <td className="py-4 px-6 font-bold text-gray-700 flex items-center">
                                   {trx.type === 'INCOME' ? <ArrowDownRight className="w-4 h-4 text-emerald-500 mr-2" /> : <ArrowUpRight className="w-4 h-4 text-rose-500 mr-2" />}
                                   {trx.target}
                                </td>
                                <td className="py-4 px-6 text-gray-600 font-medium">{trx.category}</td>
                                <td className="py-4 px-6 font-black text-right">
                                   <div className={trx.type === 'INCOME' ? 'text-emerald-600' : 'text-gray-900'}>{trx.amount}</div>
                                   {trx.originAmount && <div className="text-[10px] text-gray-400 font-medium mt-0.5">{trx.originAmount} (智能汇率换算)</div>}
                                </td>
                                <td className="py-4 px-6 text-center">
                                   <span className={`px-2 py-1 rounded text-[11px] font-bold ${trx.status === '已入账' || trx.status === '已支付' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                      {trx.status}
                                   </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                   <button className="text-[12px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors">查看凭证</button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              )}

              {activeTab === 'invoices' && (
                 <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="bg-white p-5 rounded-2xl border border-[var(--border-color)] shadow-sm flex items-center justify-between">
                          <div>
                             <p className="text-[12px] font-bold text-gray-500 mb-1">待开票总额</p>
                             <p className="text-xl font-black text-amber-600">{formatCurrencyStr('¥ 124,500.00')}</p>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                             <Receipt className="w-5 h-5 text-amber-500" />
                          </div>
                       </div>
                       <div className="bg-white p-5 rounded-2xl border border-[var(--border-color)] shadow-sm flex items-center justify-between">
                          <div>
                             <p className="text-[12px] font-bold text-gray-500 mb-1">本月已开票金额</p>
                             <p className="text-xl font-black text-emerald-600">{formatCurrencyStr('¥ 86,200.00')}</p>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                             <Receipt className="w-5 h-5 text-emerald-500" />
                          </div>
                       </div>
                       <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl flex flex-col justify-center items-center cursor-pointer hover:bg-indigo-100 transition-colors">
                          <Plus className="w-6 h-6 text-indigo-600 mb-1" />
                          <span className="text-[13px] font-bold text-indigo-800">手工开具新发票</span>
                       </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden">
                       <div className="p-4 border-b border-[var(--border-color)] bg-gray-50">
                          <h3 className="font-bold text-gray-800 text-[14px]">近期发票任务</h3>
                       </div>
                       <div className="divide-y divide-gray-100">
                          {INVOICES.map((inv) => (
                             <div key={inv.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-start space-x-4">
                                   <div className={`p-2 rounded-lg ${inv.status === '待开票' ? 'bg-amber-100' : 'bg-emerald-100'} shrink-0`}>
                                      <Receipt className={`w-5 h-5 ${inv.status === '待开票' ? 'text-amber-600' : 'text-emerald-600'}`} />
                                   </div>
                                   <div>
                                      <div className="flex items-center space-x-2 mb-1">
                                         <h4 className="font-bold text-gray-800 text-sm">{inv.client}</h4>
                                         <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${inv.status === '待开票' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{inv.status}</span>
                                      </div>
                                      <p className="text-xs font-medium text-gray-500 flex items-center space-x-3">
                                         <span>{inv.id}</span>
                                         <span>|</span>
                                         <span className="flex items-center"><CalendarIcon className="w-3 h-3 mr-1" /> {inv.date}</span>
                                         <span>|</span>
                                         <span>{inv.type}</span>
                                      </p>
                                   </div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                   <span className="font-black text-[16px] text-gray-900 mb-2">{formatCurrencyStr(inv.amount)}</span>
                                   {inv.status === '待开票' ? (
                                      <button className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded transition-colors shadow-sm">
                                         立即开具电子发票
                                      </button>
                                   ) : (
                                      <button className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center">
                                         <Download className="w-3 h-3 mr-1" /> 下载 PDF
                                      </button>
                                   )}
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              )}

               {activeTab === 'calendar' && (
                   <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                      <div className="bg-white rounded-2xl border border-[var(--border-color)] p-6 shadow-sm">
                         <div className="flex items-center justify-between mb-6">
                            <div>
                               <h3 className="font-bold text-gray-800 text-[15px] flex items-center"><CalendarDays className="w-5 h-5 text-indigo-500 mr-2" /> 财税日历与合规关键节点</h3>
                               <p className="text-[12px] text-gray-500 font-medium mt-1">跟踪即将到来的税务申报、审计窗口与大额账单期限</p>
                            </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                            {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                               <div key={day} className="text-center text-[11px] font-black text-gray-400 py-2 border-b border-gray-100">{day}</div>
                            ))}
                            {Array.from({ length: 30 }).map((_, idx) => {
                               const day = idx + 1;
                               let content = null;
                               if (day === 15) content = <div className="mt-1 p-1 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[9px] font-bold leading-tight">企税月报</div>;
                               if (day === 20) content = <div className="mt-1 p-1 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[9px] font-bold leading-tight">研发备查</div>;
                               if (day === 28) content = <div className="mt-1 p-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[9px] font-bold leading-tight">结款期</div>;

                               return (
                                   <div key={idx} className={`min-h-[80px] p-2 border ${content ? 'border-gray-200 shadow-sm bg-white cursor-pointer hover:border-indigo-300 transition-colors' : 'border-gray-50 bg-gray-50/50'} rounded-lg flex flex-col`}>
                                      <span className={`text-[12px] font-black ${content ? 'text-gray-900' : 'text-gray-400'}`}>{day}</span>
                                      {content}
                                   </div>
                               );
                            })}
                         </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm">
                         <div className="p-4 border-b border-[var(--border-color)] bg-gray-50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 text-[14px]">近期需关注合规事件</h3>
                            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors" onClick={() => {
                                toast('已将财税事项同步到全局任务流', 'success');
                                window.dispatchEvent(new CustomEvent('SYNC_CRM_TASKS', { 
                                  detail: [
                                     { id: `fiscal-task-1-${Date.now()}`, title: "【税务】完成二季度企业所得税汇总申报", dueDate: new Date(Date.now() + 86400000 * 5), priority: 'high', type: '财务合规审批' },
                                     { id: `fiscal-task-2-${Date.now()}`, title: "【合规】准备研发费用加计扣除备查材料", dueDate: new Date(Date.now() + 86400000 * 10), priority: 'medium', type: '任务分配' },
                                     { id: `fiscal-task-3-${Date.now()}`, title: "【账单】大额供应商结款安排", dueDate: new Date(Date.now() + 86400000 * 18), priority: 'high', type: '报销与支付' }
                                  ]
                                }));
                            }}>一键同步至任务中心</button>
                         </div>
                         <div className="divide-y divide-gray-100">
                             <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
                                 <div className="flex items-center space-x-3">
                                     <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100 shrink-0">
                                        <AlertCircle className="w-5 h-5 text-rose-500" />
                                     </div>
                                     <div>
                                        <h4 className="text-sm font-bold text-gray-800 mb-0.5">企业所得税月度预缴申报</h4>
                                        <p className="text-xs font-medium text-gray-500">截止至本月15日，预计应报税额：{formatCurrencyStr('¥ 45,000.00')}</p>
                                     </div>
                                 </div>
                                 <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-100">剩 3 天</span>
                             </div>
                         </div>
                      </div>
                   </div>
               )}
           </div>
       </div>
   );
}
