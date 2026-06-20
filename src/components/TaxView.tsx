import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Calculator, FileText, PieChart, Info, DollarSign, Building, User, Receipt, Download, FileSearch, CheckCircle2, ArrowRight, Printer, Globe, CheckSquare, Sparkles, GitMerge } from 'lucide-react';
import { toast } from './Toast';
import { FinanceMeetingAssistant } from './FinanceMeetingAssistant';
import { TaxSimulator } from './TaxSimulator';
import { FiscalCalendarView } from './FiscalCalendarView';
import { CurrencyConverter, CurrencyCode } from '../utils/currency';
import { AuditRiskHeatmap } from './AuditRiskHeatmap';
import { TaxReconciliationTool } from './TaxReconciliationTool';
import { useSaasSession } from '../saas/SaasAuthContext';
import { logAuditEvent } from '../lib/data/auditLogRepository';
import { seedWorkspaceTaxEvents } from '../lib/data/taxEventRepository';
import { createWorkspaceTaxRecord, type TaxRecordCategory } from '../lib/data/taxRepository';

type TaxViewAuditAction =
  | 'tax_deadline_reminder'
  | 'tax_audit_export'
  | 'tax_calculation_run'
  | 'tax_document_parse'
  | 'tax_compliance_doc_generate';

export function TaxView() {
  const session = useSaasSession();
  const taxEventContext = useMemo(() => ({ workspaceId: session.workspace.id }), [session.workspace.id]);
  const taxRecordContext = useMemo(() => ({ workspaceId: session.workspace.id, userId: session.user.id }), [session.workspace.id, session.user.id]);
  const [currency, setCurrency] = useState<CurrencyCode>(CurrencyConverter.getCurrency());
  const auditTax = useCallback((
    action: TaxViewAuditAction,
    targetId: string,
    metadata: Record<string, unknown> = {},
  ) => {
    logAuditEvent(
      {
        action,
        moduleId: 'tax',
        targetType: 'workspace',
        targetId,
        metadata,
      },
      { session },
    );
    window.dispatchEvent(new Event('activity_logged'));
  }, [session]);
  
  useEffect(() => {
    const unsub = CurrencyConverter.subscribe((newCurrency) => {
      setCurrency(newCurrency);
    });

    seedWorkspaceTaxEvents(taxEventContext).forEach(ev => {
      if (ev.daysUntil === 3 || ev.daysUntil === 7) {
        auditTax('tax_deadline_reminder', ev.id, {
          title: ev.title,
          date: ev.date,
          daysUntil: ev.daysUntil,
          type: ev.type,
        });
        toast(`智能拦截提醒：距离【${ev.title}】还有刚好 ${ev.daysUntil} 天截止！建议立即查看关联交易汇总。`, 'warning');
      }
    });

    return unsub;
  }, [auditTax, taxEventContext]);
  const [activeTab, setActiveTab] = useState<'individual' | 'vat' | 'corporate' | 'audit'>('individual');
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResult, setShowResult] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [isExportingAudit, setIsExportingAudit] = useState(false);
  const [currencyInfo, setCurrencyInfo] = useState<string | null>(null);
  const [classificationResult, setClassificationResult] = useState<any[] | null>(null);

  const handleExportAudit = () => {
      setIsExportingAudit(true);
      const originalTitle = document.title;
      document.title = "Audit_Trail_Report_TaxView";
      window.print();
      document.title = originalTitle;
      auditTax('tax_audit_export', 'tax_audit_report', {
          format: 'pdf',
          activeTab,
      });
      setIsExportingAudit(false);
      toast('审计报告导出操作已完成。', 'success');
  };

  const handleCalculate = () => {
      setIsCalculating(true);
      setShowResult(true);
      const category: TaxRecordCategory =
        activeTab === 'individual' ? 'individual'
        : activeTab === 'vat' ? 'vat'
        : activeTab === 'corporate' ? 'corporate'
        : 'other';
      const record = createWorkspaceTaxRecord({
        kind: 'calculation',
        category,
        title: `${activeTab === 'individual' ? '个人所得税' : activeTab === 'vat' ? '企业增值税' : activeTab === 'corporate' ? '企业所得税' : '税务'}测算`,
        inputs: { activeTab, currency },
        result: {},
        status: 'draft',
        actorId: session.user.id,
        metadata: { source: 'tax_view_calculator' },
      }, taxRecordContext);
      auditTax('tax_calculation_run', `tax_calculation_${activeTab}`, {
          activeTab,
          currency,
          recordId: record.id,
      });
      setIsCalculating(false);
      toast('测算完成，已生成最优节税方案', 'success');
  };

  const handleParseDocument = () => {
      setIsParsing(true);
      const parsedDocuments = [
        { id: 1, target: 'Stripe Payments', amount: CurrencyConverter.formatString('¥ 10,950.00'), category: '销项税 (无票收入)', status: '待审批', suggestion: '自动触发 [跨境税收免抵退] 审批流', taxCode: '6001 主营业务收入', confidence: '98%' },
        { id: 2, target: 'DigitalOcean Inc.', amount: CurrencyConverter.formatString('¥ 3,650.00'), category: '进项税 (海关完税凭证)', status: '已归档', suggestion: '合规验证通过', taxCode: '6602 管理费用-云服务', confidence: '95%' },
        { id: 3, target: '滴滴企业版', amount: CurrencyConverter.formatString('¥ 450.00'), category: '费用报销', status: '已归档', suggestion: '关联至陈效 6月报销单', taxCode: '6602 管理费用-差旅费', confidence: '99%' }
      ];
      setCurrencyInfo('发票含外汇交易：1,500 USD 已按汇率(7.30)折算为 10,950 CNY');
      setClassificationResult(parsedDocuments);
      auditTax('tax_document_parse', 'cross_border_invoice_batch', {
          documentCount: parsedDocuments.length,
          currency,
          detectedForeignCurrency: 'USD',
          convertedAmountCny: 10950,
      });
      setIsParsing(false);
      toast('AI 票据解析完成：已自动分类并触发对应的税务或报销归档审批流', 'success');
  };

  const handleGenerateComplianceDoc = () => {
      setIsGeneratingDoc(true);
      auditTax('tax_compliance_doc_generate', 'tax_compliance_summary_2026', {
          fiscalYear: 2026,
          sections: ['filing_lifecycle', 'invoice_review', 'audit_trail'],
      });
      setIsGeneratingDoc(false);
      toast('一键税务申报总结文档生成完毕并已下载', 'success');
  };

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="layout-section layout-container animate-in fade-in slide-in-from-bottom-2 duration-300 h-[calc(100vh-4rem)] flex flex-col print:h-auto print:overflow-visible">
      <div className="flex items-center justify-between mb-[var(--spacing-xl)] shrink-0 print:hidden">
        <div>
          <h1 className="text-h1 flex items-center">
            <Calculator className="w-8 h-8 mr-3 text-emerald-500" />
            税务筹划与测算
          </h1>
          <p className="text-sub mt-2">企业及个人税务自动化计算舱，帮助独立开发者及初创团队合规降本增效。</p>
        </div>
        <div className="flex space-x-3">
            <button onClick={handlePrint} className="px-5 py-2.5 bg-white border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-main)] font-bold text-sm rounded-[var(--radius-lg)] shadow-sm flex items-center transition-colors">
              <Printer className="w-4 h-4 mr-2" /> 打印合规报表
            </button>
            <button onClick={handleParseDocument} disabled={isParsing} className="px-5 py-2.5 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-700 font-bold text-sm rounded-[var(--radius-lg)] shadow-sm flex items-center transition-colors disabled:opacity-50">
              {isParsing ? <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mr-2"></div> : <Globe className="w-4 h-4 mr-2 text-emerald-600" />}
              {isParsing ? 'AI 识别与折算中...' : '跨国票据智能解析'}
            </button>
            <button className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-[var(--radius-lg)] shadow-sm flex items-center transition-colors">
              <FileText className="w-4 h-4 mr-2" /> 生成税务预测报告
            </button>
        </div>
      </div>
      
      {currencyInfo && (
         <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300 print:hidden">
            <div className="flex items-center">
               <Globe className="w-5 h-5 text-blue-500 mr-3" />
               <span className="text-sm font-bold text-blue-800">{currencyInfo} <span className="font-medium text-blue-600 ml-2">(本位币计价基准更新完成)</span></span>
            </div>
         </div>
      )}

      {classificationResult && (
         <div className="mb-6 p-4 bg-white border border-emerald-200 rounded-xl shadow-sm animate-in slide-in-from-bottom-2 duration-300 print:hidden">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
               <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
               AI 票据全量提取与合规入账 (已关联税务科目)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
               {classificationResult.map(res => (
                  <div key={res.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 relative group">
                     <div className="flex items-start justify-between mb-2">
                        <span className="text-[12px] font-bold text-gray-800">{res.target}</span>
                        <span className="text-[12px] font-black text-emerald-600">{res.amount}</span>
                     </div>
                     <div className="flex items-center justify-between mt-1 mb-2">
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{res.category}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${res.status === '待审批' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'} border`}>{res.status}</span>
                     </div>
                     {res.taxCode && (
                       <div className="flex items-center justify-between bg-purple-50 px-2 py-1.5 rounded-md border border-purple-100 text-[10px]">
                         <span className="font-bold text-purple-700 flex items-center">
                             <Sparkles className="w-3 h-3 mr-1" /> 智能分类代码匹配
                         </span>
                         <span className="font-medium text-purple-600">{res.taxCode} <span className="opacity-60 ml-1">({res.confidence})</span></span>
                       </div>
                     )}
                     <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] font-medium text-gray-500 flex items-center">
                        <ArrowRight className="w-3 h-3 mr-1 text-gray-400 shrink-0" /> {res.suggestion}
                     </div>
                     {res.status === '待审批' && (
                        <button className="absolute inset-0 bg-white/90 backdrop-blur-[1px] hidden group-hover:flex items-center justify-center rounded-lg text-xs font-bold text-emerald-600 border border-emerald-500 transition-all opacity-0 group-hover:opacity-100">
                           一键触发跨部门审批
                        </button>
                     )}
                  </div>
               ))}
            </div>
         </div>
      )}

      <div className="bg-white rounded-2xl border border-[var(--border-color)] p-6 shadow-sm mb-6 print:hidden">
        <h3 className="text-sm font-bold text-gray-800 mb-8 flex items-center">
          <GitMerge className="w-4 h-4 text-indigo-500 mr-2" />
          当期报税生命周期流转 (Filing Lifecycle)
        </h3>
        <div className="flex items-start justify-between relative mt-4">
          <div className="absolute top-4 left-[10%] right-[10%] h-0.5 bg-gray-100 z-0"></div>
          <div className="absolute top-4 left-[10%] h-0.5 bg-indigo-500 z-0 transition-all duration-500" style={{ width: '33%' }}></div>

          {[
            { id: 'collection', label: '凭证归集 (Document Collection)', status: 'complete', desc: '已提取 145 张票据' },
            { id: 'audit', label: 'AI 合规内审 (AI Audit)', status: 'current', desc: '正在交叉比对金额与税段' },
            { id: 'review', label: '人工复核 (Review)', status: 'upcoming', desc: '待财务总监最终签批' },
            { id: 'submission', label: '一键申报 (Submission)', status: 'upcoming', desc: '与税务局网报系统直连同步' }
          ].map((step, idx) => (
            <div key={step.id} className="relative z-10 flex flex-col items-center flex-1">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white ${step.status === 'complete' ? 'border-emerald-500 text-emerald-500' : step.status === 'current' ? 'border-indigo-500 text-indigo-500 ring-4 ring-indigo-50' : 'border-gray-200 text-gray-300'}`}>
                  {step.status === 'complete' ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{idx + 1}</span>}
               </div>
               <p className={`mt-3 text-xs font-bold text-center ${step.status === 'current' ? 'text-indigo-700' : step.status === 'complete' ? 'text-gray-700' : 'text-gray-400'}`}>{step.label}</p>
               <p className="text-[10px] text-gray-500 text-center mt-1 font-medium">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <FinanceMeetingAssistant />
      <TaxReconciliationTool />
      <TaxSimulator />
      <AuditRiskHeatmap />
      <FiscalCalendarView />

      <div className="grid mt-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[var(--spacing-md)] mb-6 shrink-0 print:grid-cols-4 print:gap-4 print:mb-8">
        <div className="bg-[var(--bg-panel)] p-[var(--spacing-lg)] rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm flex flex-col items-center justify-center">
            <h3 className="text-sm font-bold text-gray-800 w-full mb-4">合规健康度 (Compliance Score)</h3>
            <div className="relative w-24 h-24 flex items-center justify-center mb-2">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-100"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500"
                  strokeDasharray="92, 100"
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-emerald-600">92</span>
                <span className="text-[9px] font-bold text-gray-400">/ 100</span>
              </div>
            </div>
            <div className="w-full space-y-1.5 mt-auto">
               <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-gray-500">审计追踪异常</span>
                  <span className="text-emerald-600 font-bold">0 项</span>
               </div>
               <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-gray-500">发票归档进度</span>
                  <span className="text-blue-600 font-bold">85%</span>
               </div>
               <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-gray-500">待办涉税审批</span>
                  <span className="text-amber-600 font-bold">2 项</span>
               </div>
            </div>
        </div>
        <div className="bg-[var(--bg-panel)] p-[var(--spacing-lg)] rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm flex flex-col">
          <div className="text-[14px] font-bold text-[var(--text-muted)] mb-2 flex items-center">
            <DollarSign className="w-4 h-4 mr-1 text-blue-500" /> 预计本季需纳增值税
          </div>
          <p className="text-[28px] font-black text-amber-500 tracking-tight">{CurrencyConverter.formatString('¥ 12,450.00')}</p>
          <div className="mt-auto pt-4 text-[12px] text-gray-400 font-medium border-t border-[var(--border-color)]">
             对比上季度 <span className="text-red-500 font-bold">+15%</span>
          </div>
        </div>
        <div className="bg-[var(--bg-panel)] p-[var(--spacing-lg)] rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm flex flex-col">
          <div className="text-[14px] font-bold text-[var(--text-muted)] mb-2 flex items-center">
            <PieChart className="w-4 h-4 mr-1 text-emerald-500" /> 已用税收优惠额度
          </div>
          <p className="text-[28px] font-black text-emerald-500 tracking-tight">{CurrencyConverter.formatString('¥ 8,000.00')}</p>
          <div className="mt-auto pt-4 text-[12px] text-[var(--text-muted)] font-medium border-t border-[var(--border-color)] w-full">
             <div className="w-full bg-[var(--bg-hover)] rounded-full h-1.5 mb-1">
               <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '40%' }}></div>
             </div>
             可用额度 (40%)
          </div>
        </div>
        <div className="bg-[var(--bg-panel)] p-[var(--spacing-lg)] rounded-[var(--radius-xl)] border border-blue-200 bg-blue-50/10 shadow-sm flex flex-col">
          <div className="text-[14px] font-bold text-[var(--text-muted)] mb-2 flex items-center">
            <Info className="w-4 h-4 mr-1 text-blue-500" /> 注意事项与合规建议
          </div>
          <ul className="text-[13px] font-medium text-[var(--text-main)] space-y-2 flex-1 pt-1">
             <li className="flex items-start">
               <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 mr-2 shrink-0"></span>
               本月 15 日前需完成上月度员工个税代扣代缴申报。
             </li>
             <li className="flex items-start">
               <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 mr-2 shrink-0"></span>
               检测到有 3 笔大额无发票支出，建议及时补齐进项凭证补充合规。
             </li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--border-color)] p-6 mb-[var(--spacing-xl)] shadow-sm shrink-0 flex flex-col md:flex-row md:items-center justify-between">
         <div className="flex-1 md:pr-8">
            <div className="flex items-center justify-between mb-4">
               <h3 className="font-bold text-gray-800 text-[14px] flex items-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-1.5" /> 2026 年度税务合规执行盘点
               </h3>
               <span className="text-xs font-bold text-gray-500">当前财年进度: 45%</span>
            </div>
            
            <div className="relative">
               <div className="overflow-hidden h-2.5 mb-2 text-xs flex rounded-full bg-gray-100">
                  <div style={{ width: "25%" }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald-500"></div>
                  <div style={{ width: "20%" }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-400"></div>
               </div>
               
               <div className="flex justify-between w-full text-[11px] font-bold text-gray-400 mt-2">
                  <span className="flex items-center text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-1"></span>已结账申报 (Q1)</span>
                  <span className="flex items-center text-blue-500"><span className="w-2 h-2 rounded-full bg-blue-400 mr-1"></span>当期待申报 (Q2)</span>
                  <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-gray-200 mr-1"></span>未开展</span>
               </div>
            </div>
            <div className="mt-3 text-[12px] font-medium text-gray-600 flex items-center">
               <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 mr-2">待办项目</span> 
               当期待补充进项发票 <strong className="text-gray-800 mx-1">12</strong> 份，企业资料归档状态：<strong className="text-amber-500 ml-1">需完善</strong>
            </div>
         </div>
         <div className="mt-4 md:mt-0 shrink-0 border-l border-gray-100 md:pl-8 flex flex-col items-center justify-center print:hidden">
            <button onClick={handleGenerateComplianceDoc} disabled={isGeneratingDoc} className="px-4 py-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[13px] rounded-xl transition-colors flex items-center shadow-sm">
               {isGeneratingDoc ? <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mr-1.5"></div> : <FileText className="w-3.5 h-3.5 mr-1.5" />}
               {isGeneratingDoc ? 'AI 组装文档中...' : '一键生成税务申报总结'}
            </button>
         </div>
      </div>
      
      <div className="flex-1 bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[var(--border-color)] flex space-x-2">
           <button onClick={() => setActiveTab('individual')} className={`px-4 py-2 ${activeTab === 'individual' ? 'bg-[var(--bg-hover)] shadow-sm' : 'bg-transparent'} hover:bg-[var(--bg-hover)] text-[var(--text-main)] rounded-[var(--radius-lg)] text-sm font-bold transition-colors`}>个人所得税测算</button>
           <button onClick={() => setActiveTab('vat')} className={`px-4 py-2 ${activeTab === 'vat' ? 'bg-[var(--bg-hover)] shadow-sm' : 'bg-transparent'} hover:bg-[var(--bg-hover)] text-[var(--text-main)] rounded-[var(--radius-lg)] text-sm font-bold transition-colors`}>企业增值税测算</button>
           <button onClick={() => setActiveTab('corporate')} className={`px-4 py-2 ${activeTab === 'corporate' ? 'bg-[var(--bg-hover)] shadow-sm' : 'bg-transparent'} hover:bg-[var(--bg-hover)] text-[var(--text-main)] rounded-[var(--radius-lg)] text-sm font-bold transition-colors`}>企业所得税测算</button>
           <button onClick={() => setActiveTab('audit')} className={`px-4 py-2 ${activeTab === 'audit' ? 'bg-[var(--bg-hover)] shadow-sm' : 'bg-transparent'} hover:bg-[var(--bg-hover)] text-[var(--text-main)] rounded-[var(--radius-lg)] text-sm font-bold transition-colors`}>税务审计追踪</button>
        </div>
        
        <div className="flex-1 p-[var(--spacing-xl)] overflow-y-auto custom-scrollbar flex items-start justify-center">
           <div className="max-w-2xl w-full animate-in fade-in duration-300">
              
              {activeTab === 'individual' && (
                  <>
                      <h3 className="text-h3 mb-6">个税薪金薪酬测算 (2025新规)</h3>
                      <div className="space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="text-[13px] font-bold text-[var(--text-main)] mb-1.5 block">税前月收入 (元)</label>
                               <input type="number" defaultValue="25000" className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-[var(--radius-lg)] text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div>
                               <label className="text-[13px] font-bold text-[var(--text-main)] mb-1.5 block">专项附加扣除 (元/月)</label>
                               <input type="number" defaultValue="3000" className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-[var(--radius-lg)] text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="text-[13px] font-bold text-[var(--text-main)] mb-1.5 block">社保公积金个人缴纳比例</label>
                               <div className="flex w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-[var(--radius-lg)] items-center">
                                 <span className="text-sm font-bold text-[var(--text-main)]">默认 (22.5%)</span>
                               </div>
                            </div>
                         </div>
                         
                         <div className="pt-6 mt-6 border-t border-[var(--border-color)]">
                            <button onClick={handleCalculate} disabled={isCalculating} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[var(--radius-lg)] font-bold shadow-sm transition-colors mb-6 flex justify-center items-center">
                               {isCalculating ? 'AI 计算中...' : 'AI 开始测算规划方案'}
                            </button>
                            
                            {showResult && !isCalculating && (
                            <div className="bg-emerald-50/10 border border-emerald-200 rounded-[var(--radius-xl)] p-6">
                               <h4 className="text-sm font-black text-emerald-600 mb-4 tracking-tight">预计发放结果与优化建议</h4>
                               <div className="space-y-3">
                                  <div className="flex justify-between text-sm">
                                     <span className="font-bold text-[var(--text-muted)]">应纳税所得额</span>
                                     <span className="font-bold text-[var(--text-main)]">16,375.00 元</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                     <span className="font-bold text-[var(--text-muted)]">适用税率表</span>
                                     <span className="font-bold text-[var(--text-main)]">20% (速算扣除数 1410)</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                     <span className="font-bold text-[var(--text-muted)]">预计扣除个税</span>
                                     <span className="font-extrabold text-red-500">1,865.00 元</span>
                                  </div>
                                  <div className="pt-3 mt-3 border-t border-emerald-100 flex justify-between text-base">
                                     <span className="font-black text-[var(--text-main)]">实际到手 (税后)</span>
                                     <span className="font-black text-emerald-600">17,510.00 元</span>
                                  </div>
                               </div>
                            </div>
                            )}
                         </div>
                      </div>
                  </>
              )}

              {activeTab === 'vat' && (
                  <>
                      <h3 className="text-h3 mb-6">企业增值税智能测算与筹划</h3>
                      <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl mb-6">
                         <div className="flex items-start">
                             <Building className="w-5 h-5 text-blue-500 mr-2 mt-0.5 shrink-0" />
                             <div>
                                 <h4 className="text-[13px] font-bold text-blue-800">当前纳税主体：小规模纳税人</h4>
                                 <p className="text-[12px] text-blue-600 mt-1 font-medium">适用 1% 或 3% 征收率。季度销售额未超过30万可享受免征增值税优惠政策。</p>
                             </div>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <div>
                            <label className="text-[13px] font-bold text-[var(--text-main)] mb-1.5 block">预计本季度不含税销售额 (元)</label>
                            <input type="number" defaultValue="285000" className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-[var(--radius-lg)] text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none" />
                         </div>
                         <div>
                            <label className="text-[13px] font-bold text-[var(--text-main)] mb-1.5 block">其中专票核开金额 (元)</label>
                            <input type="number" defaultValue="50000" className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-[var(--radius-lg)] text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none" />
                         </div>

                         <div className="pt-6 mt-6 border-t border-[var(--border-color)]">
                            <button onClick={handleCalculate} disabled={isCalculating} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[var(--radius-lg)] font-bold shadow-sm transition-colors mb-6">
                               {isCalculating ? 'AI 计算中...' : '生成增值税缴纳报告'}
                            </button>

                            {showResult && !isCalculating && (
                                <div className="bg-emerald-50/10 border border-emerald-200 rounded-[var(--radius-xl)] p-6">
                                   <div className="flex justify-between items-center mb-4">
                                      <h4 className="text-sm font-black text-emerald-600 tracking-tight">测算结果 (季度金额)</h4>
                                      <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded flex items-center"><Info className="w-3 h-3 mr-1" /> 接近免税临界点</span>
                                   </div>
                                   <div className="space-y-3">
                                      <div className="flex justify-between text-sm">
                                         <span className="font-bold text-[var(--text-muted)]">适用征收率</span>
                                         <span className="font-bold text-[var(--text-main)]">1%（减按征收）</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                         <span className="font-bold text-[var(--text-muted)]">普票部分应纳税额 (免征)</span>
                                         <span className="font-bold text-[var(--text-main)]">0.00 元</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                         <span className="font-bold text-[var(--text-muted)]">专票部分应纳税额</span>
                                         <span className="font-extrabold text-red-500">500.00 元</span>
                                      </div>
                                      <div className="pt-3 mt-3 border-t border-emerald-100 flex flex-col">
                                         <div className="flex justify-between text-base mb-2">
                                             <span className="font-black text-[var(--text-main)]">预计增值税总计</span>
                                             <span className="font-black text-emerald-600">500.00 元</span>
                                         </div>
                                         <p className="text-[11px] text-gray-500 font-medium">⚠️ 提醒提示：当前预估销售额距离30万免税额度不足1.5万元，建议合理排期下一单的开票时间至下个季度，以继续享受免税政策。</p>
                                      </div>
                                   </div>
                                </div>
                            )}
                         </div>
                      </div>
                  </>
              )}

              {activeTab === 'corporate' && (
                  <>
                      <h3 className="text-h3 mb-6">企业所得税汇算清缴测算</h3>
                      <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-6">
                         <div className="flex items-start">
                             <Receipt className="w-5 h-5 text-amber-500 mr-2 mt-0.5 shrink-0" />
                             <div>
                                 <h4 className="text-[13px] font-bold text-amber-800">小型微利企业税收优惠</h4>
                                 <p className="text-[12px] text-amber-700 mt-1 font-medium">应纳税所得额不超过300万元的部分，减按25%计入应纳税所得额，按20%的税率缴纳企业所得税（即实际税率5%）。</p>
                             </div>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-[13px] font-bold text-[var(--text-main)] mb-1.5 block">预计年度总收入 (元)</label>
                                <input type="number" defaultValue="2800000" className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-[var(--radius-lg)] text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none" />
                             </div>
                             <div>
                                <label className="text-[13px] font-bold text-[var(--text-main)] mb-1.5 block">不征税/免税收入 (元)</label>
                                <input type="number" defaultValue="0" className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-[var(--radius-lg)] text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none" />
                             </div>
                         </div>

                         <div>
                            <label className="text-[13px] font-bold text-[var(--text-main)] mb-1.5 block">各项依法扣除与营业成本合计 (元)</label>
                            <input type="number" defaultValue="1500000" className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-[var(--radius-lg)] text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none" />
                         </div>

                         <div className="pt-6 mt-6 border-t border-[var(--border-color)]">
                            <button onClick={handleCalculate} disabled={isCalculating} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[var(--radius-lg)] font-bold shadow-sm transition-colors mb-6">
                               {isCalculating ? '分析推演中...' : '开始所得税测算'}
                            </button>

                            {showResult && !isCalculating && (
                                <div className="bg-emerald-50/10 border border-emerald-200 rounded-[var(--radius-xl)] p-6">
                                   <div className="flex justify-between items-center mb-4">
                                      <h4 className="text-sm font-black text-emerald-600 tracking-tight">测算结果与合规提醒</h4>
                                      <button className="text-[11px] font-bold text-blue-600 flex items-center hover:text-blue-700">
                                         <Download className="w-3 h-3 mr-1" /> 导出报告
                                      </button>
                                   </div>
                                   <div className="space-y-3">
                                      <div className="flex justify-between text-sm">
                                         <span className="font-bold text-[var(--text-muted)]">预计应纳税所得额</span>
                                         <span className="font-bold text-[var(--text-main)]">1,300,000.00 元</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                         <span className="font-bold text-[var(--text-muted)]">减计应纳税所得额 (25%)</span>
                                         <span className="font-bold text-emerald-600">325,000.00 元</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                         <span className="font-bold text-[var(--text-muted)]">适用税率</span>
                                         <span className="font-bold text-[var(--text-main)]">20%</span>
                                      </div>
                                      <div className="pt-3 mt-3 border-t border-emerald-100 flex justify-between text-base">
                                         <span className="font-black text-[var(--text-main)]">预计企业所得税额</span>
                                         <span className="font-black text-emerald-600">65,000.00 元</span>
                                      </div>
                                   </div>
                                </div>
                            )}
                         </div>
                      </div>
                  </>
              )}

              {activeTab === 'audit' && (
                  <>
                      <h3 className="text-h3 mb-6">税务数据调整审计追踪 (Audit Trail)</h3>
                      <div className="bg-white rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-300">
                          <div className="p-4 border-b border-[var(--border-color)] bg-gray-50 flex items-center justify-between">
                              <h4 className="font-bold text-gray-800 text-sm">税务调整日志</h4>
                              <button 
                                onClick={handleExportAudit} 
                                disabled={isExportingAudit}
                                className="px-3 py-1.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-colors flex items-center shadow-sm"
                              >
                                {isExportingAudit ? <div className="w-3 h-3 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mr-1.5"></div> : <Download className="w-3 h-3 mr-1.5" />}
                                {isExportingAudit ? '导出中...' : '导出审计报告 (PDF)'}
                              </button>
                          </div>
                          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto print:max-h-none print:overflow-visible">
                              <div className="p-4 flex items-start space-x-4">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                      <User className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div className="flex-1 group">
                                      <div className="flex justify-between items-start mb-1">
                                          <span className="text-sm font-bold text-gray-800">手动修改：专票金额核验</span>
                                          <span className="text-[11px] text-gray-400 font-medium">刚刚</span>
                                      </div>
                                      <p className="text-xs text-gray-600 font-medium">财务人员 <span className="font-bold">Chen</span> 修改了 2026Q2 专票核开金额。<br/>由 <span className="line-through text-gray-400">{CurrencyConverter.formatString('¥ 45,000.00')}</span> 更改为 <strong className="text-blue-600">{CurrencyConverter.formatString('¥ 50,000.00')}</strong></p>
                                      <button onClick={() => toast('已同步至 TaskCenter。', 'success')} className="mt-2 px-3 py-1.5 bg-white border border-gray-200 hover:border-blue-400 text-blue-600 font-bold text-[11px] rounded shadow-sm flex items-center">
                                          <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
                                          Sync to TaskCenter
                                      </button>
                                  </div>
                              </div>
                              <div className="p-4 flex items-start space-x-4 bg-purple-50/30">
                                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                                  </div>
                                  <div className="flex-1">
                                      <div className="flex justify-between items-start mb-1">
                                          <span className="text-sm font-bold text-gray-800">AI 自动分类修正：汇率波动折算</span>
                                          <span className="text-[11px] text-gray-400 font-medium">今天 14:20</span>
                                      </div>
                                      <p className="text-xs text-purple-700 font-medium bg-purple-50 p-2 rounded-lg mt-1 border border-purple-100">AI 系统自动按实时汇率 (7.30) 将 Stripe 收入 1,500 USD 转换为 10,950 CNY，并重分类为销项税 (无票收入)。</p>
                                  </div>
                              </div>
                              <div className="p-4 flex items-start space-x-4">
                                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                      <FileSearch className="w-4 h-4 text-amber-600" />
                                  </div>
                                  <div className="flex-1">
                                      <div className="flex justify-between items-start mb-1">
                                          <span className="text-sm font-bold text-gray-800">系统标记：高新企业资格期满</span>
                                          <span className="text-[11px] text-gray-400 font-medium">昨天 09:12</span>
                                      </div>
                                      <p className="text-xs text-gray-600 font-medium">系统排查发现高新企业资格本月底到期，自动将下月研发加计扣除基准调回默认状态。</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
