import React, { useState } from 'react';
import { Network, Play, Settings2, Plus, ArrowRight, Bot, Cpu, Zap, Activity, MoreHorizontal, MessageSquare, Search, Globe, Image, Wand2, Send } from 'lucide-react';
import { toast } from './Toast';

export function AgentWorkflowView() {
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>('wf-1');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [leftTab, setLeftTab] = useState<'mine' | 'templates'>('mine');

  const workflows = [
    { id: 'wf-1', name: '爆款内容全自动分发', status: '运行中', runs: 124, lastRun: '10 分钟前' },
    { id: 'wf-2', name: '电商评论智能回复', status: '已暂停', runs: 3045, lastRun: '昨天 18:00' },
    { id: 'wf-3', name: '数字人矩阵批量生成', status: '运行中', runs: 89, lastRun: '2 小时前' },
  ];

  const workflowTemplates = [
    { id: 'tpl-1', name: '小红书种草文全自动矩阵', desc: '根据爆款框架自动爬取改写，结合MJ生成配图', type: '社交媒体' },
    { id: 'tpl-2', name: '企业知识库深度分析', desc: '多智能体协同提炼、审核并给出决策与建议', type: '企业服务' },
    { id: 'tpl-3', name: '自动化编程助手 (AutoCoder)', desc: '识别缺陷需求，搜寻代码，编写测试，自动修复', type: '代码研发' },
    { id: 'tpl-4', name: '全网比价与自动决策', desc: '多平台检索指定商品，综合对比历史价格提示购买', type: '效率助手' }
  ];

  const agentNodes = [
    { id: 'node-1', name: '全网热点挖掘 Agent', type: '分析', x: 50, y: 150 },
    { id: 'node-2', name: '文案重写 Agent', type: '创作', x: 300, y: 150 },
    { id: 'node-3', name: '数字人渲染引擎', type: '执行', x: 550, y: 80 },
    { id: 'node-4', name: 'B 站/抖音分发脚本', type: '执行', x: 550, y: 220 },
  ];

  return (
    <div className="p-[var(--spacing-lg)] lg:p-[var(--spacing-xl)] max-w-[1600px] mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-[var(--bg-panel)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-[var(--spacing-md)] shrink-0 gap-[var(--spacing-md)] border-b border-[var(--border-color)] pb-4">
         <div>
            <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center tracking-tight">
               <Network className="icon-lg mr-3 text-[var(--text-main)]" />
               多AGENT: 全域自动化流水线
               <span className="ml-3 bg-gray-100 text-[var(--text-main)] text-[10px] uppercase font-black px-2 py-0.5 rounded shadow-sm border border-[var(--border-color)]">Auto-Agent Engine</span>
            </h2>
            <p className="text-[var(--text-muted)] text-[14px] mt-2 font-medium max-w-xl leading-relaxed">
               为「一人公司」构建自动化跑通链路 (DAG)，将大模型能力、外部 API 与执行节点无缝组合。解放你的双手。
            </p>
         </div>
         <button className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold shadow-md transition-all flex items-center group">
            <Plus className="icon-md mr-1" /> 
            <span className="tracking-wide text-sm">新建工作流</span>
         </button>
      </div>

      <div className="flex flex-1 gap-[var(--spacing-md)] min-h-0">
         {/* Left Side: Workflow List & Templates */}
         <div className="w-[320px] shrink-0 bg-[var(--bg-app)] border border-[var(--border-color)] shadow-sm rounded-[var(--radius-xl)] flex flex-col overflow-hidden">
            <div className="border-b border-[var(--border-color)] bg-[var(--bg-panel)] flex-col shrink-0 shadow-sm z-10">
               <div className="p-4 flex items-center justify-between pb-0">
                 <h3 className="font-bold text-[var(--text-main)] text-[15px] tracking-tight">流水线组件</h3>
                 <button className="text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)] p-1.5 rounded-full transition-colors"><Settings2 className="w-[18px] h-[18px]" /></button>
               </div>
               <div className="flex px-4 pt-4 space-x-4">
                 <button 
                   onClick={() => setLeftTab('mine')}
                   className={`pb-2.5 text-sm font-bold border-b-2 transition-colors ${leftTab === 'mine' ? 'border-[var(--color-primary)] text-[var(--text-main)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                 >
                   我的工作流
                 </button>
                 <button 
                   onClick={() => setLeftTab('templates')}
                   className={`pb-2.5 text-sm font-bold border-b-2 transition-colors flex items-center ${leftTab === 'templates' ? 'border-[var(--color-primary)] text-[var(--text-main)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                 >
                   模板大全
                 </button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 relative">
               <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-app)] to-transparent h-4 pointer-events-none z-10 transition-opacity"></div>
               {leftTab === 'mine' ? (
                 workflows.map(wf => (
                    <div 
                      key={wf.id}
                      onClick={() => setActiveWorkflow(wf.id)}
                      className={`p-4 rounded-[var(--radius-lg)] cursor-pointer border-[1.5px] transition-all relative overflow-hidden group ${activeWorkflow === wf.id ? 'border-[var(--color-primary)] bg-[var(--bg-panel)] shadow-md' : 'border-transparent bg-[var(--bg-panel)] hover:border-[var(--border-color)] shadow-sm'}`}
                    >
                       {activeWorkflow === wf.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-primary)]"></div>}
                       <div className="flex items-center justify-between mb-2.5">
                          <span className={`text-[11px] font-black tracking-widest px-2.5 py-0.5 rounded-full flex items-center ${wf.status === '运行中' ? 'bg-emerald-100/50 text-emerald-600' : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'}`}>
                             {wf.status === '运行中' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></div>}
                             {wf.status}
                          </span>
                          <MoreHorizontal className="w-[18px] h-[18px] text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />
                       </div>
                       <h4 className="font-bold text-[var(--text-main)] text-[15px] mb-2 pl-0.5">{wf.name}</h4>
                       <p className="text-[12px] font-medium text-[var(--text-muted)] flex justify-between items-center mt-3 pt-3 border-t border-[var(--border-color)] pl-0.5">
                          <span className="flex items-center"><Activity className="w-[14px] h-[14px] mr-1.5 text-[var(--color-primary)]" /> {wf.runs} 次运行</span>
                          <span>{wf.lastRun}</span>
                       </p>
                    </div>
                 ))
               ) : (
                 workflowTemplates.map(tpl => (
                    <div 
                      key={tpl.id}
                      className="p-4 rounded-[var(--radius-lg)] border-[1.5px] border-transparent bg-[var(--bg-panel)] shadow-sm hover:border-[var(--color-primary)] transition-all cursor-pointer group flex flex-col"
                    >
                       <div className="flex items-center justify-between mb-2">
                           <span className="text-[10px] uppercase font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded shadow-sm">{tpl.type}</span>
                           <button className="opacity-0 group-hover:opacity-100 text-xs font-bold text-[var(--color-primary)] flex items-center transition-opacity" onClick={() => {
                              toast(`基于模板 (${tpl.name}) 已创建新工作流`, 'success');
                              setActiveWorkflow(tpl.id);
                              setLeftTab('mine');
                           }}>使用 <ArrowRight className="w-3.5 h-3.5 ml-1" /></button>
                       </div>
                       <h4 className="font-bold text-[var(--text-main)] text-[14px] leading-tight mb-2">{tpl.name}</h4>
                       <p className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed">{tpl.desc}</p>
                    </div>
                 ))
               )}
            </div>
         </div>

         {/* Right Side: Graph / Node Editor Simulation */}
         <div className="flex-1 bg-[var(--bg-app)] rounded-[24px] border border-[var(--border-color)] shadow-sm relative overflow-hidden flex flex-row">
            {/* Logic area */}
            <div className="flex-1 flex flex-col relative w-full h-full inner-shadow-sm">
            <div className="absolute inset-0 z-0 bg-[radial-gradient(#D1D5DB_1px,transparent_1px)] [background-size:24px_24px] opacity-50"></div>
            
            {/* Top Toolbar */}
            <div className="relative z-10 p-3 m-4 bg-[var(--bg-panel)]/90 backdrop-blur-md rounded-[16px] shadow-sm border border-[var(--border-color)] flex items-center justify-between">
               <div className="flex items-center space-x-3 px-2">
                  <span className="font-bold text-[var(--text-main)] text-[15px]">爆款内容全自动分发</span>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <span className="text-[12px] font-bold text-[var(--color-primary)] bg-blue-50 px-2 py-0.5 rounded-md flex items-center"><Cpu className="w-3.5 h-3.5 mr-1" /> 4 节点在线</span>
               </div>
               <div className="flex space-x-2">
                  <button className="px-4 py-2 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-full text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm flex items-center">编辑参数</button>
                  <button className="px-4 py-2 bg-[var(--color-primary)] hover:bg-blue-700 rounded-full text-[13px] font-bold text-white transition-colors shadow-sm flex items-center"><Play className="w-3.5 h-3.5 mr-1" fill="currentColor" /> 触发测试</button>
               </div>
            </div>

            {/* Simulated Nodes Area */}
            <div className="relative flex-1 z-0">
               {/* Connections (Mocked) */}
               <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <path d="M 290 185 L 340 185" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="4 4" fill="none" className="animate-pulse" />
                  <path d="M 540 185 C 570 185 570 115 590 115" stroke="#9CA3AF" strokeWidth="2" fill="none" />
                  <path d="M 540 185 C 570 185 570 255 590 255" stroke="#9CA3AF" strokeWidth="2" fill="none" />
               </svg>

               {/* Nodes */}
               {agentNodes.map((node) => (
                 <div 
                   key={node.id} 
                   onClick={() => setSelectedNodeId(node.id)}
                   className={`absolute bg-[var(--bg-panel)] rounded-[var(--radius-xl)] shadow-sm p-4 w-60 hover:shadow-md transition-all cursor-pointer border ${
                     selectedNodeId === node.id ? 'border-gray-900 ring-4 ring-gray-900/10' : 'border-[var(--border-color)] hover:border-gray-300'
                   }`} 
                   style={{ left: `${node.x}px`, top: `${node.y}px` }}
                 >
                    <div className="flex items-center justify-between mb-3">
                       <span className={`text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded ${
                          node.type === '分析' ? 'bg-[#FEF7E0] text-[#B06000]' :
                          node.type === '创作' ? 'bg-[#F3E8FD] text-[#681DA8]' :
                          'bg-gray-100 text-[var(--text-main)]'
                       }`}>{node.type}</span>
                       <Bot className="icon-sm text-gray-400" />
                    </div>
                    <h5 className="font-bold text-[var(--text-main)] text-[14px] leading-tight mb-2">{node.name}</h5>
                    <div className="flex items-center justify-between mt-4 border-t border-[var(--border-color)] pt-3">
                       <div className="flex space-x-1.5 opacity-80">
                          <div className="w-2 h-2 rounded-full bg-gray-900 animate-pulse" ></div>
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" ></div>
                       </div>
                       <button className="text-[12px] text-gray-700 font-bold hover:underline group-hover:text-black">配置参数</button>
                    </div>
                 </div>
               ))}
            </div>

            {/* Bottom Logic Console Panel */}
            <div className="relative z-10 mt-auto bg-[#1E1E1E] border-t border-gray-800 text-gray-300 flex flex-col shrink-0 h-48">
               <div className="flex items-center justify-between mb-3 px-3 pt-3 shrink-0">
                  <h4 className="text-[12px] font-bold text-gray-400 flex items-center tracking-widest uppercase">
                     <Zap className="w-3.5 h-3.5 mr-1" /> 执行引擎日志池
                  </h4>
                  <div className="flex items-center space-x-3">
                     <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                           type="text"
                           value={logSearchQuery}
                           onChange={(e) => setLogSearchQuery(e.target.value)}
                           placeholder="搜索日志..."
                           className="bg-gray-800 border border-gray-700 text-gray-300 text-[11px] pl-7 pr-3 py-1 rounded w-36 focus:outline-none focus:border-gray-500 transition-colors"
                        />
                     </div>
                     <button className="text-[10px] text-[var(--text-muted)] hover:text-white transition-colors bg-gray-800 px-2 py-0.5 rounded">清空</button>
                  </div>
               </div>
               <div className="font-mono text-[12px] space-y-2 leading-relaxed opacity-90 px-3 pb-4 overflow-y-auto custom-scrollbar flex-1">
                  {[
                    { id: 1, time: '19:42:01', source: '系统', message: '工作流分配至计算节点...', severity: 'info' },
                    { id: 2, time: '19:42:05', source: '热点挖掘', message: '发现 B 站热门话题: "AI 音乐生成"，进入处理队列。', severity: 'info' },
                    { id: 3, time: '19:42:08', source: '文案重写', message: '已收到上下文，正在结合品牌设定生成脚本 (API 耗时 1.2s)...', severity: 'info' },
                    { id: 4, time: '19:42:15', source: '引擎调度', message: '正在准备渲染序列，等待动作数据同步。', severity: 'warning' },
                    { id: 5, time: '19:42:18', source: '渲染执行', message: '正在渲染并混剪 B-Roll 素材 (进度 34%)...', severity: 'info' },
                    { id: 6, time: '19:42:21', source: '网络异常', message: '资源包下载超时，等待重试...', severity: 'error' }
                  ].filter(log => log.message.includes(logSearchQuery) || log.source.includes(logSearchQuery)).map(log => (
                    <p key={log.id} className={log.severity === 'error' ? 'text-red-400 font-bold' : log.severity === 'warning' ? 'text-amber-400' : 'text-gray-300'}>
                      <span className={`${log.severity === 'error' ? 'text-red-500' : log.severity === 'warning' ? 'text-amber-500' : 'text-green-600'} font-bold`}>[{log.time}]</span> 
                      <span className="text-[var(--text-muted)]">[{log.source}]</span> 
                      {' '}{log.message}
                    </p>
                  ))}
               </div>
            </div>
          </div>

            {/* Right Logic Panel (Toolbox or Properties) */}
            <div className="w-[340px] shrink-0 bg-[var(--bg-panel)] border-l border-[var(--border-color)] z-10 flex flex-col relative">
               {selectedNodeId ? (
                 <>
                   <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between bg-blue-50/30">
                      <h3 className="font-bold text-[var(--text-main)] text-[15px]">节点配置参数</h3>
                      <button onClick={() => setSelectedNodeId(null)} className="text-[12px] font-bold text-gray-400 hover:text-gray-700 bg-[var(--bg-panel)] border border-[var(--border-color)] px-2.5 py-1 rounded-md transition-colors shadow-sm">返回</button>
                   </div>
                   <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-[var(--spacing-lg)]">
                      <div>
                         <label className="block text-[12px] font-bold text-gray-700 mb-2">模型配置 (LLM)</label>
                         <select className="w-full text-sm py-2.5 px-3 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none focus:border-gray-900 font-bold text-[var(--text-main)] bg-[var(--bg-app)] hover:bg-gray-50 transition-colors shadow-sm appearance-none">
                            <option>Gemini 3.1 Pro (推荐)</option>
                            <option>Gemini 1.5 Flash</option>
                         </select>
                      </div>
                      <div>
                         <label className="block text-[12px] font-bold text-gray-700 mb-2 flex items-center">
                            <Globe className="icon-sm mr-1.5 text-blue-500" /> 目标语种设置
                         </label>
                         <select className="w-full text-sm py-2.5 px-3 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none focus:border-gray-900 font-bold text-[var(--text-main)] bg-[var(--bg-app)] hover:bg-gray-50 transition-colors shadow-sm appearance-none">
                            <option>简体中文 (默认)</option>
                            <option>English</option>
                            <option>日本語</option>
                            <option>韩语</option>
                            <option>繁体中文</option>
                         </select>
                      </div>
                      <div>
                         <label className="block text-[12px] font-bold text-gray-700 mb-2">System Prompt 设定</label>
                         <textarea 
                           className="w-full text-[13px] p-3 border border-[var(--border-color)] rounded-[var(--radius-lg)] outline-none focus:border-gray-900 focus:ring-1 focus:ring-blue-600 font-medium text-[var(--text-main)] h-40 resize-none leading-relaxed bg-[var(--bg-app)] transition-all shadow-sm" 
                           defaultValue="你是一个爆款制造专家，请将输入的原始热点话题，结合我们的品牌调性（年轻、科技感），重写为适合短视频平台分发的口播脚本。必须包含开头钩子与文末引导..."
                         />
                      </div>
                      <div>
                         <label className="block text-[12px] font-bold text-gray-700 mb-2">输出变量映射</label>
                         <div className="p-3 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-[var(--radius-lg)] space-y-2.5 shadow-sm">
                            <div className="flex items-center justify-between">
                               <span className="text-[11px] font-mono font-bold text-[var(--text-main)] bg-gray-100 px-2 py-0.5 rounded border border-[var(--border-color)]">output.title</span>
                               <span className="text-[12px] font-medium text-gray-600">&rarr; 视频标题</span>
                            </div>
                            <div className="flex items-center justify-between">
                               <span className="text-[11px] font-mono font-bold text-[var(--text-main)] bg-gray-100 px-2 py-0.5 rounded border border-[var(--border-color)]">output.script</span>
                               <span className="text-[12px] font-medium text-gray-600">&rarr; 数字人语音台词</span>
                            </div>
                         </div>
                      </div>
                      <div className="pt-6 border-t border-[var(--border-color)] mt-auto">
                         <button className="w-full py-3 bg-[var(--color-primary)] hover:bg-blue-700 text-white font-bold text-[14px] rounded-[var(--radius-lg)] transition-colors shadow-sm">
                            保存修改并重新编译
                         </button>
                      </div>
                   </div>
                 </>
               ) : (
                 <>
                   <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-panel)] shadow-sm z-10">
                      <h3 className="font-bold text-[var(--text-main)] text-[15px]">能力组件库</h3>
                      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                        <button className="text-[12px] font-bold text-[var(--text-main)] bg-[var(--bg-panel)] px-3 py-1 rounded-md shadow-sm">官方预设</button>
                        <button className="text-[12px] font-medium text-[var(--text-muted)] hover:text-gray-700 px-3 py-1 rounded-md">仅主理人可用</button>
                      </div>
                   </div>
                   <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-[var(--spacing-lg)] bg-[var(--bg-app)]">
                  {/* Category */}
                  <div>
                     <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 px-1">数据源接入</h4>
                     <div className="space-y-2.5">
                        <div className="border border-[var(--border-color)] rounded-[var(--radius-lg)] p-3 flex items-center hover:border-amber-400 hover:shadow-md cursor-grab bg-[var(--bg-panel)] group transition-all">
                           <div className="w-10 h-10 rounded-lg bg-[#FEF7E0] flex items-center justify-center mr-3"><Search className="icon-md text-[#B06000]" /></div>
                           <div>
                              <p className="text-[13px] font-bold text-[var(--text-main)]">全网热点挖掘</p>
                              <p className="text-[11px] text-[var(--text-muted)] font-medium leading-tight mt-0.5">实时监控社交媒体趋势</p>
                           </div>
                        </div>
                        <div className="border border-[var(--border-color)] rounded-[var(--radius-lg)] p-3 flex items-center hover:border-amber-400 hover:shadow-md cursor-grab bg-[var(--bg-panel)] group transition-all">
                           <div className="w-10 h-10 rounded-lg bg-[#FEF7E0] flex items-center justify-center mr-3"><Globe className="icon-md text-[#B06000]" /></div>
                           <div>
                              <p className="text-[13px] font-bold text-[var(--text-main)]">网页数据爬虫</p>
                              <p className="text-[11px] text-[var(--text-muted)] font-medium leading-tight mt-0.5">自动化提取结构化内容</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Category */}
                  <div>
                     <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 px-1">AI 知识重塑</h4>
                     <div className="space-y-2.5">
                        <div className="border border-[var(--border-color)] rounded-[var(--radius-lg)] p-3 flex items-center hover:border-purple-400 hover:shadow-md cursor-grab bg-[var(--bg-panel)] group transition-all">
                           <div className="w-10 h-10 rounded-lg bg-[#F3E8FD] flex items-center justify-center mr-3"><Wand2 className="icon-md text-[#681DA8]" /></div>
                           <div>
                              <p className="text-[13px] font-bold text-[var(--text-main)]">文本理解与派生</p>
                              <p className="text-[11px] text-[var(--text-muted)] font-medium leading-tight mt-0.5">基于 Gemini Pro 深度处理</p>
                           </div>
                        </div>
                        <div className="border border-[var(--border-color)] rounded-[var(--radius-lg)] p-3 flex items-center hover:border-purple-400 hover:shadow-md cursor-grab bg-[var(--bg-panel)] group transition-all">
                           <div className="w-10 h-10 rounded-lg bg-[#F3E8FD] flex items-center justify-center mr-3"><Image className="icon-md text-[#681DA8]" /></div>
                           <div>
                              <p className="text-[13px] font-bold text-[var(--text-main)]">多模态生成</p>
                              <p className="text-[11px] text-[var(--text-muted)] font-medium leading-tight mt-0.5">生成配图、封面与音效</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Category */}
                  <div>
                     <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3 px-1">执行节点</h4>
                     <div className="space-y-2.5">
                        <div className="border border-[var(--border-color)] rounded-[var(--radius-lg)] p-3 flex items-center hover:border-gray-900 hover:shadow-md cursor-grab bg-[var(--bg-panel)] group transition-all">
                           <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mr-3"><Send className="icon-md text-[var(--text-main)]" /></div>
                           <div>
                              <p className="text-[13px] font-bold text-[var(--text-main)]">多端 API 投递</p>
                              <p className="text-[11px] text-[var(--text-muted)] font-medium leading-tight mt-0.5">将成果同步至下游平台</p>
                           </div>
                        </div>
                        <div className="border border-[var(--border-color)] rounded-[var(--radius-lg)] p-3 flex items-center hover:border-green-400 hover:shadow-md cursor-grab bg-[var(--bg-panel)] group transition-all">
                           <div className="w-10 h-10 rounded-lg bg-[#E6F4EA] flex items-center justify-center mr-3"><MessageSquare className="icon-md text-[#1E8E3E]" /></div>
                           <div>
                              <p className="text-[13px] font-bold text-[var(--text-main)]">私聊/评论触达</p>
                              <p className="text-[11px] text-[var(--text-muted)] font-medium leading-tight mt-0.5">自动唤起互动转化意向</p>
                           </div>
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
