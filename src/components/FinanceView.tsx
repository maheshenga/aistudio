import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight, Receipt, FileSpreadsheet, Plus, Download, Filter, Building2, CreditCard, ExternalLink, Calendar as CalendarIcon, Search, AlertCircle, RefreshCcw, BellRing, ChevronDown, PieChart as PieChartIcon, DollarSign, ListTodo, CalendarDays } from 'lucide-react';
import { toast } from './Toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, AreaChart, Area, ComposedChart, PieChart, Pie, Cell } from 'recharts';
import { FinanceMeetingAssistant } from './FinanceMeetingAssistant';
import { CurrencyConverter, CurrencyCode } from '../utils/currency';
import { useSaasSession } from '../saas/SaasAuthContext';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import {
  buildDailyRevenueSeries,
  buildWorkspaceInvoices,
  loadWorkspaceFinancialRecords,
  summarizeWorkspaceFinancials,
  type WorkspaceFinancialRecord,
  type WorkspaceInvoiceRow,
} from '../lib/data/financialRepository';
import { createWorkspaceTask, loadWorkspaceTasks } from '../lib/data/taskRepository';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

type FinanceTransactionRow = {
  id: string;
  date: string;
  periodLabel: string;
  target: string;
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  status: string;
  settled: boolean;
  category: string;
  originAmount: string | null;
};

type FinanceInvoiceDisplayRow = WorkspaceInvoiceRow & {
  client: string;
  typeLabel: string;
  statusLabel: string;
  isPending: boolean;
};

type FinanceRiskFinding = {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  severityLabel: string;
  description: string;
  suggestion: string;
  borderClass: string;
  badgeClass: string;
  panelClass: string;
};

const INCOME_RECORD_KINDS = new Set(['subscription', 'invoice', 'payment', 'credit']);
const EXPENSE_RECORD_KINDS = new Set(['refund', 'withdrawal']);
const SETTLED_RECORD_STATUSES = new Set(['paid', 'issued', 'approved', 'refunded']);

function startOfMonth(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function addMonths(timestamp: number, count: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth() + count, 1).getTime();
}

function dayLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
}

function metadataText(record: WorkspaceFinancialRecord, key: string, fallback: string): string {
  const value = record.metadata[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function isExpenseRecord(record: WorkspaceFinancialRecord): boolean {
  return EXPENSE_RECORD_KINDS.has(record.kind);
}

function isIncomeRecord(record: WorkspaceFinancialRecord): boolean {
  return INCOME_RECORD_KINDS.has(record.kind) && !isExpenseRecord(record);
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    paid: '已入账',
    pending: '处理中',
    issued: '已开票',
    refunded: '已退款',
    cancelled: '已取消',
    approved: '已审批',
  };
  return labels[status] ?? status;
}

function riskStyle(severity: FinanceRiskFinding['severity']) {
  if (severity === 'high') {
    return {
      borderClass: 'border-rose-100 bg-rose-50/50 hover:border-rose-300',
      badgeClass: 'text-rose-600 bg-rose-50 border-rose-100',
      panelClass: 'bg-rose-50 border-rose-100 text-rose-700',
    };
  }
  if (severity === 'medium') {
    return {
      borderClass: 'border-amber-100 bg-amber-50/50 hover:border-amber-300',
      badgeClass: 'text-amber-600 bg-amber-50 border-amber-100',
      panelClass: 'bg-amber-50 border-amber-100 text-amber-700',
    };
  }
  if (severity === 'low') {
    return {
      borderClass: 'border-blue-100 bg-blue-50/50 hover:border-blue-300',
      badgeClass: 'text-blue-600 bg-blue-50 border-blue-100',
      panelClass: 'bg-blue-50 border-blue-100 text-blue-700',
    };
  }
  return {
    borderClass: 'border-emerald-100 bg-emerald-50/50 hover:border-emerald-300',
    badgeClass: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    panelClass: 'bg-emerald-50 border-emerald-100 text-emerald-700',
  };
}

function createRiskFinding(
  finding: Omit<FinanceRiskFinding, 'borderClass' | 'badgeClass' | 'panelClass'>,
): FinanceRiskFinding {
  return { ...finding, ...riskStyle(finding.severity) };
}

function buildFinanceRiskFindings(
  records: WorkspaceFinancialRecord[],
  summary: ReturnType<typeof summarizeWorkspaceFinancials>,
): FinanceRiskFinding[] {
  if (records.length === 0) {
    return [
      createRiskFinding({
        id: 'empty-ledger',
        title: '暂无可审计流水',
        severity: 'info',
        severityLabel: '待接入',
        description: '当前工作区尚未写入财务流水，风险审计会在账单、充值或发票记录产生后自动覆盖。',
        suggestion: '先通过账单充值、订阅变更或发票记录建立财务数据源。',
      }),
    ];
  }

  const findings: FinanceRiskFinding[] = [];
  if (summary.monthlyRevenueChangePercent < 0) {
    findings.push(createRiskFinding({
      id: 'revenue-drop',
      title: '本月收入环比下降',
      severity: 'high',
      severityLabel: '高风险',
      description: `本月净收入较上月变化 ${summary.monthlyRevenueChangePercent}%，需要复核续费、退款与发票确认节奏。`,
      suggestion: '导出本月财务报告并核对主要客户的付款、退款和发票状态。',
    }));
  }
  if (summary.pendingWithdrawalCents > 0) {
    findings.push(createRiskFinding({
      id: 'pending-withdrawals',
      title: '存在待审批提现或结算',
      severity: 'medium',
      severityLabel: '中风险',
      description: `当前仍有 ${Math.round(summary.pendingWithdrawalCents / 100).toLocaleString()} 元待处理结算，可能影响现金流预测。`,
      suggestion: '确认审批人、付款账户和结算凭证，避免月底集中处理。',
    }));
  }
  if (summary.refundCount > 0) {
    findings.push(createRiskFinding({
      id: 'refunds',
      title: '本月发生退款记录',
      severity: 'medium',
      severityLabel: '中风险',
      description: `本月共 ${summary.refundCount} 笔退款或冲正，需要确认收入抵减和客户原因归类。`,
      suggestion: '将退款原因同步到客户成功与账单模块，避免重复确认收入。',
    }));
  }

  const foreignCurrencyCount = records.filter((record) => record.currency !== 'CNY').length;
  if (foreignCurrencyCount > 0) {
    findings.push(createRiskFinding({
      id: 'foreign-currency',
      title: '存在外币财务记录',
      severity: 'low',
      severityLabel: '低风险',
      description: `已发现 ${foreignCurrencyCount} 笔非 CNY 流水，需要保留汇率换算和付款凭证。`,
      suggestion: '在月结报告中附上原币金额、换算汇率和服务商凭据。',
    }));
  }

  const pendingInvoiceCount = records.filter((record) => record.kind === 'invoice' && record.status === 'pending').length;
  if (pendingInvoiceCount > 0) {
    findings.push(createRiskFinding({
      id: 'pending-invoices',
      title: '存在待开票收入',
      severity: 'low',
      severityLabel: '低风险',
      description: `当前有 ${pendingInvoiceCount} 张待处理发票，需要跟进开票与交付验收状态。`,
      suggestion: '优先处理金额较大的待开票记录，并同步客户抬头与税号信息。',
    }));
  }

  if (findings.length === 0) {
    findings.push(createRiskFinding({
      id: 'healthy-ledger',
      title: '未发现高优先级财务风险',
      severity: 'info',
      severityLabel: '健康',
      description: '当前财务流水、退款、提现和发票状态没有触发主要风险规则。',
      suggestion: '保持月结导出和审计日志留痕，便于后续追踪。',
    }));
  }

  return findings;
}

function downloadJsonFile(fileName: string, payload: unknown): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function FinanceView() {
   const session = useSaasSession();
   const financeContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
   const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'invoices' | 'calendar'>('overview');
   const [isGenerating, setIsGenerating] = useState(false);
   const [period, setPeriod] = useState('2026上半年');
   const [alertsTriggered, setAlertsTriggered] = useState(false);
   const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
   const [showAuditModal, setShowAuditModal] = useState(false);
   const [isAuditing, setIsAuditing] = useState(false);
   const [financialRecords, setFinancialRecords] = useState<WorkspaceFinancialRecord[]>(() =>
     loadWorkspaceFinancialRecords(financeContext),
   );
   const [auditFindings, setAuditFindings] = useState<FinanceRiskFinding[]>([]);
   
   const [currency, setCurrency] = useState<CurrencyCode>(CurrencyConverter.getCurrency());

   useEffect(() => {
     const refreshRecords = () => setFinancialRecords(loadWorkspaceFinancialRecords(financeContext));
     const handleRecordsUpdated = (event: Event) => {
       const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
       if (detail?.workspaceId && detail.workspaceId !== session.workspace.id) return;
       refreshRecords();
     };

     refreshRecords();
     window.addEventListener('financial_records_updated', handleRecordsUpdated);
     window.addEventListener('storage', refreshRecords);
     return () => {
       window.removeEventListener('financial_records_updated', handleRecordsUpdated);
       window.removeEventListener('storage', refreshRecords);
     };
   }, [financeContext, session.workspace.id]);

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

   const formatCurrencyCents = (amountCents: number, recordCurrency = 'CNY') => {
      const amount = Math.round(amountCents) / 100;
      if (recordCurrency.toUpperCase() === 'CNY') return CurrencyConverter.formatAmount(amount);
      return `${recordCurrency.toUpperCase()} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
   };

   const now = Date.now();
   const currentMonthStart = startOfMonth(now);
   const nextMonthStart = addMonths(currentMonthStart, 1);
   const summary = useMemo(() => summarizeWorkspaceFinancials(financialRecords), [financialRecords]);
   const dailyRevenueSeries = useMemo(() => buildDailyRevenueSeries(financialRecords, { days: 7 }), [financialRecords]);
   const reportChartData = useMemo(() => {
      const baseline = Math.round((summary.previousMonthlyRevenueCents / 100) / 30);
      return dailyRevenueSeries.map((point) => ({
         name: point.name,
         revenue: point.revenue,
         baseline,
      }));
   }, [dailyRevenueSeries, summary.previousMonthlyRevenueCents]);
   const totalAssetCents = useMemo(
      () => financialRecords.reduce((total, record) => {
         if (isExpenseRecord(record)) return total - record.amountCents;
         if (isIncomeRecord(record) && SETTLED_RECORD_STATUSES.has(record.status)) return total + record.amountCents;
         return total;
      }, 0),
      [financialRecords],
   );
   const monthlyExpenseCents = useMemo(
      () => financialRecords
        .filter((record) => record.occurredAt >= currentMonthStart && record.occurredAt < nextMonthStart && isExpenseRecord(record))
        .reduce((total, record) => total + record.amountCents, 0),
      [currentMonthStart, financialRecords, nextMonthStart],
   );
   const assetLiabilityData = useMemo(() => {
      const length = Math.max(1, dailyRevenueSeries.length);
      return dailyRevenueSeries.map((point, index) => ({
         name: point.name,
         asset: Math.max(0, Math.round((Math.max(0, totalAssetCents) / 100) * ((index + 1) / length))),
         liability: Math.max(0, Math.round((summary.pendingWithdrawalCents / 100) * ((index + 1) / length))),
      }));
   }, [dailyRevenueSeries, summary.pendingWithdrawalCents, totalAssetCents]);
   const costPieData = useMemo(() => {
      const grouped = new Map<string, number>();
      for (const record of financialRecords) {
         if (record.occurredAt < currentMonthStart || record.occurredAt >= nextMonthStart || !isExpenseRecord(record)) continue;
         const category = metadataText(record, 'operation', record.kind);
         grouped.set(category, (grouped.get(category) ?? 0) + Math.round(record.amountCents / 100));
      }
      return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
   }, [currentMonthStart, financialRecords, nextMonthStart]);
   const liveRiskFindings = useMemo(
      () => buildFinanceRiskFindings(financialRecords, summary),
      [financialRecords, summary],
   );
   const modalRiskFindings = auditFindings.length > 0 ? auditFindings : liveRiskFindings;
   const riskCount = liveRiskFindings.filter((finding) => finding.severity !== 'info').length;
   const healthScore = Math.max(
      60,
      Math.min(99, 92 + Math.min(6, Math.round(summary.monthlyRevenueChangePercent / 10)) - riskCount * 4),
   );
   const transactionRows = useMemo<FinanceTransactionRow[]>(
      () => financialRecords.map((record) => {
         const expense = isExpenseRecord(record);
         const originAmount = record.currency === 'CNY'
            ? null
            : `${record.currency} ${(record.amountCents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
         return {
            id: record.id,
            date: new Date(record.occurredAt).toLocaleString(),
            periodLabel: dayLabel(record.occurredAt),
            target: record.counterparty,
            type: expense ? 'EXPENSE' : 'INCOME',
            amount: `${expense ? '-' : '+'} ${formatCurrencyCents(record.amountCents, record.currency)}`,
            status: statusLabel(record.status),
            settled: SETTLED_RECORD_STATUSES.has(record.status),
            category: metadataText(record, 'operation', record.kind),
            originAmount,
         };
      }),
      [currency, financialRecords],
   );
   const invoiceRows = useMemo<FinanceInvoiceDisplayRow[]>(() => {
      const recordsById = new Map<string, WorkspaceFinancialRecord>(financialRecords.map((record) => [record.id, record]));
      return buildWorkspaceInvoices(financialRecords).map((invoice) => {
         const source = recordsById.get(invoice.sourceRecordId);
         return {
            ...invoice,
            client: source?.counterparty ?? session.workspace.name,
            typeLabel: source ? metadataText(source, 'invoiceType', '工作区电子发票') : '工作区电子发票',
            statusLabel: statusLabel(invoice.status),
            isPending: invoice.status === 'pending',
         };
      });
   }, [financialRecords, session.workspace.name]);
   const pendingInvoiceTotalCents = invoiceRows
      .filter((invoice) => invoice.isPending)
      .reduce((total, invoice) => total + invoice.amountCents, 0);
   const issuedInvoiceTotalCents = invoiceRows
      .filter((invoice) => !invoice.isPending)
      .reduce((total, invoice) => total + invoice.amountCents, 0);
   const topRevenueCategory = transactionRows.find((row) => row.type === 'INCOME')?.category ?? '暂无收入流水';
   const topExpenseCategory = transactionRows.find((row) => row.type === 'EXPENSE')?.category ?? '暂无支出流水';

   useEffect(() => {
      if (activeTab === 'overview' && !alertsTriggered) {
         setAlertsTriggered(true);
         const urgentFinding = liveRiskFindings.find((finding) => finding.severity === 'high' || finding.severity === 'medium');
         if (urgentFinding) {
            toast(`财务智能预警：${urgentFinding.title}`, urgentFinding.severity === 'high' ? 'error' : 'warning');
         }
      }
   }, [activeTab, alertsTriggered, liveRiskFindings]);

   const handleGenerateReport = () => {
       setIsGenerating(true);
       try {
          const latestRecords = loadWorkspaceFinancialRecords(financeContext);
          const latestSummary = summarizeWorkspaceFinancials(latestRecords);
          const latestSeries = buildDailyRevenueSeries(latestRecords, { days: 7 });
          const latestInvoices = buildWorkspaceInvoices(latestRecords);
          setFinancialRecords(latestRecords);
          downloadJsonFile(`finance-report-${session.workspace.slug}-${Date.now()}.json`, {
             workspaceId: session.workspace.id,
             period,
             generatedAt: new Date().toISOString(),
             summary: latestSummary,
             dailyRevenueSeries: latestSeries,
             invoices: latestInvoices,
             recordCount: latestRecords.length,
          });
          logAuditEvent(
            {
              action: 'financial_report_export',
              moduleId: 'finance',
              targetType: 'workspace',
              targetId: session.workspace.id,
              metadata: {
                period,
                recordCount: latestRecords.length,
                invoiceCount: latestInvoices.length,
                monthlyRevenueCents: latestSummary.monthlyRevenueCents,
                pendingWithdrawalCents: latestSummary.pendingWithdrawalCents,
              },
            },
            { session },
          );
          window.dispatchEvent(new Event('activity_logged'));
          toast('财务报告已导出，并写入审计日志', 'success');
       } finally {
          setIsGenerating(false);
       }
   };

   const handleStartAudit = () => {
      const latestRecords = loadWorkspaceFinancialRecords(financeContext);
      const latestSummary = summarizeWorkspaceFinancials(latestRecords);
      const findings = buildFinanceRiskFindings(latestRecords, latestSummary);
      setFinancialRecords(latestRecords);
      setAuditFindings(findings);
      setShowAuditModal(true);
      setIsAuditing(false);
      logAuditEvent(
        {
          action: 'financial_risk_audit',
          moduleId: 'finance',
          targetType: 'workspace',
          targetId: session.workspace.id,
          metadata: {
            recordCount: latestRecords.length,
            riskCount: findings.filter((finding) => finding.severity !== 'info').length,
            highRiskCount: findings.filter((finding) => finding.severity === 'high').length,
            monthlyRevenueCents: latestSummary.monthlyRevenueCents,
          },
        },
        { session },
      );
      window.dispatchEvent(new Event('activity_logged'));
      toast('财务风险审计已完成，并写入审计日志', findings.some((finding) => finding.severity === 'high') ? 'warning' : 'success');
   };

   const handleSyncComplianceTasks = () => {
      const complianceTasks: Array<{ title: string; date: string; priority: 'High' | 'Medium' | 'Low'; type: string }> = [
         {
            title: '【税务】完成二季度企业所得税汇总申报',
            date: new Date(Date.now() + 86_400_000 * 5).toISOString().slice(0, 10),
            priority: 'High',
            type: '财务合规审批',
         },
         {
            title: '【合规】准备研发费用加计扣除备查材料',
            date: new Date(Date.now() + 86_400_000 * 10).toISOString().slice(0, 10),
            priority: 'Medium',
            type: '任务分配',
         },
         {
            title: '【账单】大额供应商结款安排',
            date: new Date(Date.now() + 86_400_000 * 18).toISOString().slice(0, 10),
            priority: 'High',
            type: '报销与支付',
         },
      ];
      const existingTaskTitles = new Set(loadWorkspaceTasks(financeContext).map((task) => task.title));
      const createdTasks = complianceTasks
         .filter((task) => !existingTaskTitles.has(task.title))
         .map((task) => createWorkspaceTask({
            ...task,
            column: 'todo',
            isAuto: true,
         }, financeContext));

      logAuditEvent(
         {
            action: 'finance_compliance_task_sync',
            moduleId: 'finance',
            targetType: 'task',
            targetId: createdTasks[0]?.id,
            metadata: {
               requestedTaskCount: complianceTasks.length,
               createdTaskCount: createdTasks.length,
               skippedTaskCount: complianceTasks.length - createdTasks.length,
               taskTitles: createdTasks.map((task) => task.title),
            },
         },
         { session },
      );
      window.dispatchEvent(new Event('activity_logged'));
      toast(
         createdTasks.length > 0
            ? `已同步 ${createdTasks.length} 个财税事项到任务中心`
            : '财税事项已存在于任务中心',
         'success',
      );
   };

   const filteredTransactions = selectedMonth
      ? transactionRows.filter((transaction) => transaction.periodLabel === selectedMonth || transaction.date.includes(selectedMonth))
      : [];

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
                   <p className="text-3xl font-black text-gray-900 tracking-tight">{formatCurrencyCents(Math.max(0, totalAssetCents))}</p>
                   <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-xs font-bold text-emerald-500">
                      <ArrowUpRight className="w-3 h-3 mr-1" /> 较上月增长 12.5%
                   </div>
               </div>
               <div className="bg-white p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
                   <h3 className="text-sm font-bold text-gray-500 mb-1">本月总收入</h3>
                   <p className="text-3xl font-black text-emerald-600 tracking-tight">{formatCurrencyCents(summary.monthlyRevenueCents)}</p>
                   <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold">
                      <span className={`${summary.monthlyRevenueChangePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'} flex items-center`}><ArrowUpRight className="w-3 h-3 mr-1" /> {summary.monthlyRevenueChangePercent >= 0 ? '+' : ''}{summary.monthlyRevenueChangePercent}%</span>
                      <span className="text-gray-400">主要来自: {topRevenueCategory}</span>
                   </div>
               </div>
               <div className="bg-white p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
                   <h3 className="text-sm font-bold text-gray-500 mb-1">本月总支出</h3>
                   <p className="text-3xl font-black text-rose-500 tracking-tight">{formatCurrencyCents(monthlyExpenseCents)}</p>
                   <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold">
                      <span className="text-rose-500 flex items-center"><ArrowDownRight className="w-3 h-3 mr-1" /> {financialRecords.length} 笔</span>
                      <span className="text-gray-400">主要来自: {topExpenseCategory}</span>
                   </div>
               </div>
               <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                      <Wallet className="w-24 h-24 text-emerald-600" />
                   </div>
                   <h3 className="text-sm font-bold text-emerald-800 mb-1 relative z-10">AI 财务健康评分</h3>
                   <p className="text-4xl font-black text-emerald-600 tracking-tight flex items-baseline relative z-10">
                      {healthScore} <span className="text-sm font-bold text-emerald-800 ml-1">/ 100 {riskCount > 0 ? '需关注' : '健康'}</span>
                   </p>
                   <div className="mt-4 pt-4 border-t border-emerald-200/50 flex flex-col space-y-1 text-xs font-bold text-emerald-700 relative z-10">
                      <span className="flex items-center"><AlertCircle className="w-3 h-3 justify-center mr-1" /> {financialRecords.length} 笔流水纳入分析</span>
                      <span className="flex items-center"><AlertCircle className="w-3 h-3 justify-center mr-1" /> {riskCount} 个风险项待跟进</span>
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
                               <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
                                   <ComposedChart data={reportChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} onClick={(e) => { if(e && e.activeLabel) setSelectedMonth(e.activeLabel); }}>
                                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 'bold' }} dy={10} />
                                       <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 'bold' }} tickFormatter={(val) => `¥${val/1000}k`} />
                                       <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                                       <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }} />
                                       <Bar dataKey="revenue" name="日收入" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                       <Line type="monotone" dataKey="baseline" name="上月日均收入" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" />
                                   </ComposedChart>
                               </ResponsiveContainer>
                           </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
                           <div className="flex items-center justify-between mb-6">
                               <h3 className="font-bold text-gray-800">月度资产负债走势 (千元)</h3>
                           </div>
                           <div className="h-[260px] w-full">
                               <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
                                   <AreaChart data={assetLiabilityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} onClick={(e) => { if(e && e.activeLabel) setSelectedMonth(e.activeLabel); }}>
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
                                      <Area type="monotone" dataKey="asset" name="净资产" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAsset)" strokeWidth={2} />
                                      <Area type="monotone" dataKey="liability" name="待结算" stroke="#ef4444" fillOpacity={1} fill="url(#colorDebt)" strokeWidth={2} />
                                   </AreaChart>
                               </ResponsiveContainer>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-6 duration-500">
                        <div className="bg-white p-6 rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col items-center">
                           <h3 className="font-bold text-gray-800 mb-2 w-full text-left">当月成本多维结构</h3>
                           <div className="h-[200px] w-full">
                              {costPieData.length > 0 ? (
                                 <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} initialDimension={{ width: 1, height: 1 }}>
                                    <PieChart>
                                       <Pie data={costPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                          {costPieData.map((entry, index) => (
                                             <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
                                          ))}
                                       </Pie>
                                       <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                                       <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                    </PieChart>
                                 </ResponsiveContainer>
                              ) : (
                                 <div className="h-full flex items-center justify-center text-xs font-bold text-gray-400">暂无本月支出分类</div>
                              )}
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
                              {liveRiskFindings.slice(0, 3).map((finding) => (
                                 <div key={finding.id} className={`p-4 border rounded-xl relative overflow-hidden group transition-colors ${finding.borderClass}`}>
                                    <div className="flex justify-between items-start relative z-10 gap-3">
                                       <h4 className="text-[13px] font-bold text-gray-800 mb-1 flex items-center">
                                          <AlertCircle className="w-4 h-4 mr-1.5 text-emerald-500" /> {finding.title}
                                       </h4>
                                       <span className={`text-[10px] font-bold border px-2 py-0.5 rounded whitespace-nowrap ${finding.badgeClass}`}>{finding.severityLabel}</span>
                                    </div>
                                    <p className="text-[12px] text-gray-600 font-medium leading-relaxed relative z-10 mt-1">{finding.description}</p>
                                 </div>
                              ))}
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
                                       <h4 className="text-sm font-bold text-amber-900 mb-1">
                                          发现 {modalRiskFindings.filter((finding) => finding.severity !== 'info').length} 处潜在合规风险
                                       </h4>
                                       <p className="text-xs text-amber-700 font-medium">已基于 {financialRecords.length} 笔持久化财务流水生成审计结论</p>
                                    </div>
                                 </div>

                                 <div className="space-y-3">
                                    {modalRiskFindings.map((finding) => (
                                       <div key={finding.id} className={`p-4 border bg-white rounded-xl shadow-sm transition-colors cursor-pointer group ${finding.borderClass}`}>
                                          <div className="flex justify-between items-start mb-2 gap-3">
                                             <span className="text-sm font-bold text-gray-800 transition-colors">{finding.title}</span>
                                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${finding.badgeClass}`}>{finding.severityLabel}</span>
                                          </div>
                                          <p className="text-xs text-gray-500 font-medium leading-relaxed mb-3">{finding.description}</p>
                                          <div className={`p-3 rounded-lg border mb-3 ${finding.panelClass}`}>
                                             <p className="text-[11px] font-bold mb-1">AI 整改建议：</p>
                                             <p className="text-[11px] font-medium">{finding.suggestion}</p>
                                          </div>
                                          <div className="flex justify-end space-x-2">
                                             <button className="text-[11px] font-bold px-3 py-1.5 border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 rounded-lg transition-colors">指派复核</button>
                                             <button className="text-[11px] font-bold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center shadow-sm">
                                                生成整改任务
                                             </button>
                                          </div>
                                       </div>
                                    ))}
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
                          {transactionRows.length > 0 ? transactionRows.map((trx) => (
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
                                   <span className={`px-2 py-1 rounded text-[11px] font-bold ${trx.settled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                      {trx.status}
                                   </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                   <button className="text-[12px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors">查看凭证</button>
                                </td>
                             </tr>
                          )) : (
                             <tr>
                                <td colSpan={6} className="py-12 text-center text-sm font-bold text-gray-400">暂无财务流水记录</td>
                             </tr>
                          )}
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
                             <p className="text-xl font-black text-amber-600">{formatCurrencyCents(pendingInvoiceTotalCents)}</p>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                             <Receipt className="w-5 h-5 text-amber-500" />
                          </div>
                       </div>
                       <div className="bg-white p-5 rounded-2xl border border-[var(--border-color)] shadow-sm flex items-center justify-between">
                          <div>
                             <p className="text-[12px] font-bold text-gray-500 mb-1">本月已开票金额</p>
                             <p className="text-xl font-black text-emerald-600">{formatCurrencyCents(issuedInvoiceTotalCents)}</p>
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
                          {invoiceRows.length > 0 ? invoiceRows.map((inv) => (
                             <div key={inv.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-start space-x-4">
                                   <div className={`p-2 rounded-lg ${inv.isPending ? 'bg-amber-100' : 'bg-emerald-100'} shrink-0`}>
                                      <Receipt className={`w-5 h-5 ${inv.isPending ? 'text-amber-600' : 'text-emerald-600'}`} />
                                   </div>
                                   <div>
                                      <div className="flex items-center space-x-2 mb-1">
                                         <h4 className="font-bold text-gray-800 text-sm">{inv.client}</h4>
                                         <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${inv.isPending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{inv.statusLabel}</span>
                                      </div>
                                      <p className="text-xs font-medium text-gray-500 flex items-center space-x-3">
                                         <span>{inv.id}</span>
                                         <span>|</span>
                                         <span className="flex items-center"><CalendarIcon className="w-3 h-3 mr-1" /> {inv.date}</span>
                                         <span>|</span>
                                         <span>{inv.typeLabel}</span>
                                      </p>
                                   </div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                   <span className="font-black text-[16px] text-gray-900 mb-2">{formatCurrencyCents(inv.amountCents, inv.currency)}</span>
                                   {inv.isPending ? (
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
                          )) : (
                             <div className="p-10 text-center text-sm font-bold text-gray-400">暂无发票任务</div>
                          )}
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
                            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors" onClick={handleSyncComplianceTasks}>一键同步至任务中心</button>
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
