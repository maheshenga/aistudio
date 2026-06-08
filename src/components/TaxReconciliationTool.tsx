import React, { useState } from 'react';
import { Bot, CheckCircle2, AlertCircle, X, CheckSquare, ArrowRight, ListFilter, Activity, FileText } from 'lucide-react';
import { toast } from './Toast';

interface ReconciliationItem {
    id: string;
    date: string;
    vendor: string;
    description: string;
    amount: string;
    bankLedgerCode: string;
    aiAssignedCode: string;
    aiAssignedCategory: string;
    confidence: string;
    confidenceLevel: 'high' | 'review';
    isDiscrepancy: boolean;
    status: 'pending' | 'resolved';
}

interface ActivityLogEntry {
    id: string;
    time: string;
    action: string;
    itemId: string;
    vendor: string;
    details: string;
}

const mockLedgerItems: ReconciliationItem[] = [
    {
        id: 'tx1',
        date: '2026-05-12',
        vendor: 'Apple Store',
        description: '购买办公设备',
        amount: '¥ 14,999.00',
        bankLedgerCode: '6602 管理费用 (模糊识别)',
        aiAssignedCode: '1601 固定资产-电子设备',
        aiAssignedCategory: '固定资产资本化',
        confidence: '95%',
        confidenceLevel: 'high',
        isDiscrepancy: true,
        status: 'pending'
    },
    {
        id: 'tx2',
        date: '2026-05-28',
        vendor: '万豪酒店',
        description: '年会预定金',
        amount: '¥ 25,000.00',
        bankLedgerCode: '6602 管理费用-差旅费',
        aiAssignedCode: '6602 管理费用-业务招待费',
        aiAssignedCategory: '应税调整项目',
        confidence: '78%',
        confidenceLevel: 'review',
        isDiscrepancy: true,
        status: 'pending'
    },
    {
        id: 'tx4',
        date: '2026-06-01',
        vendor: '中国移动',
        description: '企业宽带费',
        amount: '¥ 1,200.00',
        bankLedgerCode: '6602 管理费用-办公费',
        aiAssignedCode: '6602 管理费用-办公费',
        aiAssignedCategory: '常规进项',
        confidence: '99%',
        confidenceLevel: 'high',
        isDiscrepancy: false,
        status: 'pending'
    },
    {
        id: 'tx3',
        date: '2026-06-02',
        vendor: 'Meta Platforms',
        description: 'Facebook Ads',
        amount: '¥ 8,500.00',
        bankLedgerCode: '6001 主营业务成本',
        aiAssignedCode: '6601 销售费用-广告费',
        aiAssignedCategory: '境外发票/代扣代缴',
        confidence: '98%',
        confidenceLevel: 'high',
        isDiscrepancy: true,
        status: 'pending'
    }
];

export function TaxReconciliationTool() {
    const [items, setItems] = useState<ReconciliationItem[]>(mockLedgerItems);
    const [isReconciling, setIsReconciling] = useState(false);
    const [hasScanned, setHasScanned] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [filter, setFilter] = useState<'all' | 'high' | 'review'>('all');
    
    const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
    const [showLogs, setShowLogs] = useState(false);

    const addLog = (action: string, item: ReconciliationItem, details: string) => {
        setLogs(prev => [{
            id: Date.now().toString() + Math.random(),
            time: new Date().toLocaleTimeString(),
            action,
            itemId: item.id,
            vendor: item.vendor,
            details
        }, ...prev]);
    };

    const handleConfirmAll = () => {
        setIsReconciling(true);
        setTimeout(() => {
            const pendingDiscrepancies = items.filter(i => i.isDiscrepancy && i.status === 'pending');
            
            setItems(items.map(item => item.isDiscrepancy ? { ...item, status: 'resolved' } : item));
            
            pendingDiscrepancies.forEach(item => {
                addLog('Bulk Confirm', item, `AI assigned: ${item.aiAssignedCode}`);
            });

            setIsReconciling(false);
            toast('批量更正完成：已全部应用 AI 推荐税务分类', 'success');
        }, 1500);
    };

    const handleResolve = (id: string, useAi: boolean) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        setItems(items.map(i => i.id === id ? { ...i, status: 'resolved' } : i));
        
        if (useAi) {
            addLog('Apply AI Config', item, `Changed to ${item.aiAssignedCode}`);
            toast('已确认智能归类', 'success');
        } else {
            addLog('Dismiss Flag', item, `Retained original: ${item.bankLedgerCode}`);
            toast('已保留原账单归类', 'info');
        }
    };

    const handleScan = () => {
        setIsScanning(true);
        setTimeout(() => {
            setHasScanned(true);
            setIsScanning(false);
            const discrepancyCount = items.filter(i => i.isDiscrepancy).length;
            toast(`基于历史入账习惯，发现 ${discrepancyCount} 处核算差异`, 'warning');
        }, 1200);
    };

    const pendingDiscrepanciesCount = items.filter(i => i.status === 'pending' && i.isDiscrepancy).length;
    
    const filteredItems = items.filter(i => {
        if (!i.isDiscrepancy || i.status !== 'pending') return false;
        if (filter === 'high') return i.confidenceLevel === 'high';
        if (filter === 'review') return i.confidenceLevel === 'review';
        return true;
    });

    return (
        <div className="bg-white rounded-2xl border border-[var(--border-color)] p-6 shadow-sm mb-6 print:break-inside-avoid">
            <div className="flex items-center justify-between mb-6">
                <div>
                   <h3 className="text-sm font-bold text-gray-800 flex items-center">
                     <Bot className="w-5 h-5 text-indigo-500 mr-2" /> AI 账税智能对账与纠偏 (Reconciliation)
                   </h3>
                   <p className="text-[12px] text-gray-500 mt-1 font-medium">交叉核对银行流水与税法标准，自动阻断不合规科目归类。</p>
                </div>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => setShowLogs(!showLogs)}
                        className="px-3 py-2 bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 font-bold text-xs rounded-xl transition-colors flex items-center shadow-sm"
                    >
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        操作日志 ({logs.length})
                    </button>
                    {!hasScanned && (
                        <button 
                            onClick={handleScan}
                            disabled={isScanning}
                            className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold text-xs rounded-xl transition-colors flex items-center shadow-sm disabled:opacity-50"
                        >
                            {isScanning ? <div className="w-3.5 h-3.5 rounded-full border-2 border-rose-500 border-t-transparent animate-spin mr-1.5" /> : <AlertCircle className="w-3.5 h-3.5 mr-1.5" />}
                            {isScanning ? '扫描核验中...' : '标记异常 (Flag Mismatches)'}
                        </button>
                    )}
                    {hasScanned && pendingDiscrepanciesCount > 0 && (
                        <button 
                            onClick={handleConfirmAll} 
                            disabled={isReconciling}
                            className="px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 font-bold text-xs rounded-xl transition-colors flex items-center shadow-sm disabled:opacity-50"
                        >
                            {isReconciling ? <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mr-1.5" /> : <CheckSquare className="w-3.5 h-3.5 mr-1.5" />}
                            {isReconciling ? '批量修正中...' : `一键接受全部 (${pendingDiscrepanciesCount})`}
                        </button>
                    )}
                </div>
            </div>

            {showLogs && (
                <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden animate-in slide-in-from-top-2">
                    <div className="bg-gray-50 px-4 py-2 hover:bg-gray-100 border-b border-gray-200 flex justify-between items-center text-xs font-bold text-gray-700">
                        <span>调整日志 (Audit Trails)</span>
                        <Activity className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <div className="max-h-48 overflow-y-auto bg-white p-2">
                        {logs.length === 0 ? (
                            <p className="text-xs text-center text-gray-400 py-4">暂无对账调整记录</p>
                        ) : (
                            <ul className="space-y-1">
                                {logs.map(log => (
                                    <li key={log.id} className="text-[11px] p-2 hover:bg-gray-50 rounded flex justify-between items-center border border-transparent hover:border-gray-100">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-gray-400 font-mono w-16">{log.time}</span>
                                            <span className={`px-1.5 py-0.5 rounded font-bold ${log.action === 'Dismiss Flag' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {log.action}
                                            </span>
                                            <span className="font-bold text-gray-800">{log.vendor}</span>
                                        </div>
                                        <span className="text-gray-500 truncate max-w-xs">{log.details}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {!hasScanned ? (
                <div className="space-y-2">
                    {items.map(item => (
                         <div key={item.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <span className="text-[11px] font-bold text-gray-500">{item.date}</span>
                                <span className="text-[11px] font-bold text-gray-800">{item.vendor}</span>
                                <span className="text-[11px] text-gray-600 truncate max-w-[150px]">— {item.description}</span>
                            </div>
                            <div className="flex items-center space-x-4">
                                <span className="text-[10px] text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded">{item.bankLedgerCode}</span>
                                <div className="text-[11px] font-mono text-gray-500 w-20 text-right">{item.amount}</div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : pendingDiscrepanciesCount === 0 ? (
                <div className="p-8 text-center bg-gray-50 border border-gray-100 rounded-xl">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-gray-800">全部账表核对完成</h4>
                    <p className="text-[12px] text-gray-500 mt-1">未发现银行单据与税务申报之间的差异。</p>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
                        <div className="flex items-center space-x-4">
                            <span className="text-xs font-bold text-gray-500 flex items-center">
                                <ListFilter className="w-3.5 h-3.5 mr-1" /> View By:
                            </span>
                            <div className="flex space-x-2">
                                <button onClick={() => setFilter('all')} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors ${filter === 'all' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>全部</button>
                                <button onClick={() => setFilter('high')} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors ${filter === 'high' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>High Confidence</button>
                                <button onClick={() => setFilter('review')} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors ${filter === 'review' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>Requires Review</button>
                            </div>
                        </div>
                        <div className="text-[11px] font-medium text-gray-500">
                            显示 {filteredItems.length} 个项目
                        </div>
                    </div>
                
                    <div className="space-y-3">
                        {filteredItems.map(item => (
                            <div key={item.id} className="p-4 rounded-xl border border-rose-200 bg-rose-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-300">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <span className="text-[10px] font-black text-rose-500 bg-rose-100 px-2 py-0.5 rounded border border-rose-200 flex items-center">
                                           <AlertCircle className="w-3 h-3 mr-1" /> 风险：科目不匹配
                                        </span>
                                        <span className="text-[11px] font-bold text-gray-600">{item.date}</span>
                                        <span className="text-[11px] font-bold text-gray-800 bg-white px-2 py-0.5 rounded shadow-sm border border-gray-200">{item.vendor}</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                                        <div className="bg-white p-2.5 rounded-lg border border-gray-200 opacity-60 relative">
                                           <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1">原始网银备注</p>
                                           <p className="text-[11px] font-bold text-red-700 line-through decoration-red-300">{item.bankLedgerCode}</p>
                                        </div>
                                        <div className={`p-2.5 rounded-lg border relative overflow-hidden ${item.confidenceLevel === 'high' ? 'bg-indigo-50 border-indigo-200' : 'bg-amber-50 border-amber-200'}`}>
                                           <div className={`absolute top-0 right-0 w-8 h-8 rounded-bl-xl flex items-center justify-center ${item.confidenceLevel === 'high' ? 'bg-indigo-100' : 'bg-amber-100'}`}>
                                              <Bot className={`w-4 h-4 ${item.confidenceLevel === 'high' ? 'text-indigo-500' : 'text-amber-500'}`} />
                                           </div>
                                           <p className={`text-[9px] font-bold uppercase tracking-wider mb-1 flex items-center ${item.confidenceLevel === 'high' ? 'text-indigo-500' : 'text-amber-600'}`}>
                                              AI 推荐税务入账基准 
                                              <span className={`ml-1 text-[8px] px-1 rounded ${item.confidenceLevel === 'high' ? 'bg-indigo-200 text-indigo-700' : 'bg-amber-200 text-amber-700'}`}>{item.confidence}</span>
                                           </p>
                                           <p className={`text-[11px] font-bold flex items-center ${item.confidenceLevel === 'high' ? 'text-indigo-800' : 'text-amber-800'}`}>
                                              {item.aiAssignedCode} <ArrowRight className={`w-3 h-3 mx-2 ${item.confidenceLevel === 'high' ? 'text-indigo-300' : 'text-amber-300'}`} /> {item.aiAssignedCategory}
                                           </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex w-full md:w-auto md:flex-col gap-2 shrink-0">
                                    <button onClick={() => handleResolve(item.id, true)} className="flex-1 md:w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg shadow-sm transition-colors flex items-center justify-center">
                                       <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> 应用 AI 归类
                                    </button>
                                    <button onClick={() => handleResolve(item.id, false)} className="flex-1 md:w-full px-3 py-2 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 font-bold text-[11px] rounded-lg transition-colors flex items-center justify-center">
                                       <X className="w-3.5 h-3.5 mr-1.5" /> 忽略并保留
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
