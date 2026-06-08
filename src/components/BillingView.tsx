import React, { useState } from 'react';
import { CreditCard, Zap, History, CheckCircle2, ChevronRight, Download, ArrowUpRight, Plus, Rocket, X, AlertCircle } from 'lucide-react';

export function BillingView() {
  const [activeTab, setActiveTab] = useState('overview'); // overview, history
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(48);

  const plans = [
    {
      name: '基础版',
      price: '免费',
      points: '100 / 月',
      features: ['普通排队优先级', '基础模型可用', '最高支持 720p 视频生成', '社区技术支持'],
      isCurrent: false,
      buttonText: '当前版本'
    },
    {
      name: '尊享版 Pro',
      price: '￥99',
      period: '/月',
      points: '5,000 / 月',
      features: ['高优先级生成无等待', '全量顶级模型可用', '最高支持 4K 视频生成', '无限次智能修图与音频克隆'],
      isCurrent: true,
      buttonText: '管理订阅'
    },
    {
      name: '超级个体旗舰版',
      price: '￥399',
      period: '/月',
      points: '20,000 / 月',
      features: ['包含 Pro 所有功能', '5 人协作工作空间', 'API 调用额度共享', '专属客户经理与发票服务'],
      isCurrent: false,
      buttonText: '升级旗舰版'
    }
  ];

  const packages = [
    { points: 500, price: 10,  tag: '' },
    { points: 3000, price: 48,  tag: '热门' },
    { points: 10000, price: 98, tag: '超值' },
  ];

  const usageHistory = [
    { id: 'TRX-10023', date: '2026-05-29 14:32', type: '智能视频生成', model: 'Sora v1', cost: 120, status: '成功' },
    { id: 'TRX-10022', date: '2026-05-28 09:15', type: '图片扩展与精修', model: 'Midjourney v6', cost: 5, status: '成功' },
    { id: 'TRX-10021', date: '2026-05-28 09:12', type: '文案长文撰写', model: 'Gemini 3.1 Pro', cost: 2, status: '成功' },
    { id: 'TRX-10020', date: '2026-05-27 18:40', type: '长视频混剪处理', model: 'Studio AI', cost: 45, status: '成功' },
    { id: 'TRX-10019', date: '2026-05-27 11:20', type: '声音克隆训练', model: 'ElevenLabs', cost: 10, status: '成功' },
    { id: 'TRX-10018', date: '2026-05-25 15:10', type: '智能视频生成', model: 'Runway Gen-3', cost: 80, status: '失败退还' },
  ];

  return (
    <div className="p-[var(--spacing-xl)] max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-[var(--spacing-xl)]">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2 mt-1">财务与算力中心</h2>
          <p className="text-[var(--text-muted)] text-sm">管理您的订阅套餐，充值算力点数并查看消耗流水。</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-[var(--radius-lg)] w-fit mb-[var(--spacing-xl)]">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-[var(--bg-panel)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-700'}`}
        >
          账单与订阅总览
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-[var(--bg-panel)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-700'}`}
        >
          算力消耗记录
        </button>
        <button 
          onClick={() => setActiveTab('invoices')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'invoices' ? 'bg-[var(--bg-panel)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-700'}`}
        >
          结算与发票
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
          {/* Balance Card */}
          <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 rounded-3xl p-[var(--spacing-xl)] text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
              <Zap className="w-64 h-64 transform rotate-12" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between">
              <div>
                 <p className="text-blue-200 font-bold uppercase tracking-widest text-xs mb-2">当前可用算力 (Compute Points)</p>
                 <div className="flex items-baseline space-x-2">
                    <h3 className="text-5xl font-black tracking-tight">4,250</h3>
                    <span className="text-blue-200 font-medium">PTS</span>
                 </div>
                 <p className="text-blue-300 font-medium text-sm mt-3 flex items-center">
                    <CheckCircle2 className="icon-sm mr-1.5" /> 本月套餐包含额度 (5,000 PTS) 剩余 85%
                 </p>
              </div>
              <div className="mt-6 md:mt-0 flex flex-col space-y-3">
                 <button onClick={() => setShowRechargeModal(true)} className="bg-[var(--bg-panel)] text-blue-900 px-8 py-3.5 rounded-[var(--radius-lg)] font-bold hover:bg-gray-50 transition-colors shadow-lg flex items-center justify-center">
                    <Zap className="icon-md mr-2 text-[var(--color-primary)]" />
                    立即充值算力
                 </button>
                 <button className="bg-blue-800/50 hover:bg-blue-700/50 border border-blue-500/30 text-white px-8 py-3.5 rounded-[var(--radius-lg)] font-bold transition-colors flex items-center justify-center backdrop-blur-sm">
                    兑换优惠码
                 </button>
              </div>
            </div>
          </div>

          <div>
             <h3 className="text-lg font-bold text-[var(--text-main)] mb-5">订阅套餐管理</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
                {plans.map((plan, i) => (
                   <div key={i} className={`bg-[var(--bg-panel)] rounded-3xl p-[var(--spacing-xl)] border-2 transition-all relative ${plan.isCurrent ? 'border-blue-600 shadow-xl shadow-blue-100 scale-105 z-10' : 'border-[var(--border-color)] hover:border-[var(--border-color)] hover:shadow-md'}`}>
                      {plan.isCurrent && (
                        <div className="absolute -top-4 inset-x-0 flex justify-center">
                           <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
                              当前正在使用
                           </span>
                        </div>
                      )}
                      
                      <div className="mb-[var(--spacing-md)]">
                         <h4 className={`text-xl font-black mb-2 ${plan.isCurrent ? 'text-blue-900' : 'text-[var(--text-main)]'}`}>{plan.name}</h4>
                         <div className="flex items-baseline mb-2">
                            <span className="text-[var(--text-main)]xl font-black text-[var(--text-main)]">{plan.price}</span>
                            {plan.period && <span className="text-[var(--text-muted)] font-medium ml-1">{plan.period}</span>}
                         </div>
                         <div className="bg-gray-50 inline-block px-3 py-1 rounded-lg">
                            <span className="text-sm font-bold text-gray-600 flex items-center">
                               <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                               {plan.points}
                            </span>
                         </div>
                      </div>

                      <div className="space-y-[var(--spacing-md)] mb-[var(--spacing-xl)]">
                         {plan.features.map((f, j) => (
                           <p key={j} className="text-sm text-gray-600 flex items-start font-medium">
                              <CheckCircle2 className="icon-md mr-3 text-green-500 flex-shrink-0" />
                              {f}
                           </p>
                         ))}
                      </div>

                      <button className={`w-full py-3.5 rounded-[var(--radius-lg)] font-bold transition-all flex items-center justify-center ${
                         plan.isCurrent 
                           ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100' 
                           : plan.name === '基础版' 
                             ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                             : 'bg-[var(--color-primary)] text-white hover:bg-gray-800 shadow-md'
                      }`}>
                         {plan.buttonText}
                      </button>
                   </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
           <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)] flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-[var(--text-main)]">算力消耗明细 (<span className="text-[var(--color-primary)]">本月</span>)</h3>
              <button className="text-[var(--text-muted)] hover:text-[var(--color-primary)] text-sm font-medium flex items-center transition-colors">
                 <Download className="icon-sm mr-1.5" />
                 导出账单
              </button>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-gray-50/50 text-[var(--text-muted)] text-xs uppercase tracking-wider">
                       <th className="p-4 font-bold border-b border-[var(--border-color)]">流水号 / 时间</th>
                       <th className="p-4 font-bold border-b border-[var(--border-color)]">服务类型</th>
                       <th className="p-4 font-bold border-b border-[var(--border-color)]">调用模型</th>
                       <th className="p-4 font-bold border-b border-[var(--border-color)]">状态</th>
                       <th className="p-4 font-bold border-b border-[var(--border-color)] text-right">算力变化</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {usageHistory.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                         <td className="p-4">
                            <p className="text-[11px] font-mono text-gray-400">{item.id}</p>
                            <p className="text-sm text-[var(--text-main)] font-medium">{item.date}</p>
                         </td>
                         <td className="p-4 text-sm font-bold text-[var(--text-main)]">{item.type}</td>
                         <td className="p-4 text-sm text-gray-600">
                            <span className="bg-gray-100 px-2 py-1 rounded-md text-xs font-medium border border-[var(--border-color)]">
                              {item.model}
                            </span>
                         </td>
                         <td className="p-4 text-sm">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-bold ${
                               item.status === '成功' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                               {item.status}
                            </span>
                         </td>
                         <td className="p-4 text-right">
                            <p className={`font-black text-lg ${item.status === '成功' ? 'text-[var(--text-main)]' : 'text-gray-400 line-through'}`}>
                               -{item.cost}
                            </p>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
           <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-between text-sm text-[var(--text-muted)] bg-gray-50/50">
              <span>共 6 条记录</span>
              <div className="flex space-x-2">
                 <button className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-gray-100 transition-colors font-medium">上一页</button>
                 <button className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-gray-100 transition-colors font-medium">下一页</button>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="space-y-[var(--spacing-lg)] animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-[var(--bg-panel)] rounded-[var(--radius-xl)] border border-[var(--border-color)] shadow-sm p-[var(--spacing-lg)] flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
               <div className="bg-gray-100 p-3 rounded-[var(--radius-lg)] text-gray-700">
                 <CreditCard className="icon-lg" />
               </div>
               <div>
                 <h3 className="text-lg font-bold text-[var(--text-main)]">支付信息</h3>
                 <p className="text-sm text-[var(--text-muted)]">主支付方式: 招商银行 信用卡 (末尾 4242)</p>
               </div>
            </div>
            <button className="px-5 py-2.5 bg-[var(--bg-panel)] border border-[var(--border-color)] text-gray-700 rounded-[var(--radius-lg)] text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors">管理卡片与支付</button>
          </div>

          <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden">
            <div className="p-[var(--spacing-lg)] border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--text-main)] text-lg">发票台账</h3>
              <button className="text-[var(--color-primary)] font-bold hover:text-blue-800 transition-colors text-sm flex items-center">
                全量导出 CSV
              </button>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                   <tr className="bg-gray-50/50 text-[var(--text-muted)] text-xs uppercase tracking-wider">
                     <th className="p-4 font-bold border-b border-[var(--border-color)]">发票编号</th>
                     <th className="p-4 font-bold border-b border-[var(--border-color)]">账单日期</th>
                     <th className="p-4 font-bold border-b border-[var(--border-color)]">金额</th>
                     <th className="p-4 font-bold border-b border-[var(--border-color)]">发票状态</th>
                     <th className="p-4 font-bold border-b border-[var(--border-color)] text-right">操作</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {[
                     { id: 'INV-2026-05A', date: '2026-05-01', amount: '¥ 399.00', status: '已开票' },
                     { id: 'INV-2026-04A', date: '2026-04-01', amount: '¥ 399.00', status: '已开票' },
                     { id: 'INV-2026-03A', date: '2026-03-01', amount: '¥ 99.00', status: '已开票' },
                   ].map((inv, idx) => (
                     <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                           <p className="text-sm font-bold text-[var(--text-main)]">{inv.id}</p>
                        </td>
                        <td className="p-4 text-sm text-gray-600 font-medium">{inv.date}</td>
                        <td className="p-4 text-sm font-black text-[var(--text-main)]">{inv.amount}</td>
                        <td className="p-4">
                           <span className="bg-green-50 text-green-700 text-[11px] font-bold px-2 py-0.5 rounded border border-green-200">
                             {inv.status}
                           </span>
                        </td>
                        <td className="p-4 text-right">
                           <button className="text-[var(--color-primary)] hover:text-blue-800 text-sm font-bold flex items-center justify-end w-full">
                             <Download className="icon-sm mr-1.5" /> 下载 PDF
                           </button>
                        </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        </div>
      )}

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-panel)] rounded-[24px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col border border-[var(--border-color)] animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-[var(--border-color)] flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <CreditCard className="icon-md text-[var(--color-primary)]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-main)]">充值算力</h3>
                  <p className="text-[13px] text-[var(--text-muted)] mt-0.5">即刻充值，长期有效</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRechargeModal(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
              >
                <X className="icon-md" />
              </button>
            </div>
            
            <div className="p-[var(--spacing-xl)]">
               <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">选择充值金额</h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)] mb-[var(--spacing-md)]">
                  {packages.map((pkg, i) => (
                    <div 
                      key={i} 
                      onClick={() => setRechargeAmount(pkg.price)}
                      className={`relative rounded-[var(--radius-xl)] border-2 p-5 cursor-pointer transition-all ${
                        rechargeAmount === pkg.price 
                          ? 'border-blue-600 bg-blue-50/50 shadow-md transform scale-105 z-10' 
                          : 'border-[var(--border-color)] hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                       {pkg.tag && (
                         <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                            {pkg.tag}
                         </span>
                       )}
                       <div className="text-center">
                          <p className="text-sm text-[var(--text-muted)] font-medium mb-1 line-through">￥{pkg.price * 2}</p>
                          <div className="flex items-end justify-center mb-1">
                             <span className="text-sm font-bold text-[var(--text-main)] mb-1">￥</span>
                             <span className={`text-[var(--text-main)]xl font-black ${rechargeAmount === pkg.price ? 'text-[var(--color-primary)]' : 'text-[var(--text-main)]'}`}>{pkg.price}</span>
                          </div>
                          <div className="bg-gray-100 rounded-lg py-1.5 mt-3 flex items-center justify-center">
                             <Zap className="w-3 h-3 text-amber-500 mr-1" />
                             <span className="text-sm font-bold text-[var(--text-main)]">{pkg.points} PTS</span>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>

               <div className="bg-gray-50 rounded-[var(--radius-lg)] p-5 border border-[var(--border-color)] text-sm text-gray-600 space-y-2 mb-[var(--spacing-xl)]">
                  <p className="flex items-start">
                     <AlertCircle className="icon-sm text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                     <span>充值的算力点数<b>永久有效</b>，不会在月底清空。</span>
                  </p>
                  <p className="flex items-start">
                     <AlertCircle className="icon-sm text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                     <span>优先扣除基础套餐内算力，超出部分扣除充值算力。</span>
                  </p>
               </div>

               <button 
                onClick={() => {
                   setShowRechargeModal(false);
                   // Show some success state logic in real app
                }}
                className="w-full bg-[var(--color-primary)] hover:bg-blue-700 text-white font-bold py-4 rounded-[var(--radius-lg)] shadow-lg shadow-blue-200 transition-all flex items-center justify-center text-lg"
              >
                <Rocket className="icon-md mr-2" />
                立即支付 ￥{rechargeAmount}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
