import React, { useState } from 'react';
import { Newspaper, Lightbulb, Receipt, Building2, ExternalLink, Mail, CheckCircle2, RefreshCcw } from 'lucide-react';
import { toast } from './Toast';

export function CustomerInsights({ customerId, customerName }: { customerId: string, customerName: string }) {
    const [isSendingSurvey, setIsSendingSurvey] = useState(false);

    const AI_RECOMMENDATIONS = [
        { title: "高级版 AIGC 提效方案组合", reason: `深度匹配【${customerName}】内容产出提能需求`, match: "98%" },
        { title: "全渠道自动化营销矩阵", reason: "符合客户近期降低获客成本的战略目标", match: "91%" }
    ];

    const COMPETITOR_NEWS = [
        { source: "钛媒体", title: `【${customerName}】所在行业赛道迎来政策利好，预计爆发增长`, time: "2 小时前", trend: "positive" },
        { source: "新商业情报", title: "主要竞品正加大短视频矩阵投入，可能构成竞争压力", time: "昨天", trend: "warning" }
    ];

    const FINANCIAL_DATA = {
        taxId: "91440101MA59LDU8X1",
        bankInfo: "招商银行 科技园支行",
        totalInvoiced: "¥ 85,000",
        pendingPayment: "¥ 12,500"
    };

    const handleSendSurvey = () => {
        setIsSendingSurvey(true);
        setTimeout(() => {
            setIsSendingSurvey(false);
            toast('满意度问卷已通过邮件发送至客户', 'success');
        }, 1500);
    };

    return (
        <div className="space-y-6 mt-8">
            {/* AI 方案推荐 */}
            <div className="border border-indigo-100 rounded-xl bg-gradient-to-br from-indigo-50/50 to-blue-50/50 p-5">
                <h3 className="text-[14px] font-black text-indigo-900 mb-4 flex items-center">
                    <Lightbulb className="w-4 h-4 mr-2 text-amber-500" />
                    AI 个性化方案推荐
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {AI_RECOMMENDATIONS.map((rec, i) => (
                        <div key={i} className="bg-white rounded-lg p-4 border border-indigo-100 shadow-sm hover:shadow relative group">
                            <div className="absolute top-0 right-0 bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-bl-lg rounded-tr-lg">
                                匹配度 {rec.match}
                            </div>
                            <h4 className="font-bold text-[13px] text-gray-800 mb-1.5 pr-12">{rec.title}</h4>
                            <p className="text-[11px] text-gray-500 font-medium leading-relaxed">{rec.reason}</p>
                            <button className="mt-3 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-md w-full hover:bg-indigo-100 transition-colors">
                                一键生成推荐方案PPT
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* 竞品与行业情报 */}
            <div className="border border-gray-200 rounded-xl bg-white p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[14px] font-black text-gray-800 flex items-center">
                        <Newspaper className="w-4 h-4 mr-2 text-blue-500" />
                        Search Grounding 竞品与行业情报
                    </h3>
                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded">实时更新</span>
                </div>
                <div className="space-y-3">
                    {COMPETITOR_NEWS.map((news, i) => (
                        <div key={i} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100 group">
                            <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-[10px] font-bold text-gray-500 bg-gray-200/50 px-1.5 py-0.5 rounded">{news.source}</span>
                                    <span className="text-[10px] text-gray-400 font-medium">{news.time}</span>
                                </div>
                                <p className={`text-[13px] font-semibold ${news.trend === 'warning' ? 'text-rose-700' : 'text-gray-800'}`}>
                                    {news.title}
                                </p>
                            </div>
                            <button className="text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ExternalLink className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* 财务与税务信息 */}
            <div className="border border-gray-200 rounded-xl bg-white p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[14px] font-black text-gray-800 flex items-center">
                        <Receipt className="w-4 h-4 mr-2 text-emerald-500" />
                        客户财务与开票信息
                    </h3>
                    <button className="text-[12px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center">
                        进入财税模块 <ExternalLink className="w-3 h-3 ml-1" />
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <p className="text-[11px] text-gray-500 font-bold mb-1">累计开票金额</p>
                        <p className="text-[16px] font-black text-gray-800">{FINANCIAL_DATA.totalInvoiced}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <p className="text-[11px] text-gray-500 font-bold mb-1">待回款金额</p>
                        <p className="text-[16px] font-black text-rose-600">{FINANCIAL_DATA.pendingPayment}</p>
                    </div>
                    <div className="col-span-2 bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-center space-x-3">
                        <Building2 className="w-5 h-5 text-gray-400 shrink-0" />
                        <div className="flex-1">
                            <p className="text-[11px] text-gray-500 font-bold mb-0.5">企业统一社会信用代码（税号）</p>
                            <p className="text-[13px] font-bold text-gray-800 font-mono">{FINANCIAL_DATA.taxId}</p>
                        </div>
                        <button className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors">
                            开具电子发票
                        </button>
                    </div>
                </div>
            </div>

            {/* 满意度管理 */}
            <div className="border border-blue-100 rounded-xl bg-blue-50/30 p-5">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-[14px] font-black text-gray-800 flex items-center">
                            <CheckCircle2 className="w-4 h-4 mr-2 text-blue-500" />
                            客户满意度 (CSAT) 管理
                        </h3>
                        <p className="text-[11px] text-gray-500 font-medium mt-1">自动发放满意度问卷并收集反馈</p>
                    </div>
                    <button 
                        onClick={handleSendSurvey}
                        disabled={isSendingSurvey}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold px-4 py-2 rounded-lg transition-colors flex items-center shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSendingSurvey ? (
                            <><RefreshCcw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> 发送中...</>
                        ) : (
                            <><Mail className="w-3.5 h-3.5 mr-1.5" /> 发送问卷链接</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
