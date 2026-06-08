import React, { useState, useEffect } from 'react';
import { Calculator, ArrowRight, BrainCircuit, TrendingUp, TrendingDown, Target, HelpCircle, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CurrencyConverter, CurrencyCode } from '../utils/currency';

export function TaxSimulator() {
  const [currency, setCurrency] = useState<CurrencyCode>(CurrencyConverter.getCurrency());
  useEffect(() => {
    return CurrencyConverter.subscribe((newCurrency) => {
      setCurrency(newCurrency);
    });
  }, []);
  const [incomeGrowth, setIncomeGrowth] = useState<number>(15);
  const [expenseGrowth, setExpenseGrowth] = useState<number>(10);
  const [isSimulating, setIsSimulating] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [aiAdvisorEnabled, setAiAdvisorEnabled] = useState(false);

  const handleSimulate = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      
      const strategies = [
          { 
             name: '基准场景 (维持现状)', 
             tax: CurrencyConverter.formatString('¥ 158,000'), 
             suggestion: '按部就班申报，无特殊风险与节税操作，税负压力处于较高水位。',
             impact: 0,
             color: 'gray'
          },
          { 
             name: '小微企业税收递延', 
             tax: CurrencyConverter.formatString('¥ 85,000'), 
             suggestion: '合理安排年底开票节奏，延缓部分收入确认至次年初，降低当期资金压力。',
             impact: 73000,
             color: 'blue'
          },
          { 
             name: '研发加计扣除专项 (AI 极力推荐)', 
             tax: CurrencyConverter.formatString('¥ 112,000'), 
             suggestion: '将下半年技术外包合规化为自主研发项目申报立项，享 100% 加计扣除，预计将节省企业所得税近 4.6 万元。',
             impact: 46000,
             color: 'emerald'
          }
      ];

      // AI automatically adjusts impact / priorities based on enabled
      if (aiAdvisorEnabled) {
          // Adjust logic: For the demo, make impact higher for "研发加计扣除专项" to showcase real-time highlighting
          strategies[2].impact = 90000;
          strategies[2].tax = CurrencyConverter.formatString('¥ 68,000');
          strategies[2].suggestion = '【AI 重点部署】已启用深度筹划：建议全面剥离并转入子公司，将产生 9 万元的最大降本幅度。';
      }

      // Highlight the best strategy
      const maxImpact = Math.max(...strategies.map(s => s.impact));
      
      setReport({
        projectedTax: 158000,
        scenarios: strategies.map(s => ({
            ...s,
            isBest: aiAdvisorEnabled && s.impact === maxImpact
        })),
        chartData: [
            { month: '7月', 基准税负: 12000, 优化税负: aiAdvisorEnabled ? 8000 : 10000 },
            { month: '8月', 基准税负: 13500, 优化税负: aiAdvisorEnabled ? 8000 : 11000 },
            { month: '9月', 基准税负: 45000, 优化税负: aiAdvisorEnabled ? 15000 : 25000 },
            { month: '10月', 基准税负: 14000, 优化税负: aiAdvisorEnabled ? 8000 : 11000 },
            { month: '11月', 基准税负: 15500, 优化税负: aiAdvisorEnabled ? 9000 : 12000 },
            { month: '12月', 基准税负: 58000, 优化税负: aiAdvisorEnabled ? 12000 : 16000 }
        ]
      });
    }, 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-[var(--border-color)] p-6 shadow-sm flex flex-col print:hidden">
       <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-gray-800 text-[15px] flex items-center">
              <Calculator className="w-5 h-5 text-blue-500 mr-2" /> 年度税务压力预测模拟器
            </h3>
            <p className="text-[12px] text-gray-500 font-medium mt-1">输入下半年经营预期，AI 生成多场景税务压力测试与合规筹划建议。</p>
          </div>
       </div>

       <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/3 space-y-4">
             <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <label className="text-[12px] font-bold text-gray-700 flex justify-between mb-2">
                   <span>下半年收入预期环比增长 (%)</span>
                   <span className="text-emerald-600">+{incomeGrowth}%</span>
                </label>
                <input 
                   type="range" min="-30" max="100" value={incomeGrowth} onChange={(e) => setIncomeGrowth(parseInt(e.target.value))}
                   className="w-full accent-emerald-500" 
                />
             </div>
             
             <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <label className="text-[12px] font-bold text-gray-700 flex justify-between mb-2">
                   <span>下半年成本预期环比增长 (%)</span>
                   <span className="text-rose-600">+{expenseGrowth}%</span>
                </label>
                <input 
                   type="range" min="-30" max="100" value={expenseGrowth} onChange={(e) => setExpenseGrowth(parseInt(e.target.value))}
                   className="w-full accent-rose-500" 
                />
             </div>

             <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-start">
               <input type="checkbox" id="v_tech" className="mt-1 mr-2 accent-blue-500" defaultChecked />
               <div>
                  <label htmlFor="v_tech" className="text-[12px] font-bold text-gray-700 block">筹备“高新技术企业”认证</label>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">将影响研发费用加计扣除和企业所得税率测算基准。</p>
               </div>
             </div>

             <div className={`p-4 rounded-xl border flex items-start transition-colors ${aiAdvisorEnabled ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-100'}`}>
               <input type="checkbox" id="ai_advisor" className="mt-1 mr-2 accent-indigo-500" checked={aiAdvisorEnabled} onChange={(e) => {
                   setAiAdvisorEnabled(e.target.checked);
                   if (report) handleSimulate();
               }} />
               <div>
                  <label htmlFor="ai_advisor" className={`text-[12px] font-bold flex items-center ${aiAdvisorEnabled ? 'text-indigo-700' : 'text-gray-700'}`}>
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    AI Tax Advisor 智能分析
                  </label>
                  <p className={`text-[10px] font-medium mt-0.5 ${aiAdvisorEnabled ? 'text-indigo-600' : 'text-gray-500'}`}>自动寻找并高亮最大化税收筹划效益的策略。</p>
               </div>
             </div>

             <button 
                onClick={handleSimulate} 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center"
             >
                {isSimulating ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div> : <BrainCircuit className="w-4 h-4 mr-2" />}
                {isSimulating ? '神经网络测算中...' : '开始全局税务推演'}
             </button>
          </div>

          <div className="lg:w-2/3">
              {!report ? (
                 <div className="h-full min-h-[280px] border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center bg-gray-50/50">
                    <Target className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-sm font-bold text-gray-500">调整左侧参数，点击开始推演获知全年税务压力</p>
                 </div>
              ) : (
                 <div className="animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                       {report.scenarios.map((sc: any, idx: number) => (
                          <div key={idx} className={`p-4 rounded-xl border ${sc.isBest ? 'ring-2 ring-indigo-500 shadow-lg scale-105 transform transition-all z-10' : ''} ${sc.color === 'emerald' ? 'bg-emerald-50 border-emerald-200 shadow-sm relative overflow-hidden' : sc.color === 'blue' ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-gray-200'} cursor-default`}>
                             {sc.color === 'emerald' && <div className="absolute -right-6 -top-6 w-16 h-16 bg-emerald-100 rounded-full opacity-50"></div>}
                             <h4 className={`text-[11px] font-bold mb-1 ${sc.color === 'emerald' ? 'text-emerald-700' : sc.color === 'blue' ? 'text-blue-700' : 'text-gray-600'}`}>
                               {sc.name}
                               {sc.isBest && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700"><Sparkles className="w-2.5 h-2.5 mr-0.5" />荐</span>}
                             </h4>
                             <p className={`text-xl font-black mb-2 ${sc.color === 'emerald' ? 'text-emerald-600' : sc.color === 'blue' ? 'text-blue-600' : 'text-gray-800'}`}>{sc.tax}</p>
                             <p className={`text-[10px] font-medium leading-relaxed ${sc.color === 'emerald' ? 'text-emerald-800' : sc.color === 'blue' ? 'text-blue-800' : 'text-gray-500'}`}>{sc.suggestion}</p>
                          </div>
                       ))}
                    </div>

                    <div className="bg-white border border-gray-100 rounded-xl p-4 h-[220px]">
                       <h4 className="text-[11px] font-bold text-gray-500 mb-2">下半年税负走势预测 (基准 vs 优化)</h4>
                       <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={report.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorO" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#9ca3af" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} dy={5} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }} />
                            <Area type="monotone" dataKey="优化税负" stroke="#10b981" fillOpacity={1} fill="url(#colorO)" strokeWidth={2} />
                            <Area type="monotone" dataKey="基准税负" stroke="#9ca3af" fillOpacity={1} fill="url(#colorB)" strokeWidth={1} strokeDasharray="4 4" />
                         </AreaChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
              )}
          </div>
       </div>
    </div>
  );
}
