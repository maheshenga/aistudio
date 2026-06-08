import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Search, Shield, UserPlus, Users, MessageSquare, PenTool, ListTodo, Folder, Layers, Share2, Plus, Clock, FileText, Settings2, Check, Network } from 'lucide-react';
import { ModuleId } from '../types';

interface TeamViewProps {
  moduleId?: string;
}

const members = [
  { id: 1, name: 'Maheshenga (本人)', role: '超级管理员 / 个人AI主理人', email: 'founder@company.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', active: '在线' },
  { id: 2, name: 'Agent-X 编导', role: '数字编导专员 (AI)', email: 'agent.video@ai.company', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bob', active: '在线' },
  { id: 3, name: 'Agent-Y 数据', role: '数据分析师 (AI)', email: 'agent.data@ai.company', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Charlie', active: '在线' },
  { id: 4, name: 'DesignCopilot', role: '设计助理 (AI)', email: 'agent.design@ai.company', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Diana', active: '1 天前' },
  { id: 5, name: '外包专员 Ethan', role: '兼职外包', email: 'ethan.remote@company.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan', active: '在线' },
];

export function TeamView({ moduleId = 'team' }: TeamViewProps) {
  
  if (moduleId === 'team_write') {
    return (
      <div className="p-[var(--spacing-lg)] md:p-10 max-w-[1600px] mx-auto space-y-8 h-[calc(100vh-4rem)] flex flex-col animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-[var(--spacing-md)] shrink-0">
          <div>
            <h2 className="text-[var(--text-main)]xl font-black text-[var(--text-main)] tracking-tight flex items-center">
              智能协同写作 <span className="ml-3 bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded shadow-sm">AI-Powered</span>
            </h2>
            <p className="text-[var(--text-muted)] mt-2 text-[15px] font-medium max-w-2xl leading-relaxed">基于 Gemini 大模型引擎的多人在线协同文档。支持实时版本控制、智能续写与语法润色。</p>
          </div>
          <div className="flex space-x-3">
            <button className="bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-sm transition-colors shadow-sm flex items-center">
               <FileText className="icon-sm mr-2" /> 导入本地文档
            </button>
            <button className="bg-[var(--color-primary)] hover:bg-blue-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-sm transition-colors shadow-sm flex items-center">
               <Plus className="icon-sm mr-2" /> 新建共享文档
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-[var(--spacing-md)] overflow-hidden min-h-0">
          {/* Document List */}
          <div className="w-full lg:w-1/3 overflow-y-auto custom-scrollbar space-y-[var(--spacing-md)] pr-2">
            {[
              { title: '2026 年度品牌营销策略大纲', time: '10 分钟前更新', activeUsers: 3, status: '编辑中', color: 'blue' },
              { title: '春季新品「繁星」系列宣发通稿', time: '2 小时前更新', activeUsers: 1, status: '审阅中', color: 'amber' },
              { title: '小红书品牌种草矩阵内容企划', time: '昨天更新', activeUsers: 0, status: '已定稿', color: 'green' },
              { title: 'Q3 核心用户访谈洞察报告', time: '3 天前更新', activeUsers: 2, status: '编辑中', color: 'blue' }
            ].map((doc, i) => (
              <div key={i} className={`bg-[var(--bg-panel)] border-2 rounded-[var(--radius-xl)] p-5 transition-all cursor-pointer relative group ${i === 0 ? 'border-blue-500 shadow-md ring-4 ring-blue-50 leading-relaxed' : 'border-[var(--border-color)] hover:border-blue-300 hover:shadow-sm'}`}>
                {i === 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full pointer-events-none  " />}
                
                <div className="flex justify-between items-start mb-3">
                   <div className={`w-10 h-10 ${i === 0 ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-50 text-[var(--text-muted)]'} rounded-[var(--radius-lg)] flex items-center justify-center shrink-0 shadow-sm transition-colors`}>
                      <FileText className="icon-md" />
                   </div>
                   <div className="flex -space-x-2">
                     {Array.from({ length: doc.activeUsers }).map((_, idx) => (
                        <div key={idx} className="w-7 h-7 rounded-full border-2 border-white bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center relative z-10 shadow-sm">
                           <span className="text-[10px] font-black text-blue-700">
                              {['JD', 'AW', 'LY'][idx]}
                           </span>
                        </div>
                     ))}
                   </div>
                </div>
                
                <h3 className="font-black text-[var(--text-main)] mb-1.5 text-[15px] group-hover:text-[var(--color-primary)] transition-colors line-clamp-2">{doc.title}</h3>
                
                <div className="flex justify-between items-center mt-4">
                   <span className="flex items-center text-[11px] font-bold text-gray-400"><Clock className="w-3.5 h-3.5 mr-1" /> {doc.time}</span>
                   <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded border ${
                     doc.color === 'blue' ? 'bg-blue-50 text-[var(--color-primary)] border-blue-100' : 
                     doc.color === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-600 border-green-100'
                   }`}>{doc.status}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Active Document Preview Panel */}
          <div className="hidden lg:flex flex-1 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-3xl shadow-sm overflow-hidden flex-col">
            <div className="h-14 bg-gray-50 border-b border-[var(--border-color)] flex items-center justify-between px-6 shrink-0">
               <div className="flex items-center space-x-3">
                 <span className="text-xs font-black uppercase tracking-widest text-blue-500 bg-blue-50 px-2 py-1 rounded">正在协作</span>
                 <span className="text-sm font-bold text-gray-700">2026 年度品牌营销策略大纲</span>
               </div>
               <div className="flex space-x-2">
                 <div className="icon-lg rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]" title="AI Assistant"><PenTool className="w-3 h-3" /></div>
                 <div className="icon-lg rounded-md bg-gray-200 text-gray-600 flex items-center justify-center"><Share2 className="w-3 h-3" /></div>
               </div>
            </div>
            <div className="flex-1 p-[var(--spacing-xl)] overflow-y-auto custom-scrollbar flex justify-center bg-[#F4F6F8]">
               <div className="w-full max-w-3xl bg-[var(--bg-panel)] shadow-md rounded-[var(--radius-xl)] min-h-full p-12 border border-[var(--border-color)] relative">
                  {/* Fake Caret */}
                  <div className="absolute top-[180px] left-[150px] w-0.5 h-5 bg-blue-500 animate-pulse"></div>
                  <div className="absolute top-[158px] left-[150px] bg-[var(--color-primary)] text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm">Alice</div>
                  
                  <h1 className="text-[var(--text-main)]xl font-black text-[var(--text-main)] mb-[var(--spacing-xl)] tracking-tight">2026 年度品牌营销策略大纲</h1>
                  
                  <div className="space-y-[var(--spacing-lg)] text-gray-700 font-medium leading-loose text-[15px]">
                     <p>一、 核心品牌主张提炼：我们致力于在快节奏的现代生活中，为消费者提供一种“极简、舒适、高质量”的护肤体验。<span className="bg-amber-100 border-b-2 border-amber-300">针对年轻一代消费群体的精细化需求</span>，我们需要重塑品牌调性。</p>
                     
                     <div className="bg-blue-50/50 p-[var(--spacing-lg)] rounded-[var(--radius-lg)] border border-blue-100 my-8">
                       <div className="flex items-center mb-3">
                         <span className="bg-[var(--color-primary)] text-white p-1 rounded mr-2"><PenTool className="w-3 h-3" /></span>
                         <span className="text-xs font-black text-blue-900 uppercase">AI 智能审阅建议</span>
                       </div>
                       <p className="text-sm text-blue-800 leading-relaxed mb-3">原句修辞不够简练，建议替换为：“聚焦 Z 世代碎片化护肤场景，以‘极简效能’重塑品牌沟通语境。”</p>
                       <div className="flex space-x-2">
                         <button className="text-[11px] font-bold bg-[var(--bg-panel)] border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors shadow-sm">接受建议</button>
                         <button className="text-[11px] font-bold text-[var(--text-muted)] px-2 py-1.5 hover:text-[var(--text-main)] transition-colors">忽略</button>
                       </div>
                     </div>

                     <h2 className="text-2xl font-bold text-[var(--text-main)] mt-10 mb-4">二、 Q1-Q2 阶段性目标规划</h2>
                     <ul className="list-disc pl-6 space-y-3">
                       <li>第一阶段（1-2月）：借助春节营销节点，推出「冬日暖阳」修护套组，主打亲情馈赠场景。预估曝光量提升 30%。</li>
                       <li>第二阶段（3-5月）：联合核心防晒新品上线，在小红书与抖音发起 #无惧阳光敢晒敢拍 挑战赛，签约 5-10 位千粉腰部达人进行种草...</li>
                     </ul>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (moduleId === 'team_tasks') {
    return (
      <div className="p-[var(--spacing-lg)] md:p-10 max-w-[1600px] mx-auto space-y-8 h-[calc(100vh-4rem)] flex flex-col animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-[var(--spacing-md)] shrink-0">
          <div>
            <h2 className="text-[var(--text-main)]xl font-black text-[var(--text-main)] tracking-tight flex items-center">
               一人公司·全平台经营看板 <span className="ml-3 bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded shadow-sm">Kanban</span>
            </h2>
            <p className="text-[var(--text-muted)] mt-2 text-[15px] font-medium max-w-2xl leading-relaxed">可视化的任务进度追踪面板，轻松分配资源，支持自动化流转与效果归因映射。</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex -space-x-2 mr-4">
               {['https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie'].map((a, i) => (
                  <img key={i} src={a} className="icon-xl rounded-full border-2 border-white bg-gray-100 shadow-sm z-10" alt="avatar" />
               ))}
               <div className="icon-xl rounded-full border-2 border-white bg-gray-50 flex items-center justify-center z-0 shadow-sm text-[10px] font-black text-gray-400">+2</div>
            </div>
            <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-sm transition-colors shadow-sm flex items-center">
               <Plus className="icon-sm mr-2" /> 新建任务卡片
            </button>
          </div>
        </div>

        <div className="flex-1 flex gap-[var(--spacing-md)] overflow-hidden min-h-0 overflow-x-auto pb-4 custom-scrollbar">
           {/* Kanban Columns */}
           {[
             { name: '待接单 (To Do)', color: 'gray', count: 2, tasks: [
                { id: 'T-101', title: '设计全新的主视觉海报', tags: ['设计', '高优'], assignee: '未分配', avatar: null }
             ]},
             { name: '进行中 (In Progress)', color: 'blue', count: 3, tasks: [
                { id: 'T-102', title: '制作 5 条抖音短视频预热', tags: ['视频', '营销'], assignee: 'Bob Chen', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob' },
                { id: 'T-103', title: '完成小红书种草文案首稿', tags: ['文案'], assignee: 'Alice Wang', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice' },
             ]},
             { name: '待审阅 (Review)', color: 'amber', count: 1, tasks: [
                { id: 'T-104', title: '双 11 活动落地页最终测试', tags: ['开发', '测试'], assignee: 'Ethan Lin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan' }
             ]},
             { name: '已完成 (Done)', color: 'green', count: 12, tasks: [
                { id: 'T-105', title: '完成上个月的运营数据复盘报告整理', tags: ['数据', '月报'], assignee: 'Charlie Liu', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie' }
             ]}
           ].map((col, i) => (
              <div key={i} className="flex-none w-80 flex flex-col bg-gray-50 rounded-3xl p-4 border border-[var(--border-color)]/60 shadow-sm">
                 <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="font-black text-[var(--text-main)] text-[15px]">{col.name}</h3>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      col.color === 'gray' ? 'bg-gray-200 text-gray-600' :
                      col.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                      col.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>{col.count}</span>
                 </div>
                 <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-2 px-1">
                    {col.tasks.map((task, j) => (
                       <div key={j} className="bg-[var(--bg-panel)] p-4 rounded-[var(--radius-xl)] shadow-sm border border-[var(--border-color)] hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
                          <div className="flex justify-between items-start mb-2">
                             <div className="flex flex-wrap gap-1">
                                {task.tags.map(tag => (
                                   <span key={tag} className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                      tag === '高优' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-gray-50 text-[var(--text-muted)] border-[var(--border-color)]'
                                   }`}>{tag}</span>
                                ))}
                             </div>
                             <span className="text-[10px] font-bold text-gray-400 group-hover:text-blue-400 transition-colors">{task.id}</span>
                          </div>
                          <h4 className="font-bold text-[var(--text-main)] text-[14px] leading-snug mb-4">{task.title}</h4>
                          <div className="flex justify-between items-center mt-2 pt-3 border-t border-gray-50">
                             <div className="flex items-center space-x-2">
                                {task.avatar ? (
                                   <img src={task.avatar} alt="avatar" className="icon-md rounded-full bg-gray-100" />
                                ) : (
                                   <div className="icon-md rounded-full border border-dashed border-gray-300 flex items-center justify-center shrink-0">
                                      <UserPlus className="w-2 h-2 text-gray-400" />
                                   </div>
                                )}
                                <span className="text-[11px] font-bold text-[var(--text-muted)]">{task.assignee}</span>
                             </div>
                             <div className="flex space-x-1">
                                <MessageSquare className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400" />
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
                 <button className="mt-2 text-[12px] font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-100 py-2.5 rounded-[var(--radius-lg)] transition-colors flex items-center justify-center w-full">
                    <Plus className="w-3.5 h-3.5 mr-1" /> 添加卡片
                 </button>
              </div>
           ))}
        </div>
      </div>
    );
  }

  if (moduleId === 'team_assets') {
    return (
      <div className="p-[var(--spacing-lg)] md:p-10 max-w-[1600px] mx-auto space-y-8 h-[calc(100vh-4rem)] flex flex-col animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-[var(--spacing-md)] shrink-0">
          <div>
            <h2 className="text-[var(--text-main)]xl font-black text-[var(--text-main)] tracking-tight flex items-center">
              智能云端素材池 <span className="ml-3 bg-violet-100 text-violet-700 text-[10px] font-black px-2 py-0.5 rounded shadow-sm">AI Sync Hub</span>
            </h2>
            <p className="text-[var(--text-muted)] mt-2 text-[15px] font-medium max-w-2xl leading-relaxed">统一存储个人超级 IP 设计规范、产品套图及数字资产，支持 AI 标签自动分类与多端极速分发体验。</p>
          </div>
          <div className="flex space-x-3">
             <div className="relative group">
               <button className="bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-sm transition-colors shadow-sm flex items-center">
                 <Shield className="icon-sm mr-2" /> 资产权限管理
               </button>
             </div>
             <button className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-sm transition-colors shadow-sm flex items-center">
               <Share2 className="icon-sm mr-2" /> 快速上传资产
             </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[var(--spacing-md)] shrink-0">
           {[
             { title: '品牌视觉识别系统', desc: 'Logo、字体、色彩库规范汇总', items: 12, icon: <Layers className="w-7 h-7 text-violet-600" />, bg: 'bg-violet-50', border: 'border-violet-100 hover:border-violet-300', tag: '核心库' },
             { title: '2026 新品素材包', desc: '包括未打水印的原尺高清白底与场景图', items: 450, icon: <Folder className="w-7 h-7 text-amber-600" />, bg: 'bg-amber-50', border: 'border-amber-100 hover:border-amber-300', tag: 'AI已标记' },
             { title: '私域引流营销套件', desc: '各尺寸裂变活动预热海报模板库', items: 34, icon: <FileText className="w-7 h-7 text-green-600" />, bg: 'bg-green-50', border: 'border-green-100 hover:border-green-300', tag: '热力分发' },
             { title: '版权商用视听库', desc: '安全的配乐音频轨道以及空镜头集合', items: 89, icon: <Folder className="w-7 h-7 text-[var(--color-primary)]" />, bg: 'bg-blue-50', border: 'border-blue-100 hover:border-blue-300', tag: '公用资源' }
           ].map((dir, i) => (
             <div key={i} className={`bg-[var(--bg-panel)] border-2 rounded-[24px] p-[var(--spacing-lg)] hover:shadow-xl transition-all duration-300 cursor-pointer relative group flex flex-col justify-between min-h-[160px] ${dir.border}`}>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
                   <Share2 className="icon-sm hover:text-[var(--text-main)] transition-colors" />
                </div>
                
                <div className="flex justify-between items-start mb-4">
                   <div className={`w-14 h-14 ${dir.bg} rounded-[var(--radius-xl)] flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform`}>
                      {dir.icon}
                   </div>
                   <span className="bg-gray-100 text-gray-600 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md">{dir.tag}</span>
                </div>
                
                <div>
                   <h3 className="font-black text-[var(--text-main)] text-[17px] mb-1.5 tracking-tight group-hover:text-violet-600 transition-colors">{dir.title}</h3>
                   <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">{dir.desc}</p>
                </div>
                <div className="mt-5 pt-4 border-t border-gray-50 flex justify-between items-center">
                   <span className="text-[12px] font-bold text-gray-400">{dir.items} 项相关资产</span>
                   <div className="icon-lg rounded-full bg-gray-50 flex items-center justify-center relative">
                     <div className="absolute -inset-1 bg-violet-400 rounded-full opacity-0 group-hover:opacity-20 animate-ping"></div>
                     <span className="text-[10px] font-black text-gray-400">→</span>
                   </div>
                </div>
             </div>
           ))}
        </div>
        
        {/* Placeholder for asset grid view below the folders */}
        <div className="flex-1 bg-gray-50 rounded-3xl border border-[var(--border-color)]/60 p-[var(--spacing-xl)] flex flex-col items-center justify-center mt-4">
           <div className="w-20 h-20 bg-[var(--bg-panel)] rounded-[var(--radius-xl)] shadow-sm border border-[var(--border-color)] flex items-center justify-center mb-[var(--spacing-md)]">
              <Search className="icon-xl text-gray-300" />
           </div>
           <h4 className="text-[18px] font-black text-[var(--text-main)] mb-2">未选中任何文件夹</h4>
           <p className="text-[14px] text-[var(--text-muted)] font-medium text-center max-w-sm leading-relaxed">在上方选择一个素材库以浏览文件。支持拖拽上传并依靠 AI 引擎自动打标签分类。</p>
        </div>
      </div>
    );
  }

  if (moduleId === 'team_more') {
    return (
      <div className="p-[var(--spacing-lg)] md:p-10 max-w-[1600px] mx-auto space-y-8 h-[calc(100vh-4rem)] flex flex-col animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-[var(--spacing-md)] shrink-0">
          <div>
            <h2 className="text-[var(--text-main)]xl font-black text-[var(--text-main)] tracking-tight flex items-center">
               主理人终审机制 <span className="ml-3 bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded shadow-sm">Audit & Approve</span>
            </h2>
            <p className="text-[var(--text-muted)] mt-2 text-[15px] font-medium max-w-2xl leading-relaxed">统一管理应用上架、营销预算、素材版权以及发布前的合规审批流程。</p>
          </div>
          <div className="flex space-x-3">
             <button className="bg-[var(--bg-panel)] border border-[var(--border-color)] hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-sm transition-colors shadow-sm flex items-center">
               <Settings2 className="icon-sm mr-2" /> 审批规则配置
             </button>
             <button className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-sm transition-colors shadow-sm flex items-center">
               <Plus className="icon-sm mr-2" /> 发起新审批
             </button>
          </div>
        </div>
        
        <div className="flex-1 flex gap-[var(--spacing-md)] overflow-hidden min-h-0">
           {/* Sidebar */}
           <div className="w-64 shrink-0 flex flex-col space-y-2">
              <div className="px-4 py-3 bg-red-50 text-red-700 rounded-[var(--radius-lg)] font-bold text-sm flex items-center justify-between cursor-pointer">
                 <span>待我处理的</span>
                 <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full">3</span>
              </div>
              <div className="px-4 py-3 bg-transparent hover:bg-gray-50 text-gray-700 rounded-[var(--radius-lg)] font-bold text-sm transition-colors cursor-pointer">
                 我发起的审批
              </div>
              <div className="px-4 py-3 bg-transparent hover:bg-gray-50 text-gray-700 rounded-[var(--radius-lg)] font-bold text-sm transition-colors cursor-pointer">
                 已归档
              </div>
           </div>
           
           {/* Main List */}
           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
              {[
                 { id: 'APP-20261109', type: '落地页上线', title: '星屿海景餐厅双十一促销主会场', requester: 'Agent-X 编导', date: '今天 10:30', status: 'pending', urgent: true, progress: 1, steps: ['提交申请', 'AI风控拦截', '法务合规验证', '发布上线'] },
                 { id: 'BUD-20261108', type: '预算追加', title: '抖音本地生活投放预算增加 5000 元', requester: 'Agent-Y 数据', date: '昨天 16:45', status: 'pending', urgent: false, progress: 2, steps: ['策略触发', 'ROI预估分析', '主理人确认', '资金接口划拨'] },
                 { id: 'MAT-20261107', type: '素材合规', title: '春季系列产品白底图与视频脚本发布授权', requester: 'DesignCopilot', date: '11月7日 09:20', status: 'pending', urgent: false, progress: 0, steps: ['提交审核', '系统洗稿判重', '水印添加', '授权分发'] }
              ].map(item => (
                 <div key={item.id} className="bg-[var(--bg-panel)] border hover:border-red-300 border-[var(--border-color)] rounded-[var(--radius-xl)] p-5 shadow-sm transition-all flex flex-col group">
                    <div className="flex items-center justify-between cursor-pointer">
                       <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-50 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0 border border-[var(--border-color)] group-hover:bg-red-50 transition-colors">
                             <Check className="icon-md text-gray-400 group-hover:text-red-500" />
                          </div>
                          <div>
                             <div className="flex items-center space-x-2 mb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">{item.type}</span>
                                {item.urgent && <span className="bg-rose-100 text-rose-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">紧急</span>}
                             </div>
                             <h4 className="font-bold text-[var(--text-main)] text-[15px]">{item.title}</h4>
                             <p className="text-xs text-[var(--text-muted)] mt-1.5">
                                发起人：<span className="font-bold">{item.requester}</span> <span className="mx-2 text-gray-300">|</span> {item.date} <span className="mx-2 text-gray-300">|</span> ID: {item.id}
                             </p>
                          </div>
                       </div>
                       <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="bg-green-50 text-green-600 hover:bg-green-100 px-4 py-2 rounded-lg text-xs font-bold transition-colors">通过</button>
                          <button className="bg-gray-50 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg text-xs font-bold transition-colors">驳回</button>
                       </div>
                    </div>
                    {/* Progress Visualizer */}
                    <div className="mt-6 pt-5 border-t border-gray-50 relative">
                       <div className="flex items-center justify-between relative z-10 w-full px-2">
                           {item.steps.map((step: string, idx: number) => (
                              <div key={idx} className="flex flex-col items-center relative gap-2">
                                 <motion.div 
                                   initial={{ scale: 0.8, opacity: 0.5 }}
                                   animate={{ scale: idx === item.progress ? [1, 1.1, 1] : 1, opacity: 1 }}
                                   transition={{ duration: 0.8, repeat: idx === item.progress ? Infinity : 0 }}
                                   className={`icon-lg rounded-full flex items-center justify-center border-2 text-[10px] font-bold relative z-10 transition-colors ${idx < item.progress ? 'bg-green-500 border-green-500 text-white' : idx === item.progress ? 'bg-[var(--bg-panel)] border-blue-500 text-blue-500' : 'bg-[var(--bg-panel)] border-[var(--border-color)] text-gray-400'}`}
                                 >
                                    {idx < item.progress ? <Check className="w-3.5 h-3.5" /> : (idx + 1)}
                                 </motion.div>
                                 <span className={`text-[11px] font-bold absolute top-[var(--spacing-xl)] whitespace-nowrap ${idx <= item.progress ? 'text-[var(--text-main)]' : 'text-gray-400'}`}>{step}</span>
                              </div>
                           ))}
                       </div>
                       <div className="absolute top-[26px] left-6 right-6 h-[2px] bg-gray-100 -z-0">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.progress / (item.steps.length - 1)) * 100}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-blue-500 rounded-full"
                          />
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </div>
    );
  }

  // Default: moduleId === 'team'
  const [teamMembers, setTeamMembers] = useState(members);

  const handleRoleChange = (id: number, newRole: string) => {
    setTeamMembers(teamMembers.map(m => m.id === id ? { ...m, role: newRole } : m));
  };

  return (
    <div className="p-4 sm:p-[var(--spacing-lg)] lg:p-[var(--spacing-xl)] max-w-[1600px] mx-auto h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-[var(--spacing-md)] overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-[var(--spacing-lg)] pb-6">
        <div className="bg-[var(--bg-panel)] rounded-[24px] p-[var(--spacing-lg)] flex flex-col md:flex-row items-center justify-between shadow-sm border border-[var(--border-color)] relative overflow-hidden shrink-0">
          <div className="relative z-10 mb-[var(--spacing-md)] md:mb-0 w-full md:w-auto text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start space-x-3 mb-3">
              <div className="p-2 bg-blue-100/50 text-[var(--color-primary)] rounded-[var(--radius-lg)] border border-blue-200">
                <Network className="icon-lg" />
              </div>
              <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">AI 即团队 (多AGENT 组织架构)</h2>
            </div>
            <p className="text-[var(--text-muted)] max-w-xl text-[14px] font-medium leading-relaxed">
              作为超级个体，你的生产力由 Agent 引擎驱动。在此分配算力、挂载子模型以及管理外部兼职/外包流。
            </p>
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button className="bg-[var(--bg-panel)] text-gray-700 px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-sm shadow-sm border border-[var(--border-color)] hover:bg-gray-50 transition-colors w-full sm:w-auto">
              邀请真人外包协作
            </button>
            <button className="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-[var(--radius-lg)] font-bold text-sm shadow-sm hover:bg-blue-700 transition-colors flex items-center justify-center w-full sm:w-auto">
              <UserPlus className="icon-sm mr-2" />
              唤醒新 Agent 员工
            </button>
          </div>
        </div>

        <div className="bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--spacing-md)] shrink-0">
            <div className="flex items-center space-x-3">
              <h3 className="font-bold text-[var(--text-main)] text-lg">全数字组织架构</h3>
              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded">1 真人主理人 + {teamMembers.length - 1} 协作者/节点</span>
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="icon-sm absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="搜索姓名或邮箱..." 
                className="pl-9 pr-4 py-2 border border-[var(--border-color)] rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-gray-50 focus:bg-[var(--bg-panel)] transition-all"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[var(--bg-app)] border-b border-[var(--border-color)]">
                  <th className="py-3 px-5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">员工信息</th>
                  <th className="py-3 px-5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">角色权限</th>
                  <th className="py-3 px-5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">状态</th>
                  <th className="py-3 px-5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-right whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teamMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="py-3 px-5">
                      <div className="flex items-center space-x-3">
                        <img src={member.avatar} alt={member.name} className="w-9 h-9 rounded-full bg-gray-100 border border-[var(--border-color)] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[var(--text-main)] truncate">{member.name}</p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex justify-start">
                        <select 
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          disabled={member.role === '超级管理员'}
                          className={`text-xs font-bold py-1.5 px-2.5 rounded-lg border appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 ${member.role === '超级管理员' ? 'bg-amber-50 text-amber-700 border-amber-200 opacity-80 cursor-not-allowed' : 'bg-[var(--bg-panel)] text-gray-700 border-[var(--border-color)] hover:bg-gray-50 cursor-pointer'}`}
                        >
                          <option value="超级管理员" disabled>超级管理员</option>
                          <option value="内容创作者">内容创作者</option>
                          <option value="运营专员">运营专员</option>
                          <option value="数据分析师">数据分析师</option>
                          <option value="普通研发">普通研发</option>
                        </select>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      {member.active === '在线' ? (
                        <span className="inline-flex items-center text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                          在线
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[11px] font-bold text-[var(--text-muted)] bg-gray-100 px-2 py-0.5 rounded border border-[var(--border-color)]">
                          未激活 / 离线
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-right space-x-2 whitespace-nowrap">
                      {member.active !== '在线' && (
                         <button className="text-[11px] font-bold text-[var(--color-primary)] hover:text-white hover:bg-[var(--color-primary)] border border-blue-200 bg-blue-50 px-2 py-1 rounded transition-colors tooltip" title="重发邮件与个人微信通知">
                           重新发送邀请
                         </button>
                      )}
                      {member.role !== '超级管理员' && (
                        <button className="text-[11px] font-bold text-red-500 hover:text-white hover:bg-red-500 border border-red-100 bg-red-50 px-2 py-1 rounded transition-colors">
                          禁用
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Sidebar: Activity Feed */}
      <div className="w-full lg:w-80 bg-[var(--bg-panel)] rounded-[24px] border border-[var(--border-color)] shadow-sm shrink-0 flex flex-col h-[500px] lg:h-auto overflow-hidden">
        <div className="p-5 border-b border-[var(--border-color)] bg-gray-50/50 shrink-0">
          <h3 className="font-bold text-[var(--text-main)] text-[15px] flex items-center">
            <Clock className="icon-sm mr-2 text-[var(--color-primary)]" /> AI 分身及外包动态流
          </h3>
        </div>
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-[var(--spacing-lg)]">
          {[
            { tag: 'AI 自动流转', desc: 'Agent-X 刚刚上传了 12 个生成的视频片段至素材池。', time: '10 分钟前', icon: <Folder className="w-3.5 h-3.5" />, color: 'bg-amber-100 text-amber-600' },
            { tag: '智能提醒', desc: 'Agent-Y 洞察：发现「2026 营销策略」数据波动。', time: '1 小时前', icon: <FileText className="w-3.5 h-3.5" />, color: 'bg-blue-100 text-[var(--color-primary)]' },
            { tag: '任务挂机', desc: 'DesignCopilot 开始执行批量海报替换渲染。', time: '3 小时前', icon: <ListTodo className="w-3.5 h-3.5" />, color: 'bg-green-100 text-green-600' },
            { tag: '权限管理', desc: '主理人 Maheshenga 已批准外包 Ethan 的结算申请。', time: '昨天 14:30', icon: <Shield className="w-3.5 h-3.5" />, color: 'bg-purple-100 text-purple-600' },
            { tag: '系统流转', desc: '数字员工引擎成功发布昨日社交媒体营销矩阵。', time: '昨天 09:15', icon: <Share2 className="w-3.5 h-3.5" />, color: 'bg-blue-100 text-[var(--color-primary)]' },
          ].map((activity, idx) => (
            <div key={idx} className="relative pl-5 before:absolute before:left-1 before:top-5 before:bottom-[-24px] last:before:hidden before:w-px before:bg-gray-100">
               <div className={`absolute left-0 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white ${activity.color.split(' ')[0].replace('100', '400')}`}></div>
               <div className="flex items-center space-x-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded flex items-center text-[9px] font-bold uppercase tracking-wider ${activity.color}`}>
                     {activity.icon} <span className="ml-1">{activity.tag}</span>
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">{activity.time}</span>
               </div>
               <p className="text-xs text-gray-700 leading-relaxed font-medium">{activity.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
